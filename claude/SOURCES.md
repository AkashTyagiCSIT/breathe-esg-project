# Sources Research

## Source 1: SAP — Fuel & Procurement

### What I researched
SAP stores material movement data in table MSEG (material document segment) and MKPF (material document header). The standard way to export this is via transaction MB52 (warehouse stocks), MB51 (material documents), or ME2M (purchase orders). Output formats: SAP list viewer export (spreadsheet/CSV), ABAP report to flat file, or OData via SAP Gateway.

SAP column headers depend on system locale. German-locale systems export columns like BUDAT (Buchungsdatum = posting date), MENGE (Menge = quantity), MEINS (Mengeneinheit = unit of measure), WERKS (Werk = plant), KOSTL (Kostenstelle = cost center). English-locale systems use English equivalents. Both appear in the wild.

Units come from SAP table T006 — not ISO standard. Common ones: L (liter), KG, T (metric ton = TO), M3, KWH, MWH, GAL (US gallon). German decimal separator is comma, not period.

### What the sample data looks like and why
`sap_fuel.csv` uses German column headers (BUDAT, WERKS, KOSTL, MATNR, MAKTX, MENGE, MEINS, WRBTR, WAERS) because that's realistic for a company running SAP in a German-locale environment. Plant codes are IN01, IN02, IN03 (realistic SAP 4-char plant codes). Materials have SAP-style material numbers (MAT-DIES-001). Dates are in YYYYMMDD format (SAP internal date format).

Edge cases included: a negative quantity row (returns/corrections are common in SAP), and one row with an implausibly large quantity to test the suspicious-flag heuristic.

### What would break in a real deployment
- **Material classification:** We detect fuel type from the material description text (string matching "diesel", "petrol", etc.). Real SAP material descriptions are inconsistent — "HSD" (High Speed Diesel), "MS" (Motor Spirit), custom codes. Would need a material-number-to-fuel-type lookup table.
- **Multi-currency:** We store the amount but don't use it for emissions. If the client has cross-border operations, exchange rates matter for procurement-based Scope 3.
- **Delta exports:** We currently do full-file ingestion. SAP can export delta (changes since last run), which would require deduplication logic on material document number.
- **IDoc format:** If the client uses SAP PI/PO for integration, they'd send IDocs, not CSV. We don't handle IDoc parsing.

---

## Source 2: Utility — Electricity

### What I researched
Indian electricity utilities (TATA Power, BSES Rajdhani, BESCOM, Torrent, MSEDCL) all offer portal access with billing history download. Export formats vary: TATA Power exports PDF bills; BSES offers CSV download; BESCOM has a data portal. Green Button (XML standard for electricity data) is not widely implemented in India.

Key fields in a utility export: meter ID, billing period (start/end), consumption in kWh, demand (kVA), tariff category (LT/HT Commercial, LT/HT Industrial), amount. Some portals export monthly; others export per-billing-cycle (not calendar-month-aligned).

Grid emission factors for India: Central Electricity Authority publishes CO₂ baseline database for the Indian electricity grid. 2022-23 figure: ~0.708 kgCO₂e/kWh (national average). Regional grids vary (Northern, Southern, Western, Eastern, North-Eastern).

### What the sample data looks like and why
`utility_electricity.csv` has realistic meter IDs (MTR-DEL-001 format), named sites (Delhi HQ, Mumbai Office, Bangalore Tech Park, Hyderabad Plant), billing periods that start on the 1st of month (simplified — real billing cycles often start mid-month), and consumption values in ranges realistic for commercial/industrial Indian buildings (20,000–90,000 kWh/month for large offices and plants).

Edge cases: a zero-consumption row (meter reading failure or site shutdown), and one anomalously high row (610,000 kWh — triggers suspicious flag).

### What would break in a real deployment
- **Billing period misalignment:** We use `billing_start` as the activity date. If a client needs monthly aggregation, bills that span two calendar months need proration logic.
- **Grid factor granularity:** We use a country-level factor. CEA publishes state-level and regional factors. A Hyderabad facility should use the Southern Regional Grid factor (≈0.79 kgCO₂e/kWh), not the national average.
- **Reactive power / demand charges:** We only use kWh consumption. Some industrial tariffs include demand charges (kVA) that could be relevant for a more complete picture.
- **Market-based vs location-based Scope 2:** If the client buys renewable energy certificates (RECs), the market-based emission factor might be 0. We only implement location-based.

---

## Source 3: Corporate Travel — Concur-style

### What I researched
Concur Travel & Expense is the dominant corporate travel platform in India for large enterprises. Navan (formerly TripActions) is growing. Both expose:
- REST APIs with OAuth 2.0 (Concur: https://developer.concur.com/api-reference/)
- CSV/Excel export from the reporting module

Concur's standard travel report export includes: expense date, expense type (Air, Hotel, Car Rental, Ground Transport), merchant name, amount, currency, and sometimes route information (from/to city or airport). Distance is not always present — especially for flights where Concur often records only city pairs.

For Scope 3 Category 6 (Business Travel) under GHG Protocol, emission factors depend on:
- Flights: distance (short-haul vs long-haul), cabin class (economy vs business — radiative forcing index makes business class ~2.5× economy)
- Hotels: property location (some factors differ by country)
- Ground: vehicle type (taxi vs rental vs train)

IATA airport codes are the standard for flight route identification.

### What the sample data looks like and why
`travel_concur.csv` reflects how Concur exports actually look: trip type as a text field (not a standardized code), airport codes for flights (where Concur often records IATA codes), city names for hotels and ground transport, and cost centers. The trip type field is lowercase free text — intentionally inconsistent to reflect real export quality ("flight", "Flight", "air travel" all appear in practice; we normalize with string matching).

Routes include realistic India-international routes (DEL-LHR, DEL-DXB, DEL-SIN, DEL-JFK) and domestic (DEL-BOM, BLR-DEL). One row uses an unknown airport code (XYZ) to test the fallback behavior.

### What would break in a real deployment
- **Cabin class:** We don't capture whether a flight was economy or business. Business class emissions are ~2.5× economy per DEFRA. Concur does record this; we'd need to add the column and split emission factors.
- **Layovers:** A DEL-LHR flight with a stop in Dubai would appear as two legs or one itinerary depending on how Concur records it. We assume direct routes.
- **Hotel emission factors by country:** We use a single DEFRA global hotel factor (21.4 kgCO₂e/night). DEFRA publishes per-country factors. A London hotel has a different factor than a Delhi hotel.
- **Ground transport type accuracy:** Concur expense types are user-entered and inconsistent. "Transportation" could be taxi, Uber, metro, or rickshaw. We do our best with string matching.
- **Currency and amount:** We capture amount but don't use it. A spend-based fallback for unclassifiable travel expenses would require spend-based emission factors.
