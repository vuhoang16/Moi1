# Product Specification: App Quản Lý Cho Thuê Nhà
## Vietnamese Rental Management Application

**Version:** 1.0.0  
**Date:** 2026-04-16  
**Status:** Draft — Developer Ready  
**Platform:** Mobile (iOS + Android)  
**Language:** Vietnamese throughout UI

---

## Table of Contents

1. [User Personas](#1-user-personas)
2. [User Flows](#2-user-flows)
3. [User Stories & Acceptance Criteria](#3-user-stories--acceptance-criteria)
4. [MoSCoW Prioritization](#4-moscow-prioritization)
5. [MVP Definition](#5-mvp-definition)
6. [Feature Specifications](#6-feature-specifications)
7. [Phased Launch Plan](#7-phased-launch-plan)
8. [Open Questions & Risks](#8-open-questions--risks)

---

## 1. User Personas

### 1.1 Chủ Nhà (Landlord)

#### Persona A — Nguyễn Văn Minh, 48 tuổi, Hà Nội

- **Nghề nghiệp:** Cán bộ nhà nước về hưu sớm, đang tự quản lý 2 dãy trọ (14 phòng)
- **Thu nhập từ cho thuê:** 18–25 triệu/tháng
- **Thiết bị:** Samsung Galaxy A54, dùng Facebook, Zalo, Momo thành thạo
- **Đặc điểm:**
  - Ghi chép thu tiền bằng sổ tay hoặc Excel thủ công
  - Thường xuyên quên nhắc tiền, khó đối soát điện nước cuối tháng
  - Không muốn học app phức tạp; thao tác phải quen tay trong 1–2 lần dùng
  - Sợ mất tiền cọc tranh chấp vì không có hồ sơ rõ ràng
- **Pain Points:**
  - Không có bằng chứng khi tranh chấp tiền cọc hoặc đồ nội thất
  - Mỗi tháng mất 2–3 ngày đi thu tiền trực tiếp
  - Khó biết phòng nào trống để cho thuê mới
  - Hợp đồng viết tay dễ tranh chấp, photocopy mờ

#### Persona B — Trần Thị Lan, 35 tuổi, TP. HCM

- **Nghề nghiệp:** Doanh nhân, sở hữu 1 căn hộ dịch vụ 8 phòng và 1 nhà nguyên căn cho thuê
- **Thu nhập từ cho thuê:** 45–60 triệu/tháng
- **Thiết bị:** iPhone 14, sử dụng thành thạo công nghệ
- **Đặc điểm:**
  - Muốn quản lý từ xa (thường đi công tác)
  - Quan tâm đến báo cáo tài chính, lịch sử giao dịch
  - Sẵn sàng trả phí nếu app thực sự tiết kiệm thời gian
  - Muốn hợp đồng điện tử hợp lệ pháp lý
- **Pain Points:**
  - Phải gọi điện hoặc nhắn Zalo từng người thuê mỗi tháng
  - Sửa chữa không có quy trình — thợ làm xong không biết kết quả
  - Không tổng hợp được dòng tiền năm

---

### 1.2 Người Thuê (Tenant)

#### Persona C — Lê Hoàng Nam, 24 tuổi, TP. HCM

- **Nghề nghiệp:** Nhân viên văn phòng, thu nhập 8–12 triệu/tháng
- **Thuê:** Phòng trọ 3.5 triệu/tháng, quận Bình Thạnh
- **Thiết bị:** Xiaomi Redmi Note 12, dùng Momo thành thạo
- **Đặc điểm:**
  - Trả tiền bằng chuyển khoản, hay quên ngày đóng tiền
  - Ghét việc phải xếp hàng hoặc đến gặp chủ nhà để trả tiền
  - Có yêu cầu sửa chữa thường xuyên, nhưng chủ nhà ít phản hồi
- **Pain Points:**
  - Không biết cách tính điện nước có đúng không
  - Không có bằng chứng đã trả tiền nếu chủ nhà chối
  - Mất thời gian liên lạc khi cần sửa chữa

#### Persona D — Phạm Thị Hương, 30 tuổi, Đà Nẵng

- **Nghề nghiệp:** Giáo viên, thuê căn hộ mini 6 triệu/tháng với chồng
- **Đặc điểm:**
  - Muốn hợp đồng rõ ràng, có chữ ký để bảo vệ quyền lợi
  - Hay có nhu cầu xem lại lịch sử thanh toán
  - Lo lắng về tiền cọc khi trả phòng

---

## 2. User Flows

### 2.1 Flow 1: Onboarding & Đăng Ký

**Happy Path (Chủ nhà):**
1. Mở app → màn hình welcome → chọn "Tôi là chủ nhà"
2. Nhập số điện thoại → nhận OTP → xác minh
3. Điền thông tin: họ tên, CCCD, ảnh đại diện
4. Hoàn tất hồ sơ → vào Dashboard chủ nhà

**Happy Path (Người thuê):**
1. Mở app → chọn "Tôi là người thuê"
2. Nhập số điện thoại → OTP → xác minh
3. Điền thông tin cơ bản
4. Nhập mã phòng do chủ nhà cung cấp HOẶC chờ liên kết từ hợp đồng

**Edge Cases:**
- OTP không nhận được: nút "Gửi lại" sau 60 giây, tối đa 3 lần
- Số điện thoại đã đăng ký: thông báo "Số này đã có tài khoản, đăng nhập?"
- Mã phòng không hợp lệ: hiển thị lỗi rõ ràng, gợi ý liên hệ chủ nhà
- Mất kết nối giữa chừng: lưu tiến độ, tiếp tục khi có mạng

---

### 2.2 Flow 2: Tạo Listing & Phòng (Chủ nhà)

**Happy Path:**
1. Dashboard → nút "+" → "Tạo listing mới"
2. Chọn loại: Nhà nguyên căn / Nhà trọ / Căn hộ dịch vụ / Căn hộ chung cư
3. Nhập: Tên listing, địa chỉ, mô tả tổng quan
4. Lưu listing → vào màn hình quản lý listing
5. Nhấn "Thêm phòng" → nhập:
   - Tên/số phòng
   - Diện tích (m²)
   - Giá thuê (VND/tháng)
   - Giá điện (VND/kWh)
   - Giá nước (VND/m³)
   - Tiền cọc
   - Tiện ích (checkbox): Điều hòa, Máy nước nóng, Tủ lạnh, Máy giặt, Wifi, Bãi xe, Giường, Tủ quần áo
   - Trạng thái: Trống / Đã thuê / Đang sửa chữa
   - Upload ảnh (tối đa 10 ảnh, mỗi ảnh < 10MB)
6. Lưu phòng → xuất hiện trong danh sách phòng của listing

**Edge Cases:**
- Upload ảnh thất bại (mạng yếu): retry tự động 2 lần, thông báo lỗi nếu vẫn thất bại
- Giá thuê = 0: cảnh báo validation
- Diện tích âm hoặc = 0: không cho lưu
- Xóa listing có phòng đang được thuê: cảnh báo, yêu cầu kết thúc hợp đồng trước

---

### 2.3 Flow 3: Ký Hợp Đồng Điện Tử

**Happy Path:**
1. Chủ nhà vào phòng trống → "Tạo hợp đồng"
2. Chọn/tìm kiếm người thuê (theo SĐT hoặc mã người thuê)
3. Điền thông tin hợp đồng:
   - Ngày bắt đầu, ngày kết thúc
   - Giá thuê (tự điền từ phòng, có thể sửa)
   - Tiền cọc
   - Các điều khoản bổ sung (text tự do)
4. Hệ thống tạo PDF preview
5. Chủ nhà ký điện tử (vẽ chữ ký trên màn hình)
6. Gửi thông báo cho người thuê: "Hợp đồng chờ bạn ký"
7. Người thuê mở app → đọc PDF → ký điện tử
8. Hệ thống hợp nhất chữ ký → lưu PDF cuối cùng
9. Cả hai nhận thông báo xác nhận + link tải PDF
10. Trạng thái phòng tự động đổi thành "Đã thuê"
11. Hệ thống tự tạo conversation chat giữa hai bên

**Edge Cases:**
- Người thuê chưa có tài khoản: chủ nhà nhập SĐT, hệ thống gửi SMS mời đăng ký
- Người thuê từ chối ký: hợp đồng ở trạng thái "Chờ xác nhận", chủ nhà nhận thông báo
- Người thuê không ký sau 72 giờ: nhắc tự động, chủ nhà có thể hủy
- Xung đột ngày: không cho tạo 2 hợp đồng cùng phòng cùng thời gian
- PDF render lỗi: retry, fallback template đơn giản

---

### 2.4 Flow 4: Thu Tiền Thuê & Điện Nước

**Happy Path — Tạo Hóa Đơn (Chủ nhà):**
1. Vào phòng đang thuê → "Tạo hóa đơn tháng X"
2. Nhập chỉ số điện: Chỉ số đầu kỳ (tự điền từ kỳ trước) / Chỉ số cuối kỳ → App tính kWh × giá
3. Nhập chỉ số nước: tương tự
4. Hoặc upload ảnh hóa đơn điện/nước thay cho nhập thủ công
5. Xem tổng: Tiền thuê + Tiền điện + Tiền nước + Phí khác
6. Xác nhận → hệ thống gửi thông báo push + in-app cho người thuê

**Happy Path — Thanh Toán (Người thuê):**
1. Nhận thông báo "Hóa đơn tháng X đã có"
2. Mở app → Hóa đơn → xem chi tiết
3. Chọn phương thức: Momo / ZaloPay / QR Code
4. Xác nhận thanh toán trong ứng dụng thanh toán
5. Webhook nhận kết quả → cập nhật trạng thái "Đã thanh toán"
6. Người thuê nhận xác nhận + hóa đơn PDF
7. Chủ nhà nhận thông báo "Đã thu tiền phòng X"

**Edge Cases:**
- Thanh toán thất bại (Momo/ZaloPay lỗi): giữ trạng thái "Chưa thanh toán", thông báo lỗi
- Webhook không nhận: polling backup sau 5 phút
- Người thuê thanh toán ngoài app: chủ nhà có thể "Xác nhận thu thủ công"
- Chỉ số điện cuối < chỉ số đầu: validation lỗi rõ ràng
- Hóa đơn thanh toán trễ: tự động cộng phí trễ (nếu cấu hình)

---

### 2.5 Flow 5: Thu & Trả Tiền Cọc

**Happy Path — Thu Cọc:**
1. Khi hợp đồng được ký → màn hình "Thu tiền cọc"
2. Chủ nhà xác nhận đã nhận cọc (tiền mặt hoặc chuyển khoản)
3. Hệ thống ghi nhận + lưu lịch sử

**Happy Path — Trả Cọc:**
1. Kết thúc hợp đồng → chủ nhà vào "Trả tiền cọc"
2. Đối chiếu checklist đồ (xem flow 2.7)
3. Nhập các khoản khấu trừ (nếu có): mô tả + số tiền + ảnh chứng minh
4. App hiển thị: Tiền cọc gốc - Khấu trừ = Số tiền trả lại
5. Xác nhận → ghi nhận + thông báo người thuê
6. Người thuê xác nhận nhận lại cọc

**Edge Cases:**
- Tranh chấp khấu trừ: người thuê có thể "Phản hồi" với ảnh/lý do, tạo ticket
- Cọc = 0 trên hợp đồng: bỏ qua flow này

---

### 2.6 Flow 6: Yêu Cầu Sửa Chữa

**Happy Path:**
1. Người thuê → "Yêu cầu sửa chữa" → mô tả vấn đề (text)
2. Upload ảnh/video (tối đa 3 file, video < 30 giây)
3. Chọn danh mục: Điện / Nước / Cơ sở hạ tầng / Thiết bị / Khác
4. Gửi → chủ nhà nhận push notification realtime
5. Chủ nhà xem → cập nhật trạng thái: "Đang xử lý" → "Đã giao thợ" (nhập tên thợ, dự kiến)
6. Khi hoàn thành: cập nhật "Hoàn thành" → upload ảnh sau sửa chữa
7. Người thuê nhận thông báo → mở app → đánh giá (1–5 sao + nhận xét)

**Edge Cases:**
- Chủ nhà không phản hồi sau 48 giờ: hệ thống nhắc chủ nhà
- Video quá lớn: nén tự động, báo lỗi nếu vượt giới hạn
- Nhiều yêu cầu cùng lúc: hiển thị danh sách ưu tiên theo ngày tạo

---

### 2.7 Flow 7: Checklist Đồ Nội Thất

**Happy Path — Tạo Checklist:**
1. Chủ nhà vào phòng → "Quản lý checklist" → "Tạo checklist mới"
2. Thêm từng đồ: Tên đồ, Số lượng, Tình trạng ban đầu, Ảnh
3. Lưu checklist

**Happy Path — Xác Nhận Nhận Phòng:**
1. Khi hợp đồng bắt đầu → hệ thống gửi checklist cho người thuê
2. Người thuê mở app → xem từng mục → chụp ảnh tình trạng thực tế → xác nhận
3. Người thuê ký xác nhận nhận phòng
4. Hệ thống lưu ảnh + chữ ký với timestamp

**Happy Path — Đối Chiếu Trả Phòng:**
1. Cuối hợp đồng → chủ nhà và người thuê cùng mở màn hình đối chiếu
2. Từng mục: ảnh lúc nhận vs ảnh lúc trả → chủ nhà đánh dấu "OK" hoặc "Hư hỏng"
3. Ghi chú khấu trừ → liên kết với flow trả cọc

---

### 2.8 Flow 8: Chat Realtime

**Happy Path:**
1. Hợp đồng được ký → hệ thống tự tạo conversation giữa chủ nhà và người thuê
2. Cả hai có thể mở tab "Tin nhắn" → thấy conversation
3. Gửi text / ảnh realtime (WebSocket)
4. Seen status: dấu check kép khi bên kia đã đọc
5. Thông báo push khi có tin nhắn mới và app đang ở background

**Edge Cases:**
- Hợp đồng kết thúc: conversation vẫn tồn tại dưới dạng "Lưu trữ" nhưng không thể gửi tin mới
- Mất kết nối: hàng chờ offline, gửi lại khi có mạng
- Ảnh lớn: nén tự động trước khi gửi

---

### 2.9 Flow 9: Báo Cáo Tài Chính (Chủ nhà)

**Happy Path:**
1. Dashboard → "Báo cáo" → chọn khoảng thời gian
2. Xem: Tổng thu / Tiền thuê / Tiền điện nước / Đang nợ / Tiền cọc đang giữ
3. Biểu đồ theo tháng
4. Xuất Excel/PDF

---

## 3. User Stories & Acceptance Criteria

### Module: Xác Thực & Onboarding

---

**US-001 — Đăng ký tài khoản chủ nhà**
- **As a** người mới, **I want to** đăng ký tài khoản chủ nhà bằng số điện thoại **so that** tôi có thể bắt đầu quản lý nhà trọ.
- **Acceptance Criteria:**
  1. Hệ thống gửi OTP trong vòng 60 giây
  2. OTP có hiệu lực trong 5 phút
  3. Sau 3 lần nhập sai OTP, khóa 30 phút
  4. Sau OTP, bắt buộc nhập: họ tên, CCCD/CMND (9 hoặc 12 số), chọn vai trò "Chủ nhà"
  5. Tài khoản được tạo → chuyển đến Dashboard chủ nhà
  6. Số điện thoại đã tồn tại → hiển thị thông báo lỗi + link đăng nhập
- **Priority:** P0 (Must Have)

---

**US-002 — Đăng ký tài khoản người thuê**
- **As a** người thuê, **I want to** đăng ký bằng SĐT **so that** tôi có thể xem hóa đơn và thanh toán.
- **Acceptance Criteria:**
  1. Flow OTP giống US-001
  2. Sau OTP, bắt buộc nhập họ tên; CCCD là tùy chọn
  3. Chuyển đến màn hình "Liên kết phòng" — nhập mã phòng hoặc bỏ qua
  4. Không có phòng liên kết → Dashboard hiển thị màn hình trống có hướng dẫn
- **Priority:** P0

---

**US-003 — Đăng nhập**
- **As a** người dùng đã có tài khoản, **I want to** đăng nhập bằng SĐT + OTP **so that** tôi truy cập app nhanh chóng.
- **Acceptance Criteria:**
  1. Không dùng mật khẩu — chỉ OTP
  2. Hỗ trợ đăng nhập sinh trắc học (Face ID / vân tay) sau lần đầu OTP
  3. Session kéo dài 30 ngày; hết hạn yêu cầu OTP lại
- **Priority:** P0

---

### Module: Quản Lý Listing & Phòng

---

**US-004 — Tạo listing**
- **As a** chủ nhà, **I want to** tạo listing mới **so that** tôi có thể tổ chức các phòng theo từng tòa nhà.
- **Acceptance Criteria:**
  1. Bắt buộc: tên listing, địa chỉ (tỉnh/thành, quận/huyện, số nhà)
  2. Tùy chọn: mô tả tổng quan, ảnh đại diện listing
  3. Chọn loại: Nhà nguyên căn / Nhà trọ / Căn hộ dịch vụ / Căn hộ chung cư
  4. Listing lưu thành công → hiển thị trong danh sách listing của chủ nhà
  5. Chủ nhà có thể có nhiều listing
- **Priority:** P0

---

**US-005 — Tạo phòng trong listing**
- **As a** chủ nhà, **I want to** thêm phòng vào listing **so that** tôi quản lý từng phòng riêng biệt.
- **Acceptance Criteria:**
  1. Bắt buộc: tên phòng, giá thuê (VND), diện tích (m²), giá điện (VND/kWh), giá nước (VND/m³), tiền cọc
  2. Tiện ích: checkbox, tối thiểu 0 mục được chọn
  3. Trạng thái mặc định: "Trống"
  4. Upload tối đa 10 ảnh, mỗi ảnh ≤ 10MB, định dạng JPG/PNG/HEIC
  5. Phòng lưu thành công → xuất hiện trong danh sách phòng của listing
  6. Validation: giá thuê > 0, diện tích > 0, giá điện ≥ 0, giá nước ≥ 0
- **Priority:** P0

---

**US-006 — Xem & cập nhật trạng thái phòng**
- **As a** chủ nhà, **I want to** thay đổi trạng thái phòng **so that** tôi biết phòng nào đang trống để cho thuê.
- **Acceptance Criteria:**
  1. 3 trạng thái: Trống (xanh), Đã thuê (đỏ), Đang sửa chữa (vàng)
  2. Chủ nhà có thể thay đổi thủ công (ngoại trừ "Đã thuê" — chỉ đổi khi có/hết hợp đồng)
  3. Màn hình dashboard hiển thị bộ đếm theo trạng thái
- **Priority:** P0

---

**US-007 — Lịch In/Out của phòng**
- **As a** chủ nhà, **I want to** xem calendar ngày vào/ra của tenant **so that** tôi lên kế hoạch cho thuê mới.
- **Acceptance Criteria:**
  1. Calendar view tháng, highlight ngày bắt đầu và kết thúc hợp đồng
  2. Nhấn vào ngày → xem chi tiết hợp đồng
  3. Hiển thị các khoảng trống giữa các hợp đồng
- **Priority:** P1

---

### Module: Hợp Đồng

---

**US-008 — Tạo hợp đồng điện tử**
- **As a** chủ nhà, **I want to** tạo hợp đồng PDF cho phòng đang trống **so that** mọi điều khoản được lưu chính thức.
- **Acceptance Criteria:**
  1. Chọn phòng ở trạng thái "Trống"
  2. Tìm người thuê theo SĐT; nếu chưa có tài khoản, nhập thủ công thông tin người thuê
  3. Điền: ngày bắt đầu, ngày kết thúc, giá thuê, tiền cọc, điều khoản thêm
  4. Hệ thống tạo PDF từ template chuẩn (tiếng Việt) với đầy đủ thông tin 2 bên
  5. Chủ nhà preview PDF trước khi ký
  6. Chữ ký điện tử: vẽ trên canvas hoặc dùng chữ ký lưu sẵn
  7. Trạng thái sau khi chủ nhà ký: "Chờ người thuê ký"
  8. Người thuê nhận push notification
- **Priority:** P0

---

**US-009 — Người thuê ký hợp đồng**
- **As a** người thuê, **I want to** đọc và ký hợp đồng trên app **so that** tôi có bản hợp đồng hợp lệ.
- **Acceptance Criteria:**
  1. Người thuê nhận thông báo → mở PDF đầy đủ trên app
  2. Scroll xuống cuối mới hiện nút "Đồng ý và Ký"
  3. Vẽ chữ ký → xác nhận
  4. Hệ thống merge chữ ký 2 bên vào PDF → lưu bản cuối
  5. Cả 2 bên nhận thông báo "Hợp đồng đã được ký" + link tải PDF
  6. Trạng thái phòng → "Đã thuê"
  7. Conversation chat tự động được tạo
  8. Người thuê có thể từ chối: nhập lý do → thông báo chủ nhà
- **Priority:** P0

---

**US-010 — Xem & tải hợp đồng**
- **As a** người dùng, **I want to** xem và tải PDF hợp đồng bất cứ lúc nào **so that** tôi có bằng chứng khi cần.
- **Acceptance Criteria:**
  1. Cả chủ nhà và người thuê truy cập hợp đồng từ màn hình phòng/hợp đồng
  2. Xem trực tiếp trong app hoặc tải về thiết bị
  3. Hiển thị trạng thái: Bản nháp / Chờ ký / Có hiệu lực / Hết hạn / Đã hủy
- **Priority:** P0

---

**US-011 — Kết thúc & gia hạn hợp đồng**
- **As a** chủ nhà, **I want to** đánh dấu hợp đồng kết thúc hoặc gia hạn **so that** trạng thái phòng cập nhật chính xác.
- **Acceptance Criteria:**
  1. Hệ thống nhắc chủ nhà 30 ngày trước ngày hết hạn
  2. Chủ nhà chọn: Gia hạn (tạo hợp đồng mới) / Kết thúc
  3. Kết thúc → kích hoạt flow đối chiếu checklist và trả cọc
  4. Trạng thái phòng → "Trống"
- **Priority:** P1

---

### Module: Thanh Toán

---

**US-012 — Tạo hóa đơn hàng tháng**
- **As a** chủ nhà, **I want to** tạo hóa đơn tháng cho từng phòng **so that** người thuê biết số tiền cần trả.
- **Acceptance Criteria:**
  1. Chủ nhà vào phòng đang thuê → "Tạo hóa đơn"
  2. Chọn kỳ thanh toán (tháng/năm)
  3. Nhập chỉ số điện đầu kỳ (tự điền từ hóa đơn trước, có thể sửa) và cuối kỳ
  4. Nhập chỉ số nước tương tự
  5. App tính: Điện = (cuối - đầu) × giá/kWh; Nước = (cuối - đầu) × giá/m³
  6. Chủ nhà có thể thêm phí khác (có label tùy chỉnh)
  7. Tổng cộng hiển thị rõ ràng; chủ nhà xác nhận → gửi cho người thuê
  8. Người thuê nhận push notification
  9. Validation: chỉ số cuối ≥ chỉ số đầu
- **Priority:** P0

---

**US-013 — Upload hóa đơn điện nước thay nhập thủ công**
- **As a** chủ nhà, **I want to** upload ảnh hóa đơn thay vì nhập thủ công **so that** tiết kiệm thời gian.
- **Acceptance Criteria:**
  1. Nút "Upload hóa đơn" trong màn hình tạo hóa đơn
  2. Upload ảnh → OCR tự động đọc số kWh/m³ (best effort, cho phép sửa thủ công)
  3. Ảnh lưu kèm hóa đơn để người thuê đối chiếu
- **Priority:** P2

---

**US-014 — Thanh toán bằng Momo**
- **As a** người thuê, **I want to** thanh toán hóa đơn bằng Momo **so that** không cần đến gặp chủ nhà.
- **Acceptance Criteria:**
  1. Người thuê mở hóa đơn → "Thanh toán ngay" → chọn Momo
  2. Deep link mở app Momo hoặc redirect đến thanh toán Momo
  3. Sau giao dịch thành công: webhook cập nhật trạng thái hóa đơn → "Đã thanh toán"
  4. Người thuê nhận xác nhận trong app
  5. Chủ nhà nhận push notification
  6. Nếu giao dịch thất bại: giữ trạng thái "Chưa thanh toán", hiển thị lỗi
  7. Mã giao dịch Momo được lưu vào lịch sử
- **Priority:** P0

---

**US-015 — Thanh toán bằng ZaloPay**
- **As a** người thuê, **I want to** thanh toán bằng ZaloPay **so that** tôi có nhiều lựa chọn thanh toán.
- **Acceptance Criteria:** Tương tự US-014 nhưng dùng ZaloPay SDK/API
- **Priority:** P0

---

**US-016 — Thanh toán bằng QR Code**
- **As a** người thuê, **I want to** quét QR để thanh toán **so that** tôi dùng bất kỳ ngân hàng nào.
- **Acceptance Criteria:**
  1. Hệ thống tạo QR VietQR chuẩn NAPAS với số tiền và nội dung chuyển khoản
  2. Người thuê quét bằng app ngân hàng
  3. Webhook (hoặc xác nhận thủ công của chủ nhà) cập nhật trạng thái
  4. QR có hiệu lực 24 giờ
- **Priority:** P0

---

**US-017 — Xác nhận thu tiền thủ công**
- **As a** chủ nhà, **I want to** xác nhận khi tenant trả tiền mặt **so that** lịch sử thanh toán vẫn đầy đủ.
- **Acceptance Criteria:**
  1. Chủ nhà vào hóa đơn → "Xác nhận đã thu" → chọn phương thức: Tiền mặt / Chuyển khoản ngoài app
  2. Nhập ghi chú tùy chọn
  3. Trạng thái cập nhật "Đã thanh toán (Thủ công)"
  4. Người thuê nhận thông báo xác nhận
- **Priority:** P0

---

**US-018 — Xem lịch sử thanh toán**
- **As a** người dùng, **I want to** xem lịch sử tất cả hóa đơn **so that** tôi tra cứu khi cần.
- **Acceptance Criteria:**
  1. Danh sách hóa đơn sắp xếp theo ngày mới nhất
  2. Filter theo: Đã thanh toán / Chưa thanh toán / Quá hạn
  3. Từng hóa đơn có thể tải PDF
  4. Cả chủ nhà và người thuê xem được lịch sử
- **Priority:** P0

---

**US-019 — Nhắc thanh toán tự động**
- **As a** chủ nhà, **I want to** hệ thống tự nhắc người thuê đến ngày đóng tiền **so that** tôi không cần gọi điện từng người.
- **Acceptance Criteria:**
  1. Cấu hình ngày nhắc trong hợp đồng (ví dụ: ngày 1 hàng tháng)
  2. Hệ thống gửi push notification trước 3 ngày và đúng ngày
  3. Nếu chưa thanh toán sau ngày hạn: gửi nhắc thêm sau 1, 3, 7 ngày
  4. Chủ nhà có thể tắt tính năng nhắc tự động
- **Priority:** P1

---

### Module: Tiền Cọc

---

**US-020 — Ghi nhận thu cọc**
- **As a** chủ nhà, **I want to** ghi nhận đã nhận tiền cọc **so that** hồ sơ tài chính đầy đủ.
- **Acceptance Criteria:**
  1. Sau khi hợp đồng có hiệu lực: nhắc "Ghi nhận thu cọc"
  2. Nhập số tiền thực nhận, phương thức, ngày nhận
  3. Lưu vào lịch sử, người thuê nhận xác nhận
- **Priority:** P0

---

**US-021 — Xử lý trả cọc**
- **As a** chủ nhà, **I want to** xử lý trả cọc khi tenant trả phòng **so that** minh bạch và tránh tranh chấp.
- **Acceptance Criteria:**
  1. Khởi tạo từ màn hình kết thúc hợp đồng
  2. Hiển thị: số cọc ban đầu, danh sách khấu trừ (nếu có) với ảnh chứng minh
  3. Tính tự động: cọc - khấu trừ = tiền trả lại
  4. Người thuê ký xác nhận nhận lại cọc (hoặc từ chối với lý do)
  5. Lưu toàn bộ lịch sử thao tác
- **Priority:** P1

---

### Module: Checklist Đồ

---

**US-022 — Tạo checklist đồ nội thất**
- **As a** chủ nhà, **I want to** lập danh sách đồ nội thất trong phòng **so that** có căn cứ khi tenant trả phòng.
- **Acceptance Criteria:**
  1. Thêm từng mục: Tên, Số lượng, Tình trạng (Mới / Tốt / Cũ / Hỏng), Ghi chú, Ảnh (1 ảnh/mục)
  2. Lưu checklist gắn với phòng (không phải hợp đồng)
  3. Có thể chỉnh sửa trước khi giao phòng
- **Priority:** P1

---

**US-023 — Tenant xác nhận nhận phòng**
- **As a** người thuê, **I want to** xác nhận tình trạng phòng khi nhận **so that** tôi không bị chịu trách nhiệm cho hư hỏng có sẵn.
- **Acceptance Criteria:**
  1. Khi hợp đồng bắt đầu: hệ thống gửi checklist cho người thuê
  2. Người thuê xem từng mục, có thể thêm ảnh thực tế và ghi chú phản hồi
  3. Người thuê ký xác nhận toàn bộ
  4. Lưu ảnh + timestamp + chữ ký người thuê
- **Priority:** P1

---

**US-024 — Đối chiếu checklist khi trả phòng**
- **As a** chủ nhà, **I want to** so sánh tình trạng đồ lúc giao và lúc nhận lại **so that** xác định được khấu trừ cọc hợp lý.
- **Acceptance Criteria:**
  1. Màn hình so sánh side-by-side: ảnh cũ (lúc nhận) vs ảnh mới (lúc trả)
  2. Chủ nhà đánh dấu từng mục: OK / Hỏng / Thiếu
  3. Các mục bị đánh dấu tự động tạo danh sách khấu trừ trong flow trả cọc
- **Priority:** P1

---

### Module: Sửa Chữa

---

**US-025 — Người thuê gửi yêu cầu sửa chữa**
- **As a** người thuê, **I want to** báo cáo vấn đề cần sửa **so that** chủ nhà xử lý kịp thời.
- **Acceptance Criteria:**
  1. Nhập tiêu đề, mô tả chi tiết
  2. Chọn danh mục: Điện / Nước / Cơ sở hạ tầng / Thiết bị / Khác
  3. Upload tối đa 3 file (ảnh JPG/PNG hoặc video MP4 ≤ 30 giây, tổng ≤ 50MB)
  4. Gửi → chủ nhà nhận push notification ngay lập tức
  5. Người thuê xem được lịch sử các yêu cầu đã gửi
- **Priority:** P0

---

**US-026 — Chủ nhà xử lý yêu cầu sửa chữa**
- **As a** chủ nhà, **I want to** cập nhật tiến độ sửa chữa **so that** người thuê không phải hỏi liên tục.
- **Acceptance Criteria:**
  1. Danh sách yêu cầu sắp xếp theo ngày mới nhất
  2. Cập nhật trạng thái: Mới → Đang xử lý → Đã giao thợ → Hoàn thành
  3. Khi "Đã giao thợ": nhập tên thợ, SĐT thợ, ngày dự kiến hoàn thành
  4. Khi "Hoàn thành": upload ảnh/video sau sửa chữa, ghi chú
  5. Mỗi thay đổi trạng thái → người thuê nhận push notification
  6. Chủ nhà nhận nhắc nếu không phản hồi sau 48 giờ
- **Priority:** P0

---

**US-027 — Người thuê đánh giá sửa chữa**
- **As a** người thuê, **I want to** đánh giá chất lượng sửa chữa **so that** chủ nhà cải thiện dịch vụ.
- **Acceptance Criteria:**
  1. Sau khi trạng thái = "Hoàn thành": người thuê nhận thông báo
  2. Đánh giá: 1–5 sao + nhận xét văn bản (tùy chọn)
  3. Chủ nhà xem được tổng hợp đánh giá
- **Priority:** P2

---

### Module: Chat

---

**US-028 — Chat realtime chủ nhà — người thuê**
- **As a** người dùng, **I want to** nhắn tin realtime với đối phương **so that** trao đổi nhanh không cần đổi sang Zalo.
- **Acceptance Criteria:**
  1. Conversation tự động tạo khi hợp đồng có hiệu lực (chỉ 1 conversation/hợp đồng)
  2. Gửi text và ảnh (JPG/PNG ≤ 5MB/ảnh)
  3. Realtime qua WebSocket; offline queue khi mất mạng
  4. Seen status: 1 check = đã gửi, 2 check = đã xem
  5. Push notification khi app ở background
  6. Hiển thị timestamp của từng tin nhắn
  7. Lịch sử tin nhắn lưu vĩnh viễn
- **Priority:** P0

---

**US-029 — Lưu trữ conversation sau khi hợp đồng kết thúc**
- **As a** người dùng, **I want to** xem lại lịch sử chat **so that** tham khảo khi cần.
- **Acceptance Criteria:**
  1. Sau khi hợp đồng kết thúc: conversation chuyển sang "Lưu trữ"
  2. Không thể gửi tin mới, chỉ đọc
  3. Tìm kiếm trong lịch sử chat (full-text search trong conversation)
- **Priority:** P2

---

### Module: Thông Báo

---

**US-030 — Quản lý thông báo**
- **As a** người dùng, **I want to** nhận thông báo đúng lúc và có thể tùy chỉnh **so that** không bị spam.
- **Acceptance Criteria:**
  1. Các loại thông báo: Hóa đơn mới / Thanh toán / Hợp đồng / Sửa chữa / Chat / Nhắc thanh toán
  2. Người dùng bật/tắt từng loại trong Settings
  3. In-app notification center lưu lịch sử 90 ngày
  4. Push notification qua FCM (Android) và APNs (iOS)
- **Priority:** P0

---

### Module: Báo Cáo Tài Chính

---

**US-031 — Dashboard tài chính chủ nhà**
- **As a** chủ nhà, **I want to** xem tổng quan thu nhập **so that** nắm được dòng tiền.
- **Acceptance Criteria:**
  1. Tổng thu tháng hiện tại vs tháng trước
  2. Phân tích: tiền thuê / điện nước / phí khác
  3. Danh sách phòng chưa đóng tiền tháng này
  4. Số tiền cọc đang giữ
  5. Biểu đồ thu nhập 12 tháng gần nhất
- **Priority:** P1

---

**US-032 — Xuất báo cáo**
- **As a** chủ nhà, **I want to** xuất báo cáo tài chính **so that** tôi khai thuế hoặc lưu hồ sơ.
- **Acceptance Criteria:**
  1. Chọn khoảng thời gian tùy chỉnh
  2. Xuất định dạng PDF và Excel (.xlsx)
  3. Bao gồm: từng giao dịch, tổng theo phòng, tổng tháng
- **Priority:** P2

---

### Module: Cài Đặt

---

**US-033 — Quản lý hồ sơ người dùng**
- **As a** người dùng, **I want to** cập nhật thông tin cá nhân **so that** hợp đồng có thông tin chính xác.
- **Acceptance Criteria:**
  1. Chỉnh sửa: họ tên, ảnh đại diện, email
  2. SĐT không thể đổi sau khi xác minh
  3. Upload ảnh CCCD (tùy chọn, cho độ tin cậy)
- **Priority:** P1

---

## 4. MoSCoW Prioritization

### P0 — Must Have (MVP)

| ID | Feature |
|----|---------|
| US-001 | Đăng ký chủ nhà |
| US-002 | Đăng ký người thuê |
| US-003 | Đăng nhập OTP |
| US-004 | Tạo listing |
| US-005 | Tạo phòng |
| US-006 | Quản lý trạng thái phòng |
| US-008 | Tạo hợp đồng điện tử |
| US-009 | Tenant ký hợp đồng |
| US-010 | Xem & tải hợp đồng |
| US-012 | Tạo hóa đơn hàng tháng |
| US-014 | Thanh toán Momo |
| US-015 | Thanh toán ZaloPay |
| US-016 | Thanh toán QR Code |
| US-017 | Xác nhận thu thủ công |
| US-018 | Lịch sử thanh toán |
| US-020 | Ghi nhận thu cọc |
| US-025 | Gửi yêu cầu sửa chữa |
| US-026 | Xử lý yêu cầu sửa chữa |
| US-028 | Chat realtime |
| US-030 | Quản lý thông báo |

### P1 — Should Have (Post-MVP, Sprint 1–2)

| ID | Feature |
|----|---------|
| US-007 | Calendar In/Out phòng |
| US-011 | Kết thúc & gia hạn hợp đồng |
| US-019 | Nhắc thanh toán tự động |
| US-021 | Xử lý trả cọc |
| US-022 | Tạo checklist đồ |
| US-023 | Tenant xác nhận nhận phòng |
| US-024 | Đối chiếu checklist trả phòng |
| US-031 | Dashboard tài chính |
| US-033 | Quản lý hồ sơ |

### P2 — Could Have (Post-Launch Enhancement)

| ID | Feature |
|----|---------|
| US-013 | OCR upload hóa đơn |
| US-027 | Tenant đánh giá sửa chữa |
| US-029 | Lưu trữ conversation |
| US-032 | Xuất báo cáo Excel/PDF |

### P3 — Won't Have (This Version)

- Đặt phòng online dành cho khách thuê mới (marketplace)
- Hợp đồng nhiều người thuê cùng phòng
- Đa ngôn ngữ (chỉ tiếng Việt trong version này)
- Tích hợp kế toán bên thứ 3 (MISA, Fast Accounting)
- Chatbot AI hỗ trợ
- Web app (chỉ mobile)
- Push thuê từ nền tảng như Chotot, Batdongsan

---

## 5. MVP Definition

### MVP Scope

**Mục tiêu MVP:** Cho phép chủ nhà quản lý ít nhất 1 listing với 1–5 phòng, tạo hợp đồng điện tử với người thuê, thu tiền hàng tháng, và trao đổi realtime. Mục tiêu kiểm chứng: người dùng có thể hoàn thành vòng lặp đầy đủ (phòng → hợp đồng → hóa đơn → thanh toán → chat) mà không cần dùng công cụ ngoài.

### Trong MVP

- Xác thực OTP (đăng ký + đăng nhập)
- Tạo listing và phòng (P0)
- Hợp đồng điện tử 2 chiều (tạo PDF, ký số, lưu trữ)
- Tạo hóa đơn hàng tháng (điện + nước + tiền thuê)
- Thanh toán: Momo, ZaloPay, QR
- Xác nhận thu thủ công
- Ghi nhận tiền cọc
- Báo cáo yêu cầu sửa chữa (gửi + cập nhật trạng thái)
- Chat realtime 1-1 (text + ảnh)
- Push notifications
- Lịch sử hóa đơn và thanh toán

### Ngoài MVP

- Checklist đồ nội thất (P1)
- Trả cọc có khấu trừ (P1)
- Dashboard tài chính (P1)
- Nhắc thanh toán tự động (P1)
- Calendar phòng (P1)
- Tất cả P2 và P3

### Điều kiện để MVP được coi là thành công

1. ≥ 20 chủ nhà thực sự dùng trong giai đoạn Beta
2. Ít nhất 1 vòng lặp đầy đủ (hợp đồng → thanh toán) được thực hiện thành công
3. Không có lỗi nghiêm trọng (P0 bug) trong thanh toán trong 14 ngày liên tiếp
4. Crash rate < 1%
5. Rating ≥ 4.0/5 trong survey nội bộ

---

## 6. Feature Specifications

### 6.1 Screen Inventory

#### Màn hình chung
| ID | Tên màn hình | Vai trò |
|----|-------------|---------|
| SCR-001 | Welcome / Splash | Chung |
| SCR-002 | Chọn vai trò | Chung |
| SCR-003 | Nhập số điện thoại | Chung |
| SCR-004 | Nhập OTP | Chung |
| SCR-005 | Hoàn thiện hồ sơ | Chung |
| SCR-006 | Settings | Chung |
| SCR-007 | Notification Center | Chung |

#### Màn hình chủ nhà
| ID | Tên màn hình | Mô tả |
|----|-------------|-------|
| SCR-101 | Dashboard chủ nhà | Tổng quan: tổng thu, phòng trống, cảnh báo |
| SCR-102 | Danh sách listing | Grid/list các listing |
| SCR-103 | Chi tiết listing | Danh sách phòng trong listing, thống kê |
| SCR-104 | Tạo/sửa listing | Form tạo listing |
| SCR-105 | Chi tiết phòng | Ảnh, thông tin, trạng thái, tab: Hợp đồng/Hóa đơn/Sửa chữa |
| SCR-106 | Tạo/sửa phòng | Form đầy đủ |
| SCR-107 | Tạo hợp đồng | Wizard 3 bước |
| SCR-108 | Preview hợp đồng PDF | WebView với nút ký |
| SCR-109 | Ký điện tử (Canvas) | Màn hình ký tay |
| SCR-110 | Danh sách hợp đồng | Tất cả hợp đồng |
| SCR-111 | Tạo hóa đơn | Form nhập chỉ số |
| SCR-112 | Chi tiết hóa đơn | Breakdown chi phí |
| SCR-113 | Danh sách hóa đơn | Tất cả hóa đơn theo phòng |
| SCR-114 | Quản lý cọc | Thu/trả cọc |
| SCR-115 | Tạo checklist | Form thêm đồ |
| SCR-116 | Xem checklist | Danh sách đồ với ảnh |
| SCR-117 | Đối chiếu checklist | So sánh 2 thời điểm |
| SCR-118 | Danh sách sửa chữa | Tất cả yêu cầu |
| SCR-119 | Chi tiết sửa chữa | Xem + cập nhật trạng thái |
| SCR-120 | Báo cáo tài chính | Biểu đồ + bảng |
| SCR-121 | Chat list | Danh sách conversation |
| SCR-122 | Màn hình chat | Tin nhắn realtime |

#### Màn hình người thuê
| ID | Tên màn hình | Mô tả |
|----|-------------|-------|
| SCR-201 | Dashboard người thuê | Phòng hiện tại, hóa đơn cần trả |
| SCR-202 | Chi tiết phòng | Thông tin phòng, tiện ích |
| SCR-203 | Xem hợp đồng | PDF viewer |
| SCR-204 | Ký hợp đồng | Đọc + ký |
| SCR-205 | Danh sách hóa đơn | Lịch sử hóa đơn |
| SCR-206 | Chi tiết hóa đơn | Breakdown + nút thanh toán |
| SCR-207 | Chọn phương thức TT | Momo / ZaloPay / QR |
| SCR-208 | QR thanh toán | Hiển thị QR code |
| SCR-209 | Xác nhận thanh toán | Màn hình thành công/thất bại |
| SCR-210 | Gửi yêu cầu sửa chữa | Form + upload |
| SCR-211 | Lịch sử sửa chữa | Danh sách yêu cầu |
| SCR-212 | Checklist nhận phòng | Xem + xác nhận từng mục |
| SCR-213 | Chat | Tương tự SCR-122 |

---

### 6.2 Data Model Requirements

#### Users
```
users {
  id: UUID (PK)
  phone: String (unique, indexed)
  name: String
  cccd: String (optional)
  avatar_url: String
  role: Enum [landlord, tenant]
  created_at: Timestamp
  updated_at: Timestamp
}
```

#### Listings
```
listings {
  id: UUID (PK)
  landlord_id: UUID (FK users)
  name: String
  type: Enum [nha_nguyen_can, nha_tro, can_ho_dich_vu, chung_cu]
  address_province: String
  address_district: String
  address_detail: String
  description: Text
  cover_image_url: String
  is_active: Boolean
  created_at: Timestamp
}
```

#### Rooms
```
rooms {
  id: UUID (PK)
  listing_id: UUID (FK listings)
  name: String
  area_sqm: Decimal
  rent_price: BigInt (VND)
  electricity_price: Decimal (VND/kWh)
  water_price: Decimal (VND/m3)
  deposit_amount: BigInt (VND)
  amenities: JSON Array [enum values]
  status: Enum [trong, da_thue, dang_sua_chua]
  images: JSON Array [urls]
  created_at: Timestamp
  updated_at: Timestamp
}
```

#### Contracts
```
contracts {
  id: UUID (PK)
  room_id: UUID (FK rooms)
  landlord_id: UUID (FK users)
  tenant_id: UUID (FK users)
  tenant_name: String (denormalized for unsigned tenants)
  tenant_phone: String
  tenant_cccd: String
  start_date: Date
  end_date: Date
  rent_price: BigInt
  deposit_amount: BigInt
  extra_terms: Text
  status: Enum [draft, pending_tenant, active, expired, terminated]
  pdf_url: String
  landlord_signed_at: Timestamp
  tenant_signed_at: Timestamp
  landlord_signature_url: String
  tenant_signature_url: String
  created_at: Timestamp
}
```

#### Invoices
```
invoices {
  id: UUID (PK)
  contract_id: UUID (FK contracts)
  room_id: UUID (FK rooms)
  period_month: Integer (1-12)
  period_year: Integer
  rent_amount: BigInt
  electricity_start: Decimal
  electricity_end: Decimal
  electricity_kwh: Decimal (computed)
  electricity_price_per_kwh: Decimal
  electricity_amount: BigInt (computed)
  water_start: Decimal
  water_end: Decimal
  water_m3: Decimal (computed)
  water_price_per_m3: Decimal
  water_amount: BigInt (computed)
  other_fees: JSON Array [{label, amount}]
  total_amount: BigInt (computed)
  status: Enum [unpaid, paid, overdue, cancelled]
  payment_method: Enum [momo, zalopay, qr, cash, bank_transfer, manual]
  payment_ref: String (transaction ID from payment gateway)
  paid_at: Timestamp
  electricity_bill_image_url: String
  water_bill_image_url: String
  created_at: Timestamp
  due_date: Date
}
```

#### Payments
```
payments {
  id: UUID (PK)
  invoice_id: UUID (FK invoices)
  amount: BigInt
  method: Enum [momo, zalopay, qr, cash, bank_transfer]
  status: Enum [pending, success, failed, refunded]
  gateway_ref: String
  gateway_response: JSON
  created_at: Timestamp
}
```

#### Deposits
```
deposits {
  id: UUID (PK)
  contract_id: UUID (FK contracts)
  amount: BigInt
  received_at: Timestamp
  received_method: String
  returned_at: Timestamp
  returned_amount: BigInt
  deductions: JSON Array [{reason, amount, image_url}]
  status: Enum [held, partially_returned, fully_returned]
}
```

#### Maintenance Requests
```
maintenance_requests {
  id: UUID (PK)
  contract_id: UUID (FK contracts)
  room_id: UUID (FK rooms)
  tenant_id: UUID (FK users)
  title: String
  description: Text
  category: Enum [dien, nuoc, co_so_ha_tang, thiet_bi, khac]
  media_urls: JSON Array [urls]
  status: Enum [moi, dang_xu_ly, da_giao_tho, hoan_thanh]
  worker_name: String
  worker_phone: String
  expected_completion: Date
  completion_media_urls: JSON Array
  completion_note: Text
  rating: Integer (1-5)
  rating_comment: Text
  created_at: Timestamp
  updated_at: Timestamp
}
```

#### Checklists
```
checklists {
  id: UUID (PK)
  room_id: UUID (FK rooms)
  created_by: UUID (FK users)
  items: JSON Array [{name, quantity, condition, note, image_url}]
  created_at: Timestamp
}

checklist_confirmations {
  id: UUID (PK)
  checklist_id: UUID (FK checklists)
  contract_id: UUID (FK contracts)
  type: Enum [checkin, checkout]
  tenant_signature_url: String
  confirmed_at: Timestamp
  items_with_photos: JSON Array [{item_id, actual_condition, actual_image_url, note}]
}
```

#### Messages / Chat
```
conversations {
  id: UUID (PK)
  contract_id: UUID (FK contracts)
  landlord_id: UUID (FK users)
  tenant_id: UUID (FK users)
  is_archived: Boolean
  created_at: Timestamp
}

messages {
  id: UUID (PK)
  conversation_id: UUID (FK conversations)
  sender_id: UUID (FK users)
  type: Enum [text, image]
  content: Text
  image_url: String
  seen_at: Timestamp
  created_at: Timestamp
}
```

#### Notifications
```
notifications {
  id: UUID (PK)
  user_id: UUID (FK users)
  type: String
  title: String
  body: String
  data: JSON
  read_at: Timestamp
  created_at: Timestamp
}
```

---

### 6.3 API Requirements

#### Authentication
```
POST /auth/request-otp         — Gửi OTP đến SĐT
POST /auth/verify-otp          — Xác minh OTP, trả về JWT
POST /auth/refresh             — Refresh access token
POST /auth/logout              — Thu hồi token
```

#### Users
```
GET    /users/me               — Lấy thông tin người dùng hiện tại
PUT    /users/me               — Cập nhật hồ sơ
POST   /users/me/avatar        — Upload ảnh đại diện
```

#### Listings
```
GET    /listings               — Danh sách listing của chủ nhà
POST   /listings               — Tạo listing mới
GET    /listings/:id           — Chi tiết listing
PUT    /listings/:id           — Cập nhật listing
DELETE /listings/:id           — Xóa listing (chỉ khi không có phòng đang thuê)
```

#### Rooms
```
GET    /listings/:id/rooms     — Danh sách phòng trong listing
POST   /listings/:id/rooms     — Tạo phòng mới
GET    /rooms/:id              — Chi tiết phòng
PUT    /rooms/:id              — Cập nhật phòng
DELETE /rooms/:id              — Xóa phòng
POST   /rooms/:id/images       — Upload ảnh phòng
DELETE /rooms/:id/images/:imgId — Xóa ảnh
```

#### Contracts
```
POST   /contracts              — Tạo hợp đồng
GET    /contracts              — Danh sách hợp đồng (của chủ nhà hoặc tenant)
GET    /contracts/:id          — Chi tiết hợp đồng
GET    /contracts/:id/pdf      — Tải PDF
POST   /contracts/:id/sign     — Ký hợp đồng (landlord hoặc tenant)
POST   /contracts/:id/decline  — Từ chối ký
POST   /contracts/:id/terminate — Kết thúc hợp đồng
POST   /contracts/:id/renew    — Gia hạn (tạo hợp đồng mới)
```

#### Invoices
```
POST   /invoices               — Tạo hóa đơn
GET    /invoices               — Danh sách (filter theo contract/room/status)
GET    /invoices/:id           — Chi tiết hóa đơn
POST   /invoices/:id/manual-confirm — Xác nhận thu thủ công
GET    /invoices/:id/pdf       — Tải PDF hóa đơn
```

#### Payments
```
POST   /payments/initiate      — Khởi tạo giao dịch (trả về deep link Momo/ZaloPay hoặc QR)
POST   /payments/webhook/momo  — Webhook nhận kết quả từ Momo
POST   /payments/webhook/zalopay — Webhook nhận kết quả từ ZaloPay
GET    /payments/:id/status    — Kiểm tra trạng thái giao dịch
```

#### Deposits
```
POST   /contracts/:id/deposit/receive  — Ghi nhận thu cọc
POST   /contracts/:id/deposit/return   — Xử lý trả cọc
GET    /contracts/:id/deposit          — Trạng thái cọc
```

#### Maintenance
```
POST   /maintenance            — Tạo yêu cầu sửa chữa
GET    /maintenance            — Danh sách (filter theo room/status)
GET    /maintenance/:id        — Chi tiết
PUT    /maintenance/:id/status — Cập nhật trạng thái
POST   /maintenance/:id/rate   — Đánh giá
POST   /maintenance/:id/media  — Upload media
```

#### Checklists
```
GET    /rooms/:id/checklist    — Lấy checklist của phòng
POST   /rooms/:id/checklist    — Tạo/cập nhật checklist
POST   /contracts/:id/checklist/confirm — Tenant xác nhận (checkin/checkout)
GET    /contracts/:id/checklist/compare — Dữ liệu so sánh 2 thời điểm
```

#### Chat
```
GET    /conversations          — Danh sách conversation của user
GET    /conversations/:id/messages — Lịch sử tin nhắn (phân trang cursor-based)
POST   /conversations/:id/messages — Gửi tin nhắn text
POST   /conversations/:id/messages/image — Gửi ảnh
POST   /conversations/:id/seen — Đánh dấu đã đọc
WS     /ws                     — WebSocket endpoint cho realtime
```

#### Notifications
```
GET    /notifications          — Danh sách thông báo (phân trang)
POST   /notifications/read-all — Đánh dấu tất cả đã đọc
PUT    /notifications/:id/read — Đánh dấu 1 thông báo đã đọc
GET    /users/me/notification-settings — Cài đặt thông báo
PUT    /users/me/notification-settings — Cập nhật cài đặt
```

#### Reports
```
GET    /reports/summary        — Tổng quan tài chính (query: from, to)
GET    /reports/transactions   — Chi tiết giao dịch (query: from, to, room_id)
GET    /reports/export         — Xuất Excel/PDF
```

---

### 6.4 Edge Cases Tổng Hợp

| Kịch bản | Xử lý |
|----------|-------|
| Mất kết nối khi đang ký hợp đồng | Lưu chữ ký locally, sync khi có mạng |
| Người thuê xóa app sau khi ký hợp đồng | Chủ nhà vẫn có PDF đầy đủ; tenant tải lại app vào lại được |
| Webhook thanh toán đến trễ hoặc trùng lặp | Idempotency key; chỉ xử lý lần đầu |
| Landlord tạo 2 hóa đơn cùng kỳ | Unique constraint (contract_id, period_month, period_year) |
| Token JWT hết hạn giữa phiên | Silent refresh; nếu refresh token cũng hết → đăng xuất + thông báo |
| Chỉ số điện/nước cuối kỳ < đầu kỳ | Validation lỗi + giải thích (ví dụ: thay đồng hồ → cho phép nhập 0 làm điểm đầu kỳ mới) |
| Hợp đồng quá hạn mà không ai gia hạn | Tự chuyển sang "Hết hạn", cảnh báo cả 2 bên, phòng vẫn giữ trạng thái "Đã thuê" cho đến khi landlord chủ động kết thúc |
| Nhiều thiết bị đăng nhập cùng tài khoản | Cho phép, mỗi thiết bị có FCM token riêng |
| Upload file quá giới hạn | Báo lỗi cụ thể: "File [tên] vượt quá 10MB cho phép" |
| Người thuê không có tài khoản khi ký | Gửi SMS có link tải app + mã xác nhận hợp đồng |

---

### 6.5 Yêu Cầu Bảo Mật

1. **Authentication:** JWT với access token 1 giờ, refresh token 30 ngày, lưu trong Keychain/Keystore
2. **HTTPS:** Bắt buộc TLS 1.2+ cho tất cả API
3. **Dữ liệu nhạy cảm:** CCCD, SĐT mã hóa at-rest (AES-256)
4. **PDF hợp đồng:** Signed URL với thời hạn truy cập, không public URL vĩnh viễn
5. **Webhook thanh toán:** Xác minh signature từ Momo/ZaloPay
6. **Rate limiting:** OTP: 3 lần/SĐT/giờ; API chung: 100 req/phút/user
7. **Chữ ký điện tử:** Lưu hash SHA-256 của PDF + timestamp + IP để chống chối bỏ

---

### 6.6 Yêu Cầu Hiệu Năng

| Chỉ số | Mục tiêu |
|--------|---------|
| API response time (p95) | < 500ms |
| PDF generation | < 3 giây |
| Ảnh upload | Nén client-side trước khi gửi, ảnh > 2MB nén xuống ≤ 1MB |
| WebSocket latency | < 200ms |
| App startup time | < 2 giây (cold start) |
| Crash rate | < 1% sessions |
| Offline capability | Xem hóa đơn + lịch sử + hợp đồng đã tải |

---

## 7. Phased Launch Plan

### Phase 1: Alpha (Tuần 1–6)

**Mục tiêu:** Kiểm tra luồng cốt lõi với nhóm nhỏ nội bộ + early adopters thực sự.

**Đối tượng:** 5–10 chủ nhà đã quen biết, 10–30 người thuê

**Bao gồm:**
- Xác thực OTP
- Tạo listing + phòng
- Tạo hợp đồng (PDF tĩnh, chưa có chữ ký số phức tạp)
- Tạo hóa đơn + xác nhận thủ công
- Chat cơ bản
- Push notification

**Không bao gồm:**
- Tích hợp cổng thanh toán Momo/ZaloPay (dùng QR hoặc thủ công)
- Checklist đầy đủ

**KPI Alpha:**
- 0 crash P0 trong luồng thanh toán
- Tất cả chủ nhà tạo được ít nhất 1 phòng và 1 hợp đồng
- Feedback form NPS > 30

**Deliverables kỹ thuật:**
- Backend API hoàn thiện P0
- iOS + Android build TestFlight/Firebase Distribution
- Môi trường staging với dữ liệu thật (anonymized)

---

### Phase 2: Beta (Tuần 7–12)

**Mục tiêu:** Tích hợp thanh toán thật, stress test với ~100 người dùng.

**Đối tượng:** 30–50 chủ nhà, 100–200 người thuê; tập trung TP.HCM và Hà Nội

**Bao gồm (bổ sung từ Alpha):**
- Tích hợp Momo + ZaloPay thực (sandbox → production)
- Chữ ký điện tử hoàn chỉnh (canvas signature embedded trong PDF)
- Nhắc thanh toán tự động
- Dashboard tài chính cơ bản
- Quản lý cọc đầy đủ
- Checklist đồ (P1)
- Gia hạn/kết thúc hợp đồng

**KPI Beta:**
- ≥ 1 giao dịch Momo/ZaloPay thành công/ngày
- Webhook success rate ≥ 99%
- App rating từ beta testers ≥ 4.0/5
- Bug backlog P0 = 0, P1 ≤ 5

**Deliverables kỹ thuật:**
- Monitoring & alerting (Sentry, Firebase Crashlytics)
- Load test: 500 concurrent users
- Security audit nội bộ

---

### Phase 3: Soft Launch (Tuần 13–16)

**Mục tiêu:** Mở đăng ký tự do, giới hạn địa lý; vận hành + tối ưu trước khi full scale.

**Đối tượng:** Tất cả mọi người tại TP.HCM + Hà Nội + Đà Nẵng

**Bao gồm (bổ sung từ Beta):**
- App lên App Store + Google Play (giới hạn vùng)
- Báo cáo xuất PDF/Excel
- OCR upload hóa đơn (P2, nếu sẵn sàng)
- Onboarding tutorial (walkthrough màn hình lần đầu)
- FAQ + Help Center trong app

**Marketing:**
- Partnership với 3–5 hội nhóm chủ nhà lớn trên Facebook
- Chạy thử gói freemium: ≤ 5 phòng miễn phí

**KPI Soft Launch:**
- 200+ chủ nhà đăng ký
- 500+ người thuê đăng ký
- Retention D7 ≥ 40%
- Churn rate tháng 1 < 20%

---

### Phase 4: Full Launch (Tuần 17+)

**Mục tiêu:** Scale toàn quốc, ra mắt mô hình monetization.

**Bao gồm:**
- Mở toàn quốc (63 tỉnh thành)
- Gói Premium cho chủ nhà (> 5 phòng): 99.000–299.000 VND/tháng
- Tích hợp thêm cổng thanh toán (VNPay, ATM nội địa)
- Tính năng đánh giá sửa chữa (P2)
- Conversation archive search (P2)
- API public (webhook out) cho chủ nhà tích hợp hệ thống kế toán

**KPI Full Launch (Tháng 3):**
- 2.000+ chủ nhà active
- 5.000+ người thuê active
- MRR > 50 triệu VND
- App Store rating ≥ 4.2/5

---

## 8. Open Questions & Risks

### 8.1 Open Questions

| # | Câu hỏi | Ảnh hưởng | Người cần trả lời |
|---|---------|---------|-----------------|
| OQ-01 | Chữ ký điện tử có cần đáp ứng Nghị định 130/2018/NĐ-CP không? Nếu có cần tích hợp CA bên thứ 3 (VNPT CA, Viettel CA)? | Kiến trúc backend, chi phí, timeline | Legal + CTO |
| OQ-02 | Tích hợp Momo/ZaloPay theo phương án nào: Payment Link, in-app SDK, hay QR NAPAS? Chi phí MDR (merchant discount rate)? | P0 feature, chi phí vận hành | Business + Product |
| OQ-03 | Mô hình tính phí: freemium (giới hạn phòng), subscription (chủ nhà), hoa hồng giao dịch, hay kết hợp? | Monetization, product boundary | CEO + Product |
| OQ-04 | Giá điện/nước: có cần hỗ trợ nhiều bậc giá (lũy tiến theo kWh như EVN)? | Phức tạp tính toán, US-012 | Product |
| OQ-05 | App có cần hỗ trợ offline mode đầy đủ (chỉnh sửa dữ liệu offline rồi sync)? | Kiến trúc offline-first phức tạp | CTO + Product |
| OQ-06 | Giới hạn phòng tối đa per chủ nhà trong MVP? (Tránh overscale DB sớm) | Capacity planning | CTO |
| OQ-07 | OCR hóa đơn điện nước: dùng Google ML Kit (on-device) hay API cloud (Google Vision, AWS Textract)? | Chi phí, accuracy, privacy | Engineering |
| OQ-08 | Thông báo SMS backup khi người dùng tắt push: cần không? Chi phí SMS? | UX, chi phí | Product + Business |
| OQ-09 | Có kế hoạch hỗ trợ web app (chủ nhà dùng laptop) trong vòng 12 tháng không? | Có ảnh hưởng đến API design | CEO + Product |
| OQ-10 | Chính sách lưu trữ dữ liệu: hóa đơn + hợp đồng lưu bao nhiêu năm? Tuân thủ quy định nào? | Storage cost, compliance | Legal |

---

### 8.2 Risks

| # | Rủi ro | Mức độ | Khả năng | Giải pháp |
|---|--------|--------|---------|-----------|
| R-01 | **Tích hợp cổng thanh toán chậm hơn dự kiến** — Momo/ZaloPay yêu cầu review và onboarding merchant mất 4–8 tuần | Cao | Cao | Chuẩn bị hồ sơ merchant sớm ngay từ tuần 1; dùng phương án thủ công + QR NAPAS làm fallback cho Alpha |
| R-02 | **Tính hợp pháp của chữ ký điện tử** — Chữ ký vẽ tay trên canvas không đủ hiệu lực pháp lý theo NĐ 130 | Cao | Trung bình | Tham khảo luật sư sớm; xem xét tích hợp eKYC + OTP-confirm làm chữ ký xác thực |
| R-03 | **Chủ nhà không đổi thói quen** — Vẫn thu tiền mặt, dùng sổ tay, không nhập dữ liệu vào app | Cao | Cao | UX phải cực kỳ đơn giản; cần onboarding 1-1 cho batch đầu; có feature "nhập dữ liệu hàng loạt" |
| R-04 | **Người thuê không cài app** — Nếu người thuê không cài, toàn bộ luồng 2 chiều bị phá vỡ | Cao | Cao | Fallback: landlord có thể xác nhận thay tenant (với rủi ro pháp lý); gửi SMS có link web-view cơ bản |
| R-05 | **Webhook thanh toán không đáng tin cậy** — Momo/ZaloPay có thể gửi webhook chậm hoặc không gửi | Trung bình | Trung bình | Thêm polling status API sau X phút; UI cho landlord "xác nhận thủ công" |
| R-06 | **Dữ liệu cá nhân và CCCD** — Vi phạm Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân | Cao | Thấp | Mã hóa dữ liệu nhạy cảm; DPIA; chính sách thu thập dữ liệu rõ ràng; xin ý kiến DPA |
| R-07 | **WebSocket scaling** — Chat realtime với nhiều kết nối đồng thời | Trung bình | Thấp (giai đoạn đầu) | Dùng managed service (Ably, Pusher, Firebase Realtime DB) thay tự build WebSocket server |
| R-08 | **PDF generation chậm** — Tạo PDF hợp đồng từ template HTML phức tạp | Thấp | Thấp | Dùng queue (không blocking); prerender template; cache nếu content không đổi |
| R-09 | **Cạnh tranh** — Các app tương tự (Nhanh.vn, Landlord) cải thiện sản phẩm | Trung bình | Cao | Tập trung vào UX tiếng Việt tốt hơn + thanh toán tích hợp mượt hơn; feedback loop nhanh |
| R-10 | **Scope creep trong MVP** — Pressure từ chủ nhà yêu cầu thêm tính năng P1/P2 vào MVP | Trung bình | Cao | Chốt cứng MVP scope với stakeholders trước khi dev; backlog transparent |

---

### 8.3 Assumptions

1. Chủ nhà tại Việt Nam đã quen với Momo/ZaloPay — không cần giải thích cách dùng
2. Người thuê thường xuyên dùng smartphone và có thể cài app theo yêu cầu của chủ nhà
3. Hợp đồng thuê nhà phổ biến nhất là 6 tháng hoặc 1 năm
4. Chủ nhà quản lý trung bình 1–3 listings, 3–15 phòng
5. Điện và nước được thu theo kỳ tháng (không theo lịch EVN)
6. Không cần hỗ trợ nhiều tiền tệ (chỉ VND)
7. Người dùng mục tiêu sử dụng Android hoặc iOS phiên bản ≥ 2 năm (Android 10+, iOS 15+)

---

*Tài liệu này được tạo ngày 2026-04-16. Phiên bản tiếp theo sẽ cập nhật sau khi có kết quả Alpha.*
