'use client'
import { useEffect, useState } from 'react'

export default function Landing() {
  const [scrolled, setScrolled] = useState(false)
  const [annual, setAnnual] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ background: '#04050a', color: '#e8eaf0', fontFamily: "'DM Sans', sans-serif", overflowX: 'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes pulse{0%,100%{opacity:0.4}50%{opacity:0.8}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        .fade-up{animation:fadeUp 0.7s ease forwards;opacity:0}
        .fade-up-1{animation-delay:0.1s}
        .fade-up-2{animation-delay:0.2s}
        .fade-up-3{animation-delay:0.3s}
        .fade-up-4{animation-delay:0.4s}
        .fade-up-5{animation-delay:0.5s}
        .hero-glow{position:absolute;width:800px;height:800px;border-radius:50%;background:radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%);pointer-events:none}
        .grid-bg{background-image:linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px);background-size:60px 60px}
        .feature-card:hover{border-color:#6366f1 !important;transform:translateY(-2px)}
        .feature-card{transition:all 0.2s}
        .price-card:hover{transform:translateY(-4px)}
        .price-card{transition:all 0.25s}
        .btn-primary:hover{transform:translateY(-1px);box-shadow:0 8px 30px rgba(99,102,241,0.4)}
        .btn-primary{transition:all 0.2s}
        .btn-ghost:hover{background:rgba(255,255,255,0.06)}
        .btn-ghost{transition:all 0.15s}
        .nav-link:hover{color:#e8eaf0}
        .nav-link{transition:color 0.15s}
        .shimmer{background:linear-gradient(90deg,#6366f1,#8b5cf6,#06b6d4,#6366f1);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer 4s linear infinite}
        .stat-num{font-family:'Sora',sans-serif;font-size:42px;font-weight:800;background:linear-gradient(135deg,#fff,#a5b4fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .mock-bar{animation:float 3s ease-in-out infinite}
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, transition: 'all 0.3s', background: scrolled ? 'rgba(4,5,10,0.9)' : 'transparent', backdropFilter: scrolled ? 'blur(12px)' : 'none', borderBottom: scrolled ? '0.5px solid rgba(255,255,255,0.06)' : 'none' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '22px', fontWeight: '700', fontFamily: "'Sora', sans-serif", color: '#fff' }}>
            ledgr<span style={{ color: '#6366f1' }}>.</span>
          </div>
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
            {['Features', 'Pricing', 'About'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="nav-link" style={{ fontSize: '14px', color: '#888', textDecoration: 'none' }}>{item}</a>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <a href="/login" className="btn-ghost" style={{ fontSize: '14px', color: '#aaa', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', textDecoration: 'none' }}>Sign in</a>
            <a href="/login" className="btn-primary" style={{ fontSize: '14px', fontWeight: '500', color: '#fff', background: '#6366f1', padding: '9px 20px', borderRadius: '8px', cursor: 'pointer', textDecoration: 'none' }}>Get started free</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="grid-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '120px 32px 80px' }}>
        <div className="hero-glow" style={{ top: '10%', left: '50%', transform: 'translateX(-50%)' }} />
        <div className="hero-glow" style={{ top: '40%', left: '20%', opacity: 0.5 }} />
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div className="fade-up fade-up-1" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(99,102,241,0.12)', border: '0.5px solid rgba(99,102,241,0.3)', borderRadius: '100px', padding: '6px 16px', marginBottom: '32px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366f1', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '13px', color: '#a5b4fc', fontWeight: '500' }}>Now with double-entry bookkeeping</span>
          </div>
          <h1 className="fade-up fade-up-2" style={{ fontSize: 'clamp(48px, 8vw, 88px)', fontWeight: '800', fontFamily: "'Sora', sans-serif", lineHeight: '1.05', letterSpacing: '-2px', marginBottom: '24px', color: '#fff' }}>
            Accounting that<br /><span className="shimmer">actually makes sense</span>
          </h1>
          <p className="fade-up fade-up-3" style={{ fontSize: '19px', color: '#888', lineHeight: '1.7', maxWidth: '580px', margin: '0 auto 40px', fontWeight: '300' }}>
            Ledgr is the modern accounting platform for freelancers and small businesses. Invoices, expenses, P&L, balance sheet — all in one place.
          </p>
          <div className="fade-up fade-up-4" style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/login" className="btn-primary" style={{ fontSize: '15px', fontWeight: '600', color: '#fff', background: '#6366f1', padding: '14px 32px', borderRadius: '10px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}>
              Start for free →
            </a>
            <a href="#features" className="btn-ghost" style={{ fontSize: '15px', color: '#888', padding: '14px 28px', borderRadius: '10px', cursor: 'pointer', textDecoration: 'none', border: '0.5px solid rgba(255,255,255,0.1)', display: 'inline-block' }}>
              See how it works
            </a>
          </div>
          <div className="fade-up fade-up-5" style={{ marginTop: '16px', fontSize: '13px', color: '#444' }}>No credit card required · Free forever plan available</div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ padding: '60px 32px', borderTop: '0.5px solid rgba(255,255,255,0.05)', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '40px', textAlign: 'center' }}>
          {[
            { num: '10K+', label: 'Businesses tracked' },
            { num: '€2B+', label: 'Revenue managed' },
            { num: '99.9%', label: 'Uptime guaranteed' },
            { num: '4.9★', label: 'Average rating' }
          ].map(s => (
            <div key={s.label}>
              <div className="stat-num">{s.num}</div>
              <div style={{ fontSize: '13px', color: '#555', marginTop: '6px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* DASHBOARD MOCKUP */}
      <section style={{ padding: '100px 32px', position: 'relative', overflow: 'hidden' }}>
        <div className="hero-glow" style={{ top: '0', left: '50%', transform: 'translateX(-50%)', opacity: 0.6 }} />
        <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: '800', fontFamily: "'Sora',sans-serif", color: '#fff', letterSpacing: '-1px', marginBottom: '16px' }}>
              Your finances, finally clear
            </h2>
            <p style={{ fontSize: '17px', color: '#666', maxWidth: '500px', margin: '0 auto' }}>A real-time view of everything that matters — revenue, expenses, profit, and tax.</p>
          </div>
          {/* Mock Dashboard */}
          <div style={{ background: '#0a0b12', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', boxShadow: '0 40px 100px rgba(0,0,0,0.6)' }}>
            {/* Mock nav */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {['Dashboard','Invoices','Expenses','Ledger','P&L Report'].map((item,i) => (
                <div key={item} style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '12px', background: i === 0 ? '#161b2e' : 'transparent', color: i === 0 ? '#6366f1' : '#444', cursor: 'default' }}>{item}</div>
              ))}
            </div>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'Total Revenue', val: '€84,320', color: '#34d399', change: '+12.4%' },
                { label: 'Outstanding', val: '€18,740', color: '#fbbf24', change: '3 invoices' },
                { label: 'Total Expenses', val: '€31,220', color: '#f87171', change: '+4.1%' },
                { label: 'Net Profit', val: '€53,100', color: '#a5b4fc', change: '63% margin' }
              ].map(k => (
                <div key={k.label} style={{ background: '#0d0f1a', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '10px', color: '#444', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '8px' }}>{k.label}</div>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: k.color, fontFamily: 'monospace' }}>{k.val}</div>
                  <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>{k.change}</div>
                </div>
              ))}
            </div>
            {/* Mock Chart */}
            <div style={{ background: '#0d0f1a', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: '#444', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '14px' }}>Monthly Revenue</div>
              <div className="mock-bar" style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '80px' }}>
                {[35,52,44,68,75,62,80,85,72,90,95,88].map((h,i) => (
                  <div key={i} style={{ flex: 1, borderRadius: '3px 3px 0 0', background: i === 11 ? '#6366f1' : 'rgba(99,102,241,0.25)', height: `${h}%`, transition: 'height 0.3s' }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                {['J','F','M','A','M','J','J','A','S','O','N','D'].map(m => (
                  <div key={m} style={{ fontSize: '9px', color: '#333', flex: 1, textAlign: 'center' }}>{m}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: '100px 32px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{ fontSize: '12px', color: '#6366f1', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>Everything you need</div>
            <h2 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: '800', fontFamily: "'Sora',sans-serif", color: '#fff', letterSpacing: '-1px' }}>
              Built for how businesses<br />actually work
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
            {[
              { icon: '◈', title: 'Smart Invoicing', desc: 'Auto-numbered invoices with line items, VAT calculation, duplicate detection and payment tracking.', color: '#6366f1' },
              { icon: '◱', title: 'Expense Tracking', desc: 'Categorise expenses with VAT breakdown. Upload receipts. Custom categories for your business.', color: '#34d399' },
              { icon: '◲', title: 'P&L Reports', desc: 'Real-time profit & loss with period filters, margin analysis, and revenue by client breakdown.', color: '#f59e0b' },
              { icon: '◳', title: 'Double-Entry Bookkeeping', desc: 'Every transaction creates balanced journal entries automatically. No accounting degree required.', color: '#8b5cf6' },
              { icon: '◫', title: 'Balance Sheet', desc: 'Live balance sheet with accrual or cash basis accounting. Assets, liabilities, and equity always in sync.', color: '#06b6d4' },
              { icon: '◉', title: 'Bank Reconciliation', desc: 'Import bank CSV files, auto-match transactions, and reconcile in minutes instead of hours.', color: '#f87171' },
              { icon: '⊞', title: 'Chart of Accounts', desc: '23 pre-built accounts covering every aspect of your business. Add custom accounts anytime.', color: '#34d399' },
              { icon: '◌', title: 'Tax Management', desc: 'VAT tracking, estimated corporate tax, quarterly summaries — everything your accountant needs.', color: '#fbbf24' },
              { icon: '⊕', title: 'Transaction Templates', desc: '10 system templates for common entries. Create custom templates for your recurring transactions.', color: '#6366f1' },
            ].map(f => (
              <div key={f.title} className="feature-card" style={{ background: '#0a0b12', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '24px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: f.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: f.color, marginBottom: '16px' }}>{f.icon}</div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#e8eaf0', marginBottom: '8px', fontFamily: "'Sora',sans-serif" }}>{f.title}</div>
                <div style={{ fontSize: '13px', color: '#555', lineHeight: '1.65' }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: '100px 32px', position: 'relative' }}>
        <div className="hero-glow" style={{ top: '0', left: '30%', opacity: 0.4 }} />
        <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: '800', fontFamily: "'Sora',sans-serif", color: '#fff', letterSpacing: '-1px', marginBottom: '16px' }}>
              Simple, honest pricing
            </h2>
            <p style={{ fontSize: '16px', color: '#666', marginBottom: '28px' }}>No hidden fees. No per-invoice charges. Just flat monthly pricing.</p>
            <div style={{ display: 'inline-flex', background: '#0a0b12', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '4px', gap: '4px' }}>
              {['Monthly', 'Annual'].map(t => (
                <button key={t} onClick={() => setAnnual(t === 'Annual')}
                  style={{ padding: '8px 20px', borderRadius: '7px', fontSize: '13px', fontWeight: '500', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", background: (t === 'Annual') === annual ? '#6366f1' : 'transparent', color: (t === 'Annual') === annual ? '#fff' : '#666', transition: 'all 0.2s' }}>
                  {t} {t === 'Annual' && <span style={{ fontSize: '11px', color: annual ? '#a5b4fc' : '#444' }}>−20%</span>}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
            {[
              {
                name: 'Free', price: '€0', period: 'forever',
                desc: 'Perfect for freelancers just getting started',
                features: ['5 invoices/month', 'Unlimited expenses', 'P&L report', 'Basic chart of accounts', 'CSV export'],
                cta: 'Get started', accent: false
              },
              {
                name: 'Pro', price: annual ? '€15' : '€19', period: '/month',
                desc: 'Everything a growing business needs',
                features: ['Unlimited invoices', 'Bank CSV import', 'Full double-entry ledger', 'Balance sheet', 'Transaction templates', 'VAT reports', 'Priority support'],
                cta: 'Start free trial', accent: true
              },
              {
                name: 'Business', price: annual ? '€39' : '€49', period: '/month',
                desc: 'For teams and accountants',
                features: ['Everything in Pro', 'Multi-user access', 'Accountant portal', 'Custom chart of accounts', 'API access', 'Dedicated support', 'Custom integrations'],
                cta: 'Contact us', accent: false
              }
            ].map(plan => (
              <div key={plan.name} className="price-card" style={{ background: plan.accent ? 'linear-gradient(145deg,#1a1b2e,#111228)' : '#0a0b12', border: `0.5px solid ${plan.accent ? '#6366f1' : 'rgba(255,255,255,0.06)'}`, borderRadius: '14px', padding: '28px', position: 'relative' }}>
                {plan.accent && <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#6366f1', color: '#fff', fontSize: '11px', fontWeight: '600', padding: '4px 14px', borderRadius: '100px', whiteSpace: 'nowrap' }}>Most Popular</div>}
                <div style={{ fontSize: '14px', fontWeight: '600', color: plan.accent ? '#a5b4fc' : '#888', marginBottom: '8px', fontFamily: "'Sora',sans-serif" }}>{plan.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '42px', fontWeight: '800', color: '#fff', fontFamily: "'Sora',sans-serif", lineHeight: 1 }}>{plan.price}</span>
                  <span style={{ fontSize: '14px', color: '#555' }}>{plan.period}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#555', marginBottom: '24px', lineHeight: '1.5' }}>{plan.desc}</div>
                <a href="/login" style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', textDecoration: 'none', background: plan.accent ? '#6366f1' : 'rgba(255,255,255,0.06)', color: plan.accent ? '#fff' : '#888', marginBottom: '24px', transition: 'all 0.2s' }}>{plan.cta}</a>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{ color: plan.accent ? '#6366f1' : '#34d399', fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>✓</span>
                      <span style={{ fontSize: '13px', color: '#666' }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '100px 32px', textAlign: 'center', position: 'relative' }}>
        <div className="hero-glow" style={{ top: '-100px', left: '50%', transform: 'translateX(-50%)' }} />
        <div style={{ maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
          <h2 style={{ fontSize: 'clamp(36px,6vw,64px)', fontWeight: '800', fontFamily: "'Sora',sans-serif", color: '#fff', letterSpacing: '-2px', lineHeight: 1.1, marginBottom: '20px' }}>
            Ready to take control of your finances?
          </h2>
          <p style={{ fontSize: '17px', color: '#555', marginBottom: '36px', lineHeight: 1.6 }}>
            Join thousands of businesses using Ledgr to manage their accounting. Free to start, no credit card required.
          </p>
          <a href="/login" className="btn-primary" style={{ display: 'inline-block', fontSize: '16px', fontWeight: '600', color: '#fff', background: '#6366f1', padding: '16px 40px', borderRadius: '12px', cursor: 'pointer', textDecoration: 'none' }}>
            Create your free account →
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '40px 32px', borderTop: '0.5px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', fontFamily: "'Sora',sans-serif", color: '#fff' }}>ledgr<span style={{ color: '#6366f1' }}>.</span></div>
          <div style={{ fontSize: '13px', color: '#333' }}>© 2026 Ledgr. Built with care for small businesses.</div>
          <div style={{ display: 'flex', gap: '24px' }}>
            {['Privacy', 'Terms', 'Contact'].map(item => (
              <a key={item} href="#" style={{ fontSize: '13px', color: '#444', textDecoration: 'none' }}>{item}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}