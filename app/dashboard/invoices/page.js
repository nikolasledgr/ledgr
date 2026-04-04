'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const STATUSES = ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled']
const STATUS_COLORS = {
  Draft: { bg: '#161b2e', color: '#6c8eff' },
  Sent: { bg: '#1a2030', color: '#93c5fd' },
  Paid: { bg: '#0d2a1e', color: '#34d399' },
  Overdue: { bg: '#2a0d0d', color: '#f87171' },
  Cancelled: { bg: '#1a1a1a', color: '#555' }
}

const emptyItem = () => ({ id: Date.now(), description: '', quantity: '1', unit_price: '' })

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [user, setUser] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [filterStatus, setFilterStatus] = useState('All')
  const [form, setForm] = useState({
    client: '',
    issued_date: new Date().toISOString().split('T')[0],
    due_date: '',
    vat_rate: '0',
    notes: '',
    status: 'Draft'
  })
  const [items, setItems] = useState([emptyItem()])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      setUser(user)
      const { data } = await supabase.from('invoices').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setInvoices(data || [])
    }
    load()
  }, [])

  const generateInvoiceNumber = (existingInvoices) => {
    const nums = existingInvoices.map(i => {
      const match = i.invoice_number?.match(/(\d+)$/)
      return match ? parseInt(match[1]) : 0
    })
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
    return `INV-${String(next).padStart(4, '0')}`
  }

  const subtotal = items.reduce((s, item) => {
    const qty = parseFloat(item.quantity) || 0
    const price = parseFloat(item.unit_price) || 0
    return s + qty * price
  }, 0)
  const vatRate = parseFloat(form.vat_rate) || 0
  const vatAmount = subtotal * (vatRate / 100)
  const total = subtotal + vatAmount

  const isDuplicate = (client, amount) => {
    return invoices.some(inv =>
      inv.client?.toLowerCase() === client?.toLowerCase() &&
      Math.abs(Number(inv.total) - amount) < 0.01 &&
      inv.issued_date === form.issued_date
    )
  }

  const validate = () => {
    const e = {}
    if (!form.client.trim()) e.client = 'Required'
    if (!form.issued_date) e.issued_date = 'Required'
    if (!form.due_date) e.due_date = 'Required'
    if (items.every(i => !i.description.trim())) e.items = 'Add at least one line item'
    items.forEach((item, idx) => {
      if (item.description.trim() && (!item.unit_price || parseFloat(item.unit_price) <= 0)) {
        e[`item_price_${idx}`] = 'Enter a valid price'
      }
    })
    if (isDuplicate(form.client, total)) e.duplicate = 'A similar invoice already exists for this client, amount and date'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const saveInvoice = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const invoice_number = generateInvoiceNumber(invoices)
      const validItems = items.filter(i => i.description.trim() && parseFloat(i.unit_price) > 0)
      const { data: invData, error: invError } = await supabase.from('invoices').insert([{
        user_id: user.id,
        invoice_number,
        client: form.client.trim(),
        issued_date: form.issued_date,
        due_date: form.due_date,
        vat_rate: vatRate,
        subtotal: parseFloat(subtotal.toFixed(2)),
        vat_amount: parseFloat(vatAmount.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        amount: parseFloat(total.toFixed(2)),
        status: form.status,
        notes: form.notes.trim()
      }]).select()
      if (invError) { alert('Error: ' + invError.message); setSaving(false); return }
      const invoiceId = invData[0].id
      const itemsToInsert = validItems.map(item => ({
        invoice_id: invoiceId,
        description: item.description.trim(),
        quantity: parseFloat(item.quantity) || 1,
        unit_price: parseFloat(item.unit_price),
        amount: (parseFloat(item.quantity) || 1) * parseFloat(item.unit_price)
      }))
      await supabase.from('invoice_items').insert(itemsToInsert)

      // Auto-create journal entries
      await supabase.rpc('create_invoice_transaction', {
        p_invoice_id: invoiceId,
        p_user_id: user.id,
        p_date: form.issued_date,
        p_description: `Invoice to ${form.client.trim()}`,
        p_subtotal: parseFloat(subtotal.toFixed(2)),
        p_vat_amount: parseFloat(vatAmount.toFixed(2)),
        p_total: parseFloat(total.toFixed(2))
      })

      setInvoices([invData[0], ...invoices])
      resetForm()
    } catch (e) {
      alert('Unexpected error: ' + e.message)
    }
    setSaving(false)
  }

  const updateStatus = async (id, status) => {
    const prevInvoice = invoices.find(i => i.id === id)
    const { error } = await supabase.from('invoices').update({ status }).eq('id', id)
    if (!error) {
      setInvoices(invoices.map(i => i.id === id ? { ...i, status } : i))
      if (status === 'Paid' && prevInvoice?.status !== 'Paid') {
        await supabase.rpc('record_invoice_payment', {
          p_invoice_id: id,
          p_user_id: user.id,
          p_date: new Date().toISOString().split('T')[0],
          p_amount: parseFloat(Number(prevInvoice.total || prevInvoice.amount || 0).toFixed(2))
        })
      }
      if (status !== 'Paid' && prevInvoice?.status === 'Paid') {
        await supabase.from('transactions')
          .update({ status: 'void' })
          .eq('invoice_id', id)
          .eq('type', 'payment')
      }
    }
  }

  const deleteInvoice = async (id) => {
    if (!confirm('Delete this invoice?')) return
    await supabase.from('invoices').delete().eq('id', id)
    setInvoices(invoices.filter(i => i.id !== id))
  }

  const resetForm = () => {
    setForm({ client: '', issued_date: new Date().toISOString().split('T')[0], due_date: '', vat_rate: '0', notes: '', status: 'Draft' })
    setItems([emptyItem()])
    setErrors({})
    setShowForm(false)
  }

  const updateItem = (id, field, value) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const filteredInvoices = filterStatus === 'All' ? invoices : invoices.filter(i => i.status === filterStatus)

  const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + Number(i.total || i.amount || 0), 0)
  const totalOutstanding = invoices.filter(i => ['Sent', 'Overdue'].includes(i.status)).reduce((s, i) => s + Number(i.total || i.amount || 0), 0)
  const totalDraft = invoices.filter(i => i.status === 'Draft').reduce((s, i) => s + Number(i.total || i.amount || 0), 0)

  const s = {
    inp: (err) => ({ width: '100%', background: '#080a0f', border: `0.5px solid ${err ? '#f87171' : '#1e2030'}`, borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#e8e9ed', outline: 'none', fontFamily: 'sans-serif' }),
    label: { fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '4px', display: 'block' },
    th: { fontSize: '10px', color: '#444', fontWeight: '500', textAlign: 'left', padding: '12px 18px', textTransform: 'uppercase', letterSpacing: '0.7px', borderBottom: '0.5px solid #131620' },
    td: { fontSize: '13px', color: '#aaa', padding: '13px 18px', borderTop: '0.5px solid #0f1117' },
  }

  return (
    <div style={{ padding: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#e8e9ed' }}>Invoices</div>
          <div style={{ fontSize: '12px', color: '#555', marginTop: '3px' }}>{invoices.length} total invoice{invoices.length !== 1 ? 's' : ''}</div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: '#6c8eff', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'sans-serif' }}>+ New Invoice</button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Paid', value: `€${totalRevenue.toFixed(2)}`, color: '#34d399' },
          { label: 'Outstanding', value: `€${totalOutstanding.toFixed(2)}`, color: '#fbbf24' },
          { label: 'Draft', value: `€${totalDraft.toFixed(2)}`, color: '#6c8eff' },
        ].map(k => (
          <div key={k.label} style={{ background: '#0d1018', border: '0.5px solid #1e2030', borderRadius: '10px', padding: '16px 20px' }}>
            <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '8px' }}>{k.label}</div>
            <div style={{ fontSize: '22px', fontWeight: '600', fontFamily: 'monospace', color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* New Invoice Form */}
      {showForm && (
        <div style={{ background: '#0d1018', border: '0.5px solid #2e3245', borderRadius: '10px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#e8e9ed', marginBottom: '20px' }}>New Invoice</div>

          {errors.duplicate && (
            <div style={{ background: '#2a1a0d', border: '0.5px solid #f87171', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#f87171' }}>
              ⚠ {errors.duplicate}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
            <div>
              <label style={s.label}>Client {errors.client && <span style={{ color: '#f87171' }}>— {errors.client}</span>}</label>
              <input value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} placeholder="e.g. Acme Corporation" style={s.inp(errors.client)} />
            </div>
            <div>
              <label style={s.label}>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={s.inp(false)}>
                {STATUSES.map(st => <option key={st}>{st}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Issue Date {errors.issued_date && <span style={{ color: '#f87171' }}>— {errors.issued_date}</span>}</label>
              <input type="date" value={form.issued_date} onChange={e => setForm({ ...form, issued_date: e.target.value })} style={s.inp(errors.issued_date)} />
            </div>
            <div>
              <label style={s.label}>Due Date {errors.due_date && <span style={{ color: '#f87171' }}>— {errors.due_date}</span>}</label>
              <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} style={s.inp(errors.due_date)} />
            </div>
            <div>
              <label style={s.label}>VAT Rate (%)</label>
              <input type="number" min="0" max="100" step="0.1" value={form.vat_rate} onChange={e => setForm({ ...form, vat_rate: e.target.value })} placeholder="0" style={s.inp(false)} />
            </div>
            <div>
              <label style={s.label}>Notes (optional)</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Payment terms, bank details..." style={s.inp(false)} />
            </div>
          </div>

          {/* Line Items */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px' }}>
              Line Items {errors.items && <span style={{ color: '#f87171' }}>— {errors.items}</span>}
            </div>
            <div style={{ background: '#080a0f', border: `0.5px solid ${errors.items ? '#f87171' : '#1e2030'}`, borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Description', 'Qty', 'Unit Price (€)', 'Amount'].map(h => (
                      <th key={h} style={{ ...s.th, background: '#080a0f', padding: '10px 14px' }}>{h}</th>
                    ))}
                    <th style={{ ...s.th, background: '#080a0f', padding: '10px 14px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const amt = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)
                    return (
                      <tr key={item.id}>
                        <td style={{ padding: '8px 14px', borderTop: '0.5px solid #131620', width: '45%' }}>
                          <input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Service or product description" style={{ ...s.inp(false), padding: '8px 10px' }} />
                        </td>
                        <td style={{ padding: '8px 8px', borderTop: '0.5px solid #131620', width: '10%' }}>
                          <input type="number" min="1" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} style={{ ...s.inp(false), padding: '8px 10px' }} />
                        </td>
                        <td style={{ padding: '8px 8px', borderTop: '0.5px solid #131620', width: '20%' }}>
                          <input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(item.id, 'unit_price', e.target.value)} placeholder="0.00" style={{ ...s.inp(errors[`item_price_${idx}`]), padding: '8px 10px' }} />
                        </td>
                        <td style={{ padding: '8px 14px', borderTop: '0.5px solid #131620', fontFamily: 'monospace', fontSize: '13px', color: '#34d399', width: '15%' }}>
                          €{amt.toFixed(2)}
                        </td>
                        <td style={{ padding: '8px 14px', borderTop: '0.5px solid #131620' }}>
                          {items.length > 1 && (
                            <button onClick={() => setItems(items.filter(i => i.id !== item.id))} style={{ fontSize: '11px', color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer' }}>Remove</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <button onClick={() => setItems([...items, emptyItem()])} style={{ marginTop: '8px', background: 'transparent', color: '#6c8eff', border: '0.5px solid #1e2030', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer', fontFamily: 'sans-serif' }}>+ Add Line Item</button>
          </div>

          {/* Totals Preview */}
          {subtotal > 0 && (
            <div style={{ background: '#080a0f', border: '0.5px solid #1e2030', borderRadius: '8px', padding: '14px 18px', marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '220px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#555' }}>Subtotal</span>
                  <span style={{ fontFamily: 'monospace', color: '#ccc' }}>€{subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#555' }}>VAT ({vatRate}%)</span>
                  <span style={{ fontFamily: 'monospace', color: '#fbbf24' }}>€{vatAmount.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '600', borderTop: '0.5px solid #2e3245', paddingTop: '8px' }}>
                  <span style={{ color: '#e8e9ed' }}>Total</span>
                  <span style={{ fontFamily: 'monospace', color: '#34d399' }}>€{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={saveInvoice} disabled={saving} style={{ background: saving ? '#444' : '#6c8eff', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 22px', fontSize: '13px', fontWeight: '500', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'sans-serif' }}>
              {saving ? 'Saving...' : 'Save Invoice'}
            </button>
            <button onClick={resetForm} style={{ background: 'transparent', color: '#888', border: '0.5px solid #1e2030', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', cursor: 'pointer', fontFamily: 'sans-serif' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['All', ...STATUSES].map(st => (
          <button key={st} onClick={() => setFilterStatus(st)} style={{ background: filterStatus === st ? '#6c8eff' : 'transparent', color: filterStatus === st ? '#fff' : '#555', border: '0.5px solid #1e2030', borderRadius: '20px', padding: '5px 14px', fontSize: '12px', cursor: 'pointer', fontFamily: 'sans-serif' }}>{st}</button>
        ))}
      </div>

      {/* Invoices Table */}
      <div style={{ background: '#0d1018', border: '0.5px solid #1e2030', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Invoice #', 'Client', 'Issued', 'Due', 'Subtotal', 'VAT', 'Total', 'Status', ''].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#444', fontSize: '13px' }}>
                  {filterStatus === 'All' ? 'No invoices yet — click "+ New Invoice" to create one' : `No ${filterStatus} invoices`}
                </td>
              </tr>
            ) : filteredInvoices.map(inv => (
              <tr key={inv.id} onMouseEnter={e => e.currentTarget.style.background = '#0f1420'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '12px', color: '#6c8eff' }}>{inv.invoice_number || '—'}</td>
                <td style={{ ...s.td, color: '#ccc', fontWeight: '500' }}>{inv.client}</td>
                <td style={{ ...s.td, color: '#666' }}>{inv.issued_date}</td>
                <td style={{ ...s.td, color: inv.status === 'Overdue' ? '#f87171' : '#666' }}>{inv.due_date}</td>
                <td style={{ ...s.td, fontFamily: 'monospace' }}>€{Number(inv.subtotal || inv.amount || 0).toFixed(2)}</td>
                <td style={{ ...s.td, fontFamily: 'monospace', color: '#fbbf24' }}>€{Number(inv.vat_amount || 0).toFixed(2)}</td>
                <td style={{ ...s.td, fontFamily: 'monospace', color: '#34d399', fontWeight: '600' }}>€{Number(inv.total || inv.amount || 0).toFixed(2)}</td>
                <td style={s.td}>
                  <select value={inv.status} onChange={e => updateStatus(inv.id, e.target.value)}
                    style={{ background: STATUS_COLORS[inv.status]?.bg, color: STATUS_COLORS[inv.status]?.color, border: 'none', borderRadius: '20px', padding: '3px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'sans-serif', outline: 'none' }}>
                    {STATUSES.map(st => <option key={st} style={{ background: '#0d1018', color: '#e8e9ed' }}>{st}</option>)}
                  </select>
                </td>
                <td style={s.td}>
                  <button onClick={() => deleteInvoice(inv.id)} style={{ fontSize: '11px', color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'sans-serif' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
          {filteredInvoices.length > 0 && (
            <tfoot>
              <tr style={{ background: '#080a0f' }}>
                <td colSpan={6} style={{ padding: '12px 18px', fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', borderTop: '0.5px solid #2e3245' }}>Totals ({filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''})</td>
                <td style={{ padding: '12px 18px', fontFamily: 'monospace', fontSize: '13px', color: '#34d399', fontWeight: '600', borderTop: '0.5px solid #2e3245' }}>
                  €{filteredInvoices.reduce((s, i) => s + Number(i.total || i.amount || 0), 0).toFixed(2)}
                </td>
                <td colSpan={2} style={{ borderTop: '0.5px solid #2e3245' }} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}