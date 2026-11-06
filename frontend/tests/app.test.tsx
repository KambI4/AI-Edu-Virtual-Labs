/* Модуль целиком в окружении платформы: маршрутизатор, I18nProvider и API Django заменены заглушками.
   Проверяется то, что делает интегратор: <Route path="/virtual-labs/*" element={<VirtualLabsApp/>}/>. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { I18nProvider } from '../src/i18n'
import { VirtualLabsApp } from '../src/virtual-labs'
import { Registry } from '../src/virtual-labs/core/registry'
import '../src/virtual-labs/core/works'

const codes = Registry.list().map(m => m.id)
const config = {
  user: { id: 1, login: 'aigerim', name: 'Айгерим Серикова', firstName: 'Айгерим', role: 'teacher' },
  courses: [{ id: 1, title: 'Учебные материалы', description: '', works: codes }],
  enabledWorks: codes, templates: {},
  criteria: [{ key: 'structure', name: 'Структура', weight: 1, isActive: true }],
  ai: { configured: false, kind: 'demo', name: 'Демо-режим', model: '' },
  tts: { configured: false, kind: 'browser', name: 'Браузер', model: '' },
  features: { manageAccounts: true, maxUploadBytes: 20971520, uploadExtensions: ['docx', 'pdf'] },
}
const state = { version: 1, profile: { fio: 'Серикова Айгерим', discipline: 'Педагогика' }, settings: {}, sessions: {}, portfolio: [] }
const responses: Record<string, unknown> = {
  'config/': config, 'state/': state, 'next/': { id: 'vw13', reason: 'Начните с Промпт-лаборатории: это базовый навык для всех остальных работ.' },
  'assignments/': [], 'groups/': [], 'reviews/': [],
}

function renderApp(path = '/virtual-labs') {
  return render(<I18nProvider><MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/virtual-labs/*" element={<VirtualLabsApp/>}/>
  </Routes></MemoryRouter></I18nProvider>)
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const key = String(url).replace('/api/v1/virtual-labs/', '')
    const body = responses[key]
    return new Response(JSON.stringify(body ?? { detail: 'нет заглушки' }), { status: body === undefined ? 404 : 200, headers: { 'Content-Type': 'application/json' } })
  }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear() })

describe('VirtualLabsApp', () => {
  it('показывает каталог из 14 работ и рекомендацию', async () => {
    renderApp()
    expect(await screen.findByText('Здравствуйте, Айгерим!')).toBeTruthy()
    expect(screen.getByText('Виртуальная мастерская генерации лекции')).toBeTruthy()
    expect(screen.getAllByText(/Виртуальная работа № \d+/)).toHaveLength(14)
    await waitFor(() => expect(screen.getByText('Начните с Промпт-лаборатории: это базовый навык для всех остальных работ.')).toBeTruthy())
  })

  it('переключается на казахский язык вместе с платформой', async () => {
    localStorage.setItem('ai-edu-locale', 'kz')
    renderApp()
    expect(await screen.findByText('Сәлеметсіз бе, Айгерим!')).toBeTruthy()
    expect(screen.getByText('Дәріс құрастырудың виртуалды шеберханасы')).toBeTruthy()
  })

  it('открывает работу и ведёт по шагам', async () => {
    localStorage.setItem('ai-edu-locale', 'en')
    renderApp('/virtual-labs/lab/vw01')
    expect(await screen.findByText('Virtual lecture generation workshop')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Start: input data/ }))
    expect(await screen.findByLabelText(/^Topic/)).toBeTruthy()
  })

  it('скрывает панели тьютора и администратора от слушателя', async () => {
    renderApp('/virtual-labs/admin')
    expect(await screen.findByText('Здравствуйте, Айгерим!')).toBeTruthy()
    expect(screen.queryByText('Администрирование')).toBeNull()
    expect(screen.queryByText('Тьютор')).toBeNull()
  })
})
