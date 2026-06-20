import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, BarChart3, Bot, Clock, Gauge, MousePointerClick, RefreshCw, Sparkles, TrendingUp, Users } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge, Card, Select } from '../../components/ui/Primitives';
import { endpoints } from '../../services/api';
import { Dashboard } from './shared/Dashboard';
import { Metric } from './shared/Metric';

type RangeKey = '1d' | '7d' | '30d' | 'all';
type SeriesPoint = Record<string, number | string | undefined>;

const ranges: Array<{ value: RangeKey; label: string }> = [
  { value: '1d', label: '1 ngày' },
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
  { value: 'all', label: 'Tất cả' }
];

const sourceLabels: Record<string, string> = {
  direct: 'Direct',
  search: 'Search',
  social: 'Social',
  referral: 'Referral',
  email: 'Email',
  paid: 'Paid',
  unknown: 'Unknown'
};

const sourceColors: Record<string, string> = {
  direct: '#2453D6',
  search: '#10b981',
  social: '#f59e0b',
  referral: '#8b5cf6',
  email: '#06b6d4',
  paid: '#ef4444',
  unknown: '#94a3b8'
};

export function buildLinePoints(series: SeriesPoint[], key: string) {
  if (!series.length) return '';
  const values = series.map((point) => Number(point[key]) || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  return values.map((value, index) => {
    const x = series.length === 1 ? 50 : (index / (series.length - 1)) * 100;
    const y = span === 0 ? 50 : 92 - ((value - min) / span) * 84;
    return `${round(x)},${round(y)}`;
  }).join(' ');
}

export function chartState(series: SeriesPoint[], key: string) {
  const value = Number(latest(series, {})[key]) || 0;
  if (!series.length) return { kind: 'empty', value };
  if (series.length === 1) return { kind: 'single', value };
  return { kind: 'line', value };
}

export function formatDuration(seconds: number) {
  const value = Math.max(Math.round(seconds || 0), 0);
  if (value < 60) return `${value}s`;
  return `${Math.floor(value / 60)}m ${value % 60}s`;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function formatNumber(value: number) {
  return Math.round(value || 0).toLocaleString('vi-VN');
}

function formatPercent(value: number) {
  return `${round(value || 0)}%`;
}

function latest<T>(items: T[] | undefined, fallback: T): T {
  return items?.length ? items[items.length - 1] : fallback;
}

export function AdminAnalyticsPage() {
  const [range, setRange] = useState<RangeKey>('7d');
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-analytics', range],
    queryFn: () => endpoints.adminAnalytics(range)
  });
  const reportMutation = useMutation({
    mutationFn: () => endpoints.adminAnalyticsAiReport(range),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-analytics'] })
  });
  const backfillMutation = useMutation({
    mutationFn: () => endpoints.adminAnalyticsBackfill(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-analytics'] })
  });

  const summary = data?.summary;
  const series = summary?.series || [];
  const current = latest(series, {});
  const latestReport = reportMutation.data?.report || data?.latestReport;
  const reportBody = latestReport?.report || latestReport;
  const quota = reportMutation.data?.quota || data?.aiQuota || { limit: 3, used: 0, remaining: 3, allowed: true };
  const sourceTotal = Object.values(summary?.traffic?.sources || {}).reduce((sum: number, value: any) => sum + Number(value || 0), 0);
  const conversionFunnel = useMemo(() => [
    { key: 'registrations', label: 'Đăng ký', value: summary?.conversions?.registrations || 0 },
    { key: 'contacts', label: 'Liên hệ designer', value: summary?.conversions?.contacts || 0 },
    { key: 'projectsCreated', label: 'Tạo dự án', value: summary?.conversions?.projectsCreated || 0 },
    { key: 'escrowPaid', label: 'Escrow', value: summary?.conversions?.escrowPaid || 0 },
    { key: 'premiumSubscriptions', label: 'Premium', value: summary?.conversions?.premiumSubscriptions || 0 }
  ], [summary]);

  return (
    <Dashboard title="Analytics & hiệu suất">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-muted">Dữ liệu nội bộ từ 01/06/2026</p>
          <p className="mt-1 text-base text-muted">GA vẫn hoạt động song song; dữ liệu lịch sử hiển thị từ server analytics của VESD.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select className="w-40" value={range} onChange={(event) => setRange(event.target.value as RangeKey)}>
            {ranges.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
          <Button variant="secondary" type="button" disabled={backfillMutation.isPending} onClick={() => backfillMutation.mutate()}>
            <RefreshCw className={`h-4 w-4 ${backfillMutation.isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && <Card><p className="text-sm font-semibold text-red-600">{error instanceof Error ? error.message : 'Không thể tải analytics.'}</p></Card>}
      {isLoading && <Card><p className="py-8 text-center text-muted">Đang tải dữ liệu analytics...</p></Card>}

      {summary && (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="Sessions" value={formatNumber(summary.totals.sessions)} icon={Activity} />
            <Metric label="Users" value={formatNumber(summary.totals.users)} icon={Users} />
            <Metric label="Bounce rate" value={formatPercent(summary.behaviour.bounceRate)} icon={Gauge} />
            <Metric label="Conversion rate" value={formatPercent(summary.conversions.rate)} icon={TrendingUp} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
            <Card>
              <SectionTitle icon={BarChart3} title="Traffic trend" subtitle="Sessions, users và conversion rate theo ngày" />
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <LineChart title="Sessions" series={series} field="sessions" color="#2453D6" suffix="" />
                <LineChart title="Conversion rate" series={series} field="conversionRate" color="#10b981" suffix="%" />
              </div>
            </Card>
            <Card>
              <SectionTitle icon={Users} title="New vs returning" subtitle="Tỷ lệ người dùng mới và quay lại" />
              <SegmentedBar
                items={[
                  { label: 'New', value: summary.traffic.newVsReturning.newUsers, color: '#2453D6' },
                  { label: 'Returning', value: summary.traffic.newVsReturning.returningUsers, color: '#f59e0b' }
                ]}
              />
              <div className="mt-5 grid grid-cols-2 gap-3">
                <MiniStat label="New users" value={formatNumber(summary.traffic.newVsReturning.newUsers)} />
                <MiniStat label="Returning" value={formatNumber(summary.traffic.newVsReturning.returningUsers)} />
              </div>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <SectionTitle icon={Clock} title="Technical performance" subtitle="Page load, TTI và Core Web Vitals khi browser hỗ trợ" />
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <LineChart title="Page load" series={series} field="pageLoadTime" color="#2453D6" suffix="s" />
                <LineChart title="LCP" series={series} field="lcp" color="#8b5cf6" suffix="s" />
                <LineChart title="INP" series={series} field="inp" color="#f59e0b" suffix="ms" />
                <LineChart title="CLS" series={series} field="cls" color="#ef4444" suffix="" />
              </div>
            </Card>
            <Card>
              <SectionTitle icon={Gauge} title="Uptime nội bộ" subtitle="Heartbeat/client success, không thay thế external monitoring" />
              <GaugeBlock value={summary.technical.uptime} />
              <div className="mt-5 space-y-3">
                <MiniStat label="Page load" value={`${summary.technical.pageLoadTime || 'Chưa đủ dữ liệu'}s`} />
                <MiniStat label="TTI" value={`${summary.technical.tti || 'Chưa đủ dữ liệu'}s`} />
                <MiniStat label="FID/INP" value={`${summary.technical.fid || 0}ms / ${summary.technical.inp || 0}ms`} />
              </div>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Card>
              <SectionTitle icon={MousePointerClick} title="User behaviour" subtitle="Tương tác người dùng trong khoảng đã chọn" />
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <ProgressStat label="Bounce rate" value={summary.behaviour.bounceRate} />
                <ProgressStat label="Scroll depth" value={summary.behaviour.scrollDepth} />
                <MiniStat label="Average session" value={formatDuration(summary.behaviour.averageSessionDuration)} />
                <MiniStat label="Pages/session" value={summary.behaviour.pagesPerSession} />
                <MiniStat label="CTR" value={formatPercent(summary.behaviour.clickThroughRate)} />
                <MiniStat label="Clicks" value={formatNumber(summary.totals.clicks)} />
              </div>
            </Card>
            <Card>
              <SectionTitle icon={BarChart3} title="Traffic sources" subtitle="Nguồn truy cập được phân loại từ UTM/referrer" />
              <div className="mt-4 space-y-3">
                {Object.entries(summary.traffic.sources || {}).map(([key, value]: [string, any]) => (
                  <SourceRow key={key} label={sourceLabels[key] || key} value={Number(value || 0)} total={sourceTotal} color={sourceColors[key] || '#94a3b8'} />
                ))}
              </div>
            </Card>
          </div>

          <Card>
            <SectionTitle icon={TrendingUp} title="Conversion funnel" subtitle="Đăng ký → liên hệ → tạo dự án → escrow → premium" />
            <div className="mt-5 grid gap-3 md:grid-cols-5">
              {conversionFunnel.map((step, index) => (
                <FunnelStep key={step.key} label={step.label} value={step.value} max={conversionFunnel[0]?.value || 1} index={index} />
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <SectionTitle icon={Bot} title="AI phân tích & báo cáo" subtitle={`Gemini được giới hạn ${quota.limit} lần/ngày. Hôm nay còn ${quota.remaining}/${quota.limit} lượt.`} />
              <Button type="button" disabled={!quota.allowed || reportMutation.isPending} onClick={() => reportMutation.mutate()}>
                <Sparkles className="h-4 w-4" />
                {reportMutation.isPending ? 'Đang phân tích...' : 'Tạo báo cáo AI'}
              </Button>
            </div>
            {!quota.allowed && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-700">Bạn đã dùng hết 3 lượt AI phân tích trong ngày.</p>}
            {reportMutation.error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{reportMutation.error instanceof Error ? reportMutation.error.message : 'Không thể tạo báo cáo AI.'}</p>}
            <AiReport report={reportBody} />
          </Card>
        </div>
      )}
    </Dashboard>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-soft text-brand"><Icon className="h-5 w-5" /></span>
      <div>
        <h2 className="text-xl font-black">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

function LineChart({ title, series, field, color, suffix }: { title: string; series: SeriesPoint[]; field: string; color: string; suffix: string }) {
  const state = chartState(series, field);
  const points = buildLinePoints(series, field);
  return (
    <div className="rounded-lg border border-line bg-soft/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-bold">{title}</p>
        <Badge tone="info">{round(state.value)}{suffix}</Badge>
      </div>
      <svg viewBox="0 0 100 100" className="h-36 w-full overflow-visible">
        <line x1="0" y1="92" x2="100" y2="92" stroke="#CED8F4" strokeWidth="1" />
        <line x1="0" y1="8" x2="0" y2="92" stroke="#CED8F4" strokeWidth="1" />
        {state.kind === 'empty' && <text x="50" y="53" textAnchor="middle" className="fill-slate-400 text-[9px] font-semibold">Chua co du lieu</text>}
        {state.kind === 'single' && <circle cx="50" cy="50" r="4" fill={color} />}
        {state.kind === 'line' && points && <polyline fill="none" points={points} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />}
      </svg>
    </div>
  );
}

function SegmentedBar({ items }: { items: Array<{ label: string; value: number; color: string }> }) {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  return (
    <div className="mt-5">
      <div className="flex h-5 overflow-hidden rounded-full bg-soft">
        {items.map((item) => <div key={item.label} style={{ width: `${(item.value / total) * 100}%`, backgroundColor: item.color }} />)}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        {items.map((item) => <span key={item.label} className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span>)}
      </div>
    </div>
  );
}

function SourceRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const width = (value / Math.max(total, 1)) * 100;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm font-semibold"><span>{label}</span><span>{formatNumber(value)}</span></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-soft"><div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} /></div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg border border-line bg-soft/70 p-3"><p className="text-sm text-muted">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>;
}

function ProgressStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-soft/70 p-3">
      <div className="mb-2 flex justify-between text-sm font-semibold"><span>{label}</span><span>{formatPercent(value)}</span></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} /></div>
    </div>
  );
}

function GaugeBlock({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(value || 0, 100));
  return (
    <div className="mt-5 flex flex-col items-center">
      <div className="relative h-36 w-36 rounded-full" style={{ background: `conic-gradient(#10b981 ${safeValue * 3.6}deg, #EDF2FF 0deg)` }}>
        <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white">
          <p className="text-3xl font-black">{formatPercent(safeValue)}</p>
          <p className="text-xs font-semibold uppercase text-muted">Uptime</p>
        </div>
      </div>
    </div>
  );
}

function FunnelStep({ label, value, max, index }: { label: string; value: number; max: number; index: number }) {
  const height = 44 + (value / Math.max(max, 1)) * 88;
  return (
    <div className="flex min-h-44 flex-col justify-end rounded-lg border border-line bg-soft/60 p-3">
      <div className="rounded-lg bg-brand/90 transition-all" style={{ height }} />
      <p className="mt-3 text-sm font-semibold text-muted">Bước {index + 1}</p>
      <p className="font-bold">{label}</p>
      <p className="text-2xl font-black">{formatNumber(value)}</p>
    </div>
  );
}

function AiReport({ report }: { report: any }) {
  if (!report) {
    return <div className="mt-5 rounded-lg border border-dashed border-line bg-soft/60 p-5 text-center text-muted">Chưa có báo cáo AI cho bộ lọc này.</div>;
  }
  const sections = [
    ['Kỹ thuật', report.technical],
    ['Hành vi', report.behaviour],
    ['Traffic', report.traffic],
    ['Chuyển đổi', report.conversions],
    ['Rủi ro', report.risks],
    ['Khuyến nghị', report.recommendations]
  ];
  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-lg bg-brand/5 p-4 text-base font-semibold text-ink">{report.overview || 'Báo cáo AI đã sẵn sàng.'}</div>
      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map(([title, items]) => (
          <div key={title as string} className="rounded-lg border border-line bg-soft/60 p-4">
            <h3 className="font-black">{title as string}</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted">
              {(Array.isArray(items) && items.length ? items : ['Chưa có nhận định riêng cho mục này.']).map((item: string, index: number) => <li key={index}>• {item}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
