import { readFileSync, writeFileSync } from "node:fs";

const path = "app/game.tsx";
let text = readFileSync(path, "utf8");

if (text.includes("const companionGestureRef = useRef")) {
  console.log("Moon Knight companion gesture already applied.");
  process.exit(0);
}

// The companion deploy/recall animation has since been reimplemented directly in
// app/game.tsx as `companionCastRef` (a superset of this legacy patch). When that
// evolved implementation is present, this one-time generation step is a no-op and
// must not try to re-apply the obsolete source blocks.
if (text.includes("const companionCastRef = useRef")) {
  console.log("Moon Knight companion cast animation already present; skipping legacy patch.");
  process.exit(0);
}

function replaceOnce(oldText, newText) {
  if (!text.includes(oldText)) {
    throw new Error("Expected Echoes of Ashfall source block was not found; refusing to apply a partial Moon Knight animation patch.");
  }
  text = text.replace(oldText, newText);
}

replaceOnce(
`  const deployQueued = useRef(false);`,
`  const deployQueued = useRef(false);
  const companionGestureRef = useRef<{startedAt:number;kind:"summon"|"recall"}>({startedAt:0,kind:"summon"});`
);

replaceOnce(
`      if(ally.active&&ally.itemId===itemId&&ally.recallStarted===0){ally.recallStarted=performance.now();ally.attackUntil=0;ally.vx=0;}`,
`      if(ally.active&&ally.itemId===itemId&&ally.recallStarted===0){const now=performance.now();companionGestureRef.current={startedAt:now,kind:"recall"};ally.recallStarted=now;ally.attackUntil=0;ally.vx=0;}`
);

replaceOnce(
`    const drawPlayer=(pl:Player,now:number)=>{
      ctx.save();ctx.translate(pl.x,pl.y);ctx.scale(pl.facing,1);`,
`    const drawPlayer=(pl:Player,now:number)=>{
      const gesture=companionGestureRef.current;
      const gestureDuration=gesture.kind==="recall"?780:720;
      const gestureProgress=gesture.startedAt>0?clamp((now-gesture.startedAt)/gestureDuration,0,1):1;
      const gesturing=gesture.startedAt>0&&gestureProgress<1;
      const gesturePeak=gesturing?Math.sin(gestureProgress*Math.PI):0;
      const gestureSnap=gesturing?Math.sin(clamp(gestureProgress/.42,0,1)*Math.PI):0;
      ctx.save();ctx.translate(pl.x,pl.y-gesturePeak*3);ctx.rotate(pl.facing*(gesture.kind==="recall"?-.045:.045)*gestureSnap);ctx.scale(pl.facing,1);`
);

replaceOnce(
`      const attacking=actionUntil.current>now;
      if(attacking){list=SPRITE_FRAMES.action;index=1;}`,
`      const attacking=actionUntil.current>now;
      if(gesturing){list=SPRITE_FRAMES.idle;index=gestureProgress<.48?1:0;}
      else if(attacking){list=SPRITE_FRAMES.action;index=1;}`
);

replaceOnce(
`      }
      ctx.restore();
      drawActualAttackArm(pl,now);
    };`,
`      }
      if(gesturing){
        const ritualColor=gesture.kind==="recall"?"#d8a7ff":"#b7ff56";
        const handX=31,handY=43;
        ctx.save();ctx.globalCompositeOperation="screen";ctx.globalAlpha=.9*gesturePeak;
        const handGlow=ctx.createRadialGradient(handX,handY,1,handX,handY,31+gesturePeak*13);
        handGlow.addColorStop(0,"rgba(255,255,255,.88)");
        handGlow.addColorStop(.2,gesture.kind==="recall"?"rgba(216,167,255,.72)":"rgba(183,255,86,.72)");
        handGlow.addColorStop(1,"rgba(120,70,220,0)");
        ctx.fillStyle=handGlow;ctx.fillRect(handX-48,handY-48,96,96);
        ctx.strokeStyle=ritualColor;ctx.shadowColor=ritualColor;ctx.shadowBlur=14;ctx.lineWidth=1.8;
        for(let ring=0;ring<2;ring++){
          const spin=(gesture.kind==="recall"?-1:1)*(now*.006+ring*1.4);
          const radius=12+ring*8+gesturePeak*5;
          ctx.beginPath();ctx.ellipse(handX,handY,radius,radius*.38,spin,0,Math.PI*2);ctx.stroke();
        }
        ctx.shadowBlur=0;
        for(let mote=0;mote<9;mote++){
          const angle=mote*Math.PI*2/9+(gesture.kind==="recall"?-1:1)*now*.004;
          const radius=14+gesturePeak*24+(mote%3)*4;
          ctx.fillStyle=mote%3===0?"#ffffff":ritualColor;
          ctx.globalAlpha=(.35+.65*gesturePeak)*(1-mote*.035);
          ctx.beginPath();ctx.arc(handX+Math.cos(angle)*radius,handY+Math.sin(angle)*radius*.58,1+(mote%2)*.65,0,Math.PI*2);ctx.fill();
        }
        ctx.globalAlpha=.6*gesturePeak;ctx.strokeStyle=ritualColor;ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,PH+2,27+gesturePeak*8,5+gesturePeak*2,0,0,Math.PI*2);ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      if(!gesturing)drawActualAttackArm(pl,now);
    };`
);

replaceOnce(
`            if(ally.recallStarted===0){ally.recallStarted=now;ally.attackUntil=0;ally.vx=0;tone(470,.16,.022);window.setTimeout(()=>tone(280,.22,.024),180);window.setTimeout(()=>tone(135,.34,.022),610);}`,
`            if(ally.recallStarted===0){companionGestureRef.current={startedAt:now,kind:"recall"};ally.recallStarted=now;ally.attackUntil=0;ally.vx=0;tone(470,.16,.022);window.setTimeout(()=>tone(280,.22,.024),180);window.setTimeout(()=>tone(135,.34,.022),610);}`
);

replaceOnce(
`            const summonGround=companionSurfaceAt(summonX,pl.y+PH,map)??pl.y+PH;
            ally.active=true;`,
`            const summonGround=companionSurfaceAt(summonX,pl.y+PH,map)??pl.y+PH;
            companionGestureRef.current={startedAt:now,kind:"summon"};
            ally.active=true;`
);

writeFileSync(path, text);
console.log("Applied Moon Knight companion deploy/recall gesture animation.");
// Triggered from chat to persist the animation into app/game.tsx on main.
