export const hotMenu = [
  {
    title: 'Thiết kế thương hiệu (Branding)',
    items: ['Thiết kế Logo', 'Thiết kế Brand Identity', 'Thiết kế Brand Guidelines', 'Thiết kế Logo animation', 'Thiết kế Business card', 'Thiết kế Brand kit', 'Thiết kế Letterhead']
  },
  {
    title: 'Thiết kế UI / UX',
    items: ['Thiết kế Website UI', 'Thiết kế Mobile App UI', 'Thiết kế Landing Page', 'Thiết kế Dashboard / SaaS', 'Thiết kế Design System', 'Wireframe']
  },
  {
    title: 'AI & công nghệ mới',
    items: ['AI generated art', 'AI avatar', 'AI image editing']
  },
  {
    title: 'Thiết kế 3D',
    items: ['Thiết kế 3D', '3D Product Render', '3D Game Asset']
  },
  {
    title: 'Thiết kế đồ họa (Graphic Design)',
    items: ['Poster', 'Banner quảng cáo', 'Infographic', 'Brochure', 'Billboard quảng cáo', 'Social media post']
  },
  {
    title: 'Illustration & Nghệ thuật',
    items: ['Illustration', 'Character Design', 'Concept Art', 'Game Art', 'Truyện tranh / Manga', 'NFT Art']
  },
  {
    title: 'Motion',
    items: ['Motion Graphic', 'Phim hoạt hình', 'Animation 2D', 'Animation 3D']
  },
  {
    title: 'Khác',
    items: ['Khám phá thêm', 'Yêu cầu thêm danh mục']
  }
];

export const footerColumns = [
  {
    title: 'Dành cho Freelancer',
    items: ['Cách thuê Freelancer', 'Tìm Freelancer', 'Các top nhận việc']
  },
  {
    title: 'Dành cho Freelancer',
    items: ['Cách tìm việc', 'Việc làm Freelancer mới nhất', 'Tạo hồ sơ Freelancer', 'Gửi proposal cho dự án', 'Freelancer Plus', 'Tips kiếm khách hàng']
  },
  {
    title: 'Tài nguyên',
    items: ['Trung tâm trợ giúp', 'Blog Freelancer', 'Tài nguyên học tập', 'Công cụ miễn phí cho doanh nghiệp', 'Câu chuyện thành công']
  },
  {
    title: 'Công ty',
    items: ['Về chúng tôi', 'Tuyển dụng', 'Đầu tư', 'Đối tác', 'Liên hệ', 'Bảo mật & an toàn', 'Điều khoản dịch vụ']
  }
];

export function serviceSlug(item: string) {
  return item
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
