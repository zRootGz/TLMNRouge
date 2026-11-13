import { WebSocketServer, WebSocket } from 'ws';
import { GameRoom, RoomStatus } from './room.ts';
import type { BuffId } from '../buffs/types.ts';

interface ClientMessage {
  type:
    | 'JOIN_ROOM'
    | 'PLAYER_READY'
    | 'SELECT_BUFF'
    | 'PLAY_HAND'
    | 'PASS_TURN'
    | 'USE_BUFF'
    | 'PING';
  roomId?: string;
  playerId?: string;
  username?: string;
  isReady?: boolean;
  buffId?: BuffId;
  cardIds?: number[];
  targetSeatIndex?: number;
}

interface SocketClient {
  ws: WebSocket;
  playerId: string;
  roomId?: string;
}

export class GameGateway {
  private wss: WebSocketServer | null = null;
  private rooms = new Map<string, GameRoom>();
  private clients = new Map<WebSocket, SocketClient>();

  public start(port: number = 8080): WebSocketServer {
    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (ws: WebSocket) => {
      const clientInfo: SocketClient = {
        ws,
        playerId: `player_${Math.random().toString(36).substring(2, 9)}`,
      };
      this.clients.set(ws, clientInfo);

      ws.on('message', (data: string) => {
        try {
          const msg: ClientMessage = JSON.parse(data.toString());
          this.handleMessage(clientInfo, msg);
        } catch (err: any) {
          this.sendError(ws, 'INVALID_PAYLOAD', err.message || 'Lỗi phân tích cú pháp tin nhắn');
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(clientInfo);
        this.clients.delete(ws);
      });
    });

    console.log(`[GameGateway] WebSocket server running on port ${port}`);
    return this.wss;
  }

  public stop(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }

  private handleMessage(client: SocketClient, msg: ClientMessage): void {
    switch (msg.type) {
      case 'PING':
        client.ws.send(JSON.stringify({ type: 'PONG' }));
        break;

      case 'JOIN_ROOM': {
        const roomId = msg.roomId || 'default_room';
        let room = this.rooms.get(roomId);
        if (!room) {
          room = new GameRoom(roomId);
          this.rooms.set(roomId, room);
        }

        const username = msg.username || `Player_${client.playerId.substring(7, 11)}`;
        const joined = room.addPlayer(client.playerId, username);
        if (!joined) {
          return this.sendError(client.ws, 'ROOM_FULL', 'Phòng đã đầy hoặc đang trong ván');
        }

        client.roomId = roomId;
        this.broadcastRoomState(room);
        break;
      }

      case 'PLAYER_READY': {
        const room = this.getRoomOrError(client);
        if (!room) return;
        const success = room.setReady(client.playerId, msg.isReady ?? true);
        if (!success) {
          return this.sendError(client.ws, 'ACTION_FAILED', 'Không thể đổi trạng thái sẵn sàng');
        }
        this.broadcastRoomState(room);
        break;
      }

      case 'SELECT_BUFF': {
        const room = this.getRoomOrError(client);
        if (!room || !msg.buffId) return;
        const success = room.selectBuff(client.playerId, msg.buffId);
        if (!success) {
          return this.sendError(client.ws, 'SELECT_BUFF_FAILED', 'Không thể chọn buff này');
        }
        this.broadcastRoomState(room);
        break;
      }

      case 'PLAY_HAND': {
        const room = this.getRoomOrError(client);
        if (!room || !msg.cardIds) return;
        const result = room.playHand(client.playerId, msg.cardIds);
        if (!result.success) {
          return this.sendError(client.ws, 'INVALID_MOVE', result.error || 'Nước đi không hợp lệ');
        }
        this.broadcastRoomState(room, {
          type: 'HAND_PLAYED',
          combo: result.combo,
          isMatchOver: result.isMatchOver,
          winnerPlayerId: result.winnerPlayerId,
        });
        break;
      }

      case 'PASS_TURN': {
        const room = this.getRoomOrError(client);
        if (!room) return;
        const result = room.passTurn(client.playerId);
        if (!result.success) {
          return this.sendError(client.ws, 'PASS_FAILED', result.error || 'Không thể bỏ lượt');
        }
        this.broadcastRoomState(room, {
          type: 'TURN_PASSED',
          isRoundReset: result.isRoundReset,
        });
        break;
      }

      case 'USE_BUFF': {
        const room = this.getRoomOrError(client);
        if (!room || !msg.buffId) return;

        if (msg.buffId === 'BUFF_SWAP_CARD' && msg.cardIds?.[0] !== undefined) {
          const player = room.players.find((p) => p.id === client.playerId);
          if (!player) return;
          const swapRes = room.buffManager.executeSwapCard(
            client.playerId,
            msg.cardIds[0],
            player.handCards,
            room.drawPile
          );
          if (!swapRes.success) {
            return this.sendError(client.ws, 'BUFF_ERROR', swapRes.error || 'Lỗi hoán bài');
          }
          player.handCards = swapRes.updatedHand!;
          this.broadcastRoomState(room, {
            type: 'BUFF_ACTIVATED',
            buffId: msg.buffId,
            playerId: client.playerId,
          });
        }
        break;
      }
    }
  }

  private handleDisconnect(client: SocketClient): void {
    if (!client.roomId) return;
    const room = this.rooms.get(client.roomId);
    if (!room) return;

    // Trong game, xử lý chuyển lượt hoặc kết thúc nếu người chơi disconnect
    if (room.status === RoomStatus.LOBBY) {
      room.players = room.players.filter((p) => p.id !== client.playerId);
      this.broadcastRoomState(room);
    }
  }

  private getRoomOrError(client: SocketClient): GameRoom | null {
    if (!client.roomId) {
      this.sendError(client.ws, 'NOT_IN_ROOM', 'Bạn chưa tham gia phòng');
      return null;
    }
    const room = this.rooms.get(client.roomId);
    if (!room) {
      this.sendError(client.ws, 'ROOM_NOT_FOUND', 'Phòng không tồn tại');
      return null;
    }
    return room;
  }

  /**
   * Phát sóng cập nhật trạng thái phòng cho toàn bộ client.
   * QUAN TRỌNG: Áp dụng nguyên tắc Zero-Trust:
   * Chỉ gửi toàn bộ bài của chính client đó; các đối thủ khác chỉ gửi số lượng lá còn lại!
   */
  public broadcastRoomState(room: GameRoom, extraEvent?: any): void {
    for (const [ws, client] of this.clients.entries()) {
      if (client.roomId !== room.roomId) continue;

      // Mask bài của đối thủ
      const maskedPlayers = room.players.map((p) => ({
        id: p.id,
        username: p.username,
        seatIndex: p.seatIndex,
        cardCount: p.handCards.length,
        isReady: p.isReady,
        hasPassedRound: p.hasPassedRound,
        score: p.score,
        buffs: room.buffManager.getPlayerBuffs(p.id),
        // Chỉ gửi lá bài cụ thể nếu là chính player đó
        handCards: p.id === client.playerId ? p.handCards : undefined,
      }));

      const payload = {
        type: 'ROOM_STATE_UPDATE',
        roomId: room.roomId,
        status: room.status,
        currentTurnSeatIndex: room.currentTurnSeatIndex,
        lastComboOnTable: room.lastComboOnTable,
        players: maskedPlayers,
        myDraftOptions:
          room.status === RoomStatus.BUFF_DRAFT
            ? room.draftOptions.get(client.playerId)
            : undefined,
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

  private sendError(ws: WebSocket, code: string, message: string): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ERROR_EVENT', code, message }));
    }
  }
}

