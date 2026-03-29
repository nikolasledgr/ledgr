'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [user, setUser] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ description: '', category: 'Software', vendor: '', amount: '', date: '' })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      const { data } = await supabase.from('expenses').select('*').eq('user_id', user.id).order('date', { ascending: false })
      setExpenses(data || [])
    }
    load()
  }, [])

  const saveExpense = async () => {
    const { data, error } = await supabase.from('expenses').insert([{ ...form, user_id: user.id, amount: Number(form.amount) }]).select()
    if (!error) { setExpenses([data[0], ...expenses]); setShowForm(false); setForm({ description: '', category: 'Software', vendor: '', amount: '', date: '' }) }
  }

  const deleteExpense = async (id) => {
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(expenses.filter(e => e.id !== id))
  }

  const categories = ['Software', 'Payroll', 'Marketing', 'Office', 'Travel', 'Other']
  const inp = { width: '100%', background: '#080a0f', border: '0.5px solid #1e2030', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#e8e9ed', outline: 'none', fontFamily: 'sans-serif', marginTop: '6px' }

  const totalByCategory = categories.map(cat => ({
    cat,
    total: expenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0)
  })).filter(c => c.total > 0)

  return (
    <div style={{ padding: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '20px', fontWeight: '600', color: '#e8e9ed' }}>Expenses</div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: '#6c8eff', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>+ Add Expense</button>
      </div>

      {totalByCategory.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '24px' }}>
          {totalByCategory.map(c => (
            <div key={c.cat} style={{ background: '#0d1018', border: '0.5px solid #1e2030', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '6px' }}>{c.cat}</div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: '#e8e9ed', fontFamily: 'monospace' }}>€{c.total.toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{ background: '#0d1018', border: '0.5px solid #2e3245', borderRadius: '10px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#e8e9ed', marginBottom: '16px' }}>New Expense</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[['Description', 'description', 'text'], ['Amount (€)', 'amount', 'number'], ['Vendor', 'vendor', 'text'], ['Date', 'date', 'date']].map(([label, key, type]) => (
              <div key={key}>
                <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{label}</div>
                <input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} style={inp} />
              </div>
            ))}
            <div>
              <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Category</div>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inp}>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button onClick={saveExpense} style={{ background: '#6c8eff', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', cursor: 'pointer' }}>Save Expense</button>
            <button onClick={() => setShowForm(false)} style={{ background: 'transparent', color: '#888', border: '0.5px solid #1e2030', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ background: '#0d1018', border: '0.5px solid #1e2030', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['Description', 'Category', 'Vendor', 'Amount', 'Date', 'Actions'].map(h => <th key={h} style={{ fontSize: '10px', color: '#444', fontWeight: '500', textAlign: 'left', padding: '12px 18px', textTransform: 'uppercase', letterSpacing: '0.7px', borderBottom: '0.5px solid #131620' }}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '28px', color: '#444', fontSize: '13px' }}>No expenses yet — click "Add Expense" to add one</td></tr>
            ) : expenses.map(exp => (
              <tr key={exp.id}>
                <td style={{ fontSize: '13px', color: '#ccc', padding: '13px 18px', borderTop: '0.5px solid #0f1117' }}>{exp.description}</td>
                <td style={{ padding: '13px 18px', borderTop: '0.5px solid #0f1117' }}><span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: '#161b2e', color: '#6c8eff' }}>{exp.category}</span></td>
                <td style={{ fontSize: '13px', color: '#aaa', padding: '13px 18px', borderTop: '0.5px solid #0f1117' }}>{exp.vendor}</td>
                <td style={{ fontSize: '13px', color: '#aaa', padding: '13px 18px', borderTop: '0.5px solid #0f1117', fontFamily: 'monospace' }}>€{Number(exp.amount).toLocaleString()}</td>
                <td style={{ fontSize: '13px', color: '#aaa', padding: '13px 18px', borderTop: '0.5px solid #0f1117' }}>{exp.date}</td>
                <td style={{ padding: '13px 18px', borderTop: '0.5px solid #0f1117' }}><button onClick={() => deleteExpense(exp.id)} style={{ fontSize: '11px', color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer' }}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}