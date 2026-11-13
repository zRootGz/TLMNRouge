import {
  ComboType,
  InstantWinType,
  Rank,
  Suit,
} from './types.ts';
import type {
  Card,
  HandCombo,
  InstantWinResult,
  PenaltyBreakdown,
} from './types.ts';
import { sortCards } from './deck.ts';

export function evaluateCombo(rawCards: Card[]): HandCombo {
  const cards = sortCards(rawCards);
  const len = cards.length;

  const invalidCombo: HandCombo = {
    type: ComboType.INVALID,
    cards,
    highestCard: cards[len - 1] || null!,
    length: len,
  };

  if (len === 0) return invalidCombo;

  const highestCard = cards[len - 1];

  // 1 lá: Rác
  if (len === 1) {
    return {
      type: ComboType.SINGLE,
      cards,
      highestCard,
      length: 1,
    };
  }

  // 2 lá: Đôi
  if (len === 2) {
    if (cards[0].rank === cards[1].rank) {
      return {
        type: ComboType.PAIR,
        cards,
        highestCard,
        length: 2,
      };
    }
    return invalidCombo;
  }

  // 3 lá: Sám hoặc Sảnh 3
  if (len === 3) {
    if (cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank) {
      return {
        type: ComboType.TRIPLE,
        cards,
        highestCard,
        length: 3,
      };
    }
    if (isStraight(cards)) {
      return {
        type: ComboType.STRAIGHT,
        cards,
        highestCard,
        length: 3,
      };
    }
    return invalidCombo;
  }

  // 4 lá: Tứ quý hoặc Sảnh 4
  if (len === 4) {
    if (
      cards[0].rank === cards[1].rank &&
      cards[1].rank === cards[2].rank &&
      cards[2].rank === cards[3].rank
    ) {
      return {
        type: ComboType.FOUR_OF_A_KIND,
        cards,
        highestCard,
        length: 4,
      };
    }
    if (isStraight(cards)) {
      return {
        type: ComboType.STRAIGHT,
        cards,
        highestCard,
        length: 4,
      };
    }
    return invalidCombo;
  }

  // 6 lá: 3 Đôi thông hoặc Sảnh 6
  if (len === 6) {
    if (isPairSequence(cards, 3)) {
      return {
        type: ComboType.THREE_PAIR_STRAIGHT,
        cards,
        highestCard,
        length: 6,
      };
    }
    if (isStraight(cards)) {
      return {
        type: ComboType.STRAIGHT,
        cards,
        highestCard,
        length: 6,
      };
    }
    return invalidCombo;
  }

  // 8 lá: 4 Đôi thông hoặc Sảnh 8
  if (len === 8) {
    if (isPairSequence(cards, 4)) {
      return {
        type: ComboType.FOUR_PAIR_STRAIGHT,
        cards,
        highestCard,
        length: 8,
      };
    }
    if (isStraight(cards)) {
      return {
        type: ComboType.STRAIGHT,
        cards,
        highestCard,
        length: 8,
      };
    }
    return invalidCombo;
  }

  // Kiểm tra Sảnh độ dài tổng quát (5, 7, 9, 10, 11, 12 lá)
  if (isStraight(cards)) {
    return {
      type: ComboType.STRAIGHT,
      cards,
      highestCard,
      length: len,
    };
  }

  return invalidCombo;
}

function isStraight(sortedCards: Card[]): boolean {
  const len = sortedCards.length;
  if (len < 3) return false;

  // Sảnh trong TLMN không được chứa lá 2 (Heo)
  if (sortedCards.some((c) => c.rank === Rank.TWO)) return false;

  for (let i = 1; i < len; i++) {
    if (sortedCards[i].rank !== sortedCards[i - 1].rank + 1) {
      return false;
    }
  }

  return true;
}

function isPairSequence(sortedCards: Card[], pairCount: number): boolean {
  if (sortedCards.length !== pairCount * 2) return false;

  // Không được chứa Heo (Rank.TWO)
  if (sortedCards.some((c) => c.rank === Rank.TWO)) return false;

  const pairRanks: number[] = [];

  for (let i = 0; i < pairCount; i++) {
    const c1 = sortedCards[i * 2];
    const c2 = sortedCards[i * 2 + 1];
    if (c1.rank !== c2.rank) return false;
    pairRanks.push(c1.rank);
  }

  for (let i = 1; i < pairCount; i++) {
    if (pairRanks[i] !== pairRanks[i - 1] + 1) {
      return false;
    }
  }

  return true;
}

export function compareCard(a: Card, b: Card): number {
  if (a.rank !== b.rank) {
    return a.rank - b.rank;
  }
  return a.suit - b.suit;
}

/**
 * Kiểm tra xem nextCombo có thể đè / chặt prevCombo theo luật TLMN hay không.
 */
export function canBeatCombo(prevCombo: HandCombo, nextCombo: HandCombo): boolean {
  if (prevCombo.type === ComboType.INVALID || nextCombo.type === ComboType.INVALID) {
    return false;
  }

  const isPrevPig = prevCombo.type === ComboType.SINGLE && prevCombo.cards[0].rank === Rank.TWO;
  const isPrevPairOfPigs =
    prevCombo.type === ComboType.PAIR && prevCombo.cards[0].rank === Rank.TWO;

  // --- LUẬT CHẶT ĐẶC BIỆT ---

  // 1. Chặt Heo đơn:
  if (isPrevPig) {
    // Heo lớn hơn đè heo nhỏ
    if (nextCombo.type === ComboType.SINGLE && nextCombo.cards[0].rank === Rank.TWO) {
      return compareCard(nextCombo.highestCard, prevCombo.highestCard) > 0;
    }
    // 3 đôi thông chặt được 1 heo
    if (nextCombo.type === ComboType.THREE_PAIR_STRAIGHT) return true;
    // Tứ quý chặt được 1 heo
    if (nextCombo.type === ComboType.FOUR_OF_A_KIND) return true;
    // 4 đôi thông chặt được 1 heo
    if (nextCombo.type === ComboType.FOUR_PAIR_STRAIGHT) return true;
  }

  // 2. Chặt Đôi Heo:
  if (isPrevPairOfPigs) {
    // Đôi heo lớn hơn
    if (nextCombo.type === ComboType.PAIR && nextCombo.cards[0].rank === Rank.TWO) {
      return compareCard(nextCombo.highestCard, prevCombo.highestCard) > 0;
    }
    // Tứ quý chặt được đôi heo
    if (nextCombo.type === ComboType.FOUR_OF_A_KIND) return true;
    // 4 đôi thông chặt được đôi heo
    if (nextCombo.type === ComboType.FOUR_PAIR_STRAIGHT) return true;
  }

  // 3. Chặt 3 đôi thông:
  if (prevCombo.type === ComboType.THREE_PAIR_STRAIGHT) {
    // 3 đôi thông lớn hơn
    if (nextCombo.type === ComboType.THREE_PAIR_STRAIGHT) {
      return compareCard(nextCombo.highestCard, prevCombo.highestCard) > 0;
    }
    // Tứ quý chặt được 3 đôi thông
    if (nextCombo.type === ComboType.FOUR_OF_A_KIND) return true;
    // 4 đôi thông chặt được 3 đôi thông
    if (nextCombo.type === ComboType.FOUR_PAIR_STRAIGHT) return true;
  }

  // 4. Chặt Tứ quý:
  if (prevCombo.type === ComboType.FOUR_OF_A_KIND) {
    // Tứ quý lớn hơn
    if (nextCombo.type === ComboType.FOUR_OF_A_KIND) {
      return compareCard(nextCombo.highestCard, prevCombo.highestCard) > 0;
    }
    // 4 đôi thông chặt được tứ quý
    if (nextCombo.type === ComboType.FOUR_PAIR_STRAIGHT) return true;
  }

  // 5. Chặt 4 đôi thông:
  if (prevCombo.type === ComboType.FOUR_PAIR_STRAIGHT) {
    // Chỉ 4 đôi thông lớn hơn mới đè được
    if (nextCombo.type === ComboType.FOUR_PAIR_STRAIGHT) {
      return compareCard(nextCombo.highestCard, prevCombo.highestCard) > 0;
    }
  }

  // --- LUẬT ĐÁNH BÌNH THƯỜNG (Cùng kiểu và cùng độ dài) ---
  if (prevCombo.type === nextCombo.type && prevCombo.length === nextCombo.length) {
    return compareCard(nextCombo.highestCard, prevCombo.highestCard) > 0;
  }

  return false;
}

/**
 * Kiểm tra các trường hợp Tới Trắng ngay sau khi chia bài (13 lá).
 */
export function checkInstantWin(rawCards: Card[]): InstantWinResult {
  if (rawCards.length !== 13) {
    return { hasInstantWin: false };
  }

  const cards = sortCards(rawCards);

  // 1. Tứ quý 2 (Heo)
  const twos = cards.filter((c) => c.rank === Rank.TWO);
  if (twos.length === 4) {
    return {
      hasInstantWin: true,
      type: InstantWinType.FOUR_TWOS,
      description: 'Tứ quý Heo (4 con 2)',
    };
  }

  // 2. Sảnh Rồng (3 tới A: 12 lá hoặc 3 tới 2: 13 lá)
  const ranks = Array.from(new Set(cards.map((c) => c.rank)));
  const has3toA = [
    Rank.THREE, Rank.FOUR, Rank.FIVE, Rank.SIX, Rank.SEVEN,
    Rank.EIGHT, Rank.NINE, Rank.TEN, Rank.JACK, Rank.QUEEN,
    Rank.KING, Rank.ACE,
  ].every((r) => ranks.includes(r));

  if (has3toA) {
    return {
      hasInstantWin: true,
      type: InstantWinType.DRAGON_STRAIGHT,
      description: 'Sảnh Rồng (3 đến Át)',
    };
  }

  // 3. Đếm số đôi (Pairs)
  const rankCounts = new Map<number, number>();
  for (const c of cards) {
    rankCounts.set(c.rank, (rankCounts.get(c.rank) || 0) + 1);
  }

  let totalPairs = 0;
  const pairedRanks: number[] = [];
  for (const [rank, count] of rankCounts.entries()) {
    const pairs = Math.floor(count / 2);
    totalPairs += pairs;
    if (pairs > 0 && rank !== Rank.TWO) {
      pairedRanks.push(rank);
    }
  }

  // 4. 6 đôi bất kỳ
  if (totalPairs >= 6) {
    return {
      hasInstantWin: true,
      type: InstantWinType.SIX_PAIRS,
      description: '6 đôi bất kỳ',
    };
  }

  // 5. 5 đôi thông (5 đôi liên tiếp không chứa Heo)
  if (pairedRanks.length >= 5) {
    pairedRanks.sort((a, b) => a - b);
    let consecutiveCount = 1;
    for (let i = 1; i < pairedRanks.length; i++) {
      if (pairedRanks[i] === pairedRanks[i - 1] + 1) {
        consecutiveCount++;
        if (consecutiveCount >= 5) {
          return {
            hasInstantWin: true,
            type: InstantWinType.FIVE_PAIR_STRAIGHT,
            description: '5 đôi thông liên tiếp',
          };
        }
      } else {
        consecutiveCount = 1;
      }
    }
  }

  // 6. Đồng chất (13 lá cùng màu đỏ hoặc toàn đen)
  const isAllRed = cards.every((c) => c.suit === Suit.DIAMOND || c.suit === Suit.HEART);
  const isAllBlack = cards.every((c) => c.suit === Suit.SPADE || c.suit === Suit.CLUB);

  if (isAllRed || isAllBlack) {
    return {
      hasInstantWin: true,
      type: InstantWinType.SAME_COLOR,
      description: isAllRed ? 'Đồng chất đỏ (13 lá Rô/Cơ)' : 'Đồng chất đen (13 lá Bích/Chuồn)',
    };
  }

  return { hasInstantWin: false };
}

/**
 * Tính toán tiền phạt thối heo / thối hàng / cóng khi ván bài kết thúc.
 * Đơn vị quy chuẩn:
 * - Heo đen: 1 điểm
 * - Heo đỏ: 2 điểm
 * - 3 đôi thông: 3 điểm
 * - Tứ quý: 4 điểm
 * - 4 đôi thông: 6 điểm
 * - Cóng: nhân đôi toàn bộ hình phạt
 */
export function calculatePenalties(
  remainingCards: Card[],
  hasPlayedAnyCard: boolean
): PenaltyBreakdown {
  const isCong = !hasPlayedAnyCard && remainingCards.length === 13;

  let blackPigs = 0;
  let redPigs = 0;

  for (const card of remainingCards) {
    if (card.rank === Rank.TWO) {
      if (card.suit === Suit.SPADE || card.suit === Suit.CLUB) {
        blackPigs++;
      } else {
        redPigs++;
      }
    }
  }

  // Đếm tứ quý
  const rankCounts = new Map<number, number>();
  for (const c of remainingCards) {
    rankCounts.set(c.rank, (rankCounts.get(c.rank) || 0) + 1);
  }

  let fourOfAKinds = 0;
  for (const [rank, count] of rankCounts.entries()) {
    if (count === 4 && rank !== Rank.TWO) {
      fourOfAKinds++;
    }
  }

  // Đếm 4 đôi thông và 3 đôi thông
  const nonPigPairs: number[] = [];
  for (const [rank, count] of rankCounts.entries()) {
    if (count >= 2 && rank !== Rank.TWO) {
      nonPigPairs.push(rank);
    }
  }
  nonPigPairs.sort((a, b) => a - b);

  let threePairStraights = 0;
  let fourPairStraights = 0;

  // Kiểm tra 4 đôi thông
  let maxConsec = 1;
  let currentConsec = 1;
  for (let i = 1; i < nonPigPairs.length; i++) {
    if (nonPigPairs[i] === nonPigPairs[i - 1] + 1) {
      currentConsec++;
      if (currentConsec > maxConsec) maxConsec = currentConsec;
    } else {
      currentConsec = 1;
    }
  }

  if (maxConsec >= 4) {
    fourPairStraights = 1;
  } else if (maxConsec === 3) {
    threePairStraights = 1;
  }

  let baseUnits =
    blackPigs * 1 +
    redPigs * 2 +
    threePairStraights * 3 +
    fourOfAKinds * 4 +
    fourPairStraights * 6;

  // Nếu bị cóng, phạt bổ sung thêm 2 ván cược cơ bản và nhân đôi phần thối
  let totalPenaltyUnits = baseUnits;
  if (isCong) {
    totalPenaltyUnits = baseUnits * 2 + 4; // 4 đơn vị cơ bản cho việc bị cóng
  }

  return {
    isCong,
    blackPigs,
    redPigs,
    threePairStraights,
    fourOfAKinds,
    fourPairStraights,
    totalPenaltyUnits,
  };
}
