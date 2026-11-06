/* Автономный запуск: вход, шапка AI edu и модуль «Виртуальные лаборатории» по адресу #/virtual-labs.
   В AI edu переносится только папка src/virtual-labs (см. INTEGRATION.md). */
import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { authApi, type User } from './api'
import { AuthPage } from './host/AuthPage'
import { MainLayout } from './host/MainLayout'
import { VirtualLabsApp } from './virtual-labs'
import { useI18n } from './i18n'

export default function App() {
  const { t } = useI18n()
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const navigate = useNavigate()
  useEffect(() => { authApi<User>('auth/me/').then(setUser, () => setUser(null)) }, [])
  const logout = async () => { await authApi('auth/logout/', 'POST').catch(() => undefined); setUser(null); navigate('/login') }
  const done = (u: User) => { setUser(u); navigate('/virtual-labs', { replace: true }) }
  if (user === undefined) return <div className="loading-section" role="status"><div className="loading-section-content"><span>{t('Загрузка…')}</span></div></div>
  return <Routes>
    <Route path="/login" element={user ? <Navigate to="/virtual-labs" replace/> : <AuthPage key="login" mode="login" onDone={done}/>}/>
    <Route path="/register" element={user ? <Navigate to="/virtual-labs" replace/> : <AuthPage key="register" mode="register" onDone={done}/>}/>
    <Route path="/virtual-labs/*" element={user ? <MainLayout user={user} onLogout={logout}><VirtualLabsApp/></MainLayout> : <Navigate to="/login" replace/>}/>
    <Route path="*" element={<Navigate to={user ? '/virtual-labs' : '/login'} replace/>}/>
  </Routes>
}
