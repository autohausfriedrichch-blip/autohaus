export interface VehicleVariant {
  engine: string
  fuel: 'petrol' | 'diesel' | 'electric' | 'hybrid' | 'lpg' | 'phev'
  power_kw: number
  power_hp: number
  displacement_cc?: number
  transmission: 'manual' | 'automatic' | 'cvt' | 'dct'
  drive: 'fwd' | 'rwd' | 'awd' | '4wd'
  body: 'sedan' | 'hatchback' | 'estate' | 'suv' | 'coupe' | 'convertible' | 'van' | 'pickup' | 'minivan'
  doors: number
  year_from: number
  year_to?: number
  tire_size?: string
  oil_spec?: string
}

export interface VehicleModel {
  model: string
  years: number[]
  variants: VehicleVariant[]
}

export interface VehicleMake {
  make: string
  models: VehicleModel[]
}

function yrs(from: number, to: number): number[] {
  const out: number[] = []
  for (let y = from; y <= to; y++) out.push(y)
  return out
}

export const vehicleDatabase: VehicleMake[] = [
  {
    make: 'VW',
    models: [
      {
        model: 'Golf',
        years: yrs(1990, 2025),
        variants: [
          { engine: '1.4 TSI', fuel: 'petrol', power_kw: 92, power_hp: 125, displacement_cc: 1395, transmission: 'manual', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2012, year_to: 2020, tire_size: '205/55 R16', oil_spec: '5W-30 504.00/507.00' },
          { engine: '2.0 TDI', fuel: 'diesel', power_kw: 110, power_hp: 150, displacement_cc: 1968, transmission: 'dct', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2013, tire_size: '205/55 R16', oil_spec: '5W-30 507.00' },
          { engine: '1.5 eTSI', fuel: 'hybrid', power_kw: 110, power_hp: 150, displacement_cc: 1498, transmission: 'dct', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2020, tire_size: '205/55 R16', oil_spec: '0W-20 508.00' },
        ],
      },
      {
        model: 'Passat',
        years: yrs(1993, 2025),
        variants: [
          { engine: '2.0 TDI', fuel: 'diesel', power_kw: 140, power_hp: 190, displacement_cc: 1968, transmission: 'dct', drive: 'fwd', body: 'estate', doors: 5, year_from: 2015, tire_size: '215/55 R17', oil_spec: '5W-30 507.00' },
          { engine: '1.4 GTE', fuel: 'phev', power_kw: 160, power_hp: 218, displacement_cc: 1395, transmission: 'dct', drive: 'fwd', body: 'estate', doors: 5, year_from: 2015, tire_size: '215/55 R17', oil_spec: '0W-20 508.00' },
        ],
      },
      {
        model: 'Tiguan',
        years: yrs(2007, 2025),
        variants: [
          { engine: '1.5 TSI', fuel: 'petrol', power_kw: 110, power_hp: 150, displacement_cc: 1498, transmission: 'manual', drive: 'fwd', body: 'suv', doors: 5, year_from: 2020, tire_size: '215/65 R17', oil_spec: '0W-20 508.00' },
          { engine: '2.0 TDI 4Motion', fuel: 'diesel', power_kw: 140, power_hp: 190, displacement_cc: 1968, transmission: 'dct', drive: '4wd', body: 'suv', doors: 5, year_from: 2016, tire_size: '235/55 R18', oil_spec: '5W-30 507.00' },
        ],
      },
      {
        model: 'Polo',
        years: yrs(1994, 2025),
        variants: [
          { engine: '1.0 TSI', fuel: 'petrol', power_kw: 70, power_hp: 95, displacement_cc: 999, transmission: 'manual', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2017, tire_size: '185/65 R15', oil_spec: '0W-20 508.00' },
          { engine: '1.6 TDI', fuel: 'diesel', power_kw: 70, power_hp: 95, displacement_cc: 1598, transmission: 'manual', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2017, year_to: 2023, tire_size: '185/65 R15', oil_spec: '5W-30 507.00' },
        ],
      },
    ],
  },
  {
    make: 'BMW',
    models: [
      {
        model: '3 Series',
        years: yrs(1990, 2025),
        variants: [
          { engine: '320d', fuel: 'diesel', power_kw: 140, power_hp: 190, displacement_cc: 1995, transmission: 'automatic', drive: 'rwd', body: 'sedan', doors: 4, year_from: 2012, tire_size: '225/50 R17', oil_spec: '5W-30 LL-04' },
          { engine: '330e', fuel: 'phev', power_kw: 185, power_hp: 252, displacement_cc: 1998, transmission: 'automatic', drive: 'rwd', body: 'sedan', doors: 4, year_from: 2019, tire_size: '225/45 R18', oil_spec: '0W-30 LL-17FE' },
          { engine: 'M340i xDrive', fuel: 'petrol', power_kw: 275, power_hp: 374, displacement_cc: 2998, transmission: 'automatic', drive: 'awd', body: 'sedan', doors: 4, year_from: 2019, tire_size: '255/35 R19', oil_spec: '0W-40 LL-01' },
        ],
      },
      {
        model: '5 Series',
        years: yrs(1990, 2025),
        variants: [
          { engine: '520d', fuel: 'diesel', power_kw: 140, power_hp: 190, displacement_cc: 1995, transmission: 'automatic', drive: 'rwd', body: 'sedan', doors: 4, year_from: 2010, tire_size: '225/55 R17', oil_spec: '5W-30 LL-04' },
          { engine: '530e', fuel: 'phev', power_kw: 185, power_hp: 252, displacement_cc: 1998, transmission: 'automatic', drive: 'rwd', body: 'sedan', doors: 4, year_from: 2017, tire_size: '245/45 R18', oil_spec: '0W-30 LL-17FE' },
        ],
      },
      {
        model: 'X5',
        years: yrs(2000, 2025),
        variants: [
          { engine: 'xDrive30d', fuel: 'diesel', power_kw: 210, power_hp: 286, displacement_cc: 2993, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2018, tire_size: '275/45 R20', oil_spec: '5W-30 LL-04' },
          { engine: 'xDrive45e', fuel: 'phev', power_kw: 290, power_hp: 394, displacement_cc: 2998, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2019, tire_size: '275/45 R20', oil_spec: '0W-30 LL-17FE' },
        ],
      },
    ],
  },
  {
    make: 'Mercedes-Benz',
    models: [
      {
        model: 'C-Class',
        years: yrs(1993, 2025),
        variants: [
          { engine: 'C 220 d', fuel: 'diesel', power_kw: 143, power_hp: 194, displacement_cc: 1950, transmission: 'automatic', drive: 'rwd', body: 'estate', doors: 5, year_from: 2015, tire_size: '225/50 R17', oil_spec: '5W-30 MB 229.52' },
          { engine: 'C 300 e', fuel: 'phev', power_kw: 230, power_hp: 313, displacement_cc: 1999, transmission: 'automatic', drive: 'rwd', body: 'sedan', doors: 4, year_from: 2021, tire_size: '235/45 R18', oil_spec: '0W-30 MB 229.71' },
        ],
      },
      {
        model: 'E-Class',
        years: yrs(1993, 2025),
        variants: [
          { engine: 'E 300 d', fuel: 'diesel', power_kw: 180, power_hp: 245, displacement_cc: 1950, transmission: 'automatic', drive: 'rwd', body: 'estate', doors: 5, year_from: 2016, tire_size: '235/55 R18', oil_spec: '5W-30 MB 229.52' },
          { engine: 'E 350 e', fuel: 'phev', power_kw: 235, power_hp: 320, displacement_cc: 1991, transmission: 'automatic', drive: 'rwd', body: 'sedan', doors: 4, year_from: 2017, year_to: 2023, tire_size: '235/50 R18', oil_spec: '0W-30 MB 229.71' },
        ],
      },
      {
        model: 'GLC',
        years: yrs(2015, 2025),
        variants: [
          { engine: 'GLC 220 d 4MATIC', fuel: 'diesel', power_kw: 143, power_hp: 194, displacement_cc: 1950, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2015, tire_size: '235/55 R18', oil_spec: '5W-30 MB 229.52' },
          { engine: 'GLC 300 e 4MATIC', fuel: 'phev', power_kw: 230, power_hp: 313, displacement_cc: 1999, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2022, tire_size: '255/45 R20', oil_spec: '0W-30 MB 229.71' },
        ],
      },
    ],
  },
  {
    make: 'Audi',
    models: [
      {
        model: 'A4',
        years: yrs(1994, 2025),
        variants: [
          { engine: '2.0 TDI', fuel: 'diesel', power_kw: 140, power_hp: 190, displacement_cc: 1968, transmission: 'automatic', drive: 'fwd', body: 'estate', doors: 5, year_from: 2015, tire_size: '225/50 R17', oil_spec: '5W-30 VW 507.00' },
          { engine: '2.0 TFSI quattro', fuel: 'petrol', power_kw: 185, power_hp: 252, displacement_cc: 1984, transmission: 'dct', drive: 'awd', body: 'sedan', doors: 4, year_from: 2016, tire_size: '245/40 R18', oil_spec: '5W-40 VW 502.00' },
        ],
      },
      {
        model: 'Q5',
        years: yrs(2008, 2025),
        variants: [
          { engine: '2.0 TDI quattro', fuel: 'diesel', power_kw: 140, power_hp: 190, displacement_cc: 1968, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2016, tire_size: '235/60 R18', oil_spec: '5W-30 VW 507.00' },
          { engine: '55 TFSIe quattro', fuel: 'phev', power_kw: 270, power_hp: 367, displacement_cc: 1984, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2020, tire_size: '255/45 R20', oil_spec: '0W-20 VW 508.00' },
        ],
      },
      {
        model: 'A6',
        years: yrs(1994, 2025),
        variants: [
          { engine: '3.0 TDI quattro', fuel: 'diesel', power_kw: 210, power_hp: 286, displacement_cc: 2967, transmission: 'automatic', drive: 'awd', body: 'estate', doors: 5, year_from: 2018, tire_size: '245/45 R19', oil_spec: '5W-30 VW 507.00' },
          { engine: '55 TFSI quattro', fuel: 'petrol', power_kw: 250, power_hp: 340, displacement_cc: 2995, transmission: 'automatic', drive: 'awd', body: 'sedan', doors: 4, year_from: 2018, tire_size: '245/40 R19', oil_spec: '0W-40 VW 502.00' },
        ],
      },
    ],
  },
  {
    make: 'Toyota',
    models: [
      {
        model: 'Corolla',
        years: yrs(1990, 2025),
        variants: [
          { engine: '1.8 Hybrid', fuel: 'hybrid', power_kw: 90, power_hp: 122, displacement_cc: 1798, transmission: 'cvt', drive: 'fwd', body: 'estate', doors: 5, year_from: 2019, tire_size: '205/55 R16', oil_spec: '0W-20' },
          { engine: '2.0 Hybrid', fuel: 'hybrid', power_kw: 132, power_hp: 180, displacement_cc: 1987, transmission: 'cvt', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2019, tire_size: '215/45 R17', oil_spec: '0W-20' },
        ],
      },
      {
        model: 'RAV4',
        years: yrs(1994, 2025),
        variants: [
          { engine: '2.5 Hybrid AWD', fuel: 'hybrid', power_kw: 160, power_hp: 218, displacement_cc: 2487, transmission: 'cvt', drive: 'awd', body: 'suv', doors: 5, year_from: 2019, tire_size: '225/60 R18', oil_spec: '0W-20' },
          { engine: '2.5 PHEV AWD', fuel: 'phev', power_kw: 225, power_hp: 306, displacement_cc: 2487, transmission: 'cvt', drive: 'awd', body: 'suv', doors: 5, year_from: 2021, tire_size: '235/55 R18', oil_spec: '0W-20' },
        ],
      },
      {
        model: 'Yaris',
        years: yrs(1999, 2025),
        variants: [
          { engine: '1.5 Hybrid', fuel: 'hybrid', power_kw: 85, power_hp: 116, displacement_cc: 1490, transmission: 'cvt', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2020, tire_size: '185/60 R16', oil_spec: '0W-20' },
          { engine: '1.0 VVT-i', fuel: 'petrol', power_kw: 51, power_hp: 69, displacement_cc: 998, transmission: 'manual', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2006, year_to: 2017, tire_size: '175/65 R14', oil_spec: '5W-30' },
        ],
      },
    ],
  },
  {
    make: 'Ford',
    models: [
      {
        model: 'Focus',
        years: yrs(1998, 2025),
        variants: [
          { engine: '1.0 EcoBoost', fuel: 'petrol', power_kw: 92, power_hp: 125, displacement_cc: 999, transmission: 'manual', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2011, tire_size: '205/55 R16', oil_spec: '5W-20 WSS-M2C948-B' },
          { engine: '1.5 TDCi', fuel: 'diesel', power_kw: 88, power_hp: 120, displacement_cc: 1499, transmission: 'manual', drive: 'fwd', body: 'estate', doors: 5, year_from: 2014, year_to: 2022, tire_size: '205/55 R16', oil_spec: '5W-30 WSS-M2C934-B' },
        ],
      },
      {
        model: 'Kuga',
        years: yrs(2008, 2025),
        variants: [
          { engine: '2.0 EcoBlue AWD', fuel: 'diesel', power_kw: 110, power_hp: 150, displacement_cc: 1997, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2019, tire_size: '235/50 R18', oil_spec: '5W-30' },
          { engine: '2.5 PHEV', fuel: 'phev', power_kw: 165, power_hp: 225, displacement_cc: 2488, transmission: 'cvt', drive: 'fwd', body: 'suv', doors: 5, year_from: 2020, tire_size: '235/50 R18', oil_spec: '5W-20' },
        ],
      },
    ],
  },
  {
    make: 'Opel',
    models: [
      {
        model: 'Astra',
        years: yrs(1991, 2025),
        variants: [
          { engine: '1.2 Turbo', fuel: 'petrol', power_kw: 96, power_hp: 130, displacement_cc: 1199, transmission: 'manual', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2021, tire_size: '215/55 R17', oil_spec: '0W-20' },
          { engine: '1.5 CDTI', fuel: 'diesel', power_kw: 90, power_hp: 122, displacement_cc: 1499, transmission: 'manual', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2019, tire_size: '215/55 R17', oil_spec: '5W-30 dexos2' },
        ],
      },
      {
        model: 'Mokka',
        years: yrs(2012, 2025),
        variants: [
          { engine: '1.2 Turbo', fuel: 'petrol', power_kw: 96, power_hp: 130, displacement_cc: 1199, transmission: 'manual', drive: 'fwd', body: 'suv', doors: 5, year_from: 2020, tire_size: '215/60 R17', oil_spec: '0W-20' },
          { engine: 'Electric 50 kWh', fuel: 'electric', power_kw: 100, power_hp: 136, transmission: 'automatic', drive: 'fwd', body: 'suv', doors: 5, year_from: 2021, tire_size: '215/55 R17' },
        ],
      },
    ],
  },
  {
    make: 'Renault',
    models: [
      {
        model: 'Clio',
        years: yrs(1990, 2025),
        variants: [
          { engine: '1.0 TCe', fuel: 'petrol', power_kw: 67, power_hp: 91, displacement_cc: 999, transmission: 'manual', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2019, tire_size: '185/65 R15', oil_spec: '5W-40' },
          { engine: 'E-Tech Hybrid 140', fuel: 'hybrid', power_kw: 103, power_hp: 140, displacement_cc: 1598, transmission: 'automatic', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2020, tire_size: '195/55 R16', oil_spec: '0W-20' },
        ],
      },
      {
        model: 'Megane',
        years: yrs(1995, 2025),
        variants: [
          { engine: '1.3 TCe', fuel: 'petrol', power_kw: 103, power_hp: 140, displacement_cc: 1332, transmission: 'manual', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2016, tire_size: '205/55 R16', oil_spec: '5W-40' },
          { engine: '1.5 dCi', fuel: 'diesel', power_kw: 85, power_hp: 115, displacement_cc: 1461, transmission: 'manual', drive: 'fwd', body: 'estate', doors: 5, year_from: 2016, year_to: 2023, tire_size: '205/55 R16', oil_spec: '5W-30' },
        ],
      },
      {
        model: 'Kadjar',
        years: yrs(2015, 2022),
        variants: [
          { engine: '1.3 TCe', fuel: 'petrol', power_kw: 103, power_hp: 140, displacement_cc: 1332, transmission: 'manual', drive: 'fwd', body: 'suv', doors: 5, year_from: 2018, year_to: 2022, tire_size: '215/60 R17', oil_spec: '5W-40' },
          { engine: '1.5 dCi', fuel: 'diesel', power_kw: 85, power_hp: 115, displacement_cc: 1461, transmission: 'manual', drive: 'fwd', body: 'suv', doors: 5, year_from: 2015, year_to: 2022, tire_size: '215/60 R17', oil_spec: '5W-30' },
        ],
      },
    ],
  },
  {
    make: 'Peugeot',
    models: [
      {
        model: '208',
        years: yrs(2012, 2025),
        variants: [
          { engine: '1.2 PureTech', fuel: 'petrol', power_kw: 74, power_hp: 101, displacement_cc: 1199, transmission: 'manual', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2019, tire_size: '195/65 R15', oil_spec: '5W-30' },
          { engine: 'e-208 50 kWh', fuel: 'electric', power_kw: 100, power_hp: 136, transmission: 'automatic', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2019, tire_size: '205/45 R17' },
        ],
      },
      {
        model: '3008',
        years: yrs(2009, 2025),
        variants: [
          { engine: '1.2 PureTech', fuel: 'petrol', power_kw: 96, power_hp: 130, displacement_cc: 1199, transmission: 'manual', drive: 'fwd', body: 'suv', doors: 5, year_from: 2016, tire_size: '215/60 R17', oil_spec: '5W-30' },
          { engine: '1.5 BlueHDi', fuel: 'diesel', power_kw: 96, power_hp: 130, displacement_cc: 1499, transmission: 'automatic', drive: 'fwd', body: 'suv', doors: 5, year_from: 2016, tire_size: '225/55 R18', oil_spec: '5W-30' },
          { engine: '1.6 Hybrid4 300', fuel: 'phev', power_kw: 221, power_hp: 300, displacement_cc: 1598, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2021, tire_size: '235/50 R19', oil_spec: '0W-20' },
        ],
      },
    ],
  },
  {
    make: 'Citroën',
    models: [
      {
        model: 'C3',
        years: yrs(2002, 2025),
        variants: [
          { engine: '1.2 PureTech', fuel: 'petrol', power_kw: 61, power_hp: 83, displacement_cc: 1199, transmission: 'manual', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2016, tire_size: '185/65 R15', oil_spec: '5W-30' },
          { engine: '1.5 BlueHDi', fuel: 'diesel', power_kw: 73, power_hp: 99, displacement_cc: 1499, transmission: 'manual', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2016, year_to: 2024, tire_size: '185/65 R15', oil_spec: '5W-30' },
        ],
      },
      {
        model: 'C5 Aircross',
        years: yrs(2018, 2025),
        variants: [
          { engine: '1.2 PureTech', fuel: 'petrol', power_kw: 96, power_hp: 130, displacement_cc: 1199, transmission: 'automatic', drive: 'fwd', body: 'suv', doors: 5, year_from: 2018, tire_size: '215/60 R17', oil_spec: '5W-30' },
          { engine: '1.6 Hybrid', fuel: 'phev', power_kw: 165, power_hp: 225, displacement_cc: 1598, transmission: 'automatic', drive: 'fwd', body: 'suv', doors: 5, year_from: 2020, tire_size: '235/50 R19', oil_spec: '0W-20' },
        ],
      },
    ],
  },
  {
    make: 'Fiat',
    models: [
      {
        model: '500',
        years: yrs(2007, 2025),
        variants: [
          { engine: '1.0 Hybrid', fuel: 'hybrid', power_kw: 51, power_hp: 70, displacement_cc: 999, transmission: 'manual', drive: 'fwd', body: 'hatchback', doors: 3, year_from: 2020, tire_size: '185/55 R15', oil_spec: '5W-30' },
          { engine: '500e 42 kWh', fuel: 'electric', power_kw: 87, power_hp: 118, transmission: 'automatic', drive: 'fwd', body: 'hatchback', doors: 3, year_from: 2020, tire_size: '195/45 R17' },
        ],
      },
      {
        model: 'Tipo',
        years: yrs(2015, 2025),
        variants: [
          { engine: '1.4 T-Jet', fuel: 'petrol', power_kw: 88, power_hp: 120, displacement_cc: 1368, transmission: 'manual', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2015, tire_size: '195/65 R15', oil_spec: '5W-40' },
          { engine: '1.6 MultiJet', fuel: 'diesel', power_kw: 88, power_hp: 120, displacement_cc: 1598, transmission: 'manual', drive: 'fwd', body: 'estate', doors: 5, year_from: 2016, year_to: 2024, tire_size: '205/55 R16', oil_spec: '5W-40' },
        ],
      },
    ],
  },
  {
    make: 'Seat',
    models: [
      {
        model: 'Leon',
        years: yrs(1999, 2025),
        variants: [
          { engine: '1.0 eTSI', fuel: 'hybrid', power_kw: 81, power_hp: 110, displacement_cc: 999, transmission: 'dct', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2020, tire_size: '205/55 R16', oil_spec: '0W-20 508.00' },
          { engine: '1.5 eTSI', fuel: 'hybrid', power_kw: 110, power_hp: 150, displacement_cc: 1498, transmission: 'dct', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2020, tire_size: '215/45 R17', oil_spec: '0W-20 508.00' },
          { engine: '2.0 TDI', fuel: 'diesel', power_kw: 110, power_hp: 150, displacement_cc: 1968, transmission: 'manual', drive: 'fwd', body: 'estate', doors: 5, year_from: 2020, tire_size: '225/45 R17', oil_spec: '5W-30 507.00' },
        ],
      },
      {
        model: 'Ateca',
        years: yrs(2016, 2025),
        variants: [
          { engine: '1.5 TSI', fuel: 'petrol', power_kw: 110, power_hp: 150, displacement_cc: 1498, transmission: 'manual', drive: 'fwd', body: 'suv', doors: 5, year_from: 2016, tire_size: '215/65 R17', oil_spec: '0W-20 508.00' },
          { engine: '2.0 TDI 4Drive', fuel: 'diesel', power_kw: 140, power_hp: 190, displacement_cc: 1968, transmission: 'dct', drive: '4wd', body: 'suv', doors: 5, year_from: 2016, tire_size: '235/50 R19', oil_spec: '5W-30 507.00' },
        ],
      },
    ],
  },
  {
    make: 'Skoda',
    models: [
      {
        model: 'Octavia',
        years: yrs(1996, 2025),
        variants: [
          { engine: '1.5 TSI', fuel: 'petrol', power_kw: 110, power_hp: 150, displacement_cc: 1498, transmission: 'manual', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2017, tire_size: '205/55 R16', oil_spec: '0W-20 508.00' },
          { engine: '2.0 TDI', fuel: 'diesel', power_kw: 110, power_hp: 150, displacement_cc: 1968, transmission: 'manual', drive: 'fwd', body: 'estate', doors: 5, year_from: 2017, tire_size: '225/45 R17', oil_spec: '5W-30 507.00' },
          { engine: '1.4 iV', fuel: 'phev', power_kw: 150, power_hp: 204, displacement_cc: 1395, transmission: 'dct', drive: 'fwd', body: 'estate', doors: 5, year_from: 2020, tire_size: '205/55 R16', oil_spec: '0W-20 508.00' },
        ],
      },
      {
        model: 'Superb',
        years: yrs(2001, 2025),
        variants: [
          { engine: '1.5 TSI', fuel: 'petrol', power_kw: 110, power_hp: 150, displacement_cc: 1498, transmission: 'dct', drive: 'fwd', body: 'sedan', doors: 4, year_from: 2019, tire_size: '215/55 R17', oil_spec: '0W-20 508.00' },
          { engine: '2.0 TDI', fuel: 'diesel', power_kw: 140, power_hp: 190, displacement_cc: 1968, transmission: 'dct', drive: 'fwd', body: 'estate', doors: 5, year_from: 2019, tire_size: '235/45 R18', oil_spec: '5W-30 507.00' },
        ],
      },
      {
        model: 'Karoq',
        years: yrs(2017, 2025),
        variants: [
          { engine: '1.0 TSI', fuel: 'petrol', power_kw: 85, power_hp: 115, displacement_cc: 999, transmission: 'manual', drive: 'fwd', body: 'suv', doors: 5, year_from: 2017, tire_size: '215/65 R16', oil_spec: '0W-20 508.00' },
          { engine: '2.0 TDI 4x4', fuel: 'diesel', power_kw: 110, power_hp: 150, displacement_cc: 1968, transmission: 'dct', drive: '4wd', body: 'suv', doors: 5, year_from: 2017, tire_size: '235/50 R19', oil_spec: '5W-30 507.00' },
        ],
      },
    ],
  },
  {
    make: 'Hyundai',
    models: [
      {
        model: 'i30',
        years: yrs(2007, 2025),
        variants: [
          { engine: '1.0 T-GDI', fuel: 'petrol', power_kw: 88, power_hp: 120, displacement_cc: 998, transmission: 'manual', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2017, tire_size: '205/55 R16', oil_spec: '5W-30' },
          { engine: '1.6 CRDi', fuel: 'diesel', power_kw: 85, power_hp: 115, displacement_cc: 1582, transmission: 'manual', drive: 'fwd', body: 'estate', doors: 5, year_from: 2017, year_to: 2023, tire_size: '205/55 R16', oil_spec: '5W-30' },
        ],
      },
      {
        model: 'Tucson',
        years: yrs(2004, 2025),
        variants: [
          { engine: '1.6 T-GDI', fuel: 'petrol', power_kw: 110, power_hp: 150, displacement_cc: 1591, transmission: 'manual', drive: 'fwd', body: 'suv', doors: 5, year_from: 2015, tire_size: '225/60 R17', oil_spec: '5W-30' },
          { engine: '1.6 CRDi', fuel: 'diesel', power_kw: 100, power_hp: 136, displacement_cc: 1598, transmission: 'manual', drive: 'fwd', body: 'suv', doors: 5, year_from: 2020, tire_size: '235/55 R18', oil_spec: '5W-30' },
          { engine: '1.6 PHEV AWD', fuel: 'phev', power_kw: 195, power_hp: 265, displacement_cc: 1598, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2021, tire_size: '235/55 R19', oil_spec: '0W-20' },
        ],
      },
      {
        model: 'IONIQ 5',
        years: yrs(2021, 2025),
        variants: [
          { engine: 'Standard Range RWD', fuel: 'electric', power_kw: 125, power_hp: 170, transmission: 'automatic', drive: 'rwd', body: 'suv', doors: 5, year_from: 2021, tire_size: '235/55 R19' },
          { engine: 'Long Range AWD', fuel: 'electric', power_kw: 225, power_hp: 306, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2021, tire_size: '255/45 R20' },
        ],
      },
    ],
  },
  {
    make: 'Kia',
    models: [
      {
        model: 'Ceed',
        years: yrs(2006, 2025),
        variants: [
          { engine: '1.0 T-GDI', fuel: 'petrol', power_kw: 88, power_hp: 120, displacement_cc: 998, transmission: 'manual', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2018, tire_size: '205/60 R16', oil_spec: '5W-30' },
          { engine: '1.6 CRDi', fuel: 'diesel', power_kw: 85, power_hp: 115, displacement_cc: 1582, transmission: 'manual', drive: 'fwd', body: 'estate', doors: 5, year_from: 2018, year_to: 2024, tire_size: '205/60 R16', oil_spec: '5W-30' },
        ],
      },
      {
        model: 'Sportage',
        years: yrs(2004, 2025),
        variants: [
          { engine: '1.6 T-GDI', fuel: 'petrol', power_kw: 110, power_hp: 150, displacement_cc: 1591, transmission: 'manual', drive: 'fwd', body: 'suv', doors: 5, year_from: 2016, tire_size: '225/60 R17', oil_spec: '5W-30' },
          { engine: '1.6 CRDi AWD', fuel: 'diesel', power_kw: 100, power_hp: 136, displacement_cc: 1598, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2021, tire_size: '235/55 R19', oil_spec: '5W-30' },
        ],
      },
      {
        model: 'EV6',
        years: yrs(2021, 2025),
        variants: [
          { engine: 'Standard Range RWD', fuel: 'electric', power_kw: 125, power_hp: 170, transmission: 'automatic', drive: 'rwd', body: 'suv', doors: 5, year_from: 2021, tire_size: '235/55 R19' },
          { engine: 'Long Range AWD GT-Line', fuel: 'electric', power_kw: 239, power_hp: 325, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2021, tire_size: '255/45 R20' },
        ],
      },
    ],
  },
  {
    make: 'Volvo',
    models: [
      {
        model: 'XC60',
        years: yrs(2008, 2025),
        variants: [
          { engine: 'B4 AWD', fuel: 'hybrid', power_kw: 145, power_hp: 197, displacement_cc: 1969, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2021, tire_size: '235/55 R19', oil_spec: '0W-20' },
          { engine: 'T8 Recharge AWD', fuel: 'phev', power_kw: 335, power_hp: 455, displacement_cc: 1969, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2021, tire_size: '255/45 R21', oil_spec: '0W-20' },
        ],
      },
      {
        model: 'V60',
        years: yrs(2010, 2025),
        variants: [
          { engine: 'B4 FWD', fuel: 'hybrid', power_kw: 145, power_hp: 197, displacement_cc: 1969, transmission: 'automatic', drive: 'fwd', body: 'estate', doors: 5, year_from: 2019, tire_size: '235/50 R18', oil_spec: '0W-20' },
          { engine: 'T8 Recharge AWD', fuel: 'phev', power_kw: 335, power_hp: 455, displacement_cc: 1969, transmission: 'automatic', drive: 'awd', body: 'estate', doors: 5, year_from: 2019, tire_size: '245/40 R19', oil_spec: '0W-20' },
        ],
      },
      {
        model: 'S90',
        years: yrs(2016, 2025),
        variants: [
          { engine: 'B5 AWD', fuel: 'hybrid', power_kw: 183, power_hp: 249, displacement_cc: 1969, transmission: 'automatic', drive: 'awd', body: 'sedan', doors: 4, year_from: 2021, tire_size: '245/45 R19', oil_spec: '0W-20' },
          { engine: 'T8 Recharge AWD', fuel: 'phev', power_kw: 335, power_hp: 455, displacement_cc: 1969, transmission: 'automatic', drive: 'awd', body: 'sedan', doors: 4, year_from: 2016, tire_size: '245/40 R20', oil_spec: '0W-20' },
        ],
      },
    ],
  },
  {
    make: 'Mazda',
    models: [
      {
        model: 'Mazda3',
        years: yrs(2003, 2025),
        variants: [
          { engine: 'SKYACTIV-G 2.0', fuel: 'petrol', power_kw: 90, power_hp: 122, displacement_cc: 1998, transmission: 'manual', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2019, tire_size: '205/60 R16', oil_spec: '5W-30' },
          { engine: 'SKYACTIV-X 2.0 AWD', fuel: 'petrol', power_kw: 137, power_hp: 186, displacement_cc: 1998, transmission: 'manual', drive: 'awd', body: 'hatchback', doors: 5, year_from: 2019, tire_size: '215/45 R18', oil_spec: '0W-20' },
        ],
      },
      {
        model: 'CX-5',
        years: yrs(2012, 2025),
        variants: [
          { engine: 'SKYACTIV-G 2.0', fuel: 'petrol', power_kw: 121, power_hp: 165, displacement_cc: 1998, transmission: 'manual', drive: 'fwd', body: 'suv', doors: 5, year_from: 2017, tire_size: '225/65 R17', oil_spec: '5W-30' },
          { engine: 'SKYACTIV-D 2.2 AWD', fuel: 'diesel', power_kw: 140, power_hp: 190, displacement_cc: 2191, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2017, tire_size: '225/55 R19', oil_spec: '5W-30' },
        ],
      },
    ],
  },
  {
    make: 'Honda',
    models: [
      {
        model: 'Civic',
        years: yrs(1990, 2025),
        variants: [
          { engine: '1.0 VTEC Turbo', fuel: 'petrol', power_kw: 93, power_hp: 126, displacement_cc: 988, transmission: 'manual', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2017, year_to: 2022, tire_size: '205/55 R16', oil_spec: '0W-20' },
          { engine: '2.0 e:HEV', fuel: 'hybrid', power_kw: 135, power_hp: 184, displacement_cc: 1993, transmission: 'cvt', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2022, tire_size: '235/40 R18', oil_spec: '0W-20' },
        ],
      },
      {
        model: 'CR-V',
        years: yrs(1995, 2025),
        variants: [
          { engine: '1.5 VTEC Turbo AWD', fuel: 'petrol', power_kw: 142, power_hp: 193, displacement_cc: 1498, transmission: 'cvt', drive: 'awd', body: 'suv', doors: 5, year_from: 2018, tire_size: '235/60 R18', oil_spec: '0W-20' },
          { engine: '2.0 e:HEV AWD', fuel: 'hybrid', power_kw: 145, power_hp: 197, displacement_cc: 1993, transmission: 'cvt', drive: 'awd', body: 'suv', doors: 5, year_from: 2023, tire_size: '235/55 R19', oil_spec: '0W-20' },
        ],
      },
    ],
  },
  {
    make: 'Nissan',
    models: [
      {
        model: 'Qashqai',
        years: yrs(2006, 2025),
        variants: [
          { engine: '1.3 DIG-T', fuel: 'petrol', power_kw: 103, power_hp: 140, displacement_cc: 1332, transmission: 'manual', drive: 'fwd', body: 'suv', doors: 5, year_from: 2021, tire_size: '215/60 R17', oil_spec: '5W-30' },
          { engine: '1.3 e-POWER', fuel: 'hybrid', power_kw: 140, power_hp: 190, displacement_cc: 1332, transmission: 'automatic', drive: 'fwd', body: 'suv', doors: 5, year_from: 2022, tire_size: '225/50 R19', oil_spec: '0W-20' },
        ],
      },
      {
        model: 'Leaf',
        years: yrs(2011, 2025),
        variants: [
          { engine: '40 kWh', fuel: 'electric', power_kw: 110, power_hp: 150, transmission: 'automatic', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2018, tire_size: '205/55 R16' },
          { engine: 'e+ 62 kWh', fuel: 'electric', power_kw: 160, power_hp: 218, transmission: 'automatic', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2019, tire_size: '215/50 R17' },
        ],
      },
      {
        model: 'X-Trail',
        years: yrs(2001, 2025),
        variants: [
          { engine: '1.5 e-POWER AWD', fuel: 'hybrid', power_kw: 157, power_hp: 213, displacement_cc: 1497, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2022, tire_size: '235/55 R19', oil_spec: '0W-20' },
          { engine: '1.3 DIG-T', fuel: 'petrol', power_kw: 115, power_hp: 156, displacement_cc: 1332, transmission: 'automatic', drive: 'fwd', body: 'suv', doors: 5, year_from: 2019, year_to: 2022, tire_size: '225/60 R18', oil_spec: '5W-30' },
        ],
      },
    ],
  },
  {
    make: 'Subaru',
    models: [
      {
        model: 'Forester',
        years: yrs(1997, 2025),
        variants: [
          { engine: '2.0i e-BOXER AWD', fuel: 'hybrid', power_kw: 110, power_hp: 150, displacement_cc: 1995, transmission: 'cvt', drive: 'awd', body: 'suv', doors: 5, year_from: 2019, tire_size: '225/55 R18', oil_spec: '0W-20' },
          { engine: '2.5i Premium AWD', fuel: 'petrol', power_kw: 136, power_hp: 185, displacement_cc: 2498, transmission: 'cvt', drive: 'awd', body: 'suv', doors: 5, year_from: 2022, tire_size: '225/55 R18', oil_spec: '0W-20' },
        ],
      },
      {
        model: 'Outback',
        years: yrs(1996, 2025),
        variants: [
          { engine: '2.5i Premium AWD', fuel: 'petrol', power_kw: 136, power_hp: 185, displacement_cc: 2498, transmission: 'cvt', drive: 'awd', body: 'estate', doors: 5, year_from: 2020, tire_size: '225/60 R18', oil_spec: '0W-20' },
          { engine: '2.4 Turbo AWD', fuel: 'petrol', power_kw: 184, power_hp: 260, displacement_cc: 2387, transmission: 'cvt', drive: 'awd', body: 'estate', doors: 5, year_from: 2020, tire_size: '245/45 R20', oil_spec: '0W-20' },
        ],
      },
    ],
  },
  {
    make: 'Porsche',
    models: [
      {
        model: 'Cayenne',
        years: yrs(2002, 2025),
        variants: [
          { engine: '3.0 V6', fuel: 'petrol', power_kw: 250, power_hp: 340, displacement_cc: 2995, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2018, tire_size: '265/50 R19', oil_spec: '0W-40' },
          { engine: 'S 2.9 Biturbo', fuel: 'petrol', power_kw: 324, power_hp: 440, displacement_cc: 2894, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2018, tire_size: '285/45 R20', oil_spec: '0W-40' },
          { engine: 'E-Hybrid', fuel: 'phev', power_kw: 340, power_hp: 462, displacement_cc: 2995, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2018, tire_size: '265/50 R20', oil_spec: '0W-40' },
        ],
      },
      {
        model: '911',
        years: yrs(1990, 2025),
        variants: [
          { engine: 'Carrera 3.0', fuel: 'petrol', power_kw: 283, power_hp: 385, displacement_cc: 2981, transmission: 'dct', drive: 'rwd', body: 'coupe', doors: 2, year_from: 2019, tire_size: '245/40 ZR19', oil_spec: '0W-40' },
          { engine: 'Carrera 4S 3.0', fuel: 'petrol', power_kw: 331, power_hp: 450, displacement_cc: 2981, transmission: 'dct', drive: 'awd', body: 'coupe', doors: 2, year_from: 2019, tire_size: '265/35 ZR20', oil_spec: '0W-40' },
        ],
      },
      {
        model: 'Macan',
        years: yrs(2014, 2025),
        variants: [
          { engine: '2.0 Turbo', fuel: 'petrol', power_kw: 185, power_hp: 252, displacement_cc: 1984, transmission: 'dct', drive: 'awd', body: 'suv', doors: 5, year_from: 2021, tire_size: '235/55 R19', oil_spec: '0W-40' },
          { engine: 'Electric 100 kWh', fuel: 'electric', power_kw: 300, power_hp: 408, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2024, tire_size: '265/40 R21' },
        ],
      },
    ],
  },
  {
    make: 'Land Rover',
    models: [
      {
        model: 'Discovery Sport',
        years: yrs(2014, 2025),
        variants: [
          { engine: 'P200 AWD', fuel: 'petrol', power_kw: 147, power_hp: 200, displacement_cc: 1998, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2020, tire_size: '235/60 R18', oil_spec: '0W-20' },
          { engine: 'D165 AWD', fuel: 'diesel', power_kw: 120, power_hp: 163, displacement_cc: 1998, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2020, tire_size: '235/55 R19', oil_spec: '0W-30' },
        ],
      },
      {
        model: 'Range Rover Sport',
        years: yrs(2005, 2025),
        variants: [
          { engine: 'P400e PHEV', fuel: 'phev', power_kw: 297, power_hp: 404, displacement_cc: 1997, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2018, tire_size: '275/45 R21', oil_spec: '0W-20' },
          { engine: 'D350 MHEV', fuel: 'hybrid', power_kw: 257, power_hp: 350, displacement_cc: 2996, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2022, tire_size: '275/40 R22', oil_spec: '0W-30' },
        ],
      },
    ],
  },
  {
    make: 'Jeep',
    models: [
      {
        model: 'Compass',
        years: yrs(2006, 2025),
        variants: [
          { engine: '1.3 T4 FWD', fuel: 'petrol', power_kw: 110, power_hp: 150, displacement_cc: 1332, transmission: 'manual', drive: 'fwd', body: 'suv', doors: 5, year_from: 2021, tire_size: '215/60 R17', oil_spec: '5W-30' },
          { engine: '4xe PHEV', fuel: 'phev', power_kw: 177, power_hp: 241, displacement_cc: 1332, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2021, tire_size: '235/55 R18', oil_spec: '0W-20' },
        ],
      },
      {
        model: 'Renegade',
        years: yrs(2014, 2025),
        variants: [
          { engine: '1.0 GSE T3', fuel: 'petrol', power_kw: 88, power_hp: 120, displacement_cc: 999, transmission: 'manual', drive: 'fwd', body: 'suv', doors: 5, year_from: 2018, tire_size: '215/60 R16', oil_spec: '5W-30' },
          { engine: '4xe PHEV', fuel: 'phev', power_kw: 140, power_hp: 190, displacement_cc: 1332, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2020, tire_size: '215/55 R18', oil_spec: '0W-20' },
        ],
      },
    ],
  },
  {
    make: 'Mitsubishi',
    models: [
      {
        model: 'Outlander',
        years: yrs(2001, 2025),
        variants: [
          { engine: '2.0 PHEV AWD', fuel: 'phev', power_kw: 165, power_hp: 224, displacement_cc: 1998, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2013, tire_size: '225/55 R18', oil_spec: '5W-30' },
          { engine: '2.5 PHEV AWD', fuel: 'phev', power_kw: 176, power_hp: 239, displacement_cc: 2359, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2022, tire_size: '235/55 R18', oil_spec: '0W-20' },
        ],
      },
      {
        model: 'ASX',
        years: yrs(2010, 2025),
        variants: [
          { engine: '1.0 T CVT', fuel: 'petrol', power_kw: 69, power_hp: 94, displacement_cc: 999, transmission: 'cvt', drive: 'fwd', body: 'suv', doors: 5, year_from: 2023, tire_size: '215/55 R18', oil_spec: '5W-30' },
          { engine: '1.6 Hybrid', fuel: 'hybrid', power_kw: 84, power_hp: 114, displacement_cc: 1598, transmission: 'automatic', drive: 'fwd', body: 'suv', doors: 5, year_from: 2023, tire_size: '215/55 R18', oil_spec: '5W-30' },
        ],
      },
    ],
  },
  {
    make: 'Suzuki',
    models: [
      {
        model: 'Vitara',
        years: yrs(1988, 2025),
        variants: [
          { engine: '1.4 Boosterjet AWD', fuel: 'petrol', power_kw: 95, power_hp: 129, displacement_cc: 1373, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2015, tire_size: '215/55 R17', oil_spec: '0W-20' },
          { engine: '1.5 Hybrid AWD', fuel: 'hybrid', power_kw: 75, power_hp: 102, displacement_cc: 1462, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2022, tire_size: '215/55 R17', oil_spec: '0W-20' },
        ],
      },
      {
        model: 'Swift',
        years: yrs(2004, 2025),
        variants: [
          { engine: '1.2 Dualjet Hybrid', fuel: 'hybrid', power_kw: 66, power_hp: 90, displacement_cc: 1197, transmission: 'cvt', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2020, tire_size: '185/55 R16', oil_spec: '0W-20' },
          { engine: '1.4 Boosterjet Sport', fuel: 'petrol', power_kw: 95, power_hp: 129, displacement_cc: 1373, transmission: 'manual', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2017, tire_size: '195/45 R17', oil_spec: '5W-30' },
        ],
      },
    ],
  },
  {
    make: 'Dacia',
    models: [
      {
        model: 'Sandero',
        years: yrs(2008, 2025),
        variants: [
          { engine: '1.0 SCe', fuel: 'petrol', power_kw: 54, power_hp: 73, displacement_cc: 999, transmission: 'manual', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2021, tire_size: '185/65 R15', oil_spec: '5W-40' },
          { engine: '1.0 TCe 90', fuel: 'petrol', power_kw: 67, power_hp: 91, displacement_cc: 999, transmission: 'manual', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2021, tire_size: '185/65 R15', oil_spec: '5W-40' },
        ],
      },
      {
        model: 'Duster',
        years: yrs(2010, 2025),
        variants: [
          { engine: '1.0 TCe 90 4x2', fuel: 'petrol', power_kw: 67, power_hp: 91, displacement_cc: 999, transmission: 'manual', drive: 'fwd', body: 'suv', doors: 5, year_from: 2018, tire_size: '215/65 R16', oil_spec: '5W-40' },
          { engine: '1.3 TCe 4x4', fuel: 'petrol', power_kw: 96, power_hp: 130, displacement_cc: 1332, transmission: 'manual', drive: 'awd', body: 'suv', doors: 5, year_from: 2018, tire_size: '215/65 R17', oil_spec: '5W-40' },
        ],
      },
      {
        model: 'Jogger',
        years: yrs(2021, 2025),
        variants: [
          { engine: '1.0 TCe 110', fuel: 'petrol', power_kw: 81, power_hp: 110, displacement_cc: 999, transmission: 'manual', drive: 'fwd', body: 'minivan', doors: 5, year_from: 2022, tire_size: '205/60 R16', oil_spec: '5W-40' },
          { engine: '1.6 Hybrid 140', fuel: 'hybrid', power_kw: 103, power_hp: 140, displacement_cc: 1598, transmission: 'automatic', drive: 'fwd', body: 'minivan', doors: 5, year_from: 2023, tire_size: '205/60 R16', oil_spec: '5W-40' },
        ],
      },
    ],
  },
  {
    make: 'Alfa Romeo',
    models: [
      {
        model: 'Giulia',
        years: yrs(2016, 2025),
        variants: [
          { engine: '2.0 Turbo 200', fuel: 'petrol', power_kw: 147, power_hp: 200, displacement_cc: 1995, transmission: 'automatic', drive: 'rwd', body: 'sedan', doors: 4, year_from: 2016, tire_size: '225/50 R17', oil_spec: '5W-40' },
          { engine: '2.2 JTD 160', fuel: 'diesel', power_kw: 118, power_hp: 160, displacement_cc: 2143, transmission: 'automatic', drive: 'rwd', body: 'sedan', doors: 4, year_from: 2016, tire_size: '225/50 R17', oil_spec: '5W-30' },
          { engine: 'Quadrifoglio 2.9 V6', fuel: 'petrol', power_kw: 375, power_hp: 510, displacement_cc: 2891, transmission: 'automatic', drive: 'rwd', body: 'sedan', doors: 4, year_from: 2016, tire_size: '255/35 R19', oil_spec: '0W-40' },
        ],
      },
      {
        model: 'Stelvio',
        years: yrs(2017, 2025),
        variants: [
          { engine: '2.0 Turbo Q4', fuel: 'petrol', power_kw: 147, power_hp: 200, displacement_cc: 1995, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2017, tire_size: '235/55 R19', oil_spec: '5W-40' },
          { engine: '2.2 Diesel Q4', fuel: 'diesel', power_kw: 140, power_hp: 190, displacement_cc: 2143, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2017, tire_size: '235/55 R18', oil_spec: '5W-30' },
        ],
      },
    ],
  },
  {
    make: 'Tesla',
    models: [
      {
        model: 'Model 3',
        years: yrs(2017, 2025),
        variants: [
          { engine: 'Standard Range RWD', fuel: 'electric', power_kw: 211, power_hp: 287, transmission: 'automatic', drive: 'rwd', body: 'sedan', doors: 4, year_from: 2019, tire_size: '235/45 R18' },
          { engine: 'Long Range AWD', fuel: 'electric', power_kw: 324, power_hp: 440, transmission: 'automatic', drive: 'awd', body: 'sedan', doors: 4, year_from: 2019, tire_size: '235/40 R19' },
          { engine: 'Performance AWD', fuel: 'electric', power_kw: 393, power_hp: 534, transmission: 'automatic', drive: 'awd', body: 'sedan', doors: 4, year_from: 2019, tire_size: '245/35 R20' },
        ],
      },
      {
        model: 'Model Y',
        years: yrs(2020, 2025),
        variants: [
          { engine: 'Long Range AWD', fuel: 'electric', power_kw: 324, power_hp: 440, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2021, tire_size: '255/45 R19' },
          { engine: 'Performance AWD', fuel: 'electric', power_kw: 393, power_hp: 534, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2021, tire_size: '255/40 R21' },
        ],
      },
    ],
  },
  {
    make: 'Mini',
    models: [
      {
        model: 'Cooper',
        years: yrs(2001, 2025),
        variants: [
          { engine: '1.5 Cooper', fuel: 'petrol', power_kw: 100, power_hp: 136, displacement_cc: 1499, transmission: 'manual', drive: 'fwd', body: 'hatchback', doors: 3, year_from: 2014, tire_size: '195/55 R16', oil_spec: '5W-30 BMW LL-04' },
          { engine: '2.0 Cooper S', fuel: 'petrol', power_kw: 141, power_hp: 192, displacement_cc: 1998, transmission: 'manual', drive: 'fwd', body: 'hatchback', doors: 3, year_from: 2014, tire_size: '205/45 R17', oil_spec: '5W-30 BMW LL-04' },
          { engine: 'SE Electric', fuel: 'electric', power_kw: 135, power_hp: 184, transmission: 'automatic', drive: 'fwd', body: 'hatchback', doors: 3, year_from: 2020, tire_size: '195/55 R16' },
        ],
      },
      {
        model: 'Countryman',
        years: yrs(2010, 2025),
        variants: [
          { engine: 'Cooper S', fuel: 'petrol', power_kw: 141, power_hp: 192, displacement_cc: 1998, transmission: 'manual', drive: 'fwd', body: 'suv', doors: 5, year_from: 2017, tire_size: '225/50 R17', oil_spec: '5W-30 BMW LL-04' },
          { engine: 'Cooper S E ALL4', fuel: 'phev', power_kw: 165, power_hp: 224, displacement_cc: 1499, transmission: 'automatic', drive: 'awd', body: 'suv', doors: 5, year_from: 2017, tire_size: '225/50 R18', oil_spec: '5W-30 BMW LL-04' },
        ],
      },
    ],
  },
  {
    make: 'Lancia',
    models: [
      {
        model: 'Ypsilon',
        years: yrs(1995, 2025),
        variants: [
          { engine: '1.0 Hybrid', fuel: 'hybrid', power_kw: 51, power_hp: 70, displacement_cc: 999, transmission: 'manual', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2021, tire_size: '185/65 R15', oil_spec: '5W-30' },
          { engine: '1.2 69CV', fuel: 'petrol', power_kw: 51, power_hp: 69, displacement_cc: 1242, transmission: 'manual', drive: 'fwd', body: 'hatchback', doors: 5, year_from: 2011, year_to: 2021, tire_size: '185/60 R15', oil_spec: '5W-40' },
        ],
      },
    ],
  },
]

export const MAKES: string[] = vehicleDatabase.map(v => v.make).sort()

export function getModels(make: string): string[] {
  const entry = vehicleDatabase.find(v => v.make.toLowerCase() === make.toLowerCase())
  if (!entry) return []
  return entry.models.map(m => m.model)
}

export function getYears(make: string, model: string): number[] {
  const entry = vehicleDatabase.find(v => v.make.toLowerCase() === make.toLowerCase())
  if (!entry) return []
  const m = entry.models.find(m => m.model.toLowerCase() === model.toLowerCase())
  if (!m) return []
  return m.years
}

export function getVariants(make: string, model: string): VehicleVariant[] {
  const entry = vehicleDatabase.find(v => v.make.toLowerCase() === make.toLowerCase())
  if (!entry) return []
  const m = entry.models.find(m => m.model.toLowerCase() === model.toLowerCase())
  if (!m) return []
  return m.variants
}

export function searchVehicles(query: string): { make: string; model: string }[] {
  const q = query.toLowerCase()
  const results: { make: string; model: string }[] = []
  for (const make of vehicleDatabase) {
    for (const model of make.models) {
      if (make.make.toLowerCase().includes(q) || model.model.toLowerCase().includes(q)) {
        results.push({ make: make.make, model: model.model })
      }
    }
  }
  return results
}
