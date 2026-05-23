import { useEffect, useState } from 'react';
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
  return (
    <Dashboard title="Tổng quan designer">
      <div className="grid gap-4 md:grid-cols-5">
        <Metric label="Dự án đang chạy" value={summary?.activeProjects ?? data.length} icon={FolderKanban} />
        <Metric label="Yêu cầu mới" value={summary?.newRequests ?? 0} icon={Clock} />
        <Metric label="Thu nhập" value={(summary?.totalEarned || 0).toLocaleString('vi-VN')} icon={CreditCard} />
        <Metric label="Lượt xem hồ sơ" value={summary?.profileViews ?? 0} icon={BarChart3} />
        <Metric label="Chờ rút tiền" value={(summary?.pendingPayouts || 0).toLocaleString('vi-VN')} icon={WalletIcon} />
      </div>
      <Section title="Yêu cầu dự án">{data.slice(0, 4).map((p: any) => <ProjectCard key={p._id} project={p} />)}</Section>
    </Dashboard>
  );
}

function WalletIcon(props: any) { return <CreditCard {...props} />; }

export function DesignerProfileSetup() {
  return (
    <Dashboard title="Thiết lập hồ sơ designer">
      <Card>
        <form className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Tiêu đề hồ sơ" />
          <Input placeholder="Giá khởi điểm" />
          <Textarea className="md:col-span-2" placeholder="Giới thiệu bản thân" />
          <Input placeholder="Kỹ năng" />
          <Input placeholder="Danh mục thiết kế" />
          <Input placeholder="Tag phong cách" />
          <Input placeholder="Thời gian nhận việc" />
          <Input placeholder="Học vấn" />
          <Input placeholder="Kinh nghiệm" />
          <Button>Gửi xác minh</Button>
        </form>
      </Card>
    </Dashboard>
  );
}

export function PortfolioManager() {
  return (
    <Dashboard title="Quản lý hồ sơ năng lực">
      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Tên dự án" />
          <Input placeholder="Danh mục" />
          <Textarea className="md:col-span-2" placeholder="Mô tả" />
          <Input type="file" />
          <Input placeholder="Công cụ đã dùng" />
          <Button>Thêm dự án vào hồ sơ</Button>
        </div>
      </Card>
    </Dashboard>
  );
}

export function RequestsPage() {
  return (
    <Dashboard title="Yêu cầu dự án">
      <Section title="Yêu cầu mới">
        {[1, 2, 3].map((index) => (
          <Card key={index}>
            <h3 className="font-bold">Yêu cầu thiết kế #{index}</h3>
            <p className="text-base text-muted">Khách hàng cần đề xuất phạm vi công việc và timeline.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button>Chấp nhận</Button>
              <Button variant="secondary">Gửi đề xuất</Button>
              <Button variant="danger">Từ chối</Button>
            </div>
          </Card>
        ))}
      </Section>
    </Dashboard>
  );
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
  const [discountResult, setDiscountResult] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('payos');
  const [message, setMessage] = useState('');
  const { data: plans = [] } = useQuery({ queryKey: ['plans', roleTarget], queryFn: () => endpoints.premiumPlans(`?role=${roleTarget}`) });
  const { data: account } = useQuery({ queryKey: ['my-account'], queryFn: endpoints.myAccount });
  const { data: subscriptions = [] } = useQuery({ queryKey: ['premium-my'], queryFn: () => endpoints.premiumMy() });
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderCode = params.get('orderCode');
    if (params.get('payos') !== 'success' || !orderCode) return;
    endpoints.syncPayosPayment(orderCode)
      .then(async () => {
        setMessage('payOS đã xác nhận thanh toán thành công.');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['my-account'] }),
          queryClient.invalidateQueries({ queryKey: ['premium-my'] }),
          queryClient.invalidateQueries({ queryKey: ['tx'] }),
          queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
        ]);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Chưa thể xác nhận thanh toán payOS'));
  }, [queryClient]);
  const activeProfile = roleTarget === 'designer' ? account?.designerProfile : account?.clientProfile;
  const activeSubscription = subscriptions.find((item: any) => item.status === 'active');
  const selectedPlan = plans.find((plan) => plan._id === selectedPlanId) || plans[0];
  const finalAmount = discountResult?.finalAmount ?? selectedPlan?.price ?? 0;
  const validateDiscount = useMutation({
    mutationFn: () => endpoints.validateDiscount({ code: discountCode.trim(), amount: selectedPlan?.price || 0, appliesTo: 'premium' }),
    onSuccess: (result) => {
      setDiscountResult(result);
      setMessage(result.discountAmount > 0 ? `Đã áp dụng mã ${result.code}, giảm ${formatVnd(result.discountAmount)}.` : 'Mã giảm giá hợp lệ.');
    },
    onError: (error) => {
      setDiscountResult(null);
      setMessage(error instanceof Error ? error.message : 'Không thể áp dụng mã giảm giá');
    }
  });
  const subscribe = useMutation({
    mutationFn: (plan: PremiumPlan) => endpoints.subscribe({ planId: plan._id, discountCode: discountCode.trim() || undefined, paymentMethod }),
    onSuccess: async (result: any) => {
      if (result?.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      setMessage(paymentMethod === 'wallet' ? 'Đã thanh toán bằng ví và kích hoạt Premium.' : 'Đã kích hoạt Premium và cập nhật loại tài khoản vào hệ thống.');
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
            <div className="flex gap-2">
              <Input value={discountCode} onChange={(event) => { setDiscountCode(event.target.value); setDiscountResult(null); }} placeholder="Mã giảm giá nếu có" />
              <Button variant="secondary" disabled={!discountCode.trim() || !selectedPlan || validateDiscount.isPending} onClick={() => validateDiscount.mutate()}>Áp dụng</Button>
            </div>
            <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
              <option value="payos">payOS</option>
              <option value="wallet">Ví VESD</option>
              <option value="bank_transfer">Chuyển khoản ngân hàng</option>
              <option value="momo">MoMo</option>
              <option value="vnpay">VNPay</option>
            </Select>
          </div>
          <div className="mt-5 rounded-lg bg-soft p-4">
            <p className="text-sm text-muted">Tổng thanh toán</p>
            <p className="text-2xl font-black">{formatVnd(finalAmount)}</p>
            {discountResult?.discountAmount > 0 && <p className="mt-1 text-sm text-brand">Đã giảm {formatVnd(discountResult.discountAmount)} từ {formatVnd(selectedPlan?.price)}</p>}
            <p className="mt-1 text-sm text-muted">{paymentMethod === 'wallet' ? 'Trừ trực tiếp từ số dư ví VESD.' : 'Hiệu lực sau khi payOS xác nhận thanh toán thành công.'}</p>
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
