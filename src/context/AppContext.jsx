import React, { createContext, useEffect, useState } from 'react'

export const AppContext = createContext()

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('grouply:user')
    return raw ? JSON.parse(raw) : null
  })

  useEffect(() => {
    if (user) localStorage.setItem('grouply:user', JSON.stringify(user))
  }, [user])

  const value = { user, setUser }
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
