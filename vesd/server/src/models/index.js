import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const fileSchema = new Schema(
  {
    url: String,
    name: String,
    type: String,
    size: Number,
    checklistItem: String
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    roles: [{ type: String, enum: ['client', 'designer', 'admin'], default: 'client' }],
    avatar: String,
    phone: String,
    status: { type: String, enum: ['active', 'banned', 'pending'], default: 'active' }
  },
  { timestamps: true }
);

const clientProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    companyName: String,
    businessType: String,
    address: String,
    taxCode: String,
    billingInfo: Schema.Types.Mixed,
    accountType: { type: String, enum: ['free', 'business_premium'], default: 'free' },
    premiumStatus: { type: String, enum: ['free', 'premium'], default: 'free' },
    premiumExpiresAt: Date
  },
  { timestamps: true }
);

const designerProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    slug: { type: String, unique: true, sparse: true },
    title: String,
    bio: String,
    skills: [String],
    categories: [String],
    styleTags: [String],
    startingPrice: { type: Number, default: 0 },
    availability: { type: String, default: 'available' },
    education: String,
    experience: String,
    verificationStatus: { type: String, enum: ['unverified', 'pending', 'verified', 'rejected'], default: 'unverified' },
    verificationNote: String,
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    completedProjects: { type: Number, default: 0 },
    accountType: { type: String, enum: ['free', 'designer_premium'], default: 'free' },
    premiumStatus: { type: String, enum: ['free', 'premium'], default: 'free' },
    premiumExpiresAt: Date,
    profileViews: { type: Number, default: 0 }
  },
  { timestamps: true }
);
designerProfileSchema.index({ categories: 1, ratingAverage: -1, premiumStatus: 1 });
designerProfileSchema.index({ skills: 1 });
designerProfileSchema.index({ styleTags: 1 });
designerProfileSchema.index({ title: 'text', bio: 'text', skills: 'text', categories: 'text', styleTags: 'text' });

const portfolioSchema = new Schema(
  {
    designerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: String,
    description: String,
    category: String,
    images: [fileSchema],
    tools: [String],
    tags: [String]
  },
  { timestamps: true }
);
portfolioSchema.index({ designerId: 1, category: 1 });

const milestoneSchema = new Schema(
  {
    title: String,
    description: String,
    amount: Number,
    dueDate: Date,
    status: { type: String, enum: ['pending', 'in_progress', 'submitted', 'approved', 'revision_requested'], default: 'pending' },
    submittedFiles: [fileSchema],
    approvedAt: Date
  },
  { timestamps: true }
);

const projectSchema = new Schema(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    designerId: { type: Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true },
    category: String,
    description: String,
    targetAudience: String,
    budget: { min: Number, max: Number, agreed: Number },
    deadline: Date,
    stylePreferences: [String],
    referenceFiles: [fileSchema],
    deliverables: [String],
    revisionLimit: { type: Number, default: 2 },
    revisionUsed: { type: Number, default: 0 },
    priorityLevel: { type: String, enum: ['standard', 'premium'], default: 'standard' },
    urgent: Boolean,
    printingSupport: Boolean,
    preferredDesignerLevel: String,
    status: {
      type: String,
      enum: ['draft', 'pending_designer', 'agreement_pending', 'payment_pending', 'escrow_funded', 'in_progress', 'submitted', 'revision_requested', 'final_submitted', 'completed', 'disputed', 'cancelled'],
      default: 'draft'
    },
    milestones: [milestoneSchema],
    agreement: {
      scope: String,
      price: Number,
      deadline: Date,
      revisionLimit: Number,
      deliverables: [String],
      ipTerms: String,
      refundTerms: String,
      confirmedAt: Date
    },
    finalFiles: [fileSchema]
  },
  { timestamps: true }
);
projectSchema.index({ clientId: 1, status: 1 });
projectSchema.index({ designerId: 1, status: 1 });
projectSchema.index({ category: 1, status: 1 });

const transactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    type: { type: String, enum: ['deposit', 'release', 'refund', 'withdrawal', 'premium'], required: true },
    amount: Number,
    platformFee: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'success', 'failed', 'cancelled'], default: 'pending' },
    paymentMethod: String,
    metadata: Schema.Types.Mixed
  },
  { timestamps: true }
);
transactionSchema.index({ userId: 1, projectId: 1, createdAt: -1 });

const walletSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    balance: { type: Number, default: 0 },
    pendingBalance: { type: Number, default: 0 },
    escrowBalance: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const withdrawalSchema = new Schema(
  {
    designerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: Number,
    method: String,
    accountInfo: Schema.Types.Mixed,
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'paid'], default: 'pending' }
  },
  { timestamps: true }
);

const reviewSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    revieweeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    content: String,
    criteria: Schema.Types.Mixed,
    reported: { type: Boolean, default: false },
    status: { type: String, enum: ['visible', 'hidden'], default: 'visible' }
  },
  { timestamps: true }
);
reviewSchema.index({ revieweeId: 1, createdAt: -1 });

const disputeSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    openedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: String,
    description: String,
    evidenceFiles: [fileSchema],
    status: { type: String, enum: ['open', 'under_review', 'resolved', 'rejected'], default: 'open' },
    adminDecision: String,
    resolutionType: { type: String, enum: ['release', 'full_refund', 'partial_refund', 'redo', null], default: null },
    resolutionAmount: Number,
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date
  },
  { timestamps: true }
);
disputeSchema.index({ projectId: 1, status: 1 });

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: String,
    message: String,
    type: String,
    isRead: { type: Boolean, default: false },
    link: String
  },
  { timestamps: true }
);

const premiumPlanSchema = new Schema(
  {
    code: { type: String, enum: ['designer_premium', 'business_premium'], required: true, unique: true },
    name: String,
    roleTarget: { type: String, enum: ['client', 'designer', 'both'] },
    price: Number,
    durationDays: Number,
    benefits: [String],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const discountSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: String,
    description: String,
    discountType: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
    value: { type: Number, required: true },
    maxDiscount: Number,
    minOrderAmount: { type: Number, default: 0 },
    appliesTo: { type: String, enum: ['premium', 'project', 'all'], default: 'all' },
    roleTarget: { type: String, enum: ['client', 'designer', 'both'], default: 'both' },
    usageLimit: Number,
    usedCount: { type: Number, default: 0 },
    startsAt: Date,
    endsAt: Date,
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);
discountSchema.index({ appliesTo: 1, roleTarget: 1, isActive: 1 });

const subscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    planId: { type: Schema.Types.ObjectId, ref: 'PremiumPlan', required: true },
    accountType: { type: String, enum: ['designer_premium', 'business_premium'], required: true },
    startDate: Date,
    endDate: Date,
    status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' }
  },
  { timestamps: true }
);

const checklistTemplateSchema = new Schema(
  {
    category: { type: String, required: true, unique: true },
    items: [
      {
        label: String,
        required: Boolean,
        acceptedFormats: [String],
        description: String
      }
    ]
  },
  { timestamps: true }
);

const projectCommentSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User' },
    content: String,
    attachments: [fileSchema],
    type: { type: String, enum: ['message', 'feedback', 'system'], default: 'message' }
  },
  { timestamps: true }
);
projectCommentSchema.index({ projectId: 1, createdAt: 1 });

export const User = model('User', userSchema);
export const ClientProfile = model('ClientProfile', clientProfileSchema);
export const DesignerProfile = model('DesignerProfile', designerProfileSchema);
export const Portfolio = model('Portfolio', portfolioSchema);
export const Project = model('Project', projectSchema);
export const Transaction = model('Transaction', transactionSchema);
export const Wallet = model('Wallet', walletSchema);
export const Withdrawal = model('Withdrawal', withdrawalSchema);
export const Review = model('Review', reviewSchema);
export const Dispute = model('Dispute', disputeSchema);
export const Notification = model('Notification', notificationSchema);
export const PremiumPlan = model('PremiumPlan', premiumPlanSchema);
export const Discount = model('Discount', discountSchema);
export const Subscription = model('Subscription', subscriptionSchema);
export const ChecklistTemplate = model('ChecklistTemplate', checklistTemplateSchema);
export const ProjectComment = model('ProjectComment', projectCommentSchema);
