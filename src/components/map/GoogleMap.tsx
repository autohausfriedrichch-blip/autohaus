'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
// Google Maps JS API betöltő

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MapMarker {
  id: string
  lat: number
  lng: number
  title: string
  type: 'karl' | 'stop' | 'base'
  label?: string
  info?: string
}

interface GoogleMapProps {
  markers?: MapMarker[]
  center?: { lat: number; lng: number }
  zoom?: number
  className?: string
  onMarkerClick?: (id: string) => void
  routeWaypoints?: { lat: number; lng: number }[]
  showRoute?: boolean
}

// Autohaus Friedrich Zürich közelében
const DEFAULT_CENTER = { lat: 47.3769, lng: 8.5417 }

let loaderPromise: Promise<typeof google> | null = null

function getLoader() {
  if (!loaderPromise) {
    loaderPromise = new Promise<typeof google>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places,geometry&v=weekly`
      script.async = true
      script.onload = () => resolve(window.google)
      script.onerror = reject
      document.head.appendChild(script)
    })
  }
  return loaderPromise
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GoogleMap({
  markers = [],
  center,
  zoom = 11,
  className = '',
  onMarkerClick,
  routeWaypoints = [],
  showRoute = false,
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map())
  const routeRenderer = useRef<google.maps.DirectionsRenderer | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      setError('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY nincs beállítva')
      return
    }

    getLoader()
      .then(() => {
        if (!mapRef.current || !window.google) return
        const map = new google.maps.Map(mapRef.current, {
          center: center || DEFAULT_CENTER,
          zoom,
          styles: MAP_STYLE,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        })
        mapInstance.current = map
        routeRenderer.current = new google.maps.DirectionsRenderer({
          suppressMarkers: true,
          polylineOptions: { strokeColor: '#C8102E', strokeWeight: 4 },
        })
        routeRenderer.current.setMap(map)
        setLoaded(true)
      })
      .catch(e => setError(e.message))
  }, [])

  // Update markers
  useEffect(() => {
    if (!loaded || !mapInstance.current) return

    // Remove old markers not in new list
    const newIds = new Set(markers.map(m => m.id))
    markersRef.current.forEach((marker, id) => {
      if (!newIds.has(id)) { marker.setMap(null); markersRef.current.delete(id) }
    })

    // Add/update markers
    markers.forEach(m => {
      const icon = markerIcon(m.type, m.label)
      if (markersRef.current.has(m.id)) {
        const existing = markersRef.current.get(m.id)!
        existing.setPosition({ lat: m.lat, lng: m.lng })
        existing.setIcon(icon)
        return
      }
      const marker = new google.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map: mapInstance.current!,
        title: m.title,
        icon,
        animation: m.type === 'karl' ? google.maps.Animation.BOUNCE : undefined,
      })

      if (m.info) {
        const infoWindow = new google.maps.InfoWindow({ content: `<div style="font-size:13px;padding:4px 8px;font-family:sans-serif"><strong>${m.title}</strong><br/>${m.info}</div>` })
        marker.addListener('click', () => {
          infoWindow.open(mapInstance.current!, marker)
          onMarkerClick?.(m.id)
        })
      } else if (onMarkerClick) {
        marker.addListener('click', () => onMarkerClick(m.id))
      }
      markersRef.current.set(m.id, marker)
    })

    // Pan to Karl if present
    const karl = markers.find(m => m.type === 'karl')
    if (karl && mapInstance.current) {
      mapInstance.current.panTo({ lat: karl.lat, lng: karl.lng })
    }
  }, [loaded, markers])

  // Draw route
  useEffect(() => {
    if (!loaded || !showRoute || routeWaypoints.length < 2 || !routeRenderer.current) return
    const directionsService = new google.maps.DirectionsService()
    const origin = routeWaypoints[0]
    const destination = routeWaypoints[routeWaypoints.length - 1]
    const waypoints = routeWaypoints.slice(1, -1).map(p => ({ location: p, stopover: true }))

    directionsService.route(
      { origin, destination, waypoints, travelMode: google.maps.TravelMode.DRIVING },
      (result, status) => {
        if (status === 'OK' && result) routeRenderer.current!.setDirections(result)
      }
    )
  }, [loaded, showRoute, routeWaypoints])

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-[#f0f2f5] rounded-xl text-[12px] text-[#4a4a4a] ${className}`}>
        Google Maps hiba: {error}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="w-full h-full rounded-xl overflow-hidden" />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#f0f2f5] rounded-xl">
          <div className="text-[12px] text-[#4a4a4a]">Térkép betöltése...</div>
        </div>
      )}
    </div>
  )
}

// ─── Address Autocomplete ─────────────────────────────────────────────────────

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string, lat?: number, lng?: number) => void
  placeholder?: string
  className?: string
}

export function AddressAutocomplete({ value, onChange, placeholder, className }: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || !inputRef.current) return
    getLoader().then(() => {
      if (!inputRef.current || !window.google) return
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'CH' },
        fields: ['formatted_address', 'geometry'],
      })
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current!.getPlace()
        if (place.formatted_address) {
          const lat = place.geometry?.location?.lat()
          const lng = place.geometry?.location?.lng()
          onChange(place.formatted_address, lat, lng)
        }
      })
    })
  }, [])

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || 'Cím keresése...'}
      className={`w-full border border-[#e0e4e8] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C8102E] ${className || ''}`}
    />
  )
}

// ─── Marker icons ─────────────────────────────────────────────────────────────

function markerIcon(type: MapMarker['type'], label?: string): google.maps.Symbol | google.maps.Icon {
  if (type === 'karl') {
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="#0D0D0D" stroke="#C8102E" stroke-width="3"/>
          <text x="20" y="25" text-anchor="middle" font-size="16" fill="#C8102E">🔧</text>
        </svg>
      `)}`,
      scaledSize: new google.maps.Size(40, 40),
      anchor: new google.maps.Point(20, 20),
    }
  }
  if (type === 'base') {
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="16" fill="#C8102E" stroke="#0D0D0D" stroke-width="2"/>
          <text x="18" y="23" text-anchor="middle" font-size="14" fill="#0D0D0D">🏠</text>
        </svg>
      `)}`,
      scaledSize: new google.maps.Size(36, 36),
      anchor: new google.maps.Point(18, 18),
    }
  }
  // stop with number label
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 24 16 24s16-14 16-24C32 7.163 24.837 0 16 0z" fill="#1a3a6e"/>
        <circle cx="16" cy="16" r="10" fill="white"/>
        <text x="16" y="21" text-anchor="middle" font-size="12" font-weight="bold" fill="#0D0D0D">${label || '●'}</text>
      </svg>
    `)}`,
    scaledSize: new google.maps.Size(32, 40),
    anchor: new google.maps.Point(16, 40),
  }
}

// ─── Map style ────────────────────────────────────────────────────────────────

const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9dce8' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f0f4f0' }] },
]
