import { useState } from 'react';
import { Power, Plus } from 'lucide-react';
import { useI18n } from '../../../shared/i18n';
import { useAuth } from '../../../shared/auth';
import { db, useCollection } from '../../../shared/db';
import { Card, Button, Badge, PageHeader, Money } from '../../../shared/ui';
import { canMove, centerOf, now, TYPES } from '../util';
import { Field, inputCls, Empty, Stat2, SampleTag, VehicleIcon, Stars } from '../parts';

const TONE = { requested: 'amber', accepted: 'blue', pickup: 'blue', delivered: 'green', rejected: 'red', cancelled: 'gray' };

export default function Dashboard() {
  const { t, lang } = useI18n();
  const T = (k) => t('transport.' + k);
  const { user } = useAuth();
  const vehicles = useCollection('vehicles');
  const reqs = useCollection('transport_requests');
  const users = useCollection('users');
  const crops = useCollection('crops');
  const mine = vehicles.filter((v) => v.owner_id === user.id);
  const ids = mine.map((v) => v.id);
  const inc = reqs.filter((r) => ids.includes(r.vehicle_id)).sort((a, b) => b.id - a.id);
  const delivered = inc.filter((r) => r.status === 'delivered');
  const earn = delivered.reduce((a, r) => a + (r.est_cost || 0), 0);
  const [show, setShow] = useState(false);
  const [f, setF] = useState({ name: '', type: 'pickup', capacity_qtl: 25, district: 'Rohtak', rate_per_km: 16, min_charge: 400 });

  const move = (r, to) => {
    if (!canMove(r.status, to)) return;
    const ts = now();
    db.update('transport_requests', r.id, { status: to, updated_at: ts, timeline: { ...(r.timeline || { requested: r.created_at }), [to]: ts } });
    const tx = r.crop_id != null ? db.find('transactions', (x) => x.crop_id === r.crop_id && x.vehicle_id === r.vehicle_id)[0] : null;
    if (tx) db.update('transactions', tx.id, to === 'rejected' ? { vehicle_id: null, updated_at: ts } : { status: to, updated_at: ts });
    const v = db.get('vehicles', r.vehicle_id);
    const patch = { availability: to === 'accepted' || to === 'pickup' ? 'busy' : 'available' };
    if (to === 'delivered' && v) patch.trips = (v.trips || 0) + 1;
    db.update('vehicles', r.vehicle_id, patch);
  };
  const addVehicle = () => {
    const c = centerOf(f.district);
    db.insert('vehicles', {
      owner_id: user.id, name: f.name || TYPES[f.type].en, type: f.type, capacity_qtl: Number(f.capacity_qtl), district: f.district,
      lat: c.lat + (Math.random() - 0.5) * 0.05, lng: c.lng + (Math.random() - 0.5) * 0.05, rate_per_km: Number(f.rate_per_km),
      min_charge: Number(f.min_charge), availability: 'available', verified: false, rating: 0, trips: 0,
    });
    setShow(false);
    setF({ ...f, name: '' });
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="space-y-4 p-4">
      <PageHeader title={T('dashboard')} back />
      <div className="grid grid-cols-3 gap-2">
        <Stat2 label={T('earnings')} value={<Money value={earn} />} />
        <Stat2 label={T('trips')} value={mine.reduce((a, v) => a + (v.trips || 0), 0)} />
        <Stat2 label={T('my_vehicles')} value={mine.length} />
      </div>
      <SampleTag text={T('sample')} />

      <h2 className="text-lg font-bold">{T('incoming')}</h2>
      {inc.length === 0 && <Empty text={T('no_requests')} />}
      {inc.map((r) => {
        const farmer = users.find((u) => u.id === r.farmer_id);
        const crop = crops.find((c) => c.id === r.crop_id);
        return (
          <Card key={r.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{farmer ? farmer.name : `${T('farmer')} #${r.farmer_id}`} · {crop ? crop.crop : 'Tomato'} · {r.quantity_qtl} {T('qtl')}</div>
                <div className="text-sm text-stone-600">{r.pickup_text} → {r.destination_text} ({r.distance_km} km)</div>
              </div>
              <div className="text-right"><Badge tone={TONE[r.status]}>{T('st_' + r.status)}</Badge><div className="mt-1 font-bold"><Money value={r.est_cost} /></div></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {canMove(r.status, 'accepted') && <Button onClick={() => move(r, 'accepted')}>{T('accept')}</Button>}
              {canMove(r.status, 'rejected') && <Button variant="secondary" onClick={() => move(r, 'rejected')}>{T('reject')}</Button>}
              {canMove(r.status, 'pickup') && <Button onClick={() => move(r, 'pickup')}>{T('start_pickup')}</Button>}
              {canMove(r.status, 'delivered') && <Button onClick={() => move(r, 'delivered')}>{T('mark_delivered')}</Button>}
            </div>
          </Card>
        );
      })}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{T('my_vehicles')}</h2>
        <Button variant="secondary" onClick={() => setShow(!show)}><Plus size={16} className="mr-1 inline" />{T('add_vehicle')}</Button>
      </div>
      {show && (
        <Card className="space-y-3">
          <Field label={T('vehicle_name')}><input className={inputCls} value={f.name} onChange={set('name')} /></Field>
          <Field label={T('type')}>
            <select className={inputCls} value={f.type} onChange={set('type')}>{Object.entries(TYPES).map(([k, x]) => <option key={k} value={k}>{x[lang] || x.en}</option>)}</select>
          </Field>
          <Field label={T('capacity') + ' (' + T('qtl') + ')'}><input type="number" className={inputCls} value={f.capacity_qtl} onChange={set('capacity_qtl')} /></Field>
          <Field label={T('district')}>
            <select className={inputCls} value={f.district} onChange={set('district')}>{['Rohtak', 'Sonipat', 'Karnal', 'Hisar', 'Panipat', 'Gurugram', 'Sirsa', 'Jhajjar'].map((d) => <option key={d}>{d}</option>)}</select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={T('rate_km')}><input type="number" className={inputCls} value={f.rate_per_km} onChange={set('rate_per_km')} /></Field>
            <Field label={T('min_charge')}><input type="number" className={inputCls} value={f.min_charge} onChange={set('min_charge')} /></Field>
          </div>
          <Button className="w-full" onClick={addVehicle}>{T('save')}</Button>
        </Card>
      )}
      {mine.map((v) => (
        <Card key={v.id}>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-800"><VehicleIcon type={v.type} size={24} /></div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{v.name}</div>
              <div className="text-sm text-stone-600">{(TYPES[v.type] || {})[lang]} · {v.capacity_qtl} {T('qtl')} · {v.district}</div>
              <div className="flex items-center gap-2"><Stars v={v.rating} />{v.verified && <Badge tone="blue">{T('verified')}</Badge>}</div>
            </div>
            <button aria-label={T('toggle_avail')} onClick={() => db.update('vehicles', v.id, { availability: v.availability === 'available' ? 'busy' : 'available' })}
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl px-3 text-sm font-medium ${v.availability === 'available' ? 'bg-green-700 text-white' : 'bg-stone-200 text-stone-700'}`}>
              <Power size={16} className="mr-1" />{T(v.availability)}
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}
