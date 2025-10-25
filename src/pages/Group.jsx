import React, { useContext, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AppContext } from '../context/AppContext.jsx'
import { api } from '../services/api.js'
import { io } from 'socket.io-client'

export default function Group() {
  const { id } = useParams()
  const { user } = useContext(AppContext)

  const [group, setGroup] = useState(null)
  const [tasks, setTasks] = useState([])
  const [title, setTitle] = useState('')

  // ---- Plantillas ----
  const [templates, setTemplates] = useState({ builtin: [], custom: [] })
  const [tplName, setTplName] = useState('')

  // ---- Reemplazar / Deshacer ----
  const [lastApplyTs, setLastApplyTs] = useState(null) // timestamp de última aplicación para poder deshacer
  const [tplReplace, setTplReplace] = useState('')     // nombre de plantilla para replace

  const socketRef = useRef(null)

  const load = async () => {
    try {
      const g = (await api.get(`/groups/${id}`)).data
      const t = (await api.get(`/groups/${id}/tasks`)).data
      setGroup(g)
      setTasks(t)
    } catch (err) {
      console.error('Error cargando grupo/tareas:', err)
    }
  }

  // Traer lista de plantillas
  const fetchTemplates = async () => {
    try {
      const { data } = await api.get('/templates')
      setTemplates(data)
    } catch (e) {
      console.error('Error listando plantillas:', e)
    }
  }

  useEffect(() => {
    load()
    fetchTemplates() // <--- carga de plantillas al entrar
  }, [id])

  // --- Socket.IO realtime ---
  useEffect(() => {
    const base = api.defaults.baseURL?.replace('/api', '') || 'http://localhost:5001'
    const s = io(base, { transports: ['websocket'] })
    socketRef.current = s
    s.emit('join_group', { group_id: Number(id) })

    s.on('task_created', (task) => {
      if (Number(task.group_id) === Number(id)) {
        setTasks(prev => [task, ...prev.filter(t => t.id !== task.id)])
      }
    })
    s.on('task_updated', (task) => {
      if (Number(task.group_id) === Number(id)) {
        setTasks(prev => prev.map(t => t.id === task.id ? task : t))
      }
    })
    s.on('task_due_soon', (payload) => {
      if (Number(payload.group_id) === Number(id)) {
        console.log('⚠️ Tarea próxima a vencer:', payload)
      }
    })

    return () => {
      try { s.emit('leave_group', { group_id: Number(id) }) } catch {}
      s.disconnect()
    }
  }, [id])

  const addTask = async () => {
    if (!title.trim()) return
    try {
      const { data } = await api.post(`/groups/${id}/tasks`, { title })
      setTitle('')
      setTasks(prev => [data, ...prev])
    } catch (err) {
      console.error('Error agregando tarea:', err)
    }
  }

  const toggleComplete = async (task) => {
    try {
      const { data } = await api.patch(`/tasks/${task.id}`, { completed: !task.completed })
      setTasks(prev => prev.map(t => t.id === task.id ? data : t))
    } catch (err) {
      console.error('Error alternando completado:', err)
    }
  }

  const isAssigned = (t) =>
    !!(t.assignee_id ?? t.assignee ?? t.taken_by_id ?? t.assigned_to_id)

  const takeTask = async (task) => {
    if (!user) return alert('Ingresa con un apodo para tomar tareas')
    try {
      const payload = isAssigned(task)
        ? { unassign: true, completed: false }
        : { user_id: user.id, completed: false }
      const { data } = await api.patch(`/tasks/${task.id}`, payload)
      setTasks(prev => prev.map(t => t.id === task.id ? data : t))
    } catch (err) {
      console.error('Error tomando/liberando tarea:', err)
    }
  }

  // Plantillas (usar integrada o personalizada)
  const addTemplate = async (tpl) => {
    try {
      const { data } = await api.get(`/groups/${id}/tasks/template/${tpl}`)
      setTasks(prev => [...data, ...prev])
    } catch (err) {
      console.error('Error agregando plantilla:', err)
    }
  }

  // --- (B) Acciones de plantilla: replace / undo ---
  const applyTemplateReplace = async () => {
    if (!tplReplace) return
    if (!confirm(`Esto reemplazará TODAS las tareas por la plantilla "${tplReplace}". ¿Continuar?`)) return
    const ts = new Date().toISOString()
    try {
      await api.post(`/groups/${id}/tasks/apply-template`, { template: tplReplace, mode: 'replace' })
      setLastApplyTs(ts)
      const t = (await api.get(`/groups/${id}/tasks`)).data
      setTasks(t)
    } catch (e) {
      console.error('Error aplicando plantilla replace:', e)
    }
  }

  const undoSince = async () => {
    const since = prompt('Deshacer tareas creadas desde (ISO, ej 2025-10-24T15:00:00Z):', lastApplyTs || '')
    if (!since) return
    try {
      await api.delete(`/groups/${id}/tasks`, { params: { mode: 'since', since } })
      const t = (await api.get(`/groups/${id}/tasks`)).data
      setTasks(t)
    } catch (e) {
      console.error('Error deshaciendo:', e)
    }
  }

  // --- (C) Descripción (usa notes como description) ---
  const updateDescription = async (task, text) => {
    try {
      const { data } = await api.patch(`/tasks/${task.id}`, { description: text })
      setTasks(prev => prev.map(t => t.id === task.id ? data : t))
    } catch (e) {
      console.error('Error guardando descripción:', e)
    }
  }

  // --- (D) Adjuntos ---
  const loadAttachments = async (taskId) => {
    try {
      return (await api.get(`/tasks/${taskId}/attachments`)).data
    } catch {
      return []
    }
  }

  const uploadAttachment = async (task, file) => {
    const form = new FormData()
    form.append('file', file)
    await api.post(
      `/tasks/${task.id}/attachments`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
  }

  const deleteAttachment = async (task, name) => {
    await api.delete(`/tasks/${task.id}/attachments/${encodeURIComponent(name)}`)
  }

  // Compartir (Web Share + WhatsApp fallback)
    // Compartir la IMAGEN del QR (no el link)
  const share = async () => {
  try {
    // obtenemos el PNG desde el endpoint con CORS
    const resp = await api.get(`/groups/${id}/qr`, { responseType: 'blob' })
    const blob = new Blob([resp.data], { type: 'image/png' })
    const file = new File([blob], `${group.code}.png`, { type: 'image/png' })
    const title = `QR de ${group.name}`
    const text  = `Únete al grupo ${group.name}`

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ title, text, files: [file] })
      return
    }

    // fallback: abrir imagen en pestaña nueva (el usuario guarda/compartirá manualmente)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  } catch (e) {
    console.error('Error compartiendo QR:', e)
    alert('No se pudo compartir el QR')
  }
}


  // Duplicar
  const duplicate = async () => {
    try {
      const { data } = await api.post(`/groups/${id}/duplicate`)
      alert(`Grupo duplicado: ${data.name} (id ${data.id})`)
    } catch (e) {
      console.error('Error duplicando:', e)
    }
  }

  // Guardar plantilla (y refrescar lista)
  const saveTemplate = async () => {
    const name = prompt('Nombre de la plantilla:')
    if (!name) return
    try {
      await api.post(`/groups/${id}/templates/save`, { name })
      alert('Plantilla guardada.')
      fetchTemplates()
    } catch (e) {
      console.error('Error guardando plantilla:', e)
    }
  }
  const downloadQR = async () => {
  try {
    // descarga directa como attachment
    const resp = await api.get(`/groups/${id}/qr?download=1`, { responseType: 'blob' })
    const blob = new Blob([resp.data], { type: 'image/png' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${group.code}.png`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('Error descargando QR:', e)
    alert('No se pudo descargar el QR')
  }
}

  // Eliminar plantilla personalizada
  const deleteTemplate = async () => {
    if (!tplName) return
    if (!confirm(`¿Eliminar la plantilla "${tplName}"?`)) return
    try {
      await api.delete(`/templates/${tplName}`)
      fetchTemplates()
      setTplName('')
    } catch (e) {
      console.error('Error eliminando plantilla:', e)
    }
  }

  if (!group) return <div className="card">Cargando...</div>

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center gap-4">
          {group.qr_url && <img src={group.qr_url} alt="QR" style={{ width: 80, height: 80 }} />}
          <div className="flex-1">
            <h2 className="text-xl font-bold">{group.name}</h2>
            <p className="text-gray-600">{group.description}</p>
            {group.event_date && <p className="text-sm text-gray-500">📅 {group.event_date}</p>}
            <p className="text-xs text-gray-500">Código: {group.code}</p>
          </div>
          <div className="flex gap-2">
            <button className="badge hover:bg-gray-200" onClick={share}>Compartir</button>
            <button className="badge hover:bg-gray-200" onClick={downloadQR}>Descargar QR</button>
            <button className="badge hover:bg-gray-200" onClick={duplicate}>Duplicar</button>
            <button className="badge hover:bg-gray-200" onClick={saveTemplate}>Guardar plantilla</button>
            
          </div>
        </div>
      </div>

      <div className="card flex gap-2">
        <input
          className="input flex-1"
          placeholder="Agregar tarea..."
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <button className="btn" onClick={addTask}>Añadir</button>
      </div>

      {/* Botones de plantillas rápidas */}
      <div className="flex gap-2">
        <button className="badge hover:bg-gray-200" onClick={() => addTemplate('evento')}>🪩 Evento</button>
        <button className="badge hover:bg-gray-200" onClick={() => addTemplate('proyecto')}>📦 Proyecto</button>
        <button className="badge hover:bg-gray-200" onClick={() => addTemplate('mudanza')}>🚚 Mudanza</button>
        <button className="badge hover:bg-gray-200" onClick={() => addTemplate('diario')}>🗓️ Diario</button>
      </div>

      {/* Reemplazar con plantilla + deshacer */}
      <div className="flex gap-2 items-center">
        <input
          className="input"
          placeholder="Nombre de plantilla (evento / proyecto / mudanza / diario o personalizada)"
          value={tplReplace}
          onChange={(e) => setTplReplace(e.target.value)}
          style={{ minWidth: 380 }}
        />
        <button className="badge hover:bg-gray-200" onClick={applyTemplateReplace}>
          Reemplazar con plantilla
        </button>
        <button className="badge hover:bg-gray-200" onClick={undoSince} title="Borrar tareas creadas desde la hora indicada">
          Deshacer desde hora…
        </button>
      </div>

      {/* Selector de plantillas personalizadas */}
      <div className="flex gap-2 items-center">
        <select className="input" value={tplName} onChange={e => setTplName(e.target.value)}>
          <option value="">— Plantillas personalizadas —</option>
          {templates.custom.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <button
          className="badge hover:bg-gray-200"
          disabled={!tplName}
          onClick={() => addTemplate(tplName)}
        >
          Cargar
        </button>
        <button
          className="badge hover:bg-gray-200"
          disabled={!tplName}
          onClick={deleteTemplate}
        >
          Eliminar
        </button>
        <button
          className="badge hover:bg-gray-200"
          onClick={fetchTemplates}
          title="Refrescar lista"
        >
          ↻
        </button>
      </div>

      <ul className="space-y-2">
        {tasks.map(t => {
          const asignado =
            t.assignee_name ||
            t.assigned_to_name ||
            t.taken_by_name ||
            (typeof t.assignee === 'number' ? `Usuario #${t.assignee}` : '—')

          return (
            <li key={t.id} className="card flex items-center gap-3">
              <input type="checkbox" checked={!!t.completed} onChange={() => toggleComplete(t)} />
              <div className="flex-1">
                <p className={'font-medium ' + (t.completed ? 'line-through text-gray-400' : '')}>
                  {t.title}
                </p>

                {/* DESCRIPCIÓN */}
                <textarea
                  className="input mt-1 w-full"
                  rows={2}
                  placeholder="Descripción (opcional)"
                  defaultValue={t.notes || ''}
                  onBlur={(e) => updateDescription(t, e.target.value)}
                />

                {/* ADJUNTOS */}
                <div className="mt-2 flex items-center gap-2">
                  <label className="badge hover:bg-gray-200 cursor-pointer">
                    Subir archivo
                    <input
                      type="file"
                      className="hidden"
                      onChange={async (e) => {
                        if (!e.target.files?.length) return
                        await uploadAttachment(t, e.target.files[0])
                        const list = await loadAttachments(t.id)
                        setTasks(prev => prev.map(x => x.id === t.id ? { ...x, __files: list } : x))
                        e.target.value = ''
                      }}
                    />
                  </label>
                  <button
                    className="badge hover:bg-gray-200"
                    onClick={async () => {
                      const list = await loadAttachments(t.id)
                      setTasks(prev => prev.map(x => x.id === t.id ? { ...x, __files: list } : x))
                    }}
                  >
                    Ver archivos
                  </button>
                </div>
                {Array.isArray(t.__files) && t.__files.length > 0 && (
                  <ul className="mt-1 text-xs text-gray-600">
                    {t.__files.map(f => (
                      <li key={f.name} className="flex gap-2 items-center">
                        <a href={f.url} target="_blank" rel="noreferrer">{f.name}</a>
                        <button
                          className="badge hover:bg-gray-200"
                          onClick={async () => {
                            await deleteAttachment(t, f.name)
                            const list = await loadAttachments(t.id)
                            setTasks(prev => prev.map(x => x.id === t.id ? { ...x, __files: list } : x))
                          }}
                        >
                          borrar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <p className="text-xs text-gray-500 mt-1">Asignado: {asignado}</p>
              </div>
              <button className="badge hover:bg-gray-200" onClick={() => takeTask(t)}>
                {isAssigned(t) ? 'Liberar' : 'Tomar'}
              </button>
            </li>
          )
        })}
        {tasks.length === 0 && <div className="card text-center text-gray-600">No hay tareas aún.</div>}
      </ul>
    </div>
  )
}
