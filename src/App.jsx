import React, { useEffect, useState } from 'react'
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import Home from './pages/Home.jsx'
import CreateGroup from './pages/CreateGroup.jsx'
import Group from './pages/Group.jsx'
import MyTasks from './pages/MyTasks.jsx'
import Join from './pages/Join.jsx'
import Navbar from './components/Navbar.jsx'
import { AppProvider } from './context/AppContext.jsx'

export default function App() {
  return (
    <AppProvider>
      <Navbar />
      <div className="container my-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateGroup />} />
          <Route path="/group/:id" element={<Group />} />
          <Route path="/join/:code" element={<Join />} />
          <Route path="/my" element={<MyTasks />} />
        </Routes>
      </div>
    </AppProvider>
  )
}
