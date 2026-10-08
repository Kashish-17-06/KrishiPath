import {useState,useEffect} from 'react'
const seeds=import.meta.glob('../modules/*/seed.js',{eager:true})
const V='1',K='ftm_db';let data={};const subs=new Set()
const merged=()=>{const o={};Object.values(seeds).forEach(m=>Object.entries(m.default||{}).forEach(([k,v])=>{o[k]=[...(o[k]||[]),...v]}));Object.values(o).forEach(a=>a.forEach((r,i)=>{if(r.id==null)r.id=i+1}));return o}
const persist=()=>localStorage.setItem(K,JSON.stringify(data))
const load=()=>{try{if(localStorage.getItem('ftm_version')!==V)throw 0;data=JSON.parse(localStorage.getItem(K))||{}}catch{data=merged();localStorage.setItem('ftm_version',V);persist()}}
const emit=()=>{persist();subs.forEach(f=>f())}
load()
export const db={
all:c=>data[c]||[],find:(c,fn)=>(data[c]||[]).filter(fn),get:(c,id)=>(data[c]||[]).find(r=>String(r.id)===String(id)),
insert(c,row){const a=data[c]=data[c]||[];const r={...row,id:row.id??Math.max(0,...a.map(x=>+x.id||0))+1,created_at:row.created_at||new Date().toISOString()};a.push(r);emit();return r},
update(c,id,p){const r=db.get(c,id);if(r){Object.assign(r,p,{updated_at:new Date().toISOString()});emit()}return r},
remove(c,id){data[c]=(data[c]||[]).filter(r=>String(r.id)!==String(id));emit()},
reset(){localStorage.removeItem('ftm_version');load();emit()}}
export function useCollection(c){const [,s]=useState(0);useEffect(()=>{const f=()=>s(x=>x+1);subs.add(f);return()=>subs.delete(f)},[]);return db.all(c)}
