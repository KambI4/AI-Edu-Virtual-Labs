/* Вход и регистрация автономного запуска — разметка и стили страницы входа AI edu. В AI edu не переносится. */
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { FlaskConical, LogIn, UserPlus } from 'lucide-react'
import { authApi, type User } from '../api'
import { LanguageTabs, useI18n } from '../i18n'

export function AuthPage({ mode, onDone }: { mode: 'login' | 'register'; onDone: (user: User) => void }) {
  const { t } = useI18n()
  const [form, setForm] = useState({ login: '', password: '', password2: '', first_name: '', last_name: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm({ ...form, [key]: event.target.value })
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (mode === 'register' && form.password !== form.password2) { setError(t('Пароли не совпадают')); return }
    setBusy(true)
    try {
      const body = mode === 'register' ? { login: form.login, password: form.password, first_name: form.first_name, last_name: form.last_name }
        : { login: form.login, password: form.password }
      onDone(await authApi<User>(`auth/${mode}/`, 'POST', body))
    } catch (e) { setError(t((e as Error).message)) } finally { setBusy(false) }
  }
  return <div className="auth-page">
    <div className="auth-language"><LanguageTabs/></div>
    <div className="auth-side">
      <Link to="/" className="auth-brand" aria-label="AI Edu"><span className="atlas-brand-mark" aria-hidden="true">AI</span><span>{t('Виртуальные лаборатории')}</span></Link>
      <div className="auth-product-copy">
        <p className="eyebrow">{t('Траектория 2 · педагоги не IT-специальностей')}</p>
        <h1>AI Edu<span aria-hidden="true"> /</span></h1>
        <p>{t('Четырнадцать виртуальных работ: от промпта до готового учебного материала с AI-экспертизой, портфолио и аналитикой.')}</p>
      </div>
      <small>© AI Edu · {t('Образовательная платформа')}</small>
    </div>
    <div className="auth-form-wrap">
      <form className={`auth-form card ${mode === 'register' ? 'auth-form-register' : ''}`} onSubmit={submit} noValidate>
        <nav className="auth-mode" aria-label={t('Режим входа')}>
          <Link to="/login" aria-current={mode === 'login' ? 'page' : undefined}>{t('Войти')}</Link>
          <Link to="/register" aria-current={mode === 'register' ? 'page' : undefined}>{t('Создать аккаунт')}</Link>
        </nav>
        <h2>{mode === 'login' ? t('Продолжить обучение') : t('Новый участник')}</h2>
        <p>{mode === 'login' ? t('Введите данные учетной записи') : t('Первый зарегистрированный пользователь становится администратором.')}</p>
        {mode === 'register' && <div className="row">
          <label>{t('Имя')}<input className="input" value={form.first_name} onChange={set('first_name')} placeholder={t('Имя')} autoComplete="given-name"/></label>
          <label>{t('Фамилия')}<input className="input" value={form.last_name} onChange={set('last_name')} placeholder={t('Фамилия')} autoComplete="family-name"/></label>
        </div>}
        <label>{t('Логин')}<input className="input" value={form.login} onChange={set('login')} autoComplete="username" required autoFocus/></label>
        <label>{t('Пароль')}<input className="input" type="password" value={form.password} onChange={set('password')} required
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={t(mode === 'register' ? 'Минимум 8 символов' : 'Введите пароль')}/></label>
        {mode === 'register' && <label>{t('Повторите пароль')}<input className="input" type="password" value={form.password2} onChange={set('password2')} autoComplete="new-password" required/></label>}
        {error && <p className="field-error" role="alert">{error}</p>}
        <button className="button primary wide" type="submit" disabled={busy || !form.login || !form.password}>
          {mode === 'login' ? <LogIn size={17}/> : <UserPlus size={17}/>}{t(mode === 'login' ? 'Войти' : 'Создать аккаунт')}</button>
        <p className="auth-switch"><FlaskConical size={14} className="inline"/> {t('Пароль хранится на сервере только в виде хеша PBKDF2-SHA256.')}</p>
      </form>
    </div>
  </div>
}
