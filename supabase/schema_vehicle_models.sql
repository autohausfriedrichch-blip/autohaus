-- Vehicle models reference table
CREATE TABLE IF NOT EXISTS vehicle_models (
  id             SERIAL PRIMARY KEY,
  make           TEXT NOT NULL,
  model          TEXT NOT NULL,
  year_from      INTEGER,
  year_to        INTEGER,
  body_type      TEXT,
  engine_label   TEXT,
  engine_code    TEXT,
  displacement_cc INTEGER,
  power_kw       INTEGER,
  power_hp       INTEGER,
  fuel_type      TEXT,
  transmission   TEXT,
  drive_type     TEXT,
  doors          INTEGER,
  tire_size      TEXT,
  oil_spec       TEXT
);

CREATE INDEX IF NOT EXISTS vehicle_models_make_idx ON vehicle_models (make);
CREATE INDEX IF NOT EXISTS vehicle_models_make_model_idx ON vehicle_models (make, model);

-- Seed data: Swiss-relevant makes and models
INSERT INTO vehicle_models (make, model, year_from, year_to, body_type, engine_label, displacement_cc, power_kw, power_hp, fuel_type, transmission, drive_type, doors, tire_size, oil_spec) VALUES

-- VW
('VW', 'Golf', 2013, 2020, 'hatchback', '1.4 TSI',    1395, 92,  125, 'petrol', 'manual',    'fwd', 5, '205/55 R16', '5W-30'),
('VW', 'Golf', 2013, 2020, 'hatchback', '2.0 TDI',    1968, 110, 150, 'diesel', 'manual',    'fwd', 5, '205/55 R16', '5W-30 507.00'),
('VW', 'Golf', 2013, 2020, 'hatchback', '2.0 GTI',    1984, 162, 220, 'petrol', 'dct',       'fwd', 5, '225/45 R17', '5W-30'),
('VW', 'Golf', 2020, 2025, 'hatchback', '1.0 eTSI',   999,  81,  110, 'petrol', 'dct',       'fwd', 5, '205/55 R16', '0W-20'),
('VW', 'Golf', 2020, 2025, 'hatchback', '2.0 TDI',    1968, 110, 150, 'diesel', 'dct',       'fwd', 5, '205/55 R16', '0W-30 507.00'),
('VW', 'Passat', 2015, 2023, 'estate',  '2.0 TDI',    1968, 110, 150, 'diesel', 'dct',       'fwd', 5, '215/55 R17', '5W-30 507.00'),
('VW', 'Passat', 2015, 2023, 'sedan',   '1.8 TSI',    1798, 132, 180, 'petrol', 'dct',       'fwd', 4, '215/55 R17', '5W-30'),
('VW', 'Tiguan', 2016, 2024, 'suv',     '2.0 TDI 4M', 1968, 140, 190, 'diesel', 'dct',       '4wd', 5, '235/50 R18', '5W-30 507.00'),
('VW', 'Tiguan', 2016, 2024, 'suv',     '2.0 TSI 4M', 1984, 140, 190, 'petrol', 'dct',       '4wd', 5, '235/50 R18', '5W-30'),
('VW', 'Polo', 2018, 2025, 'hatchback', '1.0 TSI',    999,  70,  95,  'petrol', 'manual',    'fwd', 5, '195/55 R15', '5W-30'),
('VW', 'T-Roc', 2018, 2025, 'suv',      '1.5 TSI',    1498, 110, 150, 'petrol', 'dct',       'fwd', 5, '215/50 R18', '0W-20'),
('VW', 'ID.3', 2020, 2025, 'hatchback', 'Elektromos', null, 150, 204, 'electric','automatic', 'rwd', 5, '215/45 R20', null),
('VW', 'ID.4', 2021, 2025, 'suv',       'Pro 77kWh',  null, 150, 204, 'electric','automatic', 'rwd', 5, '235/50 R20', null),

-- BMW
('BMW', '3-as sorozat', 2019, 2025, 'sedan',   '318d',  1995, 110, 150, 'diesel', 'automatic', 'rwd', 4, '225/45 R17', '0W-30 LL-17FE+'),
('BMW', '3-as sorozat', 2019, 2025, 'sedan',   '320d',  1995, 140, 190, 'diesel', 'automatic', 'rwd', 4, '225/45 R17', '0W-30 LL-17FE+'),
('BMW', '3-as sorozat', 2019, 2025, 'sedan',   '330i',  1998, 190, 258, 'petrol', 'automatic', 'rwd', 4, '225/40 R18', '0W-20 LL-17FE+'),
('BMW', '3-as sorozat', 2012, 2019, 'sedan',   '318d',  1995, 105, 143, 'diesel', 'manual',    'rwd', 4, '225/45 R17', '5W-30 LL-04'),
('BMW', '3-as sorozat', 2012, 2019, 'sedan',   '320d',  1995, 135, 184, 'diesel', 'automatic', 'rwd', 4, '225/45 R17', '5W-30 LL-04'),
('BMW', '5-ös sorozat', 2017, 2024, 'sedan',   '520d',  1995, 140, 190, 'diesel', 'automatic', 'rwd', 4, '225/55 R17', '0W-30 LL-17FE+'),
('BMW', '5-ös sorozat', 2017, 2024, 'sedan',   '530d',  2993, 195, 265, 'diesel', 'automatic', 'rwd', 4, '245/45 R18', '0W-30 LL-17FE+'),
('BMW', 'X3', 2018, 2024, 'suv',          'xDrive20d', 1995, 140, 190, 'diesel', 'automatic', '4wd', 5, '245/50 R18', '0W-30 LL-17FE+'),
('BMW', 'X3', 2018, 2024, 'suv',          'xDrive30i', 1998, 185, 252, 'petrol', 'automatic', '4wd', 5, '245/50 R18', '0W-20 LL-17FE+'),
('BMW', 'X5', 2019, 2025, 'suv',          'xDrive30d', 2993, 195, 265, 'diesel', 'automatic', '4wd', 5, '255/50 R19', '0W-30 LL-17FE+'),
('BMW', '1-es sorozat', 2020, 2025, 'hatchback','118d', 1995, 110, 150, 'diesel', 'automatic', 'fwd', 5, '205/55 R16', '0W-30 LL-17FE+'),

-- Mercedes-Benz
('Mercedes-Benz', 'C-osztály', 2015, 2021, 'sedan',   'C 200',   1991, 135, 184, 'petrol', 'automatic', 'rwd', 4, '225/45 R17', '5W-30 MB 229.51'),
('Mercedes-Benz', 'C-osztály', 2015, 2021, 'sedan',   'C 220d',  1950, 143, 194, 'diesel', 'automatic', 'rwd', 4, '225/45 R17', '5W-30 MB 229.52'),
('Mercedes-Benz', 'C-osztály', 2022, 2025, 'sedan',   'C 200',   1497, 150, 204, 'petrol', 'automatic', 'rwd', 4, '235/45 R18', '0W-20 MB 229.71'),
('Mercedes-Benz', 'E-osztály', 2017, 2024, 'sedan',   'E 220d',  1950, 143, 194, 'diesel', 'automatic', 'rwd', 4, '235/45 R18', '5W-30 MB 229.52'),
('Mercedes-Benz', 'GLC', 2016, 2023, 'suv',          'GLC 220d',1950, 143, 194, 'diesel', 'automatic', '4wd', 5, '235/55 R18', '5W-30 MB 229.52'),
('Mercedes-Benz', 'GLC', 2023, 2025, 'suv',          'GLC 300',  1999, 185, 252, 'petrol', 'automatic', '4wd', 5, '255/45 R19', '0W-20 MB 229.71'),
('Mercedes-Benz', 'A-osztály', 2019, 2025, 'hatchback','A 180d', 1461, 85,  116, 'diesel', 'automatic', 'fwd', 5, '205/55 R16', '5W-30 MB 229.52'),

-- Audi
('Audi', 'A4', 2016, 2024, 'sedan',     '2.0 TDI',   1968, 110, 150, 'diesel', 'manual',    'fwd', 4, '225/50 R17', '5W-30 VW 507.00'),
('Audi', 'A4', 2016, 2024, 'sedan',     '2.0 TFSI',  1984, 140, 190, 'petrol', 'automatic', 'fwd', 4, '225/50 R17', '5W-30 VW 504.00'),
('Audi', 'A4', 2016, 2024, 'estate',    '2.0 TDI Q', 1968, 110, 150, 'diesel', 'automatic', '4wd', 5, '225/50 R17', '5W-30 VW 507.00'),
('Audi', 'A6', 2018, 2024, 'sedan',     '40 TDI',    1968, 150, 204, 'diesel', 'automatic', 'fwd', 4, '245/40 R18', '0W-30 VW 508.00'),
('Audi', 'Q3', 2019, 2025, 'suv',       '35 TDI',    1968, 110, 150, 'diesel', 'automatic', 'fwd', 5, '235/50 R18', '5W-30 VW 507.00'),
('Audi', 'Q5', 2017, 2024, 'suv',       '40 TDI Q',  1968, 140, 190, 'diesel', 'automatic', '4wd', 5, '235/55 R18', '5W-30 VW 507.00'),
('Audi', 'A3', 2013, 2020, 'hatchback', '2.0 TDI',   1968, 110, 150, 'diesel', 'manual',    'fwd', 5, '225/45 R17', '5W-30 VW 507.00'),
('Audi', 'A3', 2021, 2025, 'hatchback', '35 TFSI',   1498, 110, 150, 'petrol', 'automatic', 'fwd', 5, '215/45 R17', '0W-20 VW 508.00'),

-- Toyota
('Toyota', 'Corolla', 2019, 2025, 'hatchback', '1.8 Hybrid',  1798, 72,  98,  'hybrid', 'cvt', 'fwd', 5, '195/65 R15', '0W-16'),
('Toyota', 'Corolla', 2019, 2025, 'estate',    '2.0 Hybrid',  1987, 152, 207, 'hybrid', 'cvt', 'fwd', 5, '225/40 R18', '0W-16'),
('Toyota', 'RAV4', 2019, 2025, 'suv',         '2.5 Hybrid',  2487, 163, 222, 'hybrid', 'cvt', 'awd', 5, '225/60 R18', '0W-16'),
('Toyota', 'Yaris', 2020, 2025, 'hatchback',  '1.5 Hybrid',  1490, 85,  116, 'hybrid', 'cvt', 'fwd', 5, '185/60 R15', '0W-16'),
('Toyota', 'GR Yaris', 2020, 2025, 'hatchback','1.6T GR4',   1618, 200, 272, 'petrol', 'manual', '4wd', 5, '215/40 R18', '0W-16'),
('Toyota', 'Land Cruiser', 2016, 2024, 'suv', '2.8 D-4D',    2755, 150, 204, 'diesel', 'automatic', '4wd', 5, '265/60 R18', '5W-30'),

-- Skoda
('Skoda', 'Octavia', 2013, 2020, 'estate',    '2.0 TDI',   1968, 110, 150, 'diesel', 'manual', 'fwd', 5, '205/55 R16', '5W-30 VW 507.00'),
('Skoda', 'Octavia', 2021, 2025, 'hatchback', '1.5 TSI',   1498, 110, 150, 'petrol', 'dct',    'fwd', 5, '215/45 R17', '0W-20'),
('Skoda', 'Superb', 2015, 2023, 'sedan',      '2.0 TDI',   1968, 110, 150, 'diesel', 'dct',    'fwd', 4, '225/45 R17', '5W-30 VW 507.00'),
('Skoda', 'Karoq', 2018, 2025, 'suv',         '1.5 TSI',   1498, 110, 150, 'petrol', 'dct',    'fwd', 5, '215/60 R16', '5W-30'),
('Skoda', 'Fabia', 2022, 2025, 'hatchback',   '1.0 MPI',   999,  48,  65,  'petrol', 'manual', 'fwd', 5, '185/65 R15', '0W-20'),

-- Ford
('Ford', 'Focus', 2015, 2022, 'hatchback', '1.5 EcoBoost', 1499, 110, 150, 'petrol', 'manual',    'fwd', 5, '205/55 R16', '5W-30'),
('Ford', 'Focus', 2019, 2025, 'hatchback', '1.0 EcoBoost', 999,  92,  125, 'petrol', 'automatic', 'fwd', 5, '205/55 R16', '5W-20'),
('Ford', 'Kuga', 2020, 2025, 'suv',       'PHEV 2.5',      2488, 165, 225, 'phev',   'cvt',       'fwd', 5, '235/50 R18', '5W-20'),
('Ford', 'Puma', 2020, 2025, 'suv',       '1.0 EcoBoost',  999,  92,  125, 'petrol', 'manual',    'fwd', 5, '215/55 R17', '5W-20'),

-- Renault
('Renault', 'Megane', 2016, 2023, 'hatchback', '1.5 dCi', 1461, 81,  110, 'diesel', 'manual',    'fwd', 5, '205/55 R16', '5W-30'),
('Renault', 'Kadjar', 2016, 2022, 'suv',       '1.5 dCi', 1461, 81,  110, 'diesel', 'manual',    'fwd', 5, '215/55 R17', '5W-30'),
('Renault', 'Clio', 2020, 2025, 'hatchback',   '1.0 SCe', 999,  65,  88,  'petrol', 'manual',    'fwd', 5, '185/65 R15', '5W-40'),
('Renault', 'Zoe', 2020, 2024, 'hatchback',    'R135',    null, 100, 135, 'electric','automatic', 'fwd', 5, '195/55 R16', null),

-- Peugeot
('Peugeot', '308', 2022, 2025, 'hatchback', '1.2 PureTech',  1199, 96,  130, 'petrol', 'automatic', 'fwd', 5, '205/55 R16', '5W-30'),
('Peugeot', '3008', 2017, 2025, 'suv',      '1.5 BlueHDi',  1499, 96,  130, 'diesel', 'automatic', 'fwd', 5, '225/55 R17', '5W-30'),
('Peugeot', '2008', 2020, 2025, 'suv',      'e-2008',        null, 100, 136, 'electric','automatic','fwd', 5, '205/55 R17', null),

-- Hyundai
('Hyundai', 'Tucson', 2021, 2025, 'suv',    '1.6 CRDI',  1598, 100, 136, 'diesel', 'dct',       'fwd', 5, '225/55 R17', '5W-30'),
('Hyundai', 'Kona', 2018, 2025, 'suv',      'Elektromos',null, 100, 136, 'electric','automatic', 'fwd', 5, '215/55 R17', null),
('Hyundai', 'i30', 2017, 2024, 'hatchback', '1.5 DPi',   1482, 81,  110, 'petrol', 'manual',    'fwd', 5, '205/55 R16', '5W-30'),

-- Kia
('Kia', 'Sportage', 2022, 2025, 'suv',   '1.6 CRDI',   1598, 100, 136, 'diesel', 'dct',       'fwd', 5, '225/55 R18', '5W-30'),
('Kia', 'EV6', 2022, 2025, 'suv',        'RWD 77kWh',  null, 168, 229, 'electric','automatic', 'rwd', 5, '235/55 R19', null),
('Kia', 'Ceed', 2018, 2024, 'hatchback', '1.4 T-GDI',  1353, 103, 140, 'petrol', 'dct',       'fwd', 5, '205/55 R16', '5W-30'),

-- Volvo
('Volvo', 'XC60', 2018, 2025, 'suv', 'D4 AWD',    1969, 140, 190, 'diesel', 'automatic', '4wd', 5, '235/60 R18', '0W-20'),
('Volvo', 'XC60', 2018, 2025, 'suv', 'T6 AWD',    1969, 246, 335, 'phev',   'automatic', '4wd', 5, '235/60 R18', '0W-20'),
('Volvo', 'V60', 2019, 2025, 'estate', 'D3',       1969, 110, 150, 'diesel', 'automatic', 'fwd', 5, '235/45 R18', '0W-20'),
('Volvo', 'XC40', 2018, 2025, 'suv', 'Recharge',  null, 170, 231, 'electric','automatic', 'fwd', 5, '235/50 R19', null),

-- Mazda
('Mazda', 'CX-5', 2017, 2025, 'suv',     'SKYACTIV-D 150', 2191, 110, 150, 'diesel', 'automatic', 'awd', 5, '225/65 R17', '5W-30'),
('Mazda', 'Mazda3', 2019, 2025, 'hatchback','SKYACTIV-G 2.0',1998, 90,  122, 'petrol', 'manual',    'fwd', 5, '215/45 R18', '5W-30'),
('Mazda', 'MX-5', 2016, 2025, 'convertible','1.5 SKYACTIV', 1496, 97,  132, 'petrol', 'manual',    'rwd', 2, '195/50 R16', '5W-30'),

-- Subaru
('Subaru', 'Forester', 2019, 2025, 'suv', 'e-BOXER',    1995, 110, 150, 'hybrid', 'cvt',  '4wd', 5, '225/60 R17', '0W-20'),
('Subaru', 'Outback', 2021, 2025, 'estate','2.5i',       2498, 124, 169, 'petrol', 'cvt',  '4wd', 5, '225/60 R17', '0W-20'),
('Subaru', 'XV', 2018, 2023, 'suv',       '2.0i Hybrid', 1995, 110, 150, 'hybrid', 'cvt',  '4wd', 5, '225/55 R17', '0W-20'),

-- Seat/Cupra
('Seat', 'Leon', 2021, 2025, 'hatchback', '1.5 eTSI',  1498, 96,  130, 'petrol', 'dct',    'fwd', 5, '215/45 R17', '0W-20 VW 508.00'),
('Seat', 'Ateca', 2017, 2024, 'suv',      '2.0 TDI',   1968, 110, 150, 'diesel', 'dct',    'fwd', 5, '215/55 R17', '5W-30 VW 507.00'),

-- Opel
('Opel', 'Astra', 2022, 2025, 'hatchback', '1.2 Turbo',  1199, 96,  130, 'petrol', 'automatic', 'fwd', 5, '215/55 R16', '5W-30'),
('Opel', 'Mokka', 2021, 2025, 'suv',       '1.2 Turbo',  1199, 96,  130, 'petrol', 'automatic', 'fwd', 5, '215/55 R17', '5W-30'),
('Opel', 'Grandland', 2018, 2025, 'suv',   'PHEV4',      1598, 165, 225, 'phev',   'automatic', 'awd', 5, '235/55 R18', '0W-20'),

-- Tesla
('Tesla', 'Model 3', 2019, 2025, 'sedan', 'Standard Range', null, 239, 325, 'electric', 'automatic', 'rwd', 4, '235/45 R18', null),
('Tesla', 'Model 3', 2019, 2025, 'sedan', 'Long Range AWD', null, 346, 470, 'electric', 'automatic', 'awd', 4, '235/45 R18', null),
('Tesla', 'Model Y', 2021, 2025, 'suv',   'Long Range AWD', null, 377, 513, 'electric', 'automatic', 'awd', 5, '255/45 R19', null),
('Tesla', 'Model Y', 2021, 2025, 'suv',   'Performance',    null, 450, 612, 'electric', 'automatic', 'awd', 5, '255/45 R20', null),

-- Porsche
('Porsche', 'Cayenne', 2018, 2025, 'suv',    'E-Hybrid',   2995, 340, 462, 'phev', 'automatic', '4wd', 5, '285/45 R20', '0W-40'),
('Porsche', '911', 2019, 2025, 'coupe',      'Carrera S',  2981, 331, 450, 'petrol', 'dct',    'rwd', 2, '245/35 R20', '0W-40'),
('Porsche', 'Macan', 2015, 2024, 'suv',      '2.0T',       1984, 185, 252, 'petrol', 'dct',    '4wd', 5, '235/60 R18', '5W-30'),

-- Land Rover
('Land Rover', 'Discovery Sport', 2015, 2024, 'suv', '2.0D',  1999, 110, 150, 'diesel', 'automatic', '4wd', 5, '235/60 R18', '5W-30'),
('Land Rover', 'Defender', 2020, 2025, 'suv',        '3.0D',  2996, 183, 249, 'diesel', 'automatic', '4wd', 5, '255/65 R18', '5W-30'),
('Land Rover', 'Range Rover Evoque', 2020, 2025, 'suv','P200', 1498, 147, 200, 'petrol', 'automatic', '4wd', 5, '235/55 R18', '0W-20'),

-- Mini
('Mini', 'Cooper', 2014, 2024, 'hatchback', 'Cooper D',   1496, 85,  116, 'diesel', 'manual',    'fwd', 3, '205/45 R17', '5W-30'),
('Mini', 'Cooper', 2014, 2024, 'hatchback', 'Cooper S',   1998, 141, 192, 'petrol', 'manual',    'fwd', 3, '205/45 R17', '5W-30'),
('Mini', 'Countryman', 2017, 2024, 'suv',   'Cooper SD',  1995, 140, 190, 'diesel', 'automatic', 'awd', 5, '215/55 R17', '5W-30'),

-- Dacia
('Dacia', 'Sandero', 2021, 2025, 'hatchback', '1.0 TCe',   999,  67,  91,  'petrol', 'manual', 'fwd', 5, '185/65 R15', '5W-40'),
('Dacia', 'Duster', 2018, 2025, 'suv',       '1.5 dCi',  1461, 85,  115, 'diesel', 'manual', 'fwd', 5, '215/65 R16', '5W-40'),

-- Honda
('Honda', 'CR-V', 2019, 2025, 'suv',       'e:HEV',   1993, 145, 197, 'hybrid', 'cvt',       'awd', 5, '235/60 R18', '0W-20'),
('Honda', 'Civic', 2023, 2025, 'hatchback','2.0 e:HEV',1993, 135, 184, 'hybrid', 'cvt',       'fwd', 5, '235/40 R18', '0W-20'),

-- Nissan
('Nissan', 'Qashqai', 2022, 2025, 'suv',  'e-Power', 1498, 140, 190, 'hybrid', 'automatic', 'fwd', 5, '235/50 R18', '5W-30'),
('Nissan', 'Leaf', 2018, 2024, 'hatchback','40kWh',   null, 110, 150, 'electric','automatic', 'fwd', 5, '205/55 R16', null),
('Nissan', 'Ariya', 2022, 2025, 'suv',    'e-4ORCE', null, 225, 306, 'electric','automatic', 'awd', 5, '255/45 R20', null),

-- Alfa Romeo
('Alfa Romeo', 'Stelvio', 2017, 2025, 'suv',   '2.2 D', 2143, 140, 190, 'diesel', 'automatic', 'awd', 5, '225/55 R18', '5W-30'),
('Alfa Romeo', 'Giulia', 2017, 2025, 'sedan',  '2.2 D', 2143, 140, 190, 'diesel', 'automatic', 'rwd', 4, '225/45 R17', '5W-30'),

-- Mitsubishi
('Mitsubishi', 'Outlander', 2022, 2025, 'suv',  'PHEV',   2360, 178, 242, 'phev', 'automatic', 'awd', 5, '225/60 R18', '0W-20'),
('Mitsubishi', 'Eclipse Cross', 2018, 2025, 'suv','PHEV',  2360, 178, 242, 'phev', 'automatic', 'awd', 5, '225/55 R18', '0W-20'),

-- Suzuki
('Suzuki', 'Vitara', 2019, 2025, 'suv',    '1.4 Boosterjet', 1373, 95,  129, 'petrol', 'automatic', 'awd', 5, '215/55 R17', '0W-20'),
('Suzuki', 'Swift', 2018, 2024, 'hatchback','1.2 DualJet',   1197, 61,  83,  'hybrid', 'manual',    'fwd', 5, '185/55 R15', '0W-16'),

-- Fiat
('Fiat', '500', 2020, 2025, 'hatchback', '500e',           null, 87,  118, 'electric','automatic', 'fwd', 3, '185/55 R15', null),
('Fiat', 'Tipo', 2016, 2024, 'hatchback', '1.6 Multijet',  1598, 88,  120, 'diesel',  'manual',    'fwd', 5, '205/55 R16', '5W-30'),

-- Jeep
('Jeep', 'Compass', 2022, 2025, 'suv',   '1.3T PHEV',   1332, 177, 240, 'phev', 'automatic', 'awd', 5, '215/60 R17', '5W-30'),
('Jeep', 'Renegade', 2020, 2025, 'suv',  '1.3T PHEV',   1332, 177, 240, 'phev', 'automatic', 'awd', 5, '215/60 R17', '5W-30');
