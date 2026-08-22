import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import api from '@/lib/axios'

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
  validateSearch: (search) => ({
    token: search?.token || '',
  }),
})

function ResetPasswordPage() {
  const { token: queryToken } = Route.useSearch()
  const navigate = useNavigate()

  const [inputToken, setInputToken] = useState(queryToken || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const activeToken = inputToken.trim()

    if (!activeToken) {
      setError('Reset token is required. Paste the token from your backend server console.')
      return
    }
    if (!newPassword) {
      setError('Please enter a new password')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError('')

    try {
      await api.post('/auth/reset-password', {
        token: activeToken,
        newPassword,
      })
      setSuccess(true)
      setTimeout(() => {
        navigate({ to: '/login' })
      }, 2500)
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Password reset failed. Token may be invalid or expired.')
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
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <span className="brand-name">Set New Password</span>
          <span className="brand-tagline">Enter reset token and your new password</span>
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

        {/* Success Alert */}
        {success && (
          <div className="alert-success" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Password reset successfully! Redirecting to sign in page…
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} noValidate>
            {/* Token Input */}
            <div className="form-group">
              <label htmlFor="reset-token" className="form-label">
                Reset Token <span className="required-star">*</span>
              </label>
              <input
                id="reset-token"
                type="text"
                placeholder="Paste token from console (e.g. 8f9a2b...)"
                value={inputToken}
                onChange={(e) => {
                  setInputToken(e.target.value)
                  if (error) setError('')
                }}
                className={`form-input ${error && !inputToken ? 'is-error' : ''}`}
              />
              <span className="avatar-hint">
                In DEV mode, copy token printed in backend terminal console.
              </span>
            </div>

            {/* New Password */}
            <div className="form-group">
              <label htmlFor="new-password" className="form-label">
                New Password <span className="required-star">*</span>
              </label>
              <div className="input-wrapper">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    if (error) setError('')
                  }}
                  className={`form-input ${error && !newPassword ? 'is-error' : ''}`}
                />
                <button
                  type="button"
                  className="input-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label htmlFor="confirm-password" className="form-label">
                Confirm New Password <span className="required-star">*</span>
              </label>
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (error) setError('')
                }}
                className={`form-input ${error && newPassword !== confirmPassword ? 'is-error' : ''}`}
              />
            </div>

            <button
              type="submit"
              id="reset-submit-btn"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: '8px' }}
            >
              {loading && <span className="spinner" />}
              {loading ? 'Resetting password…' : 'Reset Password'}
            </button>
          </form>
        )}

        <p className="auth-footer">
          <Link to="/login" className="auth-link">Back to Sign In</Link>
        </p>
      </div>
    </div>
  )
}
