import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import * as Sentry from "@sentry/react";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

// Monitoramento de erro: só liga se VITE_SENTRY_DSN estiver definido (produção).
// Sem a chave, não faz nada, então dev segue igual.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0, // só erros, sem performance monitoring
    // Ignora ruído do navegador interno do Instagram/Facebook (script deles que
    // chama window.webkit.messageHandlers e estoura em certas versões do iOS).
    // Não é bug do Manda; só polui o Sentry.
    ignoreErrors: [
      "window.webkit.messageHandlers",
      "sendDataToNative",
      "sendPageHideMessage",
    ],
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
