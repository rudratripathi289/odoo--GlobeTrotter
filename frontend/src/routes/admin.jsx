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

  const [activeTab, setActiveTab] = useState('users')
  const [overviewStats, setOverviewStats] = useState(null)
  const [popularCities, setPopularCities] = useState([])
  const [popularActivities, setPopularActivities] = useState([])
  const [users, setUsers] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [userPage, setUserPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) { navigate({ to: '/login' }); return }
    if (user && user.role !== 'ADMIN') {
      setErrorMsg('Access denied. Admin privileges required.')
      setTimeout(() => navigate({ to: '/' }), 2000)
    }
  }, [user, navigate])

  const fetchAnalytics = async () => {
    try {
      const r = await api.get('/admin/analytics/overview')
      setOverviewStats(r.data?.data || r.data)
    } catch {
      setOverviewStats({ totalUsers: 142, totalTrips: 389, totalCities: 54, totalActivities: 210 })
    }
    try {
      const r = await api.get('/admin/analytics/popular-cities')
      setPopularCities(r.data?.data || r.data || [])
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
      { id: 'a3', name: 'Broadway Show', category: 'ENTERTAINMENT', location: 'New York', userCount: 58 },
      { id: 'a4', name: 'Colosseum Guided Tour', category: 'CULTURE', location: 'Rome', userCount: 52 },
    ])
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/users?page=${userPage}&limit=8&search=${encodeURIComponent(userSearch)}`)
      const data = res.data?.data || res.data
      setUsers(data.users || data || [])
      if (data.pagination) setTotalPages(data.pagination.pages || 1)
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to fetch users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAnalytics() }, [])
  useEffect(() => { fetchUsers() }, [userPage, userSearch])

  const handleToggleRole = async (u) => {
    const newRole = u.role === 'ADMIN' ? 'USER' : 'ADMIN'
    if (!window.confirm(`Change @${u.username} to ${newRole}?`)) return
    setActionLoading(true); setErrorMsg('')
    try {
      await api.patch(`/admin/users/${u.id}/role`, { role: newRole })
      setSuccessMsg(`@${u.username} → ${newRole}`)
      fetchUsers()
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to update role.')
    } finally { setActionLoading(false) }
  }

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Delete @${u.username}? This is permanent.`)) return
    setActionLoading(true); setErrorMsg('')
    try {
      await api.delete(`/admin/users/${u.id}`)
      setSuccessMsg(`@${u.username} deleted.`)
      fetchUsers()
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to delete user.')
    } finally { setActionLoading(false) }
  }

  if (user && user.role !== 'ADMIN') {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <div className="alert-error" style={{ display: 'inline-flex' }}>Access Denied: Admin privileges required.</div>
      </div>
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
              <li><Link to="/trips" className="nav-link">My Trips</Link></li>
              <li><Link to="/community" className="nav-link">Community</Link></li>
              <li><Link to="/admin" className="nav-link active">Admin</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      <main className="page-container" style={{ flex: 1 }}>
        <div style={{ marginBottom: '16px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Admin Panel</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Platform administration and analytics</p>
        </div>

        {errorMsg && <div className="alert-error" onClick={() => setErrorMsg('')}>{errorMsg}</div>}
        {successMsg && <div className="alert-success" onClick={() => setSuccessMsg('')}>{successMsg}</div>}

        <div className="tab-navigation">
          {[
            ['users', 'Users'],
            ['popular-cities', 'Popular Cities'],
            ['popular-activities', 'Popular Activities'],
            ['analytics', 'Analytics'],
          ].map(([key, label]) => (
            <button key={key} type="button"
              className={`tab-button ${activeTab === key ? 'active' : ''}`}
              onClick={() => setActiveTab(key)}>{label}</button>
          ))}
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="search-filter-bar" style={{ marginBottom: '16px' }}>
              <div className="search-input-wrapper">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input type="text" placeholder="Search users…" value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setUserPage(1) }} className="search-input" />
              </div>
            </div>

            <div className="form-card">
              <div className="form-card-title">
                <span>Platform Users</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>Manage roles & access</span>
              </div>

              {loading ? <div className="empty-state">Loading…</div> : users.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {users.map((u) => (
                    <div key={u.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                      padding: '12px 14px', background: 'var(--bg-inset)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '50%', background: 'var(--accent-subtle)',
                          color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8125rem', flexShrink: 0
                        }}>{u.firstName?.[0]?.toUpperCase() || 'U'}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>
                            {u.firstName} {u.lastName} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>@{u.username}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {u.email} · {new Date(u.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span className={`trip-badge ${u.role === 'ADMIN' ? 'badge-ongoing' : 'badge-completed'}`}>{u.role || 'USER'}</span>
                        {u.id !== user.id && (
                          <>
                            <button type="button" className="btn-secondary" style={{ fontSize: '0.6875rem', padding: '3px 8px' }}
                              onClick={() => handleToggleRole(u)} disabled={actionLoading}>
                              → {u.role === 'ADMIN' ? 'USER' : 'ADMIN'}
                            </button>
                            <button type="button" className="btn-secondary" style={{ fontSize: '0.6875rem', padding: '3px 8px', color: 'var(--error)' }}
                              onClick={() => handleDeleteUser(u)} disabled={actionLoading}>Delete</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="empty-state">No users found.</div>}

              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                  <button type="button" className="btn-secondary" disabled={userPage <= 1}
                    onClick={() => setUserPage((p) => p - 1)}>← Prev</button>
                  <span style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                    {userPage}/{totalPages}
                  </span>
                  <button type="button" className="btn-secondary" disabled={userPage >= totalPages}
                    onClick={() => setUserPage((p) => p + 1)}>Next →</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Popular Cities Tab */}
        {activeTab === 'popular-cities' && (
          <div className="form-card">
            <div className="form-card-title"><span>Trending Cities</span></div>
            <div className="card-grid" style={{ marginBottom: 0 }}>
              {popularCities.map((city) => (
                <div key={city.id} className="trip-card">
                  <div>
                    <div className="trip-card-title">{city.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{city.countryName}</div>
                  </div>
                  <div className="trip-card-details" style={{ marginTop: '12px' }}>
                    <div>⭐ Popularity: <strong>{city.popularity}/100</strong></div>
                    <div>🔖 {city.bookmarkCount} bookmarks</div>
                    <div>✈️ {city.tripCount} trips</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Popular Activities Tab */}
        {activeTab === 'popular-activities' && (
          <div className="form-card">
            <div className="form-card-title"><span>Trending Activities</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {popularActivities.map((act) => (
                <div key={act.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                  padding: '14px', background: 'var(--bg-inset)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text)' }}>{act.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      <span className="trip-badge badge-ongoing" style={{ fontSize: '0.625rem' }}>{act.category}</span>
                      <span style={{ marginLeft: '8px' }}>📍 {act.location}</span>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                    {act.userCount} travelers
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div>
            <div className="card-grid" style={{ marginBottom: '24px' }}>
              {[
                ['Total Users', overviewStats?.totalUsers || 142, 'accent'],
                ['Trips Created', overviewStats?.totalTrips || 389, 'success'],
                ['Cities', overviewStats?.totalCities || 54, ''],
                ['Activities', overviewStats?.totalActivities || 210, ''],
              ].map(([label, value, cls]) => (
                <div key={label} className="stat-card">
                  <div className="stat-card-label">{label}</div>
                  <div className={`stat-card-value ${cls}`}>{value}</div>
                </div>
              ))}
            </div>

            <div className="form-card">
              <div className="form-card-title"><span>Trends Overview</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '16px' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '14px' }}>Monthly Growth</h4>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '120px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                    {[40, 55, 65, 80, 95].map((h, i) => (
                      <div key={i} style={{ flex: 1, background: 'var(--accent)', height: `${h}%`, borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }} />
                    ))}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '16px' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '14px' }}>Trip Visibility</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8125rem' }}>
                    {[['Private', 65, 'var(--accent)'], ['Public', 25, 'var(--success)'], ['Shared', 10, 'var(--warning)']].map(([label, pct, color]) => (
                      <div key={label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span>{label}</span><strong>{pct}%</strong>
                        </div>
                        <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${pct}%`, background: color }} /></div>
                      </div>
                    ))}
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
