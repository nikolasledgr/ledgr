'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const TRANSACTION_TYPES = ['invoice', 'payment', 'expense', 'transfer', 'journal', 'tax', 'other']
const TYPE_COLORS = {
  invoice: { bg: '#0d1428', color: '#6c8eff' },
  payment: { bg: '#0d2a1e', color: '#34d399' },
  expense: { bg: '#2a0d0d', color: '#f87171' },
  transfer: { bg: '#1a1a2e', color: '#a78bfa' },
  journal: { bg: '#1a1208', color: '#fbbf24' },
  tax: { bg: '#2a1a0d', color: '#fb923c' },
  other: { bg: '#1a1a1a', color: '#888' }
}
const STATUS_COLORS = {
  draft: '#555',
  posted: '#34d399',
  reconciled: '#6c8eff',
  void: '#f87171'
}

export default function Ledger() {
  const [transactions, setTransactions] = useState([])
  const [accounts, setAccounts] = useState([])
  const [user, setUser] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [journalLines, setJournalLines] = useState([])
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    type: 'other',
    reference: '',
    notes: '',
    status: 'posted'
  })
  const [entries, setEntries] = useState([
    { id: 1, account_id: '', debit: '', credit: '', description: '' },
    { id: 2, account_id: '', debit: '', credit: '', description: '' }
  ])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      setUser(user)
      const [{ data: txns }, { data: accs }] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('accounts').select('*').eq('user_id', user.id).eq('is_active', true).order('code')
      ])
      setTransactions(txns || [])
      setAccounts(accs || [])
    }
    load()
  }, [])

  const totalDebits = entries.reduce((s, e) => s + (parseFloat(e.debit) || 0), 0)
  const totalCredits = entries.reduce((s, e) => s + (parseFloat(e.credit) || 0), 0)
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01

  const validate = () => {
    const e = {}
    if (!form.description.trim()) e.description = 'Required'
    if (!form.date) e.date = 'Required'
    const validEntries = entries.filter(en => en.account_id && (parseFloat(en.debit) > 0 || parseFloat(en.credit) > 0))
    if (validEntries.length < 2) e.entries = 'At least 2 journal entries required'
    if (!isBalanced) e.balance = 'Debits must equal credits'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const saveTransaction = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const total = totalDebits
      const { data: txnData, error: txnError } = await supabase.from('transactions').insert([{
        user_id: user.id,
        date: form.date,
        description: form.description.trim(),
        reference: form.reference.trim(),
        type: form.type,
        status: form.status,
        notes: form.notes.trim(),
        total_amount: total
      }]).select()
      if (txnError) { alert('Error: ' + txnError.message); setSaving(false); return }
      const txnId = txnData[0].id
      const validEntries = entries.filter(en => en.account_id && (parseFloat(en.debit) > 0 || parseFloat(en.credit) > 0))
      await supabase.from('journal_entries').insert(validEntries.map(en => ({
        transaction_id: txnId,
        account_id: en.account_id,
        debit: parseFloat(en.debit) || 0,
        credit: parseFloat(en.credit) || 0,
        description: en.description || form.description
      })))
      setTransactions([txnData[0], ...transactions])
      resetForm()
    } catch (e) {
      alert('Error: ' + e.message)
    }
    setSaving(false)
  }

  const loadJournalEntries = async (txnId) => {
    if (expanded === txnId) { setExpanded(null); return }
    const { data } = await supabase.from('journal_entries').select('*, accounts(code, name, type)').eq('transaction_id', txnId)
    setJournalLines(data || [])
    setExpanded(txnId)
  }

  const voidTransaction = async (id) => {
    if (!confirm('Void this transaction? This cannot be undone.')) return
    await supabase.from('transactions').update({ status: 'void' }).eq('id', id)
    setTransactions(transactions.map(t => t.id === id ? { ...t, status: 'void' } : t))
  }

  const resetForm = () => {
    setForm({ date: new Date().toISOString().split('T')[0], description: '', type: 'other', reference: '', notes: '', status: 'posted' })
    setEntries([
      { id: 1, account_id: '', debit: '', credit: '', description: '' },
      { id: 2, account_id: '', debit: '', credit: '', description: '' }
    ])
    setErrors({})
    setShowForm(false)
  }

  const updateEntry = (id, field, value) => setEntries(entries.map(e => e.id === id ? { ...e, [field]: value } : e))
  const addEntry = () => setEntries([...entries, { id: Date.now(), account_id: '', debit: '', credit: '', description: '' }])
  const removeEntry = (id) => entries.length > 2 && setEntries(entries.filter(e => e.id !== id))

  const filtered = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    return true
  })

  const totalPosted = transactions.filter(t => t.status === 'posted' || t.status === 'reconciled').reduce((s, t) => s + Number(t.total_amount || 0), 0)

  const s = {
    inp: (err) => ({ width: '100%', background: '#080a0f', border: `0.5px solid ${err ? '#f87171' : '#1e2030'}`, borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#e8e9ed', outline: 'none', fontFamily: 'sans-serif' }),
    th: { fontSize: '10px', color: '#444', fontWeight: '500', textAlign: 'left', padding: '12px 16px', textTransform: 'uppercase', letterSpacing: '0.7px', borderBottom: '0.5px solid #131620' },
    td: { fontSize: '13px', color: '#aaa', padding: '12px 16px', borderTop: '0.5px solid #0f1117' },
  }

  return (
    <div style={{ padding: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#e8e9ed' }}>Transaction Ledger</div>
          <div style={{ fontSize: '12px', color: '#555', marginTop: '3px' }}>{transactions.length} transactions · Total posted: €{totalPosted.toFixed(2)}</div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: '#6c8eff', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'sans-serif' }}>+ New Transaction</button>
      </div>

      {/* New Transaction Form */}
      {showForm && (
        <div style={{ background: '#0d1018', border: '0.5px solid #2e3245', borderRadius: '10px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#e8e9ed', marginBottom: '20px' }}>New Journal Entry</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '11px', color: errors.date ? '#f87171' : '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '5px' }}>Date</div>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={s.inp(errors.date)} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: errors.description ? '#f87171' : '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '5px' }}>Description {errors.description && `— ${errors.description}`}</div>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Monthly rent payment" style={s.inp(errors.description)} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '5px' }}>Reference</div>
              <input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="e.g. INV-0001, Receipt #123" style={s.inp(false)} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '5px' }}>Type</div>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={s.inp(false)}>
                {TRANSACTION_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '5px' }}>Status</div>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={s.inp(false)}>
                {['draft', 'posted'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '5px' }}>Notes</div>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." style={s.inp(false)} />
            </div>
          </div>

          {/* Journal Entries */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: errors.entries || errors.balance ? '#f87171' : '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px' }}>
              Journal Entries {errors.entries && `— ${errors.entries}`} {errors.balance && `— ${errors.balance}`}
            </div>
            <div style={{ background: '#080a0f', border: `0.5px solid ${errors.balance ? '#f87171' : '#1e2030'}`, borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Account', 'Description', 'Debit (€)', 'Credit (€)', ''].map(h => (
                      <th key={h} style={{ ...s.th, background: '#080a0f', padding: '10px 12px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => (
                    <tr key={entry.id}>
                      <td style={{ padding: '8px', borderTop: '0.5px solid #131620', width: '35%' }}>
                        <select value={entry.account_id} onChange={e => updateEntry(entry.id, 'account_id', e.target.value)} style={{ ...s.inp(false), padding: '7px 10px' }}>
                          <option value="">Select account...</option>
                          {['asset', 'liability', 'equity', 'revenue', 'expense'].map(type => (
                            <optgroup key={type} label={type.toUpperCase()}>
                              {accounts.filter(a => a.type === type).map(a => (
                                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '8px', borderTop: '0.5px solid #131620', width: '25%' }}>
                        <input value={entry.description} onChange={e => updateEntry(entry.id, 'description', e.target.value)} placeholder="Optional..." style={{ ...s.inp(false), padding: '7px 10px' }} />
                      </td>
                      <td style={{ padding: '8px', borderTop: '0.5px solid #131620', width: '15%' }}>
                        <input type="number" min="0" step="0.01" value={entry.debit} onChange={e => updateEntry(entry.id, 'debit', e.target.value)} placeholder="0.00" style={{ ...s.inp(false), padding: '7px 10px' }} />
                      </td>
                      <td style={{ padding: '8px', borderTop: '0.5px solid #131620', width: '15%' }}>
                        <input type="number" min="0" step="0.01" value={entry.credit} onChange={e => updateEntry(entry.id, 'credit', e.target.value)} placeholder="0.00" style={{ ...s.inp(false), padding: '7px 10px' }} />
                      </td>
                      <td style={{ padding: '8px', borderTop: '0.5px solid #131620' }}>
                        <button onClick={() => removeEntry(entry.id)} style={{ fontSize: '11px', color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#080a0f' }}>
                    <td colSpan={2} style={{ padding: '10px 12px', fontSize: '11px', color: '#555', borderTop: '0.5px solid #2e3245' }}>Totals</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '13px', color: '#34d399', borderTop: '0.5px solid #2e3245' }}>€{totalDebits.toFixed(2)}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '13px', color: '#34d399', borderTop: '0.5px solid #2e3245' }}>€{totalCredits.toFixed(2)}</td>
                    <td style={{ borderTop: '0.5px solid #2e3245' }}>
                      {entries.some(e => e.account_id) && (
                        <span style={{ fontSize: '11px', color: isBalanced ? '#34d399' : '#f87171' }}>{isBalanced ? '✓' : '✗'}</span>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <button onClick={addEntry} style={{ marginTop: '8px', background: 'transparent', color: '#6c8eff', border: '0.5px solid #1e2030', borderRadius: '6px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: 'sans-serif' }}>+ Add Line</button>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={saveTransaction} disabled={saving} style={{ background: saving ? '#444' : '#6c8eff', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 22px', fontSize: '13px', fontWeight: '500', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'sans-serif' }}>
              {saving ? 'Saving...' : 'Post Transaction'}
            </button>
            <button onClick={resetForm} style={{ background: 'transparent', color: '#888', border: '0.5px solid #1e2030', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', cursor: 'pointer', fontFamily: 'sans-serif' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button onClick={() => setFilterType('all')} style={{ background: filterType === 'all' ? '#6c8eff' : 'transparent', color: filterType === 'all' ? '#fff' : '#555', border: '0.5px solid #1e2030', borderRadius: '20px', padding: '5px 14px', fontSize: '12px', cursor: 'pointer', fontFamily: 'sans-serif' }}>All</button>
        {TRANSACTION_TYPES.map(t => (
          <button key={t} onClick={() => setFilterType(t)} style={{ background: filterType === t ? TYPE_COLORS[t].bg : 'transparent', color: filterType === t ? TYPE_COLORS[t].color : '#555', border: `0.5px solid ${filterType === t ? TYPE_COLORS[t].color : '#1e2030'}`, borderRadius: '20px', padding: '5px 14px', fontSize: '12px', cursor: 'pointer', fontFamily: 'sans-serif', textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {/* Transactions Table */}
      <div style={{ background: '#0d1018', border: '0.5px solid #1e2030', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Date', 'Description', 'Reference', 'Type', 'Amount', 'Status', ''].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#444', fontSize: '13px' }}>
                  No transactions yet — click "+ New Transaction" to create your first journal entry
                </td>
              </tr>
            ) : filtered.map(txn => (
              <>
                <tr key={txn.id} onClick={() => loadJournalEntries(txn.id)}
                  style={{ cursor: 'pointer', opacity: txn.status === 'void' ? 0.4 : 1 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#0f1420'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...s.td, color: '#666' }}>{txn.date}</td>
                  <td style={{ ...s.td, color: '#ccc', fontWeight: '500' }}>
                    {txn.description}
                    {txn.notes && <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{txn.notes}</div>}
                  </td>
                  <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '11px', color: '#555' }}>{txn.reference || '—'}</td>
                  <td style={s.td}>
                    <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: TYPE_COLORS[txn.type]?.bg, color: TYPE_COLORS[txn.type]?.color, textTransform: 'capitalize' }}>{txn.type}</span>
                  </td>
                  <td style={{ ...s.td, fontFamily: 'monospace', color: '#e8e9ed', fontWeight: '500' }}>€{Number(txn.total_amount || 0).toFixed(2)}</td>
                  <td style={s.td}>
                    <span style={{ fontSize: '11px', color: STATUS_COLORS[txn.status] || '#555', textTransform: 'capitalize' }}>{txn.status}</span>
                  </td>
                  <td style={s.td}>
                    {txn.status !== 'void' && (
                      <button onClick={e => { e.stopPropagation(); voidTransaction(txn.id) }} style={{ fontSize: '11px', color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'sans-serif' }}>Void</button>
                    )}
                  </td>
                </tr>
                {expanded === txn.id && journalLines.length > 0 && (
                  <tr key={txn.id + '_detail'}>
                    <td colSpan={7} style={{ padding: '0', background: '#080a0f', borderTop: '0.5px solid #0f1117' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            {['Account', 'Description', 'Debit', 'Credit'].map(h => (
                              <th key={h} style={{ fontSize: '10px', color: '#333', fontWeight: '500', textAlign: 'left', padding: '8px 16px', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {journalLines.map(line => (
                            <tr key={line.id}>
                              <td style={{ padding: '7px 16px', fontSize: '12px', color: '#555' }}>
                                <span style={{ fontFamily: 'monospace', marginRight: '8px' }}>{line.accounts?.code}</span>
                                {line.accounts?.name}
                              </td>
                              <td style={{ padding: '7px 16px', fontSize: '12px', color: '#555' }}>{line.description}</td>
                              <td style={{ padding: '7px 16px', fontSize: '12px', fontFamily: 'monospace', color: line.debit > 0 ? '#34d399' : '#333' }}>
                                {line.debit > 0 ? `€${Number(line.debit).toFixed(2)}` : '—'}
                              </td>
                              <td style={{ padding: '7px 16px', fontSize: '12px', fontFamily: 'monospace', color: line.credit > 0 ? '#f87171' : '#333' }}>
                                {line.credit > 0 ? `€${Number(line.credit).toFixed(2)}` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}