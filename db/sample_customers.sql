-- Add sample Dutch customers to public.customers
-- Run in Supabase SQL Editor (service role context)
-- This script detects common column names and inserts only available fields.

DO $$
DECLARE
  v_name_col text;
  v_first_name_col text;
  v_last_name_col text;
  v_phone_col text;
  v_email_col text;
  v_city_col text;
  v_address_col text;
  v_notes_col text;
  v_created_col text;
  v_updated_col text;
  v_sql text;
  v_first_name_value text;
  v_last_name_value text;
  inserted_count integer := 0;
  r record;
BEGIN
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'name') THEN 'name'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'full_name') THEN 'full_name'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'customer_name') THEN 'customer_name'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'naam') THEN 'naam'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'klantnaam') THEN 'klantnaam'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'customer') THEN 'customer'
    ELSE NULL
  END INTO v_name_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'first_name') THEN 'first_name'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'voornaam') THEN 'voornaam'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'given_name') THEN 'given_name'
    ELSE NULL
  END INTO v_first_name_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'last_name') THEN 'last_name'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'achternaam') THEN 'achternaam'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'surname') THEN 'surname'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'family_name') THEN 'family_name'
    ELSE NULL
  END INTO v_last_name_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'phone') THEN 'phone'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'phone_number') THEN 'phone_number'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'mobile') THEN 'mobile'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'telefoon') THEN 'telefoon'
    ELSE NULL
  END INTO v_phone_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'email') THEN 'email'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'email_address') THEN 'email_address'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'mail') THEN 'mail'
    ELSE NULL
  END INTO v_email_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'city') THEN 'city'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'place') THEN 'place'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'woonplaats') THEN 'woonplaats'
    ELSE NULL
  END INTO v_city_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'address') THEN 'address'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'street') THEN 'street'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'adres') THEN 'adres'
    ELSE NULL
  END INTO v_address_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'notes') THEN 'notes'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'note') THEN 'note'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'opmerking') THEN 'opmerking'
    ELSE NULL
  END INTO v_notes_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'createdAt') THEN 'createdAt'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'created_at') THEN 'created_at'
    ELSE NULL
  END INTO v_created_col;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'updatedAt') THEN 'updatedAt'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'updated_at') THEN 'updated_at'
    ELSE NULL
  END INTO v_updated_col;

  IF v_name_col IS NULL AND v_first_name_col IS NULL THEN
    RAISE EXCEPTION 'No supported name field found in public.customers. Found columns: %',
      (SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'customers');
  END IF;

  FOR r IN
    SELECT *
    FROM jsonb_to_recordset(
      '[
        {"name":"Sanne de Jong","phone":"06-10234567","email":"sanne.dejong@gmail.com","city":"Bolsward","address":"Achterom 14","notes":"Voorbeeldklant"},
        {"name":"Hendrik Visser","phone":"06-11234567","email":"h.visser@outlook.com","city":"Sneek","address":"Kerkstraat 8","notes":"Voorbeeldklant"},
        {"name":"Aafke Hoekstra","phone":"06-12234567","email":"aafke.hoekstra@ziggo.nl","city":"Leeuwarden","address":"Langeweg 22","notes":"Voorbeeldklant"},
        {"name":"Pieter Dijkstra","phone":"06-13234567","email":"p.dijkstra@hotmail.com","city":"Drachten","address":"Stationsplein 3","notes":"Voorbeeldklant"},
        {"name":"Maaike Smit","phone":"06-14234567","email":"maaike.smit@gmail.com","city":"Heerenveen","address":"Wilgenlaan 19","notes":"Voorbeeldklant"},
        {"name":"Jan Bakker","phone":"06-15234567","email":"jan.bakker@kpnmail.nl","city":"Harlingen","address":"Jachthavenkade 7","notes":"Voorbeeldklant"},
        {"name":"Renske van der Meer","phone":"06-16234567","email":"renske.vdmeer@gmail.com","city":"Franeker","address":"Noorderstraat 55","notes":"Voorbeeldklant"},
        {"name":"Thomas Kuipers","phone":"06-17234567","email":"thomas.kuipers@live.nl","city":"IJlst","address":"Rozemarijnhof 4","notes":"Voorbeeldklant"},
        {"name":"Ineke Bosma","phone":"06-18234567","email":"ineke.bosma@gmail.com","city":"Workum","address":"Kleine Buren 11","notes":"Voorbeeldklant"},
        {"name":"Gerard van Dijk","phone":"06-19234567","email":"gerard.vandijk@xs4all.nl","city":"Wolvega","address":"Marktstraat 61","notes":"Voorbeeldklant"}
      ]'::jsonb
    ) AS x(name text, phone text, email text, city text, address text, notes text)
  LOOP
    v_first_name_value := split_part(r.name, ' ', 1);
    v_last_name_value := trim(substr(r.name, length(v_first_name_value) + 1));
    IF v_last_name_value = '' THEN
      v_last_name_value := 'Onbekend';
    END IF;

    v_sql := 'INSERT INTO public.customers (';

    IF v_name_col IS NOT NULL THEN
      v_sql := v_sql || quote_ident(v_name_col);
    ELSIF v_first_name_col IS NOT NULL THEN
      v_sql := v_sql || quote_ident(v_first_name_col);
      IF v_last_name_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_ident(v_last_name_col);
      END IF;
    END IF;

    IF v_phone_col IS NOT NULL THEN
      v_sql := v_sql || ', ' || quote_ident(v_phone_col);
    END IF;
    IF v_email_col IS NOT NULL THEN
      v_sql := v_sql || ', ' || quote_ident(v_email_col);
    END IF;
    IF v_city_col IS NOT NULL THEN
      v_sql := v_sql || ', ' || quote_ident(v_city_col);
    END IF;
    IF v_address_col IS NOT NULL THEN
      v_sql := v_sql || ', ' || quote_ident(v_address_col);
    END IF;
    IF v_notes_col IS NOT NULL THEN
      v_sql := v_sql || ', ' || quote_ident(v_notes_col);
    END IF;
    IF v_created_col IS NOT NULL THEN
      v_sql := v_sql || ', ' || quote_ident(v_created_col);
    END IF;
    IF v_updated_col IS NOT NULL THEN
      v_sql := v_sql || ', ' || quote_ident(v_updated_col);
    END IF;

    v_sql := v_sql || ') VALUES (';

    IF v_name_col IS NOT NULL THEN
      v_sql := v_sql || quote_literal(r.name);
    ELSIF v_first_name_col IS NOT NULL THEN
      v_sql := v_sql || quote_literal(v_first_name_value);
      IF v_last_name_col IS NOT NULL THEN
        v_sql := v_sql || ', ' || quote_literal(v_last_name_value);
      END IF;
    END IF;

    IF v_phone_col IS NOT NULL THEN
      v_sql := v_sql || ', ' || quote_literal(r.phone);
    END IF;
    IF v_email_col IS NOT NULL THEN
      v_sql := v_sql || ', ' || quote_literal(r.email);
    END IF;
    IF v_city_col IS NOT NULL THEN
      v_sql := v_sql || ', ' || quote_literal(r.city);
    END IF;
    IF v_address_col IS NOT NULL THEN
      v_sql := v_sql || ', ' || quote_literal(r.address);
    END IF;
    IF v_notes_col IS NOT NULL THEN
      v_sql := v_sql || ', ' || quote_literal(r.notes);
    END IF;
    IF v_created_col IS NOT NULL THEN
      v_sql := v_sql || ', now()';
    END IF;
    IF v_updated_col IS NOT NULL THEN
      v_sql := v_sql || ', now()';
    END IF;

    v_sql := v_sql || ')';

    BEGIN
      EXECUTE v_sql;
      inserted_count := inserted_count + 1;
    EXCEPTION
      WHEN unique_violation THEN
        NULL;
    END;
  END LOOP;

  RAISE NOTICE 'Inserted % sample customers into public.customers', inserted_count;
END $$;
