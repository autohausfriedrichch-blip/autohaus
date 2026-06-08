-- work_orders.service_id: NOT NULL megszüntetése (opcionális mező)
ALTER TABLE work_orders ALTER COLUMN service_id DROP NOT NULL;

SELECT 'OK – service_id most nullable' AS status;
