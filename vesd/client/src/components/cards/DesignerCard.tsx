import { Link } from 'react-router-dom';
import { Bookmark, BriefcaseBusiness, Clock3, WalletCards } from 'lucide-react';
import { Card } from '../ui/Primitives';

export function DesignerCard({ profile }: { profile: any }) {
  const user = profile.userId || {};

  return (
    <Card className="flex h-[333px] w-full flex-col rounded-[14px] border-[#FBAD39] p-6 shadow-[0_2px_6px_rgba(48,150,137,0.08)]">
      <div className="flex items-center justify-between text-[9.33px] leading-4">
        <div className="flex items-center gap-1 text-[#FBAD39]"><span>★★★★</span><span className="text-pale">★</span><span className="ml-1 text-[9.33px] font-medium text-[#596780]">127 Đánh giá</span></div>
        <Bookmark className="text-muted" size={17} />
      </div>
      <div className="mt-3 flex items-start gap-[14px]">
        <img className="h-[30px] w-[30px] rounded-full bg-soft object-cover" src={user.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${profile.title}`} alt={user.name || profile.title} loading="lazy" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[19.77px] font-semibold leading-6">{user.name || 'Vũ Tuấn Khang'}</div>
          <p className="text-xs leading-4 text-ink">Thanh Xuân, Hà Nội</p>
        </div>
      </div>
      <p className="mt-[17px] line-clamp-4 flex-1 text-xs leading-[18px] text-ink">{profile.bio || 'Xin chào, tôi là Khang, tôi là Graphic Designer chuyên về thiết kế nhận diện thương hiệu và thiết kế...'}</p>
      <div className="mt-4 grid grid-cols-2 gap-x-[11px] gap-y-[10px] text-[11.3px] font-semibold leading-[14px] text-[#6C757D]">
        <span className="flex items-center gap-2"><BriefcaseBusiness className="text-brand" size={17} />Trung cấp</span>
        <span className="flex items-center gap-2"><WalletCards className="text-brand" size={17} />100K - 320K</span>
        <span className="flex items-center gap-2"><Clock3 className="text-brand" size={17} />Bán thời gian</span>
        <span className="flex items-center gap-2"><Clock3 className="text-brand" size={17} />Giao trong 2 ngày</span>
      </div>
      <Link className="mt-[14px] flex h-[29px] items-center justify-center rounded-[20px] bg-brand text-[11.3px] font-medium text-white" to={`/designers/${profile.slug || profile._id}`}>Chi tiết</Link>
    </Card>
  );
}
