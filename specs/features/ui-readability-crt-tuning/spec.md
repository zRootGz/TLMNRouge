# Feature Specification: Tinh Chỉnh Độ Sắc Nét & Khắc Phục Lỗi Mờ Kẻ Sọc CRT (UI Readability & Scanline Tuning)

## 1. Context & Objectives
- **Bối cảnh:** Sau khi áp dụng phong cách Balatro CRT Punk, giao diện có nền plasma và phong cách pixel rất độc đáo, nhưng xuất hiện vấn đề trải nghiệm người dùng (UX) nghiêm trọng:
  - Lớp phủ sọc ngang Scanlines quá đậm (`rgba(0,0,0,0.38)` lặp lại mỗi 4px) đè trực tiếp lên toàn bộ giao diện (`z-index: 900`).
  - Do font pixel ('Press Start 2P') có kích thước ký tự nhỏ (8px - 10px), các đường kẻ sọc đen dày 2px đã cắt ngang các nét chữ, làm nhòe mờ và khiến chữ tiếng Việt cũng như các con số hoàn toàn không đọc được.
  - Hiệu ứng Chromatic Aberration (tách kênh RGB) quá mạnh trên chữ nhỏ làm tăng độ nhòe viền.
- **Mục tiêu:**
  - Khắc phục triệt để tình trạng mờ chữ, mang lại độ sắc nét cao (Crisp & High-Contrast Typography) như Balatro nguyên bản.
  - Giảm độ đậm của scanlines về mức siêu nhẹ vi tế (subtle 5% opacity hoặc chuyển thành scanlines cục bộ/vignette), không che khuất chữ.
  - Tối ưu kích thước font chữ và độ tương phản của thẻ bài, nút bấm và avatar để người chơi đọc rõ ràng 100% trong nháy mắt.

---

## 2. User Stories & Acceptance Criteria

### 2.1 User Story
- **Là một người chơi**, tôi muốn nhìn rõ tất cả các thông tin: số trên lá bài, tên người chơi, số chip, nội dung thẻ buff và nút bấm một cách sắc nét, rõ ràng, không bị các vệt đen cắt ngang mắt gây nhức mỏi.

### 2.2 Acceptance Criteria
- [x] Gỡ bỏ hoàn toàn các vạch sọc đen che chữ hoặc giảm xuống mức siêu nhẹ vi tế (`opacity <= 0.05`) để chữ sắc nét tuyệt đối.
- [x] Chữ pixel ('Press Start 2P' / 'VT323' / 'Montserrat') hiển thị rõ ràng từng nét (crisp rendering), không bị nhòe bởi chromatic aberration.
- [x] Mặt bài và các chỉ số (Rank, Suit) có độ tương phản cao, nổi bật trên nền plasma.
- [x] Nền plasma chuyển động mượt mà phía sau nhưng không làm chói hay nuốt mất chữ trên bàn chơi.
