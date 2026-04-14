'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../../lib/supabase'

export default function Bank() {
  const [user, setUser] = useState(null)
  const [bankAccounts, setBankAccounts] = useState([])
  const [bankTransactions, setBankTransactions] = useState([])
  const [accounts, setAccounts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(null)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [csvPreview, setCsvPreview] = useState(null)
  const [columnMap, setColumnMap] = useState({ date: '', description: '', amount: '', type: '' })
  const [selectedBank, setSelectedBank] = useState(null)
  const [matchingTxn, setMatchingTxn] = useState(null)
  const fileRef = useRef(null)
  const [form, setForm] = useState({ name: '', bank_name: '', account_number: '', currency: 'EUR', opening_balance: '0' })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      setUser(user)
      const [{ data: ba }, { data: bt }, { data: accs }] = await Promise.all([
        supabase.from('bank_accounts').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('bank_transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('accounts').select('*').eq('user_id', user.id).eq('is_active', true).order('code')
      ])
      setBankAccounts(ba || [])
      setBankTransactions(bt || [])
      setAccounts(accs || [])
    }
    load()
  }, [])

  const saveAccount = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('bank_accounts').insert([{
      user_id: user.id,
      name: form.name.trim(),
      bank_name: form.bank_name.trim(),
      account_number: form.account_number.trim(),
      currency: form.currency,
      opening_balance: parseFloat(form.opening_balance) || 0,
      current_balance: parseFloat(form.opening_balance) || 0
    }]).select()
    if (!error) {
      setBankAccounts([...bankAccounts, data[0]])
      setForm({ name: '', bank_name: '', account_number: '', currency: 'EUR', opening_balance: '0' })
      setShowForm(false)
    }
    setSaving(false)
  }

  const parseCSV = (text) => {
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const rows = lines.slice(1).map(line => {
      const vals = []
      let current = ''
      let inQuotes = false
      for (const char of line) {
        if (char === '"') inQuotes = !inQuotes
        else if (char === ',' && !inQuotes) { vals.push(current.trim()); current = '' }
        else current += char
      }
      vals.push(current.trim())
      return headers.reduce((obj, h, i) => ({ ...obj, [h]: vals[i] || '' }), {})
    }).filter(r => Object.values(r).some(v => v))
    return { headers, rows }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const { headers, rows } = parseCSV(evt.target.result)
        setCsvPreview({ headers, rows: rows.slice(0, 5), allRows: rows })
        // Auto-detect columns
        const autoMap = { date: '', description: '', amount: '', type: '' }
        headers.forEach(h => {
          const lower = h.toLowerCase()
          if (!autoMap.date && (lower.includes('date') || lower.includes('time'))) autoMap.date = h
          if (!autoMap.description && (lower.includes('desc') || lower.includes('narr') || lower.includes('detail') || lower.includes('ref') || lower.includes('memo'))) autoMap.description = h
          if (!autoMap.amount && (lower.includes('amount') || lower.includes('amt') || lower.includes('value'))) autoMap.amount = h
          if (!autoMap.type && (lower.includes('type') || lower.includes('cr/dr') || lower.includes('debit') || lower.includes('credit'))) autoMap.type = h
        })
        setColumnMap(autoMap)
      } catch (e) {
        alert('Could not parse CSV file. Please check the format.')
      }
    }
    reader.readAsText(file)
  }

  const importTransactions = async () => {
    if (!csvPreview || !columnMap.date || !columnMap.amount) {
      alert('Please map at least the Date and Amount columns')
      return
    }
    setImporting(true)
    const toInsert = []
    for (const row of csvPreview.allRows) {
      const dateVal = row[columnMap.date]
      const amtVal = row[columnMap.amount]
      const descVal = columnMap.description ? row[columnMap.description] : ''
      if (!dateVal || !amtVal) continue
      const amount = parseFloat(amtVal.replace(/[^0-9.-]/g, ''))
      if (isNaN(amount)) continue
      // Parse date
      let parsedDate = null
      const dateParts = dateVal.replace(/\//g, '-').split('-')
      if (dateParts.length === 3) {
        if (dateParts[2].length === 4) parsedDate = `${dateParts[2]}-${dateParts[1].padStart(2,'0')}-${dateParts[0].padStart(2,'0')}`
        else parsedDate = dateVal.replace(/\//g, '-')
      }
      if (!parsedDate) continue
      toInsert.push({
        bank_account_id: selectedBank,
        user_id: user.id,
        date: parsedDate,
        description: descVal,
        amount: Math.abs(amount),
        type: amount >= 0 ? 'credit' : 'debit',
        is_matched: false
      })
    }
    if (toInsert.length === 0) { alert('No valid transactions found'); setImporting(false); return }
    const { data, error } = await supabase.from('bank_transactions').insert(toInsert).select()
    if (error) { alert('Import failed: ' + error.message); setImporting(false); return }
    setBankTransactions([...(data || []), ...bankTransactions])
    setCsvPreview(null)
    setShowImport(null)
    setImporting(false)
    alert(`Successfully imported ${toInsert.length} transactions!`)
  }

  const matchTransaction = async (btId, txnId) => {
    await supabase.from('bank_transactions').update({ matched_transaction_id: txnId, is_matched: true }).eq('id', btId)
    setBankTransactions(bankTransactions.map(bt => bt.id === btId ? { ...bt, is_matched: true, matched_transaction_id: txnId } : bt))
    setMatchingTxn(null)
  }

  const createAndMatch = async (bt) => {
    const account = accounts.find(a => a.code === '1000')
    if (!account) return
    const { data: txnData } = await supabase.from('transactions').insert([{
      user_id: user.id,
      date: bt.date,
      description: bt.description || 'Bank transaction',
      type: bt.type === 'credit' ? 'payment' : 'expense',
      status: 'posted',
      total_amount: bt.amount
    }]).select()
    if (txnData) await matchTransaction(bt.id, txnData[0].id)
  }

  const inp = { width: '100%', background: '#080a0f', border: '0.5px solid #1e2030', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#e8e9ed', outline: 'none', fontFamily: 'sans-serif' }
  const s = {
    th: { fontSize: '10px', color: '#444', fontWeight: '500', textAlign: 'left', padding: '12px 16px', textTransform: 'uppercase', letterSpacing: '0.7px', borderBottom: '0.5px solid #131620' },
    td: { fontSize: '13px', color: '#aaa', padding: '11px 16px', borderTop: '0.5px solid #0f1117' },
  }

  const unmatched = bankTransactions.filter(bt => !bt.is_matched)
  const matched = bankTransactions.filter(bt => bt.is_matched)

  return (
    <div style={{ padding: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#e8e9ed' }}>Bank Accounts</div>
          <div style={{ fontSize: '12px', color: '#555', marginTop: '3px' }}>{bankTransactions.length} imported transactions · {unmatched.length} unmatched</div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: '#6c8eff', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'sans-serif' }}>+ Add Bank Account</button>
      </div>

      {/* Add Bank Account Form */}
      {showForm && (
        <div style={{ background: '#0d1018', border: '0.5px solid #2e3245', borderRadius: '10px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#e8e9ed', marginBottom: '16px' }}>New Bank Account</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            {[['Account Name', 'name', 'e.g. Main Business Account'], ['Bank Name', 'bank_name', 'e.g. Bank of Cyprus'], ['Account Number', 'account_number', 'e.g. CY12 0020 0195']].map(([label, key, placeholder]) => (
              <div key={key}>
                <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '5px' }}>{label}</div>
                <input value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} style={inp} />
              </div>
            ))}
            <div>
              <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '5px' }}>Currency</div>
              <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} style={inp}>
                {['EUR', 'USD', 'GBP', 'CHF'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '5px' }}>Opening Balance</div>
              <input type="number" value={form.opening_balance} onChange={e => setForm({ ...form, opening_balance: e.target.value })} style={inp} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button onClick={saveAccount} disabled={saving} style={{ background: '#6c8eff', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 22px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              {saving ? 'Saving...' : 'Save Account'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ background: 'transparent', color: '#888', border: '0.5px solid #1e2030', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', cursor: 'pointer', fontFamily: 'sans-serif' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Bank Accounts Grid */}
      {bankAccounts.length === 0 ? (
        <div style={{ background: '#0d1018', border: '0.5px solid #1e2030', borderRadius: '10px', padding: '40px', textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', color: '#444', marginBottom: '8px' }}>No bank accounts yet</div>
          <div style={{ fontSize: '12px', color: '#333' }}>Add a bank account to start importing transactions</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '24px' }}>
          {bankAccounts.map(ba => (
            <div key={ba.id} style={{ background: '#0d1018', border: '0.5px solid #1e2030', borderRadius: '10px', padding: '18px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#e8e9ed', marginBottom: '4px' }}>{ba.name}</div>
              <div style={{ fontSize: '12px', color: '#555', marginBottom: '12px' }}>{ba.bank_name} {ba.account_number && `· ${ba.account_number}`}</div>
              <div style={{ fontSize: '20px', fontWeight: '600', fontFamily: 'monospace', color: '#34d399', marginBottom: '12px' }}>
                {ba.currency} {Number(ba.current_balance || 0).toFixed(2)}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setSelectedBank(ba.id); setShowImport(ba.id); setCsvPreview(null) }}
                  style={{ flex: 1, background: '#161b2e', color: '#6c8eff', border: '0.5px solid #6c8eff', borderRadius: '6px', padding: '7px', fontSize: '12px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  Import CSV
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CSV Import */}
      {showImport && (
        <div style={{ background: '#0d1018', border: '0.5px solid #2e3245', borderRadius: '10px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#e8e9ed', marginBottom: '16px' }}>Import Bank Transactions</div>
          <div style={{ background: '#080a0f', border: '0.5px solid #1e2030', borderRadius: '8px', padding: '16px', marginBottom: '16px', fontSize: '12px', color: '#555', lineHeight: '1.6' }}>
            <strong style={{ color: '#888' }}>How to export from your bank:</strong><br />
            Log into your online banking → Statements or Transaction History → Export/Download → Select CSV format → Choose date range → Download
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '8px' }}>Upload CSV File</div>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFileUpload}
              style={{ background: '#080a0f', border: '0.5px solid #1e2030', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#e8e9ed', fontFamily: 'sans-serif', width: '100%' }} />
          </div>

          {csvPreview && (
            <>
              <div style={{ fontSize: '11px', color: '#34d399', marginBottom: '16px' }}>
                ✓ Detected {csvPreview.allRows.length} transactions · Showing first 5 rows
              </div>

              <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px' }}>Map Columns</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                {[['Date *', 'date'], ['Description', 'description'], ['Amount *', 'amount'], ['Type (CR/DR)', 'type']].map(([label, key]) => (
                  <div key={key}>
                    <div style={{ fontSize: '11px', color: key === 'date' || key === 'amount' ? '#6c8eff' : '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '5px' }}>{label}</div>
                    <select value={columnMap[key]} onChange={e => setColumnMap({ ...columnMap, [key]: e.target.value })} style={inp}>
                      <option value="">— Not mapped —</option>
                      {csvPreview.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px' }}>Preview</div>
              <div style={{ background: '#080a0f', border: '0.5px solid #1e2030', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{csvPreview.headers.map(h => <th key={h} style={{ ...s.th, background: '#080a0f' }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {csvPreview.rows.map((row, i) => (
                      <tr key={i}>
                        {csvPreview.headers.map(h => (
                          <td key={h} style={{ ...s.td, fontSize: '12px', color: columnMap.date === h || columnMap.amount === h ? '#6c8eff' : '#555' }}>{row[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={importTransactions} disabled={importing}
                  style={{ background: importing ? '#444' : '#6c8eff', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 22px', fontSize: '13px', fontWeight: '500', cursor: importing ? 'not-allowed' : 'pointer', fontFamily: 'sans-serif' }}>
                  {importing ? 'Importing...' : `Import ${csvPreview.allRows.length} Transactions`}
                </button>
                <button onClick={() => { setCsvPreview(null); setShowImport(null) }}
                  style={{ background: 'transparent', color: '#888', border: '0.5px solid #1e2030', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', cursor: 'pointer', fontFamily: 'sans-serif' }}>Cancel</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Unmatched Transactions */}
      {unmatched.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#fbbf24', marginBottom: '14px' }}>⚠ {unmatched.length} Unmatched Transactions — Need Review</div>
          <div style={{ background: '#0d1018', border: '0.5px solid #1e2030', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Date', 'Description', 'Amount', 'Type', 'Action'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {unmatched.map(bt => (
                  <>
                    <tr key={bt.id} onMouseEnter={e => e.currentTarget.style.background = '#0f1420'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ ...s.td, color: '#666' }}>{bt.date}</td>
                      <td style={{ ...s.td, color: '#ccc' }}>{bt.description || '—'}</td>
                      <td style={{ ...s.td, fontFamily: 'monospace', color: bt.type === 'credit' ? '#34d399' : '#f87171' }}>
                        {bt.type === 'credit' ? '+' : '-'}€{Number(bt.amount).toFixed(2)}
                      </td>
                      <td style={s.td}><span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: bt.type === 'credit' ? '#0d2a1e' : '#2a0d0d', color: bt.type === 'credit' ? '#34d399' : '#f87171' }}>{bt.type}</span></td>
                      <td style={s.td}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => setMatchingTxn(matchingTxn === bt.id ? null : bt.id)}
                            style={{ fontSize: '11px', color: '#6c8eff', background: 'transparent', border: '0.5px solid #6c8eff', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                            Match
                          </button>
                          <button onClick={() => createAndMatch(bt)}
                            style={{ fontSize: '11px', color: '#34d399', background: 'transparent', border: '0.5px solid #34d399', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                            Create & Match
                          </button>
                        </div>
                      </td>
                    </tr>
                    {matchingTxn === bt.id && (
                      <tr key={bt.id + '_match'}>
                        <td colSpan={5} style={{ padding: '12px 16px', background: '#080a0f', borderTop: '0.5px solid #0f1117' }}>
                          <div style={{ fontSize: '11px', color: '#555', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Select existing transaction to match</div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {/* This would show existing transactions to match against */}
                            <div style={{ fontSize: '12px', color: '#444' }}>Coming soon — manual matching UI</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Matched Transactions */}
      {matched.length > 0 && (
        <div>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#34d399', marginBottom: '14px' }}>✓ {matched.length} Matched Transactions</div>
          <div style={{ background: '#0d1018', border: '0.5px solid #1e2030', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Date', 'Description', 'Amount', 'Type', 'Status'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {matched.map(bt => (
                  <tr key={bt.id} onMouseEnter={e => e.currentTarget.style.background = '#0f1420'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...s.td, color: '#666' }}>{bt.date}</td>
                    <td style={{ ...s.td, color: '#aaa' }}>{bt.description || '—'}</td>
                    <td style={{ ...s.td, fontFamily: 'monospace', color: bt.type === 'credit' ? '#34d399' : '#f87171' }}>
                      {bt.type === 'credit' ? '+' : '-'}€{Number(bt.amount).toFixed(2)}
                    </td>
                    <td style={s.td}><span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: bt.type === 'credit' ? '#0d2a1e' : '#2a0d0d', color: bt.type === 'credit' ? '#34d399' : '#f87171' }}>{bt.type}</span></td>
                    <td style={s.td}><span style={{ fontSize: '11px', color: '#34d399' }}>✓ Matched</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}