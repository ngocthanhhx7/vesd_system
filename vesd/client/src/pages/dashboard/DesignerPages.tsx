import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, CheckCircle2, Clock, CreditCard, FolderKanban, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { Badge, Card, Input, Select, StatusBadge, Textarea } from '../../components/ui/Primitives';
import { Button } from '../../components/ui/Button';
import { endpoints, PremiumPlan } from '../../services/api';
import { Dashboard, Section } from './shared/Dashboard';
import { Metric } from './shared/Metric';
import { ProjectCard } from './shared/ProjectCard';

export function DesignerDashboard() {
  const { data = [] } = useQuery({ queryKey: ['designer-projects'], queryFn: endpoints.myProjects });
  const { data: summary } = useQuery({ queryKey: ['dashboard-summary'], queryFn: endpoints.dashboardSummary });
  return <Dashboard title="Designer Dashboard"><div className="grid gap-4 md:grid-cols-5"><Metric label="Active projects" value={summary?.activeProjects ?? data.length} icon={FolderKanban} /><Metric label="New requests" value={summary?.newRequests ?? 0} icon={Clock} /><Metric label="Earnings" value={(summary?.totalEarned || 0).toLocaleString('vi-VN')} icon={CreditCard} /><Metric label="Profile views" value={summary?.profileViews ?? 0} icon={BarChart3} /><Metric label="Pending payouts" value={(summary?.pendingPayouts || 0).toLocaleString('vi-VN')} icon={WalletIcon} /></div><Section title="Project requests">{data.slice(0, 4).map((p: any) => <ProjectCard key={p._id} project={p} />)}</Section></Dashboard>;
}

function WalletIcon(props: any) { return <CreditCard {...props} />; }

export function DesignerProfileSetup() {
  return <Dashboard title="Designer Profile Setup"><Card><form className="grid gap-4 md:grid-cols-2"><Input placeholder="Title" /><Input placeholder="Starting price" /><Textarea className="md:col-span-2" placeholder="Bio" /><Input placeholder="Skills" /><Input placeholder="Categories" /><Input placeholder="Style tags" /><Input placeholder="Availability" /><Input placeholder="Education" /><Input placeholder="Experience" /><Button>Gui xac minh</Button></form></Card></Dashboard>;
}

export function PortfolioManager() {
  return <Dashboard title="Portfolio Manager"><Card><div className="grid gap-4 md:grid-cols-2"><Input placeholder="Project title" /><Input placeholder="Category" /><Textarea className="md:col-span-2" placeholder="Description" /><Input type="file" /><Input placeholder="Tools used" /><Button>Add portfolio item</Button></div></Card></Dashboard>;
}

export function RequestsPage() {
  return <Dashboard title="Project Requests"><Section title="Incoming requests">{[1, 2, 3].map((i) => <Card key={i}><h3 className="font-bold">Yeu cau thiet ke #{i}</h3><p className="text-base text-muted">Client can de xuat scope va timeline.</p><div className="mt-4 flex gap-2"><Button>Accept</Button><Button variant="secondary">Send proposal</Button><Button variant="danger">Reject</Button></div></Card>)}</Section></Dashboard>;
}

type PremiumPageProps = {
  roleTarget?: 'client' | 'designer';
};

const premiumCopy = {
  designer: {
    title: 'Designer Premium',
    subtitle: 'Tăng hiển thị hồ sơ, ưu tiên trong kết quả tìm kiếm và tăng cơ hội nhận dự án.',
    accountLabel: 'Tài khoản Designer Premium',
    perks: ['Tăng hiển thị hồ sơ', 'Ưu tiên trong kết quả tìm kiếm', 'Có thể nhận tích xanh uy tín', 'Tăng cơ hội nhận dự án']
  },
  client: {
    title: 'Business Premium',
    subtitle: 'Ưu tiên đăng dự án, kết nối nhanh hơn với designer phù hợp và được hỗ trợ xử lý khiếu nại.',
    accountLabel: 'Tài khoản Business Premium',
    perks: ['Ưu tiên đăng dự án', 'Kết nối nhanh hơn với designer phù hợp', 'Hỗ trợ quản lý dự án nâng cao', 'Ưu tiên hỗ trợ và xử lý khiếu nại']
  }
};

function formatVnd(value?: number) {
  return `${(value || 0).toLocaleString('vi-VN')} VND`;
}

export function PremiumPage({ roleTarget = 'designer' }: PremiumPageProps) {
  const queryClient = useQueryClient();
  const copy = premiumCopy[roleTarget];
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [message, setMessage] = useState('');
  const { data: plans = [] } = useQuery({ queryKey: ['plans', roleTarget], queryFn: () => endpoints.premiumPlans(`?role=${roleTarget}`) });
  const { data: account } = useQuery({ queryKey: ['my-account'], queryFn: endpoints.myAccount });
  const { data: subscriptions = [] } = useQuery({ queryKey: ['premium-my'], queryFn: () => endpoints.premiumMy() });
  const activeProfile = roleTarget === 'designer' ? account?.designerProfile : account?.clientProfile;
  const activeSubscription = subscriptions.find((item: any) => item.status === 'active');
  const selectedPlan = plans.find((plan) => plan._id === selectedPlanId) || plans[0];
  const subscribe = useMutation({
    mutationFn: (plan: PremiumPlan) => endpoints.subscribe({ planId: plan._id, discountCode: discountCode.trim() || undefined, paymentMethod }),
    onSuccess: async () => {
      setMessage('Đã kích hoạt Premium và cập nhật loại tài khoản vào hệ thống.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-account'] }),
        queryClient.invalidateQueries({ queryKey: ['premium-my'] }),
        queryClient.invalidateQueries({ queryKey: ['tx'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      ]);
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Không thể nâng cấp Premium')
  });

  return (
    <Dashboard title={copy.title}>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card className="border-brand/20 bg-soft">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Badge tone="premium">{copy.accountLabel}</Badge>
                <h2 className="mt-3 text-2xl font-black">{copy.subtitle}</h2>
              </div>
              <div className="rounded-lg bg-white px-4 py-3">
                <p className="text-sm text-muted">Trạng thái hiện tại</p>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge status={activeProfile?.premiumStatus || 'free'} />
                  {activeProfile?.premiumExpiresAt && <span className="text-sm text-muted">đến {new Date(activeProfile.premiumExpiresAt).toLocaleDateString('vi-VN')}</span>}
                </div>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {copy.perks.map((perk) => <div key={perk} className="flex items-center gap-2 text-base"><CheckCircle2 className="text-brand" size={18} />{perk}</div>)}
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {plans.map((plan) => (
              <Card key={plan._id} className={selectedPlan?._id === plan._id ? 'border-brand shadow-soft' : ''}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge tone="premium">{plan.durationDays} ngày</Badge>
                    <h3 className="mt-3 text-2xl font-black">{plan.name}</h3>
                    <p className="mt-2 text-3xl font-black">{formatVnd(plan.price)}</p>
                  </div>
                  {plan.code === 'designer_premium' ? <Sparkles className="text-premium" /> : <ShieldCheck className="text-brand" />}
                </div>
                <div className="mt-4 space-y-2">
                  {plan.benefits.map((benefit) => <p key={benefit} className="flex gap-2 text-sm"><CheckCircle2 className="shrink-0 text-brand" size={17} />{benefit}</p>)}
                </div>
                <Button className="mt-5 w-full" variant={selectedPlan?._id === plan._id ? 'primary' : 'secondary'} onClick={() => setSelectedPlanId(plan._id)}>
                  Chọn gói
                </Button>
              </Card>
            ))}
          </div>
        </div>

        <Card className="self-start">
          <div className="flex items-center gap-2">
            <Zap className="text-premium" />
            <h2 className="text-xl font-black">Xác nhận nâng cấp</h2>
          </div>
          <div className="mt-5 space-y-4">
            <Select value={selectedPlan?._id || ''} onChange={(event) => setSelectedPlanId(event.target.value)}>
              {plans.map((plan) => <option key={plan._id} value={plan._id}>{plan.name}</option>)}
            </Select>
            <Input value={discountCode} onChange={(event) => setDiscountCode(event.target.value)} placeholder="Mã giảm giá nếu có" />
            <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
              <option value="bank_transfer">Chuyển khoản ngân hàng</option>
              <option value="momo">MoMo</option>
              <option value="vnpay">VNPay</option>
            </Select>
          </div>
          <div className="mt-5 rounded-lg bg-soft p-4">
            <p className="text-sm text-muted">Tổng thanh toán</p>
            <p className="text-2xl font-black">{formatVnd(selectedPlan?.price)}</p>
            <p className="mt-1 text-sm text-muted">Hiệu lực 3 tháng sau khi thanh toán mock thành công.</p>
          </div>
          <Button className="mt-5 w-full" disabled={!selectedPlan || subscribe.isPending} onClick={() => selectedPlan && subscribe.mutate(selectedPlan)}>
            {subscribe.isPending ? 'Đang xử lý...' : 'Nâng cấp tài khoản'}
          </Button>
          {message && <p className="mt-3 text-sm text-muted">{message}</p>}
          {activeSubscription?.planId && <p className="mt-4 text-sm text-muted">Gói gần nhất: {activeSubscription.planId.name}</p>}
        </Card>
      </div>
    </Dashboard>
  );
}
