import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, Award, BriefcaseBusiness, CalendarDays, CheckCircle2, Clock3, Eye, Filter, Folder, Heart, MapPin, MessageCircle, Search, Send, ShieldCheck, Sparkles, Star, Users, WalletCards } from 'lucide-react';
import { endpoints } from '../services/api';
import { Badge, Card, EmptyState, Input, RatingStars, Select, Skeleton } from '../components/ui/Primitives';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { DesignerCard } from '../components/cards/DesignerCard';
import { Seo } from '../components/seo/Seo';
import { useAuth } from '../hooks/useAuth';

export { DesignerCard };

export type HomeDesignerPageItem = number | 'ellipsis';

export function getHomeDesignerPageItems(page: number, pages: number): HomeDesignerPageItem[] {
  const safePages = Math.max(Math.floor(pages || 1), 1);
  const safePage = Math.min(Math.max(Math.floor(page || 1), 1), safePages);
  const items = new Set<number>([1, safePage - 1, safePage, safePage + 1, safePages]);

  if (safePage <= 2) items.add(3);
  if (safePages <= 5) {
    return Array.from({ length: safePages }, (_value, index) => index + 1);
  }

  const sorted = Array.from(items)
    .filter((item) => item >= 1 && item <= safePages)
    .sort((a, b) => a - b);

  return sorted.flatMap((item, index): HomeDesignerPageItem[] => {
    if (index === 0) return [item];
    return item - sorted[index - 1] > 1 ? ['ellipsis', item] : [item];
  });
}

function parseMilestoneValue(value: string) {
  return /^\d{1,3}(\.\d{3})+$/.test(value) ? Number(value.replace(/\./g, '')) : Number(value);
}

function formatMilestoneValue(current: number, finalValue: string) {
  if (/^\d{1,3}(\.\d{3})+$/.test(finalValue)) {
    return Math.round(current).toLocaleString('vi-VN');
  }

  if (finalValue.includes('.')) {
    const decimalPlaces = finalValue.split('.')[1]?.length || 0;
    return current.toFixed(decimalPlaces);
  }

  return String(Math.round(current));
}

function CountUpNumber({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const frameRef = useRef<number>();
  const [displayValue, setDisplayValue] = useState('0');

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const targetValue = parseMilestoneValue(value);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!Number.isFinite(targetValue) || prefersReducedMotion) {
      setDisplayValue(value);
      return undefined;
    }

    const animate = () => {
      const duration = 1400;
      const startedAt = performance.now();

      const step = (now: number) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(progress === 1 ? value : formatMilestoneValue(targetValue * easedProgress, value));

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(step);
        }
      };

      frameRef.current = requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        animate();
        observer.disconnect();
      },
      { threshold: 0.35 }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value]);

  return <span ref={ref}>{displayValue}</span>;
}

function useCountdown(target?: string) {
  const [remaining, setRemaining] = useState(() => getRemainingTime(target));

  useEffect(() => {
    setRemaining(getRemainingTime(target));
    const timer = window.setInterval(() => setRemaining(getRemainingTime(target)), 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  return remaining;
}

function getRemainingTime(target?: string) {
  const diff = target ? Math.max(new Date(target).getTime() - Date.now(), 0) : 0;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000)
  };
}

const categories = [
  ['logo-design', 'Thiết kế logo'],
  ['brand-identity', 'Nhận diện thương hiệu'],
  ['poster-design', 'Poster'],
  ['social-media-design', 'Mạng xã hội'],
  ['packaging-design', 'Bao bì'],
  ['ui-ux-design', 'UI/UX']
];

export function HomePage() {
  const { user } = useAuth();
  const [homeDesignerPage, setHomeDesignerPage] = useState(1);
  const { data } = useQuery({ queryKey: ['featured-designers', homeDesignerPage], queryFn: () => endpoints.designers(`?limit=3&page=${homeDesignerPage}&sort=popularity`) });
  const { data: stats } = useQuery({ queryKey: ['public-stats'], queryFn: endpoints.publicStats });
  const { data: homeDiscounts = [] } = useQuery({ queryKey: ['home-discount'], queryFn: () => endpoints.activeDiscounts('?appliesTo=premium&role=both&home=true') });
  const homeDiscount = homeDiscounts[0];
  const countdown = useCountdown(homeDiscount?.endsAt);
  const homeDiscountValue = homeDiscount ? (homeDiscount.discountType === 'percent' ? `Lên tới ${homeDiscount.value}%` : `Giảm ${Number(homeDiscount.value).toLocaleString('vi-VN')}đ`) : 'Lên tới 20%';
  const featured = data?.items?.length ? data.items : Array.from({ length: 3 }).map((_, index) => ({
    _id: `static-${index}`,
    title: 'Designer đồ họa',
    bio: 'Xin chào, tôi là Khang, tôi là designer chuyên về thiết kế nhận diện thương hiệu và thiết kế...',
    startingPrice: 100000,
    ratingAverage: 4.7,
    completedProjects: 127,
    userId: { name: 'Vũ Tuấn Khang', avatar: `https://api.dicebear.com/8.x/initials/svg?seed=vesd-${index}` }
  }));
  const topDesignerPages = Math.max(data?.pages || 7, 1);
  const topDesignerPageItems = getHomeDesignerPageItems(homeDesignerPage, topDesignerPages);

  const categoryCards = [
    ['Thiết kế đồ họa', 'Danh mục nổi bật nhất với hơn 12.000 người xem'],
    ['Hoạt ảnh 2D', 'Danh mục nổi bật nhất với hơn 12.000 người xem'],
    ['Branding', 'Danh mục nổi bật nhất với hơn 12.000 người xem'],
    ['Thiết kế sản phẩm', 'Danh mục nổi bật nhất với hơn 12.000 người xem'],
    ['Thương hiệu', 'Danh mục được nhiều doanh nghiệp quan tâm nhất'],
    ['3D Art', 'Được nhiều nhà phát triển game quan tâm nhất'],
    ['Thiết kế poster', 'Danh mục có nhiều dự án nhất với hơn 5.000 dự án'],
    ['Ảnh tạo bằng AI', 'Danh mục mới nhất của VESD với sự phát triển nhanh chóng trong cộng đồng']
  ];

  const milestoneItems = [
    { icon: Users, value: (stats?.freelancers ?? 5000).toLocaleString('vi-VN'), label: 'Freelancer trên cả nước' },
    { icon: Send, value: (stats?.clients ?? 12000).toLocaleString('vi-VN'), label: 'Khách hàng' },
    { icon: Folder, value: (stats?.activeProjects ?? 1302).toLocaleString('vi-VN'), label: 'Dự án đang diễn ra' },
    { icon: Star, value: String(stats?.averageRating ?? 4.97), label: 'Đánh giá trung bình' }
  ];

  const testimonials = [
    { name: 'Vũ Kim Thúy', rating: '529 đánh giá', quote: 'Quy trình làm việc thực sự rất minh bạch, mình rất hài lòng khi có một trang web freelancer có trình tự làm việc tốt như vậy.', tags: ['Nghệ sĩ 3D', 'Hoạt ảnh', 'Freelancer'] },
    { name: 'Nguyễn Hồng Vy', rating: '110 đánh giá', quote: 'Mình cảm thấy rất an tâm khi thuê các bạn freelancer qua VESD, chính sách và bảo mật rất rõ ràng và khách quan.', tags: ['Startup công nghệ', 'Khách hàng'] },
    { name: 'Lê Duy Nam', rating: '472 đánh giá', quote: 'Ứng dụng này khá tốt, mình thích.', tags: ['Startup công nghệ', 'Khách hàng'] }
  ];

  const figmaNewsCards = [
    ['Workshop Kỹ năng Ngày 28/3', 'Workshop kết nối và phát triển kỹ năng cho các freelancer của nền tảng'],
    ['Tin tức mới của VESD', 'Workshop kết nối và phát triển kỹ năng cho các freelancer của nền tảng. Workshop kết nối và phát triển kỹ năng cho các freelancer của nền tảng'],
    ['Tin tức mới của VESD', 'Workshop kết nối và phát triển kỹ năng cho các freelancer của nền tảng']
  ];
  const dashboardPath = user?.roles.includes('admin') ? '/admin' : user?.roles.includes('designer') ? '/designer' : '/client';
  const jobsPath = user?.roles.includes('designer') ? '/designer/jobs' : user ? dashboardPath : '/register';

  return (
    <>
      <Seo title="VESD - Nền tảng kết nối khách hàng với designer Việt Nam" description="Tìm designer phù hợp nhanh hơn, an toàn hơn với escrow, milestone, verified profile và checklist bàn giao." schema={{ '@context': 'https://schema.org', '@type': 'Organization', name: 'VESD', url: window.location.origin }} />
      <section className="home-hero-panels relative -mt-16 h-[686px] overflow-hidden bg-brand text-white">
        <h1 className="sr-only">N&#417;i t&#224;i n&#259;ng Vi&#7879;t k&#7871;t n&#7889;i d&#7921; &#225;n thi&#7871;t k&#7871; minh b&#7841;ch an to&#224;n chuy&#234;n nghi&#7879;p</h1>
        <div className="flex h-full w-full">
          <div className="hero-main relative h-full overflow-hidden">
            <img className="absolute inset-0 h-full w-full object-cover object-left" src="/assets/banner-main.png" alt="" loading="eager" />
            <div className="relative z-10 flex h-full max-w-full flex-col justify-center px-6 pt-[42px] sm:pl-[8.25vw] sm:pr-8">
              <p className="max-w-[320px] font-['Plus_Jakarta_Sans'] text-sm font-medium leading-5 tracking-[.02em] sm:max-w-none sm:text-[20px] sm:leading-6">&mdash; N&#417;i T&#224;i N&#259;ng Vi&#7879;t K&#7871;t N&#7889;i D&#7921; &#193;n</p>
              <p className="mt-3 max-w-[330px] text-wrap font-['Plus_Jakarta_Sans'] text-[28px] font-semibold leading-[35px] tracking-[.01em] sm:mt-[18px] sm:max-w-[640px] sm:text-[48px] sm:leading-[60px]">Minh b&#7841;ch &ndash; An to&#224;n &ndash; Chuy&#234;n nghi&#7879;p</p>
              <Link className="mt-5 flex h-11 w-[168px] items-center justify-center rounded-[28px] bg-white font-['Plus_Jakarta_Sans'] text-base font-semibold text-brand transition hover:scale-[1.03] sm:mt-[33px] sm:h-[56px] sm:w-[225px] sm:text-[20px]" to="/designers">Kh&#225;m Ph&#225;</Link>
            </div>
          </div>
          <Link className="hero-action group relative h-full overflow-hidden" to="/designers" aria-label="T&#236;m designer">
            <img className="hero-action-image absolute inset-0 h-full w-full object-cover object-center" src="/assets/banner-designer.png" alt="" loading="eager" />
            <span className="absolute bottom-8 left-1/2 flex h-[38px] w-[164px] -translate-x-1/2 items-center justify-center rounded-[20px] border-[3px] border-white font-['Plus_Jakarta_Sans'] text-base font-semibold text-white transition group-hover:bg-white group-hover:text-brand lg:bottom-[121px]">T&#236;m designer</span>
          </Link>
          <Link className="hero-action group relative h-full overflow-hidden" to={jobsPath} aria-label="T&#236;m vi&#7879;c">
            <img className="hero-action-image absolute inset-0 h-full w-full object-cover object-center" src="/assets/banner-job.png" alt="" loading="eager" />
            <span className="absolute bottom-8 left-1/2 flex h-[38px] w-[164px] -translate-x-1/2 items-center justify-center rounded-[20px] border-[3px] border-white font-['Plus_Jakarta_Sans'] text-base font-semibold text-white transition group-hover:bg-white group-hover:text-brand lg:bottom-[121px]">T&#236;m vi&#7879;c</span>
          </Link>
        </div>
      </section>
      <section className="bg-white pb-[28px] pt-[17px]">
        <div className="container-page">
          <p className="mb-[11px] text-center text-base font-normal tracking-[.02em] text-brand">Với sự đồng hành của</p>
          <img className="mx-auto h-auto w-full max-w-[1197px]" src="/assets/sponsors.png" alt="Adobe, ArtStation, FPT University, Arena Multimedia, Behance" />
        </div>
      </section>
      <section className="home-orb-bg min-h-[661px] overflow-hidden py-5 text-white">
        <div className="container-page">
          <h2 className="text-center text-[32px] font-bold leading-[38px]">Danh mục</h2>
          <div className="mt-7 grid grid-cols-1 gap-3 sm:mt-[46px] sm:grid-cols-2 sm:gap-x-[22px] sm:gap-y-6 md:grid-cols-4">
            {categoryCards.map(([title, description], index) => (
              <Link
                key={`${title}-${description}-${index}`}
                className={`group flex min-h-[156px] flex-col items-center justify-center rounded-xl border border-[#CED8F4] px-3 py-5 text-center text-white shadow-[0_3px_8px_rgba(48,150,137,0.05)] transition hover:-translate-y-1 hover:bg-white/10 sm:min-h-[218px] sm:px-5 sm:py-10 ${index < 4 ? 'bg-white/[0.06]' : 'bg-white/0'}`}
                to="/designers"
              >
                <h3 className="text-base font-semibold leading-5 sm:text-xl sm:leading-6">{title}</h3>
                <p className="mt-3 max-w-[214px] text-xs leading-[18px] text-white sm:mt-6 sm:text-[14.8px] sm:leading-[22px]">{description}</p>
                <span className="mt-4 rounded-xl bg-[#E9EFFF] px-3 py-2 text-xs leading-none text-brand transition group-hover:bg-white sm:mt-6 sm:text-[14.8px]">Xem thêm</span>
              </Link>
            ))}
            </div>
          </div>
      </section>
      <section className="bg-white pb-10 pt-12 md:pb-[178px] md:pt-[77px]">
        <div className="home-milestone-bg relative overflow-visible pb-5 text-white md:h-[540px] md:pb-0">
          <div className="container-page">
            <h2 className="mx-auto max-w-[320px] pt-8 text-center text-2xl font-bold leading-8 md:max-w-none md:pt-[51px] md:text-[32px] md:leading-[30px]">Một số Milestones của VESD</h2>
            <div className="mx-auto mt-10 grid max-w-[1070px] grid-cols-2 gap-x-3 gap-y-8 text-center md:mt-[104px] md:grid-cols-4 md:gap-x-[33px] md:gap-y-10">
              {milestoneItems.map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex min-w-0 flex-col items-center gap-3">
                  <Icon className="h-11 w-11 stroke-[1.8] md:h-[69px] md:w-[69px]" />
                  <div className="min-w-0">
                    <p className="text-2xl font-semibold leading-8 tracking-wide md:text-[34px] md:leading-[41px]"><CountUpNumber value={value} /></p>
                    <p className="mt-2 text-wrap text-sm font-medium leading-5 md:mt-[14px] md:text-[17px]">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="container-page mt-8 md:absolute md:-bottom-[116px] md:left-1/2 md:mt-0 md:-translate-x-1/2">
            <div className="home-premium-banner grid min-h-[207px] overflow-hidden rounded-[20px] text-white shadow-[0_-9px_41px_rgba(6,23,82,0.43)] md:grid-cols-[1.05fr_.7fr_1.45fr]">
              <div className="flex flex-col justify-center px-[8.4%] py-8">
                <p className="text-xl font-bold leading-7 tracking-[.02em] md:text-2xl">{homeDiscount?.name || 'Giảm giá VESD premium'}</p>
                <p className="mt-2 text-3xl font-bold leading-9 tracking-[.02em] md:text-4xl md:leading-[43px]">{homeDiscountValue}</p>
                <Link className="mt-6 flex h-[30px] w-[208px] items-center justify-center rounded-[20px] border-2 border-white text-xs font-bold tracking-[.02em]" to="/pricing">Mua ngay</Link>
              </div>
              <div className="flex items-center justify-center border-y border-white/20 py-4 font-['Zen_Tokyo_Zoo'] text-[34px] font-normal leading-none tracking-wide md:border-x md:border-y-0 md:py-0 md:text-[42px]">LIMITED</div>
              <div className="grid grid-cols-4 text-center">
                {[
                  [countdown.days, 'Ngày'],
                  [countdown.hours, 'Giờ'],
                  [countdown.minutes, 'Phút'],
                  [countdown.seconds, 'Giây']
                ].map(([value, label]) => {
                  return <div key={label} className="flex flex-col items-center justify-center border-l border-white/25 px-2 py-5 md:py-8"><span className="font-['Zen_Dots'] text-2xl italic leading-8 tracking-[.02em] md:text-4xl md:leading-[43px]">{value}</span><span className="mt-2 text-sm font-bold leading-5 tracking-[.02em] md:mt-4 md:text-2xl md:leading-7">{label}</span></div>;
                })}
            </div>
          </div>
        </div>
        </div>
      </section>
      <section className="home-cta-pattern relative min-h-[360px] overflow-hidden bg-brand py-12 text-white md:h-[518px] md:py-0">
        <img className="absolute right-0 top-0 hidden h-[554px] w-[46.5%] object-cover lg:block" src="/assets/figma-hero-laptop.jpg" alt="Freelancer VESD" loading="lazy" />
        <div className="container-page relative z-10 flex h-full items-center">
          <div className="max-w-[496px]">
            <h2 className="text-[30px] font-semibold leading-[38px] md:text-[36px] md:leading-[43px]">Trở thành Freelancer của VESD Hôm nay</h2>
            <p className="mt-5 text-base font-medium leading-6">Tham gia vào cộng đồng freelancer chúng tôi với nhiều ưu đãi hấp dẫn cùng với những đặc quyền chỉ riêng VESD có</p>
            <div className="mt-[35px] flex flex-wrap gap-[22px]">
              <Link className="flex h-[36px] w-full items-center justify-center rounded-[20px] bg-brand text-[11.3px] font-medium uppercase shadow-[0_0_0_1px_rgba(255,255,255,0.15)] sm:w-[234px]" to="/register">Tham Gia Ngay</Link>
              <Link className="flex h-[36px] w-full items-center justify-center rounded-[20px] border border-white text-[11.3px] font-medium uppercase sm:w-[234px]" to="/help">Tìm Hiểu Thêm</Link>
            </div>
          </div>
        </div>
      </section>
      <section className="bg-white pb-16 pt-14 md:pb-[123px] md:pt-[70px]">
        <div className="container-page">
          <div className="mx-auto max-w-[582px]">
            <h2 className="text-center text-[30px] font-semibold leading-9 md:text-[36px] md:leading-[27px]">Top VESD designer</h2>
            <div className="mt-[23px] h-0.5 bg-brand" />
          </div>
          <div className="mt-10 grid justify-center gap-5 md:mt-[60px] md:grid-cols-[282px_282px_282px] md:gap-[49px]">
            {featured.slice(0, 3).map((profile: any, index: number) => <div key={profile._id} className={index === 1 ? 'md:-mt-[46px]' : ''}><DesignerCard profile={profile} /></div>)}
          </div>
          <div className="mt-[6px] flex flex-col items-center gap-3 text-base font-medium text-[#5871B3]">
            <nav className="flex items-center gap-2" aria-label="Top designer pages">
              {topDesignerPageItems.map((item, index) =>
                item === 'ellipsis' ? (
                  <span key={`ellipsis-${index}`} aria-hidden="true">...</span>
                ) : (
                  <button
                    key={item}
                    className={item === homeDesignerPage ? 'font-semibold text-brand' : 'text-[#5871B3] transition hover:text-brand'}
                    type="button"
                    aria-current={item === homeDesignerPage ? 'page' : undefined}
                    onClick={() => setHomeDesignerPage(item)}
                  >
                    {item}
                  </button>
                )
              )}
            </nav>
            <Link className="flex items-center gap-1 text-brand" to={`/designers?sort=popularity&page=${homeDesignerPage}`}>Xem thêm <ArrowRight size={18} /></Link>
          </div>
        </div>
      </section>
      <section className="home-testimonial-bg min-h-[505px] py-[50px] text-white md:h-[505px]">
        <div className="container-page text-center">
          <p className="text-base font-bold leading-5">Với sự tin tưởng</p>
          <h2 className="mt-3 text-2xl font-bold leading-7">Của hơn 20.000 Khách hàng</h2>
          <div className="mx-auto mt-10 grid max-w-[990px] gap-9 md:grid-cols-3">
            {testimonials.map((item) => (
              <Card key={item.name} className="rounded-[20px] border-0 bg-white p-6 text-left text-ink shadow-[0_7px_36px_rgba(0,0,0,0.16)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-[11px]">
                    <img className="h-10 w-10 rounded-full bg-soft object-cover" src={`https://api.dicebear.com/8.x/initials/svg?seed=${item.name}`} alt={item.name} loading="lazy" />
                    <div>
                      <h3 className="text-base font-bold leading-6 text-[#1A202C]">{item.name}</h3>
                      <p className="mt-1 text-[9px] font-medium text-[#596780]"><span className="text-[#FBAD39]">★★★★★</span> {item.rating}</p>
                    </div>
                  </div>
                  <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                </div>
                <p className="mt-[22px] min-h-[72px] text-xs leading-6 text-[#596780]">{item.quote}</p>
                <div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold leading-[18px] text-black">
                  {item.tags.map((tag) => <span key={`${item.name}-${tag}`}>{tag}</span>)}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
      <section className="home-news-bg mb-12 mt-14 overflow-hidden pb-[41px] pt-[15px] md:mb-[61px] md:mt-[84px]">
        <div className="mx-auto w-[min(1031px,calc(100%_-_32px))]">
          <h2 className="text-center text-[28px] font-bold leading-[34px] text-white">Tin tức mới nhất</h2>
          <div className="mt-[18px] grid justify-center gap-[19px] lg:grid-cols-[346px_346px_346px]">
            {figmaNewsCards.map(([title, description], index) => (
              <article key={`${title}-${index}`} className="relative h-[416px] overflow-hidden rounded-[16px] bg-brand text-white shadow-[0_5px_18px_rgba(9,30,92,0.3)]">
                <img className="absolute left-1/2 top-1/2 h-[470px] w-full min-w-[346px] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover object-center md:w-[397px]" src="/assets/news-card.png" alt={title} loading="lazy" />
                <div className="relative z-10 flex h-full flex-col px-[22px] pt-[31px]">
                  <h3 className="max-w-[305px] font-['Plus_Jakarta_Sans'] text-[29px] font-semibold leading-[36px] tracking-[-.04em]">{title}</h3>
                  <p className="mt-[16px] max-w-[282px] font-['Plus_Jakarta_Sans'] text-[16px] font-medium leading-[21px] tracking-[-.04em]">{description}</p>
                  <Link className="mt-auto mb-[200px] flex h-[38px] w-[106px] items-center justify-center rounded-[8px] bg-white font-['Plus_Jakarta_Sans'] text-[14px] font-semibold text-brand" to="/help">Xem tin</Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export function DesignersPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(Number(params.get('page') || 1), 1);
  const sort = params.get('sort') || 'rating';
  const [keyword, setKeyword] = useState(params.get('q') || '');
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') || '1500000');
  const query = `?${params.toString()}`;
  const { data, isLoading } = useQuery({ queryKey: ['designers', query], queryFn: () => endpoints.designers(query) });
  const { data: discounts = [] } = useQuery({ queryKey: ['public-premium-discounts'], queryFn: () => endpoints.activeDiscounts('?appliesTo=premium&role=designer') });
  const designers = data?.items || [];
  const pages = Math.max(data?.pages || 1, 1);
  const total = data?.total || 0;
  const selectedCategories = useMemo(() => new Set((params.get('category') || '').split(',').filter(Boolean)), [params]);
  const selectedExperience = useMemo(() => new Set((params.get('experience') || '').split(',').filter(Boolean)), [params]);
  const selectedTags = useMemo(() => new Set((params.get('tags') || '').split(',').filter(Boolean)), [params]);
  const activeDiscount = discounts[0];
  const discountLabel = activeDiscount ? (activeDiscount.discountType === 'percent' ? `Giảm tới ${activeDiscount.value}%` : `Giảm ${Number(activeDiscount.value).toLocaleString('vi-VN')}đ`) : 'Ưu đãi Premium';
  const minOrderLabel = activeDiscount?.minOrderAmount ? `Đơn từ ${Number(activeDiscount.minOrderAmount).toLocaleString('vi-VN')}đ` : activeDiscount?.code ? `Mã ${activeDiscount.code}` : 'Mua ngay';

  function replaceParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setParams(next);
  }

  function toggleListParam(key: string, value: string, checked: boolean) {
    const values = new Set((params.get(key) || '').split(',').filter(Boolean));
    if (checked) values.add(value);
    else values.delete(value);
    replaceParams({ [key]: Array.from(values).join(','), page: '1' });
  }

  function applyFilters() {
    replaceParams({ q: keyword.trim() || null, minPrice: '30000', maxPrice, page: '1' });
  }

  function goToPage(nextPage: number) {
    replaceParams({ page: String(Math.min(Math.max(nextPage, 1), pages)) });
  }

  return (
    <main className="bg-white">
      <Seo title={'Tìm designer Việt Nam | VESD'} description={'Tìm designer freelance và sinh viên thiết kế theo danh mục, phong cách, đánh giá, ngân sách và thời gian bàn giao.'} />
      <section className="vesd-pattern flex min-h-[172px] items-center justify-center px-5 py-10 text-center text-white md:h-[204px]">
        <p className="max-w-3xl text-2xl leading-9 tracking-wide md:text-2xl">"Thiết kế tốt bắt đầu từ sự cộng tác đúng người"</p>
      </section>
      <div className="container-page grid min-w-0 gap-8 py-8 md:py-14 lg:grid-cols-[320px_1fr]">
        <aside className="min-w-0 self-start rounded-[20px] border border-[#CED8F4] bg-white px-4 py-5 md:px-6 md:py-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h1 className="text-2xl font-bold">Tìm kiếm</h1><Button className="h-[42px] w-full rounded-lg px-6 sm:w-auto md:px-8" onClick={applyFilters}>Lọc</Button></div>
          <div className="relative mt-7"><Search className="absolute left-4 top-3.5 text-brand" size={21} /><Input className="rounded-xl border-[#CED8F4] py-3 pl-12 text-base" placeholder="Tìm kiếm thông tin" value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') applyFilters(); }} /></div>
          <DesignerFilterSection title="Khoảng giá"><input className="mt-5 h-1.5 w-full accent-brand" type="range" min={30000} max={1500000} step={10000} value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} /><p className="mt-4 text-lg font-bold">Giá: 30K - {Number(maxPrice).toLocaleString('vi-VN')}</p></DesignerFilterSection>
          <DesignerFilterSection title="Danh mục">{categoryFilters.map((item) => <DesignerCheckRow key={item.value} label={item.label} count={data?.facets?.categories?.[item.value] || 0} checked={selectedCategories.has(item.value)} onChange={(checked) => toggleListParam('category', item.value, checked)} />)}</DesignerFilterSection>
          <DesignerFilterSection title="Sắp xếp"><Select className="border-0 px-0 text-brand" value={sort} onChange={(event) => replaceParams({ sort: event.target.value, page: '1' })}><option value="rating">Đánh giá cao tới thấp</option><option value="price">Giá thấp</option><option value="popularity">Phổ biến</option><option value="newest">Mới nhất</option></Select></DesignerFilterSection>
          <DesignerFilterSection title="Ngày đăng">{dateFilters.map((item) => <DesignerCheckRow key={item.value} label={item.label} count={item.value === 'all' ? total : undefined} checked={(params.get('dateRange') || 'all') === item.value} onChange={() => replaceParams({ dateRange: item.value === 'all' ? null : item.value, page: '1' })} />)}</DesignerFilterSection>
          <DesignerFilterSection title="Trình độ kinh nghiệm">{experienceFilters.map((item) => <DesignerCheckRow key={item.value} label={item.label} checked={selectedExperience.has(item.value)} onChange={(checked) => toggleListParam('experience', item.value, checked)} />)}</DesignerFilterSection>
          <DesignerFilterSection title="Tag liên quan"><div className="flex flex-wrap gap-3">{tagFilters.map((tag) => <button key={tag.value} className={`rounded-full px-4 py-1.5 text-brand ${selectedTags.has(tag.value) ? 'bg-brand text-white' : 'bg-blue-50'}`} onClick={() => toggleListParam('tags', tag.value, !selectedTags.has(tag.value))}>{tag.label}</button>)}</div></DesignerFilterSection>
          <Link className="relative mt-8 block min-h-[220px] overflow-hidden rounded-2xl text-white md:mt-16 md:min-h-[260px]" to="/pricing">
            <img className="absolute inset-0 h-full w-full object-cover" src="/assets/Frame 675679874.png" alt="" />
            <span className="relative z-10 block p-7 text-xl font-bold">Mua Premium ngay</span>
            <span className="relative z-10 mx-auto mt-10 block w-36 text-center text-3xl font-black leading-tight">{discountLabel}</span>
            <span className="relative z-10 mx-auto mt-6 block w-40 text-center text-xl font-bold">{minOrderLabel}</span>
            <ArrowRight className="relative z-10 mx-auto mt-10" size={38} />
          </Link>
        </aside>
        <section className="min-w-0">
          <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-bold md:text-4xl">Kết quả ({total})</h1>
            <Select className="w-full border-0 text-brand sm:w-auto" value={sort} onChange={(e) => replaceParams({ sort: e.target.value, page: '1' })}><option value="rating">Đánh giá cao tới thấp</option><option value="price">Giá thấp</option><option value="popularity">Phổ biến</option><option value="newest">Mới nhất</option></Select>
          </div>
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">{isLoading ? Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-80" />) : designers.length ? designers.map((p: any) => <DesignerCard key={p._id} profile={p} />) : <div className="md:col-span-2 xl:col-span-3"><EmptyState title="Không tìm thấy designer phù hợp" description="Thử giảm điều kiện lọc hoặc đổi từ khóa tìm kiếm." /></div>}</div>
          <DesignerPagination page={page} pages={pages} onPageChange={goToPage} />
        </section>
      </div>
    </main>
  );
}

const categoryFilters = [
  { label: 'Thiết kế đồ họa', value: 'logo-design' },
  { label: 'Hoạt ảnh 3D', value: 'poster-design' },
  { label: 'Thương hiệu', value: 'brand-identity' },
  { label: 'Minh họa', value: 'social-media-design' }
];

const dateFilters = [
  { label: 'Tất cả', value: 'all' },
  { label: '24h Trước', value: '1' },
  { label: '7 Ngày gần nhất', value: '7' },
  { label: 'Tháng này', value: '30' }
];

const experienceFilters = [
  { label: 'Mới bắt đầu', value: 'beginner' },
  { label: 'Trung cấp', value: 'intermediate' },
  { label: 'Chuyên gia', value: 'expert' }
];

const tagFilters = [
  { label: 'giảm giá', value: 'premium' },
  { label: 'Ứng dụng', value: 'modern' },
  { label: 'thiết kế game', value: 'playful' },
  { label: 'thương hiệu', value: 'corporate' },
  { label: 'logo', value: 'minimal' },
  { label: 'web', value: 'editorial' },
  { label: 'ui ux', value: 'friendly' },
  { label: 'chuyển động', value: 'bold' }
];

function DesignerFilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mt-8 min-w-0"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold md:text-2xl">{title}</h2><ChevronIcon /></div><div className="mt-5 min-w-0 space-y-4">{children}</div></div>;
}

function ChevronIcon() {
  return <span aria-hidden="true" className="block h-3 w-3 rotate-45 border-b-2 border-r-2 border-brand" />;
}

function DesignerCheckRow({ label, count, checked, onChange }: { label: string; count?: number; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex cursor-pointer items-center justify-between gap-3 text-base"><span className="flex min-w-0 items-center gap-3"><input className="h-5 w-5 flex-none rounded border-slate-400 accent-brand" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span className="break-words">{label}</span></span>{typeof count === 'number' && <span className="flex-none text-slate-500">{count}</span>}</label>;
}

function DesignerPagination({ page, pages, onPageChange }: { page: number; pages: number; onPageChange: (page: number) => void }) {
  const pageItems = Array.from(new Set([1, page - 1, page, page + 1, pages].filter((item) => item >= 1 && item <= pages)));
  return <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-lg text-brand md:mt-14 md:gap-5 md:text-2xl">{pageItems.map((item, index) => <span key={item} className="flex items-center gap-3 md:gap-5">{index > 0 && item - pageItems[index - 1] > 1 && <span>...</span>}<button className={item === page ? 'font-bold' : 'font-normal'} onClick={() => onPageChange(item)}>{item}</button></span>)}{page < pages && <button className="inline-flex items-center gap-2 font-medium md:ml-4" onClick={() => onPageChange(page + 1)}>Trang kế <ArrowRight size={20} /></button>}</div>;
}

const profileCategoryLabels: Record<string, string> = {
  'logo-design': 'Thiết kế logo',
  'brand-identity': 'Nhận diện thương hiệu',
  'poster-design': 'Poster',
  'social-media-design': 'Mạng xã hội',
  'packaging-design': 'Bao bì',
  'ui-ux-design': 'UI/UX'
};

function formatVnd(value?: number) {
  return typeof value === 'number' && value > 0 ? `${value.toLocaleString('vi-VN')}đ` : 'Trao đổi theo brief';
}

export function DesignerProfilePage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [draft, setDraft] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['designer', slug], queryFn: () => endpoints.designer(slug) });
  const startConversation = useMutation({
    mutationFn: ({ designerId, content }: { designerId: string; content: string }) => endpoints.startDirectConversation({ designerId, content }),
    onSuccess: (result) => navigate(`/client/messages/${result.conversation._id}`),
    onError: (error) => setContactMessage(error instanceof Error ? error.message : 'Chưa thể mở cuộc trò chuyện')
  });

  if (isLoading) return <main className="container-page py-10"><Skeleton className="h-96" /></main>;
  const profile = data?.profile;
  if (!profile) return <main className="container-page py-10"><EmptyState title="Không tìm thấy designer" /></main>;
  const user = profile.userId;
  const portfolio = data.portfolio || [];
  const reviews = data.reviews || [];
  const categoryNames = (profile.categories?.length ? profile.categories : ['brand-identity']).map((item: string) => profileCategoryLabels[item] || item);
  const skills = profile.skills?.length ? profile.skills : categoryNames;
  const coverImage = portfolio[0]?.images?.[0]?.url || '/assets/figma-hero-laptop.jpg';
  const avatar = user.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(user.name || profile.title || 'vesd')}`;
  const defaultMessage = `Xin chào ${user.name}, tôi muốn trao đổi về một dự án thiết kế.`;
  const portfolioItems = portfolio.length ? portfolio : [
    { _id: 'fallback-1', title: 'Bộ nhận diện thương hiệu', description: 'Logo, guideline màu sắc và key visual cho chiến dịch ra mắt.', images: [{ url: '/assets/figma-blue-board.png' }], tags: ['Branding', 'Guideline'] },
    { _id: 'fallback-2', title: 'Thiết kế mobile app', description: 'Luồng onboarding, hồ sơ người dùng và màn hình giao dịch.', images: [{ url: '/assets/figma-mobile-mockup.png' }], tags: ['UI/UX', 'Mobile'] },
    { _id: 'fallback-3', title: 'Ấn phẩm social media', description: 'Template hình ảnh nhất quán cho nội dung quảng cáo đa kênh.', images: [{ url: '/assets/figma-business-card.png' }], tags: ['Social', 'Campaign'] }
  ];
  const metrics = [
    { label: 'Dự án hoàn thành', value: (profile.completedProjects || 0).toLocaleString('vi-VN'), icon: BriefcaseBusiness },
    { label: 'Đánh giá', value: profile.ratingAverage ? profile.ratingAverage.toFixed(1) : 'Mới', icon: Star },
    { label: 'Lượt xem hồ sơ', value: (profile.profileViews || 0).toLocaleString('vi-VN'), icon: Eye },
    { label: 'Giá khởi điểm', value: formatVnd(profile.startingPrice), icon: WalletCards }
  ];

  function handleStartConversation() {
    setContactMessage('');
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (!currentUser.roles.includes('client')) {
      setContactMessage('Vui lòng dùng tài khoản khách hàng để nhắn tin trực tiếp với designer.');
      return;
    }
    startConversation.mutate({ designerId: user._id, content: draft.trim() || defaultMessage });
  }

  return (
    <main className="bg-white pb-16">
      <Seo title={`${user.name} - ${profile.title} | VESD`} description={`${user.name} nhận dự án ${profile.categories?.join(', ')} từ ${profile.startingPrice?.toLocaleString('vi-VN')}đ.`} schema={{ '@context': 'https://schema.org', '@type': 'Person', name: user.name, jobTitle: profile.title }} />
      <section className="relative h-[300px] overflow-hidden bg-brand text-white">
        <img className="absolute inset-0 h-full w-full object-cover opacity-70" src={coverImage} alt="" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand via-brand/70 to-brand/10" />
        <div className="container-page relative z-10 flex h-full items-end pb-24">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[.18em] text-white/80">VESD Designer Profile</p>
            <h1 className="mt-3 text-[34px] font-black leading-tight md:text-[48px]">{user.name}</h1>
            <p className="mt-3 max-w-xl text-base font-medium text-white/90 md:text-lg">{profile.title || 'Designer đồ họa'}</p>
          </div>
        </div>
      </section>

      <section className="container-page relative z-10 -mt-16">
        <div className="min-w-0 rounded-[18px] border border-line bg-white p-5 shadow-[0_18px_48px_rgba(36,83,214,0.16)] md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
              <Avatar className="h-28 w-28 border-4 border-white text-2xl shadow-soft" src={avatar} name={user.name} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="min-w-0 break-words text-3xl font-black text-ink">{user.name}</h2>
                  {profile.verificationStatus === 'verified' && <Badge tone="success">Đã xác minh</Badge>}
                  {profile.premiumStatus === 'premium' && <Badge tone="premium">Premium</Badge>}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
                  <span className="inline-flex items-center gap-1.5"><MapPin size={16} /> Việt Nam</span>
                  <span className="inline-flex items-center gap-1.5"><Clock3 size={16} /> {profile.availability === 'available' ? 'Sẵn sàng nhận dự án' : 'Trao đổi lịch làm việc'}</span>
                  <span className="inline-flex items-center gap-1.5"><Award size={16} /> {profile.experience || 'Kinh nghiệm dự án thực tế'}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <RatingStars value={profile.ratingAverage} />
                  <span className="text-sm font-semibold text-ink">{profile.ratingAverage ? profile.ratingAverage.toFixed(1) : 'Chưa có đánh giá'}</span>
                  <span className="text-sm text-muted">({profile.ratingCount || reviews.length} đánh giá)</span>
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button className="w-[calc(100%-2px)] rounded-full px-6 sm:w-auto" onClick={handleStartConversation} disabled={startConversation.isPending}>
                <MessageCircle size={18} /> {startConversation.isPending ? 'Đang mở...' : 'Nhắn tin'}
              </Button>
              <Link className="w-full sm:w-auto" to="/client/create-project">
                <Button variant="secondary" className="w-[calc(100%-2px)] rounded-full px-6 sm:w-full"><BriefcaseBusiness size={18} /> Thuê designer</Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-4">
          {metrics.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-[14px] border border-line bg-white p-5 shadow-[0_8px_24px_rgba(36,83,214,0.07)]">
              <Icon className="h-5 w-5 text-brand" />
              <p className="mt-3 text-2xl font-black text-ink">{value}</p>
              <p className="mt-1 text-sm text-muted">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            <section className="min-w-0 rounded-[18px] border border-line bg-white p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-black">Giới thiệu</h2>
                <div className="flex flex-wrap gap-2">{categoryNames.map((item: string) => <Badge key={item} tone="info">{item}</Badge>)}</div>
              </div>
              <p className="mt-5 break-words text-base leading-8 text-slate-700">{profile.bio || 'Designer Việt Nam có kinh nghiệm thực chiến với startup, SME và thương hiệu địa phương. Mạnh về brief rõ ràng, file bàn giao đúng chuẩn và phản hồi nhanh.'}</p>
              <div className="mt-6 flex flex-wrap gap-2">{skills.map((skill: string) => <Badge key={skill}>{skill}</Badge>)}</div>
            </section>

            <section>
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-2xl font-black">Hồ sơ năng lực</h2>
                <span className="shrink-0 text-sm font-semibold text-muted">{portfolioItems.length} dự án nổi bật</span>
              </div>
              <div className="mt-4 grid gap-5 md:grid-cols-3">
                {portfolioItems.map((item: any, index: number) => (
                  <article key={item._id || item.title} className="overflow-hidden rounded-[14px] border border-line bg-white shadow-[0_8px_24px_rgba(36,83,214,0.07)]">
                    <img className="aspect-[4/3] w-full object-cover" src={item.images?.[0]?.url || ['/assets/figma-blue-board.png', '/assets/figma-mobile-board.png', '/assets/figma-business-card.png'][index % 3]} alt={item.title} loading="lazy" />
                    <div className="p-4">
                      <h3 className="break-words text-base font-bold text-ink">{item.title}</h3>
                      <p className="mt-2 min-h-[48px] break-words text-sm leading-6 text-muted">{item.description || 'Thiết kế theo brief, có guideline và file bàn giao rõ ràng.'}</p>
                      <div className="mt-4 flex flex-wrap gap-2">{(item.tags || item.tools || []).slice(0, 3).map((tag: string) => <span key={tag} className="rounded-full bg-soft px-2.5 py-1 text-xs font-semibold text-brand">{tag}</span>)}</div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-5 md:grid-cols-2">
              <div className="rounded-[18px] border border-line bg-white p-6">
                <div className="flex items-center gap-3"><ShieldCheck className="text-brand" /><h2 className="text-xl font-black">Quy trình làm việc</h2></div>
                <div className="mt-5 space-y-4 text-sm leading-6 text-slate-700">
                  <p><span className="font-bold text-ink">1. Nhận brief:</span> xác định mục tiêu, người xem và phạm vi bàn giao.</p>
                  <p><span className="font-bold text-ink">2. Lên concept:</span> gửi moodboard, hướng hình ảnh và timeline.</p>
                  <p><span className="font-bold text-ink">3. Bàn giao:</span> đóng gói file nguồn, export và checklist nghiệm thu.</p>
                </div>
              </div>
              <div className="rounded-[18px] border border-line bg-white p-6">
                <div className="flex items-center gap-3"><Sparkles className="text-brand" /><h2 className="text-xl font-black">Thông tin chuyên môn</h2></div>
                <dl className="mt-5 grid gap-4 text-sm">
                  <div><dt className="font-semibold text-muted">Học vấn</dt><dd className="mt-1 font-bold text-ink">{profile.education || 'Thiết kế đồ họa / truyền thông thị giác'}</dd></div>
                  <div><dt className="font-semibold text-muted">Kinh nghiệm</dt><dd className="mt-1 font-bold text-ink">{profile.experience || '3-5 năm kinh nghiệm'}</dd></div>
                  <div><dt className="font-semibold text-muted">Danh mục mạnh</dt><dd className="mt-1 font-bold text-ink">{categoryNames.join(', ')}</dd></div>
                </dl>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-black">Đánh giá</h2>
                <span className="text-sm font-semibold text-muted">{reviews.length || profile.ratingCount || 0} phản hồi</span>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {reviews.length ? reviews.map((review: any) => (
                  <article key={review._id} className="rounded-[14px] border border-line bg-white p-5">
                    <div className="flex items-center justify-between gap-3">
                      <RatingStars value={review.rating} />
                      <span className="text-xs font-semibold text-muted">{new Date(review.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-700">{review.content}</p>
                  </article>
                )) : <div className="md:col-span-2"><EmptyState title="Chưa có đánh giá công khai" description="Khách hàng có thể bắt đầu trao đổi để đánh giá mức độ phù hợp trước khi thuê." /></div>}
              </div>
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[18px] border border-line bg-white p-6 shadow-[0_10px_30px_rgba(36,83,214,0.10)]">
              <p className="text-sm font-semibold text-muted">Gói dịch vụ bắt đầu từ</p>
              <p className="mt-2 text-3xl font-black text-ink">{formatVnd(profile.startingPrice)}</p>
              <p className="mt-2 text-sm leading-6 text-muted">Gửi tin nhắn trực tiếp để thống nhất brief, deadline và phạm vi bàn giao trước khi tạo dự án.</p>
              <textarea
                className="focus-ring mt-5 min-h-[118px] w-full resize-none rounded-xl border border-line bg-white px-4 py-3 text-sm leading-6"
                placeholder={defaultMessage}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <Button className="mt-4 w-[calc(100%-2px)] rounded-full" onClick={handleStartConversation} disabled={startConversation.isPending}><MessageCircle size={18} /> Nhắn tin cho designer</Button>
              <Link to="/client/create-project"><Button variant="secondary" className="mt-3 w-[calc(100%-2px)] rounded-full"><CalendarDays size={18} /> Tạo brief dự án</Button></Link>
              {contactMessage && <p className="mt-3 text-sm text-muted">{contactMessage}</p>}
            </div>
            <div className="rounded-[18px] border border-line bg-soft p-6">
              <h3 className="text-lg font-black">Cam kết trên VESD</h3>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                <p className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-brand" /> Trao đổi minh bạch trước khi đặt cọc escrow.</p>
                <p className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-brand" /> Theo dõi milestone, feedback và file bàn giao trong workspace.</p>
                <p className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-brand" /> Hồ sơ, portfolio và đánh giá được đồng bộ trên hệ thống.</p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

export function CategoryPage() {
  const { slug = 'logo-design' } = useParams();
  return <><DesignersPage /><section className="container-page pb-12"><Card><h2 className="text-2xl font-black">Dịch vụ {slug.replaceAll('-', ' ')}</h2><p className="mt-2 text-muted">VESD giúp doanh nghiệp tìm designer phù hợp cho {slug.replaceAll('-', ' ')}, có escrow, milestone, feedback và checklist file bàn giao đúng chuẩn.</p></Card></section></>;
}

export function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ['plans'], queryFn: () => endpoints.premiumPlans() });
  const openUpgrade = (plan: any) => {
    if (!user) return navigate('/login');
    if (user.roles.includes('admin')) return navigate('/admin/premium');
    if (plan.roleTarget === 'designer' || user.roles.includes('designer')) return navigate('/designer/premium');
    return navigate('/client/premium');
  };
  return <main className="container-page min-w-0 py-10"><Seo title="Bảng giá VESD" description="Các gói miễn phí, Business Premium và Designer Premium trên VESD." /><h1 className="text-4xl font-black">Bảng giá</h1><div className="mt-6 grid min-w-0 gap-4 md:grid-cols-3">{(data || []).map((plan: any) => <Card key={plan._id} className="min-w-0 max-sm:w-[calc(100vw-28px)]"><Badge tone="premium">{plan.roleTarget === 'client' ? 'Doanh nghiệp' : plan.roleTarget === 'designer' ? 'Designer' : 'Tất cả'}</Badge><h2 className="mt-3 break-words text-2xl font-black">{plan.name}</h2><p className="mt-2 break-words text-3xl font-black">{plan.price?.toLocaleString('vi-VN')}đ</p>{plan.benefits?.map((b: string) => <p key={b} className="mt-3 flex min-w-0 gap-2 break-words text-sm"><CheckCircle2 className="mt-0.5 flex-none text-brand" size={17} /><span className="min-w-0">{b}</span></p>)}<Button className="mt-5 w-[calc(100%-2px)]" onClick={() => openUpgrade(plan)}>Nâng cấp Premium</Button></Card>)}</div></main>;
}

export function HelpPage() {
  const topics = ['Hướng dẫn escrow', 'Hướng dẫn milestone dự án', 'Checklist bàn giao file', 'Chính sách khiếu nại', 'Câu hỏi thường gặp'];
  return <main className="container-page min-w-0 py-10"><Seo title="Trung tâm trợ giúp VESD" description="Hướng dẫn escrow, milestone, checklist bàn giao và chính sách khiếu nại." /><h1 className="break-words text-4xl font-black">Trung tâm trợ giúp</h1><div className="mt-6 grid min-w-0 gap-4 md:grid-cols-2">{topics.map((t) => <Card key={t} className="min-w-0"><h2 className="break-words font-bold">{t}</h2><p className="mt-2 break-words text-sm text-muted">Quy trình minh bạch để khách hàng và designer làm việc an toàn trên VESD.</p></Card>)}</div></main>;
}


