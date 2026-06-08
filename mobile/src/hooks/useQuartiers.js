import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { getQuartiers } from "../api";

/** Charge la liste et les coords des quartiers (meme source que la carte web). */
export default function useQuartiers() {
  const [quartiersList, setQuartiersList] = useState([]);
  const [quartiers, setQuartiers] = useState({});
  const [connexions, setConnexions] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getQuartiers();
    const coords = data.quartiers || {};
    setQuartiers(coords);
    setQuartiersList(
      Object.keys(coords).sort((a, b) =>
        a.localeCompare(b, "fr", { sensitivity: "base" })
      )
    );
    setConnexions((data.connexions || []).length);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { quartiersList, quartiers, connexions, loading, reload: load };
}
