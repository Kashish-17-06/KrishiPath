import {db} from '../../shared/db'
import {distanceKm,estimateTransport} from '../../shared/geo'
const DAYS={mandi:1,processor:2,buyer:2,storage_sell_later:6,fpo:4}
export function generateRoutes(crop){
const q=crop.quantity_qtl,P=crop,H=20*q,c=[]
const mk=db.find('markets',m=>m.crop===crop.crop).map(m=>({m,d:distanceKm(P,m)})).sort((a,b)=>a.d-b.d)
const veh=db.find('vehicles',v=>v.availability!=='busy')
const tr=d=>{const cv=veh.map(v=>Math.ceil(q/v.capacity_qtl)*Math.max(v.min_charge,v.rate_per_km*d));return cv.length?Math.round(Math.min(...cv)):estimateTransport(d,q)}
mk.slice(0,3).forEach(({m,d},i)=>c.push({route_type:'mandi',destination_name:m.name,destination_ref_id:m.id,distance_km:d,gross_value:m.price_per_qtl*q,transport_cost:tr(d),storage_cost:0,handling_cost:H,demand:m.demand_signal,qfit:7,confidence:'medium',
reasons:{hi:[i?'दूर पर ज़्यादा भाव':'सबसे पास की मंडी, जल्दी बिक्री',`दूरी ~${d} किमी`],en:[i?'Higher price but farther':'Nearest mandi, quick sale',`Distance ~${d} km`]}}))
db.find('buyers',b=>b.crops?.includes(crop.crop)&&q>=b.required_qtl*0.5&&crop.grade<=b.min_grade).forEach(b=>{const d=distanceKm(P,b);c.push({route_type:b.buyer_type==='processor'?'processor':'buyer',destination_name:b.business_name,destination_ref_id:b.id,distance_km:d,gross_value:b.offer_price_per_qtl*q,transport_cost:tr(d),storage_cost:0,handling_cost:H,demand:'high',qfit:10,confidence:b.verified?'high':'medium',
reasons:{hi:['ढुलाई के बाद बेहतर शुद्ध आय','सत्यापित खरीदार, तय भाव'],en:['Better net after transport','Verified buyer, fixed offer']}})})
const base=mk[0]?.m,st=db.find('storage',s=>s.crops_supported?.includes(crop.crop)&&s.available_qtl>=q).map(s=>({s,d:distanceKm(P,s)})).sort((a,b)=>a.d-b.d)[0]
if(base&&st){const h=base.price_history,tr3=(h[h.length-1]-h[h.length-4])/h[h.length-4],fut=base.price_per_qtl*(1+tr3)
c.push({route_type:'storage_sell_later',destination_name:st.s.name,destination_ref_id:st.s.id,distance_km:st.d,gross_value:fut*q,transport_cost:tr(st.d),storage_cost:st.s.rate_per_qtl_per_day*q*5,handling_cost:H,demand:base.demand_signal,qfit:6,confidence:'low',band:[.92,1,1.08].map(x=>Math.round(fut*q*x)),
reasons:{hi:['कुछ दिन रुककर बेचें; भाव अनुमान अनिश्चित','कम भरोसा'],en:['Wait a few days; future price uncertain','Low confidence']}})}
const lots=db.find('fpo_lots',l=>l.crop===crop.crop&&l.status==='open')
if(lots.length&&base){const d=Math.round(distanceKm(P,base)/2);c.push({route_type:'fpo',destination_name:'FPO lot #'+lots[0].id,destination_ref_id:lots[0].id,distance_km:d,gross_value:base.price_per_qtl*1.05*q,transport_cost:tr(d)*0.6,storage_cost:0,handling_cost:H,demand:'medium',qfit:7,confidence:'medium',reasons:{hi:['समूह में बेचने से बेहतर भाव'],en:['Group selling gets a better price']}})}
c.forEach(r=>r.net_value=Math.round(r.gross_value-r.transport_cost-r.storage_cost-r.handling_cost))
const mx=Math.max(1,...c.map(r=>r.net_value)),md=Math.max(1,...c.map(r=>r.distance_km))
c.forEach(r=>{const late=Math.max(0,DAYS[r.route_type]-(crop.urgency_days||99));const dm={high:15,medium:9,low:4}[r.demand]||6
r.score=Math.round(Math.max(0,r.net_value/mx)*55+dm+r.qfit+Math.max(0,10-late*3)+10*(1-r.distance_km/md))})
c.sort((a,b)=>b.score-a.score)
db.find('routes',r=>r.crop_id===crop.id).forEach(r=>db.remove('routes',r.id))
return c.map((r,i)=>{const {demand,qfit,...row}=r;return db.insert('routes',{...row,crop_id:crop.id,rank_no:i+1,gross_value:Math.round(r.gross_value),transport_cost:Math.round(r.transport_cost)})})}
