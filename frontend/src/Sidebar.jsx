import { useEffect } from "react";
import { LayoutDashboard, Users, UserPlus, FileText, Sun, Moon, Compass, X, PlaneTakeoff } from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "travelers", icon: Users, label: "Travelers" },
  { id: "register", icon: UserPlus, label: "Register" },
  { id: "flights", icon: PlaneTakeoff, label: "Flights" },
  { id: "logs", icon: FileText, label: "Logs" },
];

export default function Sidebar({ active, onNavigate, isOpen, onClose, theme, onToggleTheme }) {
  // Lock body scroll on mobile when sidebar is open & close on Escape
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  return (
    <>
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          aria-label="Close navigation overlay"
          role="button"
          tabIndex={-1}
        />
      )}
      <aside className={`sidebar${isOpen ? " open" : ""}`} role="navigation" aria-label="Main navigation">
        <div className="sidebar-brand">
          <div className="brand-header">
            <span className="brand-logo-icon" aria-hidden="true">
              <Compass size={24} />
            </span>
            <h1>TravelDash</h1>
            <button
              type="button"
              className="sidebar-close-btn"
              onClick={onClose}
              aria-label="Close navigation menu"
            >
              <X size={18} />
            </button>
          </div>
          <div className="brand-sub">Traveler Registration System</div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item${isActive ? " active" : ""}`}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="nav-icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            className="theme-toggle"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            <span className="theme-toggle-icon" aria-hidden="true">
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </span>
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </button>
          <div className="sidebar-copy">© 2026 TravelDash</div>
        </div>
      </aside>
    </>
  );
}
