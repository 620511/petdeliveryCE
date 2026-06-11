// backend/src/controllers/delivery.controller.js
// FRETE DINÂMICO: faixas de entrega por loja + cálculo Haversine
//
// Fórmula Haversine: calcula distância real (km) entre dois pontos GPS
// Gratuita, sem API externa, precisa o suficiente para delivery local.

const prisma = require("../config/database");

// ── Haversine ──────────────────────────────────────────────────────
// Retorna distância em km entre dois pontos (lat/lng em graus decimais)
function haversine(lat1, lng1, lat2, lng2) {
  const R  = 6371; // raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Geocodificação via Nominatim (OpenStreetMap) ──────────────────
// Gratuita, sem chave de API, limite de 1 req/s
// Para produção com alto volume: substituir por Google Maps Geocoding API
async function geocodeAddress(address) {
  const query  = encodeURIComponent(`${address}, Brasil`);
  const url    = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;
  const res    = await fetch(url, {
    headers: { "User-Agent": "PetDelivery/1.0" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

// ──────────────────────────────────────────────────────────────────
// PÚBLICO: calcular frete para um endereço
// POST /api/customer/stores/:storeId/delivery-fee
// Body: { customer_lat, customer_lng } OU { address: "Rua X, 123, Cidade" }
// Retorna: { fee, zone_id, distance_km, free_above, out_of_range }
// ──────────────────────────────────────────────────────────────────
const calculateFee = async (req, res) => {
  const { storeId } = req.params;
  let { customer_lat, customer_lng, address } = req.body;

  // Se recebeu endereço em texto, geocodifica
  if ((!customer_lat || !customer_lng) && address) {
    const coords = await geocodeAddress(address);
    if (!coords) return res.status(422).json({ error: "Não foi possível localizar o endereço. Tente informar CEP + cidade." });
    customer_lat = coords.lat;
    customer_lng = coords.lng;
  }

  if (!customer_lat || !customer_lng)
    return res.status(400).json({ error: "Informe as coordenadas ou o endereço de entrega" });

  const store = await prisma.store.findUnique({
    where:   { id: storeId },
    include: { deliveryZones: { where: { isActive: true }, orderBy: { maxKm: "asc" } } },
  });
  if (!store) return res.status(404).json({ error: "Loja não encontrada" });

  // Se a loja não tem coordenadas cadastradas, usa frete fixo como fallback
  if (!store.lat || !store.lng) {
    return res.json({
      fee:          store.deliveryFee,
      distance_km:  null,
      zone_id:      null,
      free_above:   null,
      out_of_range: false,
      fallback:     true,  // avisa o frontend que usou frete fixo
    });
  }

  const distanceKm = haversine(store.lat, store.lng, customer_lat, customer_lng);

  // Se não há faixas configuradas, usa frete fixo como fallback
  if (!store.deliveryZones.length) {
    const fee = distanceKm >= 0 ? store.deliveryFee : store.deliveryFee;
    return res.json({ fee, distance_km: parseFloat(distanceKm.toFixed(2)), zone_id: null, free_above: null, out_of_range: false, fallback: true });
  }

  // Encontra a faixa correspondente (menor maxKm que cobre a distância)
  const zone = store.deliveryZones.find(z => distanceKm <= z.maxKm);

  if (!zone) {
    return res.json({
      fee:          null,
      distance_km:  parseFloat(distanceKm.toFixed(2)),
      zone_id:      null,
      free_above:   null,
      out_of_range: true,  // fora da área de entrega
      max_km:       store.deliveryZones[store.deliveryZones.length - 1].maxKm,
    });
  }

  res.json({
    fee:          zone.fee,
    distance_km:  parseFloat(distanceKm.toFixed(2)),
    zone_id:      zone.id,
    free_above:   zone.freeAbove,  // frete grátis se subtotal >= freeAbove
    out_of_range: false,
    fallback:     false,
  });
};

// ──────────────────────────────────────────────────────────────────
// LOJISTA: listar faixas da sua loja
// GET /api/store/delivery-zones
// ──────────────────────────────────────────────────────────────────
const listZones = async (req, res) => {
  const store = await prisma.store.findUnique({
    where:   { ownerId: req.user.id },
    include: { deliveryZones: { orderBy: { maxKm: "asc" } } },
  });
  if (!store) return res.status(404).json({ error: "Loja não encontrada" });

  res.json({
    zones:     store.deliveryZones,
    store_lat: store.lat,
    store_lng: store.lng,
    has_coords: !!(store.lat && store.lng),
    fallback_fee: store.deliveryFee,
  });
};

// ──────────────────────────────────────────────────────────────────
// LOJISTA: salvar todas as faixas de uma vez (replace completo)
// PUT /api/store/delivery-zones
// Body: { zones: [{ max_km, fee, free_above? }] }
// ──────────────────────────────────────────────────────────────────
const saveZones = async (req, res) => {
  const { zones } = req.body;

  if (!Array.isArray(zones))
    return res.status(400).json({ error: "zones deve ser um array" });

  // Validações
  for (const z of zones) {
    if (!z.max_km || z.max_km <= 0)
      return res.status(400).json({ error: "max_km deve ser maior que 0" });
    if (z.fee === undefined || z.fee < 0)
      return res.status(400).json({ error: "fee deve ser >= 0" });
  }

  // Ordenar por max_km antes de salvar
  const sorted = [...zones].sort((a, b) => a.max_km - b.max_km);

  const store = await prisma.store.findUnique({ where: { ownerId: req.user.id } });
  if (!store) return res.status(404).json({ error: "Loja não encontrada" });

  // Delete + Insert em transação (replace completo)
  await prisma.$transaction([
    prisma.deliveryZone.deleteMany({ where: { storeId: store.id } }),
    prisma.deliveryZone.createMany({
      data: sorted.map((z, i) => ({
        storeId:   store.id,
        maxKm:     Number(z.max_km),
        fee:       Number(z.fee),
        freeAbove: z.free_above ? Number(z.free_above) : null,
        isActive:  true,
        sortOrder: i,
      })),
    }),
  ]);

  const updated = await prisma.deliveryZone.findMany({
    where:   { storeId: store.id },
    orderBy: { maxKm: "asc" },
  });

  res.json({ zones: updated });
};

// ──────────────────────────────────────────────────────────────────
// LOJISTA: geocodificar endereço da loja (salva lat/lng)
// POST /api/store/geocode
// Body: { address } — opcional, se omitido usa o endereço já cadastrado
// ──────────────────────────────────────────────────────────────────
const geocodeStore = async (req, res) => {
  const store = await prisma.store.findUnique({ where: { ownerId: req.user.id } });
  if (!store) return res.status(404).json({ error: "Loja não encontrada" });

  const address = req.body.address || store.address;
  if (!address?.trim()) return res.status(400).json({ error: "Endereço não cadastrado" });

  const coords = await geocodeAddress(address);
  if (!coords)
    return res.status(422).json({
      error: "Não foi possível localizar o endereço. Tente incluir o CEP ou cidade.",
    });

  await prisma.store.update({
    where: { id: store.id },
    data:  { lat: coords.lat, lng: coords.lng },
  });

  res.json({
    lat:     coords.lat,
    lng:     coords.lng,
    address: address,
    message: "Localização da loja salva com sucesso!",
  });
};

module.exports = { calculateFee, listZones, saveZones, geocodeStore };
