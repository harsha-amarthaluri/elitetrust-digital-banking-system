import { Link } from 'react-router-dom';
import {
  Shield,
  UserCheck,
  Send,
  TrendingUp,
  CreditCard,
  Zap,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Lock,
  Globe,
  Award,
} from 'lucide-react';
import '../styles/pages/Home.css';

/* ─── Data ────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: <UserCheck size={24} strokeWidth={1.75} />,
    title: 'Digital Account Opening',
    desc: 'Complete KYC in minutes, 100% online — no branch visit required.',
  },
  {
    icon: <Send size={24} strokeWidth={1.75} />,
    title: 'Instant Transfers',
    desc: 'IMPS / NEFT / RTGS in real-time, available 24 × 7, every day.',
  },
  {
    icon: <TrendingUp size={24} strokeWidth={1.75} />,
    title: 'Fixed Deposits',
    desc: 'Earn up to 7.5% p.a. with flexible tenures from 7 days to 5 years.',
  },
  {
    icon: <CreditCard size={24} strokeWidth={1.75} />,
    title: 'Smart Cards',
    desc: 'Instantly issued virtual cards and personalized physical debit / credit cards.',
  },
  {
    icon: <Zap size={24} strokeWidth={1.75} />,
    title: 'Bill Payments',
    desc: 'Pay utilities, recharge mobiles, and manage insurance — all in one place.',
  },
  {
    icon: <Shield size={24} strokeWidth={1.75} />,
    title: 'Bank-Grade Security',
    desc: 'MFA, device tracking, AI fraud detection, and real-time transaction alerts.',
  },
];

const SECURITY_ITEMS = [
  'Multi-Factor Authentication',
  'Real-time Fraud Detection',
  'End-to-end Encryption',
  'Device & Session Management',
  'Regulatory Compliance (RBI)',
  'Instant Account Freeze',
];

const STATS = [
  { value: '2M+', label: 'Customers' },
  { value: '₹50B+', label: 'Transactions' },
  { value: '256-bit', label: 'Encryption' },
  { value: 'ISO 27001', label: 'Certified' },
];

const ACCOUNTS = [
  {
    type: 'Savings Account',
    badge: null,
    desc: 'The smarter way to save and spend. Built for everyday banking needs.',
    features: [
      '4.5% interest p.a. on balance',
      'Zero account maintenance fees',
      'Instant IMPS / UPI transfers',
      'Free virtual debit card',
    ],
  },
  {
    type: 'Current Account',
    badge: 'Business',
    desc: 'Power your business with a banking partner that scales with you.',
    features: [
      'Unlimited high-volume transactions',
      'Business banking dashboard',
      'Dedicated relationship manager',
      'GST-ready account statements',
    ],
  },
  {
    type: 'Fixed Deposit',
    badge: 'Best Returns',
    desc: 'Put your money to work with assured, institutional-grade returns.',
    features: [
      'Up to 7.5% p.a. interest',
      'Tenures: 7 days to 5 years',
      'Auto-renewal options',
      'Premature withdrawal facility',
    ],
  },
];

/* ─── Component ───────────────────────────────────────────── */
export default function Home() {
  return (
    <div className="home-root">
      {/* ── Navbar ──────────────────────────────────────────── */}
      <nav className="home-nav">
        <div className="home-nav__inner">
          <Link to="/" className="home-nav__brand">
            <Shield size={22} strokeWidth={2} className="home-nav__brand-icon" />
            <span className="home-nav__brand-name">EliteTrust Bank</span>
          </Link>

          <ul className="home-nav__links">
            <li><a href="#features" className="home-nav__link">Features</a></li>
            <li><a href="#security" className="home-nav__link">Security</a></li>
            <li><a href="#accounts" className="home-nav__link">Accounts</a></li>
            <li>
              <Link to="/login" className="home-nav__link">Login</Link>
            </li>
            <li>
              <Link to="/signup" className="home-nav__btn">Open Account</Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="home-hero">
        <div className="home-hero__shape home-hero__shape--1" aria-hidden="true" />
        <div className="home-hero__shape home-hero__shape--2" aria-hidden="true" />
        <div className="home-hero__shape home-hero__shape--3" aria-hidden="true" />

        <div className="home-hero__content">
          <div className="home-hero__eyebrow">
            <Lock size={13} strokeWidth={2} />
            <span>RBI Regulated &middot; DICGC Insured</span>
          </div>

          <h1 className="home-hero__heading">
            Banking built for the<br />
            <span className="home-hero__heading-accent">modern professional.</span>
          </h1>

          <p className="home-hero__sub">
            Institutional-grade security. Real-time transactions.<br className="home-hero__br" />
            Complete digital banking — from your phone or desktop.
          </p>

          <div className="home-hero__cta-row">
            <Link to="/signup" className="home-btn home-btn--primary">
              Open Account
            </Link>
            <a href="#features" className="home-btn home-btn--ghost">
              Learn more <ArrowRight size={15} strokeWidth={2} className="home-btn__arrow" />
            </a>
          </div>
        </div>

        <div className="home-hero__stats">
          {STATS.map((s) => (
            <div key={s.label} className="home-hero__stat">
              <span className="home-hero__stat-value">{s.value}</span>
              <span className="home-hero__stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section id="features" className="home-section home-section--light">
        <div className="home-container">
          <div className="home-section__header">
            <p className="home-section__eyebrow">Platform Features</p>
            <h2 className="home-section__title">Everything you need. Nothing you don't.</h2>
            <p className="home-section__desc">
              A complete banking suite engineered for speed, security, and simplicity.
            </p>
          </div>

          <div className="home-features__grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="home-feature-card">
                <div className="home-feature-card__icon">{f.icon}</div>
                <h3 className="home-feature-card__title">{f.title}</h3>
                <p className="home-feature-card__desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security Trust ──────────────────────────────────── */}
      <section id="security" className="home-section home-section--dark">
        <div className="home-container home-trust__layout">
          <div className="home-trust__left">
            <p className="home-section__eyebrow home-section__eyebrow--light">Security First</p>
            <h2 className="home-trust__heading">
              Your money.<br />
              Protected by<br />
              enterprise-grade<br />
              security.
            </h2>
            <p className="home-trust__sub">
              We apply the same security standards used by global financial institutions,
              so you can bank with confidence — always.
            </p>
            <Link to="/signup" className="home-btn home-btn--white">
              Get started <ChevronRight size={15} strokeWidth={2.5} />
            </Link>
          </div>

          <div className="home-trust__right">
            {SECURITY_ITEMS.map((item) => (
              <div key={item} className="home-trust__item">
                <CheckCircle2 size={18} strokeWidth={2} className="home-trust__check" />
                <span className="home-trust__item-text">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Account Types ───────────────────────────────────── */}
      <section id="accounts" className="home-section home-section--light">
        <div className="home-container">
          <div className="home-section__header">
            <p className="home-section__eyebrow">Account Types</p>
            <h2 className="home-section__title">Choose the account that fits your life.</h2>
            <p className="home-section__desc">
              Whether you're saving, running a business, or growing wealth — we have the right product.
            </p>
          </div>

          <div className="home-accounts__grid">
            {ACCOUNTS.map((acct, idx) => (
              <div
                key={acct.type}
                className={`home-account-card${idx === 1 ? ' home-account-card--featured' : ''}`}
              >
                {acct.badge && (
                  <span className="home-account-card__badge">{acct.badge}</span>
                )}
                <h3 className="home-account-card__type">{acct.type}</h3>
                <p className="home-account-card__desc">{acct.desc}</p>
                <ul className="home-account-card__features">
                  {acct.features.map((feat) => (
                    <li key={feat} className="home-account-card__feature">
                      <CheckCircle2 size={15} strokeWidth={2} className="home-account-card__check" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className={`home-btn home-account-card__cta${idx === 1 ? ' home-btn--primary' : ' home-btn--outline'}`}
                >
                  Open Account
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Compliance Banner ───────────────────────────────── */}
      <section className="home-compliance">
        <div className="home-container home-compliance__inner">
          <div className="home-compliance__item">
            <Globe size={18} strokeWidth={1.75} className="home-compliance__icon" />
            <span>RBI Regulated Institution</span>
          </div>
          <div className="home-compliance__divider" aria-hidden="true" />
          <div className="home-compliance__item">
            <Shield size={18} strokeWidth={1.75} className="home-compliance__icon" />
            <span>DICGC Insured up to ₹5 Lakh</span>
          </div>
          <div className="home-compliance__divider" aria-hidden="true" />
          <div className="home-compliance__item">
            <Award size={18} strokeWidth={1.75} className="home-compliance__icon" />
            <span>ISO 27001 Certified</span>
          </div>
          <div className="home-compliance__divider" aria-hidden="true" />
          <div className="home-compliance__item">
            <Lock size={18} strokeWidth={1.75} className="home-compliance__icon" />
            <span>256-bit TLS Encryption</span>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="home-footer">
        <div className="home-container">
          <div className="home-footer__top">
            <div className="home-footer__col">
              <div className="home-footer__brand">
                <Shield size={20} strokeWidth={2} className="home-footer__brand-icon" />
                <span className="home-footer__brand-name">EliteTrust Bank</span>
              </div>
              <p className="home-footer__tagline">
                Institutional-grade banking for the modern professional.
              </p>
              <p className="home-footer__copy">&copy; 2026 EliteTrust Bank. All rights reserved.</p>
            </div>

            <div className="home-footer__col">
              <p className="home-footer__col-title">Quick Links</p>
              <ul className="home-footer__list">
                <li><Link to="/dashboard" className="home-footer__link">Dashboard</Link></li>
                <li><a href="#features" className="home-footer__link">Services</a></li>
                <li><a href="#accounts" className="home-footer__link">Accounts</a></li>
                <li><a href="#security" className="home-footer__link">Security</a></li>
                <li><Link to="/login" className="home-footer__link">Login</Link></li>
              </ul>
            </div>

            <div className="home-footer__col">
              <p className="home-footer__col-title">Regulatory</p>
              <ul className="home-footer__list">
                <li className="home-footer__reg-item">
                  <CheckCircle2 size={13} strokeWidth={2.5} className="home-footer__reg-icon" />
                  RBI Regulated Bank
                </li>
                <li className="home-footer__reg-item">
                  <CheckCircle2 size={13} strokeWidth={2.5} className="home-footer__reg-icon" />
                  DICGC Insured
                </li>
                <li className="home-footer__reg-item">
                  <CheckCircle2 size={13} strokeWidth={2.5} className="home-footer__reg-icon" />
                  ISO 27001 Certified
                </li>
                <li className="home-footer__reg-item">
                  <CheckCircle2 size={13} strokeWidth={2.5} className="home-footer__reg-icon" />
                  PCI-DSS Compliant
                </li>
                <li className="home-footer__reg-item">
                  <CheckCircle2 size={13} strokeWidth={2.5} className="home-footer__reg-icon" />
                  SOC 2 Type II Audited
                </li>
              </ul>
            </div>
          </div>

          <div className="home-footer__bottom">
            <span className="home-footer__legal-link">Privacy Policy</span>
            <span className="home-footer__bottom-dot" aria-hidden="true">·</span>
            <span className="home-footer__legal-link">Terms of Service</span>
            <span className="home-footer__bottom-dot" aria-hidden="true">·</span>
            <span className="home-footer__legal-link">Grievance Redressal</span>
          </div>
        </div>
      </footer>
    </div>
  );
}