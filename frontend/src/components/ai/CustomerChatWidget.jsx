// frontend/src/components/ai/CustomerChatWidget.jsx
// FASE 4: chat flutuante de atendimento ao cliente
// Aparece no Customer App, passa o store_id da loja atual para contexto

import AIChat from "./AIChat";
import api from "../../services/api";

// Wrapper da chamada à API com contexto do cliente
async function customerChatCall(message, history, extraContext) {
  return api.post("/ai/chat", {
    message,
    history,
    store_id: extraContext?.storeId || null,
  });
}

export default function CustomerChatWidget({ storeId }) {
  return (
    <AIChat
      apiCall={customerChatCall}
      title="Assistente PetDelivery"
      placeholder="Tire suas dúvidas sobre produtos, pedidos e entregas..."
      welcomeMessage="Olá! 🐾 Sou o assistente do PetDelivery. Posso ajudar com dúvidas sobre produtos, status de pedidos, tempo de entrega e muito mais. Como posso te ajudar?"
      extraContext={{ storeId }}
      floating={true}
    />
  );
}
