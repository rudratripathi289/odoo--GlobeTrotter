import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import useAuthStore from '@/store/authStore'
import api from '@/lib/axios'

export const Route = createFileRoute('/search')({
  component: SearchPage,
  validateSearch: (search) => ({
    q: search?.q || '',
    type: search?.type || 'cities', // 'cities' | 'activities'
  }),
})

function SearchPage() {
  const { q: initialQuery, type: initialType } = Route.useSearch()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [searchType, setSearchType] = useState(initialType || 'cities')
  const [searchQuery, setSearchQuery] = useState(initialQuery || '')
  const [countries, setCountries] = useState([])
  const [selectedCountryId, setSelectedCountryId] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [sortBy, setSortBy] = useState('POPULARITY')

  const [cities, setCities] = useState([])
  const [activities, setActivities] = useState([])
  const [savedCityIds, setSavedCityIds] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Fetch countries & saved destinations on mount
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const countryRes = await api.get('/countries')
        setCountries(countryRes.data?.data || countryRes.data || [])

        if (localStorage.getItem('accessToken')) {
          const savedRes = await api.get('/users/me/saved-destinations')
          const savedList = savedRes.data?.data || savedRes.data || []
          setSavedCityIds(savedList.map((item) => item.cityId || item.city?.id))
        }
      } catch (err) {
        console.error('Failed to load search master data:', err)
      }
    }
    fetchMasterData()
  }, [])

  // Execute Search
  const performSearch = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      if (searchType === 'cities') {
        // City Search (GET /api/v1/cities?search=...&countryId=...)
        const params = new URLSearchParams()
        if (searchQuery.trim()) params.append('search', searchQuery.trim())
        if (selectedCountryId) params.append('countryId', selectedCountryId)
        if (!searchQuery.trim() && !selectedCountryId) params.append('search', 'a') // default fallback search

        const res = await api.get(`/cities?${params.toString()}`)
        let results = res.data?.data || res.data || []

        // Sorting
        if (sortBy === 'POPULARITY') results.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        if (sortBy === 'NAME') results.sort((a, b) => a.name.localeCompare(b.name))

        setCities(results)
      } else {
        // Activity Search (across sample/master cities or selected country)
        const cityParams = new URLSearchParams()
        if (searchQuery.trim()) cityParams.append('search', searchQuery.trim())
        if (selectedCountryId) cityParams.append('countryId', selectedCountryId)
        if (!searchQuery.trim() && !selectedCountryId) cityParams.append('search', 'a')

        const citiesRes = await api.get(`/cities?${cityParams.toString()}`)
        const cityList = (citiesRes.data?.data || citiesRes.data || []).slice(0, 5)

        let allActivities = []
        for (const c of cityList) {
          try {
            const actRes = await api.get(`/cities/${c.id}/activities`)
            const actList = actRes.data?.data || actRes.data || []
            allActivities = [...allActivities, ...actList.map((a) => ({ ...a, cityName: c.name }))]
          } catch {
            // continue
          }
        }

        // Filter category
        if (selectedCategory !== 'ALL') {
          allActivities = allActivities.filter((a) => a.category === selectedCategory)
        }

        setActivities(allActivities)
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to perform search.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    performSearch()
  }, [searchType, selectedCountryId, selectedCategory, sortBy])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    performSearch()
  }

  const handleToggleSaveCity = async (cityId, e) => {
    e.stopPropagation()
    if (!localStorage.getItem('accessToken')) {
      navigate({ to: '/login' })
      return
    }
    const isSaved = savedCityIds.includes(cityId)
    try {
      if (isSaved) {
        await api.delete(`/users/me/saved-destinations/${cityId}`)
        setSavedCityIds((prev) => prev.filter((id) => id !== cityId))
        setSuccessMsg('Bookmark removed.')
      } else {
        await api.post('/users/me/saved-destinations', { cityId })
        setSavedCityIds((prev) => [...prev, cityId])
        setSuccessMsg('Destination saved to bookmarks!')
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to update bookmark.')
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
              <li><Link to="/search" className="nav-link active">Search</Link></li>
              <li><Link to="/community" className="nav-link">Community</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="page-container" style={{ flex: 1 }}>
        <div style={{ marginBottom: '16px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Activity & City Search (Screen 8)</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Discover destinations, compare cost indices, and explore experiences</p>
        </div>

        {/* Alerts */}
        {errorMsg && <div className="alert-error" role="alert" onClick={() => setErrorMsg('')}>{errorMsg}</div>}
        {successMsg && <div className="alert-success" role="alert" onClick={() => setSuccessMsg('')}>{successMsg}</div>}

        {/* Search Mode Toggles */}
        <div className="tab-navigation">
          <button
            type="button"
            className={`tab-button ${searchType === 'cities' ? 'active' : ''}`}
            onClick={() => setSearchType('cities')}
          >
            🏙️ City Search (Screen 8)
          </button>
          <button
            type="button"
            className={`tab-button ${searchType === 'activities' ? 'active' : ''}`}
            onClick={() => setSearchType('activities')}
          >
            🏄 Activity Search (Screen 8)
          </button>
        </div>

        {/* Search & Filter Controls Bar (Screen 8 Wireframe: Search bar, Group by, Filter, Sort by...) */}
        <form onSubmit={handleSearchSubmit} className="search-filter-bar">
          <div className="search-input-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder={searchType === 'cities' ? 'Search cities (e.g. Paris, Tokyo, Mumbai)...' : 'Search activities (e.g. Paragliding, Museum, Food tour)...'}
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

            {searchType === 'activities' && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="filter-select"
              >
                <option value="ALL">Category: All</option>
                <option value="SIGHTSEEING">Sightseeing</option>
                <option value="FOOD">Food & Dining</option>
                <option value="ADVENTURE">Adventure</option>
                <option value="SHOPPING">Shopping</option>
                <option value="CULTURE">Culture</option>
                <option value="NATURE">Nature</option>
              </select>
            )}

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="POPULARITY">Sort by: Popularity</option>
              <option value="NAME">Sort by: Name (A-Z)</option>
            </select>

            <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '8px 16px' }}>
              Search
            </button>
          </div>
        </form>

        {/* ── Search Results List (Screen 8 Wireframe) ── */}
        <section>
          <div className="section-header">
            <h2 className="section-title">Results ({searchType === 'cities' ? cities.length : activities.length})</h2>
          </div>

          {loading ? (
            <div className="empty-state">Searching {searchType}…</div>
          ) : searchType === 'cities' ? (
            cities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {cities.map((city) => {
                  const isSaved = savedCityIds.includes(city.id)
                  return (
                    <div key={city.id} className="timeline-item" style={{ padding: '20px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)' }}>{city.name}</h3>
                          <span className="trip-badge badge-upcoming">
                            {city.country?.name || 'Destination'}
                          </span>
                          {city.costIndex && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>
                              Cost Index: {city.costIndex}/100
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginTop: '4px' }}>
                          Popularity Rating: <strong>{city.popularity || 85}/100</strong> • State/Region: {city.state?.name || 'N/A'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="filter-select"
                          style={{
                            color: isSaved ? 'var(--primary)' : 'var(--text)',
                            borderColor: isSaved ? 'var(--primary)' : 'var(--border)'
                          }}
                          onClick={(e) => handleToggleSaveCity(city.id, e)}
                        >
                          {isSaved ? '★ Bookmarked' : '☆ Bookmark'}
                        </button>

                        <button
                          type="button"
                          className="btn-primary"
                          style={{ width: 'auto', padding: '8px 16px', fontSize: '0.8125rem' }}
                          onClick={() => navigate({ to: '/trips/create', search: { destination: city.name } })}
                        >
                          + Plan Trip Here
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-state">No cities found matching your criteria.</div>
            )
          ) : (
            activities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {activities.map((act) => (
                  <div key={act.id} className="timeline-item" style={{ padding: '20px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)' }}>{act.name}</h3>
                        <span className="trip-badge badge-ongoing">{act.category || 'ACTIVITY'}</span>
                        {act.cityName && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>
                            📍 {act.cityName}
                          </span>
                        )}
                      </div>

                      <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: '6px 0 8px' }}>
                        {act.description || 'Recommended activity.'}
                      </p>

                      <div style={{ fontSize: '0.8125rem', color: 'var(--text)', fontWeight: 600 }}>
                        Est. Cost: ₹{Number(act.defaultCost || 0).toLocaleString()} • Duration: {act.durationMin || 90} mins
                      </div>
                    </div>

                    <div>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ width: 'auto', padding: '8px 16px', fontSize: '0.8125rem' }}
                        onClick={() => navigate({ to: '/trips/create', search: { destination: act.cityName || '' } })}
                      >
                        + Add to Trip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No activities found matching your criteria.</div>
            )
          )}
        </section>
      </main>
    </div>
  )
}
