import { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';

const FLAGS = { uz: '🇺🇿', ru: '🇷🇺', en: '🇬🇧' };

export default function LanguageSwitcher() {
  const { lang, setLanguage, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const LANGUAGES = [
    { code: 'uz', label: "O'zbekcha", flag: FLAGS.uz, short: 'UZ' },
    { code: 'ru', label: 'Русский', flag: FLAGS.ru, short: 'RU' },
    { code: 'en', label: 'English', flag: FLAGS.en, short: 'EN' },
  ];

  const currentLang = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  const changeLanguage = (code) => {
    setLanguage(code);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-base-200 bg-base-100 hover:bg-base-200/60 text-base-content text-xs font-semibold transition-all shadow-sm active:scale-95"
        aria-expanded={open}
        aria-label={t.langSwitch.label}
      >
        <span className="text-sm">{currentLang.flag}</span>
        <span className="tracking-wide uppercase font-bold text-[11px] text-base-content/70">
          {currentLang.short}
        </span>
        <ChevronDown
          size={13}
          className={`text-base-content/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-40 rounded-xl overflow-hidden shadow-xl border border-base-200 bg-base-100 p-1 z-50 animate-scale-in">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-base-content/40 border-b border-base-200 mb-1 flex items-center gap-1.5">
            <Globe size={11} />
            <span>{t.langSwitch.label}</span>
          </div>
          <div className="space-y-0.5">
            {LANGUAGES.map((item) => {
              const active = currentLang.code === item.code;
              return (
                <button
                  key={item.code}
                  onClick={() => changeLanguage(item.code)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    active
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">{item.flag}</span>
                    <span>{item.label}</span>
                  </span>
                  {active && <Check size={14} className="text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}