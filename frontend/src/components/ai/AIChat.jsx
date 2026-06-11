// frontend/src/components/ai/AIChat.jsx
// FASE 4: componente de chat reutilizável para todos os assistentes IA
// Usado em: CustomerChat (flutuante), StoreAssistant (painel), AdminAssistant (painel)

import { useState, useRef, useEffect } from "react";

const C = {
  primary:     "#F7931E",
  primaryDark: "#F15A24",
  white:       "#FFFFFF",
  dark:        "#1E1E2E",
  gray:        "#F3F4F6",
  grayMid:     "#E5E7EB",
  textGray:    "#6B7280",
  aiMsg:       "#FFF8F2",
  aiBorder:    "#FDE9CC",
};

// Converte markdown básico para JSX (bold, listas, quebras)
function renderMessage(text) {
  if (!text) return null;
  return text.split("\n").map((line, i) => {
    // Bold: **texto**
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
    return (
      <span key={i}>
        {line.startsWith("- ") || line.startsWith("• ")
          ? <span>{"• "}{parts.slice(1)}</span>
          : parts}
        {i < text.split("\n").length - 1 && <br />}
      </span>
    );
  });
}

export default function AIChat({
  endpoint,           // ex: "/ai/chat" ou "/ai/store/assistant"
  apiCall,            // função (message, history) => Promise<{ reply }>
  title,              // "Assistente PetDelivery"
  placeholder,        // "Tire suas dúvidas..."
  welcomeMessage,     // mensagem inicial do bot
  accentColor,        // cor do header (default: primary)
  extraContext,       // dados extras para passar na chamada (store_id, etc.)
  floating,           // true = botão flutuante; false = inline full-height
  onClose,            // callback para fechar (se floating)
}) {
  const [open,     setOpen]     = useState(!floating);
  const [messages, setMessages] = useState(
    welcomeMessage ? [{ role: "ai", text: welcomeMessage }] : []
  );
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const accent     = accentColor || C.primary;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open && !floating) inputRef.current?.focus();
  }, [open, floating]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: "user", text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const history = newMessages.slice(-12).map(m => ({ role: m.role, text: m.text }));
      const { data } = await apiCall(text, history, extraContext);
      setMessages(prev => [...prev, { role: "ai", text: data.reply }]);
    } catch (err) {
      const msg = err.response?.data?.error || "Erro ao conectar com a IA. Tente novamente.";
      setError(msg);
      setMessages(prev => [...prev, { role: "ai", text: `⚠️ ${msg}`, isError: true }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = () => {
    setMessages(welcomeMessage ? [{ role: "ai", text: welcomeMessage }] : []);
    setError(null);
  };

  // ── Botão flutuante (fechado) ──────────────────────────────────
  if (floating && !open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed", bottom: 80, right: 16, zIndex: 200,
          width: 52, height: 52, borderRadius: "50%", border: "none",
          background: `linear-gradient(135deg, ${accent}, ${C.primaryDark})`,
          boxShadow: "0 4px 20px rgba(247,147,30,0.5)",
          cursor: "pointer", fontSize: 22, display: "flex",
          alignItems: "center", justifyContent: "center",
          animation: "pulse 2s infinite",
        }}
        title={title}
      >
        🤖
        <style>{`
          @keyframes pulse {
            0%, 100% { box-shadow: 0 4px 20px rgba(247,147,30,0.5); }
            50%       { box-shadow: 0 4px 30px rgba(247,147,30,0.8); }
          }
        `}</style>
      </button>
    );
  }

  const chatStyle = floating
    ? {
        position: "fixed", bottom: 80, right: 16, zIndex: 300,
        width: "min(380px, calc(100vw - 32px))",
        height: "min(520px, calc(100vh - 120px))",
        borderRadius: 20, boxShadow: "0 16px 60px rgba(0,0,0,0.2)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        background: C.white,
        animation: "slideUp 0.25s ease",
      }
    : {
        display: "flex", flexDirection: "column",
        height: "100%", minHeight: 500, background: C.white,
        borderRadius: 16, border: `1px solid ${C.grayMid}`,
        overflow: "hidden",
      };

  return (
    <>
      <div style={chatStyle}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${accent}, ${C.primaryDark})`,
          padding: "14px 16px", display: "flex", alignItems: "center", gap: 10,
          flexShrink: 0,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "rgba(255,255,255,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          }}>🤖</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.white, fontWeight: 800, fontSize: 14 }}>{title}</div>
            <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>
              {loading ? "Digitando..." : "Online • IA Gemini"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {messages.length > 1 && (
              <button onClick={clearChat}
                style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 6,
                  color: C.white, fontSize: 11, padding: "4px 8px", cursor: "pointer", fontFamily: "inherit" }}>
                Limpar
              </button>
            )}
            {(floating || onClose) && (
              <button onClick={() => { setOpen(false); onClose?.(); }}
                style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 6,
                  color: C.white, fontSize: 16, width: 28, height: 28, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                ×
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "12px 14px",
          display: "flex", flexDirection: "column", gap: 10,
          scrollbarWidth: "thin",
        }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", color: C.textGray, fontSize: 13, marginTop: 20 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🤖</div>
              <div>{placeholder || "Como posso ajudar?"}</div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            }}>
              {m.role === "ai" && (
                <div style={{
                  width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                  background: `linear-gradient(135deg, ${accent}, ${C.primaryDark})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, marginRight: 6, marginTop: 2,
                }}>🤖</div>
              )}
              <div style={{
                maxWidth: "80%",
                background: m.role === "user"
                  ? `linear-gradient(135deg, ${accent}, ${C.primaryDark})`
                  : m.isError ? "#FEE2E2" : C.aiMsg,
                color:  m.role === "user" ? C.white : m.isError ? "#991B1B" : C.dark,
                borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                padding: "10px 14px",
                fontSize: 13, lineHeight: 1.6,
                border: m.role === "ai" && !m.isError ? `1px solid ${C.aiBorder}` : "none",
              }}>
                {renderMessage(m.text)}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                background: `linear-gradient(135deg, ${accent}, ${C.primaryDark})`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
              }}>🤖</div>
              <div style={{
                background: C.aiMsg, border: `1px solid ${C.aiBorder}`,
                borderRadius: "18px 18px 18px 4px", padding: "10px 14px",
              }}>
                <span style={{ display: "inline-flex", gap: 4 }}>
                  {[0,1,2].map(i => (
                    <span key={i} style={{
                      width: 7, height: 7, borderRadius: "50%", background: accent,
                      display: "inline-block",
                      animation: `bounce 1.2s ease infinite ${i*0.2}s`,
                    }}/>
                  ))}
                </span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "10px 12px", borderTop: `1px solid ${C.grayMid}`,
          display: "flex", gap: 8, flexShrink: 0, background: C.white,
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={placeholder || "Digite sua mensagem..."}
            rows={1}
            style={{
              flex: 1, padding: "9px 12px", borderRadius: 12,
              border: `1.5px solid ${C.grayMid}`, fontSize: 13,
              fontFamily: "inherit", outline: "none", resize: "none",
              background: C.gray, lineHeight: 1.5,
              transition: "border .15s",
              maxHeight: 80, overflowY: "auto",
            }}
            onFocus={(e) => e.target.style.borderColor = accent}
            onBlur={(e)  => e.target.style.borderColor = C.grayMid}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            style={{
              width: 40, height: 40, borderRadius: 12, border: "none", flexShrink: 0,
              background: !input.trim() || loading
                ? C.grayMid
                : `linear-gradient(135deg, ${accent}, ${C.primaryDark})`,
              color: C.white, fontSize: 16, cursor: !input.trim() || loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all .15s", alignSelf: "flex-end",
            }}
          >
            {loading ? "⏳" : "➤"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0);    }
          40%            { transform: translateY(-6px); }
        }
      `}</style>
    </>
  );
}
