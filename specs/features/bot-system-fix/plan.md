# Technical Implementation Plan: Sửa lỗi Bot tự đánh bài và Kích hoạt Kỹ năng

## 1. Architecture & Data Models

### 1.1 Mở rộng `BotDecision` trong `src/core/bot.ts`
```typescript
import type { BuffId } from '../buffs/types.ts';

export interface BotSkillDecision {
  buffId: BuffId;
  cardId?: number; // Khi dùng BUFF_SWAP_CARD cần chỉ định lá bài đổi
}

export interface BotActionDecision {
  skillToUse?: BotSkillDecision; // Kỹ năng chủ động muốn kích hoạt trước khi ra bài
  move: {
    action: 'PLAY' | 'PASS';
    cardIds?: number[];
  };
}
```

### 1.2 Hàm ra quyết định dùng Buff của Bot (`decideBotBuffUse`)
```typescript
export function decideBotBuffUse(
  hand: Card[],
  availableBuffs: BuffId[],
  nextPlayerCardCount: number,
  drawPileCount: number
): BotSkillDecision | null {
  // 1. BUFF_FREEZE_TURN: Nếu đối thủ kế tiếp còn <= 3 lá
  if (availableBuffs.includes('BUFF_FREEZE_TURN') && nextPlayerCardCount <= 3) {
    return { buffId: 'BUFF_FREEZE_TURN' };
  }

  // 2. BUFF_SWAP_CARD: Nếu cọc rút còn bài và trong tay có lá rác nhỏ <= 5
  if (availableBuffs.includes('BUFF_SWAP_CARD') && drawPileCount > 0) {
    const sorted = sortCards(hand);
    const trashCard = sorted.find((c) => c.rank <= 5);
    if (trashCard) {
      return { buffId: 'BUFF_SWAP_CARD', cardId: trashCard.id };
    }
  }

  // 3. BUFF_SPY_HAND: Dùng sớm để soi bài
  if (availableBuffs.includes('BUFF_SPY_HAND')) {
    return { buffId: 'BUFF_SPY_HAND' };
  }

  return null;
}
```

---

## 2. API & Event Contracts

### 2.1 Server-to-Client Event: `BOT_SKILL_USED`
Khi Bot sử dụng một kỹ năng chủ động, Server sẽ broadcast thêm sự kiện này để Client render Banner/Toast và hiệu ứng âm thanh:
```json
{
  "type": "BOT_SKILL_USED",
  "botId": "bot_xyz123",
  "botName": "Bot Nam",
  "buffId": "BUFF_FREEZE_TURN",
  "description": "Bot Nam đã kích hoạt Băng Phong! Đóng băng lượt của người kế tiếp!"
}
```

---

## 3. Phased Implementation Roadmap

- [x] **Phase 1: Vá lỗi Event Loop Trigger cho Bot trong `src/index.ts`**
  - [x] Gọi `triggerBotTurnIfNeeded(room)` sau khi kết thúc `BUFF_DRAFT` (hoặc khi người chơi hoàn tất `SELECT_BUFF`).
  - [x] Gọi `triggerBotTurnIfNeeded(room)` sau khi người chơi thực hiện `PLAY_HAND`.
  - [x] Gọi `triggerBotTurnIfNeeded(room)` sau khi người chơi thực hiện `PASS_TURN`.
  - [x] Gọi `triggerBotTurnIfNeeded(room)` sau khi người chơi sử dụng kỹ năng `USE_BUFF`.
  - [x] Thêm cờ bảo vệ `room.isBotThinking` để ngăn trigger trùng lặp (debounce / race condition).

- [x] **Phase 2: Xây dựng Bot Skill AI Engine trong `src/core/bot.ts` & `src/server/room.ts`**
  - [x] Viết hàm `decideBotBuffUse` tính toán thời điểm dùng `BUFF_FREEZE_TURN`, `BUFF_SWAP_CARD`, `BUFF_SPY_HAND`.
  - [x] Cập nhật phương thức `executeBotTurn` trong `GameRoom` để kích hoạt skill trước, sau đó mới ra bài.
  - [x] Cập nhật trừ số lần sử dụng buff của Bot sau khi kích hoạt (`remainingCharges`).

- [x] **Phase 3: Cải thiện thuật toán ra bài của Bot trong `src/core/bot.ts`**
  - [x] Bổ sung khả năng Bot đánh sảnh khi ở vòng tự do.
  - [x] Bổ sung khả năng Bot chặt Heo nếu đối thủ đánh Heo và Bot có 3 đôi thông / Tứ quý.
  - [x] Tránh Bot vứt Heo lẻ bừa bãi khi đối thủ còn nhiều bài.

- [x] **Phase 4: Cập nhật Client UI hiển thị hành động của Bot**
  - [x] Lắng nghe sự kiện `BOT_SKILL_USED` trong `client/app.js` và phát âm thanh tương ứng.
  - [x] Hiển thị Toast thông báo tên Bot và chiêu thức vừa xuất hiện.
  - [x] Hiển thị thông báo khi đối thủ/Bot bỏ lượt.

- [x] **Phase 5: Kiểm thử tự động & Kiểm chứng thực tế**
  - [x] Viết unit test trong `src/core/bot.test.ts` kiểm tra `decideBotBuffUse` và `executeBotTurn`.
  - [x] Viết simulation test mô phỏng ván chơi 4 Bot chạy tự động mà không bị deadlock.
  - [x] Chạy `npm test` và `npm run build` đảm bảo 100% pass (45/45 tests passing).

---

## 4. Testing & Validation Strategy
1. **Unit Tests (`test/bot.test.ts`):**
   - Test Bot tự dùng `BUFF_FREEZE_TURN` khi người kế tiếp còn 2 lá bài.
   - Test Bot tự dùng `BUFF_SWAP_CARD` để đổi 3 bích khi có bài trong cọc.
   - Test Bot tự đánh sảnh và đôi nhỏ nhất khi cầm vòng tự do.
2. **Simulation Test (`test/bot-simulation.test.ts`):**
   - Khởi tạo phòng với 4 Bot (`bot_1`, `bot_2`, `bot_3`, `bot_4`).
   - Chạy vòng lặp tự động ra bài cho đến khi kết thúc ván (`MATCH_END`).
   - Đảm bảo không bị deadlock, không bị vòng lặp vô tận và có người chiến thắng.

---

## 5. Risk Analysis
- **Rủi ro 1: Deadlock vòng lặp Bot:** Nếu 4 Bot liên tục bỏ lượt hoặc không ai đánh được.
  - *Giải pháp:* FSM đã có cơ chế: khi 3 người liên tiếp bỏ lượt, người cuối cùng thắng vòng và được quyền đánh tự do lá bài bất kỳ (luật Tiến Lên Miền Nam chuẩn).
- **Rủi ro 2: Race condition do `setTimeout` bất đồng bộ:**
  - *Giải pháp:* Đặt cờ `isBotThinking` trên GameRoom. Nếu cờ đang `true`, các lần gọi `triggerBotTurnIfNeeded` tiếp theo sẽ lập tức return bỏ qua.

