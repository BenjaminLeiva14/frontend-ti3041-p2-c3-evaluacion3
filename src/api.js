const API_URL = (import.meta.env.VITE_API_URL || 'https://ti3041-p2-c3-2026p-evaluacion3.vercel.app/api').replace(/\/+$/, '')
const ACCESS_KEY = 'visita_access_token'
const REFRESH_KEY = 'visita_refresh_token'

export const authStore = {
  get access() { return localStorage.getItem(ACCESS_KEY) },
  get refresh() { return localStorage.getItem(REFRESH_KEY) },
  save(tokens) {
    localStorage.setItem(ACCESS_KEY, tokens.access)
    if (tokens.refresh) localStorage.setItem(REFRESH_KEY, tokens.refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

async function request(path, options = {}, canRefresh = true) {
  const headers = new Headers(options.headers || {})
  headers.set('Accept', 'application/json')
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (authStore.access) headers.set('Authorization', `Bearer ${authStore.access}`)

  const response = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (response.status === 401 && canRefresh && authStore.refresh) {
    const refreshed = await fetch(`${API_URL}/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refresh: authStore.refresh }),
    })
    if (refreshed.ok) {
      authStore.save(await refreshed.json())
      return request(path, options, false)
    }
    authStore.clear()
  }
  if (!response.ok) {
    let detail = `La solicitud falló (${response.status})`
    try {
      const payload = await response.json()
      const messages = Object.values(payload).flat().filter(value => typeof value === 'string')
      detail = messages.join(' ') || detail
    } catch {
      // Some server errors do not include a JSON response.
    }
    throw new Error(detail)
  }
  if (response.status === 204) return null
  return response.json()
}

export async function login(username, password) {
  const response = await fetch(`${API_URL}/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!response.ok) {
    let message = 'Usuario o contraseña incorrectos.'
    try {
      const payload = await response.json()
      message = payload.detail || message
    } catch { /* mensaje seguro por defecto */ }
    throw new Error(message)
  }
  const tokens = await response.json()
  authStore.save(tokens)
}

export const api = {
  listVisits: () => request('/visitas/'),
  createVisit: (data) => request('/visitas/', { method: 'POST', body: JSON.stringify(data) }),
  updateVisit: (id, data) => request(`/visitas/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVisit: (id) => request(`/visitas/${id}/`, { method: 'DELETE' }),
}
