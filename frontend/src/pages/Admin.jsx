import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  adminClearData,
  adminClearTrafic,
  adminDbHealth,
  adminOverview,
  adminBlockUser,
  adminAudit,
  adminDeleteTrajet,
  adminExportCsv,
  adminGetTrafic,
  adminPurgeUser,
  adminReloadGraph,
  adminSetUserRole,
  adminTraficDelete,
  adminTrajets,
  adminUsers,
  fetchMe,
  getQuartiers,
  simulerTraficAvance,
  isAdmin,
} from "../api";

const colors = {
  bleu: "#0f172a",
  blanc: "#ffffff",
  grisClair: "#f3f4f6",
  vert: "#16a34a",
  orange: "#d97706",
  rouge: "#b91c1c",
  texte: "#0f172a",
  texteMuted: "#475569",
  bordure: "#d1d5db",
};

const styles = {
  page: { padding: 24, minHeight: "100vh", backgroundColor: colors.grisClair, fontFamily: "system-ui, sans-serif" },
  title: { fontSize: 24, fontWeight: 700, color: colors.bleu, marginBottom: 6 },
  sub: { color: colors.texteMuted, marginBottom: 16, fontSize: 13 },
  msg: {
    background: "#fef3c7",
    borderLeft: `4px solid ${colors.orange}`,
    padding: "10px 14px",
    borderRadius: 12,
    marginBottom: 16,
    color: "#92400e",
    fontSize: 13,
  },
  row: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginBottom: 16 },
  stat: (border) => ({
    background: colors.blanc,
    border: `1px solid ${border}`,
    borderRadius: 16,
    padding: 18,
    textAlign: "center",
  }),
  statVal: { fontSize: 28, fontWeight: 800, color: colors.bleu },
  statLbl: { fontSize: 12, color: colors.texteMuted, marginTop: 6 },
  card: {
    background: colors.blanc,
    border: `1px solid ${colors.bordure}`,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  cardTitle: { fontWeight: 700, marginBottom: 12, color: colors.bleu },
  buttonPrimary: {
    background: colors.bleu,
    color: colors.blanc,
    border: "none",
    borderRadius: 14,
    padding: "12px 16px",
    fontWeight: 700,
    cursor: "pointer",
  },
  buttonSecondary: {
    background: "#f8fafc",
    color: colors.bleu,
    border: `1px solid ${colors.bordure}`,
    borderRadius: 14,
    padding: "12px 16px",
    fontWeight: 700,
    cursor: "pointer",
  },
  buttonDanger: {
    background: colors.rouge,
    color: colors.blanc,
    border: "none",
    borderRadius: 14,
    padding: "12px 16px",
    fontWeight: 700,
    cursor: "pointer",
  },
  item: { padding: "10px 0", borderBottom: `1px solid ${colors.bordure}` },
  itemTitle: { fontWeight: 600, color: colors.bleu },
  itemMeta: { marginTop: 4, fontSize: 12, color: colors.texteMuted },
  empty: { color: colors.texteMuted, padding: "10px 0" },
};

export default function Admin() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [trajets, setTrajets] = useState([]);
  const [traficActif, setTraficActif] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [msg, setMsg] = useState("");
  const [dbOk, setDbOk] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState([]);
  const [traficSrc, setTraficSrc] = useState("");
  const [traficDest, setTraficDest] = useState("");
  const [traficPoids, setTraficPoids] = useState(5);

  const load = async () => {
    setLoading(true);
    setMsg("");
    const [o, u, t, a, q] = await Promise.all([
      adminOverview(),
      adminUsers(),
      adminTrajets(),
      adminAudit(60),
      getQuartiers(),
    ]);
    const trafic = await adminGetTrafic(100);
    if (q?.quartiers) setNodes(Object.keys(q.quartiers).sort());
    const errors = [o?.erreur, u?.erreur, t?.erreur, a?.erreur, trafic?.erreur].filter(Boolean);
    if (errors.length) setMsg(errors.join(" — "));
    setOverview(o?.erreur ? null : o);
    setUsers(u?.users || []);
    setTrajets(t?.trajets || []);
    setEvents(a?.events || []);
    setTraficActif(trafic?.trafics || []);

    const db = await adminDbHealth();
    if (db?.ok === true) setDbOk(true);
    else if (db?.ok === false) setDbOk(false);
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const me = await fetchMe();
      if (!me || !isAdmin()) {
        navigate("/");
        return;
      }
      setCurrentUser(me);
      await load();
    };
    init();
  }, [navigate]);

  const clearTrafic = async () => {
    const res = await adminClearTrafic();
    if (res?.message) setMsg(res.message);
    if (res?.erreur) setMsg(res.erreur);
    await load();
  };

  const reloadGraph = async () => {
    const res = await adminReloadGraph();
    if (res?.message) setMsg(`${res.message} (${res.quartiers} quartiers)`);
    if (res?.erreur) setMsg(res.erreur);
    await load();
  };

  const clearData = async (tables) => {
    const res = await adminClearData(tables);
    if (res?.message) setMsg(`${res.message} (${(res.cleared || []).join(", ")})`);
    if (res?.erreur) setMsg(res.erreur);
    await load();
  };

  const purgeUser = async (userId) => {
    if (!window.confirm("Supprimer toutes les données de cet utilisateur (trajets, trafic, etc.) ?")) return;
    const res = await adminPurgeUser(userId);
    if (res?.message) setMsg(res.message);
    if (res?.erreur) setMsg(res.erreur);
    await load();
  };

  const toggleBlock = async (userId, nextBlocked) => {
    const action = nextBlocked ? "bloquer" : "débloquer";
    if (!window.confirm(`Voulez-vous ${action} cet utilisateur ?`)) return;
    const res = await adminBlockUser(userId, nextBlocked);
    if (res?.message) setMsg(res.message);
    if (res?.erreur) setMsg(res.erreur);
    await load();
  };

  const changeUserRole = async (userId, nextRole) => {
    const res = await adminSetUserRole(userId, nextRole);
    if (res?.message) setMsg(res.message);
    if (res?.erreur) setMsg(res.erreur);
    await load();
  };

  const deleteTrafic = async (id) => {
    if (!window.confirm("Supprimer cet embouteillage et restaurer la route ?")) return;
    const res = await adminTraficDelete(id);
    if (res?.message) setMsg(res.message);
    if (res?.erreur) setMsg(res.erreur);
    await load();
  };

  const cancelTrajet = async (id) => {
    if (!window.confirm("Annuler ce trajet ?")) return;
    const res = await adminDeleteTrajet(id);
    if (res?.message) setMsg(res.message);
    if (res?.erreur) setMsg(res.erreur);
    await load();
  };

  const simulateTrafic = async () => {
    if (!traficSrc || !traficDest) {
      setMsg("Veuillez sélectionner une source et une destination");
      return;
    }
    const res = await simulerTraficAvance(traficSrc, traficDest, traficPoids);
    if (res?.message) setMsg(`Embouteillage simulé : ${res.message}`);
    if (res?.erreur) setMsg(res.erreur);
    if (res?.alerte) setMsg(`⚠️ ${res.alerte.message}`);
    await load();
  };

  const downloadCsv = async (kind) => {
    const res = await adminExportCsv(kind);
    if (res?.erreur) {
      setMsg(res.erreur);
      return;
    }
    const blob = new Blob([res.text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${kind}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.title}>Espace Admin</div>
        <div style={styles.sub}>Chargement des données admin...</div>
        <div style={styles.empty}>Veuillez patienter un instant.</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={styles.title}>Espace Admin</div>
          <div style={styles.sub}>Monitoring + gestion simple</div>
        </div>
        <button style={styles.buttonSecondary} onClick={load}>
          Rafraîchir
        </button>
      </div>

      {msg ? <div style={styles.msg}>{msg}</div> : null}
      <div style={{ ...styles.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700 }}>Santé</div>
        <div style={{ color: colors.texteMuted, fontWeight: 700 }}>
          DB: {dbOk === null ? "—" : dbOk ? "OK" : "KO"}
        </div>
      </div>

      <div style={styles.row}>
        <div style={styles.stat("#90CAF9")}>
          <div style={styles.statVal}>{overview?.users ?? "—"}</div>
          <div style={styles.statLbl}>Utilisateurs</div>
        </div>
        <div style={styles.stat("#A5D6A7")}>
          <div style={styles.statVal}>{overview?.trajets ?? "—"}</div>
          <div style={styles.statLbl}>Trajets</div>
        </div>
        <div style={styles.stat("#FFCC80")}>
          <div style={styles.statVal}>{overview?.trafics_actifs ?? "—"}</div>
          <div style={styles.statLbl}>Trafics actifs</div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Actions</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={styles.buttonSecondary} onClick={clearTrafic}>
            Désactiver tous les trafics
          </button>
          <button style={styles.buttonSecondary} onClick={reloadGraph}>
            Recharger le graphe
          </button>
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={styles.buttonDanger} onClick={() => clearData(["trajets"])}>
            Vider trajets
          </button>
          <button style={styles.buttonDanger} onClick={() => clearData(["performances"])}>
            Vider performances
          </button>
          <button style={styles.buttonDanger} onClick={() => clearData(["recherches_alternatives"])}>
            Vider recherches alternatives
          </button>
          <button style={styles.buttonDanger} onClick={() => clearData(["trafic"])}>
            Vider trafic
          </button>
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={styles.buttonSecondary} onClick={() => downloadCsv("users")}>
            Export users.csv
          </button>
          <button style={styles.buttonSecondary} onClick={() => downloadCsv("trajets")}>
            Export trajets.csv
          </button>
          <button style={styles.buttonSecondary} onClick={() => downloadCsv("trafic")}>
            Export trafic.csv
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Trajets ({trajets.length})</div>
        {trajets.length === 0 ? (
          <div style={styles.empty}>Aucun trajet.</div>
        ) : (
          trajets.map((t) => (
            <div key={t.id} style={styles.item}>
              <div style={styles.itemTitle}>
                {t.depart} → {t.destination}
              </div>
              <div style={styles.itemMeta}>
                {t.distance} km · {t.etapes} étapes · {t.nom || "—"} ({t.email || "—"}) ·{" "}
                {t.created_at ? new Date(t.created_at).toLocaleString("fr-FR") : "—"}
              </div>
              <button
                style={{
                  ...styles.buttonSecondary,
                  background: "#fee2e2",
                  color: "#b91c1c",
                  border: "1px solid #fecaca",
                  padding: "6px 12px",
                  minWidth: 80,
                  fontSize: 11,
                  marginTop: 6,
                }}
                onClick={() => cancelTrajet(t.id)}
              >
                Annuler
              </button>
            </div>
          ))
        )}
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Simuler un embouteillage</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: colors.texteMuted }}>Source</label>
            <select value={traficSrc} onChange={(e) => setTraficSrc(e.target.value)}
              style={{ width: "100%", minHeight: 42, padding: "10px 12px", borderRadius: 14, border: `1px solid ${colors.bordure}`, background: colors.grisClair, color: colors.texte, fontSize: 14 }}>
              <option value="">Choisir...</option>
              {nodes.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: colors.texteMuted }}>Destination</label>
            <select value={traficDest} onChange={(e) => setTraficDest(e.target.value)}
              style={{ width: "100%", minHeight: 42, padding: "10px 12px", borderRadius: 14, border: `1px solid ${colors.bordure}`, background: colors.grisClair, color: colors.texte, fontSize: 14 }}>
              <option value="">Choisir...</option>
              {nodes.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ width: 100 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: colors.texteMuted }}>Poids</label>
            <input type="number" value={traficPoids} onChange={(e) => setTraficPoids(Number(e.target.value))}
              style={{ width: "100%", minHeight: 42, padding: "10px 12px", borderRadius: 14, border: `1px solid ${colors.bordure}`, background: colors.grisClair, color: colors.texte, fontSize: 14 }} />
          </div>
          <button style={{ ...styles.buttonPrimary, minHeight: 42, alignSelf: "end" }} onClick={simulateTrafic}>
            Simuler
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Trafic actif ({traficActif.length})</div>
        {traficActif.length === 0 ? (
          <div style={styles.empty}>Aucun trafic actif.</div>
        ) : (
          traficActif.map((t) => (
            <div key={t.id} style={styles.item}>
              <div style={styles.itemTitle}>{t.src} → {t.dest}</div>
              <div style={styles.itemMeta}>
                Utilisateur : {t.utilisateur_nom || t.utilisateur_email || "—"} · Poids : {t.poids_original} → {t.poids_actuel} · {new Date(t.created_at).toLocaleString("fr-FR")}
              </div>
              <button style={{ ...styles.buttonSecondary, background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca", padding: "6px 12px", minWidth: 80, fontSize: 11, marginTop: 6 }} onClick={() => deleteTrafic(t.id)}>Supprimer</button>
            </div>
          ))
        )}
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Utilisateurs ({users.length})</div>
        {users.length === 0 ? (
          <div style={styles.empty}>Aucun utilisateur.</div>
        ) : (
          users.map((u) => {
            const isPrimaryAdmin = (u.email || "").toLowerCase() === "admin@admin.com";
            return (
            <div key={u.id} style={styles.item}>
              <div style={styles.itemTitle}>
                {u.nom} {u.is_admin ? "(admin)" : ""}
              </div>
              <div style={styles.itemMeta}>
                {u.email} · Statut: {u.blocked ? "Bloqué" : "Actif"} · Role: {u.is_admin ? "admin" : "user"}
              </div>
              {!u.is_admin && (
                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      style={{
                        ...styles.buttonSecondary,
                        background: u.blocked ? "#dcfce7" : "#fee2e2",
                        color: u.blocked ? "#166534" : "#b91c1c",
                        border: `1px solid ${u.blocked ? "#bbf7d0" : "#fecaca"}`,
                        padding: "10px 12px",
                        minWidth: 120,
                      }}
                      onClick={() => toggleBlock(u.id, !u.blocked)}
                    >
                      {u.blocked ? "Débloquer" : "Bloquer"}
                    </button>
                    <button
                      style={{
                        ...styles.buttonSecondary,
                        background: "#f0f9ff",
                        color: "#0c4a6e",
                        border: "1px solid #bae6fd",
                        padding: "10px 12px",
                        minWidth: 120,
                      }}
                      onClick={() => changeUserRole(u.id, u.role === "admin" ? "user" : "admin")}
                      disabled={currentUser?.id === u.id}
                    >
                      Passer {u.role === "admin" ? "user" : "admin"}
                    </button>
                    <button
                      style={{
                        ...styles.buttonDanger,
                        background: "#fee2e2",
                        color: "#b91c1c",
                        border: "1px solid #fecaca",
                        padding: "10px 12px",
                        minWidth: 120,
                      }}
                      onClick={() => purgeUser(u.id)}
                    >
                      Purger données
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: colors.texteMuted }}>
                      Rôle actuel : {u.role || "user"}
                    </span>
                    <span style={{ fontSize: 12, color: colors.texteMuted }}>
                      Inscrit le :{" "}
                      {u.created_at ? new Date(u.created_at).toLocaleString("fr-FR") : "—"}
                    </span>
                    {currentUser?.id === u.id ? (
                      <span style={{ fontSize: 12, color: colors.texteMuted }}>
                        Vous ne pouvez pas changer votre propre rôle ici.
                      </span>
                    ) : null}
                  </div>
                </div>
              )}
              {u.is_admin && !isPrimaryAdmin && (
                <div style={{ marginTop: 10 }}>
                  <button
                    style={{
                      ...styles.buttonSecondary,
                      background: "#f0f9ff",
                      color: "#0c4a6e",
                      border: "1px solid #bae6fd",
                      padding: "10px 12px",
                      minWidth: 120,
                    }}
                    onClick={() => changeUserRole(u.id, "user")}
                    disabled={currentUser?.id === u.id}
                  >
                    Rétrograder en user
                  </button>
                </div>
              )}
              {u.is_admin && isPrimaryAdmin && (
                <div style={{ marginTop: 10, color: colors.texteMuted, fontSize: 12 }}>
                  Compte admin principal protégé.
                </div>
              )}
            </div>
          );
          })
        )}
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Journal admin</div>
        {events.length === 0 ? (
          <div style={styles.empty}>Aucun événement.</div>
        ) : (
          events.slice(0, 60).map((e) => (
            <div key={e.id} style={styles.item}>
              <div style={styles.itemTitle}>
                {e.action} — {e.email || "admin"}
              </div>
              <div style={styles.itemMeta}>
                {new Date(e.created_at).toLocaleString("fr-FR")}
                {e.payload ? ` · ${JSON.stringify(e.payload)}` : ""}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

