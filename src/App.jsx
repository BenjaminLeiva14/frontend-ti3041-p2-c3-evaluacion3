import React, { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, BarChart3, CalendarDays, Check, Clock3, HelpCircle, LogOut, Plus, RefreshCw, RotateCcw, ShieldCheck, UserPlus, UserRound, X } from 'lucide-react'
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
      <h1>Hola, <em>bienvenido.</em></h1>
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

function Scene({ onNewVisit, onShowRecords }) {
  const reduced = useReducedMotion()
  const [rotation, setRotation] = useState({ x: -7, y: 16 })
  const [dragging, setDragging] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const steps = [
    { label: 'Registrar', title: 'Registra la visita', description: 'Agrega el RUT, motivo y horario para crear un registro.' },
    { label: 'Entrada', title: 'Controla el acceso', description: 'Identifica quién está dentro y revisa sus datos rápidamente.' },
    { label: 'Salida', title: 'Cierra el registro', description: 'Completa la hora de salida para mantener la agenda actualizada.' },
  ]
  const step = steps[stepIndex]
  const action = stepIndex === 0
    ? { label: 'Registrar visita', onClick: onNewVisit }
    : { label: 'Ver registros', onClick: onShowRecords }
  const changeStep = (index) => {
    setStepIndex(index)
    if (!reduced) setRotation({ x: -7 + index * 5, y: 16 - index * 12 })
  }
  const rotate = (amount) => setRotation(current => ({ x: current.x, y: current.y + amount }))
  return <section className="scene-panel" aria-label="Visualización interactiva de agenda">
    <div className="scene-header"><div><span className="eyebrow">VISTA 2.5D</span><strong className="scene-title">{step.title}</strong></div><button className="icon-button" title="Restablecer rotación" aria-label="Restablecer rotación" onClick={() => setRotation({ x: -7, y: 16 })}><RotateCcw size={16} /></button></div>
    <div className="scene" tabIndex="0" onKeyDown={event => {
      if (event.key === 'ArrowLeft') rotate(-8)
      if (event.key === 'ArrowRight') rotate(8)
      if (event.key === 'Enter') setRotation({ x: -7, y: 16 })
    }} onPointerMove={event => {
      if (!dragging || reduced) return
      const box = event.currentTarget.getBoundingClientRect()
      setRotation({ x: ((event.clientY - box.top) / box.height - .5) * -18, y: ((event.clientX - box.left) / box.width - .5) * 28 })
    }} onPointerDown={() => setDragging(true)} onPointerUp={() => setDragging(false)} onPointerLeave={() => setDragging(false)} role="img" aria-label={`Tarjeta 2.5D: ${step.title}. Arrastra para rotarla o usa las flechas del teclado.`}>
      <motion.div className="object-3d" animate={{ rotateX: rotation.x, rotateY: rotation.y }} transition={{ type: 'spring', stiffness: 160, damping: 18 }}>
        <div className="object-face"><span className="object-dot" /><span className="object-lines" /><span className="object-lines short" /><div className="object-chip">{step.label.toUpperCase()}</div></div>
        <div className="object-side" />
      </motion.div>
      <span className="drag-hint">Arrastra o usa ← →</span>
    </div>
    <div className="scene-steps" role="tablist" aria-label="Pasos del flujo de visitas">{steps.map((item, index) => <button key={item.label} className={index === stepIndex ? 'active' : ''} role="tab" aria-selected={index === stepIndex} onClick={() => changeStep(index)}>{index + 1}. {item.label}</button>)}</div>
    <p className="scene-caption"><strong>{step.title}:</strong> {step.description}</p>
    <button className="scene-action" onClick={action.onClick}>{action.label} <ArrowRight size={14} /></button>
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
  const [activeSection, setActiveSection] = useState(() => window.location.hash.slice(1) || 'overview')
  const load = async () => { setLoading(true); setError(''); try { setVisits(await api.listVisits()) } catch (err) { setError(err.message) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])
  useEffect(() => {
    const handleHashChange = () => setActiveSection(window.location.hash.slice(1) || 'overview')
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])
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
    <div className="dashboard-main">
    <header className="topbar">
      <a className="topbar-brand" href="#overview" aria-label="Visita, inicio"><span className="brand-mark small"><CalendarDays size={18} /></span><span><strong>visita</strong><small>control de accesos</small></span></a>
      <nav className="top-nav" aria-label="Navegación principal">
        <a className={`nav-item ${activeSection === 'overview' ? 'active' : ''}`} href="#overview" aria-current={activeSection === 'overview' ? 'page' : undefined}><BarChart3 size={15} /> Resumen</a>
        <a className={`nav-item ${activeSection === 'visits' ? 'active' : ''}`} href="#visits" aria-current={activeSection === 'visits' ? 'page' : undefined}><CalendarDays size={15} /> Visitas</a>
        <a className={`nav-item ${activeSection === 'today' ? 'active' : ''}`} href="#today" aria-current={activeSection === 'today' ? 'page' : undefined}><Clock3 size={15} /> Hoy</a>
        <a className={`nav-item ${activeSection === 'visual-guide' ? 'active' : ''}`} href="#visual-guide" aria-current={activeSection === 'visual-guide' ? 'page' : undefined}><HelpCircle size={15} /> Guía</a>
      </nav>
      <div className="top-actions"><button className="button quick-action" onClick={() => setModal({ visit: null })}><UserPlus size={15} /> Nueva visita</button><button className="icon-button refresh-action" title="Actualizar datos" aria-label="Actualizar datos" onClick={load} disabled={loading}><RefreshCw size={16} /></button><span className="api-status"><span className="status-dot" /> API protegida</span><button className="button ghost logout" onClick={() => { authStore.clear(); onLogout() }}><LogOut size={16} /> Salir</button></div>
    </header>
    <div className="content">
      <section className="welcome" id="overview"><div className="welcome-copy"><p className="eyebrow">PANEL DE CONTROL</p><h1>Hola, bienvenido</h1><p className="muted">Gestiona el flujo de personas en un solo lugar.</p></div><div className="welcome-actions"><span className="welcome-badge"><CalendarDays size={14} /> Agenda activa</span><button className="button primary" onClick={() => setModal({ visit: null })}><Plus size={18} /> Nueva visita</button></div></section>
      {error && <div className="alert error" role="alert">{error}<button aria-label="Cerrar mensaje" onClick={() => setError('')}><X size={15} /></button></div>}
      <section className="stats" id="today" aria-label="Resumen de visitas"><div className="stat"><span className="stat-icon mint"><UserRound size={18} /></span><div><strong>{loading ? '—' : active.length}</strong><span>Dentro ahora</span></div></div><div className="stat"><span className="stat-icon blue"><CalendarDays size={18} /></span><div><strong>{loading ? '—' : visits.length}</strong><span>Visitas registradas</span></div></div><div className="stat"><span className="stat-icon amber"><Clock3 size={18} /></span><div><strong>{loading ? '—' : visits.filter(v => v.fecha === today).length}</strong><span>Programadas hoy</span></div></div></section>
      <div className="dashboard-grid"><section className="list-panel" id="visits"><div className="section-title"><div><p className="eyebrow">REGISTROS</p><h2>Últimas visitas</h2></div><button className="icon-button" title="Actualizar visitas" aria-label="Actualizar visitas" onClick={load}><RotateCcw size={16} /></button></div>{loading ? <div className="loading">Cargando visitas…</div> : visits.length === 0 ? <div className="empty">Aún no hay visitas registradas.<br /><button className="link-button" onClick={() => setModal({ visit: null })}>Crea la primera</button></div> : <div className="visit-list"><AnimatePresence initial={false}>{visits.map(visit => <motion.article className="visit-row" key={visit.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><div className={`avatar ${visit.hora_salida ? 'past' : ''}`}>{(visit.nombre || visit.persona || '?').slice(0, 1).toUpperCase()}</div><div className="visit-main"><strong>{visit.nombre || visit.persona}</strong><span>{visit.motivo_visita}</span></div><div className="visit-time"><span>{formatDate(visit.fecha)}</span><span>{formatTime(visit.hora_entrada)} – {formatTime(visit.hora_salida)}</span></div><span className={`pill ${visit.hora_salida ? 'closed' : ''}`}>{visit.hora_salida ? 'Finalizada' : 'En curso'}</span><div className="row-actions"><button onClick={() => setModal({ visit })}>Editar</button><button onClick={() => remove(visit)}>Eliminar</button></div></motion.article>)}</AnimatePresence></div>}</section><div id="visual-guide"><Scene onNewVisit={() => setModal({ visit: null })} onShowRecords={() => document.querySelector('.list-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} /></div></div>
    </div>
    </div>
    <AnimatePresence>{modal && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}><div className="modal-head"><div><p className="eyebrow">{modal.visit ? 'EDITAR REGISTRO' : 'NUEVO REGISTRO'}</p><h2 id="modal-title">{modal.visit ? 'Actualizar visita' : 'Registrar visita'}</h2></div><button className="icon-button" onClick={() => setModal(null)} aria-label="Cerrar"><X size={18} /></button></div><VisitForm initial={getVisitForm(modal.visit)} onSave={save} onCancel={() => setModal(null)} saving={saving} /></motion.section></motion.div>}</AnimatePresence>
  </main>
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(Boolean(authStore.access))
  return authenticated ? <Dashboard onLogout={() => setAuthenticated(false)} /> : <Login onLogin={() => setAuthenticated(true)} />
}
