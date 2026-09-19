import { useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { breadcrumb, useCeo } from '../lib/ceo.js';
import { trackEvent } from '../lib/analytics.js';
import { useLang, useT } from '../i18n/index.js';

// в dev — vite-прокси на :4000; в prod задаётся VITE_API_URL
const API_URL = import.meta.env.VITE_API_URL ?? '';

export default function Contacts() {
  const t = useT();
  const lang = useLang();
  const c = t.contacts;

  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState('');
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [selectedSize, setSelectedSize] = useState('');
  const [exactSize, setExactSize] = useState('');

  const jsonLd = useMemo(
    () => [
      breadcrumb(
        [
          { name: t.ceo.breadcrumbHome, path: '/landing' },
          { name: c.badge, path: '/landing/contacts' },
        ],
        lang,
      ),
    ],
    [t.ceo.breadcrumbHome, c.badge, lang],
  );

  useCeo({
    title: t.ceo.contacts.title,
    description: t.ceo.contacts.description,
    path: '/landing/contacts',
    jsonLd,
  });

  const onSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const lead = { name: form.get('name').trim(), phone: form.get('phone').trim() };
    const centerName = form.get('center').trim();
    const formSize = form.get('size');
    const centerSize = formSize === '1000+' && exactSize
      ? `1000+ (${exactSize})`
      : formSize;
    if (formSize === '1000+' && (!exactSize || Number(exactSize) < 1001)) {
      setShowSizeModal(true);
      return;
    }
    const message = form.get('msg').trim();
    if (centerName) lead.centerName = centerName;
    if (centerSize) lead.centerSize = centerSize;
    if (message) lead.message = message;

    setStatus('sending');
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
      if (!res.ok) {
        setError(res.status === 429 ? c.form.errorRate : c.form.errorGeneric);
        setStatus('error');
        return;
      }
      setStatus('sent');
      // GA4 conversion: mark this as a lead in Analytics (set as a key event in GA4).
      trackEvent('generate_lead', {
        method: 'landing_form',
        center_size: centerSize || undefined,
      });
    } catch {
      setError(c.form.errorNetwork);
      setStatus('error');
    }
  };

  return (
    <main className="contacts-page">
      <section className="contacts-hero">
        <div className="contacts-hero__glow" aria-hidden="true" />
        <div className="container contacts-hero__layout">
          <div className="contacts-hero__copy">
            <span className="badge badge--lime">{c.badge}</span>
            <h1>{c.h1}</h1>
            <p>{c.lead}</p>
            <div className="contacts-hero__promise">
              <span><Icon name="check" size={17} /></span>
              <div>
                <strong>{t.common.trial}</strong>
                <small>LEVELUP ACADEMY / 2026</small>
              </div>
            </div>
          </div>

          <div className="contacts-hero__visual" aria-hidden="true">
            <div className="contacts-hero__status">
              <span className="contacts-hero__status-dot" />
              <span>Команда на связи</span>
            </div>
            <div className="contacts-hero__metric">
              <strong>&lt; 15</strong>
              <span>минут — среднее время ответа</span>
            </div>
            <div className="contacts-hero__route">
              <span>Заявка</span><i />
              <span>Знакомство</span><i />
              <span>Запуск</span>
            </div>
          </div>
        </div>
      </section>

      <section className="contacts-main">
        <div className="container contacts-main__grid">
          <form className="contact-form contact-form--premium" onSubmit={onSubmit}>
            <div className="contact-form__head">
              <span>01</span>
              <div>
                <h2>{c.form.submit}</h2>
                <p>{c.lead}</p>
              </div>
            </div>

            <div className="contact-form__fields">
            <div className="contact-field">
              <label htmlFor="name"><span>01</span>{c.form.name}</label>
              <input id="name" name="name" placeholder={c.form.namePlaceholder} minLength={2} maxLength={120} required />
            </div>
            <div className="contact-field">
              <label htmlFor="phone"><span>02</span>{c.form.phone}</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+998 90 000 00 00"
                inputMode="tel"
                maxLength={32}
                pattern="[+0-9()\- ]{7,32}"
                required
              />
            </div>
            <div className="contact-field">
              <label htmlFor="center"><span>03</span>{c.form.center}</label>
              <input id="center" name="center" placeholder={c.form.centerPlaceholder} maxLength={160} />
            </div>
            <div className="contact-field">
              <label htmlFor="size"><span>04</span>{c.form.size}</label>
              <input type="hidden" name="size" value={selectedSize} />
              <button
                id="size"
                className={`size-picker-trigger${selectedSize ? ' is-selected' : ''}`}
                type="button"
                onClick={() => setShowSizePicker(true)}
              >
                <span>{selectedSize === '1000+' && exactSize
                  ? `${Number(exactSize).toLocaleString(lang === 'en' ? 'en-US' : 'ru-RU')} ${lang === 'uz' ? "o'quvchi" : lang === 'en' ? 'students' : 'учеников'}`
                  : selectedSize === '1000+'
                    ? (lang === 'uz' ? 'Aniq sonni kiriting' : lang === 'en' ? 'Enter the exact number' : 'Укажите точное количество')
                  : selectedSize
                    ? (c.form.sizeOptions.find((opt) => (opt.value ?? opt) === selectedSize)?.label ?? selectedSize)
                    : c.form.sizePlaceholder}</span>
                <span className="size-picker-trigger__chevron" aria-hidden="true" />
              </button>
            </div>
            <div className="contact-field contact-field--wide">
              <label htmlFor="msg"><span>05</span>{c.form.message}</label>
              <textarea id="msg" name="msg" placeholder={c.form.messagePlaceholder} maxLength={2000} />
            </div>
            </div>
            {status === 'sent' ? (
              <div className="form-success">{c.form.success}</div>
            ) : (
              <>
                {error && <div className="form-error">{error}</div>}
                <button
                  type="submit"
                  className="btn btn--dark btn--lg contact-form__submit"
                  disabled={status === 'sending'}
                >
                  {status === 'sending' ? c.form.sending : c.form.submit}
                </button>
              </>
            )}
            <p className="form-note">{c.form.note}</p>
          </form>

          <aside className="contact-aside">
            <div className="contact-aside__head">
              <span>02</span>
              <h2>{c.badge}</h2>
            </div>
            {c.info.map((item, index) => (
              <article className="contact-method" key={item.title}>
                <div className="contact-method__icon"><Icon name={item.icon} size={20} /></div>
                <div>
                  <span>0{index + 1}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </aside>
        </div>
      </section>

      {showSizeModal && (
        <div className="size-modal" role="dialog" aria-modal="true" aria-labelledby="size-modal-title">
          <button className="size-modal__backdrop" type="button" aria-label="Закрыть" onClick={() => setShowSizeModal(false)} />
          <div className="size-modal__card">
            <button className="size-modal__close" type="button" aria-label="Закрыть" onClick={() => setShowSizeModal(false)}>×</button>
            <span className="size-modal__eyebrow">ENTERPRISE</span>
            <h2 id="size-modal-title">Сколько учеников в вашем центре?</h2>
            <p>Укажите примерное количество — мы подготовим подходящее предложение для вашей сети.</p>
            <label htmlFor="exact-size">Количество учеников</label>
            <input
              id="exact-size"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={9}
              value={exactSize}
              onChange={(event) => setExactSize(event.target.value.replace(/\D/g, ''))}
              placeholder="Например, 1500"
              autoFocus
            />
            <button
              className="btn btn--lg size-modal__confirm"
              type="button"
              disabled={!exactSize || Number(exactSize) < 1001}
              onClick={() => setShowSizeModal(false)}
            >
              Подтвердить количество
            </button>
          </div>
        </div>
      )}

      {showSizePicker && (
        <div className="size-modal size-picker-modal" role="dialog" aria-modal="true" aria-labelledby="size-picker-title">
          <button className="size-modal__backdrop" type="button" aria-label="Закрыть" onClick={() => setShowSizePicker(false)} />
          <div className="size-modal__card size-picker-modal__card">
            <button className="size-modal__close" type="button" aria-label="Закрыть" onClick={() => setShowSizePicker(false)}>×</button>
            <span className="size-modal__eyebrow">РАЗМЕР ЦЕНТРА</span>
            <h2 id="size-picker-title">Выберите количество учеников</h2>
            <p>Это поможет нам подобрать подходящий сценарий внедрения.</p>
            <div className="size-picker-modal__options">
              {c.form.sizeOptions.map((opt, index) => {
                const value = opt.value ?? opt;
                const label = opt.label ?? opt;
                return (
                  <button
                    type="button"
                    className={selectedSize === value ? 'is-active' : ''}
                    key={value}
                    onClick={() => {
                      setSelectedSize(value);
                      setShowSizePicker(false);
                      if (value === '1000+') setShowSizeModal(true);
                    }}
                  >
                    <span>0{index + 1}</span><strong>{label}</strong><i>→</i>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
