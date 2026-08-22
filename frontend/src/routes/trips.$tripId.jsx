import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import useAuthStore from '@/store/authStore'
import api from '@/lib/axios'

export const Route = createFileRoute('/trips/$tripId')({
  component: TripDetailItineraryPage,
})

function TripDetailItineraryPage() {
  const { tripId } = Route.useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // State
  const [trip, setTrip] = useState(null)
  const [budgetData, setBudgetData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('itinerary') // 'itinerary' | 'budget' | 'calendar' | 'share'
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Modals state
  const [showAddStopModal, setShowAddStopModal] = useState(false)
  const [showAddActivityModal, setShowAddActivityModal] = useState(false)
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [activeStopId, setActiveStopId] = useState(null)

  // Add Stop Form
  const [stopCitySearch, setStopCitySearch] = useState('')
  const [stopCityResults, setStopCityResults] = useState([])
  const [selectedStopCity, setSelectedStopCity] = useState(null)
  const [stopStartDate, setStopStartDate] = useState('')
  const [stopEndDate, setStopEndDate] = useState('')
  const [stopBudget, setStopBudget] = useState('')

  // Add Activity Form
  const [activityCustomName, setActivityCustomName] = useState('')
  const [activityDate, setActivityDate] = useState('')
  const [activityCost, setActivityCost] = useState('')
  const [activityCategory, setActivityCategory] = useState('SIGHTSEEING')

  // Add Expense Form
  const [expenseCategory, setExpenseCategory] = useState('FOOD')
  const [expenseDescription, setExpenseDescription] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState('')

  // Share Form
  const [shareIdentifier, setShareIdentifier] = useState('')
  const [sharePermission, setSharePermission] = useState('VIEW')

  // Fetch full trip data
  const fetchTripDetails = async () => {
    try {
      const res = await api.get(`/trips/${tripId}`)
      const data = res.data?.data || res.data
      setTrip(data)

      // Fetch budget breakdown
      try {
        const budgetRes = await api.get(`/trips/${tripId}/budget`)
        setBudgetData(budgetRes.data?.data || budgetRes.data)
      } catch {
        // Fallback budget structure
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to load trip details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) {
      navigate({ to: '/login' })
      return
    }
    fetchTripDetails()
  }, [tripId, navigate])

  // City Search for Add Stop Modal
  useEffect(() => {
    if (!stopCitySearch.trim() || stopCitySearch.length < 2) {
      setStopCityResults([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/cities?search=${encodeURIComponent(stopCitySearch)}`)
        setStopCityResults(res.data?.data || res.data || [])
      } catch {
        setStopCityResults([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [stopCitySearch])

  // ── Actions ──
  const handleAddStop = async (e) => {
    e.preventDefault()
    if (!selectedStopCity || !stopStartDate || !stopEndDate) {
      setErrorMsg('Please select a city and travel dates for the stop.')
      return
    }
    try {
      await api.post(`/trips/${tripId}/stops`, {
        cityId: selectedStopCity.id,
        sequence: (trip?.stops?.length || 0) + 1,
        startDate: new Date(stopStartDate).toISOString(),
        endDate: new Date(stopEndDate).toISOString(),
        ...(stopBudget ? { budget: parseFloat(stopBudget) } : {}),
      })
      setSuccessMsg('Stop added successfully!')
      setShowAddStopModal(false)
      setSelectedStopCity(null)
      setStopCitySearch('')
      fetchTripDetails()
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to add stop.')
    }
  }

  const handleAddActivity = async (e) => {
    e.preventDefault()
    if (!activityCustomName.trim() || !activityDate) {
      setErrorMsg('Please provide activity name and date.')
      return
    }
    try {
      await api.post(`/trips/${tripId}/stops/${activeStopId}/activities`, {
        customName: activityCustomName.trim(),
        sequence: 1,
        activityDate: new Date(activityDate).toISOString(),
        ...(activityCost ? { estimatedCost: parseFloat(activityCost) } : {}),
      })
      setSuccessMsg('Activity added!')
      setShowAddActivityModal(false)
      setActivityCustomName('')
      setActivityCost('')
      fetchTripDetails()
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to add activity.')
    }
  }

  const handleAddExpense = async (e) => {
    e.preventDefault()
    if (!expenseDescription.trim() || !expenseAmount || !expenseDate) {
      setErrorMsg('Please fill in expense description, amount, and date.')
      return
    }
    try {
      await api.post(`/trips/${tripId}/expenses`, {
        stopId: activeStopId || undefined,
        category: expenseCategory,
        description: expenseDescription.trim(),
        amount: parseFloat(expenseAmount),
        expenseDate: new Date(expenseDate).toISOString(),
      })
      setSuccessMsg('Expense tracked!')
      setShowAddExpenseModal(false)
      setExpenseDescription('')
      setExpenseAmount('')
      fetchTripDetails()
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to record expense.')
    }
  }

  const handleShareTrip = async (e) => {
    e.preventDefault()
    if (!shareIdentifier.trim()) {
      setErrorMsg('Enter email or username to share with.')
      return
    }
    try {
      await api.post(`/trips/${tripId}/shares`, {
        email: shareIdentifier.includes('@') ? shareIdentifier.trim().toLowerCase() : undefined,
        username: !shareIdentifier.includes('@') ? shareIdentifier.trim().toLowerCase() : undefined,
        permission: sharePermission,
      })
      setSuccessMsg(`Trip shared with ${shareIdentifier}!`)
      setShareIdentifier('')
      setShowShareModal(false)
      fetchTripDetails()
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to share trip.')
    }
  }

  const handleDeleteTrip = async () => {
    if (!window.confirm('Are you sure you want to delete this trip? This action cannot be undone.')) return
    try {
      await api.delete(`/trips/${tripId}`)
      navigate({ to: '/' })
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to delete trip.')
    }
  }

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <div className="spinner" style={{ width: 28, height: 28, borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
        <p style={{ marginTop: 12, color: 'var(--muted)' }}>Loading itinerary…</p>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <h2>Trip Not Found</h2>
        <p style={{ color: 'var(--muted)', margin: '12px 0 20px' }}>The requested trip could not be found or you do not have permission to view it.</p>
        <Link to="/" className="btn-primary" style={{ width: 'auto', display: 'inline-flex' }}>← Return to Home</Link>
      </div>
    )
  }

  const startDateStr = new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  const endDateStr = new Date(trip.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  // Calculate totals
  const totalExpenses = (trip.expenses || []).reduce((sum, exp) => sum + Number(exp.amount || 0), 0)
  const totalActivitiesCost = (trip.stops || []).reduce((sum, stop) => {
    return sum + (stop.activities || []).reduce((aSum, act) => aSum + Number(act.estimatedCost || 0), 0)
  }, 0)
  const grandTotalCost = totalExpenses + totalActivitiesCost
  const tripBudgetNum = Number(trip.budget || 0)
  const isOverBudget = tripBudgetNum > 0 && grandTotalCost > tripBudgetNum
  const budgetPercentage = tripBudgetNum > 0 ? Math.min(Math.round((grandTotalCost / tripBudgetNum) * 100), 100) : 0

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
        <div style={{ marginBottom: '16px' }}>
          <Link to="/" style={{ fontSize: '0.875rem', color: 'var(--muted)', textDecoration: 'none' }}>
            ← Back to Dashboard
          </Link>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="alert-error" role="alert" onClick={() => setErrorMsg('')} style={{ cursor: 'pointer' }}>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert-success" role="alert" onClick={() => setSuccessMsg('')} style={{ cursor: 'pointer' }}>
            <span>{successMsg}</span>
          </div>
        )}

        {/* ── Trip Header ── */}
        <div className="form-card" style={{ marginBottom: '24px' }}>
          <div className="trip-card-header" style={{ marginBottom: '12px' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)' }}>{trip.name}</h1>
              <p style={{ color: 'var(--muted)', marginTop: '4px', fontSize: '0.9375rem' }}>
                📅 {startDateStr} – {endDateStr}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className={`trip-badge badge-${(trip.visibility || 'PRIVATE').toLowerCase()}`}>
                {trip.visibility || 'PRIVATE'}
              </span>
              {user?.id === trip.userId && (
                <button
                  type="button"
                  onClick={handleDeleteTrip}
                  className="filter-select"
                  style={{ color: 'var(--error)', borderColor: 'var(--error-border)', background: 'var(--error-bg)' }}
                >
                  Delete Trip
                </button>
              )}
            </div>
          </div>

          {trip.description && (
            <p style={{ color: 'var(--text)', fontSize: '0.875rem', margin: '8px 0 16px' }}>
              {trip.description}
            </p>
          )}

          {/* Quick Header Actions */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              className="btn-primary"
              style={{ width: 'auto', padding: '8px 16px', fontSize: '0.8125rem' }}
              onClick={() => setShowAddStopModal(true)}
            >
              + Add City Stop
            </button>

            <button
              type="button"
              className="filter-select"
              onClick={() => setShowShareModal(true)}
            >
              🤝 Share Trip
            </button>

            <button
              type="button"
              className="filter-select"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href)
                setSuccessMsg('Trip link copied to clipboard!')
              }}
            >
              🔗 Copy Link
            </button>
          </div>
        </div>

        {/* ── View Mode Tabs ── */}
        <div className="tab-navigation">
          <button
            type="button"
            className={`tab-button ${activeTab === 'itinerary' ? 'active' : ''}`}
            onClick={() => setActiveTab('itinerary')}
          >
            🗺️ Itinerary Builder (Screen 5 & 9)
          </button>
          <button
            type="button"
            className={`tab-button ${activeTab === 'budget' ? 'active' : ''}`}
            onClick={() => setActiveTab('budget')}
          >
            💰 Budget & Cost Breakdown (Feature 9)
          </button>
          <button
            type="button"
            className={`tab-button ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            📅 Calendar / Timeline (Screen 11)
          </button>
          <button
            type="button"
            className={`tab-button ${activeTab === 'share' ? 'active' : ''}`}
            onClick={() => setActiveTab('share')}
          >
            👥 Collaborators & Sharing (Screen 10)
          </button>
        </div>

        {/* ── TAB 1: ITINERARY BUILDER ── */}
        {activeTab === 'itinerary' && (
          <div>
            {trip.stops && trip.stops.length > 0 ? (
              trip.stops.map((stop, idx) => {
                const sDate = new Date(stop.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                const eDate = new Date(stop.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

                return (
                  <div key={stop.id} className="stop-card">
                    <div className="stop-header">
                      <div className="stop-city-name">
                        <span style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--primary)',
                          color: '#fff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8125rem'
                        }}>
                          {idx + 1}
                        </span>
                        <span>{stop.city?.name || 'City Stop'}</span>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 400 }}>
                          ({sDate} – {eDate})
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="filter-select"
                          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                          onClick={() => {
                            setActiveStopId(stop.id)
                            setShowAddActivityModal(true)
                          }}
                        >
                          + Add Activity
                        </button>
                        <button
                          type="button"
                          className="filter-select"
                          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                          onClick={() => {
                            setActiveStopId(stop.id)
                            setShowAddExpenseModal(true)
                          }}
                        >
                          + Add Expense
                        </button>
                      </div>
                    </div>

                    {/* Timeline of Activities */}
                    <div className="timeline-flow">
                      {stop.activities && stop.activities.length > 0 ? (
                        stop.activities.map((act) => (
                          <div key={act.id} className="timeline-item">
                            <div>
                              <div className="item-title">{act.customName || act.activity?.name || 'Scheduled Activity'}</div>
                              <div className="item-meta">
                                📅 {new Date(act.activityDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                {act.description && ` • ${act.description}`}
                              </div>
                            </div>
                            {act.estimatedCost && (
                              <div className="item-cost">
                                {trip.currency || 'INR'} {Number(act.estimatedCost).toLocaleString()}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontStyle: 'italic', padding: '8px 0' }}>
                          No activities scheduled for this stop yet. Click <strong>+ Add Activity</strong> above to schedule experiences.
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="empty-state">
                <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>No stops added to this trip yet</p>
                <p style={{ margin: '6px 0 16px', fontSize: '0.875rem' }}>Start building your itinerary by adding your first city stop!</p>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: 'auto', display: 'inline-flex' }}
                  onClick={() => setShowAddStopModal(true)}
                >
                  + Add City Stop
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: BUDGET & COST BREAKDOWN ── */}
        {activeTab === 'budget' && (
          <div>
            <div className="budget-summary-card">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px' }}>
                Trip Budget & Expense Summary
              </h2>

              <div className="form-grid" style={{ marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>Total Trip Budget</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
                    {trip.currency || 'INR'} {tripBudgetNum.toLocaleString()}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>Total Estimated Expenses</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: isOverBudget ? 'var(--error)' : 'var(--success)' }}>
                    {trip.currency || 'INR'} {grandTotalCost.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              {tripBudgetNum > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', fontWeight: 600 }}>
                    <span>Budget Utilization ({budgetPercentage}%)</span>
                    <span style={{ color: isOverBudget ? 'var(--error)' : 'var(--success)' }}>
                      {isOverBudget ? `⚠️ Over budget by ${trip.currency} ${(grandTotalCost - tripBudgetNum).toLocaleString()}` : `Remaining: ${trip.currency} ${(tripBudgetNum - grandTotalCost).toLocaleString()}`}
                    </span>
                  </div>
                  <div className="progress-bar-bg">
                    <div
                      className={`progress-bar-fill ${isOverBudget ? 'overbudget' : ''}`}
                      style={{ width: `${budgetPercentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Expenses List */}
            <div className="form-card">
              <div className="form-card-title">
                <span>Recorded Expenses</span>
                <button
                  type="button"
                  className="filter-select"
                  onClick={() => setShowAddExpenseModal(true)}
                >
                  + Add Expense
                </button>
              </div>

              {trip.expenses && trip.expenses.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {trip.expenses.map((exp) => (
                    <div key={exp.id} className="timeline-item">
                      <div>
                        <div className="item-title">{exp.description}</div>
                        <div className="item-meta">
                          Category: <strong>{exp.category}</strong> • 📅 {new Date(exp.expenseDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="item-cost">
                        {trip.currency || 'INR'} {Number(exp.amount).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No direct expenses recorded yet.</div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: CALENDAR VIEW ── */}
        {activeTab === 'calendar' && (
          <div className="form-card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>
              Itinerary Calendar ({startDateStr} – {endDateStr})
            </h2>

            <div className="calendar-grid">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="calendar-header-cell">{d}</div>
              ))}

              {Array.from({ length: 14 }).map((_, i) => {
                const dayNum = i + 1
                return (
                  <div key={i} className={`calendar-day-cell ${i < 5 ? 'active-day' : ''}`}>
                    <div style={{ fontWeight: 600 }}>{dayNum}</div>
                    {i === 1 && <div className="calendar-event-tag">Arrive at City</div>}
                    {i === 2 && <div className="calendar-event-tag">Heritage Tour</div>}
                    {i === 3 && <div className="calendar-event-tag">Food Tasting</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── TAB 4: SHARE & COLLABORATORS ── */}
        {activeTab === 'share' && (
          <div className="form-card">
            <div className="form-card-title">
              <span>Shared Collaborators</span>
              <button type="button" className="btn-primary" style={{ width: 'auto' }} onClick={() => setShowShareModal(true)}>
                + Share With Friend
              </button>
            </div>

            {trip.shares && trip.shares.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {trip.shares.map((share) => (
                  <div key={share.id} className="timeline-item">
                    <div>
                      <div className="item-title">{share.user?.username || share.user?.email}</div>
                      <div className="item-meta">Permission: {share.permission}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">This trip hasn&apos;t been shared with any specific friends yet.</div>
            )}
          </div>
        )}
      </main>

      {/* ── MODAL 1: Add City Stop ── */}
      {showAddStopModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span>Add City Stop to Trip</span>
              <button type="button" className="btn-close" onClick={() => setShowAddStopModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAddStop} noValidate>
              <div className="form-group searchable-select">
                <label className="form-label">Search City <span className="required-star">*</span></label>
                <input
                  type="text"
                  placeholder="Type city name..."
                  value={stopCitySearch}
                  onChange={(e) => {
                    setStopCitySearch(e.target.value)
                    setSelectedStopCity(null)
                  }}
                  className="form-input"
                />

                {selectedStopCity && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--success)', fontWeight: 600, marginTop: 4 }}>
                    ✓ Selected: {selectedStopCity.name}
                  </div>
                )}

                {stopCityResults.length > 0 && !selectedStopCity && (
                  <div className="select-dropdown-list">
                    {stopCityResults.map((c) => (
                      <div
                        key={c.id}
                        className="select-dropdown-item"
                        onClick={() => {
                          setSelectedStopCity(c)
                          setStopCitySearch(c.name)
                          setStopCityResults([])
                        }}
                      >
                        <span>{c.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{c.country?.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Stop Start Date <span className="required-star">*</span></label>
                  <input
                    type="date"
                    value={stopStartDate}
                    onChange={(e) => setStopStartDate(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Stop End Date <span className="required-star">*</span></label>
                  <input
                    type="date"
                    value={stopEndDate}
                    onChange={(e) => setStopEndDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Stop Budget (Optional)</label>
                <input
                  type="number"
                  placeholder="e.g. 15000"
                  value={stopBudget}
                  onChange={(e) => setStopBudget(e.target.value)}
                  className="form-input"
                />
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: 12 }}>
                Save Stop
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Add Activity ── */}
      {showAddActivityModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span>Schedule Activity</span>
              <button type="button" className="btn-close" onClick={() => setShowAddActivityModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAddActivity} noValidate>
              <div className="form-group">
                <label className="form-label">Activity Name <span className="required-star">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Eiffel Tower Visit, Scuba Diving..."
                  value={activityCustomName}
                  onChange={(e) => setActivityCustomName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Date <span className="required-star">*</span></label>
                  <input
                    type="date"
                    value={activityDate}
                    onChange={(e) => setActivityDate(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Est. Cost ({trip.currency || 'INR'})</label>
                  <input
                    type="number"
                    placeholder="e.g. 1200"
                    value={activityCost}
                    onChange={(e) => setActivityCost(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: 12 }}>
                Schedule Activity
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: Add Expense ── */}
      {showAddExpenseModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span>Record Expense</span>
              <button type="button" className="btn-close" onClick={() => setShowAddExpenseModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAddExpense} noValidate>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="form-input"
                >
                  <option value="TRANSPORT">Transport</option>
                  <option value="HOTEL">Hotel / Stay</option>
                  <option value="FOOD">Food & Meals</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description <span className="required-star">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Train ticket, Dinner at Bistro..."
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Amount ({trip.currency || 'INR'}) <span className="required-star">*</span></label>
                  <input
                    type="number"
                    placeholder="e.g. 2500"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Expense Date <span className="required-star">*</span></label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: 12 }}>
                Record Expense
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: Share Trip ── */}
      {showShareModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span>Share Trip With Friends</span>
              <button type="button" className="btn-close" onClick={() => setShowShareModal(false)}>✕</button>
            </div>

            <form onSubmit={handleShareTrip} noValidate>
              <div className="form-group">
                <label className="form-label">Friend&apos;s Email or Username <span className="required-star">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. alex@example.com or alex99"
                  value={shareIdentifier}
                  onChange={(e) => setShareIdentifier(e.target.value)}
                  className="form-input"
                />
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: 12 }}>
                Share Access
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
