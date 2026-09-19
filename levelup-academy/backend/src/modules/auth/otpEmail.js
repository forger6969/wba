/**
 * HTML-шаблон письма с OTP-кодом (сброс пароля).
 * Эстетика продукта: тёмный графит-хедер #1D2417 (как сайдбар), лайм #C6FF34 точечно,
 * светлая карточка с фирменной тенью. Один системный шрифт, без эмодзи.
 *
 * Логотип — РЕАЛЬНЫЙ, белый на графите (src/assets/logo-email-dark.png), вшивается
 * inline по CID (`cid:levelup-logo`). Вёрстка — таблицы + inline-стили (стандарт email).
 */
// Логотип — по публичной HTTPS-ссылке (Gmail-веб надёжно показывает внешние
// картинки, а inline-CID у него рендерится нестабильно). Позже, со своим доменом,
// заменить на logo на своём CDN.
const LOGO_URL = 'https://files.catbox.moe/oi81xn.png';

// один шрифтовой стек на всё письмо — простой и системный
const FONT = "-apple-system,'Segoe UI',Roboto,Arial,sans-serif";

const C = {
  lime: '#C6FF34',
  ink: '#1D2417',
  bg: '#F6FBEA',
  codeBg: '#F3F8E8',
  surface: '#FFFFFF',
  text: '#1D2417',
  muted: '#5E6E52',
  border: '#E6EDD8',
};

export function buildOtpEmail(otp, minutes = 3) {
  const subject = 'Код для сброса пароля — LevelUp Academy';
  const year = new Date().getFullYear();

  const text =
    `LevelUp Academy\n\nКод для сброса пароля: ${otp}\n` +
    `Действует ${minutes} мин. Никому не сообщайте код.\n` +
    `Если вы не запрашивали сброс — проигнорируйте это письмо.\n\n` +
    `LevelUp Academy — CRM для учебных центров: ученики, группы, посещаемость, платежи и аналитика в одном месте.\n\n` +
    `Это автоматическое письмо, отвечать на него не нужно.\n© ${year} LevelUp Academy`;

  const MONO = "'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace";

  const html = `<!-- preheader --><div style="display:none;max-height:0;overflow:hidden;opacity:0;">Код для входа: ${otp} · действует ${minutes} мин.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg};margin:0;padding:0;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:${C.surface};border-radius:18px;overflow:hidden;border:1px solid ${C.border};box-shadow:0 6px 20px rgba(29,36,23,.08);">

        <!-- header -->
        <tr>
          <td style="background:${C.ink};padding:20px 40px;">
            <img src="${LOGO_URL}" width="156" alt="LevelUp Academy" height="27"
                 style="display:block;width:156px;max-width:50%;height:auto;border:0;color:#FFFFFF;font-family:${FONT};font-size:17px;font-weight:700;letter-spacing:-.3px;line-height:27px;" />
          </td>
        </tr>
        <tr><td style="height:3px;background:${C.lime};font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- body -->
        <tr>
          <td style="padding:34px 40px 24px;">
            <div style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#8AA06B;margin-bottom:10px;">
              Безопасность аккаунта
            </div>
            <h1 style="margin:0 0 10px;font-family:${FONT};font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-.5px;color:${C.text};">
              Сброс пароля
            </h1>
            <p style="margin:0 0 24px;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.muted};">
              Вы запросили смену пароля в LevelUp Academy. Введите код подтверждения ниже, чтобы задать новый пароль.
            </p>

            <!-- code -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="background:${C.codeBg};border:1px solid ${C.border};border-radius:14px;padding:22px 16px 18px;">
                  <div style="font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:${C.muted};margin-bottom:10px;">Код подтверждения</div>
                  <div style="font-family:${MONO};font-size:38px;line-height:1;font-weight:700;letter-spacing:12px;color:${C.text};padding-left:12px;">${otp}</div>
                  <div style="margin-top:12px;font-family:${FONT};font-size:12px;line-height:1;color:${C.muted};">Действует ${minutes} мин.</div>
                </td>
              </tr>
            </table>

            <p style="margin:20px 0 0;font-family:${FONT};font-size:13px;line-height:1.6;color:${C.muted};">
              Никому не сообщайте этот код — сотрудники LevelUp Academy никогда его не запрашивают.
              Если вы не запрашивали смену пароля, просто проигнорируйте письмо — пароль останется прежним.
            </p>
          </td>
        </tr>

        <!-- о продукте -->
        <tr>
          <td style="padding:0 40px 4px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="4" style="background:${C.lime};border-radius:4px 0 0 4px;font-size:0;line-height:0;">&nbsp;</td>
                <td style="background:#FBFDF5;border:1px solid ${C.border};border-left:0;border-radius:0 12px 12px 0;padding:16px 18px;">
                  <div style="font-family:${FONT};font-size:13px;font-weight:700;color:${C.text};margin-bottom:5px;">LevelUp Academy — CRM для учебных центров</div>
                  <div style="font-family:${FONT};font-size:13px;line-height:1.6;color:${C.muted};">
                    Ученики, группы, посещаемость, платежи и аналитика — в одном месте. Автоматизируем рутину, чтобы центр рос быстрее.
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- footer -->
        <tr>
          <td style="padding:18px 40px 26px;">
            <div style="border-top:1px solid ${C.border};padding-top:16px;font-family:${FONT};font-size:11px;line-height:1.6;color:#9AA88A;">
              Это автоматическое письмо — отвечать на него не нужно.<br/>
              © ${year} LevelUp Academy · CRM для учебных центров
            </div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>`;

  return { subject, text, html, attachments: [] };
}
