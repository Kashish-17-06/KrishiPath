import {useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {useAuth} from '../../../shared/auth'
import {db} from '../../../shared/db'
import {useI18n} from '../../../shared/i18n'
import {DISTRICTS} from '../../../shared/geo'
import {PageHeader,Button,Card} from '../../../shared/ui'
import {generateRoutes} from '../routeEngine'
const CROPS=['Tomato','Potato','Onion','Wheat'],inp='w-full min-h-[48px] rounded-xl border border-stone-300 px-3 bg-white'
export default function AddCrop(){const {user}=useAuth();const {t}=useI18n();const n=useNavigate()
const [f,set]=useState({crop:'Tomato',quantity_qtl:100,grade:'A',moisture_pct:12,harvest_date:new Date().toISOString().slice(0,10),urgency_days:3,village:user.village||'',district:user.district||'Rohtak'})
const u=k=>e=>set({...f,[k]:e.target.value})
const L=({k,children})=><label className="block"><span className="text-sm font-semibold">{t('farmer.'+k)}</span>{children}</label>
const save=()=>{const c=db.insert('crops',{...f,farmer_id:user.id,quantity_qtl:+f.quantity_qtl||1,moisture_pct:+f.moisture_pct,urgency_days:+f.urgency_days||3,...DISTRICTS[f.district],status:'listed'});generateRoutes(c);db.update('crops',c.id,{status:'routed'});n('/farmer/routes?crop='+c.id)}
return <div><PageHeader title={t('farmer.sell')} back/><Card className="space-y-3">
<L k="crop"><select className={inp} value={f.crop} onChange={u('crop')}>{CROPS.map(c=><option key={c}>{c}</option>)}</select></L>
<L k="qty"><input className={inp} type="number" min="1" value={f.quantity_qtl} onChange={u('quantity_qtl')}/></L>
<L k="grade"><select className={inp} value={f.grade} onChange={u('grade')}>{['A','B','C'].map(g=><option key={g}>{g}</option>)}</select></L>
<L k="moist"><input className={inp} type="number" value={f.moisture_pct} onChange={u('moisture_pct')}/></L>
<L k="harvest"><input className={inp} type="date" value={f.harvest_date} onChange={u('harvest_date')}/></L>
<L k="urgency"><input className={inp} type="number" min="1" value={f.urgency_days} onChange={u('urgency_days')}/></L>
<L k="village"><input className={inp} value={f.village} onChange={u('village')}/></L>
<L k="district"><select className={inp} value={f.district} onChange={u('district')}>{Object.keys(DISTRICTS).map(d=><option key={d}>{d}</option>)}</select></L>
<Button className="w-full" onClick={save}>{t('farmer.save')}</Button></Card></div>}
