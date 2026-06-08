// api.js - Appels API centralises

const getDefaultApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname || "127.0.0.1";
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    return `${protocol}//${host}:5000`;
  }
  return "http://127.0.0.1:5000";
};

const API = getDefaultApiUrl();
const DEFAULT_TIMEOUT = 30000;

const fetchWithTimeout = async (url, options, timeout = DEFAULT_TIMEOUT) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Requete timeout apres " + timeout + "ms");
    }
    throw error;
  }
};

const parseResponse = async (res) => {
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* corps vide ou non-JSON */
  }
  if (!res.ok) {
    return {
      erreur: data.erreur || `Erreur serveur (${res.status})`,
      unauthorized: res.status === 401,
    };
  }
  return data;
};

const parseText = async (res) => {
  const text = await res.text();
  if (!res.ok) {
    return { erreur: text || `Erreur serveur (${res.status})` };
  }
  return { text };
};

const networkError = (url) => ({
  erreur: `Impossible de joindre le serveur ${url || API}. Vérifiez que le backend tourne sur le port 5000 et que l'URL est correcte.`,
});

// ==================== TOKEN ====================

export const getToken = () => localStorage.getItem("token");
export const setToken = (token) => localStorage.setItem("token", token);
export const removeToken = () => localStorage.removeItem("token");

export const getUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

export const setUser = (user) => localStorage.setItem("user", JSON.stringify(user));
export const removeUser = () => localStorage.removeItem("user");

export const clearSession = () => {
  removeToken();
  removeUser();
};

const authHeaders = () => {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

// ==================== AUTH ====================

export const register = async (nom, email, password) => {
  try {
    const res = await fetchWithTimeout(`${API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, email, password }),
    });
    return await parseResponse(res);
  } catch {
    return networkError(API);
  }
};

export const login = async (email, password) => {
  try {
    const res = await fetchWithTimeout(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return await parseResponse(res);
  } catch {
    return networkError(API);
  }
};

export const logout = () => clearSession();

export const isAdmin = () => {
  const u = getUser();
  const role = (u?.role || "").toLowerCase();
  const email = (u?.email || "").toLowerCase();
  return role === "admin" || email === "admin@admin.com";
};

// ==================== GRAPHE ====================

export const getStats = async () => {
  try {
    const res = await fetchWithTimeout(`${API}/stats`);
    return await parseResponse(res);
  } catch {
    return { quartiers: 0, connexions: 0 };
  }
};

export const getQuartiers = async () => {
  try {
    const res = await fetchWithTimeout(`${API}/quartiers`);
    const data = await parseResponse(res);
    if (data.erreur) return { quartiers: {}, connexions: [] };
    return data;
  } catch {
    return { quartiers: {}, connexions: [] };
  }
};

/** Liste triee — meme source que la carte (tous les quartiers Antananarivo). */
export const getQuartiersList = async () => {
  const data = await getQuartiers();
  return Object.keys(data.quartiers || {}).sort((a, b) =>
    a.localeCompare(b, "fr", { sensitivity: "base" })
  );
};

export const getNodes = async () => {
  try {
    const res = await fetchWithTimeout(`${API}/nodes`);
    const data = await parseResponse(res);
    if (data.nodes?.length) return data.nodes;
  } catch {
    /* fallback */
  }
  return getQuartiersList();
};

// ==================== TRAJETS ====================

export const calculerChemin = async (depart, destination) => {
  try {
    const res = await fetchWithTimeout(`${API}/chemin`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ depart, destination }),
    });
    const data = await parseResponse(res);
    if (data.unauthorized) clearSession();
    return data;
  } catch {
    return { erreur: "Erreur de connexion au serveur" };
  }
};

export const getCheminsAlternatifs = async (depart, destination, routeEmbouteillee = null) => {
  try {
    const res = await fetchWithTimeout(`${API}/chemin/alternatifs`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ depart, destination, route_embouteillee: routeEmbouteillee, k: 3 }),
    });
    const data = await parseResponse(res);
    if (data.unauthorized) clearSession();
    if (data.erreur) throw new Error(data.erreur);
    return data;
  } catch {
    const simpleResult = await calculerChemin(depart, destination);
    if (simpleResult.chemin) {
      return { chemins: [simpleResult], nb_chemins: 1 };
    }
    return { erreur: "Erreur de connexion au serveur" };
  }
};

export const getHistorique = async () => {
  try {
    const res = await fetchWithTimeout(`${API}/historique`, { headers: authHeaders() });
    const data = await parseResponse(res);
    if (data.unauthorized) clearSession();
    if (data.erreur) return { trajets: [] };
    return data;
  } catch {
    return { trajets: [] };
  }
};

// ==================== PERFORMANCES ====================

export const getPerformances = async (depart, destination) => {
  try {
    const res = await fetchWithTimeout(`${API}/performances`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ depart, destination }),
    });
    const data = await parseResponse(res);
    if (data.unauthorized) clearSession();
    return data;
  } catch {
    return { erreur: "Erreur de connexion au serveur" };
  }
};

// ==================== TRAFIC ====================

export const simulerTrafic = async (src, dest, poids) => {
  try {
    const res = await fetchWithTimeout(`${API}/trafic`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ src, dest, poids: parseFloat(poids) }),
    });
    const data = await parseResponse(res);
    if (data.unauthorized) clearSession();
    return data;
  } catch {
    return { erreur: "Erreur de connexion au serveur" };
  }
};

export const getTraficActif = async () => {
  try {
    const res = await fetchWithTimeout(`${API}/trafic/actif`, {
      method: "GET",
      headers: authHeaders(),
    });
    const data = await parseResponse(res);
    if (data.unauthorized) clearSession();
    return data;
  } catch {
    return { trafics: [] };
  }
};

export const simulerTraficAvance = async (src, dest, poids, depart = null, destination = null) => {
  try {
    const body = { src, dest, poids: parseFloat(poids) };
    if (depart && destination) {
      body.depart = depart;
      body.destination = destination;
    }
    const res = await fetchWithTimeout(`${API}/trafic/simuler-avance`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await parseResponse(res);
    if (data.unauthorized) clearSession();
    return data;
  } catch {
    return { erreur: "Erreur de connexion au serveur" };
  }
};

export const resetTrafic = async (src, dest) => {
  try {
    const res = await fetchWithTimeout(`${API}/trafic/reset`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ src, dest }),
    });
    const data = await parseResponse(res);
    if (data.unauthorized) clearSession();
    return data;
  } catch {
    return { erreur: "Erreur de connexion au serveur" };
  }
};

// ==================== ITINERAIRE ROUTIER ====================

export const getItineraireRoutier = async (depart, destination) => {
  try {
    const res = await fetchWithTimeout(`${API}/itineraire`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ depart, destination }),
    });
    const data = await parseResponse(res);
    if (data.unauthorized) clearSession();
    return data;
  } catch {
    return { erreur: "Erreur de connexion au serveur (OSRM ou backend)" };
  }
};

// ==================== ADMIN ====================

export const adminOverview = async () => {
  try {
    const res = await fetchWithTimeout(`${API}/admin/overview`, { headers: authHeaders() });
    const data = await parseResponse(res);
    if (data.unauthorized) clearSession();
    return data;
  } catch {
    return { erreur: "Erreur de connexion au serveur" };
  }
};

export const adminUsers = async () => {
  try {
    const res = await fetchWithTimeout(`${API}/admin/users`, { headers: authHeaders() });
    const data = await parseResponse(res);
    if (data.unauthorized) clearSession();
    return data;
  } catch {
    return { erreur: "Erreur de connexion au serveur" };
  }
};

export const adminTrajets = async () => {
  try {
    const res = await fetchWithTimeout(`${API}/admin/trajets`, { headers: authHeaders() });
    const data = await parseResponse(res);
    if (data.unauthorized) clearSession();
    return data;
  } catch {
    return { erreur: "Erreur de connexion au serveur" };
  }
};

export const adminClearTrafic = async () => {
  try {
    const res = await fetchWithTimeout(`${API}/admin/trafic/clear`, {
      method: "POST",
      headers: authHeaders(),
    });
    const data = await parseResponse(res);
    if (data.unauthorized) clearSession();
    return data;
  } catch {
    return { erreur: "Erreur de connexion au serveur" };
  }
};

export const adminReloadGraph = async () => {
  try {
    const res = await fetchWithTimeout(`${API}/admin/graph/reload`, {
      method: "POST",
      headers: authHeaders(),
    });
    const data = await parseResponse(res);
    if (data.unauthorized) clearSession();
    return data;
  } catch {
    return { erreur: "Erreur de connexion au serveur" };
  }
};

export const adminDbHealth = async () => {
  try {
    const res = await fetchWithTimeout(`${API}/admin/db/health`, { headers: authHeaders() });
    const data = await parseResponse(res);
    if (data.unauthorized) clearSession();
    return data;
  } catch {
    return { erreur: "Erreur de connexion au serveur" };
  }
};

export const adminClearData = async (tables = []) => {
  try {
    const res = await fetchWithTimeout(`${API}/admin/data/clear`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ tables }),
    });
    const data = await parseResponse(res);
    if (data.unauthorized) clearSession();
    return data;
  } catch {
    return { erreur: "Erreur de connexion au serveur" };
  }
};

export const adminPurgeUser = async (userId) => {
  try {
    const res = await fetchWithTimeout(`${API}/admin/users/${userId}/purge`, {
      method: "POST",
      headers: authHeaders(),
    });
    const data = await parseResponse(res);
    if (data.unauthorized) clearSession();
    return data;
  } catch {
    return { erreur: "Erreur de connexion au serveur" };
  }
};

export const adminTraficDelete = async (id) => {
  try {
    const res = await fetchWithTimeout(`${API}/admin/trafic/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    const data = await parseResponse(res);
    if (data.unauthorized) clearSession();
    return data;
  } catch {
    return { erreur: "Erreur de connexion au serveur" };
  }
};

export const adminBlockUser = async (userId, blocked) => {
  try {
    const res = await fetchWithTimeout(`${API}/admin/users/${userId}/block`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ blocked: !!blocked }),
    });
    const data = await parseResponse(res);
    if (data.unauthorized) clearSession();
    return data;
  } catch {
    return { erreur: "Erreur de connexion au serveur" };
  }
};

export const adminSetUserRole = async (userId, role) => {
  try {
    const res = await fetchWithTimeout(`${API}/admin/users/${userId}/role`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ role }),
    });
    const data = await parseResponse(res);
    if (data.unauthorized) clearSession();
    return data;
  } catch {
    return { erreur: "Erreur de connexion au serveur" };
  }
};

export const adminAudit = async (limit = 50) => {
  try {
    const res = await fetchWithTimeout(`${API}/admin/audit?limit=${encodeURIComponent(limit)}`, {
      headers: authHeaders(),
    });
    const data = await parseResponse(res);
    if (data.unauthorized) clearSession();
    return data;
  } catch {
    return { erreur: "Erreur de connexion au serveur" };
  }
};

export const adminExportCsv = async (kind) => {
  try {
    const res = await fetchWithTimeout(`${API}/admin/export/${kind}.csv`, {
      headers: authHeaders(),
    });
    const out = await parseText(res);
    if (out?.unauthorized) clearSession();
    return out;
  } catch {
    return { erreur: "Erreur de connexion au serveur" };
  }
};
