import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BuffId } from './types.ts';
import { BuffManager } from './buff-manager.ts';
import { ComboType, Rank, Suit } from '../core/types.ts';
import type { Card, HandCombo } from '../core/types.ts';

function createCard(id: number, rank: number, suit: number): Card {
  return { id, rank: rank as any, suit: suit as any, code: `${rank}${suit}` };
}

describe('BuffManager Tests', () => {
  it('cho phép gán tối đa 2 ô Buff cho người chơi', () => {
    const mgr = new BuffManager();
    const pid = 'player1';
    mgr.initializePlayer(pid);

    assert.equal(mgr.assignBuff(pid, BuffId.BUFF_PIG_ARMOR), true);
    assert.equal(mgr.assignBuff(pid, BuffId.BUFF_SWAP_CARD), true);
    // Buff thứ 3 bị từ chối
    assert.equal(mgr.assignBuff(pid, BuffId.BUFF_SPY_HAND), false);

    const buffs = mgr.getPlayerBuffs(pid);
    assert.equal(buffs.length, 2);
  });

  it('xử lý kỹ năng Hoán Bài (BUFF_SWAP_CARD)', () => {
    const mgr = new BuffManager();
    const pid = 'player1';
    mgr.initializePlayer(pid);
    mgr.assignBuff(pid, BuffId.BUFF_SWAP_CARD);

    const card1 = createCard(1, Rank.THREE, Suit.SPADE);
    const card2 = createCard(2, Rank.FOUR, Suit.SPADE);
    const hand = [card1, card2];

    const drawCard = createCard(99, Rank.ACE, Suit.HEART);
    const drawPile = [drawCard];

    const res = mgr.executeSwapCard(pid, card1.id, hand, drawPile);
    assert.equal(res.success, true);
    assert.equal(res.newCard?.id, 99);
    assert.equal(res.updatedHand?.some((c) => c.id === 99), true);
    assert.equal(res.updatedHand?.some((c) => c.id === 1), false);
  });

  it('xử lý Mắt Thần (BUFF_SPY_HAND)', () => {
    const mgr = new BuffManager();
    const pid = 'player1';
    mgr.initializePlayer(pid);
    mgr.assignBuff(pid, BuffId.BUFF_SPY_HAND);

    const targetHand = [
      createCard(1, Rank.THREE, Suit.SPADE),
      createCard(2, Rank.FOUR, Suit.SPADE),
      createCard(3, Rank.FIVE, Suit.SPADE),
    ];

    const res = mgr.executeSpyHand(pid, targetHand);
    assert.equal(res.success, true);
    assert.equal(res.revealedCards?.length, 2);
  });

  it('Giáp Heo (BUFF_PIG_ARMOR) miễn đòn chặt khi bị 3 đôi thông chặt', () => {
    const mgr = new BuffManager();
    const victim = 'victim';
    mgr.initializePlayer(victim);
    mgr.assignBuff(victim, BuffId.BUFF_PIG_ARMOR);

    const victimPigCombo: HandCombo = {
      type: ComboType.SINGLE,
      cards: [createCard(10, Rank.TWO, Suit.HEART)],
      highestCard: createCard(10, Rank.TWO, Suit.HEART),
      length: 1,
    };

    const attackerThreePairs: HandCombo = {
      type: ComboType.THREE_PAIR_STRAIGHT,
      cards: [],
      highestCard: createCard(20, Rank.SIX, Suit.HEART),
      length: 6,
    };

    const res = mgr.processChopReaction({
      victimPlayerId: victim,
      attackerPlayerId: 'attacker',
      victimCombo: victimPigCombo,
      attackerCombo: attackerThreePairs,
      basePenalty: 100,
    });

    assert.equal(res.isCanceled, true);
    assert.equal(res.reducedPenaltyMultiplier, 0);
  });

  it('Gương Phản Xạ (BUFF_REFLECT_CUT) phản lại 50% tiền phạt', () => {
    const mgr = new BuffManager();
    const victim = 'victim';
    mgr.initializePlayer(victim);
    mgr.assignBuff(victim, BuffId.BUFF_REFLECT_CUT);

    const victimPigCombo: HandCombo = {
      type: ComboType.SINGLE,
      cards: [createCard(10, Rank.TWO, Suit.HEART)],
      highestCard: createCard(10, Rank.TWO, Suit.HEART),
      length: 1,
    };

    const attackerFourOfAKind: HandCombo = {
      type: ComboType.FOUR_OF_A_KIND,
      cards: [],
      highestCard: createCard(20, Rank.SEVEN, Suit.HEART),
      length: 4,
    };

    const res = mgr.processChopReaction({
      victimPlayerId: victim,
      attackerPlayerId: 'attacker',
      victimCombo: victimPigCombo,
      attackerCombo: attackerFourOfAKind,
      basePenalty: 100,
    });

    assert.equal(res.reflectedPenalty, 50); // Phản 50% của 100
  });

  it('Tái Sinh Lượt (BUFF_REVIVE_PASS) cho phép tiếp tục đánh sau khi bỏ lượt', () => {
    const mgr = new BuffManager();
    const pid = 'player1';
    mgr.initializePlayer(pid);
    mgr.assignBuff(pid, BuffId.BUFF_REVIVE_PASS);

    const res = mgr.processPassTurn(pid);
    assert.equal(res.canRejoinRound, true);

    // Lần 2 đã hết charge
    const res2 = mgr.processPassTurn(pid);
    assert.equal(res2.canRejoinRound, false);
  });

  it('Cuồng Phong Hoán Đổi (BUFF_SHUFFLE_HAND) đổi 2 lá rác nhỏ nhất lấy 2 lá mới', () => {
    const mgr = new BuffManager();
    const pid = 'p1';
    mgr.initializePlayer(pid);
    mgr.assignBuff(pid, BuffId.BUFF_SHUFFLE_HAND);

    const hand = [
      createCard(1, Rank.THREE, Suit.SPADE),
      createCard(2, Rank.FOUR, Suit.CLUB),
      createCard(3, Rank.ACE, Suit.HEART),
    ];
    const drawPile = [
      createCard(91, Rank.KING, Suit.DIAMOND),
      createCard(92, Rank.QUEEN, Suit.HEART),
    ];

    const res = mgr.executeShuffleHand(pid, hand, drawPile);
    assert.equal(res.success, true);
    assert.equal(res.newCards?.length, 2);
    assert.equal(res.updatedHand?.length, 3);
    // Lá 3 và 4 nhỏ nhất đã bị bỏ
    assert.equal(res.updatedHand?.some((c) => c.id === 1), false);
    assert.equal(res.updatedHand?.some((c) => c.id === 2), false);
    // Lá Ace vẫn còn
    assert.equal(res.updatedHand?.some((c) => c.id === 3), true);
  });

  it('Đạo Tặc (BUFF_HEIST) rút trộm 1 lá bài của đối thủ', () => {
    const mgr = new BuffManager();
    const pid = 'p1';
    mgr.initializePlayer(pid);
    mgr.assignBuff(pid, BuffId.BUFF_HEIST);

    const myHand = [createCard(1, Rank.THREE, Suit.SPADE)];
    const target = {
      id: 'target',
      username: 'Opponent',
      handCards: [
        createCard(10, Rank.ACE, Suit.HEART),
        createCard(11, Rank.TWO, Suit.DIAMOND),
      ],
    };

    const res = mgr.executeHeist(pid, myHand, target);
    assert.equal(res.success, true);
    assert.equal(myHand.length, 2);
    assert.equal(target.handCards.length, 1);
  });

  it('Mìn Cảm Tử (BUFF_BOMB_TRAP) nổ phạt ngược kẻ chặt heo 100% tiền phạt', () => {
    const mgr = new BuffManager();
    const victim = 'victim';
    mgr.initializePlayer(victim);
    mgr.assignBuff(victim, BuffId.BUFF_BOMB_TRAP);

    const victimPigCombo: HandCombo = {
      type: ComboType.SINGLE,
      cards: [createCard(10, Rank.TWO, Suit.HEART)],
      highestCard: createCard(10, Rank.TWO, Suit.HEART),
      length: 1,
    };
    const attackerFour: HandCombo = {
      type: ComboType.FOUR_OF_A_KIND,
      cards: [],
      highestCard: createCard(20, Rank.SEVEN, Suit.HEART),
      length: 4,
    };

    const res = mgr.processChopReaction({
      victimPlayerId: victim,
      attackerPlayerId: 'attacker',
      victimCombo: victimPigCombo,
      attackerCombo: attackerFour,
      basePenalty: 80,
    });

    assert.equal(res.bombPenalty, 80);
  });
});

