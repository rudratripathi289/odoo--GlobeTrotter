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

  // Edit Modal State
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
    if (!localStorage.getItem('accessToken')) {
      navigate({ to: '/login' })
      return
    }
    fetchTrips()
  }, [navigate])

  const handleDeleteTrip = async (tripId, tripName, e) => {
    e.stopPropagation()
    if (!window.confirm(`Are you sure you want to delete "${tripName}"?`)) return
    try {
      await api.delete(`/trips/${tripId}`)
      setSuccessMsg(`Trip "${tripName}" deleted.`)
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
      setSuccessMsg('Trip updated successfully!')
      setEditingTrip(null)
      fetchTrips()
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to update trip.')
    } finally {
      setSavingEdit(false)
    }
  }

  // Helper to determine status category (Ongoing, Upcoming, Completed)
  const now = new Date()
  const categorizeTrip = (t) => {
    const start = new Date(t.startDate)
    const end = new Date(t.endDate)
    if (now >= start && now <= end) return 'ONGOING'
    if (now < start) return 'UPCOMING'
    return 'COMPLETED'
  }

  // Filter & Search Logic
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

  const renderTripCard = (trip) => {
    const sDate = new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    const eDate = new Date(trip.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    const stopCount = trip.stops?.length || 0

    return (
      <div
        key={trip.id}
        className="trip-card"
        onClick={() => navigate({ to: `/trips/$tripId`, params: { tripId: trip.id } })}
        style={{ cursor: 'pointer' }}
      >
        <div>
          <div className="trip-card-header">
            <div className="trip-card-title">{trip.name}</div>
            <span className={`trip-badge badge-${categorizeTrip(trip).toLowerCase()}`}>
              {trip.visibility || 'PRIVATE'}
            </span>
          </div>

          <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: '8px 0 12px' }}>
            {trip.description || 'No description provided.'}
          </p>

          <div className="trip-card-details">
            <div>📅 {sDate} – {eDate}</div>
            <div>📍 {stopCount} {stopCount === 1 ? 'City Stop' : 'City Stops'}</div>
            {trip.budget && (
              <div>💰 Budget: {trip.currency || 'INR'} {Number(trip.budget).toLocaleString()}</div>
            )}
          </div>
        </div>

        <div className="trip-card-footer" onClick={(e) => e.stopPropagation()}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 600 }}>
            View Itinerary →
          </span>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="filter-select"
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              onClick={(e) => openEditModal(trip, e)}
            >
              ✏️ Edit
            </button>
            <button
              type="button"
              className="filter-select"
              style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--error)' }}
              onClick={(e) => handleDeleteTrip(trip.id, trip.name, e)}
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>
    )
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
              <li><Link to="/trips" className="nav-link active">My Trips</Link></li>
              <li><Link to="/community" className="nav-link">Community</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="page-container" style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>My Trips (Screen 6)</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Manage all your ongoing, upcoming, and completed itineraries</p>
          </div>

          <button
            type="button"
            className="btn-primary"
            style={{ width: 'auto', padding: '10px 20px' }}
            onClick={() => navigate({ to: '/trips/create' })}
          >
            + Plan a New Trip
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && <div className="alert-error" role="alert" onClick={() => setErrorMsg('')}>{errorMsg}</div>}
        {successMsg && <div className="alert-success" role="alert" onClick={() => setSuccessMsg('')}>{successMsg}</div>}

        {/* Top Controls Bar (Screen 6 Wireframe: Search bar, Group by, Filter, Sort by...) */}
        <div className="search-filter-bar">
          <div className="search-input-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search bar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <select
              value={filterVisibility}
              onChange={(e) => setFilterVisibility(e.target.value)}
              className="filter-select"
            >
              <option value="ALL">Filter: All Visibility</option>
              <option value="PRIVATE">Filter: Private Only</option>
              <option value="SHARED">Filter: Shared Only</option>
              <option value="PUBLIC">Filter: Public Only</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="NEWEST">Sort by: Newest</option>
              <option value="OLDEST">Sort by: Oldest</option>
              <option value="NAME">Sort by: Name (A-Z)</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Loading your trips…</div>
        ) : processedTrips.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '6px' }}>No trips found</p>
            <p style={{ marginBottom: '16px' }}>You haven&apos;t created any trips matching your criteria yet.</p>
            <button
              type="button"
              className="btn-primary"
              style={{ width: 'auto', display: 'inline-flex' }}
              onClick={() => navigate({ to: '/trips/create' })}
            >
              + Create Your First Trip
            </button>
          </div>
        ) : (
          <div>
            {/* Ongoing Section (Screen 6) */}
            {ongoingTrips.length > 0 && (
              <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  🟢 Ongoing Trips ({ongoingTrips.length})
                </h2>
                <div className="card-grid">
                  {ongoingTrips.map(renderTripCard)}
                </div>
              </section>
            )}

            {/* Up-coming Section (Screen 6) */}
            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                📅 Up-coming Trips ({upcomingTrips.length})
              </h2>
              {upcomingTrips.length > 0 ? (
                <div className="card-grid">
                  {upcomingTrips.map(renderTripCard)}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '24px' }}>No upcoming trips scheduled.</div>
              )}
            </section>

            {/* Completed Section (Screen 6) */}
            {completedTrips.length > 0 && (
              <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  ✅ Completed Trips ({completedTrips.length})
                </h2>
                <div className="card-grid">
                  {completedTrips.map(renderTripCard)}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Edit Trip Modal */}
      {editingTrip && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span>Edit Trip Details</span>
              <button type="button" className="btn-close" onClick={() => setEditingTrip(null)}>✕</button>
            </div>

            <form onSubmit={handleSaveEdit} noValidate>
              <div className="form-group">
                <label className="form-label">Trip Title <span className="required-star">*</span></label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Start Date <span className="required-star">*</span></label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">End Date <span className="required-star">*</span></label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Budget</label>
                  <input
                    type="number"
                    value={editBudget}
                    onChange={(e) => setEditBudget(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Visibility</label>
                  <select
                    value={editVisibility}
                    onChange={(e) => setEditVisibility(e.target.value)}
                    className="form-input"
                  >
                    <option value="PRIVATE">Private</option>
                    <option value="SHARED">Shared</option>
                    <option value="PUBLIC">Public</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="filter-select" onClick={() => setEditingTrip(null)}>Cancel</button>
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
