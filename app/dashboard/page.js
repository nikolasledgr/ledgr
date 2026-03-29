'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) window.location.href = '/'
      else setUser(user)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (!user) return null

  return (
    <main style={{minHeight:'100vh',background:'#0f1117',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#0d1018',border:'0.5px solid #1e2030',borderRadius:'12px',padding:'40px',width:'420px',textAlign:'center'}}>
        <div style={{fontSize:'24px',fontWeight:'600',color:'#fff',marginBottom:'8px'}}>ledgr<span style={{color:'#6c8eff'}}>.</span></div>
        <div style={{fontSize:'14px',color:'#34d399',marginBottom:'8px'}}>You are logged in!</div>
        <div style={{fontSize:'13px',color:'#555',marginBottom:'28px'}}>{user.email}</div>
        <button onClick={handleLogout} style={{background:'transparent',color:'#888',border:'0.5px solid #1e2030',borderRadius:'8px',padding:'10px 24px',fontSize:'13px',cursor:'pointer',fontFamily:'inherit'}}>
          Sign out
        </button>
      </div>
    </main>
  )
}