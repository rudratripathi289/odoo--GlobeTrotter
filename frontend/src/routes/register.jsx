import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import api from '@/lib/axios'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    phone: '',
    city: '',
    country: '',
    bio: '',
  })

  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  // ── Avatar Handling ──────────────────────────────────────────
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, avatar: 'Image must be under 5MB' }))
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setErrors((prev) => ({ ...prev, avatar: '' }))
  }

  // ── Form Handling ────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
    if (serverError) setServerError('')
  }

  const validate = () => {
    const errs = {}
    if (!form.firstName.trim()) errs.firstName = 'First name is required'
    if (!form.lastName.trim()) errs.lastName = 'Last name is required'
    if (!form.username.trim()) errs.username = 'Username is required'
    else if (form.username.trim().length < 3) errs.username = 'Username must be at least 3 characters'
    if (!form.email.trim()) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email'
    if (!form.password) errs.password = 'Password is required'
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) return setErrors(errs)

    setLoading(true)
    setServerError('')

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        username: form.username.trim().toLowerCase(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        ...(form.phone.trim() && { phone: form.phone.trim() }),
        ...(form.city.trim() && { city: form.city.trim() }),
        ...(form.country.trim() && { country: form.country.trim() }),
        ...(form.bio.trim() && { bio: form.bio.trim() }),
      }

      const res = await api.post('/auth/register', payload)
      const { accessToken } = res.data.data

      // If avatar file was attached, upload it using the returned temporary session token
      if (avatarFile && accessToken) {
        try {
          const formData = new FormData()
          formData.append('image', avatarFile)
          const uploadRes = await api.post('/upload/image', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${accessToken}`,
            },
          })
          const photoUrl = uploadRes.data?.data?.url || uploadRes.data?.url
          if (photoUrl) {
            await api.patch('/users/me', { photoUrl }, {
              headers: { Authorization: `Bearer ${accessToken}` },
            })
          }
        } catch (uploadErr) {
          console.warn('Avatar upload deferred:', uploadErr)
        }
      }

      // Redirect to sign in page upon successful registration
      navigate({ to: '/login', search: { registered: true } })
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Registration failed. Please try again.'
      setServerError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card-wide">
        {/* Brand */}
        <div className="brand">
          <div className="brand-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <span className="brand-name">Create your account</span>
          <span className="brand-tagline">Join GlobeTrotter and start planning your journeys</span>
        </div>

        {/* Avatar Upload */}
        <div className="avatar-upload">
          <div
            className="avatar-ring"
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Upload profile photo"
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Profile preview" className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            )}
            <div className="avatar-overlay">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            id="avatar-input"
            accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
          <span className="avatar-hint">
            {avatarPreview ? 'Click to change photo' : 'Upload profile photo (optional)'}
          </span>
          {errors.avatar && <span className="form-error">{errors.avatar}</span>}
        </div>

        {/* Server Error */}
        {serverError && (
          <div className="alert-error" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Row 1: First + Last Name */}
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="reg-firstName" className="form-label">
                First Name <span className="required-star">*</span>
              </label>
              <input
                id="reg-firstName"
                type="text"
                name="firstName"
                autoComplete="given-name"
                placeholder="John"
                value={form.firstName}
                onChange={handleChange}
                className={`form-input ${errors.firstName ? 'is-error' : ''}`}
              />
              {errors.firstName && <span className="form-error">{errors.firstName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="reg-lastName" className="form-label">
                Last Name <span className="required-star">*</span>
              </label>
              <input
                id="reg-lastName"
                type="text"
                name="lastName"
                autoComplete="family-name"
                placeholder="Doe"
                value={form.lastName}
                onChange={handleChange}
                className={`form-input ${errors.lastName ? 'is-error' : ''}`}
              />
              {errors.lastName && <span className="form-error">{errors.lastName}</span>}
            </div>
          </div>

          {/* Row 2: Username + Email */}
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="reg-username" className="form-label">
                Username <span className="required-star">*</span>
              </label>
              <input
                id="reg-username"
                type="text"
                name="username"
                autoComplete="username"
                placeholder="johndoe"
                value={form.username}
                onChange={handleChange}
                className={`form-input ${errors.username ? 'is-error' : ''}`}
              />
              {errors.username && <span className="form-error">{errors.username}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="reg-email" className="form-label">
                Email Address <span className="required-star">*</span>
              </label>
              <input
                id="reg-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                className={`form-input ${errors.email ? 'is-error' : ''}`}
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>
          </div>

          {/* Row 3: Password + Phone */}
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="reg-password" className="form-label">
                Password <span className="required-star">*</span>
              </label>
              <div className="input-wrapper">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={handleChange}
                  className={`form-input ${errors.password ? 'is-error' : ''}`}
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
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="reg-phone" className="form-label">Phone Number</label>
              <input
                id="reg-phone"
                type="tel"
                name="phone"
                autoComplete="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>

          {/* Row 4: City + Country */}
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="reg-city" className="form-label">City</label>
              <input
                id="reg-city"
                type="text"
                name="city"
                autoComplete="address-level2"
                placeholder="Mumbai"
                value={form.city}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-country" className="form-label">Country</label>
              <input
                id="reg-country"
                type="text"
                name="country"
                autoComplete="country-name"
                placeholder="India"
                value={form.country}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>

          {/* About / Bio */}
          <div className="form-group">
            <label htmlFor="reg-bio" className="form-label">Additional Information / Bio</label>
            <textarea
              id="reg-bio"
              name="bio"
              placeholder="Tell us about yourself and your travel interests…"
              value={form.bio}
              onChange={handleChange}
              className="form-textarea"
              maxLength={500}
            />
          </div>

          <button
            type="submit"
            id="register-submit-btn"
            className="btn-primary"
            disabled={loading}
            style={{ marginTop: '8px' }}
          >
            {loading && <span className="spinner" />}
            {loading ? 'Creating account…' : 'Register User'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?
          <Link to="/login" className="auth-link" style={{ marginLeft: '4px' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
