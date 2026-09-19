import { useEffect, useState } from "react";
import { privacyAPI } from "../../services/api";

const box = { background: "#fff", borderRadius: 18, padding: 20, boxShadow: "0 8px 30px rgba(0,0,0,.07)", marginBottom: 16 };
const btn = { border: "none", borderRadius: 10, padding: "11px 15px", background: "#F7931E", color: "#fff", fontWeight: 700, cursor: "pointer" };

export default function PrivacyPage() {
  const [data, setData] = useState(null);
  const [consents, setConsents] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [requesting, setRequesting] = useState("");

  const load = async () => {
    try {
      const [{ data: me }, { data: cs }] = await Promise.all([privacyAPI.me(), privacyAPI.consents()]);
      setData(me);
      const latest = {};
      for (const c of cs.consents || []) if (!(c.type in latest)) latest[c.type] = c.granted;
      setConsents(latest);
    } catch (e) {
      setMessage(e?.response?.data?.error || "Não foi possível carregar seus dados.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const update = async (type, granted) => {
    try {
      await privacyAPI.updateConsent({ type, granted });
      setConsents(v => ({ ...v, [type]: granted }));
      setMessage("Preferência de privacidade atualizada.");
    } catch (e) { setMessage(e?.response?.data?.error || "Erro ao atualizar."); }
  };

  const request = async (type) => {
    setRequesting(type); setMessage("");
    try {
      await privacyAPI.request({ type });
      setMessage("Solicitação registrada com sucesso.");
      await load();
    } catch (e) { setMessage(e?.response?.data?.error || "Erro ao registrar solicitação."); }
    finally { setRequesting(""); }
  };

  const exportData = async () => {
    try {
      const res = await privacyAPI.export();
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "petdelivery-meus-dados.json"; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setMessage(e?.response?.data?.error || "Erro ao exportar dados."); }
  };

  if (loading) return <div style={{ padding: 30 }}>Carregando privacidade...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#FFF8F2", padding: "30px 16px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <h1 style={{ color: "#F15A24" }}>🔐 Privacidade e Segurança</h1>
        <p style={{ color: "#555" }}>Controle seus dados pessoais e suas preferências no PetDeliveryCE.</p>

        {message && <div style={{ ...box, border: "1px solid #F7931E", color: "#7a4500" }}>{message}</div>}

        <section style={box}>
          <h2>Seus dados</h2>
          <p><b>Nome:</b> {data?.user?.name}</p>
          <p><b>E-mail:</b> {data?.user?.email}</p>
          <p><b>Telefone:</b> {data?.user?.phone || "Não informado"}</p>
          <p><b>Conta criada:</b> {data?.user?.createdAt ? new Date(data.user.createdAt).toLocaleString("pt-BR") : "-"}</p>
          <button style={btn} onClick={exportData}>Baixar meus dados</button>
        </section>

        <section style={box}>
          <h2>Preferências</h2>
          {[
            ["marketing", "Comunicações de marketing"],
            ["analytics", "Medição e análise"],
            ["cookies", "Cookies não essenciais"],
          ].map(([type, label]) => (
            <label key={type} style={{ display: "flex", justifyContent: "space-between", gap: 15, padding: "13px 0", borderBottom: "1px solid #eee" }}>
              <span>{label}</span>
              <input type="checkbox" checked={!!consents[type]} onChange={e => update(type, e.target.checked)} />
            </label>
          ))}
        </section>

        <section style={box}>
          <h2>Solicitações de direitos</h2>
          <p style={{ color: "#666" }}>Você pode solicitar acesso, portabilidade, correção ou exclusão, entre outros direitos previstos na legislação aplicável.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              ["access", "Solicitar acesso"],
              ["portability", "Solicitar portabilidade"],
              ["correction", "Solicitar correção"],
              ["deletion", "Solicitar exclusão"],
            ].map(([type, label]) => (
              <button key={type} style={{ ...btn, opacity: requesting === type ? .6 : 1 }} disabled={!!requesting} onClick={() => request(type)}>
                {requesting === type ? "Enviando..." : label}
              </button>
            ))}
          </div>
        </section>

        <section style={box}>
          <h2>Documentos</h2>
          <p><a href="/privacidade">Política de Privacidade</a></p>
          <p><a href="/termos">Termos de Uso</a></p>
          <p><a href="/cookies">Política de Cookies</a></p>
        </section>
      </div>
    </div>
  );
}
