"""AI-Powered Passport Extraction and Profile Photo Cropping Service.

Uses Google Gen AI SDK for multimodal document extraction (images & PDFs)
and visual grounding, with Pillow for avatar cropping.
"""

import base64
import datetime
import io
import os
import re
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image
from pydantic import BaseModel, Field

# Ensure environment variables from .env are loaded
load_dotenv()
backend_env = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(backend_env):
    load_dotenv(backend_env)

root_env = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
if os.path.exists(root_env):
    load_dotenv(root_env)

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
    "VNM": "VN", "YEM": "YE", "ZMB": "ZM", "ZWE": "ZW",
}


def to_alpha2(code_or_name: Optional[str]) -> str:
    """Translate 3-letter ICAO code or country name to standard 2-letter ISO code."""
    if not code_or_name:
        return ""
    clean = code_or_name.strip().upper()
    if clean in ALPHA3_TO_ALPHA2:
        return ALPHA3_TO_ALPHA2[clean]
    if len(clean) == 2 and clean.isalpha():
        return clean
    return clean[:2] if len(clean) == 2 else ""


def normalize_date_str(val: Optional[str]) -> str:
    """Normalize date strings into standard YYYY-MM-DD format."""
    if not val:
        return ""
    s = str(val).strip()

    # If already YYYY-MM-DD
    if re.match(r"^\d{4}-\d{2}-\d{2}$", s):
        return s

    # Handle YYYY/MM/DD or YYYY.MM.DD
    m = re.match(r"^(\d{4})[./](\d{1,2})[./](\d{1,2})$", s)
    if m:
        return f"{int(m.group(1)):04d}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"

    # Handle DD/MM/YYYY or DD-MM-YYYY
    m = re.match(r"^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$", s)
    if m:
        return f"{int(m.group(3)):04d}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"

    # Fallback to datetime parsing
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d", "%d-%m-%Y", "%d %b %Y", "%d %B %Y"):
        try:
            return datetime.datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass

    return s


def normalize_gender(val: Optional[str]) -> str:
    """Normalize gender to standard M, F, or X."""
    if not val:
        return ""
    clean = str(val).strip().upper()
    if clean.startswith("F") or clean == "FEMALE":
        return "F"
    if clean.startswith("M") or clean == "MALE":
        return "M"
    if clean in ("X", "OTHER", "NON-BINARY"):
        return "X"
    return clean[:1] if clean else ""


# ---------------------------------------------------------------------------
# Pydantic Structured Output Schema
# ---------------------------------------------------------------------------
class PassportExtraction(BaseModel):
    """Structured extraction schema for personal details and portrait coordinates."""

    first_name: Optional[str] = Field(
        default="",
        description="Given names / first names of the passport holder",
    )
    last_name: Optional[str] = Field(
        default="",
        description="Surname / family name of the passport holder",
    )
    document_number: Optional[str] = Field(
        default="",
        description="Passport or travel document identification number",
    )
    nationality: Optional[str] = Field(
        default="",
        description="3-letter ICAO code or standard country name",
    )
    birth_date: Optional[str] = Field(
        default="",
        description="Date of birth in format YYYY-MM-DD",
    )
    issue_date: Optional[str] = Field(
        default="",
        description="Passport date of issue / issue date in format YYYY-MM-DD",
    )
    expiration_date: Optional[str] = Field(
        default="",
        description="Passport expiration date in format YYYY-MM-DD",
    )
    gender: Optional[str] = Field(
        default="",
        description="Gender of the document holder ('M', 'F', or 'X')",
    )
    face_box_2d: Optional[List[int]] = Field(
        default=None,
        description="[ymin, xmin, ymax, xmax] normalized to [0, 1000] representing the primary biographical portrait photo",
    )


# ---------------------------------------------------------------------------
# Image Ingestion (Pure Pillow)
# ---------------------------------------------------------------------------
def load_image_from_bytes(file_bytes: bytes, filename: str = "") -> Image.Image:
    """Load an image from raw file bytes using Pillow."""
    if not file_bytes:
        raise ValueError("Uploaded file is empty.")

    try:
        img = Image.open(io.BytesIO(file_bytes))
        return img.convert("RGB")
    except Exception as exc:
        raise ValueError(f"Invalid or unsupported image file. Please upload a JPG, PNG, or WebP image: {exc}")


# ---------------------------------------------------------------------------
# Face Cropping with Safety Margin (Pure Pillow)
# ---------------------------------------------------------------------------
def crop_face_avatar(img: Image.Image, face_box_2d: Optional[List[int]]) -> str:
    """Crop the face portrait using [ymin, xmin, ymax, xmax] (0-1000 scale) with a 10% safety margin.

    Returns a Base64 data URL ('data:image/jpeg;base64,...').
    """
    img_width, img_height = img.size

    # Validate or fallback bounding box
    if not face_box_2d or len(face_box_2d) != 4:
        # Fallback to typical passport portrait region (left ~35%, middle vertical height)
        crop_box = (
            int(img_width * 0.05),
            int(img_height * 0.20),
            int(img_width * 0.45),
            int(img_height * 0.75),
        )
    else:
        ymin, xmin, ymax, xmax = face_box_2d

        # Clamp coordinates to [0, 1000]
        ymin = max(0, min(1000, int(ymin)))
        xmin = max(0, min(1000, int(xmin)))
        ymax = max(0, min(1000, int(ymax)))
        xmax = max(0, min(1000, int(xmax)))

        if ymin >= ymax or xmin >= xmax:
            ymin, ymax = min(ymin, ymax), max(ymin, ymax)
            xmin, xmax = min(xmin, xmax), max(xmin, xmax)
            if ymin == ymax:
                ymax = min(1000, ymin + 200)
            if xmin == xmax:
                xmax = min(1000, xmin + 200)

        left = int((xmin / 1000.0) * img_width)
        top = int((ymin / 1000.0) * img_height)
        right = int((xmax / 1000.0) * img_width)
        bottom = int((ymax / 1000.0) * img_height)

        box_w = max(1, right - left)
        box_h = max(1, bottom - top)

        # 10% safety margin around the face bounding box
        margin_x = int(box_w * 0.10)
        margin_y = int(box_h * 0.10)

        crop_left = max(0, left - margin_x)
        crop_top = max(0, top - margin_y)
        crop_right = min(img_width, right + margin_x)
        crop_bottom = min(img_height, bottom + margin_y)
        crop_box = (crop_left, crop_top, crop_right, crop_bottom)

    avatar_img = img.crop(crop_box)

    if avatar_img.mode != "RGB":
        avatar_img = avatar_img.convert("RGB")

    # Limit avatar dimension to max 600px for lightweight frontend payload & DB storage
    if avatar_img.width > 600 or avatar_img.height > 600:
        avatar_img.thumbnail((600, 600), Image.Resampling.LANCZOS)

    buf = io.BytesIO()
    avatar_img.save(buf, format="JPEG", quality=90)
    b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{b64_str}"


# ---------------------------------------------------------------------------
# Gemini Gen AI Extraction Client
# ---------------------------------------------------------------------------
def extract_passport_with_gemini(media_content: Any) -> PassportExtraction:
    """Call Google Gen AI Gemini model with structured output.

    Supports PIL.Image for images or types.Part for native PDF extraction.
    """
    # Ensure fresh read from .env if updated while server is running
    load_dotenv(override=True)
    backend_env = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(backend_env):
        load_dotenv(backend_env, override=True)
    root_env = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if os.path.exists(root_env):
        load_dotenv(root_env, override=True)

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY is not set. Please add GEMINI_API_KEY to your .env file or environment."
        )

    # Initialize the modern official Google Gen AI Client
    client = genai.Client(api_key=api_key)

    prompt = (
        "Extract the personal identification details from this passport document, including "
        "given names, surname, document number, nationality, date of birth, date of issue (issue date), "
        "and expiration date. "
        "Locate the primary portrait photograph on the biographical page and return its bounding box coordinates in "
        "[ymin, xmin, ymax, xmax] normalized from 0 to 1000. Ignore small holographic watermarks or secondary ghost photos."
    )

    # Resilient model priority: gemini-3.5-flash-lite -> gemini-3.5-flash -> gemini-3.8-flash -> gemini-2.5-flash
    candidate_models = ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.8-flash", "gemini-2.5-flash"]
    response = None
    last_exc = None

    for model_name in candidate_models:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=[media_content, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=PassportExtraction,
                    temperature=0.1,
                ),
            )
            if response:
                break
        except Exception as exc:
            last_exc = exc
            continue

    if not response:
        raise RuntimeError(f"Gemini API request failed across models: {last_exc}")

    if response.parsed and isinstance(response.parsed, PassportExtraction):
        return response.parsed
    elif response.text:
        return PassportExtraction.model_validate_json(response.text)
    else:
        raise ValueError("Gemini returned an empty response.")


# ---------------------------------------------------------------------------
# Main Pipeline Entrypoint
# ---------------------------------------------------------------------------
def process_passport_file(file_bytes: bytes, filename: str = "") -> Dict[str, Any]:
    """Ingest passport file (image or PDF), extract details using Gemini,

    crop avatar portrait using Pillow, and return clean structured data.
    """
    is_pdf = file_bytes.startswith(b"%PDF") or filename.lower().endswith(".pdf")

    if is_pdf:
        # Direct native Gemini PDF processing without pypdfium2 or pypdf
        pdf_part = types.Part.from_bytes(data=file_bytes, mime_type="application/pdf")
        extraction = extract_passport_with_gemini(pdf_part)
        avatar_url = ""
    else:
        # Standard image processing with Pillow
        pil_img = load_image_from_bytes(file_bytes)
        extraction = extract_passport_with_gemini(pil_img)
        avatar_url = crop_face_avatar(pil_img, extraction.face_box_2d)

    # Clean and normalize fields
    birth_date = normalize_date_str(extraction.birth_date)
    issue_date = normalize_date_str(extraction.issue_date)
    exp_date = normalize_date_str(extraction.expiration_date)
    gender = normalize_gender(extraction.gender)
    iso_code = to_alpha2(extraction.nationality)

    return {
        "firstName": (extraction.first_name or "").strip(),
        "lastName": (extraction.last_name or "").strip(),
        "documentNumber": (extraction.document_number or "").strip(),
        "nationality": iso_code or (extraction.nationality or "").strip(),
        "issuingCountry": iso_code or (extraction.nationality or "").strip(),
        "birthDate": birth_date,
        "issueDate": issue_date,
        "dateOfIssue": issue_date,
        "expirationDate": exp_date,
        "gender": gender,
        "avatarUrl": avatar_url,
    }
