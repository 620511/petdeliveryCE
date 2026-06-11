// frontend/src/components/shared/PWAInstallBanner.jsx
// FASE 2: banner "Instalar no celular" — Android nativo + iOS instrução manual
// Inserido no CustomerApp — aparece apenas 1 vez por sessão, some ao fechar.

import { useState } from "react";
import { usePWAInstall } from "../../hooks/usePWAInstall";

const C = {
  primary:     "#F7931E",
  primaryDark: "#F15A24",
  white:       "#FFFFFF",
  dark:        "#1E1E2E",
};

export default function PWAInstallBanner() {
  const { canInstall, isIOS, isInstalled, triggerInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Não exibe se: já instalado, já dispensado, ou não há motivo para exibir
  if (isInstalled || dismissed) return null;
  if (!canInstall && !isIOS)    return null;

  const handleInstall = async () => {
    setInstalling(true);
    await triggerInstall();
    setInstalling(false);
  };

  return (
    <>
      {/* ── Banner principal ──────────────────────────────────────── */}
      <div style={{
        position: "fixed", bottom: 72, left: 12, right: 12, zIndex: 300,
        background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`,
        borderRadius: 18, padding: "14px 16px",
        boxShadow: "0 8px 32px rgba(247,147,30,0.45)",
        display: "flex", alignItems: "center", gap: 12,
        animation: "slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        {/* Ícone */}
        <div style={{
          width: 46, height: 46, borderRadius: 12, flexShrink: 0,
          background: "rgba(255,255,255,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26,
        }}>🐾</div>

        {/* Texto */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: C.white, fontWeight: 800, fontSize: 14, lineHeight: 1.3 }}>
            Instalar PetDelivery
          </div>
          <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 }}>
            {isIOS
              ? "Adicione à tela inicial para acesso rápido"
              : "Acesso rápido sem abrir o navegador"}
          </div>
        </div>

        {/* Botão de ação */}
        <button
          onClick={isIOS ? () => setShowIOSGuide(true) : handleInstall}
          disabled={installing}
          style={{
            background: C.white, color: C.primaryDark,
            border: "none", borderRadius: 10, padding: "8px 14px",
            fontWeight: 800, fontSize: 13, cursor: "pointer",
            fontFamily: "inherit", flexShrink: 0, whiteSpace: "nowrap",
          }}
        >
          {installing ? "..." : isIOS ? "Como?" : "Instalar"}
        </button>

        {/* Fechar */}
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: "none", border: "none", color: "rgba(255,255,255,0.7)",
            fontSize: 20, cursor: "pointer", padding: 0, lineHeight: 1,
            flexShrink: 0,
          }}
        >×</button>
      </div>

      {/* ── Guia iOS ─────────────────────────────────────────────── */}
      {showIOSGuide && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            zIndex: 400, display: "flex", alignItems: "flex-end",
          }}
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            style={{
              background: C.white, borderRadius: "24px 24px 0 0",
              padding: "24px 24px 40px", width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: 40, height: 4, background: "#E5E7EB", borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ fontSize: 18, fontWeight: 900, color: C.dark, marginBottom: 6 }}>
              🐾 Instalar no iPhone / iPad
            </div>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 20 }}>
              O Safari não suporta instalação automática. Siga os passos:
            </div>

            {[
              { icon: "⬆️", text: 'Toque no botão "Compartilhar" na barra do Safari (ícone de seta para cima)' },
              { icon: "➕", text: 'Role para baixo e toque em "Adicionar à Tela de Início"' },
              { icon: "✅", text: 'Toque em "Adicionar" no canto superior direito' },
            ].map((step, i) => (
              <div key={i} style={{
                display: "flex", gap: 14, alignItems: "flex-start",
                padding: "12px 0",
                borderBottom: i < 2 ? "1px solid #F3F4F6" : "none",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: "#FFF3E8", display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 20,
                }}>{step.icon}</div>
                <div style={{ fontSize: 14, color: C.dark, lineHeight: 1.5, paddingTop: 6 }}>
                  {step.text}
                </div>
              </div>
            ))}

            <button
              onClick={() => { setShowIOSGuide(false); setDismissed(true); }}
              style={{
                width: "100%", marginTop: 20, padding: "14px",
                borderRadius: 14, border: "none",
                background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`,
                color: C.white, fontWeight: 800, fontSize: 15,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >Entendi!</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(120%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
