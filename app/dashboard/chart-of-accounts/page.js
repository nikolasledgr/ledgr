'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense']
const TYPE_COLORS = {
  asset: '#34d399',
  liability: '#f87171',
  equity: '#a78bfa',
  revenue: '#6c8eff',
  expense: '#fbbf24'
}

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState([])
  const [user, setUser] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({ code: '', name: '', type: 'expense', subtype: '', description: '' })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      setUser(user)
      const { data } = await supabase.from('accounts').select('*').eq('user_id', user.id).order('code')
      setAccounts(data || [])
    }
    load()
  }, [])

  const validate = () => {
    const e = {}
    if (!form.code.trim()) e.code = 'Required'
    if (!form.name.trim()) e.name = 'Required'
    if (accounts.some(a => a.code === form.code.trim())) e.code = 'Code already exists'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const saveAccount = async () => {
    if (!validate()) return
    setSaving(true)
    const { data, error } = await supabase.from('accounts').insert([{
      user_id: user.id,
      code: form.code.trim(),
      name: form.name.trim(),
      type: form.type,
      subtype: form.subtype.trim(),
      description: form.description.trim(),
      is_system: false
    }]).select()
    if (error) { alert('Error: ' + error.message) }
    else {
      setAccounts([...accounts, data[0]].sort((a, b) => a.code.localeCompare(b.code)))
      setForm({ code: '', name: '', type: 'expense', subtype: '', description: '' })
      setShowForm(false)
      setErrors({})
    }
    setSaving(false)
  }

  const toggleActive = async (id, is_active) => {
    await supabase.from('accounts').update({ is_active: !is_active }).eq('id', id)
    setAccounts(accounts.map(a => a.id === id ? { ...a, is_active: !is_active } : a))
  }

  const filtered = filterType === 'all' ? accounts : accounts.filter(a => a.type === filterType)
  const grouped = TYPES.reduce((acc, type) => {
    acc[type] = filtered.filter(a => a.type === type)
    return acc
  }, {})

  const s = {
    inp: (err) => ({ width: '100%', background: '#080a0f', border: `0.5px solid ${err ? '#f87171' : '#1e2030'}`, borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#e8e9ed', outline: 'none', fontFamily: 'sans-serif' }),
    th: { fontSize: '10px', color: '#444', fontWeight: '500', textAlign: 'left', padding: '12px 16px', textTransform: 'uppercase', letterSpacing: '0.7px', borderBottom: '0.5px solid #131620' },
    td: { fontSize: '13px', color: '#aaa', padding: '11px 16px', borderTop: '0.5px solid #0f1117' },
  }

  return (
    <div style={{ padding: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#e8e9ed' }}>Chart of Accounts</div>
          <div style={{ fontSize: '12px', color: '#555', marginTop: '3px' }}>{accounts.length} accounts · {accounts.filter(a => a.is_system).length} system · {accounts.filter(a => !a.is_system).length} custom</div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: '#6c8eff', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'sans-serif' }}>+ New Account</button>
      </div>

      {showForm && (
        <div style={{ background: '#0d1018', border: '0.5px solid #2e3245', borderRadius: '10px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#e8e9ed', marginBottom: '16px' }}>New Account</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div>
              <div style={{ fontSize: '11px', color: errors.code ? '#f87171' : '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '5px' }}>Account Code {errors.code && `— ${errors.code}`}</div>
              <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. 6000" style={s.inp(errors.code)} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: errors.name ? '#f87171' : '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '5px' }}>Account Name {errors.name && `— ${errors.name}`}</div>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Consulting Revenue" style={s.inp(errors.name)} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '5px' }}>Type</div>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={s.inp(false)}>
                {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '5px' }}>Subtype (optional)</div>
              <input value={form.subtype} onChange={e => setForm({ ...form, subtype: e.target.value })} placeholder="e.g. current, fixed, operating" style={s.inp(false)} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '5px' }}>Description (optional)</div>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What is this account used for?" style={s.inp(false)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button onClick={saveAccount} disabled={saving} style={{ background: saving ? '#444' : '#6c8eff', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 22px', fontSize: '13px', fontWeight: '500', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'sans-serif' }}>
              {saving ? 'Saving...' : 'Create Account'}
            </button>
            <button onClick={() => { setShowForm(false); setErrors({}) }} style={{ background: 'transparent', color: '#888', border: '0.5px solid #1e2030', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', cursor: 'pointer', fontFamily: 'sans-serif' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button onClick={() => setFilterType('all')} style={{ background: filterType === 'all' ? '#6c8eff' : 'transparent', color: filterType === 'all' ? '#fff' : '#555', border: '0.5px solid #1e2030', borderRadius: '20px', padding: '5px 14px', fontSize: '12px', cursor: 'pointer', fontFamily: 'sans-serif' }}>All ({accounts.length})</button>
        {TYPES.map(t => (
          <button key={t} onClick={() => setFilterType(t)} style={{ background: filterType === t ? TYPE_COLORS[t] + '22' : 'transparent', color: filterType === t ? TYPE_COLORS[t] : '#555', border: `0.5px solid ${filterType === t ? TYPE_COLORS[t] : '#1e2030'}`, borderRadius: '20px', padding: '5px 14px', fontSize: '12px', cursor: 'pointer', fontFamily: 'sans-serif', textTransform: 'capitalize' }}>
            {t} ({accounts.filter(a => a.type === t).length})
          </button>
        ))}
      </div>

      {/* Accounts by Type */}
      {TYPES.map(type => {
        const typeAccounts = grouped[type]
        if (typeAccounts.length === 0) return null
        return (
          <div key={type} style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: TYPE_COLORS[type], textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '600', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: TYPE_COLORS[type] }} />
              {type} accounts ({typeAccounts.length})
            </div>
            <div style={{ background: '#0d1018', border: '0.5px solid #1e2030', borderRadius: '10px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Code', 'Name', 'Subtype', 'Description', 'System', 'Status'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {typeAccounts.map(acc => (
                    <tr key={acc.id} style={{ opacity: acc.is_active ? 1 : 0.4 }}
                      onMouseEnter={e => e.currentTarget.style.background = '#0f1420'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ ...s.td, fontFamily: 'monospace', color: TYPE_COLORS[acc.type], fontWeight: '600' }}>{acc.code}</td>
                      <td style={{ ...s.td, color: '#ccc', fontWeight: '500' }}>{acc.name}</td>
                      <td style={{ ...s.td, fontSize: '11px' }}>{acc.subtype || '—'}</td>
                      <td style={{ ...s.td, fontSize: '12px', color: '#555' }}>{acc.description || '—'}</td>
                      <td style={s.td}>
                        {acc.is_system && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: '#1e2030', color: '#555' }}>System</span>}
                      </td>
                      <td style={s.td}>
                        <button onClick={() => toggleActive(acc.id, acc.is_active)}
                          style={{ fontSize: '11px', color: acc.is_active ? '#34d399' : '#555', background: 'transparent', border: 'none', cursor: acc.is_system ? 'not-allowed' : 'pointer', fontFamily: 'sans-serif' }}
                          disabled={acc.is_system}>
                          {acc.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}