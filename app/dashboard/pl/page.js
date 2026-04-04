'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const PERIODS = ['This Month', 'Last Month', 'This Quarter', 'Last Quarter', 'This Year', 'Last Year', 'All Time']

function getPeriodDates(period) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const q = Math.floor(m / 3)
  switch (period) {
    case 'This Month': return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0) }
    case 'Last Month': return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0) }
    case 'This Quarter': return { start: new Date(y, q * 3, 1), end: new Date(y, q * 3 + 3, 0) }
    case 'Last Quarter': return { start: new Date(y, (q - 1) * 3, 1), end: new Date(y, q * 3, 0) }
    case 'This Year': return { start: new Date(y, 0, 1), end: new Date(y, 11, 31) }
    case 'Last Year': return { start: new Date(y - 1, 0, 1), end: new Date(y - 1, 11, 31) }
    case 'All Time': return { start: new Date('2000-01-01'), end: new Date('2099-12-31') }
    default: return { start: new Date(y, 0, 1), end: new Date(y, 11, 31) }
  }
}

function getPrevPeriodDates(period) {
  switch (period) {
    case 'This Month': return getPeriodDates('Last Month')
    case 'This Quarter': return getPeriodDates('Last Quarter')
    case 'This Year': return getPeriodDates('Last Year')
    default: return null
  }
}

function fmt(n) { return '€' + Number(n || 0).toFixed(2) }
function pct(n) { return Number(n || 0).toFixed(1) + '%' }
function change(curr, prev) {
  if (!prev || prev === 0) return null
  const p = ((curr - prev) / Math.abs(prev)) * 100
  return { value: p.toFixed(1), up: p >= 0 }
}

export default function PL() {
  const [invoices, setInvoices] = useState([])
  const [expenses, setExpenses] = useState([])
  const [period, setPeriod] = useState('This Year')
  const [taxRate, setTaxRate] = useState(20)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: inv }, { data: exp }] = await Promise.all([
        supabase.from('invoices').select('*').eq('user_id', user.id),
        supabase.from('expenses').select('*').eq('user_id', user.id)
      ])
      setInvoices(inv || [])
      setExpenses(exp || [])
    }
    load()
  }, [])

  const filterByPeriod = (data, dateField, dates) => {
    return data.filter(d => {
      const date = new Date(d[dateField])
      return date >= dates.start && date <= dates.end
    })
  }

  const dates = getPeriodDates(period)
  const prevDates = getPrevPeriodDates(period)

  const periodInvoices = filterByPeriod(invoices, 'issued_date', dates)
  const periodExpenses = filterByPeriod(expenses, 'date', dates)
  const prevInvoices = prevDates ? filterByPeriod(invoices, 'issued_date', prevDates) : []
  const prevExpenses = prevDates ? filterByPeriod(expenses, 'date', prevDates) : []

  const paidInvoices = periodInvoices.filter(i => i.status === 'Paid')
  const totalRevenue = paidInvoices.reduce((s, i) => s + Number(i.total || i.amount || 0), 0)
  const totalVATCollected = paidInvoices.reduce((s, i) => s + Number(i.vat_amount || 0), 0)
  const revenueExVAT = totalRevenue - totalVATCollected

  const totalExpenses = periodExpenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const totalExpensesNet = periodExpenses.reduce((s, e) => s + Number(e.net_amount || e.amount || 0), 0)
  const totalVATOnExpenses = periodExpenses.reduce((s, e) => s + Number(e.vat_amount || 0), 0)

  const grossProfit = revenueExVAT - totalExpensesNet
  const grossMargin = revenueExVAT > 0 ? (grossProfit / revenueExVAT) * 100 : 0
  const netVATPayable = totalVATCollected - totalVATOnExpenses
  const estimatedTax = Math.max(0, grossProfit * (taxRate / 100))
  const netProfit = grossProfit - estimatedTax
  const netMargin = revenueExVAT > 0 ? (netProfit / revenueExVAT) * 100 : 0

  const prevRevenue = prevInvoices.filter(i => i.status === 'Paid').reduce((s, i) => s + Number(i.total || i.amount || 0), 0)
  const prevExpensesTotal = prevExpenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const prevGrossProfit = prevRevenue - prevExpensesTotal
  const prevNetProfit = prevGrossProfit - Math.max(0, prevGrossProfit * (taxRate / 100))

  const revenueByClient = paidInvoices.reduce((acc, inv) => {
    acc[inv.client] = (acc[inv.client] || 0) + Number(inv.total || inv.amount || 0)
    return acc
  }, {})

  const expensesByCategory = periodExpenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount || 0)
    return acc
  }, {})

  const outstandingRevenue = periodInvoices.filter(i => ['Sent', 'Overdue'].includes(i.status)).reduce((s, i) => s + Number(i.total || i.amount || 0), 0)

  const s = {
    card: { background: '#0d1018', border: '0.5px solid #1e2030', borderRadius: '10px', padding: '20px' },
    row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '0.5px solid #0f1117', fontSize: '13px' },
    label: { color: '#666' },
    val: { fontFamily: 'monospace', color: '#ccc' },
    sectionTitle: { fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px' },
    totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0 0', fontSize: '14px', fontWeight: '600', borderTop: '0.5px solid #2e3245', marginTop: '4px' },
  }

  const Row = ({ label, value, color, indent }) => (
    <div style={{ ...s.row, paddingLeft: indent ? '12px' : 0 }}>
      <span style={{ ...s.label, color: indent ? '#555' : '#666' }}>{label}</span>
      <span style={{ fontFamily: 'monospace', color: color || '#ccc' }}>{value}</span>
    </div>
  )

  const ChangeTag = ({ curr, prev }) => {
    const c = change(curr, prev)
    if (!c) return null
    return <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: c.up ? '#0d2a1e' : '#2a0d0d', color: c.up ? '#34d399' : '#f87171', marginLeft: '8px' }}>{c.up ? '▲' : '▼'} {Math.abs(c.value)}%</span>
  }

  return (
    <div style={{ padding: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#e8e9ed' }}>P&L Report</div>
          <div style={{ fontSize: '12px', color: '#555', marginTop: '3px' }}>
            {dates.start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} — {dates.end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{ background: period === p ? '#6c8eff' : 'transparent', color: period === p ? '#fff' : '#555', border: '0.5px solid #1e2030', borderRadius: '20px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer', fontFamily: 'sans-serif' }}>{p}</button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0d1018', border: '0.5px solid #1e2030', borderRadius: '8px', padding: '6px 12px' }}>
            <span style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Tax Rate</span>
            <input type="number" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} min="0" max="100" style={{ width: '48px', background: 'transparent', border: 'none', color: '#e8e9ed', fontSize: '13px', fontFamily: 'monospace', outline: 'none', textAlign: 'right' }} />
            <span style={{ fontSize: '12px', color: '#555' }}>%</span>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Revenue (ex VAT)', value: fmt(revenueExVAT), color: '#34d399', prev: prevRevenue, curr: revenueExVAT },
          { label: 'Total Expenses', value: fmt(totalExpenses), color: '#f87171', prev: prevExpensesTotal, curr: totalExpenses },
          { label: 'Gross Profit', value: fmt(grossProfit), color: grossProfit >= 0 ? '#34d399' : '#f87171', prev: prevGrossProfit, curr: grossProfit },
          { label: 'Net Profit', value: fmt(netProfit), color: netProfit >= 0 ? '#34d399' : '#f87171', prev: prevNetProfit, curr: netProfit },
        ].map(k => (
          <div key={k.label} style={{ background: '#0d1018', border: '0.5px solid #1e2030', borderRadius: '10px', padding: '16px 20px' }}>
            <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '8px' }}>{k.label}</div>
            <div style={{ fontSize: '22px', fontWeight: '600', fontFamily: 'monospace', color: k.color }}>{k.value}</div>
            {prevDates && <div style={{ marginTop: '6px' }}><ChangeTag curr={k.curr} prev={k.prev} /></div>}
          </div>
        ))}
      </div>

      {/* Margins */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Gross Margin', value: grossMargin, color: grossMargin >= 50 ? '#34d399' : grossMargin >= 20 ? '#fbbf24' : '#f87171' },
          { label: 'Net Margin', value: netMargin, color: netMargin >= 30 ? '#34d399' : netMargin >= 10 ? '#fbbf24' : '#f87171' },
        ].map(m => (
          <div key={m.label} style={{ background: '#0d1018', border: '0.5px solid #1e2030', borderRadius: '10px', padding: '16px 20px' }}>
            <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '8px' }}>{m.label}</div>
            <div style={{ fontSize: '36px', fontWeight: '600', fontFamily: 'monospace', color: m.color, marginBottom: '10px' }}>{pct(m.value)}</div>
            <div style={{ height: '6px', background: '#1e2030', borderRadius: '3px' }}>
              <div style={{ height: '100%', borderRadius: '3px', background: m.color, width: `${Math.min(100, Math.max(0, m.value))}%`, transition: 'width 0.5s' }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Revenue */}
        <div style={s.card}>
          <div style={s.sectionTitle}>Revenue</div>
          <Row label="Paid invoices (gross)" value={fmt(totalRevenue)} />
          <Row label="VAT collected" value={fmt(totalVATCollected)} color="#fbbf24" indent />
          <Row label="Revenue (ex VAT)" value={fmt(revenueExVAT)} color="#34d399" />
          <Row label="Outstanding (sent/overdue)" value={fmt(outstandingRevenue)} color="#fbbf24" />
          <div style={s.totalRow}>
            <span style={{ color: '#e8e9ed' }}>Total Revenue ex VAT</span>
            <span style={{ fontFamily: 'monospace', color: '#34d399' }}>{fmt(revenueExVAT)}</span>
          </div>
        </div>

        {/* Expenses */}
        <div style={s.card}>
          <div style={s.sectionTitle}>Expenses</div>
          <Row label="Total gross expenses" value={fmt(totalExpenses)} />
          <Row label="VAT on expenses" value={fmt(totalVATOnExpenses)} color="#fbbf24" indent />
          <Row label="Net expenses (ex VAT)" value={fmt(totalExpensesNet)} color="#f87171" />
          <div style={s.totalRow}>
            <span style={{ color: '#e8e9ed' }}>Total Net Expenses</span>
            <span style={{ fontFamily: 'monospace', color: '#f87171' }}>{fmt(totalExpensesNet)}</span>
          </div>
        </div>

        {/* Profitability */}
        <div style={s.card}>
          <div style={s.sectionTitle}>Profitability</div>
          <Row label="Revenue (ex VAT)" value={fmt(revenueExVAT)} color="#34d399" />
          <Row label="Net expenses" value={`−${fmt(totalExpensesNet)}`} color="#f87171" />
          <Row label="Gross profit" value={fmt(grossProfit)} color={grossProfit >= 0 ? '#34d399' : '#f87171'} />
          <Row label={`Gross margin`} value={pct(grossMargin)} />
          <Row label={`Est. tax (${taxRate}%)`} value={`−${fmt(estimatedTax)}`} color="#fbbf24" />
          <div style={s.totalRow}>
            <span style={{ color: '#e8e9ed' }}>Net Profit</span>
            <span style={{ fontFamily: 'monospace', color: netProfit >= 0 ? '#34d399' : '#f87171' }}>{fmt(netProfit)}</span>
          </div>
        </div>

        {/* VAT Summary */}
        <div style={s.card}>
          <div style={s.sectionTitle}>VAT Summary</div>
          <Row label="VAT collected (output)" value={fmt(totalVATCollected)} color="#34d399" />
          <Row label="VAT on expenses (input)" value={`−${fmt(totalVATOnExpenses)}`} color="#f87171" />
          <Row label="Net VAT payable" value={fmt(netVATPayable)} color="#fbbf24" />
          <div style={{ marginTop: '14px', background: '#080a0f', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '6px' }}>Est. Corp Tax ({taxRate}%)</div>
            <div style={{ fontSize: '22px', fontWeight: '600', fontFamily: 'monospace', color: '#fbbf24' }}>{fmt(estimatedTax)}</div>
          </div>
        </div>
      </div>

      {/* Revenue by Client */}
      {Object.keys(revenueByClient).length > 0 && (
        <div style={{ ...s.card, marginBottom: '20px' }}>
          <div style={s.sectionTitle}>Revenue by client</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(revenueByClient).sort((a, b) => b[1] - a[1]).map(([client, amount]) => (
              <div key={client}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', color: '#ccc' }}>{client}</span>
                  <span style={{ fontSize: '13px', fontFamily: 'monospace', color: '#34d399' }}>
                    {fmt(amount)} <span style={{ color: '#555' }}>({revenueExVAT > 0 ? ((amount / revenueExVAT) * 100).toFixed(1) : 0}%)</span>
                  </span>
                </div>
                <div style={{ height: '4px', background: '#1e2030', borderRadius: '2px' }}>
                  <div style={{ height: '100%', borderRadius: '2px', background: '#34d399', width: `${revenueExVAT > 0 ? (amount / revenueExVAT) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expenses by Category */}
      {Object.keys(expensesByCategory).length > 0 && (
        <div style={s.card}>
          <div style={s.sectionTitle}>Expenses by category</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => (
              <div key={cat}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', color: '#aaa' }}>{cat}</span>
                  <span style={{ fontSize: '13px', fontFamily: 'monospace', color: '#f87171' }}>
                    {fmt(amount)} <span style={{ color: '#555' }}>({totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : 0}%)</span>
                  </span>
                </div>
                <div style={{ height: '4px', background: '#1e2030', borderRadius: '2px' }}>
                  <div style={{ height: '100%', borderRadius: '2px', background: '#f87171', width: `${totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}