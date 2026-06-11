// App.jsx - Routing principal
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Trajet from "./pages/Trajet";
import Graphe from "./pages/Graphe";
import Trafic from "./pages/Trafic";
import Performances from "./pages/Performances";
import Carte from "./pages/Carte";
import Admin from "./pages/Admin";
import { getToken } from "./api";
import { TripProvider } from "./context/TripContext";

const styles = {
  app: {
    minHeight: "100vh",
    background: "#f8fafc",
    color: "#1e293b",
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
};

// Protection des routes — redirige vers /login si pas connecté
function PrivateRoute({ children }) {
  return getToken() ? children : <Navigate to="/login" />;
}

// Routes publiques — redirige vers / si déjà connecté
function PublicRoute({ children }) {
  return !getToken() ? children : <Navigate to="/" />;
}

function App() {
  return (
    <BrowserRouter>
      <TripProvider>
      <div style={styles.app}>
        <Routes>
          {/* Routes publiques sans Navbar */}
          <Route path="/login" element={
            <PublicRoute><Login /></PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute><Register /></PublicRoute>
          } />

          {/* Routes privées avec Navbar */}
          <Route path="/" element={
            <PrivateRoute>
              <Navbar />
              <Home />
            </PrivateRoute>
          } />
          <Route path="/trajet" element={
            <PrivateRoute>
              <Navbar />
              <Trajet />
            </PrivateRoute>
          } />
          <Route path="/graphe" element={
            <PrivateRoute>
              <Navbar />
              <Graphe />
            </PrivateRoute>
          } />
          <Route path="/trafic" element={
            <PrivateRoute>
              <Navbar />
              <Trafic />
            </PrivateRoute>
          } />
          <Route path="/performances" element={
            <PrivateRoute>
              <Navbar />
              <Performances />
            </PrivateRoute>
          } />
          <Route path="/carte" element={
            <PrivateRoute>
              <Navbar />
              <Carte />
            </PrivateRoute>
          } />
          <Route path="/admin" element={
            <PrivateRoute>
              <Navbar />
              <Admin />
            </PrivateRoute>
          } />
        </Routes>
      </div>
      </TripProvider>
    </BrowserRouter>
  );
}

export default App;