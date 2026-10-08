import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../shared/auth';
import { useCollection } from '../../shared/db';
import { estimateTransport } from '../../shared/geo';

export const DISTRICTS = {
  Rohtak: { lat: 28.8955, lng: 76.6066 }, Sonipat: { lat: 28.9931, lng: 77.0151 },
  Karnal: { lat: 29.6857, lng: 76.9905 }, Hisar: { lat: 29.1492, lng: 75.7217 },
  Panipat: { lat: 29.3909, lng: 76.9635 }, Gurugram: { lat: 28.4595, lng: 77.0266 },
  Sirsa: { lat: 29.5349, lng: 75.028 }, Jhajjar: { lat: 28.6055, lng: 76.6565 },
};
export const centerOf = (d) => DISTRICTS[d] || DISTRICTS.Rohtak;
export const TYPES = {
  tractor: { hi: 'ट्रैक्टर', en: 'Tractor' }, pickup: { hi: 'पिकअप', en: 'Pickup' },
  mini_truck: { hi: 'मिनी ट्रक', en: 'Mini truck' }, truck: { hi: 'ट्रक', en: 'Truck' },
};
export const SLOTS = ['slot_today', 'slot_tom_am', 'slot_tom_pm'];
export const now = () => new Date().toISOString();
export const num = (e) => (typeof e === 'number' ? e : e?.cost ?? e?.total ?? e?.est_cost ?? 0);
export const NEXT = { requested: ['accepted', 'rejected'], accepted: ['pickup'], pickup: ['delivered'] };
export const canMove = (from, to) => (NEXT[from] || []).includes(to);

export function tripCost(v, km, qtl) {
  const base = v.rate_per_km ? Math.max(v.min_charge || 0, v.rate_per_km * km) : num(estimateTransport(km, qtl));
  return Math.round(base);
}

export function useCrop() {
  const [sp] = useSearchParams();
  const { user } = useAuth();
  const crops = useCollection('crops');
  const id = sp.get('crop');
  let crop = id ? crops.find((c) => String(c.id) === id) : null;
  if (!crop && user) crop = crops.filter((c) => c.farmer_id === user.id).sort((a, b) => b.id - a.id)[0] || null;
  return crop || null;
}

export function useRouteInfo(crop) {
  const [sp] = useSearchParams();
  const routes = useCollection('routes');
  const markets = useCollection('markets');
  const buyers = useCollection('buyers');
  const storage = useCollection('storage');
  if (!crop) return { route: null, dest: null };
  const mine = routes.filter((r) => r.crop_id === crop.id);
  const rid = sp.get('route');
  const route = (rid && mine.find((r) => String(r.id) === rid)) ||
    [...mine].sort((a, b) => (a.rank_no || 99) - (b.rank_no || 99))[0] || null;
  if (!route) return { route: null, dest: null };
  const src = { mandi: markets, processor: buyers, buyer: buyers, storage_sell_later: storage }[route.route_type] || [];
  const row = src.find((x) => String(x.id) === String(route.destination_ref_id));
  const dest = row && row.lat != null
    ? { name: route.destination_name || row.name || row.business_name, pt: { lat: row.lat, lng: row.lng } } : null;
  return { route, dest };
}
