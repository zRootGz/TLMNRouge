# Technical Implementation Plan: Quét & Sửa Lỗi Tính Năng Game - Khắc Phục Lỗi Add Bot & Quản Lý Vòng Đời Phòng Chơi

## 1. Architecture & Data Contracts

### 1.1 Gói tin `ROOM_STATE_UPDATE` (Bổ sung `isBot`)
```typescript
interface MaskedPlayer {
  id: string;
  username: string;
  seatIndex: number;
  cardCount: number;
  isReady: boolean;
  hasPassedRound: boolean;
  score: number;
  isBot: boolean; // Bổ sung để client nhận diện
  buffs: PlayerBuffSlot[];
  handCards?: Card[];
}
```

### 1.2 Quản Lý Kết Nối & Session Reconnection
- Bổ sung `userId` hoặc `sessionId` từ Client gửi lên trong `JOIN_ROOM`.
- Nếu Client ngắt kết nối trong `LOBBY`:
  - Xóa người chơi khỏi `room.players`.
  - Nếu tất cả người chơi thật đều thoát (chỉ còn bot hoặc không còn ai): gọi `room.resetToLobby()` và xóa hết bot.
- Nếu Client ngắt kết nối trong lúc `PLAYING`:
  - Đánh dấu `isConnected = false`.
  - Nếu tất cả người chơi thật đều thoát trong 1 khoảng thời gian: tự động reset phòng để không bị treo phòng vĩnh viễn.

---

## 2. Phased Implementation Roadmap

- [x] **Phase 1: Xử lý Logic Server (`src/server/room.ts`)**
  - Cập nhật `addBot()`: Tự động kiểm tra `if (this.players.length >= 2 && this.players.every((p) => p.isReady)) { this.startMatch(); }` để trận đấu bắt đầu ngay nếu người chơi đã Ready.
  - Bổ sung hàm `removePlayer(playerId: string)` để dọn dẹp người chơi khi thoát khỏi Lobby.
  - Bổ sung hàm `cleanupIfOrphaned()` để tự động dọn sạch bot và reset trạng thái phòng khi không còn người chơi thật nào kết nối.

- [x] **Phase 2: Xử lý WebSocket Server (`src/index.ts`)**
  - Trong `broadcastState`: Truyền `isBot: p.isBot` vào `maskedPlayers`.
  - Trong `ws.on('close')`:
    - Tìm phòng mà client đang tham gia.
    - Nếu phòng ở trạng thái `LOBBY`: gọi `room.removePlayer(client.playerId)`.
    - Kiểm tra nếu phòng không còn human player: dọn dẹp phòng về trạng thái ban đầu (`LOBBY` trống).
    - Phát `broadcastState` cập nhật lại cho các client còn lại.
  - Reset lại `default_room` hiện tại đang bị kẹt để người chơi có thể vào lại ngay.

- [x] **Phase 3: Cập nhật Client UI (`client/app.js` & `client/style.css`)**
  - Lưu `playerId` hoặc dùng ID định danh nhất quán vào `sessionStorage` để khi F5 trang có thể tái kết nối mà không bị trùng hay sinh session rác.
  - Trong Lobby: Hiển thị nhãn `READY` (xanh neon) hoặc `CHỜ...` trên avatar/thẻ của người chơi và bot thay vì `[0 CARDS]`.
  - Nút `🤖 + BOT`: Vô hiệu hóa (`disabled`) khi phòng đã đủ 4 người chơi.

- [x] **Phase 4: Viết Unit Test & Kiểm Thử Toàn Diện**
  - Viết test trong `src/server/room.test.ts` kiểm tra:
    - Thêm bot khi người chơi đã Ready tự động start trận.
    - Xóa người chơi và dọn phòng khi ngắt kết nối.
  - Chạy `npm test` và `npm run build` đảm bảo không lỗi.
  - Chạy thử nghiệm thực tế với bot qua script WebSocket mô phỏng.

