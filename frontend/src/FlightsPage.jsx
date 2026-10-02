import { useState, useEffect, useCallback, useMemo } from "react";
import {
  PlaneTakeoff,
  PlaneLanding,
  Plus,
  Trash2,
  X,
  Users,
  Calendar,
  Clock,
  ChevronRight,
  UserMinus,
  UserPlus,
  Edit2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import CountryFlag from "./CountryFlag";
import { getCountryName } from "./data/countries";
import {
  fetchFlights,
  fetchTravelers,
  createFlight,
  updateFlight,
  deleteFlight,
  assignTravelerToFlight,
  removeTravelerFromFlight,
  updateFlightPassengers,
} from "./api";

/* ── Status colours ──────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  Scheduled: { color: "#6366f1", bg: "rgba(99,102,241,0.1)", icon: "🕐" },
  Boarding: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: "⏳" },
  Departed: { color: "#22c55e", bg: "rgba(34,197,94,0.1)", icon: "✈" },
  Cancelled: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", icon: "✖" },
};

const STATUSES = ["Scheduled", "Boarding", "Departed", "Cancelled"];

const EMPTY_FLIGHT = {
  flight_number: "",
  airline: "",
  origin: "",
  destination: "",
  departure_date: "",
  departure_time: "",
  arrival_date: "",
  arrival_time: "",
  capacity: 150,
  status: "Scheduled",
};

/* ── Capacity bar ────────────────────────────────────────────────────── */
function CapacityBar({ count, capacity }) {
  const pct = capacity > 0 ? Math.min((count / capacity) * 100, 100) : 0;
  const color =
    pct >= 100 ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#22c55e";
  return (
    <div className="flight-cap-bar-wrap" title={`${count}/${capacity} passengers`}>
      <div className="flight-cap-bar-track">
        <div
          className="flight-cap-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="flight-cap-label" style={{ color }}>
        {count}/{capacity}
      </span>
    </div>
  );
}

/* ── Flight form modal ───────────────────────────────────────────────── */
function FlightFormModal({ flight, onSave, onClose }) {
  const [form, setForm] = useState(flight ? { ...flight } : { ...EMPTY_FLIGHT });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function handle(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const data = { ...form, capacity: Number(form.capacity) || 150 };
      const saved = flight
        ? await updateFlight(flight.id, data)
        : await createFlight(data);
      onSave(saved);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  const isEdit = !!flight;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Flight form">
      <div className="modal-card flight-form-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <PlaneTakeoff size={20} className="inline-icon" style={{ color: "var(--accent)" }} />
            <h3>{isEdit ? "Edit Flight" : "Add New Flight"}</h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={submit}>
          <div className="modal-body flight-form-body">
            {err && (
              <div className="error-banner" role="alert" style={{ marginBottom: 0 }}>
                <AlertCircle size={16} className="banner-icon" />
                <span>{err}</span>
              </div>
            )}

            <div className="flight-form-grid">
              {/* Flight number */}
              <div className="form-group">
                <label className="form-label" htmlFor="ff-number">
                  Flight Number <span className="required">*</span>
                </label>
                <input
                  id="ff-number"
                  className="form-input font-mono"
                  name="flight_number"
                  value={form.flight_number}
                  onChange={handle}
                  placeholder="e.g. AT501"
                  required
                  autoComplete="off"
                />
              </div>

              {/* Airline */}
              <div className="form-group">
                <label className="form-label" htmlFor="ff-airline">Airline</label>
                <input
                  id="ff-airline"
                  className="form-input"
                  name="airline"
                  value={form.airline}
                  onChange={handle}
                  placeholder="e.g. Air Algérie"
                />
              </div>

              {/* Origin */}
              <div className="form-group">
                <label className="form-label" htmlFor="ff-origin">
                  Origin <span className="required">*</span>
                </label>
                <input
                  id="ff-origin"
                  className="form-input"
                  name="origin"
                  value={form.origin}
                  onChange={handle}
                  placeholder="e.g. Algiers (ALG)"
                  required
                />
              </div>

              {/* Destination */}
              <div className="form-group">
                <label className="form-label" htmlFor="ff-dest">
                  Destination <span className="required">*</span>
                </label>
                <input
                  id="ff-dest"
                  className="form-input"
                  name="destination"
                  value={form.destination}
                  onChange={handle}
                  placeholder="e.g. Paris (CDG)"
                  required
                />
              </div>

              {/* Departure date */}
              <div className="form-group">
                <label className="form-label" htmlFor="ff-dep-date">
                  Departure Date <span className="required">*</span>
                </label>
                <input
                  id="ff-dep-date"
                  type="date"
                  className="form-input"
                  name="departure_date"
                  value={form.departure_date}
                  onChange={handle}
                  required
                />
              </div>

              {/* Departure time */}
              <div className="form-group">
                <label className="form-label" htmlFor="ff-dep-time">Departure Time</label>
                <input
                  id="ff-dep-time"
                  type="time"
                  className="form-input"
                  name="departure_time"
                  value={form.departure_time}
                  onChange={handle}
                />
              </div>

              {/* Arrival date */}
              <div className="form-group">
                <label className="form-label" htmlFor="ff-arr-date">Arrival Date</label>
                <input
                  id="ff-arr-date"
                  type="date"
                  className="form-input"
                  name="arrival_date"
                  value={form.arrival_date}
                  onChange={handle}
                />
              </div>

              {/* Arrival time */}
              <div className="form-group">
                <label className="form-label" htmlFor="ff-arr-time">Arrival Time</label>
                <input
                  id="ff-arr-time"
                  type="time"
                  className="form-input"
                  name="arrival_time"
                  value={form.arrival_time}
                  onChange={handle}
                />
              </div>

              {/* Capacity */}
              <div className="form-group">
                <label className="form-label" htmlFor="ff-cap">Seat Capacity</label>
                <input
                  id="ff-cap"
                  type="number"
                  className="form-input"
                  name="capacity"
                  min={1}
                  max={900}
                  value={form.capacity}
                  onChange={handle}
                />
              </div>

              {/* Status */}
              <div className="form-group">
                <label className="form-label" htmlFor="ff-status">Status</label>
                <select
                  id="ff-status"
                  className="form-input"
                  name="status"
                  value={form.status}
                  onChange={handle}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn btn-primary" disabled={busy} id="flight-save-btn">
              {busy ? (
                <>
                  <RefreshCw size={15} className="spin-icon" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>{isEdit ? "Update Flight" : "Create Flight"}</span>
                </>
              )}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Expired passport helper ─────────────────────────────────────────── */
function isPassportExpired(traveler, flight) {
  if (!traveler || !traveler.passport_expiry) return false;
  const checkDate = flight?.departure_date || new Date().toISOString().split("T")[0];
  return traveler.passport_expiry < checkDate;
}

/* ── Passenger assignment panel ──────────────────────────────────────── */
function AssignPanel({ flight, allTravelers, onSavePassengers, onClose }) {
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [panelError, setPanelError] = useState("");

  // Map all known travelers by ID so we can always look up details
  const travelerMap = useMemo(() => {
    const map = new Map();
    (flight.travelers || []).forEach((t) => map.set(t.id, t));
    (allTravelers || []).forEach((t) => map.set(t.id, t));
    return map;
  }, [flight.travelers, allTravelers]);

  // Original assigned IDs from flight
  const initialAssignedIds = useMemo(() => {
    return new Set((flight.travelers || []).map((t) => t.id));
  }, [flight.travelers]);

  // Staged set of traveler IDs
  const [stagedIds, setStagedIds] = useState(() => new Set(initialAssignedIds));

  // Change counts
  const addedCount = useMemo(() => {
    return [...stagedIds].filter((id) => !initialAssignedIds.has(id)).length;
  }, [stagedIds, initialAssignedIds]);

  const removedCount = useMemo(() => {
    return [...initialAssignedIds].filter((id) => !stagedIds.has(id)).length;
  }, [stagedIds, initialAssignedIds]);

  const hasChanges = addedCount > 0 || removedCount > 0;

  // Staged assigned list
  const assignedList = useMemo(() => {
    return [...stagedIds].map((id) => travelerMap.get(id)).filter(Boolean);
  }, [stagedIds, travelerMap]);

  // Unassigned list matching search query
  const unassignedList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (allTravelers || []).filter((t) => {
      if (stagedIds.has(t.id)) return false;
      if (!q) return true;
      return (
        t.full_name?.toLowerCase().includes(q) ||
        t.passport_number?.toLowerCase().includes(q) ||
        t.nationality?.toLowerCase().includes(q)
      );
    });
  }, [allTravelers, stagedIds, search]);

  function handleAdd(traveler) {
    if (isPassportExpired(traveler, flight)) {
      setPanelError(
        `Cannot add "${traveler.full_name}": Passport expired on ${traveler.passport_expiry}. A valid passport is required for flight ${flight.flight_number} (departure ${flight.departure_date || "date"}).`
      );
      return;
    }

    if (stagedIds.size >= flight.capacity) {
      setPanelError(`Flight ${flight.flight_number} is at full capacity (${flight.capacity} seats).`);
      return;
    }

    setPanelError("");
    setStagedIds((prev) => new Set([...prev, traveler.id]));
  }

  function handleRemove(travelerId) {
    setPanelError("");
    setStagedIds((prev) => {
      const next = new Set(prev);
      next.delete(travelerId);
      return next;
    });
  }

  async function handleConfirm() {
    setSaving(true);
    setPanelError("");
    try {
      await onSavePassengers(flight.id, Array.from(stagedIds));
      onClose();
    } catch (err) {
      setPanelError(err.message || "Failed to update passengers.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Assign passengers">
      <div className="modal-card assign-panel-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <Users size={20} className="inline-icon" style={{ color: "var(--accent)" }} />
            <div>
              <h3>Assign Passengers</h3>
              <div className="modal-id">
                {flight.flight_number} · {flight.origin} → {flight.destination}
                {flight.departure_date && ` (${flight.departure_date})`}
              </div>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close" disabled={saving}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body assign-panel-body">
          {/* Visible Error Banner */}
          {panelError && (
            <div className="error-banner assign-error-banner" role="alert">
              <AlertCircle size={18} className="banner-icon" />
              <div style={{ flex: 1, minWidth: 0 }}>{panelError}</div>
              <button
                type="button"
                className="assign-error-dismiss"
                onClick={() => setPanelError("")}
                aria-label="Dismiss error"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Currently Assigned (Staged) */}
          <div className="assign-section">
            <div className="assign-section-title">
              <CheckCircle2 size={14} className="inline-icon" style={{ color: "var(--success)" }} />
              Assigned Passengers ({stagedIds.size}/{flight.capacity})
            </div>
            <CapacityBar count={stagedIds.size} capacity={flight.capacity} />

            {assignedList.length === 0 ? (
              <p className="assign-empty-msg">No passengers assigned to this flight yet.</p>
            ) : (
              <ul className="assign-traveler-list">
                {assignedList.map((t) => {
                  const isNew = !initialAssignedIds.has(t.id);
                  const expired = isPassportExpired(t, flight);
                  return (
                    <li key={t.id} className={"assign-traveler-row assigned" + (expired ? " expired-passport" : "")}>
                      <div className="assign-traveler-info">
                        {t.passport_photo ? (
                          <img src={t.passport_photo} alt="" className="assign-avatar-img" />
                        ) : (
                          <div className="assign-avatar-initials">
                            {(t.full_name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="assign-traveler-name">
                            {t.full_name}
                            {isNew && (
                              <span className="badge badge-accent" style={{ marginLeft: "0.4rem", fontSize: "0.65rem", padding: "0.1rem 0.4rem" }}>
                                Staged
                              </span>
                            )}
                            {expired && (
                              <span className="expired-passport-badge">
                                <AlertCircle size={10} /> Expired Passport
                              </span>
                            )}
                          </div>
                          <div className="assign-traveler-meta">
                            <CountryFlag code={t.nationality} />
                            <span>{getCountryName(t.nationality) || t.nationality || "—"}</span>
                            <span className="assign-dot">·</span>
                            <span className="font-mono">{t.passport_number}</span>
                            {t.passport_expiry && (
                              <>
                                <span className="assign-dot">·</span>
                                <span style={{ color: expired ? "var(--danger)" : "inherit", fontWeight: expired ? 600 : "normal" }}>
                                  Exp: {t.passport_expiry}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-delete btn-icon-only"
                        onClick={() => handleRemove(t.id)}
                        disabled={saving}
                        title="Remove from flight"
                        aria-label={`Remove ${t.full_name}`}
                      >
                        <UserMinus size={13} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Available travelers to add */}
          <div className="assign-section">
            <div className="assign-section-title">
              <UserPlus size={14} className="inline-icon" style={{ color: "var(--accent)" }} />
              Add Passengers
            </div>
            <input
              type="search"
              className="form-input assign-search"
              placeholder="Search by name, passport, nationality…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search travelers to add"
            />
            {unassignedList.length === 0 ? (
              <p className="assign-empty-msg">
                {allTravelers.length === 0
                  ? "No travelers registered yet."
                  : search
                    ? "No travelers match your search."
                    : "All registered travelers are already in the passenger list."}
              </p>
            ) : (
              <ul className="assign-traveler-list">
                {unassignedList.map((t) => {
                  const expired = isPassportExpired(t, flight);
                  const isFull = stagedIds.size >= flight.capacity;
                  return (
                    <li key={t.id} className={"assign-traveler-row" + (expired ? " expired-passport" : "")}>
                      <div className="assign-traveler-info">
                        {t.passport_photo ? (
                          <img src={t.passport_photo} alt="" className="assign-avatar-img" />
                        ) : (
                          <div className="assign-avatar-initials">
                            {(t.full_name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="assign-traveler-name">
                            {t.full_name}
                            {expired && (
                              <span className="expired-passport-badge">
                                <AlertCircle size={10} /> Expired Passport
                              </span>
                            )}
                          </div>
                          <div className="assign-traveler-meta">
                            <CountryFlag code={t.nationality} />
                            <span>{getCountryName(t.nationality) || t.nationality || "—"}</span>
                            <span className="assign-dot">·</span>
                            <span className="font-mono">{t.passport_number}</span>
                            {t.passport_expiry && (
                              <>
                                <span className="assign-dot">·</span>
                                <span style={{ color: expired ? "var(--danger)" : "inherit", fontWeight: expired ? 600 : "normal" }}>
                                  Exp: {t.passport_expiry}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={"btn btn-sm btn-icon-only " + (expired ? "btn-delete" : "btn-edit")}
                        onClick={() => handleAdd(t)}
                        disabled={saving || (!expired && isFull)}
                        title={
                          expired
                            ? `Passport expired on ${t.passport_expiry} — cannot add`
                            : isFull
                              ? "Flight capacity reached"
                              : `Add ${t.full_name}`
                        }
                        aria-label={`Add ${t.full_name}`}
                      >
                        {expired ? <AlertCircle size={13} /> : <UserPlus size={13} />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Modal Footer with Cancel and Confirm Button */}
        <div className="assign-panel-footer">
          <div className="assign-footer-left">
            {hasChanges ? (
              <span className="assign-footer-changes">
                <span className="pulse-dot" style={{ background: "var(--accent)" }} />
                Pending: <strong>+{addedCount}</strong>, <strong>-{removedCount}</strong> ({stagedIds.size} total)
              </span>
            ) : (
              <span className="assign-footer-note">
                {stagedIds.size} / {flight.capacity} seats allocated · No pending changes
              </span>
            )}
          </div>
          <div className="assign-footer-right">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={saving}
              id="confirm-assign-btn"
            >
              {saving ? (
                <>
                  <RefreshCw size={15} className="spin-icon" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>Confirm Changes ({stagedIds.size})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ── Flight card ─────────────────────────────────────────────────────── */
function FlightCard({ flight, onEdit, onDelete, onManage }) {
  const cfg = STATUS_CONFIG[flight.status] || STATUS_CONFIG.Scheduled;
  return (
    <div className="flight-card">
      {/* Status ribbon */}
      <div className="flight-card-ribbon" style={{ background: cfg.color }} />

      {/* Top row */}
      <div className="flight-card-top">
        <div className="flight-card-header">
          <span className="flight-number font-mono">{flight.flight_number}</span>
          {flight.airline && <span className="flight-airline">{flight.airline}</span>}
        </div>
        <span
          className="flight-status-badge"
          style={{ color: cfg.color, background: cfg.bg }}
        >
          {flight.status}
        </span>
      </div>

      {/* Route */}
      <div className="flight-route">
        <div className="flight-endpoint">
          <PlaneTakeoff size={14} className="flight-ep-icon" />
          <span className="flight-ep-name">{flight.origin}</span>
        </div>
        <div className="flight-route-line">
          <ChevronRight size={14} className="flight-arrow" />
        </div>
        <div className="flight-endpoint flight-endpoint-dest">
          <PlaneLanding size={14} className="flight-ep-icon" />
          <span className="flight-ep-name">{flight.destination}</span>
        </div>
      </div>

      {/* Times */}
      <div className="flight-times">
        <div className="flight-time-item">
          <Calendar size={12} />
          <span>{flight.departure_date}</span>
        </div>
        {flight.departure_time && (
          <div className="flight-time-item">
            <Clock size={12} />
            <span>{flight.departure_time}</span>
            {flight.arrival_time && <span>→ {flight.arrival_time}</span>}
          </div>
        )}
      </div>

      {/* Capacity */}
      <CapacityBar count={flight.passenger_count} capacity={flight.capacity} />

      {/* Actions */}
      <div className="flight-card-actions">
        <button
          type="button"
          className="btn btn-primary btn-sm flight-manage-btn"
          onClick={() => onManage(flight)}
          id={`manage-flight-${flight.id}`}
        >
          <Users size={14} />
          <span>Manage Passengers</span>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-secondary btn-icon-only"
          onClick={() => onEdit(flight)}
          title="Edit flight"
          aria-label="Edit flight"
        >
          <Edit2 size={14} />
        </button>
        <button
          type="button"
          className="btn btn-sm btn-delete btn-icon-only"
          onClick={() => onDelete(flight)}
          title="Delete flight"
          aria-label="Delete flight"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

/* ── Main FlightsPage component ──────────────────────────────────────── */
export default function FlightsPage() {
  const [flights, setFlights] = useState([]);
  const [travelers, setTravelers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal state
  const [formFlight, setFormFlight] = useState(null);   // null = closed, {} = new, {...} = edit
  const [formOpen, setFormOpen] = useState(false);
  const [manageFlight, setManageFlight] = useState(null); // flight for assign panel

  // Filter
  const [filterStatus, setFilterStatus] = useState("All");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [fl, tr] = await Promise.all([fetchFlights(), fetchTravelers()]);
      setFlights(fl);
      setTravelers(tr);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-dismiss success
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 3000);
    return () => clearTimeout(t);
  }, [success]);

  /* ── Handlers ── */
  function openNew() { setFormFlight(null); setFormOpen(true); }
  function openEdit(flight) { setFormFlight(flight); setFormOpen(true); }

  async function handleSaved(saved) {
    setFormOpen(false);
    setSuccess(formFlight ? `Flight ${saved.flight_number} updated.` : `Flight ${saved.flight_number} created.`);
    await load();
  }

  async function handleDelete(flight) {
    if (!window.confirm(`Delete flight ${flight.flight_number}? This will remove all passenger assignments.`)) return;
    try {
      await deleteFlight(flight.id);
      setSuccess(`Flight ${flight.flight_number} deleted.`);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleSavePassengers(flightId, travelerIds) {
    const updated = await updateFlightPassengers(flightId, travelerIds);
    setManageFlight(updated);
    setFlights((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    setSuccess(`Passenger list confirmed for flight ${updated.flight_number} (${updated.passenger_count} assigned).`);
    return updated;
  }

  /* ── Filtered flights ── */
  const filtered = filterStatus === "All"
    ? flights
    : flights.filter((f) => f.status === filterStatus);

  /* ── Stats ── */
  const totalPassengers = flights.reduce((s, f) => s + f.passenger_count, 0);
  const totalCapacity = flights.reduce((s, f) => s + f.capacity, 0);

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-title-wrap">
          <h2>Flight Management</h2>
          <span className="badge badge-accent">{flights.length} flight{flights.length !== 1 ? "s" : ""}</span>
        </div>
        <p>Create flights and assign registered travelers as passengers</p>
      </div>

      {/* Banners */}
      {error && (
        <div className="error-banner" role="alert">
          <AlertCircle size={18} className="banner-icon" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="success-banner" role="status">
          <CheckCircle2 size={18} className="banner-icon" />
          <span>{success}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flights-toolbar">
        <div className="flights-status-filter">
          {["All", ...STATUSES].map((s) => (
            <button
              key={s}
              type="button"
              className={`filter-chip${filterStatus === s ? " active" : ""}`}
              onClick={() => setFilterStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flights-toolbar-right">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={load}
            title="Refresh"
            aria-label="Refresh flights"
          >
            <RefreshCw size={14} className={loading ? "spin-icon" : ""} />
            <span className="hide-sm">Refresh</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={openNew}
            id="add-flight-btn"
          >
            <Plus size={16} />
            <span>New Flight</span>
          </button>
        </div>
      </div>

      {/* Quick stats strip */}
      {flights.length > 0 && (
        <div className="flights-stats-strip">
          <div className="flight-stat-pill">
            <PlaneTakeoff size={14} />
            <span><strong>{flights.length}</strong> total flights</span>
          </div>
          <div className="flight-stat-pill">
            <Users size={14} />
            <span><strong>{totalPassengers}</strong> passengers assigned</span>
          </div>
          <div className="flight-stat-pill" style={{ color: totalCapacity > 0 && (totalPassengers / totalCapacity) >= 0.9 ? "var(--warning)" : "var(--text-secondary)" }}>
            <span>Overall fill: <strong>{totalCapacity > 0 ? Math.round((totalPassengers / totalCapacity) * 100) : 0}%</strong></span>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flights-loading">
          <RefreshCw size={28} className="spin-icon" style={{ color: "var(--accent)" }} />
          <p>Loading flights…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">
            <PlaneTakeoff size={44} strokeWidth={1.5} />
          </div>
          <p>
            {filterStatus !== "All"
              ? `No ${filterStatus.toLowerCase()} flights.`
              : "No flights yet — create your first flight to get started."}
          </p>
          {filterStatus === "All" && (
            <button type="button" className="btn btn-primary" onClick={openNew} style={{ marginTop: "1rem" }}>
              <Plus size={16} /> Create First Flight
            </button>
          )}
        </div>
      ) : (
        <div className="flights-grid">
          {filtered.map((flight) => (
            <FlightCard
              key={flight.id}
              flight={flight}
              onEdit={openEdit}
              onDelete={handleDelete}
              onManage={setManageFlight}
            />
          ))}
        </div>
      )}

      {/* Flight form modal */}
      {formOpen && (
        <FlightFormModal
          flight={formFlight}
          onSave={handleSaved}
          onClose={() => setFormOpen(false)}
        />
      )}

      {/* Passenger assignment panel */}
      {manageFlight && (
        <AssignPanel
          flight={manageFlight}
          allTravelers={travelers}
          onSavePassengers={handleSavePassengers}
          onClose={() => setManageFlight(null)}
        />
      )}
    </>
  );
}
