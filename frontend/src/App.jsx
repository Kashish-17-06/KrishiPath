import {Routes,Route,Navigate} from 'react-router-dom'
import {useAuth} from './shared/auth'
import Layout from './shared/Layout'
const mods=import.meta.glob('./modules/*/routes.jsx',{eager:true})
const all=Object.values(mods).flatMap(m=>m.default||[])
const Guard=({roles,children})=>{const {user}=useAuth();if(roles&&(!user||!roles.includes(user.role)))return <Navigate to="/" replace/>;return children}
export default function App(){return <Layout><Routes>{all.map(r=><Route key={r.path} path={r.path} element={<Guard roles={r.roles}>{r.element}</Guard>}/>)}<Route path="*" element={<Navigate to="/" replace/>}/></Routes></Layout>}
