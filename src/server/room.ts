import {
  canBeatCombo,
  calculatePenalties,
  checkInstantWin,
  evaluateCombo,
} from '../core/evaluator.ts';
import { createStandardDeck, dealCards } from '../core/deck.ts';
import type { Card, HandCombo, PenaltyBreakdown } from '../core/types.ts';
import { ComboType } from '../core/types.ts';
import { BuffManager } from '../buffs/buff-manager.ts';
import { getRandomBuffOptions } from '../buffs/buff-registry.ts';
import { BuffId } from '../buffs/types.ts';
import type { BuffDefinition, PlayerBuffSlot } from '../buffs/types.ts';
import { decideBotMove, decideBotBuffUse } from '../core/bot.ts';

export const RoomStatus = {
  LOBBY: 'LOBBY',
  DEALING: 'DEALING',
  BUFF_DRAFT: 'BUFF_DRAFT',
  PLAYING: 'PLAYING',
  MATCH_END: 'MATCH_END',
} as const;
export type RoomStatus = (typeof RoomStatus)[keyof typeof RoomStatus];

export interface PlayerSession {
  id: string;
  username: string;
  avatarUrl?: string;
  seatIndex: number;
  handCards: Card[];
  isReady: boolean;
  hasPassedRound: boolean;
  isConnected: boolean;
  isBot?: boolean;
  score: number;
}

export interface MatchResult {
  winnerId: string;
  winnerUsername: string;
  rankings: {
    playerId: string;
    username: string;
    scoreDelta: number;
    newScore: number;
    isWinner: boolean;
    isCong: boolean;
    remainingCardCount: number;
    penaltyDetail: PenaltyBreakdown;
  }[];
}

export interface PlayHandResult {
  success: boolean;
  combo?: HandCombo;
  isRoundOver?: boolean;
  isMatchOver?: boolean;
  winnerPlayerId?: string;
  matchResult?: MatchResult;
  error?: string;
}

export const TURN_TIMEOUT_MS = 15000; // 15 giây cho mỗi lượt

export class GameRoom {
  public roomId: string;
  public status: RoomStatus = RoomStatus.LOBBY;
  public players: PlayerSession[] = [];
  public currentTurnSeatIndex: number = 0;
  public turnDeadlineTimestamp: number = 0;
  public lastComboOnTable: HandCombo | null = null;
  public roundLeaderSeatIndex: number = 0;
  public drawPile: Card[] = [];
  public buffManager: BuffManager = new BuffManager();
  public draftOptions: Map<string, BuffDefinition[]> = new Map();
  public rerollCounts: Map<string, number> = new Map();
  public isBotThinking: boolean = false;
  public isFirstMatch: boolean = true;
  public lastWinnerPlayerId: string | null = null;
  public firstTurnRequiredCardId: number | null = null;
  public lowestDealtCard: Card | null = null;

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  public addPlayer(id: string, username: string, avatarUrl?: string): boolean {
    // 1. Kiểm tra dọn dẹp nếu phòng cũ bị bỏ hoang (không còn người thật online)
    this.cleanupIfOrphaned();

    // 2. Kiểm tra nếu player đã có sẵn trong phòng (reconnection)
    const existingPlayer = this.players.find((p) => p.id === id || (!p.isBot && p.username === username));
    if (existingPlayer) {
      existingPlayer.id = id;
      existingPlayer.username = username;
      if (avatarUrl) existingPlayer.avatarUrl = avatarUrl;
      existingPlayer.isConnected = true;
      return true;
    }

    if (this.players.length >= 4 || this.status !== RoomStatus.LOBBY) {
      return false;
    }
    const seatIndex = this.players.length;
    this.players.push({
      id,
      username,
      avatarUrl,
      seatIndex,
      handCards: [],
      isReady: false,
      hasPassedRound: false,
      isConnected: true,
      score: 1000,
    });
    this.buffManager.initializePlayer(id);
    return true;
  }

  public removePlayer(id: string): boolean {
    const index = this.players.findIndex((p) => p.id === id);
    if (index === -1) return false;

    this.players.splice(index, 1);
    this.players.forEach((p, idx) => {
      p.seatIndex = idx;
    });

    this.cleanupIfOrphaned();
    return true;
  }

  public cleanupIfOrphaned(): boolean {
    const hasHuman = this.players.some((p) => !p.isBot && p.isConnected);
    if (!hasHuman) {
      this.players = [];
      this.status = RoomStatus.LOBBY;
      this.lastComboOnTable = null;
      this.currentTurnSeatIndex = 0;
      this.roundLeaderSeatIndex = 0;
      this.draftOptions.clear();
      return true;
    }
    return false;
  }

  public addBot(): PlayerSession | null {
    if (this.players.length >= 4 || this.status !== RoomStatus.LOBBY) {
      return null;
    }
    const botNames = ['Bot Nam', 'Bot Mai', 'Bot Tuấn', 'Bot Linh'];
    const botName = botNames[this.players.length] || `Bot ${this.players.length + 1}`;
    const botId = `bot_${Math.random().toString(36).substring(2, 8)}`;
    const seatIndex = this.players.length;

    const botSession: PlayerSession = {
      id: botId,
      username: botName,
      seatIndex,
      handCards: [],
      isReady: true,
      hasPassedRound: false,
      isConnected: true,
      isBot: true,
      score: 1000,
    };

    this.players.push(botSession);
    this.buffManager.initializePlayer(botId);

    // Kiểm tra tự động bắt đầu nếu đủ người
    if (this.players.length >= 2 && this.players.every((p) => p.isReady)) {
      this.startMatch();
    }

    return botSession;
  }

  public isCurrentTurnBot(): boolean {
    const current = this.players[this.currentTurnSeatIndex];
    return !!current?.isBot;
  }

  public executeBotTurn(): {
    isPass: boolean;
    success?: boolean;
    combo?: HandCombo;
    isMatchOver?: boolean;
    winnerPlayerId?: string;
    matchResult?: MatchResult;
    botSkillUsed?: {
      buffId: BuffId;
      botName: string;
      description: string;
    };
  } {
    if (this.status !== RoomStatus.PLAYING || !this.isCurrentTurnBot()) {
      return { isPass: false };
    }

    const currentBot = this.players[this.currentTurnSeatIndex];
    let botSkillUsed: { buffId: BuffId; botName: string; description: string } | undefined = undefined;

    // 1. Kiểm tra và kích hoạt Kỹ năng Chủ động (Active Skill) của Bot
    const botBuffs = this.buffManager
      .getPlayerBuffs(currentBot.id)
      .filter((b) => b.remainingCharges > 0)
      .map((b) => b.buffId);

    const nextSeat = (this.currentTurnSeatIndex + 1) % this.players.length;
    const nextPlayer = this.players[nextSeat];

    const skillDecision = decideBotBuffUse(
      currentBot.handCards,
      botBuffs,
      nextPlayer?.handCards.length ?? 13,
      this.drawPile.length
    );

    if (skillDecision) {
      if (skillDecision.buffId === 'BUFF_FREEZE_TURN') {
        const freezeRes = this.executeFreezeTurn(currentBot.id);
        if (freezeRes.success) {
          botSkillUsed = {
            buffId: 'BUFF_FREEZE_TURN',
            botName: currentBot.username,
            description: `❄️ ${currentBot.username} đã kích hoạt Băng Phong! Đóng băng lượt của [${freezeRes.targetUsername}]!`,
          };
        }
      } else if (skillDecision.buffId === 'BUFF_SWAP_CARD' && skillDecision.cardId !== undefined) {
        const swapRes = this.buffManager.executeSwapCard(
          currentBot.id,
          skillDecision.cardId,
          currentBot.handCards,
          this.drawPile
        );
        if (swapRes.success && swapRes.updatedHand) {
          currentBot.handCards = swapRes.updatedHand;
          botSkillUsed = {
            buffId: 'BUFF_SWAP_CARD',
            botName: currentBot.username,
            description: `🔄 ${currentBot.username} đã kích hoạt Hoán Bài để đổi 1 lá bài rác!`,
          };
        }
      } else if (skillDecision.buffId === 'BUFF_SPY_HAND') {
        const spyRes = this.executeSpyHand(currentBot.id);
        if (spyRes.success) {
          botSkillUsed = {
            buffId: 'BUFF_SPY_HAND',
            botName: currentBot.username,
            description: `👁️ ${currentBot.username} đã kích hoạt Mắt Thần soi bài đối thủ!`,
          };
        }
      }
    }

    // 2. Quyết định ra bài (có xét ràng buộc lá nhỏ nhất nếu là lượt đầu ván 1)
    const decision = decideBotMove(currentBot.handCards, this.lastComboOnTable, this.firstTurnRequiredCardId);

    if (decision.action === 'PLAY' && decision.cardIds && decision.cardIds.length > 0) {
      const playRes = this.playHand(currentBot.id, decision.cardIds);
      return {
        isPass: false,
        success: playRes.success,
        combo: playRes.combo,
        isMatchOver: playRes.isMatchOver,
        winnerPlayerId: playRes.winnerPlayerId,
        matchResult: playRes.matchResult,
        botSkillUsed,
      };
    } else {
      const passRes = this.passTurn(currentBot.id);
      return {
        isPass: true,
        success: passRes.success,
        botSkillUsed,
      };
    }
  }

  public reconnectPlayer(id: string, newSessionId?: string): PlayerSession | null {
    const player = this.players.find((p) => p.id === id);
    if (!player) return null;
    player.isConnected = true;
    if (newSessionId && newSessionId !== player.id) {
      player.id = newSessionId;
    }
    return player;
  }

  public setPlayerConnected(id: string, isConnected: boolean): void {
    const player = this.players.find((p) => p.id === id);
    if (player) {
      player.isConnected = isConnected;
    }
  }

  public setReady(playerId: string, isReady: boolean): boolean {
    const player = this.players.find((p) => p.id === playerId);
    if (!player || this.status !== RoomStatus.LOBBY) return false;
    player.isReady = isReady;

    // Tự động start khi đủ 2 - 4 người và tất cả sẵn sàng
    if (this.players.length >= 2 && this.players.every((p) => p.isReady)) {
      this.startMatch();
    }
    return true;
  }

  public findLowestDealtCard(): { card: Card; player: PlayerSession } | null {
    let lowestCard: Card | null = null;
    let lowestPlayer: PlayerSession | null = null;

    for (const player of this.players) {
      for (const card of player.handCards) {
        if (!lowestCard) {
          lowestCard = card;
          lowestPlayer = player;
        } else {
          const comp = card.rank !== lowestCard.rank ? card.rank - lowestCard.rank : card.suit - lowestCard.suit;
          if (comp < 0) {
            lowestCard = card;
            lowestPlayer = player;
          }
        }
      }
    }

    if (lowestCard && lowestPlayer) {
      return { card: lowestCard, player: lowestPlayer };
    }
    return null;
  }

  public determineStartingTurn(): void {
    // 1. Kiểm tra nếu có người chơi có BUFF_FIRST_STRIKE (Tiên Thủ)
    const firstStrikePlayer = this.players.find(
      (p) => this.buffManager.hasBuff(p.id, BuffId.BUFF_FIRST_STRIKE)
    );
    if (firstStrikePlayer) {
      this.currentTurnSeatIndex = firstStrikePlayer.seatIndex;
      this.roundLeaderSeatIndex = firstStrikePlayer.seatIndex;
      this.firstTurnRequiredCardId = null;
      this.lowestDealtCard = null;
      return;
    }

    // 2. Nếu là ván đầu tiên của phòng (isFirstMatch == true)
    if (this.isFirstMatch) {
      const lowest = this.findLowestDealtCard();
      if (lowest) {
        this.currentTurnSeatIndex = lowest.player.seatIndex;
        this.roundLeaderSeatIndex = lowest.player.seatIndex;
        this.firstTurnRequiredCardId = lowest.card.id;
        this.lowestDealtCard = lowest.card;
        return;
      }
      this.currentTurnSeatIndex = 0;
      this.roundLeaderSeatIndex = 0;
      this.firstTurnRequiredCardId = null;
      this.lowestDealtCard = null;
      return;
    }

    // 3. Nếu là ván kế tiếp (isFirstMatch == false): Người thắng ván trước đi đầu
    if (this.lastWinnerPlayerId) {
      const winnerPlayer = this.players.find(
        (p) => p.id === this.lastWinnerPlayerId && p.isConnected
      );
      if (winnerPlayer) {
        this.currentTurnSeatIndex = winnerPlayer.seatIndex;
        this.roundLeaderSeatIndex = winnerPlayer.seatIndex;
        this.firstTurnRequiredCardId = null;
        this.lowestDealtCard = null;
        return;
      }
    }

    // Fallback: Tìm người cầm lá nhỏ nhất của ván này (nhưng không bắt buộc lá nhỏ nhất)
    const lowest = this.findLowestDealtCard();
    if (lowest) {
      this.currentTurnSeatIndex = lowest.player.seatIndex;
      this.roundLeaderSeatIndex = lowest.player.seatIndex;
      this.firstTurnRequiredCardId = null;
      this.lowestDealtCard = lowest.card;
      return;
    }

    this.currentTurnSeatIndex = 0;
    this.roundLeaderSeatIndex = 0;
    this.firstTurnRequiredCardId = null;
    this.lowestDealtCard = null;
  }

  public startMatch(): void {
    this.status = RoomStatus.DEALING;
    const deck = createStandardDeck();
    const { hands, remaining } = dealCards(deck, this.players.length, 13);

    this.drawPile = remaining;
    this.draftOptions.clear();

    for (let i = 0; i < this.players.length; i++) {
      const pid = this.players[i].id;
      // Khởi tạo lại buff sạch sẽ cho ván mới
      this.buffManager.resetPlayerBuffs(pid);
      this.rerollCounts.set(pid, 3);

      this.players[i].handCards = hands[i];
      this.players[i].hasPassedRound = false;

      // Kiểm tra tới trắng
      const instantWin = checkInstantWin(hands[i]);
      if (instantWin.hasInstantWin) {
        this.status = RoomStatus.MATCH_END;
        return;
      }

      // Tạo 3 lựa chọn Buff cho mỗi người
      this.draftOptions.set(pid, getRandomBuffOptions(3));
    }

    this.status = RoomStatus.BUFF_DRAFT;
    this.resetTurnTimer(TURN_TIMEOUT_MS);

    // Tự động chọn buff cho tất cả Bot trong phòng
    for (const p of this.players) {
      if (p.isBot) {
        const opts = this.draftOptions.get(p.id);
        if (opts && opts.length > 0) {
          this.buffManager.assignBuff(p.id, opts[0].id);
          this.draftOptions.delete(p.id);
        }
      }
    }

    // Nếu tất cả người chơi (kể cả bot) đã chọn buff xong
    const allSelected = this.players.every(
      (p) => this.buffManager.getPlayerBuffs(p.id).length > 0
    );
    if (allSelected) {
      this.status = RoomStatus.PLAYING;
      this.determineStartingTurn();
      this.lastComboOnTable = null;
      this.resetTurnTimer(TURN_TIMEOUT_MS);
    }
  }

  public getRerollCount(playerId: string): number {
    return this.rerollCounts.get(playerId) ?? 3;
  }

  public rerollBuffOptions(playerId: string): { success: boolean; newOptions?: BuffDefinition[]; remaining?: number; error?: string } {
    if (this.status !== RoomStatus.BUFF_DRAFT) {
      return { success: false, error: 'Chỉ có thể đổi buff trong giai đoạn chọn buff' };
    }
    const current = this.rerollCounts.get(playerId) ?? 3;
    if (current <= 0) {
      return { success: false, error: 'Bạn đã dùng hết 3 lượt đổi lại buff của ván này!' };
    }
    this.rerollCounts.set(playerId, current - 1);
    const newOpts = getRandomBuffOptions(3);
    this.draftOptions.set(playerId, newOpts);
    return { success: true, newOptions: newOpts, remaining: current - 1 };
  }

  public selectBuff(playerId: string, buffId: BuffId): boolean {
    if (this.status !== RoomStatus.BUFF_DRAFT) return false;
    const options = this.draftOptions.get(playerId) || [];
    if (!options.some((o) => o.id === buffId)) return false;

    this.buffManager.assignBuff(playerId, buffId);
    // Xóa ngay danh sách draft sau khi chọn để modal phía client đóng và không bị mở lại
    this.draftOptions.delete(playerId);

    // Kiểm tra xem tất cả người chơi đã chọn buff chưa
    const allSelected = this.players.every(
      (p) => this.buffManager.getPlayerBuffs(p.id).length > 0
    );

    if (allSelected) {
      this.status = RoomStatus.PLAYING;
      this.determineStartingTurn();
      this.lastComboOnTable = null;
      this.resetTurnTimer(TURN_TIMEOUT_MS);
    }

    return true;
  }

  public playHand(playerId: string, cardIds: number[]): PlayHandResult {
    if (this.status !== RoomStatus.PLAYING) {
      return { success: false, error: 'Phòng chưa trong trạng thái chơi' };
    }

    const player = this.players[this.currentTurnSeatIndex];
    if (player.id !== playerId) {
      return { success: false, error: 'Chưa tới lượt của bạn' };
    }

    // Lấy danh sách lá bài đánh từ tay
    const cardsToPlay = player.handCards.filter((c) => cardIds.includes(c.id));
    if (cardsToPlay.length !== cardIds.length) {
      return { success: false, error: 'Bạn không sở hữu một số lá bài này' };
    }

    // Kiểm tra ràng buộc lá bài nhỏ nhất ở lượt đi đầu tiên của ván đầu
    if (this.firstTurnRequiredCardId !== null) {
      const hasRequiredCard = cardsToPlay.some((c) => c.id === this.firstTurnRequiredCardId);
      if (!hasRequiredCard) {
        const requiredCode = this.lowestDealtCard ? this.lowestDealtCard.code : 'nhỏ nhất';
        return {
          success: false,
          error: `Nước đi đầu tiên của ván đầu bắt buộc phải chứa lá bài nhỏ nhất (${requiredCode})!`,
        };
      }
    }

    const combo = evaluateCombo(cardsToPlay);
    if (combo.type === ComboType.INVALID) {
      return { success: false, error: 'Nước đi không tạo thành bộ bài hợp lệ' };
    }

    // Nếu không phải lượt tự do, kiểm tra xem có đè được bộ trước không
    if (this.lastComboOnTable) {
      const canBeat = canBeatCombo(this.lastComboOnTable, combo);
      if (!canBeat) {
        return { success: false, error: 'Bộ bài của bạn không đè được bài trên bàn' };
      }

      // Xử lý Hook Phản đòn khi bị chặt (nếu có chặt heo/hàng)
      const isChop =
        (this.lastComboOnTable.cards.some((c) => c.rank === 15) ||
          this.lastComboOnTable.type === ComboType.THREE_PAIR_STRAIGHT ||
          this.lastComboOnTable.type === ComboType.FOUR_OF_A_KIND) &&
        combo.type !== this.lastComboOnTable.type;

      if (isChop) {
        const victimPlayerId = this.lastComboOnTable.playedByPlayerId || '';
        const chopReaction = this.buffManager.processChopReaction({
          victimPlayerId,
          attackerPlayerId: playerId,
          victimCombo: this.lastComboOnTable,
          attackerCombo: combo,
          basePenalty: 50,
        });

        // Nếu Mìn Cảm Tử (BUFF_BOMB_TRAP) nổ: Phạt ngược người tấn công
        if (chopReaction.bombPenalty) {
          const attacker = this.players.find((p) => p.id === playerId);
          const victim = this.players.find((p) => p.id === victimPlayerId);
          if (attacker) attacker.score = Math.max(0, attacker.score - chopReaction.bombPenalty);
          if (victim) victim.score += chopReaction.bombPenalty;
        }
      }
    }

    // Hợp lệ: trừ bài trên tay
    combo.playedByPlayerId = playerId;
    player.handCards = player.handCards.filter((c) => !cardIds.includes(c.id));
    this.lastComboOnTable = combo;

    // Nước đi đầu tiên thành công -> Xóa cờ ràng buộc lá nhỏ nhất
    this.firstTurnRequiredCardId = null;

    // Kiểm tra hết bài -> Thắng cuộc
    if (player.handCards.length === 0) {
      this.status = RoomStatus.MATCH_END;
      this.lastWinnerPlayerId = playerId;
      this.isFirstMatch = false;
      const matchResult = this.computeMatchResult(player);
      return {
        success: true,
        combo,
        isMatchOver: true,
        winnerPlayerId: playerId,
        matchResult,
      };
    }

    // Chuyển lượt kế tiếp
    this.advanceTurn();
    this.resetTurnTimer(TURN_TIMEOUT_MS);
    return {
      success: true,
      combo,
      isMatchOver: false,
    };
  }

  public passTurn(playerId: string): { success: boolean; isRoundReset?: boolean; error?: string } {
    if (this.status !== RoomStatus.PLAYING) {
      return { success: false, error: 'Phòng không ở trạng thái chơi' };
    }

    const player = this.players[this.currentTurnSeatIndex];
    if (player.id !== playerId) {
      return { success: false, error: 'Chưa tới lượt của bạn' };
    }

    if (!this.lastComboOnTable) {
      return { success: false, error: 'Bạn đang cầm vòng đánh tự do, không thể bỏ lượt' };
    }

    // Xử lý Hook Bỏ lượt (Tái sinh lượt)
    const reviveResult = this.buffManager.processPassTurn(playerId);
    if (!reviveResult.canRejoinRound) {
      player.hasPassedRound = true;
    }

    // Kiểm tra xem tất cả những người khác đã bỏ lượt chưa
    const activePlayers = this.players.filter((p) => !p.hasPassedRound && p.handCards.length > 0);
    if (activePlayers.length <= 1) {
      // Kết thúc vòng chơi! Người còn lại được quyền dẫn vòng mới
      for (const p of this.players) {
        p.hasPassedRound = false;
      }
      this.lastComboOnTable = null;
      if (activePlayers.length === 1) {
        this.currentTurnSeatIndex = activePlayers[0].seatIndex;
        this.roundLeaderSeatIndex = activePlayers[0].seatIndex;
      }
      this.resetTurnTimer(TURN_TIMEOUT_MS);
      return { success: true, isRoundReset: true };
    }

    this.advanceTurn();
    this.resetTurnTimer(TURN_TIMEOUT_MS);
    return { success: true, isRoundReset: false };
  }

  /**
   * Kích hoạt Băng Phong (BUFF_FREEZE_TURN):
   * Buộc người tiếp theo phải bỏ lượt ngay lập tức
   */
  public executeFreezeTurn(playerId: string): { success: boolean; targetUsername?: string; error?: string } {
    if (this.status !== RoomStatus.PLAYING) {
      return { success: false, error: 'Phòng không ở trạng thái chơi' };
    }
    if (!this.buffManager.hasBuff(playerId, 'BUFF_FREEZE_TURN' as any)) {
      return { success: false, error: 'Bạn không có buff Băng Phong hoặc đã hết lượt' };
    }

    this.buffManager.consumeCharge(playerId, 'BUFF_FREEZE_TURN' as any);

    // Tìm người tiếp theo
    const nextSeat = (this.currentTurnSeatIndex + 1) % this.players.length;
    const targetPlayer = this.players[nextSeat];
    targetPlayer.hasPassedRound = true;

    // Chuyển lượt qua người kế tiếp nữa
    this.advanceTurn();
    this.resetTurnTimer(TURN_TIMEOUT_MS);

    return {
      success: true,
      targetUsername: targetPlayer.username,
    };
  }

  /**
   * Kích hoạt Mắt Thần (BUFF_SPY_HAND):
   * Soi 2 lá bài ngẫu nhiên của người tiếp theo
   */
  public executeSpyHand(playerId: string): { success: boolean; revealedCards?: Card[]; targetUsername?: string; error?: string } {
    if (!this.buffManager.hasBuff(playerId, 'BUFF_SPY_HAND' as any)) {
      return { success: false, error: 'Bạn không có buff Mắt Thần hoặc đã hết lượt' };
    }

    const nextSeat = (this.currentTurnSeatIndex + 1) % this.players.length;
    const targetPlayer = this.players[nextSeat];

    const spyRes = this.buffManager.executeSpyHand(playerId, targetPlayer.handCards);
    if (!spyRes.success) {
      return { success: false, error: spyRes.error };
    }

    return {
      success: true,
      revealedCards: spyRes.revealedCards,
      targetUsername: targetPlayer.username,
    };
  }

  /**
   * Xử lý khi hết 15 giây đếm ngược mà người chơi không thao tác:
   * - Nếu bàn đã có bài: Tự động Bỏ lượt (Pass).
   * - Nếu đang cầm vòng tự do: Tự động đánh lá bài nhỏ nhất trên tay.
   */
  public handleTurnTimeout(): PlayHandResult | { isPass: boolean } {
    if (this.status !== RoomStatus.PLAYING) return { isPass: false };

    const currentPlayer = this.players[this.currentTurnSeatIndex];

    if (this.lastComboOnTable) {
      this.passTurn(currentPlayer.id);
      return { isPass: true };
    } else {
      // Đang cầm vòng tự do
      if (this.firstTurnRequiredCardId !== null) {
        const reqCard = currentPlayer.handCards.find((c) => c.id === this.firstTurnRequiredCardId);
        if (reqCard) {
          return this.playHand(currentPlayer.id, [reqCard.id]);
        }
      }
      // Đánh lá bài nhỏ nhất
      const lowestCard = currentPlayer.handCards[0];
      if (lowestCard) {
        return this.playHand(currentPlayer.id, [lowestCard.id]);
      }
      return { isPass: false };
    }
  }

  public resetTurnTimer(ms: number): void {
    this.turnDeadlineTimestamp = Date.now() + ms;
  }

  private advanceTurn(): void {
    let nextSeat = (this.currentTurnSeatIndex + 1) % this.players.length;
    let attempts = 0;

    while (
      (this.players[nextSeat].hasPassedRound || this.players[nextSeat].handCards.length === 0) &&
      attempts < this.players.length
    ) {
      nextSeat = (nextSeat + 1) % this.players.length;
      attempts++;
    }

    this.currentTurnSeatIndex = nextSeat;
  }

  public computeMatchResult(winner: PlayerSession): MatchResult {
    let totalWonUnits = 0;
    const loserRankings: any[] = [];

    for (const p of this.players) {
      if (p.id === winner.id) continue;

      // Tính tiền phạt bài còn lại
      const penalties = calculatePenalties(p.handCards, p.handCards.length < 13);
      // Điểm phạt: số lá còn lại + số đơn vị phạt heo/hàng/cóng
      const pointsLost = (p.handCards.length * 10) + (penalties.totalPenaltyUnits * 20);
      totalWonUnits += pointsLost;

      p.score = Math.max(0, p.score - pointsLost);

      loserRankings.push({
        playerId: p.id,
        username: p.username,
        scoreDelta: -pointsLost,
        newScore: p.score,
        isWinner: false,
        isCong: penalties.isCong,
        remainingCardCount: p.handCards.length,
        penaltyDetail: penalties,
      });
    }

    // Nếu người thắng sở hữu BUFF_DOUBLE_CHIPS (Joker Nhân Đôi)
    if (this.buffManager.hasBuff(winner.id, BuffId.BUFF_DOUBLE_CHIPS)) {
      this.buffManager.consumeCharge(winner.id, BuffId.BUFF_DOUBLE_CHIPS);
      totalWonUnits *= 2;
    }

    winner.score += totalWonUnits;

    const winnerRanking = {
      playerId: winner.id,
      username: winner.username,
      scoreDelta: totalWonUnits,
      newScore: winner.score,
      isWinner: true,
      isCong: false,
      remainingCardCount: 0,
      penaltyDetail: {
        isCong: false,
        blackPigs: 0,
        redPigs: 0,
        threePairStraights: 0,
        fourOfAKinds: 0,
        fourPairStraights: 0,
        totalPenaltyUnits: 0,
      },
    };

    return {
      winnerId: winner.id,
      winnerUsername: winner.username,
      rankings: [winnerRanking, ...loserRankings],
    };
  }

  public resetToLobby(): void {
    this.status = RoomStatus.LOBBY;
    this.lastComboOnTable = null;
    this.currentTurnSeatIndex = 0;
    this.roundLeaderSeatIndex = 0;
    this.firstTurnRequiredCardId = null;
    this.lowestDealtCard = null;
    this.draftOptions.clear();

    for (const p of this.players) {
      p.handCards = [];
      p.isReady = p.isBot ? true : false;
      p.hasPassedRound = false;
      this.buffManager.resetPlayerBuffs(p.id);
    }
  }
}
