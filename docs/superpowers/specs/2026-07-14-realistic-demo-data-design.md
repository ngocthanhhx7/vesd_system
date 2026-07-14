# Thiết kế dữ liệu mô phỏng trực tiếp cho VESD

## Mục tiêu

Bổ sung một bộ dữ liệu mô phỏng có thể nhận biết rõ ràng vào database hiện tại,
không sửa hoặc xóa các bản ghi đang có. Bộ dữ liệu phục vụ trình diễn gồm tài
khoản hư cấu, 12 dự án đã hoàn thành có tổng doanh thu gộp 8.000.000đ và 20 dự
án đang tuyển designer.

Trong thiết kế này:

- **Doanh thu** là tổng giá trị gộp của dự án trước khi trừ phí nền tảng.
- **Lợi nhuận/phí nền tảng** là 5% doanh thu.
- Với doanh thu 8.000.000đ, phí nền tảng là 400.000đ và thu nhập ròng của
  designer là 7.600.000đ.

## Phạm vi dữ liệu

Script bổ sung sẽ tạo theo cách idempotent:

- 12 tài khoản client hư cấu;
- 12 tài khoản designer hư cấu;
- 12 dự án mô phỏng ở trạng thái `completed`;
- 12 giao dịch nạp escrow thành công và 12 giao dịch release thành công tương
  ứng với các dự án đã hoàn thành;
- 20 dự án mở ở trạng thái `pending_designer`, không có `designerId`;
- hồ sơ client/designer và ví cần thiết để dữ liệu nhất quán với các màn hình
  hiện có.

Tổng giá trị gộp của 12 dự án hoàn thành là chính xác 8.000.000đ. Ngày hoàn
thành và giao dịch được phân bổ xác định từ 30/06/2026 đến 14/07/2026.

## Nhận diện dữ liệu mô phỏng

Các schema User, Project và Transaction được bổ sung ba trường:

```js
isDemo: { type: Boolean, default: false, index: true },
demoLabel: String,
demoSeedKey: { type: String, sparse: true }
```

`demoSeedKey` có unique index phù hợp để mỗi thực thể chỉ được tạo một lần.
Mọi bản ghi do script tạo dùng:

```js
{
  isDemo: true,
  demoLabel: 'Dữ liệu mô phỏng phục vụ đồ án'
}
```

Email tài khoản mô phỏng dùng miền dành riêng `example.com`. UI hiển thị banner
ở trang tổng quan và badge `Mô phỏng` tại từng tài khoản/dự án mô phỏng. Các
thao tác quản trị hoặc nhận việc đối với bản ghi mô phỏng bị vô hiệu hóa để
không biến dữ liệu trình diễn thành giao dịch vận hành thật.

## Script bổ sung

Tạo script riêng `server/src/seed/seed-demo-data.js` và npm script
`seed:demo`. Script này không import hoặc gọi seed hiện tại vì
`server/src/seed/seed.js` có `dropDatabase()`.

Quy trình của script:

1. Kết nối bằng cấu hình MongoDB hiện có.
2. Upsert tài khoản và hồ sơ theo `demoSeedKey`/email cố định.
3. Upsert 12 dự án hoàn thành và 20 dự án mở theo khóa cố định.
4. Upsert cặp giao dịch deposit/release cho từng dự án hoàn thành.
5. Đồng bộ ví mô phỏng bằng giá trị tuyệt đối được tính lại từ fixture, không
   dùng `$inc`, để chạy lại không cộng tiền lần nữa.
6. Kiểm tra hậu điều kiện và dừng với mã lỗi khác 0 nếu số lượng hoặc tổng tiền
   không đúng.

Script chỉ truy vấn và ghi các bản ghi có `isDemo: true` cùng seed key thuộc bộ
dữ liệu này. Nó không cập nhật dự án, tài khoản, giao dịch hoặc ví hiện có.

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
- badge `Mô phỏng` và nút nhận dự án bị vô hiệu hóa.

Các dự án này xuất hiện qua endpoint `/projects/open` hiện có và tuân theo bộ
lọc tìm kiếm. Chúng không thay đổi năm dự án mở đang có trong database.

## Xử lý lỗi và tính lặp lại

- Nếu chạy lại, script cập nhật chính bộ fixture theo seed key thay vì tạo bản
  ghi mới.
- Nếu phát hiện seed key trùng với bản ghi không mang `isDemo: true`, script
  dừng ngay và không ghi đè.
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
- dữ liệu mô phỏng có nhãn và các nút mutation bị vô hiệu hóa;
- dữ liệu hiện có không bị thay đổi.

Sau triển khai sẽ chạy test server, test client, build production và xác minh
trực tiếp trên `http://localhost:5173/`.

## Tiêu chí nghiệm thu

Tính năng hoàn tất khi database hiện tại có đúng bộ fixture được gắn nhãn, 12
dự án hoàn thành tạo tổng doanh thu gộp 8.000.000đ và phí nền tảng 400.000đ,
20 dự án mô phỏng chưa có người nhận xuất hiện ở trang Tìm việc, dashboard phân
biệt doanh thu với phí nền tảng, chạy seed lặp lại không nhân bản dữ liệu, và
toàn bộ bản ghi có trước thời điểm seed giữ nguyên.
