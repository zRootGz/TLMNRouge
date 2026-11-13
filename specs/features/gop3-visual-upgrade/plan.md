# Technical Implementation Plan: Nâng cấp Đồ họa phong cách Governor of Poker 3

## 1. Architecture & CSS Design System

### 1.1 CSS Architecture Breakdown
Thay vì dùng các file hình ảnh bitmap nặng (PNG/JPEG cồng kềnh dễ vỡ nét và tải chậm qua tunnel), toàn bộ đồ họa GOP3 sẽ được tạo dựng bằng **Pure Modern CSS3** (Gradients, Box-shadows đa lớp, 3D Transforms, SVG Filters và CSS Keyframe Animations) kết hợp Web Audio procedural synthesis.

```text
client/
├── index.html           # Cấu trúc HTML bổ sung SVG timer ring và chip badges
├── style.css            # Hệ thống Design Tokens GOP3, gỗ gụ, 3D buttons, bài bóng
├── app.js               # Logic điều khiển vòng đếm ngược radial, card rotation ngẫu nhiên
└── audio.js             # Bổ sung âm thanh tiếng gõ bàn gỗ Saloon, tiếng xào bài và reo chip
```

### 1.2 Design Tokens (`client/style.css`)
```css
:root {
  /* Gỗ gụ và viền nẹp vàng Saloon */
  --wood-primary: linear-gradient(145deg, #441f12 0%, #290f07 50%, #150602 100%);
  --wood-rim-shadow: inset 0 3px 6px rgba(255,255,255,0.25), inset 0 -6px 12px rgba(0,0,0,0.8), 0 15px 40px rgba(0,0,0,0.9);
  --gold-metallic: linear-gradient(135deg, #ffe082 0%, #ffb300 40%, #ff8f00 70%, #fff8e1 100%);
  --gold-border: #d4af37;
  
  /* Mặt nỉ ngọc bích sang trọng */
  --felt-luxury: radial-gradient(ellipse at center, #1b633e 0%, #12442a 60%, #0a2517 100%);
  
  /* Thẻ bài bóng bẩy & đổ bóng thực tế */
  --card-gloss: linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(245,245,245,0.95) 100%);
  --card-shadow: 0 10px 22px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.2);
  --card-lift-shadow: 0 18px 32px rgba(0,0,0,0.6), 0 0 15px rgba(255,215,0,0.6);
  
  /* Nút bấm 3D nổi khối (Tactile) */
  --btn-gold-face: linear-gradient(180deg, #ffeb3b 0%, #ffb300 50%, #f57f17 100%);
  --btn-gold-shadow: 0 6px 0 #b26a00, 0 10px 15px rgba(0,0,0,0.5);
  --btn-red-face: linear-gradient(180deg, #ef5350 0%, #d32f2f 50%, #b71c1c 100%);
  --btn-red-shadow: 0 6px 0 #7f0000, 0 10px 15px rgba(0,0,0,0.5);
}
```

---

## 2. API & Client-side Visual Contracts

### 2.1 Radial Timer SVG Controller (`client/app.js`)
Mỗi Avatar sẽ có một vòng tròn SVG đếm ngược $15$ giây:
```html
<svg class="radial-timer-svg" viewBox="0 0 100 100">
  <circle class="timer-bg" cx="50" cy="50" r="44"></circle>
  <circle class="timer-progress" cx="50" cy="50" r="44" stroke-dasharray="276" stroke-dashoffset="0"></circle>
</svg>
```
Đoạn mã JavaScript sẽ cập nhật `stroke-dashoffset` mượt mà từ $0 \rightarrow 276$ kèm hiệu ứng đổi màu:
* 15s - 8s: Xanh lục `#00e676`
* 7s - 4s: Vàng cam `#ffab00`
* 3s - 0s: Đỏ rực `#ff1744` (nhấp nháy báo động hết giờ)

### 2.2 Card Physics: Random Angle Generator
Khi đánh bài ra giữa bàn (`renderTableCenter`), mỗi lá bài sẽ nhận một thuộc tính CSS inline ngẫu nhiên:
```javascript
const angle = ((index % 3) - 1) * 3 + (Math.random() * 2 - 1); // Góc nghiêng từ -4 đến +4 độ
cardEl.style.transform = `rotate(${angle}deg) translateY(${Math.random() * 4 - 2}px)`;
```

---

## 3. Phased Implementation Roadmap

- [x] **Phase 1: Bàn Đấu Saloon & Gỗ Gụ Sang Trọng (`client/style.css`, `client/index.html`)**
  - [x] Tạo viền bàn gỗ gụ đánh bóng với nẹp vàng đồng và hoa văn góc.
  - [x] Nâng cấp nền nỉ ngọc bích sâu, bổ sung watermark logo dập chìm ở giữa bàn.
  - [x] Tinh chỉnh thanh Header trên cùng thành thanh viền gỗ sẫm màu với các icon chạm khắc vàng.

- [x] **Phase 2: Avatar Người Chơi 3D & Radial Countdown Timer (`client/style.css`, `client/app.js`)**
  - [x] Nâng cấp khung Avatar thành vòng kim loại 3D nổi viền vàng.
  - [x] Tích hợp vòng tròn đếm ngược thời gian SVG (Radial Countdown Sweep) xoay quanh avatar người tới lượt.
  - [x] Bổ sung huy hiệu Chip cược (`🪙 1,000`) và Bong bóng trạng thái ("Đang nghĩ... 🤔", "Bỏ lượt").

- [x] **Phase 3: Bộ Bài Cao Cấp & Hoạt Họa Ném Bài (`client/style.css`, `client/app.js`)**
  - [x] Thiết kế lại mặt bài: Chữ số to rõ, chất Cơ/Rô màu đỏ hồng ngọc (Ruby), Bích/Chuồn màu đen than sâu.
  - [x] Hiệu ứng nhấc bổng khi chọn bài kèm quầng sáng vàng kim (`--card-lift-shadow`).
  - [x] Áp dụng hiệu ứng ném bài tự nhiên vào giữa bàn với góc xoay nhẹ ngẫu nhiên.

- [x] **Phase 4: Bộ Nút 3D Nổi Khối & Khay Buff Huân Chương Viễn Tây**
  - [x] Thay thế các nút phẳng bằng nút bấm 3D nổi khối kiểu GOP3 (Nút Vàng Đánh bài, Nút Đỏ Bỏ lượt, Nút Thép Xếp bài).
  - [x] Thiết kế lại thẻ Buff thành Huân chương Cảnh trưởng / Đồng hồ quả quýt phát sáng theo độ hiếm.
  - [x] Hiệu ứng nảy nút (Push-down 3D click effect) khi người chơi bấm nút.

- [x] **Phase 5: Bảng Tổng Kết Lộng Lẫy, Confetti & Âm Thanh Saloon**
  - [x] Nâng cấp Modal Tổng kết Ván bài thành Bảng Vinh Danh Saloon viễn tây mạ vàng.
  - [x] Tích hợp hiệu ứng pháo hoa giấy vàng (CSS Confetti particles) khi có người chơi chiến thắng.
  - [x] Bổ sung hiệu ứng âm thanh tiếng lách cách của phỉnh poker (chips clink) và tiếng gõ gỗ saloon trong `client/audio.js`.
  - [x] Kiểm tra responsive trên các kích thước màn hình Discord.

---

## 4. Testing & Validation Strategy
1. **Kiểm tra trực quan (Visual Inspection):** Mở giao diện trên trình duyệt Chrome/Edge ở các kích thước màn hình: Full HD ($1920 \times 1080$), Laptop ($1366 \times 768$) và Discord Activity Frame ($1000 \times 600$).
2. **Kiểm tra tương tác:** Click chọn bài, bấm các nút 3D, kích hoạt Buff, xem vòng đếm ngược Radial Timer hoạt động có trơn tru không.
3. **Hiệu năng:** Đảm bảo tải trang nhanh tức thì (dưới 100ms) vì không tải ảnh nặng từ bên ngoài, đạt 60 FPS khi render animation.

---

## 5. Risk Analysis
- **Rủi ro 1: Tràn khung trên màn hình nhỏ:** Nếu các nút bấm và khay buff quá lớn sẽ đè lên bài trên tay khi cửa sổ nhỏ.
  - *Giải pháp:* Sử dụng `clamp()`, `vh/vw` linh hoạt và media queries `@media (max-height: 700px)` để tự động co tỷ lệ.
- **Rủi ro 2: Radial Timer SVG không đồng bộ với thời gian thực:**
  - *Giải pháp:* Tính toán `stroke-dashoffset` dựa trên `turnDeadlineTimestamp - Date.now()` từ Server để luôn chính xác tuyệt đối dù mạng có trễ.

