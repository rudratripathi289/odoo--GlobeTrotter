import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import useAuthStore from '@/store/authStore'
import api from '@/lib/axios'

export const Route = createFileRoute('/')({
  component: MainLandingPage,
})

function MainLandingPage() {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()

  const [trips, setTrips] = useState([])
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [groupBy, setGroupBy] = useState('none')
  const [filterBy, setFilterBy] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) {
      navigate({ to: '/login' })
      return
    }

    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch user trips
        const tripsRes = await api.get('/trips')
        setTrips(tripsRes.data?.data || tripsRes.data || [])

        // Fetch top regional selections / popular cities
        try {
          const citiesRes = await api.get('/cities?search=a')
          setCities((citiesRes.data?.data || citiesRes.data || []).slice(0, 6))
        } catch {
          // Fallback static cities if query requires specific filter
          setCities([
            { id: '1', name: 'Paris', country: { name: 'France' }, popularity: 98 },
            { id: '2', name: 'Tokyo', country: { name: 'Japan' }, popularity: 95 },
            { id: '3', name: 'New York', country: { name: 'USA' }, popularity: 92 },
            { id: '4', name: 'Rome', country: { name: 'Italy' }, popularity: 90 },
          ])
        }
      } catch (err) {
        console.error('Error fetching landing page data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [navigate])

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Stateless fallback
    } finally {
      clearAuth()
      navigate({ to: '/login' })
    }
  }

  // Filter & Search logic for trips
  const filteredTrips = trips.filter((trip) => {
    const matchesSearch = trip.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.description?.toLowerCase().includes(searchQuery.toLowerCase())
    if (filterBy === 'all') return matchesSearch
    return matchesSearch && trip.visibility === filterBy.toUpperCase()
  })

  if (!user) return null

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── Navbar ── */}
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
              <li>
                <Link to="/" className="nav-link active">Home</Link>
              </li>
              <li>
                <Link to="/trips" className="nav-link">My Trips</Link>
              </li>
              <li>
                <Link to="/community" className="nav-link">Community</Link>
              </li>
              {user.role === 'ADMIN' && (
                <li>
                  <Link to="/admin" className="nav-link" style={{ color: 'var(--primary)', fontWeight: 600 }}>Admin Panel</Link>
                </li>
              )}
            </ul>
          </nav>

          <div className="user-profile-menu" style={{ position: 'relative' }}>
            <button
              type="button"
              className="user-avatar-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="User menu"
            >
              {user.photoUrl ? (
                <img src={user.photoUrl} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                user.firstName?.[0]?.toUpperCase() || 'U'
              )}
            </button>

            {menuOpen && (
              <div style={{
                position: 'absolute',
                top: '48px',
                right: 0,
                width: '200px',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                padding: '8px 0',
                zIndex: 100
              }}>
                <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user.firstName} {user.lastName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>@{user.username}</div>
                </div>
                <Link
                  to="/profile"
                  className="nav-link"
                  style={{ display: 'block', padding: '8px 16px', color: 'var(--text)', borderRadius: 0 }}
                  onClick={() => setMenuOpen(false)}
                >
                  My Profile
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 16px',
                    fontSize: '0.875rem',
                    color: 'var(--error)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main className="page-container" style={{ flex: 1 }}>
        {/* Banner Image (Screen 3) */}
        <section className="hero-banner">
          <div className="hero-content">
            <h1 className="hero-title">Plan Your Next Journey With Confidence</h1>
            <p className="hero-subtitle">
              Discover amazing destinations, schedule day-by-day itineraries, track expenses, and explore community trip guides.
            </p>
            <button
              type="button"
              className="btn-primary"
              style={{ width: 'auto', padding: '12px 24px', fontSize: '0.9375rem' }}
              onClick={() => navigate({ to: '/trips/create' })}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Start Planning a Trip
            </button>
          </div>
        </section>

        {/* Global Search Bar (with Group by, Filter, Sort by...) */}
        <section className="search-filter-bar">
          <div className="search-input-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search destinations, trips, activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="filter-select"
            >
              <option value="none">Group by: None</option>
              <option value="status">Group by: Status</option>
              <option value="visibility">Group by: Visibility</option>
            </select>

            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="filter-select"
            >
              <option value="all">Filter: All Trips</option>
              <option value="private">Filter: Private Only</option>
              <option value="shared">Filter: Shared Only</option>
              <option value="public">Filter: Public Only</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="newest">Sort by: Newest First</option>
              <option value="oldest">Sort by: Oldest First</option>
              <option value="name">Sort by: Name (A-Z)</option>
            </select>
          </div>
        </section>

        {/* Top Regional Selections Section */}
        <section style={{ marginBottom: '40px' }}>
          <div className="section-header">
            <h2 className="section-title">Top Regional Selections</h2>
            <Link to="/community" className="section-link">Explore all places →</Link>
          </div>

          <div className="card-grid">
            {cities.length > 0 ? (
              cities.map((city) => (
                <div
                  key={city.id}
                  className="destination-card"
                  onClick={() => navigate({ to: '/trips/create', search: { destination: city.name } })}
                >
                  <div className="destination-image-placeholder">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <div className="destination-info">
                    <div className="destination-name">{city.name}</div>
                    <div className="destination-sub">{city.country?.name || 'Popular Destination'}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                Loading top regional selections…
              </div>
            )}
          </div>
        </section>

        {/* Previous / My Trips Section */}
        <section>
          <div className="section-header">
            <h2 className="section-title">My Trips</h2>
            <Link to="/trips" className="section-link">View all my trips →</Link>
          </div>

          {loading ? (
            <div className="empty-state">Loading your trips…</div>
          ) : filteredTrips.length > 0 ? (
            <div className="card-grid">
              {filteredTrips.map((trip) => {
                const startDateStr = new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                const endDateStr = new Date(trip.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
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
                        <span className={`trip-badge badge-${(trip.status || 'upcoming').toLowerCase()}`}>
                          {trip.visibility || 'PRIVATE'}
                        </span>
                      </div>

                      <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: '8px 0 12px' }}>
                        {trip.description || 'No description provided.'}
                      </p>

                      <div className="trip-card-details">
                        <div>📅 {startDateStr} – {endDateStr}</div>
                        {trip.budget && (
                          <div>💰 Budget: {trip.currency || 'INR'} {Number(trip.budget).toLocaleString()}</div>
                        )}
                      </div>
                    </div>

                    <div className="trip-card-footer">
                      <span style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWait: 600 }}>
                        View Itinerary →
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="empty-state">
              <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>No trips found</p>
              <p style={{ marginBottom: '16px' }}>You haven&apos;t created any trips yet. Start planning your first getaway now!</p>
              <button
                type="button"
                className="btn-primary"
                style={{ width: 'auto', display: 'inline-flex', padding: '8px 16px' }}
                onClick={() => navigate({ to: '/trips/create' })}
              >
                + Plan a trip
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Floating "+ Plan a trip" Action Button (Screen 3) */}
      <button
        type="button"
        className="btn-floating-plan"
        onClick={() => navigate({ to: '/trips/create' })}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Plan a trip
      </button>
    </div>
  )
}
