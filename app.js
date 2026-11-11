(() => {
"use strict";
const NS = "http://www.w3.org/2000/svg";
const W = 1000, H = 540, AY = 277;
let MX = 632;
const $ = id => document.getElementById(id);
const state = { mirror:"convex", source:"point", distance:165, height:34, radius:140, spread:18, count:2,
  refractiveIndex:1.50, selected:1, step:5, normal:true, extension:true, fc:true, angle:false, grid:false, solo:false };
const palettes = { incident:"#df9b37", reflected:"#2878c6", normal:"#129f8e", extended:"#d777a0", image:"#168c82" };
const names = { convex:"凸面鏡", concave:"凹面鏡", plane:"平面鏡" };
const isLens = () => window.LensOptics.isLens(state);
const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
const add = (a,b) => ({x:a.x+b.x,y:a.y+b.y});
const mul = (a,t) => ({x:a.x*t,y:a.y*t});
const dot = (a,b) => a.x*b.x+a.y*b.y;
const unit = p => { const v=Math.hypot(p.x,p.y)||1;return {x:p.x/v,y:p.y/v}; };
const fmt = n => Number.isFinite(n) ? (Math.abs(n)<.00001?"0":n.toFixed(1)) : "∞";
const number = n => Number(n).toFixed(2);
let scale=2.1;
const sp = p => ({x:MX+p.x*scale,y:AY-p.y*scale});
const sv = p => ({x:p.x*scale,y:-p.y*scale});
const seg = (a,b,color,width=2,dash="",opacity=1,attr="") =>
  '<line x1="'+number(a.x)+'" y1="'+number(a.y)+'" x2="'+number(b.x)+'" y2="'+number(b.y)+
  '" stroke="'+color+'" stroke-width="'+width+'" stroke-linecap="round" opacity="'+opacity+
  '"'+(dash?' stroke-dasharray="'+dash+'"':"")+(attr?" "+attr:"")+'/>';
const label = (x,y,text,opts="") => '<text x="'+number(x)+'" y="'+number(y)+'" '+opts+'>'+text+'</text>';
const defs = '<defs>'+
  '<clipPath id="safeArea"><rect x="16" y="22" width="968" height="493" rx="10"/></clipPath>'+
  '<marker id="incTip" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7Z" fill="'+palettes.incident+'"/></marker>'+
  '<marker id="refTip" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7Z" fill="'+palettes.reflected+'"/></marker>'+
  '<marker id="objTip" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7Z" fill="#a97939"/></marker>'+
  '<marker id="imgTip" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7Z" fill="'+palettes.image+'"/></marker>'+
  '<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#e8eef5" stroke-width="1"/></pattern></defs>';

function focal() { return state.mirror==="plane" ? null : (state.mirror==="convex" ? -state.radius/2 : state.radius/2); }
function theory() {
  if(isLens()) return window.LensOptics.theory(state);
  const f=focal();
  if(state.source==="parallel") return {f:f,v:null,m:null,kind:"parallel"};
  if(f===null) return {f:null,v:-state.distance,m:1,kind:"virtual"};
  const d=state.distance-f;
  if(Math.abs(d)<1e-8) return {f:f,v:Infinity,m:Infinity,kind:"infinity"};
  const v=f*state.distance/d, m=-v/state.distance;
  return {f:f,v:v,m:m,kind:v>0?"real":"virtual"};
}
function surface(y) {
  if(state.mirror==="plane") return {x:0,y:y};
  const R=state.radius;
  const off=R-Math.sqrt(Math.max(0,R*R-y*y));
  return {x:state.mirror==="convex"?off:-off,y:y};
}
function outwardNormal(p) {
  if(state.mirror==="plane") return {x:-1,y:0};
  if(state.mirror==="convex") return unit({x:p.x-state.radius,y:p.y});
  return unit({x:-state.radius-p.x,y:-p.y});
}
function rayAt(i) {
  if(isLens()) return window.LensOptics.rayAt(state,i);
  const y=state.count===1?0:-state.spread+(2*state.spread*i)/(state.count-1);
  const P=surface(y);
  const O=state.source==="parallel"?{x:-280,y:y}:{x:-state.distance,y:state.height};
  const I=state.source==="parallel"?{x:1,y:0}:unit({x:P.x-O.x,y:P.y-O.y});
  const N=outwardNormal(P), k=dot(I,N);
  const R=unit(add(I,mul(N,-2*k)));
  return {O,P,I,N,R,angle:Math.acos(clamp(-k,-1,1))*180/Math.PI};
}
function screenArc(p,u,v,r,color) {
  const a=unit(sv(u)),b=unit(sv(v)),cross=a.x*b.y-a.y*b.x;
  const A=add(p,mul(a,r)),B=add(p,mul(b,r));
  return '<path d="M'+number(A.x)+' '+number(A.y)+' A'+r+' '+r+' 0 0 '+(cross>=0?1:0)+' '+number(B.x)+' '+number(B.y)+'" fill="none" stroke="'+color+'" stroke-width="2.6"/>';
}
function pathMirror(){
  if(state.mirror==="plane") return "M"+number(MX)+" "+number(AY-132)+" L"+number(MX)+" "+number(AY+132);
  const points=[];
  for(let y=-65;y<=65;y+=1.5) { const p=sp(surface(y));points.push((points.length?"L":"M")+number(p.x)+" "+number(p.y)); }
  return points.join(" ");
}
function visibleWorldScale(){
  if(isLens())return window.LensOptics.scale(state,theory());
  const needsLeft=Math.max(state.source==="parallel"?280:state.distance,state.mirror==="concave"?state.radius:0,40);
  const needsRight=state.mirror==="convex"?state.radius:state.mirror==="plane"?state.distance:40;
  return Math.min(2.13, 532/needsLeft, 318/needsRight);
}
function drawBeam(a,b,color,emphasis,marker){
  const A=sp(a),B=sp(b),opacity=emphasis?1:.48,width=emphasis?3.5:2.3;
  const q1=add(A,mul({x:B.x-A.x,y:B.y-A.y},.56));
  const q2=add(A,mul({x:B.x-A.x,y:B.y-A.y},.69));
  return seg(A,B,color,width,"",opacity)+seg(q1,q2,color,width+1,"",opacity,'marker-end="url(#'+marker+')"');
}
function drawReflection(ray,focus){
  const A=sp(ray.P), end=sp(add(ray.P,mul(ray.R,245)));
  const opacity=focus?1:.48,width=focus?3.6:2.35;
  const mid=sp(add(ray.P,mul(ray.R,72))),tip=sp(add(ray.P,mul(ray.R,89)));
  return seg(A,end,palettes.reflected,width,"",opacity)+seg(mid,tip,palettes.reflected,width+1,"",opacity,'marker-end="url(#refTip)"');
}
function drawExtension(ray,focus){
  const start=sp(ray.P),end=sp(add(ray.P,mul(ray.R,-205)));
  return seg(start,end,palettes.extended,focus?2.5:1.8,"6 8",focus?.77:.4);
}
function computeSvg(){
  scale=visibleWorldScale();
  if(isLens()){
    const result=window.LensOptics.draw(state,{W,H,MX,AY,defs});
    $("scene").innerHTML=result.svg;
    window.LensOptics.updateResults(state,result.model,result.ray,$);
    return;
  }
  const optical=theory();
  const rayList=Array.from({length:state.count},(_,i)=>rayAt(i));
  const selected=rayList[state.selected];
  const displayed=state.solo?[selected]:rayList;
  let out=defs+'<rect width="'+W+'" height="'+H+'" fill="#fff"/>';
  if(state.grid) out+='<rect x="16" y="22" width="968" height="493" fill="url(#grid)" opacity=".8"/>';
  out+=seg({x:32,y:AY},{x:965,y:AY},"#b6c4d2",1.7,"9 8",.85);
  if(state.fc&&state.mirror!=="plane"){
    for(const [coordinate,name] of [[optical.f,"F"],[state.mirror==="convex"?state.radius:-state.radius,"C"]]){
      const point=sp({x:coordinate,y:0});
      if(point.x>=38&&point.x<=965) out+='<circle cx="'+number(point.x)+'" cy="'+number(AY)+'" r="4.2" fill="#617992"/>'+
        label(point.x,AY+27,name,'font-family="Georgia,serif" text-anchor="middle" font-style="italic" font-size="17" font-weight="700" fill="#546e88"');
    }
  }
  out+='<g clip-path="url(#safeArea)">';
  if(state.step>=4&&state.extension) for(const ray of displayed)
    out+=drawExtension(ray,ray===selected);
  for(const ray of displayed){
    out+=drawBeam(ray.O,ray.P,palettes.incident,ray===selected,"incTip");
    if(state.step>=3) out+=drawReflection(ray,ray===selected);
  }
  // The optical surface is deliberately drawn above rays but below the object and image.
  const mirror=pathMirror();
  out+='<path d="'+mirror+'" fill="none" stroke="#dce6f2" stroke-width="10" stroke-linecap="round"/>'+
    '<path d="'+mirror+'" fill="none" stroke="#325b84" stroke-width="4.6" stroke-linecap="round"/>';
  if(state.step>=2&&state.normal){
    const normalStart=sp(add(selected.P,mul(selected.N,32)));
    const normalEnd=sp(add(selected.P,mul(selected.N,-32)));
    out+=seg(normalStart,normalEnd,palettes.normal,2.4,"6 5",1);
  }
  if(state.step>=2){
    const p=sp(selected.P);
    out+='<circle cx="'+number(p.x)+'" cy="'+number(p.y)+'" r="5" fill="'+palettes.normal+'" stroke="#fff" stroke-width="2"/>';
    if(state.angle){
      out+=screenArc(p,selected.N,mul(selected.I,-1),31,palettes.incident);
      if(state.step>=3) out+=screenArc(p,selected.N,selected.R,40,palettes.reflected);
    }
  }
  // Image geometry (paraxial approximation): show only when inside the view.
  if(state.step>=5&&state.source==="point"&&Number.isFinite(optical.v)){
    const base=sp({x:-optical.v,y:0}),tip=sp({x:-optical.v,y:state.height*optical.m});
    if(base.x>35&&base.x<963&&tip.y>36&&tip.y<492) {
      out+=seg(base,tip,palettes.image,4.8,optical.kind==="virtual"?"5 5":"",.95,'marker-end="url(#imgTip)"');
      out+='<circle cx="'+number(tip.x)+'" cy="'+number(tip.y)+'" r="4.2" fill="'+palettes.image+'"/>';
      out+=label(clamp(tip.x+13,25,976),tip.y-12,"I",'fill="'+palettes.image+'" font-family="Georgia,serif" font-style="italic" font-weight="800" font-size="18"');
    }
  }
  if(state.step>=5&&state.source==="parallel"&&optical.f!==null){
    const f=sp({x:optical.f,y:0});
    if(f.x>36&&f.x<962) out+='<circle cx="'+number(f.x)+'" cy="'+number(f.y)+'" r="10" fill="none" stroke="'+palettes.image+'" stroke-dasharray="4 4" stroke-width="2"/>';
  }
  if(state.source==="point"){
    const foot=sp({x:-state.distance,y:0}),tip=sp({x:-state.distance,y:state.height});
    out+=seg(foot,tip,"#ad7d3d",5,"",1,'marker-end="url(#objTip)"');
    out+='<circle cx="'+number(tip.x)+'" cy="'+number(tip.y)+'" r="7.5" fill="#fff" stroke="#c38a30" stroke-width="2.6" data-drag="1"/>'+
      '<circle cx="'+number(tip.x)+'" cy="'+number(tip.y)+'" r="24" fill="transparent" data-drag="1" style="cursor:grab"/>';
    out+=label(tip.x-15,tip.y-17,"O",'font-family="Georgia,serif" font-style="italic" text-anchor="end" fill="#a57535" font-weight="800" font-size="18"');
  }
  out+='</g>';
  out+=label(MX,AY+174,names[state.mirror],'text-anchor="middle" fill="#385a7e" font-size="17" font-weight="800"');
  out+=label(35,AY-14,"主軸",'font-size="12" fill="#99a9bb"');
  $("scene").innerHTML=out;
  updateResults(optical,selected);
}
function updateResults(t,ray){
  const hasObject=state.source==="point";
  const mirrorName=names[state.mirror];
  const outcome=t.kind==="parallel"?(state.mirror==="convex"?"反射光發散，反向延長線通過虛焦點":state.mirror==="concave"?"反射光在近軸條件下會聚至實焦點":"反射後仍為平行光"):
    t.kind==="infinity"?"反射光接近平行，像在無限遠":
    (t.kind==="real"?"倒立實像":"正立虛像")+(Math.abs(t.m)>1.04?"・放大":Math.abs(t.m)<.96?"・縮小":"・等大");
  $("sceneTitle").textContent=mirrorName+"："+outcome;
  $("stageCount").textContent=state.solo?"單線觀察":state.count+" 條光線";
  $("angleIn").textContent=fmt(ray.angle)+"°";
  $("angleOut").textContent=fmt(ray.angle)+"°";
  $("focalResult").textContent=t.f===null?"∞":fmt(t.f)+" cm";
  $("imageDistance").textContent=!hasObject?"—":fmt(t.v)+" cm";
  $("imageTag").textContent=t.kind==="parallel"?"平行光":t.kind==="infinity"?"遠方成像":t.kind==="real"?"實像":"虛像";
  $("imageDescription").textContent=outcome+(hasObject&&Number.isFinite(t.v)?"；倍率約 "+fmt(Math.abs(t.m))+" 倍。":"。");
  const headings=["","畫出入射光線","在入射點畫法線","遵守入射角＝反射角","將反射線向後延長","找出成像的位置"];
  const descriptions=[
    "",
    "光線從物體同一點發出，或由左方以平行光射向鏡面。先觀察它們在哪裡碰到鏡面。",
    "點選一條光線，在接觸鏡面的地方畫法線。球面鏡的法線會通過曲率中心 C。",
    "由入射光線與法線決定入射角，再在法線另一側畫出等角度的反射光。",
    "將反射光向後以粉紅虛線延長。延長線是作圖工具，不代表真的有光走過。",
    "觀察反射光是否真的相交（實像），否則看反向延長線是否相交（虛像）。"
  ];
  $("stepIndex").textContent=String(state.step).padStart(2,"0")+" / 05";
  $("stepHeading").textContent=headings[state.step];
  $("stepDescription").textContent=descriptions[state.step];
  let message=state.mirror==="convex"?"凸面鏡的焦點 F 位於鏡後，是虛焦點；鏡前實物不可能放在該焦點上。":
    state.mirror==="concave"?"凹面鏡的焦點 F 在鏡前；物體在焦點時，近軸反射光近似平行。":
    "平面鏡沒有有限焦點，鏡後虛像與物體等大。";
  if(state.step>=4&&!state.extension) message+=" 目前隱藏了延長線，可從左側勾選顯示。";
  if(state.spread/state.radius>.24&&state.mirror!=="plane") message+=" 入射點偏離主軸較大，球面像差會更明顯。";
  $("physicsNote").textContent=message;
  document.querySelectorAll(".step").forEach(btn=>{btn.classList.toggle("active",Number(btn.dataset.step)===state.step);btn.setAttribute("aria-pressed",String(Number(btn.dataset.step)===state.step));});
}
function updateControls(){
  const lens=isLens();
  $("stepProcess").textContent=lens?"折射":"反射";
  $("rayLabel").textContent=lens?"折射":"反射";
  $("insideLegend").hidden=!lens;
  $("angleRelation").textContent=lens?"→":"＝";
  $("outputAngleLabel").textContent=lens?"折射角 θₜ":"反射角 θᵣ";
  $("extensionLabel").textContent=lens?"出射光反向延長線":"反射光反向延長線";
  $("focalLabel").textContent=lens?"焦點 F／F′":"焦點 F／曲率中心 C";
  $("deviceNote").textContent=lens?(state.mirror==="slab"?"玻璃板：兩面折射，沒有會聚能力":"透鏡：光線經過兩個界面時折射"):"鏡面：光線在表面反射";
  $("footnote").textContent=lens?"依司乃耳定律追跡入射、玻璃內及出射光線（不計表面反射）；焦點與像點由近軸光線估算。":"依鏡面反射定律追跡光線；焦距及成像位置以近軸近似標示，較遠離主軸時可能出現球面像差。";
  $("indexField").hidden=!lens;
  $("radiusField").hidden=state.mirror==="slab";
  $("refractiveIndex").value=state.refractiveIndex;
  $("refractiveIndexValue").textContent=state.refractiveIndex.toFixed(2);
  document.querySelectorAll("[data-group]").forEach(group=>group.querySelectorAll("[data-val]").forEach(btn=>{
    const isActive=state[group.dataset.group]===btn.dataset.val;
    btn.classList.toggle("active",isActive);btn.setAttribute("aria-pressed",String(isActive));
  }));
  for(const id of ["distance","height","radius","spread","count"]){
    $(id).value=state[id];
    $(id+"Value").textContent=id==="spread"?"± "+state[id]+" cm":id==="count"?state[id]+" 條":state[id]+" cm";
  }
  $("distanceField").classList.toggle("disabled",state.source==="parallel");
  $("heightField").classList.toggle("disabled",state.source==="parallel");
  $("radiusField").classList.toggle("disabled",state.mirror==="plane"||state.mirror==="slab");
  $("distance").disabled=state.source==="parallel";$("height").disabled=state.source==="parallel";$("radius").disabled=state.mirror==="plane"||state.mirror==="slab";
  for(const key of ["normal","extension","fc","angle","grid","solo"]) $(key+"Toggle").checked=state[key];
  const raySelect=$("focusRay"),old=raySelect.value;
  raySelect.innerHTML=Array.from({length:state.count},(_,i)=>{
    const name=state.count===2?(i===0?"下方":"上方"):(i===0?"下方":i===state.count-1?"上方":"中間 "+i);
    return '<option value="'+i+'">第 '+(i+1)+' 條（'+name+'）</option>';
  }).join("");
  state.selected=clamp(state.selected,0,state.count-1);
  raySelect.value=String(state.selected);
}
function render(){MX=isLens()?485:632;updateControls();computeSvg();}
function applyPreset(which){
  const presets={
    convex:["convex","point",165,34,140,18,2,true],
    convexParallel:["convex","parallel",165,34,140,20,2,true],
    concaveReal:["concave","point",170,34,140,18,2,false],
    concaveFocus:["concave","point",70,12,140,8,2,false],
    concaveVirtual:["concave","point",47,24,140,12,2,true],
    plane:["plane","point",125,34,140,16,2,true],
    slab:["slab","parallel",165,34,140,18,2,false],
    slabPoint:["slab","point",165,34,140,18,2,true],
    convexLens:["convexLens","point",210,30,110,18,2,false],
    convexLensParallel:["convexLens","parallel",210,30,110,18,2,false],
    concaveLens:["concaveLens","point",160,30,110,18,2,true],
    concaveLensParallel:["concaveLens","parallel",160,30,110,18,2,true]
  };
  const p=presets[which];if(!p)return;
  [state.mirror,state.source,state.distance,state.height,state.radius,state.spread,state.count,state.extension]=p;
  state.step=5;state.selected=1;state.solo=false;state.normal=true;render();
}
function download(blob,file){
  if(!blob) return;
  const a=document.createElement("a"),url=URL.createObjectURL(blob);
  a.href=url;a.download=file;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),6000);
}
function exportSvg(){
  const clone=$("scene").cloneNode(true);
  clone.setAttribute("width",String(W));clone.setAttribute("height",String(H));
  clone.setAttribute("xmlns",NS);
  return new XMLSerializer().serializeToString(clone);
}
$("exportSVG").addEventListener("click",()=>download(new Blob([exportSvg()],{type:"image/svg+xml;charset=utf-8"}),"反射與折射光路.svg"));
$("exportPNG").addEventListener("click",()=>{
  const b=new Blob([exportSvg()],{type:"image/svg+xml;charset=utf-8"});
  const url=URL.createObjectURL(b),im=new Image();
  im.onload=()=>{
    const c=document.createElement("canvas");c.width=2000;c.height=1080;
    const ctx=c.getContext("2d");ctx.scale(2,2);ctx.fillStyle="#fff";ctx.fillRect(0,0,W,H);ctx.drawImage(im,0,0,W,H);
    c.toBlob(blob=>download(blob,"反射與折射光路.png"),"image/png");
    URL.revokeObjectURL(url);
  };
  im.onerror=()=>{alert("PNG 匯出失敗，可改用 SVG 匯出。");URL.revokeObjectURL(url);};
  im.src=url;
});
$("reset").addEventListener("click",()=>{state.fc=true;state.angle=false;state.grid=false;applyPreset("convex");});
document.querySelectorAll("[data-group]").forEach(group=>group.addEventListener("click",e=>{
  const btn=e.target.closest("[data-val]");if(!btn)return;
  if(group.dataset.group==="mirror"){
    const value=btn.dataset.val;
    applyPreset(value==="slab"?"slabPoint":value);
    return;
  }
  state[group.dataset.group]=btn.dataset.val;state.selected=Math.min(1,state.count-1);
  if(group.dataset.group==="mirror")state.extension=state.mirror!=="concave";
  render();
}));
document.querySelectorAll("[data-step]").forEach(btn=>btn.addEventListener("click",()=>{state.step=Number(btn.dataset.step);if(state.step===4)state.extension=true;render();}));
document.querySelectorAll("[data-preset]").forEach(btn=>btn.addEventListener("click",()=>applyPreset(btn.dataset.preset)));
for(const id of ["distance","height","radius","spread","count"]) $(id).addEventListener("input",e=>{
  state[id]=Number(e.target.value);state.selected=clamp(state.selected,0,state.count-1);render();
});
$("refractiveIndex").addEventListener("input",e=>{state.refractiveIndex=Number(e.target.value);render();});
for(const key of ["normal","extension","fc","angle","grid","solo"]) $(key+"Toggle").addEventListener("change",e=>{state[key]=e.target.checked;render();});
$("focusRay").addEventListener("change",e=>{state.selected=Number(e.target.value);render();});
const svg=$("scene");
let dragging=false;
function moveObject(event){
  const bounds=svg.getBoundingClientRect();
  const x=(event.clientX-bounds.left)*W/bounds.width;
  const y=(event.clientY-bounds.top)*H/bounds.height;
  state.distance=Math.round(clamp((MX-x)/scale,30,300));
  state.height=Math.round(clamp((AY-y)/scale,10,55));
  render();
}
svg.addEventListener("pointerdown",event=>{
  if(state.source==="point"&&event.target.hasAttribute("data-drag")){
    dragging=true;svg.setPointerCapture(event.pointerId);moveObject(event);return;
  }
  const point=svg.createSVGPoint();
  point.x=event.clientX;point.y=event.clientY;
  const matrix=svg.getScreenCTM();if(!matrix)return;
  const where=point.matrixTransform(matrix.inverse());
  // Clicking near a ray switches the highlighted ray without changing its path.
  const rays=Array.from({length:state.count},(_,i)=>rayAt(i));
  let best=Infinity,index=-1;
  rays.forEach((r,i)=>{
    if(!r)return;
    const p=sp(r.P),o=sp(r.O||{x:-280,y:r.P.y});
    const d=distanceToSegment(where,o,p);
    if(d<best){best=d;index=i;}
  });
  // Permit selecting either the incoming or the reflected segment.
  rays.forEach((r,i)=>{
    if(!r)return;
    const a=sp(r.P2||r.P),b=sp(add(r.P2||r.P,mul(r.R,245)));
    const d=distanceToSegment(where,a,b);
    if(d<best){best=d;index=i;}
  });
  if(best<17&&index>=0){state.selected=index;render();}
});
function distanceToSegment(q,a,b){
  const v={x:b.x-a.x,y:b.y-a.y};
  const n=clamp(((q.x-a.x)*v.x+(q.y-a.y)*v.y)/(v.x*v.x+v.y*v.y||1),0,1);
  return Math.hypot(q.x-a.x-v.x*n,q.y-a.y-v.y*n);
}
svg.addEventListener("pointermove",event=>{if(dragging)moveObject(event);});
for(const eventName of ["pointerup","pointercancel","lostpointercapture"])
  svg.addEventListener(eventName,()=>{dragging=false;});
render();
})();