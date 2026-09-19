import { useState } from 'react';
import PhoneInput from './PhoneInput.jsx';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Copy, Check, AlertTriangle, Building2, User } from 'lucide-react';

function splitName(full = '') {
  const parts = full.trim().split(/\s+/);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '' };
}

export default function OnboardModal({ lead, onClose, onDone }) {
  const { token } = useAuth();
  const pre = lead ? splitName(lead.name) : { firstName: '', lastName: '' };

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    organizationName: lead?.centerName || '',
    domain: '',
    firstName: pre.firstName,
    lastName: pre.lastName,
    email: '',
    phone: lead?.phone?.replace(/[^\d+]/g, '') || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [copied, setCopied] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const goNext = (e) => {
    e.preventDefault();
    if (!form.organizationName.trim()) return;
    setStep(2);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const body = {
        organizationName: form.organizationName.trim(),
        admin: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
        },
      };
      if (form.domain.trim()) body.domain = form.domain.trim();
      if (form.phone.trim()) body.admin.phone = form.phone.trim();
      if (lead?.id) body.leadId = lead.id;
      const res = await api.onboardPartner(token, body);
      setDone(res);
    } catch (err) {
      if (err.status === 409) setError('Домен или email уже заняты — проверьте данные');
      else if (err.status === 422) setError('Проверьте поля: домен вида name.uz, email корректный');
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const copyPassword = () => {
    navigator.clipboard?.writeText(done?.tempPassword || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        {done ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-success/20 grid place-items-center">
                <Check size={24} className="text-success" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-success">Партнёр создан!</h3>
                <p className="text-sm text-base-content/60">Организация и CEO заведены</p>
              </div>
            </div>

            <div className="bg-warning/10 border border-warning/30 rounded-md p-4">
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-warning">Сохраните пароль — показывается только один раз!</p>
              </div>
              <div className="bg-base-100 rounded-md p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-base-content/55 w-20 shrink-0">Организация:</span>
                  <span className="font-semibold">{done.organization?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-base-content/55 w-20 shrink-0">Логин:</span>
                  <span className="font-semibold">{done.ceo?.email}</span>
                </div>
                <div className="border-t border-base-200 pt-2 mt-2">
                  <div className="text-xs text-base-content/50 mb-1.5 font-semibold uppercase tracking-wider">Временный пароль</div>
                  <div className="flex items-center gap-2">
                    <code className="font-mono font-bold text-xl tracking-widest bg-base-200 px-3 py-2 rounded-md flex-1 text-center">
                      {done.tempPassword}
                    </code>
                    <button
                      className={`btn btn-sm ${copied ? 'btn-success' : 'btn-outline'} gap-1.5`}
                      onClick={copyPassword}
                    >
                      {copied ? <><Check size={14} /> Скопировано</> : <><Copy size={14} /> Копировать</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-action">
              <button className="btn bg-lime-400 hover:bg-lime-500 border-0 text-lime-950 w-full" onClick={() => onDone?.()}>
                Готово
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5">
              <h3 className="font-bold text-lg flex-1">
                Онбординг партнёра
                {lead && <span className="text-sm font-normal opacity-60 ml-2">из заявки</span>}
              </h3>
              <div className="flex items-center gap-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= 1 ? 'bg-lime-400 text-lime-950' : 'bg-base-200 text-base-content/40'}`}>
                  1
                </div>
                <div className={`w-8 h-0.5 rounded transition-colors ${step >= 2 ? 'bg-lime-400' : 'bg-base-200'}`} />
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= 2 ? 'bg-lime-400 text-lime-950' : 'bg-base-200 text-base-content/40'}`}>
                  2
                </div>
              </div>
            </div>

            {error && <div className="alert alert-error text-sm py-2 mb-3"><span>{error}</span></div>}

            {step === 1 ? (
              <form onSubmit={goNext} className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 size={15} className="text-lime-600" />
                  <span className="font-semibold text-sm">Данные учебного центра</span>
                </div>
                <label className="form-control">
                  <span className="label-text mb-1">Название центра *</span>
                  <input
                    className="input input-bordered"
                    required
                    value={form.organizationName}
                    onChange={set('organizationName')}
                    placeholder="LevelUp Academy"
                    autoFocus
                  />
                </label>
                <label className="form-control">
                  <span className="label-text mb-1">Домен <span className="opacity-50">(необязательно)</span></span>
                  <input
                    className="input input-bordered"
                    value={form.domain}
                    onChange={set('domain')}
                    placeholder="levelup-academy.uz"
                  />
                  <span className="text-xs text-base-content/45 mt-1">Без https://, например: levelup-academy.uz</span>
                </label>
                <div className="modal-action mt-6">
                  <button type="button" className="btn btn-ghost" onClick={onClose}>Отмена</button>
                  <button type="submit" className="btn bg-lime-400 hover:bg-lime-500 border-0 text-lime-950">
                    Далее →
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <User size={15} className="text-lime-600" />
                    <span className="font-semibold text-sm">Аккаунт CEO</span>
                  </div>
                  <span className="text-xs text-base-content/50 bg-base-200 px-2 py-1 rounded-md">{form.organizationName}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="form-control">
                    <span className="label-text mb-1">Имя *</span>
                    <input
                      className="input input-bordered"
                      required
                      value={form.firstName}
                      onChange={set('firstName')}
                      placeholder="Азиз"
                      autoFocus
                    />
                  </label>
                  <label className="form-control">
                    <span className="label-text mb-1">Фамилия *</span>
                    <input
                      className="input input-bordered"
                      required
                      value={form.lastName}
                      onChange={set('lastName')}
                      placeholder="Каримов"
                    />
                  </label>
                </div>
                <label className="form-control">
                  <span className="label-text mb-1">Email (логин) *</span>
                  <input
                    type="email"
                    className="input input-bordered"
                    required
                    value={form.email}
                    onChange={set('email')}
                    placeholder="owner@levelup-academy.uz"
                  />
                </label>
                <label className="form-control">
                  <span className="label-text mb-1">Телефон <span className="opacity-50">(необязательно)</span></span>
                  <PhoneInput
                    className="input input-bordered"
                    value={form.phone}
                    onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                  />
                </label>
                <div className="modal-action mt-6">
                  <button type="button" className="btn btn-ghost" onClick={() => { setStep(1); setError(''); }}>
                    ← Назад
                  </button>
                  <button type="submit" className="btn bg-lime-400 hover:bg-lime-500 border-0 text-lime-950" disabled={busy}>
                    {busy ? <span className="loading loading-spinner loading-sm" /> : 'Создать партнёра'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
      <label className="modal-backdrop" onClick={!done ? onClose : undefined} />
    </div>
  );
}
