import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GameRoom, RoomStatus } from './room.ts';
import { BuffId } from '../buffs/types.ts';

describe('GameRoom State Machine Tests', () => {
  it('quản lý vòng đời phòng chơi từ Lobby đến Bắt đầu ván bài', () => {
    const room = new GameRoom('room_01');
    assert.equal(room.status, RoomStatus.LOBBY);

    assert.equal(room.addPlayer('p1', 'Player 1'), true);
    assert.equal(room.addPlayer('p2', 'Player 2'), true);

    // Chưa đủ ready -> vẫn ở LOBBY
    room.setReady('p1', true);
    assert.equal(room.status, RoomStatus.LOBBY);

    // Cả 2 ready -> chuyển sang BUFF_DRAFT (hoặc MATCH_END nếu tới trắng)
    room.setReady('p2', true);
    assert.equal(
      (room.status as string) === RoomStatus.BUFF_DRAFT ||
        (room.status as string) === RoomStatus.MATCH_END,
      true
    );

    if ((room.status as string) === RoomStatus.BUFF_DRAFT) {
      // Mỗi người có 13 lá
      assert.equal(room.players[0].handCards.length, 13);
      assert.equal(room.players[1].handCards.length, 13);

      // Draft Buff
      const p1Options = room.draftOptions.get('p1')!;
      const p2Options = room.draftOptions.get('p2')!;
      assert.equal(p1Options.length, 3);
      assert.equal(p2Options.length, 3);

      assert.equal(room.selectBuff('p1', p1Options[0].id), true);
      assert.equal(room.selectBuff('p2', p2Options[0].id), true);

      // Sau khi cả 2 chọn buff -> chuyển sang PLAYING
      assert.equal(room.status, RoomStatus.PLAYING);
    }
  });

  it('chặn nước đi không phải lượt của người chơi', () => {
    const room = new GameRoom('room_02');
    room.addPlayer('p1', 'Player 1');
    room.addPlayer('p2', 'Player 2');
    room.setReady('p1', true);
    room.setReady('p2', true);

    if (room.status === RoomStatus.BUFF_DRAFT) {
      room.selectBuff('p1', room.draftOptions.get('p1')![0].id);
      room.selectBuff('p2', room.draftOptions.get('p2')![0].id);

      // Người không đến lượt đánh -> báo lỗi chưa tới lượt
      const notTurnPlayer = room.players.find((p) => p.seatIndex !== room.currentTurnSeatIndex)!;
      const res = room.playHand(notTurnPlayer.id, [notTurnPlayer.handCards[0].id]);
      assert.equal(res.success, false);
      assert.match(res.error || '', /Chưa tới lượt/);
    }
  });

  it('xử lý đếm ngược hết giờ (Turn Timeout) tự động đánh lá nhỏ nhất ở vòng tự do', () => {
    const room = new GameRoom('room_03');
    room.addPlayer('p1', 'Player 1');
    room.addPlayer('p2', 'Player 2');
    room.setReady('p1', true);
    room.setReady('p2', true);

    if (room.status === RoomStatus.BUFF_DRAFT) {
      room.selectBuff('p1', room.draftOptions.get('p1')![0].id);
      room.selectBuff('p2', room.draftOptions.get('p2')![0].id);

      // Người đang đến lượt, hết giờ -> tự động đánh lá bài hợp lệ
      const currentTurnPlayer = room.players[room.currentTurnSeatIndex];
      const initialCardCount = currentTurnPlayer.handCards.length;
      room.handleTurnTimeout();

      assert.equal(currentTurnPlayer.handCards.length, initialCardCount - 1);
      assert.notEqual(room.lastComboOnTable, null);
    }
  });

  it('xử lý kết nối lại (Reconnection)', () => {
    const room = new GameRoom('room_04');
    room.addPlayer('p1', 'Player 1');
    room.setPlayerConnected('p1', false);

    assert.equal(room.players[0].isConnected, false);

    const reconnected = room.reconnectPlayer('p1', 'p1_new_socket');
    assert.notEqual(reconnected, null);
    assert.equal(reconnected?.isConnected, true);
    assert.equal(reconnected?.id, 'p1_new_socket');
  });

  it('thêm Bot khi người chơi đã Ready tự động kích hoạt ván bài', () => {
    const room = new GameRoom('room_05');
    room.addPlayer('p1', 'Player 1');
    room.setReady('p1', true);
    assert.equal(room.status, RoomStatus.LOBBY);

    const bot = room.addBot();
    assert.notEqual(bot, null);
    assert.equal(bot?.isReady, true);
    // Ván bài phải tự động chuyển sang BUFF_DRAFT (hoặc MATCH_END nếu tới trắng)
    assert.equal(
      (room.status as string) === RoomStatus.BUFF_DRAFT ||
        (room.status as string) === RoomStatus.MATCH_END,
      true
    );
  });

  it('xóa người chơi và dọn sạch phòng khi người chơi thoát (Ghost Player Cleanup)', () => {
    const room = new GameRoom('room_06');
    room.addPlayer('p1', 'Player 1');
    room.addBot();
    room.addBot();
    assert.equal(room.players.length, 3);

    // Người chơi thoát phòng trong Lobby
    room.removePlayer('p1');
    // Không còn human player -> tự dọn dẹp sạch phòng
    assert.equal(room.players.length, 0);
    assert.equal(room.status, RoomStatus.LOBBY);
  });

  it('người chơi mới vào tự động giải phóng phòng bị bỏ hoang (Orphaned Room Recovery)', () => {
    const room = new GameRoom('room_07');
    room.addPlayer('p1', 'Player 1');
    room.addBot();
    room.setReady('p1', true); // Game started -> BUFF_DRAFT or PLAYING

    // Người chơi bị ngắt kết nối
    room.setPlayerConnected('p1', false);

    // Người chơi mới vào tham gia
    const joined = room.addPlayer('p2', 'Player 2');
    assert.equal(joined, true);
    assert.equal(room.status, RoomStatus.LOBBY);
    assert.equal(room.players.length, 1);
    assert.equal(room.players[0].id, 'p2');
  });

  it('hỗ trợ Roll lại Buff tối đa 3 lần và xóa draftOptions sau khi chọn', () => {
    const room = new GameRoom('room_08');
    room.addPlayer('p1', 'Player 1');
    room.addPlayer('p2', 'Player 2');
    room.setReady('p1', true);
    room.setReady('p2', true);

    if ((room.status as string) === RoomStatus.BUFF_DRAFT) {
      assert.equal(room.getRerollCount('p1'), 3);

      // Roll lần 1
      const r1 = room.rerollBuffOptions('p1');
      assert.equal(r1.success, true);
      assert.equal(r1.remaining, 2);
      assert.equal(r1.newOptions?.length, 3);

      // Roll lần 2 & 3
      assert.equal(room.rerollBuffOptions('p1').success, true);
      assert.equal(room.rerollBuffOptions('p1').success, true);
      assert.equal(room.getRerollCount('p1'), 0);

      // Roll lần 4 bị từ chối
      const r4 = room.rerollBuffOptions('p1');
      assert.equal(r4.success, false);
      assert.match(r4.error || '', /hết 3 lượt/);

      // Khi p1 chọn buff -> draftOptions của p1 bị xóa ngay
      const opts = room.draftOptions.get('p1')!;
      assert.equal(room.selectBuff('p1', opts[0].id), true);
      assert.equal(room.draftOptions.has('p1'), false);
    }
  });

  it('Joker Nhân Đôi (BUFF_DOUBLE_CHIPS) nhân 2 số tiền thưởng khi về nhất', () => {
    const room = new GameRoom('room_09');
    room.addPlayer('p1', 'Winner');
    room.addPlayer('p2', 'Loser');

    const winner = room.players[0];
    const loser = room.players[1];
    // Giả lập loser còn bài
    loser.handCards = [
      { id: 1, rank: 3 as any, suit: 0 as any, code: '30' },
      { id: 2, rank: 4 as any, suit: 0 as any, code: '40' },
    ];

    // Gán BUFF_DOUBLE_CHIPS cho winner
    room.buffManager.assignBuff(winner.id, BuffId.BUFF_DOUBLE_CHIPS);

    const result = room.computeMatchResult(winner);
    const winnerRank = result.rankings.find((r) => r.playerId === winner.id);
    // Điểm cơ bản: 2 lá * 10 = 20. Có x2 -> 40
    assert.equal(winnerRank?.scoreDelta, 40);
  });

  it('lưu trữ và cập nhật avatarUrl của người chơi từ Discord', () => {
    const room = new GameRoom('room_avatar');
    const discordAvatar = 'https://cdn.discordapp.com/avatars/12345/abcdef.png?size=128';
    assert.equal(room.addPlayer('p_discord', 'DiscordGamer', discordAvatar), true);
    assert.equal(room.players[0].avatarUrl, discordAvatar);

    // Reconnection cập nhật avatar mới
    const newAvatar = 'https://cdn.discordapp.com/avatars/12345/new_avatar.png?size=128';
    assert.equal(room.addPlayer('p_discord', 'DiscordGamer', newAvatar), true);
    assert.equal(room.players[0].avatarUrl, newAvatar);
  });

  it('ván đầu tiên: người cầm lá bài nhỏ nhất đi đầu và bắt buộc nước đi đầu phải chứa lá nhỏ nhất', () => {
    const room = new GameRoom('room_first_match_rule');
    room.addPlayer('p1', 'Player 1');
    room.addPlayer('p2', 'Player 2');
    room.setReady('p1', true);
    room.setReady('p2', true);

    if (room.status === RoomStatus.BUFF_DRAFT) {
      room.selectBuff('p1', room.draftOptions.get('p1')![0].id);
      room.selectBuff('p2', room.draftOptions.get('p2')![0].id);
    }

    assert.equal(room.status, RoomStatus.PLAYING);
    assert.equal(room.isFirstMatch, true);
    assert.notEqual(room.firstTurnRequiredCardId, null);
    assert.notEqual(room.lowestDealtCard, null);

    const firstPlayer = room.players[room.currentTurnSeatIndex];
    const lowestCardId = room.firstTurnRequiredCardId!;
    // Đảm bảo lá nhỏ nhất nằm trong bài của người đi đầu
    assert.equal(firstPlayer.handCards.some((c) => c.id === lowestCardId), true);

    // Nếu người này cố tình đánh lá khác (không chứa lá nhỏ nhất) -> Bị từ chối
    const otherCards = firstPlayer.handCards.filter((c) => c.id !== lowestCardId);
    if (otherCards.length > 0) {
      const invalidPlayRes = room.playHand(firstPlayer.id, [otherCards[0].id]);
      assert.equal(invalidPlayRes.success, false);
      assert.match(invalidPlayRes.error || '', /bắt buộc phải chứa lá bài nhỏ nhất/);
    }

    // Đánh hợp lệ (chứa lá nhỏ nhất) -> Thành công
    const validPlayRes = room.playHand(firstPlayer.id, [lowestCardId]);
    assert.equal(validPlayRes.success, true);
    // Sau nước đi đầu thành công -> firstTurnRequiredCardId được xóa về null
    assert.equal(room.firstTurnRequiredCardId, null);
  });

  it('ván kế tiếp: người thắng ván trước đi đầu và ván 2 được reset buff mới kèm 3 lượt reroll', () => {
    const room = new GameRoom('room_next_match_winner');
    room.addPlayer('p1', 'Player 1');
    room.addPlayer('p2', 'Player 2');
    room.setReady('p1', true);
    room.setReady('p2', true);

    if (room.status === RoomStatus.BUFF_DRAFT) {
      room.selectBuff('p1', room.draftOptions.get('p1')![0].id);
      room.selectBuff('p2', room.draftOptions.get('p2')![0].id);
    }

    // Giả lập p2 thắng ván 1
    const p2 = room.players[1];
    p2.handCards = [{ id: 999, rank: 3 as any, suit: 0 as any, code: '3S' }];
    room.currentTurnSeatIndex = 1;
    const winRes = room.playHand('p2', [999]);
    assert.equal(winRes.isMatchOver, true);
    assert.equal(room.lastWinnerPlayerId, 'p2');
    assert.equal(room.isFirstMatch, false);

    // Người chơi bấm "Ván tiếp theo" -> resetToLobby
    room.resetToLobby();
    assert.equal(room.status, RoomStatus.LOBBY);
    // Buff của người chơi được xóa sạch
    assert.equal(room.buffManager.getPlayerBuffs('p1').length, 0);
    assert.equal(room.buffManager.getPlayerBuffs('p2').length, 0);

    // Bắt đầu ván 2
    room.setReady('p1', true);
    room.setReady('p2', true);

    // Ván 2 phải ở trạng thái BUFF_DRAFT để người chơi chọn buff mới
    assert.equal(room.status, RoomStatus.BUFF_DRAFT);
    assert.equal(room.getRerollCount('p1'), 3);
    assert.equal(room.getRerollCount('p2'), 3);
    assert.equal(room.draftOptions.get('p1')!.length, 3);
    assert.equal(room.draftOptions.get('p2')!.length, 3);

    // Người chơi chọn buff ván 2
    room.selectBuff('p1', room.draftOptions.get('p1')![0].id);
    room.selectBuff('p2', room.draftOptions.get('p2')![0].id);

    // Sau khi chọn buff xong -> Ván 2 bắt đầu, p2 (người thắng ván 1) được quyền đi đầu
    assert.equal(room.status, RoomStatus.PLAYING);
    assert.equal(room.currentTurnSeatIndex, 1); // p2 ghế 1
    assert.equal(room.firstTurnRequiredCardId, null); // Ván 2 không bị ép lá nhỏ nhất
  });
});

