import { useState, useEffect, useRef } from "react";

const colors = {
  blanc: "#FFFFFF",
  grisClair: "#F5F7FA",
  texte: "#1E2A3A",
  texteMuted: "#5A6E7A",
  bordure: "#D0D7DE",
  bleu: "#0066CC",
};

const styles = {
  label: {
    display: "block",
    marginBottom: 6,
    fontSize: 13,
    fontWeight: 500,
    color: colors.texte,
  },
  searchWrapper: {
    position: "relative",
  },
  searchInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${colors.bordure}`,
    backgroundColor: colors.blanc,
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
  },
  searchInputSelected: {
    borderColor: colors.bleu,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: colors.blanc,
    border: `1px solid ${colors.bordure}`,
    borderRadius: 10,
    maxHeight: 220,
    overflowY: "auto",
    zIndex: 9999,
    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
  },
  dropdownItem: {
    padding: "10px 12px",
    cursor: "pointer",
    fontSize: 13,
    borderBottom: `1px solid ${colors.bordure}`,
    color: colors.texte,
  },
  dropdownItemActive: {
    backgroundColor: "#E3F2FD",
    fontWeight: 600,
  },
  empty: {
    padding: "12px",
    fontSize: 12,
    color: colors.texteMuted,
    textAlign: "center",
  },
  hint: {
    marginTop: 4,
    fontSize: 11,
    color: colors.texteMuted,
  },
  wrap: {
    marginBottom: 0,
  },
};

export default function SearchSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Rechercher un quartier...",
  hint,
}) {
  const [search, setSearch] = useState(value || "");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setSearch(value || "");
  }, [value]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? options.filter((name) => name.toLowerCase().includes(q)).slice(0, 40)
    : options.slice(0, 40);

  const select = (name) => {
    onChange(name);
    setSearch(name);
    setOpen(false);
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (!wrapperRef.current?.contains(document.activeElement)) {
        setOpen(false);
        if (value) setSearch(value);
        else if (!options.includes(search)) setSearch("");
      }
    }, 150);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      setSearch(value || "");
    }
    if (e.key === "Enter" && filtered.length > 0) {
      e.preventDefault();
      select(filtered[0]);
    }
  };

  return (
    <div ref={wrapperRef} style={styles.wrap}>
      {label ? <label style={styles.label}>{label}</label> : null}
      <div style={styles.searchWrapper}>
        <input
          type="text"
          style={{
            ...styles.searchInput,
            ...(value ? styles.searchInputSelected : {}),
          }}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
            if (value && e.target.value !== value) onChange("");
          }}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
        />
        {open && (
          <div style={styles.dropdown} role="listbox">
            {filtered.length > 0 ? (
              filtered.map((name) => (
                <div
                  key={name}
                  role="option"
                  aria-selected={value === name}
                  style={{
                    ...styles.dropdownItem,
                    ...(value === name ? styles.dropdownItemActive : {}),
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => select(name)}
                >
                  {name}
                </div>
              ))
            ) : (
              <div style={styles.empty}>Aucun quartier trouve</div>
            )}
          </div>
        )}
      </div>
      {hint ? <div style={styles.hint}>{hint}</div> : null}
    </div>
  );
}
