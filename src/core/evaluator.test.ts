import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ComboType, InstantWinType, Rank, Suit } from './types.ts';
import type { Card } from './types.ts';
import {
  canBeatCombo,
  calculatePenalties,
  checkInstantWin,
  evaluateCombo,
} from './evaluator.ts';

// Helper tạo lá bài nhanh
function c(rank: number, suit: number): Card {
  return { id: 0, rank: rank as any, suit: suit as any, code: `${rank}${suit}` };
}

describe('TLMN Evaluator Tests', () => {
  describe('evaluateCombo', () => {
    it('nhận diện lá Rác (SINGLE)', () => {
      const res = evaluateCombo([c(Rank.THREE, Suit.SPADE)]);
      assert.equal(res.type, ComboType.SINGLE);
      assert.equal(res.highestCard.rank, Rank.THREE);
    });

    it('nhận diện Đôi (PAIR)', () => {
      const res = evaluateCombo([c(Rank.FOUR, Suit.SPADE), c(Rank.FOUR, Suit.HEART)]);
      assert.equal(res.type, ComboType.PAIR);
      assert.equal(res.highestCard.suit, Suit.HEART);
    });

    it('nhận diện Sám cô (TRIPLE)', () => {
      const res = evaluateCombo([
        c(Rank.JACK, Suit.SPADE),
        c(Rank.JACK, Suit.CLUB),
        c(Rank.JACK, Suit.DIAMOND),
      ]);
      assert.equal(res.type, ComboType.TRIPLE);
    });

    it('nhận diện Tứ quý (FOUR_OF_A_KIND)', () => {
      const res = evaluateCombo([
        c(Rank.SEVEN, Suit.SPADE),
        c(Rank.SEVEN, Suit.CLUB),
        c(Rank.SEVEN, Suit.DIAMOND),
        c(Rank.SEVEN, Suit.HEART),
      ]);
      assert.equal(res.type, ComboType.FOUR_OF_A_KIND);
    });

    it('nhận diện Sảnh hợp lệ (STRAIGHT)', () => {
      const res = evaluateCombo([
        c(Rank.THREE, Suit.SPADE),
        c(Rank.FOUR, Suit.HEART),
        c(Rank.FIVE, Suit.DIAMOND),
        c(Rank.SIX, Suit.CLUB),
      ]);
      assert.equal(res.type, ComboType.STRAIGHT);
      assert.equal(res.length, 4);
      assert.equal(res.highestCard.rank, Rank.SIX);
    });

    it('từ chối Sảnh có chứa Heo (Rank.TWO)', () => {
      const res = evaluateCombo([
        c(Rank.KING, Suit.SPADE),
        c(Rank.ACE, Suit.HEART),
        c(Rank.TWO, Suit.DIAMOND),
      ]);
      assert.equal(res.type, ComboType.INVALID);
    });

    it('nhận diện 3 đôi thông (THREE_PAIR_STRAIGHT)', () => {
      const res = evaluateCombo([
        c(Rank.FIVE, Suit.SPADE),
        c(Rank.FIVE, Suit.HEART),
        c(Rank.SIX, Suit.CLUB),
        c(Rank.SIX, Suit.DIAMOND),
        c(Rank.SEVEN, Suit.SPADE),
        c(Rank.SEVEN, Suit.HEART),
      ]);
      assert.equal(res.type, ComboType.THREE_PAIR_STRAIGHT);
      assert.equal(res.highestCard.rank, Rank.SEVEN);
    });

    it('nhận diện 4 đôi thông (FOUR_PAIR_STRAIGHT)', () => {
      const res = evaluateCombo([
        c(Rank.NINE, Suit.SPADE),
        c(Rank.NINE, Suit.HEART),
        c(Rank.TEN, Suit.CLUB),
        c(Rank.TEN, Suit.DIAMOND),
        c(Rank.JACK, Suit.SPADE),
        c(Rank.JACK, Suit.HEART),
        c(Rank.QUEEN, Suit.SPADE),
        c(Rank.QUEEN, Suit.HEART),
      ]);
      assert.equal(res.type, ComboType.FOUR_PAIR_STRAIGHT);
      assert.equal(res.highestCard.rank, Rank.QUEEN);
    });
  });

  describe('canBeatCombo (Đè bài & Chặt hàng)', () => {
    it('đè bài rác bình thường theo chất và số', () => {
      const c1 = evaluateCombo([c(Rank.THREE, Suit.SPADE)]);
      const c2 = evaluateCombo([c(Rank.THREE, Suit.HEART)]);
      const c3 = evaluateCombo([c(Rank.FOUR, Suit.SPADE)]);

      assert.equal(canBeatCombo(c1, c2), true); // 3♥ đè 3♠
      assert.equal(canBeatCombo(c2, c1), false);
      assert.equal(canBeatCombo(c2, c3), true); // 4♠ đè 3♥
    });

    it('chặt Heo đơn bằng Heo lớn hơn', () => {
      const pigSpade = evaluateCombo([c(Rank.TWO, Suit.SPADE)]);
      const pigHeart = evaluateCombo([c(Rank.TWO, Suit.HEART)]);
      assert.equal(canBeatCombo(pigSpade, pigHeart), true);
    });

    it('chặt Heo đơn bằng 3 đôi thông, Tứ quý và 4 đôi thông', () => {
      const pig = evaluateCombo([c(Rank.TWO, Suit.HEART)]);
      const threePairs = evaluateCombo([
        c(Rank.THREE, Suit.SPADE), c(Rank.THREE, Suit.CLUB),
        c(Rank.FOUR, Suit.SPADE), c(Rank.FOUR, Suit.CLUB),
        c(Rank.FIVE, Suit.SPADE), c(Rank.FIVE, Suit.CLUB),
      ]);
      const fourOfAKind = evaluateCombo([
        c(Rank.SIX, Suit.SPADE), c(Rank.SIX, Suit.CLUB),
        c(Rank.SIX, Suit.DIAMOND), c(Rank.SIX, Suit.HEART),
      ]);
      const fourPairs = evaluateCombo([
        c(Rank.SEVEN, Suit.SPADE), c(Rank.SEVEN, Suit.CLUB),
        c(Rank.EIGHT, Suit.SPADE), c(Rank.EIGHT, Suit.CLUB),
        c(Rank.NINE, Suit.SPADE), c(Rank.NINE, Suit.CLUB),
        c(Rank.TEN, Suit.SPADE), c(Rank.TEN, Suit.CLUB),
      ]);

      assert.equal(canBeatCombo(pig, threePairs), true);
      assert.equal(canBeatCombo(pig, fourOfAKind), true);
      assert.equal(canBeatCombo(pig, fourPairs), true);
    });

    it('chặt Đôi Heo bằng Tứ quý và 4 đôi thông (3 đôi thông không chặt được đôi heo)', () => {
      const pairPigs = evaluateCombo([
        c(Rank.TWO, Suit.SPADE),
        c(Rank.TWO, Suit.CLUB),
      ]);
      const threePairs = evaluateCombo([
        c(Rank.THREE, Suit.SPADE), c(Rank.THREE, Suit.CLUB),
        c(Rank.FOUR, Suit.SPADE), c(Rank.FOUR, Suit.CLUB),
        c(Rank.FIVE, Suit.SPADE), c(Rank.FIVE, Suit.CLUB),
      ]);
      const fourOfAKind = evaluateCombo([
        c(Rank.JACK, Suit.SPADE), c(Rank.JACK, Suit.CLUB),
        c(Rank.JACK, Suit.DIAMOND), c(Rank.JACK, Suit.HEART),
      ]);
      const fourPairs = evaluateCombo([
        c(Rank.SEVEN, Suit.SPADE), c(Rank.SEVEN, Suit.CLUB),
        c(Rank.EIGHT, Suit.SPADE), c(Rank.EIGHT, Suit.CLUB),
        c(Rank.NINE, Suit.SPADE), c(Rank.NINE, Suit.CLUB),
        c(Rank.TEN, Suit.SPADE), c(Rank.TEN, Suit.CLUB),
      ]);

      assert.equal(canBeatCombo(pairPigs, threePairs), false); // 3 đôi thông không chặt được đôi heo!
      assert.equal(canBeatCombo(pairPigs, fourOfAKind), true);
      assert.equal(canBeatCombo(pairPigs, fourPairs), true);
    });

    it('chặt 3 đôi thông bằng 3 đôi thông lớn hơn hoặc Tứ quý', () => {
      const threePairsSmall = evaluateCombo([
        c(Rank.THREE, Suit.SPADE), c(Rank.THREE, Suit.CLUB),
        c(Rank.FOUR, Suit.SPADE), c(Rank.FOUR, Suit.CLUB),
        c(Rank.FIVE, Suit.SPADE), c(Rank.FIVE, Suit.CLUB),
      ]);
      const threePairsBig = evaluateCombo([
        c(Rank.FOUR, Suit.SPADE), c(Rank.FOUR, Suit.CLUB),
        c(Rank.FIVE, Suit.SPADE), c(Rank.FIVE, Suit.CLUB),
        c(Rank.SIX, Suit.SPADE), c(Rank.SIX, Suit.CLUB),
      ]);
      const fourOfAKind = evaluateCombo([
        c(Rank.NINE, Suit.SPADE), c(Rank.NINE, Suit.CLUB),
        c(Rank.NINE, Suit.DIAMOND), c(Rank.NINE, Suit.HEART),
      ]);

      assert.equal(canBeatCombo(threePairsSmall, threePairsBig), true);
      assert.equal(canBeatCombo(threePairsSmall, fourOfAKind), true);
    });
  });

  describe('checkInstantWin (Tới Trắng)', () => {
    it('phát hiện Tứ quý 2', () => {
      const hand: Card[] = [
        c(Rank.TWO, Suit.SPADE), c(Rank.TWO, Suit.CLUB), c(Rank.TWO, Suit.DIAMOND), c(Rank.TWO, Suit.HEART),
        c(Rank.THREE, Suit.SPADE), c(Rank.FOUR, Suit.SPADE), c(Rank.FIVE, Suit.SPADE),
        c(Rank.SIX, Suit.SPADE), c(Rank.SEVEN, Suit.SPADE), c(Rank.EIGHT, Suit.SPADE),
        c(Rank.NINE, Suit.SPADE), c(Rank.TEN, Suit.SPADE), c(Rank.JACK, Suit.SPADE),
      ];
      const res = checkInstantWin(hand);
      assert.equal(res.hasInstantWin, true);
      assert.equal(res.type, InstantWinType.FOUR_TWOS);
    });

    it('phát hiện Sảnh Rồng 3 đến A', () => {
      const hand: Card[] = [
        c(Rank.THREE, Suit.SPADE), c(Rank.FOUR, Suit.CLUB), c(Rank.FIVE, Suit.DIAMOND),
        c(Rank.SIX, Suit.HEART), c(Rank.SEVEN, Suit.SPADE), c(Rank.EIGHT, Suit.CLUB),
        c(Rank.NINE, Suit.DIAMOND), c(Rank.TEN, Suit.HEART), c(Rank.JACK, Suit.SPADE),
        c(Rank.QUEEN, Suit.CLUB), c(Rank.KING, Suit.DIAMOND), c(Rank.ACE, Suit.HEART),
        c(Rank.THREE, Suit.HEART), // lá thứ 13 bất kỳ
      ];
      const res = checkInstantWin(hand);
      assert.equal(res.hasInstantWin, true);
      assert.equal(res.type, InstantWinType.DRAGON_STRAIGHT);
    });

    it('phát hiện 6 đôi bất kỳ', () => {
      const hand: Card[] = [
        c(Rank.THREE, Suit.SPADE), c(Rank.THREE, Suit.CLUB),
        c(Rank.FOUR, Suit.SPADE), c(Rank.FOUR, Suit.CLUB),
        c(Rank.FIVE, Suit.SPADE), c(Rank.FIVE, Suit.CLUB),
        c(Rank.SIX, Suit.SPADE), c(Rank.SIX, Suit.CLUB),
        c(Rank.SEVEN, Suit.SPADE), c(Rank.SEVEN, Suit.CLUB),
        c(Rank.EIGHT, Suit.SPADE), c(Rank.EIGHT, Suit.CLUB),
        c(Rank.KING, Suit.HEART), // lá lẻ
      ];
      const res = checkInstantWin(hand);
      assert.equal(res.hasInstantWin, true);
      assert.equal(res.type, InstantWinType.SIX_PAIRS);
    });
  });

  describe('calculatePenalties', () => {
    it('tính phạt thối heo đen và heo đỏ chính xác', () => {
      const remaining: Card[] = [
        c(Rank.TWO, Suit.SPADE), // đen: 1
        c(Rank.TWO, Suit.HEART), // đỏ: 2
      ];
      const res = calculatePenalties(remaining, true);
      assert.equal(res.blackPigs, 1);
      assert.equal(res.redPigs, 1);
      assert.equal(res.totalPenaltyUnits, 3);
      assert.equal(res.isCong, false);
    });

    it('nhân đôi phạt và tính cóng nếu người chơi chưa ra lá nào', () => {
      const remaining: Card[] = [
        c(Rank.TWO, Suit.SPADE), // 1
        c(Rank.THREE, Suit.SPADE), c(Rank.FOUR, Suit.SPADE), c(Rank.FIVE, Suit.SPADE),
        c(Rank.SIX, Suit.SPADE), c(Rank.SEVEN, Suit.SPADE), c(Rank.EIGHT, Suit.SPADE),
        c(Rank.NINE, Suit.SPADE), c(Rank.TEN, Suit.SPADE), c(Rank.JACK, Suit.SPADE),
        c(Rank.QUEEN, Suit.SPADE), c(Rank.KING, Suit.SPADE), c(Rank.ACE, Suit.SPADE),
      ];
      const res = calculatePenalties(remaining, false);
      assert.equal(res.isCong, true);
      assert.equal(res.totalPenaltyUnits, 6);
    });
  });
});
