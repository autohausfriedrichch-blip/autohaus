-- ============================================================
-- AUTOHAUS FRIEDRICH – Supabase RLS Policies
-- Futtatás: Supabase SQL Editor → Run
-- ============================================================

-- ─── Helper functions ────────────────────────────────────────

create or replace function get_my_role()
returns text language sql stable security definer as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function is_admin()
returns boolean language sql stable security definer as $$
  select exists(
    select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')
  )
$$;

create or replace function is_mechanic()
returns boolean language sql stable security definer as $$
  select exists(
    select 1 from profiles where id = auth.uid() and role = 'mechanic'
  )
$$;

-- ============================================================
-- CORE TABLES (biztosan léteznek)
-- ============================================================

-- PROFILES
alter table profiles enable row level security;
drop policy if exists "profiles_select"       on profiles;
drop policy if exists "profiles_update_own"   on profiles;
drop policy if exists "profiles_insert_admin" on profiles;
drop policy if exists "profiles_delete_admin" on profiles;
create policy "profiles_select"       on profiles for select using (auth.uid() is not null);
create policy "profiles_update_own"   on profiles for update using (id = auth.uid());
create policy "profiles_insert_admin" on profiles for insert with check (is_admin());
create policy "profiles_delete_admin" on profiles for delete using (is_admin());

-- CUSTOMERS
alter table customers enable row level security;
drop policy if exists "customers_select" on customers;
drop policy if exists "customers_insert" on customers;
drop policy if exists "customers_update" on customers;
drop policy if exists "customers_delete" on customers;
create policy "customers_select" on customers for select using (auth.uid() is not null);
create policy "customers_insert" on customers for insert with check (is_admin());
create policy "customers_update" on customers for update using (is_admin());
create policy "customers_delete" on customers for delete using (is_admin());

-- VEHICLES
alter table vehicles enable row level security;
drop policy if exists "vehicles_select" on vehicles;
drop policy if exists "vehicles_insert" on vehicles;
drop policy if exists "vehicles_update" on vehicles;
drop policy if exists "vehicles_delete" on vehicles;
create policy "vehicles_select" on vehicles for select using (auth.uid() is not null);
create policy "vehicles_insert" on vehicles for insert with check (is_admin());
create policy "vehicles_update" on vehicles for update using (is_admin());
create policy "vehicles_delete" on vehicles for delete using (is_admin());

-- WORK ORDERS
alter table work_orders enable row level security;
drop policy if exists "wo_select" on work_orders;
drop policy if exists "wo_insert" on work_orders;
drop policy if exists "wo_update" on work_orders;
drop policy if exists "wo_delete"  on work_orders;
create policy "wo_select" on work_orders for select using (is_admin() or mechanic_id = auth.uid());
create policy "wo_insert" on work_orders for insert with check (is_admin());
create policy "wo_update" on work_orders for update using (is_admin() or mechanic_id = auth.uid());
create policy "wo_delete"  on work_orders for delete using (is_admin());

-- WORK ORDER EVENTS
alter table work_order_events enable row level security;
drop policy if exists "woe_select" on work_order_events;
drop policy if exists "woe_insert" on work_order_events;
drop policy if exists "woe_update" on work_order_events;
drop policy if exists "woe_delete"  on work_order_events;
create policy "woe_select" on work_order_events for select using (
  is_admin() or exists(select 1 from work_orders wo where wo.id = work_order_id and wo.mechanic_id = auth.uid())
);
create policy "woe_insert" on work_order_events for insert with check (
  is_admin() or exists(select 1 from work_orders wo where wo.id = work_order_id and wo.mechanic_id = auth.uid())
);
create policy "woe_update" on work_order_events for update using (is_admin());
create policy "woe_delete"  on work_order_events for delete using (is_admin());

-- WORK ORDER TASKS
alter table work_order_tasks enable row level security;
drop policy if exists "wot_select" on work_order_tasks;
drop policy if exists "wot_insert" on work_order_tasks;
drop policy if exists "wot_update" on work_order_tasks;
drop policy if exists "wot_delete"  on work_order_tasks;
create policy "wot_select" on work_order_tasks for select using (
  is_admin() or exists(select 1 from work_orders wo where wo.id = work_order_id and wo.mechanic_id = auth.uid())
);
create policy "wot_insert" on work_order_tasks for insert with check (
  is_admin() or exists(select 1 from work_orders wo where wo.id = work_order_id and wo.mechanic_id = auth.uid())
);
create policy "wot_update" on work_order_tasks for update using (
  is_admin() or exists(select 1 from work_orders wo where wo.id = work_order_id and wo.mechanic_id = auth.uid())
);
create policy "wot_delete"  on work_order_tasks for delete using (is_admin());

-- WORK ORDER PHOTOS
alter table work_order_photos enable row level security;
drop policy if exists "wop_select" on work_order_photos;
drop policy if exists "wop_insert" on work_order_photos;
drop policy if exists "wop_update" on work_order_photos;
drop policy if exists "wop_delete"  on work_order_photos;
create policy "wop_select" on work_order_photos for select using (
  is_admin() or exists(select 1 from work_orders wo where wo.id = work_order_id and wo.mechanic_id = auth.uid())
);
create policy "wop_insert" on work_order_photos for insert with check (
  is_admin() or exists(select 1 from work_orders wo where wo.id = work_order_id and wo.mechanic_id = auth.uid())
);
create policy "wop_update" on work_order_photos for update using (
  is_admin() or exists(select 1 from work_orders wo where wo.id = work_order_id and wo.mechanic_id = auth.uid())
);
create policy "wop_delete"  on work_order_photos for delete using (is_admin());

-- BOOKINGS
alter table bookings enable row level security;
drop policy if exists "bookings_select" on bookings;
drop policy if exists "bookings_insert" on bookings;
drop policy if exists "bookings_update" on bookings;
drop policy if exists "bookings_delete" on bookings;
create policy "bookings_select" on bookings for select using (auth.uid() is not null);
create policy "bookings_insert" on bookings for insert with check (is_admin());
create policy "bookings_update" on bookings for update using (is_admin());
create policy "bookings_delete" on bookings for delete using (is_admin());

-- QUOTES
alter table quotes enable row level security;
drop policy if exists "quotes_all" on quotes;
create policy "quotes_all" on quotes for all using (is_admin());

-- TASKS
alter table tasks enable row level security;
drop policy if exists "tasks_select" on tasks;
drop policy if exists "tasks_insert" on tasks;
drop policy if exists "tasks_update" on tasks;
drop policy if exists "tasks_delete"  on tasks;
create policy "tasks_select" on tasks for select using (is_admin() or assigned_to = auth.uid());
create policy "tasks_insert" on tasks for insert with check (auth.uid() is not null);
create policy "tasks_update" on tasks for update using (is_admin() or assigned_to = auth.uid());
create policy "tasks_delete"  on tasks for delete using (is_admin());

-- PARTS REQUESTS
alter table parts_requests enable row level security;
drop policy if exists "parts_select" on parts_requests;
drop policy if exists "parts_insert" on parts_requests;
drop policy if exists "parts_update" on parts_requests;
drop policy if exists "parts_delete"  on parts_requests;
create policy "parts_select" on parts_requests for select using (auth.uid() is not null);
create policy "parts_insert" on parts_requests for insert with check (auth.uid() is not null);
create policy "parts_update" on parts_requests for update using (auth.uid() is not null);
create policy "parts_delete"  on parts_requests for delete using (is_admin());

-- NOTIFICATIONS
alter table notifications enable row level security;
drop policy if exists "notif_select" on notifications;
drop policy if exists "notif_insert" on notifications;
drop policy if exists "notif_update" on notifications;
drop policy if exists "notif_delete"  on notifications;
create policy "notif_select" on notifications for select using (is_admin() or user_id = auth.uid());
create policy "notif_insert" on notifications for insert with check (auth.uid() is not null);
create policy "notif_update" on notifications for update using (is_admin() or user_id = auth.uid());
create policy "notif_delete"  on notifications for delete using (is_admin() or user_id = auth.uid());

-- SERVICES
alter table services enable row level security;
drop policy if exists "services_select" on services;
drop policy if exists "services_write"  on services;
create policy "services_select" on services for select using (auth.uid() is not null);
create policy "services_write"  on services for all using (is_admin());

-- FOUNDER IDEAS
alter table founder_ideas enable row level security;
drop policy if exists "founder_ideas_own" on founder_ideas;
create policy "founder_ideas_own" on founder_ideas for all using (user_id = auth.uid());

-- ============================================================
-- OPTIONAL TABLES (csak ha léteznek)
-- DO blokk: hiba esetén továbblép
-- ============================================================

do $$ begin
  alter table emails enable row level security;
  drop policy if exists "emails_all" on emails;
  create policy "emails_all" on emails for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table email_accounts enable row level security;
  drop policy if exists "email_accounts_all" on email_accounts;
  create policy "email_accounts_all" on email_accounts for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table email_templates enable row level security;
  drop policy if exists "email_templates_select" on email_templates;
  drop policy if exists "email_templates_write"  on email_templates;
  create policy "email_templates_select" on email_templates for select using (auth.uid() is not null);
  create policy "email_templates_write"  on email_templates for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table marketing_templates enable row level security;
  drop policy if exists "mkt_templates_select" on marketing_templates;
  drop policy if exists "mkt_templates_write"  on marketing_templates;
  create policy "mkt_templates_select" on marketing_templates for select using (auth.uid() is not null);
  create policy "mkt_templates_write"  on marketing_templates for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table marketing_campaigns enable row level security;
  drop policy if exists "mkt_campaigns_all" on marketing_campaigns;
  create policy "mkt_campaigns_all" on marketing_campaigns for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table marketing_sends enable row level security;
  drop policy if exists "mkt_sends_all" on marketing_sends;
  create policy "mkt_sends_all" on marketing_sends for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table mechanic_locations enable row level security;
  drop policy if exists "mech_loc_select" on mechanic_locations;
  drop policy if exists "mech_loc_insert" on mechanic_locations;
  drop policy if exists "mech_loc_update" on mechanic_locations;
  create policy "mech_loc_select" on mechanic_locations for select using (is_admin() or mechanic_id = auth.uid());
  create policy "mech_loc_insert" on mechanic_locations for insert with check (mechanic_id = auth.uid());
  create policy "mech_loc_update" on mechanic_locations for update using (mechanic_id = auth.uid());
exception when undefined_table then null; end $$;

do $$ begin
  alter table expenses enable row level security;
  drop policy if exists "expenses_all" on expenses;
  create policy "expenses_all" on expenses for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table payments enable row level security;
  drop policy if exists "payments_all" on payments;
  create policy "payments_all" on payments for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table maintenance_reminders enable row level security;
  drop policy if exists "reminders_select" on maintenance_reminders;
  drop policy if exists "reminders_write"  on maintenance_reminders;
  create policy "reminders_select" on maintenance_reminders for select using (auth.uid() is not null);
  create policy "reminders_write"  on maintenance_reminders for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table pickup_deliveries enable row level security;
  drop policy if exists "pickup_select" on pickup_deliveries;
  drop policy if exists "pickup_write"  on pickup_deliveries;
  create policy "pickup_select" on pickup_deliveries for select using (auth.uid() is not null);
  create policy "pickup_write"  on pickup_deliveries for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table messages enable row level security;
  drop policy if exists "messages_all" on messages;
  create policy "messages_all" on messages for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table communication_logs enable row level security;
  drop policy if exists "comm_logs_all" on communication_logs;
  create policy "comm_logs_all" on communication_logs for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table referrals enable row level security;
  drop policy if exists "referrals_all" on referrals;
  create policy "referrals_all" on referrals for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table qc_checks enable row level security;
  drop policy if exists "qc_select" on qc_checks;
  drop policy if exists "qc_write"  on qc_checks;
  create policy "qc_select" on qc_checks for select using (auth.uid() is not null);
  create policy "qc_write"  on qc_checks for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table vehicle_events enable row level security;
  drop policy if exists "vehicle_events_select" on vehicle_events;
  drop policy if exists "vehicle_events_write"  on vehicle_events;
  create policy "vehicle_events_select" on vehicle_events for select using (auth.uid() is not null);
  create policy "vehicle_events_write"  on vehicle_events for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table vehicle_health_reports enable row level security;
  drop policy if exists "vhr_all" on vehicle_health_reports;
  create policy "vhr_all" on vehicle_health_reports for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table tire_hotel enable row level security;
  drop policy if exists "tire_hotel_all" on tire_hotel;
  create policy "tire_hotel_all" on tire_hotel for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table parts_inventory enable row level security;
  drop policy if exists "parts_inv_select" on parts_inventory;
  drop policy if exists "parts_inv_write"  on parts_inventory;
  create policy "parts_inv_select" on parts_inventory for select using (auth.uid() is not null);
  create policy "parts_inv_write"  on parts_inventory for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table parts_catalog enable row level security;
  drop policy if exists "parts_cat_select" on parts_catalog;
  drop policy if exists "parts_cat_write"  on parts_catalog;
  create policy "parts_cat_select" on parts_catalog for select using (auth.uid() is not null);
  create policy "parts_cat_write"  on parts_catalog for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table suppliers enable row level security;
  drop policy if exists "suppliers_select" on suppliers;
  drop policy if exists "suppliers_write"  on suppliers;
  create policy "suppliers_select" on suppliers for select using (auth.uid() is not null);
  create policy "suppliers_write"  on suppliers for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table signatures enable row level security;
  drop policy if exists "signatures_select" on signatures;
  drop policy if exists "signatures_write"  on signatures;
  create policy "signatures_select" on signatures for select using (auth.uid() is not null);
  create policy "signatures_write"  on signatures for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table app_settings enable row level security;
  drop policy if exists "app_settings_select" on app_settings;
  drop policy if exists "app_settings_write"  on app_settings;
  create policy "app_settings_select" on app_settings for select using (auth.uid() is not null);
  create policy "app_settings_write"  on app_settings for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table system_settings enable row level security;
  drop policy if exists "sys_settings_all" on system_settings;
  create policy "sys_settings_all" on system_settings for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table technician_flags enable row level security;
  drop policy if exists "tech_flags_select" on technician_flags;
  drop policy if exists "tech_flags_write"  on technician_flags;
  create policy "tech_flags_select" on technician_flags for select using (auth.uid() is not null);
  create policy "tech_flags_write"  on technician_flags for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table stock_movements enable row level security;
  drop policy if exists "stock_mov_all" on stock_movements;
  create policy "stock_mov_all" on stock_movements for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table travel_costs enable row level security;
  drop policy if exists "travel_costs_all" on travel_costs;
  create policy "travel_costs_all" on travel_costs for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table ocr_logs enable row level security;
  drop policy if exists "ocr_logs_all" on ocr_logs;
  create policy "ocr_logs_all" on ocr_logs for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table registration_documents enable row level security;
  drop policy if exists "reg_docs_select" on registration_documents;
  drop policy if exists "reg_docs_write"  on registration_documents;
  create policy "reg_docs_select" on registration_documents for select using (auth.uid() is not null);
  create policy "reg_docs_write"  on registration_documents for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table service_templates enable row level security;
  drop policy if exists "svc_tmpl_select" on service_templates;
  drop policy if exists "svc_tmpl_write"  on service_templates;
  create policy "svc_tmpl_select" on service_templates for select using (auth.uid() is not null);
  create policy "svc_tmpl_write"  on service_templates for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table service_template_items enable row level security;
  drop policy if exists "svc_tmpl_items_select" on service_template_items;
  drop policy if exists "svc_tmpl_items_write"  on service_template_items;
  create policy "svc_tmpl_items_select" on service_template_items for select using (auth.uid() is not null);
  create policy "svc_tmpl_items_write"  on service_template_items for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table fleet_accounts enable row level security;
  drop policy if exists "fleet_all" on fleet_accounts;
  create policy "fleet_all" on fleet_accounts for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table family_accounts enable row level security;
  drop policy if exists "family_all" on family_accounts;
  create policy "family_all" on family_accounts for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table customer_followups enable row level security;
  drop policy if exists "followups_all" on customer_followups;
  create policy "followups_all" on customer_followups for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table vehicle_models enable row level security;
  drop policy if exists "vehicle_models_select" on vehicle_models;
  drop policy if exists "vehicle_models_write"  on vehicle_models;
  create policy "vehicle_models_select" on vehicle_models for select using (auth.uid() is not null);
  create policy "vehicle_models_write"  on vehicle_models for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table work_order_timeline enable row level security;
  drop policy if exists "wo_timeline_select" on work_order_timeline;
  drop policy if exists "wo_timeline_write"  on work_order_timeline;
  create policy "wo_timeline_select" on work_order_timeline for select using (
    is_admin() or exists(select 1 from work_orders wo where wo.id = work_order_id and wo.mechanic_id = auth.uid())
  );
  create policy "wo_timeline_write" on work_order_timeline for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table work_order_service_items enable row level security;
  drop policy if exists "wosi_select" on work_order_service_items;
  drop policy if exists "wosi_write"  on work_order_service_items;
  create policy "wosi_select" on work_order_service_items for select using (
    is_admin() or exists(select 1 from work_orders wo where wo.id = work_order_id and wo.mechanic_id = auth.uid())
  );
  create policy "wosi_write" on work_order_service_items for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table activity_log enable row level security;
  drop policy if exists "activity_log_all" on activity_log;
  create policy "activity_log_all" on activity_log for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table system_audit_log enable row level security;
  drop policy if exists "audit_log_all" on system_audit_log;
  create policy "audit_log_all" on system_audit_log for all using (is_admin());
exception when undefined_table then null; end $$;

do $$ begin
  alter table notification_preferences enable row level security;
  drop policy if exists "notif_prefs_own" on notification_preferences;
  create policy "notif_prefs_own" on notification_preferences for all using (user_id = auth.uid());
exception when undefined_table then null; end $$;
