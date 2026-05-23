import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, CheckCircle2, Clock, CreditCard } from 'lucide-react';
import { Badge, Card, Input, Select, StatusBadge, Textarea } from '../../components/ui/Primitives';
import { Button } from '../../components/ui/Button';
import { endpoints } from '../../services/api';
import { Dashboard } from './shared/Dashboard';
import { Metric } from './shared/Metric';

const agreementFields = ['Phạm vi công việc', 'Chi phí', 'Mốc thanh toán', 'Hạn bàn giao', 'Số lần chỉnh sửa', 'File bàn giao', 'Quyền sở hữu', 'Điều kiện hoàn tiền/khiếu nại'];
const workspaceSteps = ['Brief đã xác nhận', 'Đã gửi concept', 'Phản hồi', 'Bàn giao cuối'];
const checklistItems = ['File nguồn AI/PSD', 'PNG nền trong suốt', 'PDF vector', 'SVG', 'JPG xem trước', 'Tên font', 'Mã màu'];

export function CreateProjectPage() {
  return (
    <Dashboard title="Tạo brief dự án">
      <Card className="border-line">
        <div className="mb-5 rounded-lg bg-brand p-5 text-white">
          <h2 className="text-2xl font-black">Đăng brief rõ ràng để ghép designer nhanh hơn</h2>
          <p className="text-base text-soft">Phạm vi, file bàn giao, số lần chỉnh sửa và deadline sẽ được đưa vào thỏa thuận và escrow.</p>
        </div>
        <form className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Tên dự án" />
          <Select>
            <option>Thiết kế logo</option>
            <option>Nhận diện thương hiệu</option>
            <option>Thiết kế mạng xã hội</option>
          </Select>
          <Textarea className="md:col-span-2" placeholder="Mô tả dự án" />
          <Input placeholder="Đối tượng khách hàng" />
          <Input placeholder="Phong cách mong muốn" />
          <Input placeholder="Ngân sách tối thiểu" />
          <Input placeholder="Ngân sách tối đa" />
          <Input type="date" />
          <Input placeholder="File cần bàn giao" />
          <Select><option>2 lần chỉnh sửa</option><option>3 lần chỉnh sửa</option></Select>
          <Select><option>Mới bắt đầu</option><option>Trung cấp</option><option>Chuyên gia</option></Select>
          <label className="flex items-center gap-2 text-base"><input type="checkbox" /> Cần bàn giao gấp</label>
          <label className="flex items-center gap-2 text-base"><input type="checkbox" /> Cần hỗ trợ in ấn</label>
          <Button className="md:col-span-2">Đăng dự án</Button>
        </form>
      </Card>
    </Dashboard>
  );
}

export function MatchingPage() {
  const { data } = useQuery({ queryKey: ['match'], queryFn: () => endpoints.designers('?limit=6&sort=popularity') });
  return (
    <Dashboard title="Kết quả ghép designer">
      <div className="grid gap-4 md:grid-cols-3">
        {data?.items?.map((d: any, i: number) => (
          <Card key={d._id}>
            <Badge tone="success">{92 - i * 4}% phù hợp</Badge>
            <h3 className="mt-3 font-bold">{d.userId?.name}</h3>
            <p className="text-base text-muted">Phù hợp danh mục, phong cách và ngân sách trong brief.</p>
            <Button className="mt-4 w-full">Mời designer</Button>
          </Card>
        ))}
      </div>
    </Dashboard>
  );
}

export function AgreementPage() {
  return (
    <Dashboard title="Thỏa thuận dự án">
      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          {agreementFields.map((field) => (
            <div key={field}>
              <p className="text-base text-muted">{field}</p>
              <p className="font-semibold">Thông tin thỏa thuận mẫu cho dự án.</p>
            </div>
          ))}
        </div>
        <Button className="mt-6">Xác nhận thỏa thuận</Button>
      </Card>
    </Dashboard>
  );
}

export function EscrowPage() {
  const [message, setMessage] = useState('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderCode = params.get('orderCode');
    if (params.get('payos') !== 'success' || !orderCode) return;
    endpoints.syncPayosPayment(orderCode)
      .then(() => setMessage('payOS đã xác nhận thanh toán escrow thành công.'))
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Chưa thể xác nhận thanh toán payOS'));
  }, []);
  return (
    <Dashboard title="Thanh toán escrow">
      <Card>
        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Số tiền thanh toán" value="2.500.000đ" icon={CreditCard} />
          <Metric label="Phí nền tảng" value="200.000đ" icon={BarChart3} />
          <Metric label="Tổng cộng" value="2.700.000đ" icon={CheckCircle2} />
          <Metric label="Trạng thái" value="Đang chờ" icon={Clock} />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {['Chuyển khoản ngân hàng', 'MoMo', 'VNPay', 'Thẻ'].map((method) => <Button key={method} variant="secondary">{method}</Button>)}
        </div>
        {message && <p className="mt-3 text-sm text-muted">{message}</p>}
      </Card>
    </Dashboard>
  );
}

export function WorkspacePage({ designer = false }: { designer?: boolean }) {
  return (
    <Dashboard title={designer ? 'Không gian dự án của designer' : 'Không gian dự án của khách hàng'}>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <h2 className="font-bold">Tiến độ milestone</h2>
          {workspaceSteps.map((step, index) => (
            <div key={step} className="mt-4 flex gap-3">
              <div className="mt-1 h-3 w-3 rounded-full bg-brand" />
              <div>
                <p className="font-semibold">{step}</p>
                <p className="text-base text-muted">{index < 2 ? 'Hoàn thành' : 'Đang chờ xử lý'}</p>
              </div>
            </div>
          ))}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button>{designer ? 'Tải bản nháp lên' : 'Duyệt milestone'}</Button>
            <Button variant="secondary">{designer ? 'Tải file cuối lên' : 'Yêu cầu chỉnh sửa'}</Button>
            <Button variant="danger">Mở khiếu nại</Button>
          </div>
        </Card>
        <Card>
          <h2 className="font-bold">Trao đổi và phản hồi</h2>
          <Textarea className="mt-4" placeholder="Nhập phản hồi tập trung tại đây" />
          <Button className="mt-3 w-full">Gửi</Button>
        </Card>
      </div>
    </Dashboard>
  );
}

export function ChecklistPage() {
  return (
    <Dashboard title="Checklist bàn giao file">
      <Card>
        {checklistItems.map((item, index) => (
          <div key={item} className="flex items-center justify-between border-b border-line py-3 last:border-0">
            <span>{item}</span>
            <StatusBadge status={index < 4 ? 'approved' : 'pending'} />
          </div>
        ))}
        <Button className="mt-5">Duyệt bàn giao cuối</Button>
      </Card>
    </Dashboard>
  );
}
