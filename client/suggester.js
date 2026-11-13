/**
 * Smart Suggester & Local Evaluator for TLMN Client
 * Hỗ trợ nhận diện combo trực quan, kiểm tra tính hợp lệ tức thì và gợi ý bài tự động.
 */

export const Rank = {
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
  SIX: 6,
  SEVEN: 7,
  EIGHT: 8,
  NINE: 9,
  TEN: 10,
  JACK: 11,
  QUEEN: 12,
  KING: 13,
  ACE: 14,
  TWO: 15,
};

export const Suit = {
  SPADE: 0,
  CLUB: 1,
  DIAMOND: 2,
  HEART: 3,
};

const SUIT_SYMBOLS = ['♠', '♣', '♦', '♥'];
const RANK_LABELS = {
  3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2 (Heo)'
};

export function sortCardsClient(cards) {
  return [...cards].sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.suit - b.suit;
  });
}

export function compareCardClient(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  return a.suit - b.suit;
}

export function evaluateLocalCombo(rawCards) {
  if (!rawCards || rawCards.length === 0) {
    return {
      type: 'NONE',
      cards: [],
      label: '',
      isValid: false,
    };
  }

  const cards = sortCardsClient(rawCards);
  const len = cards.length;
  const highestCard = cards[len - 1];

  const invalidResult = {
    type: 'INVALID',
    cards,
    highestCard,
    length: len,
    label: 'Bài không hợp lệ',
    isValid: false,
  };

  // 1 lá: Rác
  if (len === 1) {
    const isPig = highestCard.rank === Rank.TWO;
    const suitSym = SUIT_SYMBOLS[highestCard.suit] || '';
    const name = isPig ? `Heo 2${suitSym}` : `Lá ${RANK_LABELS[highestCard.rank]}${suitSym}`;
    return {
      type: 'SINGLE',
      cards,
      highestCard,
      length: 1,
      label: name,
      isValid: true,
    };
  }

  // 2 lá: Đôi
  if (len === 2) {
    if (cards[0].rank === cards[1].rank) {
      const isPig = cards[0].rank === Rank.TWO;
      const label = isPig ? 'Đôi Heo 2 🐷' : `Đôi ${RANK_LABELS[cards[0].rank]}`;
      return {
        type: 'PAIR',
        cards,
        highestCard,
        length: 2,
        label,
        isValid: true,
      };
    }
    return invalidResult;
  }

  // 3 lá: Sám cô hoặc Sảnh 3
  if (len === 3) {
    if (cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank) {
      const isPig = cards[0].rank === Rank.TWO;
      const label = isPig ? 'Sám Cô Heo 2' : `Sám Cô ${RANK_LABELS[cards[0].rank]}`;
      return {
        type: 'TRIPLE',
        cards,
        highestCard,
        length: 3,
        label,
        isValid: true,
      };
    }
    if (isStraight(cards)) {
      return {
        type: 'STRAIGHT',
        cards,
        highestCard,
        length: 3,
        label: `Sảnh 3 lá (${RANK_LABELS[cards[0].rank]} ➔ ${RANK_LABELS[highestCard.rank]})`,
        isValid: true,
      };
    }
    return invalidResult;
  }

  // 4 lá: Tứ quý hoặc Sảnh 4
  if (len === 4) {
    if (cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank && cards[2].rank === cards[3].rank) {
      const isPig = cards[0].rank === Rank.TWO;
      const label = isPig ? 'Tứ Quý Heo 2 💥' : `Tứ Quý ${RANK_LABELS[cards[0].rank]} 💣`;
      return {
        type: 'FOUR_OF_A_KIND',
        cards,
        highestCard,
        length: 4,
        label,
        isValid: true,
      };
    }
    if (isStraight(cards)) {
      return {
        type: 'STRAIGHT',
        cards,
        highestCard,
        length: 4,
        label: `Sảnh 4 lá (${RANK_LABELS[cards[0].rank]} ➔ ${RANK_LABELS[highestCard.rank]})`,
        isValid: true,
      };
    }
    return invalidResult;
  }

  // 6 lá: 3 Đôi thông hoặc Sảnh 6
  if (len === 6) {
    if (isPairSequence(cards, 3)) {
      return {
        type: 'THREE_PAIR_STRAIGHT',
        cards,
        highestCard,
        length: 6,
        label: `3 Đôi Thông (${RANK_LABELS[cards[0].rank]} ➔ ${RANK_LABELS[highestCard.rank]}) ⚡`,
        isValid: true,
      };
    }
    if (isStraight(cards)) {
      return {
        type: 'STRAIGHT',
        cards,
        highestCard,
        length: 6,
        label: `Sảnh 6 lá (${RANK_LABELS[cards[0].rank]} ➔ ${RANK_LABELS[highestCard.rank]})`,
        isValid: true,
      };
    }
    return invalidResult;
  }

  // 8 lá: 4 Đôi thông hoặc Sảnh 8
  if (len === 8) {
    if (isPairSequence(cards, 4)) {
      return {
        type: 'FOUR_PAIR_STRAIGHT',
        cards,
        highestCard,
        length: 8,
        label: `4 Đôi Thông (${RANK_LABELS[cards[0].rank]} ➔ ${RANK_LABELS[highestCard.rank]}) 💥`,
        isValid: true,
      };
    }
    if (isStraight(cards)) {
      return {
        type: 'STRAIGHT',
        cards,
        highestCard,
        length: 8,
        label: `Sảnh 8 lá (${RANK_LABELS[cards[0].rank]} ➔ ${RANK_LABELS[highestCard.rank]})`,
        isValid: true,
      };
    }
    return invalidResult;
  }

  // Sảnh độ dài bất kỳ (5, 7, 9, 10, 11, 12 lá)
  if (isStraight(cards)) {
    return {
      type: 'STRAIGHT',
      cards,
      highestCard,
      length: len,
      label: `Sảnh ${len} lá (${RANK_LABELS[cards[0].rank]} ➔ ${RANK_LABELS[highestCard.rank]})`,
      isValid: true,
    };
  }

  return invalidResult;
}

function isStraight(sortedCards) {
  const len = sortedCards.length;
  if (len < 3) return false;
  if (sortedCards.some((c) => c.rank === Rank.TWO)) return false;
  for (let i = 1; i < len; i++) {
    if (sortedCards[i].rank !== sortedCards[i - 1].rank + 1) return false;
  }
  return true;
}

function isPairSequence(sortedCards, pairCount) {
  if (sortedCards.length !== pairCount * 2) return false;
  if (sortedCards.some((c) => c.rank === Rank.TWO)) return false;

  const pairRanks = [];
  for (let i = 0; i < pairCount; i++) {
    const c1 = sortedCards[i * 2];
    const c2 = sortedCards[i * 2 + 1];
    if (c1.rank !== c2.rank) return false;
    pairRanks.push(c1.rank);
  }

  for (let i = 1; i < pairCount; i++) {
    if (pairRanks[i] !== pairRanks[i - 1] + 1) return false;
  }
  return true;
}

/**
 * Kiểm tra xem myCombo có thể đè / chặt prevCombo theo luật TLMN hay không.
 */
export function canBeatComboClient(prevCombo, myCombo) {
  if (!prevCombo || !prevCombo.type || prevCombo.type === 'INVALID') {
    return myCombo.isValid;
  }
  if (!myCombo || !myCombo.isValid || myCombo.type === 'INVALID') {
    return false;
  }

  const isPrevPig = prevCombo.type === 'SINGLE' && prevCombo.cards[0].rank === Rank.TWO;
  const isPrevPairOfPigs = prevCombo.type === 'PAIR' && prevCombo.cards[0].rank === Rank.TWO;

  // 1. Chặt Heo đơn:
  if (isPrevPig) {
    if (myCombo.type === 'SINGLE' && myCombo.cards[0].rank === Rank.TWO) {
      return compareCardClient(myCombo.highestCard, prevCombo.highestCard) > 0;
    }
    if (myCombo.type === 'THREE_PAIR_STRAIGHT') return true;
    if (myCombo.type === 'FOUR_OF_A_KIND') return true;
    if (myCombo.type === 'FOUR_PAIR_STRAIGHT') return true;
  }

  // 2. Chặt Đôi Heo:
  if (isPrevPairOfPigs) {
    if (myCombo.type === 'PAIR' && myCombo.cards[0].rank === Rank.TWO) {
      return compareCardClient(myCombo.highestCard, prevCombo.highestCard) > 0;
    }
    if (myCombo.type === 'FOUR_OF_A_KIND') return true;
    if (myCombo.type === 'FOUR_PAIR_STRAIGHT') return true;
  }

  // 3. Chặt 3 đôi thông:
  if (prevCombo.type === 'THREE_PAIR_STRAIGHT') {
    if (myCombo.type === 'THREE_PAIR_STRAIGHT') {
      return compareCardClient(myCombo.highestCard, prevCombo.highestCard) > 0;
    }
    if (myCombo.type === 'FOUR_OF_A_KIND') return true;
    if (myCombo.type === 'FOUR_PAIR_STRAIGHT') return true;
  }

  // 4. Chặt Tứ quý:
  if (prevCombo.type === 'FOUR_OF_A_KIND') {
    if (myCombo.type === 'FOUR_OF_A_KIND') {
      return compareCardClient(myCombo.highestCard, prevCombo.highestCard) > 0;
    }
    if (myCombo.type === 'FOUR_PAIR_STRAIGHT') return true;
  }

  // 5. Chặt 4 đôi thông:
  if (prevCombo.type === 'FOUR_PAIR_STRAIGHT') {
    if (myCombo.type === 'FOUR_PAIR_STRAIGHT') {
      return compareCardClient(myCombo.highestCard, prevCombo.highestCard) > 0;
    }
  }

  // 6. Đè cùng loại bình thường:
  if (myCombo.type !== prevCombo.type) return false;

  if (myCombo.type === 'STRAIGHT') {
    if (myCombo.length !== prevCombo.length) return false;
    return compareCardClient(myCombo.highestCard, prevCombo.highestCard) > 0;
  }

  return compareCardClient(myCombo.highestCard, prevCombo.highestCard) > 0;
}

/**
 * Kiểm tra xem nước đi có phải là chặt hàng đặc biệt không (để nổ hiệu ứng banner Balatro)
 */
export function isChopMove(prevCombo, myCombo) {
  if (!prevCombo || !myCombo || !myCombo.isValid) return false;
  const isPrevPig = (prevCombo.type === 'SINGLE' || prevCombo.type === 'PAIR') && prevCombo.cards[0].rank === Rank.TWO;
  const isChop = isPrevPig && myCombo.type !== prevCombo.type;
  const isChopGoods = prevCombo.type === 'THREE_PAIR_STRAIGHT' && (myCombo.type === 'FOUR_OF_A_KIND' || myCombo.type === 'FOUR_PAIR_STRAIGHT');
  return isChop || isChopGoods;
}

/**
 * Tìm kiếm tổ hợp bài tối ưu nhỏ nhất trên tay để tự động đè bài hoặc đi trước (Smart Suggest / Auto-Beat)
 */
export function findAutoBeatCombo(hand, lastComboOnTable, requiredCardId = null) {
  if (!hand || hand.length === 0) return null;
  const sortedHand = sortCardsClient(hand);

  // 1. VÒNG ĐÁNH TỰ DO (Bàn trống)
  if (!lastComboOnTable || !lastComboOnTable.type || lastComboOnTable.type === 'INVALID') {
    // Nếu có ràng buộc lá bài bắt buộc của lượt đầu ván 1
    if (requiredCardId !== null && requiredCardId !== undefined) {
      const requiredCard = sortedHand.find((c) => c.id === requiredCardId);
      if (requiredCard) {
        // 1A0. Thử tìm sảnh chứa requiredCard
        const rankMap = new Map();
        for (const c of sortedHand) {
          if (c.rank !== Rank.TWO) {
            if (!rankMap.has(c.rank)) rankMap.set(c.rank, []);
            rankMap.get(c.rank).push(c);
          }
        }
        const uniqueRanks = Array.from(rankMap.keys()).sort((a, b) => a - b);
        for (let len = 5; len >= 3; len--) {
          for (let i = 0; i <= uniqueRanks.length - len; i++) {
            const ranksSlice = uniqueRanks.slice(i, i + len);
            if (!ranksSlice.includes(requiredCard.rank)) continue;
            let isSeq = true;
            for (let j = 1; j < len; j++) {
              if (ranksSlice[j] !== ranksSlice[j - 1] + 1) {
                isSeq = false;
                break;
              }
            }
            if (isSeq) {
              const straight = [];
              for (const r of ranksSlice) {
                const atR = rankMap.get(r);
                if (r === requiredCard.rank) {
                  straight.push(requiredCard);
                } else {
                  straight.push(atR[0]);
                }
              }
              return straight;
            }
          }
        }

        // 1A0_2. Thử tìm đôi chứa requiredCard
        const sameRank = sortedHand.filter((c) => c.rank === requiredCard.rank);
        if (sameRank.length >= 2) {
          return sameRank.slice(0, 2);
        }

        // 1A0_3. Đánh lá rác bắt buộc
        return [requiredCard];
      }
    }

    // 1A. Ưu tiên sảnh nhỏ (3 lá trở lên, không chứa Heo)
    const rankMap = new Map();
    for (const c of sortedHand) {
      if (c.rank !== Rank.TWO) {
        if (!rankMap.has(c.rank)) rankMap.set(c.rank, []);
        rankMap.get(c.rank).push(c);
      }
    }
    const uniqueRanks = Array.from(rankMap.keys()).sort((a, b) => a - b);
    for (let len = 5; len >= 3; len--) {
      for (let i = 0; i <= uniqueRanks.length - len; i++) {
        let isSeq = true;
        for (let j = 1; j < len; j++) {
          if (uniqueRanks[i + j] !== uniqueRanks[i + j - 1] + 1) {
            isSeq = false;
            break;
          }
        }
        if (isSeq) {
          const straight = [];
          for (let j = 0; j < len; j++) {
            straight.push(rankMap.get(uniqueRanks[i + j])[0]);
          }
          return straight;
        }
      }
    }

    // 1B. Tìm đôi nhỏ (không phải heo)
    for (let i = 0; i < sortedHand.length - 1; i++) {
      if (sortedHand[i].rank === sortedHand[i + 1].rank && sortedHand[i].rank !== Rank.TWO) {
        return [sortedHand[i], sortedHand[i + 1]];
      }
    }

    // 1C. Đánh lá rác nhỏ nhất không phải Heo
    const nonTwos = sortedHand.filter((c) => c.rank !== Rank.TWO);
    if (nonTwos.length > 0) return [nonTwos[0]];
    return [sortedHand[0]];
  }

  // 2. CẦN ĐÈ BÀI TRÊN BÀN
  const targetType = lastComboOnTable.type;

  // A. Đè Single
  if (targetType === 'SINGLE') {
    // Thử bằng single lớn hơn
    for (const card of sortedHand) {
      const candidate = evaluateLocalCombo([card]);
      if (canBeatComboClient(lastComboOnTable, candidate)) {
        return [card];
      }
    }
    // Nếu bài bàn là Heo -> Thử chặt bằng 3 đôi thông, Tứ quý
    if (lastComboOnTable.highestCard.rank === Rank.TWO) {
      // Thử 3 đôi thông
      const threePair = findConsecPairs(sortedHand, 3, sortedHand[0]);
      if (threePair) return threePair;
      // Thử tứ quý
      const quad = findAnyQuad(sortedHand);
      if (quad) return quad;
    }
    return null;
  }

  // B. Đè Đôi
  if (targetType === 'PAIR') {
    for (let i = 0; i < sortedHand.length - 1; i++) {
      if (sortedHand[i].rank === sortedHand[i + 1].rank) {
        const candidate = evaluateLocalCombo([sortedHand[i], sortedHand[i + 1]]);
        if (canBeatComboClient(lastComboOnTable, candidate)) {
          return [sortedHand[i], sortedHand[i + 1]];
        }
      }
    }
    // Nếu bài bàn là Đôi Heo -> Thử chặt bằng Tứ quý hoặc 4 đôi thông
    if (lastComboOnTable.highestCard.rank === Rank.TWO) {
      const quad = findAnyQuad(sortedHand);
      if (quad) return quad;
      const fourPair = findConsecPairs(sortedHand, 4, sortedHand[0]);
      if (fourPair) return fourPair;
    }
    return null;
  }

  // C. Đè Sám cô
  if (targetType === 'TRIPLE') {
    for (let i = 0; i < sortedHand.length - 2; i++) {
      if (sortedHand[i].rank === sortedHand[i + 1].rank && sortedHand[i + 1].rank === sortedHand[i + 2].rank) {
        const candidate = evaluateLocalCombo([sortedHand[i], sortedHand[i + 1], sortedHand[i + 2]]);
        if (canBeatComboClient(lastComboOnTable, candidate)) {
          return [sortedHand[i], sortedHand[i + 1], sortedHand[i + 2]];
        }
      }
    }
    return null;
  }

  // D. Đè Sảnh
  if (targetType === 'STRAIGHT') {
    const len = lastComboOnTable.length;
    const rankMap = new Map();
    for (const c of sortedHand) {
      if (c.rank !== Rank.TWO) {
        if (!rankMap.has(c.rank)) rankMap.set(c.rank, []);
        rankMap.get(c.rank).push(c);
      }
    }
    const uniqueRanks = Array.from(rankMap.keys()).sort((a, b) => a - b);
    for (let i = 0; i <= uniqueRanks.length - len; i++) {
      let isSeq = true;
      for (let j = 1; j < len; j++) {
        if (uniqueRanks[i + j] !== uniqueRanks[i + j - 1] + 1) {
          isSeq = false;
          break;
        }
      }
      if (isSeq) {
        const straight = [];
        for (let j = 0; j < len; j++) {
          // Lấy lá có suit cao nhất ở lá cuối cùng nếu có thể
          const cardsAtRank = rankMap.get(uniqueRanks[i + j]);
          straight.push(j === len - 1 ? cardsAtRank[cardsAtRank.length - 1] : cardsAtRank[0]);
        }
        const candidate = evaluateLocalCombo(straight);
        if (canBeatComboClient(lastComboOnTable, candidate)) {
          return straight;
        }
      }
    }
    return null;
  }

  // E. Đè 3 đôi thông
  if (targetType === 'THREE_PAIR_STRAIGHT') {
    const threePair = findConsecPairs(sortedHand, 3, sortedHand[0]);
    if (threePair && canBeatComboClient(lastComboOnTable, evaluateLocalCombo(threePair))) {
      return threePair;
    }
    const quad = findAnyQuad(sortedHand);
    if (quad) return quad;
    return null;
  }

  // F. Đè Tứ quý
  if (targetType === 'FOUR_OF_A_KIND') {
    const quad = findAnyQuad(sortedHand, lastComboOnTable.highestCard.rank);
    if (quad) return quad;
    const fourPair = findConsecPairs(sortedHand, 4, sortedHand[0]);
    if (fourPair) return fourPair;
    return null;
  }

  return null;
}

function findAnyQuad(sortedHand, higherThanRank = 0) {
  const rankMap = new Map();
  for (const c of sortedHand) {
    if (!rankMap.has(c.rank)) rankMap.set(c.rank, []);
    rankMap.get(c.rank).push(c);
  }
  for (const [rank, cards] of rankMap.entries()) {
    if (cards.length === 4 && rank > higherThanRank) {
      return cards;
    }
  }
  return null;
}

/**
 * Tự động tìm và chọn các lá bài còn lại khi người chơi click 1 lá
 */
export function autoSuggestComboClient(hand, clickedCard, targetCombo) {
  if (!targetCombo || !targetCombo.type || targetCombo.type === 'INVALID') {
    return [clickedCard];
  }

  const sortedHand = sortCardsClient(hand);

  // 1. Đối phương đánh ĐÔI
  if (targetCombo.type === 'PAIR') {
    const pairCards = sortedHand.filter((c) => c.rank === clickedCard.rank);
    if (pairCards.length >= 2) {
      return pairCards.slice(0, 2);
    }
    return [clickedCard];
  }

  // 2. Đối phương đánh SÁM CÔ
  if (targetCombo.type === 'TRIPLE') {
    const tripleCards = sortedHand.filter((c) => c.rank === clickedCard.rank);
    if (tripleCards.length >= 3) {
      return tripleCards.slice(0, 3);
    }
    return [clickedCard];
  }

  // 3. Đối phương đánh TỨ QUÝ
  if (targetCombo.type === 'FOUR_OF_A_KIND') {
    const fourCards = sortedHand.filter((c) => c.rank === clickedCard.rank);
    if (fourCards.length === 4) {
      return fourCards;
    }
    return [clickedCard];
  }

  // 4. Đối phương đánh SẢNH
  if (targetCombo.type === 'STRAIGHT') {
    const straightLength = targetCombo.length || targetCombo.cards.length;
    if (clickedCard.rank === Rank.TWO) return [clickedCard];

    const rankMap = new Map();
    for (const c of sortedHand) {
      if (c.rank !== Rank.TWO) {
        if (!rankMap.has(c.rank)) rankMap.set(c.rank, []);
        rankMap.get(c.rank).push(c);
      }
    }

    const startRank = clickedCard.rank;
    let found = null;

    if (hasConsec(rankMap, startRank, straightLength)) {
      found = buildStraight(rankMap, startRank, straightLength, clickedCard);
    }
    if (!found) {
      const startRankBack = startRank - straightLength + 1;
      if (startRankBack >= 3 && hasConsec(rankMap, startRankBack, straightLength)) {
        found = buildStraight(rankMap, startRankBack, straightLength, clickedCard);
      }
    }
    if (!found) {
      for (let offset = 1; offset < straightLength; offset++) {
        const testStart = startRank - offset;
        if (testStart >= 3 && hasConsec(rankMap, testStart, straightLength)) {
          found = buildStraight(rankMap, testStart, straightLength, clickedCard);
          break;
        }
      }
    }

    if (found) return found;
    return [clickedCard];
  }

  // 5. 3 Đôi thông
  if (targetCombo.type === 'THREE_PAIR_STRAIGHT') {
    const pairs = findConsecPairs(sortedHand, 3, clickedCard);
    if (pairs) return pairs;
  }

  // 6. 4 Đôi thông
  if (targetCombo.type === 'FOUR_PAIR_STRAIGHT') {
    const pairs = findConsecPairs(sortedHand, 4, clickedCard);
    if (pairs) return pairs;
  }

  return [clickedCard];
}

function hasConsec(rankMap, start, len) {
  for (let r = start; r < start + len; r++) {
    if (!rankMap.has(r) || rankMap.get(r).length === 0) return false;
  }
  return true;
}

function buildStraight(rankMap, start, len, preferredCard) {
  const result = [];
  for (let r = start; r < start + len; r++) {
    const cards = rankMap.get(r);
    if (r === preferredCard.rank) {
      result.push(preferredCard);
    } else {
      result.push(cards[0]);
    }
  }
  return result;
}

function findConsecPairs(sortedHand, count, preferredCard) {
  const pairMap = new Map();
  for (const c of sortedHand) {
    if (c.rank !== Rank.TWO) {
      if (!pairMap.has(c.rank)) pairMap.set(c.rank, []);
      pairMap.get(c.rank).push(c);
    }
  }

  const validRanks = Array.from(pairMap.keys())
    .filter((r) => pairMap.get(r).length >= 2)
    .sort((a, b) => a - b);

  for (let i = 0; i <= validRanks.length - count; i++) {
    let isConsec = true;
    for (let j = 1; j < count; j++) {
      if (validRanks[i + j] !== validRanks[i + j - 1] + 1) {
        isConsec = false;
        break;
      }
    }
    if (isConsec) {
      const ranks = validRanks.slice(i, i + count);
      if (!preferredCard || ranks.includes(preferredCard.rank) || i === 0) {
        const result = [];
        for (const r of ranks) {
          const cardsAtR = pairMap.get(r);
          if (preferredCard && r === preferredCard.rank) {
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
