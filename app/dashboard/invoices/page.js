'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [user, setUser] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ client: '', amount: '', status: 'Draft', issued_date: '', due_date: '', notes: '' })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      const { data } = await supabase.from('invoices').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setInvoices(data || [])
    }
    load()
  }, [])

  const saveInvoice = async () => {
    const { data, error } = await supabase.from('invoices').insert([{ ...form, user_id: user.id, amount: Number(form.amount) }]).select()
    if (!error) { setInvoices([data[0], ...invoices]); setShowForm(false); setForm({ client: '', amount: '', status: 'Draft', issued_date: '', due_date: '', notes: '' }) }
  }

  const deleteInvoice = async (id) => {
    await supabase.from('invoices').delete().eq('id', id)
    setInvoices(invoices.filter(i => i.id !== id))
  }

  const statusColor = { Paid: '#34d399', Pending: '#fbbf24', Overdue: '#f87171', Draft: '#6c8eff' }
  const inp = { width: '100%', background: '#080a0f', border: '0.5px solid #1e2030', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#e8e9ed', outline: 'none', fontFamily: 'sans-serif', marginTop: '6px' }

  return (
    <div style={{ padding: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '20px', fontWeight: '600', color: '#e8e9ed' }}>Invoices</div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: '#6c8eff', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>+ New Invoice</button>
      </div>

      {showForm && (
        <div style={{ background: '#0d1018', border: '0.5px solid #2e3245', borderRadius: '10px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#e8e9ed', marginBottom: '16px' }}>New Invoice</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[['Client', 'client', 'text'], ['Amount (€)', 'amount', 'number'], ['Issue Date', 'issued_date', 'date'], ['Due Date', 'due_date', 'date']].map(([label, key, type]) => (
              <div key={key}>
                <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{label}</div>
                <input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} style={inp} />
              </div>
            ))}
            <div>
              <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Status</div>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inp}>
                {['Draft', 'Pending', 'Paid', 'Overdue'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Notes</div>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={inp} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button onClick={saveInvoice} style={{ background: '#6c8eff', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', cursor: 'pointer' }}>Save Invoice</button>
            <button onClick={() => setShowForm(false)} style={{ background: 'transparent', color: '#888', border: '0.5px solid #1e2030', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ background: '#0d1018', border: '0.5px solid #1e2030', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['Client', 'Amount', 'Status', 'Issued', 'Due', 'Actions'].map(h => <th key={h} style={{ fontSize: '10px', color: '#444', fontWeight: '500', textAlign: 'left', padding: '12px 18px', textTransform: 'uppercase', letterSpacing: '0.7px', borderBottom: '0.5px solid #131620' }}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '28px', color: '#444', fontSize: '13px' }}>No invoices yet — click "New Invoice" to create one</td></tr>
            ) : invoices.map(inv => (
              <tr key={inv.id}>
                <td style={{ fontSize: '13px', color: '#ccc', padding: '13px 18px', borderTop: '0.5px solid #0f1117' }}>{inv.client}</td>
                <td style={{ fontSize: '13px', color: '#aaa', padding: '13px 18px', borderTop: '0.5px solid #0f1117', fontFamily: 'monospace' }}>€{Number(inv.amount).toLocaleString()}</td>
                <td style={{ padding: '13px 18px', borderTop: '0.5px solid #0f1117' }}><span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: statusColor[inv.status] + '22', color: statusColor[inv.status] }}>{inv.status}</span></td>
                <td style={{ fontSize: '13px', color: '#aaa', padding: '13px 18px', borderTop: '0.5px solid #0f1117' }}>{inv.issued_date}</td>
                <td style={{ fontSize: '13px', color: '#aaa', padding: '13px 18px', borderTop: '0.5px solid #0f1117' }}>{inv.due_date}</td>
                <td style={{ padding: '13px 18px', borderTop: '0.5px solid #0f1117' }}><button onClick={() => deleteInvoice(inv.id)} style={{ fontSize: '11px', color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer' }}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
