// frontend/src/pages/store/Dashboard.jsx
// FIX: quando lojista não tem loja, mostra tela de configuração inicial
// FIX: usa store.isOpen (camelCase) para bater com o retorno da API

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { storeAPI } from "../../services/api";

const C = { primary:"#F7931E", primaryDark:"#F15A24", white:"#fff", bg:"#FFF8F2", textDark:"#1E1E2E", textGray:"#6B7280", green:"#10B981", red:"#EF4444", blue:"#3B82F6" };
const fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
const STATUS_COLORS = { pending:"#F59E0B", confirmed:C.primary, preparing:C.blue, on_the_way:"#8B5CF6", delivered:C.green, cancelled:C.red };
const STATUS_LABELS = { pending:"⏳ Aguardando", confirmed:"✅ Confirmado", preparing:"👨‍🍳 Preparando", on_the_way:"🚴 A caminho", delivered:"📦 Entregue", cancelled:"❌ Cancelado" };

export default function StoreDashboard() {
  const navigate = useNavigate();
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [noStore, setNoStore]     = useState(false);
  const [togglingOpen, setToggle] = useState(false);

  const load = () => {
    setLoading(true);
    storeAPI.dashboard()
      .then(({ data }) => setData(data))
      .catch((err) => {
        if (err.response?.status === 404) setNoStore(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleOpen = async () => {
    if (!data) return;
    setToggle(true);
    try {
      await storeAPI.updateProfile({ ...data.store, is_open: !data.store.isOpen });
      setData((d) => ({ ...d, store: { ...d.store, isOpen: !d.store.isOpen } }));
    } finally { setToggle(false); }
  };

  if (loading) return <div style={{ padding:32, color:C.textGray }}>Carregando...</div>;

  // Lojista sem loja configurada — mostra tela de boas-vindas
  if (noStore) return (
    <div style={{ padding:32, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", textAlign:"center" }}>
      <div style={{ fontSize:72, marginBottom:16 }}>🏪</div>
      <h2 style={{ fontSize:24, fontWeight:900, color:C.textDark, margin:"0 0 8px" }}>
        Bem-vindo ao PetDelivery!
      </h2>
      <p style={{ fontSize:15, color:C.textGray, maxWidth:400, lineHeight:1.6, margin:"0 0 32px" }}>
        Sua conta foi criada com sucesso! Agora configure sua loja para começar a vender. Preencha os dados básicos e aguarde a aprovação do admin.
      </p>
      <div style={{ background:`${C.primary}15`, borderRadius:16, padding:20, maxWidth:400, marginBottom:32, textAlign:"left" }}>
        <div style={{ fontWeight:800, color:C.textDark, marginBottom:12 }}>📋 O que fazer agora:</div>
        {[
          "1️⃣ Configure o perfil da sua loja (nome, endereço, horário)",
          "2️⃣ Aguarde a aprovação do administrador",
          "3️⃣ Cadastre seus produtos",
          "4️⃣ Comece a receber pedidos!",
        ].map((s) => (
          <div key={s} style={{ fontSize:13, color:C.textDark, marginBottom:8 }}>{s}</div>
        ))}
      </div>
      <button
        onClick={() => navigate("/store/profile")}
        style={{
          background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`,
          color:C.white, border:"none", borderRadius:14,
          padding:"14px 32px", fontSize:15, fontWeight:800,
          cursor:"pointer", fontFamily:"inherit",
        }}
      >
        ⚙️ Configurar minha loja agora
      </button>
    </div>
  );

  if (!data) return <div style={{ padding:32, color:C.red }}>Erro ao carregar</div>;

  const { store, stats, recentOrders, topProducts } = data;

  return (
    <div style={{ padding:"28px 32px" }}>
      {/* Header + toggle */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:900, color:C.textDark }}>📊 {store.name}</h1>
          <p style={{ margin:"6px 0 0", color:C.textGray, fontSize:14 }}>Painel da sua loja</p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:13, color:C.textGray, fontWeight:600 }}>Status da loja:</span>
          <button onClick={toggleOpen} disabled={togglingOpen}
            style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 18px", borderRadius:12, border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:14, background: store.isOpen ? "#D1FAE5" : "#FEE2E2", color: store.isOpen ? C.green : C.red }}>
            <span style={{ fontSize:18 }}>{store.isOpen ? "🟢" : "🔴"}</span>
            {togglingOpen ? "..." : store.isOpen ? "Aberta — Fechar" : "Fechada — Abrir"}
          </button>
        </div>
      </div>

      {/* Aviso se loja não aprovada ainda */}
      {!store.isActive && (
        <div style={{ background:"#FEF3C7", border:"1px solid #F59E0B", borderRadius:12, padding:"12px 18px", marginBottom:20, fontSize:13, color:"#92400E", fontWeight:600 }}>
          ⏳ Sua loja está aguardando aprovação do administrador. Você já pode cadastrar produtos enquanto isso!
        </div>
      )}

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))", gap:14, marginBottom:24 }}>
        {[
          { icon:"🐾", label:"Produtos",      value: stats.products,              color:C.primary },
          { icon:"📦", label:"Total Pedidos", value: stats.orders,                color:C.blue },
          { icon:"⏳", label:"Pendentes",     value: stats.pendingOrders,         color:"#F59E0B" },
          { icon:"💰", label:"Receita",       value: fmt(stats.revenue),          color:C.green },
        ].map((s) => (
          <div key={s.label} style={{ background:C.white, borderRadius:14, padding:"18px 20px", boxShadow:"0 1px 8px rgba(0,0,0,0.06)", borderLeft:`4px solid ${s.color}` }}>
            <div style={{ fontSize:26, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontSize:22, fontWeight:900, color:C.textDark }}>{s.value}</div>
            <div style={{ fontSize:12, color:C.textGray, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:20 }}>
        {/* Recent orders */}
        <div style={{ background:C.white, borderRadius:16, padding:22, boxShadow:"0 1px 8px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin:"0 0 16px", fontSize:16, fontWeight:800, color:C.textDark }}>📦 Pedidos Recentes</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {recentOrders?.map((o) => (
              <div key={o.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px", background:C.bg, borderRadius:10 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:C.textDark }}>{o.customer_name}</div>
                  <div style={{ fontSize:12, color:C.textGray }}>{o.customer_phone}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:14, fontWeight:800, color:C.textDark }}>{fmt(o.total)}</div>
                  <div style={{ fontSize:11, fontWeight:700, color: STATUS_COLORS[o.status] }}>{STATUS_LABELS[o.status]}</div>
                </div>
              </div>
            ))}
            {!recentOrders?.length && <div style={{ textAlign:"center", padding:32, color:C.textGray }}>Nenhum pedido ainda</div>}
          </div>
        </div>

        {/* Top products */}
        <div style={{ background:C.white, borderRadius:16, padding:22, boxShadow:"0 1px 8px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin:"0 0 16px", fontSize:16, fontWeight:800, color:C.textDark }}>🏆 Top Produtos</h3>
          {topProducts?.map((p, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <span style={{ fontSize:24 }}>{p.emoji}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.textDark, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                <div style={{ fontSize:11, color:C.textGray }}>{p.sold} vendidos • {fmt(p.price)}</div>
              </div>
              <div style={{ background:`${C.primary}18`, color:C.primary, fontWeight:800, fontSize:13, borderRadius:8, padding:"3px 10px", flexShrink:0 }}>
                #{i + 1}
              </div>
            </div>
          ))}
          {!topProducts?.length && <div style={{ textAlign:"center", padding:32, color:C.textGray }}>Sem dados</div>}
        </div>
      </div>
    </div>
  );
}
