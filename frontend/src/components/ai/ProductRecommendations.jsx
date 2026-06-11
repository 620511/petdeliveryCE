// frontend/src/components/ai/ProductRecommendations.jsx
// FASE 4: recomendações de produto via Gemini
// Exibida na tela de loja abaixo dos produtos em destaque

import { useState, useEffect } from "react";
import api from "../../services/api";

const C = {
  primary:  "#F7931E",
  white:    "#FFFFFF",
  dark:     "#1E1E2E",
  gray:     "#F3F4F6",
  textGray: "#6B7280",
  border:   "#E5E7EB",
};

const fmt = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ProductRecommendations({ storeId, currentProductId, cartItems = [], onAddToCart }) {
  const [recs,    setRecs]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [tried,   setTried]   = useState(false);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.post("/ai/recommendations", {
          store_id:           storeId,
          current_product_id: currentProductId || null,
          cart_items:         cartItems.slice(0, 5).map(i => ({ name: i.name })),
        });
        if (!cancelled) setRecs(data.recommendations || []);
      } catch {
        // Silencioso — recomendações são um enhancement, não crítico
      } finally {
        if (!cancelled) { setLoading(false); setTried(true); }
      }
    };

    // Debounce: não chamar a cada render
    const timer = setTimeout(load, 600);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [storeId, currentProductId, cartItems.length]);

  if (loading) return (
    <div style={{ padding: "16px 14px" }}>
      <div style={{ fontSize: 13, color: C.textGray, marginBottom: 10, fontWeight: 700 }}>
        🤖 Buscando recomendações...
      </div>
      <div style={{ display: "flex", gap: 10, overflowX: "auto" }}>
        {[1,2,3].map(i => (
          <div key={i} style={{
            flexShrink: 0, width: 130, height: 160, borderRadius: 14,
            background: "linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
          }}/>
        ))}
      </div>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );

  if (tried && recs.length === 0) return null;
  if (!recs.length) return null;

  return (
    <div style={{ padding: "16px 14px 8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <span style={{ fontSize: 16 }}>🤖</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: C.dark }}>
          Você também pode gostar
        </span>
      </div>

      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8,
        scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {recs.map((p) => (
          <div key={p.id} style={{
            flexShrink: 0, width: 130,
            background: C.white, borderRadius: 14,
            border: `1px solid ${C.border}`,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            overflow: "hidden", cursor: "pointer",
          }}>
            {/* Emoji / imagem */}
            <div style={{
              height: 72, background: "#FFF8F2",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 36, position: "relative",
            }}>
              {p.emoji || "🐾"}
              {p.badge && (
                <span style={{
                  position: "absolute", top: 6, right: 6,
                  fontSize: 9, fontWeight: 800, padding: "2px 6px",
                  borderRadius: 99, background: C.primary, color: C.white,
                }}>{p.badge}</span>
              )}
            </div>

            <div style={{ padding: "8px 10px 10px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, lineHeight: 1.3, marginBottom: 3 }}>
                {p.name.length > 22 ? p.name.slice(0, 22) + "…" : p.name}
              </div>
              <div style={{ fontSize: 11, color: C.textGray, lineHeight: 1.3, marginBottom: 6 }}>
                {p.reason}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: C.primary }}>
                  {fmt(p.price)}
                </span>
                {onAddToCart && (
                  <button
                    onClick={() => onAddToCart(p)}
                    style={{
                      background: C.primary, color: C.white, border: "none",
                      borderRadius: 7, width: 26, height: 26, fontSize: 14,
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>+</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
