import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = 'https://zpsjlmtrhsnchndifejd.supabase.co'

export async function POST(req: NextRequest) {
  const serviceKey = req.headers.get('x-service-key') || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'Service key szükséges' }, { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const workOrderId = formData.get('work_order_id') as string
    const category = (formData.get('category') as string) || 'egyéb'
    const visibleToCustomer = formData.get('visible_to_customer') === 'true'
    const uploadedByName = (formData.get('uploaded_by_name') as string) || ''
    const uploadedBy = (formData.get('uploaded_by') as string) || null
    const orderNumber = (formData.get('order_number') as string) || ''
    const customerName = (formData.get('customer_name') as string) || ''

    if (!file || !workOrderId) {
      return NextResponse.json({ error: 'Hiányzó adatok' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `work-orders/${workOrderId}/${Date.now()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: storageError } = await supabase.storage
      .from('photos')
      .upload(path, buffer, { contentType: file.type || 'image/jpeg', upsert: false })

    if (storageError) {
      return NextResponse.json({ error: `Storage: ${storageError.message}` }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)

    const { error: dbError } = await supabase.from('work_order_photos').insert({
      work_order_id: workOrderId,
      url: publicUrl,
      category,
      is_visible_to_customer: visibleToCustomer,
    })

    if (dbError) {
      return NextResponse.json({ error: `DB: ${dbError.message}` }, { status: 500 })
    }

    if (uploadedByName) {
      await supabase.from('notifications').insert({
        type: 'photo_uploaded',
        title: `${uploadedByName} új fotót töltött fel`,
        message: `${uploadedByName} új ${category} fotót töltött fel – ${orderNumber} (${customerName})`,
        work_order_id: workOrderId,
        created_by: uploadedBy,
        is_read: false,
      })
    }

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
