import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BarChart3, CheckCircle2, Clock, CreditCard, FolderKanban, ImagePlus, Pencil, ShieldCheck, Sparkles, Trash2, Zap } from 'lucide-react';
import { Badge, Card, FormGroup, Input, Select, StatusBadge, Textarea } from '../../components/ui/Primitives';
import { Button } from '../../components/ui/Button';
import { endpoints, PremiumPlan } from '../../services/api';
import { Dashboard, Section } from './shared/Dashboard';
import { Metric } from './shared/Metric';
import { ProjectCard } from './shared/ProjectCard';

export function DesignerDashboard() {
  const { data = [] } = useQuery({ queryKey: ['designer-projects'], queryFn: endpoints.myProjects });
  const { data: summary } = useQuery({ queryKey: ['dashboard-summary'], queryFn: endpoints.dashboardSummary });
  const awaitingClient = data.filter((p: any) => ['submitted', 'final_submitted'].includes(p.status));
  const needsWork = data.filter((p: any) => ['escrow_funded', 'revision_requested'].includes(p.status));
  const active = data.filter((p: any) => !['completed', 'cancelled'].includes(p.status));
  return (
    <Dashboard title="Tổng quan designer">
      <div className="grid gap-4 md:grid-cols-5">
        <Metric label="Dự án đang chạy" value={summary?.activeProjects ?? data.length} icon={FolderKanban} />
        <Metric label="Yêu cầu mới" value={summary?.newRequests ?? 0} icon={Clock} />
        <Metric label="Thu nhập" value={(summary?.totalEarned || 0).toLocaleString('vi-VN')} icon={CreditCard} />
        <Metric label="Lượt xem hồ sơ" value={summary?.profileViews ?? 0} icon={BarChart3} />
        <Metric label="Chờ rút tiền" value={(summary?.pendingPayouts || 0).toLocaleString('vi-VN')} icon={WalletIcon} />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black">Bàn giao cần theo dõi</h2>
            <Link to="/designer/jobs"><Button>Tìm việc</Button></Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="dashboard-panel-inset rounded-lg p-4"><p className="text-sm text-muted">Cần bắt đầu/sửa</p><p className="text-2xl font-black">{needsWork.length}</p></div>
            <div className="dashboard-panel-inset rounded-lg p-4"><p className="text-sm text-muted">Chờ khách duyệt</p><p className="text-2xl font-black">{awaitingClient.length}</p></div>
            <div className="dashboard-panel-inset rounded-lg p-4"><p className="text-sm text-muted">Đang xử lý</p><p className="text-2xl font-black">{active.length}</p></div>
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-black">Workspace gần đây</h2>
          <div className="mt-4 space-y-3">
            {active.slice(0, 3).map((project: any) => (
              <Link key={project._id} to={`/designer/workspace/${project._id}`} className="block rounded-lg bg-soft p-3 transition hover:bg-pale">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold">{project.title}</p>
                  <StatusBadge status={project.status} />
                </div>
              </Link>
            ))}
            {!active.length && <p className="text-base text-muted">Chưa có workspace đang chạy.</p>}
          </div>
        </Card>
      </div>
      <Section title="Yêu cầu dự án">{data.slice(0, 4).map((p: any) => <ProjectCard key={p._id} project={p} />)}</Section>
    </Dashboard>
  );
}

function WalletIcon(props: any) { return <CreditCard {...props} />; }

export function DesignerProfileSetup() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['my-account'],
    queryFn: endpoints.myAccount
  });

  const [form, setForm] = useState({
    title: '',
    startingPrice: '0',
    bio: '',
    skills: '',
    categories: '',
    styleTags: '',
    availability: 'available',
    education: '',
    experience: '',
    facebook: '',
    linkedin: '',
    twitter: '',
    tiktok: '',
    background: ''
  });

  const [message, setMessage] = useState('');
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [bgUploading, setBgUploading] = useState(false);

  const handleBackgroundUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage('Chỉ chấp nhận file ảnh (JPG, PNG, GIF, WebP)');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage('Ảnh tối đa 5MB');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    try {
      setBgUploading(true);
      const result = await endpoints.uploadImage(file);
      const bgUrl = result.url;
      setField('background', bgUrl);
      setMessage('Đã tải ảnh nền lên thành công!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tải ảnh lên');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setBgUploading(false);
      if (bgInputRef.current) bgInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (data?.designerProfile) {
      const p = data.designerProfile;
      setForm({
        title: p.title || '',
        startingPrice: String(p.startingPrice || 0),
        bio: p.bio || '',
        skills: (p.skills || []).join(', '),
        categories: (p.categories || []).join(', '),
        styleTags: (p.styleTags || []).join(', '),
        availability: p.availability || 'available',
        education: p.education || '',
        experience: p.experience || '',
        facebook: p.socialLinks?.facebook || '',
        linkedin: p.socialLinks?.linkedin || '',
        twitter: p.socialLinks?.twitter || '',
        tiktok: p.socialLinks?.tiktok || '',
        background: p.background || ''
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: (body: any) => endpoints.createDesignerProfile(body),
    onSuccess: () => {
      setMessage('Đã cập nhật hồ sơ designer thành công!');
      queryClient.invalidateQueries({ queryKey: ['my-account'] });
      setTimeout(() => setMessage(''), 3000);
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Không thể cập nhật hồ sơ');
    }
  });

  const setField = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: form.title,
      startingPrice: Number(form.startingPrice) || 0,
      bio: form.bio,
      skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
      categories: form.categories.split(',').map(c => c.trim()).filter(Boolean),
      styleTags: form.styleTags.split(',').map(t => t.trim()).filter(Boolean),
      availability: form.availability,
      education: form.education,
      experience: form.experience,
      socialLinks: {
        facebook: form.facebook,
        linkedin: form.linkedin,
        twitter: form.twitter,
        tiktok: form.tiktok
      },
      background: form.background
    };
    save.mutate(payload);
  };

  if (isLoading) {
    return (
      <Dashboard title="Thiết lập hồ sơ designer">
        <Card>
          <p className="text-muted">Đang tải...</p>
        </Card>
      </Dashboard>
    );
  }

  return (
    <Dashboard title="Thiết lập hồ sơ designer">
      <Card>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <FormGroup label="Tiêu đề hồ sơ" required>
            <Input
              placeholder="Ví dụ: Graphic Designer, UI/UX Designer..."
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              required
            />
          </FormGroup>
          <FormGroup label="Giá khởi điểm (VND)" required>
            <Input
              type="number"
              placeholder="Ví dụ: 500000"
              value={form.startingPrice}
              onChange={(e) => setField('startingPrice', e.target.value)}
              required
            />
          </FormGroup>
          <div className="md:col-span-2">
            <FormGroup label="Giới thiệu bản thân" required>
              <Textarea
                placeholder="Giới thiệu chi tiết kinh nghiệm, phong cách thiết kế của bạn..."
                value={form.bio}
                onChange={(e) => setField('bio', e.target.value)}
                required
              />
            </FormGroup>
          </div>
          <FormGroup label="Kỹ năng (cách nhau bởi dấu phẩy)" helper="Ví dụ: Figma, Illustrator, Photoshop">
            <Input
              placeholder="Figma, Photoshop, Illustrator"
              value={form.skills}
              onChange={(e) => setField('skills', e.target.value)}
            />
          </FormGroup>
          <FormGroup label="Danh mục thiết kế (cách nhau bởi dấu phẩy)" helper="Ví dụ: logo-design, brand-identity, ui-ux-design">
            <Input
              placeholder="logo-design, brand-identity, ui-ux-design"
              value={form.categories}
              onChange={(e) => setField('categories', e.target.value)}
            />
          </FormGroup>
          <FormGroup label="Tag phong cách (cách nhau bởi dấu phẩy)" helper="Ví dụ: minimal, bold, modern, playful">
            <Input
              placeholder="minimal, modern, bold"
              value={form.styleTags}
              onChange={(e) => setField('styleTags', e.target.value)}
            />
          </FormGroup>
          <FormGroup label="Thời gian nhận việc">
            <Select
              value={form.availability}
              onChange={(e) => setField('availability', e.target.value)}
            >
              <option value="available">Sẵn sàng nhận dự án</option>
              <option value="busy">Bận / Trao đổi lịch làm việc</option>
            </Select>
          </FormGroup>
          <FormGroup label="Học văn">
            <Input
              placeholder="Ví dụ: Đại học Mỹ thuật, Arena Multimedia..."
              value={form.education}
              onChange={(e) => setField('education', e.target.value)}
            />
          </FormGroup>
          <FormGroup label="Kinh nghiệm">
            <Input
              placeholder="Ví dụ: 3 năm, 5 năm..."
              value={form.experience}
              onChange={(e) => setField('experience', e.target.value)}
            />
          </FormGroup>
          <FormGroup label="Ảnh nền hồ sơ" helper="Ảnh nền sẽ hiển thị làm bìa hồ sơ của bạn (khuyên dùng tỉ lệ rộng)">
            <div className="mt-1 flex flex-col gap-3">
              {form.background ? (
                <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 h-32 w-full flex items-center justify-center">
                  <img
                    src={form.background}
                    alt="Background Preview"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-3 opacity-0 hover:opacity-100 transition-opacity">
                    <Button
                      type="button"
                      variant="secondary"
                      className="bg-white hover:bg-slate-100 text-slate-800"
                      onClick={() => bgInputRef.current?.click()}
                      disabled={bgUploading}
                    >
                      Thay đổi
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => setField('background', '')}
                      disabled={bgUploading}
                    >
                      Xóa
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => !bgUploading && bgInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-brand rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition bg-slate-50"
                >
                  {bgUploading ? (
                    <svg className="h-8 w-8 animate-spin text-brand" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                  <span className="text-sm font-semibold text-slate-600">
                    {bgUploading ? 'Đang tải lên...' : 'Nhấp để chọn file ảnh nền'}
                  </span>
                  <span className="text-xs text-slate-400">JPG, PNG, WebP tối đa 5MB</span>
                </div>
              )}
              <input
                ref={bgInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBackgroundUpload}
              />
            </div>
          </FormGroup>
          
          <div className="md:col-span-2 mt-4">
            <h3 className="text-lg font-bold mb-3">Liên kết mạng xã hội</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <FormGroup label="Facebook URL">
                <Input
                  placeholder="https://facebook.com/..."
                  value={form.facebook}
                  onChange={(e) => setField('facebook', e.target.value)}
                />
              </FormGroup>
              <FormGroup label="LinkedIn URL">
                <Input
                  placeholder="https://linkedin.com/in/..."
                  value={form.linkedin}
                  onChange={(e) => setField('linkedin', e.target.value)}
                />
              </FormGroup>
              <FormGroup label="Twitter/X URL">
                <Input
                  placeholder="https://twitter.com/..."
                  value={form.twitter}
                  onChange={(e) => setField('twitter', e.target.value)}
                />
              </FormGroup>
              <FormGroup label="TikTok URL">
                <Input
                  placeholder="https://tiktok.com/@..."
                  value={form.tiktok}
                  onChange={(e) => setField('tiktok', e.target.value)}
                />
              </FormGroup>
            </div>
          </div>

          <div className="md:col-span-2 mt-4 flex items-center gap-4">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Đang lưu...' : 'Lưu hồ sơ'}
            </Button>
            {message && <p className="text-sm font-semibold text-brand">{message}</p>}
          </div>
        </form>
      </Card>
    </Dashboard>
  );
}

export function PortfolioManager() {
  const queryClient = useQueryClient();
  const { data: account } = useQuery({ queryKey: ['my-account'], queryFn: endpoints.myAccount });
  const userId = account?.user?._id;
  const { data: portfolioItems = [], isLoading } = useQuery({
    queryKey: ['my-portfolio', userId],
    queryFn: () => endpoints.myPortfolio(userId!),
    enabled: !!userId
  });

  const [form, setForm] = useState({ title: '', category: '', description: '', tools: '' });
  const [images, setImages] = useState<{ url: string; name: string; type: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showMessage = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 4000); };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) { showMessage('Chỉ chấp nhận file ảnh (JPG, PNG, WebP)'); continue; }
      if (file.size > 5 * 1024 * 1024) { showMessage('Ảnh tối đa 5MB'); continue; }
      try {
        setUploading(true);
        const result = await endpoints.uploadImage(file);
        setImages(prev => [...prev, { url: result.url, name: file.name, type: file.type }]);
      } catch (err) {
        showMessage(err instanceof Error ? err.message : 'Không thể tải ảnh lên');
      } finally {
        setUploading(false);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index));

  const resetForm = () => {
    setForm({ title: '', category: '', description: '', tools: '' });
    setImages([]);
    setEditingId(null);
  };

  const startEdit = (item: any) => {
    setEditingId(item._id);
    setForm({
      title: item.title || '',
      category: item.category || '',
      description: item.description || '',
      tools: (item.tools || []).join(', ')
    });
    setImages(item.images || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const createMutation = useMutation({
    mutationFn: (body: any) => endpoints.createPortfolio(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-portfolio'] });
      resetForm();
      showMessage('Đã thêm dự án vào hồ sơ năng lực!');
    },
    onError: (err) => showMessage(err instanceof Error ? err.message : 'Không thể tạo portfolio')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => endpoints.updatePortfolio(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-portfolio'] });
      resetForm();
      showMessage('Đã cập nhật dự án!');
    },
    onError: (err) => showMessage(err instanceof Error ? err.message : 'Không thể cập nhật portfolio')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => endpoints.deletePortfolio(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-portfolio'] });
      showMessage('Đã xóa dự án!');
    },
    onError: (err) => showMessage(err instanceof Error ? err.message : 'Không thể xóa portfolio')
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { showMessage('Vui lòng nhập tên dự án'); return; }
    if (!images.length) { showMessage('Vui lòng upload ít nhất 1 ảnh'); return; }
    const payload = {
      title: form.title.trim(),
      category: form.category.trim(),
      description: form.description.trim(),
      tools: form.tools.split(',').map(t => t.trim()).filter(Boolean),
      images
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, body: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: string, title: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa dự án "${title}"?`)) return;
    deleteMutation.mutate(id);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Dashboard title="Quản lý hồ sơ năng lực">
      {/* Form tạo/sửa */}
      <Card>
        <h2 className="text-lg font-bold mb-4">{editingId ? '✏️ Sửa dự án' : '➕ Thêm dự án mới'}</h2>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <FormGroup label="Tên dự án" required>
            <Input
              placeholder="Ví dụ: Thiết kế logo ABC Corp"
              value={form.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, title: e.target.value }))}
              required
            />
          </FormGroup>
          <FormGroup label="Danh mục">
            <Input
              placeholder="Ví dụ: logo-design, branding"
              value={form.category}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, category: e.target.value }))}
            />
          </FormGroup>
          <div className="md:col-span-2">
            <FormGroup label="Mô tả">
              <Textarea
                placeholder="Mô tả chi tiết về dự án..."
                value={form.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </FormGroup>
          </div>

          {/* Image Upload Zone */}
          <div className="md:col-span-2">
            <FormGroup label="Hình ảnh dự án" helper="Nhấp hoặc kéo thả để tải ảnh lên (JPG, PNG, WebP tối đa 5MB)" required>
              <div className="mt-1 flex flex-col gap-3">
                {/* Preview Grid */}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50 aspect-[4/3]">
                        <img src={img.url} alt={img.name} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            type="button"
                            variant="danger"
                            className="!py-1 !px-3 text-xs"
                            onClick={() => removeImage(idx)}
                          >
                            <Trash2 size={14} className="mr-1" /> Xóa
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Drop Zone */}
                <div
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-brand rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition bg-slate-50"
                >
                  {uploading ? (
                    <svg className="h-8 w-8 animate-spin text-brand" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <ImagePlus className="w-8 h-8 text-slate-400" />
                  )}
                  <span className="text-sm font-semibold text-slate-600">
                    {uploading ? 'Đang tải lên...' : 'Nhấp để chọn ảnh dự án'}
                  </span>
                  <span className="text-xs text-slate-400">JPG, PNG, WebP tối đa 5MB · Có thể chọn nhiều ảnh</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </FormGroup>
          </div>

          <FormGroup label="Công cụ đã dùng" helper="Cách nhau bởi dấu phẩy. Ví dụ: Figma, Photoshop">
            <Input
              placeholder="Figma, Photoshop, Illustrator"
              value={form.tools}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, tools: e.target.value }))}
            />
          </FormGroup>

          <div className="md:col-span-2 flex items-center gap-3 mt-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Đang lưu...' : editingId ? 'Cập nhật dự án' : 'Thêm dự án vào hồ sơ'}
            </Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={resetForm}>Hủy sửa</Button>
            )}
            {message && <p className="text-sm font-semibold text-brand">{message}</p>}
          </div>
        </form>
      </Card>

      {/* Danh sách portfolio */}
      <Section title={`Dự án đã đăng (${portfolioItems.length})`}>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="h-60 animate-pulse bg-white"><span className="sr-only">Đang tải</span></Card>
            ))}
          </div>
        ) : portfolioItems.length === 0 ? (
          <Card>
            <p className="text-center text-muted py-8">Chưa có dự án nào trong hồ sơ năng lực. Hãy thêm dự án đầu tiên ở form phía trên!</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {portfolioItems.map((item: any) => (
              <Card key={item._id} className="overflow-hidden !p-0">
                {/* Thumbnail */}
                <div className="relative aspect-[16/10] bg-slate-100">
                  {item.images?.[0]?.url ? (
                    <img src={item.images[0].url} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-300">
                      <ImagePlus size={40} />
                    </div>
                  )}
                  {item.images?.length > 1 && (
                    <span className="absolute top-2 right-2 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      +{item.images.length - 1} ảnh
                    </span>
                  )}
                </div>
                {/* Info */}
                <div className="p-4">
                  <h3 className="font-bold text-slate-800 truncate">{item.title || 'Không có tên'}</h3>
                  {item.category && <p className="text-xs text-brand font-semibold mt-1 uppercase">{item.category}</p>}
                  {item.description && <p className="text-sm text-muted mt-2 line-clamp-2">{item.description}</p>}
                  {item.tools?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.tools.map((tool: string) => (
                        <span key={tool} className="text-[11px] bg-blue-50 text-brand px-2 py-0.5 rounded-full font-medium">{tool}</span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="secondary"
                      className="!py-1.5 !px-3 text-xs"
                      onClick={() => startEdit(item)}
                    >
                      <Pencil size={13} className="mr-1" /> Sửa
                    </Button>
                    <Button
                      variant="danger"
                      className="!py-1.5 !px-3 text-xs"
                      onClick={() => handleDelete(item._id, item.title)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 size={13} className="mr-1" /> Xóa
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </Dashboard>
  );
}

export function RequestsPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const { data = [], isLoading } = useQuery({ queryKey: ['designer-projects'], queryFn: endpoints.myProjects });
  const requests = data.filter((project: any) => project.status === 'pending_designer');
  const accept = useMutation({
    mutationFn: (id: string) => endpoints.acceptProject(id),
    onSuccess: async () => {
      setMessage('Đã chấp nhận yêu cầu dự án.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['designer-projects'] }),
        queryClient.invalidateQueries({ queryKey: ['my-projects'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      ]);
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Không thể chấp nhận yêu cầu')
  });
  const reject = useMutation({
    mutationFn: (id: string) => endpoints.rejectProject(id),
    onSuccess: async () => {
      setMessage('Đã từ chối yêu cầu dự án.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['designer-projects'] }),
        queryClient.invalidateQueries({ queryKey: ['my-projects'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      ]);
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Không thể từ chối yêu cầu')
  });

  return (
    <Dashboard title="Yêu cầu dự án">
      <Section title="Yêu cầu mới">
        {isLoading ? Array.from({ length: 3 }).map((_, index) => <Card key={index} className="h-40 animate-pulse bg-white"><span className="sr-only">Đang tải</span></Card>) : requests.length ? requests.map((project: any) => (
          <Card key={project._id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-bold">{project.title}</h3>
                <p className="text-base text-muted">{project.clientId?.name || 'Khách hàng VESD'} · {project.category}</p>
              </div>
              <Badge tone={project.priorityLevel === 'premium' ? 'premium' : 'info'}>{project.priorityLevel === 'premium' ? 'Premium' : 'Tiêu chuẩn'}</Badge>
            </div>
            <p className="mt-3 line-clamp-2 text-base text-muted">{project.description || 'Khách hàng cần đề xuất phạm vi công việc và timeline.'}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button disabled={accept.isPending} onClick={() => accept.mutate(project._id)}>Chấp nhận</Button>
              <Button variant="secondary">Gửi đề xuất</Button>
              <Button variant="danger" disabled={reject.isPending} onClick={() => reject.mutate(project._id)}>Từ chối</Button>
            </div>
          </Card>
        )) : <Card><p className="font-semibold">Chưa có yêu cầu trực tiếp.</p><p className="mt-1 text-base text-muted">Các dự án bạn tự nhận từ trang Tìm việc sẽ nằm trong Dự án của tôi.</p></Card>}
      </Section>
      {message && <p className="mt-4 rounded-lg bg-white px-4 py-3 text-sm text-muted">{message}</p>}
    </Dashboard>
  );
}

type PremiumPageProps = {
  roleTarget?: 'client' | 'designer';
};

const premiumCopy = {
  designer: {
    title: 'Designer Premium',
    subtitle: 'Tăng hiển thị hồ sơ, ưu tiên trong kết quả tìm kiếm và tăng cơ hội nhận dự án.',
    accountLabel: 'Tài khoản Designer Premium',
    perks: ['Tăng hiển thị hồ sơ', 'Ưu tiên trong kết quả tìm kiếm', 'Có thể nhận tích xanh uy tín', 'Tăng cơ hội nhận dự án']
  },
  client: {
    title: 'Business Premium',
    subtitle: 'Ưu tiên đăng dự án, kết nối nhanh hơn với designer phù hợp và được hỗ trợ xử lý khiếu nại.',
    accountLabel: 'Tài khoản Business Premium',
    perks: ['Ưu tiên đăng dự án', 'Kết nối nhanh hơn với designer phù hợp', 'Hỗ trợ quản lý dự án nâng cao', 'Ưu tiên hỗ trợ và xử lý khiếu nại']
  }
};

function formatVnd(value?: number) {
  return `${(value || 0).toLocaleString('vi-VN')} VND`;
}

export function PremiumPage({ roleTarget = 'designer' }: PremiumPageProps) {
  const queryClient = useQueryClient();
  const copy = premiumCopy[roleTarget];
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [discountResult, setDiscountResult] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('payos');
  const [message, setMessage] = useState('');
  const { data: plans = [] } = useQuery({ queryKey: ['plans', roleTarget], queryFn: () => endpoints.premiumPlans(`?role=${roleTarget}`) });
  const { data: account } = useQuery({ queryKey: ['my-account'], queryFn: endpoints.myAccount });
  const { data: subscriptions = [] } = useQuery({ queryKey: ['premium-my'], queryFn: () => endpoints.premiumMy() });
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderCode = params.get('orderCode');
    if (params.get('payos') !== 'success' || !orderCode) return;
    endpoints.syncPayosPayment(orderCode)
      .then(async () => {
        setMessage('payOS đã xác nhận thanh toán thành công.');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['my-account'] }),
          queryClient.invalidateQueries({ queryKey: ['premium-my'] }),
          queryClient.invalidateQueries({ queryKey: ['tx'] }),
          queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
        ]);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Chưa thể xác nhận thanh toán payOS'));
  }, [queryClient]);
  const activeProfile = roleTarget === 'designer' ? account?.designerProfile : account?.clientProfile;
  const activeSubscription = subscriptions.find((item: any) => item.status === 'active');
  const selectedPlan = plans.find((plan) => plan._id === selectedPlanId) || plans[0];
  const finalAmount = discountResult?.finalAmount ?? selectedPlan?.price ?? 0;
  const validateDiscount = useMutation({
    mutationFn: () => endpoints.validateDiscount({ code: discountCode.trim(), amount: selectedPlan?.price || 0, appliesTo: 'premium' }),
    onSuccess: (result) => {
      setDiscountResult(result);
      setMessage(result.discountAmount > 0 ? `Đã áp dụng mã ${result.code}, giảm ${formatVnd(result.discountAmount)}.` : 'Mã giảm giá hợp lệ.');
    },
    onError: (error) => {
      setDiscountResult(null);
      setMessage(error instanceof Error ? error.message : 'Không thể áp dụng mã giảm giá');
    }
  });
  const subscribe = useMutation({
    mutationFn: (plan: PremiumPlan) => endpoints.subscribe({ planId: plan._id, discountCode: discountCode.trim() || undefined, paymentMethod }),
    onSuccess: async (result: any) => {
      if (result?.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      setMessage(paymentMethod === 'wallet' ? 'Đã thanh toán bằng ví và kích hoạt Premium.' : 'Đã kích hoạt Premium và cập nhật loại tài khoản vào hệ thống.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-account'] }),
        queryClient.invalidateQueries({ queryKey: ['premium-my'] }),
        queryClient.invalidateQueries({ queryKey: ['tx'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      ]);
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Không thể nâng cấp Premium')
  });

  return (
    <Dashboard title={copy.title}>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card className="border-brand/20 bg-soft">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Badge tone="premium">{copy.accountLabel}</Badge>
                <h2 className="mt-3 text-2xl font-black">{copy.subtitle}</h2>
              </div>
              <div className="rounded-lg bg-white px-4 py-3">
                <p className="text-sm text-muted">Trạng thái hiện tại</p>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge status={activeProfile?.premiumStatus || 'free'} />
                  {activeProfile?.premiumExpiresAt && <span className="text-sm text-muted">đến {new Date(activeProfile.premiumExpiresAt).toLocaleDateString('vi-VN')}</span>}
                </div>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {copy.perks.map((perk) => <div key={perk} className="flex items-center gap-2 text-base"><CheckCircle2 className="text-brand" size={18} />{perk}</div>)}
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {plans.map((plan) => (
              <Card key={plan._id} className={selectedPlan?._id === plan._id ? 'border-brand shadow-soft' : ''}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge tone="premium">{plan.durationDays} ngày</Badge>
                    <h3 className="mt-3 text-2xl font-black">{plan.name}</h3>
                    <p className="mt-2 text-3xl font-black">{formatVnd(plan.price)}</p>
                  </div>
                  {plan.code === 'designer_premium' ? <Sparkles className="text-premium" /> : <ShieldCheck className="text-brand" />}
                </div>
                <div className="mt-4 space-y-2">
                  {plan.benefits.map((benefit) => <p key={benefit} className="flex gap-2 text-sm"><CheckCircle2 className="shrink-0 text-brand" size={17} />{benefit}</p>)}
                </div>
                <Button className="mt-5 w-full" variant={selectedPlan?._id === plan._id ? 'primary' : 'secondary'} onClick={() => setSelectedPlanId(plan._id)}>
                  Chọn gói
                </Button>
              </Card>
            ))}
          </div>
        </div>

        <Card className="self-start">
          <div className="flex items-center gap-2">
            <Zap className="text-premium" />
            <h2 className="text-xl font-black">Xác nhận nâng cấp</h2>
          </div>
          <div className="mt-5 space-y-4">
            <Select value={selectedPlan?._id || ''} onChange={(event) => setSelectedPlanId(event.target.value)}>
              {plans.map((plan) => <option key={plan._id} value={plan._id}>{plan.name}</option>)}
            </Select>
            <div className="flex gap-2">
              <Input value={discountCode} onChange={(event) => { setDiscountCode(event.target.value); setDiscountResult(null); }} placeholder="Mã giảm giá nếu có" />
              <Button variant="secondary" disabled={!discountCode.trim() || !selectedPlan || validateDiscount.isPending} onClick={() => validateDiscount.mutate()}>Áp dụng</Button>
            </div>
            <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
              <option value="payos">payOS</option>
              <option value="wallet">Ví VESD</option>
              <option value="bank_transfer">Chuyển khoản ngân hàng</option>
              <option value="momo">MoMo</option>
              <option value="vnpay">VNPay</option>
            </Select>
          </div>
          <div className="mt-5 rounded-lg bg-soft p-4">
            <p className="text-sm text-muted">Tổng thanh toán</p>
            <p className="text-2xl font-black">{formatVnd(finalAmount)}</p>
            {discountResult?.discountAmount > 0 && <p className="mt-1 text-sm text-brand">Đã giảm {formatVnd(discountResult.discountAmount)} từ {formatVnd(selectedPlan?.price)}</p>}
            <p className="mt-1 text-sm text-muted">{paymentMethod === 'wallet' ? 'Trừ trực tiếp từ số dư ví VESD.' : 'Hiệu lực sau khi payOS xác nhận thanh toán thành công.'}</p>
          </div>
          <Button className="mt-5 w-full" disabled={!selectedPlan || subscribe.isPending} onClick={() => selectedPlan && subscribe.mutate(selectedPlan)}>
            {subscribe.isPending ? 'Đang xử lý...' : 'Nâng cấp tài khoản'}
          </Button>
          {message && <p className="mt-3 text-sm text-muted">{message}</p>}
          {activeSubscription?.planId && <p className="mt-4 text-sm text-muted">Gói gần nhất: {activeSubscription.planId.name}</p>}
        </Card>
      </div>
    </Dashboard>
  );
}

