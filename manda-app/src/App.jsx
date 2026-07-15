import { useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import MarketingLayout from "./components/MarketingLayout.jsx";
import Landing from "./pages/Landing.jsx";
import Pricing from "./pages/Pricing.jsx";
import Auth from "./pages/Auth.jsx";
import Dashboard from "./pages/Dashboard.jsx";

// Título da aba por rota. Marca "manda.ai" (lê como "manda aí").
const TITLES = {
  "/": "manda.ai · Propostas que fecham",
  "/precos": "Preços · manda.ai",
  "/entrar": "Entrar · manda.ai",
  "/criar-conta": "Criar conta · manda.ai",
  "/app": "Suas propostas · manda.ai",
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.title = TITLES[location.pathname] || "manda.ai";
  }, [location.pathname]);

  const go = (dest) => {
    if (dest === "signup") navigate("/criar-conta");
    else if (dest === "login") navigate("/entrar");
    else if (dest === "pricing") navigate("/precos");
    else if (dest === "app") navigate("/app");
    else navigate("/");
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  return (
    <Routes>
      <Route element={<MarketingLayout go={go} />}>
        <Route path="/" element={<Landing go={go} />} />
        <Route path="/precos" element={<Pricing go={go} />} />
      </Route>
      <Route path="/entrar" element={<Auth go={go} tab="login" />} />
      <Route path="/criar-conta" element={<Auth go={go} tab="signup" />} />
      <Route path="/app" element={<Dashboard go={go} />} />
    </Routes>
  );
}
