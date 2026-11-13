import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Rank, Suit } from './types.ts';
import type { Card } from './types.ts';
import { evaluateCombo } from './evaluator.ts';
import { autoSuggestCombo } from './suggester.ts';

function c(id: number, rank: number, suit: number): Card {
  return { id, rank: rank as any, suit: suit as any, code: `${rank}${suit}` };
}

describe('AutoSuggestCombo Tests (Tự động nhận diện và chọn bài theo người đi trước)', () => {
  it('tự động chọn đôi khi người trước đánh đôi', () => {
    // Người trước đánh Đôi 4
    const targetPair = evaluateCombo([c(1, Rank.FOUR, Suit.SPADE), c(2, Rank.FOUR, Suit.HEART)]);

    // Bài trên tay có Đôi 7 (7♠, 7♦) và các lá khác
    const hand = [
      c(10, Rank.FIVE, Suit.SPADE),
      c(11, Rank.SEVEN, Suit.SPADE),
      c(12, Rank.SEVEN, Suit.DIAMOND),
      c(13, Rank.JACK, Suit.CLUB),
    ];

    // Người chơi nhấp vào lá 7♠
    const suggested = autoSuggestCombo(hand, hand[1], targetPair);

    assert.equal(suggested.length, 2);
    assert.equal(suggested[0].rank, Rank.SEVEN);
    assert.equal(suggested[1].rank, Rank.SEVEN);
  });

  it('tự động chọn sám cô khi người trước đánh sám cô', () => {
    // Người trước đánh Sám 6
    const targetTriple = evaluateCombo([
      c(1, Rank.SIX, Suit.SPADE),
      c(2, Rank.SIX, Suit.CLUB),
      c(3, Rank.SIX, Suit.HEART),
    ]);

    // Bài trên tay có Sám 9 (9♠, 9♣, 9♥)
    const hand = [
      c(10, Rank.NINE, Suit.SPADE),
      c(11, Rank.NINE, Suit.CLUB),
      c(12, Rank.NINE, Suit.HEART),
      c(13, Rank.ACE, Suit.DIAMOND),
    ];

    // Người chơi nhấp vào lá 9♠
    const suggested = autoSuggestCombo(hand, hand[0], targetTriple);
    assert.equal(suggested.length, 3);
    assert.equal(suggested.every((card) => card.rank === Rank.NINE), true);
  });

  it('tự động chọn sảnh cùng độ dài khi người trước đánh sảnh 4 lá', () => {
    // Người trước đánh Sảnh 4 lá: 3-4-5-6
    const targetStraight = evaluateCombo([
      c(1, Rank.THREE, Suit.SPADE),
      c(2, Rank.FOUR, Suit.CLUB),
      c(3, Rank.FIVE, Suit.DIAMOND),
      c(4, Rank.SIX, Suit.HEART),
    ]);

    // Bài trên tay có 6-7-8-9 và lá rác K
    const hand = [
      c(10, Rank.SIX, Suit.SPADE),
      c(11, Rank.SEVEN, Suit.CLUB),
      c(12, Rank.EIGHT, Suit.DIAMOND),
      c(13, Rank.NINE, Suit.HEART),
      c(14, Rank.KING, Suit.SPADE),
    ];

    // Người chơi nhấp vào lá 6♠ (hoặc 7, 8, 9)
    const suggested = autoSuggestCombo(hand, hand[0], targetStraight);
    assert.equal(suggested.length, 4);
    assert.equal(suggested[0].rank, Rank.SIX);
    assert.equal(suggested[1].rank, Rank.SEVEN);
    assert.equal(suggested[2].rank, Rank.EIGHT);
    assert.equal(suggested[3].rank, Rank.NINE);
  });

  it('tự động chọn 3 đôi thông khi người trước đánh 3 đôi thông', () => {
    // Người trước đánh 3 đôi thông: 3-4-5
    const target3Pairs = evaluateCombo([
      c(1, Rank.THREE, Suit.SPADE), c(2, Rank.THREE, Suit.CLUB),
      c(3, Rank.FOUR, Suit.SPADE), c(4, Rank.FOUR, Suit.CLUB),
      c(5, Rank.FIVE, Suit.SPADE), c(6, Rank.FIVE, Suit.CLUB),
    ]);

    // Bài trên tay có 3 đôi thông: 6-7-8
    const hand = [
      c(10, Rank.SIX, Suit.SPADE), c(11, Rank.SIX, Suit.HEART),
      c(12, Rank.SEVEN, Suit.SPADE), c(13, Rank.SEVEN, Suit.DIAMOND),
      c(14, Rank.EIGHT, Suit.CLUB), c(15, Rank.EIGHT, Suit.HEART),
      c(16, Rank.ACE, Suit.SPADE),
    ];

    // Click vào 1 lá của đôi 6
    const suggested = autoSuggestCombo(hand, hand[0], target3Pairs);
    assert.equal(suggested.length, 6);
  });

  it('chỉ chọn 1 lá nếu không ghép được combo cùng dạng', () => {
    // Người trước đánh Đôi K
    const targetPair = evaluateCombo([c(1, Rank.KING, Suit.SPADE), c(2, Rank.KING, Suit.HEART)]);

    // Bài trên tay không có đôi nào, chỉ có lá rác
    const hand = [c(10, Rank.FIVE, Suit.SPADE), c(11, Rank.SEVEN, Suit.HEART)];

    const suggested = autoSuggestCombo(hand, hand[0], targetPair);
    assert.equal(suggested.length, 1);
    assert.equal(suggested[0].id, hand[0].id);
  });
});

