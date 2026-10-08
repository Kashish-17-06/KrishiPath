import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, PiggyBank } from 'lucide-react';
import { useI18n } from '../../../shared/i18n';
import { useAuth } from '../../../shared/auth';
import { db, useCollection } from '../../../shared/db';
import { distanceKm } from '../../../shared/geo';
import { Card, Button, Badge, PageHeader, Money } from '../../../shared/ui';
import { useCrop, tripCost, centerOf, now, DISTRICTS } from '../util';
import { Field, inputCls, Empty, Bar, SampleTag } from '../parts';

function planFor(lot, mems, vehicles, buyer) {
  const pt = centerOf(lot.district);
  const km = buyer && buyer.lat != null ? distanceKm(pt, buyer) : 40;
  const pick = (q, strict) => {
    let c = vehicles.filter((v) => v.availability === 'available' && v.capacity_qtl >= q);
    if (!c.length && !strict) c = vehicles.filter((v) => v.availability === 'available');
    return c.map((v) => ({ v, c: tripCost(v, km, q) })).sort((a, b) => a.c - b.c)[0] || null;
  };
  const total = mems.reduce((a, m) => a + m.quantity_qtl, 0);
  const shared = pick(total, true);
  const indiv = mems.map((m) => ({ m, c: (pick(m.quantity_qtl, false) || { c: 0 }).c }));
  const sum = indiv.reduce((a, x) => a + x.c, 0);
  return { km, total, shared, indiv, sum, savings: shared ? Math.max(0, sum - shared.c) : 0 };
}

export default function Lots() {
  const { t } = useI18n();
  const T = (k) => t('transport.' + k);
  const nav = useNavigate();
  const { user } = useAuth();
  const crop = useCrop();
  const lots = useCollection('fpo_lots');
  const members = useCollection('fpo_lot_members');
  const buyers = useCollection('buyers');
  const vehicles = useCollection('vehicles');
  const reqs = useCollection('transport_requests');
  const users = useCollection('users');
  const [open, setOpen] = useState(false);
  const [cf, setCf] = useState({ crop: crop ? crop.crop : 'Tomato', grade: crop ? crop.grade : 'A', district: crop ? crop.district : 'Rohtak', buyer: '' });
  const [planLot, setPlanLot] = useState(null);

  const memsOf = (l) => members.filter((m) => m.lot_id === l.id);
  const isMember = (l) => memsOf(l).some((m) => m.farmer_id === user.id);
  const isMine = (l) => l.creator_id === user.id || isMember(l);
  const visible = lots.filter((l) => l.status === 'open' && (isMine(l) || (crop
    ? l.crop.toLowerCase() === crop.crop.toLowerCase() && l.grade === crop.grade && distanceKm(centerOf(l.district), crop) <= 40 : true)));

  const join = (lot) => {
    if (!crop) return;
    db.insert('fpo_lot_members', { lot_id: lot.id, farmer_id: user.id, crop_id: crop.id, quantity_qtl: crop.quantity_qtl });
    const total = db.find('fpo_lot_members', (m) => m.lot_id === lot.id).reduce((a, m) => a + m.quantity_qtl, 0);
    db.update('fpo_lots', lot.id, { total_qtl: total });
  };
  const create = () => {
    const lot = db.insert('fpo_lots', { creator_id: user.id, crop: cf.crop, grade: cf.grade, district: cf.district, total_qtl: 0, target_buyer_id: Number(cf.buyer) || null, status: 'open' });
    if (crop && user.role === 'farmer' && crop.crop === cf.crop && crop.grade === cf.grade) join(lot);
    setOpen(false);
  };
  const requestShared = (lot, p) => {
    const ts = now();
    const buyer = buyers.find((b) => b.id === lot.target_buyer_id);
    const mine = memsOf(lot).find((m) => m.farmer_id === user.id);
    db.insert('transport_requests', {
      farmer_id: user.id, vehicle_id: p.shared.v.id, crop_id: mine ? mine.crop_id : crop ? crop.id : null, lot_id: lot.id,
      pickup_text: `${lot.district} collection point`, destination_text: buyer ? buyer.business_name : 'Buyer', quantity_qtl: p.total,
      distance_km: Math.round(p.km), est_cost: p.shared.c, status: 'requested', updated_at: ts, timeline: { requested: ts },
    });
    nav('/transport/track' + (crop ? `?crop=${crop.id}` : ''));
  };
  const set = (k) => (e) => setCf({ ...cf, [k]: e.target.value });

  return (
    <div className="space-y-4 p-4">
      <PageHeader title={T('lots')} back />
      <div className="flex items-center justify-between"><h2 className="text-lg font-bold">{T('nearby_lots')}</h2><SampleTag text={T('sample')} /></div>
      <Button variant="secondary" className="w-full" onClick={() => setOpen(!open)}>{T('create_lot')}</Button>
      {open && (
        <Card className="space-y-3">
          <Field label={T('crop')}><input className={inputCls} value={cf.crop} onChange={set('crop')} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={T('grade')}><select className={inputCls} value={cf.grade} onChange={set('grade')}>{['A', 'B', 'C'].map((g) => <option key={g}>{g}</option>)}</select></Field>
            <Field label={T('district')}><select className={inputCls} value={cf.district} onChange={set('district')}>{Object.keys(DISTRICTS).map((d) => <option key={d}>{d}</option>)}</select></Field>
          </div>
          <Field label={T('target_buyer')}>
            <select className={inputCls} value={cf.buyer} onChange={set('buyer')}><option value="">—</option>{buyers.map((b) => <option key={b.id} value={b.id}>{b.business_name}</option>)}</select>
          </Field>
          <Button className="w-full" onClick={create}>{T('create_lot')}</Button>
        </Card>
      )}
      {visible.length === 0 && <Empty text={T('no_requests')} />}
      {visible.map((lot) => {
        const mems = memsOf(lot);
        const buyer = buyers.find((b) => b.id === lot.target_buyer_id);
        const total = mems.reduce((a, m) => a + m.quantity_qtl, 0);
        const need = (buyer && buyer.required_qtl) || 200;
        const member = isMember(lot);
        const requested = reqs.some((r) => r.lot_id === lot.id && !['rejected', 'cancelled'].includes(r.status));
        const p = planLot === lot.id ? planFor(lot, mems, vehicles, buyer) : null;
        return (
          <Card key={lot.id} className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-bold">{lot.crop} · {T('grade')} {lot.grade}</div>
                <div className="text-sm text-stone-600">{lot.district} · {T('target_buyer')}: {buyer ? buyer.business_name : '—'}</div>
              </div>
              <Badge tone="green"><Users size={12} className="mr-1 inline" />{mems.length}</Badge>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm"><span>{T('combined')}: {total} {T('qtl')}</span><span>{T('target')}: {need} {T('qtl')}</span></div>
              <Bar pct={(total / need) * 100} />
            </div>
            <div className="text-xs text-stone-600">{T('members')}: {mems.map((m) => { const u = users.find((x) => x.id === m.farmer_id); return `${u ? u.name : T('farmer') + ' #' + m.farmer_id} (${m.quantity_qtl})`; }).join(', ')}</div>
            {!member && user.role === 'farmer' && <Button className="w-full" disabled={!crop} onClick={() => join(lot)}>{T('join')}{crop ? ` (+${crop.quantity_qtl} ${T('qtl')})` : ''}</Button>}
            {member && <Badge tone="blue">{T('joined')}</Badge>}
            {isMine(lot) && total > 0 && (requested ? <Badge tone="amber">{T('lot_requested')}</Badge>
              : <Button variant="secondary" className="w-full" onClick={() => setPlanLot(p ? null : lot.id)}>{T('shared_vehicle')}</Button>)}
            {p && !requested && (p.shared ? (
              <div className="space-y-2 rounded-xl bg-stone-50 p-3 text-sm">
                <div className="font-medium">{p.shared.v.name} · {p.shared.v.capacity_qtl} {T('qtl')} · {Math.round(p.km)} km</div>
                <div className="flex justify-between"><span>{T('individual_total')}</span><span><Money value={p.sum} /></span></div>
                <div className="flex justify-between"><span>{T('shared_cost')}</span><span className="font-bold"><Money value={p.shared.c} /></span></div>
                <div className="rounded-xl bg-green-100 p-2 text-center font-bold text-green-800"><PiggyBank size={16} className="mr-1 inline" />{T('savings')}: <Money value={p.savings} /></div>
                <div className="font-medium">{T('split')}</div>
                {mems.map((m) => { const u = users.find((x) => x.id === m.farmer_id); return (
                  <div key={m.id} className="flex justify-between"><span>{u ? u.name : T('farmer') + ' #' + m.farmer_id} ({m.quantity_qtl} {T('qtl')})</span><span><Money value={Math.round((p.shared.c * m.quantity_qtl) / p.total)} /></span></div>
                ); })}
                <Button className="w-full" onClick={() => requestShared(lot, p)}>{T('confirm')}</Button>
              </div>
            ) : <div className="rounded-xl bg-red-50 p-2 text-sm text-red-700">{T('no_fit')} ({p.total} {T('qtl')})</div>)}
          </Card>
        );
      })}
    </div>
  );
}
