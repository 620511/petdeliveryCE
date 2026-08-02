// frontend/src/pages/store/Products.jsx
// ATUALIZADO: usa ImageUpload para fotos dos produtos
// FASE 4: botão "Gerar com IA" na descrição do produto

import { useState, useEffect, useCallback } from "react";
import { storeAPI } from "../../services/api";
import { API_ORIGIN } from "../../services/api";

// Helper para gerar descrição via Gemini
async function fetchAIDescription(name, emoji) {
  try {
    const { data } = await storeAPI.generateDescription({ name, emoji });
    return data.description || "";
  } catch {
    return "";
  }
}
import ImageUpload from "../../components/shared/ImageUpload";

const C = { primary:"#F7931E", primaryDark:"#F15A24", white:"#fff", bg:"#FFF8F2", gray:"#F4F4F4", textDark:"#1E1E2E", textGray:"#6B7280", green:"#10B981", red:"#EF4444" };
const fmt = (v) => Number(v).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });

const EMPTY = { name:"", description:"", price:"", stock:"", emoji:"🐾", badge:"", image_url:"", unit:"un" };

export default function StoreProducts() {
  const [products, setProducts] = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [modal,    setModal]    = useState(null);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [toast,    setToast]    = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await storeAPI.products({ search });
      setProducts(data.products);
      setTotal(data.total);
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY); setModal("create"); };
  const openEdit   = (p)  => {
    setForm({ name: p.name, description: p.description||"", price: p.price, stock: p.stock, emoji: p.emoji||"🐾", badge: p.badge||"", image_url: p.imageUrl||"", unit: p.unit||"un" });
    setModal(p);
  };
  const closeModal = () => setModal(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.name || !form.price) return;
    setSaving(true);
    try {
      const payload = { ...form, price: parseFloat(form.price), stock: parseInt(form.stock || 0), image_url: form.image_url || null, unit: form.unit || "un" };
      if (modal === "create") {
        const { data } = await storeAPI.createProduct(payload);
        setProducts((p) => [data, ...p]);
        showToast("✅ Produto criado!");
      } else {
        const { data } = await storeAPI.updateProduct(modal.id, payload);
        setProducts((p) => p.map((x) => x.id === data.id ? data : x));
        showToast("✅ Produto atualizado!");
      }
      closeModal();
    } catch (err) {
      showToast("⚠️ " + (err.response?.data?.error || "Erro ao salvar"));
    } finally { setSaving(false); }
  };

  const toggleActive = async (product) => {
    try {
      await storeAPI.updateProduct(product.id, { is_active: !product.isActive });
      setProducts((p) => p.map((x) => x.id === product.id ? { ...x, isActive: !x.isActive } : x));
    } catch {}
  };

  const remove = async (id) => {
    if (!confirm("Desativar este produto?")) return;
    setDeleting(id);
    try {
      await storeAPI.deleteProduct(id);
      setProducts((p) => p.filter((x) => x.id !== id));
      showToast("✅ Produto desativado");
    } finally { setDeleting(null); }
  };

  const inputStyle = { width:"100%", boxSizing:"border-box", padding:"10px 12px", borderRadius:10, border:"2px solid #E5E7EB", fontSize:14, fontFamily:"inherit", outline:"none" };

  return (
    <div style={{ padding:"28px 32px" }}>
      {toast && (
        <div style={{ position:"fixed", top:20, right:24, background:C.textDark, color:C.white, borderRadius:12, padding:"10px 20px", fontWeight:700, fontSize:13, zIndex:999 }}>
          {toast}
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:900, color:C.textDark }}>🐾 Produtos</h1>
          <p style={{ margin:"4px 0 0", color:C.textGray, fontSize:13 }}>{total} produtos</p>
        </div>
        <button onClick={openCreate}
          style={{ padding:"11px 22px", borderRadius:12, border:"none", background:`linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, color:C.white, fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>
          + Novo Produto
        </button>
      </div>

      <input value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Buscar produto..."
        style={{ ...inputStyle, marginBottom:20, maxWidth:380 }} />

      {loading ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:14 }}>
          {Array(8).fill(0).map((_, i) => <div key={i} style={{ height:220, background:"#E5E7EB", borderRadius:14, animation:"pulse 1.5s infinite" }} />)}
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:14 }}>
          {products.map((p) => (
            <div key={p.id} style={{ background:C.white, borderRadius:14, overflow:"hidden", boxShadow:"0 1px 8px rgba(0,0,0,0.06)", opacity: p.isActive ? 1 : 0.55 }}>
              {/* Imagem ou emoji */}
              {p.imageUrl ? (
                <img src={p.imageUrl.startsWith("/uploads") ? `${API_ORIGIN}${p.imageUrl}` : p.imageUrl}
                  alt={p.name} style={{ width:"100%", height:100, objectFit:"cover" }}
                  onError={(e) => { e.target.style.display = "none"; }} />
              ) : (
                <div style={{ height:80, background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:44 }}>{p.emoji}</div>
              )}
              <div style={{ padding:"12px 14px" }}>
                {p.badge && <div style={{ background:`${C.primary}18`, color:C.primary, fontSize:10, fontWeight:700, borderRadius:6, padding:"2px 8px", display:"inline-block", marginBottom:6 }}>{p.badge}</div>}
                <div style={{ fontSize:14, fontWeight:800, color:C.textDark, marginBottom:2 }}>{p.name}</div>
                <div style={{ fontSize:11, color:C.textGray, marginBottom:8 }}>{p.description}</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <span style={{ fontSize:16, fontWeight:900, color:C.primaryDark }}>{fmt(p.price)}</span>
                  <span style={{ fontSize:11, color:C.textGray }}>Estoque: <strong style={{ color: p.stock < 5 ? C.red : C.textDark }}>{p.stock}</strong>{p.unit && p.unit !== "un" ? <span style={{ color:C.primary, marginLeft:4 }}>({p.unit})</span> : ""}</span>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={() => openEdit(p)} style={{ flex:1, padding:"7px", borderRadius:8, border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:12, background:"#EFF6FF", color:"#3B82F6" }}>✏️</button>
                  <button onClick={() => toggleActive(p)} style={{ flex:1, padding:"7px", borderRadius:8, border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:12, background: p.isActive ? "#FEF3C7" : "#D1FAE5", color: p.isActive ? "#D97706" : C.green }}>
                    {p.isActive ? "⏸" : "▶"}
                  </button>
                  <button onClick={() => remove(p.id)} disabled={deleting === p.id} style={{ padding:"7px 10px", borderRadius:8, border:"none", cursor:"pointer", background:"#FEE2E2", color:C.red }}>
                    {deleting === p.id ? "⏳" : "🗑️"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && products.length === 0 && (
        <div style={{ textAlign:"center", padding:80, color:C.textGray }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🐾</div>
          <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>Nenhum produto</div>
          <button onClick={openCreate} style={{ padding:"11px 24px", borderRadius:12, border:"none", background:`linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, color:C.white, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            Criar primeiro produto
          </button>
        </div>
      )}

      {/* Modal */}
      {modal !== null && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500, padding:16 }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div style={{ background:C.white, borderRadius:20, padding:28, width:"100%", maxWidth:500, maxHeight:"90vh", overflowY:"auto" }}>
            <h2 style={{ margin:"0 0 20px", fontSize:18, fontWeight:900, color:C.textDark }}>
              {modal === "create" ? "➕ Novo Produto" : `✏️ Editar: ${modal.name}`}
            </h2>

            <ImageUpload
              value={form.image_url}
              onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
              label="Foto do produto (opcional)"
              placeholder={form.emoji || "🐾"}
            />

            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div style={{ display:"grid", gridTemplateColumns:"60px 1fr", gap:10 }}>
                <div>
                  <label style={{ fontSize:12, color:C.textGray, fontWeight:700 }}>Emoji</label>
                  <input value={form.emoji} onChange={set("emoji")} maxLength={4}
                    style={{ ...inputStyle, textAlign:"center", fontSize:22 }} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:C.textGray, fontWeight:700 }}>Nome *</label>
                  <input value={form.name} onChange={set("name")} placeholder="Ex: Ração Premium" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ fontSize:12, color:C.textGray, fontWeight:700 }}>Descrição</label>
                {/* FASE 4: botão Gerar com IA */}
                <div style={{ position:"relative" }}>
                  <input value={form.description} onChange={set("description")} placeholder="Ex: 15kg • Frango e Arroz" style={{ ...inputStyle, paddingRight: 110 }} />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!form.name) { alert("Preencha o nome do produto primeiro."); return; }
                      const desc = await fetchAIDescription(form.name, form.emoji);
                      if (desc) setForm(f => ({ ...f, description: desc }));
                    }}
                    style={{
                      position:"absolute", right:6, top:"50%", transform:"translateY(-50%)",
                      background:"linear-gradient(135deg,#F7931E,#F15A24)", color:"#fff",
                      border:"none", borderRadius:8, padding:"4px 8px",
                      fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                      display:"flex", alignItems:"center", gap:4, whiteSpace:"nowrap",
                    }}
                  >
                    🤖 Gerar IA
                  </button>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div>
                  <label style={{ fontSize:12, color:C.textGray, fontWeight:700 }}>Preço (R$) *</label>
                  <input type="number" step="0.01" min="0" value={form.price} onChange={set("price")} placeholder="0,00" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:C.textGray, fontWeight:700 }}>Estoque</label>
                  <input type="number" min="0" value={form.stock} onChange={set("stock")} placeholder="0" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ fontSize:12, color:C.textGray, fontWeight:700 }}>Badge (opcional)</label>
                <input value={form.badge} onChange={set("badge")} placeholder="Ex: Mais Vendido, Novo, Premium" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize:12, color:C.textGray, fontWeight:700 }}>Unidade de Medida</label>
                <select value={form.unit} onChange={set("unit")} style={{ ...inputStyle, cursor:"pointer" }}>
                  <option value="un">un — Unidade</option>
                  <option value="kg">kg — Quilograma</option>
                  <option value="g">g — Grama</option>
                  <option value="L">L — Litro</option>
                  <option value="ml">ml — Mililitro</option>
                  <option value="m">m — Metro</option>
                  <option value="saca">Saca</option>
                  <option value="cx">cx — Caixa</option>
                  <option value="pct">pct — Pacote</option>
                </select>
              </div>
            </div>

            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <button onClick={closeModal}
                style={{ flex:1, padding:"12px", borderRadius:12, border:"2px solid #E5E7EB", background:C.white, cursor:"pointer", fontFamily:"inherit", fontWeight:700, color:C.textGray }}>
                Cancelar
              </button>
              <button onClick={save} disabled={saving || !form.name || !form.price}
                style={{ flex:2, padding:"12px", borderRadius:12, border:"none",
                  background: (saving || !form.name || !form.price) ? "#E5E7EB" : `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`,
                  color: (saving || !form.name || !form.price) ? C.textGray : C.white,
                  cursor: saving ? "wait" : "pointer", fontFamily:"inherit", fontWeight:700 }}>
                {saving ? "Salvando..." : modal === "create" ? "Criar Produto" : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}
