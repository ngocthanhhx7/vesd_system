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
  const avatar = user.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(user.name || profile.title || 'vesd')}`;
  const defaultMessage = `Xin chào ${user.name}, tôi muốn trao đổi về một dự án thiết kế.`;

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
    <main className="bg-white pb-16 font-sans">
      <Seo title={`${user.name} - ${profile.title} | VESD`} description={`${user.name} nhận dự án ${profile.categories?.join(', ')} từ ${profile.startingPrice?.toLocaleString('vi-VN')}đ.`} schema={{ '@context': 'https://schema.org', '@type': 'Person', name: user.name, jobTitle: profile.title }} />

      {/* Cover Banner (Fixed geometric pattern) */}
      <section
        className="relative h-[120px] w-full overflow-hidden flex items-center justify-center bg-cover bg-center border-b border-[#CED8F4]"
        style={{ backgroundImage: `url('/assets/Rectangle 23785.png')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10" />
        <p className="relative z-10 text-white/95 font-serif italic text-base md:text-lg font-medium text-center max-w-lg px-4 select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
          "Great design happens when great minds collaborate"
        </p>
      </section>

      {/* Main Header Container with Custom Background & Info */}
      <section className="container-page mt-6 relative z-10">
        <div className="bg-white overflow-hidden">
          {/* Custom Background Image Block */}
          <div
            className="relative h-[250px] w-full bg-cover bg-center bg-slate-50"
            style={{
              backgroundImage: profile.background ? `url(${profile.background})` : 'none'
            }}
          >
            {!profile.background && (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-center">
                <span className="text-slate-400 text-sm font-medium">Chưa thiết lập ảnh bìa cá nhân</span>
              </div>
            )}

            {/* Overlaid Breadcrumbs */}
            <div className="absolute top-4 left-6 z-20 text-xs sm:text-sm text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] font-semibold flex items-center gap-1.5">
              <Link to="/" className="hover:underline transition-all">Thuê Freelancer</Link>
              <span className="text-white/70">&gt;</span>
              <span className="font-bold">{user.name}</span>
            </div>
          </div>

          {/* Details & Actions Content */}
          <div className="py-6 px-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start min-w-0 flex-1">
                {/* Avatar and Social Media */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative -mt-20 sm:-mt-24 z-20">
                    <img
                      className="h-28 w-28 sm:h-32 sm:w-32 rounded-full border-4 border-white bg-slate-100 object-cover shadow-md"
                      src={avatar}
                      alt={user.name}
                    />
                  </div>
                  {/* Social Icons */}
                  <div className="flex items-center gap-3 mt-1">
                    <a href={profile.socialLinks?.facebook || "#"} target="_blank" rel="noreferrer" title="Facebook">
                      <svg className="w-5 h-5 fill-current text-slate-400 hover:text-blue-600 transition" viewBox="0 0 24 24">
                        <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.8z" />
                      </svg>
                    </a>
                    <a href={profile.socialLinks?.linkedin || "#"} target="_blank" rel="noreferrer" title="LinkedIn">
                      <svg className="w-5 h-5 fill-current text-slate-400 hover:text-blue-700 transition" viewBox="0 0 24 24">
                        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                      </svg>
                    </a>
                    <a href={profile.socialLinks?.twitter || "#"} target="_blank" rel="noreferrer" title="Twitter">
                      <svg className="w-5 h-5 fill-current text-slate-400 hover:text-sky-500 transition" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </a>
                    <a href={profile.socialLinks?.tiktok || "#"} target="_blank" rel="noreferrer" title="TikTok">
                      <svg className="w-5 h-5 fill-current text-slate-400 hover:text-black transition" viewBox="0 0 24 24">
                        <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.94-1.72-.8-.72-1.39-1.63-1.75-2.62-.01 1.7-.01 3.4-.01 5.11 0 2.24-.46 4.57-1.8 6.23-1.57 2.01-4.26 2.9-6.74 2.5-2.61-.41-4.83-2.39-5.46-4.97-.73-2.92.51-6.19 3.02-7.53 1.25-.66 2.69-.93 4.09-.8V12c-1.37.07-2.72.76-3.41 1.95-.74 1.25-.63 2.98.26 4.09 1.03 1.3 3.05 1.59 4.38.65 1.05-.72 1.48-2.09 1.48-3.33.01-4.81.01-9.61.01-14.42-.03-.31-.05-.62-.07-.92z" />
                      </svg>
                    </a>
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 text-center sm:text-left mt-2 sm:mt-0">
                  <h1 className="text-3xl font-bold text-slate-800 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    {user.name}
                    {profile.premiumStatus === 'premium' && (
                      <span className="inline-flex items-center gap-1 rounded bg-[#2457F5] px-2 py-0.5 text-xs font-bold text-white uppercase tracking-wider">
                        Premium
                      </span>
                    )}
                  </h1>

                  <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-sm">
                    <span className="text-[#FBAD39] text-lg">★★★★★</span>
                    <span className="font-semibold text-slate-700">{(profile.ratingAverage || 5.0).toFixed(1)}</span>
                    <span className="text-slate-500">({profile.ratingCount || 102} đánh giá)</span>
                  </div>

                  {/* Specialization Tags */}
                  <p className="mt-2 text-sm text-[#2457F5] font-semibold tracking-wide uppercase">
                    {profile.title || categoryNames.join(' | ') || 'Graphic Designer'}
                  </p>

                  {/* Status indicators */}
                  <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2 text-xs text-slate-500 font-semibold">
                    <span className="flex items-center gap-1.5 text-[#2457F5]">
                      <BriefcaseBusiness size={14} /> Nhận việc
                    </span>
                    <span className="flex items-center gap-1.5 text-[#2457F5]">
                      <Sparkles size={14} /> 100% - 225h
                    </span>
                    <span className="flex items-center gap-1.5 text-[#2457F5]">
                      <Clock3 size={14} /> Vừa hoạt động
                    </span>
                    <span className="flex items-center gap-1.5 text-[#2457F5]">
                      <MapPin size={14} /> {profile.address || (profile.experience ? `Kinh nghiệm ${profile.experience}` : 'Đến từ Hà Nội')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-row sm:flex-col lg:flex-row gap-4 w-full sm:w-auto self-center lg:self-start mt-4 sm:mt-0 shrink-0">
                <Button
                  variant="secondary"
                  className="w-full lg:w-[300px] h-10 rounded-[22px] border-[#2457F5] text-[#2457F5] hover:bg-blue-50 font-semibold"
                  onClick={handleStartConversation}
                  disabled={startConversation.isPending}
                >
                  Nhắn Tin
                </Button>
                <Link className="w-full lg:w-[300px]" to="/client/create-project">
                  <Button className="w-full h-10 rounded-[22px] bg-[#2457F5] hover:bg-blue-700 font-semibold shadow-md text-white">
                    Thuê Ngay
                  </Button>
                </Link>
              </div>
            </div>
            {contactMessage && <p className="mt-3 text-center sm:text-left text-sm text-red-500 font-semibold">{contactMessage}</p>}
          </div>
        </div>
      </section>

      {/* Main Body Grid */}
      <section className="container-page mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">

        {/* Left Column: Sidebar Card "Tỷ lệ nhận việc" */}
        <aside className="space-y-6">
          <div className="rounded-[20px] border border-[#CED8F4] bg-white p-5 shadow-sm text-center sm:text-left">
            <h3 className="text-base font-bold text-slate-800 border-b border-[#CED8F4] pb-3 mb-4">
              Tỷ lệ nhận việc
            </h3>

            {/* Inline SVG Chart */}
            <div className="my-4 flex justify-center">
              <svg className="w-full max-w-[240px] h-28" viewBox="0 0 240 100">
                <defs>
                  <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2457F5" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#2457F5" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                <line x1="10" y1="20" x2="230" y2="20" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="10" y1="50" x2="230" y2="50" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="10" y1="80" x2="230" y2="80" stroke="#F1F5F9" strokeWidth="1" />

                {/* Area under the line */}
                <path d="M 10 75 L 45 60 L 80 70 L 115 45 L 150 55 L 185 25 L 220 40 L 220 90 L 10 90 Z" fill="url(#chart-grad)" />

                {/* Main line path */}
                <path d="M 10 75 L 45 60 L 80 70 L 115 45 L 150 55 L 185 25 L 220 40" fill="none" stroke="#2457F5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Chart dots */}
                <circle cx="10" cy="75" r="4.5" fill="white" stroke="#2457F5" strokeWidth="2.5" />
                <circle cx="45" cy="60" r="4.5" fill="white" stroke="#2457F5" strokeWidth="2.5" />
                <circle cx="80" cy="70" r="4.5" fill="white" stroke="#2457F5" strokeWidth="2.5" />
                <circle cx="115" cy="45" r="4.5" fill="white" stroke="#2457F5" strokeWidth="2.5" />
                <circle cx="150" cy="55" r="4.5" fill="white" stroke="#2457F5" strokeWidth="2.5" />
                <circle cx="185" cy="25" r="4.5" fill="white" stroke="#2457F5" strokeWidth="2.5" />
                <circle cx="220" cy="40" r="4.5" fill="white" stroke="#2457F5" strokeWidth="2.5" />
              </svg>
            </div>

            {/* Weekday labels */}
            <div className="flex justify-between text-[10px] text-slate-400 font-medium px-1 mb-6">
              <span>T.hai</span>
              <span>T.ba</span>
              <span>T.tư</span>
              <span>T.năm</span>
              <span>T.sáu</span>
              <span>T.bảy</span>
              <span>CN</span>
            </div>

            {/* Stats details */}
            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between border-b border-[#F1F5F9] pb-2">
                <span className="text-slate-500 font-semibold">Tỷ lệ phản hồi</span>
                <span className="font-bold text-slate-850">90%</span>
              </div>
              <div className="flex justify-between border-b border-[#F1F5F9] pb-2">
                <span className="text-slate-500 font-semibold">Tỷ lệ hoàn thành</span>
                <span className="font-bold text-slate-850">100%</span>
              </div>
              <div className="flex justify-between border-b border-[#F1F5F9] pb-2">
                <span className="text-slate-500 font-semibold">Thời gian trả lời</span>
                <span className="font-bold text-slate-850">15m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Active projects</span>
                <span className="font-bold text-slate-850">{profile.completedProjects || 4}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Column: Giới thiệu, Portfolio, Đánh giá */}
        <div className="space-y-8 min-w-0">

          {/* Card Giới thiệu */}
          <section className="bg-white py-6">
            <h2 className="text-xl font-bold text-[#2457F5] pb-2 mb-4">
              Giới thiệu
            </h2>
            <div className="text-slate-600 text-sm leading-6 space-y-4">
              <p className="whitespace-pre-line text-[14.5px] leading-relaxed">
                {profile.bio || `Khang, tên là Khang — một designer 3D chuyên nghiệp với hơn 10 năm kinh nghiệm trong các mô hình 3D, hình ảnh trực quan và hoạt hình chất lượng cao...`}
              </p>

              {/* Skills Bullet List with checkmarks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5 pt-2 font-medium">
                {skills.map((skill: string, index: number) => (
                  <div key={`${skill}-${index}`} className="flex items-start gap-2.5">
                    <svg className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-slate-700">{skill}</span>
                  </div>
                ))}
              </div>

              {profile.education || profile.experience ? (
                <div className="pt-4 border-t border-[#F1F5F9]">
                  <dl className="grid gap-3 text-sm">
                    {profile.education && (
                      <div>
                        <dt className="font-semibold text-slate-500">Học vấn</dt>
                        <dd className="mt-1 font-bold text-slate-800">{profile.education}</dd>
                      </div>
                    )}
                    {profile.experience && (
                      <div>
                        <dt className="font-semibold text-slate-500">Kinh nghiệm</dt>
                        <dd className="mt-1 font-bold text-slate-800">{profile.experience}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              ) : null}

              <p className="pt-2">
                Dù bạn đang tìm kiếm một nhân vật hoạt hình, tài sản cho trò chơi, hay các mô hình chi tiết tinh xảo cho 3D hoặc ứng dụng thời gian thực, tôi mang đến kết quả chính xác, nổi bật về mặt thị giác và phù hợp với nhu cầu của bạn.
              </p>
              <p className="font-semibold text-slate-800">
                Hãy mang ý tưởng của bạn thành thực tế — Cộng tác và tôi sẽ chú ý đến chi tiết.
              </p>
            </div>
          </section>

          {/* Portfolio Grid */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Portfolio ({portfolio.length || 31})</h2>
              <Link to="/designers" className="text-sm font-semibold text-[#2457F5] hover:underline">
                Xem tất cả &gt;
              </Link>
            </div>

            {/* Masonry-like Grid Layout from Figma Design */}
            <div className="space-y-3">
              {/* Top Grid: Column 1, 2, 3, 4 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Column 1 (spans 2 rows / tall) */}
                <div className="row-span-2 h-[220px] md:h-[292px] bg-[#E2E8F0] rounded-lg border border-[#E2E8F0] overflow-hidden group relative">
                  {portfolio[0] ? (
                    <>
                      <img className="w-full h-full object-cover group-hover:scale-105 transition duration-300" src={portfolio[0]?.images?.[0]?.url} alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-3 text-white">
                        <span className="text-xs font-bold truncate">{portfolio[0]?.title}</span>
                      </div>
                    </>
                  ) : null}
                </div>

                {/* Column 2 Row 1 */}
                <div className="h-[104px] md:h-[140px] bg-[#E2E8F0] rounded-lg border border-[#E2E8F0] overflow-hidden group relative">
                  {portfolio[1] ? (
                    <>
                      <img className="w-full h-full object-cover group-hover:scale-105 transition duration-300" src={portfolio[1]?.images?.[0]?.url} alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-2 text-white">
                        <span className="text-xs font-bold truncate">{portfolio[1]?.title}</span>
                      </div>
                    </>
                  ) : null}
                </div>

                {/* Column 3 Row 1 */}
                <div className="h-[104px] md:h-[140px] bg-[#E2E8F0] rounded-lg border border-[#E2E8F0] overflow-hidden group relative">
                  {portfolio[2] ? (
                    <>
                      <img className="w-full h-full object-cover group-hover:scale-105 transition duration-300" src={portfolio[2]?.images?.[0]?.url} alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-2 text-white">
                        <span className="text-xs font-bold truncate">{portfolio[2]?.title}</span>
                      </div>
                    </>
                  ) : null}
                </div>

                {/* Column 4 (spans 2 rows / tall) */}
                <div className="row-span-2 h-[220px] md:h-[292px] bg-[#E2E8F0] rounded-lg border border-[#E2E8F0] overflow-hidden group relative">
                  {portfolio[3] ? (
                    <>
                      <img className="w-full h-full object-cover group-hover:scale-105 transition duration-300" src={portfolio[3]?.images?.[0]?.url} alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-3 text-white">
                        <span className="text-xs font-bold truncate">{portfolio[3]?.title}</span>
                      </div>
                    </>
                  ) : null}
                </div>

                {/* Column 2 Row 2 (renders under Column 2 Row 1) */}
                <div className="h-[104px] md:h-[140px] bg-[#E2E8F0] rounded-lg border border-[#E2E8F0] overflow-hidden group relative">
                  {portfolio[4] ? (
                    <>
                      <img className="w-full h-full object-cover group-hover:scale-105 transition duration-300" src={portfolio[4]?.images?.[0]?.url} alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-2 text-white">
                        <span className="text-xs font-bold truncate">{portfolio[4]?.title}</span>
                      </div>
                    </>
                  ) : null}
                </div>

                {/* Column 3 Row 2 (renders under Column 3 Row 1) */}
                <div className="h-[104px] md:h-[140px] bg-[#E2E8F0] rounded-lg border border-[#E2E8F0] overflow-hidden group relative">
                  {portfolio[5] ? (
                    <>
                      <img className="w-full h-full object-cover group-hover:scale-105 transition duration-300" src={portfolio[5]?.images?.[0]?.url} alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-2 text-white">
                        <span className="text-xs font-bold truncate">{portfolio[5]?.title}</span>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              {/* Bottom Grid: 5 equal columns */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[6, 7, 8, 9, 10].map((num) => (
                  <div key={num} className="h-[76px] md:h-[100px] bg-[#E2E8F0] rounded-lg border border-[#E2E8F0] overflow-hidden group relative">
                    {portfolio[num] ? (
                      <>
                        <img className="w-full h-full object-cover group-hover:scale-105 transition duration-300" src={portfolio[num]?.images?.[0]?.url} alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-2 text-white">
                          <span className="text-[10px] font-bold truncate">{portfolio[num]?.title}</span>
                        </div>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Reviews Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Đánh giá ({reviews.length || 102})</h2>
              <Link to="/designers" className="text-sm font-semibold text-[#2457F5] hover:underline">
                Xem tất cả &gt;
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(reviews.length > 0 ? reviews : [
                {
                  _id: "mock-r-1",
                  reviewerId: { name: "Nguyễn Huyền Ly", avatar: "https://api.dicebear.com/8.x/initials/svg?seed=Ly" },
                  rating: 5,
                  content: "Rất hài lòng khi cộng tác cùng Khang, quy trình làm việc rất nhanh và đúng thời hạn. Tôi rất hy vọng được làm việc lần tới cùng Khang.",
                  createdAt: "2026-02-28T12:00:00.000Z"
                },
                {
                  _id: "mock-r-2",
                  reviewerId: { name: "Nguyễn Huyền Ly", avatar: "https://api.dicebear.com/8.x/initials/svg?seed=Ly2" },
                  rating: 5,
                  content: "Rất hài lòng khi cộng tác cùng Khang, quy trình làm việc rất nhanh và đúng thời hạn. Tôi rất hy vọng được làm việc lần tới cùng Khang.",
                  createdAt: "2026-02-28T12:00:00.000Z"
                },
                {
                  _id: "mock-r-3",
                  reviewerId: { name: "Nguyễn Huyền Ly", avatar: "https://api.dicebear.com/8.x/initials/svg?seed=Ly3" },
                  rating: 5,
                  content: "Rất hài lòng khi cộng tác cùng Khang, quy trình làm việc rất nhanh và đúng thời hạn. Tôi rất hy vọng được làm việc lần tới cùng Khang.",
                  createdAt: "2026-02-28T12:00:00.000Z"
                },
                {
                  _id: "mock-r-4",
                  reviewerId: { name: "Nguyễn Huyền Ly", avatar: "https://api.dicebear.com/8.x/initials/svg?seed=Ly4" },
                  rating: 5,
                  content: "Rất hài lòng khi cộng tác cùng Khang, quy trình làm việc rất nhanh và đúng thời hạn. Tôi rất hy vọng được làm việc lần tới cùng Khang.",
                  createdAt: "2026-02-28T12:00:00.000Z"
                },
                {
                  _id: "mock-r-5",
                  reviewerId: { name: "Nguyễn Huyền Ly", avatar: "https://api.dicebear.com/8.x/initials/svg?seed=Ly5" },
                  rating: 5,
                  content: "Rất hài lòng khi cộng tác cùng Khang, quy trình làm việc rất nhanh và đúng thời hạn. Tôi rất hy vọng được làm việc lần tới cùng Khang.",
                  createdAt: "2026-02-28T12:00:00.000Z"
                },
                {
                  _id: "mock-r-6",
                  reviewerId: { name: "Nguyễn Huyền Ly", avatar: "https://api.dicebear.com/8.x/initials/svg?seed=Ly6" },
                  rating: 5,
                  content: "Rất hài lòng khi cộng tác cùng Khang, quy trình làm việc rất nhanh và đúng thời hạn. Tôi rất hy vọng được làm việc lần tới cùng Khang.",
                  createdAt: "2026-02-28T12:00:00.000Z"
                }
              ]).map((review: any) => (
                <article key={review._id} className="rounded-[18px] border border-[#CED8F4] bg-white p-5 flex flex-col justify-between shadow-sm relative">

                  {/* Header info */}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          className="h-10 w-10 rounded-full object-cover border border-[#CED8F4] bg-slate-50"
                          src={review.reviewerId?.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${review.reviewerId?.name}`}
                          alt={review.reviewerId?.name}
                        />
                        <div>
                          <h4 className="font-bold text-slate-850 text-sm">{review.reviewerId?.name}</h4>
                          <p className="text-[10px] text-slate-400 font-semibold">Thành viên - 4.2d</p>
                        </div>
                      </div>
                      {/* Bookmark Icon */}
                      <button className="text-slate-400 hover:text-[#2457F5] transition" aria-label="Lưu đánh giá">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>
                    </div>

                    {/* Gold Rating Stars */}
                    <div className="mt-3.5 flex items-center gap-0.5 text-[#FBAD39]">
                      {Array.from({ length: review.rating || 5 }).map((_, i) => (
                        <span key={i} className="text-base">★</span>
                      ))}
                    </div>

                    {/* Review Content */}
                    <p className="mt-3 text-xs leading-6 text-slate-500 font-semibold">
                      {review.content}
                    </p>
                  </div>

                  {/* Bottom Row metadata */}
                  <div className="mt-5 pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-slate-400 font-bold">
                    <span className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      <BriefcaseBusiness size={11} /> Dịch vụ đã chọn: 2D Art
                    </span>
                    <span className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      <Clock3 size={11} /> Ngày hoàn thành: 28/2/2026
                    </span>
                    <span className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      <CheckCircle2 size={11} /> Đã hoàn thành: 1 dự án
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
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


