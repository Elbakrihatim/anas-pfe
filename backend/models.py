"""Traveler and Flight data models."""

from datetime import date, datetime, timezone

from database import db


# ── Many-to-many join table ──────────────────────────────────────────────
flight_assignments = db.Table(
    "flight_assignments",
    db.Column("flight_id", db.Integer, db.ForeignKey("flights.id", ondelete="CASCADE"), primary_key=True),
    db.Column("traveler_id", db.Integer, db.ForeignKey("travelers.id", ondelete="CASCADE"), primary_key=True),
)


class Flight(db.Model):
    """A scheduled flight that travelers can be assigned to."""

    __tablename__ = "flights"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    flight_number = db.Column(db.String(20), nullable=False, unique=True)
    airline = db.Column(db.String(100), nullable=True)
    origin = db.Column(db.String(100), nullable=False)
    destination = db.Column(db.String(100), nullable=False)
    departure_date = db.Column(db.Date, nullable=False)
    departure_time = db.Column(db.String(10), nullable=True)   # "HH:MM"
    arrival_date = db.Column(db.Date, nullable=True)
    arrival_time = db.Column(db.String(10), nullable=True)
    capacity = db.Column(db.Integer, nullable=False, default=150)
    status = db.Column(db.String(30), nullable=False, default="Scheduled")  # Scheduled | Boarding | Departed | Cancelled

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationship: list of Traveler objects assigned to this flight
    travelers = db.relationship(
        "Traveler",
        secondary=flight_assignments,
        backref=db.backref("flights", lazy="dynamic"),
        lazy="subquery",
    )

    def to_dict(self, include_travelers: bool = True) -> dict:
        """Serialise the model to a plain dictionary for JSON responses."""

        def _fmt_date(d: date | None) -> str | None:
            return d.isoformat() if d else None

        data = {
            "id": self.id,
            "flight_number": self.flight_number,
            "airline": self.airline,
            "origin": self.origin,
            "destination": self.destination,
            "departure_date": _fmt_date(self.departure_date),
            "departure_time": self.departure_time,
            "arrival_date": _fmt_date(self.arrival_date),
            "arrival_time": self.arrival_time,
            "capacity": self.capacity,
            "status": self.status,
            "passenger_count": len(self.travelers),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_travelers:
            data["travelers"] = [t.to_dict() for t in self.travelers]
        return data


class Traveler(db.Model):
    """A registered traveler with passport, contact, and visa information."""

    __tablename__ = "travelers"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # Passport & Document Info (beginning of registration)
    passport_number = db.Column(db.String(50), nullable=False, unique=True)
    passport_country = db.Column(db.String(10), nullable=True)
    passport_issue_date = db.Column(db.Date, nullable=True)
    passport_expiry = db.Column(db.Date, nullable=True)
    passport_photo = db.Column(db.Text, nullable=True)  # Base64 data URL or image URI

    # Personal Information
    full_name = db.Column(db.String(200), nullable=False)
    date_of_birth = db.Column(db.Date, nullable=True)
    gender = db.Column(db.String(20), nullable=True)
    nationality = db.Column(db.String(10), nullable=True)
    # Contact Details
    email = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(50), nullable=True)
    address = db.Column(db.String(255), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    postal_code = db.Column(db.String(30), nullable=True)
    country = db.Column(db.String(10), nullable=True)  # ISO 3166-1 alpha-2 residence country
    emergency_contact_name = db.Column(db.String(150), nullable=True)
    emergency_contact_phone = db.Column(db.String(50), nullable=True)
    emergency_contact_relation = db.Column(db.String(50), nullable=True)

    # Visa Information
    visa_type = db.Column(db.String(50), nullable=True)
    visa_number = db.Column(db.String(50), nullable=True)
    visa_expiry = db.Column(db.Date, nullable=True)

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        """Serialise the model to a plain dictionary for JSON responses."""

        def _fmt_date(d: date | None) -> str | None:
            return d.isoformat() if d else None

        def _fmt_datetime(dt: datetime | None) -> str | None:
            return dt.isoformat() if dt else None

        return {
            "id": self.id,
            "full_name": self.full_name,
            "nationality": self.nationality,
            "date_of_birth": _fmt_date(self.date_of_birth),
            "gender": self.gender,
            "passport_number": self.passport_number,
            "passport_country": self.passport_country,
            "passport_issue_date": _fmt_date(self.passport_issue_date),
            "passport_expiry": _fmt_date(self.passport_expiry),
            "passport_photo": self.passport_photo,
            "email": self.email,
            "phone": self.phone,
            "address": self.address,
            "city": self.city,
            "postal_code": self.postal_code,
            "country": self.country,
            "emergency_contact_name": self.emergency_contact_name,
            "emergency_contact_phone": self.emergency_contact_phone,
            "emergency_contact_relation": self.emergency_contact_relation,
            "visa_type": self.visa_type,
            "visa_number": self.visa_number,
            "visa_expiry": _fmt_date(self.visa_expiry),
            "created_at": _fmt_datetime(self.created_at),
        }
