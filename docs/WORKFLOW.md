# WORKFLOW.md

# Sikma's Werkplaats
## Werkproces versie 1.0

---

# Doel

Dit document beschrijft het complete werkproces van Sikma's Werkplaats.

Iedere nieuwe functie in de software moet dit werkproces volgen. De software ondersteunt de medewerkers; de software bepaalt het werkproces niet.

---

# Rollen

## Winkelmedewerker

Verantwoordelijk voor:

- Klant ontvangen
- Reparatie aannemen
- Klantgegevens controleren
- Klacht noteren
- Reparatienummer genereren
- Reparatienummer op de machine schrijven

Technische informatie wordt **niet** ingevuld.

---

## Reparateur

Verantwoordelijk voor:

- Machine beoordelen
- Merk invullen
- Model invullen
- Serienummer invullen
- Diagnose uitvoeren
- Reparatie uitvoeren
- Onderhoud registreren
- Gebruikte onderdelen noteren
- Prijs bepalen
- Status aanpassen

De reparateur verrijkt de werkbon met alle technische informatie.

---

# Workflow

## Stap 1 – Klant komt binnen

De klant meldt zich aan bij de balie.

De medewerker vraagt:

- Naam
- Woonplaats
- Telefoonnummer (verplicht)
- E-mailadres (optioneel)

Daarna vraagt de medewerker:

"Waar heeft uw machine last van?"

De medewerker schrijft uitsluitend de klacht op.

Er wordt bewust nog geen technisch oordeel gegeven.

---

## Stap 2 – Reparatie opslaan

Na het opslaan:

- automatisch reparatienummer genereren
- reparatie verschijnt in de werkplaats
- medewerker schrijft alleen het reparatienummer op de machine

Er wordt geen werkbon uitgeprint.

---

## Stap 3 – Werkplaats

De reparateur ziet een overzicht van alle open reparaties.

Bij het openen van een reparatie vult hij aan:

- Merk
- Model
- Serienummer
- Reparatiecategorie
- Machineconditie
- Gebruikstype
- Diagnose
- Werkzaamheden
- Onderdelen
- Prijs

Status:

- Open
- On Hold
- Klaar

Wanneer onderdelen besteld moeten worden, wordt de status **On Hold**.

---

## Stap 4 – Machine gereed

Na voltooiing:

Status = Klaar

De machine blijft in de stelling staan totdat de klant deze ophaalt.

---

## Stap 5 – Machine ophalen

De klant meldt zich bij de balie.

De medewerker zoekt op:

- Naam
- Telefoonnummer
- Reparatienummer

De juiste reparatie wordt geopend.

De medewerker haalt vervolgens de machine uit de stelling.

De betaling wordt verwerkt.

Daarna wordt de reparatie afgesloten.

---

# Klantherkenning

Wanneer een telefoonnummer al bestaat:

De software toont automatisch:

- bestaande klant
- eerder uitgevoerde reparaties

De medewerker hoeft gegevens alleen nog te controleren.

---

# Belangrijke ontwerpregels

Het systeem is ontworpen voor medewerkers met weinig computerervaring.

Daarom geldt:

- zo weinig mogelijk klikken
- grote knoppen
- duidelijke taal
- geen technische termen voor winkelmedewerkers
- reparateur ziet uitgebreidere informatie
- tabletvriendelijk ontwerp

---

# Buiten scope versie 1

Deze functies worden later toegevoegd:

- WhatsApp
- Onderhoudsherinneringen
- Dashboard statistieken
- CRM
- Marketing
- Machinehistorie
- Omzetanalyse
