import { useState, useEffect, useRef } from "react";
import {
  Camera,
  Upload,
  Trash2,
  Check,
  X,
  FileBadge,
  User,
  Mail,
  CreditCard,
  ShieldAlert,
  Info,
  CheckCircle2,
  Sparkles,
  ScanLine,
  FileText,
  AlertCircle,
  Loader2,
} from "lucide-react";
import CountrySelect from "./CountrySelect";
import CountryFlag from "./CountryFlag";
import { getCountryName } from "./data/countries";
import { extractPassportData } from "./api";

const EMPTY = {
  // Passport (at the beginning)
  passport_photo: "",
  passport_number: "",
  passport_country: "",
  passport_issue_date: "",
  passport_expiry: "",

  // Personal Info
  full_name: "",
  date_of_birth: "",
  gender: "",
  nationality: "",

  // Contact Details
  email: "",
  phone: "",
  address: "",
  city: "",
  postal_code: "",
  country: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  emergency_contact_relation: "",

  // Visa
  visa_type: "",
  visa_number: "",
  visa_expiry: "",
};

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Non-binary", label: "Non-binary" },
  { value: "Other", label: "Other" },
  { value: "Prefer not to say", label: "Prefer not to say" },
];

const RELATION_OPTIONS = [
  "Spouse / Partner",
  "Parent",
  "Child",
  "Sibling",
  "Friend",
  "Colleague",
  "Legal Guardian",
  "Other",
];

/**
 * Resizes an image file down to max 600x600 px and returns a JPEG base64 data URL.
 * Keeps payloads lightweight (< 80KB) for fast client & database operations.
 */
function processImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please upload a valid image file (JPG, PNG, WebP)."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image."));
      img.onload = () => {
        const maxDim = 600;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function TravelerForm({ traveler, onSave, onCancel }) {
  const [form, setForm] = useState(EMPTY);
  const [dragActive, setDragActive] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef(null);

  // Automated Passport Scanner states
  const [scannerDragActive, setScannerDragActive] = useState(false);
  const [scanningPassport, setScanningPassport] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanSuccess, setScanSuccess] = useState("");
  const passportScannerInputRef = useRef(null);

  useEffect(() => {
    if (traveler) {
      setForm({
        passport_photo: traveler.passport_photo ?? "",
        passport_number: traveler.passport_number ?? "",
        passport_country: traveler.passport_country ?? "",
        passport_issue_date: traveler.passport_issue_date ?? "",
        passport_expiry: traveler.passport_expiry ?? "",

        full_name: traveler.full_name ?? "",
        date_of_birth: traveler.date_of_birth ?? "",
        gender: traveler.gender ?? "",
        nationality: traveler.nationality ?? "",

        email: traveler.email ?? "",
        phone: traveler.phone ?? "",
        address: traveler.address ?? "",
        city: traveler.city ?? "",
        postal_code: traveler.postal_code ?? "",
        country: traveler.country ?? "",
        emergency_contact_name: traveler.emergency_contact_name ?? "",
        emergency_contact_phone: traveler.emergency_contact_phone ?? "",
        emergency_contact_relation: traveler.emergency_contact_relation ?? "",

        visa_type: traveler.visa_type ?? "",
        visa_number: traveler.visa_number ?? "",
        visa_expiry: traveler.visa_expiry ?? "",
      });
    } else {
      setForm(EMPTY);
    }
    setPhotoError("");
    setScanError("");
    setScanSuccess("");
  }, [traveler]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  /* ─── Manual Avatar Handlers ───────────────────────────────────── */
  async function handleFileSelected(file) {
    if (!file) return;
    try {
      setPhotoError("");
      const dataUrl = await processImageFile(file);
      setForm((prev) => ({ ...prev, passport_photo: dataUrl }));
    } catch (err) {
      setPhotoError(err.message || "Failed to process photo.");
    }
  }

  function handleFileInputChange(e) {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelected(file);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setDragActive(false);
  }

  function handleRemovePhoto() {
    setForm((prev) => ({ ...prev, passport_photo: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
    setPhotoError("");
  }

  /* ─── Automated Passport Autofill Handlers ─────────────────────── */
  async function handlePassportDocumentUpload(file) {
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isImage && !isPdf) {
      setScanError("Please upload a passport image (JPG, PNG, WebP) or PDF document.");
      return;
    }

    setScanningPassport(true);
    setScanError("");
    setScanSuccess("");
    setScannedFilename(file.name);

    try {
      const result = await extractPassportData(file);
      if (result.success && result.data) {
        const d = result.data;
        const composedName = [d.firstName, d.lastName].filter(Boolean).join(" ").trim();

        setForm((prev) => ({
          ...prev,
          full_name: composedName || prev.full_name,
          passport_number: d.documentNumber || prev.passport_number,
          passport_country: d.issuingCountry || d.nationality || prev.passport_country,
          nationality: d.nationality || prev.nationality,
          date_of_birth: d.birthDate || prev.date_of_birth,
          passport_expiry: d.expirationDate || prev.passport_expiry,
          gender: d.gender || prev.gender,
          passport_photo: d.avatarUrl || prev.passport_photo,
        }));

        setScanSuccess(
          `Passport successfully extracted for ${composedName || d.documentNumber}! Identity details and official photo autofilled.`
        );
      } else {
        throw new Error(result.error || "MRZ could not be parsed.");
      }
    } catch (err) {
      setScanError(
        err.message || "MRZ could not be parsed. Please upload a clear, uncropped photo of the passport page."
      );
    } finally {
      setScanningPassport(false);
      if (passportScannerInputRef.current) {
        passportScannerInputRef.current.value = "";
      }
    }
  }

  function handleScannerInputChange(e) {
    const file = e.target.files?.[0];
    if (file) handlePassportDocumentUpload(file);
  }

  function handleScannerDrop(e) {
    e.preventDefault();
    setScannerDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handlePassportDocumentUpload(file);
  }

  function handleScannerDragOver(e) {
    e.preventDefault();
    setScannerDragActive(true);
  }

  function handleScannerDragLeave(e) {
    e.preventDefault();
    setScannerDragActive(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave(form);
  }

  const isEdit = traveler && traveler.id;

  return (
    <>
      <div className="page-header">
        <div className="page-header-title-wrap">
          <h2>{isEdit ? "Edit Traveler Profile" : "Register New Traveler"}</h2>
          {isEdit && <span className="badge badge-accent">Record #{traveler.id}</span>}
        </div>
        <p>
          {isEdit
            ? `Updating registry file for ${traveler.full_name}`
            : "Complete document verification, personal profile, contact channels, and visa status."}
        </p>
      </div>

      {/* ─── Fast-Track Automated Passport Scanner Card ────────────── */}
      <div className="passport-autofill-card">
        <div className="autofill-header">
          <div className="autofill-title-wrap">
            <span className="autofill-icon-badge" aria-hidden="true">
              <ScanLine size={20} />
            </span>
            <div>
              <h3 className="autofill-title">Instant Passport Autofill</h3>
              <p className="autofill-subtitle">
                Upload your passport page to automatically extract biographical details and portrait photo.
              </p>
            </div>
          </div>
          <span className="autofill-engine-badge">
            <Sparkles size={13} className="inline-icon" /> Local ICAO Doc 9303 MRZ Engine
          </span>
        </div>

        {/* Dropzone */}
        <div
          className={`scanner-dropzone ${scannerDragActive ? "drag-active" : ""} ${
            scanningPassport ? "scanning" : ""
          }`}
          onDragOver={handleScannerDragOver}
          onDragLeave={handleScannerDragLeave}
          onDrop={handleScannerDrop}
          onClick={() => !scanningPassport && passportScannerInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !scanningPassport) {
              e.preventDefault();
              passportScannerInputRef.current?.click();
            }
          }}
          aria-label="Upload passport page for automated autofill"
        >
          <input
            ref={passportScannerInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp, application/pdf"
            onChange={handleScannerInputChange}
            style={{ display: "none" }}
          />

          {scanningPassport ? (
            <div className="scanner-status-box">
              <div className="scanner-laser-line" aria-hidden="true" />
              <Loader2 size={32} className="spin-icon scanner-spinner" aria-hidden="true" />
              <div className="scanner-status-text">
                <strong>Scanning Passport Document…</strong>
                <span>Extracting ICAO Machine Readable Zone (MRZ) & cropping portrait portrait</span>
              </div>
            </div>
          ) : (
            <div className="scanner-placeholder-content">
              <div className="scanner-icons-row">
                <FileText size={28} className="scanner-doc-icon" aria-hidden="true" />
                <Camera size={24} className="scanner-photo-icon" aria-hidden="true" />
              </div>
              <div className="scanner-text-group">
                <span className="scanner-prompt">
                  <strong>Click to upload</strong> or drag & drop passport document
                </span>
                <span className="scanner-formats">
                  Supports PDF document, JPG, PNG, or WebP scans · Local in-process deterministic OCR
                </span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-primary scanner-browse-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  passportScannerInputRef.current?.click();
                }}
              >
                <Upload size={14} aria-hidden="true" />
                <span>Upload Passport File</span>
              </button>
            </div>
          )}
        </div>

        {/* Scan Feedback Banners */}
        {scanSuccess && (
          <div className="scan-alert-success" role="status">
            <CheckCircle2 size={18} className="inline-icon" aria-hidden="true" />
            <div className="scan-alert-text">
              <strong>Autofill Successful!</strong> {scanSuccess}
            </div>
            <button
              type="button"
              className="scan-alert-dismiss"
              onClick={() => setScanSuccess("")}
              aria-label="Dismiss message"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {scanError && (
          <div className="scan-alert-error" role="alert">
            <AlertCircle size={18} className="inline-icon" aria-hidden="true" />
            <div className="scan-alert-text">
              <strong>Scan Error:</strong> {scanError}
            </div>
            <button
              type="button"
              className="scan-alert-dismiss"
              onClick={() => setScanError("")}
              aria-label="Dismiss error"
            >
              <X size={15} />
            </button>
          </div>
        )}
      </div>

      <form className="form-card" onSubmit={handleSubmit} noValidate={false}>
        {/* SECTION 1: PASSPORT & DOCUMENT */}
        <div className="form-section">
          <div className="form-section-header">
            <span className="section-badge">Step 1</span>
            <div className="form-section-title">
              <FileBadge size={16} className="inline-icon" />
              Passport Details & Photo
            </div>
          </div>
          <p className="form-section-desc">
            Primary passport credentials, issuing country, and official traveler identification photo.
          </p>

          {/* Passport Photo Upload & Preview */}
          <div className="passport-photo-section">
            <label className="form-label" htmlFor="passport_photo_input">
              Passport Photo <span className="label-hint">(Official biometric or front-facing portrait)</span>
            </label>

            <div className="passport-photo-layout">
              {/* Photo Box */}
              <div
                className={`passport-photo-dropzone ${dragActive ? "drag-active" : ""} ${
                  form.passport_photo ? "has-photo" : ""
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                aria-label="Upload passport photo"
              >
                {form.passport_photo ? (
                  <div className="passport-photo-preview-wrap">
                    <img
                      src={form.passport_photo}
                      alt="Passport identification preview"
                      className="passport-photo-preview"
                    />
                    <div className="photo-overlay-badge">
                      <CheckCircle2 size={12} className="inline-icon" /> Photo Attached
                    </div>
                  </div>
                ) : (
                  <div className="passport-photo-placeholder">
                    <span className="placeholder-icon" aria-hidden="true">
                      <Camera size={28} strokeWidth={1.75} />
                    </span>
                    <span className="placeholder-text">Click or drag & drop photo</span>
                    <span className="placeholder-sub">JPG, PNG or WebP (auto-optimized)</span>
                  </div>
                )}
              </div>

              {/* Action Buttons & Help */}
              <div className="passport-photo-meta">
                <input
                  ref={fileInputRef}
                  id="passport_photo_input"
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileInputChange}
                  style={{ display: "none" }}
                />
                <div className="photo-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={14} aria-hidden="true" />
                    <span>{form.passport_photo ? "Change Photo" : "Browse Photo"}</span>
                  </button>
                  {form.passport_photo && (
                    <button
                      type="button"
                      className="btn btn-delete btn-sm"
                      onClick={handleRemovePhoto}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
                {photoError && <div className="form-error-inline">{photoError}</div>}
                <div className="passport-spec-tips">
                  <span>
                    <Info size={13} className="inline-icon" /> Travel document specifications:
                  </span>
                  <ul>
                    <li>Neutral facial expression, facing camera directly</li>
                    <li>Clear lighting without glare, plain contrasting background</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Passport Fields Grid */}
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="passport_number">
                Passport Number <span className="required">*</span>
              </label>
              <input
                id="passport_number"
                className="form-input font-mono"
                name="passport_number"
                value={form.passport_number}
                onChange={handleChange}
                placeholder="e.g. ES9823412 or AB1234567"
                required
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="passport_country">
                Issuing Country
                {form.passport_country && (
                  <span className="field-flag-badge">
                    <CountryFlag code={form.passport_country} />
                    <span>{form.passport_country}</span>
                  </span>
                )}
              </label>
              <CountrySelect
                id="passport_country"
                name="passport_country"
                value={form.passport_country}
                onChange={handleChange}
                placeholder="Select issuing country with flag…"
                mode="country"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="passport_issue_date">
                Issue Date
              </label>
              <input
                id="passport_issue_date"
                className="form-input"
                name="passport_issue_date"
                type="date"
                value={form.passport_issue_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="passport_expiry">
                Expiry Date
              </label>
              <input
                id="passport_expiry"
                className="form-input"
                name="passport_expiry"
                type="date"
                value={form.passport_expiry}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: PERSONAL INFORMATION */}
        <div className="form-section">
          <div className="form-section-header">
            <span className="section-badge">Step 2</span>
            <div className="form-section-title">
              <User size={16} className="inline-icon" />
              Personal Information
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="full_name">
                Full Name <span className="required">*</span>
              </label>
              <input
                id="full_name"
                className="form-input"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                placeholder="e.g. Sofia Morales Gomez"
                required
                autoComplete="name"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="nationality">
                Nationality
                {form.nationality && (
                  <span className="field-flag-badge">
                    <CountryFlag code={form.nationality} />
                    <span>{getCountryName(form.nationality) || form.nationality}</span>
                  </span>
                )}
              </label>
              <CountrySelect
                id="nationality"
                name="nationality"
                value={form.nationality}
                onChange={handleChange}
                placeholder="Select nationality with flag…"
                mode="nationality"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="date_of_birth">
                Date of Birth
              </label>
              <input
                id="date_of_birth"
                className="form-input"
                name="date_of_birth"
                type="date"
                value={form.date_of_birth}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="gender">
                Gender
              </label>
              <select
                id="gender"
                className="form-input"
                name="gender"
                value={form.gender}
                onChange={handleChange}
              >
                <option value="">Select gender…</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 3: CONTACT DETAILS & RESIDENCE */}
        <div className="form-section">
          <div className="form-section-header">
            <span className="section-badge">Step 3</span>
            <div className="form-section-title">
              <Mail size={16} className="inline-icon" />
              Contact & Residence Details
            </div>
          </div>
          <p className="form-section-desc">
            Direct communication channels, home residence, and designated emergency contact.
          </p>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                className="form-input"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="e.g. traveler@example.com"
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="phone">
                Phone Number
              </label>
              <input
                id="phone"
                className="form-input"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="e.g. +34 612 345 678"
                autoComplete="tel"
              />
            </div>

            <div className="form-group span-2">
              <label className="form-label" htmlFor="address">
                Street Address
              </label>
              <input
                id="address"
                className="form-input"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="e.g. Gran Vía 45, Piso 4B"
                autoComplete="street-address"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="city">
                City / Municipality
              </label>
              <input
                id="city"
                className="form-input"
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="e.g. Madrid"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="postal_code">
                Postal / ZIP Code
              </label>
              <input
                id="postal_code"
                className="form-input"
                name="postal_code"
                value={form.postal_code}
                onChange={handleChange}
                placeholder="e.g. 28013"
              />
            </div>

            <div className="form-group span-2">
              <label className="form-label" htmlFor="country">
                Country of Residence
                {form.country && (
                  <span className="field-flag-badge">
                    <CountryFlag code={form.country} />
                    <span>{getCountryName(form.country) || form.country}</span>
                  </span>
                )}
              </label>
              <CountrySelect
                id="country"
                name="country"
                value={form.country}
                onChange={handleChange}
                placeholder="Select country of residence with flag…"
                mode="country"
              />
            </div>
          </div>

          {/* Emergency Contact Subsection */}
          <div className="emergency-contact-box">
            <div className="emergency-title">
              <ShieldAlert size={18} className="inline-icon emergency-icon" />
              Emergency Contact Person
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="emergency_contact_name">
                  Contact Name
                </label>
                <input
                  id="emergency_contact_name"
                  className="form-input"
                  name="emergency_contact_name"
                  value={form.emergency_contact_name}
                  onChange={handleChange}
                  placeholder="e.g. Carlos Morales"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="emergency_contact_phone">
                  Contact Phone
                </label>
                <input
                  id="emergency_contact_phone"
                  className="form-input"
                  name="emergency_contact_phone"
                  type="tel"
                  value={form.emergency_contact_phone}
                  onChange={handleChange}
                  placeholder="e.g. +34 699 888 777"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="emergency_contact_relation">
                  Relationship
                </label>
                <select
                  id="emergency_contact_relation"
                  className="form-input"
                  name="emergency_contact_relation"
                  value={form.emergency_contact_relation}
                  onChange={handleChange}
                >
                  <option value="">Select relationship…</option>
                  {RELATION_OPTIONS.map((rel) => (
                    <option key={rel} value={rel}>
                      {rel}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: VISA INFORMATION */}
        <div className="form-section">
          <div className="form-section-header">
            <span className="section-badge">Step 4</span>
            <div className="form-section-title">
              <CreditCard size={16} className="inline-icon" />
              Visa Information
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="visa_type">
                Visa Type
              </label>
              <input
                id="visa_type"
                className="form-input"
                name="visa_type"
                value={form.visa_type}
                onChange={handleChange}
                placeholder="e.g. Tourist, Business, Student, Work"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="visa_number">
                Visa Number
              </label>
              <input
                id="visa_number"
                className="form-input font-mono"
                name="visa_number"
                value={form.visa_number}
                onChange={handleChange}
                placeholder="e.g. V-987654"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="visa_expiry">
                Visa Expiry
              </label>
              <input
                id="visa_expiry"
                className="form-input"
                name="visa_expiry"
                type="date"
                value={form.visa_expiry}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            <Check size={16} aria-hidden="true" />
            <span>{isEdit ? "Update Traveler Profile" : "Register Traveler"}</span>
          </button>
          {onCancel && (
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              <X size={16} aria-hidden="true" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </form>
    </>
  );
}
