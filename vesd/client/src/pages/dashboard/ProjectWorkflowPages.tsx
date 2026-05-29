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

const agreementFields = ['Pháº¡m vi cÃ´ng viá»‡c', 'Chi phÃ­', 'Má»‘c thanh toÃ¡n', 'Háº¡n bÃ n giao', 'Sá»‘ láº§n chá»‰nh sá»­a', 'File bÃ n giao', 'Quyá»n sá»Ÿ há»¯u', 'Äiá»u kiá»‡n hoÃ n tiá»n/khiáº¿u náº¡i'];
const workspaceSteps = ['Brief Ä‘Ã£ xÃ¡c nháº­n', 'ÄÃ£ gá»­i concept', 'Pháº£n há»“i', 'BÃ n giao cuá»‘i'];
const checklistItems = ['File nguá»“n AI/PSD', 'PNG ná»n trong suá»‘t', 'PDF vector', 'SVG', 'JPG xem trÆ°á»›c', 'TÃªn font', 'MÃ£ mÃ u'];
const categories = [
  ['logo-design', 'Thiáº¿t káº¿ logo'],
  ['brand-identity', 'Nháº­n diá»‡n thÆ°Æ¡ng hiá»‡u'],
  ['social-media-design', 'Thiáº¿t káº¿ máº¡ng xÃ£ há»™i'],
  ['packaging-design', 'Bao bÃ¬'],
  ['ui-ux-design', 'UI/UX']
];
const statuses = [
  ['all', 'Táº¥t cáº£ tráº¡ng thÃ¡i'],
  ['pending_designer', 'Chá» designer'],
  ['agreement_pending', 'Chá» thá»a thuáº­n'],
  ['payment_pending', 'Chá» escrow'],
  ['escrow_funded', 'ÄÃ£ escrow'],
  ['in_progress', 'Äang lÃ m'],
  ['submitted', 'Chá» duyá»‡t'],
  ['revision_requested', 'Cáº§n chá»‰nh sá»­a'],
  ['final_submitted', 'ÄÃ£ bÃ n giao'],
  ['completed', 'HoÃ n thÃ nh'],
  ['cancelled', 'ÄÃ£ há»§y']
];

function listFromText(value: FormDataEntryValue | null) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatVnd(value?: number) {
  return value ? `${value.toLocaleString('vi-VN')}Ä‘` : 'Trao Ä‘á»•i';
}

function formatDate(value?: string | Date) {
  if (!value) return 'ChÆ°a Ä‘áº·t';
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
    approved: 'HoÃ n thÃ nh',
    completed: 'ÄÃ£ duyá»‡t bÃ n giao cuá»‘i',
    final_submitted: 'Chá» khÃ¡ch duyá»‡t bÃ n giao cuá»‘i',
    in_progress: 'Äang thá»±c hiá»‡n',
    pending: 'Äang chá» xá»­ lÃ½',
    revision_requested: 'Cáº§n chá»‰nh sá»­a',
    submitted: 'Chá» duyá»‡t'
  };
  return labels[status || ''] || 'Äang chá» xá»­ lÃ½';
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
    onError: (error) => setMessage(error instanceof Error ? error.message : 'KhÃ´ng thá»ƒ Ä‘Äƒng dá»± Ã¡n')
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
    <Dashboard title="Táº¡o brief dá»± Ã¡n">
      <Card className="border-line">
        <div className="mb-5 rounded-lg bg-brand p-5 text-white">
          <h2 className="text-2xl font-black">ÄÄƒng brief rÃµ rÃ ng Ä‘á»ƒ ghÃ©p designer nhanh hÆ¡n</h2>
          <p className="text-base text-soft">Pháº¡m vi, file bÃ n giao, sá»‘ láº§n chá»‰nh sá»­a vÃ  deadline sáº½ Ä‘Æ°á»£c Ä‘Æ°a vÃ o thá»a thuáº­n vÃ  escrow.</p>
        </div>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
          <Input name="title" placeholder="TÃªn dá»± Ã¡n" required />
          <Select name="category" required>
            {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Textarea name="description" className="md:col-span-2" placeholder="MÃ´ táº£ dá»± Ã¡n" required />
          <Input name="targetAudience" placeholder="Äá»‘i tÆ°á»£ng khÃ¡ch hÃ ng" />
          <Input name="stylePreferences" placeholder="Phong cÃ¡ch mong muá»‘n, cÃ¡ch nhau báº±ng dáº¥u pháº©y" />
          <Input name="budgetMin" type="number" min={0} placeholder="NgÃ¢n sÃ¡ch tá»‘i thiá»ƒu" />
          <Input name="budgetMax" type="number" min={0} placeholder="NgÃ¢n sÃ¡ch tá»‘i Ä‘a" required />
          <Input name="deadline" type="date" />
          <Input name="deliverables" placeholder="File cáº§n bÃ n giao, cÃ¡ch nhau báº±ng dáº¥u pháº©y" />
          <Select name="revisionLimit"><option value="2">2 láº§n chá»‰nh sá»­a</option><option value="3">3 láº§n chá»‰nh sá»­a</option><option value="5">5 láº§n chá»‰nh sá»­a</option></Select>
          <Select name="preferredDesignerLevel"><option value="junior">Má»›i báº¯t Ä‘áº§u</option><option value="mid-level">Trung cáº¥p</option><option value="senior">ChuyÃªn gia</option></Select>
          <label className="flex items-center gap-2 text-base"><input name="urgent" type="checkbox" /> Cáº§n bÃ n giao gáº¥p</label>
          <label className="flex items-center gap-2 text-base"><input name="printingSupport" type="checkbox" /> Cáº§n há»— trá»£ in áº¥n</label>
          <Button className="md:col-span-2" disabled={createProject.isPending}>{createProject.isPending ? 'Äang Ä‘Äƒng...' : 'ÄÄƒng dá»± Ã¡n'}</Button>
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
    <Dashboard title="Dá»± Ã¡n">
      <Card>
        <div className="grid gap-3 md:grid-cols-[1fr_220px_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="TÃ¬m theo tÃªn, mÃ´ táº£, danh má»¥c" />
          </div>
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">Táº¥t cáº£ danh má»¥c</option>
            {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          {role === 'client' ? <Link to="/client/create-project"><Button><BriefcaseBusiness size={18} /> ÄÄƒng dá»± Ã¡n</Button></Link> : <Link to="/designer/jobs"><Button><Sparkles size={18} /> TÃ¬m viá»‡c</Button></Link>}
        </div>
      </Card>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? Array.from({ length: 6 }).map((_, index) => <Card key={index} className="h-44 animate-pulse bg-white"><span className="sr-only">Äang táº£i</span></Card>)
          : filtered.length ? filtered.map((project: any) => <ProjectCard key={project._id} project={project} />)
            : <Card className="md:col-span-2 xl:col-span-3"><p className="font-semibold">KhÃ´ng cÃ³ dá»± Ã¡n phÃ¹ há»£p bá»™ lá»c.</p><p className="mt-1 text-base text-muted">Thá»­ Ä‘á»•i tráº¡ng thÃ¡i, danh má»¥c hoáº·c tá»« khÃ³a tÃ¬m kiáº¿m.</p></Card>}
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
      setMessage('ÄÃ£ nháº­n dá»± Ã¡n. Dá»± Ã¡n Ä‘Ã£ Ä‘Æ°á»£c chuyá»ƒn vÃ o danh sÃ¡ch dá»± Ã¡n cá»§a báº¡n.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['open-projects'] }),
        queryClient.invalidateQueries({ queryKey: ['my-projects'] }),
        queryClient.invalidateQueries({ queryKey: ['designer-projects'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      ]);
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'KhÃ´ng thá»ƒ nháº­n dá»± Ã¡n')
  });
  const items = data?.items || [];

  function setFilter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <Dashboard title="TÃ¬m viá»‡c">
      <Card>
        <div className="grid gap-3 lg:grid-cols-[1fr_190px_170px_150px_150px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input className="pl-9" value={filters.q} onChange={(event) => setFilter('q', event.target.value)} placeholder="TÃ¬m dá»± Ã¡n theo brief, phong cÃ¡ch, file bÃ n giao" />
          </div>
          <Select value={filters.category} onChange={(event) => setFilter('category', event.target.value)}>
            <option value="">Danh má»¥c phÃ¹ há»£p</option>
            {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Input type="number" min={0} value={filters.budget} onChange={(event) => setFilter('budget', event.target.value)} placeholder="NgÃ¢n sÃ¡ch tá»‘i Ä‘a" />
          <Select value={filters.urgent} onChange={(event) => setFilter('urgent', event.target.value)}>
            <option value="">Táº¥t cáº£ deadline</option>
            <option value="true">Viá»‡c gáº¥p</option>
          </Select>
          <Select value={filters.sort} onChange={(event) => setFilter('sort', event.target.value)}>
            <option value="match">PhÃ¹ há»£p nháº¥t</option>
            <option value="budget">NgÃ¢n sÃ¡ch cao</option>
            <option value="deadline">Deadline gáº§n</option>
          </Select>
        </div>
        <p className="mt-3 flex items-center gap-2 text-sm text-muted"><Filter size={16} /> Má»©c phÃ¹ há»£p Ä‘Æ°á»£c tÃ­nh tá»« danh má»¥c, ká»¹ nÄƒng vÃ  phong cÃ¡ch trong há»“ sÆ¡ designer.</p>
      </Card>
      {message && <p className="mt-4 rounded-lg bg-white px-4 py-3 text-sm text-muted">{message}</p>}
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {isLoading ? Array.from({ length: 4 }).map((_, index) => <Card key={index} className="h-64 animate-pulse bg-white"><span className="sr-only">Äang táº£i</span></Card>)
          : items.length ? items.map((project: any) => (
            <Card key={project._id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Badge tone={project.matchScore >= 80 ? 'success' : 'info'}>{project.matchScore}% phÃ¹ há»£p</Badge>
                  <h2 className="mt-3 text-xl font-black">{project.title}</h2>
                  <p className="mt-1 text-base text-muted">{project.clientId?.name || 'KhÃ¡ch hÃ ng VESD'} Â· {project.category}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {project.priorityLevel === 'premium' && <Badge tone="premium">Premium</Badge>}
                  {project.urgent && <Badge tone="warning">Gáº¥p</Badge>}
                  <StatusBadge status={project.status} />
                </div>
              </div>
              <p className="mt-4 line-clamp-3 text-base text-muted">{project.description}</p>
              <div className="mt-4 grid gap-3 rounded-lg bg-soft p-4 text-base md:grid-cols-3">
                <div><p className="text-sm text-muted">NgÃ¢n sÃ¡ch</p><p className="font-bold text-brand">{formatVnd(project.budget?.max)}</p></div>
                <div><p className="text-sm text-muted">Deadline</p><p className="font-bold">{project.deadline ? new Date(project.deadline).toLocaleDateString('vi-VN') : 'Trao Ä‘á»•i'}</p></div>
                <div><p className="text-sm text-muted">Chá»‰nh sá»­a</p><p className="font-bold">{project.revisionLimit || 2} láº§n</p></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(project.matchedTerms?.length ? project.matchedTerms : project.stylePreferences || []).slice(0, 5).map((term: string) => <Badge key={term}>{term}</Badge>)}
              </div>
              <Button className="mt-5 w-full" disabled={claimProject.isPending} onClick={() => claimProject.mutate(project._id)}>
                {claimProject.isPending ? 'Äang nháº­n...' : 'Nháº­n dá»± Ã¡n'}
              </Button>
            </Card>
          )) : <Card><p className="font-semibold">ChÆ°a cÃ³ dá»± Ã¡n má»Ÿ phÃ¹ há»£p.</p><p className="mt-1 text-base text-muted">Cáº­p nháº­t há»“ sÆ¡ nÄƒng lá»±c hoáº·c thá»­ giáº£m Ä‘iá»u kiá»‡n lá»c Ä‘á»ƒ xem thÃªm dá»± Ã¡n.</p></Card>}
      </div>
    </Dashboard>
  );
}

export function MatchingPage() {
  const { data } = useQuery({ queryKey: ['match'], queryFn: () => endpoints.designers('?limit=6&sort=popularity') });
  return (
    <Dashboard title="Káº¿t quáº£ ghÃ©p designer">
      <div className="grid gap-4 md:grid-cols-3">
        {data?.items?.map((d: any, i: number) => (
          <Card key={d._id}>
            <Badge tone="success">{92 - i * 4}% phÃ¹ há»£p</Badge>
            <h3 className="mt-3 font-bold">{d.userId?.name}</h3>
            <p className="text-base text-muted">PhÃ¹ há»£p danh má»¥c, phong cÃ¡ch vÃ  ngÃ¢n sÃ¡ch trong brief.</p>
            <Button className="mt-4 w-full">Má»i designer</Button>
          </Card>
        ))}
      </div>
    </Dashboard>
  );
}

export function AgreementPage() {
  return (
    <Dashboard title="Thá»a thuáº­n dá»± Ã¡n">
      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          {agreementFields.map((field) => (
            <div key={field}>
              <p className="text-base text-muted">{field}</p>
              <p className="font-semibold">ThÃ´ng tin thá»a thuáº­n máº«u cho dá»± Ã¡n.</p>
            </div>
          ))}
        </div>
        <Button className="mt-6">XÃ¡c nháº­n thá»a thuáº­n</Button>
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
        setMessage('payOS Ä‘Ã£ xÃ¡c nháº­n thanh toÃ¡n escrow thÃ nh cÃ´ng.');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['wallet'] }),
          queryClient.invalidateQueries({ queryKey: ['tx'] }),
          queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
        ]);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'ChÆ°a thá»ƒ xÃ¡c nháº­n thanh toÃ¡n payOS'));
  }, [queryClient]);
  const payEscrow = useMutation({
    mutationFn: () => endpoints.payEscrow({ projectId, discountCode: discountCode || undefined, paymentMethod }),
    onSuccess: async (result: any) => {
      if (result?.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      setMessage('ÄÃ£ thanh toÃ¡n escrow báº±ng vÃ­. PhÃ­ sÃ n Ä‘Æ°á»£c thu táº¡i thá»i Ä‘iá»ƒm funding.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['wallet'] }),
        queryClient.invalidateQueries({ queryKey: ['tx'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      ]);
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'KhÃ´ng thá»ƒ thanh toÃ¡n escrow')
  });
  return (
    <Dashboard title="Thanh toÃ¡n escrow">
      <Card>
        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Sá»‘ tiá»n thanh toÃ¡n" value="2.500.000Ä‘" icon={CreditCard} />
          <Metric label="PhÃ­ ná»n táº£ng" value="200.000Ä‘" icon={BarChart3} />
          <Metric label="Tá»•ng cá»™ng" value="2.700.000Ä‘" icon={CheckCircle2} />
          <Metric label="Tráº¡ng thÃ¡i" value="Äang chá»" icon={Clock} />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_220px_auto]">
          <Input placeholder="ID dá»± Ã¡n" value={projectId} onChange={(event) => setProjectId(event.target.value)} />
          <Input placeholder="MÃ£ giáº£m giÃ¡ náº¿u cÃ³" value={discountCode} onChange={(event) => setDiscountCode(event.target.value)} />
          <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
            <option value="wallet">VÃ­ VESD</option>
            <option value="payos">payOS</option>
          </Select>
          <Button disabled={payEscrow.isPending || !projectId} onClick={() => payEscrow.mutate()}>
            {payEscrow.isPending ? 'Äang xá»­ lÃ½...' : 'Thanh toÃ¡n'}
          </Button>
        </div>
        {message && <p className="mt-3 text-sm text-muted">{message}</p>}
      </Card>
    </Dashboard>
  );
}

const handoffAccept = '.png,.jpg,.jpeg,.ai,.pdf,.svg,.ttf,.otf,.woff,.woff2,.zip';
const maxProjectFileSize = 100 * 1024 * 1024;

function formatFileSize(size = 0) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
}

function validateProjectFiles(files: File[]) {
  const oversized = files.find((file) => file.size > maxProjectFileSize);
  if (oversized) throw new Error(`File ${oversized.name} vÆ°á»£t quÃ¡ 100MB. HÃ£y nÃ©n file hoáº·c tÃ¡ch package nhá» hÆ¡n.`);
}

function fileChecklistItem(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.png')) return 'PNG ná»n trong suá»‘t';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'JPG xem trÆ°á»›c';
  if (name.endsWith('.ai')) return 'File nguá»“n AI/PSD';
  if (name.endsWith('.pdf')) return 'PDF vector';
  if (name.endsWith('.svg')) return 'SVG';
  if (name.endsWith('.ttf') || name.endsWith('.otf') || name.endsWith('.woff') || name.endsWith('.woff2')) return 'TÃªn font';
  return 'File bÃ n giao';
}

function fileKind(file: any) {
  const name = String(file?.name || '').toLowerCase();
  if (name.match(/\.(png|jpg|jpeg)$/)) return 'File áº£nh';
  if (name.match(/\.(ai|pdf|svg|ttf|otf|woff|woff2|zip)$/)) return 'File gá»‘c';
  return 'TÃ i liá»‡u';
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
  if (title.includes('bÃ n giao cuá»‘i') || title.includes('ban giao cuoi')) {
    return { ...milestone, status: finalStepStatus(project) };
  }
  if (title.includes('pháº£n há»“i') || title.includes('phan hoi')) {
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
  const [uploadProgress, setUploadProgress] = useState('');
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

  async function uploadFiles(files: File[], progressPrefix = 'Äang táº£i file') {
    validateProjectFiles(files);
    const uploaded = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      setUploadProgress(`${progressPrefix} ${index + 1}/${files.length}: ${file.name} (${formatFileSize(file.size)})`);
      const result = await endpoints.uploadFile(file);
      uploaded.push({
        url: result.url,
        name: result.name || file.name,
        type: result.type || file.type || fileKind(file),
        key: result.key,
        size: result.size || file.size,
        checklistItem: fileChecklistItem(file)
      });
    }
    return uploaded;
  }

  const startProject = useMutation({
    mutationFn: () => endpoints.startProject(id as string, { content: 'Designer báº¯t Ä‘áº§u thá»±c hiá»‡n dá»± Ã¡n' }),
    onSuccess: async () => { setMessage('ÄÃ£ chuyá»ƒn dá»± Ã¡n sang tráº¡ng thÃ¡i Ä‘ang lÃ m.'); await refreshProject(); },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'KhÃ´ng thá»ƒ báº¯t Ä‘áº§u dá»± Ã¡n')
  });
  const submitMilestone = useMutation({
    mutationFn: async (milestoneId: string) => {
      const uploaded = await uploadFiles(milestoneFiles[milestoneId] || [], 'Đang tải milestone');
      setUploadProgress('Đang gửi milestone cho khách hàng...');
      return endpoints.submitMilestone(id as string, milestoneId, uploaded);
    },
    onSuccess: async () => { setMessage('Đã gửi milestone cho khách hàng duyệt.'); setMilestoneFiles({}); await refreshProject(); },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Không thể gửi milestone'),
    onSettled: () => setUploadProgress('')
  });
  const approveMilestone = useMutation({
    mutationFn: (milestoneId: string) => endpoints.approveMilestone(id as string, milestoneId),
    onSuccess: async () => { setMessage('ÄÃ£ duyá»‡t milestone.'); await refreshProject(); },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'KhÃ´ng thá»ƒ duyá»‡t milestone')
  });
  const requestRevision = useMutation({
    mutationFn: () => endpoints.requestRevision(id as string, revisionText.trim()),
    onSuccess: async () => { setMessage('ÄÃ£ gá»­i yÃªu cáº§u chá»‰nh sá»­a.'); setRevisionText(''); await refreshProject(); },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'KhÃ´ng thá»ƒ gá»­i yÃªu cáº§u chá»‰nh sá»­a')
  });
  const submitFinal = useMutation({
    mutationFn: async () => {
      setFinalError('');
      const uploaded = await uploadFiles(finalFiles, 'Đang tải file bàn giao');
      setUploadProgress('Đang gửi bàn giao cho khách hàng...');
      return endpoints.submitFinalFiles(id as string, uploaded, 'Designer bàn giao file cuối');
    },
    onSuccess: async () => { setFinalError(''); setMessage('Đã bàn giao file cuối cho khách hàng.'); setFinalFiles([]); await refreshProject(); },
    onError: (err) => {
      const nextMessage = err instanceof Error ? err.message : 'Không thể bàn giao file cuối';
      setFinalError(nextMessage);
      setMessage(nextMessage);
    },
    onSettled: () => setUploadProgress('')
  });
  const completeProject = useMutation({
    mutationFn: () => endpoints.completeProject(id as string),
    onMutate: () => { setFinalError(''); setMessage('Äang duyá»‡t bÃ n giao cuá»‘i...'); },
    onSuccess: async () => { setFinalError(''); setMessage('ÄÃ£ hoÃ n táº¥t dá»± Ã¡n vÃ  giáº£i ngÃ¢n escrow.'); await refreshProject(); },
    onError: (err) => {
      const missing = errorDetails(err);
      const base = err instanceof Error ? err.message : 'KhÃ´ng thá»ƒ hoÃ n táº¥t dá»± Ã¡n';
      const nextMessage = missing.length ? `${base}: ${missing.join(', ')}` : base;
      setFinalError(nextMessage);
      setMessage(nextMessage);
    }
  });
  const sendComment = useMutation({
    mutationFn: () => endpoints.addProjectComment(id as string, { content: commentText.trim(), type: 'message' }),
    onSuccess: async () => { setCommentText(''); await refreshProject(); },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'KhÃ´ng thá»ƒ gá»­i pháº£n há»“i')
  });

  return (
    <Dashboard title={project?.title ? `KhÃ´ng gian: ${project.title}` : designer ? 'KhÃ´ng gian dá»± Ã¡n cá»§a designer' : 'KhÃ´ng gian dá»± Ã¡n cá»§a khÃ¡ch hÃ ng'}>
      {isLoading && (
        <Card className="mb-4 border-line">
          <Skeleton className="h-7 w-2/5" />
          <div className="mt-4 grid gap-3 md:grid-cols-4"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
        </Card>
      )}
      {error && <Card className="mb-4 border-line"><p className="font-semibold text-red-500">{error instanceof Error ? error.message : 'KhÃ´ng thá»ƒ táº£i thÃ´ng tin dá»± Ã¡n'}</p></Card>}
      {project && (
        <Card className="mb-4 border-line">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2"><Badge tone={project.priorityLevel === 'premium' ? 'premium' : 'info'}>{project.category || 'Dá»± Ã¡n thiáº¿t káº¿'}</Badge><StatusBadge status={project.status} /></div>
              <h2 className="mt-3 text-2xl font-black">{project.title}</h2>
              {project.description && <p className="mt-1 max-w-4xl text-base text-muted">{project.description}</p>}
            </div>
            <div className="rounded-lg bg-soft px-3 py-2 text-right"><p className="text-sm font-semibold text-muted">MÃ£ dá»± Ã¡n</p><p className="font-black text-brand">{shortProjectCode(project._id)}</p></div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="flex items-center gap-3 rounded-lg bg-soft p-3"><UserRound className="h-5 w-5 text-brand" /><div><p className="text-sm text-muted">{designer ? 'KhÃ¡ch hÃ ng' : 'Designer'}</p><p className="font-bold">{designer ? userName(project.clientId, 'KhÃ¡ch hÃ ng VESD') : userName(project.designerId, 'ChÆ°a cÃ³ designer')}</p></div></div>
            <div className="flex items-center gap-3 rounded-lg bg-soft p-3"><CircleDollarSign className="h-5 w-5 text-brand" /><div><p className="text-sm text-muted">NgÃ¢n sÃ¡ch</p><p className="font-bold">{formatVnd(budget)}</p></div></div>
            <div className="flex items-center gap-3 rounded-lg bg-soft p-3"><CalendarDays className="h-5 w-5 text-brand" /><div><p className="text-sm text-muted">Deadline</p><p className="font-bold">{formatDate(project.agreement?.deadline || project.deadline)}</p></div></div>
            <div className="flex items-center gap-3 rounded-lg bg-soft p-3"><Hash className="h-5 w-5 text-brand" /><div><p className="text-sm text-muted">Láº§n chá»‰nh sá»­a</p><p className="font-bold">{project.revisionUsed || 0}/{project.revisionLimit || project.agreement?.revisionLimit || 2}</p></div></div>
          </div>
        </Card>
      )}
      {message && <p className="mb-4 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-muted">{message}</p>}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold">Tiáº¿n Ä‘á»™ milestone</h2>
            {designer && project?.status === 'escrow_funded' && <Button disabled={startProject.isPending} onClick={() => startProject.mutate()}>Báº¯t Ä‘áº§u dá»± Ã¡n</Button>}
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
                    <Button disabled={submitMilestone.isPending || !(milestoneFiles[milestone._id]?.length)} onClick={() => submitMilestone.mutate(milestone._id)}>Gá»­i milestone</Button>
                  </div>
                )}
                {!designer && milestone.status === 'submitted' && !String(milestone._id || '').startsWith('fallback') && (
                  <Button className="mt-4" disabled={approveMilestone.isPending} onClick={() => approveMilestone.mutate(milestone._id)}>Duyá»‡t milestone</Button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-line bg-soft/70 p-4">
            <h3 className="font-bold">BÃ n giao file cuá»‘i</h3>
            <p className="mt-1 text-sm text-muted">Designer cáº§n gá»­i nhiá»u file gá»“m áº£nh PNG/JPG vÃ  file gá»‘c AI, PDF, SVG, font chá»¯ hoáº·c package ZIP.</p>
            {!!project?.finalFiles?.length && <FileList projectId={id as string} files={project.finalFiles} allowDownload={!designer && project.status === 'completed'} />}
            {finalError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {finalError}
              </div>
            )}
            {designer ? (
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                <Input type="file" multiple accept={handoffAccept} onChange={(event) => setFinalFiles(Array.from(event.currentTarget.files || []))} />
                <Button disabled={submitFinal.isPending || !finalFiles.length} onClick={() => submitFinal.mutate()}>BÃ n giao file cuá»‘i</Button>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-3">
                <Button disabled={completeProject.isPending || project?.status !== 'final_submitted'} onClick={() => completeProject.mutate()}>{completeProject.isPending ? 'Äang duyá»‡t...' : 'Duyá»‡t bÃ n giao cuá»‘i'}</Button>
                <Button variant="secondary" disabled={!revisionText.trim() || requestRevision.isPending} onClick={() => requestRevision.mutate()}>YÃªu cáº§u chá»‰nh sá»­a</Button>
              </div>
            )}
            {!designer && project?.status === 'completed' && !!project?.finalFiles?.length && (
              <div className="mt-4 rounded-lg bg-white p-4">
                <h4 className="font-bold">Táº£i file bÃ n giao Ä‘Ã£ duyá»‡t</h4>
                <p className="mt-1 text-sm text-muted">CÃ¡c file cuá»‘i Ä‘Ã£ Ä‘Æ°á»£c duyá»‡t vÃ  cÃ³ thá»ƒ táº£i vá» táº¡i Ä‘Ã¢y.</p>
                <FileList projectId={id as string} files={project.finalFiles} allowDownload />
              </div>
            )}
          </div>
        </Card>
        <Card>
          <h2 className="font-bold">Trao Ä‘á»•i vÃ  pháº£n há»“i</h2>
          {!designer && <Textarea className="mt-4" value={revisionText} onChange={(event) => setRevisionText(event.target.value)} placeholder="Ná»™i dung yÃªu cáº§u chá»‰nh sá»­a" />}
          <Textarea className="mt-4" value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Nháº­p pháº£n há»“i táº­p trung táº¡i Ä‘Ã¢y" />
          <Button className="mt-3 w-full" disabled={!commentText.trim() || sendComment.isPending} onClick={() => sendComment.mutate()}>Gá»­i</Button>
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
            {(allowDownload || !canPreviewFile(file)) && <Button variant="secondary" onClick={() => openFile(file, 'attachment')}>Táº£i vá»</Button>}
          </div>
        </div>
      ))}
    </div>
  );
}
export function ChecklistPage() {
  return (
    <Dashboard title="Checklist bÃ n giao file">
      <Card>
        {checklistItems.map((item, index) => (
          <div key={item} className="flex items-center justify-between border-b border-line py-3 last:border-0">
            <span>{item}</span>
            <StatusBadge status={index < 4 ? 'approved' : 'pending'} />
          </div>
        ))}
        <Button className="mt-5">Duyá»‡t bÃ n giao cuá»‘i</Button>
      </Card>
    </Dashboard>
  );
}


