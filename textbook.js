/* 教材成像模式 — 理想薄透鏡、近軸特殊光線作圖。與 lens.js 的雙界面 Snell 追跡分開。 */
window.TextbookOptics = (() => {
"use strict";
const color={in:"#cd8b29",out:"#2775bc",ext:"#d277a6",obj:"#ad7b37",image:"#168b83",axis:"#9bafc2"};
const caseDefs=[
 {key:"far",title:"兩倍焦距外",ratio:2.75,kind:"real"},
 {key:"at2f",title:"兩倍焦距上",ratio:2,kind:"real"},
 {key:"between",title:"焦距與兩倍焦距之間",ratio:1.5,kind:"real"},
 {key:"atf",title:"焦點上",ratio:1,kind:"infinity"},
 {key:"inside",title:"焦距內",ratio:.7,kind:"virtual"},
 {key:"concaveAny",title:"凹透鏡・任意物距",ratio:1.85,kind:"virtual"}
];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const fmt=n=>Number.isFinite(n)?n.toFixed(1):"∞";
function focus(state){
 const physical=window.LensOptics.theory({...state,source:"parallel"});
 const value=Math.abs(physical.f||110);
 return clamp(value,25,400);
}
function imageProperties(state){
 const u=state.distance;
 const f=state.mirror==="convexLens"?focus(state):-focus(state);
 const delta=u-f;
 if(Math.abs(delta)<Math.max(.6,Math.abs(f)*.008)){
  return {f,u,v:Infinity,m:-Infinity,kind:"infinity",image:null};
 }
 const v=f*u/delta,m=-v/u;
 return {f,u,v,m,kind:v>0?"real":"virtual",image:{x:v,y:m*state.height}};
}
function point(p,origin,axis,scale){return {x:origin+p.x*scale,y:axis-p.y*scale};}
const line=(a,b,c,width=2.7,dash="",alpha=1,attr="")=>'<line x1="'+a.x.toFixed(2)+'" y1="'+a.y.toFixed(2)+'" x2="'+b.x.toFixed(2)+'" y2="'+b.y.toFixed(2)+'" stroke="'+c+'" stroke-width="'+width+'" stroke-linecap="round" opacity="'+alpha+'"'+(dash?' stroke-dasharray="'+dash+'"':"")+(attr?" "+attr:"")+'/>';
const txt=(x,y,s,style="")=>'<text x="'+x.toFixed(2)+'" y="'+y.toFixed(2)+'" '+style+'>'+s+'</text>';
function make(state,{mini=false,idPrefix="main"}={}){
 const th=imageProperties(state);
 const {u,f,v,m}=th,absf=Math.abs(f);
 const center=500,axis=mini?245:270;
 const maxLeft=Math.max(u,2*absf,Number.isFinite(v)&&v<0?-v:0);
 const maxRight=Math.max(2*absf,Number.isFinite(v)&&v>0?v:0);
 const scale=Math.min(1.9, 420/Math.max(1,maxLeft),420/Math.max(1,maxRight));
 const origin=(x,y)=>point({x,y},center,axis,scale);
 const object=origin(-u,state.height),base=origin(-u,0),middle=origin(0,0),pass=origin(0,state.height);
 const leftMost={x:20,y:axis},rightMost={x:980,y:axis};
 const maxHeight=mini?180:205;
 const actualImage=th.image&&th.image.x*scale+center>=24&&th.image.x*scale+center<=976&&
  Math.abs(th.image.y*scale)<=maxHeight;
 const extension=th.kind==="virtual"&&state.extension;
 const maskStart='<g clip-path="url(#textbookMask)">';
 const maskEnd='</g>';
 const markers='<defs><clipPath id="textbookMask"><rect x="20" y="12" width="960" height="495" rx="9"/></clipPath>'+
  '<marker id="tbIn" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="'+color.in+'"/></marker>'+
  '<marker id="tbOut" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="'+color.out+'"/></marker>'+
  '<marker id="tbObj" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="'+color.obj+'"/></marker>'+
  '<marker id="tbImg" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="'+color.image+'"/></marker></defs>';
 let out=markers+'<rect width="1000" height="540" fill="white"/>';
 if(state.grid&&!mini)out+='<path d="'+Array.from({length:25},(_,i)=>'M'+(i*40)+' 20V520').join(" ")+Array.from({length:14},(_,i)=>'M20 '+(i*40)+'H980').join(" ")+'" stroke="#ebf0f7" stroke-width="1" fill="none"/>';
 out+=line(leftMost,rightMost,color.axis,1.6,"8 7",.88);
 if(state.fc){
  const positions=[[-2*absf,"2F"],[-absf,"F"],[absf,"F′"],[2*absf,"2F′"]];
  for(const [x,term] of positions){
   const p=origin(x,0);
   out+=line({x:p.x,y:axis-5},{x:p.x,y:axis+5},"#647c97",1.9);
   out+=txt(p.x,axis+26,term,'font-family="Georgia,serif" text-anchor="middle" font-weight="700" font-size="16" fill="#576e88"');
  }
 }
 // Keep all textbook rays on one fixed drawing canvas.
 out+=maskStart;
 const lensTop=axis-135,lensBottom=axis+135,cx=center;
 const lens=state.mirror==="convexLens"?
  'M'+(cx)+' '+lensTop+' C'+(cx-37)+' '+(lensTop+74)+' '+(cx-37)+' '+(lensBottom-74)+' '+cx+' '+lensBottom+' C'+(cx+37)+' '+(lensBottom-74)+' '+(cx+37)+' '+(lensTop+74)+' '+cx+' '+lensTop+'Z':
  'M'+(cx-33)+' '+lensTop+' Q'+(cx+12)+' '+axis+' '+(cx-33)+' '+lensBottom+' L'+(cx+33)+' '+lensBottom+' Q'+(cx-12)+' '+axis+' '+(cx+33)+' '+lensTop+'Z';
 // Thin lens is shown after rays to make its optical center recognizable.
 const opticalCenter=origin(0,0);
 const rayDefs=[
   {arrive:pass,slope:-state.height/f,origin:pass},
   {arrive:middle,slope:-state.height/u,origin:middle}
 ];
 const visible=state.solo?[clamp(state.selected,0,1)]:[0,1];
 const rayA=visible.includes(0);
 const rayB=visible.includes(1);
 if(state.step>=1){
  if(rayA){
   out+=line(object,pass,color.in,3.1);
   out+=line({x:object.x*.58+pass.x*.42,y:pass.y},{x:object.x*.44+pass.x*.56,y:pass.y},color.in,3.2,"",1,'marker-end="url(#tbIn)"');
  }
  if(rayB){
   out+=line(object,middle,color.in,3.1);
   const a={x:object.x*.48+middle.x*.52,y:object.y*.48+middle.y*.52},
         b={x:object.x*.35+middle.x*.65,y:object.y*.35+middle.y*.65};
   out+=line(a,b,color.in,3.1,"",1,'marker-end="url(#tbIn)"');
  }
 }
 if(state.step>=4&&extension){
  for(const i of visible){
    const ray=rayDefs[i];
    const endpoint=origin(Number.isFinite(v)?v:-Math.max(260,2*absf),Number.isFinite(v)?th.image.y:0);
    // Extend backward from lens to the virtual intersection (avoid confusing extensions behind the object).
    out+=line(ray.arrive,endpoint,color.ext,2.25,"7 7",.88);
  }
 }
 if(state.step>=3){
  for(const i of visible){
    const ray=rayDefs[i],xRight=(980-center)/scale;
    const tail=origin(xRight,i===0?state.height+ray.slope*xRight:ray.slope*xRight);
    out+=line(ray.arrive,tail,color.out,3.1);
    const t1=origin(50,i===0?state.height+ray.slope*50:ray.slope*50);
    const t2=origin(66,i===0?state.height+ray.slope*66:ray.slope*66);
    out+=line(t1,t2,color.out,3.3,"",1,'marker-end="url(#tbOut)"');
  }
 }
 out+='<path d="'+lens+'" fill="#bfe5f8" fill-opacity=".63" stroke="#367eaf" stroke-width="3" stroke-linejoin="round"/>';
 out+='<circle cx="'+cx+'" cy="'+axis+'" r="4.1" fill="#2f6c9c"/>';
 if(state.step>=2&&!mini)out+=txt(cx+13,axis-18,"O",'font-family="Georgia,serif" font-size="16" fill="#466a8d" font-weight="700"');
 // Objects and image arrows are put on top of all rays so they are never hidden.
 out+=line(base,object,color.obj,4.5,"",1,'marker-end="url(#tbObj)"');
 out+='<circle cx="'+object.x.toFixed(2)+'" cy="'+object.y.toFixed(2)+'" r="4.3" fill="#fff" stroke="'+color.obj+'" stroke-width="2"/>';
 out+='<circle cx="'+object.x.toFixed(2)+'" cy="'+object.y.toFixed(2)+'" r="22" fill="transparent" data-drag="1" style="cursor:grab"/>';
 if(!mini)out+=txt(object.x-10,object.y-12,"物體",'text-anchor="end" font-size="14" font-weight="700" fill="#976627"');
 if(state.step>=5&&actualImage&&!state.solo){
  const img=origin(v,th.image.y),foot=origin(v,0);
  out+=line(foot,img,color.image,4.9,th.kind==="virtual"?"5 4":"",1,'marker-end="url(#tbImg)"');
  out+='<circle cx="'+img.x.toFixed(2)+'" cy="'+img.y.toFixed(2)+'" r="4.5" fill="'+color.image+'"/>';
  if(!mini)out+=txt(img.x+12,img.y+(m>0?-12:21),"像",'font-size="15" font-weight="800" fill="'+color.image+'"');
 }
 out+=maskEnd;
 out+=txt(center,axis+160,state.mirror==="convexLens"?"凸透鏡":"凹透鏡",
  'font-size="16" text-anchor="middle" fill="#38658b" font-weight="800"');
 if(th.kind==="infinity"&&state.step>=5){
  out+=txt(785,75,"折射光近似平行；像在無限遠",'font-size="16" fill="#425d7c" text-anchor="middle" font-weight="800"');
 }
 if(!mini)out+=txt(40,axis-17,"主軸",'font-size="12" fill="#8fa1b4"');
 // Separate marker IDs across the main plot and all overview SVG cards.
 const safePrefix=String(idPrefix).replace(/[^a-zA-Z0-9_-]/g,"");
 out=out.replace(/\b(?:textbookMask|tbIn|tbOut|tbObj|tbImg)\b/g,match=>match+"-"+safePrefix);
 return {svg:out,properties:th,scale,center,axis};
}
function describe(state,$){
 const r=imageProperties(state),type=state.mirror==="convexLens"?"凸透鏡":"凹透鏡";
 const word=r.kind==="infinity"?"平行出射、像在無限遠":
  r.kind==="real"?"倒立實像":"正立虛像";
 const size=r.kind==="infinity"?"":Math.abs(r.m)<.96?"縮小":Math.abs(r.m)>1.04?"放大":"等大";
 $("sceneTitle").textContent=type+"｜"+word+(size?"・"+size:"");
 $("stageCount").textContent=state.solo?"1 條特殊光線":"2 條特殊光線";
 $("angleIn").textContent="—";
 $("angleOut").textContent="—";
 $("focalMetricLabel").textContent="焦距";
 $("focalResult").textContent=fmt(Math.abs(r.f))+" cm";
 $("imageDistance").textContent=fmt(r.v)+" cm";
 $("imageTag").textContent=r.kind==="infinity"?"無限遠":r.kind==="real"?"實像":"虛像";
 $("imageDescription").textContent=word+(size?"、"+size:"")+(r.kind==="infinity"?"":("；倍率約 "+fmt(Math.abs(r.m))+" 倍。"));
 $("stepIndex").textContent=String(state.step).padStart(2,"0")+" / 05";
 const title=["","畫出兩條入射光線","標示透鏡與焦點","畫出折射後光路","反向延長虛像光線","找出像的位置"];
 const descriptions=[
   "",
   "從物體頂端出發：第一條平行主軸；第二條通過透鏡光學中心 O。",
   "標記 F、F′ 與兩倍焦距 2F、2F′。理想薄透鏡的中央光線近似不偏折。",
   "平行光線：凸透鏡折射後通過另一側焦點；凹透鏡折射後向外發散，看似來自同側焦點。通過光學中心的光線保持直行。",
   r.kind==="virtual"?"把向外發散的折射光向鏡前反向延長，兩線交會處是虛像；這些虛線不是實際光路。":
    "此情境不需反向延長線：觀察折射光的實際交點；若物體位於焦點，光線則近似平行。",
   r.kind==="infinity"?"當物體位於焦點 F 時，兩條出射光線近似平行，像位於無限遠。":
   "當兩條真實折射光相交時形成實像；僅反向延長線相交則為虛像。"
 ];
 $("stepHeading").textContent=title[state.step];
 $("stepDescription").textContent=descriptions[state.step];
 $("physicsNote").textContent="目前使用「課本特殊光線」的理想薄透鏡模型，依近軸作圖規則呈現，並非逐點計算玻璃內的實際折射。"+
  (state.solo?" 正在單線觀察，完整像點需比較至少兩條光線。":"");
 document.querySelectorAll(".step").forEach(btn=>{const ok=Number(btn.dataset.step)===state.step;btn.classList.toggle("active",ok);btn.setAttribute("aria-pressed",String(ok));});
}
function applyCase(state,key){
 const item=caseDefs.find(v=>v.key===key);
 if(!item)return false;
 state.source="point";state.count=2;state.selected=0;state.solo=false;state.step=5;
 state.height=34;state.lessonMode=true;state.textbookCase=key;
 const magnitude=focus(state);
 state.distance=+(magnitude*item.ratio).toFixed(2);
 state.extension=item.kind==="virtual";
 return true;
}
function overview(state){
 const scenarios=state.mirror==="concaveLens"?[caseDefs[5]]:
   caseDefs.filter(c=>c.key!=="concaveAny");
 return scenarios.map(c=>{
  const copy={...state,source:"point",selected:0,count:2,solo:false,fc:true,extension:c.kind==="virtual",
    height:30,distance:focus(state)*c.ratio,step:5,grid:false};
  const geom=make(copy,{mini:true,idPrefix:c.key});
  const t=geom.properties;
  const kind=t.kind==="infinity"?"像在無限遠":t.kind==="real"?"倒立實像":"正立虛像";
  const size=t.kind==="infinity"?"":Math.abs(t.m)<.96?"・縮小":Math.abs(t.m)>1.04?"・放大":"・等大";
  return '<button class="overview-case" data-overview="'+c.key+'"><div class="overview-case-title">'+c.title+'</div>'+
    '<svg viewBox="0 105 1000 325" role="img" aria-label="'+c.title+'光路作圖">'+geom.svg+'</svg>'+
    '<div class="overview-case-desc">'+kind+size+'</div></button>';
 }).join("");
}
return {focus,imageProperties,make,describe,applyCase,overview,caseDefs};
})();