'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const DEFAULT_CATEGORIES = [
  'Payroll & Salaries',
  'Software & Subscriptions', 
  'Marketing & Advertising',
  'Office & Rent',
  'Travel & Transport',
  'Professional Services',
  'Equipment & Hardware',
  'Banking & Finance'
]

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [user, setUser] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showCatForm, setShowCatForm] = useState(false)
  const [customCategories, setCustomCategories] = useState([])
  const [newCat, setNewCat] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    description: '',
    category: 'Software & Subscriptions',
    vendor: '',
    gross_amount: '',
    vat_rate: '0',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      setUser(user)
      const [{ data: exp }, { data: cats }] = await Promise.all([
        supabase.from('expenses').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('categories').select('*').eq('user_id', user.id).eq('type', 'expense')
      ])
      setExpenses(exp || [])
      setCustomCategories(cats || [])
    }
    load()
  }, [])

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories.map(c => c.name)]
  const gross = parseFloat(form.gross_amount) || 0
  const vatRate = parseFloat(form.vat_rate) || 0
  const netAmount = vatRate > 0 ? gross / (1 + vatRate / 100) : gross
  const vatAmount = gross - netAmount

  const validate = () => {
    const e = {}
    if (!form.description.trim()) e.description = 'Required'
    if (!form.vendor.trim()) e.vendor = 'Required'
    if (!form.gross_amount || gross <= 0) e.gross_amount = 'Enter a valid amount'
    if (!form.date) e.date = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const resetForm = () => {
    setForm({ description: '', category: 'Software & Subscriptions', vendor: '', gross_amount: '', vat_rate: '0', date: new Date().toISOString().split('T')[0], notes: '' })
    setErrors({})
    setShowForm(false)
  }

  const saveExpense = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const { data, error } = await supabase.from('expenses').insert([{
        user_id: user.id,
        description: form.description.trim(),
        category: form.category,
        vendor: form.vendor.trim(),
        amount: parseFloat(gross.toFixed(2)),
        net_amount: parseFloat(netAmount.toFixed(2)),
        vat_rate: vatRate,
        vat_amount: parseFloat(vatAmount.toFixed(2)),
        date: form.date,
        notes: form.notes.trim(),
        receipt_url: null
      }]).select()
      if (error) {
        alert('Failed to save: ' + error.message)
      } else {
        setExpenses([data[0], ...expenses])
        resetForm()
      }
    } catch (e) {
      alert('Unexpected error: ' + e.message)
    }
    setSaving(false)
  }

  const addCategory = async () => {
    if (!newCat.trim() || !user) return
    const { data, error } = await supabase.from('categories').insert([{
      user_id: user.id,
      name: newCat.trim(),
      type: 'expense'
    }]).select()
    if (!error) {
      setCustomCategories([...customCategories, data[0]])
      setNewCat('')
      setShowCatForm(false)
    }
  }

  const deleteExpense = async (id) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (!error) setExpenses(expenses.filter(e => e.id !== id))
  }

  const totalGross = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const totalNet = expenses.reduce((s, e) => s + Number(e.net_amount || e.amount || 0), 0)
  const totalVAT = expenses.reduce((s, e) => s + Number(e.vat_amount || 0), 0)

  const catTotals = allCategories.map(cat => ({
    cat,
    total: expenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount || 0), 0)
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  const s = {
    page: { padding: '28px' },
    label: (err) => ({ fontSize: '11px', color: err ? '#f87171' : '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '4px', display: 'block' }),
    input: (err) => ({ width: '100%', background: '#080a0f', border: `0.5px solid ${err ? '#f87171' : '#1e2030'}`, borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#e8e9ed', outline: 'none', fontFamily: 'sans-serif' }),
    card: { background: '#0d1018', border: '0.5px solid #1e2030', borderRadius: '10px', padding: '20px' },
    th: { fontSize: '10px', color: '#444', fontWeight: '500', textAlign: 'left', padding: '12px 18px', textTransform: 'uppercase', letterSpacing: '0.7px', borderBottom: '0.5px solid #131620' },
    td: { fontSize: '13px', color: '#aaa', padding: '13px 18px', borderTop: '0.5px solid #0f1117' },
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#e8e9ed' }}>Expenses</div>
          <div style={{ fontSize: '12px', color: '#555', marginTop: '3px' }}>{expenses.length} total expense{expenses.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowCatForm(!showCatForm)} style={{ background: 'transparent', color: '#888', border: '0.5px solid #1e2030', borderRadius: '8px', padding: '9px 14px', fontSize: '13px', cursor: 'pointer', fontFamily: 'sans-serif' }}>+ Category</button>
          <button onClick={() => setShowForm(!showForm)} style={{ background: '#6c8eff', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'sans-serif' }}>+ Add Expense</button>
        </div>
      </div>

      {/* Add Category */}
      {showCatForm && (
        <div style={{ ...s.card, marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()}
            placeholder="New category name..."
            style={{ ...s.input(false), flex: 1 }}
          />
          <button onClick={addCategory} style={{ background: '#6c8eff', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'sans-serif', whiteSpace: 'nowrap' }}>Add</button>
          <button onClick={() => setShowCatForm(false)} style={{ background: 'transparent', color: '#888', border: '0.5px solid #1e2030', borderRadius: '8px', padding: '9px 14px', fontSize: '13px', cursor: 'pointer', fontFamily: 'sans-serif' }}>Cancel</button>
        </div>
      )}

      {/* KPI Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Total Gross', value: `€${totalGross.toFixed(2)}`, color: '#e8e9ed' },
          { label: 'Total Net', value: `€${totalNet.toFixed(2)}`, color: '#34d399' },
          { label: 'Total VAT', value: `€${totalVAT.toFixed(2)}`, color: '#fbbf24' },
        ].map(k => (
          <div key={k.label} style={{ background: '#0d1018', border: '0.5px solid #1e2030', borderRadius: '10px', padding: '16px 20px' }}>
            <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '8px' }}>{k.label}</div>
            <div style={{ fontSize: '22px', fontWeight: '600', fontFamily: 'monospace', color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Category Breakdown */}
      {catTotals.length > 0 && (
        <div style={{ ...s.card, marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '14px' }}>Spend by category</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {catTotals.map(c => (
              <div key={c.cat}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#aaa' }}>{c.cat}</span>
                  <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#ccc' }}>€{c.total.toFixed(2)} <span style={{ color: '#555' }}>({totalGross > 0 ? ((c.total / totalGross) * 100).toFixed(1) : 0}%)</span></span>
                </div>
                <div style={{ height: '4px', background: '#1e2030', borderRadius: '2px' }}>
                  <div style={{ height: '100%', borderRadius: '2px', background: '#6c8eff', width: `${totalGross > 0 ? (c.total / totalGross) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Expense Form */}
      {showForm && (
        <div style={{ ...s.card, border: '0.5px solid #2e3245', marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#e8e9ed', marginBottom: '20px' }}>New Expense</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={s.label(errors.description)}>Description{errors.description && <span style={{ color: '#f87171' }}> — {errors.description}</span>}</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Monthly AWS bill" style={s.input(errors.description)} />
            </div>
            <div>
              <label style={s.label(errors.vendor)}>Vendor{errors.vendor && <span style={{ color: '#f87171' }}> — {errors.vendor}</span>}</label>
              <input value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} placeholder="e.g. Amazon" style={s.input(errors.vendor)} />
            </div>
            <div>
              <label style={s.label(errors.gross_amount)}>Gross Amount (€){errors.gross_amount && <span style={{ color: '#f87171' }}> — {errors.gross_amount}</span>}</label>
              <input type="number" min="0" step="0.01" value={form.gross_amount} onChange={e => setForm({ ...form, gross_amount: e.target.value })} placeholder="0.00" style={s.input(errors.gross_amount)} />
            </div>
            <div>
              <label style={s.label(false)}>VAT Rate (%)</label>
              <input type="number" min="0" max="100" step="0.1" value={form.vat_rate} onChange={e => setForm({ ...form, vat_rate: e.target.value })} placeholder="0" style={s.input(false)} />
            </div>

            {gross > 0 && (
              <div style={{ gridColumn: 'span 2', background: '#080a0f', border: '0.5px solid #1e2030', borderRadius: '8px', padding: '14px 18px', display: 'flex', gap: '32px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '5px' }}>Net Amount</div>
                  <div style={{ fontSize: '16px', fontFamily: 'monospace', color: '#34d399' }}>€{netAmount.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '5px' }}>VAT Amount</div>
                  <div style={{ fontSize: '16px', fontFamily: 'monospace', color: '#fbbf24' }}>€{vatAmount.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '5px' }}>Gross Total</div>
                  <div style={{ fontSize: '16px', fontFamily: 'monospace', color: '#e8e9ed' }}>€{gross.toFixed(2)}</div>
                </div>
              </div>
            )}

            <div>
              <label style={s.label(false)}>Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={s.input(false)}>
                <optgroup label="Default">
                  {DEFAULT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </optgroup>
                {customCategories.length > 0 && (
                  <optgroup label="Custom">
                    {customCategories.map(c => <option key={c.id}>{c.name}</option>)}
                  </optgroup>
                )}
              </select>
            </div>
            <div>
              <label style={s.label(errors.date)}>Date{errors.date && <span style={{ color: '#f87171' }}> — {errors.date}</span>}</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={s.input(errors.date)} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={s.label(false)}>Notes (optional)</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any additional details..." style={s.input(false)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button onClick={saveExpense} disabled={saving} style={{ background: saving ? '#444' : '#6c8eff', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 22px', fontSize: '13px', fontWeight: '500', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'sans-serif' }}>
              {saving ? 'Saving...' : 'Save Expense'}
            </button>
            <button onClick={resetForm} style={{ background: 'transparent', color: '#888', border: '0.5px solid #1e2030', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', cursor: 'pointer', fontFamily: 'sans-serif' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Expenses Table */}
      <div style={{ background: '#0d1018', border: '0.5px solid #1e2030', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Date', 'Description', 'Category', 'Vendor', 'Net', 'VAT', 'Gross', ''].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#444', fontSize: '13px' }}>
                  No expenses yet — click "+ Add Expense" to get started
                </td>
              </tr>
            ) : expenses.map(exp => (
              <tr key={exp.id} style={{ transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = '#0f1420'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ ...s.td, color: '#666', minWidth: '100px' }}>{exp.date}</td>
                <td style={{ ...s.td, color: '#ccc', fontWeight: '500' }}>{exp.description}</td>
                <td style={{ ...s.td }}>
                  <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: '#161b2e', color: '#6c8eff', whiteSpace: 'nowrap' }}>{exp.category}</span>
                </td>
                <td style={s.td}>{exp.vendor}</td>
                <td style={{ ...s.td, fontFamily: 'monospace', color: '#34d399' }}>€{Number(exp.net_amount || exp.amount).toFixed(2)}</td>
                <td style={{ ...s.td, fontFamily: 'monospace', color: '#fbbf24' }}>€{Number(exp.vat_amount || 0).toFixed(2)}</td>
                <td style={{ ...s.td, fontFamily: 'monospace', color: '#e8e9ed', fontWeight: '500' }}>€{Number(exp.amount).toFixed(2)}</td>
                <td style={{ ...s.td }}>
                  <button onClick={() => deleteExpense(exp.id)} style={{ fontSize: '11px', color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'sans-serif' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
          {expenses.length > 0 && (
            <tfoot>
              <tr style={{ background: '#080a0f' }}>
                <td colSpan={4} style={{ padding: '12px 18px', fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', borderTop: '0.5px solid #2e3245' }}>Totals</td>
                <td style={{ padding: '12px 18px', fontFamily: 'monospace', fontSize: '13px', color: '#34d399', fontWeight: '600', borderTop: '0.5px solid #2e3245' }}>€{totalNet.toFixed(2)}</td>
                <td style={{ padding: '12px 18px', fontFamily: 'monospace', fontSize: '13px', color: '#fbbf24', fontWeight: '600', borderTop: '0.5px solid #2e3245' }}>€{totalVAT.toFixed(2)}</td>
                <td style={{ padding: '12px 18px', fontFamily: 'monospace', fontSize: '13px', color: '#e8e9ed', fontWeight: '600', borderTop: '0.5px solid #2e3245' }}>€{totalGross.toFixed(2)}</td>
                <td style={{ borderTop: '0.5px solid #2e3245' }} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}