# Implementation Plan: Luật Đi Đầu & Sửa Lỗi Chọn Buff Mới Mỗi Ván

Tài liệu này vạch ra kế hoạch kỹ thuật chi tiết để triển khai tính năng theo tài liệu đặc tả [spec.md](file:///e:/GAMES/TLMNActivity/specs/features/first-turn-rules-and-buff-draft-fix/spec.md).

---

## 1. Architecture & Data Models (Mô Hình Dữ Liệu & Kiến Trúc)

### 1.1 Mở rộng `BuffManager` (`src/buffs/buff-manager.ts`)
Bổ sung các phương thức xóa sạch buff cũ giữa các ván:

```typescript
export class BuffManager {
  private playerSlots = new Map<string, PlayerBuffSlot[]>();

  // Xóa toàn bộ buff của một người chơi cụ thể để chuẩn bị cho ván mới
  public resetPlayerBuffs(playerId: string): void {
    this.playerSlots.set(playerId, []);
  }

  // Xóa toàn bộ buff của mọi người chơi trong phòng
  public clearAll(): void {
    this.playerSlots.clear();
  }
  // ...
}
```

### 1.2 Mở rộng `GameRoom` (`src/server/room.ts`)
Bổ sung các trường quản lý trạng thái ván và người đi đầu:

```typescript
export class GameRoom {
  // Trạng thái nhận diện ván đầu tiên của phòng
  public isFirstMatch: boolean = true;

  // Lưu ID của người chiến thắng ván gần nhất
  public lastWinnerPlayerId: string | null = null;

  // ID của lá bài bắt buộc phải có mặt trong nước đi đầu tiên (chỉ áp dụng ván 1)
  public firstTurnRequiredCardId: number | null = null;
  public lowestDealtCard: Card | null = null;

  // Tìm lá bài có giá trị nhỏ nhất trong số toàn bộ bài đã chia cho các người chơi
  public findLowestDealtCard(): { card: Card; player: PlayerSession } | null;

  // Xác định người đi đầu khi bắt đầu thi đấu (PLAYING)
  public determineStartingTurn(): void;
}
```

### 1.3 Mở rộng Payload `ROOM_STATE_UPDATE` (`src/index.ts` & `client/app.js`)
Gửi thông tin lá bắt buộc về Client:

```typescript
export interface RoomStateUpdatePayload {
  // ... các trường hiện tại
  isFirstMatch: boolean;
  firstTurnRequiredCard?: {
    id: number;
    rank: number;
    suit: number;
    code: string;
    label: string; // VD: "3♠"
  } | null;
}
```

---

## 2. API & Event Contracts (Giao Ước Sự Kiện)

### 2.1 Mã Lỗi Mới Khi Đánh Sai Lượt Đầu
Khi người chơi đi lượt đầu ván 1 mà không chứa lá bài bắt buộc:

```json
{
  "type": "ERROR_EVENT",
  "code": "INVALID_FIRST_TURN_CARD",
  "message": "Nước đi đầu tiên của ván đầu bắt buộc phải chứa lá bài nhỏ nhất [3♠]!"
}
```

### 2.2 Luồng Sự Kiện Chọn Buff Giữa Các Ván
```text
1. Ván cũ kết thúc -> PLAY_AGAIN
2. Server gọi room.resetToLobby() -> resetPlayerBuffs(pid) cho từng người
3. Người chơi bấm SẴN SÀNG -> room.startMatch()
4. Server sinh 3 buff mới cho từng người, rerollCounts = 3, status = BUFF_DRAFT
5. Server broadcast ROOM_STATE_UPDATE với myDraftOptions
6. Client mở lại modal #buff-draft-modal kèm 3 lượt đổi
7. Người chơi chọn buff -> SELECT_BUFF
8. Khi tất cả chọn xong -> room.determineStartingTurn() -> status = PLAYING
```

---

## 3. Bot AI Adaptation (`src/core/bot.ts`)
Cập nhật `decideBotMove`:

```typescript
export function decideBotMove(
  handCards: Card[],
  lastComboOnTable: HandCombo | null,
  firstTurnRequiredCardId?: number | null
): BotDecision {
  if (firstTurnRequiredCardId !== undefined && firstTurnRequiredCardId !== null) {
    // Ưu tiên tìm các bộ sảnh, đôi, sám có chứa lá bài bắt buộc này
    const requiredCard = handCards.find((c) => c.id === firstTurnRequiredCardId);
    if (!requiredCard) {
      return { action: 'PASS' };
    }
    // Tìm sảnh chứa requiredCard -> Đôi chứa requiredCard -> Đánh lá rác requiredCard
    const comboWithRequired = findComboContainingCard(handCards, requiredCard);
    return {
      action: 'PLAY',
      cardIds: comboWithRequired.map((c) => c.id),
      comboType: evaluateCombo(comboWithRequired).type,
    };
  }
  // Logic hiện tại...
}
```

---

## 4. Phased Implementation Roadmap (Lộ Trình Triển Khai)

- [x] **Phase 1: Sửa triệt để cơ chế Buff Draft & Reset Buff giữa các ván**
  - [x] Cập nhật `BuffManager.resetPlayerBuffs()` và `clearAll()`.
  - [x] Gọi `resetPlayerBuffs()` trong `GameRoom.resetToLobby()` và `startMatch()`.
  - [x] Đảm bảo điều kiện `allSelected` không bị tính nhầm buff cũ.
  - [x] Kiểm tra modal chọn buff mở lại mượt mà khi bắt đầu ván mới.

- [x] **Phase 2: Logic xác định người đi đầu & Ràng buộc lá bài nhỏ nhất**
  - [x] Triển khai hàm `findLowestDealtCard()` quét toàn bộ bài của các người chơi thực tế.
  - [x] Triển khai `determineStartingTurn()` phân nhánh:
    - Nếu là ván đầu (`isFirstMatch == true`): gán lượt cho người cầm lá nhỏ nhất, gán `firstTurnRequiredCardId`.
    - Nếu là ván sau (`isFirstMatch == false`): gán lượt cho `lastWinnerPlayerId`.
  - [x] Cập nhật `GameRoom.playHand()`: Kiểm tra `firstTurnRequiredCardId`, từ chối nếu không chứa lá nhỏ nhất. Xóa cờ này sau khi đánh thành công.
  - [x] Ghi nhận `lastWinnerPlayerId` khi ván kết thúc và đặt `isFirstMatch = false`.

- [x] **Phase 3: Cập nhật Bot AI & Xử lý Timeout**
  - [x] Cập nhật `decideBotMove()` truyền thêm `firstTurnRequiredCardId`.
  - [x] Cập nhật `handleTurnTimeout()` nếu rơi vào lượt đầu ván 1 thì ưu tiên đánh lá bắt buộc.

- [x] **Phase 4: Cập nhật Giao Diện Client (`client/app.js` & `client/style.css`)**
  - [x] Nhận `firstTurnRequiredCard` từ Server.
  - [x] Thêm hiệu ứng viền sáng nổi bật cho lá bài nhỏ nhất trên tay người chơi khi đến lượt mở màn ván 1.
  - [x] Cập nhật huy hiệu `comboPreviewBadge` thông báo rõ: `💡 BẮT BUỘC ĐÁNH BỘ CHỨA [3♠]`.
  - [x] Chặn nút ĐÁNH BÀI và hiện Toast cảnh báo nếu chọn thiếu lá bài bắt buộc.
  - [x] Cập nhật gợi ý tự động (`findAutoBeatCombo`) khi mở màn ván 1 sẽ luôn ưu tiên chọn bộ chứa lá bắt buộc.

- [x] **Phase 5: Kiểm Thử & Tích Hợp (Testing & Verification)**
  - [x] Viết Unit Test cho `findLowestDealtCard` (2 người, 3 người, 4 người).
  - [x] Viết Unit Test cho `playHand` kiểm tra tính hợp lệ của lá bắt buộc ở ván 1 (chấp nhận rác, đôi, sảnh chứa lá nhỏ nhất; từ chối nếu không có).
  - [x] Viết Unit Test cho ván 2: người thắng ván trước đi đầu, không bị ép lá nhỏ nhất.
  - [x] Viết Unit Test cho việc reset buff và cấp lại 3 lượt roll ở ván 2.
  - [x] Chạy toàn bộ test suite (`npm test`) đảm bảo 56/56 tests pass 100%.

---

## 5. Testing & Validation Strategy (Chiến Lược Kiểm Thử)

1. **Unit Tests (`src/server/room.test.ts` & `src/core/bot.test.ts`)**:
   - `test_first_match_lowest_card_turn`: Kiểm tra người giữ lá nhỏ nhất đi đầu ván 1.
   - `test_first_match_must_contain_lowest_card`: Đánh bài không chứa lá nhỏ nhất bị từ chối; đánh rác/đôi/sảnh chứa lá nhỏ nhất được chấp thuận.
   - `test_subsequent_match_winner_goes_first`: Ván 2 người thắng ván 1 đi đầu và không bị ép lá nhỏ nhất.
   - `test_buff_draft_reset_between_matches`: Ván 2 người chơi có 3 options mới, 3 lượt reroll, không bị nhảy cóc qua PLAYING.
2. **End-to-End Simulation**:
   - Chạy giả lập ván 1 kết thúc -> bấm chơi lại -> ván 2 chọn buff mới -> người thắng ván 1 đi đầu.

---

## 6. Risk Analysis & Mitigation (Phân Tích Rủi Ro)

| Rủi ro | Mức độ | Biện pháp giảm thiểu |
| :--- | :---: | :--- |
| **Phòng chỉ có 2 người chơi nên không ai có 3 Bích (3♠)** | Trung bình | Hàm `findLowestDealtCard` sắp xếp toàn bộ bài của người chơi thực tế có mặt trên bàn để tìm lá bài có giá trị nhỏ nhất thực tế, không hardcode `3♠`. |
| **Người thắng ván trước thoát phòng trước khi ván mới bắt đầu** | Thấp | Kiểm tra `lastWinnerPlayerId` có nằm trong danh sách `players` đang kết nối không. Nếu không, tự động fallback về luật tìm người cầm lá bài nhỏ nhất. |
| **Xung đột với Buff Tiên Thủ (BUFF_FIRST_STRIKE)** | Thấp | Ưu tiên Buff Tiên Thủ nếu người chơi có trang bị và kích hoạt, nếu không có ai mang Tiên Thủ thì áp dụng luật chuẩn (người thắng ván trước hoặc người giữ lá nhỏ nhất). |

