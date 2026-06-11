// frontend/src/pages/admin/Orders.jsx
import { useState, useEffect, useCallback } from "react";
import { adminAPI } from "../../services/api";

const C = { primary:"#F7931E", primaryDark:"#F15A24", white:"#fff", bg:"#F8F9FA", textDark:"#1E1E2E", textGray:"#6B7280", green:"#10B981", red:"#EF4444", blue:"#3B82F6" };
const fmt = (v) => Number(v).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
const STATUS_LABELS = { pending:"Aguardando", confirmed:"Confirmado", preparing:"Preparando", on_the_way:"A caminho", delivered:"Entregue", cancelled:"Cancelado" };
const STATUS_COLORS = { pending:"#F59E0B", confirmed:C.primary, preparing:C.blue, on_the_way:"#8B5CF6", delivered:C.green, cancelled:C.red };
const PAYMENT_LABELS = { pix:"PIX ⚡", credit_card:"Crédito 💳", debit_card:"Débito 🏦", cash:"Dinheiro 💵" };

export default function AdminOrders() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (status) params.status = status;
      const { data } = await adminAPI.orders(params);
      setOrders(data.orders);
    } finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const STATUS_TABS = [
    { value:"", label:"Todos" },
    { value:"pending",    label:"⏳ Aguardando" },
    { value:"preparing",  label:"👨‍🍳 Preparando" },
    { value:"on_the_way", label:"🚴 A caminho" },
    { value:"delivered",  label:"✅ Entregues" },
    { value:"cancelled",  label:"❌ Cancelados" },
  ];

  return (
    <div style={{ padding:"28px 32px" }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0, fontSize:24, fontWeight:900, color:C.textDark }}>📦 Pedidos</h1>
        <p style={{ margin:"6px 0 0", color:C.textGray, fontSize:14 }}>{orders.length} pedidos</p>
      </div>

      {/* Status tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:20, overflowX:"auto", paddingBottom:4 }}>
        {STATUS_TABS.map((t) => (
          <button key={t.value} onClick={() => setStatus(t.value)}
            style={{ flexShrink:0, padding:"8px 16px", borderRadius:20, border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13, background: status === t.value ? `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})` : C.white, color: status === t.value ? C.white : C.textGray, boxShadow:"0 1px 4px rgba(0,0,0,0.08)" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ background:C.white, borderRadius:16, boxShadow:"0 1px 8px rgba(0,0,0,0.06)", overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:C.bg }}>
              {["Pedido","Cliente","Loja","Pagamento","Total","Status","Data"].map((h) => (
                <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:12, fontWeight:800, color:C.textGray, textTransform:"uppercase", letterSpacing:0.5, whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(10).fill(0).map((_, i) => (
                <tr key={i}><td colSpan={7} style={{ padding:14 }}><div style={{ height:14, background:"#E5E7EB", borderRadius:7, animation:"pulse 1.5s infinite" }} /></td></tr>
              ))
            ) : orders.map((o) => (
              <tr key={o.id} style={{ borderTop:"1px solid #F3F4F6" }}
                onMouseEnter={(e) => e.currentTarget.style.background = C.bg}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding:"12px 16px", fontSize:12, color:C.textGray, fontFamily:"monospace" }}>#{o.id.slice(-6).toUpperCase()}</td>
                <td style={{ padding:"12px 16px", fontSize:13, fontWeight:700, color:C.textDark }}>{o.customer_name}</td>
                <td style={{ padding:"12px 16px", fontSize:13, color:C.textGray }}>{o.store_name}</td>
                <td style={{ padding:"12px 16px", fontSize:12 }}>{PAYMENT_LABELS[o.payment_method] || o.payment_method}</td>
                <td style={{ padding:"12px 16px", fontWeight:800, color:C.textDark }}>{fmt(o.total)}</td>
                <td style={{ padding:"12px 16px" }}>
                  <span style={{ background:`${STATUS_COLORS[o.status]}18`, color:STATUS_COLORS[o.status], fontWeight:700, fontSize:12, borderRadius:8, padding:"3px 10px" }}>
                    {STATUS_LABELS[o.status]}
                  </span>
                </td>
                <td style={{ padding:"12px 16px", fontSize:12, color:C.textGray }}>
                  {new Date(o.created_at).toLocaleDateString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && orders.length === 0 && (
          <div style={{ padding:48, textAlign:"center", color:C.textGray }}>Nenhum pedido encontrado</div>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}
