# Implementation Plan: Việt Hóa Giao Diện, Tối Ưu Font Tiếng Việt & Tự Động Chớp Sáng Gợi Ý Bài

## 1. Architecture & Technical Design

### 1.1. Font Stack Architecture
Cập nhật Google Fonts trong `client/index.html` và biến CSS trong `client/style.css`:
- Import Google Fonts:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:ital,wght@0,600;0,700;1,700&family=VT323&family=Montserrat:wght@700;800;900&display=swap" rel="stylesheet">
  ```
- Định nghĩa Font Variables trong `:root`:
  ```css
  --font-arcade: 'Chakra Petch', 'Montserrat', sans-serif;
  --font-pixel-num: 'VT323', monospace;
  --font-body: 'Montserrat', sans-serif;
  ```
- Thay thế toàn bộ `font-family: 'Press Start 2P', monospace` bằng `var(--font-arcade)` và tăng nhẹ `font-size` thêm `2px - 3px` để chữ tiếng Việt hiển thị rõ nét, cân đối.

### 1.2. Passive Smart Hint Pipeline (`client/app.js`)
```text
[ROOM_STATE_UPDATE / Render Hand]
        │
        ├── Kiểm tra: status === 'PLAYING' && isMyTurn === true?
        │     ├── ĐÚNG:
        │     │     └── Gọi findAutoBeatCombo(myHandCards, lastComboOnTable)
        │     │           ├── Có bộ bài gợi ý -> Lưu vào suggestedHintCardIds (Set)
        │     │           │     ├── Nếu selectedCardIds.size === 0:
        │     │           │     │     ├── Gắn class .suggested-hint lên các lá bài đó
        │     │           │     │     └── Hiển thị #combo-preview-badge: "💡 GỢI Ý ĐÁNH: [Tên Bộ]"
        │     │           │     └── Khi click vào lá bài trong suggestedHintCardIds:
        │     │           │           └── Nhấc trọn bộ suggestedHintCardIds vào selectedCardIds!
        │     │           └── Không có bài đè được (null) & có bài trên bàn:
        │     │                 ├── Hiển thị #combo-preview-badge: "⚠️ KHÔNG CÓ BÀI ĐÈ - HÃY BỎ LƯỢT"
        │     │                 └── Gắn class .pass-highlight lên nút BỎ LƯỢT
        │     └── SAI (Chưa đến lượt):
        │           └── Xóa suggestedHintCardIds
```

---

## 2. CSS Animation Design (`.card.suggested-hint`)

```css
/* Hiệu ứng tự động sáng & chớp nhẹ cho các lá bài gợi ý khi đến lượt */
.card.suggested-hint:not(.selected) {
  transform: translateY(-8px);
  border-color: #ffd166 !important;
  animation: card-hint-pulse 1.1s ease-in-out infinite alternate;
  z-index: 35;
}

@keyframes card-hint-pulse {
  0% {
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.6), 0 0 8px rgba(255, 209, 102, 0.5);
    border-color: #ffd166;
  }
  100% {
    box-shadow: 0 10px 22px rgba(0, 0, 0, 0.7), 0 0 22px #06d6a0, 0 0 10px #ffd166 inset;
    border-color: #06d6a0;
  }
}

.card.suggested-hint:not(.selected)::after {
  content: '💡';
  position: absolute;
  top: -12px;
  right: -6px;
  font-size: 13px;
  filter: drop-shadow(0 2px 3px rgba(0,0,0,0.8));
  animation: hint-badge-bounce 0.8s ease-in-out infinite alternate;
}
```

---

## 3. Phased Implementation Roadmap

### Phase 1: Việt Hóa Toàn Diện & Thay Đổi Font Chữ (`client/index.html`, `client/style.css`)
- [x] Cập nhật link Google Fonts trong [client/index.html](file:///e:/GAMES/TLMNActivity/client/index.html) thêm `Chakra Petch` (600, 700).
- [x] Việt hóa toàn bộ các nút bấm và tiêu đề tĩnh trong [client/index.html](file:///e:/GAMES/TLMNActivity/client/index.html):
  - Xóa nút `#btn-suggest` (`⚡ GỢI Ý`).
  - Đổi tên nút: `SẴN SÀNG`, `🤖 THÊM BOT`, `ĐÁNH BÀI`, `🧹 BỎ CHỌN`, `BỎ LƯỢT`, `XẾP BÀI`, `🎭 BIỂU CẢM`, `VÁN TIẾP THEO ▶`.
  - Đổi tiêu đề: `PHÒNG:`, `BÀI TRÊN BÀN`, `BÀN TRỐNG - TỰ DO ĐÁNH BÀI`, `THẺ BÀI KỸ NĂNG`, `KẾT THÚC VÁN ĐẤU`.
- [x] Cập nhật [client/style.css](file:///e:/GAMES/TLMNActivity/client/style.css):
  - Thay thế toàn bộ `'Press Start 2P'` sang `'Chakra Petch', 'Montserrat', sans-serif`.
  - Cân chỉnh lại `font-size`, `line-height` và `letter-spacing` của các nút bấm, huy hiệu, tiêu đề cho đẹp mắt với tiếng Việt có dấu.
  - Thêm CSS animation cho `.card.suggested-hint` và `.btn-pass-highlight`.

### Phase 2: Cài Đặt Cơ Chế Tự Động Chớp Sáng Gợi Ý Bài (`client/app.js`)
- [x] Việt hóa toàn bộ chuỗi văn bản động trong [client/app.js](file:///e:/GAMES/TLMNActivity/client/app.js) (`[X LÁ]`, `[SẴN SÀNG ✅]`, `[ĐANG CHỜ ⏳]`, `BỎ LƯỢT`, `ĐANG NGHĨ...`, `BÀN TRỐNG - TỰ DO ĐÁNH BÀI`).
- [x] Cập nhật `renderHandCards()` và `renderRoomState()`:
  - Khi `isMyTurn === true`, tự động gọi `findAutoBeatCombo(myHandCards, currentRoomState.lastComboOnTable)` để lấy danh sách lá bài gợi ý (`suggestedHintCardIds`).
  - Khi người chơi chưa chọn bài (`selectedCardIds.size === 0`), gắn class `.suggested-hint` cho các lá bài thuộc `suggestedHintCardIds` để chúng tự động phát sáng và chớp nháy.
  - Đồng thời hiển thị trên `#combo-preview-badge` dòng gợi ý: `💡 GỢI Ý: [Tên Bộ Bài] (Chạm bài đang sáng để chọn)`.
  - Nếu người chơi click vào 1 lá bài đang có `.suggested-hint`, tự động nhấc toàn bộ các lá trong `suggestedHintCardIds` lên!
  - Nếu đến lượt nhưng không có bất kỳ tổ hợp nào đè được bài bàn, hiển thị `⚠️ KHÔNG CÓ BÀI ĐÈ ĐƯỢC • HÃY BẤM BỎ LƯỢT` và làm sáng nút `BỎ LƯỢT`.

### Phase 3: Kiểm Thử & Đồng Bộ Server
- [x] Chạy `npm test` và `npm run build` để đảm bảo không phát sinh lỗi (54/54 tests passed).
- [x] Đồng bộ trực tiếp với Game Server và Cloudflare Tunnel đang hoạt động.

---

## 4. Testing & Validation Strategy
1. **Kiểm tra hiển thị Tiếng Việt:** Đảm bảo các từ có dấu phức tạp như `SẴN SÀNG`, `ĐÁNH BÀI`, `BỎ LƯỢT`, `XẾP BÀI`, `ĐÈ ĐƯỢC`, `BÀI TRÊN BÀN` hiển thị đồng bộ 100% cùng một phông chữ, không có ký tự nào bị lệch kiểu dáng.
2. **Kiểm tra Tự động Gợi ý (Passive Hint):**
   - Đến lượt người chơi khi bàn trống $\rightarrow$ Tự động sáng bộ bài mở màn gợi ý.
   - Đối thủ đánh Đôi / Sảnh / Lá lẻ $\rightarrow$ Đến lượt người chơi, các lá bài đè được tự động sáng viền và chớp nháy.
   - Nhấp vào lá bài đang chớp $\rightarrow$ Nhấc nguyên bộ lên sẵn sàng đánh.

---

## 5. Risk Analysis
| Rủi ro | Mức độ | Giải pháp xử lý |
|---|---|---|
| Hiệu ứng chớp của bài gợi ý bị nhầm với bài đã chọn (`.selected`) | Trung bình | Bài gợi ý (`.suggested-hint`) chỉ nhô nhẹ `8px` và chớp viền vàng-xanh kèm icon `💡`, và chỉ hiện khi người chơi chưa chọn lá nào (`selectedCardIds.size === 0`). Khi đã chọn (`.selected`), lá bài nhấc cao `22px` với viền hồng cố định |
| Font mới làm thay đổi kích thước nút bấm | Thấp | Tinh chỉnh `padding` và `font-size: 13px` cho `.btn-pixel` để vừa vặn trên cả màn hình PC và khung Discord Activity |

