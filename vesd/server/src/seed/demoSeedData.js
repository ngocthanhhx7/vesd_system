import { createHash } from 'node:crypto';

export const DEMO_SEED_NAMESPACE = 'vesd-demo-2026';
export const DEMO_SEED_PASSWORD = '12345678';
export const COMPLETED_PROJECT_GROSS_AMOUNTS = [
  500_000, 600_000, 700_000, 800_000, 550_000, 650_000,
  750_000, 850_000, 450_000, 500_000, 800_000, 850_000
];

const CLIENT_IDENTITIES = [
  ['Nguyễn Thùy Linh', 'linh.nguyen1998@gmail.com'],
  ['Trần Minh Khang', 'minh.tran2000@gmail.com'],
  ['Lê Hoài An', 'an.le1999@gmail.com'],
  ['Phạm Ngọc Thảo', 'thao.pham2001@gmail.com'],
  ['Mai Ngọc Khánh', 'ngoc.mai2002@gmail.com'],
  ['Võ Hoàng Nam', 'hoang.vo1997@gmail.com'],
  ['Đặng Thu Hương', 'huong.dang2000@gmail.com'],
  ['Nguyễn Quốc Tuấn', 'tuan.nguyen2003@gmail.com'],
  ['Bùi Khánh Ngân', 'ngan.bui1999@gmail.com'],
  ['Đỗ Diệu Linh', 'dieu.linh2001@gmail.com'],
  ['Trần Bảo Chi', 'bao.chi2002@gmail.com'],
  ['Nguyễn Anh Thư', 'anh.thu1998@gmail.com']
];

const DESIGNER_IDENTITIES = [
  ['Lê Thanh Phương', 'phuong.le2000@gmail.com'],
  ['Nguyễn Gia Hân', 'han.nguyen2001@gmail.com'],
  ['Trần Yến Nhi', 'yen.nhi2003@gmail.com'],
  ['Trương Quốc Bình', 'binh.truong1999@gmail.com'],
  ['Vũ Quỳnh Anh', 'quynh.anh2002@gmail.com'],
  ['Phạm Ngọc Hà', 'ngoc.ha2000@gmail.com'],
  ['Nguyễn Gia Huy', 'gia.huy2001@gmail.com'],
  ['Lê Minh Châu', 'minh.chau2002@gmail.com'],
  ['Phan Mai Phương', 'mai.phuong1998@gmail.com'],
  ['Vũ Hoàng Long', 'vu.hoang2000@gmail.com'],
  ['Nguyễn Bảo Ngọc', 'bao.ngoc2003@gmail.com'],
  ['Trần Như Ý', 'nhu.y2001@gmail.com']
];

const COMPLETED_PROJECTS = [
  ['Bộ nhận diện Tiệm bánh Mây Bông', 'brand-identity', 'Hoàn thiện hệ thống nhận diện ấm áp cho tiệm bánh thủ công, từ logo chính đến cách dùng màu và chữ trên bao bì.', 'Gia đình trẻ và khách mua quà', ['friendly', 'minimal'], ['Logo package', 'Brand guideline', 'Mẫu hộp bánh']],
  ['Logo ứng dụng quản lý chi tiêu Minto', 'logo-design', 'Thiết kế logo gọn, dễ nhận biết ở kích thước biểu tượng ứng dụng và vẫn rõ nét trên các tài liệu giới thiệu sản phẩm.', 'Người đi làm từ 22 đến 35 tuổi', ['modern', 'minimal'], ['AI/SVG source', 'PNG transparent', 'App icon set']],
  ['Bộ bài đăng khai trương Nắng Coffee', 'social-media-design', 'Xây dựng bộ hình truyền thông khai trương đồng nhất cho Facebook và Instagram, ưu tiên hình ảnh gần gũi và dễ đọc trên điện thoại.', 'Sinh viên và nhân viên văn phòng', ['warm', 'editorial'], ['12 social posts', 'Editable source', 'Story templates']],
  ['Thiết kế hộp trà sen An Nhiên', 'packaging-design', 'Thiết kế bao bì trà làm quà tặng với bố cục thanh lịch, có đủ thông tin sản phẩm và sẵn sàng chuyển sang công đoạn in thử.', 'Khách hàng mua quà doanh nghiệp', ['premium', 'vietnamese'], ['Dieline file', 'Print-ready PDF', '3D mockup']],
  ['Poster đêm nhạc Acoustic Cuối Hạ', 'poster-design', 'Thực hiện poster chủ đạo và các phiên bản theo tỷ lệ mạng xã hội cho đêm nhạc nhỏ, nhấn mạnh lịch diễn và không khí mộc.', 'Người yêu nhạc acoustic tại TP.HCM', ['moody', 'typographic'], ['Poster A2', 'Social exports', 'Editable source']],
  ['Giao diện landing page khóa học Lumi', 'ui-ux-design', 'Thiết kế landing page giới thiệu khóa học nhiếp ảnh với luồng nội dung rõ ràng, tập trung vào giảng viên, lộ trình và nút đăng ký.', 'Người mới học nhiếp ảnh', ['clean', 'editorial'], ['Figma source', 'Desktop layout', 'Mobile layout']],
  ['Nhãn chai nước ép Vườn Xanh', 'packaging-design', 'Phát triển hệ thống nhãn cho ba vị nước ép, bảo đảm phân biệt hương vị tốt và đọc rõ thành phần khi đặt trên kệ lạnh.', 'Khách hàng quan tâm lối sống lành mạnh', ['fresh', 'playful'], ['3 label designs', 'Print files', 'Bottle mockups']],
  ['Bộ nhận diện workshop Gốm & Mình', 'brand-identity', 'Tạo ngôn ngữ hình ảnh cho chuỗi workshop làm gốm cuối tuần, cân bằng nét thủ công với cách trình bày trẻ trung trên kênh số.', 'Người trẻ yêu hoạt động thủ công', ['organic', 'friendly'], ['Logo set', 'Color system', 'Workshop templates']],
  ['Menu mới cho Bếp Nhà Mộc', 'editorial-design', 'Dàn trang menu món Việt theo mùa, giúp khách dễ chọn món và tạo cảm giác thân thuộc nhưng vẫn chỉn chu cho không gian nhà hàng.', 'Gia đình và nhóm khách văn phòng', ['rustic', 'minimal'], ['Menu print file', 'Table menu', 'Editable source']],
  ['Key visual chương trình Chạy Cùng Nhau', 'social-media-design', 'Xây dựng key visual năng động cho giải chạy cộng đồng và triển khai nhất quán sang banner, bài đăng cùng ảnh bìa sự kiện.', 'Cộng đồng chạy bộ phong trào', ['energetic', 'bold'], ['Key visual', 'Event cover', '6 social adaptations']],
  ['Logo studio nội thất Tĩnh', 'logo-design', 'Thiết kế biểu trưng tinh giản cho studio nội thất, thể hiện tư duy không gian và có thể gia công tốt trên bảng hiệu kim loại.', 'Chủ nhà và doanh nghiệp nhỏ', ['architectural', 'premium'], ['Logo source', 'Monochrome versions', 'Usage sheet']],
  ['Prototype đặt lịch cho Bloom Spa', 'ui-ux-design', 'Thiết kế luồng đặt dịch vụ trên di động từ chọn liệu trình đến xác nhận giờ, giảm thao tác và làm rõ tổng chi phí trước thanh toán.', 'Khách hàng nữ từ 25 đến 40 tuổi', ['soft', 'modern'], ['Figma source', 'Clickable prototype', 'UI component set']]
];

const OPEN_PROJECTS = [
  ['Thiết kế logo cho tiệm hoa Lá Nhỏ', 'logo-design', 700_000, 1_100_000, 'Cần một logo mềm mại nhưng không quá nữ tính cho tiệm hoa tại Đà Nẵng. Logo sẽ dùng trên bảng hiệu, giấy gói và ảnh đại diện mạng xã hội.', 'Khách mua hoa dịp sinh nhật và sự kiện nhỏ', ['organic', 'minimal'], ['Logo vector', 'PNG nền trong', 'Bảng màu thương hiệu']],
  ['Bộ nhận diện xe cà phê Rang Sớm', 'brand-identity', 1_800_000, 2_600_000, 'Thương hiệu cà phê mang đi cần bộ nhận diện dễ triển khai trên xe đẩy, ly giấy và đồng phục. Mong muốn hình ảnh khỏe khoắn, gần gũi với nhịp sống buổi sáng.', 'Nhân viên văn phòng tại Hà Nội', ['bold', 'friendly'], ['Logo system', 'Cup design', 'Mini guideline']],
  ['Thiết kế 15 bài social cho Mộc Skincare', 'social-media-design', 1_200_000, 1_800_000, 'Cần thiết kế một tháng nội dung Instagram cho dòng chăm sóc da từ nguyên liệu Việt. Nội dung đã có sẵn, designer phụ trách hệ thống bố cục và xử lý hình ảnh.', 'Nữ giới quan tâm mỹ phẩm lành tính', ['natural', 'editorial'], ['15 feed posts', '5 story templates', 'Editable files']],
  ['Bao bì granola Bếp Hạt', 'packaging-design', 2_000_000, 3_000_000, 'Thiết kế túi đứng cho bốn vị granola bán tại cửa hàng tiện lợi. Bao bì cần nổi bật từ xa, thể hiện rõ hương vị và có vùng thông tin dinh dưỡng dễ cập nhật.', 'Người trẻ theo đuổi chế độ ăn cân bằng', ['colorful', 'clean'], ['4 packaging variants', 'Dieline artwork', 'Shelf mockups']],
  ['Poster tuyển sinh lớp vẽ thiếu nhi', 'poster-design', 450_000, 750_000, 'Trung tâm cần poster tuyển sinh hè với minh họa vui tươi và thông tin lịch học dễ đọc. Thiết kế dùng cho cả bản in A3 lẫn bài đăng Facebook.', 'Phụ huynh có con từ 6 đến 12 tuổi', ['playful', 'bright'], ['Poster A3', 'Facebook post', 'Editable source']],
  ['UI dashboard quản lý phòng gym', 'ui-ux-design', 3_500_000, 5_000_000, 'Startup đang xây trang quản trị cho chuỗi phòng gym, cần thiết kế các màn tổng quan, hội viên, gói tập và doanh thu dựa trên wireframe đã hoàn tất.', 'Quản lý và nhân viên phòng gym', ['dark', 'data-focused'], ['12 desktop screens', 'Component library', 'Figma prototype']],
  ['Logo và mascot Cún Ơi Petshop', 'logo-design', 1_200_000, 1_900_000, 'Petshop muốn làm mới hình ảnh bằng logo chữ kết hợp mascot chó thân thiện. Nhân vật cần đủ đơn giản để dùng làm sticker và thêu lên đồng phục.', 'Người nuôi thú cưng trẻ tuổi', ['cute', 'bold'], ['Primary logo', 'Mascot poses', 'Sticker sheet']],
  ['Catalogue tour miền Tây 2026', 'editorial-design', 1_500_000, 2_200_000, 'Công ty du lịch cần dàn trang catalogue giới thiệu tám hành trình miền Tây. Hình ảnh và nội dung đã được chọn, cần bố cục thoáng và thuận tiện xuất bản in lẫn PDF.', 'Gia đình và nhóm khách trung niên', ['travel', 'editorial'], ['24-page catalogue', 'Print-ready PDF', 'Compressed web PDF']],
  ['Key visual lễ hội ẩm thực Chợ Quê', 'event-design', 2_500_000, 3_500_000, 'Sự kiện cuối tuần cần một key visual mang không khí chợ quê đương đại, sau đó triển khai sang cổng chào, standee và các định dạng truyền thông số.', 'Gia đình trẻ tại TP.HCM', ['vietnamese', 'festive'], ['Key visual', 'Event backdrop', 'Digital adaptations']],
  ['Thiết kế nhãn nến thơm Lặng', 'packaging-design', 900_000, 1_400_000, 'Cần hệ thống nhãn tối giản cho sáu mùi nến, ưu tiên typography và mã màu tinh tế. File phải phù hợp in decal kích thước nhỏ và dễ thay tên mùi.', 'Khách hàng yêu đồ trang trí nhà', ['minimal', 'premium'], ['6 label variants', 'Print files', 'Jar mockups']],
  ['Landing page ra mắt ứng dụng học đàn', 'ui-ux-design', 2_200_000, 3_200_000, 'Đội sản phẩm cần landing page giới thiệu ứng dụng tự học guitar, làm rõ trải nghiệm bài học ngắn và thúc đẩy tải app trên cả iOS lẫn Android.', 'Sinh viên và người đi làm mới học đàn', ['modern', 'energetic'], ['Desktop page', 'Mobile page', 'Developer handoff']],
  ['Bộ template tuyển dụng cho NovaTech', 'social-media-design', 1_000_000, 1_500_000, 'Công ty công nghệ cần các mẫu bài tuyển dụng thống nhất nhưng đủ linh hoạt cho nhiều vị trí. Thiết kế cần chuyên nghiệp, trẻ và dễ sửa nội dung trong Figma.', 'Ứng viên ngành công nghệ', ['corporate', 'modern'], ['8 post templates', '4 story templates', 'Figma source']],
  ['Minh họa bìa sách Sài Gòn Trong Hẻm', 'illustration', 1_800_000, 2_800_000, 'Nhà xuất bản tìm họa sĩ thực hiện bìa cho tập tản văn về đời sống trong hẻm Sài Gòn. Mong muốn tranh có chiều sâu, nhiều chi tiết đời thường nhưng vẫn rõ tiêu đề.', 'Độc giả yêu tản văn đô thị', ['hand-drawn', 'nostalgic'], ['Front cover illustration', 'Full dust jacket', 'Layered source']],
  ['Menu bảng điện tử cho Trà Nhà', 'menu-design', 800_000, 1_300_000, 'Chuỗi trà sữa nhỏ cần thiết kế menu ngang hiển thị trên ba màn hình. Danh mục phải dễ quét, làm nổi bật món mới và có thể cập nhật giá theo mùa.', 'Học sinh, sinh viên và nhân viên trẻ', ['fresh', 'clean'], ['3-screen menu', 'Promotion panel', 'Editable source']],
  ['Bộ icon cho nền tảng giao hàng nội bộ', 'icon-design', 1_400_000, 2_000_000, 'Sản phẩm SaaS cần khoảng bốn mươi icon đồng bộ cho trạng thái đơn hàng, kho và phương tiện. Icon phải rõ ở kích thước nhỏ và phù hợp giao diện sáng lẫn tối.', 'Nhân viên vận hành logistics', ['geometric', 'functional'], ['40 SVG icons', 'Outlined set', 'Usage preview']],
  ['Nhận diện podcast Chuyện Đi Làm', 'brand-identity', 1_500_000, 2_300_000, 'Podcast phỏng vấn người trẻ trong nhiều ngành nghề cần hình ảnh nhận diện mới. Thiết kế phải hoạt động tốt trên thumbnail nhỏ và có hệ thống cho từng tập.', 'Người đi làm trong 5 năm đầu sự nghiệp', ['conversational', 'bold'], ['Podcast logo', 'Episode cover system', 'Social templates']],
  ['Infographic báo cáo tác động xã hội', 'infographic-design', 1_600_000, 2_400_000, 'Tổ chức phi lợi nhuận cần chuyển số liệu báo cáo năm thành bộ infographic dễ hiểu bằng tiếng Việt. Nội dung và dữ liệu đã được kiểm tra, cần đề xuất cách kể chuyện trực quan.', 'Nhà tài trợ và cộng đồng địa phương', ['clear', 'human'], ['8 infographic pages', 'Social excerpts', 'Editable source']],
  ['Thiết kế lịch để bàn 2027', 'print-design', 2_000_000, 3_000_000, 'Doanh nghiệp muốn làm lịch quà tặng gồm mười hai trang về cảnh quan Việt Nam. Cần hệ thống bố cục sang trọng, có chỗ đặt lời chúc và thông tin thương hiệu vừa phải.', 'Khách hàng và đối tác doanh nghiệp', ['premium', 'scenic'], ['12 calendar pages', 'Cover design', 'Print-ready package']],
  ['Prototype website đặt bàn nhà hàng', 'ui-ux-design', 2_800_000, 4_200_000, 'Nhà hàng cần thiết kế lại trải nghiệm đặt bàn trên website, bao gồm chọn chi nhánh, số khách, khung giờ và xác nhận. Giao diện cần hoạt động tốt trên điện thoại.', 'Khách đặt bàn cá nhân và nhóm nhỏ', ['elegant', 'mobile-first'], ['User flow', '8 responsive screens', 'Clickable prototype']],
  ['Standee và voucher khai trương yoga studio', 'print-design', 700_000, 1_100_000, 'Studio yoga chuẩn bị khai trương cần standee đặt trước cửa và voucher buổi tập thử. Phong cách mong muốn nhẹ nhàng, thoáng, tránh dùng hình ảnh quá phổ biến.', 'Nữ giới làm việc văn phòng', ['calm', 'minimal'], ['Standee 60x160', 'Voucher two-sided', 'Print-ready files']]
];

const RELEASE_DATES = [
  '2026-06-30T09:15:00.000Z', '2026-07-01T14:20:00.000Z',
  '2026-07-02T11:05:00.000Z', '2026-07-03T16:40:00.000Z',
  '2026-07-04T10:30:00.000Z', '2026-07-05T15:10:00.000Z',
  '2026-07-07T09:50:00.000Z', '2026-07-08T13:25:00.000Z',
  '2026-07-09T17:05:00.000Z', '2026-07-10T10:45:00.000Z',
  '2026-07-12T14:15:00.000Z', '2026-07-14T08:35:00.000Z'
];

export function deterministicSeedId(key) {
  return createHash('sha256')
    .update(`${DEMO_SEED_NAMESPACE}:${key}`)
    .digest('hex')
    .slice(0, 24);
}

function account(identity, role, index) {
  const [name, email] = identity;
  return {
    _id: deterministicSeedId(`user:${role}:${index + 1}`),
    name,
    email,
    roles: [role],
    avatar: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(name)}`,
    emailVerified: true,
    status: 'active'
  };
}

function buildProfiles(clients, designers) {
  const companies = ['Mây Bông', 'Minto', 'Nắng Coffee', 'An Nhiên', 'Cuối Hạ', 'Lumi Academy', 'Vườn Xanh', 'Gốm & Mình', 'Bếp Nhà Mộc', 'Chạy Cùng Nhau', 'Studio Tĩnh', 'Bloom Spa'];
  const clientProfiles = clients.map((client, index) => ({
    _id: deterministicSeedId(`client-profile:${index + 1}`),
    userId: client._id,
    companyName: companies[index],
    businessType: ['F&B', 'Công nghệ', 'Dịch vụ', 'Bán lẻ'][index % 4],
    address: ['TP.HCM', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ'][index % 4],
    accountType: 'free',
    premiumStatus: 'free'
  }));
  const titles = ['Brand Identity Designer', 'Logo Designer', 'Social Media Designer', 'Packaging Designer', 'UI/UX Designer', 'Editorial Designer'];
  const designerProfiles = designers.map((designer, index) => ({
    _id: deterministicSeedId(`designer-profile:${index + 1}`),
    userId: designer._id,
    slug: `${designer.email.split('@')[0].replaceAll('.', '-')}-design`,
    title: titles[index % titles.length],
    bio: 'Designer làm việc theo brief rõ ràng, chú trọng tính ứng dụng và bàn giao file có tổ chức cho thương hiệu Việt.',
    skills: [['Figma', 'Illustrator'], ['Illustrator', 'Photoshop'], ['Figma', 'Typography']][index % 3],
    categories: [COMPLETED_PROJECTS[index][1], OPEN_PROJECTS[index][1]],
    styleTags: COMPLETED_PROJECTS[index][4],
    startingPrice: 450_000 + index * 50_000,
    availability: 'available',
    experience: `${2 + (index % 5)} năm`,
    verificationStatus: 'verified',
    completedProjects: 1,
    accountType: 'free',
    premiumStatus: 'free'
  }));
  return { clientProfiles, designerProfiles };
}

function buildCompletedProjects(clients, designers) {
  return COMPLETED_PROJECTS.map(([title, category, description, targetAudience, stylePreferences, deliverables], index) => {
    const grossAmount = COMPLETED_PROJECT_GROSS_AMOUNTS[index];
    const releasedAt = RELEASE_DATES[index];
    const fundedAt = new Date(Date.parse(releasedAt) - 2 * 60 * 60 * 1000).toISOString();
    return {
      _id: deterministicSeedId(`project:completed:${index + 1}`),
      clientId: clients[index]._id,
      designerId: designers[index]._id,
      title,
      category,
      description,
      targetAudience,
      budget: { min: grossAmount, max: grossAmount, agreed: grossAmount },
      deadline: releasedAt,
      stylePreferences,
      deliverables,
      revisionLimit: 2,
      revisionUsed: index % 3 === 0 ? 1 : 0,
      priorityLevel: 'standard',
      urgent: false,
      printingSupport: ['packaging-design', 'poster-design', 'editorial-design'].includes(category),
      preferredDesignerLevel: index % 3 === 0 ? 'senior' : 'mid-level',
      status: 'completed',
      grossAmount,
      agreement: {
        scope: description,
        price: grossAmount,
        deadline: releasedAt,
        revisionLimit: 2,
        deliverables,
        ipTerms: 'Khách hàng sở hữu quyền sử dụng file thiết kế sau khi thanh toán đầy đủ.',
        refundTerms: 'Hoàn tiền theo phần việc chưa thực hiện nếu hai bên thống nhất dừng dự án.',
        confirmedAt: fundedAt
      },
      milestones: [
        { title: 'Định hướng thiết kế', amount: grossAmount * 0.4, dueDate: fundedAt, status: 'approved', approvedAt: fundedAt },
        { title: 'Hoàn thiện và bàn giao', amount: grossAmount * 0.6, dueDate: releasedAt, status: 'approved', approvedAt: releasedAt }
      ],
      finalFiles: [{ url: `/uploads/projects/${deterministicSeedId(`project:completed:${index + 1}`)}/final.zip`, name: 'final-package.zip', type: 'application/zip' }],
      createdAt: fundedAt,
      updatedAt: releasedAt
    };
  });
}

function buildOpenProjects(clients) {
  return OPEN_PROJECTS.map(([title, category, min, max, description, targetAudience, stylePreferences, deliverables], index) => ({
    _id: deterministicSeedId(`project:open:${index + 1}`),
    clientId: clients[index % clients.length]._id,
    title,
    category,
    description,
    targetAudience,
    budget: { min, max },
    deadline: new Date(Date.UTC(2026, 6, 20 + index)).toISOString(),
    stylePreferences,
    deliverables,
    revisionLimit: 2 + (index % 2),
    revisionUsed: 0,
    priorityLevel: index % 7 === 0 ? 'premium' : 'standard',
    urgent: index === 4 || index === 19,
    printingSupport: ['packaging-design', 'poster-design', 'editorial-design', 'menu-design', 'print-design'].includes(category),
    preferredDesignerLevel: ['junior', 'mid-level', 'senior'][index % 3],
    status: 'pending_designer',
    milestones: [],
    finalFiles: [],
    createdAt: new Date(Date.UTC(2026, 6, 1 + (index % 14), 8 + (index % 8))).toISOString(),
    updatedAt: new Date(Date.UTC(2026, 6, 1 + (index % 14), 8 + (index % 8))).toISOString()
  }));
}

function buildTransactions(completedProjects) {
  const deposits = [];
  const releases = [];
  completedProjects.forEach((project, index) => {
    const platformFee = Math.round(project.grossAmount * 0.05);
    const fundedAt = project.agreement.confirmedAt;
    const releasedAt = RELEASE_DATES[index];
    deposits.push({
      _id: deterministicSeedId(`transaction:deposit:${index + 1}`),
      userId: project.clientId,
      projectId: project._id,
      type: 'deposit',
      amount: project.grossAmount,
      platformFee: 0,
      status: 'success',
      paymentMethod: ['bank_transfer', 'momo', 'vnpay'][index % 3],
      metadata: { escrowAmount: project.grossAmount },
      createdAt: fundedAt,
      updatedAt: fundedAt
    });
    releases.push({
      _id: deterministicSeedId(`transaction:release:${index + 1}`),
      userId: project.designerId,
      projectId: project._id,
      type: 'release',
      amount: project.grossAmount - platformFee,
      platformFee,
      status: 'success',
      paymentMethod: 'escrow',
      metadata: {
        grossAmount: project.grossAmount,
        releaseKey: `completed-project-${String(index + 1).padStart(2, '0')}`,
        feeCollectedAt: 'completion'
      },
      createdAt: releasedAt,
      updatedAt: releasedAt
    });
  });
  return { deposits, releases };
}

function buildWallets(clients, designers, completedProjects, releases) {
  const clientWallets = clients.map((client, index) => ({
    _id: deterministicSeedId(`wallet:client:${index + 1}`),
    userId: client._id,
    balance: 0,
    pendingBalance: 0,
    escrowBalance: 0,
    totalEarned: 0,
    totalSpent: completedProjects[index].grossAmount
  }));
  const designerWallets = designers.map((designer, index) => ({
    _id: deterministicSeedId(`wallet:designer:${index + 1}`),
    userId: designer._id,
    balance: releases[index].amount,
    pendingBalance: 0,
    escrowBalance: 0,
    totalEarned: releases[index].amount,
    totalSpent: 0
  }));
  return [...clientWallets, ...designerWallets];
}

export function buildDemoSeedData() {
  const clients = CLIENT_IDENTITIES.map((identity, index) => account(identity, 'client', index));
  const designers = DESIGNER_IDENTITIES.map((identity, index) => account(identity, 'designer', index));
  const { clientProfiles, designerProfiles } = buildProfiles(clients, designers);
  const completedProjects = buildCompletedProjects(clients, designers);
  const openProjects = buildOpenProjects(clients);
  const { deposits, releases } = buildTransactions(completedProjects);
  const wallets = buildWallets(clients, designers, completedProjects, releases);

  return {
    password: DEMO_SEED_PASSWORD,
    clients,
    designers,
    users: [...clients, ...designers],
    clientProfiles,
    designerProfiles,
    profiles: [...clientProfiles, ...designerProfiles],
    wallets,
    completedProjects,
    openProjects,
    projects: [...completedProjects, ...openProjects],
    deposits,
    releases,
    transactions: [...deposits, ...releases]
  };
}
