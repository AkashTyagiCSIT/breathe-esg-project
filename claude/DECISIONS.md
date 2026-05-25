# Decisions

## SAP: Flat-file CSV (BAPI/SM35 export), not IDoc

**Chose:** Flat-file CSV
**Why:** IDocs are X12/EDIFACT-structured EDI messages used for system-to-system integration. Enterprise sustainability teams rarely have IDoc parsing pipelines — they export data manually via SAP transactions like MB51 (material documents), ME2M (purchase orders), or custom ABAP reports. The output is a flat CSV or Excel, sometimes with German headers because the SAP system locale is German. OData services exist (SAP Analytics Cloud), but require licensed API access we wouldn't have in a prototype. BAPI is a function module — not a file format. Flat CSV is what a sustainability lead actually emails to an ESG team.

**Column header handling:** We map both German (BUDAT, MENGE, MEINS, WERKS) and English equivalents to normalized field names, since SAP exports vary by system locale.

**What I'd ask the PM:** Which SAP transactions does the client use to pull this data? Is it ad hoc exports or a scheduled job? Do they have a plant-to-facility lookup table we can ingest?

---

## Utility: Portal CSV export, not PDF or API

**Chose:** Portal CSV
**Why:** PDF parsing (via pdfplumber/camelot) is brittle — every utility formats bills differently and OCR fails on scanned copies. Utility APIs exist (Green Button, some DISCOMS in India) but require OAuth setup with each provider, and many Indian utilities don't offer APIs. Portal CSV export is the realistic 80% case: facilities teams log into the utility portal, export the last billing period, and send the CSV. This is what happens in practice at mid-size Indian companies.

**Billing period mismatch:** Utility bills don't align with calendar months (a Feb bill might cover Jan 15–Feb 14). We store `billing_start` as the activity date and preserve the full period in the raw row. For aggregation by calendar month, this is a known limitation — documented in TRADEOFFS.md.

**What I'd ask the PM:** Which utilities are the client's facilities connected to? Do they have Green Button access? How many meters total?

---

## Travel: CSV export, not Concur/Navan API

**Chose:** CSV export
**Why:** The Concur API requires OAuth 2.0 with company-level admin credentials and a registered application. Navan is similar. In a real deployment, we'd build API connectors. For a prototype, asking the client to export a CSV from their travel management system is reasonable — all these platforms support CSV export, and sustainability leads already do this for manual reporting. The CSV format we accept is modeled on Concur's standard expense export.

**Flight distances:** Concur sometimes provides distance; often it doesn't. We built a lookup table of major airport coordinates (IATA codes) and compute great-circle distance via the Haversine formula. Unknown airport pairs get a default of 2000km and are flagged as suspicious.

**What I'd ask the PM:** Does the client have API access to their travel platform? Do they track distances, or just routes? Do they distinguish economy vs business class (emission factors differ by ~2.5×)?

---

## Review flow: Approve = lock

Once a record is approved, `is_locked = True`. This is intentional — once an analyst signs off on data, it shouldn't be silently editable. To change a locked record, a new ingestion run would be required. This mirrors how audit-grade data should behave.

---

## Suspicious flag heuristics

Parser sets `is_suspicious = True` for:
- Negative or zero quantities
- Values exceeding statistical thresholds (>100,000 kgCO₂e for a single fuel row, >500,000 kWh for a single utility row)
- Unknown airport codes (flight distance unknown)
- Missing distance for ground transport (defaulted to 50km)

These are heuristics, not rules. The analyst reviews and either approves or rejects.

---

## Database: SQLite in dev, PostgreSQL in prod

Settings auto-detect `DATABASE_URL` environment variable. If present, uses PostgreSQL via `dj_database_url`. Otherwise falls back to SQLite for local development. Railway injects `DATABASE_URL` automatically.

---

## Authentication: JWT, not session auth

DRF's session auth requires CSRF handling which complicates a React SPA. JWT tokens issued at login, stored in localStorage, attached to every API request via Axios interceptor. Token lifetime: 8 hours (access), 1 day (refresh).

---

## What I didn't resolve (would ask PM)

1. **Reporting period:** GHG Protocol requires annual inventory. Do we need to handle fiscal year vs calendar year?
2. **Location-based vs market-based Scope 2:** We use location-based (grid emission factor). Market-based (using energy attribute certificates) is different and more complex.
3. **Scope 1 procurement vs fuel:** SAP procurement data could be Scope 3 (Category 1 — purchased goods). We currently treat all SAP data as Scope 1 fuel. Need clarity on what the SAP export actually contains.
4. **Multiple users per tenant:** Current model supports it, but we haven't built role-gated endpoints (admin vs analyst permissions are not enforced beyond membership check).
