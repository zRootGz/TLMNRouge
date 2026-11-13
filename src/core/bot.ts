import { canBeatCombo, evaluateCombo } from './evaluator.ts';
import { sortCards } from './deck.ts';
import type { Card, HandCombo } from './types.ts';
import { ComboType, Rank } from './types.ts';
import type { BuffId } from '../buffs/types.ts';

export interface BotDecision {
  action: 'PLAY' | 'PASS';
  cardIds?: number[];
}

export interface BotSkillDecision {
  buffId: BuffId;
  cardId?: number; // Khi dùng BUFF_SWAP_CARD cần chỉ định lá bài đổi
}

/**
 * AI quyết định kích hoạt Kỹ Năng Chủ Động (Active Buffs) của Bot:
 * - BUFF_FREEZE_TURN: Khi người tiếp theo còn <= 3 lá bài hoặc đang cầm bài nguy hiểm
 * - BUFF_SWAP_CARD: Khi có bài trong cọc rút và tay Bot có lá rác nhỏ <= 5
 * - BUFF_SPY_HAND: Kích hoạt sớm để lấy thông tin bài đối thủ
 */
export function decideBotBuffUse(
  hand: Card[],
  availableBuffIds: BuffId[],
  nextPlayerCardCount: number,
  drawPileCount: number
): BotSkillDecision | null {
  // 1. Băng Phong (Freeze Turn): Ưu tiên cao nhất khi đối thủ kế tiếp sắp về (còn <= 3 lá)
  if (availableBuffIds.includes('BUFF_FREEZE_TURN') && nextPlayerCardCount <= 3) {
    return { buffId: 'BUFF_FREEZE_TURN' };
  }

  // 2. Hoán Bài (Swap Card): Tìm lá rác nhỏ (rank 3, 4, 5) không nằm trong bộ để đổi
  if (availableBuffIds.includes('BUFF_SWAP_CARD') && drawPileCount > 0) {
    const sorted = sortCards(hand);
    // Tìm lá rác nhỏ nhất không phải là đôi hay sám
    const rankCounts = new Map<number, number>();
    for (const c of sorted) {
      rankCounts.set(c.rank, (rankCounts.get(c.rank) || 0) + 1);
    }
    const trashCard = sorted.find((c) => c.rank <= 6 && (rankCounts.get(c.rank) || 0) === 1);
    if (trashCard) {
      return { buffId: 'BUFF_SWAP_CARD', cardId: trashCard.id };
    }
  }

  // 3. Mắt Thần (Spy Hand): Kích hoạt để soi bài đối thủ
  if (availableBuffIds.includes('BUFF_SPY_HAND')) {
    return { buffId: 'BUFF_SPY_HAND' };
  }

  return null;
}

/**
 * Thuật toán AI cho Bot Tiến Lên Miền Nam:
 * - Khi cầm vòng tự do: Ưu tiên đánh Sảnh nhỏ, Ba nhỏ, Đôi nhỏ, rồi tới Rác nhỏ (giữ Heo lại).
 * - Khi cần đè bài: Tìm bộ bài nhỏ nhất hợp lệ để đè.
 * - Biết chặt heo bằng 3 đôi thông, Tứ quý hoặc 4 đôi thông.
 * - Không có bài đè được: Bỏ lượt (PASS).
 */
export function decideBotMove(
  hand: Card[],
  lastComboOnTable: HandCombo | null,
  firstTurnRequiredCardId?: number | null
): BotDecision {
  const sortedHand = sortCards(hand);
  if (sortedHand.length === 0) return { action: 'PASS' };

  // 1. VÒNG ĐÁNH TỰ DO (Chưa có bài trên bàn)
  if (!lastComboOnTable || lastComboOnTable.type === ComboType.INVALID) {
    // Nếu có ràng buộc lá bài nhỏ nhất của lượt đầu ván 1
    if (firstTurnRequiredCardId !== undefined && firstTurnRequiredCardId !== null) {
      const requiredCard = sortedHand.find((c) => c.id === firstTurnRequiredCardId);
      if (requiredCard) {
        // 1A1. Thử tìm sảnh chứa requiredCard
        const rankMap = new Map<number, Card[]>();
        for (const c of sortedHand) {
          if (c.rank !== Rank.TWO) {
            if (!rankMap.has(c.rank)) rankMap.set(c.rank, []);
            rankMap.get(c.rank)!.push(c);
          }
        }
        const uniqueRanks = Array.from(rankMap.keys()).sort((a, b) => a - b);
        for (let len = 5; len >= 3; len--) {
          for (let i = 0; i <= uniqueRanks.length - len; i++) {
            const ranksSlice = uniqueRanks.slice(i, i + len);
            if (!ranksSlice.includes(requiredCard.rank)) continue;
            let isStraight = true;
            for (let j = 1; j < len; j++) {
              if (ranksSlice[j] !== ranksSlice[j - 1] + 1) {
                isStraight = false;
                break;
              }
            }
            if (isStraight) {
              const cards: Card[] = [];
              for (const r of ranksSlice) {
                const atR = rankMap.get(r)!;
                if (r === requiredCard.rank) {
                  cards.push(requiredCard);
                } else {
                  cards.push(atR[0]);
                }
              }
              return { action: 'PLAY', cardIds: cards.map((c) => c.id) };
            }
          }
        }

        // 1A2. Thử tìm sám chứa requiredCard
        const sameRank = sortedHand.filter((c) => c.rank === requiredCard.rank);
        if (sameRank.length >= 3) {
          return { action: 'PLAY', cardIds: sameRank.slice(0, 3).map((c) => c.id) };
        }

        // 1A3. Thử tìm đôi chứa requiredCard
        if (sameRank.length >= 2) {
          return { action: 'PLAY', cardIds: sameRank.slice(0, 2).map((c) => c.id) };
        }

        // 1A4. Đánh lá rác bắt buộc
        return { action: 'PLAY', cardIds: [requiredCard.id] };
      }
    }

    // 1A. Tìm sảnh dài nhất có thể từ bài nhỏ (từ 3 lá trở lên, không chứa 2)
    const rankMap = new Map<number, Card[]>();
    for (const c of sortedHand) {
      if (c.rank !== Rank.TWO) {
        if (!rankMap.has(c.rank)) rankMap.set(c.rank, []);
        rankMap.get(c.rank)!.push(c);
      }
    }
    const uniqueRanks = Array.from(rankMap.keys()).sort((a, b) => a - b);
    for (let len = 5; len >= 3; len--) {
      for (let i = 0; i <= uniqueRanks.length - len; i++) {
        let isStraight = true;
        for (let j = 1; j < len; j++) {
          if (uniqueRanks[i + j] !== uniqueRanks[i + j - 1] + 1) {
            isStraight = false;
            break;
          }
        }
        if (isStraight) {
          const cards: Card[] = [];
          for (let j = 0; j < len; j++) {
            cards.push(rankMap.get(uniqueRanks[i + j])![0]);
          }
          return { action: 'PLAY', cardIds: cards.map((c) => c.id) };
        }
      }
    }

    // 1B. Thử tìm sám cô nhỏ nhất (không phải heo)
    for (let i = 0; i < sortedHand.length - 2; i++) {
      if (
        sortedHand[i].rank === sortedHand[i + 1].rank &&
        sortedHand[i + 1].rank === sortedHand[i + 2].rank &&
        sortedHand[i].rank !== Rank.TWO
      ) {
        return {
          action: 'PLAY',
          cardIds: [sortedHand[i].id, sortedHand[i + 1].id, sortedHand[i + 2].id],
        };
      }
    }

    // 1C. Thử tìm đôi nhỏ nhất trước (không phải heo)
    for (let i = 0; i < sortedHand.length - 1; i++) {
      if (sortedHand[i].rank === sortedHand[i + 1].rank && sortedHand[i].rank !== Rank.TWO) {
        return {
          action: 'PLAY',
          cardIds: [sortedHand[i].id, sortedHand[i + 1].id],
        };
      }
    }

    // 1D. Đánh lá rác nhỏ nhất (loại trừ Heo nếu còn bài khác)
    const nonTwos = sortedHand.filter((c) => c.rank !== Rank.TWO);
    if (nonTwos.length > 0) {
      return {
        action: 'PLAY',
        cardIds: [nonTwos[0].id],
      };
    }

    // Nếu chỉ toàn Heo
    return {
      action: 'PLAY',
      cardIds: [sortedHand[0].id],
    };
  }

  // 2. CẦN ĐÈ BÀI TRÊN BÀN
  const targetType = lastComboOnTable.type;

  // A. Đè lá RÁC (SINGLE)
  if (targetType === ComboType.SINGLE) {
    // Thử đè bằng 1 lá lẻ trước
    for (const card of sortedHand) {
      const candidate = evaluateCombo([card]);
      if (canBeatCombo(lastComboOnTable, candidate)) {
        return {
          action: 'PLAY',
          cardIds: [card.id],
        };
      }
    }

    // Nếu bài trên bàn là Heo -> Thử tìm Hàng để chặt (3 đôi thông, Tứ quý, 4 đôi thông)
    if (lastComboOnTable.highestCard.rank === Rank.TWO) {
      // Tìm Tứ quý
      const rankMap = new Map<number, Card[]>();
      for (const c of sortedHand) {
        if (!rankMap.has(c.rank)) rankMap.set(c.rank, []);
        rankMap.get(c.rank)!.push(c);
      }
      for (const [rank, cards] of rankMap.entries()) {
        if (cards.length === 4) {
          const quadCombo = evaluateCombo(cards);
          if (canBeatCombo(lastComboOnTable, quadCombo)) {
            return { action: 'PLAY', cardIds: cards.map((c) => c.id) };
          }
        }
      }
    }
  }

  // B. Đè ĐÔI (PAIR)
  if (targetType === ComboType.PAIR) {
    for (let i = 0; i < sortedHand.length - 1; i++) {
      if (sortedHand[i].rank === sortedHand[i + 1].rank) {
        const candidate = evaluateCombo([sortedHand[i], sortedHand[i + 1]]);
        if (canBeatCombo(lastComboOnTable, candidate)) {
          return {
            action: 'PLAY',
            cardIds: [sortedHand[i].id, sortedHand[i + 1].id],
          };
        }
      }
    }

    // Nếu là Đôi Heo -> Thử chặt bằng Tứ quý
    if (lastComboOnTable.highestCard.rank === Rank.TWO) {
      const rankMap = new Map<number, Card[]>();
      for (const c of sortedHand) {
        if (!rankMap.has(c.rank)) rankMap.set(c.rank, []);
        rankMap.get(c.rank)!.push(c);
      }
      for (const [rank, cards] of rankMap.entries()) {
        if (cards.length === 4) {
          const quadCombo = evaluateCombo(cards);
          if (canBeatCombo(lastComboOnTable, quadCombo)) {
            return { action: 'PLAY', cardIds: cards.map((c) => c.id) };
          }
        }
      }
    }
  }

  // C. Đè SÁM CÔ (TRIPLE)
  if (targetType === ComboType.TRIPLE) {
    for (let i = 0; i < sortedHand.length - 2; i++) {
      if (
        sortedHand[i].rank === sortedHand[i + 1].rank &&
        sortedHand[i + 1].rank === sortedHand[i + 2].rank
      ) {
        const candidate = evaluateCombo([sortedHand[i], sortedHand[i + 1], sortedHand[i + 2]]);
        if (canBeatCombo(lastComboOnTable, candidate)) {
          return {
            action: 'PLAY',
            cardIds: [sortedHand[i].id, sortedHand[i + 1].id, sortedHand[i + 2].id],
          };
        }
      }
    }
  }

  // D. Đè SẢNH (STRAIGHT)
  if (targetType === ComboType.STRAIGHT) {
    const len = lastComboOnTable.length;
    const rankMap = new Map<number, Card[]>();
    for (const c of sortedHand) {
      if (c.rank !== Rank.TWO) {
        if (!rankMap.has(c.rank)) rankMap.set(c.rank, []);
        rankMap.get(c.rank)!.push(c);
      }
    }

    const uniqueRanks = Array.from(rankMap.keys()).sort((a, b) => a - b);
    for (let i = 0; i <= uniqueRanks.length - len; i++) {
      let isStraight = true;
      for (let j = 1; j < len; j++) {
        if (uniqueRanks[i + j] !== uniqueRanks[i + j - 1] + 1) {
          isStraight = false;
          break;
        }
      }
      if (isStraight) {
        const candidateCards: Card[] = [];
        for (let j = 0; j < len; j++) {
          candidateCards.push(rankMap.get(uniqueRanks[i + j])![0]);
        }
        const candidateCombo = evaluateCombo(candidateCards);
        if (canBeatCombo(lastComboOnTable, candidateCombo)) {
          return {
            action: 'PLAY',
            cardIds: candidateCards.map((c) => c.id),
          };
        }
      }
    }
  }

  // Không có bài đè được -> Bỏ lượt
  return { action: 'PASS' };
}
