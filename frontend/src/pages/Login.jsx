// frontend/src/pages/Login.jsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const C = { primary:"#F7931E", primaryDark:"#F15A24", white:"#FFFFFF", gray:"#F4F4F4", textGray:"#999", textDark:"#333", red:"#F44336" };

const redirectByRole = { admin: "/admin", store_owner: "/store", customer: "/app" };

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || null;

  const [mode, setMode]       = useState("login"); // login | register
  const [role, setRole]       = useState("customer");
  const [form, setForm]       = useState({ name:"", email:"", password:"", phone:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let user;
      if (mode === "login") {
        user = await login(form.email, form.password);
      } else {
        user = await register({ ...form, role });
      }
      navigate(from || redirectByRole[user.role] || "/");
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width:"100%", boxSizing:"border-box", padding:"12px 14px",
    borderRadius:12, border:`2px solid #E0E0E0`, fontSize:14,
    fontFamily:"inherit", outline:"none", transition:"border-color .2s",
  };

  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(160deg, ${C.primary}, ${C.primaryDark})`, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.white, borderRadius:24, padding:36, width:"100%", maxWidth:420, boxShadow:"0 24px 60px rgba(0,0,0,0.2)" }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:52, marginBottom:8 }}>🐾</div>
          <div style={{ fontSize:24, fontWeight:900, color:C.primary }}>
            Pet<span style={{ color:C.primaryDark }}>Delivery</span>
          </div>
          <div style={{ fontSize:13, color:C.textGray, marginTop:4 }}>
            {mode === "login" ? "Acesse sua conta" : "Crie sua conta"}
          </div>
        </div>

        {/* Mode tabs */}
        <div style={{ display:"flex", gap:8, marginBottom:20, background:C.gray, borderRadius:12, padding:4 }}>
          {["login","register"].map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(""); }}
              style={{ flex:1, padding:"10px", border:"none", borderRadius:10, cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13, background: mode===m ? C.white : "transparent", color: mode===m ? C.primary : C.textGray, boxShadow: mode===m ? "0 2px 8px rgba(0,0,0,0.08)" : "none", transition:"all .2s" }}>
              {m === "login" ? "Entrar" : "Cadastrar"}
            </button>
          ))}
        </div>

        {/* Role selector (register only) */}
        {mode === "register" && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.textGray, marginBottom:8 }}>Tipo de conta</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {[{ v:"customer", label:"Cliente 👤", sub:"Comprar produtos" }, { v:"store_owner", label:"Lojista 🏪", sub:"Vender produtos" }].map((o) => (
                <button key={o.v} onClick={() => setRole(o.v)}
                  style={{ padding:"12px 10px", border: role===o.v ? `2px solid ${C.primary}` : "2px solid #E0E0E0", borderRadius:12, background: role===o.v ? `${C.primary}15` : C.white, cursor:"pointer", fontFamily:"inherit", textAlign:"left", transition:"all .15s" }}>
                  <div style={{ fontWeight:800, fontSize:13, color: role===o.v ? C.primary : C.textDark }}>{o.label}</div>
                  <div style={{ fontSize:11, color:C.textGray }}>{o.sub}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {mode === "register" && (
            <input value={form.name} onChange={set("name")} placeholder="Nome completo" required style={inputStyle}
              onFocus={(e)=>e.target.style.borderColor=C.primary} onBlur={(e)=>e.target.style.borderColor="#E0E0E0"} />
          )}
          <input type="email" value={form.email} onChange={set("email")} placeholder="E-mail" required style={inputStyle}
            onFocus={(e)=>e.target.style.borderColor=C.primary} onBlur={(e)=>e.target.style.borderColor="#E0E0E0"} />
          <input type="password" value={form.password} onChange={set("password")} placeholder="Senha" required style={inputStyle}
            onFocus={(e)=>e.target.style.borderColor=C.primary} onBlur={(e)=>e.target.style.borderColor="#E0E0E0"} />
          {mode === "register" && (
            <input value={form.phone} onChange={set("phone")} placeholder="Telefone (opcional)" style={inputStyle}
              onFocus={(e)=>e.target.style.borderColor=C.primary} onBlur={(e)=>e.target.style.borderColor="#E0E0E0"} />
          )}

          {error && (
            <div style={{ background:"#FFF0F0", color:C.red, borderRadius:10, padding:"10px 14px", fontSize:13, fontWeight:600 }}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ background:`linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, color:C.white, border:"none", borderRadius:12, padding:"14px", fontSize:15, fontWeight:700, cursor: loading?"wait":"pointer", opacity: loading?0.8:1, fontFamily:"inherit", marginTop:4 }}>
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        {/* Demo credentials */}
        <div style={{ marginTop:24, background:C.gray, borderRadius:12, padding:14 }}>
          <div style={{ fontSize:11, fontWeight:800, color:C.textGray, marginBottom:8 }}>CREDENCIAIS DE DEMO</div>
          {[
            { label:"Admin",   email:"admin@petdelivery.com", pass:"admin123" },
            { label:"Lojista", email:"loja@petdelivery.com",  pass:"loja123" },
            { label:"Cliente", email:"joao@email.com",         pass:"cliente123" },
          ].map((d) => (
            <div key={d.label}
              onClick={() => { setForm(f=>({...f, email:d.email, password:d.pass})); setMode("login"); }}
              style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"5px 0", cursor:"pointer", color:C.textDark, borderBottom:"1px solid #E8E8E8" }}>
              <span style={{ fontWeight:700, color:C.primary }}>{d.label}</span>
              <span style={{ color:C.textGray }}>{d.email}</span>
            </div>
          ))}
          <div style={{ fontSize:11, color:C.textGray, marginTop:8 }}>Clique para preencher</div>
        </div>
      </div>
    </div>
  );
}
