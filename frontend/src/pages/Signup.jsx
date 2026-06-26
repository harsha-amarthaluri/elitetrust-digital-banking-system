import '../styles/pages/Signup.css';
import { Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../services/api';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Eye, EyeOff, ChevronLeft, ChevronRight, CheckCircle, Upload, X, Info, Shield, Clock, FileText, User } from 'lucide-react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

/* ── Constants ─────────────────────────────────────────────────── */
const STEP_LABELS = [
  'Personal\nInfo',
  'Address &\nEmployment',
  'Identity\nDocs',
  'OTP\nVerify',
  'Document\nUpload',
  'KYC\nPending',
];

const OCCUPATION_OPTIONS = [
  { value: '', label: 'Select Occupation' },
  { value: 'SALARIED', label: 'Salaried' },
  { value: 'SELF_EMPLOYED', label: 'Self-Employed' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'RETIRED', label: 'Retired' },
  { value: 'OTHER', label: 'Other' },
];

const INCOME_OPTIONS = [
  { value: '', label: 'Select Annual Income' },
  { value: 'BELOW_1L', label: 'Below ₹1 Lakh' },
  { value: '1L_5L', label: '₹1 Lakh – ₹5 Lakhs' },
  { value: '5L_10L', label: '₹5 Lakhs – ₹10 Lakhs' },
  { value: '10L_25L', label: '₹10 Lakhs – ₹25 Lakhs' },
  { value: '25L_50L', label: '₹25 Lakhs – ₹50 Lakhs' },
  { value: 'ABOVE_50L', label: 'Above ₹50 Lakhs' },
];

const NOMINEE_RELATIONS = [
  { value: '', label: 'Select Relationship' },
  { value: 'SPOUSE', label: 'Spouse' },
  { value: 'FATHER', label: 'Father' },
  { value: 'MOTHER', label: 'Mother' },
  { value: 'SON', label: 'Son' },
  { value: 'DAUGHTER', label: 'Daughter' },
  { value: 'SIBLING', label: 'Sibling' },
  { value: 'OTHER', label: 'Other' },
];

/* ── Helpers ────────────────────────────────────────────────────── */
function validateEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function validatePAN(v) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v.toUpperCase());
}

function validateAadhaar(v) {
  return /^\d{12}$/.test(v.replace(/\s/g, ''));
}

function maskAadhaar(v) {
  const digits = v.replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  return 'XXXX XXXX ' + digits.slice(8, 12);
}

function FieldError({ msg }) {
  if (!msg) return null;
  return <span className="onboard-field-error">⚠ {msg}</span>;
}

/* ── Progress Bar ───────────────────────────────────────────────── */
function ProgressBar({ current }) {
  return (
    <div className="onboard-progress">
      <div className="onboard-progress-track">
        {STEP_LABELS.map((label, idx) => {
          const stepNum = idx + 1;
          const isCompleted = current > stepNum;
          const isActive = current === stepNum;
          return (
            <div
              key={stepNum}
              className={`onboard-step-item${isActive ? ' active' : ''}${isCompleted ? ' completed' : ''}`}
            >
              <div className={`onboard-step-circle${isActive ? ' active' : ''}${isCompleted ? ' completed' : ''}`}>
                {!isCompleted && <span className="onboard-step-num">{stepNum}</span>}
              </div>
              <span className="onboard-step-label">{label.split('\n')[0]}<br />{label.split('\n')[1]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Google Sign-Up Button Real ──────────────────────────────────────── */
function GoogleSignUpButtonReal({ onSuccess }) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  const handleGoogleSignUp = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setGoogleError('');
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await userInfoRes.json();

        const fingerprint = `${navigator.userAgent}_${navigator.language || ''}_${window.screen.width}x${window.screen.height}`;
        const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
        const browser = navigator.userAgent.includes('Chrome')
          ? 'Chrome'
          : navigator.userAgent.includes('Firefox')
          ? 'Firefox'
          : 'Browser';

        const res = await api.post('/auth/google', {
          idToken: tokenResponse.access_token,
          email: userInfo.email,
          name: userInfo.name,
          googleId: userInfo.sub,
          deviceFingerprint: fingerprint,
          deviceName: `${isMobile ? 'Mobile' : 'Desktop'} - ${browser} (Google)`,
        });

        const { accessToken, refreshToken, user } = res.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('smart_bank_user', JSON.stringify(user));
        onSuccess(user);
      } catch (err) {
        setGoogleError(getErrorMessage(err) || 'Google sign-up failed. Please try again.');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      setGoogleError('Google Sign-Up was cancelled or failed.');
    },
    flow: 'implicit',
  });

  return (
    <>
      {googleError && (
        <div className="onboard-alert error" style={{ marginBottom: '0.75rem' }}>
          {googleError}
        </div>
      )}
      <button
        type="button"
        className="onboard-google-btn"
        onClick={() => handleGoogleSignUp()}
        disabled={googleLoading}
      >
        {googleLoading ? (
          <span className="onboard-google-spinner" />
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        )}
        <span>{googleLoading ? 'Signing up...' : 'Continue with Google'}</span>
      </button>
    </>
  );
}

/* ── Google Sign-Up Button Simulated ──────────────────────────────────── */
function GoogleSignUpButtonSimulated({ onSuccess }) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  const handleSimulatedGoogleSignUp = async () => {
    setGoogleLoading(true);
    setGoogleError('');
    try {
      const simulatedEmail = "simulated.google.user@elitetrust.com";
      const simulatedName = "Simulated Google User";
      const simulatedGoogleId = "103550046";

      const fingerprint = `${navigator.userAgent}_${navigator.language || ''}_${window.screen.width}x${window.screen.height}`;
      const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
      const browser = navigator.userAgent.includes('Chrome')
        ? 'Chrome'
        : navigator.userAgent.includes('Firefox')
        ? 'Firefox'
        : 'Browser';

      const res = await api.post('/auth/google', {
        idToken: "simulated_token",
        email: simulatedEmail,
        name: simulatedName,
        googleId: simulatedGoogleId,
        deviceFingerprint: fingerprint,
        deviceName: `${isMobile ? 'Mobile' : 'Desktop'} - ${browser} (Simulated Google)`,
      });

      const { accessToken, refreshToken, user } = res.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('smart_bank_user', JSON.stringify(user));
      onSuccess(user);
    } catch (err) {
      setGoogleError(getErrorMessage(err) || 'Google sign-up failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <>
      {googleError && (
        <div className="onboard-alert error" style={{ marginBottom: '0.75rem' }}>
          {googleError}
        </div>
      )}
      <button
        type="button"
        className="onboard-google-btn"
        onClick={handleSimulatedGoogleSignUp}
        disabled={googleLoading}
      >
        {googleLoading ? (
          <span className="onboard-google-spinner" />
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        )}
        <span>{googleLoading ? 'Signing up...' : 'Continue with Google (Simulated)'}</span>
      </button>
    </>
  );
}

function GoogleSignUpButton({ onSuccess, isSimulated }) {
  if (isSimulated) {
    return <GoogleSignUpButtonSimulated onSuccess={onSuccess} />;
  } else {
    return <GoogleSignUpButtonReal onSuccess={onSuccess} />;
  }
}

/* ── OTP Input Boxes ────────────────────────────────────────────── */
function OTPInput({ value, onChange, disabled }) {
  const inputRefs = useRef([]);
  const digits = value.split('').concat(Array(6).fill('')).slice(0, 6);

  const handleDigitChange = (idx, e) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    const newDigits = [...digits];
    if (val.length > 1) {
      // Handle paste
      const pasted = val.slice(0, 6);
      const combined = pasted.split('').concat(Array(6).fill('')).slice(0, 6);
      onChange(combined.join(''));
      const nextIdx = Math.min(pasted.length, 5);
      inputRefs.current[nextIdx]?.focus();
      return;
    }
    newDigits[idx] = val;
    onChange(newDigits.join(''));
    if (val && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      if (!digits[idx] && idx > 0) {
        const newDigits = [...digits];
        newDigits[idx - 1] = '';
        onChange(newDigits.join(''));
        inputRefs.current[idx - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[idx] = '';
        onChange(newDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  return (
    <div className="onboard-otp-boxes">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (inputRefs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength="6"
          value={d}
          className={`onboard-otp-digit${d ? ' filled' : ''}`}
          onChange={(e) => handleDigitChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          aria-label={`OTP digit ${i + 1}`}
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
        />
      ))}
    </div>
  );
}

/* ── Upload Card ─────────────────────────────────────────────────── */
function UploadCard({ label, hint, file, onFileChange, onRemove, accept, disabled }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const dropped = e.dataTransfer.files[0];
      if (dropped) validateAndSet(dropped);
    },
    [disabled]
  );

  const validateAndSet = (f) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(f.type)) {
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      return;
    }
    onFileChange(f);
  };

  const handleInputChange = (e) => {
    const f = e.target.files[0];
    if (f) validateAndSet(f);
    e.target.value = '';
  };

  const isImage = file && (file.type === 'image/jpeg' || file.type === 'image/png');
  const previewUrl = file && isImage ? URL.createObjectURL(file) : null;

  return (
    <div
      className={`onboard-upload-card${dragOver ? ' drag-over' : ''}${file ? ' has-file' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && !file && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      aria-label={`Upload ${label}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept || 'image/jpeg,image/png,application/pdf'}
        onChange={handleInputChange}
        disabled={disabled}
        style={{ display: 'none' }}
      />

      {file ? (
        <>
          {file && !disabled && (
            <button
              type="button"
              className="onboard-upload-remove"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              aria-label="Remove file"
            >
              <X size={12} strokeWidth={3} />
            </button>
          )}
          {isImage && previewUrl ? (
            <img src={previewUrl} alt="preview" className="onboard-upload-preview" />
          ) : (
            <div className="onboard-upload-icon">
              <FileText size={28} strokeWidth={1.5} />
            </div>
          )}
          <span className="onboard-upload-filename">{file.name}</span>
          <span className="onboard-upload-hint" style={{ color: 'var(--color-success)' }}>
            {(file.size / 1024).toFixed(0)} KB
          </span>
        </>
      ) : (
        <>
          <div className="onboard-upload-icon">
            <Upload size={28} strokeWidth={1.5} />
          </div>
          <span className="onboard-upload-label">{label}</span>
          <span className="onboard-upload-hint">{hint || 'JPG, PNG or PDF · Max 5 MB'}</span>
          <span className="onboard-upload-hint" style={{ fontSize: '0.68rem', marginTop: '0.25rem' }}>
            Click or drag &amp; drop
          </span>
        </>
      )}
    </div>
  );
}

/* ── Main SignupInner Component ────────────────────────────────── */
function SignupInner({ isSimulated }) {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ msg: '', type: '' }); // type: error|success|info

  // Password visibility
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Per-field errors
  const [errors, setErrors] = useState({});

  // OTP state
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const resendTimerRef = useRef(null);

  // Upload state
  const [govIdFile, setGovIdFile] = useState(null);
  const [addressFile, setAddressFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({ govId: false, address: false, photo: false });
  const [kycSubmitted, setKycSubmitted] = useState(false);

  // Generated customer ID from registration
  const [customerId, setCustomerId] = useState('');

  // All form data
  const [formData, setFormData] = useState({
    // Step 1
    name: '',
    dateOfBirth: '',
    gender: '',
    email: '',
    mobileNumber: '',
    password: '',
    confirmPassword: '',
    // Step 2
    address: '',
    city: '',
    state: '',
    pincode: '',
    occupation: '',
    annualIncome: '',
    // Step 3
    panCardNumber: '',
    aadhaarNumber: '',
    nomineeName: '',
    nomineeRelationship: '',
    nomineeDateOfBirth: '',
  });

  const setField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const showAlert = (msg, type = 'error') => {
    setAlert({ msg, type });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearAlert = () => setAlert({ msg: '', type: '' });

  // ── Step Validators ──────────────────────────────────────────────
  const validateStep1 = () => {
    const errs = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) errs.name = 'Full name must be at least 2 characters';
    if (!formData.dateOfBirth) errs.dateOfBirth = 'Date of birth is required';
    else {
      const dob = new Date(formData.dateOfBirth);
      const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
      if (age < 18) errs.dateOfBirth = 'You must be at least 18 years old';
    }
    if (!formData.gender) errs.gender = 'Please select a gender';
    if (!formData.email) errs.email = 'Email address is required';
    else if (!validateEmail(formData.email)) errs.email = 'Please enter a valid email address';
    if (!formData.mobileNumber || formData.mobileNumber.length !== 10) errs.mobileNumber = 'Mobile number must be exactly 10 digits';
    if (!formData.password || formData.password.length < 8) errs.password = 'Password must be at least 8 characters';
    else if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) errs.password = 'Password must contain at least one special character';
    if (!formData.confirmPassword) errs.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!formData.address.trim()) errs.address = 'Street address is required';
    if (!formData.city.trim()) errs.city = 'City is required';
    if (!formData.state.trim()) errs.state = 'State is required';
    if (!formData.pincode || !/^\d{6}$/.test(formData.pincode)) errs.pincode = 'Please enter a valid 6-digit pincode';
    if (!formData.occupation) errs.occupation = 'Please select an occupation';
    if (!formData.annualIncome) errs.annualIncome = 'Please select annual income range';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = () => {
    const errs = {};
    if (!formData.panCardNumber) errs.panCardNumber = 'PAN number is required';
    else if (!validatePAN(formData.panCardNumber)) errs.panCardNumber = 'Invalid PAN format (e.g. ABCDE1234F)';
    if (!formData.aadhaarNumber) errs.aadhaarNumber = 'Aadhaar number is required';
    else if (!validateAadhaar(formData.aadhaarNumber)) errs.aadhaarNumber = 'Aadhaar must be exactly 12 digits';
    if (!formData.nomineeName.trim()) errs.nomineeName = 'Nominee name is required';
    if (!formData.nomineeRelationship) errs.nomineeRelationship = 'Please select nominee relationship';
    if (!formData.nomineeDateOfBirth) errs.nomineeDateOfBirth = 'Nominee date of birth is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Step 4: Register + OTP ───────────────────────────────────────
  const handleRegisterAndSendOTP = async () => {
    clearAlert();
    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        mobileNumber: formData.mobileNumber,
        password: formData.password,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode,
        occupation: formData.occupation,
        annualIncome: formData.annualIncome,
        panCardNumber: formData.panCardNumber.toUpperCase(),
        aadhaarNumber: formData.aadhaarNumber.replace(/\D/g, ''),
        nomineeName: formData.nomineeName.trim(),
        nomineeRelationship: formData.nomineeRelationship,
        nomineeDateOfBirth: formData.nomineeDateOfBirth,
      };
      const res = await api.post('/auth/register', payload);
      // Capture customerId if returned
      if (res.data?.customerId) setCustomerId(res.data.customerId);
      if (res.data?.user?.customerId) setCustomerId(res.data.user.customerId);
      setCurrentStep(4);
      showAlert('A 6-digit verification OTP has been sent to your registered email and mobile number.', 'info');
      startResendCooldown();
    } catch (err) {
      showAlert(getErrorMessage(err) || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(30);
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    resendTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(resendTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (resendTimerRef.current) clearInterval(resendTimerRef.current); }, []);

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    clearAlert();
    setLoading(true);
    try {
      await api.post('/auth/resend-otp', { mobileNumber: formData.mobileNumber });
      showAlert('OTP resent successfully to your email and mobile.', 'info');
      startResendCooldown();
    } catch (err) {
      // Fallback: some backends don't have a resend endpoint, register again
      try {
        await api.post('/auth/register', {
          name: formData.name.trim(),
          email: formData.email.trim(),
          mobileNumber: formData.mobileNumber,
          password: formData.password,
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          address: formData.address.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          pincode: formData.pincode,
          occupation: formData.occupation,
          annualIncome: formData.annualIncome,
          panCardNumber: formData.panCardNumber.toUpperCase(),
          aadhaarNumber: formData.aadhaarNumber.replace(/\D/g, ''),
          nomineeName: formData.nomineeName.trim(),
          nomineeRelationship: formData.nomineeRelationship,
          nomineeDateOfBirth: formData.nomineeDateOfBirth,
        });
        showAlert('OTP resent successfully.', 'info');
        startResendCooldown();
      } catch (err2) {
        showAlert(getErrorMessage(err2) || 'Failed to resend OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      showAlert('Please enter the complete 6-digit OTP.');
      return;
    }
    clearAlert();
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-signup', {
        mobileNumber: formData.mobileNumber,
        otp: otp,
      });
      if (res.data?.customerId) setCustomerId(res.data.customerId);
      if (res.data?.user?.customerId) setCustomerId(res.data.user.customerId);
      setCurrentStep(5);
      clearAlert();
    } catch (err) {
      showAlert(getErrorMessage(err) || 'OTP verification failed. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 5: Document Upload ──────────────────────────────────────
  const handleUploadAndSubmit = async () => {
    clearAlert();
    setLoading(true);

    const uploadFile = async (file, type) => {
      if (!file) return;
      const fd = new FormData();
      fd.append('mobileNumber', formData.mobileNumber);
      fd.append('file', file);
      fd.append('documentType', type);
      try {
        await api.post('/kyc/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setUploadProgress((prev) => ({ ...prev, [type]: true }));
      } catch (err) {
        console.warn(`Upload failed for ${type}:`, getErrorMessage(err));
      }
    };

    try {
      await Promise.allSettled([
        govIdFile && uploadFile(govIdFile, 'govId'),
        addressFile && uploadFile(addressFile, 'address'),
        photoFile && uploadFile(photoFile, 'photo'),
      ]);

      // Submit KYC metadata
      try {
        await api.post('/kyc/submit', {
          mobileNumber: formData.mobileNumber,
          pan: formData.panCardNumber.toUpperCase(),
          aadhaar: formData.aadhaarNumber.replace(/\D/g, ''),
        });
        setKycSubmitted(true);
      } catch (err) {
        // Non-blocking — proceed anyway
        console.warn('KYC submit error:', getErrorMessage(err));
      }

      setCurrentStep(6);
      clearAlert();
    } catch (err) {
      showAlert(getErrorMessage(err) || 'Document submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Navigation ───────────────────────────────────────────────────
  const handleNext = () => {
    clearAlert();
    setErrors({});
    switch (currentStep) {
      case 1:
        if (validateStep1()) {
          setCurrentStep(2);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        break;
      case 2:
        if (validateStep2()) {
          setCurrentStep(3);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        break;
      case 3:
        if (validateStep3()) {
          handleRegisterAndSendOTP();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        break;
      case 4:
        handleVerifyOTP();
        break;
      case 5:
        handleUploadAndSubmit();
        break;
      default:
        break;
    }
  };

  const handleBack = () => {
    clearAlert();
    setErrors({});
    if (currentStep > 1 && currentStep < 6) {
      // Don't allow going back past OTP screen (already registered)
      if (currentStep === 5) {
        // Can go back to step 4 to re-verify, but OTP screen is fine
        setCurrentStep(4);
      } else if (currentStep === 4) {
        // We already registered; going back to step 3 is just UI
        setCurrentStep(3);
      } else {
        setCurrentStep((prev) => prev - 1);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ── Render Steps ─────────────────────────────────────────────────

  const renderStep1 = () => (
    <div className="onboard-step-panel" key="step1">
      <div className="onboard-step-header">
        <h2>Personal Information</h2>
        <p>Tell us about yourself to create your banking profile</p>
      </div>

      {alert.msg && <div className={`onboard-alert ${alert.type}`}>{alert.msg}</div>}

      <div className="onboard-grid-2">
        {/* Full Name */}
        <div className="onboard-field full-span">
          <label className="onboard-label">
            Full Name <span className="required">*</span>
          </label>
          <input
            className={`onboard-input${errors.name ? ' error' : ''}`}
            type="text"
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => setField('name', e.target.value)}
            autoComplete="name"
          />
          <FieldError msg={errors.name} />
        </div>

        {/* Date of Birth */}
        <div className="onboard-field">
          <label className="onboard-label">
            Date of Birth <span className="required">*</span>
          </label>
          <input
            className={`onboard-input${errors.dateOfBirth ? ' error' : ''}`}
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => setField('dateOfBirth', e.target.value)}
            max={new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000).toISOString().split('T')[0]}
          />
          <FieldError msg={errors.dateOfBirth} />
        </div>

        {/* Gender */}
        <div className="onboard-field">
          <label className="onboard-label">
            Gender <span className="required">*</span>
          </label>
          <div className="onboard-radio-group">
            {[['M', 'Male'], ['F', 'Female'], ['OTHER', 'Other']].map(([val, label]) => (
              <label
                key={val}
                className={`onboard-radio-option${formData.gender === val ? ' selected' : ''}`}
              >
                <input
                  type="radio"
                  name="gender"
                  value={val}
                  checked={formData.gender === val}
                  onChange={() => setField('gender', val)}
                />
                {label}
              </label>
            ))}
          </div>
          <FieldError msg={errors.gender} />
        </div>

        {/* Email */}
        <div className="onboard-field">
          <label className="onboard-label">
            Email Address <span className="required">*</span>
          </label>
          <input
            className={`onboard-input${errors.email ? ' error' : ''}`}
            type="email"
            placeholder="john@example.com"
            value={formData.email}
            onChange={(e) => setField('email', e.target.value)}
            autoComplete="email"
          />
          <FieldError msg={errors.email} />
        </div>

        {/* Mobile */}
        <div className="onboard-field">
          <label className="onboard-label">
            Mobile Number <span className="required">*</span>
          </label>
          <input
            className={`onboard-input${errors.mobileNumber ? ' error' : ''}`}
            type="text"
            inputMode="numeric"
            placeholder="9876543210"
            maxLength={10}
            value={formData.mobileNumber}
            onChange={(e) => setField('mobileNumber', e.target.value.replace(/[^0-9]/g, ''))}
            autoComplete="tel"
          />
          <FieldError msg={errors.mobileNumber} />
        </div>

        {/* Password */}
        <div className="onboard-field">
          <label className="onboard-label">
            Password <span className="required">*</span>
          </label>
          <div className="onboard-pw-wrap">
            <input
              className={`onboard-input${errors.password ? ' error' : ''}`}
              type={showPw ? 'text' : 'password'}
              placeholder="Min 8 chars with special character"
              value={formData.password}
              onChange={(e) => setField('password', e.target.value)}
              autoComplete="new-password"
            />
            <button type="button" className="onboard-pw-eye" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <FieldError msg={errors.password} />
        </div>

        {/* Confirm Password */}
        <div className="onboard-field">
          <label className="onboard-label">
            Confirm Password <span className="required">*</span>
          </label>
          <div className="onboard-pw-wrap">
            <input
              className={`onboard-input${errors.confirmPassword ? ' error' : ''}`}
              type={showConfirm ? 'text' : 'password'}
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={(e) => setField('confirmPassword', e.target.value)}
              autoComplete="new-password"
            />
            <button type="button" className="onboard-pw-eye" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}>
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <FieldError msg={errors.confirmPassword} />
        </div>
      </div>

      {/* Google Sign-Up */}
      <div className="onboard-social-divider">
        <span className="onboard-social-line" />
        <span className="onboard-social-text">or sign up with</span>
        <span className="onboard-social-line" />
      </div>
      <GoogleSignUpButton isSimulated={isSimulated} onSuccess={(user) => navigate('/dashboard', { state: user })} />

      <div className="onboard-login-link">
        Already have an account? <Link to="/login">Sign in</Link>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="onboard-step-panel" key="step2">
      <div className="onboard-step-header">
        <h2>Address &amp; Employment</h2>
        <p>Provide your current residential address and employment details</p>
      </div>

      {alert.msg && <div className={`onboard-alert ${alert.type}`}>{alert.msg}</div>}

      <div className="onboard-grid-2">
        <div className="onboard-field full-span">
          <label className="onboard-label">Street Address <span className="required">*</span></label>
          <input
            className={`onboard-input${errors.address ? ' error' : ''}`}
            type="text"
            placeholder="123, Main Street, Apartment 4B"
            value={formData.address}
            onChange={(e) => setField('address', e.target.value)}
          />
          <FieldError msg={errors.address} />
        </div>

        <div className="onboard-field">
          <label className="onboard-label">City <span className="required">*</span></label>
          <input
            className={`onboard-input${errors.city ? ' error' : ''}`}
            type="text"
            placeholder="Mumbai"
            value={formData.city}
            onChange={(e) => setField('city', e.target.value)}
          />
          <FieldError msg={errors.city} />
        </div>

        <div className="onboard-field">
          <label className="onboard-label">State <span className="required">*</span></label>
          <input
            className={`onboard-input${errors.state ? ' error' : ''}`}
            type="text"
            placeholder="Maharashtra"
            value={formData.state}
            onChange={(e) => setField('state', e.target.value)}
          />
          <FieldError msg={errors.state} />
        </div>

        <div className="onboard-field">
          <label className="onboard-label">Pincode <span className="required">*</span></label>
          <input
            className={`onboard-input${errors.pincode ? ' error' : ''}`}
            type="text"
            inputMode="numeric"
            placeholder="400001"
            maxLength={6}
            value={formData.pincode}
            onChange={(e) => setField('pincode', e.target.value.replace(/[^0-9]/g, ''))}
          />
          <FieldError msg={errors.pincode} />
        </div>

        <div className="onboard-section-divider">Employment Details</div>

        <div className="onboard-field">
          <label className="onboard-label">Occupation <span className="required">*</span></label>
          <select
            className={`onboard-select${errors.occupation ? ' error' : ''}`}
            value={formData.occupation}
            onChange={(e) => setField('occupation', e.target.value)}
          >
            {OCCUPATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <FieldError msg={errors.occupation} />
        </div>

        <div className="onboard-field">
          <label className="onboard-label">Annual Income <span className="required">*</span></label>
          <select
            className={`onboard-select${errors.annualIncome ? ' error' : ''}`}
            value={formData.annualIncome}
            onChange={(e) => setField('annualIncome', e.target.value)}
          >
            {INCOME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <FieldError msg={errors.annualIncome} />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="onboard-step-panel" key="step3">
      <div className="onboard-step-header">
        <h2>Identity Documents</h2>
        <p>Provide your government-issued identity and nominee details</p>
      </div>

      {alert.msg && <div className={`onboard-alert ${alert.type}`}>{alert.msg}</div>}

      <div className="onboard-grid-2">
        <div className="onboard-section-divider">KYC Details</div>

        <div className="onboard-field">
          <label className="onboard-label">PAN Number <span className="required">*</span></label>
          <input
            className={`onboard-input${errors.panCardNumber ? ' error' : ''}`}
            type="text"
            placeholder="ABCDE1234F"
            maxLength={10}
            data-type="pan"
            value={formData.panCardNumber}
            onChange={(e) => setField('panCardNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
          />
          <span className="onboard-masked-hint">10 characters: 5 letters, 4 digits, 1 letter</span>
          <FieldError msg={errors.panCardNumber} />
        </div>

        <div className="onboard-field">
          <label className="onboard-label">Aadhaar Number <span className="required">*</span></label>
          <input
            className={`onboard-input${errors.aadhaarNumber ? ' error' : ''}`}
            type="text"
            inputMode="numeric"
            placeholder="XXXX XXXX XXXX"
            maxLength={12}
            value={formData.aadhaarNumber}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 12);
              setField('aadhaarNumber', val);
            }}
            style={{ letterSpacing: '0.08em' }}
          />
          {formData.aadhaarNumber.length === 12 && (
            <span className="onboard-masked-hint">Stored as: {maskAadhaar(formData.aadhaarNumber)}</span>
          )}
          <FieldError msg={errors.aadhaarNumber} />
        </div>

        <div className="onboard-section-divider">Nominee Details</div>

        <div className="onboard-field">
          <label className="onboard-label">Nominee Full Name <span className="required">*</span></label>
          <input
            className={`onboard-input${errors.nomineeName ? ' error' : ''}`}
            type="text"
            placeholder="Jane Doe"
            value={formData.nomineeName}
            onChange={(e) => setField('nomineeName', e.target.value)}
          />
          <FieldError msg={errors.nomineeName} />
        </div>

        <div className="onboard-field">
          <label className="onboard-label">Nominee Relationship <span className="required">*</span></label>
          <select
            className={`onboard-select${errors.nomineeRelationship ? ' error' : ''}`}
            value={formData.nomineeRelationship}
            onChange={(e) => setField('nomineeRelationship', e.target.value)}
          >
            {NOMINEE_RELATIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <FieldError msg={errors.nomineeRelationship} />
        </div>

        <div className="onboard-field">
          <label className="onboard-label">Nominee Date of Birth <span className="required">*</span></label>
          <input
            className={`onboard-input${errors.nomineeDateOfBirth ? ' error' : ''}`}
            type="date"
            value={formData.nomineeDateOfBirth}
            onChange={(e) => setField('nomineeDateOfBirth', e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
          <FieldError msg={errors.nomineeDateOfBirth} />
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="onboard-step-panel" key="step4">
      <div className="onboard-step-header">
        <h2>Verify Your Identity</h2>
        <p>Enter the 6-digit code sent to your email and mobile</p>
      </div>

      {alert.msg && <div className={`onboard-alert ${alert.type}`}>{alert.msg}</div>}

      <div className="onboard-otp-info">
        <Info size={16} />
        <span>
          A verification code has been sent to{' '}
          <strong>{formData.email}</strong> and mobile ending in{' '}
          <strong>••••{formData.mobileNumber.slice(-4)}</strong>
        </span>
      </div>

      <OTPInput value={otp} onChange={setOtp} disabled={loading} />

      <div className="onboard-otp-resend">
        {resendCooldown > 0 ? (
          <span>
            Resend OTP in{' '}
            <span className="onboard-otp-timer">{resendCooldown}s</span>
          </span>
        ) : (
          <span>
            Didn't receive the code?{' '}
            <button type="button" onClick={handleResendOTP} disabled={loading}>
              Resend OTP
            </button>
          </span>
        )}
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="onboard-step-panel" key="step5">
      <div className="onboard-step-header">
        <h2>Upload Documents</h2>
        <p>Upload clear photos or scans. Accepted formats: JPG, PNG, PDF (max 5 MB each)</p>
      </div>

      {alert.msg && <div className={`onboard-alert ${alert.type}`}>{alert.msg}</div>}

      <div className="onboard-upload-grid">
        <UploadCard
          label="Government ID"
          hint="Passport / Driving Licence / Voter ID"
          file={govIdFile}
          onFileChange={setGovIdFile}
          onRemove={() => setGovIdFile(null)}
          disabled={loading}
        />
        <UploadCard
          label="Address Proof"
          hint="Utility bill / Bank statement / Rental agreement"
          file={addressFile}
          onFileChange={setAddressFile}
          onRemove={() => setAddressFile(null)}
          disabled={loading}
        />
        <UploadCard
          label="Profile Photo"
          hint="Clear passport-size photograph"
          file={photoFile}
          onFileChange={setPhotoFile}
          onRemove={() => setPhotoFile(null)}
          accept="image/jpeg,image/png"
          disabled={loading}
        />
      </div>

      <p className="onboard-upload-note">
        All three documents are recommended. You can submit missing documents later from your KYC dashboard.
      </p>
    </div>
  );

  const renderStep6 = () => (
    <div className="onboard-step-panel" key="step6">
      <div className="onboard-success-screen">
        <div className="onboard-success-icon">
          <CheckCircle size={36} strokeWidth={1.5} />
        </div>

        <h2>Application Submitted!</h2>
        <p>
          Your application is under review. Our compliance team will verify your documents
          and notify you within <strong>2–3 business days</strong>.
        </p>

        {customerId && (
          <div className="onboard-customer-id-box">
            <div className="cid-label">Your Customer ID</div>
            <div className="cid-value">{customerId}</div>
          </div>
        )}

        <div className="onboard-steps-list">
          <div className="onboard-step-badge">
            <CheckCircle size={18} />
            <span>Account registration complete</span>
          </div>
          <div className="onboard-step-badge">
            <CheckCircle size={18} />
            <span>Identity verification submitted</span>
          </div>
          <div className="onboard-step-badge">
            <Clock size={18} />
            <span>KYC review in progress (2–3 business days)</span>
          </div>
          <div className="onboard-step-badge">
            <Shield size={18} />
            <span>Account activation upon approval</span>
          </div>
        </div>

        <button
          type="button"
          className="onboard-btn-next"
          style={{ margin: '0 auto' }}
          onClick={() => navigate('/login')}
        >
          Go to Login
        </button>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      default: return null;
    }
  };

  const getNextLabel = () => {
    if (loading) return <><span className="onboard-btn-spinner" /> Processing…</>;
    switch (currentStep) {
      case 3: return <>Submit &amp; Get OTP <ChevronRight size={18} /></>;
      case 4: return <>Verify OTP <ChevronRight size={18} /></>;
      case 5: return <>Submit Documents <ChevronRight size={18} /></>;
      default: return <>Continue <ChevronRight size={18} /></>;
    }
  };

  return (
    <div className="onboard-page">
      {/* Brand */}
      <div className="onboard-brand">
        <div className="onboard-brand-icon">
          <Shield size={20} strokeWidth={2} />
        </div>
        <span className="onboard-brand-name">EliteTrust Bank</span>
      </div>

      {/* Card */}
      <div className="onboard-card">
        {/* Progress */}
        <ProgressBar current={currentStep} />

        {/* Body */}
        <div className="onboard-body">
          {renderCurrentStep()}
        </div>

        {/* Footer Nav */}
        {currentStep < 6 && (
          <div className="onboard-footer">
            {currentStep > 1 ? (
              <button
                type="button"
                className="onboard-btn-back"
                onClick={handleBack}
                disabled={loading}
              >
                <ChevronLeft size={18} /> Back
              </button>
            ) : (
              <div />
            )}
            <button
              type="button"
              className="onboard-btn-next"
              onClick={handleNext}
              disabled={loading}
            >
              {getNextLabel()}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Wrapped with Google Provider ──────────────────────────────── */
function Signup() {
  const isSimulated = !import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID.includes("YOUR_GOOGLE_CLIENT_ID");

  if (isSimulated) {
    return <SignupInner isSimulated={true} />;
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <SignupInner isSimulated={false} />
    </GoogleOAuthProvider>
  );
}

export default Signup;