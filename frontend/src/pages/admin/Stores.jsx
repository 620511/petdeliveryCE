// frontend/src/pages/admin/Stores.jsx
import { useState, useEffect, useCallback } from "react";
import { adminAPI } from "../../services/api";

const C = { primary:"#F7931E", primaryDark:"#F15A24", white:"#fff", bg:"#F8F9FA", textDark:"#1E1E2E", textGray:"#6B7280", green:"#10B981", red:"#EF4444" };
const fmt = (v) => Number(v).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });

export default function AdminStores() {
  const [stores, setStores]       = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("");  // "" | "true" | "false"
  const [search, setSearch]       = useState("");
  const [saving, setSaving]       = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== "")  params.is_active = filter;
      if (search)         params.search    = search;
      const { data } = await adminAPI.stores(params);
      setStores(data.stores);
      setTotal(data.total);
    } finally { setLoading(false); }
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  const toggleStore = async (store) => {
    setSaving(store.id);
    try {
      await adminAPI.updateStore(store.id, { is_active: !store.is_active });
      setStores((prev) => prev.map((s) => s.id === store.id ? { ...s, is_active: !s.is_active } : s));
    } finally { setSaving(null); }
  };

  const FILTER_TABS = [
    { value:"",      label:"Todas" },
    { value:"true",  label:"✅ Aprovadas" },
    { value:"false", label:"⏳ Pendentes" },
  ];

  return (
    <div style={{ padding:"28px 32px" }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0, fontSize:24, fontWeight:900, color:C.textDark }}>🏪 Lojas</h1>
        <p style={{ margin:"6px 0 0", color:C.textGray, fontSize:14 }}>{total} lojas cadastradas</p>
      </div>

      {/* Filtros */}
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Buscar loja..."
          style={{ flex:1, minWidth:200, padding:"10px 14px", borderRadius:10, border:"2px solid #E5E7EB", fontSize:14, fontFamily:"inherit", outline:"none" }} />
        <div style={{ display:"flex", background:C.bg, borderRadius:10, padding:3, gap:2 }}>
          {FILTER_TABS.map((t) => (
            <button key={t.value} onClick={() => setFilter(t.value)}
              style={{ padding:"8px 14px", borderRadius:8, border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13, background: filter === t.value ? C.white : "transparent", color: filter === t.value ? C.primary : C.textGray, boxShadow: filter === t.value ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:16 }}>
          {Array(6).fill(0).map((_, i) => (
            <div key={i} style={{ height:180, background:"#E5E7EB", borderRadius:16, animation:"pulse 1.5s infinite" }} />
          ))}
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:16 }}>
          {stores.map((s) => (
            <div key={s.id} style={{ background:C.white, borderRadius:16, padding:20, boxShadow:"0 1px 8px rgba(0,0,0,0.06)", borderTop:`3px solid ${s.is_active ? C.green : "#E5E7EB"}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:800, color:C.textDark }}>{s.name}</div>
                  <div style={{ fontSize:12, color:C.textGray, marginTop:2 }}>Por: {s.owner_name}</div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:4, alignItems:"flex-end" }}>
                  <span style={{ background: s.is_active ? "#D1FAE5" : "#FEF3C7", color: s.is_active ? C.green : "#D97706", fontWeight:700, fontSize:11, borderRadius:8, padding:"3px 8px" }}>
                    {s.is_active ? "✅ Aprovada" : "⏳ Pendente"}
                  </span>
                  {s.is_open && <span style={{ background:"#EFF6FF", color:"#3B82F6", fontWeight:700, fontSize:11, borderRadius:8, padding:"3px 8px" }}>🟢 Aberta</span>}
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
                {[
                  { icon:"📦", label:"Produtos", val: s.product_count || 0 },
                  { icon:"🛒", label:"Pedidos",  val: s.order_count  || 0 },
                  { icon:"⭐", label:"Rating",   val: Number(s.rating).toFixed(1) },
                  { icon:"🚚", label:"Entrega",  val: fmt(s.delivery_fee) },
                ].map((m) => (
                  <div key={m.label} style={{ background:C.bg, borderRadius:8, padding:"8px 10px" }}>
                    <div style={{ fontSize:11, color:C.textGray }}>{m.icon} {m.label}</div>
                    <div style={{ fontSize:15, fontWeight:800, color:C.textDark }}>{m.val}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize:12, color:C.textGray, marginBottom:14 }}>📍 {s.address}</div>

              <button onClick={() => toggleStore(s)} disabled={saving === s.id}
                style={{ width:"100%", padding:"10px", borderRadius:10, border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13, background: s.is_active ? "#FEE2E2" : "#D1FAE5", color: s.is_active ? C.red : C.green }}>
                {saving === s.id ? "..." : s.is_active ? "🚫 Desativar Loja" : "✅ Aprovar Loja"}
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && stores.length === 0 && (
        <div style={{ textAlign:"center", padding:80, color:C.textGray }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🏪</div>
          <div style={{ fontSize:18, fontWeight:700 }}>Nenhuma loja encontrada</div>
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}
