'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { DashboardPage } from '@/components/dashboard/DashboardPage'
import { CustomersPage } from '@/components/customers/CustomersPage'
import { VehiclesPage } from '@/components/vehicles/VehiclesPage'
import { WorkOrdersPage } from '@/components/workorders/WorkOrdersPage'
import { BookingsPage } from '@/components/bookings/BookingsPage'
import { QuotesPage } from '@/components/quotes/QuotesPage'
import { CommunicationPage } from '@/components/communication/CommunicationPage'
import { ServicesPage } from '@/components/services/ServicesPage'
import { ReportsPage } from '@/components/reports/ReportsPage'
import { CheckInPage } from '@/components/checkin/CheckInPage'
import { PhotosPage } from '@/components/photos/PhotosPage'
import { MobilePage } from '@/components/mobile/MobilePage'
import { FleetPage } from '@/components/fleet/FleetPage'
import type { Profile } from '@/lib/types'
import { useRouter } from 'next/navigation'

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  calendar: 'Kalender',
  customers: 'Kunden',
  vehicles: 'Fahrzeuge',
  workorders: 'Munkalapok',
  bookings: 'Foglalások',
  checkin: 'Check-In / Check-Out',
  mobile: 'Mobil Reifen',
  detailing: 'Detailing',
  garage: 'Garázs Szerviz',
  pickup: 'Hozom-Viszem',
  quotes: 'Árajánlatok',
  photos: 'Fotódokumentáció',
  communication: 'WhatsApp Napló',
  fleet: 'Flotta / Cégek',
  services: 'Szolgáltatások & Árak',
  reports: 'Berichte & KPIs',
  settings: 'Beállítások',
}

function AdminApp() {
  const [activePage, setActivePage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [badges, setBadges] = useState<Record<string, number>>({})
  const [refreshKey, setRefreshKey] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/login'); return }
      supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()
        .then(({ data: p }) => { if (p) setProfile(p) })
    })
  }, [])

  const loadBadges = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]
    const [bookings, workorders, quotes] = await Promise.all([
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('scheduled_date', today).eq('status', 'confirmed'),
      supabase.from('work_orders').select('id', { count: 'exact', head: true }).not('status', 'in', '(delivered,closed)'),
      supabase.from('quotes').select('id', { count: 'exact', head: true }).eq('status', 'sent'),
    ])
    setBadges({
      today: bookings.count || 0,
      open: workorders.count || 0,
      quotes: quotes.count || 0,
    })
  }, [])

  useEffect(() => { loadBadges() }, [loadBadges, refreshKey])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    mechanic: 'Szerelő',
    customer: 'Ügyfél',
  }

  const pageTitle = PAGE_TITLES[activePage] || activePage

  const renderPage = () => {
    const props = { refreshKey, onRefresh: () => setRefreshKey(k => k + 1) }
    switch (activePage) {
      case 'dashboard': return <DashboardPage {...props} onNavigate={setActivePage} />
      case 'customers': return <CustomersPage {...props} />
      case 'vehicles': return <VehiclesPage {...props} />
      case 'workorders': return <WorkOrdersPage {...props} />
      case 'bookings': return <BookingsPage {...props} />
      case 'quotes': return <QuotesPage {...props} />
      case 'communication': return <CommunicationPage {...props} />
      case 'services': return <ServicesPage {...props} />
      case 'reports': return <ReportsPage {...props} />
      case 'checkin': return <CheckInPage {...props} />
      case 'photos': return <PhotosPage {...props} />
      case 'mobile': return <MobilePage {...props} />
      case 'fleet': return <FleetPage {...props} />
      default: return (
        <div className="flex flex-col items-center justify-center h-64 text-[#5a6a80]">
          <p className="text-lg font-medium">{pageTitle}</p>
          <p className="text-sm mt-1">Oldal hamarosan elérhető</p>
        </div>
      )
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        onLogout={handleLogout}
        userName={profile?.full_name}
        userRole={profile ? roleLabels[profile.role] : ''}
        userInitials={initials}
        badges={badges}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar
          title={pageTitle}
          onMenuClick={() => setSidebarOpen(true)}
          onRefresh={() => setRefreshKey(k => k + 1)}
        />
        <main className="flex-1 overflow-y-auto p-5 pb-20 md:pb-5 animate-fade-in">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <ToastProvider>
      <AdminApp />
    </ToastProvider>
  )
}
