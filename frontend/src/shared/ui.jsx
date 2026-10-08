import {Link,useNavigate} from 'react-router-dom'
import {ArrowLeft} from 'lucide-react'
export const Card=({children,className=''})=><div className={`bg-white rounded-2xl p-4 shadow-sm border border-stone-200 ${className}`}>{children}</div>
const V={primary:'bg-leaf text-white',secondary:'bg-wheat text-leaf border border-leaf',ghost:'text-leaf'}
export const Button=({variant='primary',className='',...p})=><button {...p} className={`min-h-[48px] px-5 rounded-2xl font-semibold ${V[variant]} ${className}`}/>
const T={green:'bg-green-100 text-green-800',amber:'bg-amber-100 text-amber-800',red:'bg-red-100 text-red-800',blue:'bg-sky-100 text-sky-800',gray:'bg-stone-100 text-stone-700'}
export const Badge=({tone='gray',children})=><span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${T[tone]}`}>{children}</span>
export const Stat=({label,value})=><div className="text-center"><div className="text-lg font-bold text-leaf">{value}</div><div className="text-xs text-stone-600">{label}</div></div>
export const EmptyState=({text,children})=><Card className="text-center text-stone-600 py-8">{text}{children}</Card>
export const Loader=()=><div className="p-6 text-center text-stone-500">…</div>
export const PageHeader=({title,back})=>{const n=useNavigate();return <div className="flex items-center gap-2 mb-3">{back&&<button aria-label="back" onClick={()=>n(-1)} className="w-11 h-11 grid place-items-center rounded-full bg-white"><ArrowLeft size={20}/></button>}<h1 className="text-xl font-bold">{title}</h1></div>}
export const BigTile=({icon:I,label,to})=><Link to={to} className="min-h-[96px] bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col items-center justify-center gap-2 p-3 text-center font-semibold"><I size={30} className="text-leaf"/>{label}</Link>
export const Money=({value})=><>₹{Math.round(value||0).toLocaleString('en-IN')}</>
export const StatusStepper=({steps,current})=><div className="flex gap-1 flex-wrap">{steps.map((s,i)=><Badge key={s} tone={i<steps.indexOf(current)?'green':s===current?'amber':'gray'}>{s}</Badge>)}</div>
