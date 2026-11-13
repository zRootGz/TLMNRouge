import { describe, it } from 'node:test';
import assert from 'node:assert';
import { decideBotMove, decideBotBuffUse } from './bot.ts';
import { evaluateCombo } from './evaluator.ts';
import { GameRoom, RoomStatus } from '../server/room.ts';
import type { Card } from './types.ts';
import { Rank, Suit } from './types.ts';

function createMockCard(id: number, rank: number, suit: number): Card {
  const suits = ['♠', '♣', '♦', '♥'];
  const ranks = ['', '', '', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
  return {
    id,
    rank: rank as Rank,
    suit: suit as Suit,
    code: `${ranks[rank]}${suits[suit]}`,
  };
}

describe('Bot AI Engine & Skill Tests', () => {
  describe('decideBotBuffUse', () => {
    it('Bot tự kích hoạt Băng Phong (BUFF_FREEZE_TURN) khi đối thủ kế tiếp còn <= 3 lá bài', () => {
      const hand = [createMockCard(1, Rank.THREE, Suit.SPADE)];
      const decision = decideBotBuffUse(hand, ['BUFF_FREEZE_TURN'], 3, 10);
      assert.notStrictEqual(decision, null);
      assert.strictEqual(decision?.buffId, 'BUFF_FREEZE_TURN');
    });

    it('Bot không dùng Băng Phong nếu đối thủ còn nhiều bài (> 3 lá)', () => {
      const hand = [createMockCard(1, Rank.THREE, Suit.SPADE)];
      const decision = decideBotBuffUse(hand, ['BUFF_FREEZE_TURN'], 8, 10);
      assert.strictEqual(decision, null);
    });

    it('Bot tự kích hoạt Hoán Bài (BUFF_SWAP_CARD) để đổi lá rác nhỏ khi cọc rút còn bài', () => {
      const hand = [
        createMockCard(1, Rank.THREE, Suit.SPADE), // Rác nhỏ
        createMockCard(2, Rank.JACK, Suit.HEART),
        createMockCard(3, Rank.TWO, Suit.HEART),
      ];
      const decision = decideBotBuffUse(hand, ['BUFF_SWAP_CARD'], 10, 5);
      assert.notStrictEqual(decision, null);
      assert.strictEqual(decision?.buffId, 'BUFF_SWAP_CARD');
      assert.strictEqual(decision?.cardId, 1);
    });

    it('Bot không dùng Hoán Bài nếu cọc rút đã hết bài', () => {
      const hand = [createMockCard(1, Rank.THREE, Suit.SPADE)];
      const decision = decideBotBuffUse(hand, ['BUFF_SWAP_CARD'], 10, 0);
      assert.strictEqual(decision, null);
    });

    it('Bot kích hoạt Mắt Thần (BUFF_SPY_HAND) để soi bài đối thủ', () => {
      const hand = [createMockCard(1, Rank.THREE, Suit.SPADE)];
      const decision = decideBotBuffUse(hand, ['BUFF_SPY_HAND'], 10, 5);
      assert.notStrictEqual(decision, null);
      assert.strictEqual(decision?.buffId, 'BUFF_SPY_HAND');
    });
  });

  describe('decideBotMove', () => {
    it('Khi cầm vòng tự do, Bot ưu tiên đánh sảnh nhỏ trước', () => {
      const hand = [
        createMockCard(1, Rank.THREE, Suit.SPADE),
        createMockCard(2, Rank.FOUR, Suit.CLUB),
        createMockCard(3, Rank.FIVE, Suit.DIAMOND),
        createMockCard(4, Rank.JACK, Suit.HEART),
        createMockCard(5, Rank.TWO, Suit.HEART),
      ];
      const decision = decideBotMove(hand, null);
      assert.strictEqual(decision.action, 'PLAY');
      assert.deepStrictEqual(decision.cardIds, [1, 2, 3]); // Sảnh 3-4-5
    });

    it('Khi cầm vòng tự do và không có sảnh, Bot ưu tiên đánh đôi nhỏ', () => {
      const hand = [
        createMockCard(1, Rank.THREE, Suit.SPADE),
        createMockCard(2, Rank.THREE, Suit.CLUB),
        createMockCard(3, Rank.JACK, Suit.HEART),
      ];
      const decision = decideBotMove(hand, null);
      assert.strictEqual(decision.action, 'PLAY');
      assert.deepStrictEqual(decision.cardIds, [1, 2]); // Đôi 3
    });

    it('Khi cầm vòng tự do, Bot giữ lại Heo và chỉ đánh lá rác nhỏ nhất', () => {
      const hand = [
        createMockCard(1, Rank.FIVE, Suit.SPADE),
        createMockCard(2, Rank.JACK, Suit.CLUB),
        createMockCard(3, Rank.TWO, Suit.HEART),
      ];
      const decision = decideBotMove(hand, null);
      assert.strictEqual(decision.action, 'PLAY');
      assert.deepStrictEqual(decision.cardIds, [1]); // Đánh 5♠, không đánh 2♥
    });

    it('Khi đối thủ đánh Heo, Bot biết dùng Tứ Quý để chặt Heo', () => {
      const pigCard = createMockCard(99, Rank.TWO, Suit.SPADE);
      const tableCombo = evaluateCombo([pigCard]);

      const hand = [
        createMockCard(1, Rank.THREE, Suit.SPADE),
        createMockCard(2, Rank.TEN, Suit.SPADE),
        createMockCard(3, Rank.TEN, Suit.CLUB),
        createMockCard(4, Rank.TEN, Suit.DIAMOND),
        createMockCard(5, Rank.TEN, Suit.HEART),
      ];

      const decision = decideBotMove(hand, tableCombo);
      assert.strictEqual(decision.action, 'PLAY');
      assert.deepStrictEqual(decision.cardIds, [2, 3, 4, 5]); // Tứ quý 10 chặt Heo
    });

    it('Khi không có bài đè được, Bot đưa ra quyết định PASS (bỏ lượt)', () => {
      const tableCombo = evaluateCombo([createMockCard(99, Rank.ACE, Suit.HEART)]);
      const hand = [
        createMockCard(1, Rank.THREE, Suit.SPADE),
        createMockCard(2, Rank.FOUR, Suit.CLUB),
      ];

      const decision = decideBotMove(hand, tableCombo);
      assert.strictEqual(decision.action, 'PASS');
    });
  });

  describe('GameRoom Bot Integration & Simulation', () => {
    it('Bot tự động chọn Buff và có thể thực thi executeBotTurn thành công', () => {
      const room = new GameRoom('test_bot_room');
      const bot1 = room.addBot();
      const bot2 = room.addBot();
      assert.notStrictEqual(bot1, null);
      assert.notStrictEqual(bot2, null);

      // Khi 2 bot vào phòng và đều ready -> Trận đấu bắt đầu vào BUFF_DRAFT
      // Vì cả 2 là bot, hệ thống tự draft buff và chuyển sang PLAYING
      assert.strictEqual(room.status, RoomStatus.PLAYING);
      assert.strictEqual(room.isCurrentTurnBot(), true);

      // Bot đầu tiên thực thi lượt đi
      const result = room.executeBotTurn();
      assert.strictEqual(typeof result.isPass, 'boolean');
      // Sau lượt đi của bot 1, bàn cờ có bài hoặc bot đã pass, và lượt chuyển sang bot 2
      assert.strictEqual(room.isCurrentTurnBot(), true);
    });

    it('Mô phỏng 4 Bot chơi tự động liên tiếp nhiều lượt mà không bị deadlock', () => {
      const room = new GameRoom('sim_4_bots');
      room.addBot();
      room.addBot();
      room.addBot();
      room.addBot();

      assert.strictEqual(room.status, RoomStatus.PLAYING);

      // Chạy 20 lượt đánh tự động giữa 4 Bot
      for (let turn = 0; turn < 20; turn++) {
        if ((room.status as string) === RoomStatus.MATCH_END) break;
        assert.strictEqual(room.isCurrentTurnBot(), true);
        const res = room.executeBotTurn();
        assert.notStrictEqual(res, null);
      }

      // Đảm bảo sau 20 lượt bàn cờ vẫn hoạt động mượt mà hoặc đã có người thắng
      const validStatuses = [RoomStatus.PLAYING, RoomStatus.MATCH_END];
      assert.ok(validStatuses.includes(room.status));
    });
  });
});
