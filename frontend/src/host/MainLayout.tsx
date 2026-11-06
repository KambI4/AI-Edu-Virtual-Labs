/* Шапка автономного запуска — та же разметка, что у MainLayout AI edu (синяя полоса, навигация, язык, меню пользователя). */
import { useEffect, useRef, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, FlaskConical, LogOut } from 'lucide-react'
import type { User } from '../api'
import { LanguageSelect, useI18n } from '../i18n'

export function MainLayout({ user, onLogout, children }: { user: User; onLogout: () => void; children: ReactNode }) {
  const { t } = useI18n()
  const ref = useRef<HTMLDetailsElement>(null)
  const location = useLocation()
  useEffect(() => { if (ref.current) ref.current.open = false }, [location.pathname])
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.login
  return <div className="main-layout">
    <header className="main-header"><div className="main-header-inner">
      <Link to="/" className="brand" aria-label={t('AI Edu — на главную')}>AI<span>edu</span></Link>
      <nav className="main-nav" aria-label={t('Основная навигация')}>
        <NavLink to="/virtual-labs" className={({ isActive }) => `main-nav-link ${isActive ? 'active' : ''}`}><FlaskConical size={17}/>{t('Виртуальные лаборатории')}</NavLink>
      </nav>
      <LanguageSelect compact/>
      <details ref={ref} className="user-menu">
        <summary aria-label={t('Меню пользователя')}><span className="avatar">{name[0].toUpperCase()}</span><span className="user-menu-name">{user.role === 'ADMIN' ? t('Администратор') : name}</span><ChevronDown size={15}/></summary>
        <div className="user-menu-panel"><span className="user-menu-email" title={user.login}>{user.email || user.login}</span>
          <button type="button" onClick={onLogout}><LogOut size={16}/>{t('Выйти')}</button></div>
      </details>
    </div></header>
    <main className="main-content">{children}</main>
  </div>
}
