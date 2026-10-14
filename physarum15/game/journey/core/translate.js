import { CITY, evaluateCity } from "../content/scenes.js";
export const TRANSLATE_PAIRS = [
 {id:"resource",source:"資源位置",good:"重新定義居民需求與服務位置",bad:"燕麥就等同於居民"},
 {id:"connection",source:"連接與探索",good:"提出要再驗證的候選通道",bad:"金線畫到哪裡，道路就能建到哪裡"},
 {id:"resistance",source:"環境中的阻力",good:"另行定義城市通行代價",bad:"直接換算成真實步行速度"},
];
export const CITY_RULES = [
 {id:"permission",label:"通行許可",note:"只能使用既有道路與本關已獲准候選，不可直接穿河。"},
 {id:"budget",label:"公共預算",note:"新增措施最多 4 枚教學籌碼；不是工程報價。"},
 {id:"service",label:"服務要求",note:"逐組檢查是否在 650 教學距離內；不是讓平均數代替每個人。"},
];
export const TRANSLATE_OPTIONS = ["copy","centre","river","both"];
export const newTranslate=()=>({pairs:{resource:"",connection:"",resistance:""},rules:[],option:"copy",rejectedCopy:false,current:null});
export function pairTranslate(s,id,value){
 if(!TRANSLATE_PAIRS.some(p=>p.id===id)||!["redefine","copy"].includes(value))return false;
 s.pairs[id]=value;s.current=null;return true;
}
export function ruleTranslate(s,id,checked){
 if(!CITY_RULES.some(r=>r.id===id))return false;
 s.rules=checked?[...new Set([...s.rules,id])]:s.rules.filter(r=>r!==id);
 s.current=null;return true;
}
export function chooseTranslate(s,option){
 if(!TRANSLATE_OPTIONS.includes(option))return false;
 s.option=option;s.current=null;return true;
}
export function testTranslate(s){
 const issues=[];
 const legal=s.option!=="copy";
 const result=legal?evaluateCity(s.option):null;
 if(!legal){
  s.rejectedCopy=true;
  issues.push("這條草圖直穿河面，不是本關獲准的通道。畫得出來，不代表允許通行。");
 }
 if(TRANSLATE_PAIRS.some(p=>s.pairs[p.id]!=="redefine"))issues.push("把三張觀察紙條重新定義；居民、許可與步行條件不會由生物觀察自動給出。");
 if(CITY_RULES.some(r=>!s.rules.includes(r.id)))issues.push("把通行許可、預算及服務要求一起帶進問題。未勾選不代表可以忽略它。");
 if(result&&!result.affordable)issues.push("這組措施需要 "+result.cost+" 枚籌碼，超過本關 4 枚預算。");
 s.current={option:s.option,legal,issues,result,ready:issues.length===0};
 return s.current;
}
export function translateEvidence(s){
 if(!s.rejectedCopy||!s.current?.ready||s.current.option!==s.option)return null;
 if(TRANSLATE_PAIRS.some(p=>s.pairs[p.id]!=="redefine")||CITY_RULES.some(r=>!s.rules.includes(r.id)))return null;
 const r=evaluateCity(s.option);
 if(!r.affordable)return null;
 return {model:1,pairMask:7,ruleMask:7,rejectedCopy:1,option:TRANSLATE_OPTIONS.indexOf(s.option),
  cost:r.cost,threshold:CITY.threshold,bendDistance:r.rows.find(row=>row.id==="bend").distance};
}
export function replayTranslateEvidence(e){
 if(!e||e.model!==1||![1,2].includes(e.option))return null;
 const s=newTranslate();testTranslate(s);
 for(const p of TRANSLATE_PAIRS)pairTranslate(s,p.id,"redefine");
 for(const r of CITY_RULES)ruleTranslate(s,r.id,true);
 chooseTranslate(s,TRANSLATE_OPTIONS[e.option]);testTranslate(s);
 const actual=translateEvidence(s);
 return actual&&Object.keys(actual).every(k=>actual[k]===e[k])?s:null;
}
export function translateTask(s){
 if(!s.rejectedCopy)return "先試一次直接照搬的跨河草圖，看看城市規則會擋下什麼。";
 if(TRANSLATE_PAIRS.some(p=>s.pairs[p.id]!=="redefine"))return "把三張生物觀察紙條，配成需要重新定義的城市問題。";
 if(CITY_RULES.some(r=>!s.rules.includes(r.id)))return "帶上通行許可、公共預算及服務要求。這些不是黏菌替小鎮決定的。";
 if(!s.current)return "選一組候選並檢查。條件改了，要留下這次的結果。";
 if(!s.current.ready)return "對照檢查紙條，調整候選或規則。可檢驗的模型，不等於已達標的方案。";
 return "城市問題已定義。帶著規則走下一關，再親自檢查居民能否到達。";
}
