// Automatic document filing, detection and versioning for the Document Center

export type DocSource =
  | 'workorder' | 'quote' | 'checkin' | 'checkout' | 'invoice'
  | 'vehicle' | 'customer' | 'pickup' | 'photo' | 'manual'

export interface AutoDocMeta {
  name: string
  source_module: DocSource
  customer_id?: string
  vehicle_id?: string
  work_order_id?: string
  quote_id?: string
  invoice_id?: string
  pickup_id?: string
  fleet_id?: string
  uploaded_by_name?: string
}

// Source module always wins over filename for category
const SOURCE_CATEGORY: Record<DocSource, string> = {
  workorder: 'workorder',
  quote:     'quote',
  checkin:   'checkin',
  checkout:  'checkout',
  invoice:   'invoice',
  vehicle:   'vehicle',
  customer:  'other',
  pickup:    'other',
  photo:     'photo',
  manual:    'other',
}

const FILENAME_HINTS: { pattern: RegExp; category: string }[] = [
  { pattern: /arbeitsauftrag|work.?order|munkalap/i, category: 'workorder' },
  { pattern: /angebot|quote|quotation|árajánlat/i,   category: 'quote' },
  { pattern: /rechnung|invoice|számla/i,             category: 'invoice' },
  { pattern: /eingang|check.?in|átvétel/i,           category: 'checkin' },
  { pattern: /ausgang|check.?out|kiadás/i,           category: 'checkout' },
  { pattern: /foto|photo|kép|bild/i,                 category: 'photo' },
  { pattern: /fahrzeug|vehicle|jármű/i,              category: 'vehicle' },
  { pattern: /pickup|delivery|hozom|viszem/i,        category: 'other' },
  { pattern: /tyre|tire|gumi/i,                      category: 'workorder' },
  { pattern: /fleet|flotte/i,                        category: 'other' },
]

export function detectCategory(filename: string, source?: DocSource): string {
  if (source && source !== 'manual') return SOURCE_CATEGORY[source]
  for (const h of FILENAME_HINTS) {
    if (h.pattern.test(filename)) return h.category
  }
  return 'other'
}

export function needsReview(filename: string, source?: DocSource): boolean {
  if (source && source !== 'manual') return false
  const cat = detectCategory(filename, source)
  return cat === 'other'
}

/**
 * Save a PDF blob to Supabase Storage and insert a documents record.
 * Returns { docId, error }.
 */
export async function autoSaveDocument(
  supabase: any,
  pdfBlob: Blob,
  meta: AutoDocMeta
): Promise<{ docId?: string; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    // ── Upload to storage ──
    const rand = Math.random().toString(36).slice(2, 8)
    const path = `documents/${meta.source_module}/${Date.now()}_${rand}.pdf`
    const { error: upErr } = await supabase.storage
      .from('documents')
      .upload(path, pdfBlob, { contentType: 'application/pdf', upsert: false })
    if (upErr) return { error: upErr.message }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)

    // ── Version check: same name + same WO/customer ──
    let version = 1
    const nameForCheck = meta.name
    let vq = supabase.from('documents').select('version').eq('name', nameForCheck)
    if (meta.work_order_id)     vq = vq.eq('work_order_id', meta.work_order_id)
    else if (meta.customer_id)  vq = vq.eq('customer_id', meta.customer_id)
    const { data: existing } = await vq.order('version', { ascending: false }).limit(1)
    if (existing?.length) version = (existing[0].version || 1) + 1

    const category = detectCategory(meta.name, meta.source_module)

    // ── Insert document record ──
    const { data: doc, error: insErr } = await supabase
      .from('documents')
      .insert({
        name: version > 1 ? `${meta.name} v${version}` : meta.name,
        category,
        doc_type: meta.source_module,
        source_module: meta.source_module,
        file_url: publicUrl,
        file_type: 'application/pdf',
        file_size: pdfBlob.size,
        version,
        customer_id:   meta.customer_id   || null,
        vehicle_id:    meta.vehicle_id    || null,
        work_order_id: meta.work_order_id || null,
        quote_id:      meta.quote_id      || null,
        invoice_id:    meta.invoice_id    || null,
        pickup_id:     meta.pickup_id     || null,
        fleet_id:      meta.fleet_id      || null,
        uploaded_by:   user?.id           || null,
        uploaded_by_name: meta.uploaded_by_name || user?.email || 'Rendszer',
        needs_review: needsReview(meta.name, meta.source_module),
      })
      .select('doc_id')
      .single()

    if (insErr) return { error: insErr.message }
    return { docId: doc?.doc_id }
  } catch (e: any) {
    return { error: e.message }
  }
}
