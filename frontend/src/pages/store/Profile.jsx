// frontend/src/pages/store/Profile.jsx
// ATUALIZADO: usa ImageUpload para logo da loja

import { useState, useEffect } from "react";
import { storeAPI } from "../../services/api";
import ImageUpload from "../../components/shared/ImageUpload";
import ChangePasswordCard from "../../components/shared/ChangePasswordCard";
import { useAuth } from "../../contexts/AuthContext";

const C = { primary:"#F7931E", primaryDark:"#F15A24", white:"#fff", bg:"#FFF8F2", textDark:"#1E1E2E", textGray:"#6B7280", green:"#10B981", red:"#EF4444" };

const inputStyle = {
  width:"100%", boxSizing:"border-box", padding:"11px 13px",
  borderRadius:10, border:"2px solid #E5E7EB", fontSize:14,
  fontFamily:"inherit", outline:"none", transition:"border-color .2s",
};

const EMPTY = {
  name:"", description:"", address:"", phone:"",
  is_open:false, delivery_fee:8.9,
  delivery_time_min:30, delivery_time_max:60, min_order_value:0,
  logo_url:"",
};

export default function StoreProfile() {
  const { logout } = useAuth();
  const [form,    setForm]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState({ msg:"", type:"" });

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg:"", type:"" }), 3000);
  };

  useEffect(() => {
    storeAPI.profile()
      .then(({ data }) => setForm({
        name:             data.name            || "",
        description:      data.description     || "",
        address:          data.address         || "",
        phone:            data.phone           || "",
        is_open:          data.isOpen          ?? false,
        delivery_fee:     data.deliveryFee     ?? 8.9,
        delivery_time_min:data.deliveryTimeMin ?? 30,
        delivery_time_max:data.deliveryTimeMax ?? 60,
        min_order_value:  data.minOrderValue   ?? 0,
        logo_url:         data.logoUrl         || "",
      }))
      .catch(() => setForm({ ...EMPTY }))
      .finally(() => setLoading(false));
  }, []);

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const save = async () => {
    if (!form.name?.trim()) return showToast("Nome da loja é obrigatório", "error");
    if (!form.address?.trim()) return showToast("Endereço é obrigatório", "error");
    setSaving(true);
    try {
      await storeAPI.updateProfile({
        name:            form.name,
        description:     form.description,
        address:         form.address,
        phone:           form.phone,
        is_open:         form.is_open,
        delivery_fee:    Number(form.delivery_fee),
        delivery_time_min: Number(form.delivery_time_min),
        delivery_time_max: Number(form.delivery_time_max),
        min_order_value: Number(form.min_order_value),
        logo_url:        form.logo_url || null,
      });
      showToast("✅ Loja atualizada com sucesso!");
    } catch (err) {
      showToast("⚠️ " + (err.response?.data?.error || "Erro ao salvar"), "error");
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ padding:32, display:"flex", alignItems:"center", gap:12, color:C.textGray }}>
      <span style={{ fontSize:24 }}>⏳</span> Carregando configurações...
    </div>
  );

  const fields = [
    { k:"name",        label:"Nome da Loja *",   placeholder:"Pet Shop Central", type:"text" },
    { k:"description", label:"Descrição",         placeholder:"Sua loja pet favorita...", type:"text" },
    { k:"address",     label:"Endereço *",        placeholder:"Rua das Flores, 123", type:"text" },
    { k:"phone",       label:"Telefone",          placeholder:"(11) 3333-0000", type:"text" },
  ];

  const deliveryFields = [
    { k:"delivery_fee",       label:"Taxa de Entrega (R$)", type:"number", step:"0.01", min:"0" },
    { k:"delivery_time_min",  label:"Tempo Mínimo (min)",   type:"number", step:"1",    min:"1" },
    { k:"delivery_time_max",  label:"Tempo Máximo (min)",   type:"number", step:"1",    min:"1" },
    { k:"min_order_value",    label:"Pedido Mínimo (R$)",   type:"number", step:"0.01", min:"0" },
  ];

  return (
    <div style={{ padding:"28px 32px" }}>
      {/* Toast */}
      {toast.msg && (
        <div style={{
          position:"fixed", top:20, right:24, zIndex:999,
          background: toast.type === "error" ? C.red : C.green,
          color:C.white, borderRadius:12, padding:"12px 20px",
          fontWeight:700, fontSize:14, boxShadow:"0 4px 20px rgba(0,0,0,0.2)",
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0, fontSize:24, fontWeight:900, color:C.textDark }}>🏪 Configurações da Loja</h1>
        <p style={{ margin:"6px 0 0", color:C.textGray, fontSize:14 }}>Gerencie as informações da sua loja</p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>

        {/* Coluna esquerda: Logo + Dados básicos */}
        <div>
          {/* Logo upload */}
          <div style={{ background:C.white, borderRadius:16, padding:24, boxShadow:"0 1px 8px rgba(0,0,0,0.06)", marginBottom:16 }}>
            <h3 style={{ margin:"0 0 16px", fontSize:16, fontWeight:800, color:C.textDark }}>🖼️ Logo da Loja</h3>
            <ImageUpload
              value={form.logo_url}
              onChange={(url) => setForm((f) => ({ ...f, logo_url: url }))}
              label=""
              placeholder="🏪"
            />
          </div>

          {/* Dados básicos */}
          <div style={{ background:C.white, borderRadius:16, padding:24, boxShadow:"0 1px 8px rgba(0,0,0,0.06)" }}>
            <h3 style={{ margin:"0 0 18px", fontSize:16, fontWeight:800, color:C.textDark }}>📋 Dados Básicos</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {fields.map((f) => (
                <div key={f.k}>
                  <label style={{ fontSize:12, color:C.textGray, fontWeight:700, display:"block", marginBottom:5 }}>{f.label}</label>
                  <input
                    type={f.type}
                    value={form[f.k]}
                    onChange={set(f.k)}
                    placeholder={f.placeholder}
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = C.primary}
                    onBlur={(e)  => e.target.style.borderColor = "#E5E7EB"}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coluna direita: Entrega + Status + Salvar */}
        <div>
          {/* Configurações de entrega */}
          <div style={{ background:C.white, borderRadius:16, padding:24, boxShadow:"0 1px 8px rgba(0,0,0,0.06)", marginBottom:16 }}>
            <h3 style={{ margin:"0 0 18px", fontSize:16, fontWeight:800, color:C.textDark }}>🚚 Entrega</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {deliveryFields.map((f) => (
                <div key={f.k}>
                  <label style={{ fontSize:12, color:C.textGray, fontWeight:700, display:"block", marginBottom:5 }}>{f.label}</label>
                  <input
                    type={f.type}
                    step={f.step}
                    min={f.min}
                    value={form[f.k]}
                    onChange={set(f.k)}
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = C.primary}
                    onBlur={(e)  => e.target.style.borderColor = "#E5E7EB"}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Toggle: Loja aberta/fechada */}
          <div style={{ background:C.white, borderRadius:16, padding:20, boxShadow:"0 1px 8px rgba(0,0,0,0.06)", marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontWeight:800, color:C.textDark, fontSize:15 }}>Status da Loja</div>
                <div style={{ fontSize:13, color: form.is_open ? C.green : C.textGray, fontWeight:600, marginTop:2 }}>
                  {form.is_open ? "🟢 Aberta para receber pedidos" : "🔴 Fechada"}
                </div>
              </div>
              {/* Toggle switch */}
              <label style={{ position:"relative", display:"inline-block", width:52, height:28, cursor:"pointer" }}>
                <input
                  type="checkbox"
                  checked={form.is_open}
                  onChange={set("is_open")}
                  style={{ opacity:0, width:0, height:0 }}
                />
                <span style={{
                  position:"absolute", inset:0,
                  background: form.is_open ? C.primary : "#D1D5DB",
                  borderRadius:28, transition:"background .2s",
                }}>
                  <span style={{
                    position:"absolute", width:22, height:22,
                    background:C.white, borderRadius:"50%",
                    top:3, left: form.is_open ? 27 : 3,
                    transition:"left .2s",
                    boxShadow:"0 1px 4px rgba(0,0,0,0.2)",
                  }} />
                </span>
              </label>
            </div>
          </div>

          {/* Preview das configurações */}
          <div style={{ background:`linear-gradient(135deg, #FFF0E0, #FFF8F2)`, borderRadius:14, padding:16, border:`1px solid ${C.primary}30`, marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:800, color:C.textDark, marginBottom:10 }}>👁️ Preview para clientes</div>
            <div style={{ display:"flex", gap:12, alignItems:"center" }}>
              {form.logo_url ? (
                <img
                  src={form.logo_url.startsWith("/uploads") ? `http://localhost:3001${form.logo_url}` : form.logo_url}
                  alt="Logo" style={{ width:48, height:48, borderRadius:10, objectFit:"cover" }}
                />
              ) : (
                <div style={{ width:48, height:48, borderRadius:10, background:C.primary, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>🏪</div>
              )}
              <div>
                <div style={{ fontSize:15, fontWeight:800, color:C.textDark }}>{form.name || "Nome da loja"}</div>
                <div style={{ fontSize:12, color:C.textGray }}>
                  ⏱️ {form.delivery_time_min}–{form.delivery_time_max} min
                  {" • "}
                  {Number(form.delivery_fee) === 0 ? "🆓 Grátis" : `🚚 R$ ${Number(form.delivery_fee).toFixed(2)}`}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving}
            style={{
              width:"100%", padding:"14px", borderRadius:12, border:"none",
              background: saving ? "#E5E7EB" : `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`,
              color: saving ? C.textGray : C.white,
              fontWeight:700, fontSize:15,
              cursor: saving ? "wait" : "pointer",
              fontFamily:"inherit",
            }}
          >
            {saving ? "⏳ Salvando..." : "💾 Salvar Configurações"}
          </button>

          <div style={{ marginTop:16 }}>
            <ChangePasswordCard onLoggedOut={logout} />
          </div>
        </div>
      </div>
    </div>
  );
}
