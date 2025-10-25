import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../context/AppContext.jsx'
import { api } from '../services/api.js'

export default function MyTasks() {
  const { user } = useContext(AppContext)
  const [groups, setGroups] = useState([])
  const [all, setAll] = useState([])

  useEffect(() => {
    const load = async () => {
      const gs = (await api.get('/groups')).data
      setGroups(gs)
      if (user) {
        // pull tasks from each group and filter by taken_by
        const arr = []
        for (const g of gs) {
          const ts = (await api.get(`/groups/${g.id}/tasks`)).data
          arr.push(...ts.filter(t => t.taken_by === user.id))
        }
        setAll(arr)
      }
    }
    load()
  }, [user])

  if (!user) return <div className="card text-center">Primero ingresa con un apodo (arriba a la derecha).</div>

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold">Mis pendientes</h2>
      {all.length === 0 ? (
        <div className="card text-center text-gray-600">Aún no tomaste tareas.</div>
      ) : (
        <ul className="space-y-2">
          {all.map(t => (
            <li key={t.id} className="card flex items-center gap-3">
              <span className="badge">#{t.group_id}</span>
              <div className="flex-1">
                <p className="font-medium">{t.title}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
