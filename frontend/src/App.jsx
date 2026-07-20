import { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import MarketingLayout from "./components/MarketingLayout.jsx";
import Landing from "./pages/Landing.jsx";
import Pricing from "./pages/Pricing.jsx";
import Auth from "./pages/Auth.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import PublicProposal from "./pages/PublicProposal.jsx";
import Terms from "./pages/Terms.jsx";
import Privacy from "./pages/Privacy.jsx";
import NotFound from "./pages/NotFound.jsx";
import { getToken } from "./lib/api.js";

// Protege rotas que exigem login. Sem token, manda pro /entrar.
function RequireAuth({ children }) {
  return getToken() ? children : <Navigate to="/entrar" replace />;
}

// Título da aba por rota. Marca "Manda" (lê como "manda aí").
const TITLES = {
  "/": "Manda · Propostas que fecham",
  "/precos": "Preços · Manda",
  "/entrar": "Entrar · Manda",
  "/criar-conta": "Criar conta · Manda",
  "/app": "Suas propostas · Manda",
  "/termos": "Termos de Uso · Manda",
  "/privacidade": "Política de Privacidade · Manda",
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.title = TITLES[location.pathname] || "Manda";
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
        <Route path="/termos" element={<Terms />} />
        <Route path="/privacidade" element={<Privacy />} />
      </Route>
      <Route path="/entrar" element={<Auth go={go} tab="login" />} />
      <Route path="/criar-conta" element={<Auth go={go} tab="signup" />} />
      <Route path="/app" element={<RequireAuth><Dashboard go={go} /></RequireAuth>} />
      <Route path="/p/:token" element={<PublicProposal />} />
      <Route path="*" element={<NotFound go={go} />} />
    </Routes>
  );
}
