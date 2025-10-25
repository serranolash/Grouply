import React, { useContext, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext.jsx'
import { api } from '../services/api.js'

export default function Join() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user } = useContext(AppContext)
  const [group, setGroup] = useState(null)

  useEffect(() => {
    api.get('/groups/by-code/' + code).then(({data}) => {
      setGroup(data)
    }).catch(()=>{
      alert('Código inválido'); navigate('/')
    })
  }, [code])

  if (!group) return <div className="card">Cargando...</div>

  return (
    <div className="card text-center">
      <h2 className="text-xl font-bold">Te uniste a: {group.name}</h2>
      <p className="text-gray-600">{group.description}</p>
      <button className="btn mt-3" onClick={()=>navigate('/group/'+group.id)}>Entrar</button>
    </div>
  )
}
