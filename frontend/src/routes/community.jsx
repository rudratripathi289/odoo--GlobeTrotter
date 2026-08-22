import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import useAuthStore from '@/store/authStore'
import api from '@/lib/axios'

export const Route = createFileRoute('/community')({
  component: CommunityPage,
})

function CommunityPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [communityTrips, setCommunityTrips] = useState([])
  const [countries, setCountries] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCountryId, setSelectedCountryId] = useState('')
  const [sortBy, setSortBy] = useState('popular') // 'popular' | 'newest'

  // Copy Trip Modal State
  const [copyingTrip, setCopyingTrip] = useState(null)
  const [newStartDate, setNewStartDate] = useState('')
  const [submittingCopy, setSubmittingCopy] = useState(false)

  // View Details Modal State
  const [viewingTrip, setViewingTrip] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Alerts
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const fetchCommunityTrips = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const params = new URLSearchParams()
      if (searchQuery.trim()) params.append('search', searchQuery.trim())
      if (sortBy) params.append('sort', sortBy)
      if (selectedCountryId) params.append('countryId', selectedCountryId)

      const res = await api.get(`/community/trips?${params.toString()}`)
      setCommunityTrips(res.data?.data || res.data || [])
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to load community trips.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await api.get('/countries')
        setCountries(res.data?.data || res.data || [])
      } catch {
        // continue
      }
    }
    fetchCountries()
  }, [])

  useEffect(() => {
    fetchCommunityTrips()
  }, [selectedCountryId, sortBy])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchCommunityTrips()
  }

  const handleOpenCopyModal = (trip, e) => {
    e.stopPropagation()
    if (!localStorage.getItem('accessToken')) {
      navigate({ to: '/login' })
      return
    }
    setCopyingTrip(trip)
    const today = new Date().toISOString().split('T')[0]
    setNewStartDate(today)
  }

  const handleExecuteCopy = async (e) => {
    e.preventDefault()
    if (!newStartDate) {
      setErrorMsg('Please select a new start date for your copied trip.')
      return
    }

    setSubmittingCopy(true)
    setErrorMsg('')

    try {
      // Generate a unique idempotency key
      const idempotencyKey = `copy-${copyingTrip.id}-${Date.now()}`

      const res = await api.post(
        `/community/trips/${copyingTrip.id}/copy`,
        { newStartDate: new Date(newStartDate).toISOString() },
        { headers: { 'Idempotency-Key': idempotencyKey } }
      )

      const copiedData = res.data?.data || res.data
      const newTripId = copiedData.tripId || copiedData.id

      setSuccessMsg('Trip copied successfully to your account with shifted dates!')
      setCopyingTrip(null)

      if (newTripId) {
        navigate({ to: `/trips/$tripId`, params: { tripId: newTripId } })
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to copy trip.')
    } finally {
      setSubmittingCopy(false)
    }
  }

  const handleViewDetails = async (tripId, e) => {
    e.stopPropagation()
    setLoadingDetails(true)
    try {
      const res = await api.get(`/community/trips/${tripId}`)
      setViewingTrip(res.data?.data || res.data)
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to load public trip details.')
    } finally {
      setLoadingDetails(false)
    }
  }

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
              <li><Link to="/search" className="nav-link">Search</Link></li>
              <li><Link to="/community" className="nav-link active">Community</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="page-container" style={{ flex: 1 }}>
        <div style={{ marginBottom: '16px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Community Tab (Screen 10)</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Explore public itineraries shared by travelers around the world</p>
        </div>

        {/* Alerts */}
        {errorMsg && <div className="alert-error" role="alert" onClick={() => setErrorMsg('')}>{errorMsg}</div>}
        {successMsg && <div className="alert-success" role="alert" onClick={() => setSuccessMsg('')}>{successMsg}</div>}

        {/* Wireframe Info Note Sidebar */}
        <div style={{
          backgroundColor: 'var(--primary-light)',
          border: '1px solid var(--primary)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          fontSize: '0.875rem',
          color: 'var(--primary-dark)',
          marginBottom: '24px'
        }}>
          💡 <strong>Community Explorer:</strong> Discover public itineraries created by fellow travelers. Use the filters to find inspiration, view sanitized day-by-day itineraries, or use <strong>&quot;Copy Trip&quot;</strong> to instantly clone any itinerary into your account with shifted travel dates!
        </div>

        {/* Search & Filter Controls Bar (Screen 10 Wireframe: Search bar, Group by, Filter, Sort by...) */}
        <form onSubmit={handleSearchSubmit} className="search-filter-bar">
          <div className="search-input-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search community trips by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <select
              value={selectedCountryId}
              onChange={(e) => setSelectedCountryId(e.target.value)}
              className="filter-select"
            >
              <option value="">Filter by Country: All</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="popular">Sort by: Most Popular</option>
              <option value="newest">Sort by: Newest</option>
            </select>

            <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '8px 16px' }}>
              Search
            </button>
          </div>
        </form>

        {/* Community Trips List (Screen 10 Wireframe) */}
        <section>
          <div className="section-header">
            <h2 className="section-title">Public Itineraries ({communityTrips.length})</h2>
          </div>

          {loading ? (
            <div className="empty-state">Loading community trips…</div>
          ) : communityTrips.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {communityTrips.map((trip) => {
                const sDate = new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                const eDate = new Date(trip.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                const creatorName = trip.user?.username || trip.user?.firstName || 'Traveler'
                const stopCount = trip.stops?.length || 0

                return (
                  <div key={trip.id} className="timeline-item" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--primary-light)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '1rem',
                          border: '1px solid var(--border)'
                        }}>
                          {trip.user?.photoUrl ? (
                            <img src={trip.user.photoUrl} alt="Creator" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            creatorName[0].toUpperCase()
                          )}
                        </div>

                        <div>
                          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>{trip.name}</h3>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
                            Shared by <strong>@{creatorName}</strong> • 📅 {sDate} – {eDate}
                          </div>
                        </div>
                      </div>

                      <span className="trip-badge badge-ongoing">PUBLIC COMMUNITY TRIP</span>
                    </div>

                    {trip.description && (
                      <p style={{ color: 'var(--text)', fontSize: '0.875rem' }}>{trip.description}</p>
                    )}

                    <div style={{ display: 'flex', gap: '20px', fontSize: '0.8125rem', color: 'var(--muted)', flexWrap: 'wrap' }}>
                      <div>📍 <strong>{stopCount}</strong> {stopCount === 1 ? 'City Stop' : 'City Stops'}</div>
                      {trip.budget && (
                        <div>💰 Est. Budget: <strong>{trip.currency || 'INR'} {Number(trip.budget).toLocaleString()}</strong></div>
                      )}
                      {trip._count?.copies !== undefined && (
                        <div>🔄 Cloned <strong>{trip._count.copies}</strong> times</div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                      <button
                        type="button"
                        className="filter-select"
                        onClick={(e) => handleViewDetails(trip.id, e)}
                      >
                        👁️ View Itinerary
                      </button>

                      <button
                        type="button"
                        className="btn-primary"
                        style={{ width: 'auto', padding: '8px 18px', fontSize: '0.875rem' }}
                        onClick={(e) => handleOpenCopyModal(trip, e)}
                      >
                        📋 Copy Trip to My Account
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="empty-state">No public community trips found.</div>
          )}
        </section>
      </main>

      {/* ── MODAL 1: Copy Trip to My Account ── */}
      {copyingTrip && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span>Copy &quot;{copyingTrip.name}&quot; to My Account</span>
              <button type="button" className="btn-close" onClick={() => setCopyingTrip(null)}>✕</button>
            </div>

            <form onSubmit={handleExecuteCopy} noValidate>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '16px' }}>
                This will clone the entire itinerary, city stops, and scheduled activities into your account. All dates will be automatically shifted based on your new start date.
              </p>

              <div className="form-group">
                <label className="form-label">Select Your New Start Date <span className="required-star">*</span></label>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="filter-select" onClick={() => setCopyingTrip(null)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={submittingCopy}>
                  {submittingCopy ? 'Cloning trip…' : 'Confirm & Copy Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: View Sanitized Itinerary ── */}
      {viewingTrip && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <span>Public Itinerary: {viewingTrip.name}</span>
              <button type="button" className="btn-close" onClick={() => setViewingTrip(null)}>✕</button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{viewingTrip.description || 'Public community trip overview.'}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '60vh', overflowY: 'auto' }}>
              {viewingTrip.stops && viewingTrip.stops.length > 0 ? (
                viewingTrip.stops.map((stop, idx) => (
                  <div key={stop.id} style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
                      Stop {idx + 1}: {stop.city?.name || 'City Stop'}
                    </div>

                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {stop.activities && stop.activities.length > 0 ? (
                        stop.activities.map((act) => (
                          <div key={act.id} style={{ fontSize: '0.8125rem', color: 'var(--text)', paddingLeft: '12px', borderLeft: '2px solid var(--primary)' }}>
                            <strong>{act.customName || act.activity?.name}</strong> {act.estimatedCost && `(Est. ₹${act.estimatedCost})`}
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>No activities listed.</div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">No stops listed in this public itinerary.</div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                className="btn-primary"
                style={{ width: 'auto' }}
                onClick={() => {
                  const t = viewingTrip
                  setViewingTrip(null)
                  setCopyingTrip(t)
                  setNewStartDate(new Date().toISOString().split('T')[0])
                }}
              >
                📋 Copy Trip to My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
