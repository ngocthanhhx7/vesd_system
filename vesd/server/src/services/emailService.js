import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

// ── Transporter (lazy-init) ──
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.smtp.host) {
    console.warn('[EmailService] SMTP not configured — emails will be skipped.');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: { user: env.smtp.user, pass: env.smtp.pass }
  });
  return transporter;
}

// ── HTML Template ──
function absoluteClientUrl(path = '') {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${env.clientUrl}${normalizedPath}`;
}

function buildEmailHTML({ title, body, actionUrl, actionLabel }) {
  const actionHref = actionUrl ? absoluteClientUrl(actionUrl) : '';
  const settingsHref = absoluteClientUrl('/client/settings');
  return `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { margin:0; padding:0; background:#f4f6fb; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
  .container { max-width:560px; margin:40px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.06); }
  .header { background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%); padding:32px 28px; }
  .header h1 { color:#fff; font-size:20px; margin:0; letter-spacing:-0.5px; }
  .header .logo { color:#6C8AFF; font-weight:800; font-size:14px; letter-spacing:1px; margin-bottom:8px; }
  .body { padding:28px; }
  .body h2 { font-size:18px; color:#1e293b; margin:0 0 12px; }
  .body p { font-size:14px; color:#475569; line-height:1.6; margin:0 0 16px; }
  .btn { display:inline-block; padding:12px 28px; background:#2453D6; color:#fff; font-size:14px; font-weight:600; text-decoration:none; border-radius:10px; }
  .footer { padding:20px 28px; border-top:1px solid #edf0f8; font-size:12px; color:#94a3b8; text-align:center; }
  .footer a { color:#2453D6; text-decoration:none; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="logo">VESD</div>
    <h1>${title}</h1>
  </div>
  <div class="body">
    ${body}
    ${actionHref ? `<p style="text-align:center;margin-top:24px;"><a href="${actionHref}" class="btn">${actionLabel || 'Xem chi tiết'}</a></p>` : ''}
  </div>
  <div class="footer">
    <p>Bạn nhận được email này vì đã đăng ký tài khoản tại <a href="${env.clientUrl}">VESD</a>.</p>
    <p>Quản lý thông báo trong <a href="${settingsHref}">Cài đặt</a></p>
  </div>
</div>
</body>
</html>`;
}

// ── Send Email ──
export async function sendEmail({ to, subject, title, body, actionUrl, actionLabel }) {
  const transport = getTransporter();
  if (!transport) return null;

  try {
    const result = await transport.sendMail({
      from: env.smtp.from,
      to,
      subject,
      html: buildEmailHTML({ title: title || subject, body, actionUrl, actionLabel })
    });
    return result;
  } catch (err) {
    console.error('[EmailService] Failed to send email:', err.message);
    return null;
  }
}

// ── Notification Email Templates ──
const emailTemplates = {
  'wallet.withdraw_requested': (notif) => ({
    subject: 'Yêu cầu rút tiền đang xử lý',
    body: `<h2>Yêu cầu rút tiền</h2><p>${notif.title}</p><p>Chúng tôi đang xử lý yêu cầu rút tiền của bạn. Bạn sẽ nhận được thông báo khi hoàn tất.</p>`,
    actionUrl: notif.actionUrl,
    actionLabel: 'Xem ví'
  }),
  'wallet.withdraw_completed': (notif) => ({
    subject: '✅ Rút tiền thành công',
    body: `<h2>Rút tiền thành công!</h2><p>${notif.title}</p><p>Tiền đã được chuyển vào tài khoản ngân hàng của bạn.</p>`,
    actionUrl: notif.actionUrl,
    actionLabel: 'Xem ví'
  }),
  'wallet.withdraw_rejected': (notif) => ({
    subject: '❌ Yêu cầu rút tiền bị từ chối',
    body: `<h2>Rút tiền không thành công</h2><p>${notif.title}</p><p>Số tiền đã được hoàn lại vào ví. Vui lòng kiểm tra thông tin tài khoản và thử lại.</p>`,
    actionUrl: notif.actionUrl,
    actionLabel: 'Thử lại'
  }),
  'premium.activated': (notif) => ({
    subject: '👑 Premium đã kích hoạt',
    body: `<h2>Chào mừng bạn đến Premium!</h2><p>${notif.message || notif.title}</p><p>Bạn đã có quyền truy cập tất cả tính năng cao cấp.</p>`,
    actionUrl: notif.actionUrl,
    actionLabel: 'Khám phá Premium'
  }),
  'project.status_changed': (notif) => ({
    subject: `Dự án: ${notif.title}`,
    body: `<h2>Cập nhật dự án</h2><p>${notif.title}</p>${notif.message ? `<p>${notif.message}</p>` : ''}`,
    actionUrl: notif.actionUrl,
    actionLabel: 'Xem dự án'
  }),
  'dispute.created': (notif) => ({
    subject: '⚠️ Khiếu nại mới',
    body: `<h2>Khiếu nại cần xử lý</h2><p>${notif.title}</p>${notif.message ? `<p>${notif.message}</p>` : ''}`,
    actionUrl: notif.actionUrl,
    actionLabel: 'Xem chi tiết'
  })
};

/**
 * Send notification email if user has enabled email for this category.
 * Called from notificationService.notify()
 */
export async function sendNotificationEmail(user, notification) {
  // Skip if no user email or no preferences
  if (!user?.email) return;
  const prefs = user.notificationPreferences?.email || {};
  const category = notification.category || 'system';

  // Check if user has enabled email for this category
  if (prefs[category] === false) return;
  // If prefs not set, use defaults: dispute, verification, premium = on; others = off
  if (prefs[category] === undefined) {
    const defaultOn = ['dispute', 'verification', 'premium'];
    if (!defaultOn.includes(category)) return;
  }

  // Get template
  const templateFn = emailTemplates[notification.type];
  if (!templateFn) {
    // Fallback generic email
    return sendEmail({
      to: user.email,
      subject: notification.title,
      title: notification.title,
      body: `<p>${notification.message || notification.title}</p>`,
      actionUrl: notification.actionUrl
    });
  }

  const template = templateFn(notification);
  return sendEmail({
    to: user.email,
    subject: template.subject,
    title: template.subject,
    body: template.body,
    actionUrl: template.actionUrl,
    actionLabel: template.actionLabel
  });
}
