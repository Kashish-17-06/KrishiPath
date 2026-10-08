import {createContext,useContext,useState} from 'react'
import {db} from './db'
const IDS={farmer:1,transporter:2,buyer:3,fpo:4,admin:5}
const Ctx=createContext()
export const AuthProvider=({children})=>{const [user,setU]=useState(()=>{try{return JSON.parse(localStorage.getItem('ftm_user'))}catch{return null}})
const login=role=>{const u=db.get('users',IDS[role])||{id:IDS[role],role,name:role};localStorage.setItem('ftm_user',JSON.stringify(u));setU(u);return u}
const logout=()=>{localStorage.removeItem('ftm_user');setU(null)}
return <Ctx.Provider value={{user,login,logout}}>{children}</Ctx.Provider>}
export const useAuth=()=>useContext(Ctx)
