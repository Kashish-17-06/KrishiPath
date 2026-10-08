import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../../shared/i18n';
import { useAuth } from '../../../shared/auth';
import { db, useCollection } from '../../../shared/db';
import { distanceKm } from '../../../shared/geo';
import { Card, Button, PageHeader, Money } from '../../../shared/ui';
import { useCrop, useRouteInfo, tripCost, SLOTS, now } from '../util';
import { Field, inputCls, Empty, SampleTag } from '../parts';

export default function Book() {
  const { t } = useI18n();
  const T = (k) => t('transport.' + k);
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const { user } = useAuth();
  const crop = useCrop();
  const { route, dest } = useRouteInfo(crop);
  const vehicles = useCollection('vehicles');
  const markets = useCollection('markets');
  const buyers = useCollection('buyers');
  const [pickup, setPickup] = useState(null);
  const [destKey, setDestKey] = useState(null);
  const [slot, setSlot] = useState(SLOTS[0]);
  const [qty, setQty] = useState(null);
  const [vid, setVid] = useState(sp.get('vehicle') || '');

  if (!crop) return <div className="space-y-4 p-4"><PageHeader title={T('book_title')} back /><Empty text={T('no_crop')} /></div>;

  const opts = [];
  if (dest) opts.push({ k: 'route', label: dest.name + ' ★', name: dest.name, pt: dest.pt });
  markets.forEach((m) => opts.push({ k: 'm' + m.id, label: `${m.name} (${m.crop})`, name: m.name, pt: m }));
  buyers.forEach((b) => opts.push({ k: 'b' + b.id, label: b.business_name, name: b.business_name, pt: b }));
  const cur = opts.find((o) => o.k === destKey) || opts[0];
  const pk = pickup ?? `${crop.village}, ${crop.district}`;
  const q = Number(qty ?? crop.quantity_qtl);
  const veh = vehicles.find((v) => String(v.id) === String(vid));
  const km = cur ? distanceKm(crop, cur.pt) : 50;
  const cost = veh ? tripCost(veh, km, q) : 0;
  const over = veh && q > veh.capacity_qtl;

  const submit = () => {
    const ts = now();
    db.insert('transport_requests', {
      farmer_id: user.id, vehicle_id: veh.id, crop_id: crop.id, lot_id: sp.get('lot') ? Number(sp.get('lot')) : null,
      pickup_text: `${pk} · ${T(slot)}`, destination_text: cur ? cur.name : '', quantity_qtl: q, distance_km: Math.round(km),
      est_cost: cost, status: 'requested', updated_at: ts, timeline: { requested: ts },
    });
    const tx = db.find('transactions', (x) => x.crop_id === crop.id && x.farmer_id === user.id)[0];
    if (tx) db.update('transactions', tx.id, { vehicle_id: veh.id, status: 'requested', updated_at: ts });
    else {
      const isBuyer = route && ['processor', 'buyer'].includes(route.route_type);
      db.insert('transactions', {
        farmer_id: user.id, buyer_id: isBuyer ? route.destination_ref_id : null, vehicle_id: veh.id, crop_id: crop.id,
        route_id: route ? route.id : null, quantity_qtl: q, final_price_per_qtl: null, status: 'requested',
        est_net: route ? route.net_value || 0 : 0, realised_net: null, district: crop.district, updated_at: ts,
      });
    }
    nav(`/transport/track?crop=${crop.id}`);
  };

  return (
    <div className="space-y-4 p-4">
      <PageHeader title={T('book_title')} back />
      <Card className="space-y-3">
        <div className="flex justify-between"><div className="font-bold">{crop.crop} · {crop.quantity_qtl} {T('qtl')}</div><SampleTag text={T('sample')} /></div>
        <Field label={T('vehicle')}>
          <select className={inputCls} value={vid} onChange={(e) => setVid(e.target.value)}>
            <option value="">{T('select_vehicle')}</option>
            {vehicles.filter((v) => v.availability === 'available' || String(v.id) === String(vid)).map((v) => <option key={v.id} value={v.id}>{v.name} · {v.capacity_qtl} {T('qtl')}</option>)}
          </select>
        </Field>
        <Field label={T('pickup')}><input className={inputCls} value={pk} onChange={(e) => setPickup(e.target.value)} /></Field>
        <Field label={T('destination')}>
          <select className={inputCls} value={cur ? cur.k : ''} onChange={(e) => setDestKey(e.target.value)}>
            {opts.map((o) => <option key={o.k} value={o.k}>{o.label}</option>)}
          </select>
        </Field>
        <Field label={T('time_slot')}>
          <select className={inputCls} value={slot} onChange={(e) => setSlot(e.target.value)}>{SLOTS.map((s) => <option key={s} value={s}>{T(s)}</option>)}</select>
        </Field>
        <Field label={T('quantity')}><input type="number" min="1" className={inputCls} value={qty ?? crop.quantity_qtl} onChange={(e) => setQty(e.target.value)} /></Field>
        {over && <div className="rounded-xl bg-red-50 p-2 text-sm text-red-700">{T('cap_exceeded')} ({veh.capacity_qtl} {T('qtl')})</div>}
        <div className="flex items-center justify-between rounded-xl bg-green-50 p-3">
          <span className="text-sm">{T('est_cost')} · {Math.round(km)} km</span>
          <span className="text-xl font-bold"><Money value={cost} /></span>
        </div>
        <div className="text-xs text-stone-500">{T('trip_note')}</div>
        <Button className="w-full" disabled={!veh || !cur || over || !(q > 0)} onClick={submit}>{T('confirm')}</Button>
      </Card>
    </div>
  );
}
