import { useState, useEffect, useCallback } from "react";
import {
  fetchTravelers,
  createTraveler,
  updateTraveler,
  deleteTraveler,
} from "./api";
import { Menu, X, AlertCircle, CheckCircle2 } from "lucide-react";
import Sidebar from "./Sidebar";
import DashboardPage from "./DashboardPage";
import TravelerTable from "./TravelerTable";
import TravelerForm from "./TravelerForm";
import LogsPage from "./LogsPage";
import FlightsPage from "./FlightsPage";
import "./App.css";

/* ── Theme helper ──────────────────────────────────────────────────── */
function getInitialTheme() {
  const stored = localStorage.getItem("traveldash-theme");
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [travelers, setTravelers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);

  // Apply theme to <html> so CSS selectors work
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("traveldash-theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  /* ── Data fetching ─────────────────────────────────────────────── */
  const load = useCallback(async () => {
    try {
      const data = await fetchTravelers();
      setTravelers(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-dismiss success messages
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 3500);
    return () => clearTimeout(t);
  }, [success]);

  /* ── Handlers ──────────────────────────────────────────────────── */
  async function handleSave(data) {
    try {
      if (editing) {
        await updateTraveler(editing.id, data);
        setSuccess(`Traveler "${data.full_name}" updated successfully.`);
      } else {
        await createTraveler(data);
        setSuccess(`Traveler "${data.full_name}" registered successfully.`);
      }
      setEditing(null);
      setError(null);
      setPage("travelers");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this traveler?")) return;
    try {
      await deleteTraveler(id);
      setSuccess("Traveler deleted.");
      setError(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleEdit(traveler) {
    setEditing(traveler);
    setPage("register");
  }

  function handleNavigate(pageId) {
    if (pageId !== "register") {
      setEditing(null);
    }
    setPage(pageId);
  }

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <div className="app-shell">
      <button
        className="mobile-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={sidebarOpen}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <Sidebar
        active={page}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="main-content">
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

        {page === "dashboard" && (
          <DashboardPage travelers={travelers} onNavigate={handleNavigate} />
        )}

        {page === "travelers" && (
          <TravelerTable
            travelers={travelers}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAdd={() => {
              setEditing(null);
              setPage("register");
            }}
          />
        )}

        {page === "register" && (
          <TravelerForm
            traveler={editing}
            onSave={handleSave}
            onCancel={() => {
              setEditing(null);
              setPage("travelers");
            }}
          />
        )}

        {page === "logs" && <LogsPage />}

        {page === "flights" && <FlightsPage />}
      </main>
    </div>
  );
}
