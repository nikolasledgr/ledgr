'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function PL() {
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
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const grossProfit = totalRevenue - totalExpenses
  const taxRate = 0.20
  const estimatedTax = Math.max(0, grossProfit * taxRate)
  const netProfit = grossProfit - estimatedTax
  const margin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0

  const expByCategory = ['Software', 'Payroll', 'Marketing', 'Office', 'Travel', 'Other'].map(cat => ({
    cat, total: expenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0)
  })).filter(c => c.total > 0)

  const row = (label, value, color) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '0.5px solid #0f1117', fontSize: '13px' }}>
      <span style={{ color: '#888' }}>{label}</span>
      <span style={{ fontFamily: 'monospace', color: color || '#ccc' }}>{value}</span>
    </div>
  )

  const card = (children) => (
    <div style={{ background: '#0d1018', border: '0.5px solid #1e2030', borderRadius: '10px', padding: '20px' }}>{children}</div>
  )

  const sectionTitle = (t) => (
    <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>{t}</div>
  )

  return (
    <div style={{ padding: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#e8e9ed' }}>P&L Report</div>
          <div style={{ fontSize: '12px', color: '#555', marginTop: '3px' }}>All time</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {card(<>
          {sectionTitle('Revenue')}
          {row('Paid Invoices', '€' + totalRevenue.toLocaleString())}
          {row('Pending / Draft', '€' + invoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + Number(i.amount), 0).toLocaleString())}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontSize: '13px', fontWeight: '600', borderTop: '0.5px solid #2e3245', marginTop: '4px' }}>
            <span style={{ color: '#e8e9ed' }}>Total Revenue</span>
            <span style={{ fontFamily: 'monospace', color: '#34d399' }}>€{totalRevenue.toLocaleString()}</span>
          </div>
        </>)}

        {card(<>
          {sectionTitle('Expenses by category')}
          {expByCategory.length === 0 ? <div style={{ fontSize: '13px', color: '#444' }}>No expenses yet</div> : expByCategory.map(c => row(c.cat, '€' + c.total.toLocaleString()))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontSize: '13px', fontWeight: '600', borderTop: '0.5px solid #2e3245', marginTop: '4px' }}>
            <span style={{ color: '#e8e9ed' }}>Total Expenses</span>
            <span style={{ fontFamily: 'monospace', color: '#f87171' }}>€{totalExpenses.toLocaleString()}</span>
          </div>
        </>)}

        {card(<>
          {sectionTitle('Summary')}
          {row('Gross Profit', '€' + grossProfit.toLocaleString(), grossProfit >= 0 ? '#34d399' : '#f87171')}
          {row('Est. Tax (20%)', '−€' + estimatedTax.toLocaleString(), '#fbbf24')}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontSize: '13px', fontWeight: '600', borderTop: '0.5px solid #2e3245', marginTop: '4px' }}>
            <span style={{ color: '#e8e9ed' }}>Net Profit</span>
            <span style={{ fontFamily: 'monospace', color: netProfit >= 0 ? '#34d399' : '#f87171' }}>€{netProfit.toLocaleString()}</span>
          </div>
        </>)}

        {card(<>
          {sectionTitle('Net margin')}
          <div style={{ fontSize: '48px', fontWeight: '600', color: margin > 0 ? '#34d399' : '#f87171', fontFamily: 'monospace', marginBottom: '8px' }}>{margin}%</div>
          <div style={{ fontSize: '12px', color: '#555' }}>Based on paid invoices minus all expenses and estimated tax</div>
        </>)}
      </div>
    </div>
  )
}