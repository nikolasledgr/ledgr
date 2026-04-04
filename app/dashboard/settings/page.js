'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function Settings() {
  const [user, setUser] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [settings, setSettings] = useState({
    accounting_method: 'cash',
    tax_rate: 20,
    currency: 'EUR',
    company_name: ''
  })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      setUser(user)
      const { data } = await supabase.from('settings').select('*').eq('user_id', user.id).single()
      if (data) setSettings({
        accounting_method: data.accounting_method || 'cash',
        tax_rate: data.tax_rate || 20,
        currency: data.currency || 'EUR',
        company_name: data.company_name || ''
      })
    }
    load()
  }, [])

  const save = async () => {
    setSaving(true)
    setSaved(false)
    const { error } = await supabase.from('settings').upsert({
      user_id: user.id,
      ...settings,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
    if (!error) setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  const inp = { width: '100%', background: '#080a0f', border: '0.5px solid #1e2030', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#e8e9ed', outline: 'none', fontFamily: 'sans-serif' }
  const label = { fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '6px', display: 'block' }

  return (
    <div style={{ padding: '28px', maxWidth: '600px' }}>
      <div style={{ fontSize: '20px', fontWeight: '600', color: '#e8e9ed', marginBottom: '8px' }}>Settings</div>
      <div style={{ fontSize: '12px', color: '#555', marginBottom: '28px' }}>Configure how Ledgr calculates your financials</div>

      {/* Company */}
      <div style={{ background: '#0d1018', border: '0.5px solid #1e2030', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#e8e9ed', marginBottom: '16px' }}>Company</div>
        <div>
          <label style={label}>Company Name</label>
          <input value={settings.company_name} onChange={e => setSettings({ ...settings, company_name: e.target.value })} placeholder="Your company name" style={inp} />
        </div>
      </div>

      {/* Accounting Method */}
      <div style={{ background: '#0d1018', border: '0.5px solid #1e2030', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#e8e9ed', marginBottom: '4px' }}>Accounting Method</div>
        <div style={{ fontSize: '12px', color: '#555', marginBottom: '16px' }}>This affects how revenue and expenses are recognised in your P&L</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { value: 'cash', title: 'Cash Basis', desc: 'Revenue is recognised when payment is received. Expenses are recognised when paid. Simpler and common for small businesses.' },
            { value: 'accrual', title: 'Accrual Basis', desc: 'Revenue is recognised when the service is performed (invoice issued). Expenses recognised when incurred. Required for larger businesses and more accurate.' }
          ].map(opt => (
            <div key={opt.value} onClick={() => setSettings({ ...settings, accounting_method: opt.value })}
              style={{ padding: '14px 16px', borderRadius: '8px', border: `0.5px solid ${settings.accounting_method === opt.value ? '#6c8eff' : '#1e2030'}`, background: settings.accounting_method === opt.value ? '#0d1428' : '#080a0f', cursor: 'pointer', transition: 'all 0.15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: `2px solid ${settings.accounting_method === opt.value ? '#6c8eff' : '#2e3245'}`, background: settings.accounting_method === opt.value ? '#6c8eff' : 'transparent', flexShrink: 0 }} />
                <div style={{ fontSize: '13px', fontWeight: '500', color: settings.accounting_method === opt.value ? '#6c8eff' : '#ccc' }}>{opt.title}</div>
              </div>
              <div style={{ fontSize: '12px', color: '#555', paddingLeft: '24px', lineHeight: '1.5' }}>{opt.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tax & Currency */}
      <div style={{ background: '#0d1018', border: '0.5px solid #1e2030', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#e8e9ed', marginBottom: '16px' }}>Tax & Currency</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={label}>Default Tax Rate (%)</label>
            <input type="number" min="0" max="100" value={settings.tax_rate} onChange={e => setSettings({ ...settings, tax_rate: Number(e.target.value) })} style={inp} />
          </div>
          <div>
            <label style={label}>Currency</label>
            <select value={settings.currency} onChange={e => setSettings({ ...settings, currency: e.target.value })} style={inp}>
              {['EUR', 'USD', 'GBP', 'CHF', 'AED', 'SGD'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={save} disabled={saving} style={{ background: saving ? '#444' : '#6c8eff', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '13px', fontWeight: '500', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'sans-serif' }}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {saved && <span style={{ fontSize: '13px', color: '#34d399' }}>Settings saved!</span>}
      </div>
    </div>
  )
}