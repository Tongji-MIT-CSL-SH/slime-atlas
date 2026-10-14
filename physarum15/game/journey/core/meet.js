export const OBSERVATION_POINTS = Object.freeze([
  {id:"junction",name:"匯合處",x:420,y:270,note:"幾條管狀分支在這裡相連，不是幾隻小蟲各走各的路。"},
  {id:"upper",name:"上方分支",x:580,y:170,note:"沿著這條細線往回看，它接回同一片連續的身體。"},
  {id:"lower",name:"下方分支",x:555,y:350,note:"分叉不等於分成不同的個體。這張圖呈現同一個原質團。"},
]);
export function newMeet() { return {food:false,observed:[],selected:null,traced:false}; }
export function placeOat(state) { state.food=true; }
export function observeMeet(state,id) {
  if(!state.food || !OBSERVATION_POINTS.some(point=>point.id===id))return false;
  if(!state.observed.includes(id))state.observed.push(id);
  state.selected=id;
  return true;
}
export function traceMeet(state) {
  if(!state.food || state.observed.length<2)return false;
  state.traced=true;
  return true;
}
export function meetEvidence(state) {
  if(!state.food || !state.traced || state.observed.length<2)return null;
  const mask=OBSERVATION_POINTS.reduce((value,point,index)=>value|(state.observed.includes(point.id)?1<<index:0),0);
  return {observations:state.observed.length,observedMask:mask,foodPlaced:1,traced:1};
}
