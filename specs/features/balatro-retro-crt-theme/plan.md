# Technical Implementation Plan: Balatro Psychedelic Retro CRT Punk Aesthetic

## 1. Architecture & Component Mapping

### 1.1 Thư mục và File can thiệp
```text
client/
├── index.html           # Thêm canvas #bg-canvas, lớp phủ .crt-screen-overlay, nhúng font Press Start 2P
├── style.css            # Thư viện màu Balatro Neon, hiệu ứng scanlines, 3D tilt, pixel borders, jiggle keyframes
├── app.js               # Khởi tạo Plasma Shader Canvas, card 3D tilt listener, score spring pop trigger
└── audio.js             # Bổ sung âm thanh cơ học snappy tick khi hover chuột qua bài
```

### 1.2 Thiết kế Canvas Plasma Shader Algorithm
Sử dụng một canvas có kích thước co giãn (downsampled buffer $\approx 240 \times 160$ phóng to bằng CSS `image-rendering: pixelated` hoặc render trực tiếp) để tối ưu $100\%$ CPU, tạo hiệu ứng điểm ảnh retro độc đáo giống hệt Balatro.

---

## 2. Phased Implementation Roadmap

- [x] **Phase 1: HTML Setup & Canvas Plasma Background (`client/index.html`, `client/app.js`)**
  - [x] Nhúng font Google Fonts `'Press Start 2P'` vào `client/index.html`.
  - [x] Thêm `<canvas id="bg-canvas">` ở lớp nền và `<div class="crt-screen-overlay">` ở lớp trên cùng.
  - [x] Viết vòng lặp Animation Plasma Wave trong `client/app.js` với dải màu Neon Purple / Deep Magenta / Midnight Blue.

- [x] **Phase 2: CRT Monitor Post-Processing & Scanlines (`client/style.css`)**
  - [x] Tạo CSS Scanlines vi tế bằng repeating linear gradient.
  - [x] Thiết lập Vignette bo cong viền và hiệu ứng Chromatic Aberration (RGB Split) cho text.
  - [x] Tạo hiệu ứng CRT flicker nhẹ nhàng.

- [x] **Phase 3: Balatro Juicy Card Animations & 3D Tilt (`client/style.css`, `client/app.js`)**
  - [x] Bổ sung animation `@keyframes balatro-card-bob` đung đưa bồng bềnh hình sin cho các lá bài trên tay.
  - [x] Viết bộ lắng nghe sự kiện `mousemove` và `mouseleave` trên từng thẻ bài để tính toán góc xoay 3D `rotateX` / `rotateY` theo vị trí chuột.
  - [x] Bổ sung âm thanh `soundFx.playCardHover()` phát tiếng lách cách cơ học khi lướt chuột qua bài.

- [x] **Phase 4: Retro Pixel HUD & Score Spring Pop Animation (`client/style.css`, `client/app.js`)**
  - [x] Áp dụng font `'Press Start 2P'` cho điểm số, tên người chơi, số chip, tiêu đề, và nút bấm.
  - [x] Tạo hiệu ứng `@keyframes score-spring-pop` và kích hoạt mỗi khi cập nhật điểm hoặc tiền vàng.
  - [x] Phong cách hóa khay Buff thành dạng thẻ Joker Balatro viền pixel với nhãn Holo Foil.

- [x] **Phase 5: Kiểm thử hoàn chỉnh & Đảm bảo Game Loop nguyên vẹn**
  - [x] Chạy `npm test` và `npm run build` để kiểm tra toàn bộ unit test và build (45/45 pass).
  - [x] Xác nhận toàn bộ tương tác đánh bài, bỏ lượt, bot AI hoạt động chuẩn mực.

---

## 3. Testing & Validation
- Kiểm tra render 60 FPS trên Chrome/Edge.
- Kiểm tra responsiveness trên khung Discord Activity.
- Kiểm tra các nút bấm và lá bài phản hồi chính xác khi click.
