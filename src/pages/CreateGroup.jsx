import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api.js'

export default function CreateGroup() {
  const [form, setForm] = useState({ name: '', description: '', event_date: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/groups', form)
      navigate('/group/' + data.id)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="card max-w-xl mx-auto space-y-3">
      <h2 className="text-xl font-bold">Nuevo grupo</h2>
      <div>
        <label className="label">Nombre</label>
        <input className="input" required value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
      </div>
      <div>
        <label className="label">Fecha (opcional)</label>
        <input className="input" placeholder="2025-10-23 20:00" value={form.event_date} onChange={e=>setForm({...form, event_date:e.target.value})} />
      </div>
      <div>
        <label className="label">Descripción</label>
        <textarea className="input min-h-[100px]" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
      </div>
      <button className="btn" disabled={loading}>{loading? 'Creando...' : 'Crear'}</button>
    </form>
  )
}
