"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, Volume2, VolumeX } from "lucide-react";

type Line = { speaker: string; text: string };
type MapId = 1|2;
type Player = { x:number; y:number; vx:number; vy:number; grounded:boolean; facing:1|-1; step:number; jumpsLeft:number; crouched:boolean; sliding:boolean; health:number; maxHealth:number; swordDamage:number };
type Platform = { x:number; y:number; w:number; h:number };
type DragonMode = "idle"|"walk"|"run"|"fly"|"sleep"|"attack";
type Dragon = { x:number; y:number; groundY:number; vx:number; facing:1|-1; mode:DragonMode; modeStarted:number; modeUntil:number; health:number; maxHealth:number; attackDamage:number; lastPlayerAttack:number; attackLanded:boolean; hurtStarted:number; hurtUntil:number; hitDirection:1|-1; lastDamage:number; angry:boolean; landing:boolean; targetX:number; awarenessUntil:number };
type DragonFrame = { x:number; y:number; w:number; h:number; anchorX:number; anchorY:number };

const MAP1_W = 5200;
const MAP2_W = 3600;
const WORLD_H = 720;
const PW = 46;
const PH = 92;
const STEP_HEIGHT = 32;
const MAP1_PORTAL_X = 5070;
const MAP2_PORTAL_X = 105;
const MAX_HEALTH = 100;
const SWORD_DAMAGE = 15;
const PLAYER_NAME = "Moon Night";
const DRAGON_MAX_HEALTH = 150;
const DRAGON_ATTACK_DAMAGE = 10;
const DRAGON_RENDER_SIZE = 138;
const DRAGON_SIGHT_RANGE = 720;
const DRAGON_ATTACK_RANGE = 135;
const DRAGON_CHASE_MIN = 1100;
const DRAGON_CHASE_MAX = 2700;
const DRAGON_PATROL_MIN = 1475;
const DRAGON_PATROL_MAX = 1990;
const DRAGON_CELL = 256;
const DRAGON_FRAMES:Record<DragonMode,DragonFrame[]> = {
  idle:[
    {x:256,y:25,w:256,h:260,anchorX:128,anchorY:260},{x:512,y:25,w:256,h:258,anchorX:128,anchorY:258},
    {x:0,y:1260,w:256,h:198,anchorX:128,anchorY:198},{x:256,y:1260,w:256,h:198,anchorX:128,anchorY:198}
  ],
  walk:[
    {x:0,y:330,w:256,h:194,anchorX:128,anchorY:194},{x:256,y:330,w:256,h:194,anchorX:128,anchorY:194},
    {x:512,y:330,w:256,h:195,anchorX:128,anchorY:195},{x:768,y:330,w:256,h:194,anchorX:128,anchorY:194}
  ],
  run:[
    {x:0,y:330,w:256,h:194,anchorX:128,anchorY:194},{x:256,y:330,w:256,h:194,anchorX:128,anchorY:194},
    {x:512,y:330,w:256,h:195,anchorX:128,anchorY:195},{x:768,y:330,w:256,h:194,anchorX:128,anchorY:194}
  ],
  fly:[
    {x:0,y:570,w:256,h:190,anchorX:128,anchorY:112},{x:256,y:570,w:256,h:190,anchorX:128,anchorY:112},
    {x:512,y:570,w:256,h:190,anchorX:128,anchorY:112},{x:768,y:570,w:256,h:190,anchorX:128,anchorY:112}
  ],
  sleep:[
    {x:0,y:1040,w:256,h:180,anchorX:128,anchorY:180},{x:256,y:1040,w:256,h:182,anchorX:128,anchorY:182},
    {x:512,y:1260,w:256,h:201,anchorX:128,anchorY:201},{x:768,y:1260,w:256,h:202,anchorX:128,anchorY:202}
  ],
  attack:[
    {x:0,y:820,w:256,h:187,anchorX:112,anchorY:105},{x:256,y:820,w:256,h:187,anchorX:96,anchorY:106},
    {x:512,y:820,w:256,h:191,anchorX:96,anchorY:112},{x:768,y:820,w:256,h:193,anchorX:96,anchorY:120}
  ]
};
const ATTACK_WEAPON = {x:805,y:1115,w:213,h:62,anchorX:820,anchorY:1146};
const SPRITE_BOTTOM_PADDING:Record<string,number> = {
  "395:65":7,"45:55":18,
  "18:395":33,"270:400":35,"510:395":35,"750:400":33,"28:710":36,"335:710":41,
  "620:690":24,"650:985":51
};
const spriteBottomPadding = (f:{x:number;y:number}) => SPRITE_BOTTOM_PADDING[f.x+":"+f.y]??0;
const SPRITE_FRAMES = {
  idle: [{x:395,y:65,w:235,h:305},{x:45,y:55,w:255,h:325}],
  run: [
    {x:18,y:395,w:255,h:310},{x:270,y:400,w:240,h:310},
    {x:510,y:395,w:235,h:315},{x:750,y:400,w:225,h:310},
    {x:28,y:710,w:275,h:295},{x:335,y:710,w:265,h:300}
  ],
  jump: [{x:620,y:690,w:275,h:270}],
  crouch: [{x:18,y:395,w:255,h:310}],
  slide: [{x:28,y:710,w:275,h:295}],
  action: [{x:330,y:990,w:325,h:280},{x:650,y:985,w:365,h:285}]
};
const map1Platforms: Platform[] = [
  {x:0,y:590,w:782,h:180},{x:758,y:610,w:644,h:160},{x:1378,y:570,w:664,h:200},
  {x:2018,y:600,w:544,h:170},{x:2538,y:550,w:594,h:220},{x:3108,y:590,w:564,h:180},
  {x:3648,y:535,w:534,h:235},{x:4158,y:575,w:1042,h:195},
  {x:1020,y:475,w:170,h:18},{x:2260,y:470,w:160,h:18},{x:3320,y:455,w:180,h:18}
];
const map2Platforms: Platform[] = [{x:0,y:590,w:MAP2_W,h:180}];
const tower: Line[] = [
  {speaker:"Radio",text:"Don't climb the tower. The portal waits at the far edge of this world."},
  {speaker:"Mara",text:"You know I'm here. Tell me who you are."},
  {speaker:"Radio",text:"I think you already know."}
];
const clamp = (n:number,a:number,b:number) => Math.max(a,Math.min(b,n));
const worldWidthFor = (map:MapId) => map===1?MAP1_W:MAP2_W;
const platformsFor = (map:MapId) => map===1?map1Platforms:map2Platforms;

export default function AshfallGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keys = useRef<Record<string,boolean>>({});
  const jumpQueued = useRef(false);
  const slideQueued = useRef(false);
  const slideUntil = useRef(0);
  const mapRef = useRef<MapId>(1);
  const cameraReset = useRef(false);
  const portalFlashUntil = useRef(0);
  const cameraXRef = useRef(0);
  const renderScaleRef = useRef(1);
  const pointerAim = useRef({x:960,y:300,active:false});
  const aimAngle = useRef(0);
  const attackAngle = useRef(0);
  const activeAttackDamage = useRef(0);
  const player = useRef<Player>({x:230,y:498,vx:0,vy:0,grounded:true,facing:1,step:0,jumpsLeft:2,crouched:false,sliding:false,health:MAX_HEALTH,maxHealth:MAX_HEALTH,swordDamage:SWORD_DAMAGE});
  const startedRef = useRef(false);
  const dialogueRef = useRef<Line[]|null>(null);
  const dialogueIndexRef = useRef(0);
  const triggered = useRef(new Set<string>());
  const actionUntil = useRef(0);
  const actionStartedAt = useRef(0);
  const audioRef = useRef<AudioContext|null>(null);
  const soundRef = useRef(true);
  const [started,setStarted] = useState(false);
  const [mapNumber,setMapNumber] = useState<MapId>(1);
  const [dialogue,setDialogue] = useState<Line[]|null>(null);
  const [dialogueIndex,setDialogueIndex] = useState(0);
  const [nearAction,setNearAction] = useState<string|null>(null);
  const [objective,setObjective] = useState("Follow the signal toward the old bell tower");
  const [soundOn,setSoundOn] = useState(true);
  const [health,setHealth] = useState(MAX_HEALTH);

  const tone = useCallback((freq:number,duration=.12,volume=.024) => {
    const audio = audioRef.current;
    if (!audio || !soundRef.current) return;
    const osc=audio.createOscillator(), gain=audio.createGain();
    osc.type="sine"; osc.frequency.setValueAtTime(freq,audio.currentTime);
    gain.gain.setValueAtTime(volume,audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);
    osc.connect(gain).connect(audio.destination); osc.start(); osc.stop(audio.currentTime+duration);
  },[]);

  const beginDialogue = useCallback((lines:Line[]) => {
    dialogueRef.current=lines; dialogueIndexRef.current=0;
    setDialogue(lines); setDialogueIndex(0); tone(420,.18,.02);
  },[tone]);

  const advanceDialogue = useCallback(() => {
    const lines=dialogueRef.current;
    if (!lines) return;
    const next=dialogueIndexRef.current+1;
    if (next>=lines.length) { dialogueRef.current=null; setDialogue(null); return; }
    dialogueIndexRef.current=next; setDialogueIndex(next); tone(470+next*35,.12,.016);
  },[tone]);

  const enterMap = useCallback((map:MapId) => {
    mapRef.current=map;setMapNumber(map);
    dialogueRef.current=null;setDialogue(null);
    const pl=player.current;
    if(map===2){
      pl.x=340;pl.y=498;pl.facing=1;
      setObjective("Explore the sunset shore or return through the portal");
    }else{
      pl.x=4860;pl.y=483;pl.facing=-1;
      setObjective("Explore Map 1 or return to the far-right portal");
    }
    pl.vx=0;pl.vy=0;pl.grounded=true;pl.jumpsLeft=2;pl.crouched=false;pl.sliding=false;
    slideUntil.current=0;actionUntil.current=0;cameraReset.current=true;
    portalFlashUntil.current=performance.now()+430;
    tone(610,.25,.028);window.setTimeout(()=>tone(360,.2,.02),100);
  },[tone]);

  const startGame = useCallback(() => {
    if (!audioRef.current) audioRef.current=new AudioContext();
    audioRef.current.resume();
    startedRef.current=true; setStarted(true);
  },[]);

  const interact = useCallback(() => {
    if (dialogueRef.current) { advanceDialogue(); return; }
    const x=player.current.x;
    const map=mapRef.current;
    if (map===1&&Math.abs(x-3850)<155&&!triggered.current.has("tower")) {
      triggered.current.add("tower"); beginDialogue(tower); setObjective("Reach the portal at the far right of Map 1");
    }else if(map===1&&Math.abs(x-(MAP1_PORTAL_X+55))<145){
      enterMap(2);
    }else if(map===2&&Math.abs(x-(MAP2_PORTAL_X+55))<145){
      enterMap(1);
    }
  },[advanceDialogue,beginDialogue,enterMap]);

  const updateAim = useCallback((clientX:number,clientY:number) => {
    const canvas=canvasRef.current;
    if(!canvas)return;
    const rect=canvas.getBoundingClientRect();
    const localX=clamp(clientX-rect.left,0,rect.width),localY=clamp(clientY-rect.top,0,rect.height);
    pointerAim.current={x:localX,y:localY,active:true};
    const scale=Math.max(.001,renderScaleRef.current),pl=player.current;
    const worldX=cameraXRef.current+localX/scale,worldY=localY/scale;
    aimAngle.current=Math.atan2(worldY-(pl.y+34),worldX-pl.x);
  },[]);

  const attack = useCallback(() => {
    if (!startedRef.current||dialogueRef.current) return;
    const now=performance.now();
    attackAngle.current=aimAngle.current;
    activeAttackDamage.current=player.current.swordDamage;
    player.current.facing=Math.cos(attackAngle.current)>=0?1:-1;
    actionStartedAt.current=now;actionUntil.current=now+360;
    tone(145,.1,.025);window.setTimeout(()=>tone(235,.08,.018),95);
  },[tone]);

  useEffect(()=>{
    const down=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase(); keys.current[k]=true;
      if (["arrowleft","arrowright","arrowup","arrowdown"," "].includes(k)) e.preventDefault();
      if (!startedRef.current && (k==="enter"||k===" ")) startGame();
      else if (dialogueRef.current && (k==="enter"||k===" "||k==="e")&&!e.repeat) advanceDialogue();
      else {
        if ((k==="w"||k==="arrowup"||k===" ")&&!e.repeat) jumpQueued.current=true;
        if ((k==="s"||k==="arrowdown")&&!e.repeat) slideQueued.current=true;
        if (k==="e"&&!e.repeat) interact();
      }
    };
    const up=(e:KeyboardEvent)=>{ keys.current[e.key.toLowerCase()]=false; };
    const aim=(e:PointerEvent)=>updateAim(e.clientX,e.clientY);
    window.addEventListener("keydown",down,{passive:false}); window.addEventListener("keyup",up);
    window.addEventListener("pointermove",aim,{passive:true});
    return()=>{window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);window.removeEventListener("pointermove",aim);};
  },[advanceDialogue,interact,startGame,updateAim]);

  useEffect(()=>{
    const canvas=canvasRef.current, ctx=canvas?.getContext("2d");
    if (!canvas||!ctx) return;
    let raf=0,last=performance.now(),cameraX=0,lastAction="",lastHealth=player.current.health;
    const backdrop=new Image(); backdrop.src="/pixel-castle-night.png";
    const beachBackdrop=new Image(); beachBackdrop.src="/map2-sunset-beach.png";
    const knight=new Image(); knight.src="/knight-sprite-sheet.png";
    const dragonImage=new Image(); dragonImage.src="/baby-dragon-sprite-sheet.png";
    const dragon:Dragon={x:1710,y:570,groundY:570,vx:0,facing:1,mode:"idle",modeStarted:last,modeUntil:last+2800,health:DRAGON_MAX_HEALTH,maxHealth:DRAGON_MAX_HEALTH,attackDamage:DRAGON_ATTACK_DAMAGE,lastPlayerAttack:-1,attackLanded:false,hurtStarted:0,hurtUntil:0,hitDirection:1,lastDamage:0,angry:false,landing:false,targetX:1840,awarenessUntil:0};
    let playerHurtUntil=0,playerRespawnAt=0;
    const eyeLayer=document.createElement("canvas"),eyeLayerCtx=eyeLayer.getContext("2d");
    const eyeCoverLayer=document.createElement("canvas"),eyeCoverCtx=eyeCoverLayer.getContext("2d");
    const attackBodyLayer=document.createElement("canvas"),attackBodyCtx=attackBodyLayer.getContext("2d");
    const attackWeaponLayer=document.createElement("canvas"),attackWeaponCtx=attackWeaponLayer.getContext("2d");
    const eyeBands=new Map<string,{x:number;y:number;w:number;h:number}|null>();
    let eyePixels:Uint8ClampedArray|null=null;
    const prepareActualEyes=()=>{
      if(!eyeLayerCtx||!eyeCoverCtx||!attackBodyCtx||!attackWeaponCtx||!knight.naturalWidth)return;
      eyeLayer.width=knight.naturalWidth;eyeLayer.height=knight.naturalHeight;eyeCoverLayer.width=knight.naturalWidth;eyeCoverLayer.height=knight.naturalHeight;
      eyeLayerCtx.clearRect(0,0,eyeLayer.width,eyeLayer.height);eyeLayerCtx.drawImage(knight,0,0);
      const pixels=eyeLayerCtx.getImageData(0,0,eyeLayer.width,eyeLayer.height),data=pixels.data;
      const covers=eyeCoverCtx.createImageData(eyeLayer.width,eyeLayer.height),coverData=covers.data;
      for(let i=0;i<data.length;i+=4){
        const keep=data[i]>165&&data[i+1]>100&&data[i+2]<115&&data[i]-data[i+1]<135;
        if(keep){coverData[i]=18;coverData[i+1]=12;coverData[i+2]=26;coverData[i+3]=data[i+3];}
        else data[i+3]=0;
      }
      eyeLayerCtx.putImageData(pixels,0,0);eyeCoverCtx.putImageData(covers,0,0);eyePixels=data;eyeBands.clear();

      attackBodyLayer.width=knight.naturalWidth;attackBodyLayer.height=knight.naturalHeight;attackWeaponLayer.width=knight.naturalWidth;attackWeaponLayer.height=knight.naturalHeight;
      attackBodyCtx.clearRect(0,0,attackBodyLayer.width,attackBodyLayer.height);attackBodyCtx.drawImage(knight,0,0);
      attackBodyCtx.globalCompositeOperation="destination-out";attackBodyCtx.beginPath();attackBodyCtx.moveTo(805,1125);attackBodyCtx.lineTo(840,1118);attackBodyCtx.lineTo(1018,1118);attackBodyCtx.lineTo(1018,1177);attackBodyCtx.lineTo(840,1177);attackBodyCtx.lineTo(805,1159);attackBodyCtx.closePath();attackBodyCtx.fill();attackBodyCtx.globalCompositeOperation="source-over";
      attackWeaponCtx.clearRect(0,0,attackWeaponLayer.width,attackWeaponLayer.height);attackWeaponCtx.save();attackWeaponCtx.beginPath();attackWeaponCtx.moveTo(805,1125);attackWeaponCtx.lineTo(840,1118);attackWeaponCtx.lineTo(1018,1118);attackWeaponCtx.lineTo(1018,1177);attackWeaponCtx.lineTo(840,1177);attackWeaponCtx.lineTo(805,1159);attackWeaponCtx.closePath();attackWeaponCtx.clip();attackWeaponCtx.drawImage(knight,0,0);attackWeaponCtx.restore();
    };
    knight.addEventListener("load",prepareActualEyes);
    if(knight.complete&&knight.naturalWidth)prepareActualEyes();
    const pixelLayer=document.createElement("canvas");
    const pixelCtx=pixelLayer.getContext("2d");
    const rain=Array.from({length:115},(_,i)=>({x:(i*157)%1500,y:(i*83)%800,l:8+(i%5)*3,s:7+(i%7)}));
    const stars=Array.from({length:48},(_,i)=>({x:(i*193)%1600,y:22+(i*71)%285,p:i*.61,r:i%9===0?1.7:1}));
    const motes=Array.from({length:20},(_,i)=>({x:1300+(i*509)%3600,y:290+(i*71)%210,p:i*.7}));
    const leaves=Array.from({length:18},(_,i)=>({x:(i*311)%1600,y:120+(i*97)%460,p:i*.83,s:18+(i%5)*5}));
    const resize=()=>{
      const dpr=Math.min(window.devicePixelRatio||1,2);
      canvas.width=Math.floor(canvas.clientWidth*dpr); canvas.height=Math.floor(canvas.clientHeight*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);
    };
    resize(); window.addEventListener("resize",resize);

    const groundAt=(x:number,bottom:number)=>{
      let best=Infinity;
      for (const p of platformsFor(mapRef.current)) {
        const overlaps=x+PW*.5>p.x&&x-PW*.5<p.x+p.w;
        const reachable=p.y>=bottom-STEP_HEIGHT&&bottom<=p.y+STEP_HEIGHT;
        if (overlaps&&reachable&&p.y<best) best=p.y;
      }
      return best;
    };
    const drawBackdrop=(w:number,h:number,now:number,map:MapId)=>{
      const activeBackdrop=map===1?backdrop:beachBackdrop;
      const g=ctx.createLinearGradient(0,0,0,h);
      if(map===1){g.addColorStop(0,"#030710");g.addColorStop(.56,"#0b1428");g.addColorStop(1,"#070811");}
      else{g.addColorStop(0,"#4b5288");g.addColorStop(.48,"#ed766b");g.addColorStop(1,"#c36f49");}
      ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
      if (activeBackdrop.complete&&activeBackdrop.naturalWidth) {
        const cover=Math.max(w/activeBackdrop.naturalWidth,h/activeBackdrop.naturalHeight);
        const breathe=(map===1?1.12:1.06)+Math.sin(now*.00008)*.006;
        const iw=activeBackdrop.naturalWidth*cover*breathe, ih=activeBackdrop.naturalHeight*cover*breathe;
        const drift=-(cameraX/Math.max(1,worldWidthFor(map)))*Math.max(0,iw-w);
        const pxW=Math.max(320,Math.ceil(w/3)),pxH=Math.max(180,Math.ceil(h/3));
        if(pixelLayer.width!==pxW||pixelLayer.height!==pxH){pixelLayer.width=pxW;pixelLayer.height=pxH;}
        if(pixelCtx){
          pixelCtx.clearRect(0,0,pxW,pxH);pixelCtx.imageSmoothingEnabled=false;
          pixelCtx.filter=map===1?"saturate(.58) hue-rotate(-34deg) brightness(.8) contrast(1.1)":"saturate(.94) contrast(1.04)";
          pixelCtx.drawImage(activeBackdrop,drift/3,(h-ih)*(map===1?.62:.52)/3,iw/3,ih/3);
          pixelCtx.filter="none";
          if(map===1){pixelCtx.globalCompositeOperation="source-atop";pixelCtx.fillStyle="rgba(6,20,39,.24)";pixelCtx.fillRect(0,0,pxW,pxH);pixelCtx.globalCompositeOperation="source-over";}
          ctx.imageSmoothingEnabled=false;ctx.globalAlpha=.95;ctx.drawImage(pixelLayer,0,0,w,h);ctx.globalAlpha=1;ctx.imageSmoothingEnabled=true;
        }
      }
      if(map===1){
        for(const star of stars){
          const alpha=.12+Math.max(0,Math.sin(now*.0018+star.p))*.48;
          ctx.fillStyle="rgba(224,222,255,"+alpha+")";ctx.fillRect(star.x%(w+20),star.y,star.r,star.r);
        }
        ctx.save();
        for(let i=0;i<5;i++){
          const cx=((now*.006*(i+1)+i*w*.31)%(w+520))-260;
          const cy=h*(.11+i*.055);
          const cloud=ctx.createRadialGradient(cx,cy,10,cx,cy,230+i*35);
          cloud.addColorStop(0,"rgba(3,7,17,.24)");cloud.addColorStop(1,"rgba(3,7,17,0)");
          ctx.fillStyle=cloud;ctx.fillRect(cx-330,cy-180,660,360);
        }
        for(let i=0;i<3;i++){
          const fy=h*(.52+i*.105)+Math.sin(now*.00035+i)*12;
          const fx=((now*(.007+i*.003)+i*420)%(w+700))-350;
          const fog=ctx.createRadialGradient(fx,fy,20,fx,fy,330+i*80);
          fog.addColorStop(0,"rgba(128,151,176,"+(.085-i*.015)+")");fog.addColorStop(1,"rgba(128,151,176,0)");
          ctx.fillStyle=fog;ctx.fillRect(fx-500,fy-115,1000,230);ctx.fillRect(fx+w*.75-500,fy-115,1000,230);
        }
        ctx.restore();
        const storm=(now%17000);
        if(storm>15600&&storm<15830){const flash=Math.sin((storm-15600)/230*Math.PI)*.055;ctx.fillStyle="rgba(190,204,226,"+flash+")";ctx.fillRect(0,0,w,h);}
      }else{
        for(let i=0;i<18;i++){
          const waveY=h*(.55+(i%4)*.037),waveX=((i*173+now*.015*(1+i%3))%(w+180))-90;
          const sparkle=.16+Math.max(0,Math.sin(now*.003+i))* .38;
          ctx.fillStyle="rgba(255,226,154,"+sparkle+")";ctx.fillRect(waveX,waveY,8+(i%4)*5,2);
        }
        const warmth=ctx.createLinearGradient(0,h*.58,0,h);
        warmth.addColorStop(0,"rgba(255,190,102,0)");warmth.addColorStop(1,"rgba(153,75,47,.14)");
        ctx.fillStyle=warmth;ctx.fillRect(0,h*.58,w,h*.42);
      }
    };
    const findActualEyeBand=(f:{x:number;y:number;w:number;h:number})=>{
      const key=f.x+":"+f.y;
      if(eyeBands.has(key))return eyeBands.get(key)??null;
      if(!eyePixels||!eyeLayer.width)return null;
      const minScanX=Math.floor(f.x+f.w*.42),maxScanX=Math.floor(f.x+f.w*((f.x===650&&f.y===985)?.64:.84));
      const minScanY=Math.floor(f.y+f.h*.32),maxScanY=Math.floor(f.y+f.h*.53);
      let minX=maxScanX,minY=maxScanY,maxX=minScanX,maxY=minScanY,found=false;
      for(let sy=minScanY;sy<=maxScanY;sy++)for(let sx=minScanX;sx<=maxScanX;sx++){
        if(eyePixels[(sy*eyeLayer.width+sx)*4+3]>0){found=true;minX=Math.min(minX,sx);minY=Math.min(minY,sy);maxX=Math.max(maxX,sx);maxY=Math.max(maxY,sy);}
      }
      const band=found?{x:Math.max(f.x,minX-2),y:Math.max(f.y,minY-2),w:maxX-minX+5,h:maxY-minY+5}:null;
      eyeBands.set(key,band);return band;
    };
    const drawActualAttackArm=(pl:Player,now:number)=>{
      if(actionUntil.current<=now||!knight.complete||!knight.naturalWidth||!attackWeaponLayer.width)return;
      const progress=clamp((now-actionStartedAt.current)/360,0,1),facing=Math.cos(attackAngle.current)>=0?1:-1;
      const swingIn=1-clamp(progress/.62,0,1),swordAngle=attackAngle.current-swingIn*.48*facing;
      const actionFrame=SPRITE_FRAMES.action[1],weaponScale=130/actionFrame.h,fullWidth=actionFrame.w/actionFrame.h*130;
      const anchorLocalX=-fullWidth/2+(ATTACK_WEAPON.anchorX-actionFrame.x)*weaponScale;
      const actionDrawY=PH-(actionFrame.h-spriteBottomPadding(actionFrame))*weaponScale;
      const anchorLocalY=actionDrawY+(ATTACK_WEAPON.anchorY-actionFrame.y)*weaponScale;
      ctx.save();ctx.translate(pl.x+pl.facing*anchorLocalX,pl.y+anchorLocalY);ctx.rotate(swordAngle);ctx.scale(1,pl.facing);
      ctx.imageSmoothingEnabled=false;ctx.shadowColor="rgba(135,62,198,.3)";ctx.shadowBlur=7;
      ctx.drawImage(attackWeaponLayer,ATTACK_WEAPON.x,ATTACK_WEAPON.y,ATTACK_WEAPON.w,ATTACK_WEAPON.h,-(ATTACK_WEAPON.anchorX-ATTACK_WEAPON.x)*weaponScale,-(ATTACK_WEAPON.anchorY-ATTACK_WEAPON.y)*weaponScale,ATTACK_WEAPON.w*weaponScale,ATTACK_WEAPON.h*weaponScale);
      ctx.shadowBlur=0;ctx.imageSmoothingEnabled=true;ctx.restore();
    };
    const drawPlayer=(pl:Player,now:number)=>{
      ctx.save();ctx.translate(pl.x,pl.y);ctx.scale(pl.facing,1);
      if(pl.grounded){
        ctx.fillStyle="rgba(1,2,4,.72)";ctx.beginPath();ctx.ellipse(0,PH+1,31,7,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=mapRef.current===1?"rgba(179,158,235,.3)":"rgba(255,215,139,.36)";ctx.fillRect(-20,PH-1,40,2);
      }
      let list=SPRITE_FRAMES.idle;
      let index=Math.floor(now/620)%list.length;
      const attacking=actionUntil.current>now;
      if(attacking){list=SPRITE_FRAMES.action;index=1;}
      else if(!pl.grounded){list=SPRITE_FRAMES.jump;index=0;}
      else if(pl.sliding){list=SPRITE_FRAMES.slide;index=0;}
      else if(pl.crouched){list=SPRITE_FRAMES.crouch;index=0;}
      else if(Math.abs(pl.vx)>28){list=SPRITE_FRAMES.run;index=Math.floor(pl.step*.52)%list.length;}
      const f=list[index];
      const dh=list===SPRITE_FRAMES.action?130:list===SPRITE_FRAMES.idle?126:list===SPRITE_FRAMES.crouch?100:list===SPRITE_FRAMES.slide?96:118;
      const dw=f.w/f.h*dh,spriteScale=dh/f.h,drawY=PH-(f.h-spriteBottomPadding(f))*spriteScale;
      if(knight.complete&&knight.naturalWidth){
        ctx.imageSmoothingEnabled=false;
        ctx.shadowColor="rgba(103,45,179,.36)";ctx.shadowBlur=8;
        if(attacking&&attackBodyLayer.width)ctx.drawImage(attackBodyLayer,f.x,f.y,f.w,f.h,-dw/2,drawY,dw,dh);
        else ctx.drawImage(knight,f.x,f.y,f.w,f.h,-dw/2,drawY,dw,dh);
        ctx.shadowBlur=0;ctx.imageSmoothingEnabled=true;
      }else{
        ctx.fillStyle="#6f35a9";ctx.fillRect(-19,18,38,PH-18);
        ctx.fillStyle="#ffe14d";ctx.fillRect(-13,30,26,8);
      }
      const eyeBand=findActualEyeBand(f);
      if(eyeBand&&knight.complete&&knight.naturalWidth){
        const bandX=-dw/2+(eyeBand.x-f.x)*spriteScale,bandY=drawY+(eyeBand.y-f.y)*spriteScale;
        const bandW=eyeBand.w*spriteScale,bandH=eyeBand.h*spriteScale;
        const localAimX=Math.cos(aimAngle.current)*pl.facing,shiftX=Math.round(localAimX*5)*spriteScale,shiftY=Math.round(clamp(Math.sin(aimAngle.current)*3,-3,3))*spriteScale;
        ctx.save();ctx.beginPath();ctx.rect(bandX-5*spriteScale,bandY-3*spriteScale,bandW+10*spriteScale,bandH+6*spriteScale);ctx.clip();
        ctx.imageSmoothingEnabled=false;ctx.drawImage(eyeCoverLayer,eyeBand.x,eyeBand.y,eyeBand.w,eyeBand.h,bandX,bandY,bandW,bandH);ctx.drawImage(eyeLayer,eyeBand.x,eyeBand.y,eyeBand.w,eyeBand.h,bandX+shiftX,bandY+shiftY,bandW,bandH);ctx.imageSmoothingEnabled=true;
        ctx.restore();
      }
      ctx.restore();
      drawActualAttackArm(pl,now);
    };
    const beginDragonMode=(mode:DragonMode,now:number,duration:number)=>{
      dragon.mode=mode;dragon.modeStarted=now;dragon.modeUntil=now+duration;dragon.landing=false;
      if(mode==="fly")dragon.y=Math.min(dragon.y,dragon.groundY-42);
      if(mode==="attack")dragon.y=Math.min(dragon.y,dragon.groundY-54);
      if(mode==="idle"||mode==="walk"||mode==="run"||mode==="sleep")dragon.y=dragon.groundY;
      if(mode==="idle"||mode==="sleep")dragon.vx*=.58;
      if(mode==="attack")dragon.vx*=.28;
    };
    const beginDragonTravel=(mode:"walk"|"run"|"fly",now:number,duration:number,targetX:number)=>{
      dragon.targetX=clamp(targetX,DRAGON_PATROL_MIN,DRAGON_PATROL_MAX);
      beginDragonMode(mode,now,duration);
      dragon.facing=dragon.targetX>=dragon.x?1:-1;
    };
    const dragonSurfaceAt=(x:number,currentY:number)=>{
      const surfaces=map1Platforms.filter(p=>p.h>80&&x>=p.x&&x<=p.x+p.w);
      if(!surfaces.length)return null;
      return surfaces.reduce((best,p)=>Math.abs(p.y-currentY)<Math.abs(best.y-currentY)?p:best).y;
    };
    const chooseDragonMode=(now:number)=>{
      const pl=player.current,distance=Math.abs(pl.x-dragon.x),approaching=(pl.x-dragon.x)*pl.vx<0;
      const runAwayTarget=pl.x<dragon.x?DRAGON_PATROL_MAX:DRAGON_PATROL_MIN;
      const randomTarget=DRAGON_PATROL_MIN+35+Math.random()*(DRAGON_PATROL_MAX-DRAGON_PATROL_MIN-70);
      const roll=Math.random();
      if(distance<145&&approaching&&Math.abs(pl.vx)>145){
        dragon.awarenessUntil=now+2400;
        beginDragonTravel("run",now,1150+Math.random()*650,runAwayTarget);
      }else if(distance<330&&roll<.58){
        dragon.awarenessUntil=now+1800+Math.random()*1500;
        beginDragonMode("idle",now,1300+Math.random()*1300);
        dragon.facing=pl.x>=dragon.x?1:-1;
      }else if(distance<390&&Math.abs(pl.vx)<70&&roll<.78){
        dragon.awarenessUntil=now+2200;
        const cautiousTarget=pl.x+(dragon.x>=pl.x?118:-118);
        beginDragonTravel("walk",now,1600+Math.random()*1200,cautiousTarget);
      }else if(roll<.29)beginDragonMode("idle",now,1800+Math.random()*2200);
      else if(roll<.56)beginDragonTravel("walk",now,2200+Math.random()*1700,randomTarget);
      else if(roll<.69)beginDragonTravel("run",now,1000+Math.random()*900,randomTarget);
      else if(roll<.85)beginDragonTravel("fly",now,2600+Math.random()*1900,randomTarget);
      else if(distance>310)beginDragonMode("sleep",now,5000+Math.random()*3600);
      else{
        beginDragonMode("idle",now,1600+Math.random()*1100);
        dragon.facing=pl.x>=dragon.x?1:-1;
      }
    };
    const counterAttack=(now:number)=>{
      dragon.facing=player.current.x>=dragon.x?1:-1;
      dragon.attackLanded=false;
      beginDragonMode("attack",now,1080);
      tone(360,.12,.022);window.setTimeout(()=>tone(190,.22,.026),170);
    };
    const updateDragon=(dt:number,now:number)=>{
      if(!startedRef.current||mapRef.current!==1)return;
      const pl=player.current;
      if(dragon.health<=0){
        dragon.angry=false;
        dragon.vx+=(0-dragon.vx)*(1-Math.exp(-7*dt));
        dragon.x+=dragon.vx*dt;
        const deadGround=dragonSurfaceAt(dragon.x,dragon.groundY);
        if(deadGround!==null)dragon.groundY+=(deadGround-dragon.groundY)*(1-Math.exp(-10*dt));
        dragon.y+=(dragon.groundY-dragon.y)*(1-Math.exp(-8*dt));
        return;
      }
      const playerDistance=Math.abs(pl.x-dragon.x),playerApproaching=(pl.x-dragon.x)*pl.vx<0;
      const sightDistance=Math.hypot(pl.x-dragon.x,(pl.y+PH*.45)-(dragon.y-48));
      const startled=playerDistance<135&&playerApproaching&&Math.abs(pl.vx)>145;
      if(dragon.angry&&(pl.health<=0||sightDistance>DRAGON_SIGHT_RANGE)){
        dragon.angry=false;
        if(dragon.mode!=="attack")beginDragonMode("idle",now,1600+Math.random()*900);
      }
      if(!dragon.angry&&dragon.mode==="sleep"&&(playerDistance<175||playerDistance<255&&Math.abs(pl.vx)>95)){
        beginDragonMode("idle",now,1300+Math.random()*900);dragon.facing=pl.x>=dragon.x?1:-1;dragon.awarenessUntil=now+2600;
      }else if(!dragon.angry&&startled&&dragon.mode!=="attack"&&dragon.mode!=="run"&&dragon.mode!=="fly"){
        dragon.awarenessUntil=now+2600;
        beginDragonTravel("run",now,1100+Math.random()*550,pl.x<dragon.x?DRAGON_PATROL_MAX:DRAGON_PATROL_MIN);
      }else if(!dragon.angry&&dragon.mode==="idle"&&(playerDistance<285||now<dragon.awarenessUntil)){
        dragon.facing=pl.x>=dragon.x?1:-1;
      }
      const swingProgress=(now-actionStartedAt.current)/360;
      if(activeAttackDamage.current>0&&actionUntil.current>now&&swingProgress>.14&&swingProgress<.9&&dragon.lastPlayerAttack!==actionStartedAt.current){
        const dragonCenterY=dragon.mode==="fly"||dragon.mode==="attack"?dragon.y:dragon.y-54;
        const targetAngle=Math.atan2(dragonCenterY-(pl.y+38),dragon.x-pl.x);
        const angleDifference=Math.atan2(Math.sin(targetAngle-attackAngle.current),Math.cos(targetAngle-attackAngle.current));
        const distance=Math.hypot(dragon.x-pl.x,dragonCenterY-(pl.y+38));
        if(distance<178&&Math.abs(angleDifference)<.86){
          dragon.lastPlayerAttack=actionStartedAt.current;
          dragon.health=Math.max(0,dragon.health-activeAttackDamage.current);
          dragon.hurtStarted=now;
          dragon.hurtUntil=now+520;
          dragon.hitDirection=dragon.x>=pl.x?1:-1;
          dragon.lastDamage=activeAttackDamage.current;
          if(dragon.health===0){
            dragon.angry=false;
            dragon.awarenessUntil=0;
            dragon.attackLanded=true;
            dragon.vx*=.3;
            beginDragonMode("sleep",now,999999999);
            tone(72,.28,.042);window.setTimeout(()=>tone(48,.38,.03),120);
            return;
          }
          dragon.angry=true;
          dragon.awarenessUntil=now+8000;
          if(dragon.mode!=="attack")counterAttack(now);
          else if(playerDistance>20)dragon.facing=pl.x>=dragon.x?1:-1;
          tone(96,.09,.035);
        }
      }

      if(dragon.mode==="attack"){
        if(playerDistance>20)dragon.facing=pl.x>=dragon.x?1:-1;
        dragon.vx+=(0-dragon.vx)*(1-Math.exp(-9*dt));
        const attackY=dragon.groundY-54+Math.sin((now-dragon.modeStarted)*.012)*3;
        dragon.y+=(attackY-dragon.y)*(1-Math.exp(-9*dt));
        if(!dragon.attackLanded&&now-dragon.modeStarted>560){
          const forward=(pl.x-dragon.x)*dragon.facing;
          const vertical=Math.abs((pl.y+42)-dragon.y);
          if(forward>-12&&forward<135&&vertical<112&&playerRespawnAt===0){
            pl.health=Math.max(0,pl.health-dragon.attackDamage);
            playerHurtUntil=now+360;
            if(pl.health===0){dragon.angry=false;playerRespawnAt=now+950;}
            tone(68,.2,.036);
          }
          dragon.attackLanded=true;
        }
        if(now>=dragon.modeUntil){
          const targetDistance=Math.hypot(pl.x-dragon.x,(pl.y+PH*.45)-(dragon.y-48));
          const verticalDistance=Math.abs((pl.y+42)-dragon.y);
          if(dragon.angry&&pl.health>0&&targetDistance<=DRAGON_SIGHT_RANGE){
            if(playerDistance<=DRAGON_ATTACK_RANGE+18&&verticalDistance<120)counterAttack(now);
            else{
              dragon.targetX=clamp(pl.x,DRAGON_CHASE_MIN,DRAGON_CHASE_MAX);
              beginDragonMode("run",now,900);
              dragon.facing=pl.x>=dragon.x?1:-1;
            }
          }else{
            dragon.angry=false;
            beginDragonMode("idle",now,1400+Math.random()*900);dragon.facing=pl.x>=dragon.x?1:-1;
          }
        }
        return;
      }

      if(dragon.angry){
        const verticalDistance=Math.abs((pl.y+42)-(dragon.y-48));
        if(playerDistance>20)dragon.facing=pl.x>=dragon.x?1:-1;
        if(playerDistance<=DRAGON_ATTACK_RANGE&&verticalDistance<125){counterAttack(now);return;}
        dragon.targetX=clamp(pl.x,DRAGON_CHASE_MIN,DRAGON_CHASE_MAX);
        if(dragon.mode!=="run"&&dragon.mode!=="fly")beginDragonMode("run",now,900);
        else dragon.modeUntil=now+900;
      }else if(dragon.mode==="fly"&&now>=dragon.modeUntil){
        if(!dragon.landing){dragon.landing=true;dragon.modeUntil=now+760;}
        else beginDragonMode("idle",now,1500+Math.random()*900);
      }else if(now>=dragon.modeUntil)chooseDragonMode(now);
      if(dragon.mode==="walk"||dragon.mode==="run"||dragon.mode==="fly"){
        const distanceToTarget=dragon.targetX-dragon.x;
        if(Math.abs(distanceToTarget)>18)dragon.facing=distanceToTarget>=0?1:-1;
        if(dragon.mode!=="fly"&&Math.abs(distanceToTarget)<13){
          if(dragon.angry){dragon.vx+=(0-dragon.vx)*(1-Math.exp(-7*dt));if(playerDistance>20)dragon.facing=pl.x>=dragon.x?1:-1;}
          else{
            beginDragonMode("idle",now,1200+Math.random()*1200);
            if(playerDistance<300)dragon.facing=pl.x>=dragon.x?1:-1;
          }
        }else{
          if(dragon.mode==="fly"&&Math.abs(distanceToTarget)<20&&!dragon.landing){dragon.landing=true;dragon.modeUntil=Math.min(dragon.modeUntil,now+760);}
          const movementMin=dragon.angry?DRAGON_CHASE_MIN:DRAGON_PATROL_MIN;
          const movementMax=dragon.angry?DRAGON_CHASE_MAX:DRAGON_PATROL_MAX;
          if(dragon.mode!=="fly"&&Math.abs(distanceToTarget)>45){
            const probeX=dragon.x+dragon.facing*58;
            const aheadGround=dragonSurfaceAt(probeX,dragon.groundY);
            if(aheadGround===null||Math.abs(aheadGround-dragon.groundY)>26){
              dragon.targetX=clamp(dragon.x+dragon.facing*220,movementMin,movementMax);
              beginDragonMode("fly",now,1150);
              dragon.vx*=.82;
              return;
            }
          }
          const speed=dragon.mode==="walk"?34:dragon.mode==="run"?(dragon.angry?112:88):58;
          const targetSpeed=dragon.facing*(dragon.mode==="fly"&&dragon.landing?speed*.45:speed);
          const moveRate=dragon.mode==="run"?(dragon.angry?5.6:5):3.8;
          dragon.vx+=(targetSpeed-dragon.vx)*(1-Math.exp(-moveRate*dt));dragon.x+=dragon.vx*dt;
          if(dragon.x<=movementMin){dragon.x=movementMin;if(dragon.angry)dragon.vx=Math.max(0,dragon.vx);else{dragon.targetX=DRAGON_PATROL_MAX;dragon.facing=1;}}
          if(dragon.x>=movementMax){dragon.x=movementMax;if(dragon.angry)dragon.vx=Math.min(0,dragon.vx);else{dragon.targetX=DRAGON_PATROL_MIN;dragon.facing=-1;}}
          const surfaceY=dragonSurfaceAt(dragon.x,dragon.groundY);
          if(surfaceY!==null)dragon.groundY+=(surfaceY-dragon.groundY)*(1-Math.exp(-(dragon.mode==="fly"?7:11)*dt));
          const targetY=dragon.mode==="fly"?(dragon.landing?dragon.groundY-45:dragon.groundY-118+Math.sin(now*.0045)*11):dragon.groundY;
          dragon.y+=(targetY-dragon.y)*(1-Math.exp(-(dragon.mode==="fly"?4.6:13)*dt));
        }
      }else{
        dragon.vx+=(0-dragon.vx)*(1-Math.exp(-8*dt));
        dragon.y+=(dragon.groundY-dragon.y)*(1-Math.exp(-12*dt));
      }

      if(playerRespawnAt&&now>=playerRespawnAt){
        pl.health=pl.maxHealth;pl.x=230;pl.y=498;pl.vx=0;pl.vy=0;pl.grounded=true;pl.jumpsLeft=2;pl.crouched=false;pl.sliding=false;
        playerRespawnAt=0;cameraReset.current=true;portalFlashUntil.current=now+430;
      }
    };
    const drawMagicalAnimalCard=(name:string,x:number,groundY:number,now:number,formedAt:number,image:HTMLImageElement,portrait:{x:number;y:number;w:number;h:number})=>{
      const elapsed=now-formedAt;
      const reveal=clamp(elapsed/620,0,1);
      if(reveal<=0)return;
      const eased=1-Math.pow(1-reveal,3);
      const hover=Math.sin(now*.0042)*3;
      const cardY=groundY-64+hover;
      const riseY=groundY-12+(cardY-(groundY-12))*eased;
      const scale=.16+eased*.84;
      const spin=(1-eased)*Math.PI*1.7;
      const cardW=76,cardH=112;

      ctx.save();
      ctx.globalAlpha=eased;
      ctx.fillStyle="rgba(0,0,0,.38)";
      ctx.beginPath();ctx.ellipse(x,groundY+4,30*eased,6*eased,0,0,Math.PI*2);ctx.fill();
      ctx.restore();

      ctx.save();ctx.translate(x,riseY);ctx.rotate(spin+Math.sin(now*.0022)*.025);ctx.scale(scale,scale);
      const glow=ctx.createRadialGradient(0,0,8,0,0,74);
      glow.addColorStop(0,"rgba(184,255,70,.24)");glow.addColorStop(1,"rgba(70,255,126,0)");
      ctx.fillStyle=glow;ctx.fillRect(-78,-82,156,164);
      ctx.shadowColor="rgba(174,255,70,.85)";ctx.shadowBlur=18;
      const cardGradient=ctx.createLinearGradient(-cardW/2,-cardH/2,cardW/2,cardH/2);
      cardGradient.addColorStop(0,"#f5d877");cardGradient.addColorStop(.28,"#8052c6");cardGradient.addColorStop(.72,"#24163f");cardGradient.addColorStop(1,"#bdf35c");
      ctx.fillStyle=cardGradient;ctx.beginPath();ctx.roundRect(-cardW/2,-cardH/2,cardW,cardH,8);ctx.fill();
      ctx.shadowBlur=0;ctx.strokeStyle="#efffa1";ctx.lineWidth=2;ctx.stroke();
      ctx.strokeStyle="rgba(12,6,25,.9)";ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(-cardW/2+5,-cardH/2+5,cardW-10,cardH-10,5);ctx.stroke();

      ctx.save();ctx.beginPath();ctx.roundRect(-29,-44,58,62,5);ctx.clip();
      const portraitGlow=ctx.createRadialGradient(0,-16,3,0,-16,43);
      portraitGlow.addColorStop(0,"#557827");portraitGlow.addColorStop(1,"#100b1f");
      ctx.fillStyle=portraitGlow;ctx.fillRect(-29,-44,58,62);
      ctx.imageSmoothingEnabled=true;
      ctx.drawImage(image,portrait.x,portrait.y,portrait.w,portrait.h,-30,-45,60,64);
      ctx.restore();
      ctx.strokeStyle="#dfff78";ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(-29,-44,58,62,5);ctx.stroke();

      ctx.fillStyle="#f5ffd3";ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.font="900 7px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(name.toUpperCase(),0,29);
      ctx.fillStyle="#c8ff61";ctx.font="900 12px ui-monospace, SFMono-Regular, Menlo, monospace";ctx.fillText("✦",0,43);
      ctx.restore();

      ctx.save();ctx.globalAlpha=eased;
      for(let mote=0;mote<12;mote++){
        const angle=mote*Math.PI*2/12+now*.0012;
        const radius=44+Math.sin(now*.004+mote)*9;
        const mx=x+Math.cos(angle)*radius,my=riseY+Math.sin(angle)*radius*.72;
        ctx.fillStyle=mote%3===0?"#f8e985":mote%3===1?"#a9ff4b":"#a66cff";
        ctx.beginPath();ctx.arc(mx,my,1.2+(mote%2),0,Math.PI*2);ctx.fill();
      }
      if(elapsed<1700){
        ctx.globalAlpha*=clamp(1-elapsed/1700,0,1);
        ctx.font="900 10px ui-monospace, SFMono-Regular, Menlo, monospace";ctx.textAlign="center";ctx.textBaseline="bottom";
        ctx.lineWidth=3;ctx.strokeStyle="rgba(7,3,16,.9)";ctx.strokeText("MAGICAL CARD FORMED",x,riseY-cardH/2*scale-13);
        ctx.fillStyle="#eaff9f";ctx.fillText("MAGICAL CARD FORMED",x,riseY-cardH/2*scale-13);
      }
      ctx.restore();
    };
    const drawDragonCardTransformation=(now:number)=>{
      const elapsed=now-dragon.modeStarted;
      const absorb=clamp((elapsed-120)/760,0,1);
      const frame=DRAGON_FRAMES.sleep[3],spriteScale=DRAGON_RENDER_SIZE/DRAGON_CELL;
      if(absorb<1){
        const pull=1-Math.pow(1-absorb,2);
        ctx.save();ctx.translate(dragon.x,dragon.y-pull*42);
        ctx.rotate(dragon.facing*pull*.62);
        ctx.scale(dragon.facing*(1-pull*.82),1-pull*.72);
        ctx.globalAlpha=1-pull;
        ctx.shadowColor="rgba(168,255,67,.95)";ctx.shadowBlur=10+pull*28;
        ctx.drawImage(dragonImage,frame.x,frame.y,frame.w,frame.h,-frame.anchorX*spriteScale,-frame.anchorY*spriteScale,frame.w*spriteScale,frame.h*spriteScale);
        ctx.restore();
        ctx.save();ctx.globalAlpha=1-absorb;
        for(let wisp=0;wisp<10;wisp++){
          const angle=wisp*Math.PI*2/10+now*.003;
          const radius=(1-absorb)*(50+wisp%3*9);
          ctx.strokeStyle=wisp%2?"#b0ff4a":"#ba77ff";ctx.lineWidth=2;
          ctx.beginPath();ctx.moveTo(dragon.x+Math.cos(angle)*radius,dragon.y-54+Math.sin(angle)*radius*.55);ctx.lineTo(dragon.x+Math.cos(angle+.45)*radius*.45,dragon.y-48+Math.sin(angle+.45)*radius*.3);ctx.stroke();
        }
        ctx.restore();
      }
      drawMagicalAnimalCard("Baby Dragon",dragon.x,dragon.groundY,now,dragon.modeStarted+350,dragonImage,{x:0,y:25,w:256,h:260});
    };
    const drawDragon=(now:number)=>{
      if(mapRef.current!==1||!dragonImage.complete||!dragonImage.naturalWidth)return;
      const elapsed=now-dragon.modeStarted,frames=DRAGON_FRAMES[dragon.mode];
      if(dragon.health<=0){drawDragonCardTransformation(now);return;}
      let index=0;
      if(dragon.mode==="idle"){
        const phase=elapsed%2900;index=phase<1550?0:phase<2150?1:phase<2500?2:3;
      }else if(dragon.mode==="walk")index=Math.floor(elapsed/245)%frames.length;
      else if(dragon.mode==="run")index=Math.floor(elapsed/105)%frames.length;
      else if(dragon.mode==="fly")index=Math.floor(elapsed/130)%frames.length;
      else if(dragon.mode==="sleep"){
        const remaining=dragon.modeUntil-now;
        if(elapsed<420)index=0;
        else if(elapsed<820)index=1;
        else if(elapsed<1220)index=2;
        else if(remaining>1050)index=3;
        else if(remaining>680)index=2;
        else if(remaining>330)index=1;
        else index=0;
      }
      else index=Math.min(frames.length-1,Math.floor(elapsed/235));
      const frame=frames[index],size=DRAGON_RENDER_SIZE;
      const spriteScale=size/DRAGON_CELL;
      const airHeight=clamp((dragon.groundY-dragon.y)/125,0,1),shadowScale=1-airHeight*.46;
      const hurtActive=dragon.hurtUntil>now;
      const hurtProgress=hurtActive?clamp((now-dragon.hurtStarted)/520,0,1):1;
      const hurtPulse=hurtActive?Math.sin(hurtProgress*Math.PI):0;
      const recoilX=hurtPulse*12*dragon.hitDirection;
      const hitSquash=hurtPulse*.08;
      ctx.save();ctx.fillStyle="rgba(1,4,5,"+(.58-airHeight*.22)+")";ctx.beginPath();ctx.ellipse(dragon.x,dragon.groundY+3,35*shadowScale,7*shadowScale,0,0,Math.PI*2);ctx.fill();ctx.restore();
      ctx.save();ctx.translate(dragon.x+recoilX,dragon.y);
      if(dragon.mode==="fly")ctx.rotate(Math.sin(elapsed*.004)*.018*dragon.facing);
      const breatheScale=dragon.mode==="sleep"&&index===3?1+Math.sin(now*.0032)*.012:dragon.mode==="idle"?1+Math.sin(now*.0024)*.006:1;
      ctx.scale(dragon.facing*(1+hitSquash),breatheScale-hitSquash);ctx.imageSmoothingEnabled=true;
      ctx.globalAlpha=hurtActive&&Math.floor(now/48)%2===0?.52:1;
      ctx.shadowColor=hurtActive?"rgba(255,245,151,.95)":dragon.mode==="attack"?"rgba(126,255,46,.52)":dragon.angry?"rgba(255,92,58,.58)":"rgba(81,188,41,.24)";ctx.shadowBlur=hurtActive?24:dragon.mode==="attack"?16:dragon.angry?13:7;
      ctx.drawImage(dragonImage,frame.x,frame.y,frame.w,frame.h,-frame.anchorX*spriteScale,-frame.anchorY*spriteScale,frame.w*spriteScale,frame.h*spriteScale);
      ctx.shadowBlur=0;ctx.globalAlpha=1;ctx.restore();

      const spriteTop=dragon.y-frame.anchorY*spriteScale;
      const barW=86,barH=9,barX=dragon.x+recoilX-barW/2,barY=spriteTop-25;
      const healthRatio=clamp(dragon.health/dragon.maxHealth,0,1);
      const healthLabel=(dragon.angry?"ANGRY  ":"")+"BABY DRAGON  "+dragon.health+" / "+dragon.maxHealth;
      ctx.save();
      ctx.textAlign="center";ctx.textBaseline="bottom";ctx.font="700 9px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.lineWidth=3;ctx.strokeStyle="rgba(2,6,8,.9)";ctx.strokeText(healthLabel,dragon.x+recoilX,barY-3);
      ctx.fillStyle=dragon.angry?"#ffb19d":"#efffd6";ctx.fillText(healthLabel,dragon.x+recoilX,barY-3);
      ctx.fillStyle="rgba(2,6,8,.9)";ctx.fillRect(barX-2,barY-2,barW+4,barH+4);
      ctx.fillStyle="#401924";ctx.fillRect(barX,barY,barW,barH);
      const healthGradient=ctx.createLinearGradient(barX,barY,barX+barW,barY);
      healthGradient.addColorStop(0,"#9cf63d");healthGradient.addColorStop(1,"#3cc943");
      ctx.fillStyle=healthGradient;ctx.fillRect(barX,barY,barW*healthRatio,barH);
      ctx.fillStyle="rgba(255,255,255,.34)";ctx.fillRect(barX,barY,barW*healthRatio,2);
      ctx.strokeStyle="rgba(205,255,144,.72)";ctx.lineWidth=1;ctx.strokeRect(barX-.5,barY-.5,barW+1,barH+1);
      if(hurtActive){
        const impactX=dragon.x+recoilX-dragon.hitDirection*23,impactY=dragon.y-54;
        ctx.globalAlpha=1-hurtProgress;
        ctx.strokeStyle="#eaff9b";ctx.lineWidth=3;
        for(let ray=0;ray<7;ray++){
          const angle=ray*Math.PI*2/7+hurtProgress*.35;
          const inner=10+hurtProgress*7,outer=22+hurtProgress*17;
          ctx.beginPath();ctx.moveTo(impactX+Math.cos(angle)*inner,impactY+Math.sin(angle)*inner);ctx.lineTo(impactX+Math.cos(angle)*outer,impactY+Math.sin(angle)*outer);ctx.stroke();
        }
        ctx.globalAlpha=Math.max(0,1-hurtProgress*1.15);
        ctx.font="900 15px ui-monospace, SFMono-Regular, Menlo, monospace";ctx.textBaseline="middle";
        ctx.fillStyle="#f4ffb0";ctx.shadowColor="rgba(80,255,46,.85)";ctx.shadowBlur=8;
        ctx.fillText("-"+dragon.lastDamage,dragon.x+recoilX,barY-19-hurtProgress*22);
      }
      ctx.restore();
    };
    const drawPixelPlatform=(p:Platform,now:number,map:MapId)=>{
      const ledge=p.h<=24;
      const depth=Math.min(p.h,ledge?24:150);
      const body=ctx.createLinearGradient(0,p.y,0,p.y+depth);
      if(map===1){body.addColorStop(0,"#3c485a");body.addColorStop(.1,"#263244");body.addColorStop(.5,"#151d2a");body.addColorStop(1,"#080c13");}
      else{body.addColorStop(0,"#d89a59");body.addColorStop(.14,"#b77346");body.addColorStop(.58,"#764937");body.addColorStop(1,"#342b2d");}
      ctx.fillStyle=body;ctx.fillRect(p.x,p.y,p.w,p.h);

      ctx.fillStyle=map===1?"#71869e":"#ffd18a";ctx.fillRect(p.x,p.y,p.w,3);
      ctx.fillStyle=map===1?"#46566b":"#e6a866";ctx.fillRect(p.x,p.y+3,p.w,5);
      for(let tx=p.x+8;tx<p.x+p.w;tx+=32){
        const seed=Math.floor(tx/8)+Math.floor(p.y);
        const capW=10+(seed%4)*4;
        ctx.fillStyle=map===1?(seed%3===0?"#92a5ba":seed%3===1?"#61758c":"#52657b"):(seed%3===0?"#ffe1a3":seed%3===1?"#eebb75":"#d99758");
        ctx.fillRect(tx,p.y-2-(seed%3),capW,3+(seed%2));
      }

      if(!ledge){
        for(let tx=p.x+9;tx<p.x+p.w-8;tx+=38){
          const seed=Math.floor(tx/19)+Math.floor(p.y/10);
          const row=(seed%3)*22;
          const rockY=p.y+14+row;
          const rockW=20+(seed%5)*5;
          ctx.fillStyle=map===1?(seed%4===0?"#33445a":seed%4===1?"#243247":"#1c2839"):(seed%4===0?"#c68350":seed%4===1?"#a86642":"#8e563d");
          ctx.fillRect(tx,rockY,Math.min(rockW,p.x+p.w-tx),9+(seed%3)*3);
          ctx.fillStyle=map===1?"rgba(139,163,188,.16)":"rgba(255,223,164,.18)";ctx.fillRect(tx,rockY,Math.min(rockW-5,p.x+p.w-tx),2);
        }
        for(let tx=p.x+27;tx<p.x+p.w;tx+=79){
          const crack=13+(Math.floor(tx/11)%4)*5;
          ctx.fillStyle=map===1?"rgba(3,7,13,.76)":"rgba(91,51,42,.46)";ctx.fillRect(tx,p.y+35,3,crack);
          ctx.fillRect(tx+3,p.y+35+crack-3,7,3);
        }
        const shimmer=.1+Math.max(0,Math.sin(now*.0014+p.x*.01))*.08;
        ctx.fillStyle=map===1?"rgba(113,139,165,"+shimmer+")":"rgba(255,218,145,"+(shimmer+.05)+")";ctx.fillRect(p.x,p.y+9,p.w,3);
      }
    };
    const drawPortal=(x:number,groundY:number,now:number,map:MapId)=>{
      const cx=x+55,cy=groundY-91,pulse=.34+Math.sin(now*.0022)*.1;
      const portalColor=map===1?"116,230,226":"255,185,104";
      const glow=ctx.createRadialGradient(cx,cy,4,cx,cy,185);glow.addColorStop(0,"rgba("+portalColor+","+pulse+")");glow.addColorStop(1,"rgba("+portalColor+",0)");ctx.fillStyle=glow;ctx.fillRect(cx-205,cy-205,410,410);
      ctx.fillStyle=map===1?"#061214":"#241521";ctx.fillRect(x,groundY-180,110,180);
      ctx.strokeStyle="rgba("+portalColor+",.86)";ctx.lineWidth=4;ctx.strokeRect(x+10,groundY-168,90,168);
      ctx.shadowColor=map===1?"#74e6e2":"#ffb968";ctx.shadowBlur=25;ctx.strokeRect(x+18,groundY-160,74,160);ctx.shadowBlur=0;
      ctx.fillStyle="rgba("+portalColor+","+(.12+Math.sin(now*.003)*.04)+")";ctx.fillRect(x+22,groundY-156,66,154);
      for(let i=0;i<6;i++){
        const sy=groundY-150+((now*.035+i*29)%138);
        ctx.fillStyle="rgba("+portalColor+","+(.28+i*.045)+")";ctx.fillRect(x+29+(i*13)%46,sy,4+(i%2)*3,2);
      }
    };
    const drawWorld=(w:number,h:number,scale:number,now:number)=>{
      ctx.save();ctx.scale(scale,scale);ctx.translate(-cameraX,0);
      const viewW=w/scale,map=mapRef.current,activePlatforms=platformsFor(map);
      if(map===1){
        ctx.fillStyle="#090f10";ctx.fillRect(3745,205,210,330);ctx.beginPath();ctx.moveTo(3716,214);ctx.lineTo(3850,95);ctx.lineTo(3982,214);ctx.fill();
        ctx.strokeStyle="#283432";ctx.lineWidth=9;ctx.strokeRect(3768,232,165,302);ctx.fillStyle="#040809";ctx.fillRect(3814,290,74,105);
      }
      for(const p of activePlatforms){
        if(p.x+p.w<cameraX-100||p.x>cameraX+viewW+100)continue;
        drawPixelPlatform(p,now,map);
      }
      if(map===1){
        drawPortal(MAP1_PORTAL_X,575,now,map);
        ctx.strokeStyle="rgba(61,82,96,.78)";ctx.lineWidth=3;
        for(let gx=90;gx<MAP1_W;gx+=57){
          const surface=activePlatforms.find(p=>gx>p.x&&gx<p.x+p.w&&p.h>80)?.y;
          if(!surface||gx<cameraX-80||gx>cameraX+viewW+80)continue;
          const sway=Math.sin(now*.0025+gx*.04)*7;
          ctx.beginPath();ctx.moveTo(gx,surface);ctx.quadraticCurveTo(gx+sway*.2,surface-10,gx+sway,surface-20-(gx%13));ctx.stroke();
        }
        ctx.strokeStyle="rgba(156,202,199,.28)";ctx.lineWidth=1.5;
        for(let i=0;i<16;i++){
          const rx=180+(i*337)%4700;
          const surface=activePlatforms.find(p=>rx>p.x&&rx<p.x+p.w&&p.h>80)?.y;
          if(!surface||rx<cameraX-100||rx>cameraX+viewW+100)continue;
          const phase=(now*.055+i*17)%70,alpha=1-phase/70;
          ctx.globalAlpha=alpha*.65;ctx.beginPath();ctx.ellipse(rx,surface+3,phase*.34,phase*.08,0,0,Math.PI*2);ctx.stroke();
        }
        ctx.globalAlpha=1;
        for(const m of motes){const a=.25+.35*Math.sin(now*.0015+m.p);ctx.fillStyle="rgba(116,230,226,"+a+")";ctx.beginPath();ctx.arc(m.x,m.y+Math.sin(m.p+now*.001)*14,2.2,0,Math.PI*2);ctx.fill();}
      }else{
        drawPortal(MAP2_PORTAL_X,590,now,map);
        for(let sx=430;sx<MAP2_W;sx+=173){
          const twinkle=.18+Math.max(0,Math.sin(now*.0021+sx*.01))*.4;
          ctx.fillStyle="rgba(255,226,165,"+twinkle+")";ctx.fillRect(sx,582-(sx%3),5+(sx%4),2);
        }
      }
      ctx.globalAlpha=1;
      if(portalFlashUntil.current>now){ctx.fillStyle="rgba(255,244,214,"+((portalFlashUntil.current-now)/430*.18)+")";ctx.fillRect(cameraX,0,viewW,WORLD_H);}
      drawDragon(now);
      drawPlayer(player.current,now);ctx.restore();
    };
    const frame=(now:number)=>{
      const dt=Math.min((now-last)/1000,.032);last=now;const w=canvas.clientWidth,h=canvas.clientHeight,scale=Math.max(w/1280,h/WORLD_H),pl=player.current,map=mapRef.current,activeWorldW=worldWidthFor(map);
      if(actionUntil.current<=now)activeAttackDamage.current=0;
      if(pl.health!==lastHealth){lastHealth=pl.health;setHealth(pl.health);}
      if(startedRef.current&&!dialogueRef.current&&playerRespawnAt===0){
        const left=keys.current.a||keys.current.arrowleft,right=keys.current.d||keys.current.arrowright,target=(right?1:0)-(left?1:0),down=keys.current.s||keys.current.arrowdown;
        const wasGrounded=pl.grounded;
        const wantsSlide=slideQueued.current;slideQueued.current=false;
        if(target&&actionUntil.current<=now)pl.facing=target>0?1:-1;
        if(wantsSlide&&pl.grounded&&Math.abs(pl.vx)>55){
          const entrySpeed=Math.abs(pl.vx);
          const slideSpeed=clamp(entrySpeed*1.04,58,365);
          const slideDuration=clamp(260+entrySpeed*1.05,320,650);
          const slideDirection:1|-1=pl.vx<0?-1:1;
          pl.facing=slideDirection;pl.vx=slideDirection*slideSpeed;slideUntil.current=now+slideDuration;
          tone(82+slideSpeed*.09,.1+slideDuration/7000,.022);
        }
        pl.sliding=pl.grounded&&now<slideUntil.current;
        pl.crouched=pl.grounded&&Boolean(down)&&!pl.sliding;
        if(pl.sliding)pl.vx*=Math.max(0,1-dt*1.7);
        else{
          const speed=pl.crouched?70:keys.current.shift?330:220;
          pl.vx+=(target*speed-pl.vx)*Math.min(1,dt*(pl.grounded?10:4));
        }
        const jump=jumpQueued.current;let didJump=false;jumpQueued.current=false;
        if(jump&&pl.jumpsLeft>0){
          const secondJump=pl.jumpsLeft===1;
          pl.vy=secondJump?-465:-500;pl.grounded=false;pl.jumpsLeft-=1;pl.crouched=false;pl.sliding=false;slideUntil.current=0;didJump=true;
          tone(secondJump?285:190,secondJump ? .2 : .16,secondJump ? .026 : .02);
        }
        pl.vy+=1180*dt;pl.x=clamp(pl.x+pl.vx*dt,24,activeWorldW-24);const oldBottom=pl.y+PH;pl.y+=pl.vy*dt;const newBottom=pl.y+PH,ground=groundAt(pl.x,oldBottom);
        if(pl.vy>=0&&ground<Infinity&&oldBottom<=ground+STEP_HEIGHT&&newBottom>=ground){pl.y=ground-PH;pl.vy=0;pl.grounded=true;pl.jumpsLeft=2;}else{pl.grounded=false;pl.crouched=false;pl.sliding=false;slideUntil.current=0;}
        if(wasGrounded&&!didJump&&!pl.grounded)pl.jumpsLeft=Math.min(pl.jumpsLeft,1);
        if(pl.y>WORLD_H+80){pl.x=map===1?Math.max(120,pl.x-180):340;pl.y=240;pl.vy=0;pl.grounded=false;pl.jumpsLeft=2;pl.crouched=false;pl.sliding=false;slideUntil.current=0;}pl.step+=Math.abs(pl.vx)*dt*.048;
      }else{pl.vx*=.82;pl.crouched=false;pl.sliding=false;slideUntil.current=0;}
      updateDragon(dt,now);
      const cameraTarget=clamp(pl.x-w/scale*.38,0,Math.max(0,activeWorldW-w/scale));
      if(cameraReset.current){cameraX=cameraTarget;cameraReset.current=false;}else cameraX+=(cameraTarget-cameraX)*Math.min(1,dt*3.8);
      cameraXRef.current=cameraX;renderScaleRef.current=scale;
      if(pointerAim.current.active){
        const aimWorldX=cameraX+pointerAim.current.x/scale,aimWorldY=pointerAim.current.y/scale;
        aimAngle.current=Math.atan2(aimWorldY-(pl.y+34),aimWorldX-pl.x);
      }
      let action="";
      if(!dialogueRef.current){
        if(map===1&&Math.abs(pl.x-3850)<155&&!triggered.current.has("tower"))action="Listen to the radio";
        else if(map===1&&Math.abs(pl.x-(MAP1_PORTAL_X+55))<145)action="Enter Map 2";
        else if(map===2&&Math.abs(pl.x-(MAP2_PORTAL_X+55))<145)action="Return to Map 1";
      }
      if(action!==lastAction){lastAction=action;setNearAction(action||null);}
      ctx.clearRect(0,0,w,h);drawBackdrop(w,h,now,map);drawWorld(w,h,scale,now);
      if(playerHurtUntil>now){ctx.fillStyle="rgba(111,255,55,"+((playerHurtUntil-now)/360*.11)+")";ctx.fillRect(0,0,w,h);}
      if(map===1){
        ctx.strokeStyle="rgba(188,218,214,.2)";ctx.lineWidth=1;for(const r of rain){r.x-=r.s*dt*1.7;r.y+=r.s*dt*9;if(r.y>h+20){r.y=-20;r.x=Math.random()*w+120;}if(r.x<-20)r.x=w+20;ctx.beginPath();ctx.moveTo(r.x,r.y);ctx.lineTo(r.x-r.l*.32,r.y+r.l);ctx.stroke();}
        ctx.fillStyle="rgba(42,68,53,.58)";
        for(const leaf of leaves){
          leaf.x+=leaf.s*dt;leaf.y+=Math.sin(now*.002+leaf.p)*dt*12;
          if(leaf.x>w+30){leaf.x=-30;leaf.y=130+(leaf.p*113)%Math.max(180,h-240);}
          ctx.save();ctx.translate(leaf.x,leaf.y);ctx.rotate(Math.sin(now*.004+leaf.p));ctx.fillRect(-5,-1,10,3);ctx.restore();
        }
      }
      raf=requestAnimationFrame(frame);
    };
    raf=requestAnimationFrame(frame);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);knight.removeEventListener("load",prepareActualEyes);};
  },[tone]);

  const touch=useCallback((key:string,value:boolean,e:React.PointerEvent)=>{e.preventDefault();keys.current[key]=value;if(key==="w"&&value&&!dialogueRef.current)jumpQueued.current=true;if(key==="s"&&value&&!dialogueRef.current)slideQueued.current=true;},[]);
  const toggleSound=()=>{soundRef.current=!soundRef.current;setSoundOn(soundRef.current);if(soundRef.current)tone(520,.16,.025);};

  return <main className="game-shell" aria-label="Echoes of Ashfall game">
    <canvas ref={canvasRef} className="game-canvas" data-sword-damage={SWORD_DAMAGE} aria-label={`${PLAYER_NAME} in a playable side-scrolling world. Move the cursor to aim and left click to attack for ${SWORD_DAMAGE} damage.`} onPointerDown={(e)=>{if(e.button===0){e.preventDefault();updateAim(e.clientX,e.clientY);attack();}}}/>
    <div className="vignette"/><div className="film-grain"/>
    <div className="topbar">
      <div className="hud-left">
        <div className="health-hud" role="meter" aria-label={`${PLAYER_NAME} health: ${health} out of ${MAX_HEALTH}`} aria-valuemin={0} aria-valuemax={MAX_HEALTH} aria-valuenow={health}>
          <p className="knight-name">{PLAYER_NAME}</p>
          <div className="health-readout"><Heart size={16} strokeWidth={2.4} aria-hidden="true"/><strong>{health}</strong><span>Health</span></div>
          <div className="health-track"><span style={{width:`${health}%`}}/></div>
        </div>
        <div className="chapter-mark"><span className="chapter-line"/><div><p className="eyebrow">Map {mapNumber}</p><p className="chapter-name">{mapNumber===1?"The Signal in the Rain":"Sunset Shore"}</p></div></div>
      </div>
      {started&&<div className="objective"><p className="objective-label">Current objective</p><p className="objective-copy">{objective}</p></div>}
    </div>
    <section className={"title-screen "+(started?"hidden":"")} aria-hidden={started}>
      <div className="title-card"><p className="title-kicker">A story begins</p><h1 className="game-title">Echoes<br/>of Ashfall<span>Chapter Zero</span></h1><button className="start-button" onClick={startGame}>Enter Ashfall</button><p className="start-hint">Headphones recommended · Best played fullscreen</p></div>
    </section>
    {dialogue&&<div className="dialogue-wrap"><div className="dialogue-box" onClick={advanceDialogue}><p className="speaker">{dialogue[dialogueIndex]?.speaker}</p><p className="dialogue-text">{dialogue[dialogueIndex]?.text}</p><p className="continue-hint">Click or press E to continue</p></div></div>}
    {nearAction&&<div className="interaction"><span className="keycap">E</span>{nearAction}</div>}
    <div className="controls"><span><b>A D</b> Move</span><span><b>W / Space ×2</b> Double jump</span><span><b>S</b> Crouch / slide</span><span><b>Shift</b> Run</span><span><b>Cursor</b> Aim</span><span><b>Mouse 1</b> Attack</span><span><b>E</b> Interact</span></div>
    <button className="sound-button" onClick={toggleSound} aria-label={soundOn?"Mute sound":"Turn sound on"}>{soundOn?<Volume2 size={16}/>:<VolumeX size={16}/>}</button>
    <div className="touch-controls" aria-label="Touch controls">
      <div className="touch-group"><button className="touch-btn" aria-label="Move left" onPointerDown={(e)=>touch("a",true,e)} onPointerUp={(e)=>touch("a",false,e)} onPointerCancel={(e)=>touch("a",false,e)}>←</button><button className="touch-btn" aria-label="Move right" onPointerDown={(e)=>touch("d",true,e)} onPointerUp={(e)=>touch("d",false,e)} onPointerCancel={(e)=>touch("d",false,e)}>→</button></div>
      <div className="touch-group"><button className="touch-btn attack" aria-label="Sword attack" onPointerDown={(e)=>{e.preventDefault();attack();}}>⚔</button><button className="touch-btn action" aria-label="Interact" onClick={interact}>E</button><button className="touch-btn action" aria-label="Crouch or slide" onPointerDown={(e)=>touch("s",true,e)} onPointerUp={(e)=>touch("s",false,e)} onPointerCancel={(e)=>touch("s",false,e)}>↓</button><button className="touch-btn" aria-label="Jump" onPointerDown={(e)=>touch("w",true,e)} onPointerUp={(e)=>touch("w",false,e)} onPointerCancel={(e)=>touch("w",false,e)}>↑</button></div>
    </div>
  </main>;
}
