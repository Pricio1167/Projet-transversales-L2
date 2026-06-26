import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const DEFAULT_TIMEOUT = 30000;
const API_URL_KEY = "api_url_override";
const TOKEN_KEY = "token";
const USER_KEY = "user";

const getExpoHostApiUrl = () => {
  const hostUri =
    Constants?.expoConfig?.hostUri ||
    Constants?.manifest2?.extra?.expoClient?.hostUri ||
    Constants?.manifest?.debuggerHost;

  if (!hostUri) return null;
  const host = hostUri.split(":")[0];
  if (!host || host === "127.0.0.1" || host === "localhost") return null;
  return `http://${host}:5000`;
};

const defaultApiUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
  }

  const expoHost = getExpoHostApiUrl();
  if (expoHost) return expoHost;

  if (Platform.OS === "android") {
    return "http://10.0.2.2:5000";
  }
  return "http://127.0.0.1:5000";
};

const resolveApiUrl = async () => {
  const override = await AsyncStorage.getItem(API_URL_KEY);
  if (override?.trim()) return override.trim().replace(/\/$/, "");
  return defaultApiUrl();
};

export const getApiUrl = () => defaultApiUrl();
export const getStoredApiUrl = () => resolveApiUrl();

export const setStoredApiUrl = async (url) => {
  const cleaned = url?.trim().replace(/\/$/, "");
  if (cleaned) await AsyncStorage.setItem(API_URL_KEY, cleaned);
  else await AsyncStorage.removeItem(API_URL_KEY);
};

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
      throw new Error(`Requete timeout apres ${timeout}ms`);
    }
    throw error;
  }
};

const parseResponse = async (res) => {
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* corps vide */
  }
  if (!res.ok) {
    return {
      erreur: data.erreur || `Erreur serveur (${res.status})`,
      unauthorized: res.status === 401,
    };
  }
  return data;
};

const parseTextResponse = async (res) => {
  const text = await res.text();
  if (!res.ok) {
    return { erreur: text || `Erreur serveur (${res.status})` };
  }
  return { text };
};

export const getToken = async () => AsyncStorage.getItem(TOKEN_KEY);
export const setToken = async (token) => AsyncStorage.setItem(TOKEN_KEY, token);
export const removeToken = async () => AsyncStorage.removeItem(TOKEN_KEY);

export const getUser = async () => {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const setUser = async (user) =>
  AsyncStorage.setItem(USER_KEY, JSON.stringify(user));

export const clearSession = async () => {
  await removeToken();
  await AsyncStorage.removeItem(USER_KEY);
};

export const logout = clearSession;

const authHeaders = async () => {
  const token = await getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const networkError = () => ({
  erreur:
    "Impossible de joindre le serveur. Verifiez le backend et l'URL dans Parametres.",
});

export const checkServer = async (timeoutMs = 8000) => {
  try {
    // Try a few common dev backend addresses.
    // If we find a working one and the user didn't set an override,
    // we persist it so the rest of the app can use it immediately.
    const override = await AsyncStorage.getItem(API_URL_KEY);
    const hasOverride = !!override?.trim();
    const candidates = [];

    if (process.env.EXPO_PUBLIC_API_URL) {
      candidates.push(
        process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "")
      );
    }
    if (hasOverride) {
      candidates.push(override.replace(/\/$/, ""));
    }

    // Platform defaults
    candidates.push(defaultApiUrl().replace(/\/$/, ""));
    const expoHost = getExpoHostApiUrl();
    if (expoHost) {
      candidates.push(expoHost.replace(/\/$/, ""));
    }

    // Common fallback used in this project
    candidates.push("http://192.168.1.42:5000");

    const uniqueBases = [...new Set(candidates)].filter(Boolean);

    for (const base of uniqueBases) {
      try {
        const res = await fetchWithTimeout(`${base}/health`, {}, timeoutMs);
        if (!res.ok) continue;
        const data = await res.json();
        const ok = data.status === "ok";
        if (!ok) continue;

        // Persist auto-discovered URL for later calls
        // (only if the user didn't set an explicit override).
        if (!hasOverride) {
          await setStoredApiUrl(base);
        }

        return {
          ok: true,
          url: base,
          quartiers: data.quartiers || 0,
          connexions: data.connexions || 0,
        };
      } catch {
        // Try next candidate
      }
    }

    return { ok: false, url: uniqueBases[0] };
  } catch {
    return { ok: false, url: await resolveApiUrl() };
  }
};

export const getStats = async () => {
  try {
    const base = await resolveApiUrl();
    const res = await fetchWithTimeout(`${base}/stats`, {}, 8000);
    return await parseResponse(res);
  } catch {
    return { quartiers: 0, connexions: 0, graphe_connexe: false };
  }
};

export const getMe = async () => {
  try {
    const res = await fetchWithTimeout(`${await resolveApiUrl()}/me`, {
      headers: await authHeaders(),
    });
    return await parseResponse(res);
  } catch {
    return null;
  }
};

export const fetchMe = async () => {
  const data = await getMe();
  if (data?.unauthorized) {
    await clearSession();
    return null;
  }
  if (data?.erreur) return null;
  if (data) await setUser(data);
  return data;
};

export const isAdmin = async () => {
  const u = await getUser();
  const role = (u?.role || "").toLowerCase();
  const email = (u?.email || "").toLowerCase();
  return role === "admin" || email === "admin@admin.com" || !!u?.is_admin;
};

export const register = async (nom, email, password) => {
  try {
    const res = await fetchWithTimeout(`${await resolveApiUrl()}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, email, password }),
    });
    return await parseResponse(res);
  } catch {
    return networkError();
  }
};

export const login = async (email, password) => {
  try {
    const res = await fetchWithTimeout(`${await resolveApiUrl()}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return await parseResponse(res);
  } catch {
    return networkError();
  }
};

export const getQuartiers = async () => {
  try {
    const res = await fetchWithTimeout(`${await resolveApiUrl()}/quartiers`);
    const data = await parseResponse(res);
    if (data.erreur) return { quartiers: {}, connexions: [] };
    return data;
  } catch {
    return { quartiers: {}, connexions: [] };
  }
};

export const getQuartiersList = async () => {
  const data = await getQuartiers();
  return Object.keys(data.quartiers || {}).sort((a, b) =>
    a.localeCompare(b, "fr", { sensitivity: "base" })
  );
};

export const getNodes = async () => {
  try {
    const res = await fetchWithTimeout(`${await resolveApiUrl()}/nodes`);
    const data = await parseResponse(res);
    if (data.nodes?.length) return data.nodes;
  } catch {
    /* fallback */
  }
  return getQuartiersList();
};

export const calculerChemin = async (depart, destination) => {
  try {
    const res = await fetchWithTimeout(`${await resolveApiUrl()}/chemin`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ depart, destination }),
    });
    return await parseResponse(res);
  } catch {
    return networkError();
  }
};

export const getCheminsAlternatifs = async (
  depart,
  destination,
  routeEmbouteillee = null
) => {
  try {
    const res = await fetchWithTimeout(
      `${await resolveApiUrl()}/chemin/alternatifs`,
      {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          depart,
          destination,
          route_embouteillee: routeEmbouteillee,
          k: 3,
        }),
      }
    );
    const data = await parseResponse(res);
    if (data.erreur) return data;
    return data;
  } catch {
    const simpleResult = await calculerChemin(depart, destination);
    if (simpleResult.chemin) {
      return { chemins: [simpleResult], nb_chemins: 1 };
    }
    return networkError();
  }
};

/**
 * Calcule la geometrie routiere reelle (OSRM) pour une liste de quartiers (waypoints).
 * Retourne { chemin: [[lat,lon],...], distance, duree } ou null si OSRM indisponible.
 */
export const getItineraireWaypoints = async (quartiersList) => {
  if (!quartiersList || quartiersList.length < 2) return null;
  try {
    const res = await fetchWithTimeout(
      `${await resolveApiUrl()}/itineraire/waypoints`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quartiers: quartiersList }),
      },
      8000
    );
    const data = await parseResponse(res);
    if (data.erreur || data.fallback) return null;
    return data;
  } catch {
    return null;
  }
};

export const getHistorique = async () => {
  try {
    const res = await fetchWithTimeout(`${await resolveApiUrl()}/historique`, {
      headers: await authHeaders(),
    });
    const data = await parseResponse(res);
    if (data.erreur) return { trajets: [] };
    return data;
  } catch {
    return { trajets: [] };
  }
};

export const getPerformances = async (depart, destination) => {
  try {
    const res = await fetchWithTimeout(`${await resolveApiUrl()}/performances`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ depart, destination }),
    });
    return await parseResponse(res);
  } catch {
    return networkError();
  }
};

export const simulerTrafic = async (src, dest, poids) => {
  try {
    const res = await fetchWithTimeout(`${await resolveApiUrl()}/trafic`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ src, dest, poids: parseFloat(poids) }),
    });
    return await parseResponse(res);
  } catch {
    return networkError();
  }
};

export const simulerTraficAvance = async (src, dest, poids, depart = null, destination = null) => {
  try {
    const body = { src, dest, poids: parseFloat(poids) };
    if (depart && destination) {
      body.depart = depart;
      body.destination = destination;
    }
    const res = await fetchWithTimeout(`${await resolveApiUrl()}/trafic/simuler-avance`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    return await parseResponse(res);
  } catch {
    return networkError();
  }
};

export const resetTrafic = async (src, dest) => {
  try {
    const res = await fetchWithTimeout(`${await resolveApiUrl()}/trafic/reset`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ src, dest }),
    });
    return await parseResponse(res);
  } catch {
    return networkError();
  }
};

export const getTraficActif = async () => {
  try {
    const res = await fetchWithTimeout(`${await resolveApiUrl()}/trafic/actif`, {
      headers: await authHeaders(),
    });
    const data = await parseResponse(res);
    if (data.erreur) return { trafics: [] };
    return data;
  } catch {
    return { trafics: [] };
  }
};

export const getItineraireRoutier = async (depart, destination) => {
  try {
    const res = await fetchWithTimeout(`${await resolveApiUrl()}/itineraire`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ depart, destination }),
    });
    return await parseResponse(res);
  } catch {
    return networkError();
  }
};

// ==================== ADMIN ====================

export const adminOverview = async () => {
  try {
    const res = await fetchWithTimeout(`${await resolveApiUrl()}/admin/overview`, {
      headers: await authHeaders(),
    });
    return await parseResponse(res);
  } catch {
    return networkError();
  }
};

export const adminUsers = async () => {
  try {
    const res = await fetchWithTimeout(`${await resolveApiUrl()}/admin/users`, {
      headers: await authHeaders(),
    });
    return await parseResponse(res);
  } catch {
    return networkError();
  }
};

export const adminTrajets = async () => {
  try {
    const res = await fetchWithTimeout(`${await resolveApiUrl()}/admin/trajets`, {
      headers: await authHeaders(),
    });
    return await parseResponse(res);
  } catch {
    return networkError();
  }
};

export const adminClearTrafic = async () => {
  try {
    const res = await fetchWithTimeout(`${await resolveApiUrl()}/admin/trafic/clear`, {
      method: "POST",
      headers: await authHeaders(),
    });
    return await parseResponse(res);
  } catch {
    return networkError();
  }
};

export const adminReloadGraph = async () => {
  try {
    const res = await fetchWithTimeout(`${await resolveApiUrl()}/admin/graph/reload`, {
      method: "POST",
      headers: await authHeaders(),
    });
    return await parseResponse(res);
  } catch {
    return networkError();
  }
};

export const adminDbHealth = async () => {
  try {
    const res = await fetchWithTimeout(`${await resolveApiUrl()}/admin/db/health`, {
      headers: await authHeaders(),
    });
    return await parseResponse(res);
  } catch {
    return networkError();
  }
};

export const adminClearData = async (tables = []) => {
  try {
    const res = await fetchWithTimeout(`${await resolveApiUrl()}/admin/data/clear`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ tables }),
    });
    return await parseResponse(res);
  } catch {
    return networkError();
  }
};

export const adminPurgeUser = async (userId) => {
  try {
    const res = await fetchWithTimeout(
      `${await resolveApiUrl()}/admin/users/${userId}/purge`,
      { method: "POST", headers: await authHeaders() }
    );
    return await parseResponse(res);
  } catch {
    return networkError();
  }
};

export const adminBlockUser = async (userId, blocked) => {
  try {
    const res = await fetchWithTimeout(
      `${await resolveApiUrl()}/admin/users/${userId}/block`,
      {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ blocked: !!blocked }),
      }
    );
    return await parseResponse(res);
  } catch {
    return networkError();
  }
};

export const adminAudit = async (limit = 50) => {
  try {
    const res = await fetchWithTimeout(`${await resolveApiUrl()}/admin/audit?limit=${limit}`, {
      headers: await authHeaders(),
    });
    return await parseResponse(res);
  } catch {
    return networkError();
  }
};

export const adminExportCsv = async (kind) => {
  try {
    const res = await fetchWithTimeout(`${await resolveApiUrl()}/admin/export/${kind}.csv`, {
      headers: await authHeaders(),
    });
    return await parseTextResponse(res);
  } catch {
    return networkError();
  }
};

export const adminTraficDelete = async (id) => {
  try {
    const res = await fetchWithTimeout(`${await resolveApiUrl()}/admin/trafic/${id}`, {
      method: "DELETE",
      headers: await authHeaders(),
    });
    return await parseResponse(res);
  } catch {
    return networkError();
  }
};

export const adminSetUserRole = async (userId, role) => {
  try {
    const res = await fetchWithTimeout(`${await resolveApiUrl()}/admin/users/${userId}/role`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ role }),
    });
    return await parseResponse(res);
  } catch {
    return networkError();
  }
};
