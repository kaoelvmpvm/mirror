/* Geometrical refraction through two spherical/plane surfaces.
   x increases along the incident beam, y upwards. All distances are cm.
   Exactly apply Snell's law at both surfaces; no reflection branches or absorption. */
window.LensOptics = (() => {
  "use strict";
  const HALF_HEIGHT=55;
  const inc="#df9b37",insideColor="#7e78c5",out="#2878c6",normal="#129f8e",ext="#d777a0",imageColor="#168c82";
  const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y});
  const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
  const mul=(a,s)=>({x:a.x*s,y:a.y*s});
  const dot=(a,b)=>a.x*b.x+a.y*b.y;
  const unit=a=>mul(a,1/(Math.hypot(a.x,a.y)||1));
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const rad=angle=>angle*180/Math.PI;
  const val=n=>Number(n).toFixed(2);
  const fmt=n=>Number.isFinite(n)?(Math.abs(n)<.0001?"0":n.toFixed(1)):"∞";
  const lensType=s=>s.mirror==="slab"||s.mirror==="convexLens"||s.mirror==="concaveLens";
  function shape(s){
    const R=s.radius,sg=y=>R-Math.sqrt(Math.max(0,R*R-y*y));
    const derivative=y=>y/Math.sqrt(Math.max(.0001,R*R-y*y));
    if(s.mirror==="slab")return {half:HALF_HEIGHT,thick:22,left:y=>-11,right:y=>11,
      leftSlope:y=>0,rightSlope:y=>0};
    if(s.mirror==="convexLens"){
      const thick=2*sg(HALF_HEIGHT)+10;
      return {half:HALF_HEIGHT,thick,
        left:y=>-thick/2+sg(y),right:y=>thick/2-sg(y),
        leftSlope:y=>derivative(y),rightSlope:y=>-derivative(y)};
    }
    return {half:HALF_HEIGHT,thick:12,
      left:y=>-6-sg(y),right:y=>6+sg(y),
      leftSlope:y=>-derivative(y),rightSlope:y=>derivative(y)};
  }
  // The normal points from the current medium into the next medium (positive x).
  function refract(d,n,n1,n2){
    const ratio=n1/n2,along=dot(d,n);
    const tang=sub(d,mul(n,along));
    const newTang=mul(tang,ratio);
    const sq=1-dot(newTang,newTang);
    if(sq<0)return null; // total internal reflection
    return unit(add(newTang,mul(n,Math.sqrt(sq))));
  }
  function trace(s,source,targetY,parallelDirection=null){
    const sh=shape(s),y=clamp(targetY,-HALF_HEIGHT+1,HALF_HEIGHT-1),P1={x:sh.left(y),y};
    const I=parallelDirection|| (source===null?{x:1,y:0}:unit(sub(P1,source)));
    if(I.x<=0)return null;
    const N1=unit({x:1,y:-sh.leftSlope(y)});
    const inside=refract(I,N1,1,s.refractiveIndex);
    if(!inside||inside.x<=0)return null;
    // The ray intersects the far surface. Solve the intersection without paraxial approximation.
    const pointAt=t=>add(P1,mul(inside,t));
    const equation=t=>{const p=pointAt(t);return p.x-sh.right(p.y);};
    let lo=0,hi=140;
    if(equation(hi)<0)return null;
    for(let j=0;j<52;j++){const mid=(lo+hi)/2;if(equation(mid)>0)hi=mid;else lo=mid;}
    const P2=pointAt((lo+hi)/2);
    if(Math.abs(P2.y)>=HALF_HEIGHT)return null; // left through lens edge
    const N2=unit({x:1,y:-sh.rightSlope(P2.y)});
    const emergent=refract(inside,N2,s.refractiveIndex,1);
    if(!emergent||emergent.x<=0)return null; // TIR / no outgoing transmitted ray
    const thetaIn=rad(Math.acos(clamp(dot(I,N1),-1,1)));
    const thetaGlass=rad(Math.acos(clamp(dot(inside,N1),-1,1)));
    const thetaExit=rad(Math.acos(clamp(dot(emergent,N2),-1,1)));
    return {O:source,P:P1,P2,I,N:N1,N2,inside,R:emergent,
      angle:thetaIn,thetaGlass,thetaExit,
      snell1:Math.sin(thetaIn*Math.PI/180)-s.refractiveIndex*Math.sin(thetaGlass*Math.PI/180),
      snell2:s.refractiveIndex*Math.sin(Math.acos(clamp(dot(inside,N2),-1,1)))-Math.sin(thetaExit*Math.PI/180)};
  }
  function rayAt(s,i){
    const targetY=-s.spread+(2*s.spread*i)/Math.max(1,s.count-1);
    const O=s.source==="parallel"?null:{x:-s.distance,y:s.height};
    const phi=(s.parallelAngle||0)*Math.PI/180;
    const incident=s.source==="parallel"?unit({x:1,y:Math.tan(phi)}):null;
    return trace(s,O,targetY,incident);
  }
  function intersection(a,b){
    if(!a||!b)return null;
    // Find exact intersection of the emergent (or reverse-extended) lines.
    const det=a.R.x*b.R.y-a.R.y*b.R.x;
    if(Math.abs(det)<1e-8)return null;
    const p=sub(b.P2,a.P2);
    const ta=(p.x*b.R.y-p.y*b.R.x)/det;
    const tb=(p.x*a.R.y-p.y*a.R.x)/det;
    return {point:add(a.P2,mul(a.R,ta)),ta,tb};
  }
  function paraxialFocal(s){
    // Small parallel rays give a focal point from actual double-surface Snell refraction.
    const r=trace(s,null,0.38);
    if(!r||Math.abs(r.R.y)<1e-9)return null;
    const t=-r.P2.y/r.R.y;
    return {x:r.P2.x+t*r.R.x,y:0};
  }
  function theory(s){
    const sh=shape(s),fPoint=s.mirror==="slab"?null:paraxialFocal(s);
    const f=fPoint?fPoint.x:null;
    if(s.source==="parallel")
      return {f,v:null,m:null,kind:"parallel",img:null};
    if(s.mirror==="slab"){
      // Paraxial apparent object shift across plane-parallel slab.
      const imageX=-s.distance+sh.thick*(1-1/s.refractiveIndex);
      return {f:null,v:imageX,m:1,kind:"virtual",img:{x:imageX,y:s.height}};
    }
    // Paraxial image is the intersection of two independently refracted rays.
    const rA=trace(s,{x:-s.distance,y:s.height},-.55);
    const rB=trace(s,{x:-s.distance,y:s.height},.55);
    const meet=intersection(rA,rB);
    if(!meet||Math.abs(meet.point.x)>100000)
      return {f,v:Infinity,m:Infinity,kind:"infinity",img:null};
    const p=meet.point;
    return {f,v:p.x,m:p.y/s.height,kind:p.x>sh.right(0)?"real":"virtual",img:p};
  }
  function scale(s,theo){
    const sh=shape(s);
    const left=Math.max(s.source==="parallel"?280:s.distance,
      Number.isFinite(theo.v)&&theo.v<0?-theo.v:0,sh.thick/2+10,70);
    const right=Math.max(Number.isFinite(theo.v)&&theo.v>0&&theo.v<680?theo.v:0,
      theo.f&&theo.f>0&&theo.f<300?theo.f:0,85);
    return Math.min(2.05,430/left,430/right);
  }
  const svgLine=(a,b,c,w=2,dash="",opacity=1,attrs="")=>
    '<line x1="'+val(a.x)+'" y1="'+val(a.y)+'" x2="'+val(b.x)+'" y2="'+val(b.y)+'" stroke="'+c+
    '" stroke-width="'+w+'" stroke-linecap="round" opacity="'+opacity+'"'+(dash?' stroke-dasharray="'+dash+'"':"")+(attrs?' '+attrs:"")+'/>';
  const svgText=(x,y,t,attr)=>'<text x="'+val(x)+'" y="'+val(y)+'" '+attr+'>'+t+'</text>';
  function draw(s,context){
    const {W,H,MX,AY,defs}=context,sh=shape(s),th=theory(s);
    const sc=scale(s,th);
    const point=p=>({x:MX+p.x*sc,y:AY-p.y*sc});
    const rel=p=>({x:p.x*sc,y:-p.y*sc});
    const rayList=Array.from({length:s.count},(_,i)=>rayAt(s,i)).filter(Boolean);
    if(!rayList.length)return {svg:defs+'<rect width="'+W+'" height="'+H+'" fill="#fff"/>',ray:null,model:th};
    const focused=rayList[clamp(s.selected,0,rayList.length-1)];
    const display=s.solo?[focused]:rayList;
    let outSvg=defs+'<rect width="'+W+'" height="'+H+'" fill="#fff"/>';
    if(s.grid)outSvg+='<rect x="16" y="22" width="968" height="493" fill="url(#grid)" opacity=".8"/>';
    outSvg+=svgLine({x:32,y:AY},{x:968,y:AY},"#b6c4d2",1.7,"9 8",.85);
    if(s.fc&&s.mirror!=="slab"){
      const f=th.f;
      for(const [v,name] of [[f,"F"],[-f,"F′"]]){
        if(!Number.isFinite(v))continue;
        const p=point({x:v,y:0});
        if(p.x>35&&p.x<965){
          outSvg+='<circle cx="'+val(p.x)+'" cy="'+val(p.y)+'" r="4.3" fill="#617992"/>'+
          svgText(p.x,AY+24,name,'font-family="Georgia,serif" text-anchor="middle" font-style="italic" font-size="16" font-weight="700" fill="#647e98"');
        }
      }
    }
    outSvg+='<g clip-path="url(#safeArea)">';
    // Refraction extensions are shown only for virtual images or diverging parallel beams.
    if(s.step>=4&&s.extension&&(th.kind==="virtual"||(s.source==="parallel"&&s.mirror==="concaveLens"))){
      for(const r of display){
        const a=point(r.P2),b=point(add(r.P2,mul(r.R,-260)));
        outSvg+=svgLine(a,b,ext,r===focused?2.1:1.7,"7 8",r===focused?.73:.38);
      }
    }
    for(const r of display){
      const vivid=r===focused,opacity=vivid?1:.50;
      const O=r.O||{x:-280,y:r.P.y-(r.P.x+280)*r.I.y/r.I.x};
      outSvg+=svgLine(point(O),point(r.P),inc,vivid?3.6:2.3,"",opacity);
      const halfway=add(O,mul(sub(r.P,O),.65)),tip=add(O,mul(sub(r.P,O),.77));
      outSvg+=svgLine(point(halfway),point(tip),inc,vivid?3.4:2.5,"",opacity,'marker-end="url(#incTip)"');
      if(s.step>=3){
        outSvg+=svgLine(point(r.P),point(r.P2),insideColor,vivid?3.7:2.2,"",opacity);
        const b=add(r.P2,mul(r.R,300));
        outSvg+=svgLine(point(r.P2),point(b),out,vivid?3.6:2.25,"",opacity);
        outSvg+=svgLine(point(add(r.P2,mul(r.R,75))),point(add(r.P2,mul(r.R,91))),out,vivid?3.5:2.4,"",opacity,'marker-end="url(#refTip)"');
      }
    }
    const left=[],right=[];
    for(let y=HALF_HEIGHT;y>=-HALF_HEIGHT;y-=1.1){
      left.push(point({x:sh.left(y),y}));
    }
    for(let y=-HALF_HEIGHT;y<=HALF_HEIGHT;y+=1.1){
      right.push(point({x:sh.right(y),y}));
    }
    const pts=left.concat(right);
    const polygon=pts.map((p,i)=>(i===0?"M":"L")+val(p.x)+" "+val(p.y)).join(" ")+"Z";
    outSvg+='<path d="'+polygon+'" fill="#b7e1f2" fill-opacity=".32" stroke="#35739d" stroke-width="3.5" stroke-linejoin="round"/>';
    // Selected entry/exit normals, short enough to avoid overprinting the beams.
    if(s.step>=2){
      const p=point(focused.P);
      outSvg+='<circle cx="'+val(p.x)+'" cy="'+val(p.y)+'" r="5" stroke="#fff" stroke-width="2" fill="'+normal+'"/>';
      if(s.normal){
        const a=point(add(focused.P,mul(focused.N,-29))),b=point(add(focused.P,mul(focused.N,29)));
        outSvg+=svgLine(a,b,normal,2.4,"6 5",.95);
        if(s.step>=3){
          const q=point(focused.P2),m=focused.N2;
          outSvg+=svgLine(point(add(focused.P2,mul(m,-29))),point(add(focused.P2,mul(m,29))),normal,2.4,"6 5",.95);
          outSvg+='<circle cx="'+val(q.x)+'" cy="'+val(q.y)+'" r="4.4" stroke="#fff" stroke-width="2" fill="'+normal+'"/>';
        }
      }
      if(s.angle){
        function arc(center,u,v,r,color){
          const a=unit(rel(u)),b=unit(rel(v));
          const cross=a.x*b.y-a.y*b.x,pa=add(center,mul(a,r)),pb=add(center,mul(b,r));
          return '<path d="M'+val(pa.x)+' '+val(pa.y)+' A'+r+' '+r+' 0 0 '+(cross>=0?1:0)+' '+val(pb.x)+' '+val(pb.y)+'" fill="none" stroke="'+color+'" stroke-width="2.2"/>';
        }
        outSvg+=arc(p,mul(focused.I,-1),mul(focused.N,-1),28,inc);
        if(s.step>=3)outSvg+=arc(p,focused.inside,focused.N,39,out);
      }
    }
    if(s.step>=5&&s.source==="point"&&th.img&&Number.isFinite(th.img.y)&&Math.abs(th.img.y)<160){
      const foot=point({x:th.img.x,y:0}),tip=point(th.img);
      if(foot.x>33&&foot.x<970&&tip.y>30&&tip.y<505){
        outSvg+=svgLine(foot,tip,imageColor,4.5,th.kind==="virtual"?"6 5":"",.96,'marker-end="url(#imgTip)"');
        outSvg+='<circle cx="'+val(tip.x)+'" cy="'+val(tip.y)+'" r="4.5" fill="'+imageColor+'"/>';
        outSvg+=svgText(tip.x+13,tip.y-11,"I",'fill="'+imageColor+'" font-family="Georgia,serif" font-style="italic" font-weight="800" font-size="18"');
      }
    }
    if(s.source==="point"){
      const foot=point({x:-s.distance,y:0}),tip=point({x:-s.distance,y:s.height});
      outSvg+=svgLine(foot,tip,"#ad7d3d",5,"",1,'marker-end="url(#objTip)"');
      outSvg+='<circle cx="'+val(tip.x)+'" cy="'+val(tip.y)+'" r="7" fill="#fff" stroke="#c38a30" stroke-width="2.6" data-drag="1"/>'+
        '<circle cx="'+val(tip.x)+'" cy="'+val(tip.y)+'" r="24" fill="transparent" data-drag="1" style="cursor:grab"/>';
      outSvg+=svgText(tip.x-15,tip.y-17,"O",'font-family="Georgia,serif" font-style="italic" text-anchor="end" fill="#a57535" font-weight="800" font-size="18"');
    }
    outSvg+='</g>';
    const title={slab:"平面透鏡（平行玻璃板）",convexLens:"凸透鏡",concaveLens:"凹透鏡"}[s.mirror];
    outSvg+=svgText(MX,AY+185,title,'text-anchor="middle" fill="#385a7e" font-size="16" font-weight="800"');
    outSvg+=svgText(35,AY-13,"主軸",'font-size="12" fill="#99a9bb"');
    return {svg:outSvg,ray:focused,model:th,rayList};
  }
  function updateResults(s,t,r,$){
    const device={slab:"平行玻璃板",convexLens:"凸透鏡",concaveLens:"凹透鏡"}[s.mirror];
    const parallel=s.source==="parallel";
    let outcome;
    if(parallel) outcome=s.mirror==="slab"?(Math.abs(s.parallelAngle||0)>0.001?"斜向平行光：出射保持平行，產生側向位移":"垂直入射：出射方向不變"):
      s.mirror==="convexLens"?"平行光折射後近軸會聚":"平行光折射後發散，反向延長線指向虛焦點";
    else outcome=s.mirror==="slab"?"經玻璃板折射後，形成略向觀察者移動的虛像":
      t.kind==="infinity"?"出射光接近平行，像在遠方":
      (t.kind==="real"?"倒立實像":"正立虛像")+
      (Math.abs(t.m)>1.04?"・放大":Math.abs(t.m)<.96?"・縮小":"・等大");
    $("sceneTitle").textContent=device+"："+outcome;
    $("stageCount").textContent=s.solo?"單線觀察":s.count+" 條光線";
    $("angleIn").textContent=r?fmt(r.angle)+"°":"—";
    $("angleOut").textContent=r?fmt(r.thetaGlass)+"°":"—";
    $("focalResult").textContent=t.f===null?"∞":fmt(t.f)+" cm";
    $("imageDistance").textContent=parallel?"—":Number.isFinite(t.v)?fmt(t.v)+" cm":"∞";
    $("imageTag").textContent=parallel?"平行光":t.kind==="infinity"?"遠方成像":t.kind==="real"?"實像":"虛像";
    $("imageDescription").textContent=outcome+(parallel?"":Number.isFinite(t.m)?"；倍率約 "+fmt(Math.abs(t.m))+" 倍。":"。");
    const headings=["","畫出入射光線","在第一介面畫法線","觀察兩次折射","延長出射光線","觀察成像位置"];
    const descr=[
      "",
      "光線先由物點或平行光束射向透鏡的第一個表面。",
      "在第一個接觸點畫法線，觀察光線與法線的夾角；曲面透鏡的法線不一定水平。",
      "光線先由空氣進入玻璃，再由玻璃射回空氣。折射方向由司乃耳定律決定。",
      "折射光線若發散，可反向延長（虛線）來找虛像；虛線不是真實光路。",
      "利用至少兩條不同路徑的出射光線判斷實像或虛像；圖中理論像點以近軸光線估計。"
    ];
    $("stepIndex").textContent=String(s.step).padStart(2,"0")+" / 05";
    $("stepHeading").textContent=headings[s.step];
    $("stepDescription").textContent=descr[s.step];
    let note="此模式以 n＝"+s.refractiveIndex.toFixed(2)+" 模擬透明材料，光線經過兩個表面，兩次都遵守 n₁ sinθ₁＝n₂ sinθ₂。";
    if(s.mirror==="slab")note+=" 平行玻璃板沒有有限焦點，不能將它視為會聚透鏡。";
    else note+=" 焦點與像的位置以近軸光線估計，邊緣光線可能出現球面像差。";
    if(s.solo)note+=" 現在只觀察一條光線；判斷像點須比較至少兩條光線。";
    if(s.step>=4&&!s.extension)note+=" 延長線已隱藏，可在左側開啟。";
    $("physicsNote").textContent=note;
    document.querySelectorAll(".step").forEach(btn=>{
      const active=Number(btn.dataset.step)===s.step;
      btn.classList.toggle("active",active);btn.setAttribute("aria-pressed",String(active));
    });
  }
  return {isLens:lensType,shape,trace,rayAt,intersection,theory,scale,draw,updateResults};
})();