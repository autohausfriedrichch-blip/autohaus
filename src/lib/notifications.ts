import { createClient } from '@/lib/supabase/client'

export type NotifType =
  | 'workorder_assigned' | 'workorder_status' | 'workorder_started' | 'workorder_checkin'
  | 'workorder_repair_done' | 'workorder_qc_done' | 'workorder_returned' | 'workorder_closed'
  | 'photo_uploaded' | 'photo_checkin' | 'photo_checkout'
  | 'task_assigned' | 'task_done' | 'task_delayed' | 'task_problem'
  | 'quote_created' | 'quote_sent' | 'quote_accepted' | 'quote_rejected' | 'quote_expired'
  | 'message_whatsapp' | 'message_email' | 'message_reply' | 'callback_due'
  | 'parts_requested' | 'parts_ordered' | 'parts_arrived' | 'parts_delayed'
  | 'calendar_upcoming' | 'pickup_starting' | 'mobile_upcoming' | 'schedule_conflict'
  | 'qc_needed' | 'qc_failed' | 'qc_approved'
  | 'signature_waiting' | 'signature_done' | 'signature_rejected' | 'signature_expired'
  | 'system'

export type NotifPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface CreateNotifPayload {
  title: string
  message?: string
  type: NotifType
  priority?: NotifPriority
  recipientId?: string
  recipientRole?: 'admin' | 'mechanic' | 'customer' | 'all'
  customerId?: string
  vehicleId?: string
  workOrderId?: string
  quoteId?: string
  actionLabel?: string
  actionType?: string
  actionId?: string
  createdBy?: string
}

export async function createNotification(payload: CreateNotifPayload) {
  const supabase = createClient()
  await supabase.from('notifications').insert({
    title: payload.title,
    message: payload.message || null,
    type: payload.type,
    priority: payload.priority || 'normal',
    recipient_id: payload.recipientId || null,
    recipient_role: payload.recipientRole || null,
    customer_id: payload.customerId || null,
    vehicle_id: payload.vehicleId || null,
    work_order_id: payload.workOrderId || null,
    quote_id: payload.quoteId || null,
    action_label: payload.actionLabel || null,
    action_type: payload.actionType || null,
    action_id: payload.actionId || null,
    created_by: payload.createdBy || null,
    is_read: false,
  })
}

// Convenience wrappers for common events
export async function notifyPhotoUploaded(opts: {
  workOrderId: string; orderNumber: string; uploaderName: string; recipientId?: string
}) {
  await createNotification({
    title: 'Új fotó feltöltve',
    message: `${opts.uploaderName} fotót töltött fel a ${opts.orderNumber} munkalaphoz.`,
    type: 'photo_uploaded',
    priority: 'normal',
    recipientRole: 'admin',
    workOrderId: opts.workOrderId,
    actionLabel: 'Munkalap megnyitása',
    actionType: 'open_workorder',
    actionId: opts.workOrderId,
    createdBy: opts.uploaderName,
  })
}

export async function notifyWorkOrderAssigned(opts: {
  workOrderId: string; orderNumber: string; vehicleLabel: string
  recipientId: string; assignedBy: string
}) {
  await createNotification({
    title: 'Új munkalap kiosztva',
    message: `Új munkalapot kaptál: ${opts.vehicleLabel} – ${opts.orderNumber}`,
    type: 'workorder_assigned',
    priority: 'high',
    recipientId: opts.recipientId,
    workOrderId: opts.workOrderId,
    actionLabel: 'Munkalap megnyitása',
    actionType: 'open_workorder',
    actionId: opts.workOrderId,
    createdBy: opts.assignedBy,
  })
}

export async function notifyWorkOrderStatus(opts: {
  workOrderId: string; orderNumber: string; status: string; changedBy: string
  recipientRole: 'admin' | 'mechanic'; customerId?: string; vehicleId?: string
}) {
  const labels: Record<string, string> = {
    checked_in: 'Check-In kész',
    in_repair: 'Javítás megkezdve',
    quality_check: 'QC ellenőrzés szükséges',
    ready: 'Munkalap kész',
    delivered: 'Átadva',
    closed: 'Munkalap lezárva',
  }
  const label = labels[opts.status] || opts.status
  const priority: NotifPriority = ['quality_check', 'ready'].includes(opts.status) ? 'high' : 'normal'

  await createNotification({
    title: `${opts.orderNumber} – ${label}`,
    message: `${opts.changedBy} frissítette a munkalap státuszát.`,
    type: 'workorder_status',
    priority,
    recipientRole: opts.recipientRole,
    workOrderId: opts.workOrderId,
    customerId: opts.customerId,
    vehicleId: opts.vehicleId,
    actionLabel: 'Munkalap megnyitása',
    actionType: 'open_workorder',
    actionId: opts.workOrderId,
    createdBy: opts.changedBy,
  })
}

export async function notifyTaskUpdate(opts: {
  workOrderId: string; orderNumber: string; taskTitle: string
  status: 'done' | 'problem' | 'assigned'; changedBy: string; recipientRole: 'admin' | 'mechanic'
  recipientId?: string
}) {
  const labels = { done: 'kész', problem: 'probléma jelölve', assigned: 'kiosztva' }
  const priorities: Record<string, NotifPriority> = { problem: 'high', assigned: 'high', done: 'normal' }

  await createNotification({
    title: `Feladat ${labels[opts.status]}: ${opts.taskTitle}`,
    message: `${opts.changedBy} – ${opts.orderNumber}`,
    type: opts.status === 'done' ? 'task_done' : opts.status === 'problem' ? 'task_problem' : 'task_assigned',
    priority: priorities[opts.status],
    recipientRole: opts.recipientRole,
    recipientId: opts.recipientId,
    workOrderId: opts.workOrderId,
    actionLabel: 'Munkalap megnyitása',
    actionType: 'open_workorder',
    actionId: opts.workOrderId,
    createdBy: opts.changedBy,
  })
}

export async function notifyQuoteAction(opts: {
  quoteId: string; customerName: string; action: 'accepted' | 'rejected' | 'sent'
  amount?: number; changedBy: string
}) {
  const labels = { accepted: 'elfogadta', rejected: 'elutasította', sent: 'elküldte' }
  const priorities: Record<string, NotifPriority> = { accepted: 'high', rejected: 'high', sent: 'normal' }

  await createNotification({
    title: `Árajánlat ${labels[opts.action]}`,
    message: `${opts.action === 'sent' ? opts.changedBy : opts.customerName} ${labels[opts.action]} az árajánlatot${opts.amount ? ` (CHF ${opts.amount.toFixed(2)})` : ''}.`,
    type: `quote_${opts.action}` as NotifType,
    priority: priorities[opts.action],
    recipientRole: 'admin',
    quoteId: opts.quoteId,
    actionLabel: 'Árajánlat megnyitása',
    actionType: 'open_quote',
    actionId: opts.quoteId,
    createdBy: opts.changedBy,
  })
}

export async function notifyPartsUpdate(opts: {
  workOrderId?: string; orderNumber?: string; partName: string
  status: 'requested' | 'ordered' | 'arrived' | 'delayed'; changedBy: string
}) {
  const labels = { requested: 'igény érkezett', ordered: 'megrendelve', arrived: 'megérkezett', delayed: 'késik' }
  const priorities: Record<string, NotifPriority> = { requested: 'high', arrived: 'high', ordered: 'normal', delayed: 'urgent' }

  await createNotification({
    title: `Alkatrész ${labels[opts.status]}: ${opts.partName}`,
    message: opts.orderNumber ? `Munkalap: ${opts.orderNumber}` : undefined,
    type: `parts_${opts.status}` as NotifType,
    priority: priorities[opts.status],
    recipientRole: 'admin',
    workOrderId: opts.workOrderId,
    actionLabel: opts.workOrderId ? 'Munkalap megnyitása' : undefined,
    actionType: opts.workOrderId ? 'open_workorder' : undefined,
    actionId: opts.workOrderId,
    createdBy: opts.changedBy,
  })
}
