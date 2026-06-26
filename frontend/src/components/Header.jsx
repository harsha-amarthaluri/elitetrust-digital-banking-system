import '../styles/components/Header.css';

function Header() {
    return (
        <>
            <header>
                <nav>
                    <div className="logo">Nexus<span>Bank</span></div>
                    <ul className="nav-links">
                        <li><a href="#">Banking</a></li>
                        <li><a href="#">Invest</a></li>
                        <li><a href="#">Security</a></li>
                        <li><a href="#">Support</a></li>
                    </ul>
                    <div className="auth-buttons">
                        <button className="login-btn">Login</button>
                        <button className="signup-btn">Get Started</button>
                    </div>
                </nav>
            </header>

            <main className="hero">
                <div className="badge">SECURE BANKING • DIGITAL ASSETS</div>
               
                <p className="subtitle">
                    Secure your financial future with end-to-end encrypted banking.
                    A comprehensive platform built to streamline your global transactions and investments.
                </p>
                <div className="cta-group">
                    <button className="primary-btn">Open Account</button>
                    <button className="secondary-btn">View Features</button>
                </div>
            </main>
        </>
    )
}

export default Header;