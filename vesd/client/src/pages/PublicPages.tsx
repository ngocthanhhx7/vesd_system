import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, Filter, Folder, Heart, Search, Send, Star, Users } from 'lucide-react';
import { endpoints } from '../services/api';
import { Badge, Card, EmptyState, Input, RatingStars, Select, Skeleton } from '../components/ui/Primitives';
import { Button } from '../components/ui/Button';
import { DesignerCard } from '../components/cards/DesignerCard';
import { Seo } from '../components/seo/Seo';
import { useAuth } from '../hooks/useAuth';

export { DesignerCard };

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
  ['logo-design', 'Logo design'],
  ['brand-identity', 'Brand identity'],
  ['poster-design', 'Poster'],
  ['social-media-design', 'Social media'],
  ['packaging-design', 'Packaging'],
  ['ui-ux-design', 'UI/UX']
];

export function HomePage() {
  const { data } = useQuery({ queryKey: ['featured-designers'], queryFn: () => endpoints.designers('?limit=4&sort=popularity') });
  const { data: stats } = useQuery({ queryKey: ['public-stats'], queryFn: endpoints.publicStats });
  const { data: homeDiscounts = [] } = useQuery({ queryKey: ['home-discount'], queryFn: () => endpoints.activeDiscounts('?appliesTo=premium&role=both&home=true') });
  const homeDiscount = homeDiscounts[0];
  const countdown = useCountdown(homeDiscount?.endsAt);
  const homeDiscountValue = homeDiscount ? (homeDiscount.discountType === 'percent' ? `LÃªn tá»›i ${homeDiscount.value}%` : `Giáº£m ${Number(homeDiscount.value).toLocaleString('vi-VN')}Ä‘`) : 'LÃªn tá»›i 20%';
  const featured = data?.items?.length ? data.items : Array.from({ length: 3 }).map((_, index) => ({
    _id: `static-${index}`,
    title: 'Graphic Designer',
    bio: 'Xin chÃ o, tÃ´i lÃ  Khang, tÃ´i lÃ  Graphic Designer chuyÃªn vá» thiáº¿t káº¿ nháº­n diá»‡n thÆ°Æ¡ng hiá»‡u vÃ  thiáº¿t káº¿...',
    startingPrice: 100000,
    ratingAverage: 4.7,
    completedProjects: 127,
    userId: { name: 'VÅ© Tuáº¥n Khang', avatar: `https://api.dicebear.com/8.x/initials/svg?seed=vesd-${index}` }
  }));

  const categoryCards = [
    ['Graphic Design', 'Danh má»¥c ná»•i báº­t nháº¥t vá»›i hÆ¡n 12.000 NgÆ°á»i xem'],
    ['2D Animation', 'Danh má»¥c ná»•i báº­t nháº¥t vá»›i hÆ¡n 12.000 NgÆ°á»i xem'],
    ['Branding', 'Danh má»¥c ná»•i báº­t nháº¥t vá»›i hÆ¡n 12.000 NgÆ°á»i xem'],
    ['Product Design', 'Danh má»¥c ná»•i báº­t nháº¥t vá»›i hÆ¡n 12.000 NgÆ°á»i xem'],
    ['Branding', 'Danh má»¥c Ä‘Æ°á»£c nhiá»u doanh nghiá»‡p quan tÃ¢m nháº¥t'],
    ['3D Art', 'ÄÆ°á»£c nhiá»u nhÃ  phÃ¡t triá»ƒn game quan tÃ¢m nháº¥t'],
    ['Poster Design', 'Danh má»¥c cÃ³ nhiá»u dá»± Ã¡n nháº¥t vá»›i hÆ¡n 5.000 dá»± Ã¡n'],
    ['AI Generated Art', 'Danh má»¥c má»›i nháº¥t cá»§a VESD vá»›i sá»± phÃ¡t triá»ƒn nhanh chÃ³ng trong cá»™ng Ä‘á»“ng']
  ];

  const milestoneItems = [
    { icon: Users, value: (stats?.freelancers ?? 5000).toLocaleString('vi-VN'), label: 'Freelancer trÃªn cáº£ nÆ°á»›c' },
    { icon: Send, value: (stats?.clients ?? 12000).toLocaleString('vi-VN'), label: 'KhÃ¡ch hÃ ng' },
    { icon: Folder, value: (stats?.activeProjects ?? 1302).toLocaleString('vi-VN'), label: 'Dá»± Ã¡n Ä‘ang diá»…n ra' },
    { icon: Star, value: String(stats?.averageRating ?? 4.97), label: 'Trung bÃ¬nh Rating' }
  ];

  const testimonials = [
    { name: 'VÅ© Kim ThÃºy', rating: '529 Rating', quote: 'Quy trÃ¬nh lÃ m viá»‡c thá»±c sá»± ráº¥t minh báº¡ch, mÃ¬nh ráº¥t hÃ i lÃ²ng khi cÃ³ má»™t trang web freelancer cÃ³ trÃ¬nh tá»± lÃ m viá»‡c tá»‘t nhÆ° váº­y.', tags: ['3D Artist', 'Animation', 'Freelancer'] },
    { name: 'Nguyá»…n Há»“ng Vy', rating: '110 Rating', quote: 'MÃ¬nh cáº£m tháº¥y ráº¥t an tÃ¢m khi thuÃª cÃ¡c báº¡n freelancer qua VESD, chÃ­nh sÃ¡ch vÃ  báº£o máº­t ráº¥t rÃµ rÃ ng vÃ  khÃ¡ch quan.', tags: ['Tech Startup', 'Client'] },
    { name: 'LÃª Duy Nam', rating: '472 Rating', quote: 'App nÃ y khÃ¡ xin, mÃ¬nh thÃ­ch.', tags: ['Tech Startup', 'Client'] }
  ];

  const figmaNewsCards = [
    ['Workshop Ká»¹ nÄƒng NgÃ y 28/3', 'Workshop káº¿t ná»‘i vÃ  phÃ¡t triá»ƒn ká»¹ nÄƒng cho cÃ¡c freelancer cá»§a ná»n táº£ng'],
    ['Tin tá»©c má»›i cá»§a VESD', 'Workshop káº¿t ná»‘i vÃ  phÃ¡t triá»ƒn ká»¹ nÄƒng cho cÃ¡c freelancer cá»§a ná»n táº£ng. Workshop káº¿t ná»‘i vÃ  phÃ¡t triá»ƒn ká»¹ nÄƒng cho cÃ¡c freelancer cá»§a ná»n táº£ng'],
    ['Tin tá»©c má»›i cá»§a VESD', 'Workshop káº¿t ná»‘i vÃ  phÃ¡t triá»ƒn ká»¹ nÄƒng cho cÃ¡c freelancer cá»§a ná»n táº£ng']
  ];

  return (
    <>
      <Seo title="VESD - Ná»n táº£ng káº¿t ná»‘i khÃ¡ch hÃ ng vá»›i designer Viá»‡t Nam" description="TÃ¬m designer phÃ¹ há»£p nhanh hÆ¡n, an toÃ n hÆ¡n vá»›i escrow, milestone, verified profile vÃ  checklist bÃ n giao." schema={{ '@context': 'https://schema.org', '@type': 'Organization', name: 'VESD', url: window.location.origin }} />
      <section className="home-hero-panels relative -mt-16 h-[686px] overflow-hidden bg-brand text-white">
        <h1 className="sr-only">N&#417;i t&#224;i n&#259;ng Vi&#7879;t k&#7871;t n&#7889;i d&#7921; &#225;n thi&#7871;t k&#7871; minh b&#7841;ch an to&#224;n chuy&#234;n nghi&#7879;p</h1>
        <div className="flex h-full w-full">
          <div className="hero-main relative h-full overflow-hidden">
            <img className="absolute inset-0 h-full w-full object-cover object-left" src="/assets/banner-main.png" alt="" loading="eager" />
            <div className="relative z-10 flex h-full flex-col justify-center pl-[8.25vw] pt-[42px]">
              <p className="font-['Plus_Jakarta_Sans'] text-[20px] font-medium leading-6 tracking-[.02em]">&mdash; N&#417;i T&#224;i N&#259;ng Vi&#7879;t K&#7871;t N&#7889;i D&#7921; &#193;n</p>
              <p className="mt-[18px] max-w-[640px] font-['Plus_Jakarta_Sans'] text-[48px] font-semibold leading-[60px] tracking-[.01em]">Minh b&#7841;ch &ndash; An to&#224;n &ndash; Chuy&#234;n nghi&#7879;p</p>
              <Link className="mt-[33px] flex h-[56px] w-[225px] items-center justify-center rounded-[28px] bg-white font-['Plus_Jakarta_Sans'] text-[20px] font-semibold text-brand transition hover:scale-[1.03]" to="/designers">Kh&#225;m Ph&#225;</Link>
            </div>
          </div>
          <Link className="hero-action group relative h-full overflow-hidden" to="/designers" aria-label="T&#236;m designer">
            <img className="hero-action-image absolute inset-0 h-full w-full object-cover object-center" src="/assets/banner-designer.png" alt="" loading="eager" />
            <span className="absolute bottom-[121px] left-1/2 flex h-[38px] w-[164px] -translate-x-1/2 items-center justify-center rounded-[20px] border-[3px] border-white font-['Plus_Jakarta_Sans'] text-base font-semibold text-white transition group-hover:bg-white group-hover:text-brand">T&#236;m designer</span>
          </Link>
          <Link className="hero-action group relative h-full overflow-hidden" to="/register" aria-label="T&#236;m vi&#7879;c">
            <img className="hero-action-image absolute inset-0 h-full w-full object-cover object-center" src="/assets/banner-job.png" alt="" loading="eager" />
            <span className="absolute bottom-[121px] left-1/2 flex h-[38px] w-[164px] -translate-x-1/2 items-center justify-center rounded-[20px] border-[3px] border-white font-['Plus_Jakarta_Sans'] text-base font-semibold text-white transition group-hover:bg-white group-hover:text-brand">T&#236;m vi&#7879;c</span>
          </Link>
        </div>
      </section>
      <section className="bg-white pb-[28px] pt-[17px]">
        <div className="container-page">
          <p className="mb-[11px] text-center text-base font-normal tracking-[.02em] text-brand">ÄÆ°á»£c há»— trá»£ bá»Ÿi</p>
          <img className="mx-auto h-auto w-full max-w-[1197px]" src="/assets/sponsors.png" alt="Adobe, ArtStation, FPT University, Arena Multimedia, Behance" />
        </div>
      </section>
      <section className="home-orb-bg min-h-[661px] overflow-hidden py-5 text-white">
        <div className="container-page">
          <h2 className="text-center text-[32px] font-bold leading-[38px]">Danh má»¥c</h2>
          <div className="mt-[46px] grid gap-x-[22px] gap-y-6 md:grid-cols-4">
            {categoryCards.map(([title, description], index) => (
              <Link
                key={`${title}-${description}-${index}`}
                className={`group flex min-h-[218px] flex-col items-center justify-center rounded-xl border border-[#CED8F4] px-5 py-10 text-center text-white shadow-[0_3px_8px_rgba(48,150,137,0.05)] transition hover:-translate-y-1 hover:bg-white/10 ${index < 4 ? 'bg-white/[0.06]' : 'bg-white/0'}`}
                to="/designers"
              >
                <h3 className="text-xl font-semibold leading-6">{title}</h3>
                <p className="mt-6 max-w-[214px] text-[14.8px] leading-[22px] text-white">{description}</p>
                <span className="mt-6 rounded-xl bg-[#E9EFFF] px-3 py-2 text-[14.8px] leading-none text-brand transition group-hover:bg-white">Xem thÃªm</span>
              </Link>
            ))}
            </div>
          </div>
      </section>
      <section className="bg-white pb-[178px] pt-[77px]">
        <div className="home-milestone-bg relative h-[540px] overflow-visible text-white">
          <div className="container-page">
            <h2 className="pt-[51px] text-center text-[32px] font-bold leading-[30px]">Má»™t sá»‘ Milestones cá»§a VESD</h2>
            <div className="mx-auto mt-[104px] grid max-w-[1070px] grid-cols-2 gap-y-10 text-center md:grid-cols-4 md:gap-x-[33px]">
              {milestoneItems.map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex flex-col items-center gap-3">
                  <Icon className="h-[69px] w-[69px] stroke-[1.8]" />
                  <div>
                    <p className="text-[34px] font-semibold leading-[41px] tracking-wide"><CountUpNumber value={value} /></p>
                    <p className="mt-[14px] text-[17px] font-medium leading-5">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="container-page absolute -bottom-[116px] left-1/2 -translate-x-1/2">
            <div className="home-premium-banner grid min-h-[207px] overflow-hidden rounded-[20px] text-white shadow-[0_-9px_41px_rgba(6,23,82,0.43)] md:grid-cols-[1.05fr_.7fr_1.45fr]">
              <div className="flex flex-col justify-center px-[8.4%] py-8">
                <p className="text-2xl font-bold leading-7 tracking-[.02em]">{homeDiscount?.name || 'Giam gia VESD premium'}</p>
                <p className="mt-2 text-4xl font-bold leading-[43px] tracking-[.02em]">{homeDiscountValue}</p>
                <Link className="mt-6 flex h-[30px] w-[208px] items-center justify-center rounded-[20px] border-2 border-white text-xs font-bold tracking-[.02em]" to="/pricing">Mua ngay</Link>
              </div>
              <div className="flex items-center justify-center border-y border-white/20 font-['Zen_Tokyo_Zoo'] text-[42px] font-normal leading-none tracking-wide md:border-x md:border-y-0">LIMITED</div>
              <div className="grid grid-cols-4 text-center">
                {[
                  [countdown.days, 'Ngày'],
                  [countdown.hours, 'Giờ'],
                  [countdown.minutes, 'Phút'],
                  [countdown.seconds, 'Giây']
                ].map(([value, label]) => {
                  return <div key={label} className="flex flex-col items-center justify-center border-l border-white/25 px-2 py-8"><span className="font-['Zen_Dots'] text-4xl italic leading-[43px] tracking-[.02em]">{value}</span><span className="mt-4 text-2xl font-bold leading-7 tracking-[.02em]">{label}</span></div>;
                })}
            </div>
          </div>
        </div>
        </div>
      </section>
      <section className="home-cta-pattern relative h-[518px] overflow-hidden bg-brand text-white">
        <img className="absolute right-0 top-0 hidden h-[554px] w-[46.5%] object-cover lg:block" src="/assets/figma-hero-laptop.jpg" alt="Freelancer VESD" loading="lazy" />
        <div className="container-page relative z-10 flex h-full items-center">
          <div className="max-w-[496px]">
            <h2 className="text-[36px] font-semibold leading-[43px]">Trá»Ÿ thÃ nh Freelancer cá»§a VESD HÃ´m nay</h2>
            <p className="mt-5 text-base font-medium leading-6">Tham gia vÃ o cá»™ng Ä‘á»“ng freelancer chÃºng tÃ´i vá»›i nhiá»u Æ°u Ä‘Ã£i háº¥p dáº«n cÃ¹ng vá»›i nhá»¯ng Ä‘áº·c quyá»n chá»‰ riÃªng VESD cÃ³</p>
            <div className="mt-[35px] flex flex-wrap gap-[22px]">
              <Link className="flex h-[32px] w-[234px] items-center justify-center rounded-[20px] bg-brand text-[11.3px] font-medium uppercase shadow-[0_0_0_1px_rgba(255,255,255,0.15)]" to="/register">Tham Gia Ngay</Link>
              <Link className="flex h-[32px] w-[234px] items-center justify-center rounded-[20px] border border-white text-[11.3px] font-medium uppercase" to="/help">TÃ¬m Hiá»ƒu ThÃªm</Link>
            </div>
          </div>
        </div>
      </section>
      <section className="bg-white pb-[123px] pt-[70px]">
        <div className="container-page">
          <div className="mx-auto max-w-[582px]">
            <h2 className="text-center text-[36px] font-semibold leading-[27px]">Top VESD designer</h2>
            <div className="mt-[23px] h-0.5 bg-brand" />
          </div>
          <div className="mt-[60px] grid justify-center gap-[49px] md:grid-cols-[282px_282px_282px]">
            {featured.slice(0, 3).map((profile: any, index: number) => <div key={profile._id} className={index === 1 ? 'md:-mt-[46px]' : ''}><DesignerCard profile={profile} /></div>)}
          </div>
          <div className="mt-[6px] flex flex-col items-center gap-3 text-base font-medium text-[#5871B3]">
            <div className="flex items-center gap-2"><span className="font-semibold text-brand">1</span><span>2</span><span>3</span><span>...</span><span>7</span></div>
            <Link className="flex items-center gap-1 text-brand" to="/designers">Xem thÃªm <ArrowRight size={18} /></Link>
          </div>
        </div>
      </section>
      <section className="home-testimonial-bg min-h-[505px] py-[50px] text-white md:h-[505px]">
        <div className="container-page text-center">
          <p className="text-base font-bold leading-5">Vá»›i sá»± tin tÆ°á»Ÿng</p>
          <h2 className="mt-3 text-2xl font-bold leading-7">Cá»§a hÆ¡n 20.000 KhÃ¡ch hÃ ng</h2>
          <div className="mx-auto mt-10 grid max-w-[990px] gap-9 md:grid-cols-3">
            {testimonials.map((item) => (
              <Card key={item.name} className="rounded-[20px] border-0 bg-white p-6 text-left text-ink shadow-[0_7px_36px_rgba(0,0,0,0.16)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-[11px]">
                    <img className="h-10 w-10 rounded-full bg-soft object-cover" src={`https://api.dicebear.com/8.x/initials/svg?seed=${item.name}`} alt={item.name} loading="lazy" />
                    <div>
                      <h3 className="text-base font-bold leading-6 text-[#1A202C]">{item.name}</h3>
                      <p className="mt-1 text-[9px] font-medium text-[#596780]"><span className="text-[#FBAD39]">â˜…â˜…â˜…â˜…â˜…</span> {item.rating}</p>
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
      <section className="home-news-bg mb-[61px] mt-[84px] overflow-hidden pb-[41px] pt-[15px]">
        <div className="mx-auto w-[min(1031px,calc(100%_-_32px))]">
          <h2 className="text-center text-[28px] font-bold leading-[34px] text-white">Tin tá»©c má»›i nháº¥t</h2>
          <div className="mt-[18px] grid justify-center gap-[19px] lg:grid-cols-[346px_346px_346px]">
            {figmaNewsCards.map(([title, description], index) => (
              <article key={`${title}-${index}`} className="relative h-[416px] overflow-hidden rounded-[16px] bg-brand text-white shadow-[0_5px_18px_rgba(9,30,92,0.3)]">
                <img className="absolute left-1/2 top-1/2 h-[470px] w-[397px] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover object-center" src="/assets/news-card.png" alt={title} loading="lazy" />
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
  const discountLabel = activeDiscount ? (activeDiscount.discountType === 'percent' ? `Giáº£m tá»›i ${activeDiscount.value}%` : `Giáº£m ${Number(activeDiscount.value).toLocaleString('vi-VN')}Ä‘`) : 'Æ¯u Ä‘Ã£i Premium';
  const minOrderLabel = activeDiscount?.minOrderAmount ? `ÄÆ¡n tá»« ${Number(activeDiscount.minOrderAmount).toLocaleString('vi-VN')}Ä‘` : activeDiscount?.code ? `MÃ£ ${activeDiscount.code}` : 'Mua ngay';

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
      <Seo title={'Explore designers Viá»‡t Nam | VESD'} description={'TÃ¬m designer freelance vÃ  sinh viÃªn thiáº¿t káº¿ theo category, style, rating, budget vÃ  delivery time.'} />
      <section className="vesd-pattern flex h-[204px] items-center justify-center text-white">
        <p className="text-2xl tracking-wide">"Great design happens when great minds collaborate"</p>
      </section>
      <div className="container-page grid gap-8 py-14 lg:grid-cols-[320px_1fr]">
        <aside className="self-start rounded-[20px] border border-[#CED8F4] bg-white px-6 py-7">
          <div className="flex items-center justify-between gap-4"><h1 className="text-2xl font-bold">TÃ¬m kiáº¿m</h1><Button className="h-[42px] rounded-lg px-8" onClick={applyFilters}>Lá»c</Button></div>
          <div className="relative mt-7"><Search className="absolute left-4 top-3.5 text-brand" size={21} /><Input className="rounded-xl border-[#CED8F4] py-3 pl-12 text-base" placeholder="TÃ¬m kiáº¿m thÃ´ng tin" value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') applyFilters(); }} /></div>
          <DesignerFilterSection title="Range giÃ¡"><input className="mt-5 h-1.5 w-full accent-brand" type="range" min={30000} max={1500000} step={10000} value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} /><p className="mt-4 text-lg font-bold">GiÃ¡: 30K - {Number(maxPrice).toLocaleString('vi-VN')}</p></DesignerFilterSection>
          <DesignerFilterSection title="Category">{categoryFilters.map((item) => <DesignerCheckRow key={item.value} label={item.label} count={data?.facets?.categories?.[item.value] || 0} checked={selectedCategories.has(item.value)} onChange={(checked) => toggleListParam('category', item.value, checked)} />)}</DesignerFilterSection>
          <DesignerFilterSection title="Lá»c theo"><Select className="border-0 px-0 text-brand" value={sort} onChange={(event) => replaceParams({ sort: event.target.value, page: '1' })}><option value="rating">Rating cao tá»›i tháº¥p</option><option value="price">GiÃ¡ tháº¥p</option><option value="popularity">Phá»• biáº¿n</option><option value="newest">Má»›i nháº¥t</option></Select></DesignerFilterSection>
          <DesignerFilterSection title="NgÃ y Ä‘Äƒng">{dateFilters.map((item) => <DesignerCheckRow key={item.value} label={item.label} count={item.value === 'all' ? total : undefined} checked={(params.get('dateRange') || 'all') === item.value} onChange={() => replaceParams({ dateRange: item.value === 'all' ? null : item.value, page: '1' })} />)}</DesignerFilterSection>
          <DesignerFilterSection title="TrÃ¬nh Ä‘á»™ kinh nghiá»‡m">{experienceFilters.map((item) => <DesignerCheckRow key={item.value} label={item.label} checked={selectedExperience.has(item.value)} onChange={(checked) => toggleListParam('experience', item.value, checked)} />)}</DesignerFilterSection>
          <DesignerFilterSection title="CÃ¡c tags"><div className="flex flex-wrap gap-3">{tagFilters.map((tag) => <button key={tag.value} className={`rounded-full px-4 py-1.5 text-brand ${selectedTags.has(tag.value) ? 'bg-brand text-white' : 'bg-blue-50'}`} onClick={() => toggleListParam('tags', tag.value, !selectedTags.has(tag.value))}>{tag.label}</button>)}</div></DesignerFilterSection>
          <Link className="relative mt-16 block min-h-[260px] overflow-hidden rounded-2xl text-white" to="/pricing">
            <img className="absolute inset-0 h-full w-full object-cover" src="/assets/Frame 675679874.png" alt="" />
            <span className="relative z-10 block p-7 text-xl font-bold">Mua Premium Ngay</span>
            <span className="relative z-10 mx-auto mt-10 block w-36 text-center text-3xl font-black leading-tight">{discountLabel}</span>
            <span className="relative z-10 mx-auto mt-6 block w-40 text-center text-xl font-bold">{minOrderLabel}</span>
            <ArrowRight className="relative z-10 mx-auto mt-10" size={38} />
          </Link>
        </aside>
        <section>
          <div className="mb-7 flex items-center justify-between">
            <h1 className="text-4xl font-bold">Káº¿t quáº£ ({total})</h1>
            <Select className="w-auto border-0 text-brand" value={sort} onChange={(e) => replaceParams({ sort: e.target.value, page: '1' })}><option value="rating">Rating cao tá»›i tháº¥p</option><option value="price">GiÃ¡ tháº¥p</option><option value="popularity">Phá»• biáº¿n</option><option value="newest">Má»›i nháº¥t</option></Select>
          </div>
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">{isLoading ? Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-80" />) : designers.length ? designers.map((p: any) => <DesignerCard key={p._id} profile={p} />) : <div className="md:col-span-2 xl:col-span-3"><EmptyState title="KhÃ´ng tÃ¬m tháº¥y designer phÃ¹ há»£p" description="Thá»­ giáº£m Ä‘iá»u kiá»‡n lá»c hoáº·c Ä‘á»•i tá»« khÃ³a tÃ¬m kiáº¿m." /></div>}</div>
          <DesignerPagination page={page} pages={pages} onPageChange={goToPage} />
        </section>
      </div>
    </main>
  );
}

const categoryFilters = [
  { label: 'Graphic design', value: 'logo-design' },
  { label: '3D Animation', value: 'poster-design' },
  { label: 'Branding', value: 'brand-identity' },
  { label: 'Illustration', value: 'social-media-design' }
];

const dateFilters = [
  { label: 'Táº¥t cáº£', value: 'all' },
  { label: '24h TrÆ°á»›c', value: '1' },
  { label: '7 NgÃ y gáº§n nháº¥t', value: '7' },
  { label: 'ThÃ¡ng nÃ y', value: '30' }
];

const experienceFilters = [
  { label: 'Má»›i báº¯t Ä‘áº§u', value: 'beginner' },
  { label: 'Trung cáº¥p', value: 'intermediate' },
  { label: 'ChuyÃªn gia', value: 'expert' }
];

const tagFilters = [
  { label: 'giáº£m giÃ¡', value: 'premium' },
  { label: 'App', value: 'modern' },
  { label: 'thiáº¿t káº¿ game', value: 'playful' },
  { label: 'brand', value: 'corporate' },
  { label: 'logo', value: 'minimal' },
  { label: 'web', value: 'editorial' },
  { label: 'ui ux', value: 'friendly' },
  { label: 'Animation', value: 'bold' }
];

function DesignerFilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mt-8"><div className="flex items-center justify-between"><h2 className="text-2xl font-bold">{title}</h2><ChevronIcon /></div><div className="mt-5 space-y-4">{children}</div></div>;
}

function DesignerCheckRow({ label, count, checked, onChange }: { label: string; count?: number; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex cursor-pointer items-center justify-between text-base"><span className="flex items-center gap-3"><input className="h-5 w-5 rounded border-slate-400 accent-brand" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</span>{typeof count === 'number' && <span className="text-slate-500">{count}</span>}</label>;
}

function DesignerPagination({ page, pages, onPageChange }: { page: number; pages: number; onPageChange: (page: number) => void }) {
  const pageItems = Array.from(new Set([1, page - 1, page, page + 1, pages].filter((item) => item >= 1 && item <= pages)));
  return <div className="mt-14 flex items-center justify-center gap-5 text-2xl text-brand">{pageItems.map((item, index) => <span key={item} className="flex items-center gap-5">{index > 0 && item - pageItems[index - 1] > 1 && <span>...</span>}<button className={item === page ? 'font-bold' : 'font-normal'} onClick={() => onPageChange(item)}>{item}</button></span>)}{page < pages && <button className="ml-4 inline-flex items-center gap-2 font-medium" onClick={() => onPageChange(page + 1)}>Trang káº¿ <ArrowRight /></button>}</div>;
}

function LegacyDesignersPage() {
  const [params, setParams] = useSearchParams();
  const query = `?${params.toString()}`;
  const { data, isLoading } = useQuery({ queryKey: ['designers', query], queryFn: () => endpoints.designers(query) });
  const designers = data?.items?.length ? data.items : Array.from({ length: 12 }).map((_, index) => ({
    _id: `fallback-${index}`,
    bio: 'Xin ch\u00e0o, t\u00f4i l\u00e0 Khang, t\u00f4i l\u00e0 Graphic Designer chuy\u00ean v\u1ec1 thi\u1ebft k\u1ebf nh\u1eadn di\u1ec7n th\u01b0\u01a1ng hi\u1ec7u v\u00e0 thi\u1ebft k\u1ebf. T\u00f4i c\u00f3 tr\u00e1ch nhi\u1ec7m khi l\u00e0m vi\u1ec7c v\u00e0 t\u01b0 duy \u0111\u1ed3 h\u1ecda kh\u00e1 t\u1ed1t.',
    userId: { name: index === 1 ? 'Ho\u00e0ng Xu\u00e2n Tu\u1ea5n' : index === 2 ? 'L\u00ea Ho\u00e0ng Long' : 'V\u0169 Tu\u1ea5n Khang', avatar: `https://api.dicebear.com/8.x/initials/svg?seed=designer-${index}` }
  }));

  return (
    <main className="bg-white">
      <Seo title={'Explore designers Vi\u1ec7t Nam | VESD'} description={'T\u00ecm designer freelance v\u00e0 sinh vi\u00ean thi\u1ebft k\u1ebf theo category, style, rating, budget v\u00e0 delivery time.'} />
      <section className="vesd-pattern flex h-[204px] items-center justify-center text-white">
        <p className="text-2xl tracking-wide">"Great design happens when great minds collaborate"</p>
      </section>
      <div className="container-page grid gap-8 py-14 lg:grid-cols-[320px_1fr]">
        <aside className="self-start rounded-2xl border border-pale bg-white p-6">
          <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">TÃ¬m kiáº¿m</h1><Button className="rounded-full px-8">Lá»c</Button></div>
          <div className="relative mt-7"><Search className="absolute left-4 top-3.5 text-brand" size={21} /><Input className="rounded-xl border-pale py-3 pl-12 text-base" placeholder="TÃ¬m kiáº¿m thÃ´ng tin" defaultValue={params.get('q') || ''} onBlur={(e) => { e.target.value ? params.set('q', e.target.value) : params.delete('q'); setParams(params); }} /></div>
          <FilterSection title="Range giÃ¡"><div className="mt-5 h-1.5 rounded-full bg-pale"><div className="h-1.5 w-2/3 rounded-full bg-brand" /></div><p className="mt-5 text-lg font-bold">GiÃ¡: 30K - 1Tr500</p></FilterSection>
          <FilterSection title="Category">{[['Graphic design', 47], ['3D Animation', 18], ['Branding', 24], ['Illustration', 24]].map(([label, count]) => <CheckRow key={label as string} label={label as string} count={count as number} />)}</FilterSection>
          <FilterSection title="Lá»c theo"><p className="text-brand">Rating cao tá»›i tháº¥p</p></FilterSection>
          <FilterSection title="NgÃ y Ä‘Äƒng">{[['Táº¥t cáº£', 467], ['24h TrÆ°á»›c', 21], ['7 NgÃ y gáº§n nháº¥t', 79], ['ThÃ¡ng nÃ y', 137]].map(([label, count]) => <CheckRow key={label as string} label={label as string} count={count as number} />)}</FilterSection>
          <FilterSection title="TrÃ¬nh Ä‘á»™ kinh nghiá»‡m">{[['Má»›i báº¯t Ä‘áº§u', 259], ['Trung cáº¥p', 110], ['ChuyÃªn gia', 87]].map(([label, count]) => <CheckRow key={label as string} label={label as string} count={count as number} />)}</FilterSection>
          <FilterSection title="CÃ¡c tags"><div className="flex flex-wrap gap-3">{['giáº£m giÃ¡', 'App', 'thiáº¿t káº¿ game', 'brand', 'logo', 'web', 'ui ux', 'Animation'].map((tag) => <span key={tag} className="rounded-full bg-blue-50 px-3 py-1 text-brand">{tag}</span>)}</div></FilterSection>
          <img className="mt-16 w-full rounded-2xl" src="/assets/news-card-blank.png" alt="Mua Premium Ngay" />
        </aside>
        <section>
          <div className="mb-7 flex items-center justify-between">
            <h1 className="text-4xl font-bold">Káº¿t quáº£ (102)</h1>
            <Select className="w-auto border-0 text-brand" defaultValue={params.get('sort') || 'rating'} onChange={(e) => { params.set('sort', e.target.value); setParams(params); }}><option value="rating">Rating cao tá»›i tháº¥p</option><option value="price">GiÃ¡ tháº¥p</option><option value="popularity">Phá»• biáº¿n</option><option value="newest">Má»›i nháº¥t</option></Select>
          </div>
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">{isLoading ? Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-80" />) : designers.map((p: any) => <DesignerCard key={p._id} profile={p} />)}</div>
          <div className="mt-14 text-center text-2xl text-brand"><span className="font-bold">1</span> &nbsp;2&nbsp; 3&nbsp; ...&nbsp; 7 <Link className="ml-8 font-medium" to="/designers">Trang káº¿ <ArrowRight className="inline" /></Link></div>
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
  if (!profile) return <main className="container-page py-10"><EmptyState title="KhÃ´ng tÃ¬m tháº¥y designer" /></main>;
  const user = profile.userId;

  return (
    <main className="container-page py-10">
      <Seo title={`${user.name} - ${profile.title} | VESD`} description={`${user.name} nháº­n dá»± Ã¡n ${profile.categories?.join(', ')} tá»« ${profile.startingPrice?.toLocaleString('vi-VN')}Ä‘.`} schema={{ '@context': 'https://schema.org', '@type': 'Person', name: user.name, jobTitle: profile.title }} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card><div className="flex flex-wrap items-center gap-4"><img className="h-24 w-24 rounded-full" src={user.avatar} alt={user.name} /><div><div className="flex gap-2"><h1 className="text-3xl font-black">{user.name}</h1>{profile.verificationStatus === 'verified' && <Badge tone="success">Verified</Badge>}{profile.premiumStatus === 'premium' && <Badge tone="premium">Premium</Badge>}</div><p className="text-muted">{profile.title}</p><RatingStars value={profile.ratingAverage} /></div></div><p className="mt-6 text-slate-700">{profile.bio}</p><div className="mt-5 flex flex-wrap gap-2">{profile.skills?.map((s: string) => <Badge key={s}>{s}</Badge>)}</div></Card>
        <Card><p className="text-sm text-muted">GiÃ¡ khá»Ÿi Ä‘iá»ƒm</p><p className="text-3xl font-black">{profile.startingPrice?.toLocaleString('vi-VN')}Ä‘</p><Link to="/client/create-project"><Button className="mt-5 w-full">ThuÃª designer</Button></Link><Button variant="secondary" className="mt-3 w-full">LÆ°u há»“ sÆ¡</Button></Card>
      </div>
      <h2 className="mt-10 text-2xl font-black">Portfolio</h2><div className="mt-4 grid gap-4 md:grid-cols-3">{data.portfolio?.map((item: any) => <Card key={item._id}><img className="h-48 w-full rounded-lg object-cover" src={item.images?.[0]?.url} alt={item.title} loading="lazy" /><h3 className="mt-3 font-bold">{item.title}</h3><p className="text-sm text-muted">{item.description}</p></Card>)}</div>
      <h2 className="mt-10 text-2xl font-black">Reviews</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{data.reviews?.map((r: any) => <Card key={r._id}><RatingStars value={r.rating} /><p className="mt-3 text-sm">{r.content}</p></Card>)}</div>
    </main>
  );
}

export function CategoryPage() {
  const { slug = 'logo-design' } = useParams();
  return <><DesignersPage /><section className="container-page pb-12"><Card><h2 className="text-2xl font-black">Dá»‹ch vá»¥ {slug.replaceAll('-', ' ')}</h2><p className="mt-2 text-muted">VESD giÃºp doanh nghiá»‡p tÃ¬m designer phÃ¹ há»£p cho {slug.replaceAll('-', ' ')}, cÃ³ escrow, milestone, feedback vÃ  checklist file bÃ n giao Ä‘Ãºng chuáº©n.</p></Card></section></>;
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
  return <main className="container-page py-10"><Seo title="Bảng giá VESD" description="Các gói Free, Business Premium và Designer Premium trên VESD." /><h1 className="text-4xl font-black">Pricing</h1><div className="mt-6 grid gap-4 md:grid-cols-3">{(data || []).map((plan: any) => <Card key={plan._id}><Badge tone="premium">{plan.roleTarget}</Badge><h2 className="mt-3 text-2xl font-black">{plan.name}</h2><p className="mt-2 text-3xl font-black">{plan.price?.toLocaleString('vi-VN')}đ</p>{plan.benefits?.map((b: string) => <p key={b} className="mt-3 flex gap-2 text-sm"><CheckCircle2 className="text-brand" size={17} />{b}</p>)}<Button className="mt-5 w-full" onClick={() => openUpgrade(plan)}>Nâng cấp Premium</Button></Card>)}</div></main>;
}

export function HelpPage() {
  const topics = ['Escrow guide', 'Project milestone guide', 'File handover checklist', 'Dispute policy', 'FAQ'];
  return <main className="container-page py-10"><Seo title="Help Center VESD" description="HÆ°á»›ng dáº«n escrow, milestone, checklist bÃ n giao vÃ  dispute policy." /><h1 className="text-4xl font-black">Help Center</h1><div className="mt-6 grid gap-4 md:grid-cols-2">{topics.map((t) => <Card key={t}><h2 className="font-bold">{t}</h2><p className="mt-2 text-sm text-muted">Quy trÃ¬nh minh báº¡ch Ä‘á»ƒ client vÃ  designer lÃ m viá»‡c an toÃ n trÃªn VESD.</p></Card>)}</div></main>;
}

