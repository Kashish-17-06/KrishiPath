import {useState} from 'react'
import {Link} from 'react-router-dom'
import {BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer} from 'recharts'
import {useAuth} from '../../../shared/auth'
import {db,useCollection} from '../../../shared/db'
import {PageHeader,Card,Badge,Button,Money,EmptyState} from '../../../shared/ui'
import {useCrop,useRT,tone} from './util'
function RC({r,top,onSel,done,lang,t,rt,crop}){return <Card className={top?'border-2 border-leaf':'mb-2'}>
<div className="flex justify-between items-start"><div><Badge tone="blue">{rt(r.route_type)}</Badge><div className="font-bold mt-1">{r.destination_name}</div><div className="text-xs text-stone-500">~{r.distance_km} km</div></div><div className="text-right"><div className="text-xs">{t('farmer.net')}</div><div className="text-xl font-bold text-leaf"><Money value={r.net_value}/></div></div></div>
<div className="flex flex-wrap gap-1 my-2">{r.reasons[lang].map(x=><Badge key={x} tone="green">{x}</Badge>)}<Badge tone={tone[r.confidence]}>{t('farmer.conf')}: {t(r.confidence)}</Badge></div>
{r.band&&<div className="text-xs text-stone-600">Low/Mid/High: <Money value={r.band[0]}/> / <Money value={r.band[1]}/> / <Money value={r.band[2]}/></div>}
<div className="flex gap-2 mt-2"><Link to={`/farmer/route/${r.id}?crop=${crop.id}`} className="flex-1"><Button variant="secondary" className="w-full">{t('farmer.why')}</Button></Link>{!done&&<Button className="flex-1" onClick={()=>onSel(r)}>{t('farmer.select')}</Button>}</div></Card>}
export default function Routes(){const crop=useCrop();const {t,lang,rt}=useRT();const {user}=useAuth();const [sel,setSel]=useState(null)
const rs=useCollection('routes').filter(r=>r.crop_id===crop?.id).sort((a,b)=>a.rank_no-b.rank_no)
if(!crop)return <EmptyState text={t('farmer.nocrop')}><div className="mt-3"><Link to="/farmer/add-crop"><Button>{t('farmer.sell')}</Button></Link></div></EmptyState>
const pick=r=>{db.insert('transactions',{farmer_id:user.id,buyer_id:r.route_type==='processor'||r.route_type==='buyer'?r.destination_ref_id:null,vehicle_id:null,crop_id:crop.id,route_id:r.id,quantity_qtl:crop.quantity_qtl,final_price_per_qtl:Math.round(r.gross_value/crop.quantity_qtl),status:'requested',est_net:r.net_value,realised_net:null,district:crop.district});db.update('crops',crop.id,{status:'selling'});setSel(r.id)}
const q='?crop='+crop.id,P={t,lang,rt,crop,done:!!sel,onSel:pick}
return <div><PageHeader title={`${crop.crop} · ${crop.quantity_qtl} qtl`} back/><p className="text-xs text-stone-500 mb-2">{t('sample')} · {t('farmer.risk')}</p>
{!rs.length&&<EmptyState text={t('empty')}/>}
{rs[0]&&<><h3 className="font-bold mb-1">{t('farmer.top')}</h3><RC r={rs[0]} top {...P}/></>}
{rs.length>0&&<Card className="my-3"><div className="text-sm font-semibold mb-1">{t('farmer.net')}</div><div className="h-48"><ResponsiveContainer><BarChart data={rs.slice(0,4).map(r=>({n:r.destination_name.slice(0,10),net:r.net_value}))}><XAxis dataKey="n" tick={{fontSize:10}}/><YAxis hide/><Tooltip/><Bar dataKey="net" fill="#2f6b3a" radius={6}/></BarChart></ResponsiveContainer></div></Card>}
{rs.length>1&&<h3 className="font-bold mb-1">{t('farmer.alt')}</h3>}{rs.slice(1,4).map(r=><RC key={r.id} r={r} {...P}/>)}
{sel&&<Card className="mt-3 space-y-2"><b>{t('farmer.next')}</b><Link className="block" to={'/transport/find'+q}><Button className="w-full">{t('farmer.vehicle')}</Button></Link><Link className="block" to={'/market/buyers'+q}><Button variant="secondary" className="w-full">{t('farmer.buyers')}</Button></Link><Link className="block" to={'/market/storage'+q}><Button variant="secondary" className="w-full">{t('farmer.storage')}</Button></Link></Card>}</div>}
