const LOCALE_OF = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' };

export const fmt = (n, lang = 'ru') => new Intl.NumberFormat(LOCALE_OF[lang] || 'ru-RU').format(Number(n ?? 0));

export const money = (n, cur = 'UZS', lang = 'ru') => `${fmt(n, lang)} ${cur}`;

/** Format Uzbek phone numbers: +998901112233 → +998 90 111 22 33 */
export const formatPhone = (raw) => {
  if (!raw) return '—';
  const s = String(raw).replace(/\D/g, '');
  // Expect 998XXXXXXXXX (12 digits) or 90XXXXXXXX (9 digits, local)
  let m;
  if (s.startsWith('998') && s.length === 12) m = s.match(/^(\d{3})(\d{2})(\d{3})(\d{2})(\d{2})$/);
  else if (s.length === 9) m = `998${s}`.match(/^(\d{3})(\d{2})(\d{3})(\d{2})(\d{2})$/);
  if (m) return `+${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]}`;
  return raw;
};

export const dateShort = (iso, lang = 'ru') =>
  iso ? new Intl.DateTimeFormat(LOCALE_OF[lang] || 'ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—';

/* Ниже — статусы/роли как функции от `t` (react-i18next), а не статичные
   объекты: раньше это были захардкоженные русские подписи, единственный
   источник UI-текста для 38 файлов панели. ORG_STATUS(t)[value].label. */
export const ORG_STATUS = (t) => ({
  active: { label: t('status.active'), cls: 'badge-success' },
  trial: { label: t('status.trial'), cls: 'badge-warning' },
  frozen: { label: t('status.frozen'), cls: 'badge-error' },
});

export const USER_STATUS = (t) => ({
  active: { label: t('status.active'), cls: 'badge-success' },
  frozen: { label: t('status.frozen'), cls: 'badge-error' },
  dropped: { label: t('status.dropped'), cls: 'badge-ghost' },
});

export const ADMIN_STATUS = (t) => ({
  active: { label: t('status.active'), cls: 'badge-success' },
  frozen: { label: t('status.frozen'), cls: 'badge-error' },
});

export const ROLE_LABELS = (t) => ({
  ceo: t('role.ceo'),
  admin: t('role.admin'),
  branch_manager: t('role.branch_manager'),
  mentor: t('role.mentor'),
  methodist: t('role.methodist'),
});

export const LEAD_STATUS = (t) => ({
  new: { label: t('status.new'), cls: 'badge-info' },
  contacted: { label: t('status.contacted'), cls: 'badge-warning' },
  onboarded: { label: t('status.onboarded'), cls: 'badge-success' },
  rejected: { label: t('status.rejected'), cls: 'badge-error' },
});
