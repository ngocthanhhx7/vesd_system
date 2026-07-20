# Thiết kế báo cáo analytics 1/7/30 ngày và biểu đồ trực quan

## 1. Mục tiêu

Điều chỉnh trang `/admin/analytics` để số liệu ở các mốc 1, 7 và 30 ngày có ranh giới thời gian nhất quán theo giờ Việt Nam, đồng thời thay biểu đồ SVG tự vẽ bằng biểu đồ có trục, tooltip, đơn vị và khả năng co giãn tốt.

Phạm vi là analytics toàn nền tảng VESD. Repo không có miền dữ liệu MOOC riêng; cụm “các mooc” được hiểu là “các mốc”.

## 2. Phương án

### Phương án được chọn: giữ API, chuẩn hóa backend và dùng Recharts

- Giữ các range key `1d`, `7d`, `30d`, `all` và cấu trúc response hiện có.
- Chuẩn hóa range theo ngày lịch `Asia/Ho_Chi_Minh` ở backend.
- Dùng Recharts cho time-series, nguồn traffic và funnel; giữ card KPI và gauge CSS phù hợp.
- Tách các helper format/chuyển đổi dữ liệu để kiểm thử độc lập.

Đây là phương án nhanh nhất, ít rủi ro tương thích và cung cấp đầy đủ tooltip, axes, grid, responsive.

### Phương án không chọn

1. Tiếp tục SVG thuần: bundle nhỏ nhưng phải tự xây tooltip, axes, responsive và accessibility.
2. uPlot/canvas: hiệu năng cao nhưng chi phí wrapper và tương tác lớn hơn nhu cầu dashboard hiện tại.

## 3. Quy tắc thời gian

Múi giờ nghiệp vụ duy nhất là `Asia/Ho_Chi_Minh`.

- `1d`: từ 00:00:00 hôm nay đến thời điểm hiện tại theo giờ Việt Nam; đúng 1 date key.
- `7d`: hôm nay và 6 ngày lịch trước đó; tối đa 7 date key.
- `30d`: hôm nay và 29 ngày lịch trước đó; tối đa 30 date key.
- `all`: từ `ANALYTICS_START_DATE` đến hiện tại.

Backend trả `startDate` là thời điểm bắt đầu ngày Việt Nam được biểu diễn dưới dạng ISO UTC và `endDate` là thời điểm hiện tại. Query bảng daily metric dùng trực tiếp `startKey`/`endKey` theo ngày Việt Nam, không suy ngược từ UTC.

Các helper kiểm tra event trong cùng ngày cũng phải dùng ranh giới Việt Nam để tránh lệch dữ liệu từ 00:00 đến 06:59.

## 4. Hiệu chỉnh dữ liệu mô phỏng

Dashboard hiện dùng backfill mô phỏng kết hợp event quan sát. Phần dữ liệu mô phỏng được hiệu chỉnh để các tỷ lệ có quan hệ hợp lý, nhưng công thức tổng hợp vẫn tính từ số đếm gốc:

- Bounce rate theo ngày dao động tự nhiên trong khoảng 21–23%; tổng hợp các mốc cũng nằm gần khoảng này.
- Conversion rate (`escrowPaid / sessions`) nằm trong khoảng 1–2%, mục tiêu trung tâm khoảng 1,3–1,6%.
- Funnel tiếp tục thỏa `registrations >= contacts >= projectsCreated >= escrowPaid`.
- Không clamp hoặc ghi đè tỷ lệ cuối cùng trong UI; event quan sát thật vẫn được cộng vào số đếm và có thể làm tỷ lệ thay đổi.
- Biến thiên theo ngày và cuối tuần được giữ ở mức nhỏ để biểu đồ không thành đường thẳng giả tạo.

## 5. Giao diện báo cáo

### Bộ lọc

Thay select bằng nhóm nút rõ ràng: `Hôm nay`, `7 ngày`, `30 ngày`, `Toàn bộ`. Trạng thái đang chọn có màu thương hiệu và `aria-pressed`.

### Tổng quan

Giữ 4 KPI chính: phiên truy cập, người dùng, lượt xem trang và tỷ lệ chuyển đổi. Mỗi KPI có mô tả ngắn theo range đang chọn.

### Biểu đồ

- Traffic: Area chart cho phiên, người dùng và lượt xem; trục X là ngày, trục Y định dạng số; tooltip hiển thị đủ ba chỉ số.
- Tỷ lệ: Line chart cho bounce rate và conversion rate; đơn vị `%`, miền 0–100 khi phù hợp.
- Web Vitals: line charts có đơn vị đúng (`s`, `ms`, điểm CLS), màu theo nhóm chỉ số.
- Nguồn truy cập: horizontal bar chart có số lượng và phần trăm.
- Funnel: bar chart theo thứ tự đăng ký → liên hệ → dự án → escrow → premium, kèm tỷ lệ giữ lại so với bước đầu.

Mọi chart đặt trong `ResponsiveContainer`, có grid nhẹ, tooltip, legend khi có nhiều series, trạng thái rỗng và `aria-label`/tiêu đề mô tả.

## 6. Dữ liệu và tương thích

- Không đổi endpoint `/admin/analytics` và `/admin/analytics/ai-report`.
- Không migration database.
- Không xóa hoặc thay đổi cơ chế backfill trong phạm vi này.
- Không thay định nghĩa user/session hiện hữu; chỉ sửa ranh giới ngày và cách trình bày.
- Các giá trị thiếu được hiển thị là chưa có dữ liệu, không tạo `NaN` hoặc đường biểu đồ sai.

## 7. Loading, lỗi và responsive

- Giữ loading/error hiện tại nhưng thêm skeleton hoặc khung trạng thái có chiều cao ổn định cho chart.
- Mobile hiển thị một cột, chart cao tối thiểu 260px và tooltip không tràn viewport.
- Desktop dùng grid 2 cột cho các chart nhỏ, chart tổng quan chiếm toàn chiều ngang.

## 8. Kiểm thử

### Backend

- Range tại thời điểm trước và sau 00:00 Việt Nam.
- Chính xác 1/7/30 date key, kể cả qua tháng/năm.
- `all` vẫn bắt đầu từ ngày khởi tạo analytics.
- Query `getAdminAnalytics` dùng đúng `startKey`/`endKey` Việt Nam.
- Dữ liệu synthetic giữ bounce rate 21–23%, conversion rate 1–2% và thứ tự funnel hợp lệ.

### Frontend

- Mapping nhãn range và định dạng ngày Việt Nam.
- Chuẩn hóa series không sinh giá trị lỗi.
- Nút range đổi query key và trạng thái chọn.
- Chart render trạng thái dữ liệu/rỗng với nhãn truy cập được.

### Xác minh

- Toàn bộ test client/server đạt.
- Build production đạt.
- QA desktop và mobile trên trang admin analytics.
- So sánh kích thước bundle; trang analytics được tải theo route nếu việc tách module hiện tại cho phép mà không mở rộng refactor.

## 9. Tiêu chí nghiệm thu

- 1/7/30 ngày không lệch ngày trong 7 giờ đầu ngày Việt Nam.
- Số điểm daily series không vượt quá số ngày của range.
- Tỷ lệ mô phỏng ở các mốc đạt bounce rate khoảng 21–23% và conversion rate khoảng 1–2% mà không sửa công thức hiển thị.
- Biểu đồ có ngày, đơn vị, tooltip, grid và responsive.
- Không phá route, AI report, tracking hoặc dashboard khác.
- Test và build đều đạt, không có lỗi console mới.
