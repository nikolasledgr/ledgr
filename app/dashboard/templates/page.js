'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const TYPE_COLORS = {
  invoice: { bg: '#0d1428', color: '#6c8eff' },
  payment: { bg: '#0d2a1e', color: '#34d399' },
  expense: { bg: '#2a0d0d', color: '#f87171' },
  journal: { bg: '#1a1208', color: '#fbbf24' },
  tax: { bg: '#2a1a0d', color: '#fb923c' },
  other: { bg: '#1a1a1a', color: '#888' }
}

export default function Templates() {
  const [templates, setTemplates] = useState([])
  const [accounts, setAccounts] = useState([])
  const [user, setUser] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(null)
  const [using, setUsing] = useState(null)
  const [success, setSuccess] = useState(null)
  const [postError, setPostError] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', type: 'expense' })
  const [templateEntries, setTemplateEntries] = useState([
    { id: 1, account_code: '', account_name: '', debit: false, credit: false }
  ])
  const [useForm, setUseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    reference: '',
    notes: ''
  })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      setUser(user)
      const [{ data: tmpl }, { data: accs }] = await Promise.all([
        supabase.from('transaction_templates').select('*').eq('user_id', user.id).order('is_system', { ascending: false }),
        supabase.from('accounts').select('*').eq('user_id', user.id).eq('is_active', true).order('code')
      ])
      setTemplates(tmpl || [])
      setAccounts(accs || [])
    }
    load()
  }, [])

  const openTemplate = (template) => {
    if (using === template.id) {
      setUsing(null)
      setPostError(null)
      setSuccess(null)
      return
    }
    setUsing(template.id)
    setPostError(null)
    setSuccess(null)
    setUseForm({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      description: template.name,
      reference: '',
      notes: ''
    })
  }

  const postFromTemplate = async (template) => {
    setPostError(null)
    setSuccess(null)

    const amount = parseFloat(useForm.amount)
    if (!amount || amount <= 0) {
      setPostError('Please enter a valid amount')
      return
    }
    if (!useForm.date) {
      setPostError('Please enter a date')
      return
    }

    setSaving(template.id)
    try {
      // Create transaction
      const { data: txnData, error: txnError } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          date: useForm.date,
          description: useForm.description || template.name,
          reference: useForm.reference || null,
          type: template.type,
          notes: useForm.notes || null,
          status: 'posted',
          total_amount: amount
        }])
        .select()

      if (txnError) {
        setPostError('Failed to create transaction: ' + txnError.message)
        setSaving(null)
        return
      }

      const txnId = txnData[0].id
      const journalEntries = []

      for (const entry of template.entries) {
        // Find account by code
        const account = accounts.find(a => a.code === entry.account_code)
        if (!account) {
          setPostError(`Account ${entry.account_code} (${entry.account_name}) not found. Check your Chart of Accounts.`)
          // Cleanup transaction
          await supabase.from('transactions').delete().eq('id', txnId)
          setSaving(null)
          return
        }
        journalEntries.push({
          transaction_id: txnId,
          account_id: account.id,
          debit: entry.debit ? amount : 0,
          credit: entry.credit ? amount : 0,
          description: useForm.description || template.name
        })
      }

      const { error: jeError } = await supabase
        .from('journal_entries')
        .insert(journalEntries)

      if (jeError) {
        setPostError('Failed to create journal entries: ' + jeError.message)
        await supabase.from('transactions').delete().eq('id', txnId)
        setSaving(null)
        return
      }

      // Update usage count
      await supabase
        .from('transaction_templates')
        .update({ usage_count: (template.usage_count || 0) + 1 })
        .eq('id', template.id)

      setTemplates(templates.map(t =>
        t.id === template.id ? { ...t, usage_count: (t.usage_count || 0) + 1 } : t
      ))

      setSuccess(template.id)
      setUsing(null)
      setUseForm({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        description: '',
        reference: '',
        notes: ''
      })

      // Clear success message after 4 seconds
      setTimeout(() => setSuccess(null), 4000)

    } catch (e) {
      setPostError('Unexpected error: ' + e.message)
    }
    setSaving(null)
  }

  const saveTemplate = async () => {
    if (!form.name.trim()) return
    const validEntries = templateEntries.filter(e => e.account_code && (e.debit || e.credit))
    if (validEntries.length < 2) {
      setPostError('Add at least 2 journal entry lines')
      return
    }
    setSaving('new')
    const { data, error } = await supabase.from('transaction_templates').insert([{
      user_id: user.id,
      name: form.name.trim(),
      description: form.description.trim(),
      type: form.type,
      is_system: false,
      entries: validEntries.map(e => ({
        account_code: e.account_code,
        account_name: e.account_name,
        debit: e.debit,
        credit: e.credit
      }))
    }]).select()
    if (!error) {
      setTemplates([data[0], ...templates])
      setShowForm(false)
      setForm({ name: '', description: '', type: 'expense' })
      setTemplateEntries([{ id: 1, account_code: '', account_name: '', debit: false, credit: false }])
    }
    setSaving(null)
  }

  const deleteTemplate = async (id) => {
    if (!confirm('Delete this template?')) return
    await supabase.from('transaction_templates').delete().eq('id', id)
    setTemplates(templates.filter(t => t.id !== id))
  }

  const inp = { width: '100%', background: '#080a0f', border: '0.5px solid #1e2030', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#e8e9ed', outline: 'none', fontFamily: 'sans-serif' }

  const TemplateCard = ({ template }) => {
    const isUsing = using === template.id
    const isSuccess = success === template.id
    const isSaving = saving === template.id

    return (
      <div style={{ background: '#0d1018', border: `0.5px solid ${isUsing ? '#6c8eff' : isSuccess ? '#34d399' : '#1e2030'}`, borderRadius: '10px', padding: '16px', transition: 'border-color 0.2s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#e8e9ed', marginBottom: '3px' }}>{template.name}</div>
            <div style={{ fontSize: '11px', color: '#555' }}>{template.description}</div>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: '8px', flexShrink: 0 }}>
            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: TYPE_COLORS[template.type]?.bg, color: TYPE_COLORS[template.type]?.color, textTransform: 'capitalize' }}>{template.type}</span>
            {template.usage_count > 0 && <span style={{ fontSize: '10px', color: '#444' }}>×{template.usage_count}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '12px', padding: '8px', background: '#080a0f', borderRadius: '6px' }}>
          {template.entries.map((e, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: '#555' }}>{e.account_code} — {e.account_name}</span>
              <span style={{ color: e.debit ? '#34d399' : '#f87171', fontWeight: '600' }}>{e.debit ? 'DR' : 'CR'}</span>
            </div>
          ))}
        </div>

        {isSuccess && (
          <div style={{ background: '#0d2a1e', border: '0.5px solid #34d399', borderRadius: '6px', padding: '8px 12px', marginBottom: '8px', fontSize: '12px', color: '#34d399' }}>
            ✓ Transaction posted successfully!
          </div>
        )}

        {isUsing && postError && (
          <div style={{ background: '#2a0d0d', border: '0.5px solid #f87171', borderRadius: '6px', padding: '8px 12px', marginBottom: '8px', fontSize: '12px', color: '#f87171' }}>
            ⚠ {postError}
          </div>
        )}

        <button onClick={() => openTemplate(template)}
          style={{ width: '100%', background: isUsing ? '#161b2e' : 'transparent', color: '#6c8eff', border: '0.5px solid #6c8eff', borderRadius: '8px', padding: '7px', fontSize: '12px', cursor: 'pointer', fontFamily: 'sans-serif', fontWeight: '500', marginBottom: isUsing ? '12px' : '0' }}>
          {isUsing ? '✕ Cancel' : 'Use Template'}
        </button>

        {isUsing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '4px' }}>Date</div>
                <input type="date" value={useForm.date} onChange={e => setUseForm({ ...useForm, date: e.target.value })} style={{ ...inp, padding: '7px 10px', fontSize: '12px' }} />
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '4px' }}>Amount (€) *</div>
                <input type="number" min="0.01" step="0.01" value={useForm.amount}
                  onChange={e => setUseForm({ ...useForm, amount: e.target.value })}
                  onWheel={e => e.target.blur()}
                  onKeyDown={e => ['ArrowUp','ArrowDown'].includes(e.key) && e.preventDefault()}
                  placeholder="0.00" style={{ ...inp, padding: '7px 10px', fontSize: '12px', border: `0.5px solid ${postError && !useForm.amount ? '#f87171' : '#1e2030'}` }} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '4px' }}>Description</div>
              <input value={useForm.description} onChange={e => setUseForm({ ...useForm, description: e.target.value })} style={{ ...inp, padding: '7px 10px', fontSize: '12px' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '4px' }}>Reference</div>
                <input value={useForm.reference} onChange={e => setUseForm({ ...useForm, reference: e.target.value })} placeholder="Optional..." style={{ ...inp, padding: '7px 10px', fontSize: '12px' }} />
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '4px' }}>Notes</div>
                <input value={useForm.notes} onChange={e => setUseForm({ ...useForm, notes: e.target.value })} placeholder="Optional..." style={{ ...inp, padding: '7px 10px', fontSize: '12px' }} />
              </div>
            </div>
            <button onClick={() => postFromTemplate(template)} disabled={isSaving}
              style={{ background: isSaving ? '#1a3020' : '#34d399', color: isSaving ? '#34d399' : '#0d2a1e', border: 'none', borderRadius: '8px', padding: '9px', fontSize: '12px', fontWeight: '600', cursor: isSaving ? 'not-allowed' : 'pointer', fontFamily: 'sans-serif', transition: 'all 0.15s' }}>
              {isSaving ? 'Posting...' : 'Post Transaction →'}
            </button>
          </div>
        )}

        {!template.is_system && (
          <button onClick={() => deleteTemplate(template.id)} style={{ marginTop: '8px', fontSize: '11px', color: '#444', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'sans-serif' }}>Delete</button>
        )}
      </div>
    )
  }

  const systemTemplates = templates.filter(t => t.is_system)
  const customTemplates = templates.filter(t => !t.is_system)

  return (
    <div style={{ padding: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#e8e9ed' }}>Transaction Templates</div>
          <div style={{ fontSize: '12px', color: '#555', marginTop: '3px' }}>Post common transactions in one click — no manual journal entries needed</div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: '#6c8eff', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'sans-serif' }}>+ New Template</button>
      </div>

      {showForm && (
        <div style={{ background: '#0d1018', border: '0.5px solid #2e3245', borderRadius: '10px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#e8e9ed', marginBottom: '16px' }}>New Template</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '5px' }}>Template Name *</div>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Monthly rent" style={inp} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '5px' }}>Description</div>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What is this template for?" style={inp} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '5px' }}>Type</div>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={inp}>
                {Object.keys(TYPE_COLORS).map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '8px' }}>Journal Entry Pattern (select DR or CR for each account)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
            {templateEntries.map(entry => (
              <div key={entry.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                <select value={entry.account_code} onChange={e => {
                  const acc = accounts.find(a => a.code === e.target.value)
                  setTemplateEntries(templateEntries.map(te => te.id === entry.id ? { ...te, account_code: e.target.value, account_name: acc?.name || '' } : te))
                }} style={inp}>
                  <option value="">Select account...</option>
                  {['asset', 'liability', 'equity', 'revenue', 'expense'].map(type => (
                    <optgroup key={type} label={type.toUpperCase()}>
                      {accounts.filter(a => a.type === type).map(a => (
                        <option key={a.id} value={a.code}>{a.code} — {a.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <button onClick={() => setTemplateEntries(templateEntries.map(te => te.id === entry.id ? { ...te, debit: true, credit: false } : te))}
                  style={{ background: entry.debit ? '#0d2a1e' : 'transparent', color: entry.debit ? '#34d399' : '#555', border: `0.5px solid ${entry.debit ? '#34d399' : '#1e2030'}`, borderRadius: '8px', padding: '9px', fontSize: '12px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  Debit (DR)
                </button>
                <button onClick={() => setTemplateEntries(templateEntries.map(te => te.id === entry.id ? { ...te, credit: true, debit: false } : te))}
                  style={{ background: entry.credit ? '#2a0d0d' : 'transparent', color: entry.credit ? '#f87171' : '#555', border: `0.5px solid ${entry.credit ? '#f87171' : '#1e2030'}`, borderRadius: '8px', padding: '9px', fontSize: '12px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  Credit (CR)
                </button>
                {templateEntries.length > 1 && (
                  <button onClick={() => setTemplateEntries(templateEntries.filter(te => te.id !== entry.id))} style={{ color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => setTemplateEntries([...templateEntries, { id: Date.now(), account_code: '', account_name: '', debit: false, credit: false }])}
            style={{ background: 'transparent', color: '#6c8eff', border: '0.5px solid #1e2030', borderRadius: '6px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: 'sans-serif', marginBottom: '16px' }}>
            + Add Entry
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={saveTemplate} disabled={saving === 'new'} style={{ background: '#6c8eff', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 22px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              {saving === 'new' ? 'Saving...' : 'Save Template'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ background: 'transparent', color: '#888', border: '0.5px solid #1e2030', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', cursor: 'pointer', fontFamily: 'sans-serif' }}>Cancel</button>
          </div>
        </div>
      )}

      {systemTemplates.length > 0 && (
        <>
          <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px' }}>System Templates</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '28px' }}>
            {systemTemplates.map(t => <TemplateCard key={t.id} template={t} />)}
          </div>
        </>
      )}

      {customTemplates.length > 0 && (
        <>
          <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px' }}>Custom Templates</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px' }}>
            {customTemplates.map(t => <TemplateCard key={t.id} template={t} />)}
          </div>
        </>
      )}

      {templates.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#444', fontSize: '13px' }}>No templates found</div>
      )}
    </div>
  )
}