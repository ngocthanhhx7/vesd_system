import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import slugify from 'slugify';
import { connectDb } from '../config/db.js';
import {
  ChecklistTemplate,
  ClientProfile,
  Discount,
  DesignerProfile,
  Dispute,
  Notification,
  Portfolio,
  PremiumPlan,
  Project,
  ProjectComment,
  Review,
  Subscription,
  Transaction,
  User,
  Wallet,
  Withdrawal
} from '../models/index.js';

const password = '12345678';
const passwordHash = await bcrypt.hash(password, 12);
const categories = ['logo-design', 'social-media-design', 'brand-identity', 'poster-design', 'packaging-design', 'ui-ux-design'];
const skills = ['Figma', 'Illustrator', 'Photoshop', 'After Effects', 'Blender', 'Typography', 'Branding', 'UI Design', 'Packaging'];
const styles = ['minimal', 'bold', 'friendly', 'premium', 'playful', 'corporate', 'editorial', 'modern'];
const designerNames = [
  'Linh Nguyen', 'Minh Tran', 'Anh Pham', 'Khoa Le', 'Vy Do', 'Huy Vo', 'Mai Hoang', 'Nam Bui',
  'Trang Dang', 'Quan Phan', 'Nhi Ngo', 'Bao Truong', 'Thao Lam', 'Duc Pham', 'Tuan Kiet',
  'Ha My', 'Gia Han', 'Quoc Bao', 'Tue Minh', 'Phuong Anh', 'Hoang Long', 'Kim Thuy',
  'Duy Nam', 'Hong Vy', 'Thanh Nhan', 'Ngoc Anh', 'Minh Quan', 'Bao Chau', 'Gia Bao', 'Nhat Anh'
];
const companyNames = [
  'Viet Startup Studio', 'Mekong Coffee Roastery', 'Lotus EduTech', 'Saigon Fresh Mart', 'Hue Craft Lab',
  'Danang Travel Co', 'Nha Xanh Home', 'Bento Cloud Kitchen', 'Solaris Tech', 'An Nam Cosmetics',
  'Blue Ocean Logistics', 'KitePay Fintech', 'Muse Fashion', 'Rice Field Foods', 'Urban Nest'
];

async function createUser({ name, email, roles, avatarSeed = name }) {
  const user = await User.create({
    name,
    email,
    roles,
    passwordHash,
    avatar: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(avatarSeed)}`,
    emailVerified: true,
    status: 'active'
  });
  await Wallet.create({
    userId: user._id,
    balance: roles.includes('designer') ? 1500000 + Math.round(Math.random() * 5000000) : 0,
    escrowBalance: roles.includes('client') ? Math.round(Math.random() * 12000000) : 0,
    pendingBalance: roles.includes('designer') ? Math.round(Math.random() * 2000000) : 0,
    totalEarned: roles.includes('designer') ? 8000000 + Math.round(Math.random() * 60000000) : 0,
    totalSpent: roles.includes('client') ? 5000000 + Math.round(Math.random() * 50000000) : 0
  });
  return user;
}

function pick(list, index, offset = 0) {
  return list[(index + offset) % list.length];
}

function money(base, step, index) {
  return base + step * index;
}

async function run() {
  await connectDb();
  await mongoose.connection.dropDatabase();

  const admin = await createUser({ name: 'VESD Admin', email: 'admin@vesd.vn', roles: ['admin'] });
  const demoClient = await createUser({ name: 'Client Demo', email: 'client@vesd.vn', roles: ['client'] });
  const demoDesigner = await createUser({ name: 'Designer Demo', email: 'designer@vesd.vn', roles: ['designer'] });

  const clients = [demoClient];
  await ClientProfile.create({ userId: demoClient._id, companyName: companyNames[0], businessType: 'Startup', address: 'Quan 1, TP.HCM', taxCode: '0312345678', accountType: 'business_premium', premiumStatus: 'premium', premiumExpiresAt: new Date(Date.now() + 45 * 86400000) });
  for (let i = 1; i < companyNames.length; i += 1) {
    const user = await createUser({ name: `Business Client ${i}`, email: `client${i}@vesd.vn`, roles: ['client'], avatarSeed: companyNames[i] });
    clients.push(user);
    await ClientProfile.create({
      userId: user._id,
      companyName: companyNames[i],
      businessType: ['Startup', 'F&B', 'E-commerce', 'Education', 'Manufacturing'][i % 5],
      address: ['TP.HCM', 'Ha Noi', 'Da Nang', 'Can Tho'][i % 4],
      taxCode: `03${String(10000000 + i).padStart(8, '0')}`,
      accountType: i % 5 === 0 ? 'business_premium' : 'free',
      premiumStatus: i % 5 === 0 ? 'premium' : 'free',
      premiumExpiresAt: i % 5 === 0 ? new Date(Date.now() + 30 * 86400000) : null
    });
  }

  const designers = [demoDesigner];
  for (let i = 1; i < designerNames.length; i += 1) {
    designers.push(await createUser({ name: designerNames[i], email: `designer${i}@vesd.vn`, roles: ['designer'] }));
  }

  for (let i = 0; i < designers.length; i += 1) {
    const user = designers[i];
    await DesignerProfile.create({
      userId: user._id,
      slug: slugify(`${user.name}-${i}`, { lower: true, strict: true }),
      title: ['Brand Identity Designer', 'Logo Designer', 'Social Media Designer', 'UI/UX Designer', 'Packaging Designer', 'Motion Designer'][i % 6],
      bio: 'Designer Viet Nam co kinh nghiem thuc chien voi startup, SME va thuong hieu dia phuong. Manh ve brief ro rang, file ban giao dung chuan va feedback nhanh.',
      skills: Array.from({ length: 4 + (i % 4) }, (_v, k) => pick(skills, i, k)),
      categories: [pick(categories, i), pick(categories, i, 1)],
      styleTags: [pick(styles, i), pick(styles, i, 2), pick(styles, i, 4)],
      startingPrice: money(600000, 120000, i),
      availability: i % 7 === 0 ? 'busy' : 'available',
      education: ['FPT Arena', 'Dai hoc My thuat', 'Arena Multimedia', 'Tu hoc co mentor'][i % 4],
      experience: `${1 + (i % 7)} nam`,
      verificationStatus: i < 24 ? 'verified' : i < 28 ? 'pending' : 'unverified',
      ratingAverage: Number((4.35 + (i % 13) * 0.045).toFixed(2)),
      ratingCount: 6 + i * 2,
      completedProjects: 3 + i * 3,
      accountType: i % 5 === 0 ? 'designer_premium' : 'free',
      premiumStatus: i % 5 === 0 ? 'premium' : 'free',
      premiumExpiresAt: i % 5 === 0 ? new Date(Date.now() + 60 * 86400000) : null,
      profileViews: 120 + i * 41
    });
  }

  const portfolios = [];
  for (let i = 0; i < 90; i += 1) {
    portfolios.push({
      designerId: designers[i % designers.length]._id,
      title: `Case study ${i + 1}: ${pick(categories, i).replaceAll('-', ' ')}`,
      description: 'Bo thiet ke hoan chinh gom huong nhin, source file va guideline ung dung cho nhieu kenh.',
      category: pick(categories, i),
      images: [{ url: `https://picsum.photos/seed/vesd-portfolio-${i}/900/650`, name: `portfolio-${i}.jpg`, type: 'image/jpeg' }],
      tools: [pick(skills, i), pick(skills, i, 1)],
      tags: [pick(styles, i), pick(categories, i), 'vietnam']
    });
  }
  await Portfolio.insertMany(portfolios);

  const plans = await PremiumPlan.insertMany([
    {
      code: 'designer_premium',
      name: 'Designer Premium',
      roleTarget: 'designer',
      price: 1299000,
      durationDays: 90,
      benefits: ['Tang hien thi ho so', 'Uu tien trong ket qua tim kiem', 'Co the nhan tich xanh uy tin', 'Tang co hoi nhan du an']
    },
    {
      code: 'business_premium',
      name: 'Business Premium',
      roleTarget: 'client',
      price: 2499000,
      durationDays: 90,
      benefits: ['Uu tien dang du an', 'Ket noi nhanh hon voi designer phu hop', 'Ho tro quan ly du an nang cao', 'Uu tien ho tro va xu ly khieu nai']
    }
  ]);

  await Discount.insertMany([
    { code: 'VESD20', name: 'Giam gia VESD premium', description: 'Giam 20% cho goi Premium', discountType: 'percent', value: 20, maxDiscount: 150000, appliesTo: 'premium', roleTarget: 'both', usageLimit: 500, startsAt: new Date(Date.now() - 86400000), endsAt: new Date(Date.now() + 14 * 86400000), showOnHome: true },
    { code: 'FIRSTPROJECT', name: 'Du an dau tien', description: 'Giam 10% phi escrow cho doanh nghiep moi', discountType: 'percent', value: 10, maxDiscount: 300000, minOrderAmount: 1000000, appliesTo: 'project', roleTarget: 'client', usageLimit: 300, startsAt: new Date(Date.now() - 86400000), endsAt: new Date(Date.now() + 30 * 86400000) },
    { code: 'DESIGNER50K', name: 'Designer onboarding', description: 'Giam 50.000d cho designer nang cap Premium', discountType: 'fixed', value: 50000, appliesTo: 'premium', roleTarget: 'designer', usageLimit: 200, startsAt: new Date(Date.now() - 86400000), endsAt: new Date(Date.now() + 21 * 86400000) }
  ]);

  await ChecklistTemplate.insertMany([
    { category: 'logo-design', items: [{ label: 'AI/PSD source file', required: true, acceptedFormats: ['ai', 'psd'] }, { label: 'PNG transparent', required: true, acceptedFormats: ['png'] }, { label: 'SVG', required: true, acceptedFormats: ['svg'] }, { label: 'Font name', required: true, acceptedFormats: ['txt'] }, { label: 'Color code', required: true, acceptedFormats: ['txt', 'pdf'] }] },
    { category: 'social-media-design', items: [{ label: 'Editable source', required: true, acceptedFormats: ['fig', 'psd', 'ai'] }, { label: 'PNG/JPG exports', required: true, acceptedFormats: ['png', 'jpg'] }, { label: 'Content guideline', required: false, acceptedFormats: ['pdf'] }] },
    { category: 'brand-identity', items: [{ label: 'Brand guideline PDF', required: true, acceptedFormats: ['pdf'] }, { label: 'Logo package', required: true, acceptedFormats: ['zip'] }, { label: 'Color and typography', required: true, acceptedFormats: ['pdf'] }] },
    { category: 'packaging-design', items: [{ label: 'Dieline file', required: true, acceptedFormats: ['ai', 'pdf'] }, { label: 'Print-ready PDF', required: true, acceptedFormats: ['pdf'] }, { label: 'Mockup preview', required: true, acceptedFormats: ['png', 'jpg'] }] },
    { category: 'ui-ux-design', items: [{ label: 'Figma source', required: true, acceptedFormats: ['fig', 'url'] }, { label: 'Prototype link', required: true, acceptedFormats: ['url'] }, { label: 'Design system notes', required: false, acceptedFormats: ['pdf'] }] }
  ]);

  const statuses = ['pending_designer', 'agreement_pending', 'payment_pending', 'escrow_funded', 'in_progress', 'submitted', 'revision_requested', 'final_submitted', 'completed', 'disputed'];
  const projects = [];
  for (let i = 0; i < 45; i += 1) {
    const agreed = money(1800000, 180000, i % 14);
    const status = statuses[i % statuses.length];
    const project = await Project.create({
      clientId: clients[i % clients.length]._id,
      designerId: designers[i % designers.length]._id,
      title: `Thiet ke ${pick(categories, i).replaceAll('-', ' ')} cho ${companyNames[i % companyNames.length]}`,
      category: pick(categories, i),
      description: 'Can thiet ke chuyen nghiep, de ung dung tren kenh online va in an. Brief can ro scope, deliverables, timeline va file ban giao.',
      targetAudience: ['Gen Z', 'SME owner', 'Phu huynh tre', 'Khach hang B2B'][i % 4],
      budget: { min: agreed - 600000, max: agreed + 900000, agreed },
      deadline: new Date(Date.now() + (7 + (i % 18)) * 86400000),
      stylePreferences: [pick(styles, i), pick(styles, i, 1)],
      deliverables: ['Source file', 'PNG/JPG export', 'Guideline'],
      revisionLimit: 2 + (i % 2),
      revisionUsed: i % 3 === 0 ? 1 : 0,
      priorityLevel: i % 5 === 0 ? 'premium' : 'standard',
      urgent: i % 6 === 0,
      printingSupport: i % 4 === 0,
      preferredDesignerLevel: ['junior', 'mid-level', 'senior'][i % 3],
      status,
      agreement: ['agreement_pending', 'payment_pending', 'escrow_funded', 'in_progress', 'submitted', 'revision_requested', 'final_submitted', 'completed', 'disputed'].includes(status)
        ? { scope: 'Thiet ke theo brief da thong nhat va ban giao dung checklist.', price: agreed, deadline: new Date(Date.now() + (10 + (i % 12)) * 86400000), revisionLimit: 2, deliverables: ['Source file', 'Exports', 'Guideline'], ipTerms: 'Client so huu IP sau khi thanh toan du', refundTerms: 'Xu ly qua dispute center', confirmedAt: new Date(Date.now() - 2 * 86400000) }
        : undefined,
      milestones: [
        { title: 'Concept & direction', description: 'Chon huong thiet ke dung brief', amount: Math.round(agreed * 0.45), dueDate: new Date(Date.now() + 5 * 86400000), status: ['submitted', 'revision_requested', 'final_submitted', 'completed'].includes(status) ? 'approved' : status === 'in_progress' ? 'in_progress' : 'pending' },
        { title: 'Final handover', description: 'Hoan thien file, guideline va ban giao IP', amount: Math.round(agreed * 0.55), dueDate: new Date(Date.now() + 12 * 86400000), status: ['final_submitted', 'completed'].includes(status) ? 'submitted' : 'pending' }
      ],
      finalFiles: ['final_submitted', 'completed'].includes(status) ? [{ url: '/uploads/mock/final-package.zip', name: 'final-package.zip', type: 'application/zip', checklistItem: 'Logo package' }] : []
    });
    projects.push(project);
  }

  await ProjectComment.insertMany(projects.flatMap((project, i) => [
    { projectId: project._id, senderId: project.clientId, content: 'Brief da duoc gui, can tu van huong thiet ke phu hop.', type: 'message' },
    { projectId: project._id, senderId: project.designerId, content: 'Da nhan brief, se de xuat scope va milestone.', type: 'message' },
    ...(i % 5 === 0 ? [{ projectId: project._id, senderId: project.clientId, content: 'Vui long dieu chinh mau sac theo brand guideline.', type: 'feedback' }] : [])
  ]));

  await Review.insertMany(projects.filter((project) => project.status === 'completed').map((project, i) => ({
    projectId: project._id,
    reviewerId: project.clientId,
    revieweeId: project.designerId,
    rating: 4 + (i % 2),
    content: 'Designer phan hoi nhanh, ban giao dung checklist va dung tinh than thuong hieu.',
    criteria: { communication: 5, quality: 4 + (i % 2), deadline: 5 }
  })));

  await Dispute.insertMany(projects.filter((project) => project.status === 'disputed').map((project, i) => ({
    projectId: project._id,
    openedBy: i % 2 === 0 ? project.clientId : project.designerId,
    reason: i % 2 === 0 ? 'File ban giao thieu source' : 'Vuot so lan revision',
    description: 'Can admin xem lai agreement, feedback va checklist ban giao.',
    status: i % 2 === 0 ? 'under_review' : 'open'
  })));

  await Transaction.insertMany(projects.slice(0, 32).flatMap((project, i) => [
    { userId: project.clientId, projectId: project._id, type: 'deposit', amount: project.budget.agreed, platformFee: Math.round(project.budget.agreed * 0.08), status: 'success', paymentMethod: ['momo', 'vnpay', 'bank_transfer'][i % 3] },
    ...(i % 3 === 0 ? [{ userId: project.designerId, projectId: project._id, type: 'release', amount: Math.round(project.budget.agreed * 0.45), platformFee: Math.round(project.budget.agreed * 0.036), status: 'success', paymentMethod: 'escrow' }] : [])
  ]));

  await Subscription.insertMany([
    { userId: demoClient._id, planId: plans[1]._id, accountType: 'business_premium', startDate: new Date(Date.now() - 5 * 86400000), endDate: new Date(Date.now() + 85 * 86400000), status: 'active' },
    { userId: demoDesigner._id, planId: plans[0]._id, accountType: 'designer_premium', startDate: new Date(Date.now() - 7 * 86400000), endDate: new Date(Date.now() + 83 * 86400000), status: 'active' }
  ]);

  await Transaction.insertMany([
    { userId: demoClient._id, type: 'premium', amount: 2499000, status: 'success', paymentMethod: 'bank_transfer', metadata: { planName: 'Business Premium', accountType: 'business_premium' } },
    { userId: demoDesigner._id, type: 'premium', amount: 1299000, status: 'success', paymentMethod: 'momo', metadata: { planName: 'Designer Premium', accountType: 'designer_premium' } }
  ]);

  await Notification.insertMany([
    { userId: demoClient._id, title: 'Designer da gui concept', message: 'Vui long vao workspace de review milestone dau tien.', type: 'project', link: '/client/workspace' },
    { userId: demoDesigner._id, title: 'Yeu cau moi', message: 'Business Client 1 da moi ban vao du an brand identity.', type: 'project', link: '/designer/requests' },
    { userId: admin._id, title: 'Dispute moi', message: 'Co khieu nai can xu ly trong dispute center.', type: 'admin', link: '/admin/disputes' }
  ]);

  await Withdrawal.create({ designerId: demoDesigner._id, amount: 1000000, method: 'bank_transfer', accountInfo: { bank: 'VCB', accountName: 'Designer Demo' }, status: 'pending' });

  console.log('Seed completed');
  console.log(`Admin: admin@vesd.vn / ${password}`);
  console.log(`Client: client@vesd.vn / ${password}`);
  console.log(`Designer: designer@vesd.vn / ${password}`);
  console.log('Discount codes: VESD20, FIRSTPROJECT, DESIGNER50K');
  await mongoose.disconnect();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
