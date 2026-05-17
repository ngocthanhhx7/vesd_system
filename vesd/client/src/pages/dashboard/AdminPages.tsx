import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, FolderKanban, ShieldAlert, Users } from 'lucide-react';
import { Card, Input, Select, StatusBadge, Textarea } from '../../components/ui/Primitives';
import { Button } from '../../components/ui/Button';
import { endpoints } from '../../services/api';
import { Dashboard } from './shared/Dashboard';
import { Metric } from './shared/Metric';

const adminTitles: Record<string, string> = {
  users: 'Quản lý người dùng',
  projects: 'Quản lý dự án',
  disputes: 'Quản lý khiếu nại'
};

const discountScopeLabels: Record<string, string> = {
  all: 'Tất cả',
  premium: 'Premium',
  project: 'Escrow dự án'
};

const discountRoleLabels: Record<string, string> = {
  both: 'Designer và doanh nghiệp',
  client: 'Doanh nghiệp',
  designer: 'Designer'
};

export function AdminDashboard() {
  const { data } = useQuery({ queryKey: ['admin-summary'], queryFn: endpoints.dashboardSummary });
  return (
    <Dashboard title="Tổng quan quản trị">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Người dùng" value={data?.users ?? 0} icon={Users} />
        <Metric label="Dự án đang chạy" value={data?.activeProjects ?? 0} icon={FolderKanban} />
        <Metric label="Doanh thu" value={(data?.revenue || 0).toLocaleString('vi-VN')} icon={CreditCard} />
        <Metric label="Khiếu nại" value={data?.disputes ?? 0} icon={ShieldAlert} />
      </div>
    </Dashboard>
  );
}

export function AdminListPage({ type }: { type: string }) {
  const query = type === 'users' ? endpoints.adminUsers : type === 'projects' ? endpoints.adminProjects : type === 'disputes' ? endpoints.adminDisputes : endpoints.adminUsers;
  const { data = [] } = useQuery({ queryKey: ['admin', type], queryFn: query });
  return (
    <Dashboard title={adminTitles[type] || 'Quản trị'}>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-base">
            <thead><tr className="border-b border-line"><th className="py-2">Tên/Tiêu đề</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>
              {data.map((item: any) => (
                <tr key={item._id} className="border-b border-line">
                  <td className="py-3">{item.name || item.title || item.reason || item.email}</td>
                  <td><StatusBadge status={item.status || item.verificationStatus} /></td>
                  <td><Button variant="secondary">Xem</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Dashboard>
  );
}

export function AdminSimplePage({ title }: { title: string }) {
  return (
    <Dashboard title={title}>
      <Card>
        <p className="text-muted">Quản lý, tìm kiếm, lọc và cập nhật dữ liệu.</p>
        <div className="mt-4 flex gap-3"><Input placeholder="Tìm kiếm" /><Button>Lưu thay đổi</Button></div>
      </Card>
    </Dashboard>
  );
}

const emptyDiscount = {
  code: '',
  name: '',
  description: '',
  discountType: 'percent',
  value: '20',
  maxDiscount: '',
  minOrderAmount: '',
  appliesTo: 'premium',
  roleTarget: 'both',
  usageLimit: '',
  endsAt: '',
  showOnHome: false,
  isActive: true
};

export function AdminDiscountsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyDiscount);
  const { data = [] } = useQuery({ queryKey: ['admin-discounts'], queryFn: endpoints.adminDiscounts });
  const createDiscount = useMutation({
    mutationFn: () => endpoints.createDiscount(toDiscountPayload(form)),
    onSuccess: async () => {
      setForm(emptyDiscount);
      await queryClient.invalidateQueries({ queryKey: ['admin-discounts'] });
      await queryClient.invalidateQueries({ queryKey: ['public-premium-discounts'] });
    }
  });
  const updateDiscount = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: unknown }) => endpoints.updateDiscount(id, patch),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-discounts'] });
      await queryClient.invalidateQueries({ queryKey: ['public-premium-discounts'] });
    }
  });

  function setField(key: keyof typeof emptyDiscount, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    createDiscount.mutate();
  }

  return (
    <Dashboard title="Quản lý mã giảm giá">
      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <Card>
          <h2 className="text-xl font-black">Thêm mã giảm giá</h2>
          <form className="mt-4 grid gap-3" onSubmit={submit}>
            <Input placeholder="Mã, ví dụ VESD20" value={form.code} onChange={(event) => setField('code', event.target.value.toUpperCase())} required />
            <Input placeholder="Tên chương trình" value={form.name} onChange={(event) => setField('name', event.target.value)} />
            <Textarea placeholder="Mô tả" value={form.description} onChange={(event) => setField('description', event.target.value)} />
            <div className="grid gap-3 md:grid-cols-2">
              <Select value={form.discountType} onChange={(event) => setField('discountType', event.target.value)}>
                <option value="percent">Phần trăm</option>
                <option value="fixed">Số tiền cố định</option>
              </Select>
              <Input type="number" min="0" placeholder="Giá trị" value={form.value} onChange={(event) => setField('value', event.target.value)} required />
              <Input type="number" min="0" placeholder="Giảm tối đa" value={form.maxDiscount} onChange={(event) => setField('maxDiscount', event.target.value)} />
              <Input type="number" min="0" placeholder="Đơn tối thiểu" value={form.minOrderAmount} onChange={(event) => setField('minOrderAmount', event.target.value)} />
              <Select value={form.appliesTo} onChange={(event) => setField('appliesTo', event.target.value)}>
                <option value="premium">Premium</option>
                <option value="project">Escrow dự án</option>
                <option value="all">Tất cả</option>
              </Select>
              <Select value={form.roleTarget} onChange={(event) => setField('roleTarget', event.target.value)}>
                <option value="both">Designer và doanh nghiệp</option>
                <option value="designer">Designer</option>
                <option value="client">Doanh nghiệp</option>
              </Select>
              <Input type="number" min="0" placeholder="Giới hạn lượt dùng" value={form.usageLimit} onChange={(event) => setField('usageLimit', event.target.value)} />
              <Input type="date" value={form.endsAt} onChange={(event) => setField('endsAt', event.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-base"><input className="h-5 w-5 accent-brand" type="checkbox" checked={form.isActive} onChange={(event) => setField('isActive', event.target.checked)} />Kích hoạt ngay</label>
            <label className="flex items-center gap-2 text-base"><input className="h-5 w-5 accent-brand" type="checkbox" checked={form.showOnHome} onChange={(event) => setField('showOnHome', event.target.checked)} />Hiển thị ở trang chủ</label>
            <Button disabled={createDiscount.isPending}>{createDiscount.isPending ? 'Đang lưu...' : 'Tạo mã giảm giá'}</Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-xl font-black">Mã đang có</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-base">
              <thead><tr className="border-b border-line"><th className="py-2">Mã</th><th>Áp dụng</th><th>Giá trị</th><th>Lượt dùng</th><th>Trang chủ</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
              <tbody>
                {data.map((item: any) => (
                  <tr key={item._id} className="border-b border-line">
                    <td className="py-3 font-bold">{item.code}<p className="text-sm font-normal text-muted">{item.name}</p></td>
                    <td>{discountScopeLabels[item.appliesTo] || item.appliesTo} / {discountRoleLabels[item.roleTarget] || item.roleTarget}</td>
                    <td>{item.discountType === 'percent' ? `${item.value}%` : `${item.value?.toLocaleString('vi-VN')}đ`}</td>
                    <td>{item.usedCount || 0}{item.usageLimit ? `/${item.usageLimit}` : ''}</td>
                    <td><Button variant={item.showOnHome ? 'primary' : 'secondary'} disabled={updateDiscount.isPending} onClick={() => updateDiscount.mutate({ id: item._id, patch: { showOnHome: !item.showOnHome } })}>{item.showOnHome ? 'Đang hiển thị' : 'Chọn'}</Button></td>
                    <td><StatusBadge status={item.isActive ? 'active' : 'cancelled'} /></td>
                    <td><Button variant="secondary" disabled={updateDiscount.isPending} onClick={() => updateDiscount.mutate({ id: item._id, patch: { isActive: !item.isActive } })}>{item.isActive ? 'Tắt' : 'Bật'}</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Dashboard>
  );
}

function toDiscountPayload(form: typeof emptyDiscount) {
  return {
    code: form.code,
    name: form.name,
    description: form.description,
    discountType: form.discountType,
    value: Number(form.value),
    maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
    minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : 0,
    appliesTo: form.appliesTo,
    roleTarget: form.roleTarget,
    usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
    startsAt: new Date().toISOString(),
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
    showOnHome: form.showOnHome,
    isActive: form.isActive
  };
}
