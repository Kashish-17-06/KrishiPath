import {createContext,useContext,useState,createElement} from 'react'
const mods=import.meta.glob('../modules/*/i18n.js',{eager:true})
const base={hi:{app:'फार्म-टू-मार्केट हरियाणा',sample:'नमूना डेटा (Sample data)',empty:'कुछ नहीं मिला'},en:{app:'Farm-to-Market Haryana',sample:'Sample data',empty:'Nothing found'}}
const dict={hi:{...base.hi},en:{...base.en}};Object.values(mods).forEach(m=>['hi','en'].forEach(l=>Object.assign(dict[l],m.default?.[l]||{})))
const Ctx=createContext()
export const I18nProvider=({children})=>{const [lang,set]=useState(localStorage.getItem('ftm_lang')||'hi');const setLang=l=>{localStorage.setItem('ftm_lang',l);set(l)}
const t=k=>dict[lang][k]??dict.en[k]??k;return createElement(Ctx.Provider,{value:{t,lang,setLang}},children)}
export const useI18n=()=>useContext(Ctx)
