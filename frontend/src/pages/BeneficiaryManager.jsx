import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';

/* ─── Inline Styles ────────────────────────────────────────────────────── */
const S = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-primary, #0b0f1a)',
    padding: '2rem',
    fontFamily: 'var(--font-main, Inter, sans-serif)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '2rem',
  },
  backBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary, #fff)',
    fontSize: '1.5rem',
    cursor: 'pointer',
  },
  title: {
    margin: 0,
    fontSize: '1.6rem',
    color: 'var(--text-primary, #fff)',
    fontWeight: 700,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2rem',
    maxWidth: '1100px',
    margin: '0 auto',
  },
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '20px',
    padding: '2rem',
    backdropFilter: 'blur(20px)',
  },
  cardTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--text-primary, #fff)',
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  label: {
    display: 'block',
    fontSize: '0.8rem',
    color: 'var(--text-secondary, #94a3b8)',
    marginBottom: '0.4rem',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: '1rem',
    transition: 'border-color 0.2s',
  },
  select: {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'rgba(20,20,40,0.9)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: '1rem',
    cursor: 'pointer',
  },
  btn: {
    width: '100%',
    padding: '0.85rem',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s, transform 0.1s',
  },
  beneficiaryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '14px',
    marginBottom: '0.85rem',
    transition: 'border-color 0.2s',
  },
  avatar: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 700,
    fontSize: '1rem',
    flexShrink: 0,
  },
  beneficiaryInfo: {
    marginLeft: '0.8rem',
    flex: 1,
  },
  beneficiaryName: {
    fontWeight: 600,
    color: '#fff',
    fontSize: '0.95rem',
    margin: '0 0 3px 0',
  },
  beneficiaryMeta: {
    fontSize: '0.78rem',
    color: 'var(--text-secondary, #94a3b8)',
  },
  typeBadge: {
    padding: '2px 10px',
    borderRadius: '20px',
    fontSize: '0.7rem',
    fontWeight: 600,
    marginLeft: '0.5rem',
  },
  deleteBtn: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '8px',
    color: '#ef4444',
    padding: '5px 12px',
    fontSize: '0.78rem',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  transferBtn: {
    background: 'rgba(99,102,241,0.1)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: '8px',
    color: '#818cf8',
    padding: '5px 12px',
    fontSize: '0.78rem',
    cursor: 'pointer',
    marginRight: '0.5rem',
    transition: 'background 0.2s',
  },
  alert: (type) => ({
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    fontSize: '0.85rem',
    marginBottom: '1rem',
    background: type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
    border: `1px solid ${type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
    color: type === 'success' ? '#10b981' : '#ef4444',
  }),
  emptyState: {
    textAlign: 'center',
    padding: '3rem 1rem',
    color: 'var(--text-secondary, #94a3b8)',
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
};

/* ─── Component ────────────────────────────────────────────────────────── */
const BeneficiaryManager = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [user] = useState(() => {
    try {
      const saved = localStorage.getItem('smart_bank_user');
      return location.state || (saved ? JSON.parse(saved) : null);
    } catch {
      return null;
    }
  });

  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');

  // Form fields
  const [form, setForm] = useState({
    name: '',
    accountNumber: '',
    mobileNumber: '',
    bankName: '',
    ifscCode: '',
    type: 'ACCOUNT', // ACCOUNT | MOBILE
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchBeneficiaries();
  }, [user]);

  const fetchBeneficiaries = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/beneficiaries/${user.mobileNumber}`);
      const mapped = (res.data || []).map(b => {
        const isMobile = b.accountNumber && /^[0-9]{10}$/.test(b.accountNumber) && (!b.bankName || b.bankName === 'EliteTrust Mobile');
        return {
          ...b,
          type: isMobile ? 'MOBILE' : 'ACCOUNT',
          mobileNumber: isMobile ? b.accountNumber : null,
          accountNumber: isMobile ? null : b.accountNumber
        };
      });
      setBeneficiaries(mapped);
    } catch (err) {
      console.error('Failed to load beneficiaries', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setMsg('');

    if (form.type === 'ACCOUNT' && !form.accountNumber) {
      setMsg('Account number is required for Account type.');
      setMsgType('error');
      return;
    }
    if (form.type === 'MOBILE' && !form.mobileNumber) {
      setMsg('Mobile number is required for Mobile type.');
      setMsgType('error');
      return;
    }
    if (!form.name.trim()) {
      setMsg('Beneficiary name is required.');
      setMsgType('error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        accountNumber: form.type === 'ACCOUNT' ? form.accountNumber : form.mobileNumber,
        bankName: form.type === 'ACCOUNT' ? (form.bankName || 'Other Bank') : 'EliteTrust Mobile',
        userMobile: user.mobileNumber,
        transferLimit: 50000.0
      };
      await api.post('/beneficiaries', payload);
      setMsg('Beneficiary added successfully!');
      setMsgType('success');
      setForm({ name: '', accountNumber: '', mobileNumber: '', bankName: '', ifscCode: '', type: 'ACCOUNT' });
      fetchBeneficiaries();
    } catch (err) {
      console.error('Failed to add beneficiary', err);
      setMsg(err.response?.data?.message || 'Failed to add beneficiary. Please try again.');
      setMsgType('error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this beneficiary?')) return;
    setMsg('');
    try {
      await api.delete(`/beneficiaries/${id}`);
      setBeneficiaries(prev => prev.filter(b => b.id !== id));
      setMsg('Beneficiary removed successfully.');
      setMsgType('success');
    } catch (err) {
      console.error('Failed to delete beneficiary', err);
      setMsg('Failed to remove beneficiary. Please try again.');
      setMsgType('error');
    }
  };

  const handleTransfer = (b) => {
    navigate('/fund-transfer', {
      state: {
        ...user,
        prefillBeneficiary: b,
      }
    });
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'MOBILE': return { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' };
      case 'ACCOUNT': return { bg: 'rgba(99,102,241,0.15)', color: '#818cf8' };
      default: return { bg: 'rgba(255,255,255,0.1)', color: '#94a3b8' };
    }
  };

  return (
    <div style={S.page}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header */}
        <div style={S.header}>
          <button style={S.backBtn} onClick={() => navigate(-1)}>←</button>
          <div>
            <h1 style={S.title}>Beneficiary Manager</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary, #94a3b8)', fontSize: '0.9rem' }}>
              Manage your saved payees for quick transfers
            </p>
          </div>
        </div>

        <div style={S.grid}>
          {/* ── Add Beneficiary Form ── */}
          <div style={S.card}>
            <div style={S.cardTitle}>
              <span>➕</span> Add New Beneficiary
            </div>

            {msg && (
              <div style={S.alert(msgType)}>{msg}</div>
            )}

            <form onSubmit={handleAdd}>
              <label style={S.label}>Transfer Type</label>
              <select name="type" style={S.select} value={form.type} onChange={handleChange}>
                <option value="ACCOUNT">Bank Account Number</option>
                <option value="MOBILE">Mobile Number</option>
              </select>

              <label style={S.label}>Beneficiary Name</label>
              <input
                style={S.input}
                type="text"
                name="name"
                placeholder="e.g. John Doe"
                value={form.name}
                onChange={handleChange}
                required
              />

              {form.type === 'ACCOUNT' ? (
                <>
                  <label style={S.label}>Account Number</label>
                  <input
                    style={S.input}
                    type="text"
                    name="accountNumber"
                    placeholder="e.g. 1234567890"
                    value={form.accountNumber}
                    onChange={handleChange}
                  />
                  <label style={S.label}>Bank Name (Optional)</label>
                  <input
                    style={S.input}
                    type="text"
                    name="bankName"
                    placeholder="e.g. State Bank of India"
                    value={form.bankName}
                    onChange={handleChange}
                  />
                  <label style={S.label}>IFSC Code (Optional)</label>
                  <input
                    style={S.input}
                    type="text"
                    name="ifscCode"
                    placeholder="e.g. SBIN0001234"
                    value={form.ifscCode}
                    onChange={(e) => handleChange({ target: { name: 'ifscCode', value: e.target.value.toUpperCase() } })}
                  />
                </>
              ) : (
                <>
                  <label style={S.label}>Mobile Number</label>
                  <input
                    style={S.input}
                    type="text"
                    name="mobileNumber"
                    placeholder="10-digit mobile number"
                    value={form.mobileNumber}
                    onChange={(e) => handleChange({ target: { name: 'mobileNumber', value: e.target.value.replace(/[^0-9]/g, '').slice(0, 10) } })}
                  />
                </>
              )}

              <button type="submit" style={{ ...S.btn, opacity: submitting ? 0.6 : 1 }} disabled={submitting}>
                {submitting ? 'Saving...' : '+ Save Beneficiary'}
              </button>
            </form>
          </div>

          {/* ── Saved Beneficiaries List ── */}
          <div style={S.card}>
            <div style={S.cardTitle}>
              <span>📋</span> Saved Beneficiaries
              <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)', fontWeight: 400 }}>
                {beneficiaries.length} saved
              </span>
            </div>

            {loading ? (
              <div style={S.emptyState}>
                <div style={{ ...S.emptyIcon, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</div>
                <p>Loading beneficiaries...</p>
              </div>
            ) : beneficiaries.length === 0 ? (
              <div style={S.emptyState}>
                <div style={S.emptyIcon}>👥</div>
                <p style={{ fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>No Beneficiaries Yet</p>
                <p style={{ fontSize: '0.85rem' }}>Add a payee on the left to get started with quick transfers.</p>
              </div>
            ) : (
              <div style={{ maxHeight: '520px', overflowY: 'auto', paddingRight: '4px' }}>
                {beneficiaries.map(b => {
                  const typeStyle = getTypeColor(b.type);
                  const initials = (b.name || 'B').slice(0, 2).toUpperCase();
                  return (
                    <div key={b.id} style={S.beneficiaryRow}>
                      <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                        <div style={S.avatar}>{initials}</div>
                        <div style={S.beneficiaryInfo}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <p style={S.beneficiaryName}>{b.name}</p>
                            <span style={{
                              ...S.typeBadge,
                              background: typeStyle.bg,
                              color: typeStyle.color,
                            }}>
                              {b.type}
                            </span>
                          </div>
                          <p style={S.beneficiaryMeta}>
                            {b.type === 'ACCOUNT'
                              ? `A/c •••• ${(b.accountNumber || '').slice(-4)}${b.bankName ? ' • ' + b.bankName : ''}`
                              : `📱 ${b.mobileNumber}`
                            }
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                        <button style={S.transferBtn} onClick={() => handleTransfer(b)}>
                          Send
                        </button>
                        <button style={S.deleteBtn} onClick={() => handleDelete(b.id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeneficiaryManager;
