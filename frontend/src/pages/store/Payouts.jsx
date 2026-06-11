// frontend/src/pages/store/Payouts.jsx
// FASE 3: tela de repasses — saldo, histórico e configuração do método

import { useState, useEffect } from "react";
import { storeAPI } from "../../services/api";

const C = {
  primary:     "#F7931E",
  primaryDark: "#F15A24",
  green:       "#10B981",
  greenLight:  "#D1FAE5",
  yellow:      "#F59E0B",
  yellowLight: "#FEF3C7",
  blue:        "#3B82F6",
  blueLight:   "#DBEAFE",
  gray:        "#F3F4F6",
  textDark:    "#1E1E2E",
  textGray:    "#6B7280",
  white:       "#FFFFFF",
  border:      "#E5E7EB",
};

const fmt = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusLabel = {
  pending:    { label: "Pendente",    color: C.yellow,      bg: C.yellowLight },
  processing: { label: "Processando", color: C.blue,        bg: C.blueLight   },
  paid:       { label: "Pago ✓",      color: C.green,       bg: C.greenLight  },
  failed:     { label: "Falhou",      color: "#EF4444",     bg: "#FEE2E2"     },
};

export default function StorePayouts() {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState("history"); // "history" | "settings"
  const [saving,   setSaving]   = useState(false);
  const [mpLoading, setMpLoading] = useState(false);

  useEffect(() => {
    load();
    // Detectar retorno do OAuth MP
    const params = new URLSearchParams(window.location.search);
    if (params.get("mp_connected") === "true") {
      alert("✅ Conta Mercado Pago conectada com sucesso!");
      window.history.replaceState({}, "", window.location.pathname);
      load();
    }
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const { data: d } = await storeAPI.payouts();
      setData(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetMethod = async (method) => {
    if (method === "mp_split" && !data?.mp_connected) {
      alert("Você precisa conectar sua conta Mercado Pago primeiro.");
      return;
    }
    setSaving(true);
    try {
      await storeAPI.setPayoutMethod(method);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao atualizar método.");
    } finally {
      setSaving(false);
    }
  };

  const handleMpConnect = async () => {
    setMpLoading(true);
    try {
      const { data: d } = await storeAPI.mpConnectUrl();
      window.location.href = d.url;
    } catch (err) {
      alert("Erro ao iniciar conexão com Mercado Pago.");
      setMpLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
      <div style={{ fontSize: 14, color: C.textGray }}>Carregando repasses...</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: C.textDark, margin: 0 }}>
          💸 Repasses
        </h2>
        <p style={{ fontSize: 13, color: C.textGray, marginTop: 4 }}>
          Seu saldo e histórico de pagamentos da plataforma
        </p>
      </div>

      {/* Saldo cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        <div style={{ background: C.yellowLight, borderRadius: 16, padding: "18px 20px", border: `1px solid #FCD34D` }}>
          <div style={{ fontSize: 12, color: C.yellow, fontWeight: 700, marginBottom: 6 }}>
            🕐 A RECEBER
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#92400E" }}>
            {fmt(data?.balance?.pending)}
          </div>
          <div style={{ fontSize: 11, color: "#B45309", marginTop: 4 }}>
            Pedidos entregues aguardando repasse
          </div>
        </div>
        <div style={{ background: C.greenLight, borderRadius: 16, padding: "18px 20px", border: `1px solid #6EE7B7` }}>
          <div style={{ fontSize: 12, color: C.green, fontWeight: 700, marginBottom: 6 }}>
            ✅ RECEBIDO
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#065F46" }}>
            {fmt(data?.balance?.paid)}
          </div>
          <div style={{ fontSize: 11, color: "#047857", marginTop: 4 }}>
            Total já depositado
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.gray, borderRadius: 12, padding: 4 }}>
        {[
          { id: "history",  label: "📋 Histórico" },
          { id: "settings", label: "⚙️ Método de Repasse" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: "9px 0", borderRadius: 9, border: "none",
              background: tab === t.id ? C.white : "transparent",
              boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              fontWeight: 700, fontSize: 13, cursor: "pointer",
              color: tab === t.id ? C.textDark : C.textGray,
              fontFamily: "inherit", transition: "all .15s",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Histórico ────────────────────────────────────────── */}
      {tab === "history" && (
        <div>
          {!data?.payouts?.length ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: C.textGray }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 14 }}>Nenhum repasse ainda</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                Após o primeiro pedido entregue, ele aparecerá aqui.
              </div>
            </div>
          ) : (
            data.payouts.map((p) => {
              const s = statusLabel[p.status] || statusLabel.pending;
              return (
                <div key={p.id} style={{
                  background: C.white, borderRadius: 14, padding: "16px 18px",
                  marginBottom: 10, border: `1px solid ${C.border}`,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.textDark }}>
                        Pedido #{p.order_id.slice(-6).toUpperCase()}
                      </div>
                      <div style={{ fontSize: 11, color: C.textGray, marginTop: 2 }}>
                        {p.customer} • {new Date(p.order_date).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "3px 10px",
                      borderRadius: 99, background: s.bg, color: s.color,
                    }}>
                      {s.label}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 12, color: C.textGray }}>
                      Total pedido: <strong>{fmt(p.order_total)}</strong>
                      <span style={{ margin: "0 6px", color: C.border }}>•</span>
                      Taxa (5%): <strong style={{ color: "#EF4444" }}>
                        −{fmt(p.order_total - p.amount)}
                      </strong>
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 900, color: C.green }}>
                      {fmt(p.amount)}
                    </div>
                  </div>

                  {p.status === "paid" && p.paid_at && (
                    <div style={{ marginTop: 8, fontSize: 11, color: C.green }}>
                      ✓ Recebido em {new Date(p.paid_at).toLocaleDateString("pt-BR")}
                      {p.receipt && (
                        <span style={{ marginLeft: 8, color: C.blue, cursor: "pointer" }}
                          onClick={() => alert(`Comprovante: ${p.receipt}`)}>
                          Ver comprovante
                        </span>
                      )}
                    </div>
                  )}

                  <div style={{ marginTop: 6, fontSize: 11, color: C.textGray }}>
                    Método: {p.method === "mp_split" ? "🔄 Split automático MP" : "🏦 Repasse manual"}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Tab: Configurações de repasse ─────────────────────────── */}
      {tab === "settings" && (
        <div>
          <div style={{ fontSize: 13, color: C.textGray, marginBottom: 20, lineHeight: 1.6 }}>
            Escolha como deseja receber os repasses da plataforma.
            A taxa de <strong>5%</strong> é sempre retida sobre o subtotal do pedido.
          </div>

          {/* Opção 1: MP Split */}
          <div style={{
            background: C.white, borderRadius: 16, padding: 20,
            border: `2px solid ${data?.payout_method === "mp_split" ? C.primary : C.border}`,
            marginBottom: 12, cursor: "pointer", transition: "border .15s",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ fontSize: 32, flexShrink: 0 }}>⚡</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: C.textDark }}>
                    Split Automático — Mercado Pago
                  </div>
                  {data?.payout_method === "mp_split" && (
                    <span style={{ fontSize: 11, background: "#D1FAE5", color: "#065F46", padding: "2px 10px", borderRadius: 99, fontWeight: 700 }}>
                      ATIVO
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: C.textGray, marginTop: 4, lineHeight: 1.5 }}>
                  Receba automaticamente na sua conta Mercado Pago a cada pedido pago online.
                  O valor líquido cai na sua conta em minutos, sem precisar de intervenção manual.
                </div>

                {/* Status da conexão MP */}
                <div style={{
                  marginTop: 12, padding: "10px 14px", borderRadius: 10,
                  background: data?.mp_connected ? "#D1FAE5" : "#FEF3C7",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                }}>
                  <div style={{ fontSize: 12, color: data?.mp_connected ? "#065F46" : "#92400E", fontWeight: 600 }}>
                    {data?.mp_connected
                      ? "✅ Conta Mercado Pago conectada"
                      : "⚠️ Conta Mercado Pago não conectada"}
                  </div>
                  {!data?.mp_connected && (
                    <button
                      onClick={handleMpConnect}
                      disabled={mpLoading}
                      style={{
                        background: C.primary, color: C.white, border: "none",
                        borderRadius: 8, padding: "6px 14px", fontSize: 12,
                        fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                        flexShrink: 0,
                      }}>
                      {mpLoading ? "..." : "Conectar"}
                    </button>
                  )}
                </div>

                {data?.payout_method !== "mp_split" && (
                  <button
                    onClick={() => handleSetMethod("mp_split")}
                    disabled={saving || !data?.mp_connected}
                    style={{
                      marginTop: 12, padding: "9px 20px", borderRadius: 10, border: "none",
                      background: data?.mp_connected ? C.primary : C.gray,
                      color: data?.mp_connected ? C.white : C.textGray,
                      fontWeight: 700, fontSize: 13, cursor: data?.mp_connected ? "pointer" : "not-allowed",
                      fontFamily: "inherit",
                    }}>
                    {saving ? "Salvando..." : "Ativar Split Automático"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Opção 2: Repasse Manual */}
          <div style={{
            background: C.white, borderRadius: 16, padding: 20,
            border: `2px solid ${data?.payout_method === "manual" ? C.primary : C.border}`,
            marginBottom: 24, cursor: "pointer", transition: "border .15s",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ fontSize: 32, flexShrink: 0 }}>🏦</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: C.textDark }}>
                    Repasse Manual
                  </div>
                  {data?.payout_method === "manual" && (
                    <span style={{ fontSize: 11, background: "#D1FAE5", color: "#065F46", padding: "2px 10px", borderRadius: 99, fontWeight: 700 }}>
                      ATIVO
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: C.textGray, marginTop: 4, lineHeight: 1.5 }}>
                  O administrador da plataforma realiza o repasse manualmente via PIX, TED ou outro método.
                  Você pode acompanhar o status aqui e receber o comprovante.
                </div>

                {data?.payout_method !== "manual" && (
                  <button
                    onClick={() => handleSetMethod("manual")}
                    disabled={saving}
                    style={{
                      marginTop: 12, padding: "9px 20px", borderRadius: 10, border: `1px solid ${C.border}`,
                      background: C.white, color: C.textDark,
                      fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                    }}>
                    {saving ? "Salvando..." : "Usar Repasse Manual"}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div style={{
            background: "#FFF8F2", borderRadius: 12, padding: "12px 16px",
            fontSize: 12, color: "#92400E", lineHeight: 1.6,
            border: "1px solid #FCD34D",
          }}>
            💡 <strong>Como funciona a taxa:</strong> A plataforma retém 5% do subtotal de cada pedido.
            O valor que você recebe = Total do pedido − Taxa da plataforma (não inclui o frete).
          </div>
        </div>
      )}
    </div>
  );
}
