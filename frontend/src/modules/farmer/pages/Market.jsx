import {LineChart,Line,ResponsiveContainer,YAxis} from 'recharts'
import {useCollection} from '../../../shared/db'
import {distanceKm} from '../../../shared/geo'
import {PageHeader,Card,Badge,Money,EmptyState} from '../../../shared/ui'
import {useCrop,useRT,tone} from './util'
export default function Market(){const crop=useCrop();const {t}=useRT();const ms=useCollection('markets').filter(m=>!crop||m.crop===crop.crop)
return <div><PageHeader title={t('farmer.market')+(crop?' · '+crop.crop:'')} back/><p className="text-xs text-stone-500 mb-2">{t('sample')}</p>
{!ms.length&&<EmptyState text={t('empty')}/>}
{ms.map(m=>{const h=m.price_history,lo=Math.min(...h),hi=Math.max(...h);return <Card key={m.id} className="mb-3">
<div className="flex justify-between"><div><b>{m.name}</b><div className="text-xs text-stone-500">{m.district}{crop&&` · ~${distanceKm(crop,m)} km`}</div></div><div className="text-right font-bold"><Money value={m.price_per_qtl}/><div><Badge tone={tone[m.demand_signal]}>{t('farmer.demand')}: {t(m.demand_signal)}</Badge></div></div></div>
<div className="h-16 my-2"><ResponsiveContainer><LineChart data={h.map((v,i)=>({i,v}))}><YAxis hide domain={['dataMin','dataMax']}/><Line dataKey="v" stroke="#2f6b3a" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></div>
<div className="text-xs text-stone-600">{t('farmer.range')} (12m): <Money value={lo}/> – <Money value={hi}/> · {t('farmer.conf')}: {t('medium')}</div></Card>})}</div>}
