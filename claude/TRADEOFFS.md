# Tradeoffs — Three Things Deliberately Not Built

## 1. Scope 3 Category 1 (Purchased Goods & Services) from SAP Procurement

**What it is:** SAP procurement data (purchase orders, goods receipts) is the input for Scope 3 Category 1 — upstream emissions from purchased materials and services. This is typically the largest Scope 3 category and the hardest to compute because it requires spend-based or activity-based emission factors per material/commodity.

**Why not built:** Doing this correctly requires a commodity classification system (mapping SAP material numbers to ISIC/NAICS codes) and a spend-based emission factor database (Exiobase, USEEIO, or similar). The parser would need to classify materials, look up per-unit or per-spend factors, and handle the fact that SAP material master data is often incomplete or inconsistently coded. Building a stub that returns wrong Scope 3 numbers is worse than building nothing — it creates false confidence in the inventory. The current SAP parser handles Scope 1 fuel combustion only, which is unambiguous.

**What it would take:** A material-to-category lookup table, a commodity EF database, and a classification step in the parser. 2–3 additional days of work.

---

## 2. Role-based Access Control Beyond Membership Check

**What it is:** Proper RBAC where analysts can review but not ingest, admins can manage tenants and users, and auditors get read-only access. Currently, any authenticated user with a tenant membership can call any endpoint.

**Why not built:** The data model already has `role` on `TenantMembership` (`analyst`, `admin`). Wiring this to DRF's permission system (custom `BasePermission` classes, per-view checks) is straightforward but adds boilerplate to every view. In a 4-day prototype where the evaluator is the only user, the risk is zero. In production, this is the first thing to add before any real data goes in. Skipping it was a deliberate choice to prioritize data model correctness and parser realism over auth plumbing.

**What it would take:** A `TenantPermission` class that reads `request.user.memberships.get(tenant=...).role` and restricts by endpoint. One day of work.

---

## 3. PDF Bill Parsing for Utility Data

**What it is:** Many facilities teams receive electricity bills as PDFs — either emailed from the utility or downloaded from a portal. Parsing these would let us accept PDF uploads directly instead of requiring the facilities team to export a CSV.

**Why not built:** PDF parsing for utility bills is a hard problem dressed up as an easy one. pdfplumber and camelot handle text-layer PDFs reasonably well, but many Indian utility bills are scanned images, which requires OCR (pytesseract + preprocessing). Even with OCR, every utility formats their bill differently — TATA Power, BSES Rajdhani, BESCOM, Torrent all have different layouts. Building a parser that works on one utility's PDFs and fails silently on others is worse than requiring a CSV export, which is a format the facilities team already has access to. The decision to require CSV was driven by reliability, not capability.

**What it would take:** A PDF ingestion pipeline with layout detection, table extraction, OCR fallback, and per-utility template mapping. This is a product in itself, not a feature.
