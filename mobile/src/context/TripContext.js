import { createContext, useContext, useState, useCallback } from "react";

const TripContext = createContext(null);

/** Estime la durée en minutes (vitesse moyenne ~30 km/h en ville). */
export const estimateDuree = (distanceKm) =>
  Math.max(1, Math.round((Number(distanceKm) / 30) * 60));

export function TripProvider({ children }) {
  const [depart, setDepart] = useState("");
  const [destination, setDestination] = useState("");
  const [cheminsGraph, setCheminsGraph] = useState([]);
  const [resultatGraph, setResultatGraph] = useState(null);
  const [conseil, setConseil] = useState("");
  const [alerte, setAlerte] = useState(null);
  const [traficRoute, setTraficRoute] = useState(null);

  const setTripPoints = useCallback((dep, dest) => {
    if (dep !== undefined) setDepart(dep);
    if (dest !== undefined) setDestination(dest);
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
    setDepart("");
    setDestination("");
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
