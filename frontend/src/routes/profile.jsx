import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import useAuthStore from '@/store/authStore'
import api from '@/lib/axios'

export const Route = createFileRoute('/profile')({
  component: UserProfilePage,
})

function UserProfilePage() {
  const navigate = useNavigate()
  const { user: authUser, setAuth, clearAuth } = useAuthStore()
  const fileInputRef = useRef(null)

  const [profile, setProfile] = useState(null)
  const [trips, setTrips] = useState([])
  const [savedDestinations, setSavedDestinations] = useState([])
  const [loading, setLoading] = useState(true)

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    city: '',
    country: '',
    bio: '',
    language: 'en',
  })
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [savingProfile, setSavingProfile] = useState(false)

  // Change Password State
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  // Alerts
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const fetchProfileData = async () => {
    setLoading(true)
    try {
      // 1. Fetch User Profile
      const userRes = await api.get('/users/me')
      const userData = userRes.data?.data || userRes.data
      setProfile(userData)
      setEditForm({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        phone: userData.phone || '',
        city: userData.city || '',
        country: userData.country || '',
        bio: userData.bio || '',
        language: userData.language || 'en',
      })

      // 2. Fetch User Trips
      try {
        const tripsRes = await api.get('/trips')
        setTrips(tripsRes.data?.data || tripsRes.data || [])
      } catch {
        setTrips([])
      }

      // 3. Fetch Saved Destinations
      try {
        const savedRes = await api.get('/users/me/saved-destinations')
        setSavedDestinations(savedRes.data?.data || savedRes.data || [])
      } catch {
        setSavedDestinations([])
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to load profile data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) {
      navigate({ to: '/login' })
      return
    }
    fetchProfileData()
  }, [navigate])

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size must be under 5MB.')
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      let photoUrl = profile?.photoUrl

      // Upload avatar photo if updated
      if (avatarFile) {
        const formData = new FormData()
        formData.append('image', avatarFile)
        const uploadRes = await api.post('/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        photoUrl = uploadRes.data?.data?.url || uploadRes.data?.url || photoUrl
      }

      const updatePayload = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        phone: editForm.phone.trim(),
        city: editForm.city.trim(),
        country: editForm.country.trim(),
        bio: editForm.bio.trim(),
        language: editForm.language,
        ...(photoUrl ? { photoUrl } : {}),
      }

      const res = await api.patch('/users/me', updatePayload)
      const updatedUser = res.data?.data || res.data

      // Update Zustand store & local storage
      const token = localStorage.getItem('accessToken')
      const refresh = localStorage.getItem('refreshToken')
      setAuth({ user: updatedUser, accessToken: token, refreshToken: refresh })

      setProfile(updatedUser)
      setSuccessMsg('Profile updated successfully!')
      setIsEditing(false)
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to update profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!currentPassword || !newPassword) {
      setErrorMsg('Current and new passwords are required.')
      return
    }
    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.')
      return
    }

    setChangingPassword(true)
    setErrorMsg('')

    try {
      await api.patch('/users/me/password', {
        currentPassword,
        newPassword,
      })
      setSuccessMsg('Password changed successfully!')
      setShowPasswordModal(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to change password.')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleRemoveSavedDestination = async (cityId, e) => {
    e.stopPropagation()
    try {
      await api.delete(`/users/me/saved-destinations/${cityId}`)
      setSavedDestinations((prev) => prev.filter((item) => item.cityId !== cityId && item.city?.id !== cityId))
      setSuccessMsg('Bookmark removed.')
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to remove saved destination.')
    }
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm('⚠️ WARNING: Deleting your account will permanently remove all your trips, stops, and data. Are you sure?')) return
    try {
      await api.delete('/users/me')
      clearAuth()
      navigate({ to: '/register' })
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to delete account.')
    }
  }

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <div className="spinner" style={{ width: 28, height: 28, borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
        <p style={{ marginTop: 12, color: 'var(--muted)' }}>Loading profile…</p>
      </div>
    )
  }

  if (!profile) return null

  // Categorize trips for Screen 7 (Preplanned Trips vs Previous Trips)
  const now = new Date()
  const preplannedTrips = trips.filter((t) => new Date(t.startDate) >= now)
  const previousTrips = trips.filter((t) => new Date(t.startDate) < now)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <header className="navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-brand">
            <div className="navbar-brand-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <span>GlobeTrotter</span>
          </Link>

          <nav>
            <ul className="navbar-links">
              <li><Link to="/" className="nav-link">Home</Link></li>
              <li><Link to="/trips" className="nav-link">My Trips</Link></li>
              <li><Link to="/community" className="nav-link">Community</Link></li>
              <li><Link to="/profile" className="nav-link active">Profile</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="page-container" style={{ flex: 1 }}>
        <div style={{ marginBottom: '16px' }}>
          <Link to="/" style={{ fontSize: '0.875rem', color: 'var(--muted)', textDecoration: 'none' }}>
            ← Back to Dashboard
          </Link>
        </div>

        {/* Alerts */}
        {errorMsg && <div className="alert-error" role="alert" onClick={() => setErrorMsg('')}>{errorMsg}</div>}
        {successMsg && <div className="alert-success" role="alert" onClick={() => setSuccessMsg('')}>{successMsg}</div>}

        {/* ── TOP SECTION: User Profile Details (Screen 7 Wireframe) ── */}
        <div className="form-card" style={{ marginBottom: '32px' }}>
          <div className="form-card-title">
            <span>User Profile Settings (Screen 7)</span>
            {!isEditing ? (
              <button
                type="button"
                className="btn-primary"
                style={{ width: 'auto', padding: '6px 14px', fontSize: '0.8125rem' }}
                onClick={() => setIsEditing(true)}
              >
                ✏️ Edit Profile Information
              </button>
            ) : (
              <button
                type="button"
                className="filter-select"
                onClick={() => setIsEditing(false)}
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* Image of the User */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                className="avatar-ring"
                style={{ width: 110, height: 110 }}
                onClick={() => isEditing && fileInputRef.current?.click()}
              >
                {avatarPreview || profile.photoUrl ? (
                  <img src={avatarPreview || profile.photoUrl} alt="User Avatar" className="avatar-img" />
                ) : (
                  <div className="avatar-placeholder" style={{ fontSize: '2rem', fontWeight: 700 }}>
                    {profile.firstName?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}

                {isEditing && (
                  <div className="avatar-overlay">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
              <span className="avatar-hint" style={{ marginTop: 8 }}>
                {isEditing ? 'Click avatar to change' : `@${profile.username}`}
              </span>
            </div>

            {/* User Details Form / Display */}
            <div style={{ flex: 1, minWidth: '280px' }}>
              {!isEditing ? (
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
                    {profile.firstName} {profile.lastName}
                  </h2>
                  <p style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.875rem', marginBottom: '12px' }}>
                    @{profile.username} • <span style={{ color: 'var(--muted)' }}>{profile.role || 'USER'}</span>
                  </p>

                  <div className="form-grid" style={{ marginBottom: '16px', fontSize: '0.875rem' }}>
                    <div><strong>Email:</strong> {profile.email}</div>
                    <div><strong>Phone:</strong> {profile.phone || 'Not provided'}</div>
                    <div><strong>Location:</strong> {profile.city ? `${profile.city}, ${profile.country || ''}` : 'Not set'}</div>
                    <div><strong>Language:</strong> {profile.language === 'en' ? 'English (EN)' : profile.language}</div>
                  </div>

                  {profile.bio && (
                    <div style={{
                      backgroundColor: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                      fontSize: '0.875rem',
                      color: 'var(--text)',
                      marginTop: '8px'
                    }}>
                      <strong>Bio:</strong> {profile.bio}
                    </div>
                  )}

                  {/* Settings Actions */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="filter-select"
                      onClick={() => setShowPasswordModal(true)}
                    >
                      🔑 Change Password
                    </button>
                    <button
                      type="button"
                      className="filter-select"
                      style={{ color: 'var(--error)', borderColor: 'var(--error-border)', background: 'var(--error-bg)' }}
                      onClick={handleDeleteAccount}
                    >
                      🗑️ Delete Account
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} noValidate>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">First Name</label>
                      <input
                        type="text"
                        value={editForm.firstName}
                        onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Last Name</label>
                      <input
                        type="text"
                        value={editForm.lastName}
                        onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Phone Number</label>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Language Preference</label>
                      <select
                        value={editForm.language}
                        onChange={(e) => setEditForm({ ...editForm, language: e.target.value })}
                        className="form-input"
                      >
                        <option value="en">English (EN)</option>
                        <option value="es">Spanish (ES)</option>
                        <option value="fr">French (FR)</option>
                        <option value="de">German (DE)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">City</label>
                      <input
                        type="text"
                        value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Country</label>
                      <input
                        type="text"
                        value={editForm.country}
                        onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">About / Bio</label>
                    <textarea
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      className="form-textarea"
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button type="button" className="filter-select" onClick={() => setIsEditing(false)}>Cancel</button>
                    <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={savingProfile}>
                      {savingProfile ? 'Saving…' : 'Save Profile Changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* ── SECTION 2: Preplanned Trips (Screen 7 Wireframe) ── */}
        <section style={{ marginBottom: '36px' }}>
          <div className="section-header">
            <h2 className="section-title">Preplanned Trips ({preplannedTrips.length})</h2>
            <Link to="/trips" className="section-link">View all →</Link>
          </div>

          {preplannedTrips.length > 0 ? (
            <div className="card-grid">
              {preplannedTrips.map((trip) => {
                const sDate = new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                return (
                  <div key={trip.id} className="trip-card">
                    <div>
                      <div className="trip-card-title" style={{ fontSize: '1rem', marginBottom: 4 }}>{trip.name}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>📅 Starts: {sDate}</div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                        onClick={() => navigate({ to: `/trips/$tripId`, params: { tripId: trip.id } })}
                      >
                        View Trip
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="empty-state">No preplanned upcoming trips.</div>
          )}
        </section>

        {/* ── SECTION 3: Previous Trips (Screen 7 Wireframe) ── */}
        <section style={{ marginBottom: '36px' }}>
          <div className="section-header">
            <h2 className="section-title">Previous Trips ({previousTrips.length})</h2>
          </div>

          {previousTrips.length > 0 ? (
            <div className="card-grid">
              {previousTrips.map((trip) => {
                const sDate = new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                return (
                  <div key={trip.id} className="trip-card">
                    <div>
                      <div className="trip-card-title" style={{ fontSize: '1rem', marginBottom: 4 }}>{trip.name}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>📅 Traveled: {sDate}</div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        className="filter-select"
                        style={{ padding: '6px 12px', fontSize: '0.75rem', width: '100%' }}
                        onClick={() => navigate({ to: `/trips/$tripId`, params: { tripId: trip.id } })}
                      >
                        View Trip
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="empty-state">No previous trips completed yet.</div>
          )}
        </section>

        {/* ── SECTION 4: Saved Destinations (Feature 12) ── */}
        <section>
          <div className="section-header">
            <h2 className="section-title">Saved Destinations & Bookmarks ({savedDestinations.length})</h2>
          </div>

          {savedDestinations.length > 0 ? (
            <div className="card-grid">
              {savedDestinations.map((dest) => (
                <div key={dest.id} className="destination-card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="destination-name">{dest.city?.name || 'Saved City'}</div>
                      <div className="destination-sub">{dest.city?.country?.name || 'Country'}</div>
                    </div>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '1.1rem' }}
                      onClick={(e) => handleRemoveSavedDestination(dest.cityId || dest.city?.id, e)}
                      title="Remove bookmark"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">You haven&apos;t bookmarked any saved destinations yet.</div>
          )}
        </section>
      </main>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span>Change Account Password</span>
              <button type="button" className="btn-close" onClick={() => setShowPasswordModal(false)}>✕</button>
            </div>

            <form onSubmit={handleChangePassword} noValidate>
              <div className="form-group">
                <label className="form-label">Current Password <span className="required-star">*</span></label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">New Password <span className="required-star">*</span></label>
                <input
                  type="password"
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password <span className="required-star">*</span></label>
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="filter-select" onClick={() => setShowPasswordModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={changingPassword}>
                  {changingPassword ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
