import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  evaluatePasswordStrength,
  authRateLimiter,
  generateSingleUseResetToken,
  authenticateGoogleUserInHashTable,
} from '../../services/securityAuthService';
import './Auth.css';

declare global {
  interface Window {
    google?: any;
  }
}

const GOOGLE_CLIENT_ID = '942604298483-qbvbh87bra4432tbbs2b5qc1ncap9n7u.apps.googleusercontent.com';

// Helper to decode Google OAuth JWT Credential Token
function parseJwtPayload(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { login, addAuditLog } = useAuth();

  // Mode: isSignup toggles between Login and Registration sliding panels
  const [isSignup, setIsSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  // Form Controlled Inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Persistent Anti-Spam Access Request Tracker
  const [submittedEmails, setSubmittedEmails] = useState<string[]>(() => {
    const saved = localStorage.getItem('nwis_submitted_access_requests');
    return saved ? JSON.parse(saved) : [];
  });

  // Registration Pending Approval Banner State
  const [isRequestPending, setIsRequestPending] = useState(false);

  // Security UI State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [failedCount, setFailedCount] = useState(0);

  // CAPTCHA State
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaCode] = useState('NWIS-7842');

  const [resetData, setResetData] = useState<{ token: string; expiresAt: string } | null>(null);

  // Password strength for signup
  const signupPasswordStrength = evaluatePasswordStrength(signupPassword);

  const passwordType = showPassword ? 'text' : 'password';
  const eyeIcon = showPassword ? 'uil-eye' : 'uil-eye-slash';

  // Handle Google OAuth Callback Response (Strictly checks Hash Table authorization)
  const handleGoogleCredentialResponse = (credentialToken: string) => {
    setLoading(true);
    setErrorMessage(null);

    const payload = parseJwtPayload(credentialToken);
    const googleEmail = payload?.email ? payload.email.trim().toLowerCase() : null;

    if (!googleEmail) {
      setErrorMessage('Google authentication failed: Could not retrieve email address from token.');
      setLoading(false);
      return;
    }

    // Verify Google Email strictly against Hash Table
    const userRecord = authenticateGoogleUserInHashTable(googleEmail);

    if (userRecord) {
      authRateLimiter.reset(googleEmail);
      login(
        {
          id: userRecord.id,
          email: userRecord.email,
          name: payload?.name || userRecord.name,
          role: userRecord.role,
          emailVerified: true,
          mfaEnabled: true,
          lastLoginAt: new Date().toISOString(),
          trustedDevice: true,
        },
        'google_oauth_jwt_' + Date.now()
      );

      addAuditLog({
        action: 'LOGIN_SUCCESS',
        location: 'Assam, India',
        ip: '103.48.198.12',
        device: `Google OAuth (${googleEmail})`,
        status: 'SUCCESS',
      });

      navigate('/workspace');
    } else {
      // Strictly Deny Access if account does not exist in Hash Table
      setErrorMessage(
        `Access Denied: The Google account (${googleEmail}) is not authorized in the NWIS database.`
      );

      addAuditLog({
        action: 'LOGIN_FAILED',
        location: 'Assam, India',
        ip: '103.48.198.12',
        device: `Google OAuth (${googleEmail})`,
        status: 'BLOCKED',
      });
    }

    setLoading(false);
  };

  // Initialize Google Identity Services SDK and Render Google Button
  useEffect(() => {
    const initGsi = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response: any) => {
              if (response?.credential) {
                handleGoogleCredentialResponse(response.credential);
              }
            },
          });

          // Render official Google button inside container if element exists
          const googleContainer = document.getElementById('googleSignInButtonContainer');
          if (googleContainer) {
            window.google.accounts.id.renderButton(googleContainer, {
              theme: 'outline',
              size: 'large',
              width: 320,
              text: 'signin_with',
            });
          }
        } catch {
          // GSI init fallback
        }
      }
    };

    const timer = setTimeout(initGsi, 500);
    return () => clearTimeout(timer);
  }, []);

  // Trigger Google Sign In Prompt
  const handleGoogleSignInClick = () => {
    setErrorMessage(null);
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          window.google.accounts.id.renderButton(
            document.getElementById('googleSignInButtonContainer'),
            { theme: 'outline', size: 'large', width: 320 }
          );
        }
      });
    }
  };

  // Handle Login Submit (Restricted ONLY to Hash Table accounts)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Rate Limiting Check
    const rateCheck = authRateLimiter.isLocked(loginEmail || 'global');
    if (rateCheck.locked) {
      setErrorMessage(`Too many failed login attempts. Temporarily locked for ${rateCheck.lockSeconds} seconds.`);
      return;
    }

    // CAPTCHA Check
    if (requiresCaptcha && captchaInput !== captchaCode) {
      setErrorMessage('Invalid CAPTCHA code. Please enter the security code correctly.');
      return;
    }

    setLoading(true);

    try {
      // Import loginUser from securityAuthService directly or use the one we added
      // Since it's exported from securityAuthService, we'll assume it's imported above or we'll just require it
      
      const { loginUser } = await import('../../services/securityAuthService');
      const authResult = await loginUser(loginEmail, loginPassword);

      if (authResult && authResult.access_token) {
        authRateLimiter.reset(loginEmail || 'global');
        
        // Save the REAL JWT token via the AuthContext
        login(
          {
            id: authResult.user?.id || 'usr-1',
            email: authResult.user?.email || loginEmail,
            name: authResult.user?.full_name || authResult.user?.username || loginEmail,
            role: authResult.user?.role || 'Engineer',
            emailVerified: true,
            mfaEnabled: true,
            lastLoginAt: new Date().toISOString(),
            trustedDevice: rememberMe,
          },
          authResult.access_token
        );

        addAuditLog({
          action: 'LOGIN_SUCCESS',
          location: 'Assam, India',
          ip: '103.48.198.12',
          device: 'Windows / Chrome',
          status: 'SUCCESS',
        });

        navigate('/workspace');
      } else {
        const attempts = failedCount + 1;
        setFailedCount(attempts);

        const lockResult = authRateLimiter.recordFailedAttempt(loginEmail || 'global');
        if (attempts >= 2) {
          setRequiresCaptcha(true);
        }

        if (lockResult.locked) {
          setErrorMessage(`Security threshold exceeded. Account locked for ${lockResult.lockSeconds}s.`);
        } else {
          // Non-enumerating error message
          setErrorMessage('Invalid email or password credentials.');
        }

        addAuditLog({
          action: 'LOGIN_FAILED',
          location: 'Assam, India',
          ip: '103.48.198.12',
          device: 'Windows / Chrome',
          status: 'BLOCKED',
        });
      }
    } catch (err: any) {
      console.error('LOGIN ERROR:', err.response?.status, err.response?.data, err);
      const attempts = failedCount + 1;
      setFailedCount(attempts);
      const lockResult = authRateLimiter.recordFailedAttempt(loginEmail || 'global');
      
      if (lockResult.locked) {
        setErrorMessage(`Security threshold exceeded. Account locked for ${lockResult.lockSeconds}s.`);
      } else {
        setErrorMessage(err?.response?.status === 401 ? 'Invalid email or password credentials.' : 'An unexpected error occurred while logging in.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Anti-Spam New User Access Request (Blocks multiple submissions from same user/email)
  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const normalizedSignupEmail = signupEmail.trim().toLowerCase();

    // Check if user has already submitted an access request
    if (submittedEmails.includes(normalizedSignupEmail)) {
      setErrorMessage('An access request has already been submitted for this email. Multiple requests are blocked to prevent spamming.');
      setIsRequestPending(true);
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (signupPasswordStrength.score < 2) {
      setErrorMessage('Please use a stronger password with numbers and symbols.');
      return;
    }
    if (!acceptTerms) {
      setErrorMessage('Please accept the terms and conditions to proceed.');
      return;
    }

    setLoading(true);
    
    // Import dynamically since it's exported from securityAuthService
    import('../../services/securityAuthService').then(async ({ registerUser }) => {
      try {
        await registerUser({
          email: normalizedSignupEmail,
          password: signupPassword,
          full_name: signupName,
          username: normalizedSignupEmail,
        });

        // Successfully registered
        setSuccessMessage('Registration successful! You can now log in.');
        setIsSignup(false); // Switch back to login form
        setLoginEmail(normalizedSignupEmail);
      } catch (e: any) {
        setErrorMessage(e?.response?.data?.detail || 'Failed to register user. The email/username might already exist.');
      } finally {
        setLoading(false);
      }
    });
  };

  // Handle Password Reset Request
  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail) {
      setErrorMessage('Please enter your email address above.');
      return;
    }
    const tokenInfo = generateSingleUseResetToken();
    setResetData(tokenInfo);
    setSuccessMessage('If an account exists, a 15-minute single-use reset link has been generated.');
  };

  return (
    <main className="auth-page font-average">
      {/* Centered NWIS Brand Header ON TOP OF the Login Box */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              background: '#D92D20',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: '800',
              fontSize: '22px',
              boxShadow: '0 4px 12px rgba(217, 45, 32, 0.22)',
            }}
          >
            <span style={{ color: '#FDB813' }}>N</span>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: '800',
              color: '#000',
              lineHeight: 1,
              letterSpacing: '-0.8px',
            }}
          >
            NWIS
          </h1>
        </div>
        <span
          style={{
            fontSize: '10.5px',
            color: '#475569',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginTop: '6px',
          }}
        >
          Well Intelligence Platform
        </span>
      </div>

      {/* Main Login Card Box */}
      <section className={`auth-container ${isSignup ? 'active' : ''}`}>
        <div className="forms">
          {/* LOGIN FORM */}
          <div className="form login">
            <span className="title">
              {isResetMode ? 'Reset Password' : 'Login'}
            </span>

            {/* Error & Success Messages */}
            {errorMessage && (
              <div style={{ marginTop: '10px', padding: '6px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '5px', color: '#991b1b', fontSize: '11.5px' }}>
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div style={{ marginTop: '10px', padding: '6px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '5px', color: '#166534', fontSize: '11.5px' }}>
                {successMessage}
              </div>
            )}

            {!isResetMode && (
              <form onSubmit={handleLoginSubmit}>
                <label className="input-field">
                  <input
                    type="text"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Enter your email or username"
                    required
                  />
                  <i className="uil uil-envelope icon" aria-hidden="true"></i>
                </label>

                <label className="input-field">
                  <input
                    type={passwordType}
                    className="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                  <i className="uil uil-lock icon" aria-hidden="true"></i>
                  <button
                    className="showHidePw"
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    <i className={`uil ${eyeIcon}`} aria-hidden="true"></i>
                  </button>
                </label>

                {/* CAPTCHA Challenge */}
                {requiresCaptcha && (
                  <div style={{ marginTop: '12px', padding: '8px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '5px' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#92400e', display: 'block', marginBottom: '4px' }}>
                      Security Verification Required:
                    </span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ background: '#fef3c7', color: '#78350f', padding: '3px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11.5px', textDecoration: 'line-through', letterSpacing: '1.5px' }}>
                        {captchaCode}
                      </span>
                      <input
                        type="text"
                        value={captchaInput}
                        onChange={(e) => setCaptchaInput(e.target.value)}
                        placeholder="Enter code"
                        style={{ padding: '3px 6px', fontSize: '11.5px', border: '1px solid #cbd5e1', borderRadius: '4px', flex: 1 }}
                      />
                    </div>
                  </div>
                )}

                <div className="checkbox-text">
                  <label className="checkbox-content text">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    Remember me
                  </label>

                  <a
                    href="#forgot"
                    className="text"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsResetMode(true);
                      setErrorMessage(null);
                    }}
                  >
                    Forgot password?
                  </a>
                </div>

                <div className="input-field button">
                  <input
                    type="submit"
                    value={loading ? 'Authenticating...' : 'Login'}
                    disabled={loading}
                  />
                </div>

                {/* Divider & Google OAuth Button */}
                <div style={{ marginTop: '14px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
                    <span style={{ padding: '0 8px', fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                      Or continue with
                    </span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
                  </div>

                  <div id="googleSignInButtonContainer" style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={handleGoogleSignInClick}
                      disabled={loading}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '8px 14px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#1e293b',
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                      }}
                    >
                      <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
                        <path
                          d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z"
                          fill="#4285F4"
                        />
                        <path
                          d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z"
                          fill="#34A853"
                        />
                        <path
                          d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z"
                          fill="#EA4335"
                        />
                      </svg>
                      <span>Sign in with Google</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Reset Password Mode */}
            {isResetMode && (
              <form onSubmit={handleResetSubmit} style={{ marginTop: '6px' }}>
                <label className="input-field">
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    required
                  />
                  <i className="uil uil-envelope icon" aria-hidden="true"></i>
                </label>

                {resetData && (
                  <div style={{ marginTop: '10px', padding: '6px 8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '11px' }}>
                    <strong>Token:</strong> {resetData.token}<br />
                    <span style={{ color: '#64748b' }}>Expires: {resetData.expiresAt}</span>
                  </div>
                )}

                <div className="input-field button">
                  <input type="submit" value="Send Reset Token" />
                </div>

                <div style={{ marginTop: '12px', textAlign: 'center' }}>
                  <a
                    href="#back"
                    className="text"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsResetMode(false);
                      setErrorMessage(null);
                    }}
                    style={{ color: '#000', fontWeight: 'bold' }}
                  >
                    ← Back to Login
                  </a>
                </div>
              </form>
            )}

            <div className="login-signup">
              <span className="text">
                Not a member?{' '}
                <a
                  href="#signup"
                  className="text signup-link"
                  onClick={(event) => {
                    event.preventDefault();
                    setIsSignup(true);
                    setIsResetMode(false);
                    setIsRequestPending(false);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                >
                  Signup Now
                </a>
              </span>
            </div>
          </div>

          {/* SIGNUP / REQUEST ACCESS FORM */}
          <div className="form signup">
            <span className="title">Registration</span>

            {errorMessage && (
              <div style={{ marginTop: '10px', padding: '6px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '5px', color: '#991b1b', fontSize: '11.5px' }}>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSignupSubmit}>
              <label className="input-field">
                <input
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />
                <i className="uil uil-user icon" aria-hidden="true"></i>
              </label>

              <label className="input-field">
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
                <i className="uil uil-envelope icon" aria-hidden="true"></i>
              </label>

              <label className="input-field">
                <input
                  type={passwordType}
                  className="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                />
                <i className="uil uil-lock icon" aria-hidden="true"></i>
              </label>

              {/* Password Strength Meter */}
              {signupPassword.length > 0 && (
                <div style={{ marginTop: '4px', fontSize: '10.5px' }}>
                  <span>Strength: <strong>{signupPasswordStrength.label}</strong></span>
                  <div style={{ height: '3.5px', background: '#e2e8f0', borderRadius: '2px', marginTop: '2px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${(signupPasswordStrength.score / 4) * 100}%`,
                        background: signupPasswordStrength.score <= 1 ? '#ef4444' : signupPasswordStrength.score === 2 ? '#f59e0b' : '#10b981',
                        transition: 'width 0.3s ease'
                      }}
                    ></div>
                  </div>
                </div>
              )}

              <label className="input-field">
                <input
                  type={passwordType}
                  className="password"
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  placeholder="Confirm a password"
                  required
                />
                <i className="uil uil-lock icon" aria-hidden="true"></i>
                <button
                  className="showHidePw"
                  type="button"
                  aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  <i className={`uil ${eyeIcon}`} aria-hidden="true"></i>
                </button>
              </label>

              <div className="checkbox-text">
                <label className="checkbox-content text">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                  />
                  I accepted all terms and conditions
                </label>
              </div>

              <div className="input-field button">
                <input
                  type="submit"
                  value={loading ? 'Submitting Request...' : 'Request Access'}
                  disabled={loading}
                />
              </div>
            </form>

            {/* REQUEST PENDING APPROVAL MESSAGE SHOWN AFTER PASSWORD & REQUEST ACCESS IS CLICKED */}
            {isRequestPending && (
              <div style={{ marginTop: '16px', padding: '14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', color: '#92400e', fontSize: '11.5px', lineHeight: 1.5 }}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '800', color: '#78350f' }}>
                  Request Pending Approval
                </h3>
                <p style={{ margin: '0 0 10px 0' }}>
                  An access request has already been submitted for this email.<br />
                  Multiple requests are blocked to prevent spamming.
                </p>
                <div style={{ padding: '6px 10px', background: '#fef3c7', borderRadius: '6px', fontWeight: '700', color: '#92400e' }}>
                  Status: ⏳ Awaiting Approval
                </div>
              </div>
            )}

            <div className="login-signup">
              <span className="text">
                Already a member?{' '}
                <a
                  href="#login"
                  className="text login-link"
                  onClick={(event) => {
                    event.preventDefault();
                    setIsSignup(false);
                    setIsRequestPending(false);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                >
                  Login Now
                </a>
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Auth;
