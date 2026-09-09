import { useState, useRef, useEffect } from 'react'
import './index.css'

// ─── API ────────────────────────────────────────────────────────
const API_BASE = '/api'

async function fetchCities() {
  const res = await fetch(`${API_BASE}/cities`)
  const data = await res.json()
  return data.cities || []
}

async function searchRestaurants({ query, city, history }) {
  const res = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, city, top_k: 5, history })
  })
  if (!res.ok) throw new Error('Search failed')
  return res.json()
}

// ─── STAR RATING ────────────────────────────────────────────────
function Stars({ rating }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width="12" height="12" viewBox="0 0 12 12" fill="none">
          <polygon
            points="6,1 7.5,4.5 11,4.8 8.5,7 9.3,10.5 6,8.5 2.7,10.5 3.5,7 1,4.8 4.5,4.5"
            fill={i <= Math.round(rating) ? 'var(--accent)' : 'var(--border-accent)'}
          />
        </svg>
      ))}
    </div>
  )
}

// ─── RESTAURANT CARD ────────────────────────────────────────────
function RestaurantCard({ chunk, index }) {
  const delayClass = `fade-up fade-up-delay-${Math.min(index + 1, 5)}`
  return (
    <div
      className={delayClass}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '20px 24px',
        transition: 'border-color 0.2s, background 0.2s',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--border-accent)'
        e.currentTarget.style.background = 'var(--bg-card-hover)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.background = 'var(--bg-card)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
            {chunk.name}
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: '500', marginBottom: '8px', letterSpacing: '0.03em' }}>
            {chunk.categories}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            📍 {chunk.address}
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '20px', fontFamily: 'Playfair Display, serif', color: 'var(--text-primary)', fontWeight: '700' }}>
            {chunk.stars}
          </div>
          <Stars rating={chunk.stars} />
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {chunk.review_count.toLocaleString()} reviews
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── AI SUMMARY CARD ────────────────────────────────────────────
function SummaryCard({ summary }) {
  return (
    <div
      className="fade-up"
      style={{
        background: 'linear-gradient(135deg, #1e1a14 0%, #211c14 100%)',
        border: '1px solid var(--accent-muted)',
        borderRadius: '14px',
        padding: '20px 24px',
        marginBottom: '24px',
        animation: 'pulse-glow 3s ease-in-out infinite',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)'
        }} />
        <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          EatGood AI
        </span>
      </div>
      <p style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: '1.65', fontStyle: 'italic' }}>
        {summary}
      </p>
    </div>
  )
}

// ─── SKELETON LOADER ────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '20px 24px',
    }}>
      <div className="skeleton" style={{ height: '16px', width: '55%', marginBottom: '8px' }} />
      <div className="skeleton" style={{ height: '12px', width: '35%', marginBottom: '12px' }} />
      <div className="skeleton" style={{ height: '13px', width: '70%' }} />
    </div>
  )
}

// ─── MAIN APP ────────────────────────────────────────────────────
export default function App() {
  const [cities, setCities] = useState([])
  const [city, setCity] = useState('philadelphia')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])
  const inputRef = useRef(null)

  useEffect(() => {
    fetchCities().then(c => {
      setCities(c)
      if (c.length > 0) setCity(c[0])
    })
    inputRef.current?.focus()
  }, [])

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError('')

    try {
      const data = await searchRestaurants({ query, city, history })
      setResults(data.results)
      setSummary(data.summary || '')
      setHistory(prev => [...prev, query])
    } catch (err) {
      setError('Something went wrong. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  function handleNewSearch() {
    setResults(null)
    setSummary('')
    setHistory([])
    setQuery('')
    setError('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>

      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '18px 0',
        background: 'var(--bg-primary)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>🍽️</span>
            <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              EatGood <span style={{ color: 'var(--accent)' }}>AI</span>
            </h1>
          </div>
          {results && (
            <button
              onClick={handleNewSearch}
              style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '6px 14px',
                cursor: 'pointer',
                transition: 'color 0.2s, border-color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-accent)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              New search
            </button>
          )}
        </div>
      </header>

      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '0 24px 80px' }}>

        {/* Hero — only shown before first search */}
        {!results && !loading && (
          <div className="fade-up" style={{ textAlign: 'center', padding: '64px 0 48px' }}>
            <h2 style={{ fontSize: '42px', fontWeight: '700', lineHeight: '1.15', color: 'var(--text-primary)', marginBottom: '16px', letterSpacing: '-0.02em' }}>
              Find your next<br />
              <span style={{ color: 'var(--accent)' }}>great meal.</span>
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
              Describe what you're in the mood for. No filters. Just tell us what you want.
            </p>
          </div>
        )}

        {/* Search Form */}
        <div style={{ position: 'sticky', top: '65px', zIndex: 9, paddingTop: results ? '24px' : '0', paddingBottom: '8px', background: 'var(--bg-primary)' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* City selector */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                value={city}
                onChange={e => setCity(e.target.value)}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  outline: 'none',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                {cities.map(c => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>

              {history.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {history.slice(-2).map((h, i) => (
                    <span key={i} style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '20px',
                      padding: '3px 10px',
                    }}>
                      {h}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Search input */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={history.length > 0 ? 'Refine your search... "something cheaper?"' : 'Romantic Italian, not too expensive...'}
                style={{
                  flex: 1,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  color: 'var(--text-primary)',
                  fontSize: '15px',
                  padding: '14px 18px',
                  outline: 'none',
                  fontFamily: 'DM Sans, sans-serif',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-muted)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                style={{
                  background: loading || !query.trim() ? 'var(--bg-card)' : 'var(--accent)',
                  color: loading || !query.trim() ? 'var(--text-muted)' : '#0f0e0d',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s, color 0.2s',
                  fontFamily: 'DM Sans, sans-serif',
                  whiteSpace: 'nowrap',
                }}
              >
                {loading ? 'Searching...' : 'Find →'}
              </button>
            </div>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginTop: '24px',
            padding: '14px 18px',
            background: '#1f1212',
            border: '1px solid #3d1f1f',
            borderRadius: '10px',
            color: '#e07070',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="skeleton" style={{ height: '80px', borderRadius: '14px', marginBottom: '12px' }} />
            {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Results */}
        {!loading && results && (
          <div style={{ marginTop: '32px' }}>

            {/* Summary */}
            {summary && <SummaryCard summary={summary} />}

            {/* Result count */}
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {results.length} restaurants found
            </p>

            {/* Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {results.map((chunk, i) => (
                <RestaurantCard key={i} chunk={chunk} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Empty suggestions — shown before first search */}
        {!results && !loading && (
          <div className="fade-up fade-up-delay-2" style={{ marginTop: '40px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Try asking
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {[
                'Best late night tacos',
                'Romantic and quiet, not too pricey',
                'Artsy vibe, outdoor seating',
                'Quick lunch near downtown',
                'Hidden gem with great reviews',
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => setQuery(suggestion)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '20px',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    transition: 'color 0.2s, border-color 0.2s',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--accent-muted)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
