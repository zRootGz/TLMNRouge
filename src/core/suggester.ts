import type { Card, HandCombo } from './types.ts';
import { ComboType, Rank } from './types.ts';
import { sortCards } from './deck.ts';
import { canBeatCombo, evaluateCombo } from './evaluator.ts';

/**
 * Tự động tìm và chọn các lá bài còn lại để tạo thành combo cùng dạng với bài người đi trước.
 * @param hand Bài hiện tại trên tay người chơi
 * @param clickedCard Lá bài người chơi vừa nhấp chọn
 * @param targetCombo Bài của người đi trước đang có trên bàn
 * @returns Mảng các lá bài được tự động chọn (nếu tìm thấy combo hợp lệ), hoặc chỉ chứa chính clickedCard
 */
export function autoSuggestCombo(
  hand: Card[],
  clickedCard: Card,
  targetCombo: HandCombo | null
): Card[] {
  // Nếu bàn trống (lượt tự do), chưa có bài người đi trước -> chỉ chọn lá được click
  if (!targetCombo || targetCombo.type === ComboType.INVALID) {
    return [clickedCard];
  }

  const sortedHand = sortCards(hand);

  // 1. Người đi trước đánh ĐÔI (PAIR)
  if (targetCombo.type === ComboType.PAIR) {
    const pairCards = sortedHand.filter((c) => c.rank === clickedCard.rank);
    if (pairCards.length >= 2) {
      // Ưu tiên lấy 2 lá sao cho có chứa clickedCard và có thể đè được targetCombo
      const candidates = pairCards.slice(0, 2);
      const evaluated = evaluateCombo(candidates);
      if (canBeatCombo(targetCombo, evaluated)) {
        return candidates;
      }
      // Nếu 2 lá đầu không đè được mà có 3 lá, thử cặp chứa lá chất cao nhất
      if (pairCards.length >= 3) {
        const topPair = [clickedCard, pairCards[pairCards.length - 1]];
        if (canBeatCombo(targetCombo, evaluateCombo(topPair))) {
          return topPair;
        }
      }
      return candidates;
    }
    return [clickedCard];
  }

  // 2. Người đi trước đánh SÁM CÔ (TRIPLE)
  if (targetCombo.type === ComboType.TRIPLE) {
    const tripleCards = sortedHand.filter((c) => c.rank === clickedCard.rank);
    if (tripleCards.length >= 3) {
      return tripleCards.slice(0, 3);
    }
    return [clickedCard];
  }

  // 3. Người đi trước đánh TỨ QUÝ (FOUR_OF_A_KIND)
  if (targetCombo.type === ComboType.FOUR_OF_A_KIND) {
    const fourCards = sortedHand.filter((c) => c.rank === clickedCard.rank);
    if (fourCards.length === 4) {
      return fourCards;
    }
    return [clickedCard];
  }

  // 4. Người đi trước đánh SẢNH (STRAIGHT) độ dài K
  if (targetCombo.type === ComboType.STRAIGHT) {
    const straightLength = targetCombo.length;
    // Không xét heo vì sảnh không có heo
    if (clickedCard.rank === Rank.TWO) return [clickedCard];

    // Gom bài trên tay theo rank (mỗi rank lấy 1 lá, ưu tiên lá clickedCard nếu cùng rank)
    const rankMap = new Map<number, Card[]>();
    for (const c of sortedHand) {
      if (c.rank !== Rank.TWO) {
        if (!rankMap.has(c.rank)) rankMap.set(c.rank, []);
        rankMap.get(c.rank)!.push(c);
      }
    }

    // Tìm sảnh độ dài K bắt đầu từ clickedCard.rank
    const startRank = clickedCard.rank;
    let foundStraight: Card[] | null = null;

    // Cách A: clickedCard là lá bắt đầu của sảnh
    if (hasConsecutiveRanks(rankMap, startRank, straightLength)) {
      foundStraight = buildStraightFrom(rankMap, startRank, straightLength, clickedCard);
    }

    // Cách B: clickedCard là lá kết thúc của sảnh
    if (!foundStraight) {
      const startRankBack = startRank - straightLength + 1;
      if (startRankBack >= Rank.THREE && hasConsecutiveRanks(rankMap, startRankBack, straightLength)) {
        foundStraight = buildStraightFrom(rankMap, startRankBack, straightLength, clickedCard);
      }
    }

    // Cách C: clickedCard nằm ở giữa sảnh
    if (!foundStraight) {
      for (let offset = 1; offset < straightLength; offset++) {
        const testStart = startRank - offset;
        if (testStart >= Rank.THREE && hasConsecutiveRanks(rankMap, testStart, straightLength)) {
          foundStraight = buildStraightFrom(rankMap, testStart, straightLength, clickedCard);
          break;
        }
      }
    }

    if (foundStraight) {
      return foundStraight;
    }

    return [clickedCard];
  }

  // 5. Người đi trước đánh 3 ĐÔI THÔNG (THREE_PAIR_STRAIGHT)
  if (targetCombo.type === ComboType.THREE_PAIR_STRAIGHT) {
    const pairs = findConsecutivePairs(sortedHand, 3, clickedCard);
    if (pairs) return pairs;
    return [clickedCard];
  }

  // 6. Người đi trước đánh 4 ĐÔI THÔNG (FOUR_PAIR_STRAIGHT)
  if (targetCombo.type === ComboType.FOUR_PAIR_STRAIGHT) {
    const pairs = findConsecutivePairs(sortedHand, 4, clickedCard);
    if (pairs) return pairs;
    return [clickedCard];
  }

  // Mặc định lá rác
  return [clickedCard];
}

function hasConsecutiveRanks(
  rankMap: Map<number, Card[]>,
  startRank: number,
  length: number
): boolean {
  for (let r = startRank; r < startRank + length; r++) {
    if (!rankMap.has(r) || rankMap.get(r)!.length === 0) {
      return false;
    }
  }
  return true;
}

function buildStraightFrom(
  rankMap: Map<number, Card[]>,
  startRank: number,
  length: number,
  preferredCard: Card
): Card[] {
  const result: Card[] = [];
  for (let r = startRank; r < startRank + length; r++) {
    const cardsAtRank = rankMap.get(r)!;
    if (r === preferredCard.rank) {
      result.push(preferredCard);
    } else {
      // Ưu tiên lấy lá có chất nhỏ nhất hoặc đầu tiên
      result.push(cardsAtRank[0]);
    }
  }
  return result;
}

function findConsecutivePairs(
  sortedHand: Card[],
  pairCount: number,
  preferredCard: Card
): Card[] | null {
  // Tìm các rank có từ 2 lá trở lên (không tính Heo)
  const pairMap = new Map<number, Card[]>();
  for (const c of sortedHand) {
    if (c.rank !== Rank.TWO) {
      if (!pairMap.has(c.rank)) pairMap.set(c.rank, []);
      pairMap.get(c.rank)!.push(c);
    }
  }

  const validPairRanks = Array.from(pairMap.keys())
    .filter((r) => pairMap.get(r)!.length >= 2)
    .sort((a, b) => a - b);

  // Tìm dãy pairCount rank liên tiếp
  for (let i = 0; i <= validPairRanks.length - pairCount; i++) {
    let isConsec = true;
    for (let j = 1; j < pairCount; j++) {
      if (validPairRanks[i + j] !== validPairRanks[i + j - 1] + 1) {
        isConsec = false;
        break;
      }
    }

    if (isConsec) {
      // Kiểm tra xem dãy này có chứa preferredCard không (hoặc là dãy liên tiếp đầu tiên)
      const targetRanks = validPairRanks.slice(i, i + pairCount);
      if (targetRanks.includes(preferredCard.rank) || i === 0) {
        const result: Card[] = [];
        for (const r of targetRanks) {
          const cardsAtR = pairMap.get(r)!;
          if (r === preferredCard.rank) {
            result.push(preferredCard);
            const other = cardsAtR.find((c) => c.id !== preferredCard.id) || cardsAtR[0];
            result.push(other);
          } else {
            result.push(cardsAtR[0], cardsAtR[1]);
          }
        }
        return result;
      }
    }
  }

  return null;
}

