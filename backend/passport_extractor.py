"""Deterministic Passport MRZ & Profile Photo Extraction Pipeline.

Extracts biographical data from ICAO Doc 9303 Machine Readable Zone (MRZ)
and extracts the traveler's portrait photograph without any external AI or cloud APIs.
"""

import base64
import datetime
import io
import os
import re
import shutil
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image

try:
    import pypdfium2
except ImportError:
    pypdfium2 = None

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

try:
    from rapidocr_onnxruntime import RapidOCR
    _RAPID_OCR_INSTANCE = RapidOCR()
except Exception:
    _RAPID_OCR_INSTANCE = None

try:
    from mrz.checker.td3 import TD3CodeChecker
    from mrz.checker.td1 import TD1CodeChecker
    from mrz.checker.td2 import TD2CodeChecker
except ImportError:
    TD3CodeChecker = None
    TD1CodeChecker = None
    TD2CodeChecker = None

# Cascade path for local Haar face detection
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CASCADE_PATH = os.path.join(BASE_DIR, "haarcascade_frontalface_default.xml")
if not os.path.exists(CASCADE_PATH):
    CASCADE_PATH = os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")

# Check if Tesseract is available before attempting passporteye
HAS_TESSERACT = bool(
    shutil.which("tesseract")
    or os.path.exists(r"C:\Program Files\Tesseract-OCR\tesseract.exe")
    or os.path.exists(r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe")
)

# Standard ISO 3166-1 alpha-3 to alpha-2 translation table
ALPHA3_TO_ALPHA2 = {
    "AFG": "AF", "ALB": "AL", "DZA": "DZ", "AND": "AD", "AGO": "AO",
    "ATG": "AG", "ARG": "AR", "ARM": "AM", "AUS": "AU", "AUT": "AT",
    "AZE": "AZ", "BHS": "BS", "BHR": "BH", "BGD": "BD", "BRB": "BB",
    "BLR": "BY", "BEL": "BE", "BLZ": "BZ", "BEN": "BJ", "BTN": "BT",
    "BOL": "BO", "BIH": "BA", "BWA": "BW", "BRA": "BR", "BRN": "BN",
    "BGR": "BG", "BFA": "BF", "BDI": "BI", "CPV": "CV", "KHM": "KH",
    "CMR": "CM", "CAN": "CA", "CAF": "CF", "TCD": "TD", "CHL": "CL",
    "CHN": "CN", "COL": "CO", "COM": "KM", "COG": "CG", "COD": "CD",
    "CRI": "CR", "CIV": "CI", "HRV": "HR", "CUB": "CU", "CYP": "CY",
    "CZE": "CZ", "DNK": "DK", "DJI": "DJ", "DMA": "DM", "DOM": "DO",
    "ECU": "EC", "EGY": "EG", "SLV": "SV", "GNQ": "GQ", "ERI": "ER",
    "EST": "EE", "SWZ": "SZ", "ETH": "ET", "FJI": "FJ", "FIN": "FI",
    "FRA": "FR", "GAB": "GA", "GMB": "GM", "GEO": "GE", "DEU": "DE",
    "GHA": "GH", "GRC": "GR", "GRD": "GD", "GTM": "GT", "GIN": "GN",
    "GNB": "GW", "GUY": "GY", "HTI": "HT", "HND": "HN", "HUN": "HU",
    "ISL": "IS", "IND": "IN", "IDN": "ID", "IRN": "IR", "IRQ": "IQ",
    "IRL": "IE", "ISR": "IL", "ITA": "IT", "JAM": "JM", "JPN": "JP",
    "JOR": "JO", "KAZ": "KZ", "KEN": "KE", "KIR": "KI", "PRK": "KP",
    "KOR": "KR", "KWT": "KW", "KGZ": "KG", "LAO": "LA", "LVA": "LV",
    "LBN": "LB", "LSO": "LS", "LBR": "LR", "LBY": "LY", "LIE": "LI",
    "LTU": "LT", "LUX": "LU", "MDG": "MG", "MWI": "MW", "MYS": "MY",
    "MDV": "MV", "MLI": "ML", "MLT": "MT", "MHL": "MH", "MRT": "MR",
    "MUS": "MU", "MEX": "MX", "FSM": "FM", "MDA": "MD", "MCO": "MC",
    "MNG": "MN", "MNE": "ME", "MAR": "MA", "MOZ": "MZ", "MMR": "MM",
    "NAM": "NA", "NRU": "NR", "NPL": "NP", "NLD": "NL", "NZL": "NZ",
    "NIC": "NI", "NER": "NE", "NGA": "NG", "MKD": "MK", "NOR": "NO",
    "OMN": "OM", "PAK": "PK", "PLW": "PW", "PAN": "PA", "PNG": "PG",
    "PRY": "PY", "PER": "PE", "PHL": "PH", "POL": "PL", "PRT": "PT",
    "QAT": "QA", "ROU": "RO", "RUS": "RU", "RWA": "RW", "KNA": "KN",
    "LCA": "LC", "VCT": "VC", "WSM": "WS", "SMR": "SM", "STP": "ST",
    "SAU": "SA", "SEN": "SN", "SRB": "RS", "SYC": "SC", "SLE": "SL",
    "SGP": "SG", "SVK": "SK", "SVN": "SI", "SLB": "SB", "SOM": "SO",
    "ZAF": "ZA", "SSD": "SS", "ESP": "ES", "LKA": "LK", "SDN": "SD",
    "SUR": "SR", "SWE": "SE", "CHE": "CH", "SYR": "SY", "TWN": "TW",
    "TJK": "TJ", "TZA": "TZ", "THA": "TH", "TLS": "TL", "TGO": "TG",
    "TON": "TO", "TTO": "TT", "TUN": "TN", "TUR": "TR", "TKM": "TM",
    "TUV": "TV", "UGA": "UG", "UKR": "UA", "ARE": "AE", "GBR": "GB",
    "USA": "US", "URY": "UY", "UZB": "UZ", "VUT": "VU", "VEN": "VE",
    "VNM": "VN", "YEM": "YE", "ZMB": "ZM", "ZWE": "ZW", "UTO": "UT",
}


def to_alpha2(code3: Optional[str]) -> str:
    """Translate 3-letter ISO code to 2-letter ISO code."""
    if not code3:
        return ""
    clean = code3.strip().upper()
    return ALPHA3_TO_ALPHA2.get(clean, clean[:2] if len(clean) >= 2 else clean)


def icao_check_digit(data: str) -> int:
    """Compute ICAO 9303 standard 7-3-1 weight check digit."""
    weights = [7, 3, 1]
    total = 0
    for idx, ch in enumerate(data):
        if "0" <= ch <= "9":
            val = int(ch)
        elif "A" <= ch <= "Z":
            val = ord(ch) - 55
        else:
            val = 0
        total += val * weights[idx % 3]
    return total % 10


def parse_mrz_date(date_str: Optional[str], is_birth: bool = False) -> Optional[str]:
    """Convert YYMMDD string from MRZ into YYYY-MM-DD ISO date."""
    if not date_str or len(date_str) != 6 or not date_str.isdigit():
        return None
    try:
        yy = int(date_str[0:2])
        mm = int(date_str[2:4])
        dd = int(date_str[4:6])
        if mm < 1 or mm > 12 or dd < 1 or dd > 31:
            return None

        current_year = datetime.date.today().year
        current_yy = current_year % 100

        if is_birth:
            # Person birth date: if YY <= current YY, likely 20YY, else 19YY
            century = 2000 if yy <= current_yy else 1900
        else:
            # Expiry date
            century = 2000

        full_year = century + yy
        return f"{full_year:04d}-{mm:02d}-{dd:02d}"
    except Exception:
        return None


def extract_image_from_bytes(file_bytes: bytes, filename: str = "") -> np.ndarray:
    """Ingest image or PDF bytes and return a BGR numpy array."""
    if not file_bytes:
        raise ValueError("Uploaded file is empty.")

    is_pdf = file_bytes.startswith(b"%PDF") or filename.lower().endswith(".pdf")

    if is_pdf:
        # 1. Try pypdfium2 (fast, high-fidelity vector rendering)
        if pypdfium2 is not None:
            try:
                pdf = pypdfium2.PdfDocument(file_bytes)
                if len(pdf) > 0:
                    page = pdf[0]
                    pil_img = page.render(scale=2.0).to_pil().convert("RGB")
                    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            except Exception:
                pass

        # 2. Try pypdf embedded image extraction fallback
        if PdfReader is not None:
            try:
                reader = PdfReader(io.BytesIO(file_bytes))
                if len(reader.pages) > 0:
                    page = reader.pages[0]
                    for img_obj in page.images:
                        pil_img = Image.open(io.BytesIO(img_obj.data)).convert("RGB")
                        return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            except Exception:
                pass

        raise ValueError("Could not extract passport image from the provided PDF file.")

    # Standard Image parsing (JPEG, PNG, WEBP, etc.)
    try:
        pil_img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    except Exception as exc:
        raise ValueError(f"Unsupported or corrupted image format: {exc}")


def normalize_resolution(img: np.ndarray, target_width: int = 1400) -> np.ndarray:
    """Normalize image to canonical width preserving aspect ratio.

    Uses cv2.INTER_AREA for downscaling and cv2.INTER_CUBIC for upscaling.
    """
    h, w = img.shape[:2]
    if w == target_width:
        return img

    scale = target_width / float(w)
    target_height = int(round(h * scale))

    interpolation = cv2.INTER_AREA if w > target_width else cv2.INTER_CUBIC
    return cv2.resize(img, (target_width, target_height), interpolation=interpolation)


def extract_profile_photo(img_bgr: np.ndarray) -> str:
    """Detect and extract the traveler's portrait photograph.

    - Restricts search to left 55% of the document.
    - Detects face with Haar cascade with 15% head margin padding.
    - Falls back to ICAO Doc 9303 standard proportional portrait crop.
    - Encodes cropped portrait as a base64 JPEG data URL.
    """
    img_h, img_w = img_bgr.shape[:2]

    # Search space: left 55% of document width
    search_w = int(img_w * 0.55)
    left_region = img_bgr[:, :search_w]

    gray = cv2.cvtColor(left_region, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced_gray = clahe.apply(gray)

    face_box = None
    if os.path.exists(CASCADE_PATH):
        try:
            face_cascade = cv2.CascadeClassifier(CASCADE_PATH)
            if not face_cascade.empty():
                min_size = (int(img_w * 0.08), int(img_h * 0.12))
                faces = face_cascade.detectMultiScale(
                    enhanced_gray,
                    scaleFactor=1.1,
                    minNeighbors=5,
                    minSize=min_size,
                )
                if len(faces) > 0:
                    face_box = max(faces, key=lambda b: b[2] * b[3])
        except Exception:
            face_box = None

    if face_box is not None:
        fx, fy, fw, fh = face_box
        pad_x = int(fw * 0.15)
        pad_y = int(fh * 0.22)

        x1 = max(0, fx - pad_x)
        y1 = max(0, fy - pad_y)
        x2 = min(search_w, fx + fw + pad_x)
        y2 = min(img_h, fy + fh + int(pad_y * 1.2))

        crop = left_region[y1:y2, x1:x2]
    else:
        # Standard ICAO Doc 9303 proportional bounding box fallback
        x1 = int(img_w * 0.04)
        x2 = int(img_w * 0.40)
        y1 = int(img_h * 0.20)
        y2 = int(img_h * 0.74)
        crop = img_bgr[y1:y2, x1:x2]

    # Resize to canonical avatar dimensions (400x500 max)
    crop_h, crop_w = crop.shape[:2]
    if crop_w > 0 and crop_h > 0:
        target_avatar_w = 400
        target_avatar_h = int(round(crop_h * (target_avatar_w / float(crop_w))))
        avatar_resized = cv2.resize(crop, (target_avatar_w, target_avatar_h), interpolation=cv2.INTER_AREA)
    else:
        avatar_resized = crop

    # Convert to JPEG Base64 data URL
    success, buffer = cv2.imencode(".jpg", avatar_resized, [int(cv2.IMWRITE_JPEG_QUALITY), 88])
    if not success:
        return ""

    b64_str = base64.b64encode(buffer).decode("ascii")
    return f"data:image/jpeg;base64,{b64_str}"


def _clean_mrz_line(raw: str) -> str:
    """Normalize raw OCR string to uppercase MRZ characters."""
    upper = raw.upper().strip()
    # Replace non-MRZ symbols with filler '<'
    cleaned = re.sub(r"[^A-Z0-9<]", "<", upper)
    # Collapse multiple consecutive invalid chars if needed
    return cleaned


def _extract_mrz_candidates_from_ocr(img_bgr: np.ndarray) -> Optional[Tuple[str, str]]:
    """Locate and return 2 MRZ candidate lines using RapidOCR."""
    if _RAPID_OCR_INSTANCE is None:
        return None

    img_h, _ = img_bgr.shape[:2]

    # Crop bottom 45% where MRZ is located
    mrz_roi = img_bgr[int(img_h * 0.55):, :]
    ocr_results, _ = _RAPID_OCR_INSTANCE(mrz_roi)

    if not ocr_results:
        # Fallback to scanning full image
        ocr_results, _ = _RAPID_OCR_INSTANCE(img_bgr)

    if not ocr_results:
        return None

    # Sort lines by vertical position (y coordinate of top-left corner)
    sorted_items = sorted(ocr_results, key=lambda x: x[0][0][1])

    cleaned_lines = []
    for item in sorted_items:
        text = item[1].strip()
        cleaned = _clean_mrz_line(text)
        if len(cleaned) >= 20:
            cleaned_lines.append(cleaned)

    # Look for pair of lines matching Type 3 (44 chars)
    for i in range(len(cleaned_lines)):
        for j in range(i + 1, len(cleaned_lines)):
            l1 = cleaned_lines[i]
            l2 = cleaned_lines[j]

            # Line 1 in TD3 starts with P (or P<)
            if l1.startswith("P") or "<" in l1:
                # Pad to 44 chars
                l1_44 = l1[:44].ljust(44, "<")
                l2_44 = l2[:44].ljust(44, "<")
                return l1_44, l2_44

    # If at least 2 lines found, return the last two lines
    if len(cleaned_lines) >= 2:
        l1 = cleaned_lines[-2][:44].ljust(44, "<")
        l2 = cleaned_lines[-1][:44].ljust(44, "<")
        return l1, l2

    return None


def _parse_td3_manually(l1: str, l2: str) -> Optional[Dict[str, Any]]:
    """Deterministic fallback parser for ICAO Doc 9303 Type 3 (2x44) MRZ."""
    if len(l1) < 44:
        l1 = l1.ljust(44, "<")
    if len(l2) < 44:
        l2 = l2.ljust(44, "<")

    try:
        # Line 1: P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
        country_3 = l1[2:5].replace("<", "").strip()

        # Names: after country_3 up to end
        name_section = l1[5:]
        name_parts = name_section.split("<<", 1)
        last_name = name_parts[0].replace("<", " ").strip()
        first_name = name_parts[1].replace("<", " ").strip() if len(name_parts) > 1 else ""

        # Line 2: L898902C36UTO7408122F1204159ZE184226B<<<<<10
        doc_raw = l2[0:9]
        doc_check_char = l2[9:10]
        nat_3 = l2[10:13].replace("<", "").strip()
        dob_raw = l2[13:19]
        dob_check_char = l2[19:20]
        sex_raw = l2[20:21]
        exp_raw = l2[21:27]
        exp_check_char = l2[27:28]

        document_number = doc_raw.replace("<", "").strip()

        # Checksum validations
        valid_number = (
            icao_check_digit(doc_raw) == int(doc_check_char)
            if doc_check_char.isdigit()
            else False
        )
        valid_dob = (
            icao_check_digit(dob_raw) == int(dob_check_char)
            if dob_check_char.isdigit()
            else False
        )
        valid_exp = (
            icao_check_digit(exp_raw) == int(exp_check_char)
            if exp_check_char.isdigit()
            else False
        )

        return {
            "first_name": first_name,
            "last_name": last_name,
            "document_number": document_number,
            "nationality_3": nat_3 or country_3,
            "country_3": country_3 or nat_3,
            "birth_date": parse_mrz_date(dob_raw, is_birth=True),
            "expiration_date": parse_mrz_date(exp_raw, is_birth=False),
            "sex": sex_raw if sex_raw in ("M", "F") else "Other",
            "checksums": {
                "valid_number": valid_number,
                "valid_date_of_birth": valid_dob,
                "valid_expiration_date": valid_exp,
                "valid_composite": valid_number and valid_dob and valid_exp,
            },
        }
    except Exception:
        return None


def extract_mrz_data(img_bgr: np.ndarray) -> Dict[str, Any]:
    """Locate and parse ICAO Doc 9303 MRZ data from the passport image."""
    mrz_lines = _extract_mrz_candidates_from_ocr(img_bgr)

    parsed_result = None

    if mrz_lines:
        l1, l2 = mrz_lines
        mrz_raw = f"{l1}\n{l2}"

        # 1. Try TD3CodeChecker
        if TD3CodeChecker is not None:
            try:
                checker = TD3CodeChecker(mrz_raw)
                if checker:
                    fields = checker.fields()
                    parsed_result = {
                        "first_name": fields.name.replace("<", " ").strip(),
                        "last_name": fields.surname.replace("<", " ").strip(),
                        "document_number": fields.document_number.replace("<", "").strip(),
                        "nationality_3": fields.nationality,
                        "country_3": fields.country,
                        "birth_date": parse_mrz_date(fields.birth_date, is_birth=True),
                        "expiration_date": parse_mrz_date(fields.expiry_date, is_birth=False),
                        "sex": fields.sex,
                        "checksums": {
                            "valid_number": getattr(checker, "valid_number", True),
                            "valid_date_of_birth": getattr(checker, "valid_date_of_birth", True),
                            "valid_expiration_date": getattr(checker, "valid_expiry_date", True),
                            "valid_composite": getattr(checker, "valid_composite", True),
                        },
                    }
            except Exception:
                parsed_result = None

        # 2. Try manual ICAO Type 3 extraction fallback
        if not parsed_result:
            parsed_result = _parse_td3_manually(l1, l2)

    # 3. Try PassportEye if Tesseract is confirmed in PATH
    if not parsed_result and HAS_TESSERACT:
        try:
            import passporteye
            rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(rgb)
            mrz = passporteye.read_mrz(pil_img)
            if mrz:
                data = mrz.to_dict()
                parsed_result = {
                    "first_name": (data.get("names") or "").replace("<", " ").strip(),
                    "last_name": (data.get("surname") or "").replace("<", " ").strip(),
                    "document_number": (data.get("number") or "").replace("<", "").strip(),
                    "nationality_3": data.get("nationality"),
                    "country_3": data.get("country"),
                    "birth_date": parse_mrz_date(data.get("date_of_birth"), is_birth=True),
                    "expiration_date": parse_mrz_date(data.get("expiration_date"), is_birth=False),
                    "sex": data.get("sex"),
                    "checksums": {
                        "valid_number": data.get("valid_number", True),
                        "valid_date_of_birth": data.get("valid_date_of_birth", True),
                        "valid_expiration_date": data.get("valid_expiration_date", True),
                        "valid_composite": data.get("valid_composite", True),
                    },
                }
        except Exception:
            pass

    if not parsed_result:
        raise ValueError(
            "MRZ could not be parsed. Please upload a clear, uncropped photo of the passport page."
        )

    # Translate sex to full gender option
    sex_code = (parsed_result.get("sex") or "").upper()
    if sex_code in ("M", "MALE"):
        gender = "Male"
    elif sex_code in ("F", "FEMALE"):
        gender = "Female"
    else:
        gender = "Other"

    nat3 = parsed_result.get("nationality_3") or ""
    cnt3 = parsed_result.get("country_3") or ""

    return {
        "firstName": parsed_result.get("first_name") or "",
        "lastName": parsed_result.get("last_name") or "",
        "documentNumber": parsed_result.get("document_number") or "",
        "nationality": to_alpha2(nat3),
        "nationality3": nat3,
        "issuingCountry": to_alpha2(cnt3),
        "issuingCountry3": cnt3,
        "birthDate": parsed_result.get("birth_date") or "",
        "expirationDate": parsed_result.get("expiration_date") or "",
        "gender": gender,
        "checksums": parsed_result.get("checksums", {}),
    }


def process_passport_file(file_bytes: bytes, filename: str = "") -> Dict[str, Any]:
    """Execute the end-to-end deterministic passport processing pipeline.

    1. Ingestion: PDF or image formats (JPEG, PNG, WEBP).
    2. Resolution Normalization: resize to canonical 1400px width.
    3. Profile Photo Extraction: search left 55%, Haar face detect with 15% margin or ICAO fallback.
    4. MRZ Extraction: ICAO Doc 9303 parsing and checksum validation.
    """
    # 1. Ingest
    img_bgr = extract_image_from_bytes(file_bytes, filename=filename)

    # 2. Normalize resolution to canonical 1400px width
    normalized = normalize_resolution(img_bgr, target_width=1400)

    # 3. Extract profile photo
    avatar_url = extract_profile_photo(normalized)

    # 4. Extract MRZ data
    mrz_data = extract_mrz_data(normalized)

    # Combine into clean response payload
    mrz_data["avatarUrl"] = avatar_url
    return mrz_data
