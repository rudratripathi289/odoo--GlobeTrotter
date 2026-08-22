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
  const [sortBy, setSortBy] = useState('popular')

  const [copyingTrip, setCopyingTrip] = useState(null)
  const [newStartDate, setNewStartDate] = useState('')
  const [submittingCopy, setSubmittingCopy] = useState(false)
  const [viewingTrip, setViewingTrip] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
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
      } catch { /* continue */ }
    }
    fetchCountries()
  }, [])

  useEffect(() => { fetchCommunityTrips() }, [selectedCountryId, sortBy])

  const handleSearchSubmit = (e) => { e.preventDefault(); fetchCommunityTrips() }

  const handleOpenCopyModal = (trip, e) => {
    e.stopPropagation()
    if (!localStorage.getItem('accessToken')) { navigate({ to: '/login' }); return }
    setCopyingTrip(trip)
    setNewStartDate(new Date().toISOString().split('T')[0])
  }

  const handleExecuteCopy = async (e) => {
    e.preventDefault()
    if (!newStartDate) { setErrorMsg('Please select a start date.'); return }
    setSubmittingCopy(true); setErrorMsg('')
    try {
      const res = await api.post(`/community/trips/${copyingTrip.id}/copy`,
        { newStartDate: new Date(newStartDate).toISOString() },
        { headers: { 'Idempotency-Key': `copy-${copyingTrip.id}-${Date.now()}` } }
      )
      const copiedData = res.data?.data || res.data
      const newTripId = copiedData.tripId || copiedData.id
      setSuccessMsg('Trip copied successfully!')
      setCopyingTrip(null)
      if (newTripId) navigate({ to: `/trips/$tripId`, params: { tripId: newTripId } })
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
      setErrorMsg(err.response?.data?.error?.message || 'Failed to load trip details.')
    } finally {
      setLoadingDetails(false)
    }
  }

  const fmt = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-brand">
            <div className="navbar-brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <span>GlobeTrotter</span>
          </Link>
          <nav>
            <ul className="navbar-links">
              <li><Link to="/" className="nav-link">Home</Link></li>
              <li><Link to="/trips" className="nav-link">My Trips</Link></li>
              <li><Link to="/search" className="nav-link">Explore</Link></li>
              <li><Link to="/community" className="nav-link active">Community</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      <main className="page-container" style={{ flex: 1 }}>
        <div style={{ marginBottom: '16px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Community</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Explore public itineraries shared by travelers worldwide</p>
        </div>

        {errorMsg && <div className="alert-error" role="alert" onClick={() => setErrorMsg('')}>{errorMsg}</div>}
        {successMsg && <div className="alert-success" role="alert" onClick={() => setSuccessMsg('')}>{successMsg}</div>}

        <div className="alert-info">
          💡 Discover public itineraries, view day-by-day plans, or <strong>copy any trip</strong> into your account with shifted dates.
        </div>

        <form onSubmit={handleSearchSubmit} className="search-filter-bar">
          <div className="search-input-wrapper">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" placeholder="Search community trips…" value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
          </div>
          <select value={selectedCountryId} onChange={(e) => setSelectedCountryId(e.target.value)} className="filter-select">
            <option value="">All Countries</option>
            {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
            <option value="popular">Popular</option>
            <option value="newest">Newest</option>
          </select>
          <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '8px 16px' }}>Search</button>
        </form>

        <section>
          <div className="section-header">
            <h2 className="section-title">Public Itineraries ({communityTrips.length})</h2>
          </div>

          {loading ? (
            <div className="empty-state">Loading community trips…</div>
          ) : communityTrips.length > 0 ? (
            <div className="card-grid">
              {communityTrips.map((trip) => {
                const creatorName = trip.user?.username || trip.user?.firstName || 'Traveler'
                const stopCount = trip.stops?.length || 0
                return (
                  <div key={trip.id} className="trip-card">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: 'var(--accent-subtle)', color: 'var(--accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '0.8125rem', border: '1px solid var(--border)', flexShrink: 0
                        }}>
                          {trip.user?.photoUrl ? (
                            <img src={trip.user.photoUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                          ) : creatorName[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="trip-card-title" style={{ fontSize: '1rem' }}>{trip.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>by @{creatorName}</div>
                        </div>
                        <span className="trip-badge badge-ongoing">PUBLIC</span>
                      </div>

                      {trip.description && (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '10px' }}>
                          {trip.description.length > 120 ? trip.description.slice(0, 120) + '…' : trip.description}
                        </p>
                      )}

                      <div className="trip-card-details">
                        <div>📅 {fmt(trip.startDate)} – {fmt(trip.endDate)}</div>
                        <div>📍 {stopCount} {stopCount === 1 ? 'stop' : 'stops'}</div>
                        {trip.budget && <div>💰 {trip.currency || 'INR'} {Number(trip.budget).toLocaleString()}</div>}
                      </div>
                    </div>

                    <div className="trip-card-footer">
                      <button type="button" className="btn-secondary" style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                        onClick={(e) => handleViewDetails(trip.id, e)}>View</button>
                      <button type="button" className="btn-primary" style={{ width: 'auto', padding: '5px 12px', fontSize: '0.75rem' }}
                        onClick={(e) => handleOpenCopyModal(trip, e)}>Copy Trip</button>
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

      {/* Copy Modal */}
      {copyingTrip && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span>Copy "{copyingTrip.name}"</span>
              <button type="button" className="btn-close" onClick={() => setCopyingTrip(null)}>✕</button>
            </div>
            <form onSubmit={handleExecuteCopy} noValidate>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                This will clone the itinerary and all stops into your account. Dates will be shifted based on your new start date.
              </p>
              <div className="form-group">
                <label className="form-label">New Start Date <span className="required-star">*</span></label>
                <input type="date" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} className="form-input" />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn-secondary" onClick={() => setCopyingTrip(null)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={submittingCopy}>
                  {submittingCopy ? 'Copying…' : 'Confirm Copy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingTrip && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <span>{viewingTrip.name}</span>
              <button type="button" className="btn-close" onClick={() => setViewingTrip(null)}>✕</button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '14px' }}>
              {viewingTrip.description || 'Public community trip.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '55vh', overflowY: 'auto' }}>
              {viewingTrip.stops?.length > 0 ? viewingTrip.stops.map((stop, idx) => (
                <div key={stop.id} style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '14px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text)' }}>
                    Stop {idx + 1}: {stop.city?.name || 'City'}
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {stop.activities?.length > 0 ? stop.activities.map((act) => (
                      <div key={act.id} style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', paddingLeft: '10px', borderLeft: '2px solid var(--accent)' }}>
                        <strong>{act.customName || act.activity?.name}</strong>
                        {act.estimatedCost && ` · ₹${act.estimatedCost}`}
                      </div>
                    )) : <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No activities listed.</div>}
                  </div>
                </div>
              )) : <div className="empty-state">No stops in this itinerary.</div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" className="btn-primary" style={{ width: 'auto' }} onClick={() => {
                const t = viewingTrip; setViewingTrip(null)
                setCopyingTrip(t); setNewStartDate(new Date().toISOString().split('T')[0])
              }}>Copy Trip</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
