import nodemailer from 'nodemailer';

let cachedTransporter = null;

// Transporter Nodemailer berbasis SMTP generik — cocok dipakai dengan
// Gmail (pakai App Password, BUKAN password akun biasa), atau provider
// SMTP lain seperti Mailtrap/SendGrid/Zoho, tinggal ganti env var-nya.
const getTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.warn(
      '[EMAIL] Konfigurasi SMTP tidak lengkap — email tidak akan benar-benar terkirim (mode dev, hanya tampil di log).',
    );
    return null;
  }

  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true' || Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return cachedTransporter;
};

const sendPasswordResetEmail = async (toEmail, toName, resetLink) => {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || `Nawasena Dara <${process.env.SMTP_USER}>`;

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Reset Password Nawasena Dara</title>
</head>
<body style="margin:0;padding:0;background:#f4f1fa;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table width="100%" style="max-width:480px;" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-size:22px;font-weight:800;color:#6b3fa0;letter-spacing:-0.5px;">Nawasena Dara</span>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e3d9f5;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="background:#6b3fa0;padding:28px 32px;text-align:center;">
                    <p style="margin:0 0 4px;color:rgba(255,255,255,0.65);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Keamanan Akun</p>
                    <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Reset Password</h1>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="padding:32px;">
                    <p style="margin:0 0 8px;color:#241b33;font-size:15px;font-weight:600;">Hai, ${toName || 'Pengguna'}!</p>
                    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.7;">
                      Kami menerima permintaan untuk mereset password akun <strong style="color:#6b3fa0;">Nawasena Dara</strong> kamu. Klik tombol di bawah untuk melanjutkan.
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
                      <tr>
                        <td style="background:#f3ecfb;border-radius:8px;padding:12px 16px;">
                          <p style="margin:0;color:#6b3fa0;font-size:13px;line-height:1.6;">
                            Link ini hanya berlaku selama <strong>1 jam</strong> dan hanya bisa dipakai sekali.
                          </p>
                        </td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td align="center" style="padding-bottom:24px;">
                          <a href="${resetLink}" style="display:inline-block;background:#6b3fa0;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:13px 32px;border-radius:10px;">
                            Reset Password Saya
                          </a>
                        </td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="background:#f4f1fa;border-radius:8px;padding:12px 16px;">
                          <p style="margin:0 0 6px;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Atau salin tautan ini ke browser kamu:</p>
                          <a href="${resetLink}" style="color:#6b3fa0;font-size:12px;word-break:break-all;text-decoration:none;">${resetLink}</a>
                        </td>
                      </tr>
                    </table>
                    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 20px;">
                    <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.7;">
                      Kalau kamu tidak meminta reset password, abaikan saja email ini — akun kamu tetap aman.
                    </p>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="background:#f4f1fa;border-top:1px solid #e3d9f5;padding:16px 32px;text-align:center;">
                    <p style="margin:0;color:#9ca3af;font-size:11px;">© 2026 Nawasena Dara</p>
                    <p style="margin:4px 0 0;color:#c3aee0;font-size:11px;">Narrative-driven learning game untuk edukasi & pencegahan kekerasan pada remaja putri</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `
Hai, ${toName || 'Pengguna'}!

Kami menerima permintaan reset password untuk akun Nawasena Dara kamu.

Klik tautan berikut untuk mereset password (berlaku 1 jam):
${resetLink}

Kalau kamu tidak meminta reset password, abaikan email ini. Akun kamu tetap aman.

— Tim Nawasena Dara
`.trim();

  if (!transporter) {
    console.log('\n─── [DEV] PASSWORD RESET EMAIL ───────────────────');
    console.log(`To      : ${toEmail}`);
    console.log(`Name    : ${toName}`);
    console.log(`Reset   : ${resetLink}`);
    console.log('───────────────────────────────────────────────────\n');
    return;
  }

  const info = await transporter.sendMail({
    from,
    to: toEmail,
    subject: 'Reset Password Nawasena Dara',
    text,
    html,
  });

  console.log(`[EMAIL] Email terkirim ke ${toEmail}, id: ${info.messageId}`);
};

export { sendPasswordResetEmail };
