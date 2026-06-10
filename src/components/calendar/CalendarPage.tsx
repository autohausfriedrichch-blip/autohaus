'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, ChevronLeft, ChevronRight, Clock, User, Car } from 'lucide-react'

interface Props {
  onNavigate?: (page: string, id?: string) => void
  refreshKey?: number
  onRefresh?: () => void
  profile?: any
}

const DAYS_HU = ['H', 'K', 'Sze', 'Cs', 'P', 'Sz', 'V']
const MONTHS_HU = ['Január', 'Február', 'Március', 'Április', 'Május', 'Június',
  'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December']

export function CalendarPage({ onNavigate }: Props) {
  const supabase = createClient()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [bookings, setBookings] = useState<any[]>([])
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate())

  useEffect(() => { loadBookings() }, [year, month])

  async function loadBookings() {
    const from = new Date(year, month, 1).toISOString()
    const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
    const { data } = await supabase
      .from('bookings')
      .select(`id, scheduled_at, service_type, status, customer:customers(full_name), vehicle:vehicles(make, model, license_plate)`)
      .gte('scheduled_at', from)
      .lte('scheduled_at', to)
      .order('scheduled_at')
    setBookings(data || [])
  }

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const firstDay = new Date(year, month, 1).getDay()
  const offset = (firstDay + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const bookingsByDay: Record<number, any[]> = {}
  for (const b of bookings) {
    const d = new Date(b.scheduled_at).getDate()
    if (!bookingsByDay[d]) bookingsByDay[d] = []
    bookingsByDay[d].push(b)
  }

  const selectedBookings = selectedDay ? (bookingsByDay[selectedDay] || []) : []

  const statusColor: Record<string, string> = {
    pending: 'bg-amber-400',
    confirmed: 'bg-blue-400',
    completed: 'bg-green-400',
    cancelled: 'bg-red-400',
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Calendar size={22} className="text-[#C9A84C]" />
        <h1 className="text-xl font-semibold text-[#1a2942]">Naptár</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#e8ecf0] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8ecf0]">
            <button onClick={prevMonth} className="p-1.5 hover:bg-[#f0f2f5] rounded-lg transition-colors">
              <ChevronLeft size={16} />
            </button>
            <h2 className="text-base font-semibold text-[#1a2942]">{MONTHS_HU[month]} {year}</h2>
            <button onClick={nextMonth} className="p-1.5 hover:bg-[#f0f2f5] rounded-lg transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-7 mb-2">
              {DAYS_HU.map(d => (
                <div key={d} className="text-center text-[11px] font-semibold text-[#9aabb8] py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
                const isSelected = day === selectedDay
                const dayBookings = bookingsByDay[day] || []
                return (
                  <button key={day} onClick={() => setSelectedDay(day)}
                    className={`aspect-square flex flex-col items-center justify-start pt-1.5 rounded-lg text-[13px] font-medium transition-all relative ${
                      isSelected ? 'bg-[#0B1E3D] text-white' :
                      isToday ? 'bg-[rgba(201,168,76,0.15)] text-[#C9A84C]' :
                      'hover:bg-[#f0f2f5] text-[#1a2942]'
                    }`}>
                    {day}
                    {dayBookings.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                        {dayBookings.slice(0, 3).map((b, bi) => (
                          <span key={bi} className={`w-1.5 h-1.5 rounded-full ${statusColor[b.status] || 'bg-gray-400'}`} />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Day view */}
        <div className="bg-white rounded-xl border border-[#e8ecf0] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#e8ecf0] bg-[#f8f9fb]">
            <h3 className="text-sm font-semibold text-[#1a2942]">
              {selectedDay ? `${MONTHS_HU[month]} ${selectedDay}.` : 'Válasszon napot'}
            </h3>
          </div>
          {selectedBookings.length === 0 ? (
            <div className="p-4 text-[12px] text-[#9aabb8] text-center mt-4">Nincs foglalás ezen a napon</div>
          ) : (
            <div className="divide-y divide-[#f0f2f5]">
              {selectedBookings.map(b => (
                <div key={b.id} className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={12} className="text-[#9aabb8]" />
                    <span className="text-[12px] font-medium text-[#1a2942]">
                      {new Date(b.scheduled_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full text-white ${statusColor[b.status] || 'bg-gray-400'}`}>
                      {b.status}
                    </span>
                  </div>
                  <div className="text-[12px] font-semibold text-[#1a2942] mb-0.5">{b.service_type}</div>
                  {b.customer && (
                    <div className="flex items-center gap-1 text-[11px] text-[#5a6a80]">
                      <User size={10} /> {b.customer.full_name}
                    </div>
                  )}
                  {b.vehicle && (
                    <div className="flex items-center gap-1 text-[11px] text-[#5a6a80]">
                      <Car size={10} /> {b.vehicle.make} {b.vehicle.model} · {b.vehicle.license_plate}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
