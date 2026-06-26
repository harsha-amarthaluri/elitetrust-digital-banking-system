import '../styles/pages/Services.css';
import { Link } from 'react-router-dom';

function Services() {
    return (
        <div className="services-container">
            {/* Navbar */}
            <nav className="navbar glass-panel">
                <div className="logo">
                    <img src="/logo.png" alt="EliteTrust Bank Logo" style={{ height: '36px', marginRight: '10px' }} />
                    <span>ELITETRUST BANK</span>
                </div>
                <ul className="nav-links">
                    <li><Link to="/">Home</Link></li>
                    <li><Link to="/services" className="active-link">Services</Link></li>
                    <li><Link to="/about">About</Link></li>
                </ul>
                <div className="auth-buttons">
                    <Link to="/login" className="btn-text">Login</Link>
                    <Link to="/signup" className="btn-primary">Get Started</Link>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="services-hero">
                <div className="hero-content">
                    <div className="badge">Our Services</div>
                    <h1>
                        Tailored Financial <span className="gradient-text">Solutions</span>
                    </h1>
                    <p className="subtitle">
                        Discover a wide range of top-tier services designed to support your personal and business financial goals.
                    </p>
                </div>
            </header>

            {/* Services Grid */}
            <section className="services-list-section">
                <div className="services-grid">
                    {/* Retail Banking */}
                    <div className="service-card glass-panel">
                        <div className="icon-box blue">
                            <i className="service-icon">🏦</i>
                        </div>
                        <h3>Retail Banking</h3>
                        <p>Everyday banking solutions including high-yield savings, checking accounts, and automated bill payments.</p>
                        <ul className="service-features">
                            <li>Zero maintenance fees</li>
                            <li>Free ATM withdrawals</li>
                            <li>Overdraft protection</li>
                        </ul>
                    </div>

                    {/* Investments */}
                    <div className="service-card glass-panel">
                        <div className="icon-box purple">
                            <i className="service-icon">📈</i>
                        </div>
                        <h3>Wealth Management</h3>
                        <p>Expert guidance and robust platforms for stock trading, mutual funds, and retirement planning.</p>
                        <ul className="service-features">
                            <li>Robo-advisory options</li>
                            <li>Access to global markets</li>
                            <li>Dedicated financial advisors</li>
                        </ul>
                    </div>

                    {/* Loans */}
                    <div className="service-card glass-panel">
                        <div className="icon-box pink">
                            <i className="service-icon">🏡</i>
                        </div>
                        <h3>Loans & Mortgages</h3>
                        <p>Flexible financing options for your dream home, new vehicle, or personal needs with competitive rates.</p>
                        <ul className="service-features">
                            <li>Quick pre-approvals</li>
                            <li>Fixed & adjustable rates</li>
                            <li>No hidden processing fees</li>
                        </ul>
                    </div>

                    {/* Corporate Banking */}
                    <div className="service-card glass-panel">
                        <div className="icon-box blue">
                            <i className="service-icon">🏢</i>
                        </div>
                        <h3>Corporate Banking</h3>
                        <p>Comprehensive financial services for businesses of all sizes, from startups to enterprises.</p>
                        <ul className="service-features">
                            <li>Business lines of credit</li>
                            <li>Payroll services</li>
                            <li>Merchant solutions</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Call to Action */}
            <section className="cta-section">
                <div className="cta-box glass-panel">
                    <h2>Need help choosing a service?</h2>
                    <p>Our financial experts are available 24/7 to guide you towards the right financial products.</p>
                    <Link to="/contact" className="btn-primary btn-large">Contact an Advisor</Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-brand">
                        <h3>ELITETRUST BANK</h3>
                        <p>© 2026 ELITETRUST BANK. All rights reserved.</p>
                    </div>
                    <div className="footer-links">
                        <Link to="#">Privacy Policy</Link>
                        <Link to="#">Terms of Service</Link>
                        <Link to="#">Contact</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default Services;
