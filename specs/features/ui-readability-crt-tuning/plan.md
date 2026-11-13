# Technical Implementation Plan: Tinh Chỉnh Độ Sắc Nét & Khắc Phục Lỗi Mờ Kẻ Sọc CRT

## 1. Technical Adjustments

### 1.1 Khắc phục `.crt-screen-overlay` trong `client/style.css`
- **Hiện tại:**
  ```css
  background: 
    linear-gradient(rgba(18, 16, 26, 0) 50%, rgba(0, 0, 0, 0.38) 50%),
    radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(0,0,0,0.85) 100%);
  background-size: 100% 4px, 100% 100%;
  ```
- **Điều chỉnh:**
  Loại bỏ các đường kẻ đen dày 2px. Thay thế bằng hiệu ứng Vignette bóng viền màn hình bo cong nhẹ nhàng, và nếu có scanline thì chỉ dùng mức siêu mỏng `0.04` không đè lên text, hoặc loại bỏ hẳn lớp kẻ ngang để giữ toàn bộ màn hình nét căng.

### 1.2 Tối ưu hóa Text Rendering & Typography
- Font chữ tiếng Việt: Font `'Press Start 2P'` hiển thị số, chip, nút bấm và danh hiệu cực đẹp, nhưng đối với các đoạn text dài tiếng Việt (như mô tả Buff, thông báo luật), kết hợp font `'Montserrat'` hoặc font pixel hỗ trợ tiếng Việt đầy đủ để không bị lỗi dấu thanh và dễ đọc.
- Bỏ bóng nhòe `text-shadow: -1.5px 0 ...` ở các đoạn chữ nhỏ.
- Thêm thuộc tính `-webkit-font-smoothing: antialiased;` hoặc `image-rendering: pixelated;` đúng vị trí.

---

## 2. Implementation Steps
- [x] **Step 1:** Điều chỉnh lại `.crt-screen-overlay` trong `client/style.css`: gỡ bỏ dải kẻ sọc 38% thô ráp, giữ lại viền Vignette bo cong viền CRT sang trọng.
- [x] **Step 2:** Tăng kích thước font chữ và độ tương phản của nút bấm, chỉ số bài, và chip cược.
- [x] **Step 3:** Kiểm tra hiển thị thực tế trên trình duyệt và chạy `npm test` để xác thực.
