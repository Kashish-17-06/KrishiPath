import {useSearchParams} from 'react-router-dom'
import {useAuth} from '../../../shared/auth'
import {db,useCollection} from '../../../shared/db'
import {useI18n} from '../../../shared/i18n'
export function useCrop(){const [sp]=useSearchParams();const {user}=useAuth();useCollection('crops')
const id=sp.get('crop');if(id)return db.get('crops',id)
return [...db.find('crops',c=>c.farmer_id===user?.id)].sort((a,b)=>b.id-a.id)[0]}
export const useRT=()=>{const {t,lang}=useI18n();return {t,lang,rt:r=>t('rt.'+r)}}
export const tone={high:'green',medium:'amber',low:'red'}
