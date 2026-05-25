# Data Model

## Core Design Principles

1. **Multi-tenancy first** — every table that holds business data has a `tenant` FK. Queries never cross tenant boundaries.
2. **Source-of-truth tracking** — every EmissionRecord stores its raw source row as JSON, is tied to an IngestionRun, and is immutable once approved.
3. **Scope 1/2/3 categorization** — set at parse time based on source type and category, not user input.
4. **Unit normalization** — raw values are stored in original units; normalized values are always in kgCO₂e.
5. **Audit trail** — every status change, approval, and ingestion event writes to AuditLog.

---

## Models

### Tenant
| Field | Type | Notes |
|---|---|---|
| id | PK | |
| name | CharField | Display name |
| slug | SlugField (unique) | URL-safe identifier |
| created_at | DateTimeField | |

Single tenant = one enterprise client. Future: row-level security per tenant.

### TenantMembership
Links Users to Tenants with a role. Roles: `analyst` (can review), `admin` (can do everything).

### IngestionRun
Represents one file upload event.

| Field | Type | Notes |
|---|---|---|
| tenant | FK(Tenant) | |
| source_type | CharField | `sap`, `utility`, `travel` |
| uploaded_by | FK(User) | |
| original_filename | CharField | Preserved for traceability |
| status | CharField | `pending`, `processing`, `done`, `failed` |
| total_rows | IntegerField | Rows in file |
| parsed_rows | IntegerField | Successfully parsed |
| failed_rows | IntegerField | Rows that errored |
| error_log | JSONField | List of per-row error strings |
| created_at | DateTimeField | |
| completed_at | DateTimeField | nullable |

### EmissionRecord
The central fact table. One row = one emission-generating activity.

| Field | Type | Notes |
|---|---|---|
| tenant | FK(Tenant) | Multi-tenancy |
| ingestion_run | FK(IngestionRun) | Which upload produced this row |
| scope | IntegerField | 1, 2, or 3 |
| category | CharField | `fuel`, `procurement`, `electricity`, `flight`, `hotel`, `ground_transport` |
| activity_date | DateField | When the activity occurred, not when it was ingested |
| description | CharField | Human-readable description |
| location | CharField | Plant code, site name, or city |
| cost_center | CharField | From source data |
| raw_value | DecimalField | Original quantity in original unit |
| raw_unit | CharField | Original unit code (L, KWH, KM, NIGHTS, KG, etc.) |
| raw_source_row | JSONField | Complete original row, immutable, for auditability |
| normalized_value_kg_co2e | DecimalField | Computed: raw × conversion × emission factor |
| emission_factor_used | DecimalField | EF applied |
| emission_factor_source | CharField | e.g. "DEFRA 2023" |
| status | CharField | `pending`, `approved`, `flagged`, `rejected` |
| is_suspicious | BooleanField | Set by parser heuristics |
| suspicious_reason | CharField | Explanation if suspicious |
| reviewed_by | FK(User) | nullable |
| reviewed_at | DateTimeField | nullable |
| reviewer_note | TextField | Analyst's note |
| is_locked | BooleanField | True once approved — no further edits |
| locked_at | DateTimeField | nullable |
| created_at / updated_at | DateTimeField | |

### AuditLog
Immutable event log. Never deleted, never updated.

| Field | Type | Notes |
|---|---|---|
| tenant | FK(Tenant) | |
| actor | FK(User) | nullable (system actions) |
| action | CharField | `created`, `approved`, `flagged`, `rejected`, `locked`, `ingestion_started`, `ingestion_completed` |
| target_model | CharField | Which model was acted on |
| target_id | IntegerField | PK of acted-on object |
| before_state | JSONField | State before action (nullable) |
| after_state | JSONField | State after action (nullable) |
| note | TextField | Human note |
| timestamp | DateTimeField (auto) | |

---

## Scope Assignment Logic

| Source | Category | Scope |
|---|---|---|
| SAP fuel | fuel | **Scope 1** — direct combustion |
| SAP procurement | procurement | Scope 3 — upstream (not yet implemented) |
| Utility | electricity | **Scope 2** — purchased energy |
| Travel — flights | flight | **Scope 3** — business travel |
| Travel — hotel | hotel | **Scope 3** — business travel |
| Travel — ground | ground_transport | **Scope 3** — business travel |

---

## Unit Normalization

SAP uses unit codes from SAP's internal table T006. We normalize:
- Volume: L, LTR → liters; GAL → liters (×3.785)
- Mass: G → kg (÷1000); T/TO → kg (×1000)
- Energy: MWH → kWh (×1000); GJ → kWh (×277.778); MMBTU → kWh (×293.071)

Normalization factor is applied before emission factor multiplication.

---

## Emission Factors

| Source | Factor | Reference |
|---|---|---|
| Diesel | 2.68 kgCO₂e/L | DEFRA 2023 |
| Petrol | 2.31 kgCO₂e/L | DEFRA 2023 |
| Natural Gas | 2.04 kgCO₂e/m³ | DEFRA 2023 |
| Electricity (India) | 0.708 kgCO₂e/kWh | IEA 2023 CEF |
| Flight <1000km | 0.255 kgCO₂e/km | DEFRA 2023 |
| Flight >3700km | 0.195 kgCO₂e/km | DEFRA 2023 |
| Hotel | 21.4 kgCO₂e/night | DEFRA 2023 |
| Taxi/Car | 0.149–0.192 kgCO₂e/km | DEFRA 2023 |
