import {useNavigate} from 'react-router-dom'
import {Sprout,Truck,Store,Users,Shield} from 'lucide-react'
import {useAuth} from '../../../shared/auth'
import {useI18n} from '../../../shared/i18n'
const R=[['farmer',Sprout,'/farmer/home'],['transporter',Truck,'/transport/dashboard'],['buyer',Store,'/market/buyers'],['fpo',Users,'/transport/lots'],['admin',Shield,'/market/admin']]
export default function Landing(){const {login}=useAuth();const {t}=useI18n();const n=useNavigate()
return <div><h1 className="text-2xl font-bold mb-1">{t('app')}</h1><p className="text-stone-600 mb-4">{t('farmer.pick')} · <i>{t('sample')}</i></p>
<div className="grid grid-cols-2 gap-3">{R.map(([r,I,to],i)=><button key={r} onClick={()=>{login(r);n(to)}} className={`min-h-[120px] rounded-2xl border border-stone-200 shadow-sm flex flex-col items-center justify-center gap-2 font-bold ${i===0?'col-span-2 bg-leaf text-white':'bg-white'}`}><I size={36}/>{t('role.'+r)}</button>)}</div></div>}
