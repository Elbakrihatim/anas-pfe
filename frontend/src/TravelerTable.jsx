import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
  X,
  FileBadge,
  PhoneCall,
  ShieldAlert,
  CreditCard,
  Users,
} from "lucide-react";
import CountryFlag from "./CountryFlag";
import { getCountryName } from "./data/countries";

/* ─── Helpers ──────────────────────────────────────────────────────── */
function getPassportStatus(expiry) {
  if (!expiry) return "none";
  const today = new Date();
  const exp = new Date(expiry);
  const diffDays = (exp - today) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "expired";
  if (diffDays < 90) return "expiring";
  return "valid";
}

const STATUS_LABEL = {
  valid: "Valid",
  expiring: "Expiring",
  expired: "Expired",
  none: "—",
};

/* ─── Traveler Details Modal ────────────────────────────────────────── */
function TravelerDetailModal({ traveler, onClose, onEdit }) {
  if (!traveler) return null;
  const status = getPassportStatus(traveler.passport_expiry);

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-traveler-name">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <h3>Traveler Profile</h3>
            <span className="modal-id">Record #{traveler.id}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Top banner with Photo & Main Info */}
          <div className="detail-hero">
            <div className="detail-photo-wrapper">
              {traveler.passport_photo ? (
                <img
                  src={traveler.passport_photo}
                  alt={`${traveler.full_name} passport photo`}
                  className="detail-passport-photo"
                />
              ) : (
                <div className="detail-avatar-fallback">
                  {traveler.full_name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "TR"}
                </div>
              )}
              <span className={`badge badge-${status} detail-status-badge`}>
                {STATUS_LABEL[status]}
              </span>
            </div>

            <div className="detail-hero-info">
              <h2 id="modal-traveler-name" className="detail-name">{traveler.full_name}</h2>
              <div className="detail-subtags">
                <span className="detail-chip">
                  <CountryFlag code={traveler.nationality} />
                  <span>{getCountryName(traveler.nationality) || traveler.nationality || "Nationality N/A"}</span>
                </span>
                {traveler.gender && <span className="detail-chip">{traveler.gender}</span>}
                {traveler.date_of_birth && (
                  <span className="detail-chip">DOB: {traveler.date_of_birth}</span>
                )}
              </div>
            </div>
          </div>

          <div className="detail-grid">
            {/* Passport section */}
            <div className="detail-section-card">
              <div className="detail-card-title">
                <FileBadge size={16} className="inline-icon" /> Passport Document
              </div>
              <div className="detail-fields">
                <div className="detail-field">
                  <span className="field-name">Passport Number:</span>
                  <span className="field-value font-mono">{traveler.passport_number}</span>
                </div>
                <div className="detail-field">
                  <span className="field-name">Issuing Country:</span>
                  <span className="field-value field-country-flex">
                    <CountryFlag code={traveler.passport_country} />
                    <span>{getCountryName(traveler.passport_country) || traveler.passport_country || "—"}</span>
                  </span>
                </div>
                <div className="detail-field">
                  <span className="field-name">Issue Date:</span>
                  <span className="field-value">{traveler.passport_issue_date || "—"}</span>
                </div>
                <div className="detail-field">
                  <span className="field-name">Expiry Date:</span>
                  <span className="field-value">{traveler.passport_expiry || "—"}</span>
                </div>
              </div>
            </div>

            {/* Contact details section */}
            <div className="detail-section-card">
              <div className="detail-card-title">
                <PhoneCall size={16} className="inline-icon" /> Contact & Address
              </div>
              <div className="detail-fields">
                <div className="detail-field">
                  <span className="field-name">Email:</span>
                  <span className="field-value">{traveler.email || "—"}</span>
                </div>
                <div className="detail-field">
                  <span className="field-name">Phone:</span>
                  <span className="field-value">{traveler.phone || "—"}</span>
                </div>
                <div className="detail-field">
                  <span className="field-name">Address:</span>
                  <span className="field-value">{traveler.address || "—"}</span>
                </div>
                <div className="detail-field">
                  <span className="field-name">City / Postal:</span>
                  <span className="field-value">
                    {[traveler.city, traveler.postal_code].filter(Boolean).join(", ") || "—"}
                  </span>
                </div>
                <div className="detail-field">
                  <span className="field-name">Residence Country:</span>
                  <span className="field-value field-country-flex">
                    <CountryFlag code={traveler.country} />
                    <span>{getCountryName(traveler.country) || traveler.country || "—"}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="detail-section-card">
              <div className="detail-card-title">
                <ShieldAlert size={16} className="inline-icon emergency-icon" /> Emergency Contact
              </div>
              <div className="detail-fields">
                <div className="detail-field">
                  <span className="field-name">Name:</span>
                  <span className="field-value">{traveler.emergency_contact_name || "—"}</span>
                </div>
                <div className="detail-field">
                  <span className="field-name">Phone:</span>
                  <span className="field-value">{traveler.emergency_contact_phone || "—"}</span>
                </div>
                <div className="detail-field">
                  <span className="field-name">Relationship:</span>
                  <span className="field-value">{traveler.emergency_contact_relation || "—"}</span>
                </div>
              </div>
            </div>

            {/* Visa details */}
            <div className="detail-section-card">
              <div className="detail-card-title">
                <CreditCard size={16} className="inline-icon" /> Visa Information
              </div>
              <div className="detail-fields">
                <div className="detail-field">
                  <span className="field-name">Visa Type:</span>
                  <span className="field-value">{traveler.visa_type || "—"}</span>
                </div>
                <div className="detail-field">
                  <span className="field-name">Visa Number:</span>
                  <span className="field-value font-mono">{traveler.visa_number || "—"}</span>
                </div>
                <div className="detail-field">
                  <span className="field-name">Visa Expiry:</span>
                  <span className="field-value">{traveler.visa_expiry || "—"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onClose();
              onEdit(traveler);
            }}
          >
            <Edit2 size={15} aria-hidden="true" />
            <span>Edit Profile</span>
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────────────── */
export default function TravelerTable({ travelers, onEdit, onDelete, onAdd }) {
  const [search, setSearch] = useState("");
  const [selectedTraveler, setSelectedTraveler] = useState(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return travelers;
    const q = search.toLowerCase();
    return travelers.filter((t) => {
      const countryName = getCountryName(t.passport_country).toLowerCase();
      const natName = getCountryName(t.nationality).toLowerCase();
      return (
        t.full_name?.toLowerCase().includes(q) ||
        t.passport_number?.toLowerCase().includes(q) ||
        (t.email || "").toLowerCase().includes(q) ||
        (t.phone || "").toLowerCase().includes(q) ||
        (t.nationality || "").toLowerCase().includes(q) ||
        (t.passport_country || "").toLowerCase().includes(q) ||
        countryName.includes(q) ||
        natName.includes(q)
      );
    });
  }, [travelers, search]);

  return (
    <>
      <div className="page-header">
        <div className="page-header-title-wrap">
          <h2>Traveler Registry</h2>
          <span className="badge badge-accent">
            {travelers.length} registered {travelers.length === 1 ? "record" : "records"}
          </span>
        </div>
        <p>Comprehensive roster of travelers, travel documents, visas, and passport validation</p>
      </div>

      <div className="table-toolbar">
        <div className="search-box">
          <Search size={16} className="search-icon" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search by name, passport, contact, nationality…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search travelers"
          />
        </div>
        <button className="btn btn-primary" onClick={onAdd}>
          <Plus size={16} aria-hidden="true" />
          <span>Register Traveler</span>
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">
            <Users size={40} strokeWidth={1.5} />
          </div>
          <p>{search ? "No travelers match your search query." : "No travelers registered in the system yet."}</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="traveler-table">
            <thead>
              <tr>
                <th style={{ width: "60px" }}>Photo</th>
                <th>Full Name</th>
                <th>Nationality</th>
                <th>Passport #</th>
                <th>Issuing Country</th>
                <th>Status</th>
                <th>Contact</th>
                <th>Visa</th>
                <th className="actions-header" style={{ textAlign: "right", paddingRight: "1.25rem" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const status = getPassportStatus(t.passport_expiry);
                const initials = t.full_name
                  ?.split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "TR";

                return (
                  <tr key={t.id}>
                    {/* Passport Photo / Avatar */}
                    <td className="photo-cell">
                      {t.passport_photo ? (
                        <img
                          src={t.passport_photo}
                          alt={`${t.full_name} passport`}
                          className="table-passport-thumb"
                          onClick={() => setSelectedTraveler(t)}
                          title="Click to view full photo and profile"
                        />
                      ) : (
                        <div
                          className="table-avatar-initials"
                          onClick={() => setSelectedTraveler(t)}
                          title="View profile"
                        >
                          {initials}
                        </div>
                      )}
                    </td>

                    <td className="name-cell">
                      <div
                        className="clickable-name"
                        onClick={() => setSelectedTraveler(t)}
                        title="View traveler details"
                      >
                        {t.full_name}
                      </div>
                      <div className="sub-row-meta">
                        {t.date_of_birth ? `DOB: ${t.date_of_birth}` : ""}
                        {t.gender ? ` · ${t.gender}` : ""}
                      </div>
                    </td>

                    <td>
                      <span className="country-tag">
                        <CountryFlag code={t.nationality} />
                        <span>{getCountryName(t.nationality) || t.nationality || "—"}</span>
                      </span>
                    </td>

                    <td className="font-mono">{t.passport_number}</td>

                    <td>
                      <span className="country-tag">
                        <CountryFlag code={t.passport_country} />
                        <span>{getCountryName(t.passport_country) || t.passport_country || "—"}</span>
                      </span>
                    </td>

                    <td>
                      <span className={`badge badge-${status}`}>
                        {STATUS_LABEL[status]}
                      </span>
                    </td>

                    <td className="contact-cell">
                      {t.email ? <div className="contact-email">{t.email}</div> : null}
                      {t.phone ? <div className="contact-phone">{t.phone}</div> : null}
                      {!t.email && !t.phone ? <span className="text-muted">—</span> : null}
                    </td>

                    <td>
                      {t.visa_type ? (
                        <div className="visa-summary">
                          <span>{t.visa_type}</span>
                          {t.visa_expiry && (
                            <small className="visa-expiry">Exp: {t.visa_expiry}</small>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    <td className="actions-cell">
                      <div className="actions-group">
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary btn-icon-only"
                          onClick={() => setSelectedTraveler(t)}
                          aria-label={`View ${t.full_name}`}
                          title="View profile"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-edit btn-icon-only"
                          onClick={() => onEdit(t)}
                          aria-label={`Edit ${t.full_name}`}
                          title="Edit traveler"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-delete btn-icon-only"
                          onClick={() => onDelete(t.id)}
                          aria-label={`Delete ${t.full_name}`}
                          title="Delete traveler"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedTraveler && (
        <TravelerDetailModal
          traveler={selectedTraveler}
          onClose={() => setSelectedTraveler(null)}
          onEdit={onEdit}
        />
      )}
    </>
  );
}
