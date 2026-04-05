'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function BalanceSheet() {
  const [accounts, setAccounts] = useState([])
  const [journalEntries, setJournalEntries] = useState([])
  const [settings, setSettings] = useState({ accounting_method: 'cash', tax_rate: 20, currency: 'EUR', company_name: '' })
  const [invoices, setInvoices] = useState([])
  const [expenses, setExpenses] = useState([])
  const [manualAssets, setManualAssets] = useState([{ id: 1, label: 'Cash in Bank', amount: '' }])
  const [manualLiabilities, setManualLiabilities] = useState([{ id: 1, label: 'Loans', amount: '' }])
  const [manualEquity, setManualEquity] = useState([{ id: 1, label: 'Opening Capital', amount: '' }])
  const [asOf, setAsOf] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      const [{ data: accs }, { data: je }, { data: sett }, { data: inv }, { data: exp }] = await Promise.all([
        supabase.from('accounts').select('*').eq('user_id', user.id).eq('is_active', true),
        supabase.from('journal_entries').select('*, transactions(date, status, user_id)').eq('transactions.user_id', user.id),
        supabase.from('settings').select('*').eq('user_id', user.id).single(),
        supabase.from('invoices').select('*').eq('user_id', user.id),
        supabase.from('expenses').select('*').eq('user_id', user.id)
      ])
      setAccounts(accs || [])
      setJournalEntries(je || [])
      if (sett) setSettings(sett)
      setInvoices(inv || [])
      setExpenses(exp || [])
    }
    load()
  }, [])

  const cur = settings.currency === 'EUR' ? '€' : settings.currency === 'USD' ? '$' : settings.currency === 'GBP' ? '£' : settings.currency
  const fmt = (n) => cur + Number(n || 0).toFixed(2)
  const taxRate = settings.tax_rate / 100
  const isAccrual = settings.accounting_method === 'accrual'

  // Calculate account balance from journal entries
  const getAccountBalance = (accountCode) => {
    const account = accounts.find(a => a.code === accountCode)
    if (!account) return 0
    const entries = journalEntries.filter(je => {
      if (je.account_id !== account.id) return false
      if (!je.transactions) return false
      if (je.transactions.status === 'void') return false
      if (je.transactions.date > asOf) return false
      return true
    })
    const debits = entries.reduce((s, e) => s + Number(e.debit || 0), 0)
    const credits = entries.reduce((s, e) => s + Number(e.credit || 0), 0)
    // Normal balance: assets/expenses = debit, liabilities/equity/revenue = credit
    if (['asset', 'expense'].includes(account.type)) return debits - credits
    return credits - debits
  }

  // Asset accounts
  const cash = getAccountBalance('1000')
  const accountsReceivable = getAccountBalance('1100')
  const vatReceivable = getAccountBalance('1200')
  const fixedAssets = getAccountBalance('1500')

  // Liability accounts
  const accountsPayable = getAccountBalance('2000')
  const vatPayable = getAccountBalance('2100')
  const taxPayable = getAccountBalance('2200')
  const loansPayable = getAccountBalance('2300')

  // Equity accounts
  const openingCapital = getAccountBalance('3000')
  const retainedEarnings = getAccountBalance('3100')

  // Revenue & expense for retained earnings calculation
  const totalRevenue = getAccountBalance('4000') + getAccountBalance('4100') + getAccountBalance('4200')
  const totalExpenseAccounts = ['5000','5100','5200','5300','5400','5500','5600','5700','5800','5900']
    .reduce((s, code) => s + getAccountBalance(code), 0)

  const currentPeriodEarnings = totalRevenue - totalExpenseAccounts
  const estimatedTax = Math.max(0, currentPeriodEarnings * taxRate)

  // Also include AR from invoices not yet in ledger (accrual)
  const invoiceAR = isAccrual
    ? invoices.filter(i => ['Sent', 'Overdue'].includes(i.status) && i.issued_date <= asOf)
        .reduce((s, i) => s + Number(i.total || i.amount || 0), 0)
    : 0

  const manualSum = (arr) => arr.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)

  // Totals
  const totalCurrentAssets = cash + accountsReceivable + invoiceAR + vatReceivable + manualSum(manualAssets)
  const totalFixedAssets = fixedAssets
  const totalAssets = totalCurrentAssets + totalFixedAssets

  const totalCurrentLiabilities = accountsPayable + vatPayable + taxPayable + estimatedTax + manualSum(manualLiabilities)
  const totalLongTermLiabilities = loansPayable
  const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities

  const totalEquity = openingCapital + retainedEarnings + currentPeriodEarnings - estimatedTax + manualSum(manualEquity)
  const totalLiabEquity = totalLiabilities + totalEquity
  const balanced = Math.abs(totalAssets - totalLiabEquity) < 1

  const addRow = (setter) => setter(prev => [...prev, { id: Date.now(), label: '', amount: '' }])
  const updateRow = (setter, id, field, value) => setter(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  const removeRow = (setter, id) => setter(prev => prev.filter(r => r.id !== id))

  const s = {
    card: { background: '#0d1018', border: '0.5px solid #1e2030', borderRadius: '10px', padding: '20px', marginBottom: '16px' },
    sectionTitle: { fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px', fontWeight: '500' },
    row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid #0f1117', fontSize: '13px' },
    totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0 0', fontSize: '13px', fontWeight: '600', borderTop: '0.5px solid #2e3245', marginTop: '4px' },
    label: { color: '#666' },
    inp: { background: '#080a0f', border: '0.5px solid #1e2030', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', color: '#e8e9ed', outline: 'none', fontFamily: 'sans-serif' },
  }

  const ManualSection = ({ rows, setter }) => (
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
      <div style={{ background: isAccrual ? '#0d1428' : '#141008', border: `0.5px solid ${isAccrual ? '#6c8eff' : '#fbbf24'}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: isAccrual ? '#6c8eff' : '#fbbf24' }}>
        {isAccrual ? 'Accrual basis — revenue recognised when invoiced' : 'Cash basis — revenue recognised when payment received'}
      </div>

      {/* Balance check */}
      <div style={{ background: balanced ? '#0d2a1e' : '#2a0d0d', border: `0.5px solid ${balanced ? '#34d399' : '#f87171'}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: balanced ? '#34d399' : '#f87171', fontWeight: '500' }}>
          {balanced ? '✓ Balance sheet is balanced' : '⚠ Balance sheet is out of balance'}
        </span>
        <span style={{ fontSize: '12px', color: '#555', fontFamily: 'monospace' }}>
          Assets {fmt(totalAssets)} · Liabilities + Equity {fmt(totalLiabEquity)}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* ASSETS */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#34d399', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assets</div>

          <div style={s.card}>
            <div style={s.sectionTitle}>Current Assets</div>
            <div style={s.row}><span style={s.label}>Cash (1000)</span><span style={{ fontFamily: 'monospace', color: '#34d399' }}>{fmt(cash)}</span></div>
            <div style={s.row}><span style={s.label}>Accounts Receivable (1100)</span><span style={{ fontFamily: 'monospace', color: '#fbbf24' }}>{fmt(accountsReceivable)}</span></div>
            {isAccrual && invoiceAR > 0 && (
              <div style={s.row}><span style={{ ...s.label, paddingLeft: '12px', color: '#555' }}>Unbilled AR (invoices)</span><span style={{ fontFamily: 'monospace', color: '#fbbf24' }}>{fmt(invoiceAR)}</span></div>
            )}
            {vatReceivable > 0 && (
              <div style={s.row}><span style={s.label}>VAT Receivable (1200)</span><span style={{ fontFamily: 'monospace', color: '#ccc' }}>{fmt(vatReceivable)}</span></div>
            )}
            <ManualSection rows={manualAssets} setter={setManualAssets} />
            <div style={s.totalRow}><span style={{ color: '#e8e9ed' }}>Total Current Assets</span><span style={{ fontFamily: 'monospace', color: '#34d399' }}>{fmt(totalCurrentAssets)}</span></div>
          </div>

          {fixedAssets > 0 && (
            <div style={s.card}>
              <div style={s.sectionTitle}>Fixed Assets</div>
              <div style={s.row}><span style={s.label}>Fixed Assets (1500)</span><span style={{ fontFamily: 'monospace', color: '#ccc' }}>{fmt(fixedAssets)}</span></div>
              <div style={s.totalRow}><span style={{ color: '#e8e9ed' }}>Total Fixed Assets</span><span style={{ fontFamily: 'monospace', color: '#34d399' }}>{fmt(totalFixedAssets)}</span></div>
            </div>
          )}

          <div style={{ ...s.card, background: '#080a0f', border: '0.5px solid #2e3245' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#e8e9ed' }}>Total Assets</span>
              <span style={{ fontSize: '18px', fontWeight: '600', fontFamily: 'monospace', color: '#34d399' }}>{fmt(totalAssets)}</span>
            </div>
          </div>

          {/* AR Detail */}
          {isAccrual && invoices.filter(i => ['Sent', 'Overdue'].includes(i.status)).length > 0 && (
            <div style={s.card}>
              <div style={s.sectionTitle}>Accounts Receivable Detail</div>
              {invoices.filter(i => ['Sent', 'Overdue'].includes(i.status) && i.issued_date <= asOf).map(inv => (
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
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#f87171', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Liabilities & Equity</div>

          <div style={s.card}>
            <div style={s.sectionTitle}>Current Liabilities</div>
            {accountsPayable > 0 && <div style={s.row}><span style={s.label}>Accounts Payable (2000)</span><span style={{ fontFamily: 'monospace', color: '#f87171' }}>{fmt(accountsPayable)}</span></div>}
            <div style={s.row}><span style={s.label}>VAT Payable (2100)</span><span style={{ fontFamily: 'monospace', color: '#fbbf24' }}>{fmt(vatPayable)}</span></div>
            {taxPayable > 0 && <div style={s.row}><span style={s.label}>Tax Payable (2200)</span><span style={{ fontFamily: 'monospace', color: '#fbbf24' }}>{fmt(taxPayable)}</span></div>}
            <div style={s.row}><span style={s.label}>Est. Tax ({settings.tax_rate}%)</span><span style={{ fontFamily: 'monospace', color: '#fbbf24' }}>{fmt(estimatedTax)}</span></div>
            <ManualSection rows={manualLiabilities} setter={setManualLiabilities} />
            <div style={s.totalRow}><span style={{ color: '#e8e9ed' }}>Total Current Liabilities</span><span style={{ fontFamily: 'monospace', color: '#f87171' }}>{fmt(totalCurrentLiabilities)}</span></div>
          </div>

          {loansPayable > 0 && (
            <div style={s.card}>
              <div style={s.sectionTitle}>Long-term Liabilities</div>
              <div style={s.row}><span style={s.label}>Loans Payable (2300)</span><span style={{ fontFamily: 'monospace', color: '#f87171' }}>{fmt(loansPayable)}</span></div>
              <div style={s.totalRow}><span style={{ color: '#e8e9ed' }}>Total Long-term Liabilities</span><span style={{ fontFamily: 'monospace', color: '#f87171' }}>{fmt(totalLongTermLiabilities)}</span></div>
            </div>
          )}

          <div style={s.card}>
            <div style={s.sectionTitle}>Equity</div>
            {openingCapital > 0 && <div style={s.row}><span style={s.label}>Opening Capital (3000)</span><span style={{ fontFamily: 'monospace', color: '#a78bfa' }}>{fmt(openingCapital)}</span></div>}
            {retainedEarnings !== 0 && <div style={s.row}><span style={s.label}>Retained Earnings (3100)</span><span style={{ fontFamily: 'monospace', color: '#a78bfa' }}>{fmt(retainedEarnings)}</span></div>}
            <div style={s.row}><span style={s.label}>Current Period Earnings</span><span style={{ fontFamily: 'monospace', color: currentPeriodEarnings >= 0 ? '#34d399' : '#f87171' }}>{fmt(currentPeriodEarnings)}</span></div>
            <div style={s.row}><span style={{ ...s.label, paddingLeft: '12px', color: '#555' }}>Less: Est. Tax</span><span style={{ fontFamily: 'monospace', color: '#fbbf24' }}>−{fmt(estimatedTax)}</span></div>
            <ManualSection rows={manualEquity} setter={setManualEquity} />
            <div style={s.totalRow}><span style={{ color: '#e8e9ed' }}>Total Equity</span><span style={{ fontFamily: 'monospace', color: totalEquity >= 0 ? '#34d399' : '#f87171' }}>{fmt(totalEquity)}</span></div>
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