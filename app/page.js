'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAuth = async () => {
    setLoading(true)
    setMessage('')
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
      else window.location.href = '/dashboard'
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage(error.message)
      else setMessage('Check your email to confirm your account!')
    }
    setLoading(false)
  }

  return (
    <main style={{minHeight:'100vh',background:'#0f1117',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#0d1018',border:'0.5px solid #1e2030',borderRadius:'12px',padding:'40px',width:'380px'}}>
        <div style={{fontSize:'24px',fontWeight:'600',color:'#fff',marginBottom:'8px'}}>ledgr<span style={{color:'#6c8eff'}}>.</span></div>
        <div style={{fontSize:'13px',color:'#555',marginBottom:'28px'}}>{isLogin ? 'Sign in to your account' : 'Create your account'}</div>
        
        <div style={{marginBottom:'16px'}}>
          <div style={{fontSize:'11px',color:'#555',textTransform:'uppercase',letterSpacing:'0.7px',marginBottom:'6px'}}>Email</div>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" style={{width:'100%',background:'#080a0f',border:'0.5px solid #1e2030',borderRadius:'8px',padding:'10px 14px',fontSize:'13px',color:'#e8e9ed',outline:'none',fontFamily:'inherit'}}/>
        </div>

        <div style={{marginBottom:'24px'}}>
          <div style={{fontSize:'11px',color:'#555',textTransform:'uppercase',letterSpacing:'0.7px',marginBottom:'6px'}}>Password</div>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={{width:'100%',background:'#080a0f',border:'0.5px solid #1e2030',borderRadius:'8px',padding:'10px 14px',fontSize:'13px',color:'#e8e9ed',outline:'none',fontFamily:'inherit'}}/>
        </div>

        {message && <div style={{fontSize:'12px',color:'#6c8eff',marginBottom:'16px',padding:'10px',background:'#0d1a2e',borderRadius:'6px'}}>{message}</div>}

        <button onClick={handleAuth} disabled={loading} style={{width:'100%',background:'#6c8eff',color:'#fff',border:'none',borderRadius:'8px',padding:'11px',fontSize:'13px',fontWeight:'500',cursor:'pointer',fontFamily:'inherit'}}>
          {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
        </button>

        <div style={{textAlign:'center',marginTop:'16px',fontSize:'12px',color:'#555'}}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span onClick={()=>setIsLogin(!isLogin)} style={{color:'#6c8eff',cursor:'pointer'}}>{isLogin ? 'Sign up' : 'Sign in'}</span>
        </div>
      </div>
    </main>
  )
}