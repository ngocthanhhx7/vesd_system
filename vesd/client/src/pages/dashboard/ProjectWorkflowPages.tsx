import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BarChart3, BriefcaseBusiness, CalendarDays, CheckCircle2, CircleDollarSign, Clock, CreditCard, Filter, Hash, Search, Sparkles, UserRound } from 'lucide-react';
import { Badge, Card, Input, Select, Skeleton, StatusBadge, Textarea } from '../../components/ui/Primitives';
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

function formatDate(value?: string | Date) {
  if (!value) return 'Chưa đặt';
  return new Date(value).toLocaleDateString('vi-VN');
}

function shortProjectCode(value?: string) {
  return value ? `#${value.slice(-6).toUpperCase()}` : '#------';
}

function userName(value: any, fallback: string) {
  return value && typeof value === 'object' && value.name ? value.name : fallback;
}

function milestoneStatusText(status?: string) {
  const labels: Record<string, string> = {
    approved: 'Hoàn thành',
    completed: 'Đã duyệt bàn giao cuối',
    final_submitted: 'Chờ khách duyệt bàn giao cuối',
    in_progress: 'Đang thực hiện',
    pending: 'Đang chờ xử lý',
    revision_requested: 'Cần chỉnh sửa',
    submitted: 'Chờ duyệt'
  };
  return labels[status || ''] || 'Đang chờ xử lý';
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

const handoffAccept = '.png,.jpg,.jpeg,.ai,.pdf,.svg,.ttf,.otf,.woff,.woff2,.zip';

function fileChecklistItem(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.png')) return 'PNG nền trong suốt';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'JPG xem trước';
  if (name.endsWith('.ai')) return 'File nguồn AI/PSD';
  if (name.endsWith('.pdf')) return 'PDF vector';
  if (name.endsWith('.svg')) return 'SVG';
  if (name.endsWith('.ttf') || name.endsWith('.otf') || name.endsWith('.woff') || name.endsWith('.woff2')) return 'Tên font';
  return 'File bàn giao';
}

function fileKind(file: any) {
  const name = String(file?.name || '').toLowerCase();
  if (name.match(/\.(png|jpg|jpeg)$/)) return 'File ảnh';
  if (name.match(/\.(ai|pdf|svg|ttf|otf|woff|woff2|zip)$/)) return 'File gốc';
  return 'Tài liệu';
}

function fileKey(file: any) {
  if (file?.key) return file.key;
  try {
    return new URL(file?.url || '').pathname.replace(/^\/+/, '');
  } catch {
    return '';
  }
}

function canPreviewFile(file: any) {
  const name = String(file?.name || '').toLowerCase();
  const type = String(file?.type || '').toLowerCase();
  return type.startsWith('image/') || type.includes('pdf') || name.match(/\.(png|jpg|jpeg|svg|pdf)$/);
}

function finalStepStatus(project: any) {
  if (project?.status === 'completed') return 'completed';
  if (project?.status === 'final_submitted') return 'final_submitted';
  if (project?.status === 'revision_requested') return 'revision_requested';
  return project?.finalFiles?.length ? 'submitted' : 'pending';
}

function feedbackStepStatus(project: any) {
  if (project?.status === 'revision_requested') return 'revision_requested';
  if (['final_submitted', 'completed'].includes(project?.status)) return 'approved';
  return 'pending';
}

function displayMilestone(project: any, milestone: any) {
  const title = String(milestone.title || '').toLowerCase();
  if (title.includes('bàn giao cuối') || title.includes('ban giao cuoi')) {
    return { ...milestone, status: finalStepStatus(project) };
  }
  if (title.includes('phản hồi') || title.includes('phan hoi')) {
    return { ...milestone, status: feedbackStepStatus(project) };
  }
  return milestone;
}

function errorDetails(error: unknown) {
  const details = (error as Error & { details?: unknown })?.details;
  return Array.isArray(details) ? details.map(String) : [];
}

export function WorkspacePage({ designer = false }: { designer?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [milestoneFiles, setMilestoneFiles] = useState<Record<string, File[]>>({});
  const [finalFiles, setFinalFiles] = useState<File[]>([]);
  const [finalError, setFinalError] = useState('');
  const [revisionText, setRevisionText] = useState('');
  const [commentText, setCommentText] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: () => endpoints.project(id as string),
    enabled: Boolean(id)
  });
  const project = data?.project;
  const comments = data?.comments || [];
  const budget = project?.agreement?.price || project?.budget?.agreed || project?.budget?.max || project?.budget?.min;
  const milestones = project?.milestones?.length
    ? project.milestones.map((milestone: any) => displayMilestone(project, milestone))
    : workspaceSteps.map((step, index) => ({ _id: `fallback-${index}`, title: step, status: index < 2 ? 'approved' : 'pending', submittedFiles: [] }));

  async function refreshProject() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['project', id] }),
      queryClient.invalidateQueries({ queryKey: ['my-projects'] }),
      queryClient.invalidateQueries({ queryKey: ['designer-projects'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    ]);
  }

  async function uploadFiles(files: File[]) {
    const uploaded = await Promise.all(files.map(async (file) => {
      const result = await endpoints.uploadFile(file);
      return {
        url: result.url,
        name: result.name || file.name,
        type: result.type || file.type || fileKind(file),
        key: result.key,
        size: result.size || file.size,
        checklistItem: fileChecklistItem(file)
      };
    }));
    return uploaded;
  }

  const startProject = useMutation({
    mutationFn: () => endpoints.startProject(id as string, { content: 'Designer bắt đầu thực hiện dự án' }),
    onSuccess: async () => { setMessage('Đã chuyển dự án sang trạng thái đang làm.'); await refreshProject(); },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Không thể bắt đầu dự án')
  });
  const submitMilestone = useMutation({
    mutationFn: async (milestoneId: string) => endpoints.submitMilestone(id as string, milestoneId, await uploadFiles(milestoneFiles[milestoneId] || [])),
    onSuccess: async () => { setMessage('Đã gửi milestone cho khách hàng duyệt.'); setMilestoneFiles({}); await refreshProject(); },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Không thể gửi milestone')
  });
  const approveMilestone = useMutation({
    mutationFn: (milestoneId: string) => endpoints.approveMilestone(id as string, milestoneId),
    onSuccess: async () => { setMessage('Đã duyệt milestone.'); await refreshProject(); },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Không thể duyệt milestone')
  });
  const requestRevision = useMutation({
    mutationFn: () => endpoints.requestRevision(id as string, revisionText.trim()),
    onSuccess: async () => { setMessage('Đã gửi yêu cầu chỉnh sửa.'); setRevisionText(''); await refreshProject(); },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Không thể gửi yêu cầu chỉnh sửa')
  });
  const submitFinal = useMutation({
    mutationFn: async () => endpoints.submitFinalFiles(id as string, await uploadFiles(finalFiles), 'Designer bàn giao file cuối'),
    onSuccess: async () => { setFinalError(''); setMessage('Đã bàn giao file cuối cho khách hàng.'); setFinalFiles([]); await refreshProject(); },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Không thể bàn giao file cuối')
  });
  const completeProject = useMutation({
    mutationFn: () => endpoints.completeProject(id as string),
    onMutate: () => { setFinalError(''); setMessage('Đang duyệt bàn giao cuối...'); },
    onSuccess: async () => { setFinalError(''); setMessage('Đã hoàn tất dự án và giải ngân escrow.'); await refreshProject(); },
    onError: (err) => {
      const missing = errorDetails(err);
      const base = err instanceof Error ? err.message : 'Không thể hoàn tất dự án';
      const nextMessage = missing.length ? `${base}: ${missing.join(', ')}` : base;
      setFinalError(nextMessage);
      setMessage(nextMessage);
    }
  });
  const sendComment = useMutation({
    mutationFn: () => endpoints.addProjectComment(id as string, { content: commentText.trim(), type: 'message' }),
    onSuccess: async () => { setCommentText(''); await refreshProject(); },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Không thể gửi phản hồi')
  });

  return (
    <Dashboard title={project?.title ? `Không gian: ${project.title}` : designer ? 'Không gian dự án của designer' : 'Không gian dự án của khách hàng'}>
      {isLoading && (
        <Card className="mb-4 border-line">
          <Skeleton className="h-7 w-2/5" />
          <div className="mt-4 grid gap-3 md:grid-cols-4"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
        </Card>
      )}
      {error && <Card className="mb-4 border-line"><p className="font-semibold text-red-500">{error instanceof Error ? error.message : 'Không thể tải thông tin dự án'}</p></Card>}
      {project && (
        <Card className="mb-4 border-line">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2"><Badge tone={project.priorityLevel === 'premium' ? 'premium' : 'info'}>{project.category || 'Dự án thiết kế'}</Badge><StatusBadge status={project.status} /></div>
              <h2 className="mt-3 text-2xl font-black">{project.title}</h2>
              {project.description && <p className="mt-1 max-w-4xl text-base text-muted">{project.description}</p>}
            </div>
            <div className="rounded-lg bg-soft px-3 py-2 text-right"><p className="text-sm font-semibold text-muted">Mã dự án</p><p className="font-black text-brand">{shortProjectCode(project._id)}</p></div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="flex items-center gap-3 rounded-lg bg-soft p-3"><UserRound className="h-5 w-5 text-brand" /><div><p className="text-sm text-muted">{designer ? 'Khách hàng' : 'Designer'}</p><p className="font-bold">{designer ? userName(project.clientId, 'Khách hàng VESD') : userName(project.designerId, 'Chưa có designer')}</p></div></div>
            <div className="flex items-center gap-3 rounded-lg bg-soft p-3"><CircleDollarSign className="h-5 w-5 text-brand" /><div><p className="text-sm text-muted">Ngân sách</p><p className="font-bold">{formatVnd(budget)}</p></div></div>
            <div className="flex items-center gap-3 rounded-lg bg-soft p-3"><CalendarDays className="h-5 w-5 text-brand" /><div><p className="text-sm text-muted">Deadline</p><p className="font-bold">{formatDate(project.agreement?.deadline || project.deadline)}</p></div></div>
            <div className="flex items-center gap-3 rounded-lg bg-soft p-3"><Hash className="h-5 w-5 text-brand" /><div><p className="text-sm text-muted">Lần chỉnh sửa</p><p className="font-bold">{project.revisionUsed || 0}/{project.revisionLimit || project.agreement?.revisionLimit || 2}</p></div></div>
          </div>
        </Card>
      )}
      {message && <p className="mb-4 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-muted">{message}</p>}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold">Tiến độ milestone</h2>
            {designer && project?.status === 'escrow_funded' && <Button disabled={startProject.isPending} onClick={() => startProject.mutate()}>Bắt đầu dự án</Button>}
          </div>
          <div className="mt-4 space-y-4">
            {milestones.map((milestone: any) => (
              <div key={milestone._id || milestone.title} className="rounded-lg border border-line bg-soft/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="font-semibold">{milestone.title}</p><p className="text-base text-muted">{milestoneStatusText(milestone.status)}</p></div>
                  <StatusBadge status={milestone.status} />
                </div>
                {!!milestone.submittedFiles?.length && <FileList projectId={id as string} files={milestone.submittedFiles} />}
                {designer && !String(milestone._id || '').startsWith('fallback') && (
                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                    <Input type="file" multiple accept="image/png,image/jpeg,.pdf,.svg,.ai" onChange={(event) => setMilestoneFiles((current) => ({ ...current, [milestone._id]: Array.from(event.currentTarget.files || []) }))} />
                    <Button disabled={submitMilestone.isPending || !(milestoneFiles[milestone._id]?.length)} onClick={() => submitMilestone.mutate(milestone._id)}>Gửi milestone</Button>
                  </div>
                )}
                {!designer && milestone.status === 'submitted' && !String(milestone._id || '').startsWith('fallback') && (
                  <Button className="mt-4" disabled={approveMilestone.isPending} onClick={() => approveMilestone.mutate(milestone._id)}>Duyệt milestone</Button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-line bg-soft/70 p-4">
            <h3 className="font-bold">Bàn giao file cuối</h3>
            <p className="mt-1 text-sm text-muted">Designer cần gửi nhiều file gồm ảnh PNG/JPG và file gốc AI, PDF, SVG, font chữ hoặc package ZIP.</p>
            {!!project?.finalFiles?.length && <FileList projectId={id as string} files={project.finalFiles} allowDownload={!designer && project.status === 'completed'} />}
            {finalError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {finalError}
              </div>
            )}
            {designer ? (
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                <Input type="file" multiple accept={handoffAccept} onChange={(event) => setFinalFiles(Array.from(event.currentTarget.files || []))} />
                <Button disabled={submitFinal.isPending || !finalFiles.length} onClick={() => submitFinal.mutate()}>Bàn giao file cuối</Button>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-3">
                <Button disabled={completeProject.isPending || project?.status !== 'final_submitted'} onClick={() => completeProject.mutate()}>{completeProject.isPending ? 'Đang duyệt...' : 'Duyệt bàn giao cuối'}</Button>
                <Button variant="secondary" disabled={!revisionText.trim() || requestRevision.isPending} onClick={() => requestRevision.mutate()}>Yêu cầu chỉnh sửa</Button>
              </div>
            )}
            {!designer && project?.status === 'completed' && !!project?.finalFiles?.length && (
              <div className="mt-4 rounded-lg bg-white p-4">
                <h4 className="font-bold">Tải file bàn giao đã duyệt</h4>
                <p className="mt-1 text-sm text-muted">Các file cuối đã được duyệt và có thể tải về tại đây.</p>
                <FileList projectId={id as string} files={project.finalFiles} allowDownload />
              </div>
            )}
          </div>
        </Card>
        <Card>
          <h2 className="font-bold">Trao đổi và phản hồi</h2>
          {!designer && <Textarea className="mt-4" value={revisionText} onChange={(event) => setRevisionText(event.target.value)} placeholder="Nội dung yêu cầu chỉnh sửa" />}
          <Textarea className="mt-4" value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Nhập phản hồi tập trung tại đây" />
          <Button className="mt-3 w-full" disabled={!commentText.trim() || sendComment.isPending} onClick={() => sendComment.mutate()}>Gửi</Button>
          <div className="mt-5 space-y-3">
            {comments.slice(-5).map((comment: any) => <div key={comment._id} className="rounded-lg bg-soft p-3"><p className="text-sm font-bold">{comment.senderId?.name || 'VESD'}</p><p className="mt-1 text-sm text-muted">{comment.content}</p></div>)}
          </div>
        </Card>
      </div>
    </Dashboard>
  );
}

function FileList({ projectId, files, allowDownload = false }: { projectId: string; files: any[]; allowDownload?: boolean }) {
  async function openFile(file: any, disposition: 'inline' | 'attachment') {
    const key = fileKey(file);
    if (!key) return;
    const blob = await endpoints.projectFileBlob(projectId, key, disposition);
    const url = URL.createObjectURL(blob);
    if (disposition === 'attachment') {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.name || 'vesd-file';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return (
    <div className="mt-3 grid gap-2">
      {files.map((file, index) => (
        <div key={`${file.url || file.name}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm font-semibold">
          <span className="min-w-0 truncate text-brand">{file.name}</span>
          <span className="shrink-0 text-muted">{file.checklistItem || fileKind(file)}</span>
          <div className="ml-auto flex gap-2">
            {canPreviewFile(file) && <Button variant="secondary" onClick={() => openFile(file, 'inline')}>Xem</Button>}
            {(allowDownload || !canPreviewFile(file)) && <Button variant="secondary" onClick={() => openFile(file, 'attachment')}>Tải về</Button>}
          </div>
        </div>
      ))}
    </div>
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


