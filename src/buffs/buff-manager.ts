import { BuffId } from './types.ts';
import type {
  OnChopReactionContext,
  PlayerBuffSlot,
} from './types.ts';
import type { Card } from '../core/types.ts';
import { ComboType } from '../core/types.ts';
import { BUFF_DEFINITIONS } from './buff-registry.ts';

export class BuffManager {
  private playerSlots = new Map<string, PlayerBuffSlot[]>();

  public initializePlayer(playerId: string): void {
    if (!this.playerSlots.has(playerId)) {
      this.playerSlots.set(playerId, []);
    }
  }

  public resetPlayerBuffs(playerId: string): void {
    this.playerSlots.set(playerId, []);
  }

  public clearAll(): void {
    this.playerSlots.clear();
  }

  public getPlayerBuffs(playerId: string): PlayerBuffSlot[] {
    return this.playerSlots.get(playerId) || [];
  }

  public assignBuff(playerId: string, buffId: BuffId): boolean {
    const slots = this.getPlayerBuffs(playerId);
    if (slots.length >= 2) {
      return false; // Tối đa 2 ô buff
    }

    const def = BUFF_DEFINITIONS[buffId];
    if (!def) return false;

    slots.push({
      buffId,
      remainingCharges: def.maxCharges,
      isActive: true,
    });
    this.playerSlots.set(playerId, slots);
    return true;
  }

  public hasBuff(playerId: string, buffId: BuffId): boolean {
    const slot = this.getPlayerBuffs(playerId).find(
      (s) => s.buffId === buffId && s.isActive && s.remainingCharges > 0
    );
    return !!slot;
  }

  public consumeCharge(playerId: string, buffId: BuffId): boolean {
    const slot = this.getPlayerBuffs(playerId).find(
      (s) => s.buffId === buffId && s.isActive && s.remainingCharges > 0
    );
    if (!slot) return false;

    slot.remainingCharges--;
    if (slot.remainingCharges <= 0) {
      slot.isActive = false;
    }
    return true;
  }

  // --- LOGIC HOOKS ---

  /**
   * Kỹ năng: Hoán Bài (BUFF_SWAP_CARD)
   * Bỏ 1 lá rác trên tay, rút ngẫu nhiên 1 lá từ nọc dự phòng
   */
  public executeSwapCard(
    playerId: string,
    cardIdToDiscard: number,
    hand: Card[],
    drawPile: Card[]
  ): { success: boolean; newCard?: Card; updatedHand?: Card[]; error?: string } {
    if (!this.hasBuff(playerId, BuffId.BUFF_SWAP_CARD)) {
      return { success: false, error: 'Người chơi không có buff Hoán Bài hoặc đã hết lượt dùng' };
    }

    if (drawPile.length === 0) {
      return { success: false, error: 'Cọc bài dự phòng đã rỗng, không thể hoán bài' };
    }

    const cardIndex = hand.findIndex((c) => c.id === cardIdToDiscard);
    if (cardIndex === -1) {
      return { success: false, error: 'Không tìm thấy lá bài cần đổi trên tay' };
    }

    this.consumeCharge(playerId, BuffId.BUFF_SWAP_CARD);

    // Rút 1 lá từ drawPile
    const newCard = drawPile.pop()!;
    const updatedHand = [...hand];
    const discardedCard = updatedHand.splice(cardIndex, 1)[0];
    updatedHand.push(newCard);

    // Bỏ lá cũ vào lại drawPile (trộn lại)
    drawPile.unshift(discardedCard);

    return {
      success: true,
      newCard,
      updatedHand,
    };
  }

  /**
   * Kỹ năng: Mắt Thần (BUFF_SPY_HAND)
   * Soi tối đa 2 lá ngẫu nhiên trên tay đối thủ
   */
  public executeSpyHand(
    playerId: string,
    targetHand: Card[]
  ): { success: boolean; revealedCards?: Card[]; error?: string } {
    if (!this.hasBuff(playerId, BuffId.BUFF_SPY_HAND)) {
      return { success: false, error: 'Người chơi không có buff Mắt Thần' };
    }

    this.consumeCharge(playerId, BuffId.BUFF_SPY_HAND);

    const shuffled = [...targetHand].sort(() => Math.random() - 0.5);
    const revealedCards = shuffled.slice(0, Math.min(2, targetHand.length));

    return {
      success: true,
      revealedCards,
    };
  }

  /**
   * Hook Phản đòn khi bị Chặt Heo/Hàng (OnChopReaction)
   * Xử lý Giáp Heo (BUFF_PIG_ARMOR) và Gương Phản Xạ (BUFF_REFLECT_CUT)
   */
  public processChopReaction(ctx: OnChopReactionContext): OnChopReactionContext {
    const result = { ...ctx };

    // 1. Kiểm tra Giáp Heo (BUFF_PIG_ARMOR)
    if (this.hasBuff(ctx.victimPlayerId, BuffId.BUFF_PIG_ARMOR)) {
      // Nếu bị 3 đôi thông chặt 1 heo -> Miễn hoàn toàn đòn chặt
      if (
        ctx.attackerCombo.type === ComboType.THREE_PAIR_STRAIGHT &&
        ctx.victimCombo.type === ComboType.SINGLE
      ) {
        this.consumeCharge(ctx.victimPlayerId, BuffId.BUFF_PIG_ARMOR);
        result.isCanceled = true;
        result.reducedPenaltyMultiplier = 0;
        return result;
      }

      // Các trường hợp chặt khác: Giảm 50% tiền phạt
      this.consumeCharge(ctx.victimPlayerId, BuffId.BUFF_PIG_ARMOR);
      result.reducedPenaltyMultiplier = 0.5;
    }

    // 2. Kiểm tra Gương Phản Xạ (BUFF_REFLECT_CUT)
    if (this.hasBuff(ctx.victimPlayerId, BuffId.BUFF_REFLECT_CUT)) {
      this.consumeCharge(ctx.victimPlayerId, BuffId.BUFF_REFLECT_CUT);
      const effectivePenalty =
        result.basePenalty * (result.reducedPenaltyMultiplier ?? 1);
      result.reflectedPenalty = effectivePenalty * 0.5;
    }

    // 3. Kiểm tra Mìn Cảm Tử (BUFF_BOMB_TRAP)
    if (this.hasBuff(ctx.victimPlayerId, BuffId.BUFF_BOMB_TRAP)) {
      this.consumeCharge(ctx.victimPlayerId, BuffId.BUFF_BOMB_TRAP);
      result.bombPenalty = result.basePenalty;
    }

    return result;
  }

  /**
   * Kỹ năng: Cuồng Phong Hoán Đổi (BUFF_SHUFFLE_HAND)
   * Tự động chọn 2 lá rác nhỏ nhất trên tay, bỏ vào cọc rút và rút lại 2 lá mới
   */
  public executeShuffleHand(
    playerId: string,
    hand: Card[],
    drawPile: Card[]
  ): { success: boolean; newCards?: Card[]; updatedHand?: Card[]; error?: string } {
    if (!this.hasBuff(playerId, BuffId.BUFF_SHUFFLE_HAND)) {
      return { success: false, error: 'Người chơi không có buff Cuồng Phong Hoán Đổi hoặc đã hết lượt dùng' };
    }

    if (drawPile.length < 2) {
      return { success: false, error: 'Cọc bài dự phòng không đủ 2 lá để hoán đổi' };
    }

    if (hand.length < 2) {
      return { success: false, error: 'Trên tay cần ít nhất 2 lá bài để hoán đổi' };
    }

    this.consumeCharge(playerId, BuffId.BUFF_SHUFFLE_HAND);

    // Tìm 2 lá nhỏ nhất
    const sorted = [...hand].sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : a.suit - b.suit));
    const toDiscard = sorted.slice(0, 2);
    const toDiscardIds = new Set(toDiscard.map((c) => c.id));

    const remainingHand = hand.filter((c) => !toDiscardIds.has(c.id));
    const drawn1 = drawPile.pop()!;
    const drawn2 = drawPile.pop()!;

    drawPile.unshift(...toDiscard);
    const updatedHand = [...remainingHand, drawn1, drawn2];

    return {
      success: true,
      newCards: [drawn1, drawn2],
      updatedHand,
    };
  }

  /**
   * Kỹ năng: Đạo Tặc (BUFF_HEIST)
   * Rút trộm 1 lá bài bất kỳ của đối thủ có số bài ít nhất (đối thủ phải còn >= 2 lá)
   */
  public executeHeist(
    playerId: string,
    myHand: Card[],
    targetPlayer: { id: string; username: string; handCards: Card[] }
  ): { success: boolean; stolenCard?: Card; error?: string } {
    if (!this.hasBuff(playerId, BuffId.BUFF_HEIST)) {
      return { success: false, error: 'Người chơi không có buff Đạo Tặc hoặc đã hết lượt dùng' };
    }

    if (targetPlayer.handCards.length <= 1) {
      return { success: false, error: 'Đối thủ chỉ còn 1 lá bài hoặc đã hết bài, không thể rút trộm!' };
    }

    this.consumeCharge(playerId, BuffId.BUFF_HEIST);

    // Rút ngẫu nhiên 1 lá từ target
    const randomIdx = Math.floor(Math.random() * targetPlayer.handCards.length);
    const [stolen] = targetPlayer.handCards.splice(randomIdx, 1);
    myHand.push(stolen);

    return {
      success: true,
      stolenCard: stolen,
    };
  }

  /**
   * Hook khi bỏ lượt (OnPassTurn)
   * Xử lý Tái Sinh Lượt (BUFF_REVIVE_PASS)
   */
  public processPassTurn(playerId: string): { canRejoinRound: boolean } {
    if (this.hasBuff(playerId, BuffId.BUFF_REVIVE_PASS)) {
      this.consumeCharge(playerId, BuffId.BUFF_REVIVE_PASS);
      return { canRejoinRound: true };
    }
    return { canRejoinRound: false };
  }
}

