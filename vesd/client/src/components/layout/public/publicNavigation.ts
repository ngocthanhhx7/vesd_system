export const hotMenu = [
  {
    title: 'Thiết kế thương hiệu',
    items: ['Thiết kế logo', 'Bộ nhận diện thương hiệu', 'Quy chuẩn thương hiệu', 'Hoạt ảnh logo', 'Danh thiếp', 'Bộ tài sản thương hiệu', 'Tiêu đề thư']
  },
  {
    title: 'Thiết kế UI/UX',
    items: ['Thiết kế giao diện website', 'Thiết kế giao diện ứng dụng', 'Thiết kế landing page', 'Thiết kế dashboard/SaaS', 'Thiết kế hệ thống giao diện', 'Wireframe']
  },
  {
    title: 'AI và công nghệ mới',
    items: ['Ảnh tạo bằng AI', 'Avatar AI', 'Chỉnh sửa ảnh bằng AI']
  },
  {
    title: 'Thiết kế 3D',
    items: ['Thiết kế 3D', 'Render sản phẩm 3D', 'Asset game 3D']
  },
  {
    title: 'Thiết kế đồ họa',
    items: ['Poster', 'Banner quảng cáo', 'Infographic', 'Brochure', 'Billboard quảng cáo', 'Bài đăng mạng xã hội']
  },
  {
    title: 'Minh họa và nghệ thuật',
    items: ['Minh họa', 'Thiết kế nhân vật', 'Concept art', 'Game art', 'Truyện tranh/Manga', 'Nghệ thuật NFT']
  },
  {
    title: 'Chuyển động',
    items: ['Đồ họa chuyển động', 'Phim hoạt hình', 'Hoạt ảnh 2D', 'Hoạt ảnh 3D']
  },
  {
    title: 'Khác',
    items: ['Khám phá thêm', 'Yêu cầu thêm danh mục']
  }
];

type HotMenuItem = {
  label: string;
  slug: string;
};

type DesktopHotMenuColumn = {
  title: string;
  items: HotMenuItem[];
  secondary?: {
    title: string;
    items: HotMenuItem[];
  };
};

export const desktopHotMenuColumns: DesktopHotMenuColumn[] = [
  {
    title: 'Thiết kế thương hiệu (Branding)',
    items: [
      { label: 'Thiết kế Logo', slug: 'thiet-ke-logo' },
      { label: 'Thiết kế Brand Identity', slug: 'bo-nhan-dien-thuong-hieu' },
      { label: 'Thiết kế Brand Guidelines', slug: 'quy-chuan-thuong-hieu' },
      { label: 'Thiết kế Logo animation', slug: 'hoat-anh-logo' },
      { label: 'Thiết kế Business card', slug: 'danh-thiep' },
      { label: 'Thiết kế Brand kit', slug: 'bo-tai-san-thuong-hieu' },
      { label: 'Thiết kế Letterhead', slug: 'tieu-de-thu' }
    ],
    secondary: {
      title: 'Khác',
      items: [
        { label: 'Khám phá thêm', slug: 'kham-pha-them' },
        { label: 'Yêu cầu thêm danh mục', slug: 'yeu-cau-them-danh-muc' }
      ]
    }
  },
  {
    title: 'Thiết kế UI / UX',
    items: [
      { label: 'Thiết kế Website UI', slug: 'thiet-ke-giao-dien-website' },
      { label: 'Thiết kế Mobile App UI', slug: 'thiet-ke-giao-dien-ung-dung' },
      { label: 'Thiết kế Landing Page', slug: 'thiet-ke-landing-page' },
      { label: 'Thiết kế Dashboard / SaaS', slug: 'thiet-ke-dashboard-saas' },
      { label: 'Thiết kế Design System', slug: 'thiet-ke-he-thong-giao-dien' },
      { label: 'Wireframe', slug: 'wireframe' }
    ]
  },
  {
    title: 'Thiết kế đồ họa (Graphic Design)',
    items: [
      { label: 'Poster', slug: 'poster' },
      { label: 'Banner quảng cáo', slug: 'banner-quang-cao' },
      { label: 'Infographic', slug: 'infographic' },
      { label: 'Brochure', slug: 'brochure' },
      { label: 'Billboard quảng cáo', slug: 'billboard-quang-cao' },
      { label: 'Social media post', slug: 'bai-dang-mang-xa-hoi' }
    ]
  },
  {
    title: 'Thiết kế 3D',
    items: [
      { label: 'Thiết kế 3D', slug: 'thiet-ke-3d' },
      { label: '3D Product Render', slug: 'render-san-pham-3d' },
      { label: '3D Game Asset', slug: 'asset-game-3d' }
    ]
  }
];

export const footerColumns = [
  {
    title: 'Dành cho khách hàng',
    items: ['Cách thuê freelancer', 'Tìm freelancer', 'Các top nhận việc']
  },
  {
    title: 'Dành cho freelancer',
    items: ['Cách tìm việc', 'Việc làm freelancer mới nhất', 'Tạo hồ sơ freelancer', 'Gửi đề xuất cho dự án', 'Freelancer Plus', 'Tips kiếm khách hàng']
  },
  {
    title: 'Tài nguyên',
    items: ['Trung tâm trợ giúp', 'Blog freelancer', 'Tài nguyên học tập', 'Công cụ miễn phí cho doanh nghiệp', 'Câu chuyện thành công']
  },
  {
    title: 'Công ty',
    items: ['Về chúng tôi', 'Tuyển dụng', 'Đầu tư', 'Đối tác', 'Liên hệ', 'Bảo mật và an toàn', 'Điều khoản dịch vụ']
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

