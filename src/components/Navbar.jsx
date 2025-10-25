import React, { useContext, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext.jsx'
import { api } from '../services/api.js'
import { FiUser } from 'react-icons/fi'

export default function Navbar() {
  const { user, setUser } = useContext(AppContext)
  const [nick, setNick] = useState('')
  const navigate = useNavigate()

  const quickGuest = async () => {
    const nickname = nick || 'Invitado ' + Math.floor(Math.random()*999)
    const { data } = await api.post('/users/guest', { nickname })
    setUser(data)
    setNick('')
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container flex items-center justify-between py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-brand-500"></div>
          <span className="font-bold text-lg">Grouply</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link to="/create" className="badge hover:bg-gray-200">Nuevo grupo</Link>
          <Link to="/my" className="badge hover:bg-gray-200">Mis pendientes</Link>
          {!user ? (
            <div className="flex items-center gap-2">
              <input className="input w-40" placeholder="Tu apodo" value={nick} onChange={e=>setNick(e.target.value)} />
              <button className="btn" onClick={quickGuest}><FiUser/> Entrar</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="badge">Hola, {user.nickname}</span>
              <button className="badge hover:bg-gray-200" onClick={()=>{setUser(null); localStorage.removeItem('grouply:user')}}>Salir</button>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
