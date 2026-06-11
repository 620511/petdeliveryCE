// backend/src/services/email.service.js
// Nodemailer — e-mails transacionais
// Desabilitado automaticamente se SMTP_USER não estiver configurado.

const nodemailer = require("nodemailer");

// ── Cria transporter (lazy — só se tiver credenciais) ──────────────
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;

  transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST || "smtp.gmail.com",
    port:   parseInt(process.env.SMTP_PORT || "587"),
    secure: false, // STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

const FROM = process.env.SMTP_FROM || '"PetDelivery 🐾" <noreply@petdelivery.com>';

// ── Helper interno ─────────────────────────────────────────────────
async function send(to, subject, html) {
  const t = getTransporter();
  if (!t) return; // e-mail desabilitado — sem SMTP configurado

  try {
    await t.sendMail({ from: FROM, to, subject, html });
    console.log(`📧 E-mail enviado para ${to}: ${subject}`);
  } catch (err) {
    // Nunca derruba a requisição por falha de e-mail
    console.error("📧 Falha ao enviar e-mail:", err.message);
  }
}

// ── Templates ──────────────────────────────────────────────────────
const fmt = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const baseHtml = (body) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: 'Segoe UI', sans-serif; background: #FFF8F2; margin: 0; padding: 0; }
    .wrap { max-width: 560px; margin: 32px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg,#F7931E,#F15A24); padding: 28px 32px; color: #fff; }
    .header h1 { margin: 0; font-size: 22px; }
    .header p  { margin: 4px 0 0; opacity: .85; font-size: 14px; }
    .body   { padding: 28px 32px; color: #333; }
    .badge  { display: inline-block; background: #FFF0E0; color: #F7931E; border-radius: 8px; padding: 4px 12px; font-weight: 700; font-size: 13px; margin-bottom: 16px; }
    table   { width: 100%; border-collapse: collapse; margin: 16px 0; }
    td      { padding: 8px 4px; font-size: 14px; border-bottom: 1px solid #F4F4F4; }
    .total  { font-size: 20px; font-weight: 900; color: #F15A24; }
    .footer { background: #F8F8F8; padding: 16px 32px; font-size: 12px; color: #999; text-align: center; }
  </style>
</head>
<body><div class="wrap">${body}</div></body>
</html>`;

// ── E-mail: pedido confirmado ──────────────────────────────────────
async function sendOrderConfirmation({ to, customerName, orderId, total, deliveryFee, items, estimatedDeliveryAt, storeName }) {
  const shortId = orderId.slice(-6).toUpperCase();
  const eta     = estimatedDeliveryAt
    ? new Date(estimatedDeliveryAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "Em breve";

  const rows = (items || [])
    .map((i) => `<tr>
      <td>${i.productEmoji || "🐾"} ${i.productName}</td>
      <td style="text-align:center">${i.quantity}x</td>
      <td style="text-align:right;font-weight:700">${fmt(i.productPrice * i.quantity)}</td>
    </tr>`)
    .join("");

  const html = baseHtml(`
    <div class="header">
      <h1>🎉 Pedido Confirmado!</h1>
      <p>Obrigado, ${customerName}!</p>
    </div>
    <div class="body">
      <div class="badge">Pedido #${shortId}</div>
      <p><strong>${storeName}</strong> recebeu seu pedido e já está preparando.</p>
      <table>
        <thead><tr><td><b>Produto</b></td><td><b>Qtd</b></td><td><b>Valor</b></td></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <table>
        <tr><td>Subtotal</td><td style="text-align:right">${fmt(total - deliveryFee)}</td></tr>
        <tr><td>Frete</td>  <td style="text-align:right">${deliveryFee === 0 ? "🆓 Grátis" : fmt(deliveryFee)}</td></tr>
        <tr><td><b>Total</b></td><td class="total" style="text-align:right">${fmt(total)}</td></tr>
      </table>
      <p>⏱️ Estimativa de entrega: <strong>${eta}</strong></p>
    </div>
    <div class="footer">PetDelivery — Tudo para o seu pet, rápido! 🐾</div>
  `);

  await send(to, `✅ Pedido #${shortId} confirmado — PetDelivery`, html);
}

// ── E-mail: atualização de status ──────────────────────────────────
const STATUS_INFO = {
  confirmed:  { emoji: "✅", label: "Confirmado pelo lojista" },
  preparing:  { emoji: "👨‍🍳", label: "Sendo preparado" },
  on_the_way: { emoji: "🚴", label: "Saiu para entrega!" },
  delivered:  { emoji: "📦", label: "Entregue com sucesso!" },
  cancelled:  { emoji: "❌", label: "Cancelado" },
};

async function sendStatusUpdate({ to, customerName, orderId, status, storeName }) {
  const shortId = orderId.slice(-6).toUpperCase();
  const info    = STATUS_INFO[status] || { emoji: "📋", label: status };

  const html = baseHtml(`
    <div class="header">
      <h1>${info.emoji} Atualização do Pedido</h1>
      <p>Pedido #${shortId}</p>
    </div>
    <div class="body">
      <p>Olá, <strong>${customerName}</strong>!</p>
      <p>Seu pedido em <strong>${storeName}</strong> foi atualizado:</p>
      <div class="badge" style="font-size:16px;padding:10px 20px">${info.emoji} ${info.label}</div>
      ${status === "delivered"
        ? "<p>Obrigado por comprar no PetDelivery! Que seu pet aproveite 🐾</p>"
        : "<p>Acompanhe seu pedido no aplicativo.</p>"
      }
    </div>
    <div class="footer">PetDelivery — Tudo para o seu pet, rápido! 🐾</div>
  `);

  await send(to, `${info.emoji} Pedido #${shortId}: ${info.label} — PetDelivery`, html);
}

// ── E-mail: novo pedido para lojista ──────────────────────────────
async function sendNewOrderNotification({ to, storeName, orderId, total, customerName, items }) {
  const shortId = orderId.slice(-6).toUpperCase();
  const rows = (items || [])
    .map((i) => `<tr>
      <td>${i.productEmoji || "🐾"} ${i.productName}</td>
      <td style="text-align:center">${i.quantity}x</td>
      <td style="text-align:right;font-weight:700">${fmt(i.productPrice * i.quantity)}</td>
    </tr>`)
    .join("");

  const html = baseHtml(`
    <div class="header">
      <h1>🛒 Novo Pedido Recebido!</h1>
      <p>${storeName}</p>
    </div>
    <div class="body">
      <div class="badge">Pedido #${shortId}</div>
      <p>Cliente: <strong>${customerName}</strong></p>
      <table>
        <thead><tr><td><b>Produto</b></td><td><b>Qtd</b></td><td><b>Valor</b></td></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="total">Total: ${fmt(total)}</p>
      <p>Acesse o painel para confirmar o pedido.</p>
    </div>
    <div class="footer">PetDelivery — Painel Lojista</div>
  `);

  await send(to, `🛒 Novo pedido #${shortId} — ${storeName}`, html);
}

module.exports = { sendOrderConfirmation, sendStatusUpdate, sendNewOrderNotification };
