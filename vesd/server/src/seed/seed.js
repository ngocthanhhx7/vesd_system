import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import slugify from 'slugify';
import { connectDb } from '../config/db.js';
import {
  ChecklistTemplate,
  ClientProfile,
  DesignerProfile,
  Dispute,
  Portfolio,
  PremiumPlan,
  Project,
  Review,
  Transaction,
  User,
  Wallet
} from '../models/index.js';

const categories = ['logo-design', 'social-media-design', 'brand-identity', 'poster-design', 'packaging-design', 'ui-ux-design'];
const names = ['Linh Nguyen', 'Minh Tran', 'Anh Pham', 'Khoa Le', 'Vy Do', 'Huy Vo', 'Mai Hoang', 'Nam Bui', 'Trang Dang', 'Quan Phan', 'Nhi Ngo', 'Bao Truong'];

async function createUser({ name, email, roles }) {
  const passwordHash = await bcrypt.hash('12345678', 12);
  const user = await User.create({ name, email, roles, passwordHash, avatar: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(name)}` });
  await Wallet.create({ userId: user._id, balance: roles.includes('designer') ? 2500000 : 0, escrowBalance: 0, totalEarned: roles.includes('designer') ? 12000000 : 0, totalSpent: roles.includes('client') ? 18000000 : 0 });
  return user;
}

async function run() {
  await connectDb();
  await Promise.all([User.deleteMany(), ClientProfile.deleteMany(), DesignerProfile.deleteMany(), Portfolio.deleteMany(), Project.deleteMany(), Transaction.deleteMany(), Wallet.deleteMany(), Review.deleteMany(), PremiumPlan.deleteMany(), ChecklistTemplate.deleteMany(), Dispute.deleteMany()]);

  const admin = await createUser({ name: 'VESD Admin', email: 'admin@vesd.vn', roles: ['admin'] });
  const demoClient = await createUser({ name: 'Client Demo', email: 'client@vesd.vn', roles: ['client'] });
  const demoDesigner = await createUser({ name: 'Designer Demo', email: 'designer@vesd.vn', roles: ['designer'] });
  await ClientProfile.create({ userId: demoClient._id, companyName: 'Viet Startup Studio', businessType: 'Startup', address: 'Quan 1, TP.HCM' });

  const clients = [demoClient];
  for (let i = 1; i <= 2; i += 1) {
    const user = await createUser({ name: `SME Client ${i}`, email: `client${i}@vesd.vn`, roles: ['client'] });
    await ClientProfile.create({ userId: user._id, companyName: `Cong ty Demo ${i}`, businessType: i === 1 ? 'E-commerce' : 'F&B' });
    clients.push(user);
  }

  const designers = [demoDesigner];
  for (let i = 0; i < 11; i += 1) {
    designers.push(await createUser({ name: names[i], email: `designer${i + 1}@vesd.vn`, roles: ['designer'] }));
  }

  for (let i = 0; i < designers.length; i += 1) {
    const user = designers[i];
    await DesignerProfile.create({
      userId: user._id,
      slug: slugify(`${user.name}-${i}`, { lower: true, strict: true }),
      title: ['Brand Identity Designer', 'Logo Designer', 'Social Media Designer', 'UI/UX Designer'][i % 4],
      bio: 'Designer tre Viet Nam voi kinh nghiem thuc chien cho startup, shop online va SME.',
      skills: ['Illustrator', 'Photoshop', 'Figma', 'Branding', 'Typography'].slice(0, 3 + (i % 3)),
      categories: [categories[i % categories.length], categories[(i + 1) % categories.length]],
      styleTags: ['minimal', 'bold', 'friendly', 'premium'].slice(0, 2 + (i % 2)),
      startingPrice: 700000 + i * 180000,
      availability: i % 5 === 0 ? 'busy' : 'available',
      education: 'Dai hoc My thuat / FPT Arena / Tu hoc co mentor',
      experience: `${1 + (i % 5)} nam`,
      verificationStatus: i < 9 ? 'verified' : 'pending',
      ratingAverage: 4.4 + (i % 6) * 0.1,
      ratingCount: 8 + i,
      completedProjects: 4 + i * 2,
      premiumStatus: i % 4 === 0 ? 'premium' : 'free',
      premiumExpiresAt: i % 4 === 0 ? new Date(Date.now() + 30 * 86400000) : null,
      profileViews: 120 + i * 35
    });
  }

  const portfolioDocs = [];
  for (let i = 0; i < 30; i += 1) {
    portfolioDocs.push({
      designerId: designers[i % designers.length]._id,
      title: `Du an thiet ke ${i + 1}`,
      description: 'Bo nhan dien va an pham social media cho thuong hieu moi.',
      category: categories[i % categories.length],
      images: [{ url: `https://picsum.photos/seed/vesd-${i}/900/650`, name: `portfolio-${i}.jpg`, type: 'image/jpeg' }],
      tools: ['Figma', 'Illustrator'],
      tags: ['branding', 'startup', 'vietnam']
    });
  }
  await Portfolio.insertMany(portfolioDocs);

  await PremiumPlan.insertMany([
    { name: 'Designer Premium', roleTarget: 'designer', price: 199000, durationDays: 30, benefits: ['Uu tien hien thi', 'Badge premium', 'Analytics ho so', 'Goi y du an phu hop'] },
    { name: 'Business Premium', roleTarget: 'client', price: 299000, durationDays: 30, benefits: ['Uu tien matching', 'Ho tro dispute nhanh', 'Badge doanh nghiep', 'Quan ly nhieu brief'] },
    { name: 'Designer Pro 90', roleTarget: 'designer', price: 499000, durationDays: 90, benefits: ['Uu tien dai han', 'Ho tro portfolio', 'Thong ke nang cao'] }
  ]);

  await ChecklistTemplate.insertMany([
    { category: 'logo-design', items: [{ label: 'AI/PSD source file', required: true, acceptedFormats: ['ai', 'psd'] }, { label: 'PNG transparent', required: true, acceptedFormats: ['png'] }, { label: 'SVG', required: true, acceptedFormats: ['svg'] }, { label: 'Font name', required: true, acceptedFormats: ['txt'] }, { label: 'Color code', required: true, acceptedFormats: ['txt', 'pdf'] }] },
    { category: 'social-media-design', items: [{ label: 'Editable source', required: true, acceptedFormats: ['fig', 'psd', 'ai'] }, { label: 'PNG/JPG exports', required: true, acceptedFormats: ['png', 'jpg'] }, { label: 'Content guideline', required: false, acceptedFormats: ['pdf'] }] },
    { category: 'brand-identity', items: [{ label: 'Brand guideline PDF', required: true, acceptedFormats: ['pdf'] }, { label: 'Logo package', required: true, acceptedFormats: ['zip'] }, { label: 'Color and typography', required: true, acceptedFormats: ['pdf'] }] }
  ]);

  const statuses = ['pending_designer', 'agreement_pending', 'payment_pending', 'escrow_funded', 'in_progress', 'submitted', 'revision_requested', 'final_submitted', 'completed', 'disputed'];
  const projects = [];
  for (let i = 0; i < 10; i += 1) {
    projects.push(await Project.create({
      clientId: clients[i % clients.length]._id,
      designerId: designers[i % designers.length]._id,
      title: `Thiet ke ${categories[i % categories.length].replaceAll('-', ' ')} cho thuong hieu ${i + 1}`,
      category: categories[i % categories.length],
      description: 'Can thiet ke chuyen nghiep, de ung dung tren kenh online va in an.',
      targetAudience: 'Khach hang tre, SME, startup',
      budget: { min: 1000000, max: 5000000, agreed: 2500000 + i * 300000 },
      deadline: new Date(Date.now() + (7 + i) * 86400000),
      stylePreferences: ['minimal', 'modern'],
      deliverables: ['Source file', 'PNG/JPG export', 'Guideline'],
      revisionLimit: 2,
      revisionUsed: i % 2,
      status: statuses[i],
      agreement: { scope: 'Thiet ke theo brief da thong nhat', price: 2500000 + i * 300000, revisionLimit: 2, deliverables: ['Source file', 'Exports'], ipTerms: 'Client so huu IP sau khi thanh toan du', refundTerms: 'Xu ly qua dispute center', confirmedAt: new Date() },
      milestones: [
        { title: 'Concept', description: 'Huong thiet ke dau tien', amount: 1200000, dueDate: new Date(Date.now() + 5 * 86400000), status: i > 4 ? 'approved' : 'submitted' },
        { title: 'Final handover', description: 'Ban giao file cuoi', amount: 1300000 + i * 300000, dueDate: new Date(Date.now() + 10 * 86400000), status: i > 7 ? 'submitted' : 'pending' }
      ],
      finalFiles: i === 8 ? [{ url: '/uploads/mock.zip', name: 'final.zip', type: 'application/zip', checklistItem: 'Logo package' }] : []
    }));
  }

  await Review.insertMany(projects.slice(0, 5).map((project, i) => ({
    projectId: project._id,
    reviewerId: project.clientId,
    revieweeId: project.designerId,
    rating: 4 + (i % 2),
    content: 'Designer phan hoi nhanh, ban giao dung checklist va dung tinh than thuong hieu.',
    criteria: { communication: 5, quality: 4, deadline: 5 }
  })));

  await Transaction.insertMany([
    { userId: demoClient._id, projectId: projects[3]._id, type: 'deposit', amount: 2500000, platformFee: 200000, status: 'success', paymentMethod: 'momo' },
    { userId: demoDesigner._id, projectId: projects[8]._id, type: 'release', amount: 1800000, platformFee: 144000, status: 'success', paymentMethod: 'escrow' },
    { userId: demoClient._id, projectId: projects[9]._id, type: 'refund', amount: 900000, status: 'pending', paymentMethod: 'escrow' },
    { userId: demoDesigner._id, type: 'withdrawal', amount: 1000000, status: 'success', paymentMethod: 'bank_transfer' },
    { userId: demoDesigner._id, type: 'premium', amount: 199000, status: 'success', paymentMethod: 'vnpay' }
  ]);

  await Dispute.insertMany([
    { projectId: projects[9]._id, openedBy: projects[9].clientId, reason: 'File ban giao thieu source', description: 'Client yeu cau bo sung AI va font.', status: 'under_review' },
    { projectId: projects[6]._id, openedBy: projects[6].designerId, reason: 'Vuot so lan revision', description: 'Client yeu cau qua gioi han da thoa thuan.', status: 'open' }
  ]);

  console.log('Seed completed');
  console.log('Admin: admin@vesd.vn / 12345678');
  console.log('Client: client@vesd.vn / 12345678');
  console.log('Designer: designer@vesd.vn / 12345678');
  await mongoose.disconnect();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

