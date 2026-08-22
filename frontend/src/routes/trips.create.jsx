import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import useAuthStore from '@/store/authStore'
import api from '@/lib/axios'

export const Route = createFileRoute('/trips/create')({
  component: CreateTripPage,
  validateSearch: (search) => ({
    destination: search?.destination || '',
  }),
})

function CreateTripPage() {
  const { destination: searchDestination } = Route.useSearch()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Form State
  const [name, setName] = useState(searchDestination ? `${searchDestination} Trip` : '')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [budget, setBudget] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [visibility, setVisibility] = useState('PRIVATE')
  const [description, setDescription] = useState('')

  // City Search State
  const [citySearch, setCitySearch] = useState(searchDestination || '')
  const [cityResults, setCityResults] = useState([])
  const [selectedCity, setSelectedCity] = useState(null)
  const [searchingCity, setSearchingCity] = useState(false)
  const [showCityDropdown, setShowCityDropdown] = useState(false)

  // Suggestions State
  const [activities, setActivities] = useState([])
  const [selectedActivityIds, setSelectedActivityIds] = useState([])
  const [loadingActivities, setLoadingActivities] = useState(false)

  // Status & Error
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  // Protect route
  useEffect(() => {
    if (!localStorage.getItem('accessToken')) {
      navigate({ to: '/login' })
    }
  }, [navigate])

  // Search cities as user types
  useEffect(() => {
    if (!citySearch.trim() || citySearch.length < 2) {
      setCityResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearchingCity(true)
      try {
        const res = await api.get(`/cities?search=${encodeURIComponent(citySearch)}`)
        setCityResults(res.data?.data || res.data || [])
        setShowCityDropdown(true)
      } catch (err) {
        console.error('Failed to search cities:', err)
      } finally {
        setSearchingCity(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [citySearch])

  // Load activities suggestions when a city is selected
  useEffect(() => {
    if (!selectedCity) return

    const fetchActivities = async () => {
      setLoadingActivities(true)
      try {
        const res = await api.get(`/cities/${selectedCity.id}/activities`)
        setActivities(res.data?.data || res.data || [])
      } catch (err) {
        console.error('Failed to fetch city activities:', err)
        // Fallback sample suggestions for demonstration
        setActivities([
          { id: 'act-1', name: 'City Heritage Tour', category: 'CULTURE', defaultCost: 1200, durationMin: 180, description: 'Guided walking tour of historical landmarks and cultural monuments.' },
          { id: 'act-2', name: 'Local Food & Street Tasting', category: 'FOOD', defaultCost: 800, durationMin: 120, description: 'Sample signature local street food and authentic delicacies.' },
          { id: 'act-3', name: 'Scenic Viewpoint & Sunset', category: 'NATURE', defaultCost: 500, durationMin: 90, description: 'Panoramic evening sunset views overlooking the city.' },
          { id: 'act-4', name: 'Adventure Outdoor Excursion', category: 'ADVENTURE', defaultCost: 2500, durationMin: 240, description: 'Trekking, ziplining or water sports with safety gear.' },
        ])
      } finally {
        setLoadingActivities(false)
      }
    }

    fetchActivities()
  }, [selectedCity])

  const toggleActivitySelection = (id) => {
    setSelectedActivityIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const validate = () => {
    const errs = {}
    if (!name.trim()) errs.name = 'Trip name is required'
    if (!startDate) errs.startDate = 'Start date is required'
    if (!endDate) errs.endDate = 'End date is required'
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      errs.endDate = 'End date must be on or after start date'
    }
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) return setErrors(errs)

    setLoading(true)
    setServerError('')

    try {
      // 1. Create Trip
      const tripPayload = {
        name: name.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        ...(budget ? { budget: parseFloat(budget) } : {}),
        currency: currency || 'INR',
        visibility: visibility || 'PRIVATE',
        ...(description.trim() ? { description: description.trim() } : {}),
      }

      const tripRes = await api.post('/trips', tripPayload)
      const createdTrip = tripRes.data?.data || tripRes.data
      const tripId = createdTrip.id

      // 2. Add selected city as first Stop if selected
      if (selectedCity && tripId) {
        try {
          const stopRes = await api.post(`/trips/${tripId}/stops`, {
            cityId: selectedCity.id,
            sequence: 1,
            startDate: new Date(startDate).toISOString(),
            endDate: new Date(endDate).toISOString(),
          })
          const stop = stopRes.data?.data || stopRes.data
          const stopId = stop.id

          // 3. Attach selected activities to the stop
          if (stopId && selectedActivityIds.length > 0) {
            for (let i = 0; i < selectedActivityIds.length; i++) {
              const actId = selectedActivityIds[i]
              const activityObj = activities.find((a) => a.id === actId)
              await api.post(`/trips/${tripId}/stops/${stopId}/activities`, {
                activityId: actId,
                customName: activityObj?.name,
                sequence: i + 1,
                activityDate: new Date(startDate).toISOString(),
                estimatedCost: activityObj?.defaultCost || 0,
              })
            }
          }
        } catch (stopErr) {
          console.warn('Initial stop/activity creation warning:', stopErr)
        }
      }

      // Redirect to Build Itinerary (Screen 5) / Trip View
      navigate({ to: `/trips/$tripId`, params: { tripId } })
    } catch (err) {
      setServerError(err.response?.data?.error?.message || 'Failed to create trip. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

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
        <div style={{ marginBottom: '20px' }}>
          <Link to="/" style={{ fontSize: '0.875rem', color: 'var(--muted)', textDecoration: 'none' }}>
            ← Back to Dashboard
          </Link>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="alert-error" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Top Card: Plan a new trip (Screen 4) */}
          <div className="form-card">
            <div className="form-card-title">
              <span>Plan a new trip</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--muted)' }}>Step 1 of 2</span>
            </div>

            {/* Trip Title */}
            <div className="form-group">
              <label htmlFor="trip-name" className="form-label">
                Trip Name / Title <span className="required-star">*</span>
              </label>
              <input
                id="trip-name"
                type="text"
                placeholder="e.g. Summer Vacation in Paris, Himalayan Trek..."
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (errors.name) setErrors((prev) => ({ ...prev, name: '' }))
                }}
                className={`form-input ${errors.name ? 'is-error' : ''}`}
              />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>

            {/* Row: Dates */}
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="start-date" className="form-label">
                  Start Date <span className="required-star">*</span>
                </label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    if (errors.startDate) setErrors((prev) => ({ ...prev, startDate: '' }))
                  }}
                  className={`form-input ${errors.startDate ? 'is-error' : ''}`}
                />
                {errors.startDate && <span className="form-error">{errors.startDate}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="end-date" className="form-label">
                  End Date <span className="required-star">*</span>
                </label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    if (errors.endDate) setErrors((prev) => ({ ...prev, endDate: '' }))
                  }}
                  className={`form-input ${errors.endDate ? 'is-error' : ''}`}
                />
                {errors.endDate && <span className="form-error">{errors.endDate}</span>}
              </div>
            </div>

            {/* Select a Place / City Search */}
            <div className="form-group searchable-select">
              <label htmlFor="city-search" className="form-label">
                Select a Place / Destination City
              </label>
              <input
                id="city-search"
                type="text"
                placeholder="Type city name (e.g. Paris, Tokyo, Mumbai, New York)..."
                value={citySearch}
                onChange={(e) => {
                  setCitySearch(e.target.value)
                  setSelectedCity(null)
                }}
                onFocus={() => cityResults.length > 0 && setShowCityDropdown(true)}
                className="form-input"
              />

              {searchingCity && (
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>
                  Searching cities…
                </div>
              )}

              {selectedCity && (
                <div style={{ fontSize: '0.8125rem', color: 'var(--success)', fontWeight: 600, marginTop: '4px' }}>
                  ✓ Selected: {selectedCity.name} ({selectedCity.country?.name || 'Country'})
                </div>
              )}

              {showCityDropdown && cityResults.length > 0 && (
                <div className="select-dropdown-list">
                  {cityResults.map((city) => (
                    <div
                      key={city.id}
                      className="select-dropdown-item"
                      onClick={() => {
                        setSelectedCity(city)
                        setCitySearch(city.name)
                        setShowCityDropdown(false)
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{city.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{city.country?.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Row: Budget, Currency, Visibility */}
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="trip-budget" className="form-label">Estimated Budget</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="filter-select"
                    style={{ width: '90px' }}
                  >
                    <option value="INR">INR ₹</option>
                    <option value="USD">USD $</option>
                    <option value="EUR">EUR €</option>
                    <option value="GBP">GBP £</option>
                  </select>
                  <input
                    id="trip-budget"
                    type="number"
                    min="0"
                    placeholder="e.g. 50000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="trip-visibility" className="form-label">Trip Visibility</label>
                <select
                  id="trip-visibility"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="form-input"
                >
                  <option value="PRIVATE">Private (Only you)</option>
                  <option value="SHARED">Shared (Shared with friends)</option>
                  <option value="PUBLIC">Public (Community discovery)</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label htmlFor="trip-desc" className="form-label">Trip Notes / Description</label>
              <textarea
                id="trip-desc"
                placeholder="Write a brief overview of what you want to do on this trip..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-textarea"
              />
            </div>
          </div>

          {/* Bottom Card: Suggestion for Places to Visit / Activities to perform (Screen 4) */}
          <div className="form-card">
            <div className="form-card-title">
              <span>Suggestion for Places to Visit / Activities to perform</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 400 }}>
                {selectedCity ? `Suggestions for ${selectedCity.name}` : 'Select a place above to filter suggestions'}
              </span>
            </div>

            {loadingActivities ? (
              <div className="empty-state">Loading activity suggestions…</div>
            ) : activities.length > 0 ? (
              <div className="suggestions-grid">
                {activities.map((act) => {
                  const isSelected = selectedActivityIds.includes(act.id)
                  return (
                    <div
                      key={act.id}
                      className={`suggestion-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleActivitySelection(act.id)}
                    >
                      <div className="suggestion-checkbox">
                        {isSelected && '✓'}
                      </div>
                      <div className="suggestion-details">
                        <div className="suggestion-title">{act.name}</div>
                        <div className="suggestion-category">{act.category || 'ACTIVITY'}</div>
                        <div className="suggestion-desc">{act.description || 'Recommended activity.'}</div>
                        {act.defaultCost && (
                          <div className="suggestion-cost">Est. Cost: ₹{Number(act.defaultCost).toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-state">
                <p>No default activity suggestions found for this place.</p>
                <p style={{ fontSize: '0.8125rem', marginTop: '4px' }}>You can add custom physical activities and expenses on the next step!</p>
              </div>
            )}
          </div>

          {/* Submit Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="filter-select"
              onClick={() => navigate({ to: '/' })}
              disabled={loading}
              style={{ padding: '10px 20px' }}
            >
              Cancel
            </button>

            <button
              type="submit"
              id="create-trip-submit-btn"
              className="btn-primary"
              disabled={loading}
              style={{ width: 'auto', padding: '10px 28px', fontSize: '0.9375rem' }}
            >
              {loading && <span className="spinner" />}
              {loading ? 'Creating trip…' : 'Create Trip & Build Itinerary →'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
