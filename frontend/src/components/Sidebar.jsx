import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
    LayoutDashboard, 
    UserCheck, 
    Send, 
    CreditCard, 
    Zap, 
    History, 
    Briefcase, 
    Bot, 
    Settings, 
    LogOut, 
    Menu, 
    X,
    ShieldAlert,
    PiggyBank,
    HelpCircle
} from 'lucide-react';
import '../styles/components/Sidebar.css';

function Sidebar({ user, setUser }) {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('smart_bank_user');
        if (setUser) setUser(null);
        navigate('/login');
    };

    const toggleSidebar = () => {
        setIsOpen(!isOpen);
    };

    const menuItems = [
        { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { path: '/account-summary', label: 'Account Info', icon: <PiggyBank size={20} /> },
        { path: '/fund-transfer', label: 'Fund Transfer', icon: <Send size={20} /> },
        { path: '/cards', label: 'Virtual Cards', icon: <CreditCard size={20} /> },
        { path: '/upi-qr', label: 'UPI & QR Codes', icon: <Zap size={20} /> },
        { path: '/transactions', label: 'Transaction History', icon: <History size={20} /> },
        { path: '/ai-coach', label: 'AI Coach', icon: <Bot size={20} /> },
        { path: '/profile', label: 'Profile & Settings', icon: <Settings size={20} /> },
    ];

    // Role-based administrative menu items
    const roleItems = [];
    if (user?.role === 'ROLE_EMPLOYEE') {
        roleItems.push({ path: '/employee', label: 'Employee Portal', icon: <Briefcase size={20} /> });
    } else if (user?.role === 'ROLE_MANAGER') {
        roleItems.push({ path: '/manager', label: 'Manager Portal', icon: <Briefcase size={20} /> });
    } else if (user?.role === 'ROLE_ADMIN') {
        roleItems.push({ path: '/admin', label: 'Admin Portal', icon: <ShieldAlert size={20} /> });
    }

    return (
        <>
            {/* Mobile Hamburger Toggle Button */}
            <button className="mobile-sidebar-toggle" onClick={toggleSidebar} aria-label="Toggle Navigation">
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Sidebar Element */}
            <aside className={`app-sidebar glass-panel ${isOpen ? 'sidebar-open' : ''}`}>
                <div className="sidebar-brand">
                    <div className="sidebar-logo">
                        <span className="logo-shield">🛡️</span>
                        <div className="brand-text">
                            <h3>EliteTrust</h3>
                            <span>DIGITAL BANK</span>
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav-menu">
                    <div className="nav-section-title">Core Banking</div>
                    <ul className="nav-list">
                        {menuItems.map((item) => (
                            <li key={item.path} className="nav-item">
                                <NavLink 
                                    to={item.path} 
                                    state={user}
                                    className={({ isActive }) => `nav-link-item ${isActive ? 'active-nav-link' : ''}`}
                                    onClick={() => setIsOpen(false)}
                                >
                                    <span className="nav-link-icon">{item.icon}</span>
                                    <span className="nav-link-label">{item.label}</span>
                                </NavLink>
                            </li>
                        ))}
                    </ul>

                    {roleItems.length > 0 && (
                        <>
                            <div className="nav-section-title" style={{ marginTop: '1.5rem' }}>Management</div>
                            <ul className="nav-list">
                                {roleItems.map((item) => (
                                    <li key={item.path} className="nav-item">
                                        <NavLink 
                                            to={item.path} 
                                            state={user}
                                            className={({ isActive }) => `nav-link-item ${isActive ? 'active-nav-link' : ''}`}
                                            onClick={() => setIsOpen(false)}
                                        >
                                            <span className="nav-link-icon">{item.icon}</span>
                                            <span className="nav-link-label">{item.label}</span>
                                        </NavLink>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </nav>

                {/* User Section at the bottom */}
                <div className="sidebar-footer">
                    <div className="user-profile-badge">
                        <div className="user-avatar-circle">
                            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="user-info-text">
                            <span className="user-profile-name">{user?.name || 'Customer'}</span>
                            <span className="user-profile-role">{user?.role?.replace('ROLE_', '') || 'CUSTOMER'}</span>
                        </div>
                    </div>

                    <button className="sidebar-logout-btn" onClick={handleLogout}>
                        <LogOut size={18} style={{ marginRight: '10px' }} />
                        <span>Log Out</span>
                    </button>
                </div>
            </aside>

            {/* Backdrop overlay for mobile */}
            {isOpen && <div className="sidebar-mobile-backdrop" onClick={toggleSidebar} />}
        </>
    );
}

export default Sidebar;
