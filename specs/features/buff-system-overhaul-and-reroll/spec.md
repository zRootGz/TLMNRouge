# Feature Specification: Nâng Cấp Hệ Thống Thẻ Bài Buff & Cơ Chế Reroll (Buff System Overhaul & Reroll)

## 1. Context & Objectives

### 1.1 Bối Cảnh
Người chơi phản hồi các vấn đề quan trọng về tính năng Buff:
1. **Lỗi Modal Chọn Buff Không Đóng (Buff Draft Modal Bug):**
   - Khi người chơi nhấp chọn 1 thẻ Buff trong cửa sổ Booster Pack, modal bị ẩn đi rồi lập tức hiện lại ngay do server gửi lại `ROOM_STATE_UPDATE` trong khi vẫn còn ở phase `BUFF_DRAFT`. Server chưa xóa danh sách lựa chọn của người đã chọn, khiến client liên tục mở lại modal.
2. **Một số lá Buff gây hiểu lầm là không dùng được:**
   - Các lá Buff Bị Động / Phản Đòn (như Giáp Heo, Tiên Thủ, Gương Phản Xạ, Tái Sinh Lượt) tự động kích hoạt khi có tình huống, nhưng người chơi bấm vào khay buff lại tưởng là nút bấm bị liệt.
   - Thẻ Hoán Bài cần chọn 1 lá bài rác trước khi bấm dùng nhưng thiếu chỉ dẫn trực quan.
3. **Nhu cầu thêm cơ chế Roll lại (Reroll 3 lần) và làm mới Buff mỗi ván:**
   - Mỗi người chơi muốn được quyền Roll lại các lá Buff 3 lần nếu 3 lá đầu tiên không ưng ý, và lượt Roll sẽ được làm mới (reset) sau mỗi ván bài mới.
4. **Mở rộng kho thẻ bài chức năng mới (New Joker / Buff Cards):**
   - Bổ sung thêm nhiều lá bài buff biến hóa, thú vị và đậm chất chiến thuật.

### 1.2 Mục Tiêu
- **Sửa triệt để lỗi chọn Buff:** Ngay khi người chơi chọn xong 1 thẻ Buff, server xóa `draftOptions` của người chơi đó và client ẩn ngay modal, chuyển sang trạng thái chờ ván bài bắt đầu.
- **Thêm tính năng Roll lại Buff (3 lượt / ván):** Bổ sung nút `🎲 ĐỔI LẠI (Còn X/3)` trong modal chọn buff. Mỗi ván mới sẽ reset lại đủ 3 lượt.
- **Mở rộng kho Buff phong phú (Tổng cộng 12 thẻ Buff):**
  - Thêm `BUFF_DOUBLE_CHIPS` (Joker Nhân Đôi Tiền Thưởng - Bị Động).
  - Thêm `BUFF_BOMB_TRAP` (Mìn Cảm Tử - Bị Động phản đòn cùng chết).
  - Thêm `BUFF_SHUFFLE_HAND` (Cuồng Phong Hoán Đổi - Chủ Động đổi 2 lá rác).
  - Thêm `BUFF_TIME_WARP` (Ngưng Đọng Thời Gian - Chủ Động hồi 15s cho mình và trừ giờ đối thủ).
  - Thêm `BUFF_HEIST` (Đạo Tặc - Chủ Động rút trộm 1 lá của đối thủ).
- **Làm mới Buff trước mỗi ván:** Khi bắt đầu ván mới (Next Round), xóa buff cũ, chia bài mới và kích hoạt màn Draft Buff mới kèm 3 lượt Roll đầy đủ.
- **Tối ưu hóa UI/UX khay Buff:** Thẻ chủ động có viền nhấp nháy khi đến lượt, thẻ tự động có nhãn "TỰ ĐỘNG KÍCH HOẠT" rõ ràng.

---

## 2. User Stories & Acceptance Criteria

### 2.1 User Stories
- **Là người chơi khi bắt đầu ván bài**, tôi muốn nhìn thấy 3 lá bài Buff ngẫu nhiên, nếu không ưng ý tôi có thể bấm `🎲 ĐỔI LẠI (Còn X/3)` tối đa 3 lần để tìm buff mình thích.
- **Là người chơi khi đã chọn Buff**, tôi muốn cửa sổ chọn Buff đóng lại ngay lập tức và tôi nhìn thấy bàn chơi để sẵn sàng thi đấu.
- **Là người chơi trong ván bài**, tôi muốn sử dụng dễ dàng các lá bài chủ động (như Hoán bài, Đạo tặc, Ngưng đọng thời gian) và nhận được hướng dẫn cụ thể nếu thao tác thiếu.
- **Là người chơi khi sang ván mới**, tôi muốn được chọn lại các lá buff mới toanh và hồi lại 3 lượt roll.

### 2.2 Acceptance Criteria
- [x] Khi người chơi nhấp chọn 1 thẻ Buff, modal `#buff-draft-modal` lập tức đóng lại và không bị nhảy mở lại.
- [x] Thêm nút `🎲 ĐỔI LẠI (Còn X/3)` trong modal chọn Buff. Người chơi bấm đổi sẽ nhận 3 lá buff ngẫu nhiên mới, số lượt giảm từ 3 về 0. Khi hết 0 lượt, nút bị vô hiệu hóa.
- [x] Bổ sung thành công 5 thẻ Buff mới: `BUFF_DOUBLE_CHIPS`, `BUFF_BOMB_TRAP`, `BUFF_SHUFFLE_HAND`, `BUFF_TIME_WARP`, `BUFF_HEIST` với logic xử lý hoàn chỉnh trên Server và Client.
- [x] Mỗi ván bài mới (Next Round), tất cả người chơi đều được cấp 3 lượt roll mới và trải qua màn chọn Buff trước khi đánh bài.
- [x] Các lá bài chủ động (Active) có chỉ dẫn rõ ràng; các lá bài bị động (Passive) hiển thị nhãn rõ ràng để người chơi không bị nhầm lẫn.
- [x] Toàn bộ 53 unit tests cho Buff & Reroll đều đạt 100% pass.

---

## 3. Workflow Diagrams

```mermaid
sequenceDiagram
    actor Player as Người Chơi
    participant Client as Frontend UI
    participant Server as Game Server (Room)

    Note over Player,Server: Bắt đầu ván bài (DEALING -> BUFF_DRAFT)
    Server->>Client: Gửi myDraftOptions (3 lá) & rerollRemaining: 3
    Client->>Player: Hiển thị Modal Booster Pack + Nút "🎲 ĐỔI LẠI (Còn 3/3)"

    alt Người chơi muốn đổi lá bài
        Player->>Client: Bấm "🎲 ĐỔI LẠI"
        Client->>Server: Gửi { type: "REROLL_BUFFS" }
        Server->>Server: rerollRemaining -= 1; Tạo 3 options mới
        Server->>Client: Cập nhật 3 lá mới & rerollRemaining
        Client->>Player: Hiển thị 3 lá mới với hiệu ứng lật thẻ
    end

    Player->>Client: Bấm chọn 1 lá Buff
    Client->>Client: Đóng Modal ngay lập tức (add hidden)
    Client->>Server: Gửi { type: "SELECT_BUFF", buffId }
    Server->>Server: Gán buff cho người chơi & XÓA draftOptions của người đó
    Server->>Client: Broadcast ROOM_STATE_UPDATE (myDraftOptions: undefined)
    Client->>Player: Bàn chơi sẵn sàng, hiển thị Buff trên khay bottom
```

