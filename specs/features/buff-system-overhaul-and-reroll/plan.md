# Technical Implementation Plan: Nâng Cấp Hệ Thống Thẻ Bài Buff & Cơ Chế Reroll

## 1. Architecture & Data Models

### 1.1 Mở Rộng Danh Mục Buff (`src/buffs/types.ts`)
```typescript
export const BuffId = {
  // 7 Buff hiện tại:
  BUFF_PIG_ARMOR: 'BUFF_PIG_ARMOR',
  BUFF_FIRST_STRIKE: 'BUFF_FIRST_STRIKE',
  BUFF_REVIVE_PASS: 'BUFF_REVIVE_PASS',
  BUFF_SWAP_CARD: 'BUFF_SWAP_CARD',
  BUFF_SPY_HAND: 'BUFF_SPY_HAND',
  BUFF_FREEZE_TURN: 'BUFF_FREEZE_TURN',
  BUFF_REFLECT_CUT: 'BUFF_REFLECT_CUT',

  // 5 Buff mới:
  BUFF_DOUBLE_CHIPS: 'BUFF_DOUBLE_CHIPS',   // Passive: Thắng nhân đôi tiền thưởng từ tất cả người thua
  BUFF_BOMB_TRAP: 'BUFF_BOMB_TRAP',         // Reactive: Khi bị chặt heo, bom nổ phạt người chặt 100% tiền phạt tương đương
  BUFF_SHUFFLE_HAND: 'BUFF_SHUFFLE_HAND',   // Active: Đổi 2 lá rác nhỏ nhất lấy 2 lá mới từ cọc rút
  BUFF_TIME_WARP: 'BUFF_TIME_WARP',         // Active: Reset 15s cho bản thân, giảm 7s lượt kế tiếp của đối thủ
  BUFF_HEIST: 'BUFF_HEIST',                 // Active: Rút trộm 1 lá bài bất kỳ của đối thủ có ít bài nhất
} as const;
```

### 1.2 Giao Thức WebSocket (`src/index.ts` & `client/app.js`)
- **Event `REROLL_BUFFS`**:
  - Request: `{ type: 'REROLL_BUFFS' }`
  - Server logic: Giảm số lần roll (`rerollCount`), tạo 3 lá buff ngẫu nhiên mới, gửi cập nhật về client.
- **Payload `ROOM_STATE_UPDATE`**:
  - Bổ sung `myRerollRemaining: number` (0 đến 3) để client cập nhật nhãn nút đổi.

---

## 2. Phased Implementation Roadmap

- [x] **Phase 1: Đăng Ký Buff Mới & Logic Server (`src/buffs/` & `src/server/room.ts`)**
  - Cập nhật `src/buffs/types.ts` và `src/buffs/buff-registry.ts` với 12 thẻ Buff.
  - Cập nhật `src/buffs/buff-manager.ts` để hỗ trợ logic các buff mới (Shuffle Hand, Bomb Trap, Double Chips, Time Warp, Heist).
  - Cập nhật `src/server/room.ts`:
    - Thêm `rerollCount: Map<string, number>` (khởi tạo 3 lượt/người chơi mỗi ván).
    - Viết hàm `rerollBuffOptions(playerId: string): { success: boolean; newOptions?: BuffDefinition[]; remaining?: number; error?: string }`.
    - Trong `selectBuff(playerId, buffId)`: Xóa `this.draftOptions.delete(playerId)` ngay khi người chơi chọn xong.
    - Trong `startMatch()`: Reset `rerollCount` thành 3 cho tất cả người chơi và xóa sạch buff cũ của ván trước để chọn mới.

- [x] **Phase 2: Xử Lý WebSocket Server (`src/index.ts`)**
  - Trong `broadcastState`: Truyền `myRerollRemaining: room.getRerollCount(c.playerId)` vào payload.
  - Bổ sung `case 'REROLL_BUFFS'`: Gọi `room.rerollBuffOptions(client.playerId)` và `broadcastState(room)`.
  - Bổ sung xử lý `case 'USE_BUFF'` cho các buff chủ động mới (`BUFF_SHUFFLE_HAND`, `BUFF_TIME_WARP`, `BUFF_HEIST`).
  - Xử lý tính điểm kết thúc ván bài: Nếu người thắng có `BUFF_DOUBLE_CHIPS`, nhân đôi số tiền thưởng nhận được!
  - Xử lý khi bị chặt: Nếu người bị chặt có `BUFF_BOMB_TRAP`, kích hoạt mìn phạt kẻ chặt!

- [x] **Phase 3: Cập Nhật Client UI (`client/app.js` & `client/index.html`)**
  - Thêm nút `#btn-reroll-buff` (`🎲 ĐỔI LẠI (Còn 3 lần)`) trong `#buff-draft-modal`.
  - Sửa lỗi modal không ẩn: Khi click chọn thẻ hoặc khi `myDraftOptions` là undefined, ẩn ngay `#buff-draft-modal`.
  - Cập nhật `BUFF_METADATA` trong `client/app.js` đầy đủ 12 loại buff kèm nhãn [Tự động] / [Ấn dùng].
  - Hiển thị thông báo hướng dẫn trực quan khi người chơi bấm vào từng loại thẻ.

- [x] **Phase 4: Viết Unit Test & Kiểm Thử Toàn Diện**
  - Viết unit test cho các buff mới và cơ chế Reroll trong `src/buffs/buff-manager.test.ts` và `src/server/room.test.ts`.
  - Chạy `npm test` (53/53 tests pass) và `npm run build` (0 lỗi).
  - Khởi động lại game server và kiểm tra trực tiếp.

