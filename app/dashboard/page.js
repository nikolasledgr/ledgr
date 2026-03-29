'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Dashboard() {
  const [invoices, setInvoices] = useState([])
  const [expenses, setExpenses] = useState([])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: inv } = await supabase.from('invoices').select('*').eq('user_id', user.id)
      const { data: exp } = await supabase.from('expenses').select('*').eq('user_id', user.id)
      setInvoices(inv || [])
      setExpenses(exp || [])
    }
    load()
  }, [])

  const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + Number(i.amount), 0)
  const outstanding = invoices.filter(i => i.status === 'Pending' || i.status === 'Overdue').reduce((s, i) => s + Number(i.amount), 0)
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const netProfit = totalRevenue - totalExpenses

  const kpis = [
    { label: 'Total Revenue', value: '€' + totalRevenue.toLocaleString() },
    { label: 'Outstanding', value: '€' + outstanding.toLocaleString() },
    { label: 'Total Expenses', value: '€' + totalExpenses.toLocaleString() },
    { label: 'Net Profit', value: '€' + netProfit.toLocaleString() },
  ]

  const statusColor = { Paid: '#34d399', Pending: '#fbbf24', Overdue: '#f87171', Draft: '#6c8eff' }

  return (
    <div style={{padding:'28px'}}>
      <div style={{fontSize:'20px',fontWeight:'600',color:'#e8e9ed',marginBottom:'24px'}}>Dashboard</div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'16px',marginBottom:'28px'}}>
        {kpis.map(k => (
          <div key={k.label} style={{background:'#0d1018',border:'0.5px solid #1e2030',borderRadius:'10px',padding:'18px 20px'}}>
            <div style={{fontSize:'11px',color:'#555',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'8px'}}>{k.label}</div>
            <div style={{fontSize:'24px',fontWeight:'600',color:'#e8e9ed',fontFamily:'monospace'}}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{background:'#0d1018',border:'0.5px solid #1e2030',borderRadius:'10px',padding:'20px'}}>
        <div style={{fontSize:'13px',color:'#888',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'14px'}}>Recent Invoices</div>
        {invoices.length === 0 ? (
          <div style={{fontSize:'13px',color:'#444',textAlign:'center',padding:'20px 0'}}>No invoices yet — <a href="/dashboard/invoices" style={{color:'#6c8eff'}}>create your first one</a></div>
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr>{['Client','Amount','Status','Due Date'].map(h => <th key={h} style={{fontSize:'10px',color:'#444',fontWeight:'500',textAlign:'left',padding:'0 0 10px',textTransform:'uppercase',letterSpacing:'0.7px'}}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {invoices.slice(0,5).map(inv => (
                <tr key={inv.id}>
                  <td style={{fontSize:'13px',color:'#ccc',padding:'10px 0',borderTop:'0.5px solid #131620'}}>{inv.client}</td>
                  <td style={{fontSize:'13px',color:'#aaa',padding:'10px 0',borderTop:'0.5px solid #131620',fontFamily:'monospace'}}>€{Number(inv.amount).toLocaleString()}</td>
                  <td style={{padding:'10px 0',borderTop:'0.5px solid #131620'}}><span style={{fontSize:'11px',padding:'3px 10px',borderRadius:'20px',background:statusColor[inv.status]+'22',color:statusColor[inv.status]}}>{inv.status}</span></td>
                  <td style={{fontSize:'13px',color:'#aaa',padding:'10px 0',borderTop:'0.5px solid #131620'}}>{inv.due_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}