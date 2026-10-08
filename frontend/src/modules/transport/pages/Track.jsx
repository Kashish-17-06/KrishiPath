import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../../../shared/i18n';
import { useAuth } from '../../../shared/auth';
import { db, useCollection } from '../../../shared/db';
import { Card, Button, Badge, PageHeader, Money } from '../../../shared/ui';
import { Timeline, Empty, SampleTag } from '../parts';
import { TYPES, now } from '../util';

const STEPS = ['requested', 'accepted', 'pickup', 'delivered', 'sold'];

export default function Track() {
  const { t, lang } = useI18n();
  const T = (k) => t('transport.' + k);
  const { user } = useAuth();
  const [sp] = useSearchParams();
  const txs = useCollection('transactions');
  const reqs = useCollection('transport_requests');
  const vehicles = useCollection('vehicles');
  const buyers = useCollection('buyers');
  const users = useCollection('users');
  const crops = useCollection('crops');
  const [sel, setSel] = useState(null);

  const myVeh = vehicles.filter((v) => v.owner_id === user.id).map((v) => v.id);
  const myBuyer = buyers.find((b) => b.user_id === user.id);
  const list = txs.filter((x) => user.role === 'farmer' ? x.farmer_id === user.id
    : user.role === 'transporter' ? myVeh.includes(x.vehicle_id)
    : user.role === 'buyer' ? myBuyer && x.buyer_id === myBuyer.id : true).sort((a, b) => b.id - a.id);
  const tx = list.find((x) => String(x.id) === String(sel)) || list.find((x) => String(x.crop_id) === sp.get('crop')) || list[0];

  if (!tx) return <div className="space-y-4 p-4"><PageHeader title={T('track')} back /><Empty text={T('no_trips')} /></div>;

  const r = reqs.filter((x) => x.crop_id === tx.crop_id && (!tx.vehicle_id || x.vehicle_id === tx.vehicle_id)).sort((a, b) => b.id - a.id)[0];
  const veh = vehicles.find((v) => v.id === (r ? r.vehicle_id : tx.vehicle_id));
  const buyer = buyers.find((b) => b.id === tx.buyer_id);
  const owner = veh && users.find((u) => u.id === veh.owner_id);
  const status = tx.status === 'sold' ? 'sold' : r ? r.status : tx.status;
  const idx = STEPS.indexOf(status);
  const tl = (r && r.timeline) || {};
  const at = { requested: tl.requested || (r && r.created_at) || tx.created_at, accepted: tl.accepted, pickup: tl.pickup, delivered: tl.delivered, sold: tx.status === 'sold' ? tx.updated_at : null };
  const steps = STEPS.map((k, i) => ({ label: T('st_' + k), at: at[k], done: i <= idx, current: i === idx }));
  const rejected = status === 'rejected';

  const sell = () => {
    const realised = Math.round((tx.est_net || 0) * (1 + (Math.random() * 0.06 - 0.03)));
    db.update('transactions', tx.id, { status: 'sold', realised_net: realised, updated_at: now() });
    if (tx.crop_id != null) db.update('crops', tx.crop_id, { status: 'sold' });
  };

  return (
    <div className="space-y-4 p-4">
      <PageHeader title={T('track')} back />
      <div className="flex items-center justify-between"><h2 className="text-lg font-bold">{T('my_trips')}</h2><SampleTag text={T('sample')} /></div>
      {list.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {list.map((x) => {
            const c = crops.find((k) => k.id === x.crop_id);
            return <button key={x.id} onClick={() => setSel(x.id)} className={`min-h-[44px] shrink-0 rounded-xl border px-3 text-sm ${x.id === tx.id ? 'border-green-700 bg-green-700 text-white' : 'border-stone-300 bg-white'}`}>#{x.id} {c ? c.crop : ''} · {x.quantity_qtl} {T('qtl')}</button>;
          })}
        </div>
      )}
      <Card>
        {rejected && <Badge tone="red">{T('st_rejected')}</Badge>}
        <Timeline steps={steps} />
      </Card>
      <Card className="space-y-2 text-sm">
        <div className="font-bold">{T('summary')}</div>
        <div><span className="text-stone-500">{T('buyer')}:</span> {buyer ? buyer.business_name : '—'}</div>
        <div><span className="text-stone-500">{T('pickup')}:</span> {r ? r.pickup_text : '—'}</div>
        <div><span className="text-stone-500">{T('destination')}:</span> {r ? r.destination_text : '—'}</div>
        <div><span className="text-stone-500">{T('vehicle')}:</span> {veh ? `${veh.name} (${(TYPES[veh.type] || {})[lang] || ''})` : '—'}{owner ? ` · ${T('owner')}: ${owner.name}` : ''}</div>
        <div><span className="text-stone-500">{T('qty')}:</span> {tx.quantity_qtl} {T('qtl')}{r ? <> · {T('est_cost')}: <Money value={r.est_cost} /></> : null}</div>
        <div><span className="text-stone-500">{T('estimated')}:</span> <Money value={tx.est_net || 0} />
          {tx.status === 'sold' && <> · <span className="text-stone-500">{T('realised')}:</span> <b><Money value={tx.realised_net || 0} /></b></>}</div>
        {user.role === 'farmer' && tx.farmer_id === user.id && tx.status === 'delivered' && <Button className="w-full" onClick={sell}>{T('mark_sold')}</Button>}
      </Card>
    </div>
  );
}
