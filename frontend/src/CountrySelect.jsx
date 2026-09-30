import { useState, useRef, useEffect, useId } from "react";
import { ChevronDown, Search, X, Check } from "lucide-react";
import CountryFlag from "./CountryFlag";
import { COUNTRIES } from "./data/countries";

/**
 * Accessible, searchable Country Select with SVG Flag icons.
 * Complies with UI/UX Pro Max:
 * - Touch target >= 44px
 * - SVG icons (no emoji)
 * - Contrast >= 4.5:1
 * - Keyboard navigation (Tab, Enter, Space, Arrows, Esc)
 * - Clear inline search & visible feedback
 */
export default function CountrySelect({
  id,
  name,
  value,
  onChange,
  placeholder = "Select a country...",
  mode = "country", // "country" | "nationality"
  required = false,
  disabled = false,
  error = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listboxRef = useRef(null);
  const generatedId = useId();
  const selectId = id || generatedId;

  // Find selected country object
  const selectedCountry = COUNTRIES.find(
    (c) => c.code.toUpperCase() === (value || "").toUpperCase()
  );

  // Filter countries based on search query
  const filtered = COUNTRIES.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const nameMatch = c.name.toLowerCase().includes(q);
    const codeMatch = c.code.toLowerCase().includes(q);
    const natMatch = c.nationality && c.nationality.toLowerCase().includes(q);
    return nameMatch || codeMatch || natMatch;
  });

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listboxRef.current) {
      const activeEl = listboxRef.current.children[highlightedIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  function handleSelect(country) {
    onChange({
      target: {
        name,
        value: country ? country.code : "",
      },
    });
    setIsOpen(false);
    setQuery("");
  }

  function handleClear(e) {
    e.stopPropagation();
    onChange({
      target: {
        name,
        value: "",
      },
    });
  }

  function handleTriggerKeyDown(e) {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
    }
  }

  function handleSearchKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlightedIndex]) {
        handleSelect(filtered[highlightedIndex]);
      }
    } else if (e.key === "Tab") {
      setIsOpen(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className={`country-select-container ${isOpen ? "is-open" : ""} ${disabled ? "is-disabled" : ""} ${error ? "has-error" : ""}`}
    >
      {/* Hidden input for standard form serialization */}
      <input type="hidden" name={name} value={value || ""} required={required} />

      {/* Main trigger button */}
      <div
        id={selectId}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`${selectId}-listbox`}
        tabIndex={disabled ? -1 : 0}
        className="country-select-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleTriggerKeyDown}
      >
        <div className="country-select-value">
          {selectedCountry ? (
            <div className="country-chip">
              <CountryFlag code={selectedCountry.code} name={selectedCountry.name} />
              <span className="country-code-badge">{selectedCountry.code}</span>
              <span className="country-name-text">
                {mode === "nationality"
                  ? `${selectedCountry.name} (${selectedCountry.nationality})`
                  : selectedCountry.name}
              </span>
            </div>
          ) : (
            <span className="country-select-placeholder">{placeholder}</span>
          )}
        </div>

        <div className="country-select-actions">
          {value && !disabled && (
            <button
              type="button"
              className="country-select-clear"
              onClick={handleClear}
              aria-label="Clear country selection"
              tabIndex={-1}
            >
              <X size={14} />
            </button>
          )}
          <span className="country-select-arrow" aria-hidden="true">
            <ChevronDown size={16} />
          </span>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="country-dropdown-menu" role="dialog" aria-label="Select Country">
          <div className="country-dropdown-search">
            <Search size={15} className="dropdown-search-icon" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="text"
              className="country-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search by country, code, or nationality…"
              aria-label="Filter countries"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                className="dropdown-search-clear"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div
            id={`${selectId}-listbox`}
            ref={listboxRef}
            className="country-options-list"
            role="listbox"
            tabIndex={-1}
          >
            {filtered.length === 0 ? (
              <div className="country-option-empty">
                No country found matching "{query}"
              </div>
            ) : (
              filtered.map((country, index) => {
                const isSelected = selectedCountry?.code === country.code;
                const isHighlighted = highlightedIndex === index;

                return (
                  <div
                    key={country.code}
                    role="option"
                    aria-selected={isSelected}
                    className={`country-option-item ${isSelected ? "selected" : ""} ${isHighlighted ? "highlighted" : ""}`}
                    onClick={() => handleSelect(country)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div className="country-option-flag-wrap">
                      <CountryFlag code={country.code} name={country.name} />
                    </div>
                    <span className="country-option-code">{country.code}</span>
                    <span className="country-option-name">{country.name}</span>
                    {mode === "nationality" && country.nationality && (
                      <span className="country-option-nat">({country.nationality})</span>
                    )}
                    {isSelected && (
                      <span className="country-option-check" aria-hidden="true">
                        <Check size={16} />
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="country-dropdown-footer">
            <span>{filtered.length} {filtered.length === 1 ? "country" : "countries"} available</span>
            <span className="keyboard-tip">↑↓ navigate · Enter to select</span>
          </div>
        </div>
      )}
    </div>
  );
}
