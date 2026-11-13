import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { GameGateway } from './gateway.ts';

describe('GameGateway WebSocket Integration Tests', () => {
  const TEST_PORT = 8999;
  let gateway: GameGateway;

  before(() => {
    gateway = new GameGateway();
    gateway.start(TEST_PORT);
  });

  after(() => {
    gateway.stop();
  });

  it('kết nối WebSocket và nhận phản hồi PONG khi gửi PING', async () => {
    const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);

    await new Promise<void>((resolve) => ws.on('open', resolve));

    const pongPromise = new Promise<any>((resolve) => {
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'PONG') resolve(msg);
      });
    });

    ws.send(JSON.stringify({ type: 'PING' }));
    const reply = await pongPromise;
    assert.equal(reply.type, 'PONG');

    ws.close();
  });

  it('người chơi tham gia phòng và nhận ROOM_STATE_UPDATE bảo mật (chỉ thấy bài của chính mình)', async () => {
    const ws1 = new WebSocket(`ws://localhost:${TEST_PORT}`);
    const ws2 = new WebSocket(`ws://localhost:${TEST_PORT}`);

    await Promise.all([
      new Promise<void>((res) => ws1.on('open', res)),
      new Promise<void>((res) => ws2.on('open', res)),
    ]);

    const statePromise1 = new Promise<any>((resolve) => {
      ws1.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ROOM_STATE_UPDATE' && msg.players?.length === 2) {
          resolve(msg);
        }
      });
    });

    // P1 tham gia
    ws1.send(JSON.stringify({ type: 'JOIN_ROOM', roomId: 'test_room', username: 'Alice' }));
    // P2 tham gia
    ws2.send(JSON.stringify({ type: 'JOIN_ROOM', roomId: 'test_room', username: 'Bob' }));

    const state1 = await statePromise1;
    assert.equal(state1.players.length, 2);

    // Kiểm tra bảo mật: Alice không thấy handCards của Bob
    const bobInAliceView = state1.players.find((p: any) => p.username === 'Bob');
    assert.equal(bobInAliceView.handCards, undefined);

    ws1.close();
    ws2.close();
  });
});

