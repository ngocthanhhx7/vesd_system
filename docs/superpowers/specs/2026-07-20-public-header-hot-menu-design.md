# Đặc tả thiết kế Header “Đang Hot”

**Ngày:** 2026-07-20

**Phạm vi:** Header công khai trên desktop và mega-menu “Đang Hot”

**Nguồn chuẩn:** ảnh chụp thiết kế Figma node `388:3215` do người dùng cung cấp

## 1. Mục tiêu

Chỉnh Header công khai hiện tại để khớp mẫu thiết kế ở trạng thái desktop, gồm thanh điều hướng màu xanh và mega-menu đang mở. Yêu cầu “giống 100%” được hiểu là khớp về nội dung, thứ tự, bố cục, tỷ lệ, khoảng cách, màu sắc, kiểu chữ và trạng thái tương tác quan sát được trong ảnh mục tiêu.

Việc thay đổi không được làm hỏng điều hướng theo vai trò, đăng nhập, tìm kiếm, tin nhắn, menu tài khoản, trang dịch vụ hoặc Header của Dashboard.

## 2. Phạm vi thay đổi

### Trong phạm vi

- Thanh Header desktop của `PublicLayout`.
- Logo, vị trí và khoảng cách các mục điều hướng.
- Đổi nhãn `Danh mục` thành `Đang Hot` và giữ biểu tượng chevron.
- Mega-menu desktop mở bên dưới Header.
- Nội dung, thứ tự và cách nhóm danh mục theo đúng ảnh thiết kế.
- Trạng thái hover, focus bàn phím và mở/đóng menu.
- Đồng bộ nhãn liên quan trên mobile nhưng không thiết kế lại toàn bộ menu mobile nếu ảnh mẫu không quy định.
- Kiểm thử hồi quy các URL và hành vi Header hiện có.

### Ngoài phạm vi

- Header của khu vực `/admin`, `/client`, `/designer`.
- Nội dung trang dịch vụ `/services/:slug`.
- Luồng xác thực, tìm việc, dự án, tin nhắn và tài khoản.
- Thay đổi API hoặc database.

## 3. Cấu trúc Header mục tiêu

Thứ tự từ trái sang phải:

1. Logo VESD màu trắng.
2. `Thuê Freelancer`.
3. `Tìm việc`.
4. `Đang Hot` kèm chevron hướng xuống.
5. `Dự án`.
6. Biểu tượng tìm kiếm.
7. Biểu tượng thư.
8. Biểu tượng tài khoản ở trạng thái khách; avatar ở trạng thái đã đăng nhập.

Thanh Header giữ nền xanh thương hiệu, chữ và biểu tượng trắng. Kích thước logo, chiều cao thanh, khoảng cách điều hướng và cụm biểu tượng phải được hiệu chỉnh dựa trên ảnh chuẩn thay vì giữ nguyên các giá trị hiện tại nếu chúng khác mẫu.

## 4. Nội dung mega-menu mục tiêu

Mega-menu chỉ có bốn cột nội dung ở hàng trên. Nhóm `Khác` nằm tiếp dưới nhóm cột đầu tiên.

### Cột 1 — Thiết kế thương hiệu (Branding)

- Thiết kế Logo
- Thiết kế Brand Identity
- Thiết kế Brand Guidelines
- Thiết kế Logo animation
- Thiết kế Business card
- Thiết kế Brand kit
- Thiết kế Letterhead

#### Khác

- Khám phá thêm
- Yêu cầu thêm danh mục

### Cột 2 — Thiết kế UI / UX

- Thiết kế Website UI
- Thiết kế Mobile App UI
- Thiết kế Landing Page
- Thiết kế Dashboard / SaaS
- Thiết kế Design System
- Wireframe

### Cột 3 — Thiết kế đồ họa (Graphic Design)

- Poster
- Banner quảng cáo
- Infographic
- Brochure
- Billboard quảng cáo
- Social media post

### Cột 4 — Thiết kế 3D

- Thiết kế 3D
- 3D Product Render
- 3D Game Asset

Các nhóm `AI và công nghệ mới`, `Minh họa và nghệ thuật`, `Chuyển động` không xuất hiện trong mega-menu mục tiêu.

## 5. Bố cục mega-menu

- Bảng trắng bắt đầu ngay dưới mép dưới Header, không có khe hở gây mất trạng thái hover.
- Nền trắng phủ hết vùng ngang giống ảnh chuẩn; nội dung bên trong dùng cùng trục căn với Header.
- Bốn cột có độ rộng và khoảng cách ổn định; tiêu đề cột màu xanh và danh sách màu đen.
- Nội dung nằm sát vùng trên của bảng theo khoảng đệm trong ảnh; phần trắng còn lại không được lấp bằng nhóm phụ ngoài thiết kế.
- Không dùng bóng đổ hoặc đường viền nổi bật nếu ảnh chuẩn không thể hiện chúng.
- Các dòng dài được xuống dòng giống mẫu, đặc biệt tiêu đề Branding và Graphic Design.
- `Khác` nằm trong luồng dọc của cột 1, không tạo một hàng grid thứ hai độc lập.

## 6. Hành vi tương tác

- Hover hoặc focus vào `Đang Hot` mở mega-menu.
- Di chuyển chuột từ trigger xuống bảng không làm bảng đóng giữa chừng.
- Rời cả trigger và bảng sẽ đóng menu.
- Có thể mở bằng bàn phím; `aria-expanded` phản ánh đúng trạng thái.
- Nhấn `Escape` đóng menu và trả focus phù hợp.
- Mỗi mục dịch vụ tiếp tục điều hướng tới `/services/:slug`.
- Các nút tìm kiếm, thư, tài khoản và điều hướng theo vai trò giữ nguyên logic hiện tại.

## 7. Mô hình dữ liệu và cô lập thay đổi

Tạo cấu hình riêng cho mega-menu desktop mục tiêu hoặc cấu trúc dữ liệu hỗ trợ nhóm lồng `Khác`. Không phụ thuộc vào `hotMenu.slice(...)` theo vị trí vì cách này khiến desktop và mobile vô tình tác động lẫn nhau.

Hàm tạo slug hiện tại được giữ tương thích. Mọi nhãn mới phải có URL xác định và được kiểm thử để tránh link rỗng hoặc sai route.

## 8. Responsive

- Ở breakpoint desktop, Header và menu phải khớp ảnh chuẩn.
- Ở kích thước hẹp hơn, không để menu tràn ngang hoặc che sai vùng trang.
- Mobile tiếp tục sử dụng hamburger và các luồng hiện tại; nhãn danh mục được đổi thành `Đang Hot` nếu xuất hiện.
- Không ép bố cục desktop bốn cột vào mobile khi thiết kế không cung cấp trạng thái mobile tương ứng.

## 9. Tiêu chí nghiệm thu

- Ảnh chụp trạng thái khách, mega-menu mở, được so sánh trực tiếp với ảnh mục tiêu ở cùng viewport; không còn khác biệt có thể nhận thấy về trục căn, khoảng cách, cỡ chữ, màu sắc và nội dung.
- Header hiển thị đúng `Đang Hot`, không còn `Danh mục` ở vị trí trigger desktop.
- Đúng bốn cột và đúng toàn bộ chuỗi văn bản trong mục 4.
- `Khác` nằm dưới Branding ở cột 1.
- Không còn ba nhóm bị loại trong mega-menu desktop.
- Tất cả liên kết dịch vụ mở đúng route.
- Hover, bàn phím và đóng/mở menu hoạt động ổn định.
- Trạng thái khách và người dùng đăng nhập đều giữ đủ chức năng.
- Build và toàn bộ test tự động đạt; không có lỗi console mới khi QA trên `http://localhost:5173/`.

## 10. Chiến lược kiểm thử

1. Test dữ liệu: thứ tự nhóm, nội dung từng nhóm và slug.
2. Test component: trigger `Đang Hot`, cấu trúc bốn cột, nhóm `Khác`, href và thuộc tính truy cập bàn phím.
3. Test tương tác: mở bằng hover/focus, đóng bằng rời vùng/Escape, click link.
4. Test hồi quy: các đường dẫn theo trạng thái khách, client, designer và admin.
5. QA responsive: desktop chuẩn theo ảnh, desktop hẹp và mobile.
6. Visual QA: chụp ảnh cùng viewport và đối chiếu overlay/diff với ảnh thiết kế.

## 11. Rủi ro và biện pháp kiểm soát

- **Sai tỷ lệ do ảnh Figma bị scale:** dùng cùng viewport và visual diff, hiệu chỉnh theo tỷ lệ của toàn khung thay vì đo trực tiếp pixel ảnh thu nhỏ.
- **Menu đóng khi rê chuột:** trigger và panel dùng chung vùng tương tác liên tục.
- **Đổi dữ liệu làm thay đổi mobile:** tách cấu hình desktop khỏi danh sách mobile.
- **Tên mới làm đổi slug:** lập bảng nhãn → URL và khóa bằng test.
- **Thay Header ảnh hưởng toàn trang công khai:** QA trên trang chủ, danh sách designer, trang dịch vụ và các trang xác thực.
