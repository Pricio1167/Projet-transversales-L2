import { createContext, useContext, useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "siotum_trip";

const TripContext = createContext(null);

export const estimateDuree = (distanceKm) =>
  Math.max(1, Math.round((Number(distanceKm) / 30) * 60));

const loadStored = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export function TripProvider({ children }) {
  const stored = loadStored();
  const [depart, setDepartState] = useState(stored.depart || "");
  const [destination, setDestinationState] = useState(stored.destination || "");
  const [cheminsGraph, setCheminsGraph] = useState(stored.cheminsGraph || []);
  const [resultatGraph, setResultatGraph] = useState(stored.resultatGraph || null);
  const [conseil, setConseil] = useState(stored.conseil || "");
  const [alerte, setAlerte] = useState(stored.alerte || null);
  const [traficRoute, setTraficRoute] = useState(stored.traficRoute || null);

  useEffect(() => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        depart,
        destination,
        cheminsGraph,
        resultatGraph,
        conseil,
        alerte,
        traficRoute,
      })
    );
  }, [depart, destination, cheminsGraph, resultatGraph, conseil, alerte, traficRoute]);

  const setDepart = useCallback((v) => setDepartState(v), []);
  const setDestination = useCallback((v) => setDestinationState(v), []);

  const setTripPoints = useCallback((dep, dest) => {
    if (dep !== undefined) setDepartState(dep);
    if (dest !== undefined) setDestinationState(dest);
  }, []);

  const setGraphResults = useCallback((data) => {
    if (!data) {
      setCheminsGraph([]);
      setResultatGraph(null);
      setConseil("");
      setAlerte(null);
      return;
    }
    const chemins = data.chemins || [];
    setCheminsGraph(chemins);
    setResultatGraph(chemins[0] || null);
    setConseil(data.conseil || data.recommandation?.message || "");
    setAlerte(data.alerte || null);
  }, []);

  const resetTrip = useCallback(() => {
    setDepartState("");
    setDestinationState("");
    setCheminsGraph([]);
    setResultatGraph(null);
    setConseil("");
    setAlerte(null);
    setTraficRoute(null);
  }, []);

  return (
    <TripContext.Provider
      value={{
        depart,
        destination,
        setDepart,
        setDestination,
        setTripPoints,
        cheminsGraph,
        resultatGraph,
        setGraphResults,
        conseil,
        alerte,
        traficRoute,
        setTraficRoute,
        resetTrip,
      }}
    >
      {children}
    </TripContext.Provider>
  );
}

export const useTrip = () => {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrip doit etre utilise dans TripProvider");
  return ctx;
};
