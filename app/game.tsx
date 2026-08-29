"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, Volume2, VolumeX } from "lucide-react";

type Line = { speaker: string; text: string };
type MapId = 1|2|3|4|5|6;
type Player = { x:number; y:number; vx:number; vy:number; grounded:boolean; facing:1|-1; step:number; jumpsLeft:number; crouched:boolean; sliding:boolean; health:number; maxHealth:number; swordDamage:number };
type Platform = { x:number; y:number; w:number; h:number };
type DragonMode = "idle"|"walk"|"run"|"fly"|"sleep"|"attack";
type Dragon = { x:number; y:number; groundY:number; vx:number; facing:1|-1; mode:DragonMode; modeStarted:number; modeUntil:number; health:number; maxHealth:number; attackDamage:number; lastPlayerAttack:number; attackLanded:boolean; hurtStarted:number; hurtUntil:number; hitDirection:1|-1; lastDamage:number; angry:boolean; landing:boolean; targetX:number; awarenessUntil:number };
type DragonFrame = { x:number; y:number; w:number; h:number; anchorX:number; anchorY:number };
type CardPalette = { dark:string; mid:string; accent:string; glow:string };
type InventoryItem = { id:string; name:string; type:"animal-card"|"item"; description:string; image:string; palette:CardPalette };
type Companion = { active:boolean; itemId:string|null; map:MapId; x:number; y:number; groundY:number; vx:number; facing:1|-1; mode:DragonMode; modeStarted:number; summonedAt:number; recallStarted:number; teleportAt:number; attackUntil:number; attackLanded:boolean; targetX:number; lastPlayerAttack:number; health:number; maxHealth:number };

const MAP1_W = 5200;
const MAP2_W = 3600;
const MAP3_W = 4000;
const MAP4_W = 4200;
const WORLD_H = 720;
const PW = 46;
const PH = 92;
const STEP_HEIGHT = 32;
const MAP1_PORTAL_X = 5070;
const MAP2_PORTAL_X = 105;
const MAP2_EXIT_X = 3470;
const MAP3_ENTRY_X = 105;
const MAP3_EXIT_X = 3870;
const MAP4_ENTRY_X = 105;
const MAP4_EXIT_X = 4070;
const MAX_HEALTH = 100;
const SWORD_DAMAGE = 15;
const MAX_STAMINA = 100;
const SWORD_STAMINA_COST = 25;
const STAMINA_REGEN_DELAY = 650;
const STAMINA_REGEN_PER_SECOND = 45;
const PLAYER_NAME = "Moon Knight";
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
const COMPANION_DEPLOY_DISTANCE = 285;
const COMPANION_TELEPORT_DISTANCE = 720;
const COMPANION_SUMMON_DURATION = 900;
const COMPANION_RECALL_DURATION = 980;
const INVENTORY_CAPACITY = 30;
const ACTIVE_SLOT_COUNT = 5;
const BABY_DRAGON_CARD:InventoryItem = {
  id:"baby-dragon-card",name:"Baby Dragon",type:"animal-card",description:"A magical card holding the spirit of a young ash dragon.",image:"/baby-dragon-sprite-sheet.png",
  palette:{dark:"#090d0c",mid:"#202a24",accent:"#71d92f",glow:"#b2ff55"}
};
const JACKAL_MAX_HEALTH = 70;
const JACKAL_ATTACK_DAMAGE = 8;
const JACKAL_SIGHT_RANGE = 620;
const JACKAL_ATTACK_RANGE = 118;
const JACKAL_RENDER_SIZE = 92;
const SUNSET_JACKAL_CARD:InventoryItem = {
  id:"sunset-jackal-card",name:"Sunset Jackal",type:"animal-card",description:"A magical card holding the spirit of a dusk-born jackal from the sunset shore.",image:"/baby-dragon-sprite-sheet.png",
  palette:{dark:"#2a120c",mid:"#7a3118",accent:"#f08a3a",glow:"#ffd27a"}
};
const FOX_MAX_HEALTH = 55;
const FOX_ATTACK_DAMAGE = 7;
const FOX_RENDER_SIZE = 78;
const CINDER_FOX_CARD:InventoryItem = {id:"cinder-fox-card",name:"Cinder Fox",type:"animal-card",description:"An ember fox spirit from Ash Hollow.",image:"/baby-dragon-sprite-sheet.png",palette:{dark:"#1a0a08",mid:"#6a2414",accent:"#ff7a3a",glow:"#ffc08a"}};
const STAG_MAX_HEALTH = 95;
const STAG_ATTACK_DAMAGE = 10;
const STAG_RENDER_SIZE = 118;
const PALE_STAG_CARD:InventoryItem = {id:"pale-stag-card",name:"Pale Stag",type:"animal-card",description:"A moonwell stag spirit from the cliffs.",image:"/baby-dragon-sprite-sheet.png",palette:{dark:"#0b1418",mid:"#2a4a55",accent:"#8ee7ff",glow:"#d7fbff"}};
const CAMPAIGN_OPENING:Line[] = [{speaker:"Moon Night",text:"The rain carries a signal. Something in Ashfall is still calling."},{speaker:"Moon Night",text:"Follow the echo through castle, shore, ash, and moonwell. Press E for cards, Q to deploy."}];
const MAP_STORY:Record<MapId,{name:string;objective:string;intro:Line[]}> = {1:{name:"The Signal in the Rain",objective:"Find the baby dragon in the rain, then take the far-right portal.",intro:[{speaker:"Moon Night",text:"Moonlit stone. A young ash dragon hunts these ruins."}]},2:{name:"Sunset Shore",objective:"Track the Sunset Jackals, then take the eastern portal to Ash Hollow.",intro:[{speaker:"Moon Night",text:"The shore burns gold. Bind a jackal, then push east."}]},3:{name:"Ash Hollow",objective:"Bind a Cinder Fox, then reach the moonwell gate.",intro:[{speaker:"Moon Night",text:"Foxfire moves through the ash."}]},4:{name:"Moonwell Cliffs",objective:"Face the Pale Stag. Maps 5 and 6 are still sealed.",intro:[{speaker:"Moon Night",text:"The far gate is sealed. Maps 5 and 6 still wait."}]},5:{name:"The Quiet Ember",objective:"Reserved for Game Builder 2.",intro:[{speaker:"Moon Night",text:"Not open yet."}]},6:{name:"Ashfall's Heart",objective:"Reserved for Game Builder 2.",intro:[{speaker:"Moon Night",text:"The last echo is still unwritten."}]}};
const SEALED_GATE_LINES:Line[] = [{speaker:"Moon Night",text:"The gate answers, but Maps 5 and 6 are not open yet."}];
const cardStats = (id:string|null) => id===SUNSET_JACKAL_CARD.id?{hp:JACKAL_MAX_HEALTH,ground:true as const,kind:"jackal"}:id===CINDER_FOX_CARD.id?{hp:FOX_MAX_HEALTH,ground:true as const,kind:"fox"}:id===PALE_STAG_CARD.id?{hp:STAG_MAX_HEALTH,ground:true as const,kind:"stag"}:{hp:DRAGON_MAX_HEALTH,ground:false as const,kind:"dragon"};
type Jackal = Dragon & {id:string; patrolMin:number; patrolMax:number};
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
const map3Platforms: Platform[] = [
  {x:0,y:590,w:MAP3_W,h:180},{x:620,y:470,w:180,h:18},{x:1480,y:455,w:200,h:18},{x:2480,y:465,w:190,h:18},{x:3320,y:450,w:170,h:18}
];
const map4Platforms: Platform[] = [
  {x:0,y:590,w:1180,h:180},{x:1140,y:560,w:980,h:210},{x:2080,y:575,w:900,h:195},{x:2940,y:545,w:1260,h:225},
  {x:720,y:455,w:160,h:18},{x:1760,y:430,w:180,h:18},{x:2860,y:420,w:190,h:18}
];
const clamp = (n:number,a:number,b:number) => Math.max(a,Math.min(b,n));
const rgbaFromHex = (hex:string,alpha:number) => {const value=parseInt(hex.replace("#",""),16);return `rgba(${value>>16},${value>>8&255},${value&255},${alpha})`;};
const worldWidthFor = (map:MapId) => map===1?MAP1_W:map===2?MAP2_W:map===3?MAP3_W:map===4?MAP4_W:map===5?4400:4800;
const platformsFor = (map:MapId) => map===1?map1Platforms:map===2?map2Platforms:map===3?map3Platforms:map4Platforms;
const spawnFor = (map:MapId, from:MapId|null) => {
  if(from===null) return {x:230,y:498,facing:1 as 1|-1};
  if(map===1) return {x:4860,y:483,facing:-1 as 1|-1};
  const arrivingFromPrev = (map===2&&from===1)||(map===3&&from===2)||(map===4&&from===3);
  if(arrivingFromPrev) return {x:340,y:498,facing:1 as 1|-1};
  return {x:Math.max(240,worldWidthFor(map)-340),y:498,facing:-1 as 1|-1};
};
const respawnXFor = (map:MapId) => map===1?230:340;

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
  const staminaRef = useRef(MAX_STAMINA);
  const staminaUsedAt = useRef(-Infinity);
  const player = useRef<Player>({x:230,y:498,vx:0,vy:0,grounded:true,facing:1,step:0,jumpsLeft:2,crouched:false,sliding:false,health:MAX_HEALTH,maxHealth:MAX_HEALTH,swordDamage:SWORD_DAMAGE});
  const startedRef = useRef(false);
  const dialogueRef = useRef<Line[]|null>(null);
  const dialogueIndexRef = useRef(0);
  const actionUntil = useRef(0);
  const actionStartedAt = useRef(0);
  const pickupQueued = useRef(false);
  const deployQueued = useRef(false);
  const companionCastRef = useRef<{started:number;kind:"summon"|"recall"|null;direction:1|-1}>({started:0,kind:null,direction:1});
  const inventoryOpenRef = useRef(false);
  const inventoryRef = useRef<InventoryItem[]>([]);
  const equippedRef = useRef<(string|null)[]>(Array(ACTIVE_SLOT_COUNT).fill(null));
  const selectedSlotRef = useRef(0);
  const companionRef = useRef<Companion>({active:false,itemId:null,map:1,x:150,y:590,groundY:590,vx:0,facing:1,mode:"idle",modeStarted:0,summonedAt:0,recallStarted:0,teleportAt:0,attackUntil:0,attackLanded:false,targetX:0,lastPlayerAttack:-1,health:DRAGON_MAX_HEALTH,maxHealth:DRAGON_MAX_HEALTH});
  const seenIntroRef = useRef<Set<MapId>>(new Set());
  const audioRef = useRef<AudioContext|null>(null);
  const soundRef = useRef(true);
  const [started,setStarted] = useState(false);
  const [mapNumber,setMapNumber] = useState<MapId>(1);
  const [dialogue,setDialogue] = useState<Line[]|null>(null);
  const [dialogueIndex,setDialogueIndex] = useState(0);
  const [nearAction,setNearAction] = useState<string|null>(null);
  const [objective,setObjective] = useState(MAP_STORY[1].objective);
  const [soundOn,setSoundOn] = useState(true);
  const [health,setHealth] = useState(MAX_HEALTH);
  const [stamina,setStamina] = useState(MAX_STAMINA);
  const [inventoryOpen,setInventoryOpen] = useState(false);
  const [inventory,setInventory] = useState<InventoryItem[]>([]);
  const [equipped,setEquipped] = useState<(string|null)[]>(Array(ACTIVE_SLOT_COUNT).fill(null));
  const [selectedSlot,setSelectedSlot] = useState(0);
  const [deployedItemId,setDeployedItemId] = useState<string|null>(null);

  const selectUsableSlot = useCallback((slot:number)=>{
    const next=clamp(slot,0,ACTIVE_SLOT_COUNT-1);selectedSlotRef.current=next;setSelectedSlot(next);
  },[]);

  const toggleInventory = useCallback(()=>{
    if(!startedRef.current)return;
    setInventoryOpen(open=>{
      const next=!open;inventoryOpenRef.current=next;
      keys.current={};jumpQueued.current=false;slideQueued.current=false;
      return next;
    });
  },[]);

  const collectInventoryItem = useCallback((item:InventoryItem)=>{
    if(inventoryRef.current.some(existing=>existing.id===item.id))return true;
    if(inventoryRef.current.length>=INVENTORY_CAPACITY)return false;
    const next=[...inventoryRef.current,item];inventoryRef.current=next;setInventory(next);
    return true;
  },[]);

  const toggleEquippedItem = useCallback((itemId:string)=>{
    const current=equippedRef.current;
    const equippedIndex=current.indexOf(itemId);
    let next=[...current];
    if(equippedIndex>=0){
      next[equippedIndex]=null;
      const ally=companionRef.current;
      if(ally.active&&ally.itemId===itemId&&ally.recallStarted===0){const now=performance.now(),direction:1|-1=ally.x>=player.current.x?1:-1;ally.recallStarted=now;ally.attackUntil=0;ally.vx=0;companionCastRef.current={started:now,kind:"recall",direction};player.current.facing=direction;}
    }
    else{
      const openIndex=next.indexOf(null);
      if(openIndex<0)return;
      next[openIndex]=itemId;
    }
    equippedRef.current=next;setEquipped(next);
  },[]);

  const tone = useCallback((freq:number,duration=.12,volume=.024) => {
    const audio = audioRef.current;
    if (!audio || !soundRef.current) return;
    const osc=audio.createOscillator(), gain=audio.createGain();
    osc.type="sine"; osc.frequency.setValueAtTime(freq,audio.currentTime);
    gain.gain.setValueAtTime(volume,audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);
    osc.connect(gain).connect(audio.destination); osc.start(); osc.stop(audio.currentTime+duration);
  },[]);

  const advanceDialogue = useCallback(() => {
    const lines=dialogueRef.current;
    if (!lines) return;
    const next=dialogueIndexRef.current+1;
    if (next>=lines.length) { dialogueRef.current=null; setDialogue(null); return; }
    dialogueIndexRef.current=next; setDialogueIndex(next); tone(470+next*35,.12,.016);
  },[tone]);

  const showDialogue = useCallback((lines:Line[]) => {
    if(!lines.length) return;
    dialogueRef.current=lines;dialogueIndexRef.current=0;setDialogue(lines);setDialogueIndex(0);
  },[]);
  const enterMap = useCallback((map:MapId, from:MapId|null=mapRef.current) => {
    mapRef.current=map;setMapNumber(map);
    const pl=player.current;
    const spawn=spawnFor(map, from);
    pl.x=spawn.x;pl.y=spawn.y;pl.facing=spawn.facing;
    setObjective(MAP_STORY[map].objective);
    if(!seenIntroRef.current.has(map)){
      seenIntroRef.current.add(map);
      showDialogue(MAP_STORY[map].intro);
    }else{
      dialogueRef.current=null;setDialogue(null);
    }
    pl.vx=0;pl.vy=0;pl.grounded=true;pl.jumpsLeft=2;pl.crouched=false;pl.sliding=false;
    const ally=companionRef.current;
    if(ally.active){const now=performance.now();ally.map=map;ally.x=pl.x-pl.facing*96;ally.y=pl.y+PH;ally.groundY=ally.y;ally.vx=0;ally.mode="idle";ally.modeStarted=now;ally.teleportAt=now;}
    slideUntil.current=0;actionUntil.current=0;cameraReset.current=true;
    portalFlashUntil.current=performance.now()+430;
    tone(610,.25,.028);window.setTimeout(()=>tone(360,.2,.02),100);
  },[showDialogue,tone]);

  const startGame = useCallback(() => {
    if (!audioRef.current) audioRef.current=new AudioContext();
    audioRef.current.resume();
    startedRef.current=true; setStarted(true);
    seenIntroRef.current.add(1);
    showDialogue(CAMPAIGN_OPENING);
  },[showDialogue]);

  const interact = useCallback(() => {
    if (dialogueRef.current) { advanceDialogue(); return; }
    const x=player.current.x;
    const map=mapRef.current;
    if(map===1&&Math.abs(x-(MAP1_PORTAL_X+55))<145) enterMap(2,1);
    else if(map===2&&Math.abs(x-(MAP2_PORTAL_X+55))<145) enterMap(1,2);
    else if(map===2&&Math.abs(x-(MAP2_EXIT_X+55))<145) enterMap(3,2);
    else if(map===3&&Math.abs(x-(MAP3_ENTRY_X+55))<145) enterMap(2,3);
    else if(map===3&&Math.abs(x-(MAP3_EXIT_X+55))<145) enterMap(4,3);
    else if(map===4&&Math.abs(x-(MAP4_ENTRY_X+55))<145) enterMap(3,4);
    else if(map===4&&Math.abs(x-(MAP4_EXIT_X+55))<145) showDialogue(SEALED_GATE_LINES);
  },[advanceDialogue,enterMap,showDialogue]);

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
    if (!startedRef.current||dialogueRef.current||inventoryOpenRef.current) return;
    const now=performance.now();
    if(staminaRef.current<SWORD_STAMINA_COST){tone(72,.12,.018);return;}
    staminaRef.current=Math.max(0,staminaRef.current-SWORD_STAMINA_COST);
    staminaUsedAt.current=now;setStamina(Math.round(staminaRef.current));
    attackAngle.current=aimAngle.current;
    activeAttackDamage.current=player.current.swordDamage;
    player.current.facing=Math.cos(attackAngle.current)>=0?1:-1;
    actionStartedAt.current=now;actionUntil.current=now+360;
    tone(145,.1,.025);window.setTimeout(()=>tone(235,.08,.018),95);
  },[tone]);

  useEffect(()=>{
    const down=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase(); keys.current[k]=true;
      if (["arrowleft","arrowright","arrowup","arrowdown"," ","tab"].includes(k)) e.preventDefault();
      if(k==="tab"&&!e.repeat){toggleInventory();return;}
      if(inventoryOpenRef.current){keys.current[k]=false;return;}
      if(startedRef.current&&/^[1-5]$/.test(k)&&!e.repeat){selectUsableSlot(Number(k)-1);return;}
      if(startedRef.current&&k==="q"&&!e.repeat){deployQueued.current=true;return;}
      if (!startedRef.current && (k==="enter"||k===" ")) startGame();
      else if (dialogueRef.current && (k==="enter"||k===" "||k==="e")&&!e.repeat) advanceDialogue();
      else {
        if ((k==="w"||k==="arrowup"||k===" ")&&!e.repeat) jumpQueued.current=true;
        if ((k==="s"||k==="arrowdown")&&!e.repeat) slideQueued.current=true;
        if (k==="e"&&!e.repeat){pickupQueued.current=true;interact();}
      }
    };
    const up=(e:KeyboardEvent)=>{ keys.current[e.key.toLowerCase()]=false; };
    const aim=(e:PointerEvent)=>updateAim(e.clientX,e.clientY);
    window.addEventListener("keydown",down,{passive:false}); window.addEventListener("keyup",up);
    window.addEventListener("pointermove",aim,{passive:true});
    return()=>{window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);window.removeEventListener("pointermove",aim);};
  },[advanceDialogue,interact,selectUsableSlot,startGame,toggleInventory,updateAim]);

  useEffect(()=>{
    const canvas=canvasRef.current, ctx=canvas?.getContext("2d");
    if (!canvas||!ctx) return;
    let raf=0,last=performance.now(),cameraX=0,lastAction="",lastHealth=player.current.health,lastStamina=Math.round(staminaRef.current);
    const backdrop=new Image(); backdrop.src="/pixel-castle-night.png";
    const beachBackdrop=new Image(); beachBackdrop.src="/map2-sunset-beach.png";
    const knight=new Image(); knight.src="/knight-sprite-sheet.png";
    const dragonImage=new Image(); dragonImage.src="/baby-dragon-sprite-sheet.png";
    const dragon:Dragon={x:1710,y:570,groundY:570,vx:0,facing:1,mode:"idle",modeStarted:last,modeUntil:last+2800,health:DRAGON_MAX_HEALTH,maxHealth:DRAGON_MAX_HEALTH,attackDamage:DRAGON_ATTACK_DAMAGE,lastPlayerAttack:-1,attackLanded:false,hurtStarted:0,hurtUntil:0,hitDirection:1,lastDamage:0,angry:false,landing:false,targetX:1840,awarenessUntil:0};
    const createJackal=(id:string,x:number,patrolMin:number,patrolMax:number):Jackal=>({
      id,x,y:590,groundY:590,vx:0,facing:1,mode:"idle",modeStarted:last,modeUntil:last+2200+Math.random()*1800,
      health:JACKAL_MAX_HEALTH,maxHealth:JACKAL_MAX_HEALTH,attackDamage:JACKAL_ATTACK_DAMAGE,lastPlayerAttack:-1,attackLanded:false,
      hurtStarted:0,hurtUntil:0,hitDirection:1,lastDamage:0,angry:false,landing:false,targetX:x+80,awarenessUntil:0,patrolMin,patrolMax
    });
    const jackals:Jackal[]=[
      createJackal("sunset-jackal-a",980,720,1280),
      createJackal("sunset-jackal-b",1880,1580,2280),
      createJackal("sunset-jackal-c",2860,2520,3320)
    ];
    let playerHurtUntil=0,playerRespawnAt=0,dragonCardCollected=inventoryRef.current.some(item=>item.id===BABY_DRAGON_CARD.id);
    let jackalCardCollected=inventoryRef.current.some(item=>item.id===SUNSET_JACKAL_CARD.id);
    const eyeLayer=document.createElement("canvas"),eyeLayerCtx=eyeLayer.getContext("2d");
    const eyeCoverLayer=document.createElement("canvas"),eyeCoverCtx=eyeCoverLayer.getContext("2d");
    const attackBodyLayer=document.createElement("canvas"),attackBodyCtx=attackBodyLayer.getContext("2d");
    const castBodyLayer=document.createElement("canvas"),castBodyCtx=castBodyLayer.getContext("2d");
    const attackWeaponLayer=document.createElement("canvas"),attackWeaponCtx=attackWeaponLayer.getContext("2d");
    const eyeBands=new Map<string,{x:number;y:number;w:number;h:number}|null>();
    let eyePixels:Uint8ClampedArray|null=null;
    const prepareActualEyes=()=>{
      if(!eyeLayerCtx||!eyeCoverCtx||!attackBodyCtx||!castBodyCtx||!attackWeaponCtx||!knight.naturalWidth)return;
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

      castBodyLayer.width=knight.naturalWidth;castBodyLayer.height=knight.naturalHeight;castBodyCtx.clearRect(0,0,castBodyLayer.width,castBodyLayer.height);castBodyCtx.drawImage(knight,0,0);
      castBodyCtx.globalCompositeOperation="destination-out";castBodyCtx.beginPath();castBodyCtx.moveTo(900,1120);castBodyCtx.lineTo(1018,1120);castBodyCtx.lineTo(1018,1174);castBodyCtx.lineTo(900,1174);castBodyCtx.closePath();castBodyCtx.fill();castBodyCtx.globalCompositeOperation="source-over";
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
    const drawCompanionCast=(pl:Player,now:number)=>{
      const cast=companionCastRef.current;
      if(!cast.kind)return;
      const duration=cast.kind==="recall"?COMPANION_RECALL_DURATION:780,progress=clamp((now-cast.started)/duration,0,1);
      if(progress>=1){cast.kind=null;return;}
      const eased=progress*progress*(3-2*progress),fade=1-clamp((progress-.72)/.28,0,1);
      const ally=companionRef.current,palette=inventoryRef.current.find(item=>item.id===ally.itemId)?.palette??BABY_DRAGON_CARD.palette;
      const direction=cast.direction,color=palette.glow;
      const handX=pl.x+direction*26,handY=pl.y+59-Math.sin(progress*Math.PI)*3;
      const pulse=.7+Math.sin(now*.018)*.3;

      ctx.save();ctx.globalCompositeOperation="screen";
      const bodyGlow=ctx.createRadialGradient(pl.x,pl.y+48,2,pl.x,pl.y+48,66);bodyGlow.addColorStop(0,rgbaFromHex(palette.accent,.2*fade));bodyGlow.addColorStop(1,rgbaFromHex(palette.dark,0));ctx.fillStyle=bodyGlow;ctx.fillRect(pl.x-72,pl.y-22,144,142);
      ctx.restore();

      ctx.save();ctx.translate(pl.x,pl.y+PH+2);ctx.scale(1,.26);ctx.globalAlpha=fade*(.35+.35*pulse);ctx.strokeStyle=color;ctx.shadowColor=color;ctx.shadowBlur=16;ctx.lineWidth=2;
      for(let ring=0;ring<2;ring++){const radius=18+eased*26+ring*11;ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.stroke();}
      ctx.restore();

      ctx.save();ctx.globalAlpha=fade;ctx.strokeStyle=color;ctx.shadowColor=color;ctx.shadowBlur=14;ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(pl.x+direction*8,pl.y+55);ctx.quadraticCurveTo(pl.x+direction*25,pl.y+27-Math.sin(progress*Math.PI)*9,handX,handY);ctx.stroke();
      for(let mote=0;mote<10;mote++){
        const angle=mote*Math.PI*.2+now*.006*(mote%2?1:-1),radius=9+(mote%3)*4+eased*5;
        const mx=handX+Math.cos(angle)*radius,my=handY+Math.sin(angle)*radius*.65;
        ctx.globalAlpha=fade*(.45+(mote%3)*.2);ctx.fillStyle=mote%3===0?"#ffffff":color;ctx.beginPath();ctx.arc(mx,my,.9+(mote%2)*.7,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();

      const isSummon=cast.kind==="summon";
      const rawThrow=clamp((progress-.12)/.56,0,1),throwProgress=isSummon?rawThrow*rawThrow*(3-2*rawThrow):0;
      const cardArrive=clamp(progress/.18,0,1);
      const cardFade=isSummon?1-clamp((progress-.7)/.18,0,1):1-clamp((progress-.94)/.06,0,1);
      const heldX=handX+direction*7,heldY=handY-8;
      const targetX=ally.active?ally.x:handX,targetY=ally.active?ally.y-48:handY;
      const controlX=(heldX+targetX)/2,controlY=Math.min(heldY,targetY)-(isSummon?108:72);
      const inverseThrow=1-throwProgress;
      const cardX=isSummon?inverseThrow*inverseThrow*heldX+2*inverseThrow*throwProgress*controlX+throwProgress*throwProgress*targetX:heldX;
      const cardY=isSummon?inverseThrow*inverseThrow*heldY+2*inverseThrow*throwProgress*controlY+throwProgress*throwProgress*targetY:heldY;
      ctx.save();ctx.translate(cardX,cardY);ctx.rotate(isSummon?direction*(-.28+throwProgress*Math.PI*3.6):direction*(-.26+Math.sin(progress*Math.PI)*.045));ctx.scale(.55+cardArrive*.45,.55+cardArrive*.45);ctx.globalAlpha=cardArrive*cardFade;ctx.shadowColor=color;ctx.shadowBlur=18;
      const cardGradient=ctx.createLinearGradient(-8,-13,8,13);cardGradient.addColorStop(0,palette.glow);cardGradient.addColorStop(.3,palette.mid);cardGradient.addColorStop(1,palette.dark);ctx.fillStyle=cardGradient;ctx.beginPath();ctx.roundRect(-8,-13,16,26,2.5);ctx.fill();ctx.strokeStyle="#efffd7";ctx.lineWidth=1.2;ctx.stroke();ctx.strokeStyle=color;ctx.beginPath();ctx.arc(0,-1,4,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#efffd7";ctx.font="900 5px ui-monospace, SFMono-Regular, Menlo, monospace";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("✦",0,7);
      const gripAlpha=isSummon?1-clamp(throwProgress/.2,0,1):1;
      if(gripAlpha>0){const gripX=-direction*7;ctx.globalAlpha=cardArrive*cardFade*gripAlpha;ctx.shadowBlur=0;ctx.fillStyle="#1b1025";ctx.fillRect(gripX-4,7,8,5);ctx.fillStyle="#4e2678";ctx.fillRect(gripX-3,5,7,5);ctx.fillStyle="#8a55bd";ctx.fillRect(gripX-2,5,5,2);ctx.fillStyle="#2c153f";ctx.fillRect(gripX-direction*2,3,3,7);}
      ctx.restore();

      const trailProgress=clamp((progress-.18)/.62,0,1);
      if(trailProgress>0&&ally.active){
        ctx.save();ctx.globalCompositeOperation="screen";ctx.strokeStyle=color;ctx.shadowColor=color;ctx.shadowBlur=12;ctx.lineWidth=1.5;ctx.globalAlpha=fade*(1-trailProgress*.35);ctx.setLineDash([4,7]);ctx.lineDashOffset=(isSummon?-1:1)*now*.035;ctx.beginPath();ctx.moveTo(isSummon?handX:targetX,isSummon?handY:targetY);ctx.quadraticCurveTo(controlX,controlY,isSummon?targetX:handX,isSummon?targetY:handY);ctx.stroke();ctx.restore();
        if(!isSummon){
          ctx.save();ctx.globalCompositeOperation="screen";ctx.shadowColor=color;ctx.shadowBlur=10;
          for(let mote=0;mote<9;mote++){const travel=(progress*1.65+mote/9)%1,back=1-travel;const mx=back*back*targetX+2*back*travel*controlX+travel*travel*handX,my=back*back*targetY+2*back*travel*controlY+travel*travel*handY;ctx.globalAlpha=fade*(.25+travel*.7);ctx.fillStyle=mote%3===0?"#ffffff":color;ctx.beginPath();ctx.arc(mx,my,1+(mote%2)*.7,0,Math.PI*2);ctx.fill();}ctx.restore();
        }
      }
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
      const castState=companionCastRef.current,castDuration=castState.kind==="recall"?COMPANION_RECALL_DURATION:780,casting=Boolean(castState.kind&&now-castState.started<castDuration);
      if(attacking||casting){list=SPRITE_FRAMES.action;index=1;}
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
        if(casting&&castBodyLayer.width)ctx.drawImage(castBodyLayer,f.x,f.y,f.w,f.h,-dw/2,drawY,dw,dh);
        else if(attacking&&attackBodyLayer.width)ctx.drawImage(attackBodyLayer,f.x,f.y,f.w,f.h,-dw/2,drawY,dw,dh);
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
      drawCompanionCast(pl,now);
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
    const commandCompanionAttack=(targetX:number,now:number)=>{
      const ally=companionRef.current;
      if(!ally.active||ally.map!==mapRef.current)return;
      ally.targetX=targetX;ally.attackUntil=now+900;ally.attackLanded=false;
      if(Math.abs(targetX-ally.x)<145){ally.mode="attack";ally.modeStarted=now;ally.facing=targetX>=ally.x?1:-1;}
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
          companionRef.current.lastPlayerAttack=actionStartedAt.current;
          commandCompanionAttack(dragon.x,now);
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
            commandCompanionAttack(dragon.x,now);
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
        staminaRef.current=MAX_STAMINA;staminaUsedAt.current=-Infinity;
        playerRespawnAt=0;cameraReset.current=true;portalFlashUntil.current=now+430;
      }
    };
    const beginJackalMode=(jackal:Jackal,mode:DragonMode,now:number,duration:number)=>{
      jackal.mode=mode;jackal.modeStarted=now;jackal.modeUntil=now+duration;jackal.landing=false;
      if(mode==="fly")jackal.y=Math.min(jackal.y,jackal.groundY-36);
      if(mode==="attack")jackal.y=Math.min(jackal.y,jackal.groundY-10);
      if(mode==="idle"||mode==="walk"||mode==="run"||mode==="sleep")jackal.y=jackal.groundY;
      if(mode==="idle"||mode==="sleep")jackal.vx*=.5;
      if(mode==="attack")jackal.vx*=.22;
    };
    const beginJackalTravel=(jackal:Jackal,mode:"walk"|"run"|"fly",now:number,duration:number,targetX:number)=>{
      jackal.targetX=clamp(targetX,jackal.patrolMin,jackal.patrolMax);
      beginJackalMode(jackal,mode,now,duration);
      jackal.facing=jackal.targetX>=jackal.x?1:-1;
    };
    const chooseJackalMode=(jackal:Jackal,now:number)=>{
      const pl=player.current,distance=Math.abs(pl.x-jackal.x),approaching=(pl.x-jackal.x)*pl.vx<0;
      const runAwayTarget=pl.x<jackal.x?jackal.patrolMax:jackal.patrolMin;
      const randomTarget=jackal.patrolMin+20+Math.random()*(jackal.patrolMax-jackal.patrolMin-40);
      const roll=Math.random();
      if(distance<120&&approaching&&Math.abs(pl.vx)>150){
        jackal.awarenessUntil=now+2200;
        beginJackalTravel(jackal,"run",now,900+Math.random()*500,runAwayTarget);
      }else if(distance<240&&roll<.5){
        jackal.awarenessUntil=now+1600;
        beginJackalMode(jackal,"idle",now,1100+Math.random()*1200);
        jackal.facing=pl.x>=jackal.x?1:-1;
      }else if(roll<.32)beginJackalMode(jackal,"idle",now,1600+Math.random()*1800);
      else if(roll<.62)beginJackalTravel(jackal,"walk",now,1800+Math.random()*1400,randomTarget);
      else if(roll<.8)beginJackalTravel(jackal,"run",now,900+Math.random()*700,randomTarget);
      else if(roll<.9)beginJackalTravel(jackal,"fly",now,780+Math.random()*420,randomTarget);
      else if(distance>220)beginJackalMode(jackal,"sleep",now,4200+Math.random()*3200);
      else{beginJackalMode(jackal,"idle",now,1400);jackal.facing=pl.x>=jackal.x?1:-1;}
    };
    const jackalCounterAttack=(jackal:Jackal,now:number)=>{
      jackal.facing=player.current.x>=jackal.x?1:-1;
      jackal.attackLanded=false;
      beginJackalMode(jackal,"attack",now,920);
      tone(280,.1,.02);window.setTimeout(()=>tone(160,.16,.022),150);
    };
    const nearestLiveJackal=(x:number)=>{
      let best:Jackal|null=null,bestDist=Infinity;
      for(const jackal of jackals){
        if(jackal.health<=0)continue;
        const dist=Math.abs(jackal.x-x);
        if(dist<bestDist){best=jackal;bestDist=dist;}
      }
      return best;
    };
    const hitJackalWithSword=(jackal:Jackal,now:number)=>{
      const pl=player.current;
      const swingProgress=(now-actionStartedAt.current)/360;
      if(!(activeAttackDamage.current>0&&actionUntil.current>now&&swingProgress>.14&&swingProgress<.9&&jackal.lastPlayerAttack!==actionStartedAt.current))return;
      const centerY=jackal.mode==="fly"?jackal.y-18:jackal.y-28;
      const targetAngle=Math.atan2(centerY-(pl.y+38),jackal.x-pl.x);
      const angleDifference=Math.atan2(Math.sin(targetAngle-attackAngle.current),Math.cos(targetAngle-attackAngle.current));
      const distance=Math.hypot(jackal.x-pl.x,centerY-(pl.y+38));
      if(distance<160&&Math.abs(angleDifference)<.9){
        jackal.lastPlayerAttack=actionStartedAt.current;
        companionRef.current.lastPlayerAttack=actionStartedAt.current;
        commandCompanionAttack(jackal.x,now);
        jackal.health=Math.max(0,jackal.health-activeAttackDamage.current);
        jackal.hurtStarted=now;jackal.hurtUntil=now+480;jackal.hitDirection=jackal.x>=pl.x?1:-1;jackal.lastDamage=activeAttackDamage.current;
        if(jackal.health===0){
          jackal.angry=false;jackal.awarenessUntil=0;jackal.attackLanded=true;jackal.vx*=.25;
          beginJackalMode(jackal,"sleep",now,999999999);
          tone(80,.24,.036);window.setTimeout(()=>tone(52,.3,.026),110);
          return;
        }
        jackal.angry=true;jackal.awarenessUntil=now+7000;
        if(jackal.mode!=="attack")jackalCounterAttack(jackal,now);
        tone(110,.08,.03);
      }
    };
    const updateJackals=(dt:number,now:number)=>{
      if(!startedRef.current||mapRef.current!==2)return;
      const pl=player.current;
      for(const jackal of jackals){
        if(jackal.health<=0){
          jackal.angry=false;jackal.vx+=(0-jackal.vx)*(1-Math.exp(-7*dt));jackal.x+=jackal.vx*dt;
          jackal.y+=(jackal.groundY-jackal.y)*(1-Math.exp(-8*dt));
          continue;
        }
        hitJackalWithSword(jackal,now);
        if(jackal.health<=0)continue;
        const playerDistance=Math.abs(pl.x-jackal.x);
        const sightDistance=Math.hypot(pl.x-jackal.x,(pl.y+PH*.45)-(jackal.y-24));
        const startled=playerDistance<110&&(pl.x-jackal.x)*pl.vx<0&&Math.abs(pl.vx)>140;
        if(jackal.angry&&(pl.health<=0||sightDistance>JACKAL_SIGHT_RANGE)){
          jackal.angry=false;
          if(jackal.mode!=="attack")beginJackalMode(jackal,"idle",now,1400);
        }
        if(!jackal.angry&&jackal.mode==="sleep"&&(playerDistance<150||playerDistance<220&&Math.abs(pl.vx)>90)){
          beginJackalMode(jackal,"idle",now,1100);jackal.facing=pl.x>=jackal.x?1:-1;jackal.awarenessUntil=now+2200;
        }else if(!jackal.angry&&startled&&jackal.mode!=="attack"&&jackal.mode!=="run"){
          jackal.awarenessUntil=now+2200;
          beginJackalTravel(jackal,"run",now,900,pl.x<jackal.x?jackal.patrolMax:jackal.patrolMin);
        }else if(!jackal.angry&&jackal.mode==="idle"&&(playerDistance<240||now<jackal.awarenessUntil)){
          jackal.facing=pl.x>=jackal.x?1:-1;
        }
        if(jackal.mode==="attack"){
          if(playerDistance>16)jackal.facing=pl.x>=jackal.x?1:-1;
          jackal.vx+=(0-jackal.vx)*(1-Math.exp(-9*dt));
          const lunge=clamp((now-jackal.modeStarted-280)/220,0,1);
          jackal.x+=jackal.facing*lunge*92*dt*3.2;
          jackal.y+=(jackal.groundY-8-Math.sin(lunge*Math.PI)*16-jackal.y)*(1-Math.exp(-10*dt));
          if(!jackal.attackLanded&&now-jackal.modeStarted>420){
            const forward=(pl.x-jackal.x)*jackal.facing;
            const vertical=Math.abs((pl.y+42)-jackal.y);
            if(forward>-10&&forward<120&&vertical<100&&playerRespawnAt===0){
              pl.health=Math.max(0,pl.health-jackal.attackDamage);
              playerHurtUntil=now+340;
              commandCompanionAttack(jackal.x,now);
              if(pl.health===0){jackal.angry=false;playerRespawnAt=now+950;}
              tone(74,.18,.032);
            }
            jackal.attackLanded=true;
          }
          if(now>=jackal.modeUntil){
            if(jackal.angry&&pl.health>0&&sightDistance<=JACKAL_SIGHT_RANGE){
              if(playerDistance<=JACKAL_ATTACK_RANGE+12)jackalCounterAttack(jackal,now);
              else{jackal.targetX=clamp(pl.x,jackal.patrolMin,jackal.patrolMax);beginJackalMode(jackal,"run",now,800);jackal.facing=pl.x>=jackal.x?1:-1;}
            }else{jackal.angry=false;beginJackalMode(jackal,"idle",now,1200);jackal.facing=pl.x>=jackal.x?1:-1;}
          }
          continue;
        }
        if(jackal.angry){
          if(playerDistance>16)jackal.facing=pl.x>=jackal.x?1:-1;
          if(playerDistance<=JACKAL_ATTACK_RANGE){jackalCounterAttack(jackal,now);continue;}
          jackal.targetX=clamp(pl.x,jackal.patrolMin,jackal.patrolMax);
          if(jackal.mode!=="run"&&jackal.mode!=="fly")beginJackalMode(jackal,"run",now,800);
          else jackal.modeUntil=now+800;
        }else if(jackal.mode==="fly"&&now>=jackal.modeUntil){
          if(!jackal.landing){jackal.landing=true;jackal.modeUntil=now+420;}
          else beginJackalMode(jackal,"idle",now,1200+Math.random()*800);
        }else if(now>=jackal.modeUntil)chooseJackalMode(jackal,now);
        if(jackal.mode==="walk"||jackal.mode==="run"||jackal.mode==="fly"){
          const distanceToTarget=jackal.targetX-jackal.x;
          if(Math.abs(distanceToTarget)>14)jackal.facing=distanceToTarget>=0?1:-1;
          if(jackal.mode!=="fly"&&Math.abs(distanceToTarget)<12){
            if(jackal.angry)jackal.vx+=(0-jackal.vx)*(1-Math.exp(-7*dt));
            else beginJackalMode(jackal,"idle",now,1100+Math.random()*900);
          }else{
            const speed=jackal.mode==="walk"?48:jackal.mode==="run"?(jackal.angry?168:128):96;
            const targetSpeed=jackal.facing*(jackal.mode==="fly"&&jackal.landing?speed*.4:speed);
            jackal.vx+=(targetSpeed-jackal.vx)*(1-Math.exp(-(jackal.mode==="run"?6:4)*dt));
            jackal.x+=jackal.vx*dt;
            if(jackal.x<=jackal.patrolMin){jackal.x=jackal.patrolMin;jackal.targetX=jackal.patrolMax;jackal.facing=1;}
            if(jackal.x>=jackal.patrolMax){jackal.x=jackal.patrolMax;jackal.targetX=jackal.patrolMin;jackal.facing=-1;}
            const leap=jackal.mode==="fly"?Math.sin(clamp((now-jackal.modeStarted)/(jackal.modeUntil-jackal.modeStarted||1),0,1)*Math.PI)*54:0;
            const targetY=jackal.groundY-leap;
            jackal.y+=(targetY-jackal.y)*(1-Math.exp(-10*dt));
          }
        }else{
          jackal.vx+=(0-jackal.vx)*(1-Math.exp(-8*dt));
          jackal.y+=(jackal.groundY-jackal.y)*(1-Math.exp(-12*dt));
        }
      }
      if(playerRespawnAt&&now>=playerRespawnAt){
        pl.health=pl.maxHealth;pl.x=mapRef.current===2?340:230;pl.y=498;pl.vx=0;pl.vy=0;pl.grounded=true;pl.jumpsLeft=2;pl.crouched=false;pl.sliding=false;
        staminaRef.current=MAX_STAMINA;staminaUsedAt.current=-Infinity;
        playerRespawnAt=0;cameraReset.current=true;portalFlashUntil.current=now+430;
      }
    };
    const companionSurfaceAt=(x:number,currentY:number,map:MapId)=>{
      const surfaces=platformsFor(map).filter(p=>p.h>80&&x>=p.x&&x<=p.x+p.w);
      if(!surfaces.length)return null;
      return surfaces.reduce((best,p)=>Math.abs(p.y-currentY)<Math.abs(best.y-currentY)?p:best).y;
    };
    const setCompanionMode=(mode:DragonMode,now:number)=>{
      const ally=companionRef.current;
      if(ally.mode===mode)return;
      ally.mode=mode;ally.modeStarted=now;
      if(mode==="attack")ally.attackLanded=false;
    };
    const updateCompanion=(dt:number,now:number)=>{
      const ally=companionRef.current;
      if(!ally.active)return;
      const pl=player.current,map=mapRef.current;
      if(ally.recallStarted>0){
        ally.attackUntil=0;ally.vx+=(0-ally.vx)*(1-Math.exp(-12*dt));ally.x+=ally.vx*dt;
        if(now-ally.recallStarted>=COMPANION_RECALL_DURATION){ally.active=false;ally.itemId=null;ally.recallStarted=0;setDeployedItemId(null);}
        return;
      }
      const jackalAlly=ally.itemId===SUNSET_JACKAL_CARD.id;
      if(ally.map!==map){ally.map=map;ally.x=pl.x-pl.facing*96;ally.groundY=pl.y+PH;ally.y=jackalAlly?ally.groundY:ally.groundY-52;ally.vx=0;ally.mode=jackalAlly?"run":"fly";ally.modeStarted=now;ally.teleportAt=now;}

      const huntedJackal=map===2?nearestLiveJackal(ally.targetX||ally.x):null;
      const hostileActive=(map===1&&dragon.health>0&&now<ally.attackUntil)||(map===2&&Boolean(huntedJackal)&&now<ally.attackUntil);
      const followX=clamp(pl.x-pl.facing*104,28,worldWidthFor(map)-28);
      const playerGround=pl.y+PH;
      if(Math.abs(pl.x-ally.x)>COMPANION_TELEPORT_DISTANCE){
        const arrivalGround=companionSurfaceAt(followX,playerGround,map)??playerGround;
        ally.x=followX;ally.groundY=arrivalGround;ally.y=jackalAlly?arrivalGround:arrivalGround-58;ally.vx=0;ally.attackUntil=0;ally.teleportAt=now;ally.facing=pl.facing;setCompanionMode(jackalAlly?"run":"fly",now);
      }
      const targetX=now<ally.attackUntil?ally.targetX:followX;
      const delta=targetX-ally.x,distance=Math.abs(delta);
      if(distance>18)ally.facing=delta>=0?1:-1;

      if(now<ally.attackUntil&&distance<(jackalAlly?118:138)){
        setCompanionMode("attack",now);
        ally.vx+=(0-ally.vx)*(1-Math.exp(-10*dt));ally.x+=ally.vx*dt;
        const pounceHeight=jackalAlly?8+Math.sin(clamp((now-ally.modeStarted)/720,0,1)*Math.PI)*22:50;
        ally.y+=(ally.groundY-pounceHeight-ally.y)*(1-Math.exp(-10*dt));
        const attackElapsed=now-ally.modeStarted;
        if(!ally.attackLanded&&attackElapsed>390){
          ally.attackLanded=true;
          if(map===1&&hostileActive&&Math.abs(dragon.x-ally.x)<155){
            dragon.health=Math.max(0,dragon.health-8);dragon.hurtStarted=now;dragon.hurtUntil=now+420;dragon.lastDamage=8;dragon.hitDirection=dragon.x>=ally.x?1:-1;
            if(dragon.health===0){dragon.angry=false;dragon.awarenessUntil=0;dragon.vx*=.3;beginDragonMode("sleep",now,999999999);}
            else{dragon.angry=true;dragon.awarenessUntil=now+8000;}
            tone(112,.1,.022);
          }else if(map===2&&huntedJackal&&Math.abs(huntedJackal.x-ally.x)<150){
            huntedJackal.health=Math.max(0,huntedJackal.health-8);huntedJackal.hurtStarted=now;huntedJackal.hurtUntil=now+400;huntedJackal.lastDamage=8;huntedJackal.hitDirection=huntedJackal.x>=ally.x?1:-1;
            if(huntedJackal.health===0){huntedJackal.angry=false;huntedJackal.awarenessUntil=0;huntedJackal.vx*=.25;beginJackalMode(huntedJackal,"sleep",now,999999999);}
            else{huntedJackal.angry=true;huntedJackal.awarenessUntil=now+7000;}
            tone(118,.1,.02);
          }
        }
        if(attackElapsed>720){
          if(now<ally.attackUntil-100){ally.modeStarted=now;ally.attackLanded=false;}
          else{ally.attackUntil=0;setCompanionMode("idle",now);}
        }
        return;
      }

      const currentSurface=companionSurfaceAt(ally.x,ally.groundY,map);
      if(currentSurface!==null)ally.groundY+=(currentSurface-ally.groundY)*(1-Math.exp(-11*dt));
      const noGroundAhead=companionSurfaceAt(ally.x+ally.facing*48,ally.groundY,map)===null;
      const needsFlight=!jackalAlly&&(Math.abs(playerGround-ally.groundY)>34||noGroundAhead);
      if(distance>46){
        const followMode:DragonMode=needsFlight?"fly":jackalAlly&&distance>220?"fly":distance>170?"run":"walk";
        setCompanionMode(followMode,now);
        const speed=followMode==="fly"?(jackalAlly?148:128):followMode==="run"?(jackalAlly?176:158):64;
        const response=followMode==="walk"?4.2:followMode==="fly"?4.8:6.6;
        ally.vx+=(ally.facing*speed-ally.vx)*(1-Math.exp(-response*dt));ally.x+=ally.vx*dt;
        ally.x=clamp(ally.x,28,worldWidthFor(map)-28);
        const nextSurface=companionSurfaceAt(ally.x,ally.groundY,map);
        if(nextSurface!==null)ally.groundY+=(nextSurface-ally.groundY)*(1-Math.exp(-10*dt));
        const leapArc=jackalAlly&&followMode==="fly"?Math.sin(clamp((now-ally.modeStarted)/720,0,1)*Math.PI)*46:0;
        const targetY=followMode==="fly"&&!jackalAlly?Math.min(playerGround-68,ally.groundY-76):ally.groundY-leapArc;
        ally.y+=(targetY-ally.y)*(1-Math.exp(-(followMode==="fly"?5:12)*dt));
      }else{
        setCompanionMode("idle",now);ally.vx+=(0-ally.vx)*(1-Math.exp(-9*dt));ally.x+=ally.vx*dt;ally.y+=(ally.groundY-ally.y)*(1-Math.exp(-12*dt));
        ally.facing=pl.x>=ally.x?1:-1;
      }
    };
    const drawPixelJackal=(x:number,y:number,groundY:number,facing:1|-1,mode:DragonMode,elapsed:number,now:number,size:number,hurt:boolean)=>{
      const scale=size/90;
      const runCycle=(elapsed/(mode==="run"?90:160))%1;
      const gait=Math.sin(runCycle*Math.PI*2);
      const leap=mode==="fly"?Math.sin(clamp(elapsed/700,0,1)*Math.PI):0;
      const attack=mode==="attack"?clamp(elapsed/920,0,1):0;
      const sleep=mode==="sleep";
      const bob=mode==="idle"?Math.sin(now*.005)*1.4:mode==="walk"||mode==="run"?Math.abs(gait)*2:0;
      const lunge=attack>0.32&&attack<.72?(attack-.32)/.4:0;
      const tail = sleep ? 0.9 : mode==="attack" ? -0.55 : 0.35+Math.sin(now*.008+elapsed*.01)*0.55;
      const earFlick = Math.sin(now*.012+elapsed*.004)>0.82?0.35:0;
      ctx.save();
      ctx.fillStyle="rgba(48,18,10,"+(0.45-leap*0.25)+")";
      ctx.beginPath();ctx.ellipse(x,groundY+3,22*(1-leap*.4)*scale,5*(1-leap*.35)*scale,0,0,Math.PI*2);ctx.fill();
      ctx.translate(x+facing*lunge*18,y-bob-leap*8);
      ctx.rotate(facing*(sleep?0.15:mode==="fly"?-0.28:mode==="attack"?-0.12+lunge*0.35:gait*0.04));
      ctx.scale(facing*scale,scale);
      const fur="#c45a28",furDark="#6b2e18",furLight="#f0a056",chest="#ffd2a0",outline="#2a1410",eye="#ffe27a";
      if(hurt&&Math.floor(now/45)%2===0)ctx.globalAlpha=.55;
      const drawLimb=(lx:number,ly:number,lw:number,lh:number,rot:number)=>{
        ctx.save();ctx.translate(lx,ly);ctx.rotate(rot);ctx.fillStyle=outline;ctx.fillRect(-lw/2-1,-1,lw+2,lh+2);ctx.fillStyle=furDark;ctx.fillRect(-lw/2,0,lw,lh);ctx.restore();
      };
      if(sleep){
        ctx.fillStyle=outline;ctx.beginPath();ctx.ellipse(0,-10,23,16,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=fur;ctx.beginPath();ctx.ellipse(0,-10,21,14,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=chest;ctx.beginPath();ctx.ellipse(6,-8,10,8,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=furDark;ctx.beginPath();ctx.ellipse(-16,-6,8,6,.6,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=outline;ctx.beginPath();ctx.moveTo(12,-22);ctx.lineTo(16,-34);ctx.lineTo(8,-24);ctx.fill();
        ctx.fillStyle=furLight;ctx.beginPath();ctx.moveTo(12,-22);ctx.lineTo(15,-31);ctx.lineTo(9,-23);ctx.fill();
        ctx.fillStyle=eye;ctx.globalAlpha=hurt?ctx.globalAlpha:0.35;ctx.beginPath();ctx.ellipse(14,-14,2.2,1.2,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=hurt&&Math.floor(now/45)%2===0?.55:1;
        ctx.restore();return;
      }
      const frontSwing=mode==="idle"?0.08:mode==="fly"?0.7:gait*0.7;
      const backSwing=mode==="idle"?-0.08:mode==="fly"?-0.55:-gait*0.7;
      drawLimb(-12,8,6,18,backSwing);drawLimb(-6,8,6,17,backSwing*0.7+0.15);
      ctx.fillStyle=outline;ctx.beginPath();ctx.ellipse(0,-6,20,13,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=fur;ctx.beginPath();ctx.ellipse(0,-6,18,11.5,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=furLight;ctx.beginPath();ctx.ellipse(3,-8,12,7,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=chest;ctx.beginPath();ctx.ellipse(8,-2,8,7,0,0,Math.PI*2);ctx.fill();
      ctx.save();ctx.translate(-16,-6);ctx.rotate(tail);ctx.fillStyle=outline;ctx.fillRect(-3,-3,20,8);ctx.fillStyle=furDark;ctx.fillRect(-2,-2,18,6);ctx.fillStyle=furLight;ctx.fillRect(10,-1,7,4);ctx.restore();
      ctx.fillStyle=outline;ctx.beginPath();ctx.ellipse(16,-14,11,9,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=fur;ctx.beginPath();ctx.ellipse(16,-14,9.5,7.5,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=furLight;ctx.fillRect(20,-16,7,5);
      ctx.fillStyle=outline;ctx.fillRect(26,-15,4,3);
      ctx.fillStyle="#1a0c08";ctx.fillRect(27,-14,3,2);
      ctx.save();ctx.translate(12,-22);ctx.rotate(-0.2-earFlick);ctx.fillStyle=outline;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(4,-14);ctx.lineTo(8,1);ctx.fill();ctx.fillStyle=furLight;ctx.beginPath();ctx.moveTo(1,0);ctx.lineTo(4,-12);ctx.lineTo(7,1);ctx.fill();ctx.fillStyle="#e8784a";ctx.beginPath();ctx.moveTo(3,-1);ctx.lineTo(4,-8);ctx.lineTo(6,0);ctx.fill();ctx.restore();
      ctx.save();ctx.translate(18,-21);ctx.rotate(0.15+earFlick*0.6);ctx.fillStyle=outline;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(3,-12);ctx.lineTo(7,1);ctx.fill();ctx.fillStyle=fur;ctx.beginPath();ctx.moveTo(1,0);ctx.lineTo(3,-10);ctx.lineTo(6,1);ctx.fill();ctx.restore();
      ctx.fillStyle=eye;ctx.beginPath();ctx.ellipse(20,-16,2.4,2.1,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#2a1410";ctx.beginPath();ctx.ellipse(20.7,-16,1.1,1.4,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#fff6c8";ctx.fillRect(19.2,-16.8,1,1);
      drawLimb(8,9,6,17,frontSwing);drawLimb(14,9,5,16,frontSwing*0.75-0.1);
      if(mode==="attack"&&attack>.4){
        ctx.fillStyle="#fff1c8";ctx.globalAlpha=.8;ctx.fillRect(27,-13,6,2);ctx.fillRect(27,-10,5,2);
      }
      ctx.restore();
    };
    const drawCompanion=(now:number)=>{
      const ally=companionRef.current;
      if(!ally.active||ally.map!==mapRef.current)return;
      const isJackal=ally.itemId===SUNSET_JACKAL_CARD.id;
      if(!isJackal&&(!dragonImage.complete||!dragonImage.naturalWidth))return;
      const palette=inventoryRef.current.find(item=>item.id===ally.itemId)?.palette??(isJackal?SUNSET_JACKAL_CARD.palette:BABY_DRAGON_CARD.palette);
      const companionName=isJackal?"SUNSET JACKAL":"BABY DRAGON";
      const frames=DRAGON_FRAMES[ally.mode],elapsed=now-ally.modeStarted;
      let index=0;
      if(ally.mode==="idle")index=Math.floor(elapsed/520)%2;
      else if(ally.mode==="walk")index=Math.floor(elapsed/180)%frames.length;
      else if(ally.mode==="run")index=Math.floor(elapsed/100)%frames.length;
      else if(ally.mode==="fly")index=Math.floor(elapsed/125)%frames.length;
      else if(ally.mode==="attack")index=Math.min(frames.length-1,Math.floor(elapsed/175));
      const frame=frames[index],size=108,spriteScale=size/DRAGON_CELL;
      const smooth=(value:number)=>value*value*(3-2*value);
      const summon=clamp((now-ally.summonedAt)/COMPANION_SUMMON_DURATION,0,1);
      const summonCreature=smooth(clamp((summon-.22)/.58,0,1));
      const recall=ally.recallStarted>0?clamp((now-ally.recallStarted)/COMPANION_RECALL_DURATION,0,1):0;
      const recallCreature=1-smooth(clamp((recall-.08)/.68,0,1));
      const visibility=summonCreature*recallCreature;
      const spriteGrow=(.32+summonCreature*.68)*(.22+recallCreature*.78);
      const airHeight=clamp((ally.groundY-ally.y)/110,0,1);
      ctx.save();ctx.globalAlpha=.5*visibility;ctx.fillStyle="rgba(70,255,46,.45)";ctx.beginPath();ctx.ellipse(ally.x,ally.groundY+3,27*(1-airHeight*.45),5.5*(1-airHeight*.4),0,0,Math.PI*2);ctx.fill();ctx.restore();

      const teleport=clamp((now-ally.teleportAt)/520,0,1);
      if(ally.teleportAt>0&&teleport<1){
        ctx.save();ctx.translate(ally.x,ally.groundY-42);ctx.globalAlpha=1-teleport;
        ctx.strokeStyle="#b9ff63";ctx.lineWidth=2.5;ctx.shadowColor="#75ff34";ctx.shadowBlur=18;
        for(let ring=0;ring<3;ring++){const r=12+teleport*46+ring*9;ctx.beginPath();ctx.ellipse(0,0,r,r*.42,now*.003+ring,0,Math.PI*2);ctx.stroke();}
        ctx.restore();
      }

      const ritualProgress=recall>0?recall:summon;
      const ritualActive=recall>0||summon<1;
      const ritualColor=palette.glow;
      const ritualPeak=Math.sin(clamp(ritualProgress,0,1)*Math.PI);
      if(ritualActive){
        const beam=ctx.createLinearGradient(ally.x,ally.groundY-178,ally.x,ally.groundY+4);
        beam.addColorStop(0,rgbaFromHex(palette.glow,0));beam.addColorStop(.34,rgbaFromHex(palette.glow,ritualPeak*.2));beam.addColorStop(1,rgbaFromHex(palette.accent,0));
        ctx.save();ctx.globalCompositeOperation="screen";ctx.fillStyle=beam;ctx.fillRect(ally.x-30-ritualPeak*12,ally.groundY-178,60+ritualPeak*24,184);ctx.restore();

        ctx.save();ctx.translate(ally.x,ally.groundY+1);ctx.strokeStyle=ritualColor;ctx.shadowColor=ritualColor;ctx.shadowBlur=16;ctx.lineWidth=2;
        for(let ring=0;ring<4;ring++){
          const phase=clamp(ritualProgress*1.7-ring*.13,0,1),radius=13+phase*46+ring*5;
          ctx.globalAlpha=(1-phase)*.72+ritualPeak*.18;ctx.beginPath();ctx.ellipse(0,0,radius,radius*.22,(ring%2?1:-1)*now*.0025,0,Math.PI*2);ctx.stroke();
        }
        ctx.restore();

        ctx.save();ctx.globalCompositeOperation="screen";
        for(let mote=0;mote<22;mote++){
          const lane=((mote*37)%100)/100-.5;
          const cycle=(ritualProgress*1.8+mote*.087)%1;
          const rise=recall>0?cycle:1-cycle;
          const mx=ally.x+lane*(38+ritualPeak*36)+Math.sin(now*.009+mote)*5;
          const my=ally.groundY-8-rise*(105+(mote%5)*13);
          ctx.globalAlpha=(.25+.75*(1-cycle))*ritualPeak;ctx.fillStyle=mote%4===0?"#ffffff":mote%3===0?palette.glow:palette.accent;ctx.beginPath();ctx.arc(mx,my,1+(mote%4)*.45,0,Math.PI*2);ctx.fill();
        }
        ctx.restore();

        const flashPoint=recall>0?.62:.38;
        const flash=Math.max(0,1-Math.abs(ritualProgress-flashPoint)/.18);
        if(flash>0){const burst=ctx.createRadialGradient(ally.x,ally.y-44,0,ally.x,ally.y-44,74);burst.addColorStop(0,rgbaFromHex(palette.glow,flash*.62));burst.addColorStop(.28,rgbaFromHex(palette.accent,flash*.34));burst.addColorStop(1,rgbaFromHex(palette.accent,0));ctx.fillStyle=burst;ctx.fillRect(ally.x-78,ally.y-122,156,156);}
      }

      const drawSpiritCard=(progress:number,recalling:boolean)=>{
        const arrive=recalling?smooth(clamp((progress-.26)/.25,0,1)):smooth(clamp((progress-.48)/.16,0,1));
        const leave=recalling?1-smooth(clamp((progress-.82)/.18,0,1)):1-smooth(clamp((progress-.72)/.16,0,1));
        const cardAlpha=arrive*leave;
        if(cardAlpha<=0)return;
        const cardRise=recalling?smooth(clamp((progress-.8)/.2,0,1))*78:(1-arrive)*28;
        const cardScale=.38+arrive*.62;
        const cardFrame=DRAGON_FRAMES.idle[0];
        ctx.save();ctx.translate(ally.x,ally.groundY-66-cardRise);ctx.rotate((recalling?1:-1)*(1-arrive)*1.4+(recalling?progress:-progress)*.18);ctx.scale(cardScale,cardScale);ctx.globalAlpha=cardAlpha;ctx.shadowColor=palette.glow;ctx.shadowBlur=24;
        const cardGradient=ctx.createLinearGradient(-22,-34,22,34);cardGradient.addColorStop(0,palette.accent);cardGradient.addColorStop(.22,palette.mid);cardGradient.addColorStop(.72,palette.dark);cardGradient.addColorStop(1,palette.glow);ctx.fillStyle=cardGradient;ctx.beginPath();ctx.roundRect(-22,-34,44,68,6);ctx.fill();
        ctx.shadowBlur=0;ctx.strokeStyle=palette.glow;ctx.lineWidth=2;ctx.stroke();ctx.strokeStyle=palette.dark;ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-18,-30,36,60,4);ctx.stroke();
        ctx.save();ctx.beginPath();ctx.roundRect(-14,-24,28,34,3);ctx.clip();ctx.fillStyle=isJackal?"#2a120c":"#101a13";ctx.fillRect(-14,-24,28,34);
        if(isJackal){ctx.save();ctx.translate(0,8);ctx.scale(0.42,0.42);drawPixelJackal(0,0,18,1,"idle",elapsed,now,70,false);ctx.restore();}
        else ctx.drawImage(dragonImage,cardFrame.x,cardFrame.y,cardFrame.w,cardFrame.h,-15,-25,30,36);ctx.restore();
        ctx.strokeStyle=palette.glow;ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(-14,-24,28,34,3);ctx.stroke();ctx.fillStyle="#eaffcf";ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="900 4.5px ui-monospace, SFMono-Regular, Menlo, monospace";ctx.fillText(companionName,0,17);ctx.fillStyle=palette.glow;ctx.font="900 8px ui-monospace, SFMono-Regular, Menlo, monospace";ctx.fillText("✦",0,26);ctx.restore();
      };
      if(recall===0)drawSpiritCard(summon,false);

      if(summon<1||recall>0){
        const magicProgress=ritualProgress;
        const magicAlpha=recall>0?1-recall*.28:1-summon*.38;
        const magicColor=palette.glow;
        ctx.save();ctx.translate(ally.x,ally.groundY-50);ctx.globalAlpha=magicAlpha;ctx.strokeStyle=magicColor;ctx.shadowColor=magicColor;ctx.shadowBlur=18;
        ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,48,24+Math.sin(now*.01)*3,8,0,0,Math.PI*2);ctx.stroke();
        ctx.rotate((recall>0?-1:1)*now*.004);ctx.beginPath();for(let rune=0;rune<6;rune++){const a=rune*Math.PI/3;const radius=31+Math.sin(now*.006+rune)*4;const rx=Math.cos(a)*radius,ry=Math.sin(a)*radius*.58;if(rune===0)ctx.moveTo(rx,ry);else ctx.lineTo(rx,ry);}ctx.closePath();ctx.stroke();
        ctx.restore();
        ctx.save();ctx.globalAlpha=magicAlpha*.85;for(let mote=0;mote<14;mote++){const a=mote*Math.PI*2/14+now*.003;const spread=recall>0?(1-magicProgress)*58:18+magicProgress*44;const mx=ally.x+Math.cos(a)*spread,my=ally.y-42+Math.sin(a)*spread*.72;ctx.fillStyle=mote%3===0?palette.glow:mote%2?palette.accent:palette.mid;ctx.beginPath();ctx.arc(mx,my,1+(mote%3)*.45,0,Math.PI*2);ctx.fill();}ctx.restore();
      }

      const summonLift=(1-summonCreature)*34,recallPull=(1-recallCreature)*30;
      if(isJackal){
        ctx.save();ctx.globalAlpha=visibility;ctx.shadowColor=ally.mode==="attack"?"rgba(255,186,82,.85)":"rgba(240,138,58,.45)";ctx.shadowBlur=ally.mode==="attack"?16:8;
        drawPixelJackal(ally.x,ally.y+summonLift-recallPull,ally.groundY,ally.facing,ally.mode,elapsed,now,96*spriteGrow,false);
        ctx.restore();
      }else{
        ctx.save();ctx.translate(ally.x,ally.y+summonLift-recallPull);ctx.rotate(ally.facing*(1-recallCreature)*.72);ctx.scale(ally.facing*spriteGrow,spriteGrow);
        ctx.globalAlpha=visibility;ctx.shadowColor=ally.mode==="attack"?"rgba(179,255,71,.8)":"rgba(95,224,48,.42)";ctx.shadowBlur=ally.mode==="attack"?17:9;
        ctx.drawImage(dragonImage,frame.x,frame.y,frame.w,frame.h,-frame.anchorX*spriteScale,-frame.anchorY*spriteScale,frame.w*spriteScale,frame.h*spriteScale);ctx.restore();
      }

      if(summon>.72&&recall<.46){
        const healthRatio=clamp(ally.health/ally.maxHealth,0,1),barY=ally.y-112;
        ctx.save();ctx.globalAlpha=visibility;ctx.textAlign="center";ctx.textBaseline="bottom";ctx.font="900 8px ui-monospace, SFMono-Regular, Menlo, monospace";ctx.lineWidth=3;ctx.strokeStyle="rgba(2,6,8,.92)";ctx.strokeText(`ALLY · ${companionName}  ${Math.ceil(ally.health)} / ${ally.maxHealth}`,ally.x,barY-5);ctx.fillStyle=isJackal?"#ffe1b0":"#d9ffb0";ctx.fillText(`ALLY · ${companionName}  ${Math.ceil(ally.health)} / ${ally.maxHealth}`,ally.x,barY-5);
        ctx.fillStyle="rgba(2,7,8,.84)";ctx.beginPath();ctx.roundRect(ally.x-48,barY,96,7,3.5);ctx.fill();
        const healthGradient=ctx.createLinearGradient(ally.x-46,0,ally.x+46,0);healthGradient.addColorStop(0,"#5ed52d");healthGradient.addColorStop(1,"#b7ff57");ctx.fillStyle=healthGradient;ctx.beginPath();ctx.roundRect(ally.x-46,barY+2,92*healthRatio,3,1.5);ctx.fill();ctx.strokeStyle="rgba(190,255,132,.72)";ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(ally.x-48,barY,96,7,3.5);ctx.stroke();ctx.restore();
      }
    };
    const drawMagicalAnimalCard=(name:string,x:number,groundY:number,now:number,formedAt:number,image:HTMLImageElement,portrait:{x:number;y:number;w:number;h:number},palette:CardPalette)=>{
      const elapsed=now-formedAt;
      const reveal=clamp(elapsed/620,0,1);
      if(reveal<=0)return;
      const eased=1-Math.pow(1-reveal,3);
      const hover=Math.sin(now*.0042)*2;
      const cardY=groundY-34+hover;
      const riseY=groundY-12+(cardY-(groundY-12))*eased;
      const scale=(.16+eased*.84)*.5;
      const spin=(1-eased)*Math.PI*1.7;
      const cardW=76,cardH=112;

      ctx.save();
      ctx.globalAlpha=eased;
      ctx.fillStyle="rgba(0,0,0,.38)";
      ctx.beginPath();ctx.ellipse(x,groundY+4,15*eased,3.5*eased,0,0,Math.PI*2);ctx.fill();
      ctx.restore();

      ctx.save();ctx.translate(x,riseY);ctx.rotate(spin+Math.sin(now*.0022)*.025);ctx.scale(scale,scale);
      const glow=ctx.createRadialGradient(0,0,8,0,0,74);
      glow.addColorStop(0,palette.glow+"55");glow.addColorStop(1,palette.accent+"00");
      ctx.fillStyle=glow;ctx.fillRect(-78,-82,156,164);
      ctx.shadowColor=palette.glow;ctx.shadowBlur=18;
      const cardGradient=ctx.createLinearGradient(-cardW/2,-cardH/2,cardW/2,cardH/2);
      cardGradient.addColorStop(0,palette.accent);cardGradient.addColorStop(.28,palette.mid);cardGradient.addColorStop(.72,palette.dark);cardGradient.addColorStop(1,palette.glow);
      ctx.fillStyle=cardGradient;ctx.beginPath();ctx.roundRect(-cardW/2,-cardH/2,cardW,cardH,8);ctx.fill();
      ctx.shadowBlur=0;ctx.strokeStyle=palette.glow;ctx.lineWidth=2;ctx.stroke();
      ctx.strokeStyle=palette.dark;ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(-cardW/2+5,-cardH/2+5,cardW-10,cardH-10,5);ctx.stroke();

      ctx.save();ctx.beginPath();ctx.roundRect(-29,-44,58,62,5);ctx.clip();
      const portraitGlow=ctx.createRadialGradient(0,-16,3,0,-16,43);
      portraitGlow.addColorStop(0,palette.mid);portraitGlow.addColorStop(1,palette.dark);
      ctx.fillStyle=portraitGlow;ctx.fillRect(-29,-44,58,62);
      if(name.toLowerCase().includes("jackal")){
        ctx.save();ctx.translate(0,18);drawPixelJackal(0,0,16,1,"idle",now,now,78,false);ctx.restore();
      }else{
        ctx.imageSmoothingEnabled=true;
        ctx.drawImage(image,portrait.x,portrait.y,portrait.w,portrait.h,-30,-45,60,64);
      }
      ctx.restore();
      ctx.strokeStyle=palette.glow;ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(-29,-44,58,62,5);ctx.stroke();

      ctx.fillStyle="#f5ffd3";ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.font="900 7px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(name.toUpperCase(),0,29);
      ctx.fillStyle=palette.glow;ctx.font="900 12px ui-monospace, SFMono-Regular, Menlo, monospace";ctx.fillText("✦",0,43);
      ctx.restore();

      ctx.save();ctx.globalAlpha=eased;
      for(let mote=0;mote<12;mote++){
        const angle=mote*Math.PI*2/12+now*.0012;
        const radius=23+Math.sin(now*.004+mote)*4;
        const mx=x+Math.cos(angle)*radius,my=riseY+Math.sin(angle)*radius*.72;
        ctx.fillStyle=mote%3===0?palette.glow:mote%3===1?palette.accent:palette.mid;
        ctx.beginPath();ctx.arc(mx,my,.8+(mote%2)*.6,0,Math.PI*2);ctx.fill();
      }
      if(elapsed<1700){
        ctx.globalAlpha*=clamp(1-elapsed/1700,0,1);
        ctx.font="900 8px ui-monospace, SFMono-Regular, Menlo, monospace";ctx.textAlign="center";ctx.textBaseline="bottom";
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
      if(!dragonCardCollected)drawMagicalAnimalCard("Baby Dragon",dragon.x,dragon.groundY,now,dragon.modeStarted+350,dragonImage,{x:0,y:25,w:256,h:260},BABY_DRAGON_CARD.palette);
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
    const drawJackalCardTransformation=(jackal:Jackal,now:number)=>{
      const elapsed=now-jackal.modeStarted;
      const absorb=clamp((elapsed-120)/760,0,1);
      if(absorb<1){
        const pull=1-Math.pow(1-absorb,2);
        ctx.save();ctx.globalAlpha=1-pull;ctx.translate(0,-pull*28);
        drawPixelJackal(jackal.x,jackal.y,jackal.groundY,jackal.facing,"sleep",elapsed,now,JACKAL_RENDER_SIZE*(1-pull*.7),false);
        ctx.restore();
      }
      if(!jackalCardCollected)drawMagicalAnimalCard("Sunset Jackal",jackal.x,jackal.groundY,now,jackal.modeStarted+350,dragonImage,{x:0,y:25,w:256,h:260},SUNSET_JACKAL_CARD.palette);
    };
    const drawJackals=(now:number)=>{
      if(mapRef.current!==2)return;
      for(const jackal of jackals){
        if(jackal.health<=0){drawJackalCardTransformation(jackal,now);continue;}
        const elapsed=now-jackal.modeStarted;
        const hurtActive=jackal.hurtUntil>now;
        const hurtProgress=hurtActive?clamp((now-jackal.hurtStarted)/480,0,1):1;
        const hurtPulse=hurtActive?Math.sin(hurtProgress*Math.PI):0;
        const recoilX=hurtPulse*10*jackal.hitDirection;
        ctx.save();ctx.shadowColor=hurtActive?"rgba(255,220,140,.9)":jackal.mode==="attack"?"rgba(255,170,70,.55)":jackal.angry?"rgba(255,90,40,.5)":"rgba(240,138,58,.2)";ctx.shadowBlur=hurtActive?18:jackal.angry?12:6;
        drawPixelJackal(jackal.x+recoilX,jackal.y,jackal.groundY,jackal.facing,jackal.mode,elapsed,now,JACKAL_RENDER_SIZE,hurtActive);
        ctx.restore();
        const barW=78,barH=8,barX=jackal.x+recoilX-barW/2,barY=jackal.y-68;
        const healthRatio=clamp(jackal.health/jackal.maxHealth,0,1);
        const healthLabel=(jackal.angry?"ANGRY  ":"")+"SUNSET JACKAL  "+jackal.health+" / "+jackal.maxHealth;
        ctx.save();
        ctx.textAlign="center";ctx.textBaseline="bottom";ctx.font="700 8px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.lineWidth=3;ctx.strokeStyle="rgba(20,8,4,.9)";ctx.strokeText(healthLabel,jackal.x+recoilX,barY-3);
        ctx.fillStyle=jackal.angry?"#ffb19d":"#ffe7c2";ctx.fillText(healthLabel,jackal.x+recoilX,barY-3);
        ctx.fillStyle="rgba(20,8,4,.9)";ctx.fillRect(barX-2,barY-2,barW+4,barH+4);
        ctx.fillStyle="#4a1c14";ctx.fillRect(barX,barY,barW,barH);
        const healthGradient=ctx.createLinearGradient(barX,barY,barX+barW,barY);
        healthGradient.addColorStop(0,"#ffb347");healthGradient.addColorStop(1,"#e05a22");
        ctx.fillStyle=healthGradient;ctx.fillRect(barX,barY,barW*healthRatio,barH);
        ctx.strokeStyle="rgba(255,210,140,.7)";ctx.lineWidth=1;ctx.strokeRect(barX-.5,barY-.5,barW+1,barH+1);
        if(hurtActive){
          ctx.globalAlpha=1-hurtProgress;
          ctx.font="900 14px ui-monospace, SFMono-Regular, Menlo, monospace";
          ctx.fillStyle="#ffe7a8";ctx.fillText("-"+jackal.lastDamage,jackal.x+recoilX,barY-16-hurtProgress*18);
        }
        ctx.restore();
      }
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
      drawDragon(now);drawJackals(now);drawCompanion(now);
      drawPlayer(player.current,now);ctx.restore();
    };
    const frame=(now:number)=>{
      const dt=Math.min((now-last)/1000,.032);last=now;const w=canvas.clientWidth,h=canvas.clientHeight,scale=Math.max(w/1280,h/WORLD_H),pl=player.current,map=mapRef.current,activeWorldW=worldWidthFor(map);
      if(actionUntil.current<=now)activeAttackDamage.current=0;
      if(pl.health!==lastHealth){lastHealth=pl.health;setHealth(pl.health);}
      if(startedRef.current&&staminaRef.current<MAX_STAMINA&&now-staminaUsedAt.current>=STAMINA_REGEN_DELAY){staminaRef.current=Math.min(MAX_STAMINA,staminaRef.current+STAMINA_REGEN_PER_SECOND*dt);}
      const displayedStamina=Math.round(staminaRef.current);
      if(displayedStamina!==lastStamina){lastStamina=displayedStamina;setStamina(displayedStamina);}
      if(startedRef.current&&!dialogueRef.current&&!inventoryOpenRef.current&&playerRespawnAt===0){
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
        if(pl.y>WORLD_H+80){pl.x=map===1?Math.max(120,pl.x-180):respawnXFor(map);pl.y=240;pl.vy=0;pl.grounded=false;pl.jumpsLeft=2;pl.crouched=false;pl.sliding=false;slideUntil.current=0;}pl.step+=Math.abs(pl.vx)*dt*.048;
      }else{pl.vx*=.82;pl.crouched=false;pl.sliding=false;slideUntil.current=0;}
      const castState=companionCastRef.current;
      const castDuration=castState.kind==="recall"?COMPANION_RECALL_DURATION:780;
      if(castState.kind&&now-castState.started<castDuration)pl.facing=castState.direction;
      updateDragon(dt,now);updateJackals(dt,now);
      if(deployQueued.current){
        const itemId=equippedRef.current[selectedSlotRef.current];
        const item=itemId?inventoryRef.current.find(entry=>entry.id===itemId):null;
        const ally=companionRef.current;
        if(item?.type==="animal-card"){
          if(ally.active&&ally.itemId===item.id){
            if(ally.recallStarted===0){const direction:1|-1=ally.x>=pl.x?1:-1;ally.recallStarted=now;ally.attackUntil=0;ally.vx=0;companionCastRef.current={started:now,kind:"recall",direction};pl.facing=direction;tone(470,.16,.022);window.setTimeout(()=>tone(280,.22,.024),180);window.setTimeout(()=>tone(135,.34,.022),610);}
          }else{
            const summonX=clamp(pl.x+pl.facing*COMPANION_DEPLOY_DISTANCE,30,activeWorldW-30);
            const summonGround=companionSurfaceAt(summonX,pl.y+PH,map)??pl.y+PH;
            ally.active=true;ally.itemId=item.id;ally.map=map;ally.x=summonX;ally.groundY=summonGround;ally.y=summonGround;ally.vx=0;ally.facing=pl.facing;ally.mode="idle";ally.modeStarted=now;ally.summonedAt=now;ally.recallStarted=0;ally.teleportAt=0;ally.attackUntil=0;ally.attackLanded=false;ally.lastPlayerAttack=actionStartedAt.current;
            ally.maxHealth=cardStats(item.id).hp;ally.health=ally.maxHealth;
            const direction:1|-1=summonX>=pl.x?1:-1;companionCastRef.current={started:now,kind:"summon",direction};pl.facing=direction;setDeployedItemId(item.id);tone(330,.18,.024);window.setTimeout(()=>tone(620,.22,.022),170);window.setTimeout(()=>tone(940,.28,.02),420);
          }
        }
        deployQueued.current=false;
      }
      updateCompanion(dt,now);
      const cardReady=map===1&&dragon.health<=0&&!dragonCardCollected&&now-dragon.modeStarted>900;
      const nearDragonCard=cardReady&&Math.abs(pl.x-dragon.x)<105&&Math.abs((pl.y+PH)-dragon.groundY)<85;
      const readyJackal=map===2&&!jackalCardCollected?jackals.find(jackal=>jackal.health<=0&&now-jackal.modeStarted>900&&Math.abs(pl.x-jackal.x)<105&&Math.abs((pl.y+PH)-jackal.groundY)<85):undefined;
      if(pickupQueued.current){
        if(nearDragonCard&&collectInventoryItem(BABY_DRAGON_CARD)){
          dragonCardCollected=true;toggleEquippedItem(BABY_DRAGON_CARD.id);
          tone(760,.16,.025);window.setTimeout(()=>tone(1040,.22,.018),90);
        }else if(readyJackal&&collectInventoryItem(SUNSET_JACKAL_CARD)){
          jackalCardCollected=true;toggleEquippedItem(SUNSET_JACKAL_CARD.id);
          tone(640,.16,.024);window.setTimeout(()=>tone(980,.22,.018),90);
        }
        pickupQueued.current=false;
      }
      const cameraTarget=clamp(pl.x-w/scale*.38,0,Math.max(0,activeWorldW-w/scale));
      if(cameraReset.current){cameraX=cameraTarget;cameraReset.current=false;}else cameraX+=(cameraTarget-cameraX)*Math.min(1,dt*3.8);
      cameraXRef.current=cameraX;renderScaleRef.current=scale;
      if(pointerAim.current.active){
        const aimWorldX=cameraX+pointerAim.current.x/scale,aimWorldY=pointerAim.current.y/scale;
        aimAngle.current=Math.atan2(aimWorldY-(pl.y+34),aimWorldX-pl.x);
      }
      let action="";
      if(!dialogueRef.current){
        if(nearDragonCard)action=inventoryRef.current.length>=INVENTORY_CAPACITY?"Inventory full":"Pick up Baby Dragon card";
        else if(readyJackal)action=inventoryRef.current.length>=INVENTORY_CAPACITY?"Inventory full":"Pick up Sunset Jackal card";
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
  },[collectInventoryItem,toggleEquippedItem,tone]);

  const touch=useCallback((key:string,value:boolean,e:React.PointerEvent)=>{e.preventDefault();keys.current[key]=value;if(key==="w"&&value&&!dialogueRef.current)jumpQueued.current=true;if(key==="s"&&value&&!dialogueRef.current)slideQueued.current=true;},[]);
  const toggleSound=()=>{soundRef.current=!soundRef.current;setSoundOn(soundRef.current);if(soundRef.current)tone(520,.16,.025);};

  return <main className="game-shell" aria-label="Echoes of Ashfall game">
    <canvas ref={canvasRef} className="game-canvas" data-sword-damage={SWORD_DAMAGE} aria-label={`${PLAYER_NAME} in a playable side-scrolling world. Move the cursor to aim and left click to attack for ${SWORD_DAMAGE} damage. Four rapid sword attacks are available before stamina must recover.`} onPointerDown={(e)=>{if(e.button===0){e.preventDefault();updateAim(e.clientX,e.clientY);attack();}}}/>
    <div className="vignette"/><div className="film-grain"/>
    <div className="topbar">
      <div className="hud-left">
        <div className="health-hud">
          <p className="knight-name">{PLAYER_NAME}</p>
          <div role="meter" aria-label={`${PLAYER_NAME} health: ${health} out of ${MAX_HEALTH}`} aria-valuemin={0} aria-valuemax={MAX_HEALTH} aria-valuenow={health}>
            <div className="health-readout"><Heart size={16} strokeWidth={2.4} aria-hidden="true"/><strong>{health}</strong><span>Health</span></div>
            <div className="health-track"><span style={{width:`${health}%`}}/></div>
          </div>
          <div className="stamina-meter" role="meter" aria-label={`${PLAYER_NAME} stamina: ${stamina} out of ${MAX_STAMINA}`} aria-valuemin={0} aria-valuemax={MAX_STAMINA} aria-valuenow={stamina}>
            <div className="stamina-readout"><span>Stamina</span><strong>{Math.floor(stamina/SWORD_STAMINA_COST)} / 4</strong></div>
            <div className="stamina-track"><span style={{width:`${stamina}%`}}/></div>
          </div>
        </div>
        <div className="quick-slots" aria-label="Five usable item slots">
          {equipped.map((itemId,index)=>{
            const item=inventory.find(entry=>entry.id===itemId),selected=index===selectedSlot,deployed=Boolean(item&&deployedItemId===item.id);
            return <button key={index} className={"quick-slot "+(item?"filled ":"")+(selected?"selected ":"")+(deployed?"deployed":"")} onClick={()=>selectUsableSlot(index)} aria-pressed={selected} aria-label={`Slot ${index+1}${item?`, ${item.name}${deployed?", deployed":""}`:", empty"}`}>
              <span>{index+1}</span>{item?<i className="quick-card-thumb" style={{backgroundImage:`url(${item.image})`,borderColor:item.palette.accent}}/>:<i className="quick-empty"/>}
            </button>;
          })}
          <small><b>1–5</b> Select · <b>Q</b> Deploy</small>
        </div>
        <div className="chapter-mark"><span className="chapter-line"/><div><p className="eyebrow">Map {mapNumber}</p><p className="chapter-name">{MAP_STORY[mapNumber].name}</p></div></div>
      </div>
      {started&&<div className="objective"><p className="objective-label">Current objective</p><p className="objective-copy">{objective}</p></div>}
    </div>
    <section className={"title-screen "+(started?"hidden":"")} aria-hidden={started}>
      <div className="title-card"><p className="title-kicker">A story begins</p><h1 className="game-title">Echoes<br/>of Ashfall<span>Chapter Zero</span></h1><button className="start-button" onClick={startGame}>Enter Ashfall</button><p className="start-hint">Headphones recommended · Best played fullscreen</p></div>
    </section>
    {inventoryOpen&&<section className="inventory-screen" role="dialog" aria-modal="true" aria-label="Inventory">
      <div className="inventory-panel">
        <header className="inventory-header">
          <div><p className="inventory-kicker">Moon Night&apos;s pack</p><h2>Inventory</h2></div>
          <div className="inventory-counts"><span>{inventory.length} / {INVENTORY_CAPACITY} stored</span><span>{equipped.filter(Boolean).length} / {ACTIVE_SLOT_COUNT} usable</span></div>
          <button className="inventory-close" onClick={toggleInventory}><span>Tab</span> Close</button>
        </header>
        <div className="inventory-section-title"><span>Usable loadout</span><small>Only these five slots can be used</small></div>
        <div className="active-slots">
          {equipped.map((itemId,index)=>{
            return <button key={index} className={"active-slot "+(item?"filled ":"")+(index===selectedSlot?"selected":"")} onClick={()=>selectUsableSlot(index)} aria-pressed={index===selectedSlot} aria-label={item?`Select slot ${index+1}, ${item.name}`:`Select empty usable slot ${index+1}`}>
              <span className="slot-number">{index+1}</span>
              {item?<><span className="inventory-card-thumb" style={{backgroundImage:`url(${item.image})`,borderColor:item.palette.accent,boxShadow:`0 0 16px ${item.palette.accent}55`}}/><strong>{item.name}</strong></>:<span className="empty-mark">+</span>}
            </button>;
          })}
        </div>
        <div className="inventory-section-title"><span>Collected items</span><small>Click an item to equip or unequip it</small></div>
        <div className="inventory-grid">
          {Array.from({length:INVENTORY_CAPACITY},(_,index)=>{
            return <button key={index} className={"inventory-slot "+(item?"filled ":"")+(isEquipped?"equipped":"")} onClick={()=>item&&toggleEquippedItem(item.id)} aria-pressed={isEquipped} aria-label={item?`${item.name}, ${isEquipped?"equipped":"stored"}`:`Empty inventory slot ${index+1}`}>
              <span className="slot-number">{index+1}</span>
              {item&&<><span className="inventory-card-thumb" style={{backgroundImage:`url(${item.image})`,borderColor:item.palette.accent,boxShadow:`0 0 16px ${item.palette.accent}55`}}/><strong>{item.name}</strong><small>{isEquipped?"Usable":"Stored"}</small></>}
            </button>;
          })}
        </div>
        <p className="inventory-help">Press <b>1–5</b> to select a usable slot, then <b>Q</b> to deploy or recall it. Defeated animals become cards; press <b>E</b> nearby to collect them.</p>
      </div>
    </section>}
    {dialogue&&<div className="dialogue-wrap"><div className="dialogue-box" onClick={advanceDialogue}><p className="speaker">{dialogue[dialogueIndex]?.speaker}</p><p className="dialogue-text">{dialogue[dialogueIndex]?.text}</p><p className="continue-hint">Click or press E to continue</p></div></div>}
    {nearAction&&<div className="interaction"><span className="keycap">E</span>{nearAction}</div>}
    <div className="controls"><span><b>A D</b> Move</span><span><b>W / Space ×2</b> Double jump</span><span><b>S</b> Crouch / slide</span><span><b>Shift</b> Run</span><span><b>Mouse 1</b> Attack</span><span><b>E</b> Interact</span><span><b>1–5 + Q</b> Select / deploy</span><span><b>Tab</b> Inventory</span></div>
    <button className="sound-button" onClick={toggleSound} aria-label={soundOn?"Mute sound":"Turn sound on"}>{soundOn?<Volume2 size={16}/>:<VolumeX size={16}/>}</button>
    <div className="touch-controls" aria-label="Touch controls">
      <div className="touch-group"><button className="touch-btn" aria-label="Move left" onPointerDown={(e)=>touch("a",true,e)} onPointerUp={(e)=>touch("a",false,e)} onPointerCancel={(e)=>touch("a",false,e)}>←</button><button className="touch-btn" aria-label="Move right" onPointerDown={(e)=>touch("d",true,e)} onPointerUp={(e)=>touch("d",false,e)} onPointerCancel={(e)=>touch("d",false,e)}>→</button></div>
      <div className="touch-group"><button className="touch-btn attack" aria-label="Sword attack" onPointerDown={(e)=>{e.preventDefault();attack();}}>⚔</button><button className="touch-btn action" aria-label="Interact" onClick={()=>{pickupQueued.current=true;interact();}}>E</button><button className="touch-btn action" aria-label="Crouch or slide" onPointerDown={(e)=>touch("s",true,e)} onPointerUp={(e)=>touch("s",false,e)} onPointerCancel={(e)=>touch("s",false,e)}>↓</button><button className="touch-btn" aria-label="Jump" onPointerDown={(e)=>touch("w",true,e)} onPointerUp={(e)=>touch("w",false,e)} onPointerCancel={(e)=>touch("w",false,e)}>↑</button></div>
    </div>
  </main>;
}
