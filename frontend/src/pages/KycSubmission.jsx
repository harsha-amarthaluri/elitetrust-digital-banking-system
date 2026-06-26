import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api, { getErrorMessage } from '../services/api';
import { Shield, Upload, FileText, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import '../styles/pages/Signup.css'; // Leverage existing glass card styles

const KycSubmission = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Load user from state or localStorage
    const [user, setUser] = useState(() => {
        try {
            const savedUser = localStorage.getItem('smart_bank_user');
            return location.state || (savedUser ? JSON.parse(savedUser) : null);
        } catch {
            return null;
        }
    });

    const [pan, setPan] = useState('');
    const [aadhaar, setAadhaar] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');
    const [msgType, setMsgType] = useState(''); // success, error
    const [kycStatus, setKycStatus] = useState(user?.kycStatus || 'PENDING');

    useEffect(() => {
        if (!user) {
            navigate('/login');
        }
    }, [user, navigate]);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (pan.length !== 10) {
            setMsg("PAN number must be exactly 10 characters");
            setMsgType("error");
            return;
        }
        if (aadhaar.length !== 12) {
            setMsg("Aadhaar number must be exactly 12 digits");
            setMsgType("error");
            return;
        }
        if (!file) {
            setMsg("Please upload your identity document file");
            setMsgType("error");
            return;
        }

        setLoading(true);
        setMsg('');

        try {
            // 1. Submit text details
            await api.post('/kyc/submit', {
                mobileNumber: user.mobileNumber,
                pan: pan,
                aadhaar: aadhaar
            });

            // 2. Upload file
            const formData = new FormData();
            formData.append('mobileNumber', user.mobileNumber);
            formData.append('file', file);

            const uploadRes = await api.post('/kyc/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Update user in localStorage
            const updatedUser = { ...user, kycStatus: 'SUBMITTED', kycDocumentUrl: uploadRes.data.documentUrl };
            localStorage.setItem('smart_bank_user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            setKycStatus('SUBMITTED');
            
            setMsgType("success");
            setMsg("KYC Submitted successfully! Under review.");
        } catch (err) {
            console.error("KYC submission error", err);
            setMsg(getErrorMessage(err) || "Failed to submit KYC. Please try again.");
            setMsgType("error");
        } finally {
            setLoading(false);
        }
    };

    const renderStatusOverlay = () => {
        if (kycStatus === 'SUBMITTED') {
            return (
                <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                    <Clock size={64} style={{ color: '#f59e0b', marginBottom: '1.5rem', animation: 'pulse 2s infinite' }} />
                    <h2 style={{ color: '#fff', marginBottom: '1rem' }}>KYC Under Review</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                        Your documents have been submitted and are being verified by our compliance team. Typically, this takes less than 24 hours.
                    </p>
                    <button className="btn-primary" onClick={() => navigate('/dashboard')} style={{ width: '100%' }}>
                        Go to Dashboard
                    </button>
                </div>
            );
        }

        if (kycStatus === 'APPROVED') {
            return (
                <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                    <CheckCircle size={64} style={{ color: '#10b981', marginBottom: '1.5rem' }} />
                    <h2 style={{ color: '#fff', marginBottom: '1rem' }}>KYC Verified!</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                        Congratulations! Your KYC profile has been fully verified. You now have unrestricted access to all transaction features.
                    </p>
                    <button className="btn-primary" onClick={() => navigate('/dashboard')} style={{ width: '100%', background: '#10b981' }}>
                        Go to Dashboard
                    </button>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="fullscreen-wrapper">
            <div className="signup-container" style={{ maxWidth: '480px' }}>
                <div className="logo-area" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
                    <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>←</button>
                    <h2 style={{ margin: 0 }}>Identity Verification</h2>
                </div>

                {kycStatus !== 'PENDING' && kycStatus !== 'REJECTED' ? (
                    renderStatusOverlay()
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '10px' }}>
                            <Shield size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                To comply with financial regulations, please upload a clear photo/PDF of your National ID card (Aadhaar/PAN) for review.
                            </span>
                        </div>

                        {kycStatus === 'REJECTED' && (
                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', gap: '10px' }}>
                                <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                                <span style={{ fontSize: '0.85rem' }}>
                                    Your previous submission was rejected. Please review your details and re-upload valid documents.
                                </span>
                            </div>
                        )}

                        <div className="form-group">
                            <label>PAN Card Number</label>
                            <input 
                                type="text" 
                                placeholder="ABCDE1234F" 
                                value={pan} 
                                onChange={(e) => setPan(e.target.value.toUpperCase())} 
                                maxLength="10"
                                required 
                            />
                        </div>

                        <div className="form-group">
                            <label>Aadhaar Card Number</label>
                            <input 
                                type="text" 
                                placeholder="123456789012" 
                                value={aadhaar} 
                                onChange={(e) => setAadhaar(e.target.value.replace(/[^0-9]/g, ''))} 
                                maxLength="12"
                                required 
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '2rem' }}>
                            <label>Upload ID Document (PDF, JPEG, PNG)</label>
                            <div style={{
                                border: '2px dashed rgba(255,255,255,0.15)', borderRadius: '12px', padding: '2rem 1rem',
                                textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', position: 'relative'
                            }}>
                                <input 
                                    type="file" 
                                    accept=".pdf,.png,.jpg,.jpeg" 
                                    onChange={handleFileChange}
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                />
                                {file ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                        <FileText size={40} style={{ color: 'var(--primary)' }} />
                                        <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 'bold' }}>{file.name}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                        <Upload size={40} style={{ color: 'var(--text-secondary)' }} />
                                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Drag & drop or browse files</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>PDF, JPG, PNG (Max 5MB)</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {msg && (
                            <div className={`signup-message ${msgType}`} style={{ marginBottom: '1.5rem' }}>
                                {msg}
                            </div>
                        )}

                        <button type="submit" disabled={loading} style={{ width: '100%' }}>
                            {loading ? "Submitting..." : "Submit KYC Verification"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default KycSubmission;
