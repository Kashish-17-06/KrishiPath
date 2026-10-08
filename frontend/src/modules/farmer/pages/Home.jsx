import {Link} from 'react-router-dom'
import {Package,Truck,Store,Warehouse,Receipt,Sprout} from 'lucide-react'
import {useAuth} from '../../../shared/auth'
import {useCollection} from '../../../shared/db'
import {useI18n} from '../../../shared/i18n'
import {BigTile,Badge,Card,Button,EmptyState} from '../../../shared/ui'
const sc={listed:'blue',routed:'blue',selling:'amber',sold:'green',wasted:'red'}
export default function Home(){const {user}=useAuth();const {t}=useI18n();const crops=useCollection('crops').filter(c=>c.farmer_id===user.id)
return <div className="space-y-4"><h2 className="text-lg">{t('farmer.hello')}, <b>{user.name}</b></h2>
<Link to="/farmer/add-crop" className="block"><Button className="w-full min-h-[64px] text-lg flex items-center justify-center gap-2"><Sprout/>{t('farmer.sell')}</Button></Link>
<div className="grid grid-cols-2 gap-3"><BigTile icon={Package} label={t('farmer.crops')} to="/farmer/history"/><BigTile icon={Truck} label={t('farmer.vehicle')} to="/transport/find"/><BigTile icon={Store} label={t('farmer.buyers')} to="/market/buyers"/><BigTile icon={Warehouse} label={t('farmer.storage')} to="/market/storage"/><BigTile icon={Receipt} label={t('farmer.txns')} to="/transport/track"/></div>
<h3 className="font-bold">{t('farmer.crops')}</h3>{!crops.length&&<EmptyState text={t('farmer.nocrop')}/>}
{[...crops].reverse().map(c=><Link key={c.id} to={`/farmer/routes?crop=${c.id}`} className="block mb-2"><Card className="flex justify-between items-center"><div><b>{c.crop}</b> · {c.quantity_qtl} qtl · {c.grade}<div className="text-xs text-stone-500">{c.village}, {c.district}</div></div><Badge tone={sc[c.status]}>{c.status}</Badge></Card></Link>)}</div>}
