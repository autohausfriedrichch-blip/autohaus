export interface VinDecodeResult {
  make?: string
  model?: string
  year?: number
  fuel_type?: string
  engine?: string
  engine_label?: string
  power_hp?: number
  power_kw?: number
  displacement_cc?: number
  transmission?: string
  body_type?: string
  drive_type?: string
  trim?: string
  raw?: Record<string, string>
  error?: string
}

export function validateVIN(vin: string): { valid: boolean; error?: string } {
  if (!vin || typeof vin !== 'string') {
    return { valid: false, error: 'VIN is required' }
  }
  const clean = vin.trim().toUpperCase()
  if (clean.length !== 17) {
    return { valid: false, error: 'VIN must be exactly 17 characters' }
  }
  if (/[IOQ]/.test(clean)) {
    return { valid: false, error: 'VIN must not contain the letters I, O or Q' }
  }
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(clean)) {
    return { valid: false, error: 'VIN contains invalid characters' }
  }

  const transliteration: Record<string, number> = {
    A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
    J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
    S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4,
    '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  }
  const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]
  let sum = 0
  for (let i = 0; i < 17; i++) {
    const v = transliteration[clean[i]]
    if (v === undefined) return { valid: false, error: 'VIN contains invalid characters' }
    sum += v * weights[i]
  }
  const remainder = sum % 11
  const checkDigit = remainder === 10 ? 'X' : String(remainder)
  if (clean[8] !== checkDigit) {
    return { valid: false, error: 'VIN check digit is invalid' }
  }
  return { valid: true }
}

export async function decodeVIN(vin: string): Promise<VinDecodeResult> {
  const validation = validateVIN(vin)
  if (!validation.valid) {
    return { error: validation.error }
  }

  const clean = vin.trim().toUpperCase()

  let json: { Results?: { Variable: string; Value: string }[] }
  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${clean}?format=json`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) {
      return { error: `NHTSA API error: HTTP ${res.status}` }
    }
    json = await res.json()
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' }
  }

  const results = json.Results ?? []
  const raw: Record<string, string> = {}
  for (const r of results) {
    if (r.Value && r.Value.trim() && r.Value.trim() !== 'Not Applicable') {
      raw[r.Variable] = r.Value.trim()
    }
  }

  function val(key: string): string {
    return raw[key] ?? ''
  }

  const yearStr = val('Model Year')
  const kwStr = val('Engine Brake (kW) From')
  const displacementL = val('Displacement (L)')

  const fuelRaw = val('Fuel Type - Primary').toLowerCase()
  let fuel_type: string | undefined
  if (fuelRaw.includes('gasoline') || fuelRaw.includes('petrol')) fuel_type = 'Petrol'
  else if (fuelRaw.includes('diesel')) fuel_type = 'Diesel'
  else if (fuelRaw.includes('electric') && fuelRaw.includes('plug')) fuel_type = 'PHEV'
  else if (fuelRaw.includes('electric')) fuel_type = 'Electric'
  else if (fuelRaw.includes('hybrid')) fuel_type = 'Hybrid'
  else if (fuelRaw.includes('lpg') || fuelRaw.includes('liquefied petroleum')) fuel_type = 'LPG'
  else if (fuelRaw) fuel_type = val('Fuel Type - Primary')

  let power_hp: number | undefined
  if (kwStr) {
    const kw = parseFloat(kwStr)
    if (!isNaN(kw)) power_hp = Math.round(kw * 1.36)
  }

  const engine = displacementL
    ? `${parseFloat(displacementL).toFixed(1)} L`
    : undefined

  const transRaw = val('Transmission Style').toLowerCase()
  let transmission: string | undefined
  if (transRaw.includes('manual')) transmission = 'Manual'
  else if (transRaw.includes('dual') || transRaw.includes('dct') || transRaw.includes('dsg')) transmission = 'DCT'
  else if (transRaw.includes('cvt') || transRaw.includes('continuously')) transmission = 'CVT'
  else if (transRaw.includes('auto')) transmission = 'Automatic'
  else if (transRaw) transmission = val('Transmission Style')

  const bodyRaw = val('Body Class').toLowerCase()
  let body_type: string | undefined
  if (bodyRaw.includes('sedan') || bodyRaw.includes('saloon')) body_type = 'Sedan'
  else if (bodyRaw.includes('hatchback')) body_type = 'Hatchback'
  else if (bodyRaw.includes('wagon') || bodyRaw.includes('estate') || bodyRaw.includes('touring')) body_type = 'Estate'
  else if (bodyRaw.includes('sport utility') || bodyRaw.includes('suv')) body_type = 'SUV'
  else if (bodyRaw.includes('coupe') || bodyRaw.includes('coupé')) body_type = 'Coupe'
  else if (bodyRaw.includes('convert') || bodyRaw.includes('cabrio') || bodyRaw.includes('roadster')) body_type = 'Convertible'
  else if (bodyRaw.includes('pickup')) body_type = 'Pickup'
  else if (bodyRaw.includes('van') || bodyRaw.includes('minivan') || bodyRaw.includes('mpv')) body_type = 'Van'
  else if (bodyRaw) body_type = val('Body Class')

  const driveRaw = val('Drive Type').toLowerCase()
  let drive_type: string | undefined
  if (driveRaw.includes('front') || driveRaw.includes('fwd') || driveRaw.includes('2wd front')) drive_type = 'FWD'
  else if (driveRaw.includes('rear') || driveRaw.includes('rwd') || driveRaw.includes('2wd rear')) drive_type = 'RWD'
  else if (driveRaw.includes('all') || driveRaw.includes('awd') || driveRaw.includes('4wd') || driveRaw.includes('4x4')) drive_type = 'AWD'
  else if (driveRaw) drive_type = val('Drive Type')

  return {
    make: val('Make') || undefined,
    model: val('Model') || undefined,
    year: yearStr ? parseInt(yearStr, 10) : undefined,
    fuel_type,
    engine,
    power_hp,
    transmission,
    body_type,
    drive_type,
    trim: val('Trim') || undefined,
    raw,
  }
}
