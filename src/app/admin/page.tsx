'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { ToastProvider } from '@/components/ui/toast'
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
import GaragePage from '@/components/garage/GaragePage'
import PickupDeliveryPage from '@/components/pickup/PickupDeliveryPage'
import TechnicianPage from '@/components/technician/TechnicianPage'
import { TasksPage } from '@/components/tasks/TasksPage'
import { PartsPage } from '@/components/parts/PartsPage'
import { SettingsPage } from '@/components/settings/SettingsPage'
import { VehicleLifecyclePage } from '@/components/vehicles/VehicleLifecyclePage'
import { RemindersPage } from '@/components/reminders/RemindersPage'
import { ProfitPage } from '@/components/profit/ProfitPage'
import { PartsInventoryPage } from '@/components/parts/PartsInventoryPage'
import { RoutePlannerPage } from '@/components/route/RoutePlannerPage'
import { CustomerValuePage } from '@/components/customers/CustomerValuePage'
import { CEODashboardPage } from '@/components/dashboard/CEODashboardPage'
import { RegistrationScanPage } from '@/components/registration/RegistrationScanPage'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { WorkOrderDetail } from '@/components/workorders/WorkOrderDetail'
import type { Profile } from '@/lib/types'
import { useRouter } from 'next/navigation'

const PAGE_TITLES: Record<string, string> = {
  ceo_dashboard: 'CEO Operations Dashboard',
  registration_scan: 'Forgalmi beolvasás – OCR',
  vehicle_lifecycle: 'Jármű élettörténet',
  reminders: 'Szerviz emlékeztetők',
  profit: 'Profit & Költségkezelés',
  parts_inventory: 'Alkatrész raktár',
  route_planner: 'Útvonaltervező',
  customer_value: 'Ügyfélerték Dashboard',
  dashboard: 'Dashboard',
  customers: 'Ügyfelek',
  vehicles: 'Járművek',
  workorders: 'Munkalapok',
  bookings: 'Foglalások',
  checkin: 'Check-In / Check-Out',
  mobile: 'Mobil Szerviz',
  garage: 'Garázs / Műhely',
  pickup: 'Hozom-Viszem',
  quotes: 'Árajánlatok',
  photos: 'Fotódokumentáció',
  communication: 'Kommunikáció',
  fleet: 'Flotta / Cégek',
  services: 'Szolgáltatások & Árak',
  reports: 'KPI / Riportok',
  technician: 'Az én munkáim',
  tasks: 'Feladatok',
  parts: 'Alkatrész igénylés',
  parts_admin: 'Alkatrészek',
  settings: 'Beállítások',
  reviews: 'Review kérések',
}

function AdminApp() {
  const [activePage, setActivePage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [badges, setBadges] = useState<Record<string, number>>({})
  const [refreshKey, setRefreshKey] = useState(0)
  const [openWorkOrderId, setOpenWorkOrderId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/login'); return }
      supabase.from('profiles').select('*').eq('id', data.user.id).single()
        .then(({ data: p }) => {
          if (p) {
            setProfile(p)
            // Mechanics default to their own dashboard
            if (p.role === 'mechanic') setActivePage('technician')
          }
        })
    })
  }, [])

  const loadBadges = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]
    const [bookings, workorders, quotes, tasks, parts] = await Promise.all([
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('scheduled_date', today).eq('status', 'confirmed'),
      supabase.from('work_orders').select('id', { count: 'exact', head: true }).not('status', 'in', '(delivered,closed)'),
      supabase.from('quotes').select('id', { count: 'exact', head: true }).eq('status', 'sent'),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('parts_requests').select('id', { count: 'exact', head: true }).eq('status', 'searching'),
    ])
    setBadges({
      today: bookings.count || 0,
      open: workorders.count || 0,
      quotes: quotes.count || 0,
      tasks: tasks.count || 0,
      parts: parts.count || 0,
    })
  }, [])

  useEffect(() => { loadBadges() }, [loadBadges, refreshKey])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin – Barbara',
    mechanic: 'Szerelő – Karl',
    customer: 'Ügyfél',
  }

  const pageTitle = PAGE_TITLES[activePage] || activePage

  const renderPage = () => {
    const props = { refreshKey, onRefresh: () => setRefreshKey(k => k + 1) }
    switch (activePage) {
      case 'dashboard':   return <DashboardPage {...props} onNavigate={(page, id) => { if (id) setOpenWorkOrderId(id); setActivePage(page) }} />
      case 'customers':   return <CustomersPage {...props} />
      case 'vehicles':    return <VehiclesPage {...props} />
      case 'workorders':  return <WorkOrdersPage {...props} profile={profile} />
      case 'bookings':    return <BookingsPage {...props} />
      case 'quotes':      return <QuotesPage {...props} />
      case 'communication': return <CommunicationPage {...props} />
      case 'services':    return <ServicesPage {...props} />
      case 'reports':     return <ReportsPage {...props} />
      case 'checkin':     return <CheckInPage {...props} />
      case 'photos':      return <PhotosPage {...props} />
      case 'mobile':      return <MobilePage {...props} />
      case 'fleet':       return <FleetPage {...props} />
      case 'garage':      return <GaragePage {...props} profile={profile} />
      case 'pickup':      return <PickupDeliveryPage {...props} />
      case 'technician':  return <TechnicianPage {...props} profile={profile} />
      case 'tasks':       return <TasksPage {...props} />
      case 'parts':
      case 'parts_admin':      return <PartsPage {...props} />
      case 'settings':         return <SettingsPage {...props} />
      case 'vehicle_lifecycle': return <VehicleLifecyclePage {...props} />
      case 'reminders':        return <RemindersPage {...props} />
      case 'profit':           return <ProfitPage {...props} />
      case 'parts_inventory':  return <PartsInventoryPage {...props} />
      case 'route_planner':    return <RoutePlannerPage {...props} />
      case 'customer_value':   return <CustomerValuePage {...props} />
      case 'ceo_dashboard':       return <CEODashboardPage {...props} />
      case 'registration_scan':  return <RegistrationScanPage {...props} />
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
        userRole={profile ? roleLabels[profile.role] || profile.role : ''}
        userRoleKey={profile?.role}
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
        <main className="flex-1 overflow-y-auto p-5 pb-24 md:pb-5 animate-fade-in touch-scroll">
          {renderPage()}
        </main>
        <MobileBottomNav
          activePage={activePage}
          onNavigate={setActivePage}
          role={profile?.role}
          badges={badges}
        />
      </div>
      {openWorkOrderId && profile && (
        <WorkOrderDetail
          workOrderId={openWorkOrderId}
          profile={{ id: profile.id || '', full_name: profile.full_name || 'Ismeretlen', role: profile.role || 'mechanic' }}
          onClose={() => { setOpenWorkOrderId(null); setRefreshKey(k => k + 1) }}
        />
      )}
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
