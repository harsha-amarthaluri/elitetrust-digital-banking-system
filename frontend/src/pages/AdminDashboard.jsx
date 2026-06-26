import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, ShieldCheck, AlertTriangle, Settings,
  Search, RefreshCw, CheckCircle, XCircle, Eye, EyeOff,
  Lock, Unlock, UserX, ChevronDown, FileText, Activity,
  TrendingUp, Clock, Filter, X, AlertCircle, Loader2,
  BadgeCheck, Banknote, BarChart3
} from 'lucide-react';
import api from '../services/api';
import '../styles/pages/AdminDashboard.css';

// ─── Helpers ────────────────────────────────────────────────────────────────

const getUser = (locationState) => {
  if (locationState && locationState.role) return locationState;
  try {
    const stored = localStorage.getItem('smart_bank_user');
    if (stored) return JSON.parse(stored);
  } catch (_) {}
  return null;
};

const maskPan = (pan) => {
  if (!pan) return 'N/A';
  return pan.slice(0, 2) + '••••••' + pan.slice(-4);
};

const maskAadhaar = (num) => {
  if (!num) return 'N/A';
  const s = String(num);
  return '••••-••••-' + s.slice(-4);
};

const fmtDate = (ts) => {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch (_) { return ts; }
};

const fmtCurrency = (n) => {
  if (n === null || n === undefined) return '—';
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const SkeletonRow = ({ cols = 6 }) => (
  <tr className="adm-skeleton-row">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i}><span className="adm-skeleton" /></td>
    ))}
  </tr>
);

const SkeletonCard = () => (
  <div className="adm-stat-card adm-skeleton-card">
    <span className="adm-skeleton adm-skeleton--h2" />
    <span className="adm-skeleton adm-skeleton--label" />
  </div>
);

const InlineMsg = ({ type, msg, onDismiss }) => {
  if (!msg) return null;
  return (
    <div className={`adm-inline-msg adm-inline-msg--${type}`}>
      {type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
      <span>{msg}</span>
      {onDismiss && <button className="adm-inline-dismiss" onClick={onDismiss}><X size={12} /></button>}
    </div>
  );
};

const KycBadge = ({ status }) => {
  const map = {
    PENDING:     { cls: 'badge--gray',   label: 'Pending' },
    SUBMITTED:   { cls: 'badge--blue',   label: 'Submitted' },
    UNDER_REVIEW:{ cls: 'badge--blue',   label: 'Under Review' },
    APPROVED:    { cls: 'badge--green',  label: 'Approved' },
    REJECTED:    { cls: 'badge--red',    label: 'Rejected' },
  };
  const { cls, label } = map[status] || { cls: 'badge--gray', label: status || '—' };
  return <span className={`adm-badge ${cls}`}>{label}</span>;
};

const AccountBadge = ({ status }) => {
  const map = {
    ACTIVE:  { cls: 'badge--green',  label: 'Active' },
    FROZEN:  { cls: 'badge--orange', label: 'Frozen' },
    CLOSED:  { cls: 'badge--gray',   label: 'Closed' },
  };
  const { cls, label } = map[status] || { cls: 'badge--gray', label: status || '—' };
  return <span className={`adm-badge ${cls}`}>{label}</span>;
};

const RiskBadge = ({ score }) => {
  const map = {
    LOW:    { cls: 'badge--green',  label: 'Low' },
    MEDIUM: { cls: 'badge--yellow', label: 'Medium' },
    HIGH:   { cls: 'badge--red',    label: 'High' },
  };
  const { cls, label } = map[score] || { cls: 'badge--gray', label: score || '—' };
  return <span className={`adm-badge ${cls}`}>{label}</span>;
};

const StatusBadge = ({ status }) => {
  const map = {
    PENDING_REVIEW: { cls: 'badge--orange', label: 'Pending' },
    RESOLVED:       { cls: 'badge--green',  label: 'Resolved' },
    DISMISSED:      { cls: 'badge--gray',   label: 'Dismissed' },
  };
  const { cls, label } = map[status] || { cls: 'badge--gray', label: status || '—' };
  return <span className={`adm-badge ${cls}`}>{label}</span>;
};

// ─── Confirmation Modal ──────────────────────────────────────────────────────

const ConfirmModal = ({ open, title, message, confirmLabel, onConfirm, onCancel, danger = true, children }) => {
  if (!open) return null;
  return (
    <div className="adm-modal-overlay" onClick={onCancel}>
      <div className="adm-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="adm-modal-header">
          <div className="adm-modal-icon-wrap" data-danger={danger}>
            <AlertTriangle size={20} />
          </div>
          <h3 className="adm-modal-title">{title}</h3>
        </div>
        <p className="adm-modal-msg">{message}</p>
        {children}
        <div className="adm-modal-actions">
          <button className="adm-btn adm-btn--ghost" onClick={onCancel}>Cancel</button>
          <button className={`adm-btn ${danger ? 'adm-btn--danger' : 'adm-btn--primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1 — OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════

const OverviewTab = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, kycRes, fraudRes, accountsRes] = await Promise.allSettled([
        api.get('/admin/users'),
        api.get('/admin/kyc-summary'),
        api.get('/admin/fraud-alerts/stats'),
        api.get('/admin/accounts'),
      ]);

      setStats({
        totalUsers:    usersRes.status === 'fulfilled'   ? (Array.isArray(usersRes.value.data) ? usersRes.value.data.length : usersRes.value.data?.count ?? 0) : null,
        kyc:           kycRes.status === 'fulfilled'     ? kycRes.value.data : null,
        fraud:         fraudRes.status === 'fulfilled'   ? fraudRes.value.data : null,
        totalAccounts: accountsRes.status === 'fulfilled'? (Array.isArray(accountsRes.value.data) ? accountsRes.value.data.length : accountsRes.value.data?.count ?? 0) : null,
      });
    } catch (err) {
      setError('Failed to load overview statistics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="adm-tab-content">
      <div className="adm-section-header">
        <div>
          <h2 className="adm-section-title">System Overview</h2>
          <p className="adm-section-sub">Real-time snapshot of platform health and activity.</p>
        </div>
        <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'adm-spin' : ''} />
          Refresh
        </button>
      </div>

      <InlineMsg type="error" msg={error} onDismiss={() => setError('')} />

      {/* Customers & Accounts */}
      <div className="adm-stat-grid">
        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <>
            <div className="adm-stat-card">
              <div className="adm-stat-icon-wrap" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                <Users size={20} />
              </div>
              <div>
                <div className="adm-stat-value">{stats?.totalUsers ?? '—'}</div>
                <div className="adm-stat-label">Total Customers</div>
              </div>
            </div>

            <div className="adm-stat-card">
              <div className="adm-stat-icon-wrap" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
                <Banknote size={20} />
              </div>
              <div>
                <div className="adm-stat-value">{stats?.totalAccounts ?? '—'}</div>
                <div className="adm-stat-label">Total Accounts</div>
              </div>
            </div>

            <div className="adm-stat-card">
              <div className="adm-stat-icon-wrap" style={{ background: '#FFFBEB', color: 'var(--color-warning)' }}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <div className="adm-stat-value">
                  {stats?.fraud ? (stats.fraud.pending ?? stats.fraud.PENDING_REVIEW ?? '—') : '—'}
                </div>
                <div className="adm-stat-label">Fraud Alerts Pending</div>
              </div>
            </div>

            <div className="adm-stat-card">
              <div className="adm-stat-icon-wrap" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <div className="adm-stat-value">
                  {stats?.kyc ? (stats.kyc.pending ?? stats.kyc.PENDING ?? '—') : '—'}
                </div>
                <div className="adm-stat-label">KYC Pending</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* KYC Summary */}
      <div className="adm-overview-grid">
        <div className="adm-card">
          <h3 className="adm-card-title">
            <ShieldCheck size={16} /> KYC Summary
          </h3>
          {loading ? (
            <div className="adm-kpi-row">
              {[1,2,3,4].map(i => <div key={i} className="adm-kpi-item"><span className="adm-skeleton adm-skeleton--kpi" /></div>)}
            </div>
          ) : (
            <div className="adm-kpi-row">
              <div className="adm-kpi-item">
                <span className="adm-kpi-val adm-kpi--gray">{stats?.kyc?.pending ?? stats?.kyc?.PENDING ?? 0}</span>
                <span className="adm-kpi-label">Pending</span>
              </div>
              <div className="adm-kpi-item">
                <span className="adm-kpi-val adm-kpi--blue">{stats?.kyc?.submitted ?? stats?.kyc?.SUBMITTED ?? stats?.kyc?.underReview ?? stats?.kyc?.UNDER_REVIEW ?? 0}</span>
                <span className="adm-kpi-label">Submitted</span>
              </div>
              <div className="adm-kpi-item">
                <span className="adm-kpi-val adm-kpi--green">{stats?.kyc?.approved ?? stats?.kyc?.APPROVED ?? 0}</span>
                <span className="adm-kpi-label">Approved</span>
              </div>
              <div className="adm-kpi-item">
                <span className="adm-kpi-val adm-kpi--red">{stats?.kyc?.rejected ?? stats?.kyc?.REJECTED ?? 0}</span>
                <span className="adm-kpi-label">Rejected</span>
              </div>
            </div>
          )}
        </div>

        <div className="adm-card">
          <h3 className="adm-card-title">
            <AlertTriangle size={16} /> Fraud Alerts
          </h3>
          {loading ? (
            <div className="adm-kpi-row">
              {[1,2].map(i => <div key={i} className="adm-kpi-item"><span className="adm-skeleton adm-skeleton--kpi" /></div>)}
            </div>
          ) : (
            <div className="adm-kpi-row">
              <div className="adm-kpi-item">
                <span className="adm-kpi-val adm-kpi--orange">
                  {stats?.fraud?.pending ?? stats?.fraud?.PENDING_REVIEW ?? 0}
                </span>
                <span className="adm-kpi-label">Pending Review</span>
              </div>
              <div className="adm-kpi-item">
                <span className="adm-kpi-val adm-kpi--green">
                  {stats?.fraud?.resolved ?? stats?.fraud?.RESOLVED ?? 0}
                </span>
                <span className="adm-kpi-label">Resolved</span>
              </div>
              <div className="adm-kpi-item">
                <span className="adm-kpi-val adm-kpi--gray">
                  {stats?.fraud?.dismissed ?? stats?.fraud?.DISMISSED ?? 0}
                </span>
                <span className="adm-kpi-label">Dismissed</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2 — CUSTOMER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

const CustomerTab = ({ currentUser }) => {
  const isAdmin = currentUser?.role === 'ROLE_ADMIN';

  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');

  // Per-row inline messages
  const [rowMsg, setRowMsg] = useState({});   // { userId: { type, msg } }

  // Modal
  const [modal, setModal] = useState(null);   // { type, user, accountNumber, reason }
  const [modalReason, setModalReason]  = useState('');
  const [modalWorking, setModalWorking] = useState(false);

  // Role dropdown tracking
  const [roleWorking, setRoleWorking] = useState({});

  const setRowMessage = (id, type, msg) => {
    setRowMsg(prev => ({ ...prev, [id]: { type, msg } }));
    setTimeout(() => setRowMsg(prev => { const n = { ...prev }; delete n[id]; return n; }), 5000);
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data || []);
    } catch (err) {
      setError('Failed to load customers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || (u.name || '').toLowerCase().includes(q)
              || (u.email || '').toLowerCase().includes(q)
              || (u.mobileNumber || '').includes(q)
              || (u.customerId || '').toLowerCase().includes(q);
  });

  // ── Freeze / Unfreeze / Close
  const openModal = (type, u) => {
    setModalReason('');
    setModal({ type, user: u, accountNumber: u.accountNumber });
  };

  const handleModalConfirm = async () => {
    if (!modal) return;
    const { type, user, accountNumber } = modal;
    if ((type === 'freeze' || type === 'close') && !modalReason.trim()) return;

    setModalWorking(true);
    try {
      if (type === 'freeze') {
        await api.post(`/admin/accounts/${accountNumber}/freeze`, { reason: modalReason });
        setRowMessage(user.user_Id, 'success', 'Account frozen successfully.');
      } else if (type === 'unfreeze') {
        await api.post(`/admin/accounts/${accountNumber}/unfreeze`);
        setRowMessage(user.user_Id, 'success', 'Account unfrozen successfully.');
      } else if (type === 'close') {
        await api.post(`/admin/accounts/${accountNumber}/close`, { reason: modalReason });
        setRowMessage(user.user_Id, 'success', 'Account closed successfully.');
      }
      setModal(null);
      loadUsers();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data || 'Action failed.';
      setRowMessage(user.user_Id, 'error', typeof msg === 'string' ? msg : 'Action failed.');
      setModal(null);
    } finally {
      setModalWorking(false);
    }
  };

  // ── Role change (admin only)
  const handleRoleChange = async (u, newRole) => {
    if (newRole === u.role) return;
    setRoleWorking(prev => ({ ...prev, [u.user_Id]: true }));
    try {
      await api.post(`/admin/users/${u.user_Id}/role?role=${newRole}`);
      setRowMessage(u.user_Id, 'success', `Role updated to ${newRole}.`);
      loadUsers();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data || 'Role update failed.';
      setRowMessage(u.user_Id, 'error', typeof msg === 'string' ? msg : 'Role update failed.');
    } finally {
      setRoleWorking(prev => ({ ...prev, [u.user_Id]: false }));
    }
  };

  return (
    <div className="adm-tab-content">
      <div className="adm-section-header">
        <div>
          <h2 className="adm-section-title">Customer Management</h2>
          <p className="adm-section-sub">View and manage all registered bank customers.</p>
        </div>
        <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={loadUsers} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'adm-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="adm-search-bar">
        <Search size={16} className="adm-search-icon" />
        <input
          type="text"
          className="adm-search-input"
          placeholder="Search by name, email, mobile or customer ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="adm-search-clear" onClick={() => setSearch('')}>
            <X size={14} />
          </button>
        )}
      </div>

      <InlineMsg type="error" msg={error} onDismiss={() => setError('')} />

      <div className="adm-card adm-card--no-pad">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>Email</th>
                <th>KYC Status</th>
                <th>Account Status</th>
                <th>Risk Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="adm-empty-cell">
                    {search ? `No customers match "${search}".` : 'No customers found.'}
                  </td>
                </tr>
              ) : (
                filtered.map((u, idx) => (
                  <React.Fragment key={u.user_Id}>
                    <tr className={idx % 2 === 1 ? 'adm-row-alt' : ''}>
                      <td className="adm-cell-mono">{u.customerId || `#${u.user_Id}`}</td>
                      <td className="adm-cell-name">{u.name}</td>
                      <td>{u.mobileNumber}</td>
                      <td className="adm-cell-email">{u.email}</td>
                      <td><KycBadge status={u.kycStatus} /></td>
                      <td><AccountBadge status={u.accountStatus} /></td>
                      <td><RiskBadge score={u.riskScore} /></td>
                      <td>
                        <div className="adm-action-row">
                          {u.accountStatus === 'ACTIVE' && (
                            <button
                              className="adm-btn adm-btn--xs adm-btn--warning"
                              onClick={() => openModal('freeze', u)}
                              title="Freeze Account"
                            >
                              <Lock size={12} /> Freeze
                            </button>
                          )}
                          {u.accountStatus === 'FROZEN' && (
                            <button
                              className="adm-btn adm-btn--xs adm-btn--success"
                              onClick={() => openModal('unfreeze', u)}
                              title="Unfreeze Account"
                            >
                              <Unlock size={12} /> Unfreeze
                            </button>
                          )}
                          {isAdmin && u.accountStatus !== 'CLOSED' && (
                            <button
                              className="adm-btn adm-btn--xs adm-btn--danger"
                              onClick={() => openModal('close', u)}
                              title="Close Account"
                            >
                              <UserX size={12} /> Close
                            </button>
                          )}
                          {isAdmin && (
                            <div className="adm-role-wrap">
                              <select
                                className="adm-role-select"
                                value={u.role}
                                disabled={roleWorking[u.user_Id]}
                                onChange={e => handleRoleChange(u, e.target.value)}
                                title="Change Role"
                              >
                                <option value="ROLE_CUSTOMER">Customer</option>
                                <option value="ROLE_EMPLOYEE">Employee</option>
                                <option value="ROLE_MANAGER">Manager</option>
                                <option value="ROLE_ADMIN">Admin</option>
                              </select>
                              {roleWorking[u.user_Id] && <Loader2 size={12} className="adm-spin adm-role-spinner" />}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                    {rowMsg[u.user_Id] && (
                      <tr className="adm-msg-row">
                        <td colSpan={8}>
                          <InlineMsg
                            type={rowMsg[u.user_Id].type}
                            msg={rowMsg[u.user_Id].msg}
                            onDismiss={() => setRowMsg(prev => { const n = { ...prev }; delete n[u.user_Id]; return n; })}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <div className="adm-table-footer">
            Showing {filtered.length} of {users.length} customers
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        open={!!modal}
        title={
          modal?.type === 'freeze' ? 'Freeze Account' :
          modal?.type === 'unfreeze' ? 'Unfreeze Account' :
          modal?.type === 'close' ? 'Close Account Permanently' : ''
        }
        message={
          modal?.type === 'freeze'   ? `You are about to freeze the account of ${modal?.user?.name}. All transactions will be suspended.` :
          modal?.type === 'unfreeze' ? `You are about to unfreeze the account of ${modal?.user?.name}. Normal access will be restored.` :
          modal?.type === 'close'    ? `You are about to permanently close the account of ${modal?.user?.name}. This action cannot be undone.` : ''
        }
        confirmLabel={
          modal?.type === 'freeze'   ? 'Freeze Account' :
          modal?.type === 'unfreeze' ? 'Unfreeze Account' :
          modal?.type === 'close'    ? 'Close Account' : 'Confirm'
        }
        danger={modal?.type !== 'unfreeze'}
        onConfirm={handleModalConfirm}
        onCancel={() => !modalWorking && setModal(null)}
      >
        {(modal?.type === 'freeze' || modal?.type === 'close') && (
          <div className="adm-modal-field">
            <label className="adm-modal-label">
              {modal.type === 'freeze' ? 'Reason for Freeze' : 'Reason for Closure'} <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <textarea
              className="adm-modal-textarea"
              placeholder="Enter reason…"
              value={modalReason}
              onChange={e => setModalReason(e.target.value)}
              rows={3}
            />
          </div>
        )}
        {modalWorking && (
          <div className="adm-modal-working">
            <Loader2 size={16} className="adm-spin" /> Processing…
          </div>
        )}
      </ConfirmModal>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3 — KYC APPROVALS
// ═══════════════════════════════════════════════════════════════════════════

const KycTab = () => {
  const [pending, setPending]  = useState([]);
  const [loading, setLoading]  = useState(true);
  const [error, setError]      = useState('');
  const [cardMsg, setCardMsg]  = useState({});  // { mobile: { type, msg } }
  const [working, setWorking]  = useState({});  // { mobile: bool }
  const [remarks, setRemarks]  = useState({});  // { mobile: string }
  const [showReject, setShowReject] = useState({});  // { mobile: bool }

  const setCardMessage = (mobile, type, msg) => {
    setCardMsg(prev => ({ ...prev, [mobile]: { type, msg } }));
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/kyc/pending');
      setPending(res.data || []);
    } catch (err) {
      setError('Failed to load pending KYC submissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (mobile) => {
    setWorking(prev => ({ ...prev, [mobile]: true }));
    setCardMessage(mobile, '', '');
    try {
      await api.post(`/kyc/approve/${mobile}`);
      setCardMessage(mobile, 'success', 'KYC approved successfully.');
      setTimeout(() => setPending(prev => prev.filter(u => u.mobileNumber !== mobile)), 1800);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data || 'Approval failed.';
      setCardMessage(mobile, 'error', typeof msg === 'string' ? msg : 'Approval failed.');
    } finally {
      setWorking(prev => ({ ...prev, [mobile]: false }));
    }
  };

  const handleReject = async (mobile) => {
    const reason = remarks[mobile] || '';
    if (!reason.trim()) {
      setCardMessage(mobile, 'error', 'Please enter a rejection reason.');
      return;
    }
    setWorking(prev => ({ ...prev, [mobile]: true }));
    setCardMessage(mobile, '', '');
    try {
      await api.post(`/kyc/reject/${mobile}`, { remarks: reason });
      setCardMessage(mobile, 'success', 'KYC rejected successfully.');
      setTimeout(() => setPending(prev => prev.filter(u => u.mobileNumber !== mobile)), 1800);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data || 'Rejection failed.';
      setCardMessage(mobile, 'error', typeof msg === 'string' ? msg : 'Rejection failed.');
    } finally {
      setWorking(prev => ({ ...prev, [mobile]: false }));
    }
  };

  return (
    <div className="adm-tab-content">
      <div className="adm-section-header">
        <div>
          <h2 className="adm-section-title">KYC Approvals</h2>
          <p className="adm-section-sub">Review submitted KYC applications and approve or reject them.</p>
        </div>
        <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'adm-spin' : ''} />
          Refresh
        </button>
      </div>

      <InlineMsg type="error" msg={error} onDismiss={() => setError('')} />

      {loading ? (
        <div className="adm-kyc-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="adm-kyc-card adm-kyc-card--skeleton">
              <span className="adm-skeleton" style={{ height: 20, width: '60%', display: 'block', marginBottom: 8 }} />
              <span className="adm-skeleton" style={{ height: 14, width: '80%', display: 'block', marginBottom: 6 }} />
              <span className="adm-skeleton" style={{ height: 14, width: '70%', display: 'block', marginBottom: 6 }} />
              <span className="adm-skeleton" style={{ height: 14, width: '50%', display: 'block', marginBottom: 20 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <span className="adm-skeleton" style={{ height: 34, flex: 1, display: 'block' }} />
                <span className="adm-skeleton" style={{ height: 34, flex: 1, display: 'block' }} />
              </div>
            </div>
          ))}
        </div>
      ) : pending.length === 0 ? (
        <div className="adm-empty-state">
          <BadgeCheck size={40} className="adm-empty-icon" />
          <p className="adm-empty-title">No KYC submissions pending review.</p>
          <p className="adm-empty-sub">All submitted KYC applications have been processed.</p>
        </div>
      ) : (
        <div className="adm-kyc-grid">
          {pending.map(u => (
            <div key={u.mobileNumber} className="adm-kyc-card">
              <div className="adm-kyc-card-header">
                <div className="adm-kyc-avatar">{(u.name || 'U')[0].toUpperCase()}</div>
                <div>
                  <div className="adm-kyc-name">{u.name}</div>
                  <div className="adm-kyc-mobile">{u.mobileNumber}</div>
                </div>
                <span className="adm-badge badge--blue" style={{ marginLeft: 'auto' }}>Submitted</span>
              </div>

              <div className="adm-kyc-fields">
                <div className="adm-kyc-field">
                  <span className="adm-kyc-field-label">Email</span>
                  <span className="adm-kyc-field-val">{u.email || '—'}</span>
                </div>
                <div className="adm-kyc-field">
                  <span className="adm-kyc-field-label">PAN</span>
                  <span className="adm-kyc-field-val adm-cell-mono">{maskPan(u.panCardNumber)}</span>
                </div>
                <div className="adm-kyc-field">
                  <span className="adm-kyc-field-label">Aadhaar</span>
                  <span className="adm-kyc-field-val adm-cell-mono">{maskAadhaar(u.aadhaarNumber)}</span>
                </div>
                {u.submittedAt && (
                  <div className="adm-kyc-field">
                    <span className="adm-kyc-field-label">Submitted</span>
                    <span className="adm-kyc-field-val">{fmtDate(u.submittedAt)}</span>
                  </div>
                )}
                {u.kycDocumentUrl && (
                  <div className="adm-kyc-field">
                    <span className="adm-kyc-field-label">Document</span>
                    <a
                      href={`${import.meta.env.VITE_API_BASE_URL || ''}${u.kycDocumentUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="adm-doc-link"
                    >
                      <FileText size={13} /> View Document
                    </a>
                  </div>
                )}
              </div>

              {cardMsg[u.mobileNumber]?.msg && (
                <InlineMsg
                  type={cardMsg[u.mobileNumber].type}
                  msg={cardMsg[u.mobileNumber].msg}
                  onDismiss={() => setCardMsg(prev => { const n = { ...prev }; delete n[u.mobileNumber]; return n; })}
                />
              )}

              {showReject[u.mobileNumber] && (
                <div className="adm-reject-field">
                  <label className="adm-kyc-field-label">Rejection Remarks <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                  <textarea
                    className="adm-modal-textarea"
                    placeholder="Enter reason for rejection…"
                    value={remarks[u.mobileNumber] || ''}
                    onChange={e => setRemarks(prev => ({ ...prev, [u.mobileNumber]: e.target.value }))}
                    rows={2}
                  />
                </div>
              )}

              <div className="adm-kyc-actions">
                {showReject[u.mobileNumber] ? (
                  <>
                    <button
                      className="adm-btn adm-btn--sm adm-btn--ghost"
                      onClick={() => setShowReject(prev => ({ ...prev, [u.mobileNumber]: false }))}
                      disabled={working[u.mobileNumber]}
                    >
                      Cancel
                    </button>
                    <button
                      className="adm-btn adm-btn--sm adm-btn--danger"
                      onClick={() => handleReject(u.mobileNumber)}
                      disabled={working[u.mobileNumber]}
                    >
                      {working[u.mobileNumber] ? <><Loader2 size={13} className="adm-spin" /> Rejecting…</> : 'Confirm Reject'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="adm-btn adm-btn--sm adm-btn--outline-danger"
                      onClick={() => setShowReject(prev => ({ ...prev, [u.mobileNumber]: true }))}
                      disabled={working[u.mobileNumber]}
                    >
                      <XCircle size={13} /> Reject KYC
                    </button>
                    <button
                      className="adm-btn adm-btn--sm adm-btn--success"
                      onClick={() => handleApprove(u.mobileNumber)}
                      disabled={working[u.mobileNumber]}
                    >
                      {working[u.mobileNumber] ? <><Loader2 size={13} className="adm-spin" /> Approving…</> : <><CheckCircle size={13} /> Approve KYC</>}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB 4 — FRAUD MONITORING
// ═══════════════════════════════════════════════════════════════════════════

const FraudTab = () => {
  const [alerts, setAlerts]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [filter, setFilter]       = useState('ALL');
  const [notes, setNotes]         = useState({});    // { id: string }
  const [working, setWorking]     = useState({});    // { id: bool }
  const [alertMsg, setAlertMsg]   = useState({});    // { id: { type, msg } }

  const setMsg = (id, type, msg) => {
    setAlertMsg(prev => ({ ...prev, [id]: { type, msg } }));
    setTimeout(() => setAlertMsg(prev => { const n = { ...prev }; delete n[id]; return n; }), 5000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/fraud-alerts');
      setAlerts(res.data || []);
    } catch (err) {
      setError('Failed to load fraud alerts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (id, status) => {
    setWorking(prev => ({ ...prev, [id]: true }));
    try {
      await api.post(`/admin/fraud-alerts/${id}/resolve`, {
        status,
        notes: notes[id] || '',
      });
      setMsg(id, 'success', `Alert marked as ${status}.`);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data || 'Action failed.';
      setMsg(id, 'error', typeof msg === 'string' ? msg : 'Action failed.');
    } finally {
      setWorking(prev => ({ ...prev, [id]: false }));
    }
  };

  const filterTabs = ['ALL', 'PENDING_REVIEW', 'RESOLVED', 'DISMISSED'];
  const filterLabels = { ALL: 'All', PENDING_REVIEW: 'Pending Review', RESOLVED: 'Resolved', DISMISSED: 'Dismissed' };

  const displayed = filter === 'ALL' ? alerts : alerts.filter(a => a.status === filter);

  const severityBorderColor = (sev) => {
    if (sev === 'HIGH')   return 'var(--color-danger)';
    if (sev === 'MEDIUM') return 'var(--color-warning)';
    return '#D97706';
  };

  return (
    <div className="adm-tab-content">
      <div className="adm-section-header">
        <div>
          <h2 className="adm-section-title">Fraud Monitoring</h2>
          <p className="adm-section-sub">Review and resolve suspicious activity alerts.</p>
        </div>
        <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'adm-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="adm-filter-tabs">
        {filterTabs.map(f => (
          <button
            key={f}
            className={`adm-filter-tab ${filter === f ? 'adm-filter-tab--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {filterLabels[f]}
            <span className="adm-filter-count">
              {f === 'ALL' ? alerts.length : alerts.filter(a => a.status === f).length}
            </span>
          </button>
        ))}
      </div>

      <InlineMsg type="error" msg={error} onDismiss={() => setError('')} />

      {loading ? (
        <div className="adm-fraud-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="adm-fraud-card">
              <span className="adm-skeleton" style={{ height: 18, width: '40%', display: 'block', marginBottom: 10 }} />
              <span className="adm-skeleton" style={{ height: 14, width: '70%', display: 'block', marginBottom: 6 }} />
              <span className="adm-skeleton" style={{ height: 14, width: '55%', display: 'block', marginBottom: 6 }} />
              <span className="adm-skeleton" style={{ height: 14, width: '65%', display: 'block', marginBottom: 16 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <span className="adm-skeleton" style={{ height: 32, flex: 1, display: 'block' }} />
                <span className="adm-skeleton" style={{ height: 32, flex: 1, display: 'block' }} />
              </div>
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="adm-empty-state">
          <ShieldCheck size={40} className="adm-empty-icon" />
          <p className="adm-empty-title">No alerts in this category.</p>
          <p className="adm-empty-sub">Select a different filter to view other alerts.</p>
        </div>
      ) : (
        <div className="adm-fraud-grid">
          {[...displayed].reverse().map(alert => (
            <div
              key={alert.id}
              className="adm-fraud-card"
              style={{ borderLeftColor: severityBorderColor(alert.severity || alert.alertType) }}
            >
              <div className="adm-fraud-card-top">
                <div className="adm-fraud-type">{alert.alertType || alert.ruleName || `Alert #${alert.id}`}</div>
                <StatusBadge status={alert.status} />
              </div>

              <div className="adm-fraud-fields">
                <div className="adm-fraud-field">
                  <span className="adm-kyc-field-label">Account</span>
                  <span className="adm-cell-mono">{alert.accountNumber || alert.userMobile || '—'}</span>
                </div>
                {(alert.amount !== null && alert.amount !== undefined) && (
                  <div className="adm-fraud-field">
                    <span className="adm-kyc-field-label">Amount</span>
                    <span>{fmtCurrency(alert.amount)}</span>
                  </div>
                )}
                {alert.description && (
                  <div className="adm-fraud-field adm-fraud-field--full">
                    <span className="adm-kyc-field-label">Description</span>
                    <span className="adm-fraud-desc">{alert.description || alert.details}</span>
                  </div>
                )}
                <div className="adm-fraud-field">
                  <span className="adm-kyc-field-label">Timestamp</span>
                  <span>{fmtDate(alert.createdAt || alert.timestamp)}</span>
                </div>
                {alert.severity && (
                  <div className="adm-fraud-field">
                    <span className="adm-kyc-field-label">Severity</span>
                    <span className={`adm-badge ${alert.severity === 'HIGH' ? 'badge--red' : alert.severity === 'MEDIUM' ? 'badge--orange' : 'badge--yellow'}`}>
                      {alert.severity}
                    </span>
                  </div>
                )}
              </div>

              {alertMsg[alert.id]?.msg && (
                <InlineMsg
                  type={alertMsg[alert.id].type}
                  msg={alertMsg[alert.id].msg}
                  onDismiss={() => setAlertMsg(prev => { const n = { ...prev }; delete n[alert.id]; return n; })}
                />
              )}

              {alert.status === 'PENDING_REVIEW' && (
                <>
                  <div className="adm-fraud-notes-wrap">
                    <textarea
                      className="adm-modal-textarea"
                      placeholder="Resolution notes (optional)…"
                      value={notes[alert.id] || ''}
                      onChange={e => setNotes(prev => ({ ...prev, [alert.id]: e.target.value }))}
                      rows={2}
                    />
                  </div>
                  <div className="adm-fraud-actions">
                    <button
                      className="adm-btn adm-btn--sm adm-btn--ghost"
                      onClick={() => handleAction(alert.id, 'DISMISSED')}
                      disabled={working[alert.id]}
                    >
                      {working[alert.id] ? <Loader2 size={12} className="adm-spin" /> : null}
                      Dismiss
                    </button>
                    <button
                      className="adm-btn adm-btn--sm adm-btn--primary"
                      onClick={() => handleAction(alert.id, 'RESOLVED')}
                      disabled={working[alert.id]}
                    >
                      {working[alert.id] ? <><Loader2 size={12} className="adm-spin" /> Working…</> : <><CheckCircle size={12} /> Resolve</>}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB 5 — OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

const OperationsTab = () => {
  // Reconciliation
  const [reconcileResult, setReconcileResult] = useState(null);
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [reconcileMsg, setReconcileMsg] = useState({ type: '', msg: '' });

  // Interest
  const [accrualResult, setAccrualResult]   = useState(null);
  const [accrualLoading, setAccrualLoading] = useState(false);
  const [accrualMsg, setAccrualMsg]         = useState({ type: '', msg: '' });

  // Audit Logs
  const [auditLogs, setAuditLogs]   = useState([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState('');
  const [auditSearch, setAuditSearch] = useState('');

  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    setAuditError('');
    try {
      const res = await api.get('/admin/audit-logs');
      setAuditLogs(res.data || []);
    } catch (err) {
      setAuditError('Failed to load audit logs.');
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => { loadAuditLogs(); }, [loadAuditLogs]);

  const handleReconcile = async () => {
    setReconcileLoading(true);
    setReconcileMsg({ type: '', msg: '' });
    setReconcileResult(null);
    try {
      const res = await api.get('/admin/reconcile');
      setReconcileResult(res.data);
      setReconcileMsg({ type: 'success', msg: 'Reconciliation complete.' });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data || 'Reconciliation failed.';
      setReconcileMsg({ type: 'error', msg: typeof msg === 'string' ? msg : 'Reconciliation failed.' });
    } finally {
      setReconcileLoading(false);
    }
  };

  const handleAccrual = async () => {
    setAccrualLoading(true);
    setAccrualMsg({ type: '', msg: '' });
    setAccrualResult(null);
    try {
      const res = await api.post('/admin/accrual-interest');
      setAccrualResult(res.data);
      setAccrualMsg({ type: 'success', msg: `Interest applied successfully.` });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data || 'Interest accrual failed.';
      setAccrualMsg({ type: 'error', msg: typeof msg === 'string' ? msg : 'Interest accrual failed.' });
    } finally {
      setAccrualLoading(false);
    }
  };

  const filteredLogs = auditLogs.slice(0, 50).filter(log => {
    const q = auditSearch.toLowerCase();
    return !q
      || (log.action || '').toLowerCase().includes(q)
      || (log.userMobile || log.user || '').toLowerCase().includes(q)
      || (log.details || '').toLowerCase().includes(q)
      || (log.ipAddress || '').includes(q);
  });

  return (
    <div className="adm-tab-content">
      <h2 className="adm-section-title" style={{ marginBottom: '1.5rem' }}>Operations Center</h2>

      <div className="adm-ops-grid">
        {/* Reconciliation */}
        <div className="adm-card">
          <h3 className="adm-card-title"><BarChart3 size={16} /> Ledger Reconciliation</h3>
          <p className="adm-card-desc">
            Reconcile the sum of all customer account balances against double-entry ledger entries to detect discrepancies.
          </p>
          <button
            className="adm-btn adm-btn--primary adm-btn--sm"
            onClick={handleReconcile}
            disabled={reconcileLoading}
          >
            {reconcileLoading
              ? <><Loader2 size={14} className="adm-spin" /> Running…</>
              : <><RefreshCw size={14} /> Run Reconciliation</>}
          </button>

          {reconcileMsg.msg && (
            <div style={{ marginTop: '0.75rem' }}>
              <InlineMsg type={reconcileMsg.type} msg={reconcileMsg.msg} onDismiss={() => setReconcileMsg({ type: '', msg: '' })} />
            </div>
          )}

          {reconcileResult && (
            <div className={`adm-reconcile-result ${reconcileResult.balanced || reconcileResult.status === 'BALANCED' ? 'adm-reconcile-result--ok' : 'adm-reconcile-result--err'}`}>
              <div className="adm-recon-row">
                <span>Total Debits</span>
                <strong>{fmtCurrency(reconcileResult.totalDebits)}</strong>
              </div>
              <div className="adm-recon-row">
                <span>Total Credits</span>
                <strong>{fmtCurrency(reconcileResult.totalCredits)}</strong>
              </div>
              {reconcileResult.discrepancyCount !== undefined && (
                <div className="adm-recon-row">
                  <span>Discrepancies</span>
                  <strong>{reconcileResult.discrepancyCount}</strong>
                </div>
              )}
              <div className="adm-recon-row adm-recon-row--status">
                <span>Status</span>
                <span className={`adm-badge ${reconcileResult.balanced || reconcileResult.status === 'BALANCED' ? 'badge--green' : 'badge--red'}`}>
                  {reconcileResult.balanced || reconcileResult.status === 'BALANCED' ? 'Balanced' : 'Unbalanced'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Interest Accrual */}
        <div className="adm-card">
          <h3 className="adm-card-title"><TrendingUp size={16} /> Interest Accrual</h3>
          <p className="adm-card-desc">
            Manually trigger monthly interest calculation for all active savings accounts. Credits interest and generates ledger entries.
          </p>
          <button
            className="adm-btn adm-btn--primary adm-btn--sm"
            onClick={handleAccrual}
            disabled={accrualLoading}
          >
            {accrualLoading
              ? <><Loader2 size={14} className="adm-spin" /> Applying…</>
              : <><TrendingUp size={14} /> Apply Interest</>}
          </button>

          {accrualMsg.msg && (
            <div style={{ marginTop: '0.75rem' }}>
              <InlineMsg type={accrualMsg.type} msg={accrualMsg.msg} onDismiss={() => setAccrualMsg({ type: '', msg: '' })} />
            </div>
          )}

          {accrualResult && (
            <div className="adm-reconcile-result adm-reconcile-result--ok">
              <div className="adm-recon-row">
                <span>Accounts Processed</span>
                <strong>{accrualResult.processedAccounts ?? accrualResult.accountsProcessed ?? '—'}</strong>
              </div>
              {accrualResult.totalInterestApplied !== undefined && (
                <div className="adm-recon-row">
                  <span>Total Interest Applied</span>
                  <strong>{fmtCurrency(accrualResult.totalInterestApplied)}</strong>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Audit Logs */}
      <div className="adm-card adm-card--no-pad" style={{ marginTop: '1.5rem' }}>
        <div className="adm-card-header-row">
          <h3 className="adm-card-title" style={{ margin: 0 }}>
            <Activity size={16} /> Audit Logs
            <span className="adm-log-count">Last {Math.min(50, auditLogs.length)} entries</span>
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div className="adm-search-bar adm-search-bar--sm">
              <Search size={13} className="adm-search-icon" />
              <input
                type="text"
                className="adm-search-input"
                placeholder="Filter logs…"
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
              />
            </div>
            <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={loadAuditLogs} disabled={auditLoading}>
              <RefreshCw size={13} className={auditLoading ? 'adm-spin' : ''} />
            </button>
          </div>
        </div>

        <InlineMsg type="error" msg={auditError} onDismiss={() => setAuditError('')} />

        <div className="adm-table-wrap" style={{ maxHeight: 420 }}>
          <table className="adm-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Details</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {auditLoading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="adm-empty-cell">
                    {auditSearch ? `No logs matching "${auditSearch}".` : 'No audit logs available.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr key={log.id || idx} className={idx % 2 === 1 ? 'adm-row-alt' : ''}>
                    <td className="adm-cell-ts">{fmtDate(log.timestamp || log.createdAt)}</td>
                    <td>{log.userMobile || log.user || '—'}</td>
                    <td><span className="adm-action-pill">{log.action}</span></td>
                    <td className="adm-cell-details">{log.details || '—'}</td>
                    <td className="adm-cell-mono adm-cell-ip">{log.ipAddress || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const TABS = [
  { id: 'overview',  label: 'Overview',             Icon: LayoutDashboard },
  { id: 'customers', label: 'Customer Management',  Icon: Users },
  { id: 'kyc',       label: 'KYC Approvals',        Icon: ShieldCheck },
  { id: 'fraud',     label: 'Fraud Monitoring',     Icon: AlertTriangle },
  { id: 'operations',label: 'Operations',           Icon: Settings },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const user = getUser(location.state);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!user || (user.role !== 'ROLE_ADMIN' && user.role !== 'ROLE_MANAGER')) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  if (!user || (user.role !== 'ROLE_ADMIN' && user.role !== 'ROLE_MANAGER')) return null;

  return (
    <div className="adm-root">
      {/* Top Header */}
      <header className="adm-header">
        <div className="adm-header-left">
          <button
            className="adm-back-btn"
            onClick={() => navigate('/dashboard', { state: user })}
          >
            ← Dashboard
          </button>
          <div className="adm-header-brand">
            <span className="adm-header-title">Admin Portal</span>
            <span className="adm-header-sub">EliteTrust Bank — System Administration</span>
          </div>
        </div>
        <div className="adm-header-user">
          <div className="adm-user-avatar">{(user.name || 'A')[0].toUpperCase()}</div>
          <div className="adm-user-info">
            <span className="adm-user-name">{user.name}</span>
            <span className="adm-user-role">{user.role === 'ROLE_ADMIN' ? 'Administrator' : 'Manager'}</span>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="adm-tab-nav">
        <div className="adm-tab-nav-inner">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`adm-tab-btn ${activeTab === id ? 'adm-tab-btn--active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={15} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Tab Content */}
      <main className="adm-main">
        {activeTab === 'overview'   && <OverviewTab />}
        {activeTab === 'customers'  && <CustomerTab currentUser={user} />}
        {activeTab === 'kyc'        && <KycTab />}
        {activeTab === 'fraud'      && <FraudTab />}
        {activeTab === 'operations' && <OperationsTab />}
      </main>
    </div>
  );
};

export default AdminDashboard;
