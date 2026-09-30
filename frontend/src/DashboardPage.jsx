import { useMemo } from "react";
import { Users, Globe, FileBadge, AlertTriangle, Plus, ArrowUpRight } from "lucide-react";
import CountryFlag from "./CountryFlag";
import { getCountryName } from "./data/countries";

/**
 * Dashboard page — statistics cards, nationality bar chart,
 * visa-status ring chart, and recent travelers list with vector flag icons.
 * Complies with UI/UX Pro Max:
 * - SVG icons (no emoji)
 * - Clear contrast & visual hierarchy
 * - Minimum touch target sizes
 */

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

const STATUS_COLORS = {
  valid: "#22c55e",
  expiring: "#f59e0b",
  expired: "#ef4444",
  none: "#64748b",
};

const STATUS_LABELS = {
  valid: "Valid",
  expiring: "Expiring (<90d)",
  expired: "Expired",
  none: "No passport expiry",
};

/* ─── Component ────────────────────────────────────────────────────── */
export default function DashboardPage({ travelers, onNavigate }) {
  const stats = useMemo(() => {
    const total = travelers.length;

    // Nationalities (resolved with country code and name)
    const nationalities = {};
    travelers.forEach((t) => {
      const code = (t.nationality || "").toUpperCase();
      if (!code) {
        nationalities["Unknown"] = { code: "", count: (nationalities["Unknown"]?.count || 0) + 1, name: "Unknown" };
      } else {
        const name = getCountryName(code) || code;
        if (!nationalities[code]) {
          nationalities[code] = { code, name, count: 0 };
        }
        nationalities[code].count += 1;
      }
    });
    const topNationalities = Object.values(nationalities)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Visa types
    const visaTypes = new Set(travelers.map((t) => t.visa_type).filter(Boolean));

    // Passport status distribution
    const statusCounts = { valid: 0, expiring: 0, expired: 0, none: 0 };
    travelers.forEach((t) => {
      statusCounts[getPassportStatus(t.passport_expiry)] += 1;
    });

    // Recent travelers (last 5)
    const recent = [...travelers]
      .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
      .slice(0, 5);

    return { total, topNationalities, visaTypes: visaTypes.size, statusCounts, recent };
  }, [travelers]);

  /* Ring chart geometry */
  const ringRadius = 52;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const statusEntries = Object.entries(stats.statusCounts).filter(([, v]) => v > 0);
  let ringOffset = 0;

  return (
    <>
      <div className="page-header">
        <div className="page-header-title-wrap">
          <h2>Registry Dashboard</h2>
        </div>
        <p>Operational overview of registered travelers, nationalities, and document health</p>
      </div>

      {/* Stat cards */}
      <div className="stats-grid">
        <div className="stat-card accent">
          <div className="stat-icon-wrap accent-icon">
            <Users size={22} aria-hidden="true" />
          </div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Travelers</div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon-wrap success-icon">
            <Globe size={22} aria-hidden="true" />
          </div>
          <div className="stat-value">{stats.topNationalities.length}</div>
          <div className="stat-label">Nationalities Represented</div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon-wrap warning-icon">
            <FileBadge size={22} aria-hidden="true" />
          </div>
          <div className="stat-value">{stats.visaTypes}</div>
          <div className="stat-label">Visa Categories Active</div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon-wrap danger-icon">
            <AlertTriangle size={22} aria-hidden="true" />
          </div>
          <div className="stat-value">{stats.statusCounts.expiring + stats.statusCounts.expired}</div>
          <div className="stat-label">Passport Alerts</div>
        </div>
      </div>

      {/* Charts row */}
      <div className="dashboard-grid">
        {/* Nationality bar chart */}
        <div className="chart-card">
          <div className="card-header-clean">
            <h3>Top Nationalities</h3>
            <span className="card-sub-count">{stats.topNationalities.length} countries</span>
          </div>
          {stats.topNationalities.length === 0 ? (
            <p className="empty-subtext">No data yet — register travelers to see statistics.</p>
          ) : (
            <div className="bar-chart">
              {stats.topNationalities.map((item) => (
                <div className="bar-row" key={item.code || item.name}>
                  <div className="bar-label-group" title={item.name}>
                    {item.code ? (
                      <CountryFlag code={item.code} name={item.name} />
                    ) : (
                      <Globe size={14} className="inline-icon" />
                    )}
                    <span className="bar-label-text">{item.name}</span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${Math.max((item.count / (stats.total || 1)) * 100, 5)}%`,
                      }}
                    />
                  </div>
                  <span className="bar-value">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Passport status ring chart */}
        <div className="chart-card">
          <div className="card-header-clean">
            <h3>Passport Validity Status</h3>
            <span className="card-sub-count">{stats.total} total</span>
          </div>
          {stats.total === 0 ? (
            <p className="empty-subtext">No traveler records registered yet.</p>
          ) : (
            <div className="ring-chart">
              <svg
                width="130"
                height="130"
                viewBox="0 0 130 130"
                className="ring-svg"
                role="img"
                aria-label="Passport status distribution chart"
              >
                <circle className="ring-track" cx="65" cy="65" r={ringRadius} strokeWidth="16" />
                {statusEntries.map(([status, count]) => {
                  const pct = count / stats.total;
                  const dash = pct * ringCircumference;
                  const offset = ringOffset;
                  ringOffset += dash;
                  return (
                    <circle
                      key={status}
                      className="ring-segment"
                      cx="65"
                      cy="65"
                      r={ringRadius}
                      strokeWidth="16"
                      stroke={STATUS_COLORS[status]}
                      strokeDasharray={`${dash} ${ringCircumference - dash}`}
                      strokeDashoffset={-offset}
                    />
                  );
                })}
              </svg>
              <div className="ring-legend">
                {Object.entries(stats.statusCounts).map(([status, count]) => (
                  <div className="legend-item" key={status}>
                    <span className="legend-dot" style={{ background: STATUS_COLORS[status] }} />
                    <span className="legend-name">{STATUS_LABELS[status]}</span>
                    <span className="legend-value">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent travelers */}
      <div className="chart-card">
        <div className="card-header-clean">
          <h3>Recent Registrations</h3>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => onNavigate("travelers")}
          >
            <span>View All</span>
            <ArrowUpRight size={14} className="inline-icon" />
          </button>
        </div>

        {stats.recent.length === 0 ? (
          <div className="empty-state-mini">
            <p className="empty-subtext">No travelers registered yet.</p>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => onNavigate("register")}
            >
              <Plus size={14} className="inline-icon" /> Register First Traveler
            </button>
          </div>
        ) : (
          <div className="recent-list">
            {stats.recent.map((t) => (
              <div className="recent-item" key={t.id}>
                {t.passport_photo ? (
                  <img
                    src={t.passport_photo}
                    alt={t.full_name}
                    className="recent-avatar-img"
                  />
                ) : (
                  <div className="recent-avatar">
                    {t.full_name
                      ?.split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "TR"}
                  </div>
                )}
                <div className="recent-info">
                  <div className="recent-name">{t.full_name}</div>
                  <div className="recent-detail">
                    {t.nationality && <CountryFlag code={t.nationality} />}
                    <span>{getCountryName(t.nationality) || t.nationality || "—"}</span>
                    <span className="meta-separator">·</span>
                    <span className="font-mono">Passport: {t.passport_number}</span>
                  </div>
                </div>
                <span className={`badge badge-${getPassportStatus(t.passport_expiry)}`}>
                  {STATUS_LABELS[getPassportStatus(t.passport_expiry)]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
