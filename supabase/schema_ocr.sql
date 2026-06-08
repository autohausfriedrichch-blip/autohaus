-- Registration documents / OCR
CREATE TABLE IF NOT EXISTS registration_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID,
  vehicle_id UUID,
  image_front_url TEXT,
  image_back_url TEXT,
  image_front_base64 TEXT,
  image_back_base64 TEXT,
  ocr_raw_text TEXT,
  ocr_provider TEXT DEFAULT 'google_vision',
  ocr_status TEXT DEFAULT 'pending', -- pending, processing, done, failed
  extracted_data JSONB,
  confidence_scores JSONB,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE registration_documents DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_reg_docs_customer ON registration_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_reg_docs_vehicle ON registration_documents(vehicle_id);

-- OCR activity log
CREATE TABLE IF NOT EXISTS ocr_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES registration_documents(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'scan', 'review', 'approved', 'rejected', 'customer_created', 'vehicle_created'
  user_id UUID,
  user_name TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ocr_logs DISABLE ROW LEVEL SECURITY;

-- Vehicle models database for selector
CREATE TABLE IF NOT EXISTS vehicle_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year_from INTEGER,
  year_to INTEGER,
  body_type TEXT,
  engine_code TEXT,
  displacement_cc INTEGER,
  power_kw INTEGER,
  fuel_type TEXT,
  transmission TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE vehicle_models DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_vehicle_models_make ON vehicle_models(make, model);

-- Seed common makes
INSERT INTO vehicle_models (make, model, year_from, year_to, body_type, fuel_type) VALUES
  ('Volkswagen', 'Golf', 2012, 2020, 'Hatchback', 'Benzin'),
  ('Volkswagen', 'Passat', 2014, 2023, 'Sedan', 'Diesel'),
  ('Volkswagen', 'Tiguan', 2016, 2023, 'SUV', 'Benzin'),
  ('Volkswagen', 'Polo', 2017, 2023, 'Hatchback', 'Benzin'),
  ('BMW', '3er', 2012, 2023, 'Sedan', 'Benzin'),
  ('BMW', '5er', 2016, 2023, 'Sedan', 'Diesel'),
  ('BMW', 'X3', 2017, 2023, 'SUV', 'Benzin'),
  ('BMW', 'X5', 2018, 2023, 'SUV', 'Diesel'),
  ('Mercedes-Benz', 'C-Klasse', 2014, 2023, 'Sedan', 'Benzin'),
  ('Mercedes-Benz', 'E-Klasse', 2016, 2023, 'Sedan', 'Diesel'),
  ('Mercedes-Benz', 'GLC', 2015, 2023, 'SUV', 'Benzin'),
  ('Audi', 'A3', 2012, 2023, 'Hatchback', 'Benzin'),
  ('Audi', 'A4', 2015, 2023, 'Sedan', 'Diesel'),
  ('Audi', 'Q5', 2017, 2023, 'SUV', 'Benzin'),
  ('Toyota', 'Corolla', 2018, 2023, 'Sedan', 'Hybrid'),
  ('Toyota', 'RAV4', 2018, 2023, 'SUV', 'Hybrid'),
  ('Skoda', 'Octavia', 2013, 2023, 'Sedan', 'Diesel'),
  ('Skoda', 'Superb', 2015, 2023, 'Sedan', 'Diesel'),
  ('Peugeot', '208', 2019, 2023, 'Hatchback', 'Benzin'),
  ('Peugeot', '3008', 2016, 2023, 'SUV', 'Diesel'),
  ('Renault', 'Clio', 2019, 2023, 'Hatchback', 'Benzin'),
  ('Renault', 'Megane', 2016, 2023, 'Hatchback', 'Benzin'),
  ('Ford', 'Focus', 2018, 2023, 'Hatchback', 'Benzin'),
  ('Ford', 'Kuga', 2019, 2023, 'SUV', 'Hybrid'),
  ('Opel', 'Astra', 2015, 2023, 'Hatchback', 'Benzin'),
  ('Opel', 'Insignia', 2017, 2023, 'Sedan', 'Diesel'),
  ('Volvo', 'XC60', 2017, 2023, 'SUV', 'Hybrid'),
  ('Volvo', 'V60', 2018, 2023, 'Kombi', 'Diesel'),
  ('Hyundai', 'Tucson', 2015, 2023, 'SUV', 'Benzin'),
  ('Kia', 'Sportage', 2016, 2023, 'SUV', 'Diesel'),
  ('Seat', 'Ibiza', 2017, 2023, 'Hatchback', 'Benzin'),
  ('Seat', 'Ateca', 2016, 2023, 'SUV', 'Diesel'),
  ('Tesla', 'Model 3', 2017, 2023, 'Sedan', 'Elektro'),
  ('Tesla', 'Model Y', 2020, 2023, 'SUV', 'Elektro')
ON CONFLICT DO NOTHING;
