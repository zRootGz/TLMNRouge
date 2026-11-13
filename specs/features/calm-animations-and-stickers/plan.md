# Technical Implementation Plan: Tiết Chế Hiệu Ứng Chuyển Động & Bổ Sung Hệ Thống Sticker Cảm Xúc

## 1. Architecture & Data Contracts

### 1.1 WebSocket Events
```typescript
// 1. Client gửi lên server khi người chơi bấm chọn sticker
interface SendStickerMsg {
  type: 'SEND_STICKER';
  stickerId: string;
}

// 2. Server phát sóng cho toàn phòng
interface StickerReactionBroadcast {
  type: 'STICKER_REACTION';
  playerId: string;
  stickerId: string;
}
```

### 1.2 Danh Mục Sticker Đồ Họa (Flaticon-style Vectors)
Bộ sưu tập gồm các SVG vector chất lượng cao, có viền trắng nổi bật đặc trưng của sticker Flaticon:
- `sticker_pig`: 🐷 Heo Vàng Đeo Băng Đô (Biểu tượng chặt heo Tiến Lên)
- `sticker_cool`: 😎 Joker / Kính Đen Thug Life (Gáy khi đè bài)
- `sticker_cry`: 😭 Khóc Nước Nở (Bị chặt hoặc thối heo)
- `sticker_rage`: 😡 Mặt Đỏ Bốc Hỏa (Tức giận)
- `sticker_bomb`: 💣 Bom Hẹn Giờ Nổ (Cảnh báo hàng nóng Tứ Quý)
- `sticker_rich`: 💰 Túi Tiền Vàng Dollar (Thắng lớn / Hốt bạc)
- `sticker_clap`: 👏 Đôi Bàn Tay Vỗ Tay (Khen ngợi)
- `sticker_heart`: ❤️ Trái Tim Lấp Lánh (Thả tim)
- `sticker_ice`: 🧊 Khối Băng Lạnh (Đóng băng lượt)

---

## 2. Phased Implementation Roadmap

- [x] **Phase 1: Tiết Chế Animation Trong `client/style.css` & `client/app.js`**
  - Trong `client/style.css`:
    - Gỡ bỏ `animation: balatro-card-bob` khỏi `.card`. Giữ thẻ bài đứng yên, chỉ dịch chuyển `-12px` khi `:hover` và `-22px` khi `.selected`.
    - Gỡ bỏ `animation: balatro-jiggle` liên tục khỏi `.score-jiggle` và avatar.
    - Tinh chỉnh hiệu ứng chuột `onmousemove`: Giảm độ xoay từ `14deg` xuống tối đa `4.5deg`, scale từ `1.12` xuống `1.05`.
  - Trong `client/app.js`:
    - Giảm bước sóng plasma `time += 0.022` xuống `time += 0.006` để nền trôi êm ả như lụa.

- [x] **Phase 2: Xây Dựng UI Khay Sticker & Hiệu Ứng Nổi (Floating Sticker HUD)**
  - Thêm nút mở khay Sticker `btn-sticker-toggle` (`🎭 STICKERS`) tại thanh công cụ.
  - Thêm modal/popover `#sticker-drawer` chứa lưới các sticker Flaticon-style dạng SVG vector sắc nét.
  - Thêm container bong bóng sticker `#sticker-reaction-{slot}` phía trên mỗi avatar người chơi.
  - Thêm animation CSS `@keyframes sticker-pop-float`: Sticker phóng to từ scale 0 lên 1.18 rồi trôi nhẹ lên trên và mờ dần trong 2.5s.

- [x] **Phase 3: Tích Hợp WebSocket & Bot Reaction**
  - Client gửi `SEND_STICKER` khi người chơi chọn biểu cảm.
  - Server [`src/index.ts`](file:///e:/GAMES/TLMNActivity/src/index.ts) nhận `SEND_STICKER` và broadcast `STICKER_REACTION` đến các socket trong cùng phòng.
  - Tích hợp Bot AI trong [`src/index.ts`](file:///e:/GAMES/TLMNActivity/src/index.ts):
    - Khi Bot chặt heo đối thủ $\rightarrow$ Tự động phát sticker `pig_chop` cho bot.
    - Khi Bot về nhất ván bài $\rightarrow$ Tự động phát sticker `money_rich`.

- [x] **Phase 4: Kiểm Thử & Tối Ưu Hiệu Năng**
  - Chạy `npm test` (48/48 pass) và `npm run build` (0 lỗi).
  - Kiểm tra trải nghiệm thực tế: bài ổn định, không rung lắc, sticker hiển thị đẹp mắt, âm thanh pop vui nhộn.

