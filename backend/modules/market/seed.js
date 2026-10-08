// Module 3 seed: buyers, storage, and demo crops/routes/transactions (anonymised demo farmers). Idempotent.
import * as dbm from '../../shared/db.js';
const defPool = dbm.default?.query ? dbm.default : (dbm.pool || dbm.db);

const C = { Rohtak: [28.8955, 76.6066], Sonipat: [28.9931, 77.0151], Karnal: [29.6857, 76.9905], Hisar: [29.1492, 75.7217], Panipat: [29.3909, 76.9635], Gurugram: [28.4595, 77.0266], Sirsa: [29.5349, 75.0288], Jhajjar: [28.6055, 76.6565] };
const PRICE = { Tomato: 2550, Onion: 1800, Potato: 1500, Wheat: 2275, Mustard: 5450 };

export default async function seed(poolArg) {
  const pool = poolArg || defPool;
  const one = async (sql, p) => (await pool.query(sql, p))[0];
  const user = async (role, name, phone, village, district) => {
    await one("INSERT IGNORE INTO users (role,name,phone,village,district,verification_status) VALUES (?,?,?,?,?,'verified')", [role, name, phone, village, district]);
    return (await one('SELECT id FROM users WHERE phone=?', [phone]))[0].id;
  };

  // ---- buyers / processors (6) ----
  const B = [
    ['Sonipat Fresh Foods Processing', 'processor', 'tomato,onion', 300, 'B', 2900, 'Sonipat', '9000000003'],
    ['Karnal Agro Pulp Industries', 'processor', 'tomato,potato', 200, 'C', 2400, 'Karnal', '9100000002'],
    ['Panipat Mandi Traders', 'trader', 'tomato,onion,potato', 150, 'B', 2650, 'Panipat', '9100000003'],
    ['Hisar Grain Traders', 'trader', 'wheat,mustard', 500, 'B', 2350, 'Hisar', '9100000004'],
    ['Gurugram Fresh Retail Co', 'retailer', 'tomato,onion', 80, 'A', 2800, 'Gurugram', '9100000005'],
    ['Sirsa Oil Mills', 'processor', 'mustard', 300, 'B', 5500, 'Sirsa', '9100000006'],
  ];
  for (const [name, type, crops, req, mg, price, dist, phone] of B) {
    if ((await one('SELECT id FROM buyers WHERE business_name=?', [name])).length) continue;
    const uid = await user('buyer', phone === '9000000003' ? 'Demo Buyer' : name, phone, dist, dist);
    await one('INSERT INTO buyers (user_id,business_name,buyer_type,crops,required_qtl,min_grade,offer_price_per_qtl,district,lat,lng,verified) VALUES (?,?,?,?,?,?,?,?,?,?,1)',
      [uid, name, type, crops, req, mg, price, dist, C[dist][0], C[dist][1]]);
  }

  // ---- storage (5) ----
  const S = [
    ['Rohtak Cold Chain Hub', 'cold', 'Rohtak', 28.9, 76.62, 2000, 800, 3.5, 'tomato,potato,onion'],
    ['Sonipat Central Warehouse', 'warehouse', 'Sonipat', 28.98, 77.03, 5000, 1800, 1.2, 'wheat,mustard,onion,potato'],
    ['Karnal Kisan Godown', 'godown', 'Karnal', 29.69, 76.98, 3000, 1200, 0.8, 'wheat,mustard,potato'],
    ['Hisar Cold Storage', 'cold', 'Hisar', 29.16, 75.73, 1500, 400, 3.0, 'potato,tomato,onion'],
    ['Sirsa Agri Warehouse', 'warehouse', 'Sirsa', 29.54, 75.03, 4000, 1500, 1.0, 'wheat,mustard'],
  ];
  for (const s of S) {
    if ((await one('SELECT id FROM storage WHERE name=?', [s[0]])).length) continue;
    await one('INSERT INTO storage (name,type,district,lat,lng,capacity_qtl,available_qtl,rate_per_qtl_per_day,crops_supported) VALUES (?,?,?,?,?,?,?,?,?)', s);
  }

  // ---- demo crops + routes + transactions (anonymised demo farmers) ----
  if ((await one("SELECT id FROM users WHERE phone='9200000001'")).length) return;
  const farmers = {}; let i = 0;
  for (const d of Object.keys(C)) farmers[d] = await user('farmer', 'Demo Farmer ' + d, '92000000' + String(++i).padStart(2, '0'), d + ' village', d);
  // [district, crop, qty, grade, status, urgency, moisture, route chosen, tx status]
  const L = [
    ['Rohtak', 'Tomato', 180, 'A', 'listed', 3, 8], ['Rohtak', 'Tomato', 60, 'C', 'wasted', 0, 9], ['Rohtak', 'Wheat', 300, 'B', 'routed', 10, 12, 'buyer', 'accepted'],
    ['Sonipat', 'Tomato', 140, 'B', 'listed', 4, 8], ['Sonipat', 'Onion', 220, 'A', 'selling', 6, 10, 'processor', 'accepted'], ['Sonipat', 'Potato', 120, 'C', 'wasted', 0, 12],
    ['Karnal', 'Potato', 260, 'B', 'listed', 8, 14], ['Karnal', 'Wheat', 400, 'A', 'sold', 0, 12, 'buyer', 'sold'],
    ['Hisar', 'Wheat', 500, 'A', 'listed', 12, 12], ['Hisar', 'Mustard', 150, 'B', 'routed', 9, 7, 'processor', 'delivered'],
    ['Panipat', 'Onion', 200, 'B', 'listed', 5, 10], ['Panipat', 'Tomato', 90, 'C', 'routed', 2, 9, 'processor', 'pickup'],
    ['Gurugram', 'Tomato', 70, 'A', 'selling', 2, 8, 'buyer', 'delivered'], ['Sirsa', 'Mustard', 240, 'A', 'listed', 10, 7],
    ['Sirsa', 'Wheat', 350, 'B', 'listed', 14, 12], ['Jhajjar', 'Potato', 170, 'B', 'listed', 6, 14],
    ['Jhajjar', 'Tomato', 110, 'C', 'listed', 1, 9], ['Jhajjar', 'Wheat', 280, 'A', 'sold', 0, 12, 'buyer', 'sold'],
  ];
  let k = 0;
  for (const [d, crop, qty, grade, status, urg, moist, choice, txs] of L) {
    k++; const lat = C[d][0] + (k % 5) * 0.01, lng = C[d][1] + (k % 4) * 0.01, fid = farmers[d];
    const ins = await pool.query('INSERT INTO crops (farmer_id,crop,quantity_qtl,grade,moisture_pct,harvest_date,urgency_days,village,district,lat,lng,status) VALUES (?,?,?,?,?,DATE_SUB(CURDATE(), INTERVAL ? DAY),?,?,?,?,?,?)',
      [fid, crop, qty, grade, moist, k % 4, urg, d + ' village', d, lat, lng, status]);
    const cid = ins[0].insertId, p = PRICE[crop];
    const R = [['mandi', d + ' Mandi', 20, p], ['processor', 'Processor (sample)', 60, Math.round(p * 1.12)], ['buyer', 'Trader (sample)', 80, Math.round(p * 1.07)]].map(([t, n, km, pr]) => {
      const gross = pr * qty, tr = Math.round(km * 18 * qty / 20), h = 20 * qty; return { t, n, km, gross, tr, h, net: gross - tr - h };
    }).sort((a, b) => b.net - a.net);
    const ids = {};
    for (let j = 0; j < R.length; j++) {
      const x = R[j];
      const o = await pool.query('INSERT INTO routes (crop_id,route_type,destination_name,destination_ref_id,distance_km,gross_value,transport_cost,storage_cost,handling_cost,net_value,score,confidence,reasons_json,rank_no) VALUES (?,?,?,NULL,?,?,?,0,?,?,?,?,?,?)',
        [cid, x.t, x.n, x.km, x.gross, x.tr, x.h, x.net, Math.round(x.net / qty), 'medium', JSON.stringify(['sample data']), j + 1]);
      ids[x.t] = { id: o[0].insertId, net: x.net };
    }
    if (txs) {
      const rt = ids[choice], est = rt.net, real = ['delivered', 'sold'].includes(txs) ? Math.round(est * (0.97 + (k % 4) * 0.01)) : null;
      await pool.query('INSERT INTO transactions (farmer_id,buyer_id,vehicle_id,crop_id,route_id,quantity_qtl,final_price_per_qtl,status,est_net,realised_net,district) VALUES (?,NULL,NULL,?,?,?,?,?,?,?,?)',
        [fid, cid, rt.id, qty, Math.round((est + 20 * qty) / qty), txs, est, real, d]);
    }
  }
}
