# 🎴 TLMN Activity - Tiến Lên Miền Nam Buff Edition (Discord Activity)

Game bài dân gian **Tiến Lên Miền Nam** kết hợp cơ chế **Thẻ Kỹ Năng / Buff Roguelike**, được xây dựng tối ưu hóa cho nền tảng **Discord Activities** (Embedded App SDK) và Web Mobile.

---

## 🌟 Tính năng nổi bật

1. **Luật Tiến Lên Miền Nam chuẩn xác 100%**:
   - Thẩm định mọi kết hợp: Rác, Đôi, Sám, Sảnh (3 - 12 lá), 3 đôi thông, Tứ quý, 4 đôi thông.
   - Ma trận chặt hàng: Chặt Heo đơn, đôi Heo, 3 đôi thông, Tứ quý, 4 đôi thông tự do.
   - Xử lý **Tới Trắng** (Sảnh rồng 3-A, Tứ quý heo, 6 đôi, 5 đôi thông, Đồng chất).
   - Xử lý **Phạt Cóng** (cháy bài) và **Thối Heo/Hàng**.

2. **Hệ thống Buff Kỹ Năng (7 thẻ bài độc đáo)**:
   - 🛡️ **Giáp Heo**: Miễn 1 lần bị 3 đôi thông chặt hoặc giảm 50% tiền phạt.
   - ⚔️ **Tiên Thủ**: Giành quyền đi đầu ván bài không phụ thuộc vào 3 Bích.
   - 🪶 **Tái Sinh Lượt**: Bỏ lượt 1 lần nhưng không mất quyền tham gia các vòng sau.
   - 🔄 **Hoán Bài**: Bỏ 1 lá bài rác, rút ngẫu nhiên lá mới từ cọc nọc dự phòng.
   - 👁️ **Mắt Thần**: Nhìn trộm 2 lá bài ngẫu nhiên của đối thủ kế tiếp.
   - ❄️ **Băng Phong**: Đóng băng lượt của người kế tiếp.
   - 🪞 **Gương Phản Xạ**: Phản 50% tiền phạt chặt về lại kẻ tấn công.

3. **Smart Auto-Suggest (Tự động nhận diện bài)**:
   - Khi người đi trước đánh Đôi, Sám, Sảnh $K$ lá, 3 đôi thông... người chơi chỉ cần nhấp 1 lá bất kỳ, game sẽ tự động quét và chọn đủ các lá bài còn lại trong bộ!

4. **Âm thanh & Hiệu ứng sống động (Web Audio API)**:
   - Âm thanh procedural không cần tải file mp3: tiếng chia bài, quăng bài, nổ chặt đè, kích hoạt buff, bỏ lượt, thắng cuộc.
   - Hiệu ứng rung lắc bàn chơi (Screen Shake) và banner pop-up khi chặt heo/hàng.

5. **Bảo mật & Hiệu năng cao (Zero-Trust Server Authoritative)**:
   - 100% logic xác thực bài và buff chạy trên Server chống gian lận.
   - Toàn bộ bài của đối thủ được ẩn (mask) ở Server, Client chỉ nhận số lượng lá bài đối thủ đang cầm.

---

## 🚀 Hướng dẫn cài đặt & Chạy Local

### Yêu cầu:
- Node.js $\ge 20$ (khuyến nghị Node v22 hoặc v24).

### Các bước khởi chạy:
```powershell
# 1. Cài đặt dependencies
npm install

# 2. Chạy toàn bộ 33 Unit Tests
npm test

# 3. Khởi động Game Server & Web Client
npm start
```

Sau khi chạy lệnh `npm start`, mở trình duyệt:
- **Người chơi 1**: Truy cập `http://localhost:8080`
- **Người chơi 2**: Mở tab ẩn danh truy cập `http://localhost:8080`
- Bấm **"Sẵn sàng"** ở cả 2 tab để bắt đầu ván bài!

---

## 🎮 Tích hợp Discord Activity (Voice Channel)

1. Truy cập [Discord Developer Portal](https://discord.com/developers/applications) và tạo một **New Application**.
2. Tại mục **OAuth2 / General**:
   - Lấy `Client ID` và `Client Secret`.
3. Tại mục **Activities**:
   - Bật tính năng **Activities Enabled**.
   - Thiết lập **URL Mapping** trỏ tới domain public của Game Server (sử dụng Cloudflare Tunnel hoặc ngrok):
     ```text
     https://your-tunnel-domain.trycloudflare.com
     ```
4. Khi user khởi chạy Activity trong Voice Channel Discord, client sẽ tự động nhận diện Discord Context (Avatar, Nickname, User ID).

---

## 📁 Cấu trúc thư mục

```text
TLMNActivity/
├── specs/                                # Tài liệu Spec-Driven Development
│   ├── system-overview.md                # Kiến trúc hệ thống toàn cục
│   └── features/tien-len-buff/
│       ├── spec.md                       # Đặc tả nghiệp vụ & Luật chơi
│       └── plan.md                       # Kế hoạch kỹ thuật & Checklist các Phase
├── client/                               # Giao diện Web / Discord Activity Canvas
│   ├── index.html                        # Bàn chơi casino 4 người
│   ├── style.css                         # Hiệu ứng bài, buff và hoạt họa
│   ├── audio.js                          # Bộ tổng hợp âm thanh Web Audio API
│   ├── suggester.js                      # Tự động gợi ý chọn bài
│   └── app.js                            # WebSocket Client & State renderer
├── src/                                  # Backend Server
│   ├── core/                             # Engine Tiến Lên Miền Nam
│   │   ├── types.ts                      # Kiểu dữ liệu Card, HandCombo, ComboType
│   │   ├── deck.ts                       # Bộ bài 52 lá, xáo bài Fisher-Yates
│   │   ├── evaluator.ts                  # Thẩm định đè bài, chặt hàng, tới trắng, cóng
│   │   └── suggester.ts                  # Thuật toán gợi ý chọn combo
│   ├── buffs/                            # Hệ thống Buff Kỹ Năng
│   │   ├── types.ts                      # Định nghĩa Buff & Hook Contexts
│   │   ├── buff-registry.ts              # Danh mục 7 loại Buff & Random Draft
│   │   └── buff-manager.ts               # Hook Interceptor Pipeline
│   ├── server/                           # Quản lý Phòng chơi & Gateway
│   │   ├── room.ts                       # State Machine bàn chơi (Lobby -> Draft -> Play)
│   │   └── gateway.ts                    # WebSocket Server Gateway
│   └── index.ts                          # HTTP + WebSocket Entry Point
└── package.json
```

