'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function BalanceSheet() {
  const [invoices, setInvoices] = useState([])
  const [expenses, setExpenses] = useState([])
  const [settings, setSettings] = useState({ accounting_method: 'cash', tax_rate: 20, currency: 'EUR', company_name: '' })
  const [manualAssets, setManualAssets] = useState([{ id: 1, label: 'Cash in Bank', amount: '' }])
  const [manualLiabilities, setManualLiabilities] = useState([{ id: 1, label: 'Loans', amount: '' }])
  const [manualEquity, setManualEquity] = useState([{ id: 1, label: 'Opening Capital', amount: '' }])
  const [asOf, setAsOf] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      const [{ data: inv }, { data: exp }, { data: sett }] = await Promise.all([
        supabase.from('invoices').select('*').eq('user_id', user.id),
        supabase.from('expenses').select('*').eq('user_id', user.id),
        supabase.from('settings').select('*').eq('user_id', user.id).single()
      ])
      setInvoices(inv || [])
      setExpenses(exp || [])
      if (sett) setSettings(sett)
    }
    load()
  }, [])

  const cur = settings.currency === 'EUR' ? '€' : settings.currency === 'USD' ? '$' : settings.currency === 'GBP' ? '£' : settings.currency
  const fmt = (n) => cur + Number(n || 0).toFixed(2)
  const taxRate = settings.tax_rate / 100

  const filterAsOf = (data, dateField) => data.filter(d => new Date(d[dateField]) <= new Date(asOf))

  const asOfInvoices = filterAsOf(invoices, 'issued_date')
  const asOfExpenses = filterAsOf(expenses, 'date')

  const isAccrual = settings.accounting_method === 'accrual'

  const paidInvoices = asOfInvoices.filter(i => i.status === 'Paid')
  const receivableInvoices = asOfInvoices.filter(i => ['Sent', 'Overdue'].includes(i.status))
  const draftInvoices = asOfInvoices.filter(i => i.status === 'Draft')

  const cashRevenue = paidInvoices.reduce((s, i) => s + Number(i.total || i.amount || 0), 0)
  const accountsReceivable = receivableInvoices.reduce((s, i) => s + Number(i.total || i.amount || 0), 0)
  const accrualRevenue = isAccrual ? cashRevenue + accountsReceivable : cashRevenue

  const totalExpensesGross = asOfExpenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const totalExpensesNet = asOfExpenses.reduce((s, e) => s + Number(e.net_amount || e.amount || 0), 0)

  const revenueExVAT = isAccrual
    ? accrualRevenue - asOfInvoices.filter(i => i.status !== 'Draft' && i.status !== 'Cancelled').reduce((s, i) => s + Number(i.vat_amount || 0), 0)
    : cashRevenue - paidInvoices.reduce((s, i) => s + Number(i.vat_amount || 0), 0)

  const grossProfit = revenueExVAT - totalExpensesNet
  const estimatedTax = Math.max(0, grossProfit * taxRate)
  const retainedEarnings = grossProfit - estimatedTax

  const vatCollected = paidInvoices.reduce((s, i) => s + Number(i.vat_amount || 0), 0)
  const vatOnExpenses = asOfExpenses.reduce((s, e) => s + Number(e.vat_amount || 0), 0)
  const vatPayable = Math.max(0, vatCollected - vatOnExpenses)

  const manualSum = (arr) => arr.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)

  const totalCurrentAssets = cashRevenue + accountsReceivable + manualSum(manualAssets)
  const totalLiabilities = vatPayable + estimatedTax + manualSum(manualLiabilities)
  const totalEquity = retainedEarnings + manualSum(manualEquity)
  const totalAssetsCheck = totalCurrentAssets
  const totalLiabEquity = totalLiabilities + totalEquity
  const balanced = Math.abs(totalAssetsCheck - totalLiabEquity) < 0.01

  const addRow = (setter) => setter(prev => [...prev, { id: Date.now(), label: '', amount: '' }])
  const updateRow = (setter, id, field, value) => setter(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  const removeRow = (setter, id) => setter(prev => prev.filter(r => r.id !== id))

  const s = {
    card: { background: '#0d1018', border: '0.5px solid #1e2030', borderRadius: '10px', padding: '20px', marginBottom: '16px' },
    sectionTitle: { fontSize: '12px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px', fontWeight: '500' },
    row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid #0f1117', fontSize: '13px' },
    totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0 0', fontSize: '13px', fontWeight: '600', borderTop: '0.5px solid #2e3245', marginTop: '4px' },
    label: { color: '#666' },
    inp: { background: '#080a0f', border: '0.5px solid #1e2030', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', color: '#e8e9ed', outline: 'none', fontFamily: 'sans-serif' },
  }

  const ManualSection = ({ title, rows, setter, color }) => (
    <>
      {rows.map(row => (
        <div key={row.id} style={{ ...s.row }}>
          <input value={row.label} onChange={e => updateRow(setter, row.id, 'label', e.target.value)} placeholder="Label..." style={{ ...s.inp, width: '55%' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="number" value={row.amount} onChange={e => updateRow(setter, row.id, 'amount', e.target.value)} placeholder="0.00" style={{ ...s.inp, width: '100px', textAlign: 'right' }} />
            <button onClick={() => removeRow(setter, row.id)} style={{ fontSize: '11px', color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
          </div>
        </div>
      ))}
      <button onClick={() => addRow(setter)} style={{ marginTop: '8px', background: 'transparent', color: '#6c8eff', border: '0.5px solid #1e2030', borderRadius: '6px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: 'sans-serif' }}>+ Add row</button>
    </>
  )

  return (
    <div style={{ padding: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#e8e9ed' }}>Balance Sheet</div>
          <div style={{ fontSize: '12px', color: '#555', marginTop: '3px' }}>
            {settings.company_name || 'Your Company'} · {isAccrual ? 'Accrual Basis' : 'Cash Basis'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: '#555' }}>As of</span>
          <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)} style={{ background: '#0d1018', border: '0.5px solid #1e2030', borderRadius: '8px', padding: '7px 12px', fontSize: '13px', color: '#e8e9ed', outline: 'none', fontFamily: 'sans-serif' }} />
        </div>
      </div>

      {/* Accounting method notice */}
      <div style={{ background: isAccrual ? '#0d1428' : '#141008', border: `0.5px solid ${isAccrual ? '#6c8eff' : '#fbbf24'}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '24px', fontSize: '12px', color: isAccrual ? '#6c8eff' : '#fbbf24' }}>
        {isAccrual
          ? 'Accrual basis — revenue recognised when invoiced, including accounts receivable'
          : 'Cash basis — revenue recognised when payment received only · Change in Settings'}
      </div>

      {/* Balance check */}
      <div style={{ background: balanced ? '#0d2a1e' : '#2a0d0d', border: `0.5px solid ${balanced ? '#34d399' : '#f87171'}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: balanced ? '#34d399' : '#f87171', fontWeight: '500' }}>
          {balanced ? '✓ Balance sheet is balanced' : '⚠ Balance sheet is out of balance'}
        </span>
        <span style={{ fontSize: '12px', color: '#555', fontFamily: 'monospace' }}>
          Assets {fmt(totalAssetsCheck)} · Liabilities + Equity {fmt(totalLiabEquity)}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* ASSETS */}
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#34d399', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assets</div>

          <div style={s.card}>
            <div style={s.sectionTitle}>Current Assets</div>
            <div style={s.row}>
              <span style={s.label}>Cash received (paid invoices)</span>
              <span style={{ fontFamily: 'monospace', color: '#34d399' }}>{fmt(cashRevenue)}</span>
            </div>
            {isAccrual && (
              <div style={s.row}>
                <span style={s.label}>Accounts receivable</span>
                <span style={{ fontFamily: 'monospace', color: '#fbbf24' }}>{fmt(accountsReceivable)}</span>
              </div>
            )}
            <ManualSection rows={manualAssets} setter={setManualAssets} />
            <div style={s.totalRow}>
              <span style={{ color: '#e8e9ed' }}>Total Assets</span>
              <span style={{ fontFamily: 'monospace', color: '#34d399' }}>{fmt(totalCurrentAssets)}</span>
            </div>
          </div>

          {/* AR Detail */}
          {isAccrual && receivableInvoices.length > 0 && (
            <div style={s.card}>
              <div style={s.sectionTitle}>Accounts Receivable Detail</div>
              {receivableInvoices.map(inv => (
                <div key={inv.id} style={s.row}>
                  <div>
                    <div style={{ fontSize: '13px', color: '#ccc' }}>{inv.client}</div>
                    <div style={{ fontSize: '11px', color: '#555' }}>{inv.invoice_number} · Due {inv.due_date}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'monospace', color: inv.status === 'Overdue' ? '#f87171' : '#fbbf24' }}>{fmt(inv.total || inv.amount)}</div>
                    <div style={{ fontSize: '11px', color: inv.status === 'Overdue' ? '#f87171' : '#555' }}>{inv.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* LIABILITIES + EQUITY */}
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#f87171', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Liabilities & Equity</div>

          <div style={s.card}>
            <div style={s.sectionTitle}>Current Liabilities</div>
            <div style={s.row}>
              <span style={s.label}>VAT payable</span>
              <span style={{ fontFamily: 'monospace', color: '#fbbf24' }}>{fmt(vatPayable)}</span>
            </div>
            <div style={s.row}>
              <span style={s.label}>Estimated tax ({settings.tax_rate}%)</span>
              <span style={{ fontFamily: 'monospace', color: '#fbbf24' }}>{fmt(estimatedTax)}</span>
            </div>
            <ManualSection rows={manualLiabilities} setter={setManualLiabilities} />
            <div style={s.totalRow}>
              <span style={{ color: '#e8e9ed' }}>Total Liabilities</span>
              <span style={{ fontFamily: 'monospace', color: '#f87171' }}>{fmt(totalLiabilities)}</span>
            </div>
          </div>

          <div style={s.card}>
            <div style={s.sectionTitle}>Equity</div>
            <div style={s.row}>
              <span style={s.label}>Retained earnings</span>
              <span style={{ fontFamily: 'monospace', color: retainedEarnings >= 0 ? '#34d399' : '#f87171' }}>{fmt(retainedEarnings)}</span>
            </div>
            <ManualSection rows={manualEquity} setter={setManualEquity} />
            <div style={s.totalRow}>
              <span style={{ color: '#e8e9ed' }}>Total Equity</span>
              <span style={{ fontFamily: 'monospace', color: totalEquity >= 0 ? '#34d399' : '#f87171' }}>{fmt(totalEquity)}</span>
            </div>
          </div>

          <div style={{ ...s.card, background: '#080a0f', border: '0.5px solid #2e3245' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#e8e9ed' }}>Total Liabilities + Equity</span>
              <span style={{ fontSize: '18px', fontWeight: '600', fontFamily: 'monospace', color: balanced ? '#34d399' : '#f87171' }}>{fmt(totalLiabEquity)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}