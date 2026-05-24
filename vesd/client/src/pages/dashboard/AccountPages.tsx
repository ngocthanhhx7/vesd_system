import { FormEvent, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Camera, Clock, CreditCard, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Divider, FileUpload, FormGroup, Input, Select, StatusBadge, Textarea } from '../../components/ui/Primitives';
import { Button } from '../../components/ui/Button';
import { endpoints } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Dashboard, Section } from './shared/Dashboard';
import { Metric } from './shared/Metric';

const bankOptions = [
  'Vietcombank',
  'VietinBank',
  'BIDV',
  'Agribank',
  'Techcombank',
  'MB Bank',
  'ACB',
  'VPBank',
  'Sacombank',
  'TPBank',
  'HDBank',
  'VIB',
  'OCB',
  'MSB',
  'SHB'
];

export function WalletPage() {
  const { user } = useAuth();
  const walletBasePath = user?.roles.includes('designer') ? '/designer/earnings' : '/client/wallet';
  const { data } = useQuery({ queryKey: ['wallet'], queryFn: endpoints.wallet });
  const { data: tx = [] } = useQuery({ queryKey: ['tx'], queryFn: endpoints.transactions });
  return (
    <Dashboard title="Ví tiền">
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Số dư" value={(data?.balance || 0).toLocaleString('vi-VN')} icon={CreditCard} />
        <Metric label="Đang giữ escrow" value={(data?.escrowBalance || 0).toLocaleString('vi-VN')} icon={ShieldAlert} />
        <Metric label="Đang chờ rút" value={(data?.pendingBalance || 0).toLocaleString('vi-VN')} icon={Clock} />
      </div>

      <Card>
        <div className="flex flex-wrap gap-3">
          <Link className="focus-ring inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-base font-semibold text-white shadow-soft hover:bg-secondary" to={`${walletBasePath}/topup`}>
            Nạp tiền
          </Link>
          <Link className="focus-ring inline-flex items-center justify-center rounded-lg border border-line bg-white px-4 py-2.5 text-base font-semibold text-ink hover:bg-soft" to={`${walletBasePath}/withdraw`}>
            Rút tiền
          </Link>
        </div>
      </Card>

      <Section title="Lịch sử giao dịch">
        {tx.map((t: any) => (
          <Card key={t._id}>
            <div className="flex flex-wrap justify-between gap-3">
              <span>{t.type}</span>
              <span>{t.amount?.toLocaleString('vi-VN')}đ</span>
              <StatusBadge status={t.status} />
            </div>
          </Card>
        ))}
      </Section>
    </Dashboard>
  );
}

export function WalletTopupPage() {
  const queryClient = useQueryClient();
  const [topupAmount, setTopupAmount] = useState('10000');
  const [topupMessage, setTopupMessage] = useState('');
  const refreshMoneyData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['wallet'] }),
      queryClient.invalidateQueries({ queryKey: ['tx'] }),
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    ]);
  };
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderCode = params.get('orderCode');
    if (params.get('payos') !== 'success' || !orderCode) return;
    endpoints.syncPayosPayment(orderCode)
      .then(async () => {
        setTopupMessage('payOS đã xác nhận nạp ví thành công.');
        await refreshMoneyData();
      })
      .catch((error) => setTopupMessage(error instanceof Error ? error.message : 'Chưa thể xác nhận giao dịch payOS'));
  }, []);
  const topUpWallet = useMutation({
    mutationFn: () => endpoints.topUpWallet({ amount: Number(topupAmount) }),
    onSuccess: (result: any) => {
      if (result?.checkoutUrl) window.location.href = result.checkoutUrl;
    },
    onError: (error) => setTopupMessage(error instanceof Error ? error.message : 'Không thể tạo giao dịch nạp ví')
  });

  return (
    <Dashboard title="Nạp tiền vào ví">
      <Card>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Input type="number" min="10000" step="1000" placeholder="Số tiền nạp tối thiểu 10.000đ" value={topupAmount} onChange={(event) => setTopupAmount(event.target.value)} />
          <Button disabled={topUpWallet.isPending} onClick={() => topUpWallet.mutate()}>
            {topUpWallet.isPending ? 'Đang tạo...' : 'Nạp ví qua payOS'}
          </Button>
        </div>
        {topupMessage && <p className="mt-3 text-sm text-muted">{topupMessage}</p>}
      </Card>
    </Dashboard>
  );
}

export function WalletWithdrawPage() {
  const queryClient = useQueryClient();
  const { data: walletData } = useQuery({ queryKey: ['wallet'], queryFn: endpoints.wallet });
  const { data: withdrawals = [] } = useQuery({ queryKey: ['withdrawals'], queryFn: endpoints.withdrawals });
  const { data: bankAccounts = [] } = useQuery({ queryKey: ['bank-accounts'], queryFn: endpoints.bankAccounts });
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', bankName: '', toAccountNumber: '', toAccountName: '', saveAccount: false, label: '' });
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrImage, setQrImage] = useState<any>(null);
  const [withdrawMessage, setWithdrawMessage] = useState('');
  const [transferInstruction, setTransferInstruction] = useState<any>(null);
  const refreshMoneyData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['wallet'] }),
      queryClient.invalidateQueries({ queryKey: ['tx'] }),
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] }),
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    ]);
  };
  const selectedAccount = bankAccounts.find((account: any) => account._id === selectedAccountId);
  const createBankAccount = useMutation({
    mutationFn: async () => {
      const uploadedQr = qrFile ? await endpoints.uploadImage(qrFile) : qrImage;
      return endpoints.createBankAccount({
        label: withdrawForm.label || `${withdrawForm.bankName} ${withdrawForm.toAccountNumber}`,
        bankName: withdrawForm.bankName,
        accountNumber: withdrawForm.toAccountNumber,
        accountName: withdrawForm.toAccountName,
        qrImage: uploadedQr,
        isDefault: bankAccounts.length === 0
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      setWithdrawMessage('Đã lưu tài khoản ngân hàng.');
    },
    onError: (error) => setWithdrawMessage(error instanceof Error ? error.message : 'Không thể lưu tài khoản')
  });
  const deleteBankAccount = useMutation({
    mutationFn: (id: string) => endpoints.deleteBankAccount(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bank-accounts'] }),
    onError: (error) => setWithdrawMessage(error instanceof Error ? error.message : 'Không thể xóa tài khoản')
  });
  const createWithdrawal = useMutation({
    mutationFn: async () => {
      const uploadedQr = qrFile ? await endpoints.uploadImage(qrFile) : qrImage;
      return endpoints.createWithdrawal({
        amount: Number(withdrawForm.amount),
        accountInfo: {
          bankAccountId: selectedAccountId || undefined,
          bankName: selectedAccount?.bankName || withdrawForm.bankName,
          toBin: selectedAccount?.bankBin || undefined,
          toAccountNumber: selectedAccount?.accountNumber || withdrawForm.toAccountNumber,
          toAccountName: selectedAccount?.accountName || withdrawForm.toAccountName,
          qrImage: uploadedQr,
          saveAccount: withdrawForm.saveAccount && !selectedAccountId,
          label: withdrawForm.label || undefined
        }
      });
    },
    onSuccess: async (result: any) => {
      setTransferInstruction(result.transferInstruction || null);
      setWithdrawMessage('Đã gửi yêu cầu rút tiền. Casso sẽ tự xác nhận khi ngân hàng ghi nhận giao dịch chuyển ra.');
      setWithdrawForm({ amount: '', bankName: '', toAccountNumber: '', toAccountName: '', saveAccount: false, label: '' });
      setSelectedAccountId('');
      setQrFile(null);
      setQrImage(null);
      await refreshMoneyData();
    },
    onError: (error) => setWithdrawMessage(error instanceof Error ? error.message : 'Không thể rút tiền')
  });
  const syncWithdrawal = useMutation({
    mutationFn: (id: string) => endpoints.syncWithdrawal(id),
    onSuccess: refreshMoneyData,
    onError: (error) => setWithdrawMessage(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái rút tiền')
  });
  const setWithdrawField = (key: keyof typeof withdrawForm, value: string) => setWithdrawForm((current) => ({ ...current, [key]: value }));
  const setWithdrawBoolean = (key: keyof typeof withdrawForm, value: boolean) => setWithdrawForm((current) => ({ ...current, [key]: value }));
  const chooseSavedAccount = (id: string) => {
    setSelectedAccountId(id);
    const account = bankAccounts.find((item: any) => item._id === id);
    if (!account) return;
    setWithdrawForm((current) => ({
      ...current,
      bankName: account.bankName || '',
      toAccountNumber: account.accountNumber || '',
      toAccountName: account.accountName || '',
      saveAccount: false,
      label: account.label || ''
    }));
    setQrImage(account.qrImage || null);
    setQrFile(null);
  };
  const clearSavedAccount = () => {
    setSelectedAccountId('');
    setWithdrawForm((current) => ({ ...current, bankName: '', toAccountNumber: '', toAccountName: '', label: '', saveAccount: false }));
    setQrImage(null);
    setQrFile(null);
  };

  const isUsingNewAccount = !selectedAccountId;
  const availableBalance = walletData?.balance || 0;

  return (
    <Dashboard title="Rút tiền">
      {/* Wallet Balance Header */}
      <div className="withdraw-balance-card rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium opacity-80">Số dư khả dụng</p>
            <p className="text-3xl font-black">{availableBalance.toLocaleString('vi-VN')}đ</p>
          </div>
          <div className="flex gap-6">
            <div className="text-right">
              <p className="text-xs font-medium opacity-60">Đang giữ escrow</p>
              <p className="text-lg font-bold">{(walletData?.escrowBalance || 0).toLocaleString('vi-VN')}đ</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium opacity-60">Đang chờ rút</p>
              <p className="text-lg font-bold">{(walletData?.pendingBalance || 0).toLocaleString('vi-VN')}đ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form + Sidebar Layout */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left: Withdrawal Form */}
        <div className="grid gap-4">
          {/* Step 1: Số tiền rút */}
          <Card>
            <div className="flex items-start gap-3">
              <span className="step-badge mt-0.5">1</span>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-ink">Số tiền rút</h3>
                <p className="mb-4 text-sm text-muted">Nhập số tiền bạn muốn rút về tài khoản ngân hàng</p>
                <FormGroup label="Số tiền" required helper={`Tối thiểu 1.000đ · Tối đa ${availableBalance.toLocaleString('vi-VN')}đ`}>
                  <Input type="number" min="1000" max={availableBalance} placeholder="0" value={withdrawForm.amount} onChange={(event) => setWithdrawField('amount', event.target.value)} />
                </FormGroup>
              </div>
            </div>
          </Card>

          {/* Step 2: Thông tin ngân hàng */}
          <Card>
            <div className="flex items-start gap-3">
              <span className="step-badge mt-0.5">2</span>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-ink">Thông tin ngân hàng</h3>
                <p className="mb-4 text-sm text-muted">
                  {selectedAccount
                    ? <>Đang dùng tài khoản đã lưu · <button className="font-semibold text-brand hover:underline" type="button" onClick={clearSavedAccount}>Nhập tài khoản mới</button></>
                    : 'Nhập thông tin tài khoản nhận tiền hoặc chọn từ danh sách đã lưu bên phải'}
                </p>

                <div className="grid gap-4">
                  <FormGroup label="Ngân hàng" required>
                    <Select value={withdrawForm.bankName} disabled={!isUsingNewAccount} onChange={(event) => setWithdrawField('bankName', event.target.value)}>
                      <option value="">— Chọn ngân hàng —</option>
                      {bankOptions.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
                    </Select>
                  </FormGroup>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormGroup label="Số tài khoản" required>
                      <Input disabled={!isUsingNewAccount} placeholder="Ví dụ: 1234567890" value={withdrawForm.toAccountNumber} onChange={(event) => setWithdrawField('toAccountNumber', event.target.value)} />
                    </FormGroup>
                    <FormGroup label="Tên chủ tài khoản" required>
                      <Input disabled={!isUsingNewAccount} placeholder="Ví dụ: NGUYEN VAN A" value={withdrawForm.toAccountName} onChange={(event) => setWithdrawField('toAccountName', event.target.value)} />
                    </FormGroup>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Step 3: QR & Tùy chọn */}
          <Card>
            <div className="flex items-start gap-3">
              <span className="step-badge mt-0.5">3</span>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-ink">QR nhận tiền & tùy chọn</h3>
                <p className="mb-4 text-sm text-muted">Tải lên mã QR giúp admin chuyển khoản nhanh hơn (không bắt buộc)</p>

                <div className="grid gap-4">
                  <FormGroup label="Ảnh QR nhận tiền">
                    <FileUpload
                      fileName={qrFile?.name}
                      savedUrl={qrImage?.url}
                      savedLabel="Xem QR đã lưu"
                      onChange={(file) => setQrFile(file)}
                    />
                  </FormGroup>

                  {isUsingNewAccount && (
                    <div className="form-section-enter">
                      <Divider className="my-2" />
                      <div className="mt-4 grid gap-3">
                        <label className="flex items-center gap-3 text-base">
                          <input className="h-5 w-5 rounded accent-brand" type="checkbox" checked={Boolean(withdrawForm.saveAccount)} onChange={(event) => setWithdrawBoolean('saveAccount', event.target.checked)} />
                          <span className="font-medium">Lưu tài khoản này để dùng lại lần sau</span>
                        </label>

                        {withdrawForm.saveAccount && (
                          <div className="form-section-enter pl-8">
                            <FormGroup label="Tên gợi nhớ" helper="Ví dụ: Tài khoản Vietcombank chính">
                              <Input placeholder="Đặt tên cho tài khoản" value={withdrawForm.label} onChange={(event) => setWithdrawField('label', event.target.value)} />
                            </FormGroup>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* CTA Section */}
          <div className="grid gap-3">
            <Button className="w-full py-3 text-base" disabled={createWithdrawal.isPending || !withdrawForm.amount} onClick={() => createWithdrawal.mutate()}>
              {createWithdrawal.isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Đang xử lý...
                </span>
              ) : (
                `Gửi yêu cầu rút ${withdrawForm.amount ? Number(withdrawForm.amount).toLocaleString('vi-VN') + 'đ' : ''}`
              )}
            </Button>

            {isUsingNewAccount && !withdrawForm.saveAccount && (
              <Button className="w-full" variant="secondary" disabled={createBankAccount.isPending || !withdrawForm.bankName} onClick={() => createBankAccount.mutate()}>
                {createBankAccount.isPending ? 'Đang lưu...' : 'Chỉ lưu tài khoản (không rút)'}
              </Button>
            )}
          </div>

          {/* Messages & Transfer Instruction */}
          {withdrawMessage && (
            <div className="form-section-enter rounded-lg bg-soft px-4 py-3">
              <p className="text-sm font-medium text-ink">{withdrawMessage}</p>
            </div>
          )}
          {transferInstruction && (
            <div className="transfer-instruction-card form-section-enter rounded-lg p-4">
              <p className="text-sm font-bold text-ink">Mã đối soát: <span className="text-brand">{transferInstruction.content}</span></p>
              <p className="mt-1.5 text-sm text-muted">Admin chuyển đúng số tiền vào tài khoản đã xác nhận và dùng mã này trong nội dung chuyển khoản để Casso tự đánh dấu đã chi.</p>
            </div>
          )}
        </div>

        {/* Right Sidebar: Saved Bank Accounts */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-ink">
            <CreditCard className="h-4 w-4 text-brand" />
            Tài khoản đã lưu
          </h3>

          {bankAccounts.length > 0 ? (
            <div className="grid gap-3">
              {bankAccounts.map((account: any) => {
                const isSelected = selectedAccountId === account._id;
                return (
                  <Card key={account._id} className={isSelected ? 'bank-account-card-selected' : ''}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-ink">{account.label || account.bankName}</p>
                        <p className="text-sm text-muted">{account.bankName}</p>
                        <div className="mt-2">
                          <p className="font-semibold tabular-nums">{account.accountNumber}</p>
                          <p className="text-sm text-muted">{account.accountName}</p>
                        </div>
                        {account.qrImage?.url && (
                          <a className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline" href={account.qrImage.url} target="_blank" rel="noreferrer">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z" /></svg>
                            QR
                          </a>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col gap-1.5">
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-white">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                            Đang dùng
                          </span>
                        ) : (
                          <Button variant="secondary" onClick={() => chooseSavedAccount(account._id)}>Chọn</Button>
                        )}
                        <Button variant="ghost" className="text-sm text-muted hover:text-red-500" disabled={deleteBankAccount.isPending} onClick={() => deleteBankAccount.mutate(account._id)}>Xóa</Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="text-center">
              <div className="py-4">
                <svg className="mx-auto h-10 w-10 text-pale" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
                <p className="mt-2 text-sm font-medium text-muted">Chưa có tài khoản đã lưu</p>
                <p className="mt-1 text-xs text-muted">Tick "Lưu tài khoản" khi rút tiền để lưu lại</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Withdrawal History */}
      {withdrawals.length > 0 && (
        <Section title="Lịch sử yêu cầu rút" columns="form">
          <div className="grid gap-3">
            {withdrawals.map((item: any) => (
              <Card key={item._id}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-soft">
                      <ArrowUpRight className="h-5 w-5 text-brand" />
                    </div>
                    <div>
                      <p className="font-bold tabular-nums">{item.amount?.toLocaleString('vi-VN')}đ</p>
                      <p className="text-sm text-muted">{item.referenceId} · {item.accountInfo?.bankName || item.accountInfo?.toBin} - {item.accountInfo?.toAccountNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={item.status} />
                    {item.method === 'payos' ? (
                      <Button variant="secondary" disabled={syncWithdrawal.isPending || !item.payoutId} onClick={() => syncWithdrawal.mutate(item._id)}>Cập nhật</Button>
                    ) : (
                      <span className="text-sm text-muted">Chờ webhook Casso</span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      )}
    </Dashboard>
  );
}

export function ReviewsPage() {
  return <Dashboard title="Đánh giá"><Card><Textarea placeholder="Viết đánh giá cho designer" /><Select className="mt-3"><option>5 sao</option><option>4 sao</option></Select><Button className="mt-3">Gửi đánh giá</Button></Card></Dashboard>;
}

export function SettingsPage() {
  const { updateUser } = useAuth();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['my-account'], queryFn: endpoints.myAccount });
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security'>('profile');
  const [form, setForm] = useState({ name: '', email: '', phone: '', avatar: '', dateOfBirth: '' });
  const [message, setMessage] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (!data?.user) return;
    setForm({
      name: data.user.name || '',
      email: data.user.email || '',
      phone: data.user.phone || '',
      avatar: data.user.avatar || '',
      dateOfBirth: data.user.dateOfBirth ? data.user.dateOfBirth.slice(0, 10) : ''
    });
  }, [data?.user]);

  const save = useMutation({
    mutationFn: () => endpoints.updateMe({ ...form, dateOfBirth: form.dateOfBirth || null }),
    onSuccess: (user) => {
      updateUser(user);
      setMessage('Đã cập nhật tài khoản');
      setTimeout(() => setMessage(''), 3000);
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Không thể cập nhật tài khoản')
  });
  const setField = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
      setAvatarUploading(true);
      const result = await endpoints.uploadImage(file);
      const avatarUrl = result.url;
      setForm((current) => ({ ...current, avatar: avatarUrl }));
      const updatedUser = await endpoints.updateMe({ avatar: avatarUrl });
      updateUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['my-account'] });
      setMessage('Đã cập nhật ảnh đại diện');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tải ảnh lên');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  return (
    <Dashboard title="Cài đặt tài khoản">
      {/* Tab nav */}
      <div className="settings-tab-nav">
        <button className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>Hồ sơ</button>
        <button className={`settings-tab ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>Thông báo</button>
        <button className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>Bảo mật</button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card>
          <div className="mb-5 flex items-center gap-4">
            <div className="avatar-upload-wrapper" onClick={() => !avatarUploading && avatarInputRef.current?.click()}>
              <div className="h-16 w-16 overflow-hidden rounded-full bg-soft">
                {form.avatar ? <img className="h-full w-full object-cover" src={form.avatar} alt={form.name} /> : null}
              </div>
              <div className="avatar-upload-overlay">
                {avatarUploading ? (
                  <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div><h2 className="text-xl font-black">{form.name || 'Tài khoản VESD'}</h2><p className="text-sm text-muted">{data?.user?.emailVerified ? '✅ Email đã xác thực' : '⚠️ Email chưa xác thực'}</p></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input placeholder="Tên hiển thị" value={form.name} onChange={(event) => setField('name', event.target.value)} />
            <Input type="email" placeholder="Gmail" value={form.email} onChange={(event) => setField('email', event.target.value)} />
            <Input type="date" value={form.dateOfBirth} onChange={(event) => setField('dateOfBirth', event.target.value)} />
            <Input placeholder="Số điện thoại" value={form.phone} onChange={(event) => setField('phone', event.target.value)} />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Đang lưu...' : 'Lưu hồ sơ'}</Button>
            {message && <span className="text-sm text-muted">{message}</span>}
          </div>
        </Card>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && <NotificationPreferencesCard />}

      {/* Security Tab */}
      {activeTab === 'security' && <SecurityCard />}
    </Dashboard>
  );
}

// ── Notification Preferences Card ──
const CATEGORIES = [
  { key: 'project', label: 'Dự án', desc: 'Cập nhật trạng thái dự án, yêu cầu mới' },
  { key: 'wallet', label: 'Ví & Giao dịch', desc: 'Nạp tiền, rút tiền, chuyển khoản' },
  { key: 'dispute', label: 'Khiếu nại', desc: 'Khiếu nại mới, cập nhật xử lý' },
  { key: 'verification', label: 'Xác thực', desc: 'Xác thực tài khoản, hồ sơ' },
  { key: 'premium', label: 'Premium', desc: 'Kích hoạt, gia hạn Premium' },
  { key: 'system', label: 'Hệ thống', desc: 'Bảo trì, cập nhật nền tảng' },
];

const DIGEST_OPTIONS = [
  { value: 'instant', label: 'Gửi ngay' },
  { value: 'daily', label: 'Tóm tắt hàng ngày' },
  { value: 'weekly', label: 'Tóm tắt hàng tuần' },
  { value: 'off', label: 'Tắt email' }
];

function NotificationPreferencesCard() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['notification-preferences'], queryFn: endpoints.notificationPreferences });
  const [prefs, setPrefs] = useState<any>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.preferences) setPrefs(data.preferences);
  }, [data]);

  const update = useMutation({
    mutationFn: (body: any) => endpoints.updateNotificationPreferences(body),
    onSuccess: (res) => {
      setPrefs(res.preferences);
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  });

  const toggle = (channel: 'email' | 'inApp', category: string) => {
    if (!prefs) return;
    const newVal = !prefs[channel]?.[category];
    const updated = { ...prefs, [channel]: { ...prefs[channel], [category]: newVal } };
    setPrefs(updated);
    update.mutate({ [channel]: { [category]: newVal } });
  };

  const setDigest = (value: string) => {
    setPrefs({ ...prefs, emailDigest: value });
    update.mutate({ emailDigest: value });
  };

  if (isLoading || !prefs) return <Card><div className="py-8 text-center text-muted">Đang tải...</div></Card>;

  return (
    <div className="settings-notif-stack">
      <Card>
        <h3 className="text-base font-bold text-ink mb-1">Kênh nhận thông báo</h3>
        <p className="text-sm text-muted mb-4">Chọn cách bạn muốn nhận thông báo cho từng loại hoạt động</p>

        {/* Table header */}
        <div className="settings-notif-grid header">
          <span>Loại thông báo</span>
          <span>In-App</span>
          <span>Email</span>
        </div>

        {/* Rows */}
        {CATEGORIES.map(cat => (
          <div key={cat.key} className="settings-notif-grid row">
            <div>
              <div className="settings-notif-label">{cat.label}</div>
              <div className="settings-notif-desc">{cat.desc}</div>
            </div>
            <div>
              <label className="settings-toggle">
                <input type="checkbox" checked={prefs.inApp?.[cat.key] ?? true} onChange={() => toggle('inApp', cat.key)} />
                <span className="settings-toggle-track" />
              </label>
            </div>
            <div>
              <label className="settings-toggle">
                <input type="checkbox" checked={prefs.email?.[cat.key] ?? false} onChange={() => toggle('email', cat.key)} />
                <span className="settings-toggle-track" />
              </label>
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <h3 className="text-base font-bold text-ink mb-1">Tần suất email</h3>
        <p className="text-sm text-muted mb-4">Chọn cách bạn muốn nhận email thông báo</p>
        <div className="settings-digest-options">
          {DIGEST_OPTIONS.map(opt => (
            <label key={opt.value} className={`settings-digest-option ${prefs.emailDigest === opt.value ? 'active' : ''}`}>
              <input type="radio" name="digest" value={opt.value} checked={prefs.emailDigest === opt.value} onChange={() => setDigest(opt.value)} />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </Card>

      {saved && (
        <div className="settings-saved-toast">
          ✅ Đã lưu cài đặt thông báo
        </div>
      )}
    </div>
  );
}

// ── Security Card (also shown in Security tab) ──
function SecurityCard() {
  const [message, setMessage] = useState('');
  const change = useMutation({
    mutationFn: (body: unknown) => endpoints.changePassword(body),
    onSuccess: () => { setMessage('Đã đổi mật khẩu'); setTimeout(() => setMessage(''), 3000); },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Không thể đổi mật khẩu')
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    change.mutate({ currentPassword: form.get('currentPassword'), newPassword: form.get('newPassword') });
  }
  return (
    <Card>
      <h3 className="text-base font-bold text-ink mb-4">Đổi mật khẩu</h3>
      <form className="grid gap-4 md:max-w-md" onSubmit={submit}>
        <Input name="currentPassword" type="password" placeholder="Mật khẩu hiện tại" />
        <Input name="newPassword" type="password" placeholder="Mật khẩu mới (tối thiểu 8 ký tự)" />
        <Button disabled={change.isPending}>{change.isPending ? 'Đang cập nhật...' : 'Đổi mật khẩu'}</Button>
      </form>
      {message && <p className="mt-3 text-sm text-muted">{message}</p>}
    </Card>
  );
}

export function ChangePasswordPage() {
  const [message, setMessage] = useState('');
  const change = useMutation({
    mutationFn: (body: unknown) => endpoints.changePassword(body),
    onSuccess: () => setMessage('Đã đổi mật khẩu'),
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Không thể đổi mật khẩu')
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    change.mutate({ currentPassword: form.get('currentPassword'), newPassword: form.get('newPassword') });
  }
  return <Dashboard title="Đổi mật khẩu"><Card><form className="grid gap-4 md:max-w-md" onSubmit={submit}><Input name="currentPassword" type="password" placeholder="Mật khẩu hiện tại" /><Input name="newPassword" type="password" placeholder="Mật khẩu mới" /><Button disabled={change.isPending}>{change.isPending ? 'Đang cập nhật...' : 'Đổi mật khẩu'}</Button></form>{message && <p className="mt-3 text-sm text-muted">{message}</p>}</Card></Dashboard>;
}
