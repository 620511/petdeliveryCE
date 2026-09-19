// frontend/src/components/layout/StoreLayout.jsx
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const C = { primary:"#F7931E", primaryDark:"#F15A24", white:"#FFFFFF", bg:"#FFF8F2", sidebar:"#1A2332" };

const nav = [
  { to:"/store",            label:"Dashboard",    icon:"📊", end:true },
  { to:"/store/products",   label:"Produtos",     icon:"🐾" },
  { to:"/store/orders",     label:"Pedidos",      icon:"📦" },
  { to:"/store/payouts",    label:"Repasses",     icon:"💸" },    // Fase 3
  { to:"/store/assistant",     label:"Assistente IA", icon:"🤖" },   // FASE 4
  { to:"/store/delivery-zones", label:"Faixas de Frete", icon:"🗺️" }, // FRETE DINÂMICO
  { to:"/store/profile",    label:"Minha Loja",   icon:"🏪" },
  { to:"/minha-privacidade", label:"Privacidade e LGPD", icon:"🔐" },
];

export default function StoreLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => { await logout(); navigate("/login"); };

  return (
    <div style={{ display:"flex", minHeight:"100vh", fontFamily:"'Nunito','Segoe UI',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');*{box-sizing:border-box}body{margin:0}`}</style>

      <aside style={{ width:240, background:C.sidebar, display:"flex", flexDirection:"column", position:"fixed", height:"100vh", zIndex:100 }}>
        <div style={{ padding:"24px 20px 20px", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:32 }}>🐾</span>
            <div>
              <div style={{ fontSize:17, fontWeight:900, color:C.primary }}>PetDelivery</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:2 }}>Painel Lojista</div>
            </div>
          </div>
        </div>

        <nav style={{ flex:1, padding:"16px 12px" }}>
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}
              style={({ isActive }) => ({
                display:"flex", alignItems:"center", gap:12, padding:"11px 14px",
                borderRadius:10, marginBottom:4, textDecoration:"none", transition:"all .15s",
                background: isActive ? `${C.primary}25` : "transparent",
                color: isActive ? C.primary : "rgba(255,255,255,0.65)",
                fontWeight: isActive ? 800 : 600, fontSize:14,
              })}>
              <span style={{ fontSize:18 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding:"16px 12px 20px", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:C.primary, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🏪</div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{user?.name}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>Lojista</div>
            </div>
          </div>
          <button onClick={handleLogout}
            style={{ width:"100%", background:"rgba(244,67,54,0.15)", border:"1px solid rgba(244,67,54,0.3)", borderRadius:10, padding:"9px", color:"#EF9A9A", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}>
            Sair
          </button>
        </div>
      </aside>

      <main style={{ marginLeft:240, flex:1, background:C.bg, minHeight:"100vh" }}>
        <Outlet />
      </main>
    </div>
  );
}
