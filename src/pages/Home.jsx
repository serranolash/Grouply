import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api.js'
import { backendBase } from '../services/base.js';

export default function Home() {
  const [groups, setGroups] = useState([])

  useEffect(() => {
    api.get('/groups').then(({data})=> setGroups(data))
  }, [])

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Organizar juntos nunca fue tan simple</h1>
        <p className="text-gray-600">Crea un grupo, comparte el QR y asignen tareas en segundos.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(g => (
          <Link key={g.id} to={`/group/${g.id}`} className="card hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{g.name}</h3>
                {g.event_date && <p className="text-sm text-gray-500">{g.event_date}</p>}
              </div>
              <img src={group.qr_url} alt="QR" style={{ width: 80, height: 80 }} />
            </div>
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{g.description}</p>
          </Link>
        ))}
      </div>
      {groups.length === 0 && (
        <div className="card text-center">
          <p className="text-gray-600">Aún no hay grupos. ¡Crea el primero!</p>
          <Link to="/create" className="btn mt-3">Crear grupo</Link>
        </div>
      )}
    </div>
  )
}
