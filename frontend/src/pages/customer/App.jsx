// frontend/src/pages/customer/App.jsx
// FASE 4: adicionado CustomerChatWidget (atendimento IA) e ProductRecommendations

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { customerAPI } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../hooks/useSocket";
import PWAInstallBanner from "../../components/shared/PWAInstallBanner"; // Fase 2
import CustomerChatWidget     from "../../components/ai/CustomerChatWidget";
import ProductRecommendations from "../../components/ai/ProductRecommendations";

// ── Colors & Styles ───────────────────────────────────────────────
const C = {
  primary:"#F7931E", primaryDark:"#F15A24", dark:"#333",
  white:"#FFFFFF", bg:"#FFF8F2", card:"#FFFFFF",
  gray:"#F4F4F4", grayMid:"#E0E0E0",
  textGray:"#999", textDark:"#333", green:"#4CAF50", red:"#F44336",
};
const G = {
  screen:{ minHeight:"100vh", background:C.bg },
  header:{ background:C.white, padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 2px 8px rgba(247,147,30,0.12)", position:"sticky", top:0, zIndex:100 },
  btn:{ background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`, color:C.white, border:"none", borderRadius:12, padding:"12px 20px", fontSize:15, fontWeight:700, cursor:"pointer", width:"100%", fontFamily:"inherit" },
  card:{ background:C.card, borderRadius:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)", overflow:"hidden" },
};
const fmt = (v) => Number(v).toLocaleString("pt-BR",{ style:"currency", currency:"BRL" });

function useWindowSize() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => { const h = () => setW(window.innerWidth); window.addEventListener("resize",h); return ()=>window.removeEventListener("resize",h); },[]);
  return w;
}

// ── STATUS ────────────────────────────────────────────────────────
const STATUS_COLORS = { pending:"#F59E0B", confirmed:C.primary, preparing:"#3B82F6", on_the_way:"#8B5CF6", delivered:C.green, cancelled:C.red };
const STATUS_LABELS = { pending:"⏳ Aguardando confirmação", confirmed:"✅ Confirmado!", preparing:"👨‍🍳 Sendo preparado", on_the_way:"🚴 Saiu para entrega!", delivered:"📦 Entregue!", cancelled:"❌ Cancelado" };
const STATUS_STEPS  = ["pending","confirmed","preparing","on_the_way","delivered"];

// ── Store List ────────────────────────────────────────────────────
function StoreListScreen({ onSelectStore, isDesktop }) {
  const [stores, setStores]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");

  useEffect(() => {
    setLoading(true);
    customerAPI.stores(search ? { search } : {}).then(({ data }) => setStores(data)).finally(() => setLoading(false));
  }, [search]);

  return (
    <div style={{ ...G.screen, paddingBottom: isDesktop ? 40 : 80 }}>
      <div style={G.header}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:26 }}>🐾</span>
          <span style={{ fontSize:20, fontWeight:900, color:C.primary }}>Pet<span style={{ color:C.primaryDark }}>Delivery</span></span>
        </div>
      </div>
      <div style={{ padding: isDesktop ? "24px 32px" : "16px" }}>
        <div style={{ fontSize: isDesktop ? 24 : 20, fontWeight:900, color:C.textDark, marginBottom:16 }}>Escolha uma loja 🏪</div>
        <input value={search} onChange={(e)=>setSearch(e.target.value)}
          placeholder="🔍 Buscar lojas..."
          style={{ width:"100%", boxSizing:"border-box", padding:"12px 14px", borderRadius:14, border:`2px solid ${C.grayMid}`, fontSize:15, fontFamily:"inherit", outline:"none", marginBottom:20 }}/>
        {loading ? (
          <div style={{ display:"grid", gap:12 }}>
            {Array(3).fill(0).map((_,i) => <div key={i} style={{ height:90, background:C.grayMid, borderRadius:16, animation:"pulse 1.5s infinite" }}/>)}
          </div>
        ) : stores.length === 0 ? (
          <div style={{ textAlign:"center", padding:60, color:C.textGray }}>
            <div style={{ fontSize:48 }}>🏪</div>
            <div style={{ fontWeight:700, marginTop:12 }}>Nenhuma loja disponível</div>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap:14 }}>
            {stores.map((s) => (
              <div key={s.id}
                onClick={() => s.is_open && onSelectStore(s)}
                style={{ ...G.card, padding:18, cursor: s.is_open ? "pointer" : "default", opacity: s.is_open ? 1 : 0.6, transition:"transform .15s,box-shadow .15s" }}
                onMouseEnter={(e) => s.is_open && (e.currentTarget.style.transform="translateY(-2px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform="none")}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                      {s.logoUrl ? (
                        <img src={s.logoUrl.startsWith("/uploads") ? `http://localhost:3001${s.logoUrl}` : s.logoUrl}
                          alt={s.name} style={{ width:36, height:36, borderRadius:8, objectFit:"cover" }}
                          onError={(e) => (e.target.style.display="none")} />
                      ) : <span style={{ fontSize:28 }}>🐾</span>}
                      <div style={{ fontSize:16, fontWeight:800, color:C.textDark }}>{s.name}</div>
                    </div>
                    <div style={{ fontSize:12, color:C.textGray, marginBottom:8 }}>📍 {s.address}</div>
                    <div style={{ display:"flex", gap:10, fontSize:12, flexWrap:"wrap" }}>
                      <span>⭐ {Number(s.rating).toFixed(1)} ({s.review_count})</span>
                      <span>⏱️ {s.delivery_time_min}–{s.delivery_time_max} min</span>
                      <span>🚚 {s.delivery_fee===0 ? "Grátis" : fmt(s.delivery_fee)}</span>
                    </div>
                  </div>
                  <span style={{ background: s.is_open ? "#E8F5E9" : "#FFEBEE", color: s.is_open ? C.green : C.red, fontWeight:700, fontSize:11, borderRadius:8, padding:"3px 8px", flexShrink:0, marginLeft:8 }}>
                    {s.is_open ? "Aberta" : "Fechada"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}

// ── Store Products ────────────────────────────────────────────────
function StoreProductsScreen({ store, onBack, onAddToCart, cartCount, onCartClick, isDesktop }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [selCat,  setCat]     = useState(null);

  useEffect(() => {
    setLoading(true);
    const p = selCat ? { category_id: selCat } : {};
    customerAPI.storeProducts(store.id, p).then(({ data }) => setData(data)).finally(() => setLoading(false));
  }, [store.id, selCat]);

  return (
    <div style={{ ...G.screen, paddingBottom: isDesktop ? 40 : 80 }}>
      <div style={G.header}>
        <button onClick={onBack} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer" }}>←</button>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {store.logoUrl ? (
            <img src={store.logoUrl.startsWith("/uploads") ? `http://localhost:3001${store.logoUrl}` : store.logoUrl}
              alt={store.name} style={{ width:28, height:28, borderRadius:6, objectFit:"cover" }}/>
          ) : null}
          <span style={{ fontSize:16, fontWeight:800 }}>{store.name}</span>
        </div>
        <button onClick={onCartClick} style={{ background:C.gray, border:"none", borderRadius:12, padding:"7px 11px", cursor:"pointer", position:"relative", fontSize:20 }}>
          🛒
          {cartCount > 0 && <span style={{ position:"absolute", top:-4, right:-4, background:C.primaryDark, color:C.white, borderRadius:999, fontSize:11, fontWeight:800, minWidth:18, height:18, display:"flex", alignItems:"center", justifyContent:"center" }}>{cartCount}</span>}
        </button>
      </div>
      {data?.categories?.length > 0 && (
        <div style={{ display:"flex", gap:8, padding:"10px 16px", overflowX:"auto", background:C.white, borderBottom:`1px solid ${C.gray}` }}>
          <button onClick={() => setCat(null)} style={{ flexShrink:0, padding:"7px 14px", borderRadius:20, border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13, background:!selCat ? `linear-gradient(135deg,${C.primary},${C.primaryDark})` : C.gray, color:!selCat ? C.white : C.textDark }}>Todos</button>
          {data.categories.map((cat) => (
            <button key={cat.id} onClick={() => setCat(cat.id)} style={{ flexShrink:0, padding:"7px 14px", borderRadius:20, border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13, background:selCat===cat.id ? `linear-gradient(135deg,${C.primary},${C.primaryDark})` : C.gray, color:selCat===cat.id ? C.white : C.textDark }}>
              {cat.emoji} {cat.name}
            </button>
          ))}
        </div>
      )}
      <div style={{ padding: isDesktop ? "20px 32px" : "14px" }}>
        {loading ? (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {Array(6).fill(0).map((_,i) => <div key={i} style={{ height:180, background:C.grayMid, borderRadius:14, animation:"pulse 1.5s infinite" }}/>)}
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns: isDesktop ? "repeat(auto-fill,minmax(180px,1fr))" : "1fr 1fr", gap:12 }}>
            {(data?.products||[]).map((p) => <ProductCard key={p.id} product={p} onAdd={() => onAddToCart(p)} />)}
          </div>
        )}
        {!loading && !data?.products?.length && (
          <div style={{ textAlign:"center", padding:60, color:C.textGray }}><div style={{ fontSize:40, marginBottom:10 }}>🐾</div><div>Nenhum produto disponível</div></div>
        )}
      </div>
      {/* FASE 4: recomendações IA — aparecem após a grid de produtos */}
      {!loading && data?.products?.length > 0 && (
        <ProductRecommendations
          storeId={store.id}
          cartItems={[]} // passa itens do carrinho se disponível no contexto
          onAddToCart={onAddToCart}
        />
      )}
    </div>
  );
}

// ── Product Card ──────────────────────────────────────────────────
function ProductCard({ product:p, onAdd }) {
  const [added, setAdded] = useState(false);
  const handle = (e) => { e.stopPropagation(); setAdded(true); onAdd(); setTimeout(()=>setAdded(false),700); };

  return (
    <div style={{ ...G.card, padding:14, transition:"transform .15s,box-shadow .15s" }}
      onMouseEnter={(e) => { e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 8px 24px rgba(247,147,30,0.15)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,0.06)"; }}>
      {p.image_url ? (
        <div style={{ width:"100%", aspectRatio:"1 / 1", borderRadius:10, marginBottom:10, overflow:"hidden", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <img src={p.image_url.startsWith("/uploads") ? `http://localhost:3001${p.image_url}` : p.image_url}
            alt={p.name} style={{ width:"100%", height:"100%", objectFit:"contain" }}
            onError={(e) => { e.target.parentElement.innerHTML = `<span style="font-size:44px">${p.emoji||"🐾"}</span>`; }}/>
        </div>
      ) : (
        <div style={{ width:"100%", aspectRatio:"1 / 1", fontSize:44, background:C.bg, borderRadius:10, marginBottom:10, display:"flex", alignItems:"center", justifyContent:"center" }}>{p.emoji||"🐾"}</div>
      )}
      {p.badge && <div style={{ background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`, color:C.white, fontSize:10, fontWeight:700, borderRadius:6, padding:"2px 7px", display:"inline-block", marginBottom:4 }}>{p.badge}</div>}
      <div style={{ fontSize:13, fontWeight:800, color:C.textDark, lineHeight:1.3, marginBottom:3 }}>{p.name}</div>
      <div style={{ fontSize:11, color:C.textGray, marginBottom:6 }}>{p.description}</div>
      <div style={{ fontWeight:900, color:C.primaryDark, fontSize:15, marginBottom:10 }}>{fmt(p.price)}</div>
      <button onClick={handle} style={{ ...G.btn, fontSize:13, padding:"9px", background: added ? "linear-gradient(135deg,#4CAF50,#2E7D32)" : `linear-gradient(135deg,${C.primary},${C.primaryDark})`, transition:"background .2s" }}>
        {added ? "✓ Adicionado" : "+ Adicionar"}
      </button>
    </div>
  );
}

// ── Cart Screen ───────────────────────────────────────────────────
function CartScreen({ cart, onAdd, onRemove, onDelete, cartTotal, store, onBack, onCheckout, isDesktop }) {
  const [frete,       setFrete]       = useState(store?.delivery_fee ?? 8.9);
  const [freteInfo,   setFreteInfo]   = useState(null); // { distance_km, out_of_range, free_above }
  const [calcLoading, setCalcLoading] = useState(false);
  const freteOutOfRange = freteInfo?.out_of_range ?? false;
  const total = cartTotal + (freteInfo?.out_of_range ? 0 : frete);

  // FRETE DINÂMICO: calcula frete ao obter localização do cliente
  const calcFrete = async () => {
    if (!store?.id) return;
    setCalcLoading(true);
    try {
      // Tenta GPS do dispositivo
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      );
      const { data } = await customerAPI.calcDeliveryFee(store.id, {
        customer_lat: pos.coords.latitude,
        customer_lng: pos.coords.longitude,
      });
      setFreteInfo(data);
      setFrete(data.out_of_range ? 0 : (data.fee ?? store.delivery_fee ?? 8.9));
    } catch {
      // GPS negado ou indisponível — mantém frete fixo da loja
    } finally { setCalcLoading(false); }
  };

  // Calcula ao entrar no carrinho
  useState(() => { calcFrete(); }, [store?.id]);
  if (!cart.length) return (
    <div style={G.screen}>
      <div style={G.header}><button onClick={onBack} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer" }}>←</button><span style={{ fontSize:16, fontWeight:800 }}>Carrinho</span><div style={{ width:30 }}/></div>
      <div style={{ textAlign:"center", padding:"80px 20px" }}><div style={{ fontSize:72 }}>🛒</div><div style={{ fontSize:18, fontWeight:800, marginTop:16 }}>Carrinho vazio</div><button style={{ ...G.btn, width:"auto", marginTop:20, padding:"12px 32px" }} onClick={onBack}>Continuar comprando</button></div>
    </div>
  );
  return (
    <div style={{ ...G.screen, paddingBottom: isDesktop ? 40 : 80 }}>
      <div style={G.header}><button onClick={onBack} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer" }}>←</button><span style={{ fontSize:16, fontWeight:800 }}>Carrinho ({cart.length})</span><div style={{ width:30 }}/></div>
      <div style={{ padding: isDesktop ? "24px 32px" : "14px" }}>
        <div style={{ display: isDesktop ? "grid" : "block", gridTemplateColumns:"1fr 340px", gap:20 }}>
          <div>
            {cart.map((item) => (
              <div key={item.id} style={{ ...G.card, padding:14, marginBottom:12, display:"flex", gap:12, alignItems:"center" }}>
                <div style={{ fontSize:38, background:C.bg, borderRadius:12, padding:"8px", flexShrink:0 }}>{item.emoji||"🐾"}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:800, color:C.textDark }}>{item.name}</div>
                  <div style={{ fontWeight:900, color:C.primaryDark, fontSize:14, marginTop:4 }}>{fmt(item.price*item.qty)}</div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
                  <button onClick={() => onDelete(item.id)} style={{ background:"#FFF0F0", border:"none", borderRadius:8, padding:"4px 8px", cursor:"pointer", color:C.red }}>🗑️</button>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <button onClick={() => onRemove(item.id)} style={{ width:28, height:28, borderRadius:8, border:`1.5px solid ${C.grayMid}`, background:C.white, cursor:"pointer", fontWeight:800, fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                    <span style={{ fontWeight:900, minWidth:22, textAlign:"center" }}>{item.qty}</span>
                    <button onClick={() => onAdd(item)} style={{ width:28, height:28, borderRadius:8, border:"none", background:C.primary, color:C.white, cursor:"pointer", fontWeight:800, fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div>
            <div style={{ ...G.card, padding:18, position: isDesktop ? "sticky" : "static", top:80 }}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:14 }}>Resumo</div>
              {[{ l:"Subtotal", v:fmt(cartTotal) },{ l:"Frete",
              v: calcLoading ? "Calculando..." :
                 freteInfo?.out_of_range ? "❌ Fora da área" :
                 freteInfo?.distance_km  ? `${fmt(frete)} (${freteInfo.distance_km.toFixed(1)} km)` :
                 frete === 0 ? "🆓 Grátis" : fmt(frete),
              green: frete === 0 && !freteInfo?.out_of_range,
              red:   freteInfo?.out_of_range }].map((r) => (
                <div key={r.l} style={{ display:"flex", justifyContent:"space-between", marginBottom:10, fontSize:14 }}>
                  <span style={{ color:C.textGray }}>{r.l}</span><span style={{ fontWeight:700, color: r.green ? C.green : C.textDark }}>{r.v}</span>
                </div>
              ))}
              <div style={{ borderTop:`2px dashed ${C.grayMid}`, paddingTop:10, display:"flex", justifyContent:"space-between", fontWeight:900, fontSize:17 }}>
                <span>Total</span><span style={{ color:C.primaryDark }}>{fmt(total)}</span>
              </div>
              {cartTotal < 99 && <div style={{ marginTop:10, fontSize:12, color:C.primary, fontWeight:700, textAlign:"center" }}>⚡ Faltam {fmt(99-cartTotal)} para frete grátis!</div>}
              <button
                style={{ ...G.btn, marginTop:16, opacity: freteOutOfRange ? 0.5 : 1, cursor: freteOutOfRange ? "not-allowed" : "pointer" }}
                onClick={freteOutOfRange ? undefined : onCheckout}
                disabled={!!freteOutOfRange}>
                {freteOutOfRange ? "❌ Fora da área de entrega" : `✅ Finalizar • ${fmt(total)}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Checkout Screen ───────────────────────────────────────────────
function CheckoutScreen({ cart, store, cartTotal, onBack, onSuccess, isDesktop }) {
  const [payment, setPayment] = useState("pix");
  const [address, setAddress] = useState("Rua das Flores, 123");
  const [placing, setPlacing] = useState(false);
  const [done,    setDone]    = useState(null); // orderId após confirmação
  const frete = cartTotal >= 99 ? 0 : (store?.delivery_fee ?? 8.9);

  const place = async () => {
    setPlacing(true);
    try {
      const { data: order } = await customerAPI.createOrder({
        store_id: store.id, payment_method: payment, delivery_address: address,
        items: cart.map((i) => ({ product_id: i.id, quantity: i.qty })),
      });
      // Fase 3: pagamento online MP
      if (payment === "mercadopago") {
        const { data: payData } = await customerAPI.createPayment(order.id);
        window.location.href = payData.checkout_url;
        return;
      }
      setDone(order.id);
      setTimeout(() => onSuccess(order.id), 3000);
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao criar pedido. Tente novamente.");
    } finally { setPlacing(false); }
  };

  if (done) return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(160deg,${C.primary},${C.primaryDark})`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, padding:24, textAlign:"center" }}>
      <div style={{ fontSize:72 }}>🎉</div>
      <div style={{ fontSize:26, fontWeight:900, color:C.white }}>Pedido Confirmado!</div>
      <div style={{ fontSize:15, color:"rgba(255,255,255,0.85)" }}>Chegará em {store.delivery_time_min}–{store.delivery_time_max} minutos</div>
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.7)", marginTop:4 }}>Você receberá atualizações em tempo real 🔴</div>
    </div>
  );

  const payOpts = [
    { id:"pix",         label:"PIX ⚡",          sub:"Imediato" },
    { id:"credit_card", label:"Crédito 💳",       sub:"Até 12x" },
    { id:"debit_card",  label:"Débito 🏦",        sub:"Rápido" },
    { id:"cash",        label:"Dinheiro 💵",      sub:"Na entrega" },
    { id:"mercadopago", label:"Mercado Pago 🛒",  sub:"Cartão, Pix, Saldo" }, // Fase 3
  ];

  return (
    <div style={{ ...G.screen, paddingBottom: isDesktop ? 40 : 100 }}>
      <div style={G.header}><button onClick={onBack} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer" }}>←</button><span style={{ fontSize:16, fontWeight:800 }}>Finalizar Pedido</span><div style={{ width:30 }}/></div>
      <div style={{ padding: isDesktop ? "24px 32px" : "14px" }}>
        <div style={{ display: isDesktop ? "grid" : "block", gridTemplateColumns:"1fr 340px", gap:20 }}>
          <div>
            <div style={{ ...G.card, padding:20, marginBottom:14 }}>
              <div style={{ fontWeight:800, marginBottom:12 }}>📍 Endereço de Entrega</div>
              <input value={address} onChange={(e)=>setAddress(e.target.value)} style={{ width:"100%", boxSizing:"border-box", padding:"11px 13px", borderRadius:12, border:`2px solid ${C.grayMid}`, fontSize:14, fontFamily:"inherit", outline:"none" }}/>
            </div>
            <div style={{ ...G.card, padding:20 }}>
              <div style={{ fontWeight:800, marginBottom:12 }}>💳 Forma de Pagamento</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {payOpts.map((o) => (
                  <button key={o.id} onClick={() => setPayment(o.id)}
                    style={{ background: payment===o.id ? `${C.primary}18` : C.gray, border: payment===o.id ? `2px solid ${C.primary}` : "2px solid transparent", borderRadius:12, padding:"12px 10px", cursor:"pointer", fontFamily:"inherit", textAlign:"left", transition:"all .15s" }}>
                    <div style={{ fontSize:14, fontWeight:800, color:C.textDark }}>{o.label}</div>
                    <div style={{ fontSize:11, color:C.textGray }}>{o.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div style={{ ...G.card, padding:20, position: isDesktop ? "sticky" : "static", top:80 }}>
              <div style={{ fontWeight:800, marginBottom:14 }}>📋 Resumo</div>
              {cart.map((i) => <div key={i.id} style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:6 }}><span style={{ color:C.textGray }}>{i.qty}x {i.name}</span><span style={{ fontWeight:700 }}>{fmt(i.price*i.qty)}</span></div>)}
              <div style={{ borderTop:`2px dashed ${C.grayMid}`, paddingTop:10, marginTop:6, display:"flex", justifyContent:"space-between", fontWeight:900, fontSize:17 }}>
                <span>Total</span><span style={{ color:C.primaryDark }}>{fmt(cartTotal+frete)}</span>
              </div>
              <button style={{ ...G.btn, marginTop:16, opacity: placing ? 0.8 : 1 }} onClick={place} disabled={placing}>
                {placing ? "⏳ Processando..." : `🚀 Confirmar • ${fmt(cartTotal+frete)}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Order Tracking Screen — NOVO com Socket.io ────────────────────
function OrderTrackingScreen({ orderId, onBack, isDesktop }) {
  const [order, setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const { trackOrder, on }  = useSocket({ enabled: !!orderId });

  useEffect(() => {
    if (!orderId) return;
    customerAPI.order(orderId).then(({ data }) => setOrder(data)).finally(() => setLoading(false));
  }, [orderId]);

  // Entra na sala de rastreamento do pedido
  useEffect(() => {
    if (orderId) trackOrder(orderId);
  }, [orderId, trackOrder]);

  // Recebe atualizações em tempo real
  useEffect(() => {
    const unsub = on("order:status", ({ orderId: id, status }) => {
      if (id === orderId) setOrder((o) => o ? { ...o, status } : o);
    });
    return unsub;
  }, [on, orderId]);

  if (loading) return <div style={{ padding:40, textAlign:"center", color:C.textGray }}>⏳ Carregando rastreamento...</div>;
  if (!order)  return <div style={{ padding:40, textAlign:"center", color:C.textGray }}>Pedido não encontrado</div>;

  const currentStep = STATUS_STEPS.indexOf(order.status);

  return (
    <div style={{ ...G.screen, paddingBottom: isDesktop ? 40 : 80 }}>
      <div style={G.header}>
        <button onClick={onBack} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer" }}>←</button>
        <span style={{ fontSize:16, fontWeight:800 }}>Rastrear Pedido</span>
        <div style={{ width:30 }}/>
      </div>
      <div style={{ padding: isDesktop ? "24px 32px" : "16px" }}>

        {/* Status atual */}
        <div style={{ ...G.card, padding:24, marginBottom:16, textAlign:"center", background:`linear-gradient(135deg,${C.bg},#FFEEDD)` }}>
          <div style={{ fontSize:52, marginBottom:12 }}>
            {order.status === "delivered" ? "🎉" : order.status === "cancelled" ? "😔" : "🔴"}
          </div>
          <div style={{ fontSize:22, fontWeight:900, color: STATUS_COLORS[order.status] || C.textDark }}>
            {STATUS_LABELS[order.status] || order.status}
          </div>
          <div style={{ fontSize:13, color:C.textGray, marginTop:6 }}>
            {order.status !== "delivered" && order.status !== "cancelled"
              ? "Atualização em tempo real 🔴"
              : ""}
          </div>
          {order.estimated_delivery_at && order.status !== "delivered" && order.status !== "cancelled" && (
            <div style={{ marginTop:10, fontSize:14, color:C.primary, fontWeight:700 }}>
              ⏱️ Previsão: {new Date(order.estimated_delivery_at).toLocaleTimeString("pt-BR",{ hour:"2-digit", minute:"2-digit" })}
            </div>
          )}
        </div>

        {/* Barra de progresso */}
        {order.status !== "cancelled" && (
          <div style={{ ...G.card, padding:20, marginBottom:16 }}>
            <div style={{ fontWeight:800, marginBottom:16, color:C.textDark }}>Progresso do Pedido</div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", position:"relative" }}>
              {/* Linha de fundo */}
              <div style={{ position:"absolute", top:"50%", left:0, right:0, height:3, background:C.gray, zIndex:0 }}/>
              {/* Linha de progresso */}
              <div style={{ position:"absolute", top:"50%", left:0, height:3, background:`linear-gradient(90deg,${C.primary},${C.primaryDark})`, zIndex:1, transition:"width .5s", width: currentStep < 0 ? "0%" : `${(currentStep/(STATUS_STEPS.length-1))*100}%` }}/>
              {STATUS_STEPS.map((s, i) => {
                const done    = i <= currentStep;
                const current = i === currentStep;
                return (
                  <div key={s} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, zIndex:2 }}>
                    <div style={{ width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, background: done ? `linear-gradient(135deg,${C.primary},${C.primaryDark})` : C.gray, color: done ? C.white : C.textGray, boxShadow: current ? `0 0 0 4px ${C.primary}40` : "none", transition:"all .3s" }}>
                      {i === 0 ? "📋" : i === 1 ? "✅" : i === 2 ? "🍳" : i === 3 ? "🚴" : "📦"}
                    </div>
                    <div style={{ fontSize:10, color: done ? C.primary : C.textGray, fontWeight:700, textAlign:"center", whiteSpace:"nowrap" }}>
                      {["Recebido","Confirmado","Preparo","Entrega","Entregue"][i]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detalhes do pedido */}
        <div style={{ ...G.card, padding:20, marginBottom:16 }}>
          <div style={{ fontWeight:800, marginBottom:12 }}>📦 Itens do Pedido</div>
          {(order.items||[]).map((i, idx) => (
            <div key={idx} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"6px 0", borderBottom: idx < order.items.length-1 ? `1px solid ${C.gray}` : "none" }}>
              <span>{i.emoji} {i.qty}x {i.name}</span>
              <span style={{ fontWeight:700 }}>{fmt(i.price*i.qty)}</span>
            </div>
          ))}
          <div style={{ display:"flex", justifyContent:"space-between", fontWeight:900, fontSize:16, marginTop:10, paddingTop:10, borderTop:`2px dashed ${C.grayMid}` }}>
            <span>Total</span><span style={{ color:C.primaryDark }}>{fmt(order.total)}</span>
          </div>
        </div>

        <div style={{ ...G.card, padding:16 }}>
          <div style={{ fontSize:13, color:C.textGray, marginBottom:4 }}>📍 {order.delivery_address}</div>
          <div style={{ fontSize:13, color:C.textGray }}>🏪 {order.store_name}</div>
        </div>
      </div>
    </div>
  );
}

// ── Orders Screen ─────────────────────────────────────────────────
function OrdersScreen({ onBack, onTrack, isDesktop }) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    customerAPI.orders().then(({ data }) => setOrders(data)).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ ...G.screen, paddingBottom: isDesktop ? 40 : 80 }}>
      <div style={G.header}><button onClick={onBack} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer" }}>←</button><span style={{ fontSize:16, fontWeight:800 }}>📦 Meus Pedidos</span><div style={{ width:30 }}/></div>
      <div style={{ padding: isDesktop ? "24px 32px" : "14px" }}>
        {loading ? <div style={{ textAlign:"center", padding:48, color:C.textGray }}>Carregando...</div>
        : !orders.length ? (
          <div style={{ textAlign:"center", padding:60 }}><div style={{ fontSize:60 }}>📦</div><div style={{ fontSize:18, fontWeight:700, marginTop:12 }}>Nenhum pedido ainda</div></div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap:14 }}>
            {orders.map((o) => (
              <div key={o.id} style={{ ...G.card, padding:18 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                  <div>
                    <div style={{ fontWeight:800, color:C.textDark }}>{o.store_name}</div>
                    <div style={{ fontSize:12, color:C.textGray }}>{new Date(o.created_at).toLocaleDateString("pt-BR")}</div>
                  </div>
                  <span style={{ background:`${STATUS_COLORS[o.status]}18`, color:STATUS_COLORS[o.status], fontWeight:700, fontSize:12, borderRadius:8, padding:"3px 10px" }}>
                    {STATUS_LABELS[o.status]?.split(" ").slice(0,2).join(" ") || o.status}
                  </span>
                </div>
                {(o.items||[]).slice(0,2).map((i, idx) => (
                  <div key={idx} style={{ fontSize:13, color:C.textGray, marginBottom:2 }}>{i.emoji} {i.qty}x {i.name}</div>
                ))}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10, paddingTop:10, borderTop:`1px solid ${C.gray}` }}>
                  <span style={{ fontWeight:900, color:C.primaryDark, fontSize:15 }}>{fmt(o.total)}</span>
                  {!["delivered","cancelled"].includes(o.status) && (
                    <button onClick={() => onTrack(o.id)}
                      style={{ padding:"7px 14px", borderRadius:8, border:`2px solid ${C.primary}`, background:"transparent", color:C.primary, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                      🔴 Rastrear
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Bottom Nav ────────────────────────────────────────────────────
function BottomNav({ screen, onTab, cartCount }) {
  const tabs = [
    { id:"stores",  label:"Lojas",    icon:"🏠" },
    { id:"cart",    label:"Carrinho", icon:"🛒", badge:cartCount },
    { id:"orders",  label:"Pedidos",  icon:"📦" },
  ];
  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, background:C.white, boxShadow:"0 -4px 20px rgba(0,0,0,0.1)", display:"flex", justifyContent:"space-around", padding:"8px 0", zIndex:200 }}>
      {tabs.map((t) => {
        const isActive = screen===t.id || (t.id==="stores" && screen==="products");
        return (
          <button key={t.id} onClick={() => onTab(t.id)}
            style={{ background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"4px 16px", position:"relative", fontFamily:"inherit", flex:1 }}>
            <span style={{ fontSize:22, filter: isActive ? "none" : "grayscale(1) opacity(0.5)" }}>{t.icon}</span>
            <span style={{ fontSize:11, fontWeight: isActive ? 800 : 600, color: isActive ? C.primary : C.textGray }}>{t.label}</span>
            {t.badge > 0 && <span style={{ position:"absolute", top:0, right:"20%", background:C.primaryDark, color:C.white, borderRadius:999, fontSize:10, fontWeight:800, minWidth:16, height:16, display:"flex", alignItems:"center", justifyContent:"center" }}>{t.badge}</span>}
            {isActive && <div style={{ position:"absolute", top:-8, width:24, height:3, background:`linear-gradient(90deg,${C.primary},${C.primaryDark})`, borderRadius:"0 0 3px 3px" }}/>}
          </button>
        );
      })}
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────
export default function CustomerApp() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const width    = useWindowSize();
  const isDesktop = width >= 768;

  const [screen,    setScreen]    = useState("stores");
  const [selStore,  setSelStore]  = useState(null);
  const [trackingId,setTrackingId]= useState(null);
  const [cart,      setCart]      = useState([]);
  const [toast,     setToast]     = useState("");
  const [freteInfo, setFreteInfo] = useState(null);
  const toastRef = useRef(null);

  const cartTotal = cart.reduce((s,i) => s+i.price*i.qty, 0);
  const cartCount = cart.reduce((s,i) => s+i.qty, 0);

  const showToast = (msg) => {
    setToast(msg); clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(""), 2000);
  };

  const addToCart = (p) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.id===p.id);
      if (ex) return prev.map((i) => i.id===p.id ? { ...i, qty:i.qty+1 } : i);
      return [...prev, { ...p, qty:1 }];
    });
    showToast(`${p.name} adicionado!`);
  };

  const removeOne  = (id) => setCart((prev) => { const it=prev.find((i)=>i.id===id); if(it?.qty>1) return prev.map((i)=>i.id===id?{...i,qty:i.qty-1}:i); return prev.filter((i)=>i.id!==id); });
  const deleteItem = (id) => setCart((prev) => prev.filter((i)=>i.id!==id));

  const handleLogout = async () => { await logout(); navigate("/login"); };

  const goTab = (tab) => {
    if (tab==="cart") { setScreen("cart"); return; }
    setScreen(tab);
  };

  const props = { isDesktop, cartCount, onCartClick:()=>setScreen("cart") };

  const renderScreen = () => {
    if (screen==="stores")   return <StoreListScreen onSelectStore={(s)=>{ setSelStore(s); setCart([]); setScreen("products"); }} {...props}/>;
    if (screen==="products" && selStore) return <StoreProductsScreen store={selStore} onBack={()=>setScreen("stores")} onAddToCart={addToCart} {...props}/>;
    if (screen==="cart")     return <CartScreen cart={cart} cartTotal={cartTotal} store={selStore} onAdd={addToCart} onRemove={removeOne} onDelete={deleteItem} onBack={()=>setScreen(selStore?"products":"stores")} onCheckout={()=>setScreen("checkout")} freteOutOfRange={freteInfo?.out_of_range} freteInfo={freteInfo} {...props}/>;
    if (screen==="checkout" && selStore) return <CheckoutScreen cart={cart} store={selStore} cartTotal={cartTotal} onBack={()=>setScreen("cart")} onSuccess={(id)=>{ setCart([]); setTrackingId(id); setScreen("tracking"); }} {...props}/>;
    if (screen==="tracking") return <OrderTrackingScreen orderId={trackingId} onBack={()=>setScreen("orders")} {...props}/>;
    if (screen==="orders")   return <OrdersScreen onBack={()=>setScreen("stores")} onTrack={(id)=>{ setTrackingId(id); setScreen("tracking"); }} {...props}/>;
    return <StoreListScreen onSelectStore={(s)=>{ setSelStore(s); setCart([]); setScreen("products"); }} {...props}/>;
  };

  return (
    <div style={{ fontFamily:"'Nunito','Segoe UI',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');*{box-sizing:border-box}body{margin:0}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
      {toast && <div style={{ position:"fixed", top:70, left:"50%", transform:"translateX(-50%)", background:C.dark, color:C.white, borderRadius:20, padding:"10px 20px", fontSize:13, fontWeight:700, zIndex:500, whiteSpace:"nowrap" }}>✓ {toast}</div>}

      {isDesktop ? (
        <div style={{ display:"flex", minHeight:"100vh" }}>
          <aside style={{ width:220, background:C.white, boxShadow:"2px 0 12px rgba(0,0,0,0.08)", position:"fixed", height:"100vh", display:"flex", flexDirection:"column", zIndex:100 }}>
            <div style={{ padding:"22px 18px 16px", borderBottom:`1px solid ${C.gray}` }}>
              <div style={{ fontSize:17, fontWeight:900, color:C.primary }}>🐾 PetDelivery</div>
              <div style={{ fontSize:12, color:C.textGray }}>Olá, {user?.name?.split(" ")[0]}!</div>
            </div>
            <nav style={{ flex:1, padding:"14px 10px" }}>
              {[{ id:"stores",icon:"🏠",label:"Lojas" },{ id:"orders",icon:"📦",label:"Pedidos" }].map((t) => (
                <button key={t.id} onClick={()=>setScreen(t.id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"11px 13px", borderRadius:10, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:14, fontWeight: screen===t.id?800:600, background: screen===t.id?`${C.primary}18`:"transparent", color: screen===t.id?C.primary:C.textDark, marginBottom:4 }}>
                  <span style={{ fontSize:18 }}>{t.icon}</span>{t.label}
                </button>
              ))}
            </nav>
            <div style={{ padding:"14px 10px 20px", borderTop:`1px solid ${C.gray}` }}>
              <button onClick={()=>setScreen("cart")} style={{ width:"100%", background: cartCount>0?`linear-gradient(135deg,${C.primary},${C.primaryDark})`:C.gray, border:"none", borderRadius:12, padding:"13px 14px", cursor:"pointer", color: cartCount>0?C.white:C.textDark, fontFamily:"inherit", display:"flex", alignItems:"center", gap:10, fontWeight:700, marginBottom:8 }}>
                <span style={{ fontSize:20 }}>🛒</span>
                <div style={{ textAlign:"left" }}>
                  <div style={{ fontSize:13 }}>Carrinho{cartCount>0?` (${cartCount})`:""}</div>
                  {cartCount>0 && <div style={{ fontSize:12, opacity:.9 }}>{fmt(cartTotal)}</div>}
                </div>
              </button>
              <button onClick={handleLogout} style={{ width:"100%", background:"transparent", border:"none", padding:"8px", color:C.textGray, fontSize:13, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>Sair →</button>
            </div>
          </aside>
          <main style={{ marginLeft:220, flex:1 }}>{renderScreen()}</main>
        </div>
      ) : (
        <div style={{ maxWidth:430, margin:"0 auto", minHeight:"100vh", background:C.bg, position:"relative" }}>
          {renderScreen()}
          {!["checkout","tracking"].includes(screen) && <BottomNav screen={screen} onTab={goTab} cartCount={cartCount}/>}
          {/* FASE 4: chat de atendimento ao cliente flutuante */}
          {/* Fase 2: banner de instalação PWA */}
          <PWAInstallBanner />
          <CustomerChatWidget storeId={store?.id || null} />
        </div>
      )}
    </div>
  );
}
