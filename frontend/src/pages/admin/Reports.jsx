// frontend/src/pages/admin/Reports.jsx
import { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";

const C = { primary:"#F7931E", primaryDark:"#F15A24", white:"#fff", bg:"#F8F9FA", textDark:"#1E1E2E", textGray:"#6B7280", green:"#10B981" };
const fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });

export default function AdminReports() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState("day");

  useEffect(() => {
    setLoading(true);
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    adminAPI.revenue({ group_by: groupBy, from })
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, [groupBy]);

  const maxRev = data?.timeline?.length
    ? Math.max(...data.timeline.map((d) => Number(d.revenue)))
    : 1;

  const totalRevenue = data?.timeline?.reduce((s, d) => s + Number(d.revenue), 0) || 0;
  const totalOrders  = data?.timeline?.reduce((s, d) => s + Number(d.orders), 0) || 0;

  return (
    <div style={{ padding:"28px 32px" }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0, fontSize:24, fontWeight:900, color:C.textDark }}>📈 Relatórios</h1>
        <p style={{ margin:"6px 0 0", color:C.textGray, fontSize:14 }}>Últimos 30 dias</p>
      </div>

      {/* Group by */}
      <div style={{ display:"flex", gap:8, marginBottom:24 }}>
        {["day","week","month"].map((g) => (
          <button key={g} onClick={() => setGroupBy(g)}
            style={{ padding:"8px 18px", borderRadius:20, border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13, background: groupBy === g ? `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})` : C.white, color: groupBy === g ? C.white : C.textGray, boxShadow:"0 1px 4px rgba(0,0,0,0.08)" }}>
            {{day:"Por Dia", week:"Por Semana", month:"Por Mês"}[g]}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginBottom:24 }}>
        {[
          { icon:"💰", label:"Receita Total", value: fmt(totalRevenue), color:C.green },
          { icon:"📦", label:"Pedidos",        value: totalOrders,       color:C.primary },
          { icon:"🎟️", label:"Ticket Médio",  value: totalOrders ? fmt(totalRevenue / totalOrders) : "R$ 0,00", color:"#3B82F6" },
        ].map((s) => (
          <div key={s.label} style={{ background:C.white, borderRadius:14, padding:"18px 22px", boxShadow:"0 1px 8px rgba(0,0,0,0.06)", borderTop:`3px solid ${s.color}` }}>
            <div style={{ fontSize:28, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontSize:24, fontWeight:900, color:C.textDark }}>{s.value}</div>
            <div style={{ fontSize:13, color:C.textGray }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 360px", gap:20 }}>
        {/* Timeline chart */}
        <div style={{ background:C.white, borderRadius:16, padding:24, boxShadow:"0 1px 8px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin:"0 0 20px", fontSize:16, fontWeight:800, color:C.textDark }}>Receita por Período</h3>
          {loading ? (
            <div style={{ height:180, background:"#E5E7EB", borderRadius:12, animation:"pulse 1.5s infinite" }} />
          ) : data?.timeline?.length ? (
            <div style={{ display:"flex", alignItems:"flex-end", gap:3, height:180 }}>
              {data.timeline.map((d, i) => {
                const h = maxRev > 0 ? (Number(d.revenue) / maxRev) * 160 : 4;
                return (
                  <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}
                    title={`${fmt(d.revenue)} • ${d.orders} pedidos`}>
                    <div style={{ width:"100%", background:`linear-gradient(180deg, ${C.primary}, ${C.primaryDark})`, borderRadius:"4px 4px 0 0", height: h, minHeight:4 }} />
                    <div style={{ fontSize:9, color:C.textGray, writingMode:"vertical-lr", transform:"rotate(180deg)", maxHeight:40, overflow:"hidden" }}>
                      {String(d.period).slice(5, 10)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ height:180, display:"flex", alignItems:"center", justifyContent:"center", color:C.textGray }}>Sem dados</div>
          )}
        </div>

        {/* Top stores */}
        <div style={{ background:C.white, borderRadius:16, padding:24, boxShadow:"0 1px 8px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin:"0 0 16px", fontSize:16, fontWeight:800, color:C.textDark }}>🏆 Top Lojas</h3>
          {data?.byStore?.map((s, i) => (
            <div key={s.store} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:`${C.primary}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900, color:C.primary, flexShrink:0 }}>
                {i + 1}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.textDark, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.store}</div>
                <div style={{ fontSize:11, color:C.textGray }}>{s.orders} pedidos</div>
              </div>
              <div style={{ fontSize:14, fontWeight:800, color:C.textDark, flexShrink:0 }}>{fmt(s.revenue)}</div>
            </div>
          ))}
          {!data?.byStore?.length && !loading && (
            <div style={{ textAlign:"center", color:C.textGray, padding:32 }}>Sem dados</div>
          )}
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}
