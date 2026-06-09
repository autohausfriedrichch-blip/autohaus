'use client'

import { useEffect, useRef, useState } from 'react'

export interface AddressResult {
  street?: string
  postal_code?: string
  city?: string
  canton?: string
  country?: string
  lat?: number
  lng?: number
  formatted_address?: string
  validated: boolean
}

export interface AddressAutocompleteProps {
  value?: string
  onSelect: (result: AddressResult) => void
  placeholder?: string
  className?: string
  apiKey?: string
}

declare global {
  interface Window {
    google?: typeof google
    __googleMapsLoading?: boolean
    __googleMapsLoaded?: boolean
  }
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.__googleMapsLoaded) {
      resolve()
      return
    }
    if (window.__googleMapsLoading) {
      const interval = setInterval(() => {
        if (window.__googleMapsLoaded) {
          clearInterval(interval)
          resolve()
        }
      }, 100)
      return
    }
    window.__googleMapsLoading = true
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => {
      window.__googleMapsLoaded = true
      window.__googleMapsLoading = false
      resolve()
    }
    script.onerror = () => {
      window.__googleMapsLoading = false
      reject(new Error('Failed to load Google Maps script'))
    }
    document.head.appendChild(script)
  })
}

function parseAddressComponents(
  components: google.maps.GeocoderAddressComponent[]
): Omit<AddressResult, 'validated' | 'formatted_address' | 'lat' | 'lng'> {
  const get = (type: string) =>
    components.find((c) => c.types.includes(type))?.short_name ?? undefined
  const getLong = (type: string) =>
    components.find((c) => c.types.includes(type))?.long_name ?? undefined

  const streetNumber = getLong('street_number') ?? ''
  const route = getLong('route') ?? ''
  const street = [route, streetNumber].filter(Boolean).join(' ') || undefined

  return {
    street,
    postal_code: getLong('postal_code'),
    city: getLong('locality') ?? getLong('postal_town'),
    canton: get('administrative_area_level_1'),
    country: getLong('country'),
  }
}

export default function AddressAutocomplete({
  value = '',
  onSelect,
  placeholder = 'Adresse eingeben…',
  className = '',
  apiKey,
}: AddressAutocompleteProps) {
  const resolvedKey = apiKey ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ''
  const [inputValue, setInputValue] = useState(value)
  const [validated, setValidated] = useState<boolean | null>(null)
  const [scriptReady, setScriptReady] = useState(false)
  const [scriptError, setScriptError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const listenerRef = useRef<google.maps.MapsEventListener | null>(null)

  useEffect(() => {
    if (!resolvedKey) return
    loadGoogleMapsScript(resolvedKey)
      .then(() => setScriptReady(true))
      .catch(() => setScriptError(true))
  }, [resolvedKey])

  useEffect(() => {
    if (!scriptReady || !inputRef.current) return

    autocompleteRef.current = new window.google!.maps.places.Autocomplete(
      inputRef.current,
      {
        types: ['address'],
        componentRestrictions: { country: 'ch' },
        fields: ['address_components', 'formatted_address', 'geometry'],
      }
    )

    listenerRef.current = autocompleteRef.current.addListener(
      'place_changed',
      () => {
        const place = autocompleteRef.current!.getPlace()
        if (!place.address_components) return

        const parsed = parseAddressComponents(place.address_components)
        const lat = place.geometry?.location?.lat()
        const lng = place.geometry?.location?.lng()

        const result: AddressResult = {
          ...parsed,
          lat,
          lng,
          formatted_address: place.formatted_address,
          validated: true,
        }

        setInputValue(place.formatted_address ?? '')
        setValidated(true)
        onSelect(result)
      }
    )

    return () => {
      if (listenerRef.current) {
        window.google?.maps.event.removeListener(listenerRef.current)
      }
    }
  }, [scriptReady, onSelect])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    setValidated(false)
  }

  const handleBlur = () => {
    if (validated === false && inputValue.trim()) {
      onSelect({
        formatted_address: inputValue,
        validated: false,
      })
    }
  }

  const noKey = !resolvedKey || scriptError

  return (
    <div className={`relative flex flex-col gap-1 ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoComplete="off"
        />
      </div>

      {noKey && (
        <span className="inline-flex w-fit items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
          Google Places nem elérhető – manuális bevitel
        </span>
      )}

      {!noKey && validated === true && (
        <span className="inline-flex w-fit items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
          Google által validált ✓
        </span>
      )}

      {!noKey && validated === false && inputValue.trim() && (
        <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
          Manuálisan rögzített
        </span>
      )}
    </div>
  )
}
