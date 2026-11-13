# Implementation Plan: Smart Card Selection & Discord Identity Integration

## 1. Architecture & Data Models

### 1.1. Data Models Update
Cập nhật interface người chơi trên Server (`src/server/room.ts` và `src/index.ts`):

```typescript
// src/server/room.ts
export interface PlayerSession {
  id: string;
  username: string;
  avatarUrl?: string; // URL ảnh đại diện Discord hoặc custom
  seatIndex: number;
  handCards: Card[];
  isReady: boolean;
  hasPassedRound: boolean;
  isConnected: boolean;
  isBot?: boolean;
  score: number;
}
```

```typescript
// MaskedPlayer gửi trong ROOM_STATE_UPDATE
export interface MaskedPlayer {
  id: string;
  username: string;
  avatarUrl?: string;
  seatIndex: number;
  cardCount: number;
  isReady: boolean;
  hasPassedRound: boolean;
  score: number;
  isBot: boolean;
  buffs: Buff[];
  handCards?: Card[];
}
```

### 1.2. Discord SDK Architecture & Flow
```text
[Discord Client iframe]
  │
  ├──> Kiểm tra URL params: ?frame_id=... & instance_id=...
  │     ├── Nếu có: Khởi tạo DiscordSDK(CLIENT_ID)
  │     │     ├── discordSdk.ready()
  │     │     ├── discordSdk.commands.authenticate() / authorize()
  │     │     └── Lấy user: username, global_name, avatar
  │     └── Nếu không (Local Web / Dev):
  │           └── Fallback: URL params (?username=..., ?avatar=...) hoặc sessionStorage
  │
  └──> WebSocket: Gửi JOIN_ROOM { roomId, playerId, username, avatarUrl }
```

### 1.3. Smart Card Selection Architecture
```text
[my-hand Container]
  │
  ├── Sự kiện Click / Drag / Swipe
  │     └── Cập nhật selectedCards (Array<Card>)
  │
  ├──> client/suggester.js (Bộ phân tích & gợi ý)
  │     ├── evaluateLocalCombo(selectedCards): Combo Type, Rank, Suit
  │     ├── canBeatLocalCombo(myCombo, lastComboOnTable): boolean
  │     └── findSmartBeatCombo(hand, lastComboOnTable): Card[] (Cho nút Gợi Ý)
  │
  └──> Render UI Feedback:
        ├── Cập nhật #combo-preview-badge (Text, Icon, Class: valid/invalid/beatable)
        ├── Cập nhật nút PLAY HAND (disabled / enabled)
        └── Cập nhật nút BỎ CHỌN (hiện / ẩn)
```

---

## 2. API & Event Contracts

### 2.1. Client $\rightarrow$ Server: `JOIN_ROOM`
```json
{
  "type": "JOIN_ROOM",
  "roomId": "default_room",
  "playerId": "user_abc12",
  "username": "NguyenVanA",
  "avatarUrl": "https://cdn.discordapp.com/avatars/123456789/abcdef.png?size=128"
}
```

### 2.2. Server $\rightarrow$ Client: `ROOM_STATE_UPDATE`
```json
{
  "type": "ROOM_STATE_UPDATE",
  "players": [
    {
      "id": "user_abc12",
      "username": "NguyenVanA",
      "avatarUrl": "https://cdn.discordapp.com/avatars/123456789/abcdef.png?size=128",
      "seatIndex": 0,
      "cardCount": 13,
      "isReady": true,
      "score": 1000,
      "isBot": false
    }
  ]
}
```

---

## 3. Phased Implementation Roadmap

### Phase 1: Server Data Propagation (Backend)
- [x] Cập nhật `PlayerSession` trong [src/server/room.ts](file:///e:/GAMES/TLMNActivity/src/server/room.ts) thêm trường `avatarUrl?: string`.
- [x] Cập nhật hàm `addPlayer(id, username, avatarUrl)` và `reconnectPlayer()` trong `GameRoom`.
- [x] Cập nhật `handleClientMessage` (`case 'JOIN_ROOM'`) trong [src/index.ts](file:///e:/GAMES/TLMNActivity/src/index.ts) để nhận và lưu `msg.avatarUrl`.
- [x] Cập nhật `broadcastState()` để đính kèm `avatarUrl` trong `maskedPlayers`.

### Phase 2: Discord Embedded App SDK & Avatar Rendering (Frontend)
- [x] Thêm thư viện Discord Embedded App SDK trong [client/index.html](file:///e:/GAMES/TLMNActivity/client/index.html) (CDN hoặc ES module dynamic import với try/catch an toàn).
- [x] Viết hàm `setupDiscordIdentity()` trong [client/app.js](file:///e:/GAMES/TLMNActivity/client/app.js):
  - Nhận diện môi trường Discord Activity (`frame_id`, `instance_id`).
  - Lấy `currentUser` (username/global_name và URL avatar chuẩn Discord CDN).
  - Tự động fallback linh hoạt khi test local hoặc chạy trên trình duyệt web ngoài.
- [x] Cập nhật giao diện HTML và hàm `renderOpponents` + `renderRoomState` trong [client/app.js](file:///e:/GAMES/TLMNActivity/client/app.js):
  - Render `<img class="avatar-img" src="...">` vào thẻ `.avatar` của các slot (`slot-bottom`, `slot-top`, `slot-left`, `slot-right`).
  - Thêm CSS cho `.avatar-img` (bo tròn/pixel frame, viền neon, object-fit cover).

### Phase 3: Smart Card Selection & Live Combo Preview (Frontend)
- [x] Thêm thẻ HTML `#combo-preview-badge` phía trên khay bài trong [client/index.html](file:///e:/GAMES/TLMNActivity/client/index.html).
- [x] Thêm nút `⚡ GỢI Ý` (`#btn-suggest`) và `🧹 BỎ CHỌN` (`#btn-clear-selection`) vào `.action-bar`.
- [x] Nâng cấp [client/suggester.js](file:///e:/GAMES/TLMNActivity/client/suggester.js):
  - Hàm `evaluateLocalCombo(cards)`: nhận diện chính xác Single, Pair, Triple, Straight, Four of a Kind, 3/4 đôi thông.
  - Hàm `canBeatLocalCombo(combo, targetCombo)`: kiểm tra điều kiện đè bài và chặt hàng theo chuẩn luật TLMN.
  - Hàm `findAutoBeatCombo(hand, targetCombo)`: tìm combo tối ưu nhỏ nhất đè được bài đối thủ.
- [x] Cập nhật hàm `updateCardSelection()` trong [client/app.js](file:///e:/GAMES/TLMNActivity/client/app.js):
  - Cập nhật thời gian thực nội dung, màu sắc và icon của `#combo-preview-badge`.
  - Tự động bật/tắt (enable/disable) nút `PLAY HAND` tùy theo tính hợp lệ của bài.
- [x] Cài đặt xử lý sự kiện cho nút `⚡ GỢI Ý` và `🧹 BỎ CHỌN`.
- [x] Cài đặt tính năng Drag / Swipe selection (`pointerdown`, `pointerenter`, `pointerup`) trên khay bài `#my-hand`.

### Phase 4: Verification, Testing & Polish
- [x] Chạy kiểm thử toàn bộ test suite hiện có (`npm test`) đảm bảo không ảnh hưởng logic bài và bot (54/54 passed).
- [x] Tạo file kiểm thử scratch `test_smart_and_avatar.js` để xác minh bộ phân tích combo và gợi ý bài.
- [x] Kiểm tra giao diện thực tế trên trình duyệt và tunnel Discord Activity.

---

## 4. Testing & Validation Strategy
1. **Unit Testing:**
   - Đảm bảo 53 test case hiện tại trong `src/` tiếp tục vượt qua 100%.
   - Thêm test case cho `avatarUrl` trong `room.test.ts`.
2. **End-to-End Simulation Testing:**
   - Chạy script kiểm thử WebSocket giả lập nhiều client kết nối với `avatarUrl` khác nhau và kiểm tra payload `ROOM_STATE_UPDATE`.
3. **UX & Responsive Inspection:**
   - Kiểm tra hiển thị avatar Discord (hoặc fallback) tại tất cả các ghế ngồi.
   - Kiểm tra độ nhạy của badge combo, nút gợi ý và thao tác vuốt chọn bài trên cả chuột máy tính lẫn chế độ touch screen giả lập.

---

## 5. Risk Analysis
| Rủi ro | Mức độ | Biện pháp giảm thiểu |
|---|---|---|
| Discord SDK không khởi tạo được khi chạy trên browser thường | Cao | Dùng block `try...catch` an toàn và tự động fallback về query params / mock data, đảm bảo game không bao giờ bị đứng |
| CDN avatar Discord bị lỗi ảnh (broken link) | Thấp | Thêm handler `onerror` trên thẻ `<img>` tự động chuyển về avatar emoji Balatro mặc định |
| Xung đột giữa sự kiện click và swipe khi chọn bài | Trung bình | Sử dụng Pointer Events (`pointerdown`, `pointermove`, `pointerup`) có ngưỡng khoảng cách kéo tối thiểu (threshold) để phân biệt giữa click đơn và rê chuột |

