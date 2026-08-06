# Operationeel beleid - datahygiëne

## Doel
Beperk ruis in de werkplaatsapp, houd performance stabiel en maak auditing bruikbaar.

## Bewaartermijnen
- `workshop_audit_events`: 12 maanden bewaren.
- `communication_events`: 24 maanden bewaren, daarna alleen geanonimiseerde kernvelden indien nodig.
- `repair_status_history` en `repair_notes`: bewaren zolang reparaties bewaard blijven.

## Maandelijkse opschoning
Voer elke maand uit:
1. Verwijder audit-events ouder dan 12 maanden.
2. Controleer op mislukte print-events en tel aantallen per week.
3. Controleer op reparaties zonder gekoppelde klant of machine waar dat wel verwacht wordt.

## Handmatige fallback bij printerstoring
Wanneer printer offline is:
1. Noteer reparatienummer + klantnaam tijdelijk op papier.
2. Ga door met intakeproces, status blijft gewoon in systeem.
3. Print sticker later opnieuw via succespagina of instellingen.

## Kwaliteitscontrole
- Wekelijks: controleer dat dashboard geen oplopende wachtrijen toont voor `READY > 7 dagen`.
- Wekelijks: controleer minimaal 1 testlabel na wijzigingen in printerinstellingen.# Functioneel Ontwerp – Sikma's Werkplaats
**Versie:** 1.0  
**Datum:** 4 augustus 2026  
**Status:** Actueel (gegenereerd vanuit broncode)

---

## 1. Inleiding

Sikma's Werkplaats is een interne werkplaatsbeheerapplicatie voor een naaimachinewerkplaats. De applicatie ondersteunt het volledige reparatieproces: van aanmelding aan de balie tot afgifte aan de klant, inclusief werkplaatsverwerking, klantbeheer en statusbeheer. De applicatie is uitsluitend voor intern gebruik door medewerkers van Sikma's Werkplaats.

### Technische basis
- Next.js 15 (App Router) met TypeScript
- Supabase als backendplatform (PostgreSQL + authenticatie)
- Tailwind CSS voor opmaak
- Beheerd via een gedeelde Supabase-omgeving

---

## 2. Gebruikersrollen en rechten

De applicatie kent drie rollen. Rechten worden toegewezen via `lib/access-control.ts`.

| Rol | Dashboard | Nieuwe reparatie | Machine afgeven | Klanten | Machines | Werkplaats | Archief | Instellingen |
|---|---|---|---|---|---|---|---|---|
| Administrator | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (incl. gebruikers) |
| Repair Technician | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (geen gebruikers) |
| Front Desk | ✓ | ✓ | ✓ | ✓ | – | – | – | – |

### Gebruikersselectie
De actieve gebruiker wordt gekozen via een dropdown in de zijbalk. Gebruikers worden opgeslagen in `localStorage`. Er is geen inlogscherm; de sessie wordt beheerd door Supabase middleware op serverniveau voor data-toegang.

Standaardgebruikers bij eerste gebruik:
- **A. Sikma** – Administrator
- **K. Sikma** – Repair Technician
- **T. Sikma, MG. Sikma, M. Sikma** – Front Desk

---

## 3. Navigatiestructuur

De zijbalk (altijd zichtbaar) bevat de volgende navigatiepunten:

| Label | Route | Vereiste rol |
|---|---|---|
| Dashboard | `/dashboard` | Alle rollen |
| Nieuwe reparatie | `/nieuwe-reparatie` | Alle rollen |
| Reparatieoverzicht | `/reparaties` | Alle rollen |
| Machine Ophalen | `/machine-ophalen` | Alle rollen |
| Klanten | `/klanten` | Alle rollen |
| Machines | `/machines` | Repair Technician, Administrator |
| Werkplaats | `/werkplaats` | Repair Technician, Administrator |
| Archief | `/archief` | Repair Technician, Administrator |
| Instellingen | `/instellingen` | Repair Technician, Administrator |

---

## 4. Reparatiestatusmodel

Elke reparatie heeft één van de volgende zes statussen:

| Status | Label | Kleur |
|---|---|---|
| `NEW` | Nieuw | Grijs |
| `IN_WORKSHOP` | In werkplaats | Blauw |
| `WAITING_FOR_CUSTOMER` | Wachten op klant | Amber/oranje |
| `WAITING_FOR_PARTS` | Wachten op onderdelen | Paars |
| `READY` | Klaar | Groen |
| `COMPLETED` | Afgerond | Donkergrijs |

### Uitkomst (RepairOutcome)
Naast de status wordt bij afronden een definitieve uitkomst vastgelegd:

| Uitkomst | Betekenis |
|---|---|
| `REPAIRED` | Gerepareerd |
| `MAINTENANCE_DONE` | Onderhoud uitgevoerd |
| `WARRANTY` | Garantie |
| `NEW_MACHINE_SOLD` | Nieuwe naaimachine verkocht |
| `MACHINE_DISCARDED` | Machine afgevoerd |

### Betaalstatus
- Open
- Betaald
- Betaalt later

### Legacy-statusmigratie
Oudere statussen uit vorige databaseversies (bijv. `CHECKED_IN`, `REPAIRING`, `READY_FOR_PICKUP`) worden automatisch genormaliseerd naar het huidige model via `lib/workflow.ts`.

---

## 5. Pagina's en functionaliteit

### 5.1 Dashboard (`/dashboard`)

**Doel:** Snel overzicht van de actuele werkplaatssituatie en directe acties.

**Inhoud:**
- Twee grote actiekaarten: **Nieuwe reparatie** en **Machine afgeven** (met teller klaar-voor-klant)
- Drie tellerkaarten:
  - In werkplaats (NEW + IN_WORKSHOP)
  - Wachten op onderdelen
  - Klaar
- Lijst **Klaar voor klant** (max. 6 dossiers) met communicatievoorstel per dossier
  - Voorstel op basis van beschikbare contactgegevens: WhatsApp, Bellen, E-mail
  - Klik op dossier opent het werkplaatsdossier

---

### 5.2 Nieuwe reparatie (`/nieuwe-reparatie`)

**Doel:** Registreren van een nieuwe reparatie aan de balie.

**Formulier bevat:**
- Naam klant (met klantsuggesties op basis van bestaande klanten, actief na ≥2 tekens)
- Stad, mobiel nummer, vast nummer, e-mail
- Merk, model machine
- Klantmelding / probleemomschrijving
- Notities

**Gedrag:**
- Bestaande klant selecteren: formuliervelden worden automatisch ingevuld
- Nieuwe klant: wordt direct aangemaakt/gevonden via `findOrCreateCustomer`
- Reparatie krijgt status `NEW` en een oplopend reparatienummer (`R-2026-XXXXX`)
- Na opslaan: doorverwijzing naar succespagina

---

### 5.3 Werkplaatsoverzicht (`/werkplaats`)

**Toegang:** Repair Technician, Administrator  
**Visuele stijl:** Dark mode (donkere achtergrond, lichte tekst)

**Doel:** Realtime overzicht van alle actieve werkplaatsdossiers, gesorteerd per status.

**Secties (in volgorde):**
1. NIEUW — gesorteerd op binnenkomstdatum (oudste eerst)
2. IN BEHANDELING — gesorteerd op recentste statuswijziging (nieuwste eerst)
3. WACHT OP KLANT — gesorteerd op langst wachttend (oudste statuswijziging eerst)
4. WACHT OP ONDERDELEN — gesorteerd op verwachte leverdatum, daarna oudste eerst
5. KLAAR — gesorteerd op klaar-datum (oudste klaar-datum eerst)

**Per reparatiekaart:**
- Reparatienummer
- Statuschip met kleurcodering (centraal gedefinieerd in `lib/workflow.ts`)
- Naam klant en stad
- Binnenkomstdatum en -tijd
- Uitkomstlabel indien aanwezig
- Groepsindicator (🔗 N gekoppeld) indien reparaties zijn gekoppeld

**Navigatie:** Klik op kaart opent het werkplaatsdossier (`/werkplaats/[id]`)

---

### 5.4 Werkplaatsdossier (`/werkplaats/[id]`)

**Toegang:** Repair Technician, Administrator  
**Visuele stijl:** Dark mode

**Doel:** Volledig verwerken van één reparatiedossier vanuit de werkplaats.

**Automatisch gedrag bij openen:**
- Reparatie met status `NEW` wordt automatisch omgezet naar `IN_WORKSHOP`

**Paneel: Dossiergegevens**
- Klantgegevens (naam, telefoon, e-mail, stad)
- Machinegegevens (naam, merk, model, serienummer)
- Klantmelding
- Tijdstempels: binnenkomst, status bijgewerkt, klaar sinds
- Verwachte onderdelen, onderhoudsherinnering, uitkomst

**Paneel: Klantgegevens**
- Volledig adres, contactgegevens van de gekoppelde klant
- Knop **Bewerk klant** → opent `CustomerEditorModal`

**Paneel: Koppel reparaties**
- Toont andere open reparaties van dezelfde klant
- Mogelijkheid om reparaties te koppelen in een groep (voor gezamenlijke afgifte)
- Mogelijkheid om huidige dossier te ontkoppelen uit een groep
- Bij alle gekoppelde dossiers op status `READY`: communicatievoorstel zichtbaar

**Paneel: Werkplaatsuitkomst**
- Veld: Prijs (EUR)
- Veld: Werkplaatsnotitie
- Veld: Verwachte leverdatum onderdelen (optioneel)
- Veld: Opmerking onderdelen (optioneel)

**Actieknoppen:**
| Knop | Resulterende status | Uitkomst |
|---|---|---|
| Gerepareerd | `READY` | `REPAIRED` |
| Onderhoud uitgevoerd | `READY` | `MAINTENANCE_DONE` |
| Garantie | `READY` | `WARRANTY` |
| Wacht op klant | `WAITING_FOR_CUSTOMER` | – |
| Wacht op onderdelen | `WAITING_FOR_PARTS` | – |
| Niet repareerbaar afronden | `COMPLETED` | `NEW_MACHINE_SOLD` of `MACHINE_DISCARDED` (keuze via dialoog) |

**Bijzonderheden:**
- Bij `READY`-uitkomsten: onderhoudsherinnering wordt automatisch gepland (+12 maanden)
- Extra kosten worden nooit automatisch gecommuniceerd — eerst bellen, dan `WAITING_FOR_CUSTOMER`

---

### 5.5 Reparatieoverzicht (`/reparaties`)

**Doel:** Filterable overzicht van alle reparaties over alle statussen.

**Filters:**
- Klaar
- Wachten op klant
- Wachten op onderdelen
- Afgerond
- Alles

**Per reparatie:** reparatienummer, klantnaam, klantmelding, statusbadge met klik naar detailpagina `/reparaties/[id]`

---

### 5.6 Machine afgeven (`/machine-ophalen`)

**Doel:** Afgifte van klaar-zijnde machines aan de klant.

**Werkwijze:**
1. Lijst van alle reparaties met status `READY`
2. Zoeken op naam, telefoon, reparatienummer of stad
3. Reparatie selecteren → dossierdetails en overdrachtsformulier verschijnen
4. Indien de reparatie deel uitmaakt van een groep: keuze welke dossiers nu worden afgegeven (gedeeltelijk of volledig)
5. Betaalstatus kiezen: **Betaald** of **Openstaand**
6. Afgifte wordt geregistreerd → status wordt `COMPLETED`

---

### 5.7 Klantenbeheer (`/klanten`)

**Doel:** Zoeken, aanmaken en bewerken van klanten.

**Functies:**
- Zoekbalk met directe filtering op naam, klantnummer, telefoon en e-mail
- Tabel met kolommen: voornaam, achternaam, e-mail, telefoon, klantnummer (KL-XXXXX)
- Bewerk-icoon per rij → opent `CustomerEditorModal`
- Knop **Nieuwe klant** → opent `CustomerEditorModal` in aanmaak-modus

**CustomerEditorModal (tabbladen):**
- Tab **Klant**: voornaam, achternaam, e-mail, mobiel nummer
- Tab **Contact**: mobiel nummer, vast nummer, e-mail
- Tab **Adres & notities**: adres, postcode, stad, notities

---

### 5.8 Machines (`/machines`)

**Doel:** Overzicht van geregistreerde machines.  
**Toegang:** Repair Technician, Administrator

---

### 5.9 Archief (`/archief`)

**Doel:** Raadpleging van afgeronde dossiers (status `COMPLETED`).  
**Toegang:** Repair Technician, Administrator  
Toont een tabel van alle afgesloten reparaties.

---

### 5.10 Instellingen (`/instellingen` en `/instellingen/users`)

**Instellingen:** algemene applicatie-instellingen (paginaopening).  
**Gebruikersbeheer** (alleen Administrator):
- Lijst van alle gebruikers met naam, rol, e-mail en actief-status
- Gebruiker aanmaken, bewerken, wachtwoord resetten, deactiveren
- Rollen: Administrator, Repair Technician, Front Desk
- Gebruikersdata wordt opgeslagen in `localStorage`

---

## 6. Klantmodel

| Veld | Type | Toelichting |
|---|---|---|
| `id` | UUID | Intern technisch ID (Supabase) |
| `customerNumber` | string | Leesbaar klantnummer (KL-00001) |
| `firstName` | string | Voornaam |
| `lastName` | string | Achternaam |
| `name` | string | Samenstelling van voornaam + achternaam |
| `address` | string | Straat en huisnummer |
| `postalCode` | string | Postcode |
| `city` | string | Stad/woonplaats |
| `mobilePhone` | string | Mobiel nummer |
| `landlinePhone` | string | Vast nummer |
| `phone` | string | Primair telefoonnummer (fallback voor koppeling) |
| `email` | string | E-mailadres |
| `notes` | string | Interne notities over de klant |

---

## 7. Reparatiemodel

| Veld | Toelichting |
|---|---|
| `id` | Reparatienummer, bijv. `R-2026-00001` |
| `repairNumber` | Leesbaar reparatienummer |
| `repairGroupId` | ID voor gekoppelde reparatiegroep |
| `repairOutcome` | Definitieve uitkomst |
| `customer` | Naam klant (denormalized) |
| `customerId` | Verwijzing naar klantrecord |
| `phone`, `email`, `city`, `address` | Contactgegevens klant |
| `brand`, `model`, `machine` | Machinegegevens |
| `serialNumber` | Serienummer machine |
| `machineId` | Verwijzing naar machinerecord |
| `issue` | Klantmelding / probleemomschrijving |
| `repair` | Beschrijving uitgevoerde werkzaamheden |
| `partsUsed` | Gebruikte onderdelen |
| `shelfLocation` | Plaatsaanduiding in werkplaats |
| `priority` | LOW / NORMAL / HIGH / URGENT |
| `expectedDeliveryDate` | Verwachte onderdelen-leverdatum |
| `status` | Huidige werkstatus |
| `statusUpdatedAt` | Tijdstip laatste statuswijziging |
| `readyAt` | Tijdstip waarop status READY werd |
| `nextMaintenanceDate` | Datum volgende onderhoudsherinnering |
| `price` | Reparatieprijs (EUR) |
| `paymentStatus` | Open / Betaald / Betaalt later |
| `history` | JSON-log van alle statuswijzigingen |
| `notes` | Werkplaatsnotities |

---

## 8. Communicatieregels

- Klant wordt nooit automatisch geïnformeerd over extra kosten
- Extra kosten → altijd eerst `WAITING_FOR_CUSTOMER` instellen en de klant bellen
- Communicatievoorstel op dashboard en bij klaar-voor-klant: WhatsApp (als telefoon bekend), Bellen, E-mail (als e-mail bekend)
- Bij gekoppelde reparatiegroep die volledig op `READY` staat: WhatsApp-voorstel zichtbaar in het dossier

---

## 9. Databasestructuur (Supabase/PostgreSQL)

| Tabel | Inhoud |
|---|---|
| `customers` | Klantgegevens met customerNumber, naam, contactgegevens |
| `machines` | Machines gekoppeld aan klanten |
| `repairs` | Reparatiedossiers |
| `repair_status_history` | Tijdlijn van statuswijzigingen per reparatie |
| `repair_notes` | Losse notities per reparatiedossier |
| `users` | Werkplaatsgebruikers (referentie; actief gebruikersbeheer loopt via localStorage) |
| `workshop_settings` | Sleutel-waardeopslag voor applicatie-instellingen |

### Schema-compatibiliteit
De applicatie is ontworpen om te werken op heterogene database-omgevingen. Alle schrijf- en leesbewerkingen bevatten fallbacks voor camelCase én snake_case kolomnamen, en verwijderen ontbrekende kolommen dynamisch op basis van Supabase-foutmeldingen.

De migratiescripts (`db/fix_repairs_schema.sql`, `db/init.sql`) zijn idempotent en bevatten:
- Kolom-toevoeging met `ADD COLUMN IF NOT EXISTS`
- Legacy-statusmigratie naar het nieuwe 6-statusmodel
- Backfill van nieuwe velden (`repairGroupId`, `repairOutcome`, `statusUpdatedAt`, `readyAt`, `nextMaintenanceDate`)

---

## 10. Technische architectuur

```
app/                    # Next.js App Router pagina's
  dashboard/
  nieuwe-reparatie/
  werkplaats/
    [id]/               # Werkplaatsdossier
  reparaties/
    [id]/
  machine-ophalen/
  klanten/
    [id]/
  machines/
  archief/
  instellingen/
    users/

components/
  customers/            # Klantbeheer UI (CustomerManagement, CustomerEditorModal)
  workflow/             # Werkplaats workflow panelen (HandoverPanel, RepairDetailsPanel)
  ui/                   # Gedeelde UI: Card, Button, FormField, PageShell, StatusBadge

lib/
  repair-service.ts     # Centrale workflow-logica (laden, acties, groepen, uitkomsten)
  workflow.ts           # Statusconstanten, labels, kleuren, communicatiehulp
  repositories/         # Data-toegang per entiteit (repairs, customers, machines, notes)
  access-control.ts     # Rol-gebaseerde toestemming
  active-user.ts        # Gebruikerssessie via localStorage
  repair-display.ts     # Reparatienummer opmaak

types/
  repair.ts             # Alle gedeelde TypeScript-typen

db/
  init.sql              # Initieel schema voor nieuwe omgevingen
  fix_repairs_schema.sql # Idempotente migratie voor bestaande omgevingen
```

---

## 11. Bekende beperkingen en aandachtspunten

- Gebruikerssessie is `localStorage`-gebaseerd: geen serverside authenticatie per gebruiker
- Geen automatische sessie-expiratie of uitlogfunctie
- Reparatienummers worden opgebouwd op basis van het aantal reparaties in de database (kans op duplicaten bij gelijktijdig gebruik)
- Koppelen van reparaties vereist een gekoppelde `customerId` — reparaties zonder klant-ID kunnen niet worden gegroepeerd
- Dark mode is uitsluitend van toepassing op de werkplaats-schermen; overige pagina's gebruiken lichte achtergrond
