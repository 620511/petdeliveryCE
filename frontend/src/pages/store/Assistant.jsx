// frontend/src/pages/store/Assistant.jsx
// FASE 4: assistente de negócios IA para o lojista

import AIChat from "../../components/ai/AIChat";
import api from "../../services/api";

async function storeAssistantCall(message, history) {
  return api.post("/ai/store/assistant", { message, history });
}

const SUGGESTIONS = [
  "Qual meu produto mais vendido esse mês?",
  "Qual meu horário de pico?",
  "Sugira uma promoção para aumentar vendas",
  "Como estou em relação a cancelamentos?",
  "Gere uma estratégia para fidelizar clientes",
];

export default function StoreAssistant() {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px", height: "calc(100vh - 80px)", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: "#1E1E2E", margin: 0 }}>
          🤖 Assistente da Loja
        </h2>
        <p style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
          Insights sobre suas vendas, produtos e clientes com IA
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
              border: "1px solid #FDE9CC", background: "#FFF8F2",
              color: "#B25E00", fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit", transition: "all .15s",
            }}
            onMouseOver={e => e.target.style.background = "#FDE9CC"}
            onMouseOut={e => e.target.style.background = "#FFF8F2"}
          >
            {s}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <AIChat
          apiCall={storeAssistantCall}
          title="Assistente da Loja"
          placeholder="Pergunte sobre suas vendas, produtos, promoções..."
          welcomeMessage="Olá! 📊 Sou seu assistente de negócios. Tenho acesso aos dados da sua loja e posso ajudar com análise de vendas, sugestão de promoções, insights sobre produtos e muito mais. O que gostaria de saber?"
          accentColor="#6366F1"
          floating={false}
        />
      </div>
    </div>
  );
}
