import { useEffect, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "https://analytics-platform-1-isvp.onrender.com";
function getVisitorId(): string {
  try {
    const existing = localStorage.getItem("analytics_visitor_id") || localStorage.getItem("visitor_id");
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem("analytics_visitor_id", id);
    return id;
  } catch { return crypto.randomUUID(); }
}
function platform() {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Outro";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS/iPadOS" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Outro";
  const deviceType = /iPad|Tablet/.test(ua) ? "Tablet" : /Mobi|Android|iPhone/.test(ua) ? "Mobile" : "Desktop";
  return { browser, os, deviceType };
}
function App() {
  const [status, setStatus] = useState("Nenhuma coleta iniciada");
  const [diagnostic, setDiagnostic] = useState(false);
  const [values, setValues] = useState<[string,string][]>([]);
  useEffect(() => {
    // A visita não é enviada antes da ação explícita do visitante.
  }, []);
  function inspect() {
    const p = platform();
    setValues([
      ["Navegador", p.browser], ["Sistema", p.os], ["Dispositivo", p.deviceType],
      ["Idioma", navigator.language], ["Fuso horário", Intl.DateTimeFormat().resolvedOptions().timeZone],
      ["Tela", `${screen.width} × ${screen.height}`],
      ["Janela", `${innerWidth} × ${innerHeight}`],
      ["Toques suportados", String(navigator.maxTouchPoints)],
      ["Tema", matchMedia("(prefers-color-scheme: dark)").matches ? "Escuro" : "Claro"],
      ["CPUs lógicas (se disponível)", String(navigator.hardwareConcurrency || "Não informado")],
      ["Memória estimada (se disponível)", String((navigator as Navigator & {deviceMemory?:number}).deviceMemory ?? "Não informada")],
    ]);
    setDiagnostic(true);
  }
  async function register() {
    setStatus("Registrando visita…");
    const p = platform();
    const u = new URL(location.href);
    try {
      const started = performance.now();
      const response = await fetch(`${API}/visit`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId: getVisitorId(), language: navigator.language, userAgent: navigator.userAgent, ...p,
          screenWidth: screen.width, screenHeight: screen.height,
          viewportWidth: innerWidth, viewportHeight: innerHeight,
          currentUrl: location.origin + location.pathname, referrer: document.referrer,
          utmSource: u.searchParams.get("utm_source"), utmMedium: u.searchParams.get("utm_medium"), utmCampaign: u.searchParams.get("utm_campaign"),
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const { sessionId } = await response.json();
      setStatus("Visita registrada. Nenhum IP bruto é armazenado pela aplicação.");
      if (typeof sessionId === "string") {
        const end = () => {
          const data = JSON.stringify({ durationMs: Math.min(86400000, Math.round(performance.now() - started)) });
          const blob = new Blob([data], { type: "application/json" });
          navigator.sendBeacon?.(`${API}/visit/${sessionId}/end`, blob);
        };
        window.addEventListener("pagehide", end, { once: true });
      }
    } catch { setStatus("Falha na comunicação com a API. Nenhuma confirmação de registro."); }
  }
  return <main className="shell">
    <header><span className="brand">WEB / LAB</span><span className="pill">Experimento educacional</span></header>
    <section className="intro"><p className="eyebrow">DIAGNÓSTICO DO NAVEGADOR</p>
      <h1>O que uma página consegue saber sobre seu navegador?</h1>
      <p>Veja quais características seu navegador disponibiliza. A consulta local não envia informações ao servidor. O registro opcional de visita é uma ação separada.</p>
      <div className="actions"><button onClick={inspect}>Ver meu diagnóstico</button><button className="secondary" onClick={register}>Registrar visita voluntariamente</button></div>
      <p className="status" role="status">{status}</p></section>
    {diagnostic && <section className="results"><h2>Informações disponíveis neste navegador</h2><p>Estes dados são obtidos localmente via JavaScript. Nem todos são precisos ou exclusivos.</p>
      <div className="details">{values.map(([key,value]) => <div key={key}><span>{key}</span><strong>{value}</strong></div>)}</div></section>}
    <footer>Não acessamos seus arquivos, contatos ou histórico. Nenhuma geolocalização precisa é solicitada. A opção de registrar visita envia dados técnicos e permite estimar a localização por IP, sem armazenar o IP bruto. Dados podem estar imprecisos. <a href="https://github.com/FelhipeBrito/analytics-platform" target="_blank" rel="noreferrer">Código-fonte</a></footer>
  </main>;
}
export default App;
