import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, FolderKanban, Search, ShieldAlert, Users } from 'lucide-react';
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
      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <h2 className="text-xl font-black">Vận hành hôm nay</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="dashboard-panel-inset rounded-lg p-4"><p className="text-sm text-muted">Tài khoản cần rà soát</p><p className="text-2xl font-black">{data?.pendingUsers ?? 0}</p></div>
            <div className="dashboard-panel-inset rounded-lg p-4"><p className="text-sm text-muted">Dự án cần can thiệp</p><p className="text-2xl font-black">{data?.projectsNeedingAttention ?? 0}</p></div>
            <div className="dashboard-panel-inset rounded-lg p-4"><p className="text-sm text-muted">Khiếu nại mở</p><p className="text-2xl font-black">{data?.disputes ?? 0}</p></div>
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-black">Lối tắt quản trị</h2>
          <div className="mt-4 grid gap-2">
            <Button variant="secondary">Duyệt người dùng</Button>
            <Button variant="secondary">Theo dõi dự án</Button>
            <Button variant="secondary">Xử lý khiếu nại</Button>
          </div>
        </Card>
      </div>
    </Dashboard>
  );
}

export function AdminListPage({ type }: { type: string }) {
  const query = type === 'users' ? endpoints.adminUsers : type === 'projects' ? endpoints.adminProjects : type === 'disputes' ? endpoints.adminDisputes : endpoints.adminUsers;
  const { data = [] } = useQuery({ queryKey: ['admin', type], queryFn: query });
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const updateUser = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: string }) => endpoints.adminUpdateUserStatus(id, nextStatus),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', type] })
  });
  const updateProject = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: unknown }) => endpoints.updateProject(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', type] })
  });
  const filtered = data.filter((item: any) => {
    const haystack = `${item.name || ''} ${item.email || ''} ${item.title || ''} ${item.reason || ''} ${item.category || ''} ${item.clientId?.name || ''} ${item.designerId?.name || ''}`.toLowerCase();
    const currentStatus = item.status || item.verificationStatus || 'active';
    return (!search || haystack.includes(search.toLowerCase())) && (status === 'all' || currentStatus === status);
  });

  if (type === 'users') {
    return (
      <Dashboard title="Quản lý người dùng">
        <Card className="mb-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên, email, vai trò" />
            </div>
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="pending">Đang chờ</option>
              <option value="banned">Đã khóa</option>
            </Select>
          </div>
        </Card>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base">
              <thead><tr className="border-b border-line"><th className="py-2">Người dùng</th><th>Vai trò</th><th>Xác minh</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
              <tbody>
                {filtered.map((item: any) => (
                  <tr key={item._id} className="border-b border-line align-top">
                    <td className="py-3"><p className="font-bold">{item.name}</p><p className="text-sm text-muted">{item.email}</p></td>
                    <td>{(item.roles || []).join(', ')}</td>
                    <td><StatusBadge status={item.emailVerified ? 'verified' : 'pending'} /></td>
                    <td><StatusBadge status={item.status || 'active'} /></td>
                    <td>
                      <Select className="min-w-36" value={item.status || 'active'} disabled={updateUser.isPending} onChange={(event) => updateUser.mutate({ id: item._id, nextStatus: event.target.value })}>
                        <option value="active">Mở</option>
                        <option value="pending">Chờ xử lý</option>
                        <option value="banned">Khóa</option>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Dashboard>
    );
  }

  if (type === 'projects') {
    return (
      <Dashboard title="Quản lý dự án">
        <Card className="mb-4">
          <div className="grid gap-3 md:grid-cols-[1fr_240px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm dự án, khách hàng, designer" />
            </div>
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              <option value="pending_designer">Chờ designer</option>
              <option value="in_progress">Đang làm</option>
              <option value="submitted">Chờ duyệt</option>
              <option value="final_submitted">Đã bàn giao</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </Select>
          </div>
        </Card>
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((item: any) => (
            <Card key={item._id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase text-muted">{item.category || 'project'}</p>
                  <h2 className="mt-1 text-xl font-black">{item.title}</h2>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <div className="mt-4 grid gap-3 rounded-lg bg-soft p-4 text-sm md:grid-cols-3">
                <div><p className="text-muted">Khách hàng</p><p className="font-bold">{item.clientId?.name || 'N/A'}</p></div>
                <div><p className="text-muted">Designer</p><p className="font-bold">{item.designerId?.name || 'Chưa có'}</p></div>
                <div><p className="text-muted">Ngân sách</p><p className="font-bold">{(item.budget?.agreed || item.budget?.max || 0).toLocaleString('vi-VN')}đ</p></div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                <Select value={item.status || 'pending_designer'} disabled={updateProject.isPending} onChange={(event) => updateProject.mutate({ id: item._id, patch: { status: event.target.value } })}>
                  <option value="pending_designer">Chờ designer</option>
                  <option value="agreement_pending">Chờ thỏa thuận</option>
                  <option value="payment_pending">Chờ thanh toán</option>
                  <option value="escrow_funded">Đã escrow</option>
                  <option value="in_progress">Đang làm</option>
                  <option value="submitted">Chờ duyệt</option>
                  <option value="revision_requested">Yêu cầu chỉnh sửa</option>
                  <option value="final_submitted">Đã bàn giao</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="cancelled">Đã hủy</option>
                </Select>
                <Button variant="secondary" disabled={updateProject.isPending} onClick={() => updateProject.mutate({ id: item._id, patch: { priorityLevel: item.priorityLevel === 'premium' ? 'standard' : 'premium' } })}>
                  {item.priorityLevel === 'premium' ? 'Hạ ưu tiên' : 'Ưu tiên'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </Dashboard>
    );
  }

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

export function AdminWithdrawalsPage() {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['admin-withdrawals'], queryFn: endpoints.adminWithdrawals });
  const syncWithdrawal = useMutation({
    mutationFn: (id: string) => endpoints.adminSyncWithdrawal(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] })
  });

  return (
    <Dashboard title="Yêu cầu rút tiền">
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-base">
            <thead>
              <tr className="border-b border-line">
                <th className="py-2">Người rút</th>
                <th>Số tiền</th>
                <th>Tài khoản nhận</th>
                <th>Nội dung CK</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item: any) => {
                const owner = item.userId || item.designerId;
                return (
                  <tr key={item._id} className="border-b border-line align-top">
                    <td className="py-3">
                      <p className="font-semibold">{owner?.name || 'Người dùng'}</p>
                      <p className="text-sm text-muted">{owner?.email}</p>
                    </td>
                    <td>{item.amount?.toLocaleString('vi-VN')}đ</td>
                    <td>
                      <p>{item.accountInfo?.bankName || item.accountInfo?.toBin}</p>
                      <p className="text-sm text-muted">{item.accountInfo?.toAccountNumber}</p>
                      <p className="text-sm text-muted">{item.accountInfo?.toAccountName}</p>
                      {item.accountInfo?.qrImage?.url && <a className="mt-1 inline-block text-sm font-semibold text-brand" href={item.accountInfo.qrImage.url} target="_blank" rel="noreferrer">Xem QR</a>}
                    </td>
                    <td>
                      <p className="font-semibold">{item.referenceId}</p>
                      <p className="text-sm text-muted">Nhập đúng mã này khi chuyển khoản để Casso đối soát.</p>
                    </td>
                    <td><StatusBadge status={item.status} /></td>
                    <td>
                      {item.method === 'payos' ? (
                        <Button variant="secondary" disabled={syncWithdrawal.isPending || !item.payoutId} onClick={() => syncWithdrawal.mutate(item._id)}>Cập nhật</Button>
                      ) : (
                        <span className="text-sm text-muted">Chờ Casso webhook</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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

