import { Star, Tractor, Truck } from 'lucide-react';

export const inputCls = 'w-full min-h-[44px] rounded-xl border border-stone-300 bg-white px-3 text-base focus:outline-none focus:ring-2 focus:ring-green-600';
export const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

export const Stars = ({ v = 0 }) => (
  <span className="inline-flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} className={i <= Math.round(v) ? 'fill-amber-400 text-amber-400' : 'text-stone-300'} />)}
    <span className="ml-1 text-xs text-stone-600">{v ? Number(v).toFixed(1) : 'New'}</span>
  </span>
);
export const VehicleIcon = ({ type, size = 28 }) => (type === 'tractor' ? <Tractor size={size} /> : <Truck size={size} />);
export const Field = ({ label, children }) => (
  <label className="block"><span className="mb-1 block text-sm font-medium text-stone-700">{label}</span>{children}</label>
);
export const Bar = ({ pct, tone = 'bg-green-600' }) => (
  <div className="h-3 w-full overflow-hidden rounded-full bg-stone-200">
    <div className={`h-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
  </div>
);
export const SampleTag = ({ text }) => <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">{text}</span>;
export const Empty = ({ text }) => <div className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-stone-500">{text}</div>;
export const Stat2 = ({ label, value }) => (
  <div className="rounded-2xl bg-green-50 p-3"><div className="text-xs text-stone-600">{label}</div><div className="text-xl font-bold text-green-800">{value}</div></div>
);
export function Timeline({ steps }) {
  return (
    <ol className="space-y-0">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className={`mt-1 h-4 w-4 rounded-full border-2 ${s.done ? 'border-green-700 bg-green-700' : 'border-stone-300 bg-white'} ${s.current ? 'ring-4 ring-green-200' : ''}`} />
            {i < steps.length - 1 && <span className={`w-0.5 flex-1 ${s.done ? 'bg-green-700' : 'bg-stone-200'}`} style={{ minHeight: 28 }} />}
          </div>
          <div className="pb-4">
            <div className={`font-semibold ${s.done ? 'text-stone-900' : 'text-stone-400'}`}>{s.label}</div>
            {s.at && <div className="text-xs text-stone-500">{fmt(s.at)}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}
