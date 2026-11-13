# Feature Specification: Việt Hóa Toàn Diện Giao Diện, Tối Ưu Font Tiếng Việt & Tự Động Chớp Sáng Gợi Ý Bài

## 1. Context & Objectives
- **Bối cảnh:**
  1. **Ngôn ngữ nút bấm & Nhãn giao diện:** Hiện tại giao diện đang pha trộn giữa tiếng Anh và tiếng Việt (`READY`, `PLAY HAND`, `DISCARD / PASS`, `SORT`, `STICKERS`, `PLAYED HAND`, `TABLE EMPTY - FREE TO PLAY`, `[0 CARDS]`, `ROUND OVER`...), gây thiếu đồng nhất cho người chơi Việt Nam.
  2. **Lỗi hiển thị Font tiếng Việt:** Font pixel `'Press Start 2P'` đang dùng cho các nút bấm, tiêu đề và huy hiệu **không hỗ trợ bảng mã tiếng Việt có dấu** (`ă, â, đ, ê, ô, ơ, ư` và các dấu thanh). Khi hiển thị chữ tiếng Việt, trình duyệt tự động hạ cấp (fallback) từng ký tự có dấu sang font hệ thống, tạo ra hiện tượng chữ to chữ nhỏ lệch lạc, rất khó đọc.
  3. **Cơ chế Gợi ý bài:** Việc bắt người chơi phải bấm vào nút `⚡ GỢI Ý` mới biết bài nào đánh được làm phát sinh thêm thao tác thừa. Người chơi mong muốn khi đến lượt mình, những lá bài có khả năng đánh/đè được bài trên bàn sẽ **tự động phát sáng và chớp nháy nhẹ** ngay trên tay để nhận biết tức thì.
- **Mục tiêu:**
  1. **Việt hóa 100% nút bấm và nhãn hiển thị** sang tiếng Việt tự nhiên, ngắn gọn, chuẩn thuật ngữ Tiến Lên Miền Nam.
  2. **Thay thế sang bộ Font Game Retro hỗ trợ 100% tiếng Việt** (`Chakra Petch`, `VT323`, `Montserrat`) giúp chữ hiển thị sắc nét, đồng đều, đậm chất game arcade mà không bị lỗi dấu.
  3. **Loại bỏ nút Gợi ý thủ công, thay bằng Passive Smart Hint (Tự động sáng & chớp lá bài gợi ý):** Khi đến lượt người chơi, hệ thống tự động tính toán bộ bài tối ưu đè được bài trên bàn và kích hoạt hiệu ứng viền sáng chớp nháy (`.suggested-hint`) trực tiếp trên các lá bài đó.

---

## 2. User Stories & Flow

### 2.1. User Stories
1. **Là một người chơi Việt Nam:** Tôi muốn tất cả các nút điều khiển (`SẴN SÀNG`, `ĐÁNH BÀI`, `BỎ LƯỢT`, `XẾP BÀI`, `BỎ CHỌN`, `BIỂU CẢM`) và thông báo trên bàn đều bằng tiếng Việt rõ ràng, phông chữ đồng bộ không bị lỗi dấu.
2. **Là một người chơi đang trong ván đấu:** Ngay khi đến lượt tôi (đặc biệt khi đối thủ vừa đánh bài ra bàn), tôi muốn nhìn xuống bộ bài trên tay là thấy ngay các lá bài có thể chặn được đối thủ tự động sáng viền và nhấp nháy gợi ý mà không cần phải bấm thêm nút Gợi ý nào.

### 2.2. Interaction Flow (Mermaid Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    participant Server as Game Server
    participant Client as TLMN Frontend
    participantSuggester as Smart Hint Engine
    actor Player as Người Chơi

    Server-->>Client: WS: ROOM_STATE_UPDATE (Đến lượt của Player)
    Client->>Client: Kiểm tra isMyTurn === true
    Client->>participantSuggester: findAutoBeatCombo(myHandCards, lastComboOnTable)
    alt Tìm thấy bộ bài hợp lệ đè được bàn
        participantSuggester-->>Client: Danh sách các lá bài gợi ý (hintCardIds)
        Client->>Client: Gắn class .card.suggested-hint cho các lá bài tương ứng
        Client-->>Player: Các lá bài gợi ý tự động phát sáng vàng/xanh & chớp nhẹ trên tay
    else Không có bài nào đè được (khi có bài trên bàn)
        participantSuggester-->>Client: null
        Client-->>Player: Làm nổi bật nút "BỎ LƯỢT" để người chơi dễ bấm
    end

    Player->>Client: Nhấp vào lá bài đang chớp sáng
    Client->>Client: Tự động nhấc trọn bộ combo gợi ý & bật sáng nút "ĐÁNH BÀI"
    Player->>Client: Bấm "ĐÁNH BÀI"
    Client->>Server: WS: PLAY_HAND
```

---

## 3. Core Mechanics & Rules

### 3.1. Bảng Quy Chuẩn Việt Hóa Giao Diện
| Vị trí / Thành phần | Nội dung cũ (Tiếng Anh / Pha trộn) | Nội dung mới (Tiếng Việt chuẩn) |
|---|---|---|
| Header Room Badge | `ROOM: default_room` | `PHÒNG: default_room` |
| Header Status Init | `INIT...` | `Đang kết nối...` |
| Bàn trung tâm (Tiêu đề) | `PLAYED HAND` | `BÀI TRÊN BÀN` |
| Bàn trung tâm (Khi trống) | `TABLE EMPTY - FREE TO PLAY` | `BÀN TRỐNG - TỰ DO ĐÁNH BÀI` |
| Trạng thái đối thủ (Lobby) | `WAITING...`, `[READY ✅]`, `[WAITING ⏳]` | `Đang chờ...`, `[SẴN SÀNG ✅]`, `[CHỜ ⏳]` |
| Số lá bài đối thủ | `[13 CARDS]` | `[13 LÁ]` |
| Bong bóng trạng thái | `PASS`, `THINKING...` | `BỎ LƯỢT`, `ĐANG NGHĨ...` |
| Nút Ready | `READY` | `SẴN SÀNG` / `HỦY SẴN SÀNG` |
| Nút Add Bot | `🤖 + BOT` | `🤖 THÊM BOT` |
| Nút Play Hand | `PLAY HAND` | `ĐÁNH BÀI` |
| Nút Clear Selection | `🧹 BỎ CHỌN` | `🧹 BỎ CHỌN` |
| Nút Pass | `DISCARD / PASS` | `BỎ LƯỢT` |
| Nút Sort | `SORT` | `XẾP BÀI` |
| Nút Stickers | `🎭 STICKERS` | `🎭 BIỂU CẢM` |
| Nút Gợi ý (`#btn-suggest`) | `⚡ GỢI Ý` | *(Xóa nút - Chuyển sang tự động sáng bài)* |
| Sticker Drawer Header | `🎭 FLATICON STICKERS` | `🎭 NHÃN DÁN BIỂU CẢM` |
| Modal Chọn Buff | `🃏 BOOSTER PACK 🃏` / `CHỌN 1 JOKER / BUFF` | `🃏 THẺ BÀI KỸ NĂNG 🃏` / `CHỌN 1 THẺ BUFF` |
| Modal Kết thúc ván | `🏆 ROUND COMPLETED 🏆` / `ROUND OVER` | `🏆 KẾT THÚC VÁN ĐẤU 🏆` / ` TỔNG KẾT VÁN BÀI` |
| Nút Chơi tiếp | `NEXT ROUND ▶` | `VÁN TIẾP THEO ▶` |

### 3.2. Quy Tắc Font Chữ Tiếng Việt (Vietnamese Retro Typography)
- Loại bỏ hoàn toàn `'Press Start 2P'` khỏi toàn bộ CSS vì không có glyph tiếng Việt.
- Sử dụng bộ 3 font Google Fonts hỗ trợ 100% tiếng Việt:
  1. **`'Chakra Petch'` (Weights: 600, 700):** Font chữ vuông góc cạnh phong cách máy thùng Arcade / Cyber-Retro, dùng cho toàn bộ nút bấm (`.btn-pixel`), tiêu đề lớn, huy hiệu combo, banner chặt heo.
  2. **`'VT323'`:** Font pixel cổ điển hỗ trợ tiếng Việt, dùng cho số điểm, mã phòng, thông số phụ.
  3. **`'Montserrat'` (Weights: 700, 800, 900):** Dùng cho chữ trên lá bài, mô tả chi tiết thẻ Buff và bảng xếp hạng.

### 3.3. Quy Tắc Tự Động Sáng & Chớp Lá Bài Gợi Ý (Passive Smart Hint)
1. **Điều kiện kích hoạt:**
   - Trạng thái phòng là `PLAYING` **VÀ** đang đến lượt của người chơi (`isMyTurn === true`).
   - Người chơi **chưa tự chọn** lá bài nào (`selectedCardIds.size === 0`) — để tránh làm rối mắt khi người chơi đang chủ động xếp bài theo ý mình.
2. **Thuật toán xác định bài sáng gợi ý:**
   - Gọi `findAutoBeatCombo(myHandCards, currentRoomState.lastComboOnTable)` để tìm ra bộ bài tối ưu được đề xuất (ví dụ: Đôi 8 để đè Đôi 6 trên bàn, hoặc Sảnh 3-4-5 khi cầm cái đầu vòng).
   - Lưu danh sách ID của các lá bài này vào tập `suggestedHintCardIds`.
3. **Hiệu ứng thị giác trên lá bài (`.card.suggested-hint`):**
   - Viền lá bài chuyển sang màu Vàng Kim / Xanh Ngọc phát sáng (`#ffd166` / `#06d6a0`).
   - Lá bài hơi nhô nhẹ lên `translateY(-6px)` và có hiệu ứng xung nhịp sáng (glow pulse) chu kỳ `1.2s` êm dịu, thu hút ánh nhìn ngay lập tức.
   - Phía trên góc lá bài gợi ý có chấm sáng hoặc biểu tượng tia chớp nhỏ `⚡` tinh tế.
4. **Tương tác khi nhấp vào lá bài đang sáng gợi ý:**
   - Nếu người chơi nhấp vào bất kỳ lá nào nằm trong nhóm đang sáng gợi ý (`suggestedHintCardIds`), hệ thống sẽ tự động nhấc (select) **toàn bộ combo gợi ý đó** lên cùng lúc để người chơi chỉ việc bấm `ĐÁNH BÀI`!

---

## 4. UI/UX Requirements
- **Font chữ nút bấm:** Cỡ chữ từ `13px - 14px` với `'Chakra Petch', sans-serif`, `font-weight: 700`, `letter-spacing: 0.5px`, đảm bảo đọc rõ mọi dấu tiếng Việt (`SẴN SÀNG`, `ĐÁNH BÀI`, `BỎ LƯỢT`, `XẾP BÀI`).
- **Hiệu ứng chớp gợi ý (`.suggested-hint`):** Không làm rung lắc vị trí lá bài gây khó bấm, chỉ chớp hiệu ứng ánh sáng viền (`box-shadow` và `border-color`) kết hợp nâng nhẹ cao độ `6px`.

---

## 5. Edge Cases & Error Handling
1. **Khi người chơi bắt đầu tự chọn bài khác:**
   - Ngay khi `selectedCardIds.size > 0`, hiệu ứng `.suggested-hint` tự động tắt để nhường chỗ cho hiệu ứng `.selected` (nhấc cao 22px, viền hồng) của người chơi. Nếu người chơi bấm `🧹 BỎ CHỌN` về 0 lá, gợi ý sáng trở lại.
2. **Khi không có bài nào trên tay đè được bài trên bàn:**
   - Không có lá bài nào phát sáng gợi ý.
   - Huy hiệu thông báo nhẹ: `💡 Không có bài đè được - Hãy bấm BỎ LƯỢT` và nút `BỎ LƯỢT` phát sáng viền để hướng dẫn người chơi.
3. **Khi hết lượt hoặc chuyển sang lượt người khác:**
   - Xóa toàn bộ hiệu ứng `.suggested-hint` ngay lập tức.

---

## 6. Acceptance Criteria
- [x] Toàn bộ nút bấm và văn bản giao diện hiển thị 100% bằng tiếng Việt chuẩn xác.
- [x] Không còn bất kỳ chỗ nào dùng font `'Press Start 2P'` gây lỗi dấu tiếng Việt; thay bằng `'Chakra Petch'` và `'Montserrat'` hiển thị đẹp, sắc nét.
- [x] Nút `⚡ GỢI Ý` đã được gỡ bỏ khỏi thanh công cụ.
- [x] Khi đến lượt người chơi, các lá bài gợi ý tự động phát sáng và chớp nhẹ trực tiếp trên khay bài.
- [x] Nhấp vào 1 lá trong nhóm gợi ý sẽ tự động chọn cả bộ gợi ý đó.
- [x] Khi không có bài đè được, hiển thị nhắc nhở và làm nổi bật nút `BỎ LƯỢT`.
- [x] Toàn bộ Unit Tests (`npm test` 54/54 passed) và bản build TypeScript (`npm run build`) vượt qua 100%.

