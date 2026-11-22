import { useCallback, useEffect, useState } from "react";
import "./App.css";

type Item = { name: string; count: number };
type Session = { id: string; startedAt: string; country: string | null; region: string | null; city: string | null; browser: string | null; os: string | null; deviceType: string | null; language: string | null; durationMs: number | null; utmSource: string | null; referrer: string | null };
type Stats = { period: number; visitors: number; sessions: number; mobile: number; desktop: number; countries: Item[]; browsers: Item[]; sources: Item[]; daily: { date: string; count: number }[]; recent: Session[] };
const API = import.meta.env.VITE_API_URL || "https://analytics-platform-1-isvp.onrender.com";
const format = (value: number) => value.toLocaleString("pt-BR");

function Breakdown({ title, data }: { title: string; data: Item[] }) {
  const max = Math.max(1, ...data.map(item => item.count));
  return <section className="panel"><h2>{title}</h2>{data.length === 0 && <p>Sem dados no período.</p>}
    <div className="bars">{data.map(item => <div className="barrow" key={item.name}><div className="barlabel"><span title={item.name}>{item.name}</span><strong>{format(item.count)}</strong></div><div className="track"><div style={{width: `${item.count / max * 100}%`}} className="fill" /></div></div>)}</div>
  </section>;
}
function Timeline({ daily }: { daily: Stats["daily"] }) {
  const max = Math.max(1, ...daily.map(d => d.count));
  return <section className="panel timeline"><h2>Sessões por dia</h2><div className="histogram" role="img" aria-label="Gráfico de sessões diárias">
    {daily.map(day => <div className="histocol" key={day.date} title={`${day.date}: ${day.count} sessões`}><div className="histoval" style={{height: `${Math.max(day.count ? 4 : 0, day.count / max * 100)}%`}} /></div>)}
  </div><div className="dateaxis"><span>{daily[0]?.date.split("-").reverse().join("/")}</span><span>{daily[daily.length-1]?.date.split("-").reverse().join("/")}</span></div></section>;
}
function App() {
  const [token, setToken] = useState("");
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const load = useCallback(async () => {
    if (!token.trim()) {setError("Informe o token para consultar as estatísticas.");return;}
    setLoading(true); setError("");
    try {
      const response = await fetch(`${API}/stats?days=${period}`, {headers: {Authorization: `Bearer ${token.trim()}`}, cache:"no-store"});
      if (!response.ok) throw new Error(response.status === 401 ? "Token inválido" : response.status === 503 ? "Configure DASHBOARD_TOKEN no Render" : `HTTP ${response.status}`);
      const result = await response.json() as Stats;
      setStats(result);
    } catch (err) {setStats(null); setError(err instanceof Error ? err.message : "Erro ao buscar estatísticas");}
    finally {setLoading(false);}
  }, [token, period]);
  // Atualização periódica apenas depois da primeira autenticação bem-sucedida.
  useEffect(() => {
    if (!stats) return;
    const timer = window.setInterval(() => {void load();}, 60000);
    return () => window.clearInterval(timer);
  }, [load, Boolean(stats)]);
  const recent = stats?.recent.filter(s => {
    const haystack = [s.country,s.region,s.city,s.browser,s.os,s.deviceType,s.language,s.utmSource,s.referrer].join(" ").toLowerCase();
    return haystack.includes(filter.toLowerCase());
  }) || [];
  return <main className="shell">
    <header><strong>ANALYTICS <span>/ Dashboard</span></strong><span className="tag">Acesso privado</span></header>
    <section className="heading"><div><p className="eyebrow">VISÃO GERAL</p><h1>Tráfego e visitantes</h1><p>Métricas e origens das visitas registradas.</p></div></section>
    <form className="auth" onSubmit={e => {e.preventDefault();void load();}}>
      <label htmlFor="token">Token</label><input id="token" type="password" value={token} autoComplete="off" onChange={e=>setToken(e.target.value)} placeholder="Chave de acesso"/>
      <label htmlFor="period">Período</label><select id="period" value={period} onChange={e=>setPeriod(Number(e.target.value) as 7|30|90)}><option value={7}>7 dias</option><option value={30}>30 dias</option><option value={90}>90 dias</option></select>
      <button type="submit" disabled={loading}>{loading?"Carregando…":"Atualizar dados"}</button>
    </form>
    <p className="hint">Chave mantida somente na memória desta aba. Atualização automática a cada 60 segundos depois da primeira consulta.</p>
    {error && <div className="error" role="alert">{error}</div>}
    {stats && <>
      <div className="cards">
        <article><span>Navegadores identificados</span><strong>{format(stats.visitors)}</strong><small>Identificadores únicos no período</small></article>
        <article><span>Sessões</span><strong>{format(stats.sessions)}</strong><small>Últimos {stats.period} dias</small></article>
        <article><span>Mobile</span><strong>{format(stats.mobile)}</strong><small>{stats.sessions ? (100 * stats.mobile / stats.sessions).toFixed(1) : "0"}% das sessões</small></article>
        <article><span>Desktop</span><strong>{format(stats.desktop)}</strong><small>{stats.sessions ? (100 * stats.desktop / stats.sessions).toFixed(1) : "0"}% das sessões</small></article>
      </div>
      <Timeline daily={stats.daily}/>
      <div className="breakdowns">
        <Breakdown title="Origem do tráfego" data={stats.sources}/>
        <Breakdown title="Países" data={stats.countries}/>
        <Breakdown title="Navegadores" data={stats.browsers}/>
      </div>
      <section className="panel sessions">
        <div className="panelhead"><div><h2>Últimas sessões</h2><p>Até 50 registros no período</p></div><input type="search" placeholder="Filtrar sessões..." aria-label="Filtrar sessões" value={filter} onChange={e=>setFilter(e.target.value)}/></div>
        <div className="tablewrap"><table><thead><tr><th>Data</th><th>Localização aproximada</th><th>Navegador</th><th>Sistema</th><th>Dispositivo</th><th>Origem</th><th>Duração</th></tr></thead>
          <tbody>{recent.map(s=><tr key={s.id}><td>{new Date(s.startedAt).toLocaleString("pt-BR")}</td><td>{[s.city,s.region,s.country].filter(Boolean).join(", ")||"—"}</td><td>{s.browser||"—"}</td><td>{s.os||"—"}</td><td>{s.deviceType||"—"}</td><td>{s.utmSource || (()=>{try{return s.referrer?new URL(s.referrer).hostname:"Direto"}catch{return "—"}})()}</td><td>{s.durationMs==null?"—":`${Math.round(s.durationMs/1000)}s`}</td></tr>)}</tbody>
        </table>{recent.length===0 && <p>Nenhuma sessão encontrada.</p>}</div>
      </section>
      <p className="foot">As métricas históricas podem incluir localizações e classificações anteriores à correção da coleta. Um identificador de navegador não equivale a uma pessoa.</p>
    </>}
  </main>;
}
export default App;
