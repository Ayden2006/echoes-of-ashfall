import { readFileSync, writeFileSync } from "node:fs";

const path = "app/game.tsx";
let text = readFileSync(path, "utf8");

if (text.includes('const healthLabel=dragon.health<=0?"BABY DRAGON DEFEATED"')) {
  console.log("Baby dragon fix already applied.");
  process.exit(0);
}

function replaceOnce(oldText, newText) {
  if (!text.includes(oldText)) {
    throw new Error("Expected game.tsx block was not found; refusing to apply a partial dragon fix.");
  }
  text = text.replace(oldText, newText);
}

replaceOnce(
`      if(mode==="idle"||mode==="sleep"||mode==="attack")dragon.vx*=.3;
    };
    const beginDragonTravel=(mode:"walk"|"run"|"fly",now:number,duration:number,targetX:number)=>{
      dragon.targetX=clamp(targetX,DRAGON_PATROL_MIN,DRAGON_PATROL_MAX);
      beginDragonMode(mode,now,duration);
      dragon.facing=dragon.targetX>=dragon.x?1:-1;
    };`,
`      if(mode==="idle"||mode==="sleep")dragon.vx*=.62;
      if(mode==="attack")dragon.vx*=.24;
    };
    const beginDragonTravel=(mode:"walk"|"run"|"fly",now:number,duration:number,targetX:number)=>{
      dragon.targetX=clamp(targetX,DRAGON_PATROL_MIN,DRAGON_PATROL_MAX);
      beginDragonMode(mode,now,duration);
      dragon.facing=dragon.targetX>=dragon.x?1:-1;
    };
    const dragonGroundAt=(x:number,currentY:number,facing:1|-1)=>{
      const probeX=x+facing*28;
      const surfaces=map1Platforms.filter(p=>p.h>80&&x>=p.x&&x<=p.x+p.w);
      if(!surfaces.length)return null;
      const forward=surfaces.filter(p=>probeX>=p.x&&probeX<=p.x+p.w);
      const pool=forward.length?forward:surfaces;
      return pool.reduce((best,p)=>Math.abs(p.y-currentY)<Math.abs(best.y-currentY)?p:best).y;
    };`
);

replaceOnce(
`    const updateDragon=(dt:number,now:number)=>{
      if(!startedRef.current||mapRef.current!==1)return;
      const pl=player.current;`,
`    const updateDragon=(dt:number,now:number)=>{
      if(!startedRef.current||mapRef.current!==1)return;
      const pl=player.current;
      if(dragon.health<=0){
        dragon.angry=false;
        dragon.vx+=(0-dragon.vx)*(1-Math.exp(-7*dt));
        dragon.x+=dragon.vx*dt;
        const restingGround=dragonGroundAt(dragon.x,dragon.groundY,dragon.facing);
        if(restingGround!==null)dragon.groundY+=(restingGround-dragon.groundY)*(1-Math.exp(-10*dt));
        dragon.y+=(dragon.groundY-dragon.y)*(1-Math.exp(-8*dt));
        return;
      }`
);

replaceOnce(
`          dragon.health=Math.max(1,dragon.health-activeAttackDamage.current);
          dragon.hurtStarted=now;
          dragon.hurtUntil=now+460;
          dragon.hitDirection=dragon.x>=pl.x?1:-1;
          dragon.lastDamage=activeAttackDamage.current;
          dragon.angry=true;
          dragon.awarenessUntil=now+8000;
          if(dragon.mode!=="attack")counterAttack(now);
          else dragon.facing=pl.x>=dragon.x?1:-1;
          tone(96,.09,.035);`,
`          dragon.health=Math.max(0,dragon.health-activeAttackDamage.current);
          dragon.hurtStarted=now;
          dragon.hurtUntil=now+460;
          dragon.hitDirection=dragon.x>=pl.x?1:-1;
          dragon.lastDamage=activeAttackDamage.current;
          if(dragon.health===0){
            const deathY=dragon.y;
            dragon.angry=false;
            dragon.awarenessUntil=0;
            dragon.attackLanded=true;
            beginDragonMode("sleep",now,999999999);
            dragon.y=deathY;
            dragon.vx*=.35;
            tone(72,.28,.042);window.setTimeout(()=>tone(48,.38,.03),120);
          }else{
            dragon.angry=true;
            dragon.awarenessUntil=now+8000;
            if(dragon.mode!=="attack")counterAttack(now);
            else if(playerDistance>18)dragon.facing=pl.x>=dragon.x?1:-1;
            tone(96,.09,.035);
          }`
);

replaceOnce(
`      if(dragon.mode==="attack"){
        dragon.facing=pl.x>=dragon.x?1:-1;`,
`      if(dragon.mode==="attack"){
        if(playerDistance>18)dragon.facing=pl.x>=dragon.x?1:-1;`
);

replaceOnce(
`      if(dragon.angry){
        const verticalDistance=Math.abs((pl.y+42)-(dragon.y-48));
        dragon.facing=pl.x>=dragon.x?1:-1;`,
`      if(dragon.angry){
        const verticalDistance=Math.abs((pl.y+42)-(dragon.y-48));
        if(playerDistance>18)dragon.facing=pl.x>=dragon.x?1:-1;`
);

replaceOnce(
`        const speed=dragon.mode==="walk"?34:dragon.mode==="run"?(dragon.angry?112:88):58;
        const targetSpeed=dragon.facing*(dragon.mode==="fly"&&dragon.landing?speed*.45:speed);
        dragon.vx+=(targetSpeed-dragon.vx)*Math.min(1,dt*(dragon.mode==="run"?8:4.5));dragon.x+=dragon.vx*dt;
          const movementMin=dragon.angry?DRAGON_CHASE_MIN:DRAGON_PATROL_MIN;
          const movementMax=dragon.angry?DRAGON_CHASE_MAX:DRAGON_PATROL_MAX;
          if(dragon.x<=movementMin){dragon.x=movementMin;if(dragon.angry)dragon.vx=Math.max(0,dragon.vx);else{dragon.targetX=DRAGON_PATROL_MAX;dragon.facing=1;}}
          if(dragon.x>=movementMax){dragon.x=movementMax;if(dragon.angry)dragon.vx=Math.min(0,dragon.vx);else{dragon.targetX=DRAGON_PATROL_MIN;dragon.facing=-1;}}
          if(dragon.angry&&dragon.mode!=="fly"){
            const surfaces=map1Platforms.filter(p=>p.h>80&&dragon.x>=p.x&&dragon.x<=p.x+p.w);
            if(surfaces.length){
              const surface=surfaces.reduce((best,p)=>Math.abs(p.y-dragon.groundY)<Math.abs(best.y-dragon.groundY)?p:best);
              dragon.groundY+=(surface.y-dragon.groundY)*Math.min(1,dt*10);
            }
          }
        const targetY=dragon.mode==="fly"?(dragon.landing?dragon.groundY-45:dragon.groundY-118+Math.sin(now*.0045)*11):dragon.groundY;
          if(dragon.mode==="fly")dragon.y+=(targetY-dragon.y)*Math.min(1,dt*4.6);
          else dragon.y=dragon.groundY;`,
`        const movementMin=dragon.angry?DRAGON_CHASE_MIN:DRAGON_PATROL_MIN;
        const movementMax=dragon.angry?DRAGON_CHASE_MAX:DRAGON_PATROL_MAX;
        const probeX=dragon.x+dragon.facing*48;
        const raisedLedgeAhead=dragon.mode!=="fly"&&Math.abs(distanceToTarget)>42&&map1Platforms.some(p=>p.h<=24&&probeX>=p.x-18&&probeX<=p.x+p.w+18&&p.y<dragon.groundY-34);
        if(raisedLedgeAhead){
          dragon.targetX=clamp(dragon.x+dragon.facing*210,movementMin,movementMax);
          beginDragonMode("fly",now,1050);
          return;
        }
        const speed=dragon.mode==="walk"?34:dragon.mode==="run"?(dragon.angry?112:88):58;
        const targetSpeed=dragon.facing*(dragon.mode==="fly"&&dragon.landing?speed*.45:speed);
        const moveRate=dragon.mode==="run"?(dragon.angry?5.6:5):3.8;
        dragon.vx+=(targetSpeed-dragon.vx)*(1-Math.exp(-moveRate*dt));dragon.x+=dragon.vx*dt;
          if(dragon.x<=movementMin){dragon.x=movementMin;if(dragon.angry)dragon.vx=Math.max(0,dragon.vx);else{dragon.targetX=DRAGON_PATROL_MAX;dragon.facing=1;}}
          if(dragon.x>=movementMax){dragon.x=movementMax;if(dragon.angry)dragon.vx=Math.min(0,dragon.vx);else{dragon.targetX=DRAGON_PATROL_MIN;dragon.facing=-1;}}
          if(dragon.mode!=="fly"){
            const surfaceY=dragonGroundAt(dragon.x,dragon.groundY,dragon.facing);
            if(surfaceY!==null)dragon.groundY+=(surfaceY-dragon.groundY)*(1-Math.exp(-11*dt));
          }
        const targetY=dragon.mode==="fly"?(dragon.landing?dragon.groundY-45:dragon.groundY-118+Math.sin(now*.0045)*11):dragon.groundY;
          dragon.y+=(targetY-dragon.y)*(1-Math.exp(-(dragon.mode==="fly"?4.6:13)*dt));`
);

replaceOnce(
`      const healthLabel=(dragon.angry?"ANGRY  ":"")+"BABY DRAGON  "+dragon.health+" / "+dragon.maxHealth;`,
`      const healthLabel=dragon.health<=0?"BABY DRAGON DEFEATED":(dragon.angry?"ANGRY  ":"")+"BABY DRAGON  "+dragon.health+" / "+dragon.maxHealth;`
);

writeFileSync(path, text);
console.log("Applied baby dragon ledge, smoothing, and death fixes.");
