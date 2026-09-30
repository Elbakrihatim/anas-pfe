import { Globe } from "lucide-react";

/**
 * Renders an offline vector SVG flag using flag-icons.
 * Complies with UI/UX Pro Max: SVG icons (no emoji), accessible alt/title.
 */
export default function CountryFlag({ code, name, className = "", size = "normal" }) {
  if (!code || typeof code !== "string" || code.trim().length !== 2) {
    return (
      <span className={`flag-fallback-icon ${className}`} title={name || "Unknown country"} aria-hidden="true">
        <Globe size={16} />
      </span>
    );
  }

  const cleanCode = code.trim().toLowerCase();

  return (
    <span
      className={`fi fi-${cleanCode} country-flag country-flag-${size} ${className}`}
      title={name || code.toUpperCase()}
      role="img"
      aria-label={name ? `${name} flag` : `${code.toUpperCase()} flag`}
    />
  );
}
