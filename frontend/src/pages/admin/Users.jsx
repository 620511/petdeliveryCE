// frontend/src/pages/admin/Users.jsx
import { useState, useEffect, useCallback } from "react";
import { adminAPI } from "../../services/api";

const C = { primary:"#F7931E", primaryDark:"#F15A24", white:"#fff", bg:"#F8F9FA", textDark:"#1E1E2E", textGray:"#6B7280", green:"#10B981", red:"#EF4444", blue:"#3B82F6" };

const ROLE_LABELS  = { customer:"Cliente", store_owner:"Lojista", admin:"Admin" };
const ROLE_COLORS  = { customer:C.blue, store_owner:C.primary, admin:"#8B5CF6" };

export default function AdminUsers() {
  const [users, setUsers]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [role, setRole]       = useState("");
  const [page, setPage]       = useState(1);
  const [saving, setSaving]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.users({ search, role, page, limit: 15 });
      setUsers(data.users);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [search, role, page]);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (user) => {
    setSaving(user.id);
    try {
      await adminAPI.updateUser(user.id, { ...user, is_active: !user.is_active });
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
    } finally {
      setSaving(null);
    }
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <div style={{ padding:"28px 32px" }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0, fontSize:24, fontWeight:900, color:C.textDark }}>👥 Usuários</h1>
        <p style={{ margin:"6px 0 0", color:C.textGray, fontSize:14 }}>{total} usuários cadastrados</p>
      </div>

      {/* Filtros */}
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="🔍 Buscar por nome ou e-mail..."
          style={{ flex:1, minWidth:220, padding:"10px 14px", borderRadius:10, border:"2px solid #E5E7EB", fontSize:14, fontFamily:"inherit", outline:"none" }} />
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}
          style={{ padding:"10px 14px", borderRadius:10, border:"2px solid #E5E7EB", fontSize:14, fontFamily:"inherit", outline:"none", background:C.white, cursor:"pointer" }}>
          <option value="">Todos os roles</option>
          <option value="customer">Clientes</option>
          <option value="store_owner">Lojistas</option>
        </select>
        <button onClick={load}
          style={{ padding:"10px 20px", borderRadius:10, border:"none", background:`linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, color:C.white, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          Atualizar
        </button>
      </div>

      {/* Tabela */}
      <div style={{ background:C.white, borderRadius:16, boxShadow:"0 1px 8px rgba(0,0,0,0.06)", overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:C.bg }}>
              {["Nome","E-mail","Role","Telefone","Último acesso","Status","Ações"].map((h) => (
                <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:12, fontWeight:800, color:C.textGray, textTransform:"uppercase", letterSpacing:0.5, whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(8).fill(0).map((_, i) => (
                <tr key={i}>
                  {Array(7).fill(0).map((_, j) => (
                    <td key={j} style={{ padding:"14px 16px" }}>
                      <div style={{ height:14, background:"#E5E7EB", borderRadius:7, width: j===0?"120px":"80px", animation:"pulse 1.5s infinite" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.map((u) => (
              <tr key={u.id} style={{ borderTop:"1px solid #F3F4F6" }}
                onMouseEnter={(e) => e.currentTarget.style.background = C.bg}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding:"12px 16px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:34, height:34, borderRadius:"50%", background:`${ROLE_COLORS[u.role]}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                      {u.role === "store_owner" ? "🏪" : u.role === "admin" ? "⚙️" : "👤"}
                    </div>
                    <span style={{ fontWeight:700, fontSize:14, color:C.textDark }}>{u.name}</span>
                  </div>
                </td>
                <td style={{ padding:"12px 16px", fontSize:13, color:C.textGray }}>{u.email}</td>
                <td style={{ padding:"12px 16px" }}>
                  <span style={{ background:`${ROLE_COLORS[u.role]}18`, color:ROLE_COLORS[u.role], fontWeight:700, fontSize:12, borderRadius:8, padding:"3px 10px" }}>
                    {ROLE_LABELS[u.role]}
                  </span>
                </td>
                <td style={{ padding:"12px 16px", fontSize:13, color:C.textGray }}>{u.phone || "—"}</td>
                <td style={{ padding:"12px 16px", fontSize:12, color:C.textGray }}>
                  {u.last_login ? new Date(u.last_login).toLocaleDateString("pt-BR") : "Nunca"}
                </td>
                <td style={{ padding:"12px 16px" }}>
                  <span style={{ background: u.is_active ? "#D1FAE5" : "#FEE2E2", color: u.is_active ? C.green : C.red, fontWeight:700, fontSize:12, borderRadius:8, padding:"3px 10px" }}>
                    {u.is_active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td style={{ padding:"12px 16px" }}>
                  <button onClick={() => toggleActive(u)} disabled={saving === u.id}
                    style={{ padding:"6px 14px", borderRadius:8, border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:12, background: u.is_active ? "#FEE2E2" : "#D1FAE5", color: u.is_active ? C.red : C.green }}>
                    {saving === u.id ? "..." : u.is_active ? "Desativar" : "Ativar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && users.length === 0 && (
          <div style={{ padding:48, textAlign:"center", color:C.textGray }}>Nenhum usuário encontrado</div>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:20 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              style={{ width:36, height:36, borderRadius:8, border:"none", cursor:"pointer", fontWeight:700, fontSize:13, background: p === page ? `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})` : C.white, color: p === page ? C.white : C.textGray, boxShadow:"0 1px 4px rgba(0,0,0,0.08)" }}>
              {p}
            </button>
          ))}
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}
