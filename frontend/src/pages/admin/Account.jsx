// frontend/src/pages/admin/Account.jsx
import { useAuth } from "../../contexts/AuthContext";
import ChangePasswordCard from "../../components/shared/ChangePasswordCard";

const C = { textDark:"#333", textGray:"#999" };

export default function AdminAccount() {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding:"28px 32px", maxWidth:480 }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0, fontSize:24, fontWeight:900, color:C.textDark }}>👤 Minha Conta</h1>
        <p style={{ margin:"6px 0 0", color:C.textGray, fontSize:14 }}>{user?.name} • {user?.email}</p>
      </div>

      <ChangePasswordCard onLoggedOut={logout} />
    </div>
  );
}
