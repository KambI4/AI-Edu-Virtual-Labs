/* Учётные записи автономного запуска (в AI edu этим занимается её собственный src/api.ts). */
export type User = { id: number; login: string; first_name: string; last_name: string; email: string; role: 'STUDENT' | 'ADMIN'; lab_role: string }

function cookie(name: string) { return document.cookie.split('; ').find(x => x.startsWith(name + '='))?.split('=')[1] || '' }

export async function authApi<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
  if (method !== 'GET' && !cookie('csrftoken')) await fetch('/api/v1/csrf/', { credentials: 'include' })
  const res = await fetch('/api/v1/' + path, {
    method, credentials: 'include',
    headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...(method !== 'GET' ? { 'X-CSRFToken': decodeURIComponent(cookie('csrftoken')) } : {}) },
    body: data ? JSON.stringify(data) : undefined,
  })
  if (res.status === 204) return undefined as T
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = payload.error?.detail ?? payload.detail ?? payload
    const text = typeof detail === 'string' ? detail : Object.values(detail || {}).flat().join(' ')
    throw Object.assign(new Error(text || 'Ошибка запроса'), { status: res.status })
  }
  return payload as T
}
