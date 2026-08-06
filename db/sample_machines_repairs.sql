-- Add sample machines and repairs linked to existing customers
-- Run in Supabase SQL Editor (service role context)
-- Works with common camelCase/snake_case column variants.

DO $$
DECLARE
  -- Customers columns
  c_name_col text;
  c_first_name_col text;
  c_last_name_col text;

  -- Machines columns
  m_customer_id_col text;
  m_name_col text;
  m_brand_col text;
  m_model_col text;
  m_serial_col text;
  m_purchase_col text;
  m_notes_col text;
  m_created_col text;
  m_updated_col text;

  -- Repairs columns
  r_id_col text;
  r_repair_number_col text;
  r_customer_col text;
  r_customer_id_col text;
  r_phone_col text;
  r_email_col text;
  r_city_col text;
  r_brand_col text;
  r_model_col text;
  r_machine_col text;
  r_machine_id_col text;
  r_issue_col text;
  r_repair_col text;
  r_parts_col text;
  r_shelf_col text;
  r_status_col text;
  r_date_col text;
  r_price_col text;
  r_notes_col text;
  r_payment_col text;
  r_history_col text;
  r_created_col text;
  r_updated_col text;
  r_id_is_uuid boolean := false;

  -- Status history columns
  h_repair_id_col text;
  h_status_col text;
  h_note_col text;
  h_user_name_col text;
  h_created_col text;
  h_repair_id_is_uuid boolean := false;

  v_sql text;
  v_customer_id uuid;
  v_machine_id uuid;
  v_repair_uuid uuid;
  v_history_repair_uuid uuid;
  v_first_name text;
  v_last_name text;
  v_sep text;
  v_machine_customer_id_required boolean := false;
  machines_inserted integer := 0;
  repairs_inserted integer := 0;
  history_inserted integer := 0;
  m record;
  r record;
BEGIN
  -- Detect customer naming columns
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'name') THEN 'name'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'full_name') THEN 'full_name'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'customer_name') THEN 'customer_name'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'naam') THEN 'naam'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'klantnaam') THEN 'klantnaam'
    ELSE NULL
  END INTO c_name_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'first_name') THEN 'first_name'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'voornaam') THEN 'voornaam'
    ELSE NULL
  END INTO c_first_name_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'last_name') THEN 'last_name'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'achternaam') THEN 'achternaam'
    ELSE NULL
  END INTO c_last_name_col;

  -- Detect machines columns
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machines' AND column_name = 'customerId') THEN 'customerId'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machines' AND column_name = 'customer_id') THEN 'customer_id'
    ELSE NULL
  END INTO m_customer_id_col;

  IF m_customer_id_col IS NOT NULL THEN
    SELECT (is_nullable = 'NO')
    INTO v_machine_customer_id_required
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'machines'
      AND column_name = m_customer_id_col
    LIMIT 1;
  END IF;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machines' AND column_name = 'name') THEN 'name'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machines' AND column_name = 'machine_name') THEN 'machine_name'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machines' AND column_name = 'naam') THEN 'naam'
    ELSE NULL
  END INTO m_name_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machines' AND column_name = 'brand') THEN 'brand'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machines' AND column_name = 'merk') THEN 'merk'
    ELSE NULL
  END INTO m_brand_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machines' AND column_name = 'model') THEN 'model'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machines' AND column_name = 'type') THEN 'type'
    ELSE NULL
  END INTO m_model_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machines' AND column_name = 'serialNumber') THEN 'serialNumber'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machines' AND column_name = 'serial_number') THEN 'serial_number'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machines' AND column_name = 'serienummer') THEN 'serienummer'
    ELSE NULL
  END INTO m_serial_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machines' AND column_name = 'purchaseDate') THEN 'purchaseDate'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machines' AND column_name = 'purchase_date') THEN 'purchase_date'
    ELSE NULL
  END INTO m_purchase_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machines' AND column_name = 'notes') THEN 'notes'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machines' AND column_name = 'note') THEN 'note'
    ELSE NULL
  END INTO m_notes_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machines' AND column_name = 'createdAt') THEN 'createdAt'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machines' AND column_name = 'created_at') THEN 'created_at'
    ELSE NULL
  END INTO m_created_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machines' AND column_name = 'updatedAt') THEN 'updatedAt'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machines' AND column_name = 'updated_at') THEN 'updated_at'
    ELSE NULL
  END INTO m_updated_col;

  IF m_name_col IS NULL AND m_brand_col IS NULL AND m_model_col IS NULL THEN
    RAISE NOTICE 'Machines seed skipped: no supported machine identifier columns found (name/brand/model).';
  ELSE
    FOR m IN
      SELECT *
      FROM jsonb_to_recordset(
        '[
          {"customer_name":"Sanne de Jong","machine_name":"Bernina B 475","brand":"Bernina","model":"B 475","serial":"BE475-2201","purchase_date":"2021-04-16","notes":"Voorbeeldmachine"},
          {"customer_name":"Hendrik Visser","machine_name":"Pfaff Ambition 620","brand":"Pfaff","model":"Ambition 620","serial":"PF620-7781","purchase_date":"2022-02-01","notes":"Voorbeeldmachine"},
          {"customer_name":"Aafke Hoekstra","machine_name":"Singer Heavy Duty 4423","brand":"Singer","model":"Heavy Duty 4423","serial":"SG4423-5520","purchase_date":"2019-11-23","notes":"Voorbeeldmachine"},
          {"customer_name":"Pieter Dijkstra","machine_name":"Husqvarna Viking Opal 690Q","brand":"Husqvarna Viking","model":"Opal 690Q","serial":"HV690Q-3088","purchase_date":"2021-07-06","notes":"Voorbeeldmachine"},
          {"customer_name":"Maaike Smit","machine_name":"Janome DC6050","brand":"Janome","model":"DC6050","serial":"JA6050-4490","purchase_date":"2018-03-14","notes":"Voorbeeldmachine"},
          {"customer_name":"Jan Bakker","machine_name":"Juki HZL-DX7","brand":"Juki","model":"HZL-DX7","serial":"JKDX7-8843","purchase_date":"2023-01-05","notes":"Voorbeeldmachine"},
          {"customer_name":"Renske van der Meer","machine_name":"Brother CS10S","brand":"Brother","model":"CS10S","serial":"BRCS10-7719","purchase_date":"2019-10-19","notes":"Voorbeeldmachine"},
          {"customer_name":"Thomas Kuipers","machine_name":"Singer Quantum Stylist 9960","brand":"Singer","model":"Quantum Stylist 9960","serial":"SG9960-1198","purchase_date":"2020-08-12","notes":"Voorbeeldmachine"},
          {"customer_name":"Ineke Bosma","machine_name":"Bernina 335","brand":"Bernina","model":"335","serial":"BE335-6617","purchase_date":"2021-05-29","notes":"Voorbeeldmachine"},
          {"customer_name":"Gerard van Dijk","machine_name":"Janome Skyline S3","brand":"Janome","model":"Skyline S3","serial":"JAS3-9870","purchase_date":"2022-06-20","notes":"Voorbeeldmachine"}
        ]'::jsonb
      ) AS x(customer_name text, machine_name text, brand text, model text, serial text, purchase_date date, notes text)
    LOOP
      v_customer_id := NULL;

      IF m_customer_id_col IS NOT NULL THEN
        IF c_name_col IS NOT NULL THEN
          EXECUTE format('SELECT id FROM public.customers WHERE %I = $1 LIMIT 1', c_name_col)
          INTO v_customer_id
          USING m.customer_name;
        ELSIF c_first_name_col IS NOT NULL THEN
          v_first_name := split_part(m.customer_name, ' ', 1);
          v_last_name := trim(substr(m.customer_name, length(v_first_name) + 1));
          IF c_last_name_col IS NOT NULL THEN
            EXECUTE format('SELECT id FROM public.customers WHERE %I = $1 AND %I = $2 LIMIT 1', c_first_name_col, c_last_name_col)
            INTO v_customer_id
            USING v_first_name, v_last_name;
          ELSE
            EXECUTE format('SELECT id FROM public.customers WHERE %I = $1 LIMIT 1', c_first_name_col)
            INTO v_customer_id
            USING v_first_name;
          END IF;
        END IF;
      END IF;

      IF v_machine_customer_id_required AND v_customer_id IS NULL THEN
        CONTINUE;
      END IF;

      v_sql := 'INSERT INTO public.machines (';
      v_sep := '';

      IF m_name_col IS NOT NULL THEN
        v_sql := v_sql || v_sep || quote_ident(m_name_col);
        v_sep := ', ';
      END IF;
      IF m_brand_col IS NOT NULL THEN
        v_sql := v_sql || v_sep || quote_ident(m_brand_col);
        v_sep := ', ';
      END IF;
      IF m_model_col IS NOT NULL THEN
        v_sql := v_sql || v_sep || quote_ident(m_model_col);
        v_sep := ', ';
      END IF;

      IF m_customer_id_col IS NOT NULL AND v_customer_id IS NOT NULL THEN
        v_sql := v_sql || v_sep || quote_ident(m_customer_id_col);
        v_sep := ', ';
      END IF;
      IF m_serial_col IS NOT NULL THEN
        v_sql := v_sql || v_sep || quote_ident(m_serial_col);
        v_sep := ', ';
      END IF;
      IF m_purchase_col IS NOT NULL THEN
        v_sql := v_sql || v_sep || quote_ident(m_purchase_col);
        v_sep := ', ';
      END IF;
      IF m_notes_col IS NOT NULL THEN
        v_sql := v_sql || v_sep || quote_ident(m_notes_col);
        v_sep := ', ';
      END IF;
      IF m_created_col IS NOT NULL THEN
        v_sql := v_sql || v_sep || quote_ident(m_created_col);
        v_sep := ', ';
      END IF;
      IF m_updated_col IS NOT NULL THEN
        v_sql := v_sql || v_sep || quote_ident(m_updated_col);
        v_sep := ', ';
      END IF;

      v_sql := v_sql || ') VALUES (';
      v_sep := '';

      IF m_name_col IS NOT NULL THEN
        v_sql := v_sql || v_sep || quote_literal(m.machine_name);
        v_sep := ', ';
      END IF;
      IF m_brand_col IS NOT NULL THEN
        v_sql := v_sql || v_sep || quote_literal(m.brand);
        v_sep := ', ';
      END IF;
      IF m_model_col IS NOT NULL THEN
        v_sql := v_sql || v_sep || quote_literal(m.model);
        v_sep := ', ';
      END IF;

      IF m_customer_id_col IS NOT NULL AND v_customer_id IS NOT NULL THEN
        v_sql := v_sql || v_sep || quote_literal(v_customer_id::text) || '::uuid';
        v_sep := ', ';
      END IF;
      IF m_serial_col IS NOT NULL THEN
        v_sql := v_sql || v_sep || quote_literal(m.serial);
        v_sep := ', ';
      END IF;
      IF m_purchase_col IS NOT NULL THEN
        v_sql := v_sql || v_sep || quote_literal(m.purchase_date::text) || '::date';
        v_sep := ', ';
      END IF;
      IF m_notes_col IS NOT NULL THEN
        v_sql := v_sql || v_sep || quote_literal(m.notes);
        v_sep := ', ';
      END IF;
      IF m_created_col IS NOT NULL THEN
        v_sql := v_sql || v_sep || 'now()';
        v_sep := ', ';
      END IF;
      IF m_updated_col IS NOT NULL THEN
        v_sql := v_sql || v_sep || 'now()';
        v_sep := ', ';
      END IF;

      v_sql := v_sql || ')';

      BEGIN
        EXECUTE v_sql;
        machines_inserted := machines_inserted + 1;
      EXCEPTION
        WHEN unique_violation THEN
          NULL;
      END;
    END LOOP;
  END IF;

  -- Detect repairs columns
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'id') THEN 'id'
    ELSE NULL
  END INTO r_id_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'repair_number') THEN 'repair_number'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'repairNumber') THEN 'repairNumber'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'nummer') THEN 'nummer'
    ELSE NULL
  END INTO r_repair_number_col;

  IF r_id_col IS NOT NULL THEN
    SELECT (data_type = 'uuid' OR udt_name = 'uuid')
    INTO r_id_is_uuid
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'repairs'
      AND column_name = r_id_col
    LIMIT 1;
  END IF;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'customer') THEN 'customer'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'customer_name') THEN 'customer_name'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'name') THEN 'name'
    ELSE NULL
  END INTO r_customer_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'customerId') THEN 'customerId'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'customer_id') THEN 'customer_id'
    ELSE NULL
  END INTO r_customer_id_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'phone') THEN 'phone'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'phone_number') THEN 'phone_number'
    ELSE NULL
  END INTO r_phone_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'email') THEN 'email'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'email_address') THEN 'email_address'
    ELSE NULL
  END INTO r_email_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'city') THEN 'city'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'place') THEN 'place'
    ELSE NULL
  END INTO r_city_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'brand') THEN 'brand'
    ELSE NULL
  END INTO r_brand_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'model') THEN 'model'
    ELSE NULL
  END INTO r_model_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'machine') THEN 'machine'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'machine_name') THEN 'machine_name'
    ELSE NULL
  END INTO r_machine_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'machineId') THEN 'machineId'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'machine_id') THEN 'machine_id'
    ELSE NULL
  END INTO r_machine_id_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'issue') THEN 'issue'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'complaint') THEN 'complaint'
    ELSE NULL
  END INTO r_issue_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'repair') THEN 'repair'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'repair_work') THEN 'repair_work'
    ELSE NULL
  END INTO r_repair_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'partsUsed') THEN 'partsUsed'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'parts_used') THEN 'parts_used'
    ELSE NULL
  END INTO r_parts_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'shelfLocation') THEN 'shelfLocation'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'shelf_location') THEN 'shelf_location'
    ELSE NULL
  END INTO r_shelf_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'status') THEN 'status'
    ELSE NULL
  END INTO r_status_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'date') THEN 'date'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'created_on') THEN 'created_on'
    ELSE NULL
  END INTO r_date_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'price') THEN 'price'
    ELSE NULL
  END INTO r_price_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'notes') THEN 'notes'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'note') THEN 'note'
    ELSE NULL
  END INTO r_notes_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'paymentStatus') THEN 'paymentStatus'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'payment_status') THEN 'payment_status'
    ELSE NULL
  END INTO r_payment_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'history') THEN 'history'
    ELSE NULL
  END INTO r_history_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'createdAt') THEN 'createdAt'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'created_at') THEN 'created_at'
    ELSE NULL
  END INTO r_created_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'updatedAt') THEN 'updatedAt'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'updated_at') THEN 'updated_at'
    ELSE NULL
  END INTO r_updated_col;

  IF r_id_col IS NULL OR r_issue_col IS NULL THEN
    RAISE NOTICE 'Repairs seed skipped: required columns not found (id and/or issue).';
  ELSE
    FOR r IN
      SELECT *
      FROM jsonb_to_recordset(
        '[
          {"repair_id":"R-2026-00101","customer_name":"Sanne de Jong","machine_name":"Bernina B 475","brand":"Bernina","model":"B 475","phone":"06-10234567","email":"sanne.dejong@gmail.com","city":"Bolsward","issue":"Transporteur blijft hangen","repair":"Transporteur gereinigd en afgesteld","parts":"Transporteur set","shelf":"A-01","status":"IN_WORKSHOP","date":"30-07-2026","price":89,"notes":"Voorbeeldreparatie","payment":"Open"},
          {"repair_id":"R-2026-00102","customer_name":"Hendrik Visser","machine_name":"Pfaff Ambition 620","brand":"Pfaff","model":"Ambition 620","phone":"06-11234567","email":"h.visser@outlook.com","city":"Sneek","issue":"Naald breekt bij starten","repair":"Naaldstang rechtgezet","parts":"Naaldset","shelf":"A-02","status":"READY","date":"29-07-2026","price":64.5,"notes":"Voorbeeldreparatie","payment":"Open"},
          {"repair_id":"R-2026-00103","customer_name":"Aafke Hoekstra","machine_name":"Singer Heavy Duty 4423","brand":"Singer","model":"Heavy Duty 4423","phone":"06-12234567","email":"aafke.hoekstra@ziggo.nl","city":"Leeuwarden","issue":"Onderdraad lusst","repair":"Spanning opnieuw afgesteld","parts":"Spoelkap","shelf":"B-03","status":"WAITING_FOR_PARTS","date":"28-07-2026","price":45,"notes":"Voorbeeldreparatie","payment":"Open"},
          {"repair_id":"R-2026-00104","customer_name":"Pieter Dijkstra","machine_name":"Husqvarna Viking Opal 690Q","brand":"Husqvarna Viking","model":"Opal 690Q","phone":"06-13234567","email":"p.dijkstra@hotmail.com","city":"Drachten","issue":"Display reageert traag","repair":"Firmware update uitgevoerd","parts":"-","shelf":"B-04","status":"IN_WORKSHOP","date":"27-07-2026","price":75,"notes":"Voorbeeldreparatie","payment":"Open"},
          {"repair_id":"R-2026-00105","customer_name":"Maaike Smit","machine_name":"Janome DC6050","brand":"Janome","model":"DC6050","phone":"06-14234567","email":"maaike.smit@gmail.com","city":"Heerenveen","issue":"Steeklengte wisselt","repair":"Steekregelaar vervangen","parts":"Regelaar module","shelf":"C-01","status":"COMPLETED","date":"26-07-2026","price":149,"notes":"Voorbeeldreparatie","payment":"Betaald"},
          {"repair_id":"R-2026-00106","customer_name":"Jan Bakker","machine_name":"Juki HZL-DX7","brand":"Juki","model":"HZL-DX7","phone":"06-15234567","email":"jan.bakker@kpnmail.nl","city":"Harlingen","issue":"Slaat steken over","repair":"Grijper afgesteld","parts":"Naaldklem","shelf":"C-02","status":"NEW","date":"30-07-2026","price":0,"notes":"Voorbeeldreparatie","payment":"Open"}
        ]'::jsonb
      ) AS x(repair_id text, customer_name text, machine_name text, brand text, model text, phone text, email text, city text, issue text, repair text, parts text, shelf text, status text, date text, price numeric, notes text, payment text)
    LOOP
      v_customer_id := NULL;
      v_machine_id := NULL;

      IF r_customer_id_col IS NOT NULL THEN
        IF c_name_col IS NOT NULL THEN
          EXECUTE format('SELECT id FROM public.customers WHERE %I = $1 LIMIT 1', c_name_col)
          INTO v_customer_id
          USING r.customer_name;
        ELSIF c_first_name_col IS NOT NULL THEN
          v_first_name := split_part(r.customer_name, ' ', 1);
          v_last_name := trim(substr(r.customer_name, length(v_first_name) + 1));
          IF c_last_name_col IS NOT NULL THEN
            EXECUTE format('SELECT id FROM public.customers WHERE %I = $1 AND %I = $2 LIMIT 1', c_first_name_col, c_last_name_col)
            INTO v_customer_id
            USING v_first_name, v_last_name;
          ELSE
            EXECUTE format('SELECT id FROM public.customers WHERE %I = $1 LIMIT 1', c_first_name_col)
            INTO v_customer_id
            USING v_first_name;
          END IF;
        END IF;
      END IF;

      IF r_machine_id_col IS NOT NULL AND m_name_col IS NOT NULL THEN
        IF m_customer_id_col IS NOT NULL AND v_customer_id IS NOT NULL THEN
          EXECUTE format('SELECT id FROM public.machines WHERE %I = $1 AND %I = $2 LIMIT 1', m_name_col, m_customer_id_col)
          INTO v_machine_id
          USING r.machine_name, v_customer_id;
        ELSE
          EXECUTE format('SELECT id FROM public.machines WHERE %I = $1 LIMIT 1', m_name_col)
          INTO v_machine_id
          USING r.machine_name;
        END IF;
      END IF;

      IF r_id_is_uuid THEN
        v_repair_uuid := (
          substr(md5(r.repair_id), 1, 8) || '-' ||
          substr(md5(r.repair_id), 9, 4) || '-' ||
          substr(md5(r.repair_id), 13, 4) || '-' ||
          substr(md5(r.repair_id), 17, 4) || '-' ||
          substr(md5(r.repair_id), 21, 12)
        )::uuid;
      END IF;

      v_sql := 'INSERT INTO public.repairs (' || quote_ident(r_id_col);

      IF r_repair_number_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_ident(r_repair_number_col);
      END IF;

      IF r_customer_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_ident(r_customer_col);
      END IF;
      IF r_customer_id_col IS NOT NULL AND v_customer_id IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_ident(r_customer_id_col);
      END IF;
      IF r_phone_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_ident(r_phone_col);
      END IF;
      IF r_email_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_ident(r_email_col);
      END IF;
      IF r_city_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_ident(r_city_col);
      END IF;
      IF r_brand_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_ident(r_brand_col);
      END IF;
      IF r_model_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_ident(r_model_col);
      END IF;
      IF r_machine_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_ident(r_machine_col);
      END IF;
      IF r_machine_id_col IS NOT NULL AND v_machine_id IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_ident(r_machine_id_col);
      END IF;
      IF r_issue_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_ident(r_issue_col);
      END IF;
      IF r_repair_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_ident(r_repair_col);
      END IF;
      IF r_parts_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_ident(r_parts_col);
      END IF;
      IF r_shelf_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_ident(r_shelf_col);
      END IF;
      IF r_status_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_ident(r_status_col);
      END IF;
      IF r_date_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_ident(r_date_col);
      END IF;
      IF r_price_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_ident(r_price_col);
      END IF;
      IF r_notes_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_ident(r_notes_col);
      END IF;
      IF r_payment_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_ident(r_payment_col);
      END IF;
      IF r_history_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_ident(r_history_col);
      END IF;
      IF r_created_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_ident(r_created_col);
      END IF;
      IF r_updated_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_ident(r_updated_col);
      END IF;

      v_sql := v_sql || ') VALUES (';

      IF r_id_is_uuid THEN
        v_sql := v_sql || quote_literal(v_repair_uuid::text) || '::uuid';
      ELSE
        v_sql := v_sql || quote_literal(r.repair_id);
      END IF;

      IF r_repair_number_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_literal(r.repair_id);
      END IF;

      IF r_customer_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_literal(r.customer_name);
      END IF;
      IF r_customer_id_col IS NOT NULL AND v_customer_id IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_literal(v_customer_id::text) || '::uuid';
      END IF;
      IF r_phone_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_literal(r.phone);
      END IF;
      IF r_email_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_literal(r.email);
      END IF;
      IF r_city_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_literal(r.city);
      END IF;
      IF r_brand_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_literal(r.brand);
      END IF;
      IF r_model_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_literal(r.model);
      END IF;
      IF r_machine_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_literal(r.machine_name);
      END IF;
      IF r_machine_id_col IS NOT NULL AND v_machine_id IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_literal(v_machine_id::text) || '::uuid';
      END IF;
      IF r_issue_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_literal(r.issue);
      END IF;
      IF r_repair_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_literal(r.repair);
      END IF;
      IF r_parts_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_literal(r.parts);
      END IF;
      IF r_shelf_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_literal(r.shelf);
      END IF;
      IF r_status_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_literal(r.status);
      END IF;
      IF r_date_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_literal(r.date);
      END IF;
      IF r_price_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || coalesce(r.price::text, '0');
      END IF;
      IF r_notes_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_literal(r.notes);
      END IF;
      IF r_payment_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_literal(r.payment);
      END IF;
      IF r_history_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_literal(
          jsonb_build_array(
            jsonb_build_object(
              'status', 'NEW',
              'timestamp', to_char(now(), 'DD-MM-YYYY HH24:MI'),
              'user', 'Marieke de Vries',
              'note', 'Voorbeeldreparatie aangemaakt'
            )
          )::text
        ) || '::jsonb';
      END IF;
      IF r_created_col IS NOT NULL THEN
        v_sql := v_sql || ', now()';
      END IF;
      IF r_updated_col IS NOT NULL THEN
        v_sql := v_sql || ', now()';
      END IF;

      v_sql := v_sql || ')';

      BEGIN
        EXECUTE v_sql;
        repairs_inserted := repairs_inserted + 1;
      EXCEPTION
        WHEN unique_violation THEN
          NULL;
      END;
    END LOOP;
  END IF;

  -- Optional status history seed
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'repair_status_history') THEN
    SELECT CASE
      WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repair_status_history' AND column_name = 'repairId') THEN 'repairId'
      WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repair_status_history' AND column_name = 'repair_id') THEN 'repair_id'
      ELSE NULL
    END INTO h_repair_id_col;

    IF h_repair_id_col IS NOT NULL THEN
      SELECT (data_type = 'uuid' OR udt_name = 'uuid')
      INTO h_repair_id_is_uuid
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'repair_status_history'
        AND column_name = h_repair_id_col
      LIMIT 1;
    END IF;

    SELECT CASE
      WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repair_status_history' AND column_name = 'status') THEN 'status'
      ELSE NULL
    END INTO h_status_col;

    SELECT CASE
      WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repair_status_history' AND column_name = 'note') THEN 'note'
      ELSE NULL
    END INTO h_note_col;

    SELECT CASE
      WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repair_status_history' AND column_name = 'userName') THEN 'userName'
      WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repair_status_history' AND column_name = 'user_name') THEN 'user_name'
      ELSE NULL
    END INTO h_user_name_col;

    SELECT CASE
      WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repair_status_history' AND column_name = 'createdAt') THEN 'createdAt'
      WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repair_status_history' AND column_name = 'created_at') THEN 'created_at'
      ELSE NULL
    END INTO h_created_col;

    IF h_repair_id_col IS NOT NULL AND h_status_col IS NOT NULL THEN
      FOR r IN
        SELECT repair_id, status_text, note_text, created_time
        FROM (
          VALUES
            ('R-2026-00101', 'NEW', 'Voorbeeldreparatie aangemaakt', now() - interval '2 day'),
            ('R-2026-00101', 'IN_WORKSHOP', 'Monteur is gestart', now() - interval '1 day'),
            ('R-2026-00102', 'NEW', 'Voorbeeldreparatie aangemaakt', now() - interval '2 day'),
            ('R-2026-00102', 'READY', 'Klaar voor ophalen', now() - interval '3 hour'),
            ('R-2026-00103', 'NEW', 'Voorbeeldreparatie aangemaakt', now() - interval '2 day'),
            ('R-2026-00103', 'WAITING_FOR_PARTS', 'Wacht op onderdeel', now() - interval '8 hour')
        ) AS t(repair_id, status_text, note_text, created_time)
      LOOP
        v_history_repair_uuid := (
          substr(md5(r.repair_id), 1, 8) || '-' ||
          substr(md5(r.repair_id), 9, 4) || '-' ||
          substr(md5(r.repair_id), 13, 4) || '-' ||
          substr(md5(r.repair_id), 17, 4) || '-' ||
          substr(md5(r.repair_id), 21, 12)
        )::uuid;

        IF (
          (NOT r_id_is_uuid AND EXISTS (SELECT 1 FROM public.repairs WHERE id = r.repair_id))
          OR
          (r_id_is_uuid AND EXISTS (SELECT 1 FROM public.repairs WHERE id = v_history_repair_uuid))
        ) THEN
          v_sql := 'INSERT INTO public.repair_status_history (' || quote_ident(h_repair_id_col) || ', ' || quote_ident(h_status_col);

          IF h_note_col IS NOT NULL THEN
            v_sql := v_sql || ', ' || quote_ident(h_note_col);
          END IF;
          IF h_user_name_col IS NOT NULL THEN
            v_sql := v_sql || ', ' || quote_ident(h_user_name_col);
          END IF;
          IF h_created_col IS NOT NULL THEN
            v_sql := v_sql || ', ' || quote_ident(h_created_col);
          END IF;

          v_sql := v_sql || ') VALUES (';

          IF h_repair_id_is_uuid THEN
            v_sql := v_sql || quote_literal(v_history_repair_uuid::text) || '::uuid';
          ELSE
            v_sql := v_sql || quote_literal(r.repair_id);
          END IF;

          v_sql := v_sql || ', ' || quote_literal(r.status_text);

          IF h_note_col IS NOT NULL THEN
            v_sql := v_sql || ', ' || quote_literal(r.note_text);
          END IF;
          IF h_user_name_col IS NOT NULL THEN
            v_sql := v_sql || ', ' || quote_literal('Marieke de Vries');
          END IF;
          IF h_created_col IS NOT NULL THEN
            v_sql := v_sql || ', ' || quote_literal(r.created_time::text) || '::timestamptz';
          END IF;

          v_sql := v_sql || ')';

          BEGIN
            EXECUTE v_sql;
            history_inserted := history_inserted + 1;
          EXCEPTION
            WHEN unique_violation THEN
              NULL;
          END;
        END IF;
      END LOOP;
    END IF;
  END IF;

  RAISE NOTICE 'Inserted % machines, % repairs, % status history rows', machines_inserted, repairs_inserted, history_inserted;
END $$;
