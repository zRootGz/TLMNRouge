import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import { GameRoom, RoomStatus } from './server/room.ts';
import type { BuffId } from './buffs/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIR = path.join(__dirname, '..', 'client');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

// 1. HTTP Server phục vụ static files cho Client UI
const server = http.createServer((req, res) => {
  // CORS & CSP cho Discord Activity iframe
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Security-Policy', "frame-ancestors *; default-src * 'unsafe-inline' 'unsafe-eval' data: blob: ws: wss:;");

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Discord OAuth2 Token Exchange endpoint
  if (req.url === '/api/token' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const { code } = JSON.parse(body || '{}');
        const clientId = process.env.DISCORD_CLIENT_ID;
        const clientSecret = process.env.DISCORD_CLIENT_SECRET;
        if (!clientId || !clientSecret || !code) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing code or credentials' }));
          return;
        }

        const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            code,
          }),
        });

        const tokenData = await tokenRes.json();
        res.writeHead(tokenRes.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(tokenData));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to exchange token' }));
      }
    });
    return;
  }

  let reqPath = req.url?.split('?')[0] || '/';
  if (reqPath === '/') reqPath = '/index.html';

  const filePath = path.join(CLIENT_DIR, reqPath);
  const ext = path.extname(filePath);

  const MIME_TYPES: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

// 2. WebSocket Server gắn cùng HTTP Server
const wss = new WebSocketServer({ server });
const rooms = new Map<string, GameRoom>();
const clients = new Map<WebSocket, { ws: WebSocket; playerId: string; roomId?: string }>();

wss.on('connection', (ws) => {
  const clientInfo: { ws: WebSocket; playerId: string; roomId?: string } = {
    ws,
    playerId: `player_${Math.random().toString(36).substring(2, 9)}`,
  };
  clients.set(ws, clientInfo);

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      handleClientMessage(clientInfo, msg);
    } catch (e: any) {
      ws.send(JSON.stringify({ type: 'ERROR_EVENT', code: 'INVALID_JSON', message: e.message }));
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    if (clientInfo.roomId) {
      const room = rooms.get(clientInfo.roomId);
      if (room) {
        if (room.status === RoomStatus.LOBBY) {
          room.removePlayer(clientInfo.playerId);
        } else {
          room.setPlayerConnected(clientInfo.playerId, false);
          room.cleanupIfOrphaned();
        }
        broadcastState(room);
      }
    }
  });
});

function handleClientMessage(client: any, msg: any) {
  switch (msg.type) {
    case 'PING':
      client.ws.send(JSON.stringify({ type: 'PONG' }));
      break;

    case 'JOIN_ROOM': {
      const roomId = msg.roomId || 'default_room';
      let room = rooms.get(roomId);
      if (!room) {
        room = new GameRoom(roomId);
        rooms.set(roomId, room);
      }

      // Hỗ trợ khôi phục playerId cố định từ Client
      if (msg.playerId) {
        client.playerId = msg.playerId;
      }

      const username = msg.username || `Player_${client.playerId.substring(7, 11)}`;
      const joined = room.addPlayer(client.playerId, username, msg.avatarUrl);
      if (!joined) {
        client.ws.send(
          JSON.stringify({
            type: 'ERROR_EVENT',
            code: 'ROOM_FULL',
            message: 'Phòng đã đầy hoặc đang thi đấu',
          })
        );
        return;
      }

      client.roomId = roomId;
      broadcastState(room);
      break;
    }

    case 'ADD_BOT': {
      const room = rooms.get(client.roomId);
      if (!room) return;
      const bot = room.addBot();
      if (!bot) {
        client.ws.send(
          JSON.stringify({
            type: 'ERROR_EVENT',
            code: 'CANNOT_ADD_BOT',
            message: 'Phòng đã đủ 4 người hoặc đang chơi',
          })
        );
        return;
      }
      broadcastState(room);
      triggerBotTurnIfNeeded(room);
      break;
    }

    case 'PLAYER_READY': {
      const room = rooms.get(client.roomId);
      if (!room) return;
      room.setReady(client.playerId, msg.isReady ?? true);
      broadcastState(room);
      triggerBotTurnIfNeeded(room);
      break;
    }

    case 'SELECT_BUFF': {
      const room = rooms.get(client.roomId);
      if (!room || !msg.buffId) return;
      room.selectBuff(client.playerId, msg.buffId);
      broadcastState(room);
      triggerBotTurnIfNeeded(room);
      break;
    }

    case 'REROLL_BUFFS': {
      const room = rooms.get(client.roomId);
      if (!room) return;
      const res = room.rerollBuffOptions(client.playerId);
      if (!res.success) {
        client.ws.send(
          JSON.stringify({ type: 'ERROR_EVENT', code: 'REROLL_FAILED', message: res.error })
        );
        return;
      }
      broadcastState(room);
      break;
    }

    case 'PLAY_HAND': {
      const room = rooms.get(client.roomId);
      if (!room || !msg.cardIds) return;
      const res = room.playHand(client.playerId, msg.cardIds);
      if (!res.success) {
        client.ws.send(
          JSON.stringify({ type: 'ERROR_EVENT', code: 'INVALID_MOVE', message: res.error })
        );
        return;
      }
      broadcastState(room, {
        type: 'HAND_PLAYED',
        combo: res.combo,
        isMatchOver: res.isMatchOver,
        winnerPlayerId: res.winnerPlayerId,
        matchResult: res.matchResult,
      });
      triggerBotTurnIfNeeded(room);
      break;
    }

    case 'PLAY_AGAIN': {
      const room = rooms.get(client.roomId);
      if (!room) return;
      room.resetToLobby();
      broadcastState(room);
      break;
    }

    case 'PASS_TURN': {
      const room = rooms.get(client.roomId);
      if (!room) return;
      const res = room.passTurn(client.playerId);
      if (!res.success) {
        client.ws.send(
          JSON.stringify({ type: 'ERROR_EVENT', code: 'PASS_FAILED', message: res.error })
        );
        return;
      }
      broadcastState(room);
      triggerBotTurnIfNeeded(room);
      break;
    }

    case 'USE_BUFF': {
      const room = rooms.get(client.roomId);
      if (!room || !msg.buffId) return;

      // 1. Hoán Bài (Active)
      if (msg.buffId === 'BUFF_SWAP_CARD') {
        if (msg.cardIds?.[0] === undefined) {
          client.ws.send(
            JSON.stringify({
              type: 'ERROR_EVENT',
              code: 'BUFF_PARAM_MISSING',
              message: 'Vui lòng chọn 1 lá bài trên tay trước khi bấm Hoán Bài!',
            })
          );
          return;
        }
        const player = room.players.find((p) => p.id === client.playerId);
        if (player) {
          const swap = room.buffManager.executeSwapCard(
            client.playerId,
            msg.cardIds[0],
            player.handCards,
            room.drawPile
          );
          if (swap.success) {
            player.handCards = swap.updatedHand!;
            broadcastState(room, {
              type: 'BUFF_ACTIVATED',
              buffId: 'Hoán Bài',
              playerId: client.playerId,
            });
          } else {
            client.ws.send(
              JSON.stringify({ type: 'ERROR_EVENT', code: 'BUFF_ERROR', message: swap.error })
            );
          }
        }
        return;
      }

      // 2. Mắt Thần (Active)
      if (msg.buffId === 'BUFF_SPY_HAND') {
        const spyRes = room.executeSpyHand(client.playerId);
        if (spyRes.success && spyRes.revealedCards) {
          const cardLabels = spyRes.revealedCards.map((c) => c.code).join(', ');
          client.ws.send(
            JSON.stringify({
              type: 'SPY_RESULT',
              message: `👁️ Mắt Thần soi thấy [${spyRes.targetUsername}] có: ${cardLabels}`,
            })
          );
          broadcastState(room, {
            type: 'BUFF_ACTIVATED',
            buffId: 'Mắt Thần',
            playerId: client.playerId,
          });
        } else {
          client.ws.send(
            JSON.stringify({ type: 'ERROR_EVENT', code: 'BUFF_ERROR', message: spyRes.error })
          );
        }
        return;
      }

      // 3. Băng Phong (Active)
      if (msg.buffId === 'BUFF_FREEZE_TURN') {
        const freezeRes = room.executeFreezeTurn(client.playerId);
        if (freezeRes.success) {
          broadcastState(room, {
            type: 'BUFF_ACTIVATED',
            buffId: 'Băng Phong',
            playerId: client.playerId,
            message: `❄️ [${freezeRes.targetUsername}] đã bị đóng băng mất lượt!`,
          });
          triggerBotTurnIfNeeded(room);
        } else {
          client.ws.send(
            JSON.stringify({ type: 'ERROR_EVENT', code: 'BUFF_ERROR', message: freezeRes.error })
          );
        }
        return;
      }

      // 4. Cuồng Phong Hoán Đổi (Active)
      if (msg.buffId === 'BUFF_SHUFFLE_HAND') {
        const player = room.players.find((p) => p.id === client.playerId);
        if (player) {
          const res = room.buffManager.executeShuffleHand(client.playerId, player.handCards, room.drawPile);
          if (res.success) {
            player.handCards = res.updatedHand!;
            broadcastState(room, {
              type: 'BUFF_ACTIVATED',
              buffId: 'Cuồng Phong Hoán Đổi',
              playerId: client.playerId,
              message: `🌪️ [${player.username}] đã đổi 2 lá bài rác lấy 2 lá mới!`,
            });
          } else {
            client.ws.send(JSON.stringify({ type: 'ERROR_EVENT', code: 'BUFF_ERROR', message: res.error }));
          }
        }
        return;
      }

      // 5. Ngưng Đọng Thời Gian (Active)
      if (msg.buffId === 'BUFF_TIME_WARP') {
        if (!room.buffManager.hasBuff(client.playerId, 'BUFF_TIME_WARP' as any)) {
          client.ws.send(JSON.stringify({ type: 'ERROR_EVENT', code: 'BUFF_ERROR', message: 'Bạn không có buff Ngưng Đọng Thời Gian hoặc đã hết lượt!' }));
          return;
        }
        room.buffManager.consumeCharge(client.playerId, 'BUFF_TIME_WARP' as any);
        room.resetTurnTimer(15000);
        broadcastState(room, {
          type: 'BUFF_ACTIVATED',
          buffId: 'Ngưng Đọng Thời Gian',
          playerId: client.playerId,
          message: `⏳ Ngưng Đọng Thời Gian: Hồi phục 15s lượt đi!`,
        });
        return;
      }

      // 6. Đạo Tặc Rút Trộm (Active)
      if (msg.buffId === 'BUFF_HEIST') {
        const player = room.players.find((p) => p.id === client.playerId);
        if (!player) return;
        const opponents = room.players.filter((p) => p.id !== client.playerId && p.handCards.length > 1);
        if (opponents.length === 0) {
          client.ws.send(JSON.stringify({ type: 'ERROR_EVENT', code: 'BUFF_ERROR', message: 'Không có đối thủ nào còn nhiều hơn 1 lá bài để rút trộm!' }));
          return;
        }
        opponents.sort((a, b) => a.handCards.length - b.handCards.length);
        const target = opponents[0];
        const res = room.buffManager.executeHeist(client.playerId, player.handCards, target);
        if (res.success) {
          broadcastState(room, {
            type: 'BUFF_ACTIVATED',
            buffId: 'Đạo Tặc',
            playerId: client.playerId,
            message: `🦹 [${player.username}] vừa rút trộm 1 lá bài của [${target.username}]!`,
          });
        } else {
          client.ws.send(JSON.stringify({ type: 'ERROR_EVENT', code: 'BUFF_ERROR', message: res.error }));
        }
        return;
      }

      // 7. Các lá Bị Động / Phản Đòn (Tự động kích hoạt khi có sự kiện)
      const passiveDescriptions: Record<string, string> = {
        BUFF_PIG_ARMOR: '🛡️ Giáp Heo là kỹ năng TỰ ĐỘNG - sẽ tự động kích hoạt bảo vệ khi heo của bạn bị chặt!',
        BUFF_FIRST_STRIKE: '⚔️ Tiên Thủ là kỹ năng TỰ ĐỘNG - đã được kích hoạt từ đầu ván!',
        BUFF_REVIVE_PASS: '🪶 Tái Sinh Lượt là kỹ năng TỰ ĐỘNG - sẽ tự động kích hoạt khi bạn bấm Bỏ lượt!',
        BUFF_REFLECT_CUT: '🪞 Gương Phản Xạ là kỹ năng TỰ ĐỘNG - sẽ tự động kích hoạt phản đòn khi bị chặt!',
        BUFF_DOUBLE_CHIPS: '💰 Joker Nhân Đôi là kỹ năng TỰ ĐỘNG - sẽ tự động nhân đôi tiền thưởng khi bạn về nhất!',
        BUFF_BOMB_TRAP: '💣 Mìn Cảm Tử là kỹ năng TỰ ĐỘNG - sẽ tự động nổ phạt kẻ chặt khi heo của bạn bị chặt!',
      };

      const desc = passiveDescriptions[msg.buffId];
      if (desc) {
        client.ws.send(
          JSON.stringify({
            type: 'ERROR_EVENT',
            code: 'PASSIVE_BUFF',
            message: desc,
          })
        );
      }
      break;
    }

    case 'SEND_STICKER': {
      const room = rooms.get(client.roomId);
      if (!room || !msg.stickerId) return;

      broadcastToRoom(room, {
        type: 'STICKER_REACTION',
        playerId: client.playerId,
        stickerId: msg.stickerId,
      });
      break;
    }
  }
}

function broadcastToRoom(room: GameRoom, message: any) {
  for (const [ws, c] of clients.entries()) {
    if (c.roomId === room.roomId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
}

function triggerBotTurnIfNeeded(room: GameRoom) {
  if (room.status !== RoomStatus.PLAYING || !room.isCurrentTurnBot() || room.isBotThinking) {
    return;
  }

  const actingBot = room.players[room.currentTurnSeatIndex];

  room.isBotThinking = true;
  setTimeout(() => {
    room.isBotThinking = false;
    if (room.status !== RoomStatus.PLAYING || !room.isCurrentTurnBot()) {
      return;
    }

    const res = room.executeBotTurn();

    // 1. Nếu Bot kích hoạt kỹ năng chủ động, thông báo riêng trước
    if (res.botSkillUsed) {
      broadcastState(room, {
        type: 'BOT_SKILL_USED',
        ...res.botSkillUsed,
      });
    }

    // 2. Broadcast kết quả đánh bài hoặc bỏ lượt của Bot
    broadcastState(room, {
      type: 'HAND_PLAYED',
      isPass: res.isPass,
      combo: res.combo,
      isMatchOver: res.isMatchOver,
      winnerPlayerId: res.winnerPlayerId,
      matchResult: res.matchResult,
    });

    // 3. Bot biểu cảm: Tự động thả Sticker khi chặt heo hoặc thắng lớn
    if (actingBot) {
      if (
        res.combo &&
        (res.combo.type === 'FOUR_OF_A_KIND' ||
          res.combo.type === 'THREE_PAIR_STRAIGHT' ||
          res.combo.type === 'FOUR_PAIR_STRAIGHT')
      ) {
        setTimeout(() => {
          broadcastToRoom(room, {
            type: 'STICKER_REACTION',
            playerId: actingBot.id,
            stickerId: 'pig_chop',
          });
        }, 500);
      } else if (res.isMatchOver && res.winnerPlayerId === actingBot.id) {
        setTimeout(() => {
          broadcastToRoom(room, {
            type: 'STICKER_REACTION',
            playerId: actingBot.id,
            stickerId: 'money_rich',
          });
        }, 600);
      }
    }

    // 4. Nếu lượt kế tiếp vẫn là Bot (hoặc sang vòng mới Bot đi tiếp), trigger tiếp
    triggerBotTurnIfNeeded(room);
  }, 1200);
}

function broadcastState(room: GameRoom, extraEvent?: any) {
  for (const [ws, c] of clients.entries()) {
    if (c.roomId !== room.roomId) continue;

    const maskedPlayers = room.players.map((p) => ({
      id: p.id,
      username: p.username,
      avatarUrl: p.avatarUrl,
      seatIndex: p.seatIndex,
      cardCount: p.handCards.length,
      isReady: p.isReady,
      hasPassedRound: p.hasPassedRound,
      score: p.score,
      isBot: !!p.isBot,
      buffs: room.buffManager.getPlayerBuffs(p.id),
      handCards: p.id === c.playerId ? p.handCards : undefined,
    }));

    const payload = {
      type: 'ROOM_STATE_UPDATE',
      roomId: room.roomId,
      yourPlayerId: c.playerId,
      status: room.status,
      currentTurnSeatIndex: room.currentTurnSeatIndex,
      lastComboOnTable: room.lastComboOnTable,
      players: maskedPlayers,
      myDraftOptions:
        room.status === RoomStatus.BUFF_DRAFT
          ? room.draftOptions.get(c.playerId)
          : undefined,
      myRerollRemaining: room.getRerollCount(c.playerId),
      isFirstMatch: room.isFirstMatch,
      firstTurnRequiredCard:
        room.firstTurnRequiredCardId !== null && room.lowestDealtCard
          ? {
              id: room.lowestDealtCard.id,
              rank: room.lowestDealtCard.rank,
              suit: room.lowestDealtCard.suit,
              code: room.lowestDealtCard.code,
            }
          : null,
      extraEvent,
    };

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }
}

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 TLMN Buff Game Server running at: http://localhost:${PORT}`);
  console.log(`🎴 WebSocket Gateway active on the same port`);
  console.log(`====================================================`);
});

