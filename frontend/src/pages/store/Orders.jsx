// frontend/src/pages/store/Orders.jsx
// NOVO: tempo real com Socket.io — lojista recebe novos pedidos sem refresh

import { useState, useEffect, useCallback, useRef } from "react";
import { storeAPI } from "../../services/api";
import { useSocket } from "../../hooks/useSocket";

const C = { primary:"#F7931E", primaryDark:"#F15A24", white:"#fff", bg:"#FFF8F2", textDark:"#1E1E2E", textGray:"#6B7280", green:"#10B981", red:"#EF4444", blue:"#3B82F6" };
const fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });

const STATUS_FLOW   = { pending:["confirmed","cancelled"], confirmed:["preparing","cancelled"], preparing:["on_the_way"], on_the_way:["delivered"] };
const STATUS_LABELS = { pending:"⏳ Aguardando", confirmed:"✅ Confirmado", preparing:"👨‍🍳 Preparando", on_the_way:"🚴 A caminho", delivered:"📦 Entregue", cancelled:"❌ Cancelado" };
const STATUS_COLORS = { pending:"#F59E0B", confirmed:C.primary, preparing:C.blue, on_the_way:"#8B5CF6", delivered:C.green, cancelled:C.red };
const NEXT_LABEL    = { confirmed:"✅ Confirmar Pedido", preparing:"👨‍🍳 Iniciar Preparo", on_the_way:"🚴 Saiu para Entrega", delivered:"📦 Marcar Entregue", cancelled:"❌ Cancelar" };

const TABS = [
  { value:"",           label:"Todos" },
  { value:"pending",    label:"⏳ Aguardando" },
  { value:"confirmed",  label:"✅ Confirmado" },
  { value:"preparing",  label:"👨‍🍳 Preparando" },
  { value:"on_the_way", label:"🚴 A caminho" },
  { value:"delivered",  label:"📦 Entregue" },
];

export default function StoreOrders() {
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [status,   setStatus]   = useState("");
  const [updating, setUpdating] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [newCount, setNewCount] = useState(0);     // badge de novos pedidos
  const [toast,    setToast]    = useState(null);
  const storeIdRef = useRef(null);
  const toastTimer = useRef(null);
  const audioCtxRef = useRef(null);

  // ── Alerta sonoro de novo pedido ──────────────────────────────────
  // Navegadores só permitem tocar som depois de alguma interação do usuário
  // na página, então "destravamos" o áudio no primeiro clique.
  useEffect(() => {
    const unlock = () => {
      if (!audioCtxRef.current) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audioCtxRef.current = new AC();
      }
      audioCtxRef.current?.resume?.();
      window.removeEventListener("click", unlock);
    };
    window.addEventListener("click", unlock);
    return () => window.removeEventListener("click", unlock);
  }, []);

  const playOrderAlert = () => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AC();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      // Dois "bips" curtos (dó agudo → sol agudo), estilo campainha
      const beep = (freq, startTime, duration) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.3, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const now = ctx.currentTime;
      beep(880, now, 0.18);
      beep(1175, now + 0.22, 0.22);
    } catch { /* ambiente sem suporte a áudio — ignora silenciosamente */ }
  };

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await storeAPI.orders(status ? { status } : {});
      setOrders(data.orders);
      setNewCount(0);
    } finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  // ── Busca storeId para entrar na sala correta ───────────────────
  useEffect(() => {
    storeAPI.profile()
      .then(({ data }) => { storeIdRef.current = data.id; })
      .catch(() => {});
  }, []);

  // ── Socket.io: recebe novos pedidos em tempo real ───────────────
  const { joinRoom, on } = useSocket({ enabled: true });

  useEffect(() => {
    // Entra na sala quando o storeId estiver disponível
    const interval = setInterval(() => {
      if (storeIdRef.current) {
        joinRoom(storeIdRef.current);
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [joinRoom]);

  useEffect(() => {
    const unsub = on("order:new", (payload) => {
      playOrderAlert();
      showToast(`🛒 Novo pedido de ${payload.customerName} — ${fmt(payload.total)}`, "success");
      setNewCount((n) => n + 1);
      // Recarrega lista se estiver na aba "Todos" ou "Aguardando"
      if (!status || status === "pending") load();
    });
    return unsub;
  }, [on, status, load]);

  const advance = async (order, nextStatus) => {
    setUpdating(order.id);
    try {
      await storeAPI.updateStatus(order.id, nextStatus);
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: nextStatus } : o));
      showToast(`Pedido atualizado: ${STATUS_LABELS[nextStatus]}`, "success");
    } catch {
      showToast("Erro ao atualizar status", "error");
    } finally { setUpdating(null); }
  };

  return (
    <div style={{ padding:"28px 32px" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position:"fixed", top:20, right:24, zIndex:999,
          background: toast.type === "success" ? C.green : toast.type === "error" ? C.red : C.textDark,
          color:C.white, borderRadius:12, padding:"12px 20px",
          fontWeight:700, fontSize:14, boxShadow:"0 4px 20px rgba(0,0,0,0.2)",
          animation:"slideIn .3s ease",
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:900, color:C.textDark }}>
            📦 Pedidos
            {newCount > 0 && (
              <span style={{ marginLeft:10, background:C.red, color:C.white, borderRadius:999, fontSize:13, padding:"2px 10px", fontWeight:800 }}>
                +{newCount} novo{newCount > 1 ? "s" : ""}
              </span>
            )}
          </h1>
          <p style={{ margin:"4px 0 0", color:C.textGray, fontSize:13 }}>
            {orders.length} pedidos • Atualizações em tempo real 🔴
          </p>
        </div>
        <button onClick={load}
          style={{ padding:"10px 18px", borderRadius:10, border:"none", background:`linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, color:C.white, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          🔄 Atualizar
        </button>
      </div>

      {/* Tabs de status */}
      <div style={{ display:"flex", gap:8, marginBottom:20, overflowX:"auto", paddingBottom:4 }}>
        {TABS.map((t) => (
          <button key={t.value} onClick={() => setStatus(t.value)}
            style={{ flexShrink:0, padding:"8px 16px", borderRadius:20, border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13,
              background: status === t.value ? `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})` : C.white,
              color: status === t.value ? C.white : C.textGray,
              boxShadow:"0 1px 4px rgba(0,0,0,0.08)" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Lista de pedidos */}
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {loading ? Array(4).fill(0).map((_, i) => (
          <div key={i} style={{ height:100, background:"#E5E7EB", borderRadius:14, animation:"pulse 1.5s infinite" }} />
        )) : orders.map((o) => {
          const nextStatuses = STATUS_FLOW[o.status] || [];
          const isExpanded   = expanded === o.id;

          return (
            <div key={o.id} style={{
              background:C.white, borderRadius:14, padding:18,
              boxShadow:"0 1px 8px rgba(0,0,0,0.06)",
              borderLeft:`4px solid ${STATUS_COLORS[o.status] || C.primary}`,
              transition:"box-shadow .2s",
            }}>
              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:11, color:C.textGray, fontFamily:"monospace", background:"#F3F4F6", padding:"2px 7px", borderRadius:6 }}>
                      #{o.id.slice(-6).toUpperCase()}
                    </span>
                    <span style={{ background:`${STATUS_COLORS[o.status]}18`, color:STATUS_COLORS[o.status], fontWeight:700, fontSize:12, borderRadius:8, padding:"2px 10px" }}>
                      {STATUS_LABELS[o.status]}
                    </span>
                  </div>
                  <div style={{ fontSize:15, fontWeight:800, color:C.textDark }}>{o.customer_name}</div>
                  {o.customer_phone && <div style={{ fontSize:12, color:C.textGray }}>{o.customer_phone}</div>}
                  {o.delivery_address && <div style={{ fontSize:12, color:C.textGray, marginTop:2 }}>📍 {o.delivery_address}</div>}
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:20, fontWeight:900, color:C.primaryDark }}>{fmt(o.total)}</div>
                  <div style={{ fontSize:12, color:C.textGray }}>
                    {new Date(o.created_at).toLocaleString("pt-BR", { hour:"2-digit", minute:"2-digit", day:"2-digit", month:"2-digit" })}
                  </div>
                </div>
              </div>

              {/* Toggle itens */}
              <button onClick={() => setExpanded(isExpanded ? null : o.id)}
                style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:C.primary, fontWeight:700, padding:"6px 0 0", fontFamily:"inherit" }}>
                {isExpanded ? "▲ Fechar" : `▼ Ver ${o.items?.length || 0} itens`}
              </button>

              {isExpanded && (
                <div style={{ marginTop:10, background:"#FFF8F2", borderRadius:10, padding:"12px 14px" }}>
                  {(o.items || []).map((item, idx) => (
                    <div key={idx} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"4px 0", borderBottom: idx < o.items.length - 1 ? "1px solid #F0E8E0" : "none" }}>
                      <span>{item.emoji} {item.qty}x {item.name}</span>
                      <span style={{ fontWeight:700 }}>{fmt(item.price * item.qty)}</span>
                    </div>
                  ))}
                  {o.notes && <div style={{ marginTop:8, fontSize:12, color:C.textGray }}>📝 {o.notes}</div>}
                </div>
              )}

              {/* Ações */}
              {nextStatuses.length > 0 && (
                <div style={{ display:"flex", gap:8, marginTop:12 }}>
                  {nextStatuses.map((ns) => (
                    <button key={ns} onClick={() => advance(o, ns)} disabled={updating === o.id}
                      style={{
                        flex:1, padding:"11px", borderRadius:10, border:"none", cursor:"pointer",
                        fontFamily:"inherit", fontWeight:700, fontSize:13,
                        background: ns === "cancelled" ? "#FEE2E2" : `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`,
                        color: ns === "cancelled" ? C.red : C.white,
                        opacity: updating === o.id ? 0.7 : 1,
                      }}>
                      {updating === o.id ? "⏳ Aguarde..." : NEXT_LABEL[ns]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!loading && orders.length === 0 && (
        <div style={{ textAlign:"center", padding:80, color:C.textGray }}>
          <div style={{ fontSize:52, marginBottom:12 }}>📦</div>
          <div style={{ fontSize:18, fontWeight:700 }}>Nenhum pedido encontrado</div>
          <div style={{ fontSize:13, marginTop:6 }}>Os novos pedidos aparecerão aqui em tempo real</div>
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  );
}
