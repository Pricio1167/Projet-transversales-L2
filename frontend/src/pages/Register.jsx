// pages/Register.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register, setToken, setUser } from "../api";
import { User, Mail, Lock, UserPlus, AlertCircle, Map } from "lucide-react";

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f8fafc",
    padding: 20,
  },
  container: {
    width: "100%",
    maxWidth: 420,
  },
  header: {
    textAlign: "center",
    marginBottom: 32,
  },
  logoBox: {
    width: 56,
    height: 56,
    background: "#2563eb",
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "#1e293b",
    margin: "0 0 6px",
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    margin: 0,
    lineHeight: 1.5,
  },
  card: {
    background: "#ffffff",
    borderRadius: 16,
    padding: 32,
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  label: {
    display: "block",
    marginBottom: 6,
    color: "#374151",
    fontSize: 13,
    fontWeight: 600,
  },
  inputWrapper: {
    position: "relative",
    marginBottom: 16,
  },
  inputIcon: {
    position: "absolute",
    left: 12,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#94a3b8",
  },
  input: {
    width: "100%",
    padding: "11px 12px 11px 38px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    color: "#1e293b",
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.15s",
  },
  btn: {
    width: "100%",
    padding: "12px",
    borderRadius: 8,
    border: "none",
    background: "#2563eb",
    color: "white",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 8,
    marginBottom: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "background 0.15s",
  },
  error: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 8,
    padding: "10px 14px",
    color: "#ef4444",
    fontSize: 13,
    marginBottom: 16,
  },
  divider: {
    borderTop: "1px solid #e2e8f0",
    margin: "20px 0",
  },
  footer: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 13,
  },
  linkA: {
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: 600,
  },
};

function Register() {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async () => {
    setErreur("");

    if (!nom || !email || !password || !confirm) {
      setErreur("Tous les champs sont requis");
      return;
    }
    if (password !== confirm) {
      setErreur("Les mots de passe ne correspondent pas");
      return;
    }
    if (password.length < 6) {
      setErreur("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);
    const data = await register(nom, email, password);
    if (data.erreur) {
      setErreur(data.erreur);
    } else {
      setToken(data.token);
      setUser(data.user);
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logoBox}>
            <Map size={26} color="white" />
          </div>
          <h1 style={styles.title}>Créer un compte</h1>
          <p style={styles.subtitle}>
            Rejoignez SIOTUM — Antananarivo
          </p>
        </div>

        {/* Card */}
        <div style={styles.card}>
          {erreur && (
            <div style={styles.error}>
              <AlertCircle size={15} />
              {erreur}
            </div>
          )}

          <label style={styles.label}>Nom complet</label>
          <div style={styles.inputWrapper}>
            <div style={styles.inputIcon}>
              <User size={15} />
            </div>
            <input
              style={styles.input}
              type="text"
              placeholder="Votre nom complet"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
            />
          </div>

          <label style={styles.label}>Adresse email</label>
          <div style={styles.inputWrapper}>
            <div style={styles.inputIcon}>
              <Mail size={15} />
            </div>
            <input
              style={styles.input}
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <label style={styles.label}>Mot de passe</label>
          <div style={styles.inputWrapper}>
            <div style={styles.inputIcon}>
              <Lock size={15} />
            </div>
            <input
              style={styles.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <label style={styles.label}>Confirmer le mot de passe</label>
          <div style={styles.inputWrapper}>
            <div style={styles.inputIcon}>
              <Lock size={15} />
            </div>
            <input
              style={styles.input}
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          <button style={styles.btn} onClick={handleRegister} disabled={loading}>
            <UserPlus size={16} />
            {loading ? "Inscription en cours..." : "Créer mon compte"}
          </button>

          <div style={styles.divider} />

          <div style={styles.footer}>
            Déjà un compte ?{" "}
            <Link to="/login" style={styles.linkA}>
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;