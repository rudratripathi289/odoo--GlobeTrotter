import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import api from '@/lib/axios'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address')
      return
    }

    setLoading(true)
    setError('')

    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() })
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Brand */}
        <div className="brand">
          <div className="brand-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <span className="brand-name">Reset your password</span>
          <span className="brand-tagline">Enter your registered email to receive a reset link</span>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert-error" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* Success / Dev Instructions */}
        {submitted ? (
          <div style={{ textAlign: 'center' }}>
            <div className="alert-success" style={{ textAlign: 'left', marginBottom: '16px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <div>
                <strong>Reset Request Sent!</strong>
                <p style={{ marginTop: 4, fontSize: '0.8125rem' }}>
                  Since the email service is in local <strong>DEV mode</strong>, your raw reset token has been printed in your <strong>backend terminal console</strong>.
                </p>
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--bg)',
              border: '1px dashed var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px',
              fontSize: '0.75rem',
              color: 'var(--muted)',
              marginBottom: '20px',
              fontFamily: 'monospace',
              textAlign: 'left'
            }}>
              Backend Console Log:<br />
              <code>[DEV] Password reset token for {email}: &lt;token&gt;</code>
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate({ to: '/reset-password' })}
            >
              Enter Reset Token & New Password
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="forgot-email" className="form-label">Email Address</label>
              <input
                id="forgot-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError('')
                }}
                className={`form-input ${error ? 'is-error' : ''}`}
              />
            </div>

            <button
              type="submit"
              id="forgot-submit-btn"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: '8px' }}
            >
              {loading && <span className="spinner" />}
              {loading ? 'Sending request…' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p className="auth-footer">
          Remember your password?
          <Link to="/login" className="auth-link" style={{ marginLeft: '4px' }}>Back to Sign In</Link>
        </p>
      </div>
    </div>
  )
}
