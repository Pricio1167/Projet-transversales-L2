// pages/Login.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login, setToken, setUser } from "../api";

// Palette IHM
const colors = {
  bleu: "#0066CC",
  blanc: "#FFFFFF",
  grisClair: "#F5F7FA",
  vert: "#2E7D32",
  orange: "#F57C00",
  rouge: "#D32F2F",
  texte: "#1E2A3A",
  texteMuted: "#5A6E7A",
  bordure: "#E2E8F0",
};

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.grisClair,
    padding: 20,
    fontFamily: "system-ui, sans-serif",
  },
  container: {
    width: "100%",
    maxWidth: 440,
  },
  header: {
    textAlign: "center",
    marginBottom: 28,
  },
  logoBox: {
    width: 64,
    height: 64,
    backgroundColor: colors.bleu,
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
    boxShadow: "0 4px 12px rgba(0,102,204,0.2)",
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    color: colors.texte,
    margin: "0 0 6px",
    letterSpacing: "-0.3px",
  },
  subtitle: {
    fontSize: 13,
    color: colors.texteMuted,
    margin: 0,
    lineHeight: 1.5,
  },
  card: {
    backgroundColor: colors.blanc,
    borderRadius: 20,
    padding: 32,
    border: `1px solid ${colors.bordure}`,
    boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
  },
  formGroup: {
    marginBottom: 18,
  },
  label: {
    display: "block",
    marginBottom: 6,
    color: colors.texte,
    fontSize: 13,
    fontWeight: 500,
  },
  inputWrapper: {
    position: "relative",
  },
  inputIcon: {
    position: "absolute",
    left: 12,
    top: "50%",
    transform: "translateY(-50%)",
    color: colors.texteMuted,
    fontSize: 14,
  },
  input: {
    width: "100%",
    padding: "11px 12px 11px 40px",
    borderRadius: 10,
    border: `1px solid ${colors.bordure}`,
    backgroundColor: colors.blanc,
    color: colors.texte,
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.2s",
  },
  button: {
    width: "100%",
    padding: "12px",
    borderRadius: 40,
    border: "none",
    backgroundColor: colors.bleu,
    color: colors.blanc,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 8,
    marginBottom: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "opacity 0.2s",
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  error: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF3E0",
    borderLeft: `4px solid ${colors.orange}`,
    borderRadius: 10,
    padding: "12px 16px",
    color: "#E65100",
    fontSize: 13,
    marginBottom: 20,
  },
  divider: {
    borderTop: `1px solid ${colors.bordure}`,
    margin: "20px 0 18px",
  },
  footer: {
    textAlign: "center",
    color: colors.texteMuted,
    fontSize: 13,
  },
  link: {
    color: colors.bleu,
    textDecoration: "none",
    fontWeight: 600,
  },
  demoHint: {
    marginTop: 16,
    padding: "10px 14px",
    backgroundColor: colors.grisClair,
    borderRadius: 10,
    fontSize: 12,
    color: colors.texteMuted,
    textAlign: "center",
  },
};

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErreur("Veuillez remplir tous les champs");
      return;
    }
    setErreur("");
    setLoading(true);
    const data = await login(email, password);
    if (data.erreur) {
      setErreur(data.erreur);
    } else {
      setToken(data.token);
      setUser(data.user);
      navigate("/");
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* En-tête */}
        <div style={styles.header}>
          <div style={styles.logoBox}>
            <i className="fas fa-map" style={{ fontSize: 28, color: colors.blanc }}></i>
          </div>
          <h1 style={styles.title}>SIOTUM</h1>
          <p style={styles.subtitle}>
            Système Intelligent d'Optimisation<br />
            des Transports Urbains — Antananarivo
          </p>
        </div>

        {/* Carte de connexion */}
        <div style={styles.card}>
          {erreur && (
            <div style={styles.error}>
              <i className="fas fa-triangle-exclamation"></i>
              {erreur}
            </div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>
              <i className="fas fa-envelope" style={{ marginRight: 6, fontSize: 11 }}></i>
              Adresse email
            </label>
            <div style={styles.inputWrapper}>
              <span style={styles.inputIcon}>
                <i className="fas fa-envelope"></i>
              </span>
              <input
                style={styles.input}
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="email"
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              <i className="fas fa-lock" style={{ marginRight: 6, fontSize: 11 }}></i>
              Mot de passe
            </label>
            <div style={styles.inputWrapper}>
              <span style={styles.inputIcon}>
                <i className="fas fa-lock"></i>
              </span>
              <input
                style={styles.input}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            style={{
              ...styles.button,
              ...(loading && styles.buttonDisabled),
            }}
            onClick={handleLogin}
            disabled={loading}
          >
            <i className={`fas ${loading ? "fa-spinner fa-spin" : "fa-arrow-right-to-bracket"}`}></i>
            {loading ? "Connexion en cours..." : "Se connecter"}
          </button>

          <div style={styles.divider} />

          <div style={styles.footer}>
            Vous n'avez pas encore de compte ?{" "}
            <Link to="/register" style={styles.link}>
              Créer un compte
            </Link>
          </div>

          <div style={{ ...styles.demoHint, marginTop: 12 }}>
            <i className="fas fa-server" style={{ marginRight: 6, fontSize: 11 }}></i>
            API: {apiUrl}
          </div>
          <div style={styles.demoHint}>
            <i className="fas fa-info-circle" style={{ marginRight: 6, fontSize: 11 }}></i>
            Compte de démonstration : admin@admin.com / admin123
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;