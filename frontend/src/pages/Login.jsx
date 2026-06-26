import '../styles/pages/Login.css';
import { Link, useNavigate } from "react-router-dom";
import api, { getErrorMessage } from '../services/api';
import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, Shield, Smartphone, Lock } from 'lucide-react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

function LoginInner({ isSimulated }) {
    const [msg, setMsg] = useState("");
    const [msgType, setMsgType] = useState(""); // "" | "success" | "error" | "warning" | "info"

    const [mobileNumber, setMobileNumber] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [userData, setUserData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [lockTimer, setLockTimer] = useState(0);

    // MFA OTP states
    const [showOtpScreen, setShowOtpScreen] = useState(false);
    const [otpCode, setOtpCode] = useState("");

    // Forgot Password states
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotMobile, setForgotMobile] = useState("");
    const [forgotOtp, setForgotOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [forgotStep, setForgotStep] = useState(1); // 1: Send OTP, 2: Reset Password

    const navigate = useNavigate();
    const passwordRef = useRef(null);
    const mobileRef = useRef(null);

    // Load remembered mobile number
    useEffect(() => {
        const saved = localStorage.getItem('smart_bank_remembered_mobile');
        if (saved) {
            setMobileNumber(saved);
            setRememberMe(true);
        }
    }, []);

    // Lock timer countdown
    useEffect(() => {
        if (!isLocked) return;
        if (lockTimer <= 0) {
            setIsLocked(false);
            setFailedAttempts(0);
            return;
        }
        const timer = setInterval(() => {
            setLockTimer(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [isLocked, lockTimer]);

    const handleMobileChange = (e) => {
        const val = e.target.value.replace(/[^0-9]/g, '');
        setMobileNumber(val);
        if (msg) { setMsg(""); setMsgType(""); }
    };

    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
        if (msg) { setMsg(""); setMsgType(""); }
    };

    const showError = (message, type = "error") => {
        setMsg(message);
        setMsgType(type);
    };

    // Handle initial Login Submit
    const handleLoginClick = async (e) => {
        e.preventDefault();

        if (isLocked) {
            showError(`⏳ Account locked. Try again in ${lockTimer}s.`, "warning");
            return;
        }

        if (!mobileNumber || mobileNumber.length !== 10) {
            showError("⚠️ Please enter a valid 10-digit mobile number 📱");
            mobileRef.current?.focus();
            return;
        }

        if (!password) {
            showError("🔒 Password is required");
            passwordRef.current?.focus();
            return;
        }

        setIsLoading(true);
        setMsg("");

        try {
            const res = await api.post("/auth/login", { mobileNumber, password });
            setIsLoading(false);

            if (res.data.mfaRequired) {
                setShowOtpScreen(true);
                showError("📧 Login OTP has been sent to your registered email and mobile number.", "info");
            }
        } catch (error) {
            setIsLoading(false);
            const errMsg = getErrorMessage(error);
            
            if (errMsg.includes("locked") || errMsg.includes("Locked")) {
                setIsLocked(true);
                setLockTimer(30);
                showError("🚫 Account Locked. Too many failed attempts.", "error");
            } else {
                const newAttempts = failedAttempts + 1;
                setFailedAttempts(newAttempts);
                showError(errMsg || "Invalid credentials.");
            }
        }
    };

    // Handle OTP Verification
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (otpCode.length !== 6) {
            showError("⚠️ Please enter the 6-digit OTP code");
            return;
        }

        setIsLoading(true);
        setMsg("");

        try {
            const fingerprint = `${navigator.userAgent}_${navigator.language || ''}_${window.screen.width}x${window.screen.height}`;
            const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
            const browser = navigator.userAgent.includes("Chrome") ? "Chrome" :
                            navigator.userAgent.includes("Safari") ? "Safari" :
                            navigator.userAgent.includes("Firefox") ? "Firefox" :
                            navigator.userAgent.includes("Edg") ? "Edge" : "Browser";
            const devName = `${isMobile ? "Mobile" : "Desktop"} - ${browser}`;

            const res = await api.post("/auth/verify-otp", {
                mobileNumber: mobileNumber,
                otp: otpCode,
                deviceFingerprint: fingerprint,
                deviceName: devName
            });

            const { accessToken, refreshToken, user } = res.data;
            localStorage.setItem("accessToken", accessToken);
            localStorage.setItem("refreshToken", refreshToken);
            localStorage.setItem("smart_bank_user", JSON.stringify(user));

            if (rememberMe) {
                localStorage.setItem('smart_bank_remembered_mobile', mobileNumber);
            } else {
                localStorage.removeItem('smart_bank_remembered_mobile');
            }

            setUserData(user);
            setIsLoading(false);

            // Navigate to Dashboard
            navigate("/dashboard", { state: user });
        } catch (error) {
            setIsLoading(false);
            showError(getErrorMessage(error) || "OTP Verification Failed.");
        }
    };

    // Forgot Password Flow
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMsg("");
        try {
            const res = await api.post("/auth/forgot-password", { mobileNumber: forgotMobile });
            setIsLoading(false);
            setForgotStep(2);
            showError("📧 Reset password OTP has been sent to your registered email and mobile number.", "info");
        } catch (error) {
            setIsLoading(false);
            showError(getErrorMessage(error) || "Failed to trigger OTP.");
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword.length < 8) {
            showError("Password must be at least 8 characters long.");
            return;
        }
        setIsLoading(true);
        setMsg("");
        try {
            await api.post("/auth/reset-password", {
                mobileNumber: forgotMobile,
                otp: forgotOtp,
                newPassword: newPassword
            });
            setIsLoading(false);
            setShowForgotModal(false);
            setForgotStep(1);
            showError("✅ Password reset successful! You can now log in.", "success");
        } catch (error) {
            setIsLoading(false);
            showError(getErrorMessage(error) || "Failed to reset password.");
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return { text: 'Good Morning', emoji: '🌅' };
        if (hour < 17) return { text: 'Good Afternoon', emoji: '☀️' };
        return { text: 'Good Evening', emoji: '🌙' };
    };

    const greeting = getGreeting();

    return (
        <div className="fullscreen-wrapper">
            <div className="login-bg-orbs">
                <div className="login-orb orb-1" />
                <div className="login-orb orb-2" />
                <div className="login-orb orb-3" />
            </div>

            <div className="login-container">
                <div className="logo-area">
                    <div className="login-logo-icon">
                        <Shield size={28} strokeWidth={2.5} />
                    </div>
                    <h2>{greeting.emoji} {greeting.text}</h2>
                    <p className="login-subtitle">EliteTrust Secure Digital Bank</p>
                </div>

                <div className="security-badge">
                    <Lock size={13} />
                    <span>256-bit Encrypted JWT Session</span>
                </div>

                {msg && (
                    <div className={`login-message ${msgType || "error"}`}>
                        <div className="login-message-content">
                            {msg}
                        </div>
                    </div>
                )}

                {/* ── MFA OTP Screen ── */}
                {showOtpScreen ? (
                    <form onSubmit={handleVerifyOtp} autoComplete="off">
                        <div className="form-group">
                            <label htmlFor="otp-code">
                                <Lock size={14} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                                Enter 6-Digit OTP Code
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                id="otp-code"
                                placeholder="123456"
                                maxLength="6"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                                disabled={isLoading}
                                required
                            />
                        </div>

                        <button type="submit" className="login-submit-btn" disabled={isLoading}>
                            {isLoading ? "Verifying..." : "Verify & Continue"}
                        </button>
                        <button type="button" className="forgot-password-btn" style={{ marginTop: '1rem', width: '100%' }} onClick={() => setShowOtpScreen(false)}>
                            ← Back to Login
                        </button>
                    </form>
                ) : (
                    /* ── Standard Login Form ── */
                    <form onSubmit={handleLoginClick} autoComplete="off">
                        <div className="form-group">
                            <label htmlFor="login-mobile">
                                <Smartphone size={14} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                                Mobile Number
                            </label>
                            <div className="input-wrapper">
                                <span className="input-prefix">+91</span>
                                <input
                                    ref={mobileRef}
                                    type="text"
                                    inputMode="numeric"
                                    id="login-mobile"
                                    placeholder="9876543210"
                                    maxLength="10"
                                    value={mobileNumber}
                                    onChange={handleMobileChange}
                                    disabled={isLoading || isLocked}
                                    className="prefixed-input"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="login-password">
                                <Lock size={14} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                                Password / PIN
                            </label>
                            <div className="password-input-wrapper">
                                <input
                                    ref={passwordRef}
                                    type={showPassword ? "text" : "password"}
                                    id="login-password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={handlePasswordChange}
                                    disabled={isLoading || isLocked}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div className="login-options-row">
                            <label className="remember-me-label" htmlFor="remember-me">
                                <input
                                    type="checkbox"
                                    id="remember-me"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="remember-checkbox"
                                />
                                Remember Me
                            </label>
                            <button type="button" className="forgot-password-btn" onClick={() => {
                                setShowForgotModal(true);
                                setForgotStep(1);
                                setMsg("");
                            }}>
                                Forgot Password?
                            </button>
                        </div>

                        <button type="submit" className="login-submit-btn" disabled={isLoading || isLocked}>
                            {isLoading ? "Authenticating..." : "Secure Sign In"}
                        </button>
                    </form>
                )}

                {/* ── Social Divider ── */}
                {!showOtpScreen && (
                    <div className="social-divider">
                        <span className="social-divider-line" />
                        <span className="social-divider-text">or continue with</span>
                        <span className="social-divider-line" />
                    </div>
                )}

                {/* ── Google Sign-In Button ── */}
                {!showOtpScreen && (
                    <GoogleSignInButton isSimulated={isSimulated} />
                )}

                <div className="footer">
                    <p>Don't have an account? <Link to="/signup">Create One</Link></p>
                </div>
            </div>

            {/* ── Forgot Password Modal ── */}
            {showForgotModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '16px', maxWidth: '400px', width: '90%', background: '#0e1526' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>Forgot Password</h3>
                            <button onClick={() => setShowForgotModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
                        </div>

                        {forgotStep === 1 ? (
                            <form onSubmit={handleForgotPassword}>
                                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                    <label>Mobile Number</label>
                                    <input
                                        type="text"
                                        placeholder="Enter 10-digit mobile number"
                                        value={forgotMobile}
                                        onChange={(e) => setForgotMobile(e.target.value.replace(/[^0-9]/g, ''))}
                                        maxLength="10"
                                        required
                                    />
                                </div>
                                <button type="submit" className="login-submit-btn" disabled={isLoading}>
                                    {isLoading ? "Sending OTP..." : "Send Reset OTP"}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleResetPassword}>
                                <div className="form-group" style={{ marginBottom: '1rem' }}>
                                    <label>Enter OTP Code</label>
                                    <input
                                        type="text"
                                        placeholder="123456"
                                        value={forgotOtp}
                                        onChange={(e) => setForgotOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                        maxLength="6"
                                        required
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                    <label>New Password</label>
                                    <input
                                        type="password"
                                        placeholder="Enter new password (min 8 chars)"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <button type="submit" className="login-submit-btn" disabled={isLoading}>
                                    {isLoading ? "Resetting Password..." : "Reset Password"}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Real Google Sign-In button component (uses hook inside Provider)
function GoogleSignInButtonReal() {
    const navigate = useNavigate();
    const [googleLoading, setGoogleLoading] = useState(false);
    const [googleError, setGoogleError] = useState("");

    const handleGoogleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setGoogleLoading(true);
            setGoogleError("");
            try {
                // Exchange access token for user info, then send to backend
                const userInfoRes = await fetch(
                    `https://www.googleapis.com/oauth2/v3/userinfo`,
                    { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
                );
                const userInfo = await userInfoRes.json();

                // Send to our backend
                const fingerprint = `${navigator.userAgent}_${navigator.language || ''}_${window.screen.width}x${window.screen.height}`;
                const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
                const browser = navigator.userAgent.includes("Chrome") ? "Chrome" :
                                navigator.userAgent.includes("Firefox") ? "Firefox" : "Browser";

                const res = await api.post("/auth/google", {
                    idToken: tokenResponse.access_token,
                    email: userInfo.email,
                    name: userInfo.name,
                    googleId: userInfo.sub,
                    deviceFingerprint: fingerprint,
                    deviceName: `${isMobile ? "Mobile" : "Desktop"} - ${browser} (Google)`
                });

                const { accessToken, refreshToken, user } = res.data;
                localStorage.setItem("accessToken", accessToken);
                localStorage.setItem("refreshToken", refreshToken);
                localStorage.setItem("smart_bank_user", JSON.stringify(user));
                navigate("/dashboard", { state: user });
            } catch (err) {
                setGoogleError(getErrorMessage(err) || "Google login failed. Please try again.");
            } finally {
                setGoogleLoading(false);
            }
        },
        onError: (err) => {
            setGoogleError("Google Sign-In was cancelled or failed.");
        },
        flow: 'implicit'
    });

    return (
        <>
            {googleError && <div className="login-message error" style={{marginBottom:'0.75rem'}}><div className="login-message-content">{googleError}</div></div>}
            <button
                id="google-signin-btn"
                className="google-signin-btn"
                onClick={() => handleGoogleLogin()}
                disabled={googleLoading}
                type="button"
            >
                {googleLoading ? (
                    <span className="google-spinner" />
                ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                )}
                <span>{googleLoading ? 'Signing in...' : 'Continue with Google'}</span>
            </button>
        </>
    );
}

// Simulated Google Sign-In button component for local testing/free mode
function GoogleSignInButtonSimulated() {
    const navigate = useNavigate();
    const [googleLoading, setGoogleLoading] = useState(false);
    const [googleError, setGoogleError] = useState("");

    const handleSimulatedGoogleLogin = async () => {
        setGoogleLoading(true);
        setGoogleError("");
        try {
            const simulatedEmail = "simulated.google.user@elitetrust.com";
            const simulatedName = "Simulated Google User";
            const simulatedGoogleId = "103550046";

            const fingerprint = `${navigator.userAgent}_${navigator.language || ''}_${window.screen.width}x${window.screen.height}`;
            const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
            const browser = navigator.userAgent.includes("Chrome") ? "Chrome" :
                            navigator.userAgent.includes("Firefox") ? "Firefox" : "Browser";

            const res = await api.post("/auth/google", {
                idToken: "simulated_token",
                email: simulatedEmail,
                name: simulatedName,
                googleId: simulatedGoogleId,
                deviceFingerprint: fingerprint,
                deviceName: `${isMobile ? "Mobile" : "Desktop"} - ${browser} (Simulated Google)`
            });

            const { accessToken, refreshToken, user } = res.data;
            localStorage.setItem("accessToken", accessToken);
            localStorage.setItem("refreshToken", refreshToken);
            localStorage.setItem("smart_bank_user", JSON.stringify(user));
            navigate("/dashboard", { state: user });
        } catch (err) {
            setGoogleError(getErrorMessage(err) || "Simulated Google login failed.");
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <>
            {googleError && <div className="login-message error" style={{marginBottom:'0.75rem'}}><div className="login-message-content">{googleError}</div></div>}
            <button
                id="google-signin-btn"
                className="google-signin-btn"
                onClick={handleSimulatedGoogleLogin}
                disabled={googleLoading}
                type="button"
            >
                {googleLoading ? (
                    <span className="google-spinner" />
                ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                )}
                <span>{googleLoading ? 'Signing in...' : 'Continue with Google (Simulated)'}</span>
            </button>
        </>
    );
}

function GoogleSignInButton({ isSimulated }) {
    if (isSimulated) {
        return <GoogleSignInButtonSimulated />;
    } else {
        return <GoogleSignInButtonReal />;
    }
}

function Login() {
    const isSimulated = !import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID.includes("YOUR_GOOGLE_CLIENT_ID");

    if (isSimulated) {
        return <LoginInner isSimulated={true} />;
    }

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <LoginInner isSimulated={false} />
        </GoogleOAuthProvider>
    );
}

export default Login;