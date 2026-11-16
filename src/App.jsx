import React, { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, CalendarDays, Check, Clock3, LogOut, Plus, RotateCcw, ShieldCheck, UserRound, X } from 'lucide-react'
import { api, authStore, login } from './api'

const today = new Date().toISOString().slice(0, 10)
const emptyForm = { persona: '', motivo_visita: '', fecha: today, hora_entrada: '', hora_salida: '' }

function formatDate(value) {
  if (!value) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`))
}

function formatTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function getVisitForm(visit) {
  return visit
    ? { ...visit, hora_entrada: visit.hora_entrada?.slice(0, 16), hora_salida: visit.hora_salida?.slice(0, 16) }
    : emptyForm
}

function Login({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try { await login(form.username, form.password); onLogin() }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }
  return <main className="login-shell">
    <motion.section className="login-card" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}>
      <div className="brand-mark" aria-hidden="true"><CalendarDays size={25} /></div>
      <p className="eyebrow">AGENDA DE ACCESOS</p>
      <h1>Tu espacio de visitas,<br /><em>en orden.</em></h1>
      <p className="muted">Administra entradas y salidas con una vista clara, rápida y segura.</p>
      <form onSubmit={submit} className="login-form">
        <label>Usuario<input autoComplete="username" required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></label>
        <label>Contraseña<input type="password" autoComplete="current-password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="button primary wide" disabled={loading}>{loading ? 'Validando…' : 'Ingresar'} <ArrowRight size={17} /></button>
      </form>
      <p className="security-note"><ShieldCheck size={15} /> Sesión protegida con JWT</p>
    </motion.section>
    <div className="login-art" aria-hidden="true"><div className="art-ring" /><div className="art-card"><Clock3 size={34} /><strong>Control simple</strong><span>en tiempo real</span></div></div>
  </main>
}

function Scene() {
  const reduced = useReducedMotion()
  const [rotation, setRotation] = useState({ x: -7, y: 16 })
  const [dragging, setDragging] = useState(false)
  return <section className="scene-panel" aria-label="Visualización interactiva de agenda">
    <div className="scene-header"><span className="eyebrow">VISTA 2.5D</span><button className="icon-button" title="Restablecer rotación" aria-label="Restablecer rotación" onClick={() => setRotation({ x: -7, y: 16 })}><RotateCcw size={16} /></button></div>
    <div className="scene" onPointerMove={event => {
      if (!dragging || reduced) return
      const box = event.currentTarget.getBoundingClientRect()
      setRotation({ x: ((event.clientY - box.top) / box.height - .5) * -18, y: ((event.clientX - box.left) / box.width - .5) * 28 })
    }} onPointerDown={() => setDragging(true)} onPointerUp={() => setDragging(false)} onPointerLeave={() => setDragging(false)} role="img" aria-label="Tarjeta 3D arrastrable. Mantén pulsado y mueve para rotarla.">
      <motion.div className="object-3d" animate={{ rotateX: rotation.x, rotateY: rotation.y }} transition={{ type: 'spring', stiffness: 160, damping: 18 }}>
        <div className="object-face"><span className="object-dot" /><span className="object-lines" /><span className="object-lines short" /><div className="object-chip">VISITA</div></div>
        <div className="object-side" />
      </motion.div>
      <span className="drag-hint">Arrastra para explorar</span>
    </div>
    <p className="scene-caption">Una vista ligera para orientarte.<br /><strong>También puedes usar el teclado:</strong> Tab y Enter para restablecer.</p>
  </section>
}

function VisitForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || emptyForm)
  const change = (key, value) => setForm(current => ({ ...current, [key]: value }))
  function submit(event) {
    event.preventDefault()
    const payload = { ...form, hora_entrada: new Date(form.hora_entrada).toISOString(), hora_salida: form.hora_salida ? new Date(form.hora_salida).toISOString() : null }
    onSave(payload)
  }
  return <form className="visit-form" onSubmit={submit}>
    <div className="form-grid">
      <label>RUT de la persona<input required value={form.persona} onChange={e => change('persona', e.target.value)} placeholder="12.345.678-9" /></label>
      <label>Fecha<input type="date" required value={form.fecha} onChange={e => change('fecha', e.target.value)} /></label>
      <label>Hora de entrada<input type="datetime-local" required value={form.hora_entrada} onChange={e => change('hora_entrada', e.target.value)} /></label>
      <label>Hora de salida <span className="optional">(opcional)</span><input type="datetime-local" value={form.hora_salida || ''} onChange={e => change('hora_salida', e.target.value)} /></label>
      <label className="full">Motivo de visita<textarea required maxLength="320" rows="3" value={form.motivo_visita} onChange={e => change('motivo_visita', e.target.value)} placeholder="Ej. Reunión con administración" /></label>
    </div>
    <div className="form-actions"><button type="button" className="button ghost" onClick={onCancel}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar visita'} <Check size={16} /></button></div>
  </form>
}

function Dashboard({ onLogout }) {
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const load = async () => { setLoading(true); setError(''); try { setVisits(await api.listVisits()) } catch (err) { setError(err.message) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])
  const active = useMemo(() => visits.filter(visit => !visit.hora_salida), [visits])
  async function save(data) {
    setSaving(true)
    try { const result = modal?.visit ? await api.updateVisit(modal.visit.id, data) : await api.createVisit(data); setVisits(current => modal?.visit ? current.map(item => item.id === result.id ? result : item) : [result, ...current]); setModal(null) }
    catch (err) { setError(err.message) } finally { setSaving(false) }
  }
  async function remove(visit) {
    if (!window.confirm(`¿Eliminar la visita de ${visit.nombre || visit.persona}?`)) return
    try { await api.deleteVisit(visit.id); setVisits(current => current.filter(item => item.id !== visit.id)) } catch (err) { setError(err.message) }
  }
  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="/" aria-label="Visita, inicio"><span className="brand-mark small"><CalendarDays size={18} /></span><span>visita<span className="brand-dot">.</span></span></a><div className="top-actions"><span className="status"><span className="status-dot" /> API protegida</span><button className="button ghost logout" onClick={() => { authStore.clear(); onLogout() }}><LogOut size={16} /> Salir</button></div></header>
    <div className="content">
      <section className="welcome"><div><p className="eyebrow">PANEL DE CONTROL</p><h1>Hola, <em>bienvenido.</em></h1><p className="muted">Gestiona el flujo de personas en un solo lugar.</p></div><button className="button primary" onClick={() => setModal({ visit: null })}><Plus size={18} /> Nueva visita</button></section>
      {error && <div className="alert error" role="alert">{error}<button aria-label="Cerrar mensaje" onClick={() => setError('')}><X size={15} /></button></div>}
      <section className="stats" aria-label="Resumen de visitas"><div className="stat"><span className="stat-icon mint"><UserRound size={18} /></span><div><strong>{loading ? '—' : active.length}</strong><span>Dentro ahora</span></div></div><div className="stat"><span className="stat-icon blue"><CalendarDays size={18} /></span><div><strong>{loading ? '—' : visits.length}</strong><span>Visitas registradas</span></div></div><div className="stat"><span className="stat-icon amber"><Clock3 size={18} /></span><div><strong>{loading ? '—' : visits.filter(v => v.fecha === today).length}</strong><span>Programadas hoy</span></div></div></section>
      <div className="dashboard-grid"><section className="list-panel"><div className="section-title"><div><p className="eyebrow">REGISTROS</p><h2>Últimas visitas</h2></div><button className="icon-button" title="Actualizar visitas" aria-label="Actualizar visitas" onClick={load}><RotateCcw size={16} /></button></div>{loading ? <div className="loading">Cargando visitas…</div> : visits.length === 0 ? <div className="empty">Aún no hay visitas registradas.<br /><button className="link-button" onClick={() => setModal({ visit: null })}>Crea la primera</button></div> : <div className="visit-list"><AnimatePresence initial={false}>{visits.map(visit => <motion.article className="visit-row" key={visit.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><div className={`avatar ${visit.hora_salida ? 'past' : ''}`}>{(visit.nombre || visit.persona || '?').slice(0, 1).toUpperCase()}</div><div className="visit-main"><strong>{visit.nombre || visit.persona}</strong><span>{visit.motivo_visita}</span></div><div className="visit-time"><span>{formatDate(visit.fecha)}</span><span>{formatTime(visit.hora_entrada)} – {formatTime(visit.hora_salida)}</span></div><span className={`pill ${visit.hora_salida ? 'closed' : ''}`}>{visit.hora_salida ? 'Finalizada' : 'En curso'}</span><div className="row-actions"><button onClick={() => setModal({ visit })}>Editar</button><button onClick={() => remove(visit)}>Eliminar</button></div></motion.article>)}</AnimatePresence></div>}</section><Scene /></div>
    </div>
    <AnimatePresence>{modal && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}><div className="modal-head"><div><p className="eyebrow">{modal.visit ? 'EDITAR REGISTRO' : 'NUEVO REGISTRO'}</p><h2 id="modal-title">{modal.visit ? 'Actualizar visita' : 'Registrar visita'}</h2></div><button className="icon-button" onClick={() => setModal(null)} aria-label="Cerrar"><X size={18} /></button></div><VisitForm initial={getVisitForm(modal.visit)} onSave={save} onCancel={() => setModal(null)} saving={saving} /></motion.section></motion.div>}</AnimatePresence>
  </main>
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(Boolean(authStore.access))
  return authenticated ? <Dashboard onLogout={() => setAuthenticated(false)} /> : <Login onLogin={() => setAuthenticated(true)} />
}
