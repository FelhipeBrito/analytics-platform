import { useState } from "react";
import "./App.css";
type Session = { id:string; startedAt:string; country:string|null; region:string|null; city:string|null; browser:string|null; os:string|null; deviceType:string|null; language:string|null; durationMs:number|null; utmSource:string|null; referrer:string|null };
type Stats = { visitors:number; sessions:number; mobile:number; desktop:number; countries:{name:string;count:number}[]; recent:Session[] };
const API = import.meta.env.VITE_API_URL || "https://analytics-platform-1-isvp.onrender.com";
function App() {
  const [token,setToken] = useState("");
  const [stats,setStats] = useState<Stats|null>(null);
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(false);
  async function load() {
    setLoading(true);setError("");
    try {
      const response = await fetch(`${API}/stats`, { headers:{Authorization:`Bearer ${token}`},cache:"no-store" });
      if (!response.ok) throw new Error(response.status===401?"Token inválido ou ausente":response.status===503?"Configure DASHBOARD_TOKEN no servidor":`Falha HTTP ${response.status}`);
      const data = await response.json() as Stats;
      setStats(data);
    } catch(e) {setStats(null);setError(e instanceof Error?e.message:"Erro de conexão");}
    finally{setLoading(false);}
  }
  return <div className="shell"><header><strong>WEB / LAB <span>Analytics</span></strong><span className="tag">Painel restrito</span></header>
    <section className="heading"><div><p className="eyebrow">VISÃO GERAL</p><h1>Visitas e sessões</h1><p>Métricas coletadas voluntariamente pelo experimento.</p></div></section>
    <form className="auth" onSubmit={e=>{e.preventDefault();void load();}}><label htmlFor="token">Token do dashboard</label><input id="token" type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} placeholder="DASHBOARD_TOKEN do servidor"/><button type="submit" disabled={loading}>{loading?"Carregando…":"Consultar dados"}</button></form>
    <p className="hint">O token permanece apenas na memória desta aba; não é salvo no navegador.</p>
    {error&&<div className="error" role="alert">{error}</div>}
    {stats&&<><div className="cards">
      <article><span>Visitantes por identificador</span><strong>{stats.visitors.toLocaleString("pt-BR")}</strong></article>
      <article><span>Sessões registradas</span><strong>{stats.sessions.toLocaleString("pt-BR")}</strong></article>
      <article><span>Mobile</span><strong>{stats.mobile.toLocaleString("pt-BR")}</strong></article>
      <article><span>Desktop</span><strong>{stats.desktop.toLocaleString("pt-BR")}</strong></article>
    </div>
    <div className="panels"><section className="panel"><h2>Países</h2>{stats.countries.length===0?<p>Sem dados</p>:stats.countries.map(c=><div className="country" key={c.name}><span>{c.name}</span><strong>{c.count}</strong></div>)}</section>
    <section className="panel"><h2>Últimas sessões</h2><div className="tablewrap"><table><thead><tr><th>Data</th><th>Localização aproximada</th><th>Navegador</th><th>SO</th><th>Dispositivo</th><th>Duração</th></tr></thead><tbody>{stats.recent.map(s=><tr key={s.id}><td>{new Date(s.startedAt).toLocaleString("pt-BR")}</td><td>{[s.city,s.region,s.country].filter(Boolean).join(", ")||"—"}</td><td>{s.browser||"—"}</td><td>{s.os||"—"}</td><td>{s.deviceType||"—"}</td><td>{s.durationMs==null?"—":`${Math.round(s.durationMs/1000)}s`}</td></tr>)}</tbody></table></div></section></div>
    <p className="foot">Visitantes únicos representam identificadores de navegador, não pessoas identificadas. Origem geográfica estimada por IP.</p></>}
  </div>;
}
export default App;
