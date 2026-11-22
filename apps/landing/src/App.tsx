import { useRef, useState } from "react";
import TrollFace from "./assets/Trollface.png";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "https://analytics-platform-1-isvp.onrender.com";
type Detail = [string, string];

function visitorId(): string {
  try {
    const previous = localStorage.getItem("analytics_visitor_id") || localStorage.getItem("visitor_id");
    if (previous && /^[0-9a-f-]{36}$/i.test(previous)) return previous;
    const id = crypto.randomUUID();
    localStorage.setItem("analytics_visitor_id", id);
    return id;
  } catch { return crypto.randomUUID(); }
}

function platform() {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /CriOS\//.test(ua) ? "Chrome iOS" : /FxiOS\//.test(ua) ? "Firefox iOS" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Outro";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS/iPadOS" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Outro";
  const deviceType = /iPad|Tablet/.test(ua) ? "Tablet" : /Mobi|Android|iPhone/.test(ua) ? "Mobile" : "Desktop";
  return { browser, os, deviceType };
}

function App() {
  const [details, setDetails] = useState<Detail[] | null>(null);
  const registered = useRef(false);

  function showMyData() {
    const info = platform();
    setDetails([
      ["Navegador", info.browser],
      ["Sistema operacional", info.os],
      ["Dispositivo", info.deviceType],
      ["Idioma", navigator.language],
      ["Fuso horário", Intl.DateTimeFormat().resolvedOptions().timeZone],
      ["Resolução", `${screen.width} × ${screen.height}`],
      ["Janela", `${innerWidth} × ${innerHeight}`],
      ["Toques suportados", String(navigator.maxTouchPoints)],
      ["Tema preferido", matchMedia("(prefers-color-scheme: dark)").matches ? "Escuro" : "Claro"],
      ["Núcleos lógicos", String(navigator.hardwareConcurrency || "Indisponível")],
      ["RAM estimada", (navigator as Navigator & { deviceMemory?: number }).deviceMemory != null ? `${(navigator as Navigator & { deviceMemory?: number }).deviceMemory} GB` : "Indisponível"],
    ]);

    // Apenas uma visita por abertura da página, acionada pelo botão.
    if (registered.current) return;
    registered.current = true;
    const startedAt = performance.now();
    const params = new URL(location.href).searchParams;
    void fetch(`${API}/visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: visitorId(),
        language: navigator.language,
        userAgent: navigator.userAgent,
        ...info,
        screenWidth: screen.width,
        screenHeight: screen.height,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        currentUrl: location.origin + location.pathname,
        referrer: document.referrer,
        utmSource: params.get("utm_source"),
        utmMedium: params.get("utm_medium"),
        utmCampaign: params.get("utm_campaign"),
      }),
    }).then(async response => {
      if (!response.ok) return;
      const result: { sessionId?: string } = await response.json();
      if (!result.sessionId) return;
      window.addEventListener("pagehide", () => {
        const body = new Blob([JSON.stringify({ durationMs: Math.min(86400000, Math.round(performance.now() - startedAt)) })], { type: "application/json" });
        navigator.sendBeacon?.(`${API}/visit/${result.sessionId}/end`, body);
      }, { once: true });
    }).catch(() => { /* A visualização dos dados funciona mesmo sem a API. */ });
  }

  return <main className="page">
    <section className="center">
      <img className="troll" src={TrollFace} alt="Trollface" />
      <button className="reveal" onClick={showMyData}>{details ? "Atualizar meus dados" : "Mostrar meus dados"}</button>
      {details && <section className="details" aria-label="Dados do navegador">
        {details.map(([name, value]) => <div className="detail" key={name}><span>{name}</span><strong>{value}</strong></div>)}
      </section>}
      <p className="privacy">Ao mostrar seus dados, uma visita é registrada com informações técnicas e localização aproximada por IP. Não armazenamos o IP bruto. <a href="https://github.com/FelhipeBrito/analytics-platform" target="_blank" rel="noreferrer">Código-fonte</a></p>
    </section>
  </main>;
}

export default App;
