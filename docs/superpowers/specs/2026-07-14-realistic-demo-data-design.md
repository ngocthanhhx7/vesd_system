# Thiết kế dữ liệu mô phỏng trực tiếp cho VESD

## Mục tiêu

Bổ sung một bộ dữ liệu trình diễn vào database hiện tại, không sửa hoặc xóa các
bản ghi đang có. Bộ dữ liệu gồm tài khoản hư cấu có thể đăng nhập, 12 dự án đã
hoàn thành có tổng doanh thu gộp 8.000.000đ và 20 dự án đang tuyển designer.

Trong thiết kế này:

- **Doanh thu** là tổng giá trị gộp của dự án trước khi trừ phí nền tảng.
- **Lợi nhuận/phí nền tảng** là 5% doanh thu.
- Với doanh thu 8.000.000đ, phí nền tảng là 400.000đ và thu nhập ròng của
  designer là 7.600.000đ.

## Phạm vi dữ liệu

Script bổ sung sẽ tạo theo cách idempotent:

- 12 tài khoản client hư cấu có thể đăng nhập;
- 12 tài khoản designer hư cấu có thể đăng nhập;
- 12 dự án mô phỏng ở trạng thái `completed`;
- 12 giao dịch nạp escrow thành công và 12 giao dịch release thành công tương
  ứng với các dự án đã hoàn thành;
- 20 dự án mở ở trạng thái `pending_designer`, không có `designerId`;
- hồ sơ client/designer và ví cần thiết để dữ liệu nhất quán với các màn hình
  hiện có.

Tổng giá trị gộp của 12 dự án hoàn thành là chính xác 8.000.000đ. Ngày hoàn
thành và giao dịch được phân bổ xác định từ 30/06/2026 đến 14/07/2026.

Tài khoản dùng tên tiếng Việt tự nhiên, email theo tên hoặc thương hiệu và mật
khẩu chung `12345678`, đồng nhất với các tài khoản demo hiện có. Không dùng tên
hoặc email dạng đánh số như `Client 01`, `Designer 01`, `user01@...`. Miền
`.test` được dùng để địa chỉ không trùng hộp thư thật, nhưng local-part và tên
miền được viết như email cá nhân/doanh nghiệp bình thường. Dữ liệu mới không có
`isDemo`, `demoLabel`, badge, banner hoặc nội dung nhận diện riêng trên UI. Không
bổ sung trường nhận diện vào schema.

### Danh tính tài khoản khách hàng

| Tên hiển thị | Email |
| --- | --- |
| Nguyễn Minh Anh | `minh.anh@lumina-studio.test` |
| Trần Quốc Huy | `quoc.huy@maycoffee.test` |
| Lê Thu Hà | `thu.ha@anvien-herbal.test` |
| Phạm Gia Bảo | `gia.bao@pawhouse.test` |
| Võ Ngọc Lan | `ngoc.lan@lumi-spa.test` |
| Đặng Hoàng Nam | `hoang.nam@hatnha.test` |
| Bùi Thanh Trúc | `thanh.truc@banmai-coffee.test` |
| Đỗ Khánh Linh | `khanh.linh@suongdem.test` |
| Hồ Đức Anh | `duc.anh@jobmate.test` |
| Ngô Phương Thảo | `phuong.thao@freshday.test` |
| Dương Tuấn Kiệt | `tuan.kiet@doigio.test` |
| Mai Nhật Vy | `nhat.vy@linenlab.test` |

### Danh tính tài khoản designer

| Tên hiển thị | Email |
| --- | --- |
| Lâm Hoài An | `hoai.an@atelier-an.test` |
| Phan Minh Khang | `minh.khang@khangvisual.test` |
| Trịnh Bảo Ngọc | `bao.ngoc@ngocbrand.test` |
| Vũ Anh Quân | `anh.quan@quanui.test` |
| Tạ Quỳnh Chi | `quynh.chi@chistudio.test` |
| Cao Nhật Minh | `nhat.minh@minhworks.test` |
| Đinh Thảo My | `thao.my@mypackaging.test` |
| Lý Hoàng Phúc | `hoang.phuc@phucmotion.test` |
| Chu Gia Hân | `gia.han@hancreative.test` |
| Huỳnh Tuấn Vũ | `tuan.vu@vudesign.test` |
| Nguyễn Hải Yến | `hai.yen@yenillustration.test` |
| Trần Khôi Nguyên | `khoi.nguyen@nguyenproduct.test` |

## Script bổ sung

Tạo script riêng `server/src/seed/seed-demo-data.js` và npm script
`seed:demo`. Script này không import hoặc gọi seed hiện tại vì
`server/src/seed/seed.js` có `dropDatabase()`.

Quy trình của script:

1. Kết nối bằng cấu hình MongoDB hiện có.
2. Upsert tài khoản và hồ sơ theo email và `_id` cố định.
3. Upsert 12 dự án hoàn thành và 20 dự án mở theo `_id` cố định.
4. Upsert cặp giao dịch deposit/release cho từng dự án hoàn thành.
5. Đồng bộ ví mô phỏng bằng giá trị tuyệt đối được tính lại từ fixture, không
   dùng `$inc`, để chạy lại không cộng tiền lần nữa.
6. Kiểm tra hậu điều kiện và dừng với mã lỗi khác 0 nếu số lượng hoặc tổng tiền
   không đúng.

Script chỉ truy vấn và ghi đúng tập `_id` và email cố định do chính script khai
báo. Nó không cập nhật dự án, tài khoản, giao dịch hoặc ví có sẵn ngoài tập đó.

## Sổ cái và cách tính doanh thu

Mỗi dự án hoàn thành có một deposit bằng giá trị gộp và một release gồm:

```js
{
  amount: grossAmount - platformFee,
  platformFee: Math.round(grossAmount * 0.05),
  metadata: {
    grossAmount,
    releaseKey: 'demo-project-completed',
    feeCollectedAt: 'completion'
  }
}
```

Giá trị từng dự án được chọn theo đơn vị cho phép 5% là số nguyên; tổng
`metadata.grossAmount` là 8.000.000đ, tổng `platformFee` là 400.000đ và tổng
`amount` release là 7.600.000đ.

Endpoint admin summary thay cách đặt tên rõ ràng:

- `revenue`: tổng `metadata.grossAmount` của giao dịch `release` thành công;
- `platformProfit`: tổng `platformFee` của giao dịch `release` thành công.

Chỉ tính giao dịch release để deposit và release của cùng một dự án không bị
đếm hai lần. Thẻ `DOANH THU` hiển thị 8.000.000đ; phần mô tả phụ hiển thị
`Phí nền tảng: 400.000đ`.

## Hai mươi dự án đang tuyển

Mỗi dự án mở có:

- `status: 'pending_designer'`;
- không có `designerId`;
- client mô phỏng hợp lệ;
- tiêu đề, mô tả, danh mục, ngân sách, deadline, phong cách và deliverables đa
  dạng;
- nút nhận dự án hoạt động theo luồng hiện tại.

Các dự án này xuất hiện qua endpoint `/projects/open` hiện có và tuân theo bộ
lọc tìm kiếm. Chúng không thay đổi năm dự án mở đang có trong database.

## Xử lý lỗi và tính lặp lại

- Nếu chạy lại, script cập nhật chính bộ fixture theo `_id` và email cố định
  thay vì tạo bản ghi mới.
- Nếu một `_id` cố định đã thuộc về bản ghi có email hoặc quan hệ khác với
  fixture dự kiến, script dừng ngay và không ghi đè.
- Nếu tổng doanh thu khác 8.000.000đ, tổng phí khác 400.000đ, số dự án hoàn
  thành khác 12 hoặc số dự án mở khác 20, script trả lỗi.
- Nếu một bước ghi thất bại, các thao tác chạy trong MongoDB transaction khi
  deployment hỗ trợ transaction; nếu không hỗ trợ, tính idempotent cho phép
  chạy lại an toàn để hoàn tất.

## Kiểm thử

Triển khai tuân theo TDD. Test tự động phải chứng minh:

- fixture có đúng 12 dự án hoàn thành và 20 dự án mở;
- tổng doanh thu gộp là 8.000.000đ;
- tổng phí nền tảng là 400.000đ;
- tổng thu nhập ròng designer là 7.600.000đ;
- ngày giao dịch nằm trong 30/06/2026–14/07/2026;
- dự án mở không có designer và có trạng thái đúng;
- chạy seed hai lần không làm tăng số lượng hoặc số dư ví;
- admin summary không đếm deposit hai lần;
- 24 tài khoản mới đăng nhập được và phân quyền đúng;
- dự án mở có thể được nhận qua luồng hiện tại;
- dữ liệu hiện có không bị thay đổi.

Sau triển khai sẽ chạy test server, test client, build production và xác minh
trực tiếp trên `http://localhost:5173/`.

## Tiêu chí nghiệm thu

Tính năng hoàn tất khi database hiện tại có 12 tài khoản client và 12 tài khoản
designer mới có thể đăng nhập, 12 dự án hoàn thành tạo tổng doanh thu gộp
8.000.000đ và phí nền tảng 400.000đ, 20 dự án chưa có người nhận xuất hiện ở
trang Tìm việc, dashboard phân biệt doanh thu với phí nền tảng, chạy seed lặp
lại không nhân bản dữ liệu, và toàn bộ bản ghi có trước thời điểm seed giữ
nguyên.
