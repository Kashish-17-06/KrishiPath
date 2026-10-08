import {useAuth} from '../../../shared/auth'
import {db,useCollection} from '../../../shared/db'
import {PageHeader,Card,Stat,Money,Badge,EmptyState} from '../../../shared/ui'
import {useRT} from './util'
export default function History(){const {user}=useAuth();const {t,rt}=useRT();useCollection('routes')
const tx=useCollection('transactions').filter(x=>x.farmer_id===user.id),done=tx.filter(x=>x.realised_net!=null)
return <div><PageHeader title={t('farmer.history')} back/><p className="text-xs text-stone-500 mb-2">{t('sample')}</p>
<Card className="grid grid-cols-3 mb-3"><Stat label="#" value={tx.length}/><Stat label={t('farmer.est')} value={<Money value={tx.reduce((s,x)=>s+(x.est_net||0),0)}/>}/><Stat label={t('farmer.real')} value={<Money value={done.reduce((s,x)=>s+x.realised_net,0)}/>}/></Card>
{!tx.length&&<EmptyState text={t('empty')}/>}
{[...tx].reverse().map(x=>{const c=db.get('crops',x.crop_id),r=db.get('routes',x.route_id);return <Card key={x.id} className="mb-2"><div className="flex justify-between"><b>{c?.crop} · {x.quantity_qtl} qtl</b><Badge tone={x.status==='sold'?'green':'amber'}>{x.status}</Badge></div>
<div className="text-sm text-stone-600">{r?rt(r.route_type)+' · '+r.destination_name:x.route_label||'—'}</div><div className="text-sm">{t('farmer.est')}: <Money value={x.est_net}/> · {t('farmer.real')}: {x.realised_net!=null?<Money value={x.realised_net}/>:'—'}</div></Card>})}</div>}
