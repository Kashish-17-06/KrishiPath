import {useParams} from 'react-router-dom'
import {db} from '../../../shared/db'
import {PageHeader,Card,Money,Badge,EmptyState} from '../../../shared/ui'
import {useRT,tone} from './util'
export default function RouteDetail(){const {routeId}=useParams();const {t,lang,rt}=useRT();const r=db.get('routes',routeId)
if(!r)return <EmptyState text={t('empty')}/>
const rows=[['farmer.gross',r.gross_value,'bg-leaf'],['farmer.transport',-r.transport_cost,'bg-red-400'],['farmer.store',-r.storage_cost,'bg-red-300'],['farmer.handling',-r.handling_cost,'bg-red-200'],['farmer.net',r.net_value,'bg-soil']]
return <div><PageHeader title={r.destination_name} back/><Badge tone="blue">{rt(r.route_type)}</Badge>
<Card className="my-3 space-y-2">{rows.map(([k,v,c])=><div key={k}><div className="flex justify-between text-sm"><span>{t(k)}</span><b><Money value={v}/></b></div><div className="h-3 bg-stone-100 rounded"><div className={`h-3 rounded ${c}`} style={{width:Math.min(100,Math.abs(v)/r.gross_value*100)+'%'}}/></div></div>)}</Card>
<Card><b>{t('farmer.why')}</b><ul className="list-disc pl-5 my-2">{r.reasons[lang].map(x=><li key={x}>{x}</li>)}</ul><Badge tone={tone[r.confidence]}>{t('farmer.conf')}: {t(r.confidence)}</Badge><p className="text-xs text-stone-600 mt-2">{t('farmer.risk')} · {t('sample')}</p></Card></div>}
