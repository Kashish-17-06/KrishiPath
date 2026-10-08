import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ChevronDown, MapPin } from 'lucide-react';
import { useI18n } from '../../../shared/i18n';
import { useCollection } from '../../../shared/db';
import { distanceKm } from '../../../shared/geo';
import { Card, Button, Badge, PageHeader, Money } from '../../../shared/ui';
import { useCrop, useRouteInfo, tripCost, TYPES } from '../util';
import { Stars, VehicleIcon, SampleTag, Empty, inputCls, Bar } from '../parts';

const W = [['fit', 30, 'w_fit'], ['dist', 25, 'w_dist'], ['cost', 20, 'w_cost'], ['rate', 15, 'w_rate'], ['avail', 10, 'w_avail']];

export default function Find() {
  const { t, lang } = useI18n();
  const T = (k) => t('transport.' + k);
  const nav = useNavigate();
  const crop = useCrop();
  const { route, dest } = useRouteInfo(crop);
  const vehicles = useCollection('vehicles');
  const [type, setType] = useState('all');
  const [vOnly, setVOnly] = useState(false);

  if (!crop) return <div className="space-y-4 p-4"><PageHeader title={T('find_vehicle')} back /><Empty text={T('no_crop')} /></div>;

  const q = crop.quantity_qtl;
  const tripKm = dest ? distanceKm(crop, dest.pt) : 50;
  let rows = vehicles.filter((v) => (type === 'all' || v.type === type) && (!vOnly || v.verified))
    .map((v) => ({ v, d: distanceKm(v, crop), cost: tripCost(v, tripKm, q) }));
  const cs = rows.map((r) => r.cost);
  const mn = Math.min(...cs), mx = Math.max(...cs);
  rows = rows.map((r) => {
    const v = r.v;
    const s = {
      fit: v.capacity_qtl >= q ? 0.5 + 0.5 * (q / v.capacity_qtl) : 0.4 * (v.capacity_qtl / q),
      dist: 1 - Math.min(r.d, 150) / 150,
      cost: mx === mn ? 1 : 1 - (r.cost - mn) / (mx - mn),
      rate: (v.rating || 0) / 5,
      avail: v.availability === 'available' ? 1 : 0,
    };
    return { ...r, s, total: Math.round(W.reduce((a, [k, w]) => a + s[k] * w, 0)) };
  }).sort((a, b) => b.total - a.total);

  const request = (v) => nav(`/transport/book?crop=${crop.id}&vehicle=${v.id}${route ? `&route=${route.id}` : ''}`);

  return (
    <div className="space-y-4 p-4">
      <PageHeader title={T('find_vehicle')} back />
      <Card>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-lg font-bold">{crop.crop} · {q} {T('qtl')} · {T('grade')} {crop.grade}</div>
            <div className="mt-1 flex items-center gap-1 text-sm text-stone-600"><MapPin size={14} />{crop.village}, {crop.district}</div>
            <div className="mt-1 text-sm text-stone-600">{T('trip_to')}: {dest ? dest.name : '~50 km'} ({Math.round(tripKm)} km)</div>
          </div>
          <SampleTag text={T('sample')} />
        </div>
        <div className="mt-1 text-xs text-stone-500">{T('trip_note')}</div>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <select className={inputCls + ' !w-auto flex-1'} value={type} onChange={(e) => setType(e.target.value)} aria-label={T('type')}>
          <option value="all">{T('type')}: {T('all')}</option>
          {Object.entries(TYPES).map(([k, x]) => <option key={k} value={k}>{x[lang] || x.en}</option>)}
        </select>
        <button onClick={() => setVOnly(!vOnly)} className={`min-h-[44px] rounded-xl border px-3 text-sm font-medium ${vOnly ? 'border-green-700 bg-green-700 text-white' : 'border-stone-300 bg-white'}`}>
          <ShieldCheck size={16} className="mr-1 inline" />{T('verified_only')}
        </button>
      </div>

      {rows.length === 0 && <Empty text={T('no_vehicles')} />}
      {rows.map((r, i) => (
        <Card key={r.v.id}>
          <div className="flex gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-green-100 text-green-800"><VehicleIcon type={r.v.type} /></div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1">
                {i < 3 && <Badge tone="green">#{i + 1} {i === 0 ? T('top_pick') : ''}</Badge>}
                {r.v.verified && <Badge tone="blue">{T('verified')}</Badge>}
                <Badge tone={r.v.availability === 'available' ? 'green' : 'amber'}>{T(r.v.availability)}</Badge>
              </div>
              <div className="mt-1 font-semibold">{r.v.name}</div>
              <div className="text-sm text-stone-600">{(TYPES[r.v.type] || {})[lang]} · {T('capacity')} {r.v.capacity_qtl} {T('qtl')} · {Math.round(r.d)} {T('km_away')}</div>
              <Stars v={r.v.rating} />
            </div>
            <div className="text-right">
              <div className="text-xs text-stone-500">{T('est_cost')}</div>
              <div className="text-lg font-bold"><Money value={r.cost} /></div>
              <div className="text-xs text-stone-500">{T('score')} {r.total}/100</div>
            </div>
          </div>
          {i < 3 && (
            <details className="mt-2 rounded-xl bg-stone-50 p-2">
              <summary className="flex min-h-[44px] cursor-pointer items-center justify-between text-sm font-medium"><span>{T('breakdown')}</span><ChevronDown size={16} /></summary>
              <div className="space-y-2 pb-1">
                {W.map(([k, w, lbl]) => (
                  <div key={k}>
                    <div className="flex justify-between text-xs"><span>{T(lbl)} ({w}%)</span><span>{Math.round(r.s[k] * w)}/{w}</span></div>
                    <Bar pct={r.s[k] * 100} />
                  </div>
                ))}
              </div>
            </details>
          )}
          <Button className="mt-3 w-full" onClick={() => request(r.v)}>{T('request')}</Button>
        </Card>
      ))}
    </div>
  );
}
