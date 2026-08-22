import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import useAuthStore from '@/store/authStore'
import api from '@/lib/axios'
import { getCityImage } from '@/lib/placeImages'

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
        const tripsRes = await api.get('/trips')
        setTrips(tripsRes.data?.data || tripsRes.data || [])

        try {
          const citiesRes = await api.get('/cities?search=a')
          setCities((citiesRes.data?.data || citiesRes.data || []).slice(0, 8))
        } catch {
          setCities([
            { id: '1', name: 'Paris', country: { name: 'France' }, popularity: 98 },
            { id: '2', name: 'Tokyo', country: { name: 'Japan' }, popularity: 95 },
            { id: '3', name: 'New York', country: { name: 'USA' }, popularity: 92 },
            { id: '4', name: 'Rome', country: { name: 'Italy' }, popularity: 90 },
            { id: '5', name: 'London', country: { name: 'United Kingdom' }, popularity: 89 },
            { id: '6', name: 'Bali', country: { name: 'Indonesia' }, popularity: 88 },
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
    try { await api.post('/auth/logout') } catch { /* stateless fallback */ }
    clearAuth()
    navigate({ to: '/login' })
  }

  const filteredTrips = trips.filter((trip) => {
    const matchesSearch = trip.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.description?.toLowerCase().includes(searchQuery.toLowerCase())
    if (filterBy === 'all') return matchesSearch
    return matchesSearch && trip.visibility === filterBy.toUpperCase()
  })

  if (!user) return null

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <header className="navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-brand">
            <div className="navbar-brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <span>GlobeTrotter</span>
          </Link>

          <nav>
            <ul className="navbar-links">
              <li><Link to="/" className="nav-link active">Home</Link></li>
              <li><Link to="/trips" className="nav-link">My Trips</Link></li>
              <li><Link to="/search" className="nav-link">Explore</Link></li>
              <li><Link to="/community" className="nav-link">Community</Link></li>
              {user.role === 'ADMIN' && (
                <li><Link to="/admin" className="nav-link">Admin</Link></li>
              )}
            </ul>
          </nav>

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="user-avatar-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="User menu"
            >
              {user.photoUrl ? (
                <img src={user.photoUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                user.firstName?.[0]?.toUpperCase() || 'U'
              )}
            </button>

            {menuOpen && (
              <div style={{
                position: 'absolute', top: '44px', right: 0, width: '200px',
                background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
                boxShadow: 'var(--shadow-lg)', padding: '6px 0', zIndex: 100
              }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text)' }}>{user.firstName} {user.lastName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{user.username}</div>
                </div>
                <Link to="/profile" className="nav-link" style={{ display: 'block', padding: '8px 14px', borderRadius: 0, fontSize: '0.8125rem' }} onClick={() => setMenuOpen(false)}>
                  Profile & Settings
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{ width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: '0.8125rem', color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="page-container" style={{ flex: 1 }}>
        {/* Hero */}
        <section className="hero-banner">
          <h1 className="hero-title">Plan Your Next Journey</h1>
          <p className="hero-subtitle">
            Discover global destinations, build day-by-day itineraries, track budgets, and share your plans with the community.
          </p>
          <button type="button" className="btn-primary" style={{ width: 'auto', padding: '10px 22px' }}
            onClick={() => navigate({ to: '/trips/create' })}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Start Planning
          </button>
        </section>

        {/* Search */}
        <section className="search-filter-bar">
          <div className="search-input-wrapper">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" placeholder="Search trips, destinations…" value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
          </div>
          <select value={filterBy} onChange={(e) => setFilterBy(e.target.value)} className="filter-select">
            <option value="all">All Trips</option>
            <option value="private">Private</option>
            <option value="shared">Shared</option>
            <option value="public">Public</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </section>

        {/* Top Destinations */}
        <section style={{ marginBottom: '40px' }}>
          <div className="section-header">
            <h2 className="section-title">Top Destinations</h2>
            <Link to="/search" className="section-link">Explore all →</Link>
          </div>
          <div className="card-grid">
            {cities.length > 0 ? cities.map((city) => (
              <div key={city.id} className="destination-card"
                onClick={() => navigate({ to: '/trips/create', search: { destination: city.name } })}>
                <div className="destination-image-container">
                  <img src={getCityImage(city.name, city.imageUrl)} alt={city.name} className="destination-card-img" loading="lazy" />
                </div>
                <div className="destination-info">
                  <div>
                    <div className="destination-name">{city.name}</div>
                    <div className="destination-sub">{city.country?.name || 'Popular Destination'}</div>
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>
                    Plan a trip here →
                  </div>
                </div>
              </div>
            )) : (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>Loading destinations…</div>
            )}
          </div>
        </section>

        {/* My Trips */}
        <section>
          <div className="section-header">
            <h2 className="section-title">My Trips</h2>
            <Link to="/trips" className="section-link">View all →</Link>
          </div>

          {loading ? (
            <div className="empty-state">Loading your trips…</div>
          ) : filteredTrips.length > 0 ? (
            <div className="card-grid">
              {filteredTrips.map((trip) => {
                const fmt = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                return (
                  <div key={trip.id} className="trip-card" style={{ cursor: 'pointer' }}
                    onClick={() => navigate({ to: `/trips/$tripId`, params: { tripId: trip.id } })}>
                    <div>
                      <div className="trip-card-header">
                        <div className="trip-card-title">{trip.name}</div>
                        <span className={`trip-badge badge-${(trip.status || 'upcoming').toLowerCase()}`}>
                          {trip.visibility || 'PRIVATE'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '6px 0 10px', lineHeight: 1.5 }}>
                        {trip.description || 'No description provided.'}
                      </p>
                      <div className="trip-card-details">
                        <div>📅 {fmt(trip.startDate)} – {fmt(trip.endDate)}</div>
                        {trip.budget && <div>💰 {trip.currency || 'INR'} {Number(trip.budget).toLocaleString()}</div>}
                      </div>
                    </div>
                    <div className="trip-card-footer">
                      <span style={{ fontSize: '0.8125rem', color: 'var(--accent)', fontWeight: 600 }}>View Itinerary →</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="empty-state">
              <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>No trips yet</p>
              <p style={{ marginBottom: '16px' }}>Start planning your first adventure!</p>
              <button type="button" className="btn-primary" style={{ width: 'auto', display: 'inline-flex' }}
                onClick={() => navigate({ to: '/trips/create' })}>
                + Create a Trip
              </button>
            </div>
          )}
        </section>
      </main>

      <button type="button" className="btn-floating-plan" onClick={() => navigate({ to: '/trips/create' })}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Plan a Trip
      </button>
    </div>
  )
}
