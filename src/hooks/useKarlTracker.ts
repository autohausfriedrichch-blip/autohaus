'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface KarlPosition {
  lat: number
  lng: number
  accuracy?: number
  heading?: number
  speed?: number
  updatedAt: Date
}

// Karl telefonján fut – 30mp-enként küldi a pozíciót
export function useKarlTracker(mechanicId: string | undefined, active = true) {
  const supabase = createClient()
  const watchId = useRef<number | null>(null)
  const [position, setPosition] = useState<KarlPosition | null>(null)
  const [error, setError] = useState<string>('')
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    if (!active || !mechanicId || typeof navigator === 'undefined') return
    if (!navigator.geolocation) { setError('GPS nem elérhető'); return }

    setSharing(true)

    const send = async (coords: GeolocationCoordinates) => {
      const pos: KarlPosition = {
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy: coords.accuracy,
        heading: coords.heading ?? undefined,
        speed: coords.speed ?? undefined,
        updatedAt: new Date(),
      }
      setPosition(pos)
      await supabase.from('mechanic_locations').upsert({
        mechanic_id: mechanicId,
        lat: pos.lat,
        lng: pos.lng,
        accuracy: pos.accuracy,
        heading: pos.heading,
        speed: pos.speed,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'mechanic_id' })
    }

    watchId.current = navigator.geolocation.watchPosition(
      pos => send(pos.coords),
      err => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
    )

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
      setSharing(false)
    }
  }, [mechanicId, active])

  return { position, error, sharing }
}

// Barbara oldalán fut – figyeli Karl pozícióját valós időben
export function useKarlPositionWatcher() {
  const supabase = createClient()
  const [positions, setPositions] = useState<Record<string, KarlPosition & { name: string }>>({})

  useEffect(() => {
    // Kezdeti betöltés
    supabase
      .from('mechanic_locations')
      .select('*, mechanic:profiles(full_name)')
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, KarlPosition & { name: string }> = {}
        data.forEach((r: any) => {
          map[r.mechanic_id] = {
            lat: r.lat, lng: r.lng,
            accuracy: r.accuracy, heading: r.heading, speed: r.speed,
            updatedAt: new Date(r.updated_at),
            name: r.mechanic?.full_name || 'Szerelő',
          }
        })
        setPositions(map)
      })

    // Realtime frissítés
    const channel = supabase
      .channel('karl-location')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mechanic_locations' }, payload => {
        const r = payload.new as any
        if (!r) return
        setPositions(prev => ({
          ...prev,
          [r.mechanic_id]: {
            ...prev[r.mechanic_id],
            lat: r.lat, lng: r.lng,
            accuracy: r.accuracy, heading: r.heading, speed: r.speed,
            updatedAt: new Date(r.updated_at),
          },
        }))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return positions
}
