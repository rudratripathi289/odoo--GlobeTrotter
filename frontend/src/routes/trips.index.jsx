import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import useAuthStore from '@/store/authStore'
import api from '@/lib/axios'

export const Route = createFileRoute('/trips/')({
  component: MyTripsListingPage,
})

function MyTripsListingPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterVisibility, setFilterVisibility] = useState('ALL')
  const [sortBy, setSortBy] = useState('NEWEST')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [editingTrip, setEditingTrip] = useState(null)
  const [editName, setEditName] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editBudget, setEditBudget] = useState('')
  const [editVisibility, setEditVisibility] = useState('PRIVATE')
  const [editDescription, setEditDescription] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const fetchTrips = async () => {
    setLoading(true)
    try {
      const res = await api.get('/trips')
      setTrips(res.data?.data || res.data || [])
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to load trips.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) { navigate({ to: '/login' }); return }
    fetchTrips()
  }, [navigate])

  const handleDeleteTrip = async (tripId, tripName, e) => {
    e.stopPropagation()
    if (!window.confirm(`Delete "${tripName}"? This cannot be undone.`)) return
    try {
      await api.delete(`/trips/${tripId}`)
      setSuccessMsg(`"${tripName}" deleted.`)
      fetchTrips()
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to delete trip.')
    }
  }

  const openEditModal = (trip, e) => {
    e.stopPropagation()
    setEditingTrip(trip)
    setEditName(trip.name || '')
    setEditStartDate(trip.startDate ? new Date(trip.startDate).toISOString().split('T')[0] : '')
    setEditEndDate(trip.endDate ? new Date(trip.endDate).toISOString().split('T')[0] : '')
    setEditBudget(trip.budget || '')
    setEditVisibility(trip.visibility || 'PRIVATE')
    setEditDescription(trip.description || '')
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editName.trim() || !editStartDate || !editEndDate) {
      setErrorMsg('Name, start date, and end date are required.')
      return
    }
    setSavingEdit(true)
    try {
      await api.patch(`/trips/${editingTrip.id}`, {
        name: editName.trim(),
        startDate: new Date(editStartDate).toISOString(),
        endDate: new Date(editEndDate).toISOString(),
        ...(editBudget ? { budget: parseFloat(editBudget) } : {}),
        visibility: editVisibility,
        description: editDescription.trim(),
      })
      setSuccessMsg('Trip updated!')
      setEditingTrip(null)
      fetchTrips()
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to update trip.')
    } finally {
      setSavingEdit(false)
    }
  }

  const now = new Date()
  const categorizeTrip = (t) => {
    const start = new Date(t.startDate)
    const end = new Date(t.endDate)
    if (now >= start && now <= end) return 'ONGOING'
    if (now < start) return 'UPCOMING'
    return 'COMPLETED'
  }

  const processedTrips = trips
    .filter((t) => {
      const matchesSearch = t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesVisibility = filterVisibility === 'ALL' || t.visibility === filterVisibility
      return matchesSearch && matchesVisibility
    })
    .sort((a, b) => {
      if (sortBy === 'NEWEST') return new Date(b.createdAt || b.startDate) - new Date(a.createdAt || a.startDate)
      if (sortBy === 'OLDEST') return new Date(a.createdAt || a.startDate) - new Date(b.createdAt || b.startDate)
      if (sortBy === 'NAME') return a.name.localeCompare(b.name)
      return 0
    })

  const ongoingTrips = processedTrips.filter((t) => categorizeTrip(t) === 'ONGOING')
  const upcomingTrips = processedTrips.filter((t) => categorizeTrip(t) === 'UPCOMING')
  const completedTrips = processedTrips.filter((t) => categorizeTrip(t) === 'COMPLETED')

  if (!user) return null

  const fmt = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  const renderTripCard = (trip) => (
    <div key={trip.id} className="trip-card" style={{ cursor: 'pointer' }}
      onClick={() => navigate({ to: `/trips/$tripId`, params: { tripId: trip.id } })}>
      <div>
        <div className="trip-card-header">
          <div className="trip-card-title">{trip.name}</div>
          <span className={`trip-badge badge-${categorizeTrip(trip).toLowerCase()}`}>
            {trip.visibility || 'PRIVATE'}
          </span>
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '6px 0 10px', lineHeight: 1.5 }}>
          {trip.description || 'No description provided.'}
        </p>
        <div className="trip-card-details">
          <div>📅 {fmt(trip.startDate)} – {fmt(trip.endDate)}</div>
          <div>📍 {trip.stops?.length || 0} stops</div>
          {trip.budget && <div>💰 {trip.currency || 'INR'} {Number(trip.budget).toLocaleString()}</div>}
        </div>
      </div>
      <div className="trip-card-footer" onClick={(e) => e.stopPropagation()}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--accent)', fontWeight: 600 }}>View →</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            onClick={(e) => openEditModal(trip, e)}>Edit</button>
          <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem', color: 'var(--error)' }}
            onClick={(e) => handleDeleteTrip(trip.id, trip.name, e)}>Delete</button>
        </div>
      </div>
    </div>
  )

  const renderSection = (title, emoji, trips, color) => {
    if (trips.length === 0) return null
    return (
      <section style={{ marginBottom: '28px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: color || 'var(--text)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: 6 }}>
          {emoji} {title} ({trips.length})
        </h3>
        <div className="card-grid">{trips.map(renderTripCard)}</div>
      </section>
    )
  }

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
              <li><Link to="/trips" className="nav-link active">My Trips</Link></li>
              <li><Link to="/search" className="nav-link">Explore</Link></li>
              <li><Link to="/community" className="nav-link">Community</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      <main className="page-container" style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>My Trips</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Manage ongoing, upcoming, and completed itineraries</p>
          </div>
          <button type="button" className="btn-primary" style={{ width: 'auto', padding: '8px 18px' }}
            onClick={() => navigate({ to: '/trips/create' })}>+ New Trip</button>
        </div>

        {errorMsg && <div className="alert-error" role="alert" onClick={() => setErrorMsg('')}>{errorMsg}</div>}
        {successMsg && <div className="alert-success" role="alert" onClick={() => setSuccessMsg('')}>{successMsg}</div>}

        <div className="search-filter-bar">
          <div className="search-input-wrapper">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" placeholder="Search trips…" value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
          </div>
          <select value={filterVisibility} onChange={(e) => setFilterVisibility(e.target.value)} className="filter-select">
            <option value="ALL">All</option>
            <option value="PRIVATE">Private</option>
            <option value="SHARED">Shared</option>
            <option value="PUBLIC">Public</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
            <option value="NEWEST">Newest</option>
            <option value="OLDEST">Oldest</option>
            <option value="NAME">A-Z</option>
          </select>
        </div>

        {loading ? (
          <div className="empty-state">Loading trips…</div>
        ) : processedTrips.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>No trips found</p>
            <p style={{ marginBottom: '14px' }}>Create your first trip to get started.</p>
            <button type="button" className="btn-primary" style={{ width: 'auto', display: 'inline-flex' }}
              onClick={() => navigate({ to: '/trips/create' })}>+ Create Trip</button>
          </div>
        ) : (
          <div>
            {renderSection('Ongoing', '🟢', ongoingTrips, 'var(--success)')}
            {renderSection('Upcoming', '📅', upcomingTrips)}
            {renderSection('Completed', '✓', completedTrips, 'var(--text-muted)')}
          </div>
        )}
      </main>

      {editingTrip && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span>Edit Trip</span>
              <button type="button" className="btn-close" onClick={() => setEditingTrip(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveEdit} noValidate>
              <div className="form-group">
                <label className="form-label">Trip Name <span className="required-star">*</span></label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="form-input" />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Start Date <span className="required-star">*</span></label>
                  <input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date <span className="required-star">*</span></label>
                  <input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} className="form-input" />
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Budget</label>
                  <input type="number" value={editBudget} onChange={(e) => setEditBudget(e.target.value)} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Visibility</label>
                  <select value={editVisibility} onChange={(e) => setEditVisibility(e.target.value)} className="form-input">
                    <option value="PRIVATE">Private</option>
                    <option value="SHARED">Shared</option>
                    <option value="PUBLIC">Public</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="form-textarea" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setEditingTrip(null)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={savingEdit}>
                  {savingEdit ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
