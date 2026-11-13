---
name: spec
description: >-
  Create, update, or review specifications and implementation plans following Spec-Driven Development (SDD).
  Use whenever the user invokes /spec or asks to design a new feature spec.
---

# Feature Specification & Plan Generator (/spec)

Skill này hướng dẫn Agent tạo tài liệu đặc tả (**Specification**) và kế hoạch kỹ thuật (**Implementation Plan**) chuẩn theo mô hình Spec-Driven Development (SDD).

## 1. Cấu trúc thư mục mục tiêu

Mọi tài liệu spec sẽ được tổ chức tại thư mục `specs/`:

```text
specs/
├── system-overview.md                  # Tổng quan kiến trúc hệ thống
└── features/
    └── <feature-name>/
        ├── spec.md                     # Đặc tả nghiệp vụ (What & Why)
        └── plan.md                     # Kế hoạch kỹ thuật & Task breakdown (How)
```

---

## 2. Quy trình thực thi khi nhận lệnh `/spec`

Khi người dùng gõ `/spec <tên tính năng hoặc mô tả yêu cầu>`:

### Bước 1: Kiểm tra `specs/system-overview.md`
- Nếu file này chưa tồn tại hoặc trống, tạo mới tài liệu tổng quan hệ thống (Tech Stack, Kiến trúc chung, Quy ước dữ liệu).

### Bước 2: Tạo `specs/features/<feature-name>/spec.md`
Nội dung phải bao gồm đầy đủ các mục:
1. **Context & Objectives**: Bối cảnh, mục tiêu và giá trị của tính năng.
2. **User Stories & Flow**: Luồng trải nghiệm của người dùng (có Mermaid Sequence Diagram hoặc Flowchart).
3. **Core Mechanics / Rules**: Chi tiết các quy tắc nghiệp vụ, luật xử lý dữ liệu.
4. **UI/UX Requirements**: Giao diện, vị trí hiển thị, trạng thái tương tác và hiệu ứng.
5. **Edge Cases & Error Handling**: Các trường hợp ngoại lệ, mất kết nối, lỗi timeout, xung đột logic.
6. **Acceptance Criteria**: Danh sách tiêu chí nghiệm thu dạng checklist `[ ]`.

### Bước 3: Tạo `specs/features/<feature-name>/plan.md`
Nội dung tập trung vào khía cạnh kỹ thuật:
1. **Architecture & Data Models**: Interface / Schema / Type definitions (TypeScript, JSON, SQL,...).
2. **API & Event Contracts**: Danh sách REST API, GraphQL hoặc Socket Events (Request/Response payload).
3. **Phased Implementation Roadmap**: Chia nhỏ công việc theo từng giai đoạn (Phase 1, 2, 3...) có checkbox.
4. **Testing & Validation Strategy**: Kế hoạch viết Unit Test, Integration Test.
5. **Risk Analysis**: Rủi ro kỹ thuật và phương án dự phòng.

### Bước 4: Trình bày và xin ý kiến phản hồi
- Tóm tắt ngắn gọn các file vừa tạo và đính kèm đường link file (`file:///...`).
- Hỏi người dùng xem có cần điều chỉnh logic nghiệp vụ nào trước khi bắt tay vào viết code hay không.

