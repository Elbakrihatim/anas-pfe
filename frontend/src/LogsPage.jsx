import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Download, RefreshCw, Play, Pause, FileText, ArrowDown, Filter } from "lucide-react";
import { fetchLogs, LOGS_DOWNLOAD_URL } from "./api";

const LEVELS = ["ALL", "INFO", "WARNING", "ERROR", "DEBUG"];

const LEVEL_CLASS = {
  INFO: "log-info",
  WARNING: "log-warning",
  ERROR: "log-error",
  DEBUG: "log-debug",
};

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [level, setLevel] = useState("ALL");
  const [lines, setLines] = useState(200);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState(false);
  const containerRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLogs({
        lines,
        level: level === "ALL" ? "" : level,
      });
      // Ensure logs are ordered newest first (latest at top)
      // Check if data is already reversed by inspecting timestamps if available
      const ordered = [...data];
      if (ordered.length >= 2) {
        const firstTs = new Date(ordered[0].timestamp).getTime() || 0;
        const lastTs = new Date(ordered[ordered.length - 1].timestamp).getTime() || 0;
        if (firstTs < lastTs) {
          ordered.reverse();
        }
      }
      setLogs(ordered);
    } catch {
      setLogs([]);
    }
    setLoading(false);
  }, [level, lines]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  const filtered = search.trim()
    ? logs.filter(
        (l) =>
          l.message.toLowerCase().includes(search.toLowerCase()) ||
          l.request_id.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  /**
   * Downloads logs as a text file.
   * If server download is available, uses the endpoint; otherwise exports filtered data.
   */
  async function handleDownloadLogs() {
    setDownloading(true);
    try {
      // If no filter or search is active, trigger direct file download from server
      if (!search.trim() && level === "ALL") {
        const link = document.createElement("a");
        link.href = LOGS_DOWNLOAD_URL;
        link.setAttribute("download", `traveldash-logs-${new Date().toISOString().replace(/[:.]/g, "-")}.log`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Export currently filtered log lines formatted cleanly
        const content = filtered
          .map((l) => `${l.timestamp || "—"} | ${l.level.padEnd(8)} | ${l.request_id || "—"} | ${l.message}`)
          .join("\n");
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `traveldash-filtered-logs-${new Date().toISOString().replace(/[:.]/g, "-")}.log`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Failed to download logs", err);
    } finally {
      setTimeout(() => setDownloading(false), 500);
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-title-wrap">
          <h2>Logs Viewer</h2>
          <span className="badge badge-subtle">
            <ArrowDown size={12} className="inline-icon" /> Latest entries first
          </span>
        </div>
        <p>Real-time server log stream (newest activity at the top)</p>
      </div>

      {/* Toolbar */}
      <div className="logs-toolbar">
        <div className="logs-filters">
          <div className="search-box">
            <Search size={16} className="search-icon" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search logs by message or request ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search logs"
            />
          </div>

          <div className="log-filter-group">
            <label className="form-label" htmlFor="level-filter">
              <Filter size={13} className="inline-icon" /> Level
            </label>
            <select
              id="level-filter"
              className="form-input log-select"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className="log-filter-group">
            <label className="form-label" htmlFor="lines-filter">Lines</label>
            <select
              id="lines-filter"
              className="form-input log-select"
              value={lines}
              onChange={(e) => setLines(Number(e.target.value))}
            >
              <option value={50}>50 lines</option>
              <option value={100}>100 lines</option>
              <option value={200}>200 lines</option>
              <option value={500}>500 lines</option>
              <option value={1000}>1000 lines</option>
            </select>
          </div>
        </div>

        <div className="logs-actions">
          {/* Download Logs Button */}
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={handleDownloadLogs}
            disabled={downloading || filtered.length === 0}
            title="Download log file to your device"
            aria-label="Download logs"
          >
            <Download size={15} aria-hidden="true" />
            <span>{downloading ? "Downloading…" : "Download Logs"}</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm ${autoRefresh ? "btn-accent-active" : "btn-secondary"}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            aria-pressed={autoRefresh}
          >
            {autoRefresh ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
            <span>{autoRefresh ? "Pause Stream" : "Live Stream"}</span>
          </button>

          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={load}
            disabled={loading}
            title="Reload logs"
          >
            <RefreshCw size={14} className={loading ? "spin-icon" : ""} aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div
        ref={containerRef}
        className="logs-container"
        role="log"
        aria-live={autoRefresh ? "polite" : "off"}
      >
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">
              <FileText size={42} strokeWidth={1.5} />
            </div>
            <p>{loading ? "Loading logs…" : "No log entries found."}</p>
          </div>
        ) : (
          <div className="logs-table-wrapper">
            <table className="logs-table">
              <thead>
                <tr>
                  <th style={{ width: "210px" }}>
                    <div className="th-sort-header">
                      <span>Timestamp</span>
                      <span className="th-badge-latest">Newest ↓</span>
                    </div>
                  </th>
                  <th style={{ width: "90px" }}>Level</th>
                  <th style={{ width: "260px" }}>Request ID</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, i) => (
                  <tr key={`${entry.timestamp}-${i}`} className={LEVEL_CLASS[entry.level] || ""}>
                    <td className="log-ts">{entry.timestamp}</td>
                    <td>
                      <span className={`log-badge log-badge-${entry.level.toLowerCase()}`}>
                        {entry.level}
                      </span>
                    </td>
                    <td className="log-rid">{entry.request_id || "—"}</td>
                    <td className="log-msg">{entry.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="logs-footer">
        <div className="logs-footer-info">
          Showing <strong>{filtered.length}</strong> of {logs.length} entries (latest on top)
        </div>
        {autoRefresh && (
          <div className="logs-footer-live">
            <span className="pulse-dot" aria-hidden="true" />
            <span>Live streaming updates</span>
          </div>
        )}
      </div>
    </>
  );
}
