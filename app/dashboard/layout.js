'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function DashboardLayout({ children }) {
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

  const navItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Invoices', href: '/dashboard/invoices' },
    { label: 'Expenses', href: '/dashboard/expenses' },
    { label: 'Ledger', href: '/dashboard/ledger' },
    { label: 'Chart of Accounts', href: '/dashboard/chart-of-accounts' },
    { label: 'P&L Report', href: '/dashboard/pl' },
    { label: 'Balance Sheet', href: '/dashboard/balance-sheet' },
    { label: 'Tax', href: '/dashboard/tax' },
    { label: 'Settings', href: '/dashboard/settings' },
  ]

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#0f1117',fontFamily:'sans-serif'}}>
      <div style={{width:'220px',background:'#080a0f',borderRight:'0.5px solid #1e2030',display:'flex',flexDirection:'column',flexShrink:0}}>
        <div style={{padding:'24px 20px',borderBottom:'0.5px solid #1e2030'}}>
          <div style={{fontSize:'20px',fontWeight:'600',color:'#fff'}}>ledgr<span style={{color:'#6c8eff'}}>.</span></div>
        </div>
        <nav style={{padding:'12px 8px',flex:1}}>
          {navItems.map(item => (
            <a key={item.href} href={item.href} style={{display:'flex',alignItems:'center',padding:'9px 12px',borderRadius:'6px',color:'#888',fontSize:'13.5px',textDecoration:'none',marginBottom:'2px',transition:'all 0.15s'}}
              onMouseEnter={e=>e.target.style.color='#ccc'}
              onMouseLeave={e=>e.target.style.color='#888'}>
              {item.label}
            </a>
          ))}
        </nav>
        <div style={{padding:'16px',borderTop:'0.5px solid #1e2030'}}>
          <div style={{fontSize:'12px',color:'#555',marginBottom:'8px'}}>{user?.email}</div>
          <button onClick={handleLogout} style={{fontSize:'12px',color:'#888',background:'transparent',border:'0.5px solid #1e2030',borderRadius:'6px',padding:'6px 12px',cursor:'pointer',fontFamily:'sans-serif'}}>Sign out</button>
        </div>
      </div>
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>
        {children}
      </div>
    </div>
  )
}