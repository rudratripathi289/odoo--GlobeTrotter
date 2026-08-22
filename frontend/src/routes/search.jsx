import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import useAuthStore from '@/store/authStore'
import api from '@/lib/axios'
import { getCityImage, getActivityImage } from '@/lib/placeImages'

export const Route = createFileRoute('/search')({
  component: SearchPage,
  validateSearch: (search) => ({
    q: search?.q || '',
    type: search?.type || 'cities',
  }),
})

function SearchPage() {
  const { q: initialQuery, type: initialType } = Route.useSearch()
  const navigate = useNavigate()

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

  const performSearch = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      if (searchType === 'cities') {
        const params = new URLSearchParams()
        if (searchQuery.trim()) params.append('search', searchQuery.trim())
        if (selectedCountryId) params.append('countryId', selectedCountryId)
        if (!searchQuery.trim() && !selectedCountryId) params.append('search', 'a')

        const res = await api.get(`/cities?${params.toString()}`)
        let results = res.data?.data || res.data || []

        if (sortBy === 'POPULARITY') results.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        if (sortBy === 'NAME') results.sort((a, b) => a.name.localeCompare(b.name))

        setCities(results)
      } else {
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
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Activity & City Search</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Discover destinations, compare cost indices, and explore experiences with real photos</p>
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
            🏙️ City Search
          </button>
          <button
            type="button"
            className={`tab-button ${searchType === 'activities' ? 'active' : ''}`}
            onClick={() => setSearchType('activities')}
          >
            🏄 Activity Search
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="search-filter-bar">
          <div className="search-input-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

            <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }}>
              Search
            </button>
          </div>
        </form>

        {/* ── Search Results List ── */}
        <section>
          <div className="section-header">
            <h2 className="section-title">Results ({searchType === 'cities' ? cities.length : activities.length})</h2>
          </div>

          {loading ? (
            <div className="empty-state">Searching {searchType}…</div>
          ) : searchType === 'cities' ? (
            cities.length > 0 ? (
              <div className="card-grid">
                {cities.map((city) => {
                  const isSaved = savedCityIds.includes(city.id)
                  const imgUrl = getCityImage(city.name, city.imageUrl)
                  return (
                    <div key={city.id} className="destination-card">
                      <div className="destination-image-container">
                        <img src={imgUrl} alt={city.name} className="destination-card-img" loading="lazy" />
                      </div>
                      <div className="destination-info">
                        <div>
                          <div className="destination-name">{city.name}</div>
                          <div className="destination-sub">{city.country?.name || 'Destination'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                            Popularity: <strong>{city.popularity || 88}/100</strong> • Cost Index: {city.costIndex || 75}/100
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                          <button
                            type="button"
                            className="filter-select"
                            style={{
                              flex: 1,
                              fontSize: '0.75rem',
                              color: isSaved ? 'var(--primary)' : 'var(--text-main)',
                              borderColor: isSaved ? 'var(--primary)' : 'var(--border)'
                            }}
                            onClick={(e) => handleToggleSaveCity(city.id, e)}
                          >
                            {isSaved ? '★ Bookmarked' : '☆ Bookmark'}
                          </button>

                          <button
                            type="button"
                            className="btn-primary"
                            style={{ flex: 1, padding: '6px 12px', fontSize: '0.75rem' }}
                            onClick={() => navigate({ to: '/trips/create', search: { destination: city.name } })}
                          >
                            + Plan Trip
                          </button>
                        </div>
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
              <div className="card-grid">
                {activities.map((act) => {
                  const imgUrl = getActivityImage(act.category, act.imageUrl)
                  return (
                    <div key={act.id} className="destination-card">
                      <div className="destination-image-container">
                        <img src={imgUrl} alt={act.name} className="destination-card-img" loading="lazy" />
                      </div>
                      <div className="destination-info">
                        <div>
                          <div className="destination-name">{act.name}</div>
                          <span className="trip-badge badge-ongoing" style={{ marginTop: 4, display: 'inline-block' }}>
                            {act.category || 'ACTIVITY'}
                          </span>
                          <p style={{ fontSize: '0.8125rem', color: 'var(--text-sub)', margin: '8px 0 10px', lineHeight: 1.4 }}>
                            {act.description || 'Recommended activity experience.'}
                          </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)' }}>
                            Est: ₹{Number(act.defaultCost || 0).toLocaleString()}
                          </div>
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.75rem' }}
                            onClick={() => navigate({ to: '/trips/create', search: { destination: act.cityName || '' } })}
                          >
                            + Add to Trip
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
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
