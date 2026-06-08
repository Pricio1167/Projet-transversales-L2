// components/Navbar.jsx
import { NavLink, useNavigate } from "react-router-dom";
import { logout, getUser, isAdmin } from "../api";
import { Home, Navigation, Share2, AlertTriangle, BarChart2, Map, Shield, User, LogOut } from "lucide-react";

const styles = {
  nav: {
    background: "#ffffff",
    borderBottom: "1px solid #e2e8f0",
    padding: "0 32px",
    display: "grid",
    gridTemplateColumns: "220px 1fr 260px",
    alignItems: "center",
    height: 64,
    position: "sticky",
    top: 0,
    zIndex: 1000,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    width: "100%",
    boxSizing: "border-box",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    textDecoration: "none",
  },
  logoIcon: {
    width: 36,
    height: 36,
    background: "#2563eb",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 18,
    fontWeight: 700,
    color: "#1e293b",
    letterSpacing: 1,
  },
  logoSub: {
    fontSize: 10,
    color: "#64748b",
    letterSpacing: 0.5,
  },
  links: {
    display: "flex",
    gap: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  link: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 8,
    textDecoration: "none",
    color: "#64748b",
    fontSize: 13,
    fontWeight: 500,
    transition: "all 0.15s",
  },
  activeLink: {
    background: "#eff6ff",
    color: "#2563eb",
    fontWeight: 600,
  },
  right: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  userBadge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 8,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#1e293b",
    fontSize: 13,
    fontWeight: 500,
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #fee2e2",
    background: "#fff5f5",
    color: "#ef4444",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    transition: "all 0.15s",
  },
};

function Navbar() {
  const navigate = useNavigate();
  const user = getUser();
  const navItems = [
    { to: "/", label: "Accueil", icon: Home, end: true },
    { to: "/trajet", label: "Trajet", icon: Navigation },
    { to: "/graphe", label: "Graphe", icon: Share2 },
    { to: "/trafic", label: "Trafic", icon: AlertTriangle },
    { to: "/performances", label: "Performances", icon: BarChart2 },
    { to: "/carte", label: "Carte", icon: Map },
    ...(isAdmin() ? [{ to: "/admin", label: "Admin", icon: Shield }] : []),
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav style={styles.nav}>
      {/* Logo gauche */}
      <NavLink to="/" style={styles.logo}>
        <div style={styles.logoIcon}>
          <Map size={18} color="white" />
        </div>
        <div>
          <div style={styles.logoText}>SIOTUM</div>
          <div style={styles.logoSub}>Antananarivo</div>
        </div>
      </NavLink>

      {/* Liens centre */}
      <div style={styles.links}>
        {navItems.map(({ to, label, icon: NavIcon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={({ isActive }) => ({
              ...styles.link,
              ...(isActive ? styles.activeLink : {}),
            })}
          >
            <NavIcon size={15} />
            {label}
          </NavLink>
        ))}
      </div>

      {/* User + Logout droite */}
      <div style={styles.right}>
        {user && (
          <div style={styles.userBadge}>
            <User size={14} />
            {user.nom}
          </div>
        )}
        <button style={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={14} />
          Déconnexion
        </button>
      </div>
    </nav>
  );
}

export default Navbar;