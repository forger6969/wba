import { useMemo, useState } from 'react';
import { Search, Users, WalletCards, AlertTriangle, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/PageHeader.jsx';
import { usePeopleDirectory } from '../../queries.js';
import { useAuth } from '../../auth.jsx';

const ROLE_KEYS = ['', 'ceo', 'branch_manager', 'admin', 'finance_manager', 'methodist', 'mentor', 'parent', 'student'];

const LOCALE_OF = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' };
const money = (value, lang) => `${new Intl.NumberFormat(LOCALE_OF[lang] || 'ru-RU').format(Number(value || 0))} UZS`;
const fullName = (person) => `${person.first_name || ''} ${person.last_name || ''}`.trim();

function Summary({ people, canSeeFinance, t, lang }) {
  const students = people.filter((p) => p.role === 'student');
  const debt = students.reduce((sum, p) => sum + Number(p.invoice_debt || 0), 0);
  const overdue = students.reduce((sum, p) => sum + Number(p.overdue || 0), 0);
  const cards = [
    [t('people.inSelection'), people.length, Users],
    [t('people.students'), students.length, Building2],
    ...(canSeeFinance ? [[t('people.debt'), money(debt, lang), WalletCards], [t('people.overdue'), money(overdue, lang), AlertTriangle]] : []),
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value, Icon]) => (
        <div key={label} className="card bg-base-100 border border-base-200/60 shadow-sm">
          <div className="card-body p-4 flex-row items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/20 text-primary-content"><Icon size={18} /></span>
            <div><div className="text-[11px] font-bold uppercase tracking-wide text-base-content/50">{label}</div><div className="text-xl font-extrabold tabular-nums">{value}</div></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Directory() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { user } = useAuth();
  // Ментору /users/directory отдаёт только его самого и его учеников (см.
  // mentorId-скоуп в users.repository.js:findDirectory) — все остальные роли
  // фильтра всегда дают пустой список, сам выбор для ментора не нужен.
  const showRoleFilter = user?.role !== 'mentor';
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const query = useMemo(() => {
    const qs = new URLSearchParams({ limit: '100' });
    if (search.trim()) qs.set('search', search.trim());
    if (role) qs.set('role', role);
    return qs.toString();
  }, [search, role]);
  const { data, isLoading, error } = usePeopleDirectory(query);
  const people = data?.data || [];
  const canSeeFinance = Boolean(data?.meta?.canSeeFinance);

  return (
    <div className="space-y-5">
      <PageHeader title={t('people.title')} subtitle={t('people.subtitle')} />
      <Summary people={people} canSeeFinance={canSeeFinance} t={t} lang={lang} />

      <section className="card bg-base-100 border border-base-200/60 shadow-sm">
        <div className="card-body p-4 sm:p-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="input input-bordered flex flex-1 items-center gap-2">
              <Search size={17} className="opacity-50" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} className="grow" placeholder={t('people.searchPlaceholder')} />
            </label>
            {showRoleFilter && (
              <select className="select select-bordered sm:w-56" value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLE_KEYS.map((value) => <option key={value} value={value}>{value ? t(`role.${value}`) : t('people.allRoles')}</option>)}
              </select>
            )}
          </div>

          {isLoading && <div className="py-12 text-center text-base-content/50">{t('people.loading')}</div>}
          {error && <div className="alert alert-error">{error.message || t('people.loadError')}</div>}
          {!isLoading && !error && people.length === 0 && <div className="py-12 text-center text-base-content/50">{t('people.emptyFilter')}</div>}

          {people.length > 0 && (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead><tr><th>{t('people.person')}</th><th>{t('people.role')}</th><th>{t('people.branch')}</th><th>{t('people.status')}</th>{canSeeFinance && <><th className="text-right">{t('people.paid')}</th><th className="text-right">{t('people.debt')}</th></>}</tr></thead>
                <tbody>{people.map((person) => (
                  <tr key={person.id} className="hover">
                    <td><div className="font-semibold">{fullName(person)}</div><div className="text-xs text-base-content/50">{person.phone || person.email || t('people.noContact')}</div></td>
                    <td><span className="badge badge-ghost badge-sm">{t(`role.${person.role}`, person.role)}</span>{person.children_count > 0 && <div className="mt-1 text-xs text-base-content/50">{t('people.childrenCount', { count: person.children_count })}</div>}</td>
                    <td>{person.branch_name || person.organization_name || t('people.platform')}</td>
                    <td><span className={`badge badge-sm ${person.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{t(`status.${person.status}`, person.status)}</span></td>
                    {canSeeFinance && <><td className="text-right tabular-nums">{person.role === 'student' ? money(person.paid, lang) : '—'}</td><td className={`text-right font-semibold tabular-nums ${Number(person.overdue) > 0 ? 'text-error' : ''}`}>{person.role === 'student' ? money(person.invoice_debt, lang) : '—'}</td></>}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
