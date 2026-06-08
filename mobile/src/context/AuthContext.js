import { createContext, useContext, useEffect, useState } from "react";
import {
  getToken,
  getUser,
  setToken,
  setUser,
  clearSession,
  getMe,
} from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const stored = await getUser();
      if (token && stored) {
        const me = await getMe();
        if (me?.unauthorized) {
          await clearSession();
        } else if (me && !me.erreur) {
          setUserState({ id: me.id, nom: me.nom, email: me.email });
        } else {
          setUserState(stored);
        }
      }
      setLoading(false);
    })();
  }, []);

  const signIn = async (token, userData) => {
    await setToken(token);
    await setUser(userData);
    setUserState(userData);
  };

  const signOut = async () => {
    await clearSession();
    setUserState(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit etre utilise dans AuthProvider");
  return ctx;
};
