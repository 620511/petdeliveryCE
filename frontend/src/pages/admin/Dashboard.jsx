// frontend/src/pages/admin/Dashboard.jsx
import { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";

const C = { primary:"#F7931E", primaryDark:"#F15A24", white:"#fff", bg:"#F8F9FA", textDark:"#1E1E2E", textGray:"#6B7280", green:"#10B981", blue:"#3B82F6", purple:"#8B5CF6", red:"#EF4444" };

const fmt = (v) => Number(v).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });

const STATUS_LABELS = { pending:"Aguardando", confirmed:"Confirmado", preparing:"Preparando", on_the_way:"A caminho", delivered:"Entregue", cancelled:"Cancelado" };
const STATUS_COLORS = { pending:"#F59E0B", confirmed:C.primary, preparing:C.blue, on_the_way:C.purple, delivered:C.green, cancelled:C.red };

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div style={{ background:C.white, borderRadius:16, padding:"20px 24px", boxShadow:"0 1px 8px rgba(0,0,0,0.06)", borderLeft:`4px solid ${color}` }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <span style={{ fontSize:28 }}>{icon}</span>
        <div style={{ background:`${color}18`, borderRadius:8, padding:"4px 10px", fontSize:12, fontWeight:700, color }}>{sub}</div>
      </div>
      <div style={{ fontSize:28, fontWeight:900, color:C.textDark }}>{value}</div>
      <div style={{ fontSize:13, color:C.textGray, marginTop:4 }}>{label}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    adminAPI.dashboard()
      .then(({ data }) => setData(data))
      .catch(() => setError("Erro ao carregar dados"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error)   return <ErrorState msg={error} />;

  const { stats, recentOrders, revenueChart } = data;

  const maxRevenue = Math.max(...(revenueChart?.map((d) => Number(d.revenue)) || [1]));

  return (
    <div style={{ padding:"28px 32px" }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ margin:0, fontSize:24, fontWeight:900, color:C.textDark }}>Dashboard</h1>
        <p style={{ margin:"6px 0 0", color:C.textGray, fontSize:14 }}>Visão geral da plataforma</p>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:16, marginBottom:20 }}>
        <StatCard icon="👥" label="Usuários ativos"    value={stats.users}        sub="Total"     color={C.blue}    />
        <StatCard icon="🏪" label="Lojas cadastradas"  value={stats.stores}       sub="Total"     color={C.purple}  />
        <StatCard icon="📦" label="Pedidos realizados" value={stats.orders}       sub="Total"     color={C.primary} />
        <StatCard icon="💰" label="Receita total"      value={fmt(stats.revenue)} sub="Entregues" color={C.green}   />
        {/* FASE 1: taxa da plataforma (5%) */}
        <StatCard icon="🏦" label="Taxa plataforma (5%)" value={fmt(stats.platform_fees ?? stats.revenue * 0.05)} sub="Arrecadado" color="#0EA5E9" />
        <StatCard icon="🤝" label="Repasse às lojas"   value={fmt(stats.store_nets ?? stats.revenue * 0.95)} sub="Líquido"   color="#14B8A6" />
      </div>

      {/* FASE 1: Banner explicativo da taxa */}
      <div style={{ background:"linear-gradient(135deg,#EFF6FF,#F0FDF4)", borderRadius:14, padding:"14px 20px", marginBottom:28, display:"flex", alignItems:"center", gap:14, border:"1px solid #BFDBFE", flexWrap:"wrap" }}>
        <span style={{ fontSize:24 }}>💡</span>
        <div style={{ flex:1, fontSize:13, color:"#1E40AF", lineHeight:1.6 }}>
          <strong>Taxa da plataforma:</strong> 5% sobre o subtotal de cada pedido (frete não entra na base).{" "}
          Valor líquido da loja = Total − Taxa.{" "}
          <span style={{ color:"#065F46", fontWeight:700 }}>Fase 3 implementará o repasse automático via Mercado Pago.</span>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:20 }}>
        {/* Revenue chart */}
        <div style={{ background:C.white, borderRadius:16, padding:24, boxShadow:"0 1px 8px rgba(0,0,0,0.06)" }}>
          <h2 style={{ margin:"0 0 20px", fontSize:16, fontWeight:800, color:C.textDark }}>📈 Receita (últimos 30 dias)</h2>
          {revenueChart?.length > 0 ? (
            <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:150 }}>
              {revenueChart.map((d, i) => {
                const h = maxRevenue > 0 ? (Number(d.revenue) / maxRevenue) * 140 : 4;
                return (
                  <div key={i} title={`${d.period?.slice(0,10)}: ${fmt(d.revenue)}`}
                    style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                    <div style={{ width:"100%", background:`linear-gradient(180deg, ${C.primary}, ${C.primaryDark})`, borderRadius:"4px 4px 0 0", height: h, minHeight:4, transition:"height .3s" }} />
                    <div style={{ fontSize:9, color:C.textGray, transform:"rotate(-45deg)", whiteSpace:"nowrap" }}>
                      {d.period?.slice(5, 10)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ height:150, display:"flex", alignItems:"center", justifyContent:"center", color:C.textGray, fontSize:14 }}>
              Sem dados no período
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div style={{ background:C.white, borderRadius:16, padding:24, boxShadow:"0 1px 8px rgba(0,0,0,0.06)", overflow:"hidden" }}>
          <h2 style={{ margin:"0 0 16px", fontSize:16, fontWeight:800, color:C.textDark }}>📦 Pedidos Recentes</h2>
          <div style={{ display:"flex", flexDirection:"column", gap:10, maxHeight:320, overflowY:"auto" }}>
            {recentOrders?.map((o) => (
              <div key={o.id} style={{ padding:"10px 12px", background:C.bg, borderRadius:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.textDark }}>{o.customer_name}</div>
                  <div style={{ fontSize:11, color:C.textGray }}>{o.store_name}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:13, fontWeight:800, color:C.textDark }}>{fmt(o.total)}</div>
                  <div style={{ fontSize:11, fontWeight:700, color: STATUS_COLORS[o.status] || C.primary }}>
                    {STATUS_LABELS[o.status] || o.status}
                  </div>
                </div>
              </div>
            ))}
            {!recentOrders?.length && (
              <div style={{ textAlign:"center", padding:32, color:C.textGray }}>Nenhum pedido ainda</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ padding:32 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:28 }}>
        {[1,2,3,4].map(i => <div key={i} style={{ height:100, background:"#E5E7EB", borderRadius:16, animation:"pulse 1.5s infinite" }} />)}
      </div>
      <div style={{ height:300, background:"#E5E7EB", borderRadius:16 }} />
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}
function ErrorState({ msg }) {
  return <div style={{ padding:32, color:"#EF4444", fontWeight:700 }}>⚠️ {msg}</div>;
}
