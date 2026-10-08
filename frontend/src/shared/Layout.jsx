import {NavLink,useNavigate} from 'react-router-dom'
import {Home,BarChart3,Route,History,LogOut} from 'lucide-react'
import {useAuth} from './auth'
import {useI18n} from './i18n'
export default function Layout({children}){const {user,logout}=useAuth();const {t,lang,setLang}=useI18n();const n=useNavigate()
const nav=[['/farmer/home',Home],['/farmer/market',BarChart3],['/farmer/routes',Route],['/farmer/history',History]]
return <div className="max-w-3xl mx-auto min-h-screen pb-24">
<header className="sticky top-0 z-10 bg-leaf text-white px-4 py-2 flex items-center gap-2"><b className="flex-1 text-sm">{t('app')}</b>
<button className="min-h-[44px] px-3 rounded-xl bg-white/20" onClick={()=>setLang(lang==='hi'?'en':'hi')}>{lang==='hi'?'EN':'हिं'}</button>
{user&&<><span className="text-xs bg-white/20 rounded-full px-2 py-1">{user.role}</span><button aria-label="logout" className="w-11 h-11 grid place-items-center" onClick={()=>{logout();n('/')}}><LogOut size={18}/></button></>}</header>
<main className="p-4">{children}</main>
{user?.role==='farmer'&&<nav className="fixed bottom-0 inset-x-0 bg-white border-t flex justify-around max-w-3xl mx-auto">{nav.map(([to,I])=><NavLink key={to} to={to} className={({isActive})=>`w-16 h-14 grid place-items-center ${isActive?'text-leaf':'text-stone-400'}`}><I size={24}/></NavLink>)}</nav>}</div>}
