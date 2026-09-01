// frontend/src/components/shared/ChangePasswordCard.jsx
// Componente reutilizável de troca de senha — usado no painel admin, lojista e cliente

import { useState } from "react";
import { authAPI } from "../../services/api";

const C = { primary:"#F7931E", primaryDark:"#F15A24", white:"#fff", textDark:"#1E1E2E", textGray:"#6B7280", green:"#10B981", red:"#EF4444" };

const inputStyle = {
  width:"100%", boxSizing:"border-box", padding:"11px 13px",
  borderRadius:10, border:"2px solid #E5E7EB", fontSize:14,
  fontFamily:"inherit", outline:"none",
};

export default function ChangePasswordCard({ onLoggedOut }) {
  const [current,  setCurrent]  = useState("");
  const [next,     setNext]     = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState({ text:"", type:"" });

  const submit = async () => {
    setMsg({ text:"", type:"" });

    if (!current || !next || !confirm) {
      return setMsg({ text:"Preencha todos os campos", type:"error" });
    }
    if (next.length < 6) {
      return setMsg({ text:"A nova senha deve ter no mínimo 6 caracteres", type:"error" });
    }
    if (next !== confirm) {
      return setMsg({ text:"A confirmação não bate com a nova senha", type:"error" });
    }

    setSaving(true);
    try {
      await authAPI.changePassword({ current_password: current, new_password: next });
      setMsg({ text:"✅ Senha alterada! Você será desconectado por segurança...", type:"success" });
      setCurrent(""); setNext(""); setConfirm("");
      setTimeout(() => { onLoggedOut?.(); }, 1800);
    } catch (err) {
      setMsg({ text: err.response?.data?.error || "Erro ao trocar senha", type:"error" });
    } finally { setSaving(false); }
  };

  return (
    <div style={{ background:C.white, borderRadius:16, padding:24, boxShadow:"0 1px 8px rgba(0,0,0,0.06)" }}>
      <h3 style={{ margin:"0 0 18px", fontSize:16, fontWeight:800, color:C.textDark }}>🔒 Alterar Senha</h3>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <div>
          <label style={{ fontSize:12, color:C.textGray, fontWeight:700, display:"block", marginBottom:5 }}>Senha atual</label>
          <input type="password" value={current} onChange={(e)=>setCurrent(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize:12, color:C.textGray, fontWeight:700, display:"block", marginBottom:5 }}>Nova senha</label>
          <input type="password" value={next} onChange={(e)=>setNext(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize:12, color:C.textGray, fontWeight:700, display:"block", marginBottom:5 }}>Confirmar nova senha</label>
          <input type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {msg.text && (
        <div style={{ marginTop:12, fontSize:13, fontWeight:600, color: msg.type === "error" ? C.red : C.green }}>
          {msg.text}
        </div>
      )}

      <button
        onClick={submit}
        disabled={saving}
        style={{
          width:"100%", marginTop:16, padding:"12px", borderRadius:12, border:"none",
          background: saving ? "#E5E7EB" : `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`,
          color: saving ? C.textGray : C.white,
          fontWeight:700, fontSize:14, cursor: saving ? "wait" : "pointer", fontFamily:"inherit",
        }}
      >
        {saving ? "Salvando..." : "Alterar Senha"}
      </button>
    </div>
  );
}
