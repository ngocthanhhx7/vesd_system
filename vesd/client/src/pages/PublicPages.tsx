import { Helmet } from 'react-helmet-async';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Bookmark, BriefcaseBusiness, CheckCircle2, Clock3, Filter, Folder, Heart, Search, Send, Star, Users, WalletCards } from 'lucide-react';
import { endpoints } from '../services/api';
import { Badge, Card, EmptyState, Input, RatingStars, Select, Skeleton } from '../components/ui/Primitives';
import { Button } from '../components/ui/Button';

const categories = [
  ['logo-design', 'Logo design'],
  ['brand-identity', 'Brand identity'],
  ['poster-design', 'Poster'],
  ['social-media-design', 'Social media'],
  ['packaging-design', 'Packaging'],
  ['ui-ux-design', 'UI/UX']
];

function Seo({ title, description, schema }: { title: string; description: string; schema?: object }) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta name="twitter:card" content="summary_large_image" />
      <link rel="canonical" href={window.location.href} />
      {schema && <script type="application/ld+json">{JSON.stringify(schema)}</script>}
    </Helmet>
  );
}

export function DesignerCard({ profile }: { profile: any }) {
  const user = profile.userId || {};
  return (
    <Card className="flex h-full min-h-[326px] flex-col rounded-2xl border-pale p-6 shadow-none">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1 text-[#FFA324]"><span>★★★★</span><span className="text-pale">★</span><span className="ml-2 text-xs text-slate-500">127 Đánh giá</span></div>
        <Bookmark className="text-slate-500" size={22} />
      </div>
      <div className="mt-4 flex items-start gap-3">
        <img className="h-11 w-11 rounded-full bg-soft object-cover" src={user.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${profile.title}`} alt={user.name || profile.title} loading="lazy" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[22px] font-bold leading-tight">{user.name || 'Vũ Tuấn Khang'}</div>
          <p className="text-sm text-ink">Thanh Xuân, Hà Nội</p>
        </div>
      </div>
      <p className="mt-5 line-clamp-4 text-[15px] leading-5 text-ink">{profile.bio || 'Xin chào, tôi là Khang, tôi là Graphic Designer chuyên về thiết kế nhận diện thương hiệu và thiết kế...'}</p>
      <div className="mt-auto grid grid-cols-2 gap-3 text-sm text-slate-500">
        <span className="flex items-center gap-2"><BriefcaseBusiness className="text-brand" size={19} />Trung cấp</span>
        <span className="flex items-center gap-2"><WalletCards className="text-brand" size={19} />100K - 320K</span>
        <span className="flex items-center gap-2"><Clock3 className="text-brand" size={19} />Bán thời gian</span>
        <span className="flex items-center gap-2"><Clock3 className="text-brand" size={19} />Giao trong 2 ngày</span>
      </div>
      <Link className="mt-5 rounded-full bg-brand py-3 text-center text-sm font-semibold text-white" to={`/designers/${profile.slug || profile._id}`}>Chi Tiết</Link>
    </Card>
  );
}

export function HomePage() {
  const { data } = useQuery({ queryKey: ['featured-designers'], queryFn: () => endpoints.designers('?limit=4&sort=popularity') });
  const featured = data?.items?.length ? data.items : Array.from({ length: 3 }).map((_, index) => ({
    _id: `static-${index}`,
    title: 'Graphic Designer',
    bio: 'Xin chào, tôi là Khang, tôi là Graphic Designer chuyên về thiết kế nhận diện thương hiệu và thiết kế...',
    startingPrice: 100000,
    ratingAverage: 4.7,
    completedProjects: 127,
    userId: { name: 'Vũ Tuấn Khang', avatar: `https://api.dicebear.com/8.x/initials/svg?seed=vesd-${index}` }
  }));
  const categoryCards = [
    ['Graphic Design', 'Danh mục nổi bật nhất với hơn 12.000 Người xem'],
    ['2D Animation', 'Danh mục nổi bật nhất với hơn 12.000 Người xem'],
    ['Branding', 'Danh mục nổi bật nhất với hơn 12.000 Người xem'],
    ['Product Design', 'Danh mục nổi bật nhất với hơn 12.000 Người xem'],
    ['Branding', 'Danh mục được nhiều doanh nghiệp quan tâm nhất'],
    ['3D Art', 'Được nhiều nhà phát triển game quan tâm nhất'],
    ['Poster Design', 'Danh mục có nhiều dự án nhất với hơn 5.000 dự án'],
    ['AI Generated Art', 'Danh mục mới nhất của VESD với sự phát triển nhanh chóng trong cộng đồng']
  ];
  return (
    <>
      <Seo title="VESD - Nen tang ket noi khach hang voi designer Viet Nam" description="Tim designer phu hop nhanh hon, an toan hon voi escrow, milestone, verified profile va checklist ban giao." schema={{ '@context': 'https://schema.org', '@type': 'Organization', name: 'VESD', url: window.location.origin }} />
      <section className="relative h-[685px] overflow-hidden bg-brand text-white">
        <img className="h-full w-full object-cover" src="/assets/welcome-hero.png" alt="VESD welcome hero" loading="eager" />
        <h1 className="sr-only">Nơi tài năng Việt kết nối dự án thiết kế minh bạch an toàn chuyên nghiệp</h1>
        <Link aria-label="Khám phá VESD" className="absolute left-[8%] top-[62%] h-[70px] w-[240px] rounded-full" to="/designers" />
        <Link aria-label="Tìm designer" className="absolute left-[58%] top-[78%] h-[52px] w-[170px] rounded-full" to="/designers" />
        <Link aria-label="Tìm việc" className="absolute right-[9%] top-[78%] h-[52px] w-[170px] rounded-full" to="/register" />
      </section>
      <section className="bg-white py-8">
        <div className="container-page">
          <p className="mb-5 text-center text-lg font-medium text-brand">Được hỗ trợ bởi</p>
          <img className="mx-auto w-full max-w-[1180px]" src="/assets/sponsors.png" alt="Adobe, ArtStation, FPT University, Arena Multimedia, Behance" />
        </div>
      </section>
      <section className="vesd-orb-bg overflow-hidden py-12 text-white md:py-16">
        <div className="container-page">
          <h2 className="text-center text-4xl font-bold">Danh mục</h2>
          <div className="mt-14 grid gap-8 md:grid-cols-4">
            {categoryCards.map(([title, description]) => (
              <Card key={`${title}-${description}`} className="min-h-[210px] rounded-xl border border-white/70 bg-white/5 p-8 text-center text-white shadow-none">
                <h3 className="text-2xl font-bold">{title}</h3>
                <p className="mx-auto mt-5 max-w-[250px] text-lg leading-7 text-white">{description}</p>
                <Link className="mt-7 inline-flex rounded-full bg-white px-5 py-1 text-lg text-brand" to="/designers">Xem thêm</Link>
              </Card>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-white py-20">
        <div className="vesd-orb-bg relative min-h-[560px] py-16 text-white">
          <div className="container-page">
            <h2 className="text-center text-4xl font-bold">Một số Milestones của VESD</h2>
            <div className="mx-auto mt-28 grid max-w-5xl grid-cols-2 gap-8 text-center md:grid-cols-4">
              {[[Users, '5.000', 'Freelancer Trên Cả Nước'], [Send, '12.000', 'Khách Hàng'], [Folder, '1302', 'Dự Án Đang Diễn Ra'], [Star, '4.97', 'Trung Bình Rating']].map(([Icon, value, label]: any) => (
                <div key={label}><Icon className="mx-auto mb-4" size={46} /><p className="text-5xl font-semibold">{value}</p><p className="mt-2 text-xl">{label}</p></div>
              ))}
            </div>
          </div>
          <div className="container-page absolute -bottom-24 left-1/2 -translate-x-1/2">
            <div className="grid overflow-hidden rounded-2xl bg-brand/90 text-white shadow-2xl md:grid-cols-[1.2fr_.9fr_1.8fr]">
              <div className="p-9"><p className="text-2xl font-bold">Giảm giá VESD premium</p><p className="mt-3 text-4xl font-bold">Lên tới 20%</p><button className="mt-8 rounded-full border-2 border-white px-16 py-2 font-semibold">Mua ngay</button></div>
              <div className="flex items-center justify-center border-y border-white/25 text-5xl font-light tracking-widest md:border-x md:border-y-0">LIMITED</div>
              <div className="grid grid-cols-4 text-center">{['2 Ngày', '16 Giờ', '41 Phút', '11 Giây'].map((x) => { const [n, l] = x.split(' '); return <div key={x} className="flex flex-col justify-center border-l border-white/25 py-9"><span className="text-5xl font-bold">{n}</span><span className="mt-3 text-2xl font-semibold">{l}</span></div>; })}</div>
            </div>
          </div>
        </div>
      </section>
      <section className="mt-12 grid md:grid-cols-2">
        <div className="vesd-pattern flex min-h-[420px] items-center">
          <div className="mx-auto max-w-2xl px-8 text-white">
            <h2 className="text-4xl font-bold leading-tight">Trở Thành Freelancer Của VESD Hôm Nay</h2>
            <p className="mt-5 text-xl leading-7">Tham gia vào cộng đồng freelancer chúng tôi với nhiều ưu đãi hấp dẫn cùng với những đặc quyền chỉ riêng VESD có</p>
            <div className="mt-9 flex gap-8"><Link className="px-10 py-2 font-semibold" to="/register">Tham Gia Ngay</Link><Link className="rounded-full border border-white px-20 py-2 font-semibold" to="/help">Tìm Hiểu Thêm</Link></div>
          </div>
        </div>
        <img className="h-[420px] w-full object-cover" src="/assets/figma-hero-laptop.jpg" alt="Freelancer VESD" loading="lazy" />
      </section>
      <section className="container-page py-20">
        <h2 className="text-center text-4xl font-bold">Top VESD Designer</h2>
        <div className="mx-auto mt-6 h-0.5 max-w-xl bg-brand" />
        <div className="mt-14 grid items-center gap-14 md:grid-cols-3">
          {featured.slice(0, 3).map((p: any, index: number) => <div key={p._id} className={index === 1 ? 'md:-mt-12' : ''}><DesignerCard profile={p} /></div>)}
        </div>
        <div className="mt-12 text-center text-2xl text-brand"><span className="font-bold">1</span> &nbsp;2&nbsp; 3&nbsp; ...&nbsp; 7 <Link className="ml-8 font-medium" to="/designers">Xem thêm <ArrowRight className="inline" /></Link></div>
      </section>
      <section className="vesd-orb-bg py-20 text-white">
        <div className="container-page text-center">
          <p className="text-xl font-bold">Với sự tin tưởng</p>
          <h2 className="mt-4 text-3xl font-bold">Của hơn 20.000 Khách hàng</h2>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {['Vũ Kim Thúy', 'Nguyễn Hồng Vy', 'Lê Duy Nam'].map((name, i) => <Card key={name} className="rounded-2xl border-0 bg-white p-7 text-left text-ink"><div className="flex justify-between"><div className="flex gap-4"><img className="h-14 w-14 rounded-full" src={`https://api.dicebear.com/8.x/initials/svg?seed=${name}`} /><div><h3 className="text-xl font-bold">{name}</h3><p className="text-[#FFA324]">★★★★★ <span className="text-xs text-slate-500">{529 - i * 100} Rating</span></p></div></div><Heart className="fill-red-500 text-red-500" /></div><p className="mt-8 leading-8 text-slate-600">Quy trình làm việc thực sự rất minh bạch, mình rất hài lòng khi có một trang web freelancer có trình tự làm việc tốt như vậy.</p><p className="mt-8 font-bold">Tech Startup <span className="ml-8">Client</span></p></Card>)}
          </div>
          <Link className="mt-14 inline-flex rounded-full bg-white px-24 py-2 text-brand" to="/designers">Xem Thêm</Link>
        </div>
      </section>
      <section className="bg-pale/70 py-20">
        <div className="container-page">
          <h2 className="text-center text-4xl font-bold text-white">Tin tức mới nhất</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[1, 2, 3].map((item) => <img key={item} className="w-full rounded-lg shadow-2xl" src="/assets/news-card.png" alt="Tin tức VESD" loading="lazy" />)}
          </div>
        </div>
      </section>
    </>
  );
}

export function DesignersPage() {
  const [params, setParams] = useSearchParams();
  const query = `?${params.toString()}`;
  const { data, isLoading } = useQuery({ queryKey: ['designers', query], queryFn: () => endpoints.designers(query) });
  const designers = data?.items?.length ? data.items : Array.from({ length: 12 }).map((_, index) => ({
    _id: `fallback-${index}`,
    bio: 'Xin chào, tôi là Khang, tôi là Graphic Designer chuyên về thiết kế nhận diện thương hiệu và thiết kế. Tôi có trách nhiệm khi làm việc và tư duy đồ họa khá tốt.',
    userId: { name: index === 1 ? 'Hoàng Xuân Tuấn' : index === 2 ? 'Lê Hoàng Long' : 'Vũ Tuấn Khang', avatar: `https://api.dicebear.com/8.x/initials/svg?seed=designer-${index}` }
  }));
  return (
    <main className="bg-white">
      <Seo title="Explore designers Viet Nam | VESD" description="Tim designer freelance va sinh vien thiet ke theo category, style, rating, budget va delivery time." />
      <section className="vesd-pattern flex h-[204px] items-center justify-center text-white">
        <p className="text-2xl tracking-wide">"Great design happens when great minds collaborate"</p>
      </section>
      <div className="container-page grid gap-8 py-14 lg:grid-cols-[320px_1fr]">
        <aside className="self-start rounded-2xl border border-pale bg-white p-6">
          <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Tìm kiếm</h1><Button className="rounded-full px-8">Lọc</Button></div>
          <div className="relative mt-7"><Search className="absolute left-4 top-3.5 text-brand" size={21} /><Input className="rounded-xl border-pale py-3 pl-12 text-base" placeholder="Tìm kiếm thông tin" defaultValue={params.get('q') || ''} onBlur={(e) => { e.target.value ? params.set('q', e.target.value) : params.delete('q'); setParams(params); }} /></div>
          <FilterSection title="Range giá"><div className="mt-5 h-1.5 rounded-full bg-pale"><div className="h-1.5 w-2/3 rounded-full bg-brand" /></div><p className="mt-5 text-lg font-bold">Giá: 30K - 1Tr500</p></FilterSection>
          <FilterSection title="Category">{[['Graphic design', 47], ['3D Animtion', 18], ['Branding', 24], ['Illustration', 24]].map(([label, count]) => <CheckRow key={label as string} label={label as string} count={count as number} />)}</FilterSection>
          <FilterSection title="Lọc theo"><p className="text-brand">Rating cao tới thấp</p></FilterSection>
          <FilterSection title="Ngày đăng">{[['Tất cả', 467], ['24h Trước', 21], ['7 Ngày gần nhất', 79], ['Tháng này', 137]].map(([label, count]) => <CheckRow key={label as string} label={label as string} count={count as number} />)}</FilterSection>
          <FilterSection title="Trình độ kinh nghiệm">{[['Mới bắt đầu', 259], ['Trung cấp', 110], ['Chuyên gia', 87]].map(([label, count]) => <CheckRow key={label as string} label={label as string} count={count as number} />)}</FilterSection>
          <FilterSection title="Các tags"><div className="flex flex-wrap gap-3">{['giảm giá', 'App', 'thiết kế game', 'brand', 'logo', 'web', 'ui ux', 'Animation'].map((tag) => <span key={tag} className="rounded-full bg-blue-50 px-3 py-1 text-brand">{tag}</span>)}</div></FilterSection>
          <img className="mt-16 w-full rounded-2xl" src="/assets/news-card-blank.png" alt="Mua Premium Ngay" />
        </aside>
        <section>
          <div className="mb-7 flex items-center justify-between">
            <h1 className="text-4xl font-bold">Kết quả (102)</h1>
            <Select className="w-auto border-0 text-brand" defaultValue={params.get('sort') || 'rating'} onChange={(e) => { params.set('sort', e.target.value); setParams(params); }}><option value="rating">Rating cao tới thấp</option><option value="price">Giá thấp</option><option value="popularity">Phổ biến</option><option value="newest">Mới nhất</option></Select>
          </div>
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">{isLoading ? Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-80" />) : designers.map((p: any) => <DesignerCard key={p._id} profile={p} />)}</div>
          <div className="mt-14 text-center text-2xl text-brand"><span className="font-bold">1</span> &nbsp;2&nbsp; 3&nbsp; ...&nbsp; 7 <Link className="ml-8 font-medium" to="/designers">Trang kế <ArrowRight className="inline" /></Link></div>
        </section>
      </div>
    </main>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mt-8"><div className="flex items-center justify-between"><h2 className="text-2xl font-bold">{title}</h2><ChevronIcon /></div><div className="mt-5 space-y-4">{children}</div></div>;
}

function CheckRow({ label, count }: { label: string; count: number }) {
  return <label className="flex items-center justify-between text-base"><span className="flex items-center gap-3"><span className="h-5 w-5 rounded border border-slate-400" />{label}</span><span className="text-slate-500">{count}</span></label>;
}

function ChevronIcon() {
  return <span className="block h-3 w-3 rotate-45 border-b-2 border-r-2 border-brand" />;
}

export function DesignerProfilePage() {
  const { slug = '' } = useParams();
  const { data, isLoading } = useQuery({ queryKey: ['designer', slug], queryFn: () => endpoints.designer(slug) });
  if (isLoading) return <main className="container-page py-10"><Skeleton className="h-96" /></main>;
  const profile = data?.profile;
  if (!profile) return <main className="container-page py-10"><EmptyState title="Khong tim thay designer" /></main>;
  const user = profile.userId;
  return (
    <main className="container-page py-10">
      <Seo title={`${user.name} - ${profile.title} | VESD`} description={`${user.name} nhan du an ${profile.categories?.join(', ')} tu ${profile.startingPrice?.toLocaleString('vi-VN')}d.`} schema={{ '@context': 'https://schema.org', '@type': 'Person', name: user.name, jobTitle: profile.title }} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card><div className="flex flex-wrap items-center gap-4"><img className="h-24 w-24 rounded-full" src={user.avatar} alt={user.name} /><div><div className="flex gap-2"><h1 className="text-3xl font-black">{user.name}</h1>{profile.verificationStatus === 'verified' && <Badge tone="success">Verified</Badge>}{profile.premiumStatus === 'premium' && <Badge tone="premium">Premium</Badge>}</div><p className="text-muted">{profile.title}</p><RatingStars value={profile.ratingAverage} /></div></div><p className="mt-6 text-slate-700">{profile.bio}</p><div className="mt-5 flex flex-wrap gap-2">{profile.skills?.map((s: string) => <Badge key={s}>{s}</Badge>)}</div></Card>
        <Card><p className="text-sm text-muted">Gia khoi diem</p><p className="text-3xl font-black">{profile.startingPrice?.toLocaleString('vi-VN')}d</p><Link to="/client/create-project"><Button className="mt-5 w-full">Thue designer</Button></Link><Button variant="secondary" className="mt-3 w-full">Luu ho so</Button></Card>
      </div>
      <h2 className="mt-10 text-2xl font-black">Portfolio</h2><div className="mt-4 grid gap-4 md:grid-cols-3">{data.portfolio?.map((item: any) => <Card key={item._id}><img className="h-48 w-full rounded-lg object-cover" src={item.images?.[0]?.url} alt={item.title} loading="lazy" /><h3 className="mt-3 font-bold">{item.title}</h3><p className="text-sm text-muted">{item.description}</p></Card>)}</div>
      <h2 className="mt-10 text-2xl font-black">Reviews</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{data.reviews?.map((r: any) => <Card key={r._id}><RatingStars value={r.rating} /><p className="mt-3 text-sm">{r.content}</p></Card>)}</div>
    </main>
  );
}

export function CategoryPage() {
  const { slug = 'logo-design' } = useParams();
  return <><DesignersPage /><section className="container-page pb-12"><Card><h2 className="text-2xl font-black">Dich vu {slug.replaceAll('-', ' ')}</h2><p className="mt-2 text-muted">VESD giup doanh nghiep tim designer phu hop cho {slug.replaceAll('-', ' ')}, co escrow, milestone, feedback va checklist file ban giao dung chuan.</p></Card></section></>;
}

export function PricingPage() {
  const { data } = useQuery({ queryKey: ['plans'], queryFn: endpoints.premiumPlans });
  return <main className="container-page py-10"><Seo title="Bang gia VESD" description="Cac goi Free, Business Premium va Designer Premium tren VESD." /><h1 className="text-4xl font-black">Pricing</h1><div className="mt-6 grid gap-4 md:grid-cols-3">{(data || []).map((plan: any) => <Card key={plan._id}><Badge tone="premium">{plan.roleTarget}</Badge><h2 className="mt-3 text-2xl font-black">{plan.name}</h2><p className="mt-2 text-3xl font-black">{plan.price?.toLocaleString('vi-VN')}d</p>{plan.benefits?.map((b: string) => <p key={b} className="mt-3 flex gap-2 text-sm"><CheckCircle2 className="text-brand" size={17} />{b}</p>)}<Button className="mt-5 w-full">Nang cap Premium</Button></Card>)}</div></main>;
}

export function HelpPage() {
  const topics = ['Escrow guide', 'Project milestone guide', 'File handover checklist', 'Dispute policy', 'FAQ'];
  return <main className="container-page py-10"><Seo title="Help Center VESD" description="Huong dan escrow, milestone, checklist ban giao va dispute policy." /><h1 className="text-4xl font-black">Help Center</h1><div className="mt-6 grid gap-4 md:grid-cols-2">{topics.map((t) => <Card key={t}><h2 className="font-bold">{t}</h2><p className="mt-2 text-sm text-muted">Quy trinh minh bach de client va designer lam viec an toan tren VESD.</p></Card>)}</div></main>;
}
