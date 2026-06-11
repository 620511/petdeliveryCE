// frontend/src/pages/admin/Payouts.jsx
// FASE 3: painel admin de repasses — listar, filtrar e marcar como pago

import { useState, useEffect, useCallback } from "react";
import { adminAPI } from "../../services/api";

const C = {
  primary:     "#F7931E",
  primaryDark: "#F15A24",
  green:       "#10B981",
  greenLight:  "#D1FAE5",
  yellow:      "#F59E0B",
  yellowLight: "#FEF3C7",
  blue:        "#3B82F6",
  blueLight:   "#DBEAFE",
  red:         "#EF4444",
  redLight:    "#FEE2E2",
  gray:        "#F3F4F6",
  white:       "#FFFFFF",
  textDark:    "#1E1E2E",
  textGray:    "#6B7280",
  border:      "#E5E7EB",
};

const fmt = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS = {
  pending:    { label: "Pendente",    color: C.yellow, bg: C.yellowLight },
  processing: { label: "Processando", color: C.blue,   bg: C.blueLight   },
  paid:       { label: "Pago ✓",      color: C.green,  bg: C.greenLight  },
  failed:     { label: "Falhou",      color: C.red,    bg: C.redLight    },
};

export default function AdminPayouts() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState("pending");
  const [modal,      setModal]      = useState(null);  // payout selecionado para marcar como pago
  const [receipt,    setReceipt]    = useState("");
  const [note,       setNote]       = useState("");
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await adminAPI.payouts({ status: filter || undefined });
      setData(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleMarkPaid = async () => {
    if (!modal) return;
    setSaving(true);
    try {
      await adminAPI.markPaid(modal.id, { receipt, admin_note: note });
      setModal(null);
      setReceipt("");
      setNote("");
      load();
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao registrar repasse.");
    } finally {
      setSaving(false);
    }
  };

  const filters = [
    { id: "",         label: "Todos"       },
    { id: "pending",  label: "⏳ Pendente" },
    { id: "paid",     label: "✅ Pagos"    },
    { id: "processing", label: "🔄 MP Split" },
  ];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: C.textDark, margin: 0 }}>
          💸 Repasses às Lojas
        </h2>
        <p style={{ fontSize: 13, color: C.textGray, marginTop: 4 }}>
          Gerencie os repasses pendentes e registre os pagamentos realizados
        </p>
      </div>

      {/* Resumo financeiro */}
      {data?.summary && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          <div style={{ background: C.yellowLight, borderRadius: 16, padding: "16px 20px", border: "1px solid #FCD34D" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.yellow, marginBottom: 4 }}>
              A REPASSAR
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#92400E" }}>
              {fmt(data.summary.pending_amount)}
            </div>
            <div style={{ fontSize: 11, color: "#B45309", marginTop: 2 }}>
              {data.payouts?.filter(p => p.status === "pending").length || 0} repasses pendentes
            </div>
          </div>
          <div style={{ background: C.greenLight, borderRadius: 16, padding: "16px 20px", border: "1px solid #6EE7B7" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 4 }}>
              JÁ REPASSADO
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#065F46" }}>
              {fmt(data.summary.paid_amount)}
            </div>
            <div style={{ fontSize: 11, color: "#047857", marginTop: 2 }}>
              Total pago às lojas
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {filters.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{
              padding: "7px 14px", borderRadius: 99, border: "none", fontSize: 12,
              fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              background: filter === f.id ? C.primary : C.gray,
              color:      filter === f.id ? C.white   : C.textGray,
              transition: "all .15s",
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: C.textGray, fontSize: 13 }}>
          Carregando...
        </div>
      ) : !data?.payouts?.length ? (
        <div style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 14, color: C.textGray }}>
            {filter === "pending" ? "Nenhum repasse pendente!" : "Nenhum registro encontrado."}
          </div>
        </div>
      ) : (
        data.payouts.map((p) => {
          const s = STATUS[p.status] || STATUS.pending;
          return (
            <div key={p.id} style={{
              background: C.white, borderRadius: 14, padding: "16px 18px",
              marginBottom: 10, border: `1px solid ${C.border}`,
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>

                {/* Info da loja */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    {p.store_logo ? (
                      <img src={p.store_logo} alt={p.store_name}
                        style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#FFF3E8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏪</div>
                    )}
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: C.textDark }}>
                        {p.store_name}
                      </div>
                      <div style={{ fontSize: 11, color: C.textGray }}>
                        Pedido #{p.order_id.slice(-6).toUpperCase()} • {p.customer}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 16, fontSize: 12, color: C.textGray, flexWrap: "wrap" }}>
                    <span>Total pedido: <strong style={{ color: C.textDark }}>{fmt(p.order_total)}</strong></span>
                    <span>Taxa (5%): <strong style={{ color: C.red }}>−{fmt(p.order_total - p.amount)}</strong></span>
                    <span>Método: <strong>{p.method === "mp_split" ? "🔄 MP Split" : "🏦 Manual"}</strong></span>
                  </div>

                  {p.status === "paid" && p.paid_at && (
                    <div style={{ marginTop: 4, fontSize: 11, color: C.green }}>
                      ✓ Pago em {new Date(p.paid_at).toLocaleDateString("pt-BR")}
                      {p.receipt && <span style={{ marginLeft: 8 }}>• Comprovante: {p.receipt}</span>}
                    </div>
                  )}
                </div>

                {/* Valor + ação */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: C.green }}>
                    {fmt(p.amount)}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 10px",
                    borderRadius: 99, background: s.bg, color: s.color,
                  }}>
                    {s.label}
                  </span>
                  {p.status === "pending" && p.method === "manual" && (
                    <button
                      onClick={() => { setModal(p); setReceipt(""); setNote(""); }}
                      style={{
                        padding: "7px 14px", borderRadius: 9, border: "none",
                        background: C.primary, color: C.white,
                        fontWeight: 700, fontSize: 12, cursor: "pointer",
                        fontFamily: "inherit",
                      }}>
                      Registrar Pagamento
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* ── Modal: Registrar pagamento manual ─────────────────────── */}
      {modal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setModal(null)}
        >
          <div
            style={{ background: C.white, borderRadius: 20, padding: 28, width: "100%", maxWidth: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 900, fontSize: 18, color: C.textDark, marginBottom: 4 }}>
              💸 Registrar Repasse
            </div>
            <div style={{ fontSize: 13, color: C.textGray, marginBottom: 20 }}>
              {modal.store_name} • {fmt(modal.amount)}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.textDark, display: "block", marginBottom: 6 }}>
                Comprovante (PIX/TED/texto)
              </label>
              <input
                value={receipt}
                onChange={(e) => setReceipt(e.target.value)}
                placeholder="Código do PIX, ID da transferência, ou descrição..."
                style={{
                  width: "100%", boxSizing: "border-box", padding: "10px 12px",
                  borderRadius: 10, border: `1.5px solid ${C.border}`,
                  fontSize: 13, fontFamily: "inherit", outline: "none",
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.textDark, display: "block", marginBottom: 6 }}>
                Observação (opcional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Alguma observação para o lojista..."
                rows={3}
                style={{
                  width: "100%", boxSizing: "border-box", padding: "10px 12px",
                  borderRadius: 10, border: `1.5px solid ${C.border}`,
                  fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setModal(null)}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 12,
                  border: `1px solid ${C.border}`, background: C.white,
                  fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                  color: C.textGray,
                }}>
                Cancelar
              </button>
              <button
                onClick={handleMarkPaid}
                disabled={saving}
                style={{
                  flex: 2, padding: "12px 0", borderRadius: 12, border: "none",
                  background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`,
                  color: C.white, fontWeight: 800, fontSize: 14,
                  cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
                  opacity: saving ? 0.8 : 1,
                }}>
                {saving ? "Registrando..." : "✅ Confirmar Pagamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
