import pandas as pd
import io
import math
from decimal import Decimal
from datetime import datetime, date
import re


def sanitize_row(row_dict):
    clean = {}
    for k, v in row_dict.items():
        if isinstance(v, float) and math.isnan(v):
            clean[k] = None
        else:
            clean[k] = v
    return clean


SAP_COLUMN_MAP = {
    'BUDAT': 'posting_date',
    'Buchungsdatum': 'posting_date',
    'MENGE': 'quantity',
    'Menge': 'quantity',
    'MEINS': 'unit',
    'Mengeneinheit': 'unit',
    'WERKS': 'plant_code',
    'Werk': 'plant_code',
    'MATNR': 'material_number',
    'Materialnummer': 'material_number',
    'MAKTX': 'material_description',
    'Bezeichnung': 'material_description',
    'KOSTL': 'cost_center',
    'Kostenstelle': 'cost_center',
    'WRBTR': 'amount',
    'Betrag': 'amount',
    'WAERS': 'currency',
    'Währung': 'currency',
}

SAP_UNIT_NORMALIZATION = {
    'L': ('liter', 1.0),
    'LTR': ('liter', 1.0),
    'GAL': ('liter', 3.78541),
    'KG': ('kg', 1.0),
    'G': ('kg', 0.001),
    'T': ('kg', 1000.0),
    'TO': ('kg', 1000.0),
    'M3': ('cubic_meter', 1.0),
    'FT3': ('cubic_meter', 0.0283168),
    'KWH': ('kwh', 1.0),
    'MWH': ('kwh', 1000.0),
    'GJ': ('kwh', 277.778),
    'MMBTU': ('kwh', 293.071),
}

FUEL_EMISSION_FACTORS = {
    'diesel': Decimal('2.68'),
    'petrol': Decimal('2.31'),
    'gasoline': Decimal('2.31'),
    'natural gas': Decimal('2.04'),
    'lpg': Decimal('1.61'),
    'fuel oil': Decimal('3.18'),
    'default_fuel': Decimal('2.50'),
}

PROCUREMENT_EMISSION_FACTORS = {
    'default': Decimal('0.5'),
}

UTILITY_EMISSION_FACTORS = {
    'IN': Decimal('0.708'),
    'US': Decimal('0.386'),
    'UK': Decimal('0.233'),
    'EU': Decimal('0.295'),
    'default': Decimal('0.5'),
}

TRAVEL_EMISSION_FACTORS = {
    'flight_short': Decimal('0.255'),
    'flight_long': Decimal('0.195'),
    'flight_default': Decimal('0.225'),
    'hotel': Decimal('21.4'),
    'taxi': Decimal('0.149'),
    'rental_car': Decimal('0.192'),
    'train': Decimal('0.041'),
    'bus': Decimal('0.089'),
    'ground_default': Decimal('0.149'),
}


def parse_date_flexible(value):
    if isinstance(value, (date, datetime)):
        return value if isinstance(value, date) else value.date()
    value = str(value).strip()
    formats = ['%Y%m%d', '%d.%m.%Y', '%m/%d/%Y', '%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y']
    for fmt in formats:
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Cannot parse date: {value}")


def detect_fuel_type(description):
    if not description:
        return 'default_fuel'
    desc = description.lower()
    for fuel in ['diesel', 'petrol', 'gasoline', 'natural gas', 'lpg', 'fuel oil']:
        if fuel in desc:
            return fuel
    return 'default_fuel'


def normalize_sap_unit(unit_code):
    code = str(unit_code).strip().upper()
    if code in SAP_UNIT_NORMALIZATION:
        return SAP_UNIT_NORMALIZATION[code]
    return (code.lower(), 1.0)


def parse_sap_csv(file_content):
    records = []
    errors = []

    try:
        df = pd.read_csv(io.StringIO(file_content), sep=None, engine='python', dtype=str)
    except Exception as e:
        return [], [f"Failed to parse CSV: {str(e)}"]

    df.rename(columns=SAP_COLUMN_MAP, inplace=True)
    df.columns = [c.strip() for c in df.columns]

    required = ['posting_date', 'quantity', 'unit']
    for col in required:
        if col not in df.columns:
            errors.append(f"Missing required column: {col}")
            return [], errors

    for idx, row in df.iterrows():
        row_errors = []
        try:
            posting_date = parse_date_flexible(row.get('posting_date', ''))
        except ValueError as e:
            errors.append(f"Row {idx + 2}: {e}")
            continue

        try:
            quantity = Decimal(str(row.get('quantity', '0')).replace(',', '.').strip())
        except Exception:
            errors.append(f"Row {idx + 2}: Invalid quantity '{row.get('quantity')}'")
            continue

        unit_code = str(row.get('unit', 'KG')).strip().upper()
        normalized_unit, conversion_factor = normalize_sap_unit(unit_code)

        description = str(row.get('material_description', '')).strip()
        cost_center = str(row.get('cost_center', '')).strip()
        plant_code = str(row.get('plant_code', '')).strip()

        fuel_type = detect_fuel_type(description)
        ef = FUEL_EMISSION_FACTORS.get(fuel_type, FUEL_EMISSION_FACTORS['default_fuel'])

        normalized_quantity = quantity * Decimal(str(conversion_factor))

        if normalized_unit == 'liter':
            kg_co2e = normalized_quantity * ef
        elif normalized_unit == 'kg':
            kg_co2e = normalized_quantity * ef * Decimal('1.1')
        else:
            kg_co2e = normalized_quantity * ef

        is_suspicious = False
        suspicious_reason = ''
        if quantity <= 0:
            is_suspicious = True
            suspicious_reason = 'Non-positive quantity'
        elif kg_co2e > Decimal('100000'):
            is_suspicious = True
            suspicious_reason = 'Unusually high emission value'

        records.append({
            'scope': 1,
            'category': 'fuel',
            'activity_date': posting_date,
            'description': description,
            'location': plant_code,
            'cost_center': cost_center,
            'raw_value': quantity,
            'raw_unit': unit_code,
            'raw_source_row': sanitize_row(row.to_dict()),
            'normalized_value_kg_co2e': kg_co2e,
            'emission_factor_used': ef,
            'emission_factor_source': 'DEFRA 2023',
            'is_suspicious': is_suspicious,
            'suspicious_reason': suspicious_reason,
        })

    return records, errors


def parse_utility_csv(file_content):
    records = []
    errors = []

    try:
        df = pd.read_csv(io.StringIO(file_content), dtype=str)
    except Exception as e:
        return [], [f"Failed to parse CSV: {str(e)}"]

    df.columns = [c.strip().lower().replace(' ', '_') for c in df.columns]

    UTILITY_COL_MAP = {
        'billing_start': 'billing_start',
        'billing_period_start': 'billing_start',
        'period_start': 'billing_start',
        'start_date': 'billing_start',
        'billing_end': 'billing_end',
        'billing_period_end': 'billing_end',
        'period_end': 'billing_end',
        'end_date': 'billing_end',
        'consumption_kwh': 'consumption_kwh',
        'kwh': 'consumption_kwh',
        'usage_kwh': 'consumption_kwh',
        'units_consumed': 'consumption_kwh',
        'meter_id': 'meter_id',
        'meter_number': 'meter_id',
        'site': 'site',
        'facility': 'site',
        'location': 'site',
        'tariff': 'tariff',
        'rate_type': 'tariff',
        'grid_region': 'grid_region',
        'region': 'grid_region',
        'country': 'country',
    }

    df.rename(columns={k: v for k, v in UTILITY_COL_MAP.items() if k in df.columns}, inplace=True)

    if 'billing_start' not in df.columns:
        errors.append("Missing billing start date column")
        return [], errors

    if 'consumption_kwh' not in df.columns:
        errors.append("Missing consumption (kWh) column")
        return [], errors

    for idx, row in df.iterrows():
        try:
            activity_date = parse_date_flexible(row.get('billing_start', ''))
        except ValueError as e:
            errors.append(f"Row {idx + 2}: {e}")
            continue

        try:
            kwh = Decimal(str(row.get('consumption_kwh', '0')).replace(',', '').strip())
        except Exception:
            errors.append(f"Row {idx + 2}: Invalid consumption value")
            continue

        country = str(row.get('country', 'IN')).strip().upper()
        ef = UTILITY_EMISSION_FACTORS.get(country, UTILITY_EMISSION_FACTORS['default'])

        kg_co2e = kwh * ef

        is_suspicious = False
        suspicious_reason = ''
        if kwh <= 0:
            is_suspicious = True
            suspicious_reason = 'Non-positive consumption'
        elif kwh > Decimal('500000'):
            is_suspicious = True
            suspicious_reason = 'Consumption exceeds 500,000 kWh — verify meter reading'

        records.append({
            'scope': 2,
            'category': 'electricity',
            'activity_date': activity_date,
            'description': f"Electricity — {row.get('site', 'Unknown site')}",
            'location': row.get('site', ''),
            'cost_center': row.get('meter_id', ''),
            'raw_value': kwh,
            'raw_unit': 'KWH',
            'raw_source_row': sanitize_row(row.to_dict()),
            'normalized_value_kg_co2e': kg_co2e,
            'emission_factor_used': ef,
            'emission_factor_source': f"IEA 2023 grid factor ({country})",
            'is_suspicious': is_suspicious,
            'suspicious_reason': suspicious_reason,
        })

    return records, errors


AIRPORT_COORDS = {
    'DEL': (28.5665, 77.1031),
    'BOM': (19.0896, 72.8656),
    'BLR': (13.1986, 77.7066),
    'HYD': (17.2403, 78.4294),
    'MAA': (12.9941, 80.1709),
    'LHR': (51.4700, -0.4543),
    'JFK': (40.6413, -73.7781),
    'CDG': (49.0097, 2.5479),
    'DXB': (25.2532, 55.3657),
    'SIN': (1.3644, 103.9915),
    'SFO': (37.6213, -122.3790),
    'ORD': (41.9742, -87.9073),
    'FRA': (50.0379, 8.5622),
    'NRT': (35.7720, 140.3929),
    'SYD': (-33.9399, 151.1753),
}


def haversine_km(coord1, coord2):
    import math
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def get_flight_ef(distance_km):
    if distance_km < 1000:
        return TRAVEL_EMISSION_FACTORS['flight_short']
    elif distance_km > 3700:
        return TRAVEL_EMISSION_FACTORS['flight_long']
    return TRAVEL_EMISSION_FACTORS['flight_default']


def parse_travel_csv(file_content):
    records = []
    errors = []

    try:
        df = pd.read_csv(io.StringIO(file_content), dtype=str)
    except Exception as e:
        return [], [f"Failed to parse CSV: {str(e)}"]

    df.columns = [c.strip().lower().replace(' ', '_') for c in df.columns]

    TRAVEL_COL_MAP = {
        'travel_date': 'travel_date',
        'date': 'travel_date',
        'departure_date': 'travel_date',
        'check_in_date': 'travel_date',
        'trip_type': 'trip_type',
        'type': 'trip_type',
        'category': 'trip_type',
        'from': 'origin',
        'origin': 'origin',
        'departure': 'origin',
        'from_airport': 'origin',
        'to': 'destination',
        'destination': 'destination',
        'arrival': 'destination',
        'to_airport': 'destination',
        'distance_km': 'distance_km',
        'nights': 'nights',
        'num_nights': 'nights',
        'hotel_nights': 'nights',
        'traveler': 'traveler',
        'employee': 'traveler',
        'employee_name': 'traveler',
        'cost_center': 'cost_center',
        'department': 'cost_center',
    }

    df.rename(columns={k: v for k, v in TRAVEL_COL_MAP.items() if k in df.columns}, inplace=True)

    if 'travel_date' not in df.columns:
        errors.append("Missing travel_date column")
        return [], errors

    if 'trip_type' not in df.columns:
        errors.append("Missing trip_type column")
        return [], errors

    for idx, row in df.iterrows():
        try:
            activity_date = parse_date_flexible(row.get('travel_date', ''))
        except ValueError as e:
            errors.append(f"Row {idx + 2}: {e}")
            continue

        trip_type = str(row.get('trip_type', '')).strip().lower()
        origin = str(row.get('origin', '')).strip().upper()
        destination = str(row.get('destination', '')).strip().upper()
        cost_center = str(row.get('cost_center', '')).strip()
        traveler = str(row.get('traveler', '')).strip()

        is_suspicious = False
        suspicious_reason = ''

        if 'flight' in trip_type or 'air' in trip_type:
            distance_km = None
            if 'distance_km' in df.columns:
                raw_dist = str(row.get('distance_km', '')).strip()
                if raw_dist and raw_dist.lower() not in ('nan', 'none', '', 'n/a'):
                    try:
                        distance_km = float(raw_dist.replace(',', ''))
                    except Exception:
                        pass

            if distance_km is None and origin in AIRPORT_COORDS and destination in AIRPORT_COORDS:
                distance_km = haversine_km(AIRPORT_COORDS[origin], AIRPORT_COORDS[destination])
            elif distance_km is None:
                distance_km = 2000
                is_suspicious = True
                suspicious_reason = f"Airport codes {origin}-{destination} not in lookup; used default 2000km"

            ef = get_flight_ef(distance_km)
            kg_co2e = Decimal(str(distance_km)) * ef
            category = 'flight'
            scope = 3

        elif 'hotel' in trip_type or 'accommodation' in trip_type:
            try:
                nights = Decimal(str(row.get('nights', '1')).strip())
            except Exception:
                nights = Decimal('1')
            ef = TRAVEL_EMISSION_FACTORS['hotel']
            kg_co2e = nights * ef
            category = 'hotel'
            scope = 3
            raw_value = nights
            raw_unit = 'NIGHTS'
            records.append({
                'scope': scope,
                'category': category,
                'activity_date': activity_date,
                'description': f"Hotel stay — {destination} ({nights} nights) — {traveler}",
                'location': destination,
                'cost_center': cost_center,
                'raw_value': nights,
                'raw_unit': 'NIGHTS',
                'raw_source_row': sanitize_row(row.to_dict()),
                'normalized_value_kg_co2e': kg_co2e,
                'emission_factor_used': ef,
                'emission_factor_source': 'DEFRA 2023 Hotel Factor',
                'is_suspicious': is_suspicious,
                'suspicious_reason': suspicious_reason,
            })
            continue

        else:
            ground_type = trip_type
            ef_map = {
                'taxi': TRAVEL_EMISSION_FACTORS['taxi'],
                'cab': TRAVEL_EMISSION_FACTORS['taxi'],
                'rental_car': TRAVEL_EMISSION_FACTORS['rental_car'],
                'car': TRAVEL_EMISSION_FACTORS['rental_car'],
                'train': TRAVEL_EMISSION_FACTORS['train'],
                'rail': TRAVEL_EMISSION_FACTORS['train'],
                'bus': TRAVEL_EMISSION_FACTORS['bus'],
            }
            ef = next((v for k, v in ef_map.items() if k in ground_type), TRAVEL_EMISSION_FACTORS['ground_default'])
            try:
                raw_d = str(row.get('distance_km', '')).strip()
                if not raw_d or raw_d.lower() in ('nan', 'none', '', 'n/a'):
                    raise ValueError('empty')
                distance_km = Decimal(raw_d.replace(',', ''))
            except Exception:
                distance_km = Decimal('50')
                is_suspicious = True
                suspicious_reason = 'Distance not provided; defaulted to 50km'
            kg_co2e = distance_km * ef
            category = 'ground_transport'
            scope = 3

            records.append({
                'scope': scope,
                'category': category,
                'activity_date': activity_date,
                'description': f"{trip_type.title()} — {origin} to {destination} — {traveler}",
                'location': destination,
                'cost_center': cost_center,
                'raw_value': distance_km,
                'raw_unit': 'KM',
                'raw_source_row': sanitize_row(row.to_dict()),
                'normalized_value_kg_co2e': kg_co2e,
                'emission_factor_used': ef,
                'emission_factor_source': 'DEFRA 2023 Ground Transport',
                'is_suspicious': is_suspicious,
                'suspicious_reason': suspicious_reason,
            })
            continue

        records.append({
            'scope': scope,
            'category': category,
            'activity_date': activity_date,
            'description': f"Flight {origin}→{destination} — {traveler}",
            'location': f"{origin}-{destination}",
            'cost_center': cost_center,
            'raw_value': Decimal(str(round(distance_km, 2))),
            'raw_unit': 'KM',
            'raw_source_row': sanitize_row(row.to_dict()),
            'normalized_value_kg_co2e': kg_co2e,
            'emission_factor_used': ef,
            'emission_factor_source': 'DEFRA 2023 Aviation',
            'is_suspicious': is_suspicious,
            'suspicious_reason': suspicious_reason,
        })

    return records, errors
