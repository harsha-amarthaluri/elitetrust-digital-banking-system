import Login from './pages/Login.jsx'
import SmartInsights from './pages/SmartInsights.jsx'
import Signup from './pages/Signup.jsx'
import Home from './pages/Home.jsx'
import Dashboard from './pages/Dashboard.jsx'
import AccountSummary from './pages/AccountSummary.jsx'
import TransactionHistory from './pages/TransactionHistory.jsx'
import Profile from './pages/Profile.jsx'
import FundTransfer from './pages/FundTransfer.jsx'
import Services from './pages/Services.jsx'
import About from './pages/About.jsx'
import PayBill from './pages/PayBill.jsx'
import Recharge from './pages/Recharge.jsx'
import Invest from './pages/Invest.jsx'
import BillPaymentForm from './pages/BillPaymentForm.jsx'
import EMIPlanner from './pages/EMIPlanner.jsx'
import Cards from './pages/Cards.jsx'
import Loans from './pages/Loans.jsx'
import UpiQr from './pages/UpiQr.jsx'
import AiCoach from './pages/AiCoach.jsx'
import EmployeeDashboard from './pages/EmployeeDashboard.jsx'
import ManagerDashboard from './pages/ManagerDashboard.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import KycSubmission from './pages/KycSubmission.jsx'
import KycApprovals from './pages/KycApprovals.jsx'
import BankingCompanion from './components/BankingCompanion.jsx'
import Sidebar from './components/Sidebar.jsx'
import ToastContainer from './components/Toast.jsx'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import api from './services/api'
import { analyzeSpending } from './utils/spendingAnalyzer'

function ProtectedRoute({ children, user }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  const location = useLocation();

  // Load user from localStorage to persist sessions
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('smart_bank_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  // Keep user state synchronized with route transition states if passed
  useEffect(() => {
    if (location.state && typeof location.state === 'object' && location.state.mobileNumber) {
      setUser(location.state);
      localStorage.setItem('smart_bank_user', JSON.stringify(location.state));
    }
  }, [location.state]);

  const [primaryAccount, setPrimaryAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);

  // Fetch primary account & transactions for the companion
  useEffect(() => {
    if (!user?.mobileNumber) return;

    api.get(`/primary-account/${user.mobileNumber}`)
      .then(res => {
        if (res.status !== 204 && res.data) setPrimaryAccount(res.data);
      })
      .catch(() => { });

    api.get(`/transactions/${user.mobileNumber}`)
      .then(res => setTransactions(res.data || []))
      .catch(() => { });
  }, [user?.mobileNumber]);

  // WebSocket subscription for real-time notifications (silent fail if unavailable)
  useEffect(() => {
    if (!user?.mobileNumber) return;

    const wsUrl = "ws://localhost:9090/ws/websocket";
    let socket;
    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        socket.send("CONNECT\naccept-version:1.1,1.0\nheart-beat:10000,10000\n\n\0");
      };

      socket.onmessage = (event) => {
        const data = event.data;
        if (data.startsWith("CONNECTED")) {
          socket.send(`SUBSCRIBE\nid:sub-0\ndestination:/topic/notifications/${user.mobileNumber}\n\n\0`);
        } else if (data.includes("MESSAGE") && data.includes("destination:/topic/notifications/")) {
          const parts = data.split("\n\n");
          if (parts.length >= 2) {
            const body = parts[1].replace(/\0/g, "");
            try {
              const notification = JSON.parse(body);
              // Store in sessionStorage for dashboard to display inline
              const existing = JSON.parse(sessionStorage.getItem('ws_notifications') || '[]');
              existing.unshift({ ...notification, id: Date.now(), read: false });
              sessionStorage.setItem('ws_notifications', JSON.stringify(existing.slice(0, 20)));
              window.dispatchEvent(new CustomEvent('bank-notification', { detail: notification }));
            } catch (e) {
              console.warn("Failed to parse websocket message", e);
            }
          }
        }
      };

      socket.onerror = () => { /* silent fail */ };
    } catch (e) {
      // WebSocket unavailable — fail silently
    }

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) socket.close();
    };
  }, [user?.mobileNumber]);

  const spendingAnalysis = useMemo(() => {
    return analyzeSpending(transactions, user?.mobileNumber);
  }, [transactions, user?.mobileNumber]);

  const noCompanionPaths = ['/', '/login', '/signup'];
  const showCompanion = user && !noCompanionPaths.includes(location.pathname);

  const noSidebarPaths = ['/', '/login', '/signup'];
  const showSidebar = user && !noSidebarPaths.includes(location.pathname);

  const mainRoutes = (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
      {/* Protected Routes — Customer */}
      <Route path="/dashboard" element={<ProtectedRoute user={user}><Dashboard /></ProtectedRoute>} />
      <Route path="/account-summary" element={<ProtectedRoute user={user}><AccountSummary /></ProtectedRoute>} />
      <Route path="/transactions" element={<ProtectedRoute user={user}><TransactionHistory /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute user={user}><Profile /></ProtectedRoute>} />
      <Route path="/fund-transfer" element={<ProtectedRoute user={user}><FundTransfer /></ProtectedRoute>} />
      <Route path="/services" element={<ProtectedRoute user={user}><Services /></ProtectedRoute>} />
      <Route path="/about" element={<ProtectedRoute user={user}><About /></ProtectedRoute>} />
      <Route path="/pay-bill" element={<ProtectedRoute user={user}><PayBill /></ProtectedRoute>} />
      <Route path="/recharge" element={<ProtectedRoute user={user}><Recharge /></ProtectedRoute>} />
      <Route path="/bill-payment" element={<ProtectedRoute user={user}><BillPaymentForm /></ProtectedRoute>} />
      <Route path="/invest" element={<ProtectedRoute user={user}><Invest /></ProtectedRoute>} />
      <Route path="/smart-insights" element={<ProtectedRoute user={user}><SmartInsights /></ProtectedRoute>} />
      <Route path="/emi-planner" element={<ProtectedRoute user={user}><EMIPlanner /></ProtectedRoute>} />
      <Route path="/cards" element={<ProtectedRoute user={user}><Cards /></ProtectedRoute>} />
      <Route path="/loans" element={<ProtectedRoute user={user}><Loans /></ProtectedRoute>} />
      <Route path="/upi-qr" element={<ProtectedRoute user={user}><UpiQr /></ProtectedRoute>} />
      <Route path="/ai-coach" element={<ProtectedRoute user={user}><AiCoach /></ProtectedRoute>} />
      <Route path="/kyc" element={<ProtectedRoute user={user}><KycSubmission /></ProtectedRoute>} />

      {/* Protected Routes — Staff */}
      <Route path="/employee" element={<ProtectedRoute user={user}><EmployeeDashboard /></ProtectedRoute>} />
      <Route path="/manager" element={<ProtectedRoute user={user}><ManagerDashboard /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute user={user}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/kyc-approvals" element={<ProtectedRoute user={user}><KycApprovals /></ProtectedRoute>} />
    </Routes>
  );

  return (
    <>
      {showSidebar ? (
        <div className="authenticated-layout-container">
          <Sidebar user={user} setUser={setUser} />
          <div className="authenticated-layout-content">
            {mainRoutes}
          </div>
        </div>
      ) : (
        mainRoutes
      )}

      {/* 🤖 Smart Banking Companion — floats on authenticated pages */}
      {showCompanion && (
        <BankingCompanion
          user={user}
          primaryAccount={primaryAccount}
          spendingAnalysis={spendingAnalysis}
        />
      )}

      {/* 🔔 Global Toast Notifications */}
      <ToastContainer />
    </>
  )
}

export default App;