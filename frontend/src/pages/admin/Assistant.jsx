// frontend/src/pages/admin/Assistant.jsx
// FASE 4: assistente IA do administrador — análise global da plataforma

import AIChat from "../../components/ai/AIChat";
import api from "../../services/api";

async function adminAssistantCall(message, history) {
  return api.post("/ai/admin/assistant", { message, history });
}

const SUGGESTIONS = [
  "Qual loja teve mais cancelamentos essa semana?",
  "Como está a receita comparado à semana anterior?",
  "Mostre as 3 lojas com melhor performance",
  "Há algum problema operacional que devo resolver?",
  "Qual o ticket médio da plataforma?",
  "Quais lojas precisam de atenção?",
];

export default function AdminAssistant() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px", height: "calc(100vh - 80px)", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: "#1E1E2E", margin: 0 }}>
          🤖 Assistente do Admin
        </h2>
        <p style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
          Análise estratégica da plataforma com IA — dados globais em linguagem natural
        </p>
      </div>

      {/* Sugestões rápidas */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {SUGGESTIONS.map((s, i) => (
          <button key={i}
            onClick={() => {
              const event = new CustomEvent("ai-suggestion", { detail: s });
              window.dispatchEvent(event);
            }}
            style={{
              padding: "6px 12px", borderRadius: 99, fontSize: 12,
              border: "1px solid #DDD6FE", background: "#F5F3FF",
              color: "#5B21B6", fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit", transition: "all .15s",
            }}
            onMouseOver={e => e.target.style.background = "#DDD6FE"}
            onMouseOut={e => e.target.style.background = "#F5F3FF"}
          >
            {s}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <AIChat
          apiCall={adminAssistantCall}
          title="Assistente do Admin"
          placeholder="Analise dados, identifique tendências, tome decisões..."
          welcomeMessage="Olá, Admin! 🛡️ Tenho acesso a todos os dados da plataforma: receita, lojas, pedidos, cancelamentos e muito mais. Posso gerar análises, identificar problemas e sugerir ações estratégicas. O que gostaria de analisar?"
          accentColor="#7C3AED"
          floating={false}
        />
      </div>
    </div>
  );
}
