/**
 * Compresses an image using canvas (max 2048px, JPEG 0.85) then uploads
 * via the /api/photos/upload server route (uses service role key server-side).
 */

async function compressImage(file: File, maxWidth = 2048, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { width, height } = img
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not supported')); return }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        blob => {
          if (blob) resolve(blob)
          else reject(new Error('Compression failed'))
        },
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')) }
    img.src = objectUrl
  })
}

export interface UploadPhotoOptions {
  file: File
  workOrderId: string
  category: string
  userId?: string | null
  uploaderName?: string
  orderNumber?: string
  customerName?: string
  visibleToCustomer?: boolean
}

export async function uploadPhoto(opts: UploadPhotoOptions): Promise<string> {
  const {
    file, workOrderId, category,
    userId = null,
    uploaderName = '',
    orderNumber = '',
    customerName = '',
    visibleToCustomer = false,
  } = opts

  // Compress before upload (handles 12MP+ camera photos)
  const compressed = await compressImage(file)

  const formData = new FormData()
  formData.append('file', compressed, 'photo.jpg')
  formData.append('work_order_id', workOrderId)
  formData.append('category', category)
  formData.append('uploaded_by', userId ?? '')
  formData.append('uploaded_by_name', uploaderName)
  formData.append('order_number', orderNumber)
  formData.append('customer_name', customerName)
  formData.append('visible_to_customer', String(visibleToCustomer))

  const res = await fetch('/api/photos/upload', { method: 'POST', body: formData })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Upload failed')
  return data.url as string
}
