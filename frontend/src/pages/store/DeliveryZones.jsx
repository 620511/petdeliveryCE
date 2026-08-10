// frontend/src/pages/store/DeliveryZones.jsx
// FRETE DINÂMICO: tela para o lojista configurar faixas de entrega por distância

import { useState, useEffect } from "react";
import { storeAPI } from "../../services/api";

const C = {
  primary:     "#F7931E",
  primaryDark: "#F15A24",
  green:       "#10B981",
  greenLight:  "#D1FAE5",
  blue:        "#3B82F6",
  blueLight:   "#DBEAFE",
  red:         "#EF4444",
  redLight:    "#FEE2E2",
  gray:        "#F3F4F6",
  white:       "#FFFFFF",
  dark:        "#1E1E2E",
  textGray:    "#6B7280",
  border:      "#E5E7EB",
};

const fmt = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const EMPTY_ZONE = { max_km: "", fee: "", free_above: "" };

export default function DeliveryZones() {
  const [zones,      setZones]      = useState([]);
  const [hasCoords,  setHasCoords]  = useState(false);
  const [storeLat,   setStoreLat]   = useState(null);
  const [storeLng,   setStoreLng]   = useState(null);
  const [fallbackFee, setFallbackFee] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [geocoding,  setGeocoding]  = useState(false);
  const [toast,      setToast]      = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await storeAPI.deliveryZones();
      setZones(data.zones.length ? data.zones.map(z => ({
        id:         z.id,
        max_km:     z.maxKm,
        fee:        z.fee,
        free_above: z.freeAbove || "",
      })) : [{ ...EMPTY_ZONE }]);
      setHasCoords(data.has_coords);
      setStoreLat(data.store_lat);
      setStoreLng(data.store_lng);
      setFallbackFee(data.fallback_fee);
    } catch { showToast("Erro ao carregar faixas", "error"); }
    finally  { setLoading(false); }
  };

  const handleGeocode = async () => {
    setGeocoding(true);
    try {
      const { data } = await storeAPI.geocodeStore();
      setHasCoords(true);
      setStoreLat(data.lat);
      setStoreLng(data.lng);
      showToast(`✅ Localização encontrada: ${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}`);
    } catch (err) {
      showToast(err.response?.data?.error || "Não foi possível localizar o endereço", "error");
    } finally { setGeocoding(false); }
  };

  const addZone = () => setZones(z => [...z, { ...EMPTY_ZONE }]);

  const removeZone = (i) => {
    if (zones.length === 1) return showToast("Deve ter pelo menos uma faixa", "error");
    setZones(z => z.filter((_, idx) => idx !== i));
  };

  const updateZone = (i, field, value) =>
    setZones(z => z.map((z2, idx) => idx === i ? { ...z2, [field]: value } : z2));

  const save = async () => {
    // Validar
    for (let i = 0; i < zones.length; i++) {
      const z = zones[i];
      if (!z.max_km || Number(z.max_km) <= 0)
        return showToast(`Faixa ${i + 1}: distância máxima inválida`, "error");
      if (z.fee === "" || Number(z.fee) < 0)
        return showToast(`Faixa ${i + 1}: taxa inválida`, "error");
    }

    // Verificar que max_km são únicos e crescentes
    const kms = zones.map(z => Number(z.max_km));
    if (new Set(kms).size !== kms.length)
      return showToast("Distâncias máximas não podem ser repetidas", "error");

    setSaving(true);
    try {
      const payload = zones.map(z => ({
        max_km:     Number(z.max_km),
        fee:        Number(z.fee),
        free_above: z.free_above ? Number(z.free_above) : null,
      }));
      const { data } = await storeAPI.saveDeliveryZones(payload);
      setZones(data.zones.map(z => ({
        id: z.id, max_km: z.maxKm, fee: z.fee, free_above: z.freeAbove || "",
      })));
      showToast("✅ Faixas de entrega salvas com sucesso!");
    } catch (err) {
      showToast(err.response?.data?.error || "Erro ao salvar", "error");
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
      <div style={{ fontSize: 14, color: C.textGray }}>Carregando...</div>
    </div>
  );

  // Ordena faixas por max_km para exibição
  const sorted = [...zones].sort((a, b) => Number(a.max_km) - Number(b.max_km));

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 999,
          padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 13,
          background: toast.type === "error" ? C.redLight   : C.greenLight,
          color:      toast.type === "error" ? C.red        : C.green,
          border:     `1px solid ${toast.type === "error" ? "#FCA5A5" : "#6EE7B7"}`,
          boxShadow:  "0 4px 20px rgba(0,0,0,0.12)",
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: C.dark, margin: 0 }}>
          🗺️ Faixas de Entrega
        </h2>
        <p style={{ fontSize: 13, color: C.textGray, marginTop: 4 }}>
          Configure o frete por distância. O sistema calcula automaticamente para cada cliente.
        </p>
      </div>

      {/* Status da localização da loja */}
      <div style={{
        background: hasCoords ? C.greenLight : C.blueLight,
        border: `1px solid ${hasCoords ? "#6EE7B7" : "#93C5FD"}`,
        borderRadius: 14, padding: "14px 18px", marginBottom: 24,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: hasCoords ? "#065F46" : "#1E40AF" }}>
            {hasCoords ? "✅ Localização da loja configurada" : "📍 Localização da loja não configurada"}
          </div>
          <div style={{ fontSize: 12, color: hasCoords ? "#047857" : "#1D4ED8", marginTop: 3 }}>
            {hasCoords
              ? `Lat: ${storeLat?.toFixed(5)} | Lng: ${storeLng?.toFixed(5)} — distâncias calculadas corretamente`
              : "Clique em 'Localizar Loja' para ativar o cálculo por distância"}
          </div>
        </div>
        <button
          onClick={handleGeocode}
          disabled={geocoding}
          style={{
            padding: "8px 16px", borderRadius: 10,  fontFamily: "inherit",
            background: hasCoords ? C.white : C.blue, color: hasCoords ? C.dark : C.white,
            border: `1px solid ${C.border}`, fontWeight: 700, fontSize: 13,
            cursor: geocoding ? "not-allowed" : "pointer", flexShrink: 0,
          }}>
          {geocoding ? "Localizando..." : hasCoords ? "🔄 Relocalizat" : "📍 Localizar Loja"}
        </button>
      </div>

      {/* Como funciona */}
      <div style={{
        background: "#FFFBEB", border: "1px solid #FCD34D",
        borderRadius: 12, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "#92400E", lineHeight: 1.6,
      }}>
        <strong>Como funciona:</strong> O sistema mede a distância em linha reta entre sua loja e o endereço do cliente.
        Se ele estiver na faixa de 0–3km, cobra a taxa da faixa 1. De 3–7km, cobra a faixa 2. E assim por diante.
        Se o cliente estiver além do último km cadastrado, o app exibe "Fora da área de entrega".
      </div>

      {/* Faixas */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr 40px",
          gap: 8, padding: "0 4px", marginBottom: 8,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textGray }}>ATÉ (km)</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textGray }}>TAXA DE ENTREGA</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textGray }}>GRÁTIS ACIMA DE (R$)</div>
          <div />
        </div>

        {zones.map((z, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr 40px",
            gap: 8, marginBottom: 8, alignItems: "center",
          }}>
            {/* km máximo */}
            <div style={{ position: "relative" }}>
              <input
                type="number" min="0.1" step="0.5"
                value={z.max_km}
                onChange={e => updateZone(i, "max_km", e.target.value)}
                placeholder="ex: 3"
                style={{
                  width: "100%", boxSizing: "border-box", padding: "10px 36px 10px 12px",
                  borderRadius: 10, border: `1.5px solid ${C.border}`,
                  fontSize: 14, fontFamily: "inherit", outline: "none",
                }}
              />
              <span style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                fontSize: 11, color: C.textGray, fontWeight: 600,
              }}>km</span>
            </div>

            {/* taxa */}
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                fontSize: 13, color: C.textGray, fontWeight: 600,
              }}>R$</span>
              <input
                type="number" min="0" step="0.50"
                value={z.fee}
                onChange={e => updateZone(i, "fee", e.target.value)}
                placeholder="0.00"
                style={{
                  width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 30px",
                  borderRadius: 10, border: `1.5px solid ${C.border}`,
                  fontSize: 14, fontFamily: "inherit", outline: "none",
                }}
              />
            </div>

            {/* frete grátis acima de */}
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                fontSize: 13, color: C.textGray, fontWeight: 600,
              }}>R$</span>
              <input
                type="number" min="0" step="1"
                value={z.free_above}
                onChange={e => updateZone(i, "free_above", e.target.value)}
                placeholder="opcional"
                style={{
                  width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 30px",
                  borderRadius: 10, border: `1.5px solid ${C.border}`,
                  fontSize: 14, fontFamily: "inherit", outline: "none",
                }}
              />
            </div>

            {/* remover */}
            <button
              onClick={() => removeZone(i)}
              style={{
                width: 36, height: 36, borderRadius: 9, border: `1px solid ${C.border}`,
                background: C.white, color: C.red, fontSize: 16, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>×</button>
          </div>
        ))}
      </div>

      {/* Preview das faixas */}
      {zones.some(z => z.max_km && z.fee !== "") && (
        <div style={{
          background: C.gray, borderRadius: 12, padding: "14px 16px", marginBottom: 20,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, marginBottom: 10 }}>
            👁️ Prévia para o cliente
          </div>
          {[...zones]
            .filter(z => z.max_km && z.fee !== "")
            .sort((a, b) => Number(a.max_km) - Number(b.max_km))
            .map((z, i, arr) => {
              const from = i === 0 ? 0 : Number(arr[i-1].max_km);
              const to   = Number(z.max_km);
              return (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: 13, padding: "5px 0",
                  borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none",
                }}>
                  <span style={{ color: C.textGray }}>
                    {from === 0 ? `Até ${to} km` : `De ${from} a ${to} km`}
                  </span>
                  <div style={{ textAlign: "right" }}>
                    <strong style={{ color: Number(z.fee) === 0 ? C.green : C.dark }}>
                      {Number(z.fee) === 0 ? "🆓 Grátis" : fmt(z.fee)}
                    </strong>
                    {z.free_above && (
                      <div style={{ fontSize: 11, color: C.green }}>
                        Grátis acima de {fmt(z.free_above)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          <div style={{
            marginTop: 8, fontSize: 12, color: C.red, fontWeight: 600,
          }}>
            ❌ Acima de {Math.max(...zones.filter(z=>z.max_km).map(z=>Number(z.max_km)))} km → Fora da área de entrega
          </div>
        </div>
      )}

      {/* Botões */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={addZone}
          style={{
            padding: "10px 20px", borderRadius: 12,
            border: `2px dashed ${C.primary}`, background: "#FFF8F2",
            color: C.primary, fontWeight: 800, fontSize: 14,
            cursor: "pointer", fontFamily: "inherit",
          }}>
          + Adicionar Faixa
        </button>

        <button
          onClick={save}
          disabled={saving}
          style={{
            flex: 1, padding: "12px 0", borderRadius: 12, border: "none",
            background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`,
            color: C.white, fontWeight: 800, fontSize: 15,
            cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
            opacity: saving ? 0.8 : 1, minWidth: 160,
          }}>
          {saving ? "Salvando..." : "💾 Salvar Faixas"}
        </button>
      </div>

      {/* Nota sobre fallback */}
      {fallbackFee !== null && (
        <div style={{
          marginTop: 16, fontSize: 12, color: C.textGray, lineHeight: 1.6,
          padding: "10px 14px", background: C.gray, borderRadius: 10,
        }}>
          💡 <strong>Frete fixo de fallback: {fmt(fallbackFee)}</strong> — usado automaticamente quando o cliente não informa localização
          ou quando a loja ainda não tem coordenadas configuradas. Você pode alterar esse valor no perfil da loja.
        </div>
      )}
    </div>
  );
}
