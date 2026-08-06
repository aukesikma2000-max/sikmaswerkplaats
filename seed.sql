-- Seed data for Sikma's Werkplaats
-- Execute directly in Supabase SQL Editor

BEGIN;

TRUNCATE TABLE repair_notes, repair_status_history, repairs, machines, customers, users, workshop_settings RESTART IDENTITY CASCADE;

-- Users (employees)
INSERT INTO users (id, name, email, role, active, createdAt, updatedAt) VALUES
('90000000-0000-0000-0000-000000000001', 'Marieke de Vries', 'marieke.devries@sikmaswerkplaats.nl', 'MANAGER', true, now(), now()),
('90000000-0000-0000-0000-000000000002', 'Jeroen Postma', 'jeroen.postma@sikmaswerkplaats.nl', 'REPAIRER', true, now(), now()),
('90000000-0000-0000-0000-000000000003', 'Anita Hoekstra', 'anita.hoekstra@sikmaswerkplaats.nl', 'REPAIRER', true, now(), now());

-- Customers (15)
INSERT INTO customers (id, name, address, phone, email, city, notes, createdAt, updatedAt) VALUES
('10000000-0000-0000-0000-000000000001', 'Sanne de Jong', 'Achterom 14', '06-10234567', 'sanne.dejong@gmail.com', 'Bolsward', 'Naailes docent', now(), now()),
('10000000-0000-0000-0000-000000000002', 'Hendrik Visser', 'Kerkstraat 8', '06-11234567', 'h.visser@outlook.com', 'Sneek', 'Gebruikt machine voor hobby', now(), now()),
('10000000-0000-0000-0000-000000000003', 'Aafke Hoekstra', 'Langeweg 22', '06-12234567', 'aafke.hoekstra@ziggo.nl', 'Leeuwarden', 'Komt vaak voor onderhoud', now(), now()),
('10000000-0000-0000-0000-000000000004', 'Pieter Dijkstra', 'Stationsplein 3', '06-13234567', 'p.dijkstra@hotmail.com', 'Drachten', 'Zakelijke klant', now(), now()),
('10000000-0000-0000-0000-000000000005', 'Maaike Smit', 'Wilgenlaan 19', '06-14234567', 'maaike.smit@gmail.com', 'Heerenveen', 'Patchwork specialist', now(), now()),
('10000000-0000-0000-0000-000000000006', 'Jan Bakker', 'Jachthavenkade 7', '06-15234567', 'jan.bakker@kpnmail.nl', 'Harlingen', '', now(), now()),
('10000000-0000-0000-0000-000000000007', 'Renske van der Meer', 'Noorderstraat 55', '06-16234567', 'renske.vdmeer@gmail.com', 'Franeker', 'Let op met spoedreparaties', now(), now()),
('10000000-0000-0000-0000-000000000008', 'Thomas Kuipers', 'Rozemarijnhof 4', '06-17234567', 'thomas.kuipers@live.nl', 'IJlst', '', now(), now()),
('10000000-0000-0000-0000-000000000009', 'Ineke Bosma', 'Kleine Buren 11', '06-18234567', 'ineke.bosma@gmail.com', 'Workum', 'Heeft meerdere machines', now(), now()),
('10000000-0000-0000-0000-000000000010', 'Gerard van Dijk', 'Marktstraat 61', '06-19234567', 'gerard.vandijk@xs4all.nl', 'Wolvega', '', now(), now()),
('10000000-0000-0000-0000-000000000011', 'Liesbeth Koster', 'Molenweg 2', '06-20234567', 'liesbeth.koster@gmail.com', 'Joure', '', now(), now()),
('10000000-0000-0000-0000-000000000012', 'Bauke Feenstra', 'Suderseewei 18', '06-21234567', 'bauke.feenstra@outlook.com', 'Balk', '', now(), now()),
('10000000-0000-0000-0000-000000000013', 'Femke Terpstra', 'Westerkade 40', '06-22234567', 'femke.terpstra@gmail.com', 'Makkum', 'Bedrijfsklant atelier', now(), now()),
('10000000-0000-0000-0000-000000000014', 'Roelof Zijlstra', 'Houtwal 9', '06-23234567', 'roelof.zijlstra@gmail.com', 'Stavoren', '', now(), now()),
('10000000-0000-0000-0000-000000000015', 'Nienke Wiersma', 'Torenstraat 26', '06-24234567', 'nienke.wiersma@live.nl', 'Koudum', '', now(), now());

-- Machines (20)
INSERT INTO machines (id, customerId, name, brand, model, serialNumber, purchaseDate, notes, createdAt, updatedAt) VALUES
('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Bernina B 475', 'Bernina', 'B 475', 'BE475-2201', '2021-04-16', 'Gebruikt voor kledingreparaties', now(), now()),
('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Brother Innov-is A16', 'Brother', 'Innov-is A16', 'BRA16-1933', '2020-09-10', '', now(), now()),
('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Pfaff Ambition 620', 'Pfaff', 'Ambition 620', 'PF620-7781', '2022-02-01', '', now(), now()),
('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'Singer Heavy Duty 4423', 'Singer', 'Heavy Duty 4423', 'SG4423-5520', '2019-11-23', '', now(), now()),
('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004', 'Husqvarna Viking Opal 690Q', 'Husqvarna Viking', 'Opal 690Q', 'HV690Q-3088', '2021-07-06', '', now(), now()),
('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000005', 'Janome DC6050', 'Janome', 'DC6050', 'JA6050-4490', '2018-03-14', '', now(), now()),
('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000006', 'Juki HZL-DX7', 'Juki', 'HZL-DX7', 'JKDX7-8843', '2023-01-05', '', now(), now()),
('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000007', 'Brother CS10S', 'Brother', 'CS10S', 'BRCS10-7719', '2019-10-19', '', now(), now()),
('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000008', 'Singer Quantum Stylist 9960', 'Singer', 'Quantum Stylist 9960', 'SG9960-1198', '2020-08-12', '', now(), now()),
('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000009', 'Bernina 335', 'Bernina', '335', 'BE335-6617', '2021-05-29', '', now(), now()),
('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000009', 'Pfaff Passport 2.0', 'Pfaff', 'Passport 2.0', 'PFP20-2407', '2017-12-03', '', now(), now()),
('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000010', 'Janome Skyline S3', 'Janome', 'Skyline S3', 'JAS3-9870', '2022-06-20', '', now(), now()),
('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000011', 'Juki TL-2010Q', 'Juki', 'TL-2010Q', 'JK2010-3131', '2018-09-28', '', now(), now()),
('20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000012', 'Husqvarna Viking Jade 20', 'Husqvarna Viking', 'Jade 20', 'HVJ20-4280', '2021-11-11', '', now(), now()),
('20000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000013', 'Brother PR680W', 'Brother', 'PR680W', 'BRPR680-5050', '2023-04-08', 'Borduurmachine', now(), now()),
('20000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000014', 'Singer C5205', 'Singer', 'C5205', 'SG5205-6602', '2020-01-16', '', now(), now()),
('20000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000015', 'Bernina 770 QE', 'Bernina', '770 QE', 'BE770-2917', '2022-09-01', '', now(), now()),
('20000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000005', 'Pfaff Quilt Ambition 635', 'Pfaff', 'Quilt Ambition 635', 'PF635-7821', '2019-06-24', '', now(), now()),
('20000000-0000-0000-0000-000000000019', '10000000-0000-0000-0000-000000000003', 'Janome Memory Craft 6700P', 'Janome', 'Memory Craft 6700P', 'JAMC6700-4147', '2023-02-22', '', now(), now()),
('20000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000002', 'Juki MO-654DE', 'Juki', 'MO-654DE', 'JK654-9332', '2018-05-07', 'Lockmachine', now(), now());

-- Repairs (20)
INSERT INTO repairs (
  id, customer, address, customerId, phone, email, city, brand, model, machine, machineId,
  issue, repair, partsUsed, shelfLocation, priority, assignedTo, expectedDeliveryDate,
  status, date, completionDate, deliveryDate, archivedDate, price, notes, paymentStatus,
  history, createdAt, updatedAt
) VALUES
('R-2026-00001', 'Sanne de Jong', 'Achterom 14', '10000000-0000-0000-0000-000000000001', '06-10234567', 'sanne.dejong@gmail.com', 'Bolsward', 'Bernina', 'B 475', 'Bernina B 475', '20000000-0000-0000-0000-000000000001',
 'Transporteur blijft hangen bij dikke stof', 'Transporteur gereinigd en afgesteld', 'Transporteur set, olie', 'A-01', 'NORMAL', 'Jeroen Postma', '31-07-2026',
 'IN_WORKSHOP', '22-07-2026', NULL, NULL, NULL, 89.00, 'Klant wil voor vrijdag terug', 'Open',
 '[{"status":"NEW","timestamp":"22-07-2026 09:12","user":"Marieke de Vries","note":"Reparatie aangemaakt"},{"status":"IN_WORKSHOP","timestamp":"23-07-2026 10:41","user":"Jeroen Postma","note":"Machine geopend en diagnose gestart"}]'::jsonb, now(), now()),

('R-2026-00002', 'Sanne de Jong', 'Achterom 14', '10000000-0000-0000-0000-000000000001', '06-10234567', 'sanne.dejong@gmail.com', 'Bolsward', 'Brother', 'Innov-is A16', 'Brother Innov-is A16', '20000000-0000-0000-0000-000000000002',
 'Naald breekt direct bij starten', 'Naaldstang rechtgezet en timing gecontroleerd', 'Naaldset 80/12', 'A-02', 'HIGH', 'Anita Hoekstra', '30-07-2026',
 'READY', '21-07-2026', '28-07-2026', NULL, NULL, 64.50, 'SMS sturen bij gereed', 'Open',
 '[{"status":"NEW","timestamp":"21-07-2026 11:20","user":"Marieke de Vries"},{"status":"IN_WORKSHOP","timestamp":"24-07-2026 08:35","user":"Anita Hoekstra"},{"status":"READY","timestamp":"28-07-2026 15:20","user":"Anita Hoekstra"}]'::jsonb, now(), now()),

('R-2026-00003', 'Hendrik Visser', 'Kerkstraat 8', '10000000-0000-0000-0000-000000000002', '06-11234567', 'h.visser@outlook.com', 'Sneek', 'Pfaff', 'Ambition 620', 'Pfaff Ambition 620', '20000000-0000-0000-0000-000000000003',
 'Machine maakt ratelend geluid', 'Spoelhuis vervangen en getest', 'Spoelhuis compleet', 'B-03', 'NORMAL', 'Jeroen Postma', '29-07-2026',
 'COMPLETED', '18-07-2026', '25-07-2026', '26-07-2026', NULL, 129.00, 'Klant heeft direct betaald', 'Betaald',
 '[{"status":"NEW","timestamp":"18-07-2026 10:02","user":"Marieke de Vries"},{"status":"IN_WORKSHOP","timestamp":"19-07-2026 09:40","user":"Jeroen Postma"},{"status":"READY","timestamp":"25-07-2026 14:12","user":"Jeroen Postma"},{"status":"COMPLETED","timestamp":"26-07-2026 16:48","user":"Marieke de Vries"}]'::jsonb, now(), now()),

('R-2026-00004', 'Aafke Hoekstra', 'Langeweg 22', '10000000-0000-0000-0000-000000000003', '06-12234567', 'aafke.hoekstra@ziggo.nl', 'Leeuwarden', 'Singer', 'Heavy Duty 4423', 'Singer Heavy Duty 4423', '20000000-0000-0000-0000-000000000004',
 'Onderdraad lusst onder de stof', 'Spanningsschijven gereinigd en afgesteld', 'Reinigingsset', 'B-04', 'LOW', 'Anita Hoekstra', '01-08-2026',
 'WAITING_FOR_PARTS', '24-07-2026', NULL, NULL, NULL, 45.00, 'Wacht op nieuwe spoelkap', 'Open',
 '[{"status":"NEW","timestamp":"24-07-2026 13:10","user":"Marieke de Vries"},{"status":"IN_WORKSHOP","timestamp":"24-07-2026 14:22","user":"Anita Hoekstra"},{"status":"WAITING_FOR_PARTS","timestamp":"24-07-2026 16:05","user":"Anita Hoekstra","note":"Spoelkap besteld"}]'::jsonb, now(), now()),

('R-2026-00005', 'Pieter Dijkstra', 'Stationsplein 3', '10000000-0000-0000-0000-000000000004', '06-13234567', 'p.dijkstra@hotmail.com', 'Drachten', 'Husqvarna Viking', 'Opal 690Q', 'Husqvarna Viking Opal 690Q', '20000000-0000-0000-0000-000000000005',
 'Display reageert traag', 'Firmware geupdate en kalibratie uitgevoerd', 'Geen', 'C-01', 'NORMAL', 'Jeroen Postma', '30-07-2026',
 'IN_WORKSHOP', '25-07-2026', NULL, NULL, NULL, 75.00, '', 'Open',
 '[{"status":"NEW","timestamp":"25-07-2026 09:01","user":"Marieke de Vries"},{"status":"IN_WORKSHOP","timestamp":"25-07-2026 11:17","user":"Jeroen Postma"}]'::jsonb, now(), now()),

('R-2026-00006', 'Maaike Smit', 'Wilgenlaan 19', '10000000-0000-0000-0000-000000000005', '06-14234567', 'maaike.smit@gmail.com', 'Heerenveen', 'Janome', 'DC6050', 'Janome DC6050', '20000000-0000-0000-0000-000000000006',
 'Steeklengte verandert spontaan', 'Steekregelaar vervangen', 'Steekregelaar module', 'C-02', 'HIGH', 'Anita Hoekstra', '29-07-2026',
 'READY', '20-07-2026', '27-07-2026', NULL, NULL, 149.00, 'Klant ophalen na 17:00', 'Open',
 '[{"status":"NEW","timestamp":"20-07-2026 10:40","user":"Marieke de Vries"},{"status":"IN_WORKSHOP","timestamp":"22-07-2026 08:55","user":"Anita Hoekstra"},{"status":"READY","timestamp":"27-07-2026 15:34","user":"Anita Hoekstra"}]'::jsonb, now(), now()),

('R-2026-00007', 'Jan Bakker', 'Jachthavenkade 7', '10000000-0000-0000-0000-000000000006', '06-15234567', 'jan.bakker@kpnmail.nl', 'Harlingen', 'Juki', 'HZL-DX7', 'Juki HZL-DX7', '20000000-0000-0000-0000-000000000007',
 'Machine slaat steken over', 'Naaldklem en grijper afgesteld', 'Naaldklem', 'C-03', 'NORMAL', 'Jeroen Postma', '02-08-2026',
 'NEW', '29-07-2026', NULL, NULL, NULL, 0.00, 'Nog niet ingepland', 'Open',
 '[{"status":"NEW","timestamp":"29-07-2026 09:45","user":"Marieke de Vries"}]'::jsonb, now(), now()),

('R-2026-00008', 'Renske van der Meer', 'Noorderstraat 55', '10000000-0000-0000-0000-000000000007', '06-16234567', 'renske.vdmeer@gmail.com', 'Franeker', 'Brother', 'CS10S', 'Brother CS10S', '20000000-0000-0000-0000-000000000008',
 'Pedaal reageert niet altijd', 'Pedaalkabel vervangen', 'Voetpedaal', 'D-01', 'HIGH', 'Anita Hoekstra', '31-07-2026',
 'IN_WORKSHOP', '27-07-2026', NULL, NULL, NULL, 72.00, '', 'Open',
 '[{"status":"NEW","timestamp":"27-07-2026 12:11","user":"Marieke de Vries"},{"status":"IN_WORKSHOP","timestamp":"28-07-2026 09:50","user":"Anita Hoekstra"}]'::jsonb, now(), now()),

('R-2026-00009', 'Thomas Kuipers', 'Rozemarijnhof 4', '10000000-0000-0000-0000-000000000008', '06-17234567', 'thomas.kuipers@live.nl', 'IJlst', 'Singer', 'Quantum Stylist 9960', 'Singer Quantum Stylist 9960', '20000000-0000-0000-0000-000000000009',
 'Automatische draadinrijger werkt niet', 'Inrijgermechanisme vervangen', 'Inrijger unit', 'D-02', 'NORMAL', 'Jeroen Postma', '03-08-2026',
 'WAITING_FOR_PARTS', '28-07-2026', NULL, NULL, NULL, 95.00, 'Onderdeel verwacht op 01-08', 'Open',
 '[{"status":"NEW","timestamp":"28-07-2026 10:13","user":"Marieke de Vries"},{"status":"IN_WORKSHOP","timestamp":"28-07-2026 13:44","user":"Jeroen Postma"},{"status":"WAITING_FOR_PARTS","timestamp":"28-07-2026 16:31","user":"Jeroen Postma"}]'::jsonb, now(), now()),

('R-2026-00010', 'Ineke Bosma', 'Kleine Buren 11', '10000000-0000-0000-0000-000000000009', '06-18234567', 'ineke.bosma@gmail.com', 'Workum', 'Bernina', '335', 'Bernina 335', '20000000-0000-0000-0000-000000000010',
 'Machine loopt zwaar', 'Volledige onderhoudsbeurt uitgevoerd', 'Onderhoudsset', 'D-03', 'LOW', 'Anita Hoekstra', '30-07-2026',
 'READY', '19-07-2026', '27-07-2026', NULL, NULL, 110.00, '', 'Open',
 '[{"status":"NEW","timestamp":"19-07-2026 08:35","user":"Marieke de Vries"},{"status":"IN_WORKSHOP","timestamp":"22-07-2026 10:02","user":"Anita Hoekstra"},{"status":"READY","timestamp":"27-07-2026 12:05","user":"Anita Hoekstra"}]'::jsonb, now(), now()),

('R-2026-00011', 'Ineke Bosma', 'Kleine Buren 11', '10000000-0000-0000-0000-000000000009', '06-18234567', 'ineke.bosma@gmail.com', 'Workum', 'Pfaff', 'Passport 2.0', 'Pfaff Passport 2.0', '20000000-0000-0000-0000-000000000011',
 'Steken zijn ongelijk', 'Drukvoetdruk opnieuw ingesteld', 'Geen', 'E-01', 'NORMAL', 'Jeroen Postma', '29-07-2026',
 'COMPLETED', '16-07-2026', '23-07-2026', '24-07-2026', NULL, 58.00, '', 'Betaald',
 '[{"status":"NEW","timestamp":"16-07-2026 14:20","user":"Marieke de Vries"},{"status":"IN_WORKSHOP","timestamp":"18-07-2026 09:05","user":"Jeroen Postma"},{"status":"READY","timestamp":"23-07-2026 15:58","user":"Jeroen Postma"},{"status":"COMPLETED","timestamp":"24-07-2026 11:41","user":"Marieke de Vries"}]'::jsonb, now(), now()),

('R-2026-00012', 'Gerard van Dijk', 'Marktstraat 61', '10000000-0000-0000-0000-000000000010', '06-19234567', 'gerard.vandijk@xs4all.nl', 'Wolvega', 'Janome', 'Skyline S3', 'Janome Skyline S3', '20000000-0000-0000-0000-000000000012',
 'Machine stopt na enkele steken', 'Motorconnector opnieuw gesoldeerd', 'Connector set', 'E-02', 'URGENT', 'Anita Hoekstra', '30-07-2026',
 'IN_WORKSHOP', '26-07-2026', NULL, NULL, NULL, 99.00, 'Zakelijke spoedklus', 'Open',
 '[{"status":"NEW","timestamp":"26-07-2026 08:50","user":"Marieke de Vries"},{"status":"IN_WORKSHOP","timestamp":"26-07-2026 09:30","user":"Anita Hoekstra"}]'::jsonb, now(), now()),

('R-2026-00013', 'Liesbeth Koster', 'Molenweg 2', '10000000-0000-0000-0000-000000000011', '06-20234567', 'liesbeth.koster@gmail.com', 'Joure', 'Juki', 'TL-2010Q', 'Juki TL-2010Q', '20000000-0000-0000-0000-000000000013',
 'Draadspanning boven niet stabiel', 'Spanningsmodule vervangen', 'Spanningsmodule', 'E-03', 'HIGH', 'Jeroen Postma', '01-08-2026',
 'WAITING_FOR_PARTS', '27-07-2026', NULL, NULL, NULL, 120.00, '', 'Open',
 '[{"status":"NEW","timestamp":"27-07-2026 10:11","user":"Marieke de Vries"},{"status":"IN_WORKSHOP","timestamp":"27-07-2026 12:42","user":"Jeroen Postma"},{"status":"WAITING_FOR_PARTS","timestamp":"27-07-2026 16:05","user":"Jeroen Postma","note":"Module besteld"}]'::jsonb, now(), now()),

('R-2026-00014', 'Bauke Feenstra', 'Suderseewei 18', '10000000-0000-0000-0000-000000000012', '06-21234567', 'bauke.feenstra@outlook.com', 'Balk', 'Husqvarna Viking', 'Jade 20', 'Husqvarna Viking Jade 20', '20000000-0000-0000-0000-000000000014',
 'Voet omhoog/omlaag knop defect', 'Schakelaar vervangen', 'Microswitch', 'F-01', 'NORMAL', 'Anita Hoekstra', '31-07-2026',
 'READY', '23-07-2026', '29-07-2026', NULL, NULL, 82.50, '', 'Open',
 '[{"status":"NEW","timestamp":"23-07-2026 09:10","user":"Marieke de Vries"},{"status":"IN_WORKSHOP","timestamp":"24-07-2026 11:55","user":"Anita Hoekstra"},{"status":"READY","timestamp":"29-07-2026 14:48","user":"Anita Hoekstra"}]'::jsonb, now(), now()),

('R-2026-00015', 'Femke Terpstra', 'Westerkade 40', '10000000-0000-0000-0000-000000000013', '06-22234567', 'femke.terpstra@gmail.com', 'Makkum', 'Brother', 'PR680W', 'Brother PR680W', '20000000-0000-0000-0000-000000000015',
 'Borduurring wordt niet herkend', 'Sensor voor ringdetectie vervangen', 'Sensor unit', 'F-02', 'URGENT', 'Jeroen Postma', '30-07-2026',
 'IN_WORKSHOP', '28-07-2026', NULL, NULL, NULL, 175.00, 'Atelier heeft machine dagelijks nodig', 'Open',
 '[{"status":"NEW","timestamp":"28-07-2026 08:20","user":"Marieke de Vries"},{"status":"IN_WORKSHOP","timestamp":"28-07-2026 09:05","user":"Jeroen Postma"}]'::jsonb, now(), now()),

('R-2026-00016', 'Roelof Zijlstra', 'Houtwal 9', '10000000-0000-0000-0000-000000000014', '06-23234567', 'roelof.zijlstra@gmail.com', 'Stavoren', 'Singer', 'C5205', 'Singer C5205', '20000000-0000-0000-0000-000000000016',
 'Naait scheef op rechte steek', 'Voeding en naaldpositie gecorrigeerd', 'Geen', 'F-03', 'LOW', 'Anita Hoekstra', '02-08-2026',
 'NEW', '29-07-2026', NULL, NULL, NULL, 0.00, 'Intake afgerond', 'Open',
 '[{"status":"NEW","timestamp":"29-07-2026 12:36","user":"Marieke de Vries"}]'::jsonb, now(), now()),

('R-2026-00017', 'Nienke Wiersma', 'Torenstraat 26', '10000000-0000-0000-0000-000000000015', '06-24234567', 'nienke.wiersma@live.nl', 'Koudum', 'Bernina', '770 QE', 'Bernina 770 QE', '20000000-0000-0000-0000-000000000017',
 'Automatische draadafsnijder werkt niet', 'Snijmes vervangen en software reset', 'Snijmes set', 'G-01', 'HIGH', 'Jeroen Postma', '31-07-2026',
 'READY', '22-07-2026', '29-07-2026', NULL, NULL, 158.00, '', 'Open',
 '[{"status":"NEW","timestamp":"22-07-2026 14:51","user":"Marieke de Vries"},{"status":"IN_WORKSHOP","timestamp":"25-07-2026 10:20","user":"Jeroen Postma"},{"status":"READY","timestamp":"29-07-2026 16:10","user":"Jeroen Postma"}]'::jsonb, now(), now()),

('R-2026-00018', 'Maaike Smit', 'Wilgenlaan 19', '10000000-0000-0000-0000-000000000005', '06-14234567', 'maaike.smit@gmail.com', 'Heerenveen', 'Pfaff', 'Quilt Ambition 635', 'Pfaff Quilt Ambition 635', '20000000-0000-0000-0000-000000000018',
 'Boventransport hapert', 'Boventransport tandwiel vervangen', 'Tandwielset', 'G-02', 'NORMAL', 'Anita Hoekstra', '01-08-2026',
 'IN_WORKSHOP', '27-07-2026', NULL, NULL, NULL, 118.00, '', 'Open',
 '[{"status":"NEW","timestamp":"27-07-2026 09:22","user":"Marieke de Vries"},{"status":"IN_WORKSHOP","timestamp":"28-07-2026 11:03","user":"Anita Hoekstra"}]'::jsonb, now(), now()),

('R-2026-00019', 'Aafke Hoekstra', 'Langeweg 22', '10000000-0000-0000-0000-000000000003', '06-12234567', 'aafke.hoekstra@ziggo.nl', 'Leeuwarden', 'Janome', 'Memory Craft 6700P', 'Janome Memory Craft 6700P', '20000000-0000-0000-0000-000000000019',
 'Steekplaat beschadigd', 'Steekplaat vervangen', 'Steekplaat', 'G-03', 'NORMAL', 'Jeroen Postma', '28-07-2026',
 'COMPLETED', '10-07-2026', '16-07-2026', '17-07-2026', '24-07-2026', 93.00, 'Afgehandeld en gearchiveerd', 'Betaald',
 '[{"status":"NEW","timestamp":"10-07-2026 09:00","user":"Marieke de Vries"},{"status":"IN_WORKSHOP","timestamp":"11-07-2026 10:30","user":"Jeroen Postma"},{"status":"READY","timestamp":"16-07-2026 13:45","user":"Jeroen Postma"},{"status":"COMPLETED","timestamp":"17-07-2026 15:12","user":"Marieke de Vries"},{"status":"COMPLETED","timestamp":"24-07-2026 09:02","user":"Marieke de Vries"}]'::jsonb, now(), now()),

('R-2026-00020', 'Hendrik Visser', 'Kerkstraat 8', '10000000-0000-0000-0000-000000000002', '06-11234567', 'h.visser@outlook.com', 'Sneek', 'Juki', 'MO-654DE', 'Juki MO-654DE', '20000000-0000-0000-0000-000000000020',
 'Snijmes van lockmachine bot', 'Snijmes vervangen en snijbreedte afgesteld', 'Bovenmes en ondermes', 'H-01', 'LOW', 'Anita Hoekstra', '27-07-2026',
 'COMPLETED', '12-07-2026', '18-07-2026', '19-07-2026', NULL, 76.00, '', 'Betaald',
 '[{"status":"NEW","timestamp":"12-07-2026 11:02","user":"Marieke de Vries"},{"status":"IN_WORKSHOP","timestamp":"14-07-2026 09:18","user":"Anita Hoekstra"},{"status":"READY","timestamp":"18-07-2026 14:12","user":"Anita Hoekstra"},{"status":"COMPLETED","timestamp":"19-07-2026 10:25","user":"Marieke de Vries"}]'::jsonb, now(), now());

-- Repair status history (full timeline rows)
INSERT INTO repair_status_history (id, repairId, status, note, userId, userName, createdAt) VALUES
('50000000-0000-0000-0000-000000000001', 'R-2026-00001', 'NEW', 'Reparatie aangemaakt', '90000000-0000-0000-0000-000000000001', 'Marieke de Vries', '2026-07-22 09:12:00+02'),
('50000000-0000-0000-0000-000000000002', 'R-2026-00001', 'IN_WORKSHOP', 'Machine geopend en diagnose gestart', '90000000-0000-0000-0000-000000000002', 'Jeroen Postma', '2026-07-23 10:41:00+02'),
('50000000-0000-0000-0000-000000000003', 'R-2026-00002', 'NEW', 'Intake afgerond', '90000000-0000-0000-0000-000000000001', 'Marieke de Vries', '2026-07-21 11:20:00+02'),
('50000000-0000-0000-0000-000000000004', 'R-2026-00002', 'IN_WORKSHOP', 'Reparateur toegewezen', '90000000-0000-0000-0000-000000000003', 'Anita Hoekstra', '2026-07-24 08:35:00+02'),
('50000000-0000-0000-0000-000000000005', 'R-2026-00002', 'READY', 'Klaar voor afhalen', '90000000-0000-0000-0000-000000000003', 'Anita Hoekstra', '2026-07-28 15:20:00+02'),
('50000000-0000-0000-0000-000000000006', 'R-2026-00003', 'NEW', 'Reparatie aangemaakt', '90000000-0000-0000-0000-000000000001', 'Marieke de Vries', '2026-07-18 10:02:00+02'),
('50000000-0000-0000-0000-000000000007', 'R-2026-00003', 'IN_WORKSHOP', 'Diagnose gestart', '90000000-0000-0000-0000-000000000002', 'Jeroen Postma', '2026-07-19 09:40:00+02'),
('50000000-0000-0000-0000-000000000008', 'R-2026-00003', 'READY', 'Getest en gereed', '90000000-0000-0000-0000-000000000002', 'Jeroen Postma', '2026-07-25 14:12:00+02'),
('50000000-0000-0000-0000-000000000009', 'R-2026-00003', 'COMPLETED', 'Afgegeven aan klant', '90000000-0000-0000-0000-000000000001', 'Marieke de Vries', '2026-07-26 16:48:00+02'),
('50000000-0000-0000-0000-000000000010', 'R-2026-00004', 'NEW', 'Reparatie aangemaakt', '90000000-0000-0000-0000-000000000001', 'Marieke de Vries', '2026-07-24 13:10:00+02'),
('50000000-0000-0000-0000-000000000011', 'R-2026-00004', 'IN_WORKSHOP', 'Machine open en inspectie', '90000000-0000-0000-0000-000000000003', 'Anita Hoekstra', '2026-07-24 14:22:00+02'),
('50000000-0000-0000-0000-000000000012', 'R-2026-00004', 'WAITING_FOR_PARTS', 'Spoelkap besteld', '90000000-0000-0000-0000-000000000003', 'Anita Hoekstra', '2026-07-24 16:05:00+02'),
('50000000-0000-0000-0000-000000000013', 'R-2026-00005', 'NEW', 'Aangemeld aan balie', '90000000-0000-0000-0000-000000000001', 'Marieke de Vries', '2026-07-25 09:01:00+02'),
('50000000-0000-0000-0000-000000000014', 'R-2026-00005', 'IN_WORKSHOP', 'Firmware update gestart', '90000000-0000-0000-0000-000000000002', 'Jeroen Postma', '2026-07-25 11:17:00+02'),
('50000000-0000-0000-0000-000000000015', 'R-2026-00006', 'NEW', 'Reparatie aangemaakt', '90000000-0000-0000-0000-000000000001', 'Marieke de Vries', '2026-07-20 10:40:00+02'),
('50000000-0000-0000-0000-000000000016', 'R-2026-00006', 'IN_WORKSHOP', 'Steekregelaar defect vastgesteld', '90000000-0000-0000-0000-000000000003', 'Anita Hoekstra', '2026-07-22 08:55:00+02'),
('50000000-0000-0000-0000-000000000017', 'R-2026-00006', 'READY', 'Eindtest geslaagd', '90000000-0000-0000-0000-000000000003', 'Anita Hoekstra', '2026-07-27 15:34:00+02'),
('50000000-0000-0000-0000-000000000018', 'R-2026-00007', 'NEW', 'Ingeboekt', '90000000-0000-0000-0000-000000000001', 'Marieke de Vries', '2026-07-29 09:45:00+02'),
('50000000-0000-0000-0000-000000000019', 'R-2026-00008', 'NEW', 'Intake afgerond', '90000000-0000-0000-0000-000000000001', 'Marieke de Vries', '2026-07-27 12:11:00+02'),
('50000000-0000-0000-0000-000000000020', 'R-2026-00008', 'IN_WORKSHOP', 'Pedaal doorgemeten', '90000000-0000-0000-0000-000000000003', 'Anita Hoekstra', '2026-07-28 09:50:00+02'),
('50000000-0000-0000-0000-000000000021', 'R-2026-00009', 'NEW', 'Reparatie aangemaakt', '90000000-0000-0000-0000-000000000001', 'Marieke de Vries', '2026-07-28 10:13:00+02'),
('50000000-0000-0000-0000-000000000022', 'R-2026-00009', 'IN_WORKSHOP', 'Inrijger mechaniek gedemonteerd', '90000000-0000-0000-0000-000000000002', 'Jeroen Postma', '2026-07-28 13:44:00+02'),
('50000000-0000-0000-0000-000000000023', 'R-2026-00009', 'WAITING_FOR_PARTS', 'Onderdeel in bestelling', '90000000-0000-0000-0000-000000000002', 'Jeroen Postma', '2026-07-28 16:31:00+02'),
('50000000-0000-0000-0000-000000000024', 'R-2026-00010', 'NEW', 'Aangemeld', '90000000-0000-0000-0000-000000000001', 'Marieke de Vries', '2026-07-19 08:35:00+02'),
('50000000-0000-0000-0000-000000000025', 'R-2026-00010', 'IN_WORKSHOP', 'Onderhoud gestart', '90000000-0000-0000-0000-000000000003', 'Anita Hoekstra', '2026-07-22 10:02:00+02'),
('50000000-0000-0000-0000-000000000026', 'R-2026-00010', 'READY', 'Onderhoud afgerond', '90000000-0000-0000-0000-000000000003', 'Anita Hoekstra', '2026-07-27 12:05:00+02'),
('50000000-0000-0000-0000-000000000027', 'R-2026-00011', 'NEW', 'Aangemaakt', '90000000-0000-0000-0000-000000000001', 'Marieke de Vries', '2026-07-16 14:20:00+02'),
('50000000-0000-0000-0000-000000000028', 'R-2026-00011', 'IN_WORKSHOP', 'Drukvoetdruk getest', '90000000-0000-0000-0000-000000000002', 'Jeroen Postma', '2026-07-18 09:05:00+02'),
('50000000-0000-0000-0000-000000000029', 'R-2026-00011', 'READY', 'Klaargezet balie', '90000000-0000-0000-0000-000000000002', 'Jeroen Postma', '2026-07-23 15:58:00+02'),
('50000000-0000-0000-0000-000000000030', 'R-2026-00011', 'COMPLETED', 'Afgehaald door klant', '90000000-0000-0000-0000-000000000001', 'Marieke de Vries', '2026-07-24 11:41:00+02'),
('50000000-0000-0000-0000-000000000031', 'R-2026-00012', 'NEW', 'Inname', '90000000-0000-0000-0000-000000000001', 'Marieke de Vries', '2026-07-26 08:50:00+02'),
('50000000-0000-0000-0000-000000000032', 'R-2026-00012', 'IN_WORKSHOP', 'Connector storing geconstateerd', '90000000-0000-0000-0000-000000000003', 'Anita Hoekstra', '2026-07-26 09:30:00+02'),
('50000000-0000-0000-0000-000000000033', 'R-2026-00013', 'NEW', 'Aangemaakt', '90000000-0000-0000-0000-000000000001', 'Marieke de Vries', '2026-07-27 10:11:00+02'),
('50000000-0000-0000-0000-000000000034', 'R-2026-00013', 'IN_WORKSHOP', 'Spanningsmodule doorgemeten', '90000000-0000-0000-0000-000000000002', 'Jeroen Postma', '2026-07-27 12:42:00+02'),
('50000000-0000-0000-0000-000000000035', 'R-2026-00013', 'WAITING_FOR_PARTS', 'Module besteld bij leverancier', '90000000-0000-0000-0000-000000000002', 'Jeroen Postma', '2026-07-27 16:05:00+02'),
('50000000-0000-0000-0000-000000000036', 'R-2026-00014', 'NEW', 'Aangemaakt', '90000000-0000-0000-0000-000000000001', 'Marieke de Vries', '2026-07-23 09:10:00+02'),
('50000000-0000-0000-0000-000000000037', 'R-2026-00014', 'IN_WORKSHOP', 'Schakelaar defect bevestigd', '90000000-0000-0000-0000-000000000003', 'Anita Hoekstra', '2026-07-24 11:55:00+02'),
('50000000-0000-0000-0000-000000000038', 'R-2026-00014', 'READY', 'Eindcontrole afgerond', '90000000-0000-0000-0000-000000000003', 'Anita Hoekstra', '2026-07-29 14:48:00+02'),
('50000000-0000-0000-0000-000000000039', 'R-2026-00015', 'NEW', 'Spoedklus ingepland', '90000000-0000-0000-0000-000000000001', 'Marieke de Vries', '2026-07-28 08:20:00+02'),
('50000000-0000-0000-0000-000000000040', 'R-2026-00015', 'IN_WORKSHOP', 'Sensor test gestart', '90000000-0000-0000-0000-000000000002', 'Jeroen Postma', '2026-07-28 09:05:00+02'),
('50000000-0000-0000-0000-000000000041', 'R-2026-00016', 'NEW', 'Intake afgerond', '90000000-0000-0000-0000-000000000001', 'Marieke de Vries', '2026-07-29 12:36:00+02'),
('50000000-0000-0000-0000-000000000042', 'R-2026-00017', 'NEW', 'Aangemaakt', '90000000-0000-0000-0000-000000000001', 'Marieke de Vries', '2026-07-22 14:51:00+02'),
('50000000-0000-0000-0000-000000000043', 'R-2026-00017', 'IN_WORKSHOP', 'Snijder onderzocht', '90000000-0000-0000-0000-000000000002', 'Jeroen Postma', '2026-07-25 10:20:00+02'),
('50000000-0000-0000-0000-000000000044', 'R-2026-00017', 'READY', 'Machine gereed gemeld', '90000000-0000-0000-0000-000000000002', 'Jeroen Postma', '2026-07-29 16:10:00+02'),
('50000000-0000-0000-0000-000000000045', 'R-2026-00018', 'NEW', 'Aangemaakt', '90000000-0000-0000-0000-000000000001', 'Marieke de Vries', '2026-07-27 09:22:00+02'),
('50000000-0000-0000-0000-000000000046', 'R-2026-00018', 'IN_WORKSHOP', 'Tandwielset gedemonteerd', '90000000-0000-0000-0000-000000000003', 'Anita Hoekstra', '2026-07-28 11:03:00+02'),
('50000000-0000-0000-0000-000000000047', 'R-2026-00019', 'NEW', 'Ingeboekt', '90000000-0000-0000-0000-000000000001', 'Marieke de Vries', '2026-07-10 09:00:00+02'),
('50000000-0000-0000-0000-000000000048', 'R-2026-00019', 'IN_WORKSHOP', 'Steekplaat defect bevestigd', '90000000-0000-0000-0000-000000000002', 'Jeroen Postma', '2026-07-11 10:30:00+02'),
('50000000-0000-0000-0000-000000000049', 'R-2026-00019', 'READY', 'Reparatie afgerond', '90000000-0000-0000-0000-000000000002', 'Jeroen Postma', '2026-07-16 13:45:00+02'),
('50000000-0000-0000-0000-000000000050', 'R-2026-00019', 'COMPLETED', 'Klant heeft machine afgehaald', '90000000-0000-0000-0000-000000000001', 'Marieke de Vries', '2026-07-17 15:12:00+02'),
('50000000-0000-0000-0000-000000000051', 'R-2026-00019', 'COMPLETED', 'Dossier naar archief verplaatst', '90000000-0000-0000-0000-000000000001', 'Marieke de Vries', '2026-07-24 09:02:00+02'),
('50000000-0000-0000-0000-000000000052', 'R-2026-00020', 'NEW', 'Aangemaakt', '90000000-0000-0000-0000-000000000001', 'Marieke de Vries', '2026-07-12 11:02:00+02'),
('50000000-0000-0000-0000-000000000053', 'R-2026-00020', 'IN_WORKSHOP', 'Snijmes inspectie', '90000000-0000-0000-0000-000000000003', 'Anita Hoekstra', '2026-07-14 09:18:00+02'),
('50000000-0000-0000-0000-000000000054', 'R-2026-00020', 'READY', 'Getest en klaar', '90000000-0000-0000-0000-000000000003', 'Anita Hoekstra', '2026-07-18 14:12:00+02'),
('50000000-0000-0000-0000-000000000055', 'R-2026-00020', 'COMPLETED', 'Afgegeven en afgerekend', '90000000-0000-0000-0000-000000000001', 'Marieke de Vries', '2026-07-19 10:25:00+02');

-- Repair notes
INSERT INTO repair_notes (id, repairId, note, createdBy, createdAt) VALUES
('60000000-0000-0000-0000-000000000001', 'R-2026-00001', 'Klant gaf aan dat probleem vooral bij jeans optreedt.', 'Marieke de Vries', '2026-07-22 09:20:00+02'),
('60000000-0000-0000-0000-000000000002', 'R-2026-00004', 'Spoelkap is besteld bij hoofdleverancier, levertijd 2 dagen.', 'Anita Hoekstra', '2026-07-24 16:08:00+02'),
('60000000-0000-0000-0000-000000000003', 'R-2026-00006', 'Na vervanging direct proeflap gemaakt, steekbeeld goed.', 'Anita Hoekstra', '2026-07-27 15:10:00+02'),
('60000000-0000-0000-0000-000000000004', 'R-2026-00009', 'Onderdeelnummer doorgegeven aan inkoop.', 'Jeroen Postma', '2026-07-28 16:40:00+02'),
('60000000-0000-0000-0000-000000000005', 'R-2026-00012', 'Machine moet uiterlijk vrijdag retour ivm productie.', 'Marieke de Vries', '2026-07-26 09:05:00+02'),
('60000000-0000-0000-0000-000000000006', 'R-2026-00015', 'Atelier belt dagelijks voor update.', 'Marieke de Vries', '2026-07-28 10:14:00+02'),
('60000000-0000-0000-0000-000000000007', 'R-2026-00017', 'Klant wil sms zodra machine klaarstaat.', 'Marieke de Vries', '2026-07-22 15:00:00+02'),
('60000000-0000-0000-0000-000000000008', 'R-2026-00019', 'Dossier compleet, garantiebon toegevoegd.', 'Marieke de Vries', '2026-07-24 09:10:00+02');

-- Workshop settings
INSERT INTO workshop_settings (id, settingKey, settingValue, updatedAt) VALUES
('80000000-0000-0000-0000-000000000001', 'company', '{"name":"Sikma''s Werkplaats","address":"Industrieweg 12, 8701 PB Bolsward","phone":"0515 123 456","email":"info@sikmaswerkplaats.nl"}'::jsonb, now()),
('80000000-0000-0000-0000-000000000002', 'vat', '{"vatNumber":"NL123456789B01","vatRate":21}'::jsonb, now()),
('80000000-0000-0000-0000-000000000003', 'numbering', '{"repairPrefix":"R-2026-","padding":5}'::jsonb, now()),
('80000000-0000-0000-0000-000000000004', 'workflow_statuses', '{"statuses":["NEW","IN_WORKSHOP","WAITING_FOR_CUSTOMER","WAITING_FOR_PARTS","READY","COMPLETED","NEW_MACHINE_SOLD","MACHINE_DISCARDED"]}'::jsonb, now()),
('80000000-0000-0000-0000-000000000005', 'defaults', '{"pickupMessage":"Uw machine staat klaar voor ophalen.","paymentDefault":"Open"}'::jsonb, now()),
('80000000-0000-0000-0000-000000000006', 'label_printer', '{"printerName":"123inkt LW650","enabled":true,"host":"192.168.1.150","port":9100,"mockMode":true}'::jsonb, now());

COMMIT;
