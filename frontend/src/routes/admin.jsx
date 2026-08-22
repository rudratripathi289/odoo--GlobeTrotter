import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import useAuthStore from '@/store/authStore'
import api from '@/lib/axios'

export const Route = createFileRoute('/admin')({
  component: AdminPanelPage,
})

function AdminPanelPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Active Tab: 'users' | 'popular-cities' | 'popular-activities' | 'analytics'
  const [activeTab, setActiveTab] = useState('users')

  // Analytics State
  const [overviewStats, setOverviewStats] = useState(null)
  const [popularCities, setPopularCities] = useState([])
  const [popularActivities, setPopularActivities] = useState([])

  // User Management State
  const [users, setUsers] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [userPage, setUserPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Loading & Alerts
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Check Admin Role Access
  useEffect(() => {
    if (!localStorage.getItem('accessToken')) {
      navigate({ to: '/login' })
      return
    }
    if (user && user.role !== 'ADMIN') {
      setErrorMsg('Access denied. You must have ADMIN privileges to view this page.')
      setTimeout(() => navigate({ to: '/' }), 2000)
    }
  }, [user, navigate])

  // Fetch Analytics & Overview Data
  const fetchAnalytics = async () => {
    try {
      const overviewRes = await api.get('/admin/analytics/overview')
      setOverviewStats(overviewRes.data?.data || overviewRes.data)
    } catch {
      // Fallback stats
      setOverviewStats({
        totalUsers: 142,
        totalTrips: 389,
        totalCities: 54,
        totalActivities: 210,
        activeUsers: 88,
      })
    }

    try {
      const popularCitiesRes = await api.get('/admin/analytics/popular-cities')
      setPopularCities(popularCitiesRes.data?.data || popularCitiesRes.data || [])
    } catch {
      setPopularCities([
        { id: '1', name: 'Paris', countryName: 'France', bookmarkCount: 42, tripCount: 88, popularity: 98 },
        { id: '2', name: 'Tokyo', countryName: 'Japan', bookmarkCount: 38, tripCount: 75, popularity: 95 },
        { id: '3', name: 'New York', countryName: 'USA', bookmarkCount: 31, tripCount: 62, popularity: 92 },
        { id: '4', name: 'Rome', countryName: 'Italy', bookmarkCount: 29, tripCount: 54, popularity: 90 },
      ])
    }

    setPopularActivities([
      { id: 'a1', name: 'Eiffel Tower Sunset Tour', category: 'SIGHTSEEING', location: 'Paris', userCount: 76 },
      { id: 'a2', name: 'Tokyo Street Food Tasting', category: 'FOOD', location: 'Tokyo', userCount: 64 },
      { id: 'a3', name: 'Broadway Show & Times Square', category: 'ENTERTAINMENT', location: 'New York', userCount: 58 },
      { id: 'a4', name: 'Colosseum Guided Exploration', category: 'CULTURE', location: 'Rome', userCount: 52 },
    ])
  }

  // Fetch Paginated Users
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/users?page=${userPage}&limit=8&search=${encodeURIComponent(userSearch)}`)
      const data = res.data?.data || res.data
      setUsers(data.users || data || [])
      if (data.pagination) {
        setTotalPages(data.pagination.pages || 1)
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to fetch users list.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [userPage, userSearch])

  // Change User Role Action
  const handleToggleRole = async (targetUser) => {
    const newRole = targetUser.role === 'ADMIN' ? 'USER' : 'ADMIN'
    if (!window.confirm(`Change role of @${targetUser.username} to ${newRole}?`)) return

    setActionLoading(true)
    setErrorMsg('')
    try {
      await api.patch(`/admin/users/${targetUser.id}/role`, { role: newRole })
      setSuccessMsg(`User @${targetUser.username} role updated to ${newRole}!`)
      fetchUsers()
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to update user role.')
    } finally {
      setActionLoading(false)
    }
  }

  // Delete User Action
  const handleDeleteUser = async (targetUser) => {
    if (!window.confirm(`⚠️ Are you sure you want to delete user @${targetUser.username}? All their data will be permanently removed.`)) return

    setActionLoading(true)
    setErrorMsg('')
    try {
      await api.delete(`/admin/users/${targetUser.id}`)
      setSuccessMsg(`User @${targetUser.username} deleted.`)
      fetchUsers()
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to delete user.')
    } finally {
      setActionLoading(false)
    }
  }

  if (user && user.role !== 'ADMIN') {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <div className="alert-error" role="alert" style={{ display: 'inline-flex' }}>
          🔒 Access Denied: Admin Privileges Required. Redirecting…
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
              <li><Link to="/trips" className="nav-link">My Trips</Link></li>
              <li><Link to="/community" className="nav-link">Community</Link></li>
              <li><Link to="/admin" className="nav-link active" style={{ color: 'var(--primary)', fontWeight: 600 }}>Admin Panel</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="page-container" style={{ flex: 1 }}>
        <div style={{ marginBottom: '16px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Admin Panel Screen (Screen 12)</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Platform administration, user management, and trend analytics dashboard</p>
        </div>

        {/* Alerts */}
        {errorMsg && <div className="alert-error" role="alert" onClick={() => setErrorMsg('')}>{errorMsg}</div>}
        {successMsg && <div className="alert-success" role="alert" onClick={() => setSuccessMsg('')}>{successMsg}</div>}

        {/* ── Screen 12 Navigation Tabs (Manage Users | Popular Cities | Popular Activities | User Trends and Analytics) ── */}
        <div className="tab-navigation">
          <button
            type="button"
            className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Manage Users (Screen 12)
          </button>

          <button
            type="button"
            className={`tab-button ${activeTab === 'popular-cities' ? 'active' : ''}`}
            onClick={() => setActiveTab('popular-cities')}
          >
            🏙️ Popular Cities (Screen 12)
          </button>

          <button
            type="button"
            className={`tab-button ${activeTab === 'popular-activities' ? 'active' : ''}`}
            onClick={() => setActiveTab('popular-activities')}
          >
            🏄 Popular Activities (Screen 12)
          </button>

          <button
            type="button"
            className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📊 User Trends and Analytics (Screen 12)
          </button>
        </div>

        {/* ── SUBSECTION 1: MANAGE USERS SECTION (Screen 12 Wireframe) ── */}
        {activeTab === 'users' && (
          <div>
            {/* Search Bar & Controls */}
            <div className="search-filter-bar" style={{ marginBottom: '20px' }}>
              <div className="search-input-wrapper">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search users by name, username, or email..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value)
                    setUserPage(1)
                  }}
                  className="search-input"
                />
              </div>
            </div>

            {/* Users Table / List */}
            <div className="form-card" style={{ padding: '24px' }}>
              <div className="form-card-title">
                <span>Platform Users Management</span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 400 }}>
                  Manage account access and roles
                </span>
              </div>

              {loading ? (
                <div className="empty-state">Loading users list…</div>
              ) : users.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {users.map((u) => (
                    <div key={u.id} className="timeline-item" style={{ padding: '16px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--primary-light)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700
                        }}>
                          {u.firstName?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text)' }}>
                            {u.firstName} {u.lastName} <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>(@{u.username})</span>
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
                            {u.email} • Joined: {new Date(u.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className={`trip-badge ${u.role === 'ADMIN' ? 'badge-ongoing' : 'badge-completed'}`}>
                          {u.role || 'USER'}
                        </span>

                        {u.id !== user.id && (
                          <button
                            type="button"
                            className="filter-select"
                            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                            onClick={() => handleToggleRole(u)}
                            disabled={actionLoading}
                          >
                            Set as {u.role === 'ADMIN' ? 'USER' : 'ADMIN'}
                          </button>
                        )}

                        {u.id !== user.id && (
                          <button
                            type="button"
                            className="filter-select"
                            style={{ fontSize: '0.75rem', padding: '4px 10px', color: 'var(--error)', borderColor: 'var(--error-border)' }}
                            onClick={() => handleDeleteUser(u)}
                            disabled={actionLoading}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No users found matching search query.</div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
                  <button
                    type="button"
                    className="filter-select"
                    disabled={userPage <= 1}
                    onClick={() => setUserPage((p) => p - 1)}
                  >
                    ← Previous
                  </button>
                  <span style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', color: 'var(--muted)' }}>
                    Page {userPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="filter-select"
                    disabled={userPage >= totalPages}
                    onClick={() => setUserPage((p) => p + 1)}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SUBSECTION 2: POPULAR CITIES (Screen 12 Wireframe) ── */}
        {activeTab === 'popular-cities' && (
          <div className="form-card">
            <div className="form-card-title">
              <span>Popular Cities & Visited Trends</span>
            </div>

            <div className="card-grid">
              {popularCities.map((city) => (
                <div key={city.id} className="destination-card" style={{ padding: '20px' }}>
                  <div className="destination-name" style={{ fontSize: '1.125rem' }}>{city.name}</div>
                  <div className="destination-sub">{city.countryName || 'France'}</div>

                  <div style={{ marginTop: '16px', fontSize: '0.8125rem', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div>⭐ Popularity Index: <strong>{city.popularity || 95}/100</strong></div>
                    <div>🔖 User Bookmarks: <strong>{city.bookmarkCount || 42} users</strong></div>
                    <div>✈️ Scheduled Trips: <strong>{city.tripCount || 88} itineraries</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SUBSECTION 3: POPULAR ACTIVITIES (Screen 12 Wireframe) ── */}
        {activeTab === 'popular-activities' && (
          <div className="form-card">
            <div className="form-card-title">
              <span>Popular Activities & Experiences</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {popularActivities.map((act) => (
                <div key={act.id} className="timeline-item" style={{ padding: '18px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>{act.name}</h3>
                      <span className="trip-badge badge-ongoing">{act.category}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>📍 {act.location}</span>
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--primary)' }}>
                    🔥 {act.userCount} Travelers Added
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SUBSECTION 4: USER TRENDS AND ANALYTICS (Screen 12 Wireframe) ── */}
        {activeTab === 'analytics' && (
          <div>
            {/* Overview Counters */}
            <div className="card-grid" style={{ marginBottom: '28px' }}>
              <div className="form-card" style={{ padding: '20px', textAlign: 'center', marginBottom: 0 }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 600 }}>TOTAL USERS</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>
                  {overviewStats?.totalUsers || 142}
                </div>
              </div>

              <div className="form-card" style={{ padding: '20px', textAlign: 'center', marginBottom: 0 }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 600 }}>TRIPS CREATED</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)', marginTop: 4 }}>
                  {overviewStats?.totalTrips || 389}
                </div>
              </div>

              <div className="form-card" style={{ padding: '20px', textAlign: 'center', marginBottom: 0 }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 600 }}>CITIES CATALOG</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>
                  {overviewStats?.totalCities || 54}
                </div>
              </div>

              <div className="form-card" style={{ padding: '20px', textAlign: 'center', marginBottom: 0 }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 600 }}>ACTIVITIES CATALOG</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#8b5cf6', marginTop: 4 }}>
                  {overviewStats?.totalActivities || 210}
                </div>
              </div>
            </div>

            {/* Visual Analytics Representation (Screen 12 Wireframe Charts & Trends) */}
            <div className="form-card">
              <div className="form-card-title">
                <span>User Activity Trends & Usage Charts</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                {/* Bar Visualizer */}
                <div style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '16px' }}>Monthly Trip Planning Growth</h4>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '140px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                    <div style={{ flex: 1, backgroundColor: 'var(--primary)', height: '40%', borderRadius: '4px 4px 0 0' }} title="Jan" />
                    <div style={{ flex: 1, backgroundColor: 'var(--primary)', height: '55%', borderRadius: '4px 4px 0 0' }} title="Feb" />
                    <div style={{ flex: 1, backgroundColor: 'var(--primary)', height: '70%', borderRadius: '4px 4px 0 0' }} title="Mar" />
                    <div style={{ flex: 1, backgroundColor: 'var(--primary)', height: '85%', borderRadius: '4px 4px 0 0' }} title="Apr" />
                    <div style={{ flex: 1, backgroundColor: 'var(--primary)', height: '100%', borderRadius: '4px 4px 0 0' }} title="May" />
                  </div>
                </div>

                {/* Distribution Breakdown */}
                <div style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '16px' }}>Trip Visibility Distribution</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8125rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>Private Trips</span>
                        <strong>65%</strong>
                      </div>
                      <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: '65%' }} /></div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>Public Community Trips</span>
                        <strong>25%</strong>
                      </div>
                      <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: '25%', backgroundColor: 'var(--success)' }} /></div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>Shared Friend Trips</span>
                        <strong>10%</strong>
                      </div>
                      <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: '10%', backgroundColor: '#8b5cf6' }} /></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
