// Module 3 - Market intelligence: /api/market (ESM; tolerant to default/named exports of shared/*)
import { Router } from 'express';
import * as dbm from '../../shared/db.js';
import * as authm from '../../shared/auth.js';
import * as geom from '../../shared/geo.js';

const pool = dbm.default?.query ? dbm.default : (dbm.pool || dbm.db);
const requireAuth = authm.requireAuth || authm.default?.requireAuth;
const distanceKm = geom.distanceKm || geom.default?.distanceKm;
const q = async (sql, p = []) => (await pool.query(sql, p))[0];
const num = (x) => Number(x) || 0;
const lc = (s) => String(s || '').toLowerCase().trim();
const cropsOf = (s) => lc(s).split(/[,;|]/).map((x) => x.trim()).filter(Boolean);
const GR = { A: 3, B: 2, C: 1 };
const HANDLING = 20; // Rs/qtl handling+packaging
const DISTRICTS = ['Rohtak', 'Sonipat', 'Karnal', 'Hisar', 'Panipat', 'Gurugram', 'Sirsa', 'Jhajjar'];
const CENTERS = { Rohtak: [28.8955, 76.6066], Sonipat: [28.9931, 77.0151], Karnal: [29.6857, 76.9905], Hisar: [29.1492, 75.7217], Panipat: [29.3909, 76.9635], Gurugram: [28.4595, 77.0266], Sirsa: [29.5349, 75.0288], Jhajjar: [28.6055, 76.6565] };
const LIVE = ['listed', 'routed', 'selling'];
const SOLD = ['accepted', 'pickup', 'delivered', 'sold'];
const DISC = { en: 'Sample data. Estimates only, not guaranteed. Not live government data.', hi: 'नमूना डेटा। केवल अनुमान, गारंटी नहीं। लाइव सरकारी डेटा नहीं।' };

const err = (status, message) => Object.assign(new Error(message), { status });
const w = (fn) => (req, res) => fn(req, res).catch((e) => {
  if (!e.status) console.error(e);
  res.status(e.status || 500).json({ error: e.status ? e.message : 'Server error' });
});
const auth = (roles) => requireAuth(roles);
const road = (a, b, c, d) => (a == null || b == null || c == null || d == null) ? 100
  : Math.round(distanceKm(num(a), num(b), num(c), num(d)) * 1.3 * 10) / 10;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

async function ownCrop(req, id) {
  if (!id) throw err(400, 'crop_id required');
  const [c] = await q('SELECT * FROM crops WHERE id=?', [id]);
  if (!c) throw err(404, 'Crop not found');
  if (req.user.role === 'farmer' && c.farmer_id !== req.user.id) throw err(403, 'Not your crop');
  return c;
}
const loadVehicles = () => q("SELECT capacity_qtl,rate_per_km,min_charge FROM vehicles WHERE availability='available' AND verified=1");
// cheapest suitable vehicle: max(min_charge, km*rate) per trip; fallback Rs18/km per 20 qtl
function transportEst(vs, qty, km) {
  let best = null;
  for (const v of vs) {
    const cap = num(v.capacity_qtl) || 20;
    const c = Math.max(1, Math.ceil(qty / cap)) * Math.max(num(v.min_charge), km * num(v.rate_per_km));
    if (best === null || c < best) best = c;
  }
  if (best === null) best = 18 * km * Math.max(1, qty / 20);
  return Math.round(best);
}
function nearestMarket(crop, markets) {
  const ms = markets.filter((m) => lc(m.crop) === lc(crop.crop) && num(m.price_per_qtl) > 0)
    .map((m) => ({ m, km: road(crop.lat, crop.lng, m.lat, m.lng) })).sort((a, b) => a.km - b.km);
  return ms[0] || null;
}
function hist(m) {
  try {
    const a = typeof m.price_history_json === 'string' ? JSON.parse(m.price_history_json) : m.price_history_json;
    return (a || []).map((x) => num(typeof x === 'object' ? x.price : x)).filter((x) => x > 0);
  } catch { return []; }
}
function priceModel(m) {
  const h = hist(m); const base = num(m.price_per_qtl);
  if (h.length < 3) return { base, slope: 0, vol: 0.08, n: h.length };
  const n = h.length, mean = h.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0;
  h.forEach((y, i) => { sxy += (i - (n - 1) / 2) * (y - mean); sxx += (i - (n - 1) / 2) ** 2; });
  const sd = Math.sqrt(h.reduce((a, y) => a + (y - mean) ** 2, 0) / n);
  return { base, slope: sxx ? sxy / sxx : 0, vol: Math.max(0.04, sd / mean), n };
}

/* ---------- Buyer matching ---------- */
async function matchBuyers(crop) {
  const [vs, buyers, markets] = await Promise.all([loadVehicles(), q('SELECT * FROM buyers'), q('SELECT * FROM markets')]);
  const qty = num(crop.quantity_qtl) || 1, name = lc(crop.crop);
  const mk = nearestMarket(crop, markets);
  const mandi = mk ? { name: mk.m.name, price: num(mk.m.price_per_qtl), distance_km: mk.km,
    net: Math.round(num(mk.m.price_per_qtl) * qty - transportEst(vs, qty, mk.km) - HANDLING * qty) } : null;
  const cands = buyers.filter((b) => cropsOf(b.crops).includes(name));
  const ref = Math.max(mandi?.price || 0, ...cands.map((b) => num(b.offer_price_per_qtl)), 1);
  const list = cands.map((b) => {
    const km = road(crop.lat, crop.lng, b.lat, b.lng), need = num(b.required_qtl);
    const sold = Math.min(qty, need > 0 ? need : qty);
    const qf = need <= 0 || need >= qty ? 1 : need / qty;
    const gradeOk = (GR[crop.grade] || 1) >= (GR[b.min_grade] || 1);
    const df = Math.max(0, 1 - km / 300), pf = Math.min(1, num(b.offer_price_per_qtl) / ref);
    const score = 0.25 * qf + 0.25 * (gradeOk ? 1 : 0) + 0.2 * df + 0.3 * pf;
    const transport = transportEst(vs, sold, km), gross = Math.round(num(b.offer_price_per_qtl) * sold);
    const handling = HANDLING * sold, net = gross - transport - 0 - handling - 0;
    const reasons = [gradeOk ? 'grade_ok' : 'grade_low', qf >= 1 ? 'qty_full' : 'qty_part', km <= 100 ? 'near' : 'far'];
    if (pf >= 0.98) reasons.push('price_top');
    return { id: b.id, business_name: b.business_name, buyer_type: b.buyer_type, district: b.district, verified: !!b.verified,
      min_grade: b.min_grade, required_qtl: need, offer_price_per_qtl: num(b.offer_price_per_qtl), distance_km: km,
      sold_qtl: sold, grade_ok: gradeOk, match_pct: Math.round(score * 100), est_net: net,
      vs_mandi: mandi ? net - Math.round(mandi.net * sold / qty) : null, reasons,
      breakdown: { gross, transport, storage: 0, handling, other: 0, net } };
  }).sort((a, b) => b.match_pct - a.match_pct || b.est_net - a.est_net);
  return { mandi, list };
}

const r = Router();
r.get('/health', (req, res) => res.json({ ok: true, module: 'market' }));

r.get('/buyers/match', auth(['farmer', 'admin']), w(async (req, res) => {
  const crop = await ownCrop(req, req.query.crop_id);
  const { mandi, list } = await matchBuyers(crop);
  res.json({ crop_id: crop.id, crop: crop.crop, quantity_qtl: num(crop.quantity_qtl), mandi, buyers: list, sample_data: true, disclaimer: DISC });
}));

// buyer: requirements CRUD
const buyerFields = (b) => {
  const crops = cropsOf(Array.isArray(b.crops) ? b.crops.join(',') : b.crops);
  if (!crops.length) throw err(400, 'crops required');
  if (num(b.required_qtl) <= 0) throw err(400, 'required_qtl must be > 0');
  if (num(b.offer_price_per_qtl) <= 0) throw err(400, 'offer_price_per_qtl must be > 0');
  const mg = GR[b.min_grade] ? b.min_grade : 'B', c = CENTERS[b.district] || [];
  return { crops: crops.join(','), required_qtl: num(b.required_qtl), min_grade: mg, offer_price_per_qtl: num(b.offer_price_per_qtl),
    district: b.district || null, lat: b.lat ?? c[0] ?? null, lng: b.lng ?? c[1] ?? null,
    business_name: b.business_name || 'Buyer', buyer_type: ['processor', 'trader', 'retailer'].includes(b.buyer_type) ? b.buyer_type : 'trader' };
};
r.get('/buyers/requirements', auth(['buyer', 'admin']), w(async (req, res) => {
  res.json({ requirements: await q('SELECT * FROM buyers WHERE user_id=? ORDER BY id DESC', [req.user.id]), sample_data: true });
}));
r.post('/buyers/requirements', auth(['buyer']), w(async (req, res) => {
  const f = buyerFields(req.body || {});
  const [u] = await q('SELECT verification_status FROM users WHERE id=?', [req.user.id]);
  const out = await pool.query('INSERT INTO buyers (user_id,business_name,buyer_type,crops,required_qtl,min_grade,offer_price_per_qtl,district,lat,lng,verified) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [req.user.id, f.business_name, f.buyer_type, f.crops, f.required_qtl, f.min_grade, f.offer_price_per_qtl, f.district, f.lat, f.lng, u?.verification_status === 'verified' ? 1 : 0]);
  const [row] = await q('SELECT * FROM buyers WHERE id=?', [out[0].insertId]);
  res.status(201).json(row);
}));
async function ownReq(req) {
  const [b] = await q('SELECT * FROM buyers WHERE id=?', [req.params.id]);
  if (!b) throw err(404, 'Requirement not found');
  if (b.user_id !== req.user.id) throw err(403, 'Not your requirement');
  return b;
}
const updReq = w(async (req, res) => {
  const old = await ownReq(req), f = buyerFields({ ...old, ...(req.body || {}) });
  await q('UPDATE buyers SET business_name=?,buyer_type=?,crops=?,required_qtl=?,min_grade=?,offer_price_per_qtl=?,district=?,lat=?,lng=? WHERE id=?',
    [f.business_name, f.buyer_type, f.crops, f.required_qtl, f.min_grade, f.offer_price_per_qtl, f.district, f.lat, f.lng, old.id]);
  res.json((await q('SELECT * FROM buyers WHERE id=?', [old.id]))[0]);
});
const delReq = w(async (req, res) => { const b = await ownReq(req); await q('DELETE FROM buyers WHERE id=?', [b.id]); res.json({ deleted: true }); });
r.patch('/buyers/requirements/:id', auth(['buyer']), updReq);
r.put('/buyers/requirements/:id', auth(['buyer']), updReq);
r.delete('/buyers/requirements/:id', auth(['buyer']), delReq);
r.post('/buyers/requirements/:id/delete', auth(['buyer']), delReq);

// buyer: anonymised incoming matches (no farmer identity)
r.get('/buyers/incoming', auth(['buyer']), w(async (req, res) => {
  const mine = await q('SELECT * FROM buyers WHERE user_id=?', [req.user.id]);
  const crops = await q("SELECT id,crop,quantity_qtl,grade,district,lat,lng,urgency_days,harvest_date FROM crops WHERE status IN ('listed','routed','selling')");
  const out = [];
  for (const b of mine) for (const c of crops) {
    if (!cropsOf(b.crops).includes(lc(c.crop))) continue;
    const km = road(c.lat, c.lng, b.lat, b.lng), qty = num(c.quantity_qtl) || 1, need = num(b.required_qtl);
    const qf = need <= 0 || need >= qty ? 1 : need / qty, gOk = (GR[c.grade] || 1) >= (GR[b.min_grade] || 1);
    const score = 0.25 * qf + 0.25 * (gOk ? 1 : 0) + 0.2 * Math.max(0, 1 - km / 300) + 0.3;
    out.push({ lot_ref: 'L' + c.id, requirement_id: b.id, crop: c.crop, quantity_qtl: qty, grade: c.grade, district: c.district,
      urgency_days: c.urgency_days, distance_km: km, grade_ok: gOk, match_pct: Math.round(score * 100), est_cost: Math.round(num(b.offer_price_per_qtl) * Math.min(qty, need || qty)) });
  }
  res.json({ matches: out.sort((a, b) => b.match_pct - a.match_pct).slice(0, 30), sample_data: true });
}));

r.post('/buyers/:id/accept-offer', auth(['farmer']), w(async (req, res) => {
  const { crop_id, route_id, quantity_qtl } = req.body || {};
  const crop = await ownCrop(req, crop_id);
  const [b] = await q('SELECT * FROM buyers WHERE id=?', [req.params.id]);
  if (!b) throw err(404, 'Buyer not found');
  if (!cropsOf(b.crops).includes(lc(crop.crop))) throw err(400, 'Buyer does not buy this crop');
  const qty = Math.min(num(quantity_qtl) || num(crop.quantity_qtl), num(crop.quantity_qtl), num(b.required_qtl) || Infinity);
  if (qty <= 0) throw err(400, 'Invalid quantity');
  const vs = await loadVehicles(), km = road(crop.lat, crop.lng, b.lat, b.lng);
  const est = Math.round(num(b.offer_price_per_qtl) * qty - transportEst(vs, qty, km) - HANDLING * qty);
  let rid = route_id || null;
  if (!rid) { const [rt] = await q('SELECT id FROM routes WHERE crop_id=? AND destination_ref_id=? AND route_type IN (?,?) ORDER BY rank_no LIMIT 1', [crop.id, b.id, 'buyer', 'processor']); rid = rt?.id || null; }
  const [ex] = await q("SELECT id FROM transactions WHERE crop_id=? AND farmer_id=? AND status IN ('requested','accepted') ORDER BY id DESC LIMIT 1", [crop.id, req.user.id]);
  let id;
  if (ex) {
    await q("UPDATE transactions SET buyer_id=?,route_id=COALESCE(?,route_id),quantity_qtl=?,final_price_per_qtl=?,status='accepted',est_net=? WHERE id=?", [b.id, rid, qty, b.offer_price_per_qtl, est, ex.id]); id = ex.id;
  } else {
    const o = await pool.query("INSERT INTO transactions (farmer_id,buyer_id,vehicle_id,crop_id,route_id,quantity_qtl,final_price_per_qtl,status,est_net,realised_net,district) VALUES (?,?,NULL,?,?,?,?,'accepted',?,NULL,?)",
      [req.user.id, b.id, crop.id, rid, qty, b.offer_price_per_qtl, est, crop.district]); id = o[0].insertId;
  }
  await q("UPDATE crops SET status='selling' WHERE id=?", [crop.id]);
  res.status(201).json({ transaction: (await q('SELECT * FROM transactions WHERE id=?', [id]))[0], sample_data: true });
}));

/* ---------- Storage ---------- */
const storageFor = (crop, sts) => sts.filter((s) => { const c = cropsOf(s.crops_supported); return !c.length || c.includes(lc(crop.crop)); })
  .map((s) => ({ s, km: road(crop.lat, crop.lng, s.lat, s.lng) })).sort((a, b) => a.km - b.km);

r.get('/storage/nearby', auth(['farmer', 'admin']), w(async (req, res) => {
  const crop = await ownCrop(req, req.query.crop_id), qty = num(crop.quantity_qtl);
  const list = storageFor(crop, await q('SELECT * FROM storage')).slice(0, 10).map(({ s, km }) => ({
    id: s.id, name: s.name, type: s.type, district: s.district, distance_km: km, capacity_qtl: num(s.capacity_qtl),
    available_qtl: num(s.available_qtl), rate_per_qtl_per_day: num(s.rate_per_qtl_per_day), crops_supported: s.crops_supported, fits: num(s.available_qtl) >= qty }));
  res.json({ crop_id: crop.id, quantity_qtl: qty, facilities: list, sample_data: true, disclaimer: DISC });
}));

const PERISH = { tomato: 3, onion: 0.5, potato: 0.6, wheat: 0.1, mustard: 0.1 }; // %/day ambient (sample assumption)
const SFACT = { cold: 0.3, warehouse: 0.7, godown: 1 };
r.get('/storage/compare', auth(['farmer', 'admin']), w(async (req, res) => {
  const crop = await ownCrop(req, req.query.crop_id);
  const days = clamp(parseInt(req.query.days) || 7, 1, 30);
  const [vs, sts, markets] = await Promise.all([loadVehicles(), q('SELECT * FROM storage'), q('SELECT * FROM markets')]);
  const qty = num(crop.quantity_qtl) || 1, mk = nearestMarket(crop, markets);
  if (!mk) throw err(404, 'No sample market price for this crop');
  const cands = storageFor(crop, sts);
  let pick = req.query.storage_id ? cands.find((x) => String(x.s.id) === String(req.query.storage_id)) : null;
  if (!pick) pick = cands.filter((x) => num(x.s.available_qtl) >= qty)[0] || cands[0];
  if (!pick) throw err(404, 'No storage found for this crop');
  const pm = priceModel(mk.m), base = pm.base;
  const tMarket = transportEst(vs, qty, mk.km), tStore = transportEst(vs, qty, pick.km);
  const rate = num(pick.s.rate_per_qtl_per_day), lossRate = (PERISH[lc(crop.crop)] ?? 1) * (SFACT[pick.s.type] ?? 1);
  const loss = (d) => Math.min(0.5, lossRate * d / 100);
  const storeNet = (d, price) => Math.round(price * qty * (1 - loss(d)) - tStore - tMarket - 2 * HANDLING * qty - rate * qty * d);
  const kOf = (d) => Math.min(0.35, Math.max(pm.vol, 0.05) * Math.sqrt(d));
  const midP = (d) => base * (1 + clamp(pm.slope * d / base, -0.15, 0.15));
  const nowNet = Math.round(base * qty - tMarket - HANDLING * qty);
  const series = [];
  for (let d = 0; d <= days; d++) {
    const m = midP(d), k = kOf(d);
    series.push(d === 0 ? { day: 0, low: nowNet, mid: nowNet, high: nowNet }
      : { day: d, low: storeNet(d, m * (1 - k)), mid: storeNet(d, m), high: storeNet(d, m * (1 + k)) });
  }
  const end = series[series.length - 1], k = kOf(days);
  const verdict = end.low > nowNet ? 'store_likely' : end.mid > nowNet ? 'store_risky' : 'sell_now';
  const confidence = days <= 3 && pm.vol < 0.08 && pm.n >= 7 ? 'high' : days > 7 || pm.vol > 0.15 || pm.n < 3 ? 'low' : 'medium';
  const lp = (lossRate * days).toFixed(1);
  res.json({
    crop_id: crop.id, crop: crop.crop, days, quantity_qtl: qty,
    market: { name: mk.m.name, price: base, distance_km: mk.km },
    storage: { id: pick.s.id, name: pick.s.name, type: pick.s.type, distance_km: pick.km, rate_per_qtl_per_day: rate, available_qtl: num(pick.s.available_qtl), fits: num(pick.s.available_qtl) >= qty },
    sell_now: { price: base, gross: Math.round(base * qty), transport: tMarket, storage: 0, handling: HANDLING * qty, other: 0, net: nowNet },
    store: { storage_cost: Math.round(rate * qty * days), loss_pct: Number(lp), transport: tStore + tMarket, handling: 2 * HANDLING * qty,
      price_band: { low: Math.round(midP(days) * (1 - k)), mid: Math.round(midP(days)), high: Math.round(midP(days) * (1 + k)) },
      net_low: end.low, net_mid: end.mid, net_high: end.high, series },
    verdict, confidence,
    risk: { en: `Price may move about ±${Math.round(k * 100)}% in ${days} days and ${crop.crop} may lose ~${lp}% quality/weight in storage. Not guaranteed.`,
      hi: `${days} दिनों में भाव लगभग ±${Math.round(k * 100)}% बदल सकता है और भंडारण में ${crop.crop} का ~${lp}% वज़न/गुणवत्ता घट सकती है। गारंटी नहीं।` },
    sample_data: true, disclaimer: DISC });
}));

/* ---------- Wastage rescue ---------- */
const O = (c, en, hi, rt, proc) => ({ c, en, hi, rt, proc });
const WASTE = {
  tomato: [O('pulp', 'Pulp / puree / ketchup unit', 'पल्प / प्यूरी / केचप यूनिट', 0.55, 1), O('dry', 'Solar drying (flakes / powder)', 'सोलर ड्राइंग (फ्लेक्स / पाउडर)', 0.35), O('feed', 'Cattle feed / biogas', 'पशु आहार / बायोगैस', 0.12), O('compost', 'Compost / manure', 'कम्पोस्ट / खाद', 0.06)],
  onion: [O('dehydrate', 'Dehydration / flakes unit', 'डिहाइड्रेशन / फ्लेक्स यूनिट', 0.5, 1), O('paste', 'Paste / pickle makers', 'पेस्ट / अचार बनाने वाले', 0.3), O('feed', 'Cattle feed / biogas', 'पशु आहार / बायोगैस', 0.1), O('compost', 'Compost / manure', 'कम्पोस्ट / खाद', 0.05)],
  potato: [O('chips', 'Chips / starch / flour unit', 'चिप्स / स्टार्च / आटा यूनिट', 0.5, 1), O('dry', 'Drying / flakes', 'ड्राइंग / फ्लेक्स', 0.3), O('feed', 'Cattle feed', 'पशु आहार', 0.15), O('compost', 'Compost / manure', 'कम्पोस्ट / खाद', 0.05)],
  wheat: [O('feedmill', 'Feed-grade sale to feed mill', 'फ़ीड मिल को बिक्री', 0.65, 1), O('flour', 'Local chakki / flour mill', 'स्थानीय चक्की / आटा मिल', 0.55), O('feed', 'Cattle feed', 'पशु आहार', 0.3)],
  mustard: [O('oil', 'Oil mill (lower grade)', 'तेल मिल (कम ग्रेड)', 0.7, 1), O('cake', 'Oil-cake / cattle feed', 'खली / पशु आहार', 0.2)],
  _: [O('proc', 'Nearest processor', 'नज़दीकी प्रोसेसर', 0.5, 1), O('dry', 'Drying / value addition', 'ड्राइंग / वैल्यू एडिशन', 0.3), O('feed', 'Cattle feed / biogas', 'पशु आहार / बायोगैस', 0.12), O('compost', 'Compost / manure', 'कम्पोस्ट / खाद', 0.05)],
};
r.get('/wastage/:crop_id', auth(['farmer', 'admin']), w(async (req, res) => {
  const crop = await ownCrop(req, req.params.crop_id);
  const [vs, buyers, markets] = await Promise.all([loadVehicles(), q("SELECT * FROM buyers WHERE buyer_type='processor'"), q('SELECT * FROM markets')]);
  const qty = num(crop.quantity_qtl) || 1, name = lc(crop.crop), mk = nearestMarket(crop, markets), base = mk ? num(mk.m.price_per_qtl) : 1500;
  const why = [];
  if (crop.status === 'wasted') why.push('wasted');
  if (crop.grade === 'C') why.push('low_grade');
  if (num(crop.urgency_days) <= 0) why.push('no_time');
  if (num(crop.moisture_pct) > 20) why.push('high_moisture');
  const procs = buyers.filter((b) => cropsOf(b.crops).includes(name)).map((b) => ({ b, km: road(crop.lat, crop.lng, b.lat, b.lng) })).sort((a, b) => a.km - b.km);
  const options = (WASTE[name] || WASTE._).map((o) => {
    const p = o.proc ? procs[0] : null, km = p ? p.km : 10;
    const rec = Math.max(0, Math.round(qty * base * o.rt - transportEst(vs, qty, km) - HANDLING * 0.5 * qty));
    return { code: o.c, label: { en: o.en, hi: o.hi }, recovery_rate_pct: Math.round(o.rt * 100), destination: p ? p.b.business_name : null,
      distance_km: km, est_recovery: rec, est_recovery_per_qtl: Math.round(rec / qty) };
  }).sort((a, b) => b.est_recovery - a.est_recovery);
  res.json({ crop_id: crop.id, crop: crop.crop, quantity_qtl: qty, eligible: why.length > 0, reasons: why, base_price: base, options, sample_data: true, disclaimer: DISC });
}));

/* ---------- Admin (anonymised aggregates only) ---------- */
function agg(D, d) {
  const f = (x) => !d || x.district === d;
  const crops = D.crops.filter(f), buyers = D.buyers.filter(f), st = D.storage.filter(f), vh = D.vehicles.filter(f), tx = D.tx.filter(f);
  const live = crops.filter((c) => LIVE.includes(c.status));
  const surplus = live.reduce((a, c) => a + num(c.quantity_qtl), 0);
  const demand = buyers.reduce((a, b) => a + num(b.required_qtl), 0);
  const sAvail = st.reduce((a, s) => a + num(s.available_qtl), 0);
  const avail = vh.filter((v) => v.availability === 'available').length;
  const caps = vh.map((v) => num(v.capacity_qtl)).filter(Boolean), avgCap = caps.length ? caps.reduce((a, b) => a + b, 0) / caps.length : 20;
  const urgent = live.filter((c) => num(c.urgency_days) <= 5).reduce((a, c) => a + num(c.quantity_qtl), 0);
  const needed = Math.ceil(urgent / avgCap);
  const low = crops.filter((c) => c.status === 'wasted' || (['B', 'C'].includes(c.grade) && LIVE.includes(c.status))).reduce((a, c) => a + num(c.quantity_qtl), 0);
  const pDem = buyers.filter((b) => b.buyer_type === 'processor').reduce((a, b) => a + num(b.required_qtl), 0);
  const sales = tx.filter((t) => SOLD.includes(t.status));
  const pcts = [], inr = []; let diverted = 0;
  for (const t of sales) {
    const base = D.mandiNet[t.crop_id], net = num(t.realised_net) || num(t.est_net);
    if (base > 0 && net > 0) { pcts.push((net - base) / base * 100); inr.push((net - base) / (num(t.quantity_qtl) || 1)); }
    const c = D.cropById[t.crop_id], rt = D.routeById[t.route_id];
    if ((c && c.grade === 'C') || (rt && rt.route_type === 'processor')) diverted += num(t.quantity_qtl);
  }
  const avg = (a) => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length * 10) / 10 : 0;
  return { surplus_qtl: Math.round(surplus), demand_qtl: Math.round(demand), storage_available_qtl: Math.round(sAvail),
    storage_gap_qtl: Math.max(0, Math.round(surplus - sAvail)), vehicles_total: vh.length, vehicles_available: avail, vehicles_needed: needed,
    transport_gap: Math.max(0, needed - avail), lowgrade_qtl: Math.round(low), processor_demand_qtl: Math.round(pDem),
    processing_gap_qtl: Math.max(0, Math.round(low - pDem)), sales_count: sales.length, avg_uplift_pct: avg(pcts), avg_uplift_inr_per_qtl: Math.round(avg(inr)),
    wastage_diverted_qtl: Math.round(diverted), vehicle_utilisation_pct: vh.length ? Math.round(100 * vh.filter((v) => v.availability === 'busy').length / vh.length) : 0,
    verified_buyers: buyers.filter((b) => b.verified).length };
}
async function load() {
  const [crops, buyers, storage, vehicles, tx, routes] = await Promise.all(['crops', 'buyers', 'storage', 'vehicles', 'transactions', 'routes'].map((t) => q(`SELECT * FROM ${t}`)));
  const mandiNet = {}, routeById = {};
  routes.forEach((x) => { routeById[x.id] = x; if (x.route_type === 'mandi' && !(x.crop_id in mandiNet)) mandiNet[x.crop_id] = num(x.net_value); });
  return { crops, buyers, storage, vehicles, tx, routes, mandiNet, routeById, cropById: Object.fromEntries(crops.map((c) => [c.id, c])) };
}
const districtsOf = (D) => [...new Set([...DISTRICTS, ...D.crops.map((c) => c.district), ...D.storage.map((s) => s.district)].filter(Boolean))];

r.get('/admin/summary', auth(['admin', 'fpo']), w(async (req, res) => {
  const D = await load(), d = req.query.district || null;
  const names = {}; const key = (s) => lc(s);
  D.crops.filter((c) => (!d || c.district === d) && LIVE.includes(c.status)).forEach((c) => { const e = names[key(c.crop)] ||= { crop: c.crop, surplus: 0, demand: 0, lowgrade: 0, processor_demand: 0 }; e.surplus += num(c.quantity_qtl); });
  D.crops.filter((c) => (!d || c.district === d) && (c.status === 'wasted' || (['B', 'C'].includes(c.grade) && LIVE.includes(c.status)))).forEach((c) => { const e = names[key(c.crop)] ||= { crop: c.crop, surplus: 0, demand: 0, lowgrade: 0, processor_demand: 0 }; e.lowgrade += num(c.quantity_qtl); });
  D.buyers.filter((b) => !d || b.district === d).forEach((b) => { const cs = cropsOf(b.crops); cs.forEach((cn) => {
    const e = names[cn] ||= { crop: cn[0].toUpperCase() + cn.slice(1), surplus: 0, demand: 0, lowgrade: 0, processor_demand: 0 };
    e.demand += num(b.required_qtl) / cs.length; if (b.buyer_type === 'processor') e.processor_demand += num(b.required_qtl) / cs.length; }); });
  const by_crop = Object.values(names).map((e) => Object.fromEntries(Object.entries(e).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v) : v])));
  res.json({ district: d || 'all', kpis: agg(D, d), districts: districtsOf(D).map((x) => ({ district: x, ...agg(D, x) })), by_crop, anonymised: true, sample_data: true, disclaimer: DISC });
}));

r.get('/admin/gaps', auth(['admin', 'fpo']), w(async (req, res) => {
  const D = await load(), gaps = [], heat = {};
  for (const d of districtsOf(D)) {
    const a = agg(D, d);
    const s = a.surplus_qtl ? a.storage_gap_qtl / a.surplus_qtl : 0, t = a.vehicles_needed ? a.transport_gap / a.vehicles_needed : 0, p = a.lowgrade_qtl ? a.processing_gap_qtl / a.lowgrade_qtl : 0;
    heat[d] = { storage: Math.round(s * 100) / 100, transport: Math.round(t * 100) / 100, processing: Math.round(p * 100) / 100 };
    if (a.storage_gap_qtl > 0) gaps.push({ district: d, type: 'storage', gap: a.storage_gap_qtl, unit: 'qtl', severity_pct: Math.round(s * 100) });
    if (a.transport_gap > 0) gaps.push({ district: d, type: 'transport', gap: a.transport_gap, unit: 'vehicles', severity_pct: Math.round(t * 100) });
    if (a.processing_gap_qtl > 0) gaps.push({ district: d, type: 'processing', gap: a.processing_gap_qtl, unit: 'qtl', severity_pct: Math.round(p * 100) });
  }
  gaps.sort((a, b) => b.severity_pct - a.severity_pct || b.gap - a.gap);
  res.json({ gaps: gaps.map((g, i) => ({ rank: i + 1, ...g })), heat, anonymised: true, sample_data: true, disclaimer: DISC });
}));

export default r;
