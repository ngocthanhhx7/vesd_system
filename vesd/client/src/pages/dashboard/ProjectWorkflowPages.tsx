import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, BriefcaseBusiness, CheckCircle2, Clock, CreditCard, Filter, Search, Sparkles } from 'lucide-react';
import { Badge, Card, Input, Select, StatusBadge, Textarea } from '../../components/ui/Primitives';
import { Button } from '../../components/ui/Button';
import { endpoints } from '../../services/api';
import { Dashboard } from './shared/Dashboard';
import { Metric } from './shared/Metric';
import { ProjectCard } from './shared/ProjectCard';

const agreementFields = ['Phạm vi công việc', 'Chi phí', 'Mốc thanh toán', 'Hạn bàn giao', 'Số lần chỉnh sửa', 'File bàn giao', 'Quyền sở hữu', 'Điều kiện hoàn tiền/khiếu nại'];
const workspaceSteps = ['Brief đã xác nhận', 'Đã gửi concept', 'Phản hồi', 'Bàn giao cuối'];
const checklistItems = ['File nguồn AI/PSD', 'PNG nền trong suốt', 'PDF vector', 'SVG', 'JPG xem trước', 'Tên font', 'Mã màu'];
const categories = [
  ['logo-design', 'Thiết kế logo'],
  ['brand-identity', 'Nhận diện thương hiệu'],
  ['social-media-design', 'Thiết kế mạng xã hội'],
  ['packaging-design', 'Bao bì'],
  ['ui-ux-design', 'UI/UX']
];
const statuses = [
  ['all', 'Tất cả trạng thái'],
  ['pending_designer', 'Chờ designer'],
  ['agreement_pending', 'Chờ thỏa thuận'],
  ['payment_pending', 'Chờ escrow'],
  ['escrow_funded', 'Đã escrow'],
  ['in_progress', 'Đang làm'],
  ['submitted', 'Chờ duyệt'],
  ['revision_requested', 'Cần chỉnh sửa'],
  ['final_submitted', 'Đã bàn giao'],
  ['completed', 'Hoàn thành'],
  ['cancelled', 'Đã hủy']
];

function listFromText(value: FormDataEntryValue | null) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatVnd(value?: number) {
  return value ? `${value.toLocaleString('vi-VN')}đ` : 'Trao đổi';
}

export function CreateProjectPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const createProject = useMutation({
    mutationFn: (body: unknown) => endpoints.createProject(body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-projects'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      ]);
      navigate('/client/projects');
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Không thể đăng dự án')
  });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    setMessage('');
    createProject.mutate({
      title: String(fd.get('title') || '').trim(),
      category: String(fd.get('category') || ''),
      description: String(fd.get('description') || '').trim(),
      targetAudience: String(fd.get('targetAudience') || '').trim(),
      stylePreferences: listFromText(fd.get('stylePreferences')),
      budget: {
        min: Number(fd.get('budgetMin') || 0),
        max: Number(fd.get('budgetMax') || 0)
      },
      deadline: fd.get('deadline') || undefined,
      deliverables: listFromText(fd.get('deliverables')),
      revisionLimit: Number(fd.get('revisionLimit') || 2),
      preferredDesignerLevel: fd.get('preferredDesignerLevel'),
      urgent: fd.get('urgent') === 'on',
      printingSupport: fd.get('printingSupport') === 'on'
    });
  }

  return (
    <Dashboard title="Tạo brief dự án">
      <Card className="border-line">
        <div className="mb-5 rounded-lg bg-brand p-5 text-white">
          <h2 className="text-2xl font-black">Đăng brief rõ ràng để ghép designer nhanh hơn</h2>
          <p className="text-base text-soft">Phạm vi, file bàn giao, số lần chỉnh sửa và deadline sẽ được đưa vào thỏa thuận và escrow.</p>
        </div>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
          <Input name="title" placeholder="Tên dự án" required />
          <Select name="category" required>
            {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Textarea name="description" className="md:col-span-2" placeholder="Mô tả dự án" required />
          <Input name="targetAudience" placeholder="Đối tượng khách hàng" />
          <Input name="stylePreferences" placeholder="Phong cách mong muốn, cách nhau bằng dấu phẩy" />
          <Input name="budgetMin" type="number" min={0} placeholder="Ngân sách tối thiểu" />
          <Input name="budgetMax" type="number" min={0} placeholder="Ngân sách tối đa" required />
          <Input name="deadline" type="date" />
          <Input name="deliverables" placeholder="File cần bàn giao, cách nhau bằng dấu phẩy" />
          <Select name="revisionLimit"><option value="2">2 lần chỉnh sửa</option><option value="3">3 lần chỉnh sửa</option><option value="5">5 lần chỉnh sửa</option></Select>
          <Select name="preferredDesignerLevel"><option value="junior">Mới bắt đầu</option><option value="mid-level">Trung cấp</option><option value="senior">Chuyên gia</option></Select>
          <label className="flex items-center gap-2 text-base"><input name="urgent" type="checkbox" /> Cần bàn giao gấp</label>
          <label className="flex items-center gap-2 text-base"><input name="printingSupport" type="checkbox" /> Cần hỗ trợ in ấn</label>
          <Button className="md:col-span-2" disabled={createProject.isPending}>{createProject.isPending ? 'Đang đăng...' : 'Đăng dự án'}</Button>
        </form>
        {message && <p className="mt-3 text-sm text-red-500">{message}</p>}
      </Card>
    </Dashboard>
  );
}

export function ProjectsPage({ role }: { role: 'client' | 'designer' }) {
  const { data = [], isLoading } = useQuery({ queryKey: ['my-projects', role], queryFn: endpoints.myProjects });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const filtered = data.filter((project: any) => {
    const text = `${project.title || ''} ${project.description || ''} ${project.category || ''}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase()))
      && (status === 'all' || project.status === status)
      && (category === 'all' || project.category === category);
  });

  return (
    <Dashboard title="Dự án">
      <Card>
        <div className="grid gap-3 md:grid-cols-[1fr_220px_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên, mô tả, danh mục" />
          </div>
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">Tất cả danh mục</option>
            {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          {role === 'client' ? <Link to="/client/create-project"><Button><BriefcaseBusiness size={18} /> Đăng dự án</Button></Link> : <Link to="/designer/jobs"><Button><Sparkles size={18} /> Tìm việc</Button></Link>}
        </div>
      </Card>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? Array.from({ length: 6 }).map((_, index) => <Card key={index} className="h-44 animate-pulse bg-white"><span className="sr-only">Đang tải</span></Card>)
          : filtered.length ? filtered.map((project: any) => <ProjectCard key={project._id} project={project} />)
            : <Card className="md:col-span-2 xl:col-span-3"><p className="font-semibold">Không có dự án phù hợp bộ lọc.</p><p className="mt-1 text-base text-muted">Thử đổi trạng thái, danh mục hoặc từ khóa tìm kiếm.</p></Card>}
      </div>
    </Dashboard>
  );
}

export function FindJobsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ q: '', category: '', budget: '', urgent: '', sort: 'match' });
  const search = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString();
  const { data, isLoading } = useQuery({ queryKey: ['open-projects', filters], queryFn: () => endpoints.openProjects(search ? `?${search}` : '') });
  const [message, setMessage] = useState('');
  const claimProject = useMutation({
    mutationFn: (id: string) => endpoints.claimProject(id),
    onSuccess: async () => {
      setMessage('Đã nhận dự án. Dự án đã được chuyển vào danh sách dự án của bạn.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['open-projects'] }),
        queryClient.invalidateQueries({ queryKey: ['my-projects'] }),
        queryClient.invalidateQueries({ queryKey: ['designer-projects'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      ]);
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Không thể nhận dự án')
  });
  const items = data?.items || [];

  function setFilter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <Dashboard title="Tìm việc">
      <Card>
        <div className="grid gap-3 lg:grid-cols-[1fr_190px_170px_150px_150px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input className="pl-9" value={filters.q} onChange={(event) => setFilter('q', event.target.value)} placeholder="Tìm dự án theo brief, phong cách, file bàn giao" />
          </div>
          <Select value={filters.category} onChange={(event) => setFilter('category', event.target.value)}>
            <option value="">Danh mục phù hợp</option>
            {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Input type="number" min={0} value={filters.budget} onChange={(event) => setFilter('budget', event.target.value)} placeholder="Ngân sách tối đa" />
          <Select value={filters.urgent} onChange={(event) => setFilter('urgent', event.target.value)}>
            <option value="">Tất cả deadline</option>
            <option value="true">Việc gấp</option>
          </Select>
          <Select value={filters.sort} onChange={(event) => setFilter('sort', event.target.value)}>
            <option value="match">Phù hợp nhất</option>
            <option value="budget">Ngân sách cao</option>
            <option value="deadline">Deadline gần</option>
          </Select>
        </div>
        <p className="mt-3 flex items-center gap-2 text-sm text-muted"><Filter size={16} /> Mức phù hợp được tính từ danh mục, kỹ năng và phong cách trong hồ sơ designer.</p>
      </Card>
      {message && <p className="mt-4 rounded-lg bg-white px-4 py-3 text-sm text-muted">{message}</p>}
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {isLoading ? Array.from({ length: 4 }).map((_, index) => <Card key={index} className="h-64 animate-pulse bg-white"><span className="sr-only">Đang tải</span></Card>)
          : items.length ? items.map((project: any) => (
            <Card key={project._id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Badge tone={project.matchScore >= 80 ? 'success' : 'info'}>{project.matchScore}% phù hợp</Badge>
                  <h2 className="mt-3 text-xl font-black">{project.title}</h2>
                  <p className="mt-1 text-base text-muted">{project.clientId?.name || 'Khách hàng VESD'} · {project.category}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {project.priorityLevel === 'premium' && <Badge tone="premium">Premium</Badge>}
                  {project.urgent && <Badge tone="warning">Gấp</Badge>}
                  <StatusBadge status={project.status} />
                </div>
              </div>
              <p className="mt-4 line-clamp-3 text-base text-muted">{project.description}</p>
              <div className="mt-4 grid gap-3 rounded-lg bg-soft p-4 text-base md:grid-cols-3">
                <div><p className="text-sm text-muted">Ngân sách</p><p className="font-bold text-brand">{formatVnd(project.budget?.max)}</p></div>
                <div><p className="text-sm text-muted">Deadline</p><p className="font-bold">{project.deadline ? new Date(project.deadline).toLocaleDateString('vi-VN') : 'Trao đổi'}</p></div>
                <div><p className="text-sm text-muted">Chỉnh sửa</p><p className="font-bold">{project.revisionLimit || 2} lần</p></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(project.matchedTerms?.length ? project.matchedTerms : project.stylePreferences || []).slice(0, 5).map((term: string) => <Badge key={term}>{term}</Badge>)}
              </div>
              <Button className="mt-5 w-full" disabled={claimProject.isPending} onClick={() => claimProject.mutate(project._id)}>
                {claimProject.isPending ? 'Đang nhận...' : 'Nhận dự án'}
              </Button>
            </Card>
          )) : <Card><p className="font-semibold">Chưa có dự án mở phù hợp.</p><p className="mt-1 text-base text-muted">Cập nhật hồ sơ năng lực hoặc thử giảm điều kiện lọc để xem thêm dự án.</p></Card>}
      </div>
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
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [projectId, setProjectId] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderCode = params.get('orderCode');
    if (params.get('payos') !== 'success' || !orderCode) return;
    endpoints.syncPayosPayment(orderCode)
      .then(async () => {
        setMessage('payOS đã xác nhận thanh toán escrow thành công.');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['wallet'] }),
          queryClient.invalidateQueries({ queryKey: ['tx'] }),
          queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
        ]);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Chưa thể xác nhận thanh toán payOS'));
  }, [queryClient]);
  const payEscrow = useMutation({
    mutationFn: () => endpoints.payEscrow({ projectId, discountCode: discountCode || undefined, paymentMethod }),
    onSuccess: async (result: any) => {
      if (result?.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      setMessage('Đã thanh toán escrow bằng ví. Phí sàn được thu tại thời điểm funding.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['wallet'] }),
        queryClient.invalidateQueries({ queryKey: ['tx'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      ]);
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Không thể thanh toán escrow')
  });
  return (
    <Dashboard title="Thanh toán escrow">
      <Card>
        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Số tiền thanh toán" value="2.500.000đ" icon={CreditCard} />
          <Metric label="Phí nền tảng" value="200.000đ" icon={BarChart3} />
          <Metric label="Tổng cộng" value="2.700.000đ" icon={CheckCircle2} />
          <Metric label="Trạng thái" value="Đang chờ" icon={Clock} />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_220px_auto]">
          <Input placeholder="ID dự án" value={projectId} onChange={(event) => setProjectId(event.target.value)} />
          <Input placeholder="Mã giảm giá nếu có" value={discountCode} onChange={(event) => setDiscountCode(event.target.value)} />
          <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
            <option value="wallet">Ví VESD</option>
            <option value="payos">payOS</option>
          </Select>
          <Button disabled={payEscrow.isPending || !projectId} onClick={() => payEscrow.mutate()}>
            {payEscrow.isPending ? 'Đang xử lý...' : 'Thanh toán'}
          </Button>
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
