    """Unit and integration tests for AI-powered passport extraction service.
"""

import io
import unittest
from unittest.mock import MagicMock, patch
from PIL import Image

from passport_extractor import (
    PassportExtraction,
    crop_face_avatar,
    load_image_from_bytes,
    normalize_date_str,
    normalize_gender,
    process_passport_file,
    to_alpha2,
)
from app import app


class TestPassportExtraction(unittest.TestCase):

    def setUp(self):
        self.client = app.test_client()

    def test_pydantic_schema(self):
        data = {
            "first_name": "JOHN",
            "last_name": "DOE",
            "document_number": "P12345678",
            "nationality": "USA",
            "birth_date": "1990-05-15",
            "expiration_date": "2030-05-14",
            "gender": "M",
            "face_box_2d": [100, 200, 400, 500],
        }
        obj = PassportExtraction.model_validate(data)
        self.assertEqual(obj.first_name, "JOHN")
        self.assertEqual(obj.last_name, "DOE")
        self.assertEqual(obj.document_number, "P12345678")
        self.assertEqual(obj.gender, "M")
        self.assertEqual(obj.face_box_2d, [100, 200, 400, 500])

    def test_to_alpha2(self):
        self.assertEqual(to_alpha2("USA"), "US")
        self.assertEqual(to_alpha2("ESP"), "ES")
        self.assertEqual(to_alpha2("GBR"), "GB")
        self.assertEqual(to_alpha2("FR"), "FR")
        self.assertEqual(to_alpha2(""), "")

    def test_normalize_date_str(self):
        self.assertEqual(normalize_date_str("1995-12-31"), "1995-12-31")
        self.assertEqual(normalize_date_str("1995/12/31"), "1995-12-31")
        self.assertEqual(normalize_date_str("31/12/1995"), "1995-12-31")

    def test_normalize_gender(self):
        self.assertEqual(normalize_gender("M"), "M")
        self.assertEqual(normalize_gender("Male"), "M")
        self.assertEqual(normalize_gender("FEMALE"), "F")
        self.assertEqual(normalize_gender("Non-binary"), "X")

    def test_crop_face_avatar(self):
        img = Image.new("RGB", (1000, 800), color=(200, 200, 200))
        # Bounding box [ymin, xmin, ymax, xmax] in 0-1000 normalized coordinates
        face_box = [150, 100, 450, 400]
        data_url = crop_face_avatar(img, face_box)
        self.assertTrue(data_url.startswith("data:image/jpeg;base64,"))

    def test_crop_face_avatar_fallback(self):
        img = Image.new("RGB", (1000, 800), color=(150, 150, 150))
        data_url = crop_face_avatar(img, None)
        self.assertTrue(data_url.startswith("data:image/jpeg;base64,"))

    def test_load_image_from_bytes(self):
        img = Image.new("RGB", (100, 100), color="blue")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        loaded = load_image_from_bytes(buf.getvalue(), "test.png")
        self.assertEqual(loaded.size, (100, 100))

    @patch("passport_extractor.extract_passport_with_gemini")
    def test_process_passport_file(self, mock_gemini):
        mock_gemini.return_value = PassportExtraction(
            first_name="Alice",
            last_name="Smith",
            document_number="EA1234567",
            nationality="GBR",
            birth_date="1988-03-22",
            issue_date="2018-03-22",
            expiration_date="2028-03-21",
            gender="F",
            face_box_2d=[100, 100, 500, 400],
        )

        img = Image.new("RGB", (800, 600), color="white")
        buf = io.BytesIO()
        img.save(buf, format="JPEG")

        res = process_passport_file(buf.getvalue(), "passport.jpg")
        self.assertEqual(res["firstName"], "Alice")
        self.assertEqual(res["lastName"], "Smith")
        self.assertEqual(res["documentNumber"], "EA1234567")
        self.assertEqual(res["nationality"], "GB")
        self.assertEqual(res["birthDate"], "1988-03-22")
        self.assertEqual(res["issueDate"], "2018-03-22")
        self.assertEqual(res["dateOfIssue"], "2018-03-22")
        self.assertEqual(res["expirationDate"], "2028-03-21")
        self.assertEqual(res["gender"], "F")
        self.assertTrue(res["avatarUrl"].startswith("data:image/jpeg;base64,"))

    def test_endpoint_unsupported_extension(self):
        data = {
            "file": (io.BytesIO(b"fake content"), "document.exe")
        }
        res = self.client.post("/api/passport/extract", data=data, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 400)
        json_data = res.get_json()
        self.assertFalse(json_data["success"])
        self.assertIn("Unsupported file type", json_data["error"])

    def test_endpoint_empty_file(self):
        res = self.client.post("/api/passport/extract")
        self.assertEqual(res.status_code, 400)
        json_data = res.get_json()
        self.assertFalse(json_data["success"])

    @patch("passport_extractor.extract_passport_with_gemini")
    def test_endpoint_success(self, mock_gemini):
        mock_gemini.return_value = PassportExtraction(
            first_name="Carlos",
            last_name="Santana",
            document_number="ES9876543",
            nationality="ESP",
            birth_date="1980-07-20",
            issue_date="2020-07-20",
            expiration_date="2030-07-19",
            gender="M",
            face_box_2d=[150, 100, 450, 350],
        )

        img = Image.new("RGB", (600, 400), color="white")
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        buf.seek(0)

        data = {
            "file": (buf, "passport.jpg")
        }
        res = self.client.post("/api/passport/extract", data=data, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 200)
        json_data = res.get_json()
        self.assertTrue(json_data["success"])
        d = json_data["data"]
        self.assertEqual(d["firstName"], "Carlos")
        self.assertEqual(d["lastName"], "Santana")
        self.assertEqual(d["documentNumber"], "ES9876543")
        self.assertEqual(d["nationality"], "ES")
        self.assertEqual(d["birthDate"], "1980-07-20")
        self.assertEqual(d["issueDate"], "2020-07-20")
        self.assertEqual(d["dateOfIssue"], "2020-07-20")
        self.assertEqual(d["expirationDate"], "2030-07-19")
        self.assertEqual(d["gender"], "M")
        self.assertTrue(d["avatarUrl"].startswith("data:image/jpeg;base64,"))


if __name__ == "__main__":
    unittest.main()
