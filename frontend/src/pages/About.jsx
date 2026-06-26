import '../styles/pages/About.css';
import { Link } from 'react-router-dom';

function About() {
    return (
        <div className="about-container">
            {/* Navbar */}
            <nav className="navbar glass-panel">
                <div className="logo">
                    <img src="/logo.png" alt="EliteTrust Bank Logo" style={{ height: '36px', marginRight: '10px' }} />
                    <span>ELITETRUST BANK</span>
                </div>
                <ul className="nav-links">
                    <li><Link to="/">Home</Link></li>
                    <li><Link to="/services">Services</Link></li>
                    <li><Link to="/about" className="active-link">About</Link></li>
                </ul>
                <div className="auth-buttons">
                    <Link to="/login" className="btn-text">Login</Link>
                    <Link to="/signup" className="btn-primary">Get Started</Link>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="about-hero">
                <div className="hero-content">
                    <div className="badge">About ELITETRUST BANK</div>
                    <h1>
                        Building the Future of <span className="gradient-text">Banking</span>
                    </h1>
                    <p className="subtitle">
                        Since 1995, we've been committed to providing transparent, secure, and innovative financial services to communities worldwide.
                    </p>
                </div>
            </header>

            {/* Mission Section */}
            <section className="mission-section">
                <div className="mission-content glass-panel">
                    <div className="mission-text">
                        <h2>Our Mission</h2>
                        <p>
                            To empower individuals and businesses to achieve their financial goals through accessible, innovative, and secure banking solutions. We believe in transparency, trust, and technological excellence.
                        </p>
                    </div>
                    <div className="mission-stats">
                        <div className="stat-item">
                            <h3>25+</h3>
                            <p>Years of Operation</p>
                        </div>
                        <div className="stat-item">
                            <h3>500+</h3>
                            <p>Global Branches</p>
                        </div>
                        <div className="stat-item">
                            <h3>10M+</h3>
                            <p>Happy Customers</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Team Section */}
            <section className="team-section">
                <h2>Leadership Team</h2>
                <div className="team-grid">
                    <div className="team-member glass-panel">
                        <div className="member-avatar placeholder-avatar">JS</div>
                        <h3>John Smith</h3>
                        <p className="member-role">Chief Executive Officer</p>
                        <p className="member-bio">Over 20 years of experience in global finance and banking sector innovation.</p>
                    </div>
                    <div className="team-member glass-panel">
                        <div className="member-avatar placeholder-avatar purple">ED</div>
                        <h3>Emma Davis</h3>
                        <p className="member-role">Chief Technology Officer</p>
                        <p className="member-bio">Leading our digital transformation and ensuring bank-grade security systems.</p>
                    </div>
                    <div className="team-member glass-panel">
                        <div className="member-avatar placeholder-avatar pink">MJ</div>
                        <h3>Michael Johnson</h3>
                        <p className="member-role">Head of Retail Banking</p>
                        <p className="member-bio">Dedicated to creating the best consumer banking experience globally.</p>
                    </div>
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

export default About;
