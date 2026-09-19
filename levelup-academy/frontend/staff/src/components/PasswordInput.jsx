import { forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Поле пароля с возможностью посмотреть введённое.
 *
 * Без этого человек набирает вслепую и узнаёт об опечатке только по отказу
 * входа — особенно больно при выдаче временного пароля сотруднику, где ошибку
 * потом ищут вдвоём.
 *
 * `forwardRef` обязателен: поля подключаются через react-hook-form
 * (`{...register('password')}`), а он передаёт ref именно на input.
 */
const PasswordInput = forwardRef(function PasswordInput({ className = '', ...rest }, ref) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative w-full">
      <input
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={`${className} pr-10`}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // tabIndex -1: кнопка не должна вставать между полем и следующим полем
        // при переходе по Tab
        tabIndex={-1}
        aria-label={visible ? t('components.passwordInput.hide') : t('components.passwordInput.show')}
        title={visible ? t('components.passwordInput.hide') : t('components.passwordInput.show')}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg
                   text-base-content/40 hover:text-base-content/70 hover:bg-base-200
                   transition-colors"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
});

export default PasswordInput;
