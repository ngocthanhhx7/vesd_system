import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity, BarChart3, Bot, Clock, Gauge, MousePointerClick, RefreshCw, Sparkles, TrendingUp, Users
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Primitives';
import { endpoints } from '../../services/api';
import {
  AnalyticsSeriesPoint, RANGE_OPTIONS, RangeKey, finiteNumber, normaliseAnalyticsSeries, toFunnelChartData, toSourceChartData
} from './analyticsChartData';
import { Dashboard } from './shared/Dashboard';
import { Metric } from './shared/Metric';

function formatNumber(value: unknown) {
  return Math.round(finiteNumber(value)).toLocaleString('vi-VN');
}

function formatDecimal(value: unknown) {
  return finiteNumber(value).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
}

function formatPercent(value: unknown) {
  return `${Math.round(finiteNumber(value) * 100) / 100}%`;
}

function formatDuration(seconds: unknown) {
  const value = Math.max(Math.round(finiteNumber(seconds)), 0);
  if (value < 60) return `${value}s`;
  return `${Math.floor(value / 60)}m ${value % 60}s`;
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
  const series = useMemo(
    () => normaliseAnalyticsSeries((summary?.series || []) as AnalyticsSeriesPoint[]),
    [summary?.series]
  );
  const sourceRows = useMemo(() => toSourceChartData(summary?.traffic?.sources), [summary?.traffic?.sources]);
  const conversionFunnel = useMemo(() => toFunnelChartData(summary?.conversions), [summary?.conversions]);
  const latestReport = reportMutation.data?.report || data?.latestReport;
  const reportBody = latestReport?.report || latestReport;
  const quota = reportMutation.data?.quota || data?.aiQuota || { limit: 3, used: 0, remaining: 3, allowed: true };

  return (
    <Dashboard title="Analytics & hiệu suất">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-muted">Dữ liệu nội bộ từ 01/06/2026</p>
          <p className="mt-1 text-base text-muted">GA vẫn hoạt động song song; dữ liệu lịch sử hiển thị từ server analytics của VESD.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1" aria-label="Chọn khoảng thời gian">
            {RANGE_OPTIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={range === item.value}
                onClick={() => setRange(item.value)}
                className={`focus-ring rounded-lg px-3 py-2 text-sm font-semibold transition ${range === item.value ? 'bg-brand text-white shadow-soft' : 'border border-line bg-white text-ink hover:bg-soft'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <Button variant="secondary" type="button" aria-label="Đồng bộ lại dữ liệu analytics" disabled={backfillMutation.isPending} onClick={() => backfillMutation.mutate()}>
            <RefreshCw className={`h-4 w-4 ${backfillMutation.isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && <Card><p className="text-sm font-semibold text-red-600">{error instanceof Error ? error.message : 'Không thể tải analytics.'}</p></Card>}
      {isLoading && <Card><p className="py-8 text-center text-muted">Đang tải dữ liệu analytics...</p></Card>}

      {summary && (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric label="Sessions" value={formatNumber(summary.totals.sessions)} icon={Activity} />
            <Metric label="Users" value={formatNumber(summary.totals.users)} icon={Users} />
            <Metric label="Bounce rate" value={formatPercent(summary.behaviour.bounceRate)} icon={Gauge} />
            <Metric label="Conversion rate" value={formatPercent(summary.conversions.rate)} icon={TrendingUp} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
            <Card>
              <SectionTitle icon={BarChart3} title="Traffic trend" subtitle="Sessions, users và page views theo ngày" />
              <ChartRegion label="Xu hướng lưu lượng" empty={!series.length}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f5" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => formatNumber(value)} />
                    <Legend />
                    <Area type="monotone" dataKey="sessions" name="Sessions" stroke="#2453D6" fill="#2453D6" fillOpacity={0.18} />
                    <Area type="monotone" dataKey="users" name="Users" stroke="#10b981" fill="#10b981" fillOpacity={0.12} />
                    <Area type="monotone" dataKey="pageViews" name="Page views" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartRegion>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <MiniStat label="Người dùng mới" value={formatNumber(summary.traffic.newVsReturning?.newUsers)} />
                <MiniStat label="Quay lại" value={formatNumber(summary.traffic.newVsReturning?.returningUsers)} />
              </div>
            </Card>
            <Card>
              <SectionTitle icon={TrendingUp} title="Quality rate" subtitle="Bounce rate và conversion rate từ API" />
              <ChartRegion label="Tỷ lệ bounce và chuyển đổi" empty={!series.length}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f5" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(value) => `${value}%`} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => formatPercent(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="bounceRate" name="Bounce rate" stroke="#ef4444" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="conversionRate" name="Conversion rate" stroke="#10b981" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartRegion>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <SectionTitle icon={Clock} title="Technical performance" subtitle="Page load, LCP, INP và CLS khi browser hỗ trợ" />
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <MetricLineChart title="Page load" field="pageLoadTime" color="#2453D6" unit="s" series={series} />
                <MetricLineChart title="LCP" field="lcp" color="#8b5cf6" unit="s" series={series} />
                <MetricLineChart title="INP" field="inp" color="#f59e0b" unit="ms" series={series} />
                <MetricLineChart title="CLS" field="cls" color="#ef4444" unit="" series={series} />
              </div>
            </Card>
            <Card>
              <SectionTitle icon={Gauge} title="Uptime nội bộ" subtitle="Heartbeat/client success, không thay thế external monitoring" />
              <GaugeBlock value={summary.technical.uptime} />
              <div className="mt-5 space-y-3">
                <MiniStat label="Page load" value={`${formatDecimal(summary.technical.pageLoadTime)}s`} />
                <MiniStat label="TTI" value={`${formatDecimal(summary.technical.tti)}s`} />
                <MiniStat label="FID/INP" value={`${formatNumber(summary.technical.fid)}ms / ${formatNumber(summary.technical.inp)}ms`} />
              </div>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Card>
              <SectionTitle icon={MousePointerClick} title="User behaviour" subtitle="Tương tác người dùng trong khoảng đã chọn" />
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <MiniStat label="Bounce rate" value={formatPercent(summary.behaviour.bounceRate)} />
                <MiniStat label="Scroll depth" value={formatPercent(summary.behaviour.scrollDepth)} />
                <MiniStat label="Average session" value={formatDuration(summary.behaviour.averageSessionDuration)} />
                <MiniStat label="Pages/session" value={summary.behaviour.pagesPerSession} />
                <MiniStat label="CTR" value={formatPercent(summary.behaviour.clickThroughRate)} />
                <MiniStat label="Clicks" value={formatNumber(summary.totals.clicks)} />
              </div>
            </Card>
            <Card>
              <SectionTitle icon={BarChart3} title="Traffic sources" subtitle="Nguồn truy cập được phân loại từ UTM/referrer" />
              <ChartRegion label="Nguồn truy cập" empty={!sourceRows.some((row) => row.value > 0)} className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sourceRows} layout="vertical" margin={{ top: 8, right: 20, bottom: 0, left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f5" />
                    <XAxis type="number" tickFormatter={(value) => `${value}%`} />
                    <YAxis type="category" dataKey="label" width={76} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value, _name, item) => [`${formatNumber(item.payload.value)} lượt (${formatPercent(value)})`, 'Tỷ trọng']} />
                    <Bar dataKey="percent" name="Tỷ trọng" fill="#2453D6" radius={[0, 5, 5, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartRegion>
            </Card>
          </div>

          <Card>
            <SectionTitle icon={TrendingUp} title="Conversion funnel" subtitle="Đăng ký → liên hệ → tạo dự án → escrow → premium" />
            <ChartRegion label="Phễu chuyển đổi" empty={!conversionFunnel.some((step) => step.value)} className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conversionFunnel} margin={{ top: 16, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f5" />
                  <XAxis dataKey="label" interval={0} tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value, _name, item) => `${formatNumber(value)} (${formatPercent(item.payload.percentOfFirst)} từ đăng ký)`} />
                  <Bar dataKey="value" name="Số lượng" fill="#2453D6" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartRegion>
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
  return <div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-soft text-brand"><Icon className="h-5 w-5" /></span><div><h2 className="text-xl font-black">{title}</h2>{subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}</div></div>;
}

function ChartRegion({ label, empty, className = '', children }: { label: string; empty: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div role="region" aria-label={label} className={`mt-4 h-64 min-w-0 ${className}`}>
      {empty ? <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-line bg-soft/60 p-4 text-center text-sm text-muted">Chưa có dữ liệu cho khoảng thời gian này.</div> : children}
    </div>
  );
}

function MetricLineChart({ title, field, color, unit, series }: { title: string; field: string; color: string; unit: string; series: AnalyticsSeriesPoint[] }) {
  const hasData = series.some((point) => finiteNumber(point[field]) > 0);
  return (
    <div className="rounded-lg border border-line bg-soft/60 p-3">
      <p className="font-bold">{title}{unit && <span className="ml-1 text-sm font-medium text-muted">({unit})</span>}</p>
      <ChartRegion label={`${title} theo thời gian`} empty={!hasData} className="mt-2 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f5" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(value) => `${value}${unit}`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => `${formatDecimal(value)}${unit}`} />
            <Line type="monotone" dataKey={field} name={title} stroke={color} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartRegion>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg border border-line bg-soft/70 p-3"><p className="text-sm text-muted">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>;
}

function GaugeBlock({ value }: { value: unknown }) {
  const safeValue = Math.max(0, Math.min(finiteNumber(value), 100));
  return <div className="mt-5 flex flex-col items-center"><div className="relative h-36 w-36 rounded-full" style={{ background: `conic-gradient(#10b981 ${safeValue * 3.6}deg, #EDF2FF 0deg)` }}><div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white"><p className="text-3xl font-black">{formatPercent(safeValue)}</p><p className="text-xs font-semibold uppercase text-muted">Uptime</p></div></div></div>;
}

function AiReport({ report }: { report: any }) {
  if (!report) return <div className="mt-5 rounded-lg border border-dashed border-line bg-soft/60 p-5 text-center text-muted">Chưa có báo cáo AI cho bộ lọc này.</div>;
  const sections = [['Kỹ thuật', report.technical], ['Hành vi', report.behaviour], ['Traffic', report.traffic], ['Chuyển đổi', report.conversions], ['Rủi ro', report.risks], ['Khuyến nghị', report.recommendations]];
  return <div className="mt-5 space-y-4"><div className="rounded-lg bg-brand/5 p-4 text-base font-semibold text-ink">{report.overview || 'Báo cáo AI đã sẵn sàng.'}</div><div className="grid gap-4 lg:grid-cols-2">{sections.map(([title, items]) => <div key={title as string} className="rounded-lg border border-line bg-soft/60 p-4"><h3 className="font-black">{title as string}</h3><ul className="mt-2 space-y-2 text-sm text-muted">{(Array.isArray(items) && items.length ? items : ['Chưa có nhận định riêng cho mục này.']).map((item: string, index: number) => <li key={index}>• {item}</li>)}</ul></div>)}</div></div>;
}
