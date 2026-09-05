"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, LockKeyhole, Map as MapIcon, Volume2, VolumeX, X } from "lucide-react";

type Line = { speaker: string; text: string };
type MapId = 1|2|3|4|5|6;
type Player = { x:number; y:number; vx:number; vy:number; grounded:boolean; facing:1|-1; step:number; jumpsLeft:number; crouched:boolean; sliding:boolean; health:number; maxHealth:number; swordDamage:number };
type Platform = { x:number; y:number; w:number; h:number };
type DragonMode = "idle"|"walk"|"run"|"fly"|"sleep"|"attack";
type Dragon = { x:number; y:number; groundY:number; vx:number; facing:1|-1; mode:DragonMode; modeStarted:number; modeUntil:number; gait:number; prevMode:DragonMode; modeBlendAt:number; health:number; maxHealth:number; attackDamage:number; lastPlayerAttack:number; attackLanded:boolean; hurtStarted:number; hurtUntil:number; hitDirection:1|-1; lastDamage:number; angry:boolean; landing:boolean; targetX:number; awarenessUntil:number };
type DragonFrame = { x:number; y:number; w:number; h:number; anchorX:number; anchorY:number };
type CardPalette = { dark:string; mid:string; accent:string; glow:string };
type InventoryItem = { id:string; name:string; type:"animal-card"|"item"; description:string; image:string; palette:CardPalette };
type Companion = { active:boolean; itemId:string|null; map:MapId; x:number; y:number; groundY:number; vx:number; facing:1|-1; mode:DragonMode; modeStarted:number; gait:number; prevMode:DragonMode; modeBlendAt:number; summonedAt:number; recallStarted:number; teleportAt:number; attackUntil:number; attackLanded:boolean; targetX:number; lastPlayerAttack:number; health:number; maxHealth:number };

const MAP1_W = 7200;
const MAP2_W = 5400;
const MAP3_W = 5800;
const MAP4_W = 6000;
const WORLD_H = 720;
const PW = 46;
const PH = 92;
const STEP_HEIGHT = 32;
const MAP1_PORTAL_X = 7070;
const MAP2_PORTAL_X = 105;
const MAP2_EXIT_X = 5270;
const MAP3_ENTRY_X = 105;
const MAP3_EXIT_X = 5670;
const MAP4_ENTRY_X = 105;
const MAP4_EXIT_X = 5870;
const MAP5_W = 6200;
const MAP6_W = 6600;
const MAP5_ENTRY_X = 105;
const MAP5_EXIT_X = 6070;
const MAP5_KILN_X = 2080;
const MAP6_ENTRY_X = 105;
const MAP6_VEIN_X = 5620;
const MAP6_PULSE_X = 4400;
const MAP6_HEART_X = 6470;
const MAP6_ALTAR_X = MAP6_HEART_X+40;
const ALTAR_INTERACT_RANGE = 200;
const PLAYER_EDGE_MARGIN = 28;
const CAM_EDGE_PAD = 180;
const CARD_FLOOR_INSET = 22;
const CARD_WALL_CLEAR = 28;
const SCENERY_PROP_XS = [380,760,1110,1490,1810,2190,2570,2940,3310,3710,4100,4510,4780,4980,5150,5420,5580,5860,6040,6280,6460,6640,6820,6980] as const;
const MAP5_EAST_SCENERY_XS = [5720,5935] as const;
const MAP6_EAST_SCENERY_XS = [6220,6395] as const;
const MAP4_MOONWELL_X = 2360;
const MAP1_PLAQUE_X = 2680;
const MAP2_SHELL_X = 1515;
const MAP3_HOLLOW_X = 1510;
const MAP5_COAL_X = 1480;
const MAP6_ECHO_X = 5920;
const MAP1_GROOVE_X = 3360;
const MAP2_POST_X = 2050;
const MAP3_CAIRN_X = 2140;
const MAP4_NOTCH_X = 980;
const MAP5_BELLOWS_X = 2680;
const MAP6_STEP_X = 1980;
const MAP1_MERLON_X = 6520;
const MAP2_TIDE_X = 5180;
const MAP3_NEST_X = 4500;
const MAP4_LICHEN_X = 2580;
const COMBAT_ONLY_BEAST_IDS = new Set(["sunset-jackal-scout","ash-roost","cinder-fox-c","pale-stag-b","ember-lynx-d"]);
const isCombatOnlyBeast = (id:string) => COMBAT_ONLY_BEAST_IDS.has(id);
const COMPANION_HUNT_RANGE = 520;
const COMPANION_STRIKE_RANGE = 132;
const COMPANION_STRIKE_DAMAGE = 5;
const COMPANION_STRIKE_RECOVERY = 840;
const COMBAT_ONLY_AGGRO_RANGE = 220;
const EXTRA_CHASE_LEEWAY = 360;
type HuntTarget = {x:number; health:number; id?:string; angry?:boolean};
const nearestHuntTarget = <T extends HuntTarget>(fromX:number, hostiles:T[], range:number):T|null => {
  let best:T|null=null, bestDist=range;
  for(const hostile of hostiles){
    if(hostile.health<=0)continue;
    if(hostile.id&&isCombatOnlyBeast(hostile.id)&&!hostile.angry)continue;
    const dist=Math.abs(hostile.x-fromX);
    if(dist<=bestDist){best=hostile;bestDist=dist;}
  }
  return best;
};
const chaseBounds = (angry:boolean, patrolMin:number, patrolMax:number, mapW:number) => angry?{min:Math.max(48,patrolMin-EXTRA_CHASE_LEEWAY),max:Math.min(mapW-48,patrolMax+EXTRA_CHASE_LEEWAY)}:{min:patrolMin,max:patrolMax};
const PORTAL_PROMPT_RANGE = 145;
const BEAST_ATTACK_VERTICAL = 110;
const nearPortalAt = (x:number, portalX:number) => Math.abs(x-(portalX+55))<PORTAL_PROMPT_RANGE;
const ASSET_BASE = ((import.meta as ImportMeta & {env?:{BASE_URL?:string}}).env?.BASE_URL || "/").replace(/\/?$/, "/");
const assetUrl = (file:string) => ASSET_BASE + file.replace(/^\//, "");
const MAX_HEALTH = 100;
const SWORD_DAMAGE = 15;
const MAX_STAMINA = 100;
const SWORD_STAMINA_COST = 25;
const STAMINA_REGEN_DELAY = 650;
const STAMINA_REGEN_PER_SECOND = 45;
const PLAYER_NAME = "Moon Night";
const DRAGON_MAX_HEALTH = 120;
const DRAGON_ATTACK_DAMAGE = 10;
const DRAGON_RENDER_SIZE = 138;
const DRAGON_SIGHT_RANGE = 720;
const DRAGON_ATTACK_RANGE = 135;
const DRAGON_CHASE_MIN = 1100;
const DRAGON_CHASE_MAX = 5920;
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
  id:"baby-dragon-card",name:"Baby Dragon",type:"animal-card",description:"The first spark of Ashfall's fading echo, bound from a young ash dragon.",image:assetUrl("/baby-dragon-sprite-sheet.png"),
  palette:{dark:"#090d0c",mid:"#202a24",accent:"#71d92f",glow:"#b2ff55"}
};
const JACKAL_MAX_HEALTH = 70;
const JACKAL_ATTACK_DAMAGE = 8;
const JACKAL_SIGHT_RANGE = 620;
const JACKAL_ATTACK_RANGE = 118;
const beastCanStrikePlayer = (beast:{x:number;y:number}, pl:{x:number;y:number}, range=JACKAL_ATTACK_RANGE, vertical=BEAST_ATTACK_VERTICAL) => Math.abs(pl.x-beast.x)<=range && Math.abs((pl.y+42)-beast.y)<vertical;
const JACKAL_RENDER_SIZE = 92;
const SUNSET_JACKAL_CARD:InventoryItem = {
  id:"sunset-jackal-card",name:"Sunset Jackal",type:"animal-card",description:"A dusk-born shard of the fading signal from the sunset shore.",image:assetUrl("/sunset-jackal-card.svg"),
  palette:{dark:"#2a120c",mid:"#7a3118",accent:"#f08a3a",glow:"#ffd27a"}
};
const JACKAL_CARD_BY_BEAST:Record<string,InventoryItem> = {
  "sunset-jackal-a":{...SUNSET_JACKAL_CARD,id:"sunset-jackal-card-a"},
  "sunset-jackal-b":{...SUNSET_JACKAL_CARD,id:"sunset-jackal-card-b"},
  "sunset-jackal-c":{...SUNSET_JACKAL_CARD,id:"sunset-jackal-card-c"}
};
const isSunsetJackalCardId = (id:string|null) => Boolean(id&&id.startsWith("sunset-jackal-card"));
const cardThumbClass = (item:InventoryItem) => item.image.includes("sprite-sheet")?"":" portrait-art";
const FOX_MAX_HEALTH = 55;
const FOX_ATTACK_DAMAGE = 7;
const FOX_RENDER_SIZE = 78;
const CINDER_FOX_CARD:InventoryItem = {id:"cinder-fox-card",name:"Cinder Fox",type:"animal-card",description:"Leftover heat of the echo, bound from Ash Hollow foxfire.",image:assetUrl("/cinder-fox-card.svg"),palette:{dark:"#1a0a08",mid:"#6a2414",accent:"#ff7a3a",glow:"#ffc08a"}};
const STAG_MAX_HEALTH = 95;
const STAG_ATTACK_DAMAGE = 10;
const STAG_RENDER_SIZE = 118;
const PALE_STAG_CARD:InventoryItem = {id:"pale-stag-card",name:"Pale Stag",type:"animal-card",description:"Moonwell light pooled into a stag — the echo holding still.",image:assetUrl("/pale-stag-card.svg"),palette:{dark:"#0b1418",mid:"#2a4a55",accent:"#8ee7ff",glow:"#d7fbff"}};
const LYNX_MAX_HEALTH = 95;
const LYNX_ATTACK_DAMAGE = 10;
const LYNX_RENDER_SIZE = 94;
const EMBER_LYNX_CARD:InventoryItem = {id:"ember-lynx-card",name:"Ember Lynx",type:"animal-card",description:"The last banked heat of the signal, a coal-pelt lynx from The Quiet Ember.",image:assetUrl("/ember-lynx-card.svg"),palette:{dark:"#1a0c08",mid:"#7a2e14",accent:"#e07030",glow:"#ffb060"}};
const WYRM_MAX_HEALTH = 170;
const WYRM_ATTACK_DAMAGE = 14;
const WYRM_RENDER_SIZE = 152;
const HEART_WYRM_CARD:InventoryItem = {id:"heart-wyrm-card",name:"Heart Wyrm",type:"animal-card",description:"The last pulse of Ashfall's Heart — the echo ready to rest.",image:assetUrl("/heart-wyrm-card.svg"),palette:{dark:"#140816",mid:"#4a2048",accent:"#d45a6a",glow:"#ffc8a0"}};
const CAMPAIGN_OPENING:Line[] = [{speaker:"Moon Night",text:"The rain carries a signal. Something in Ashfall is still calling."},{speaker:"Moon Night",text:"Follow the echo through castle, shore, ash, moonwell, quiet ember, and heart."},{speaker:"Moon Night",text:"If an animal falls, its spirit becomes a card. Press E to take it, then Q to deploy."}];
const MAP_STORY:Record<MapId,{name:string;objective:string;intro:Line[]}> = {
  1:{name:"The Signal in the Rain",objective:"Find the baby dragon in the rain, then take the far-right portal.",intro:[{speaker:"Moon Night",text:"Moonlit stone. A young ash dragon hunts these ruins."},{speaker:"Moon Night",text:"The rain is not just weather. The echo is already in the walls."},{speaker:"Moon Night",text:"Defeat the dragon, take its card, then follow the signal east."}]},
  2:{name:"Sunset Shore",objective:"Track the Sunset Jackals, then take the eastern portal to Ash Hollow.",intro:[{speaker:"Moon Night",text:"The shore burns gold. Jackals keep this dusk."},{speaker:"Moon Night",text:"If the castle spark was the first note, this hunt is the dusk of it."},{speaker:"Moon Night",text:"Bind one, then push east before the light dies."}]},
  3:{name:"Ash Hollow",objective:"Bind a Cinder Fox, then reach the moonwell gate.",intro:[{speaker:"Moon Night",text:"The first fall still smolders here. Foxfire moves between the trunks."},{speaker:"Moon Night",text:"The signal feels closer to the animals than to the east gate."},{speaker:"Moon Night",text:"A Cinder Fox can walk the ash with me if I earn its card."}]},
  4:{name:"Moonwell Cliffs",objective:"Face the Pale Stag, then take the far gate into The Quiet Ember.",intro:[{speaker:"Moon Night",text:"The moonwell pools the signal. The far gate is open now."},{speaker:"Moon Night",text:"If the hollow told the truth, the stag is holding what I already carry."},{speaker:"Moon Night",text:"A Pale Stag keeps this cliff. East is The Quiet Ember."}]},
  5:{name:"The Quiet Ember",objective:"Talk to Reed, bind an Ember Lynx, then take the healing east gate to the heart altar.",intro:[{speaker:"Moon Night",text:"The fire here does not roar. It waits."},{speaker:"Moon Night",text:"Lynx-shaped coals hunt the dark. Reed keeps the kiln; press E to hear him."},{speaker:"Moon Night",text:"Bind a lynx if you still need the heat. The east gate heals you. The heart altar ends it."}]},
  6:{name:"Ashfall's Heart",objective:"Speak with Kest, bind the Heart Wyrm, then press E at the altar to end the campaign.",intro:[{speaker:"Moon Night",text:"This is the last echo. The heart of Ashfall still beats."},{speaker:"Moon Night",text:"Kest walked this road ahead of me. The Heart Wyrm is the pulse we came to still."},{speaker:"Moon Night",text:"Talk to Kest. Bind the wyrm if you still need the pulse. Press E at the heart altar. That ends the campaign."}]}
};
const ENDING_LINES:Line[] = [
  {speaker:"Moon Night",text:"The cards go still against the stone. Dragon, jackal, fox, stag, lynx, wyrm — each was a shard of the same fading call."},
  {speaker:"Moon Night",text:"I did not chase a signal east. I carried it. The echo is still because it has a place to rest."},
  {speaker:"Kest",text:"You brought the road home. Ashfall keeps its heart."},
  {speaker:"Moon Night",text:"The echo is still. I keep the road."},
  {speaker:"Kest",text:"Come on. Reed will want to know the kiln can rest. We walk out as people."}
];
const KILN_LINES:Line[] = [{speaker:"Moon Night",text:"Reed's kiln holds a quiet coal. It does not ask to be fed."},{speaker:"Moon Night",text:"The lynx bank this heat so the echo does not go out before the heart."},{speaker:"Moon Night",text:"East of here the pulse is louder. I will not rush it."}];
const VEIN_LINES:Line[] = [{speaker:"Moon Night",text:"A cooled vein in the clinker. The pulse is louder past this crack."},{speaker:"Moon Night",text:"Every animal I bound is quieter here, as if they already know the altar."},{speaker:"Moon Night",text:"The last step is still east. I will not rush it."}];
const PLAQUE_LINES:Line[] = [{speaker:"Moon Night",text:"A rain-worn plaque on the high stone. Castle kilns once fed this wall."},{speaker:"Moon Night",text:"The signal is older than the rain. It names only a road, and the beasts that keep it."},{speaker:"Moon Night",text:"East, always east. Until the echo has somewhere to rest."}];
const GROOVE_LINES:Line[] = [{speaker:"Moon Night",text:"A rain-cut groove in the floor-stone. Water has worn the same path for years."},{speaker:"Moon Night",text:"The groove points east, but the spark is in the dragon, not the gate."},{speaker:"Moon Night",text:"The first spark lives in the dragon. Carry it if you still need the rain."}];
const SHELL_LINES:Line[] = [{speaker:"Moon Night",text:"A dusk-shell half-buried in the dune. It still holds a little gold light."},{speaker:"Moon Night",text:"Jackals hunt in threes because the dusk of the echo does not travel alone."},{speaker:"Moon Night",text:"The hollow is farther east. The heat will be older there."}];
const POST_LINES:Line[] = [{speaker:"Moon Night",text:"A drowned signal-post. Salt has eaten the markings down to three claw-scratches."},{speaker:"Moon Night",text:"Not a warning. A count. Three jackals, one dusk, one fading call."},{speaker:"Moon Night",text:"Bind the dusk. Leave the rest of the pack to the shore."}];
const HOLLOW_LINES:Line[] = [{speaker:"Moon Night",text:"A foxfire hollow. The stump still breathes ember."},{speaker:"Moon Night",text:"This is leftover heat — the echo shedding what the shore could not hold."},{speaker:"Moon Night",text:"Cinder Foxes walk this ash. The moonwell gate is east, if the cairn is wrong."}];
const CAIRN_LINES:Line[] = [{speaker:"Moon Night",text:"A split cairn. One stone points east. The other is scored with fox tracks."},{speaker:"Moon Night",text:"The signal is not a road. It is the animals. Bind one if you still need the leftover fire."},{speaker:"Moon Night",text:"That is the twist. East is only where the last pulse waits to be laid down."}];
const MOONWELL_LINES:Line[] = [{speaker:"Moon Night",text:"The well holds a pale light, not rain. It pools every echo I bound behind me."},{speaker:"Moon Night",text:"The stag is holding what the fox could not. The hollow told the truth."},{speaker:"Moon Night",text:"East the quiet ember waits. Not a destination. A rest."}];
const NOTCH_LINES:Line[] = [{speaker:"Moon Night",text:"A cliff notch cut to listen, not to climb. The wind here sounds like the castle rain."},{speaker:"Moon Night",text:"Calen left this watch. The well ahead will try to keep the signal still."},{speaker:"Moon Night",text:"A Pale Stag keeps the pool. I will not let it stay bottled on the cliff."}];
const COAL_LINES:Line[] = [{speaker:"Moon Night",text:"A banked coal-bed. Someone tended this after the roar died."},{speaker:"Moon Night",text:"Lynx-shaped heat. The echo is almost out, and still walking."},{speaker:"Moon Night",text:"The heart is still east. Carry the last coal. Do not feed it."}];
const BELLOWS_LINES:Line[] = [{speaker:"Moon Night",text:"Quiet bellows, long unused. Reed kept the breath of the kiln without asking it to roar."},{speaker:"Moon Night",text:"The lynx wear that same held breath. Bind one if you still need the heat."}];
const ECHO_LINES:Line[] = [{speaker:"Moon Night",text:"A cracked echo-stone. The pulse is quieter on this side of the vein."},{speaker:"Moon Night",text:"Every shard I carried is here in the quiet — spark, dusk, heat, pool, coal, pulse."},{speaker:"Moon Night",text:"The altar is still east. I will not rush the last step."}];
const STEP_LINES:Line[] = [{speaker:"Moon Night",text:"A first-step stone. Kest stood here long enough to wear the clinker smooth."},{speaker:"Moon Night",text:"Beyond it the Heart Wyrm hunts. The wyrm is the pulse itself, not another watch-beast."},{speaker:"Moon Night",text:"Speak with Kest if I have not. Then finish the road."}];
const MERLON_LINES:Line[] = [{speaker:"Moon Night",text:"A rain-slick merlon. The east wall still watches a road that already left."},{speaker:"Moon Night",text:"The spark is not in the stone. It is already walking with me, or it is gone."},{speaker:"Moon Night",text:"The roostling hunts this last stretch. Then the shore."}];
const TIDE_LINES:Line[] = [{speaker:"Moon Night",text:"A tide-cut step. Four sets of prints, then only three."},{speaker:"Moon Night",text:"The scout is extra dusk. Bind one shard. Leave the rest to the sand."},{speaker:"Moon Night",text:"The hollow is through that gate. The heat will be older there."}];
const NEST_LINES:Line[] = [{speaker:"Moon Night",text:"A charred nest in the ash. Foxfire slept here and left the heat behind."},{speaker:"Moon Night",text:"The cairn was right. The signal is the animals, not the next gate."},{speaker:"Moon Night",text:"Bind the leftover fire. The moonwell will try to bottle it."}];
const LICHEN_LINES:Line[] = [{speaker:"Moon Night",text:"Pale lichen on a cliff perch. Overflow from the well, not a second pool."},{speaker:"Moon Night",text:"The stag is the pool that walks. This glow is only what spilled."},{speaker:"Moon Night",text:"East the quiet ember waits. Carry the pool, do not leave it bottled."}];
type LandmarkKind = "plaque"|"groove"|"shell"|"post"|"hollow"|"cairn"|"moonwell"|"notch"|"kiln"|"coal"|"bellows"|"vein"|"echo"|"step"|"merlon"|"tide"|"nest"|"lichen";
type Landmark = {map:MapId; x:number; groundY:number; radius:number; action:string; lines:Line[]; kind:LandmarkKind};
const LANDMARKS:Landmark[] = [
  {map:1,x:MAP1_PLAQUE_X,groundY:382,radius:120,action:"Study the rain-worn plaque",lines:PLAQUE_LINES,kind:"plaque"},
  {map:1,x:MAP1_GROOVE_X,groundY:590,radius:130,action:"Study the rain-cut groove",lines:GROOVE_LINES,kind:"groove"},
  {map:2,x:MAP2_SHELL_X,groundY:430,radius:130,action:"Study the dusk-shell",lines:SHELL_LINES,kind:"shell"},
  {map:2,x:MAP2_POST_X,groundY:538,radius:130,action:"Study the drowned signal-post",lines:POST_LINES,kind:"post"},
  {map:3,x:MAP3_HOLLOW_X,groundY:418,radius:120,action:"Study the foxfire hollow",lines:HOLLOW_LINES,kind:"hollow"},
  {map:3,x:MAP3_CAIRN_X,groundY:575,radius:130,action:"Study the split cairn",lines:CAIRN_LINES,kind:"cairn"},
  {map:4,x:MAP4_MOONWELL_X,groundY:575,radius:140,action:"Study the moonwell",lines:MOONWELL_LINES,kind:"moonwell"},
  {map:4,x:MAP4_NOTCH_X,groundY:590,radius:130,action:"Study the cliff notch",lines:NOTCH_LINES,kind:"notch"},
  {map:5,x:MAP5_KILN_X,groundY:590,radius:140,action:"Study the quiet kiln",lines:KILN_LINES,kind:"kiln"},
  {map:5,x:MAP5_COAL_X,groundY:440,radius:120,action:"Study the banked coal-bed",lines:COAL_LINES,kind:"coal"},
  {map:5,x:MAP5_BELLOWS_X,groundY:565,radius:130,action:"Study the quiet bellows",lines:BELLOWS_LINES,kind:"bellows"},
  {map:6,x:MAP6_VEIN_X,groundY:545,radius:140,action:"Study the cooled vein",lines:VEIN_LINES,kind:"vein"},
  {map:6,x:MAP6_ECHO_X,groundY:430,radius:120,action:"Study the echo-stone",lines:ECHO_LINES,kind:"echo"},
  {map:6,x:MAP6_STEP_X,groundY:590,radius:130,action:"Study the first-step stone",lines:STEP_LINES,kind:"step"},
  {map:1,x:MAP1_MERLON_X,groundY:430,radius:120,action:"Study the rain-slick merlon",lines:MERLON_LINES,kind:"merlon"},
  {map:2,x:MAP2_TIDE_X,groundY:432,radius:120,action:"Study the tide-cut step",lines:TIDE_LINES,kind:"tide"},
  {map:3,x:MAP3_NEST_X,groundY:430,radius:120,action:"Study the charred nest",lines:NEST_LINES,kind:"nest"},
  {map:4,x:MAP4_LICHEN_X,groundY:440,radius:120,action:"Study the pale lichen",lines:LICHEN_LINES,kind:"lichen"}
];
const landmarkAt=(map:MapId,x:number,footY:number)=>LANDMARKS.find(mark=>mark.map===map&&Math.abs(x-mark.x)<mark.radius&&Math.abs(footY-mark.groundY)<56);
const npcTalkKey=(npc:{id:string;map:MapId})=>npc.id+":"+npc.map;
const cardStats = (id:string|null) => isSunsetJackalCardId(id)?{hp:JACKAL_MAX_HEALTH,ground:true as const,kind:"jackal"}:id===CINDER_FOX_CARD.id?{hp:FOX_MAX_HEALTH,ground:true as const,kind:"fox"}:id===PALE_STAG_CARD.id?{hp:STAG_MAX_HEALTH,ground:true as const,kind:"stag"}:id===EMBER_LYNX_CARD.id?{hp:LYNX_MAX_HEALTH,ground:true as const,kind:"lynx"}:id===HEART_WYRM_CARD.id?{hp:WYRM_MAX_HEALTH,ground:false as const,kind:"wyrm"}:{hp:DRAGON_MAX_HEALTH,ground:false as const,kind:"dragon"};
const GROUND_BEAST_CARD_IDS = new Set([SUNSET_JACKAL_CARD.id,...Object.values(JACKAL_CARD_BY_BEAST).map(card=>card.id),CINDER_FOX_CARD.id,PALE_STAG_CARD.id,EMBER_LYNX_CARD.id]);
const CARD_DISPLAY_NAME:Record<string,string> = {
  [SUNSET_JACKAL_CARD.id]:"SUNSET JACKAL",
  ...Object.fromEntries(Object.values(JACKAL_CARD_BY_BEAST).map(card=>[card.id,"SUNSET JACKAL"])),
  [CINDER_FOX_CARD.id]:"CINDER FOX",[PALE_STAG_CARD.id]:"PALE STAG",
  [EMBER_LYNX_CARD.id]:"EMBER LYNX",[HEART_WYRM_CARD.id]:"HEART WYRM"
};
const cardDisplayName = (id:string|null) => (id&&CARD_DISPLAY_NAME[id])||"BABY DRAGON";
type BeastKind = "jackal"|"fox"|"stag"|"lynx";
type BeastTint = {fur:string;furDark:string;furLight:string;chest:string;eye:string};
const FOX_TINT:BeastTint = {fur:"#ff7a3a",furDark:"#6a2414",furLight:"#ffc08a",chest:"#ffe0b0",eye:"#fff0a0"};
const STAG_TINT:BeastTint = {fur:"#5c7a85",furDark:"#2a4a55",furLight:"#a8d8e0",chest:"#d7fbff",eye:"#8ee7ff"};
const LYNX_TINT:BeastTint = {fur:"#6a3a28",furDark:"#2a140e",furLight:"#e07030",chest:"#c4a078",eye:"#ffb060"};
const beastTintFor = (id:string|null):BeastTint|null => id===CINDER_FOX_CARD.id?FOX_TINT:id===PALE_STAG_CARD.id?STAG_TINT:id===EMBER_LYNX_CARD.id?LYNX_TINT:null;
const beastKindFor = (id:string|null):BeastKind => id===CINDER_FOX_CARD.id?"fox":id===PALE_STAG_CARD.id?"stag":id===EMBER_LYNX_CARD.id?"lynx":"jackal";
const beastAntlersFor = (id:string|null) => id===PALE_STAG_CARD.id;
const beastTuftsFor = (id:string|null) => id===EMBER_LYNX_CARD.id;
type Jackal = Dragon & {id:string; patrolMin:number; patrolMax:number; leapStarted:number; leapUntil:number};
type Npc = {id:string; name:string; map:MapId; x:number; talkRadius:number; firstTalk:Line[]; againTalk:Line[]; afterCaptureTalk:Line[]; cardId:string; helm?:boolean; palette:{skin:string;cloak:string;trim:string;accent:string}};
const NPCS:Npc[] = [
  {id:"reed",name:"Reed",map:5,x:760,talkRadius:150,cardId:EMBER_LYNX_CARD.id,
    firstTalk:[
      {speaker:"Reed",text:"Don't rush the coals. They bite. I keep this quiet fire."},
      {speaker:"Moon Night",text:"I followed the signal from the moonwell."},
      {speaker:"Reed",text:"Then you're like me. I used to keep the castle kilns. Now I keep this quiet fire alive."},
      {speaker:"Reed",text:"The lynx wear the last heat of the echo — coal pelts, tufted ears, bobbed tails. Not jackals."},
      {speaker:"Reed",text:"The animals are the echo. Bind a lynx if you still need the heat."},
      {speaker:"Reed",text:"The east gate heals you. Press E at the heart altar. That ends the campaign."}
    ],
    againTalk:[{speaker:"Reed",text:"Still walking, Moon Night. The quiet kiln is east. Press E there if the coals feel thin."},{speaker:"Reed",text:"Bind a lynx if you still need the heat. The east gate heals you."},{speaker:"Reed",text:"Press E at the heart altar. That ends the campaign."},{speaker:"Reed",text:"When the kiln can rest, we walk out as people. I'll keep the coals till then."}],
    afterCaptureTalk:[
      {speaker:"Reed",text:"That lynx was the last heat the echo could keep without going out."},
      {speaker:"Reed",text:"You are carrying kiln heat. The heart can take that warmth."},
      {speaker:"Reed",text:"The east gate heals you. Talk to Kest. Press E at the heart altar. That ends the campaign."},
      {speaker:"Reed",text:"If you reach the wyrm, tell Kest I didn't quit the kiln."},
      {speaker:"Reed",text:"When that kiln can rest, we walk out as people."},
      {speaker:"Moon Night",text:"I will."}
    ],
    palette:{skin:"#d9a878",cloak:"#5a2c1e",trim:"#e07030",accent:"#ffb060"}
  },
  {id:"kest",name:"Kest",map:6,x:920,talkRadius:150,cardId:HEART_WYRM_CARD.id,
    firstTalk:[
      {speaker:"Kest",text:"I heard you in the signal days ago. So the rain-walker made it."},
      {speaker:"Moon Night",text:"You walked this road ahead of me."},
      {speaker:"Kest",text:"I did. Rain, then this heart. The wyrm is the last pulse — not the castle's baby dragon."},
      {speaker:"Kest",text:"The animals are the echo. Bind the wyrm if you still need the pulse."},
      {speaker:"Kest",text:"The gate behind you still heals. Press E at the heart altar. That ends the campaign."}
    ],
    againTalk:[{speaker:"Kest",text:"Still here, Moon Night. Rain to this heart. The wyrm hunts farther in."},{speaker:"Kest",text:"A first-step stone sits east. Press E there if the pulse feels thin."},{speaker:"Kest",text:"Bind the wyrm if you still need the pulse. The gate behind you still heals."},{speaker:"Kest",text:"Press E at the heart altar. That ends the campaign."},{speaker:"Kest",text:"After that, we walk out as people. Reed will want the kiln to rest."}],
    afterCaptureTalk:[
      {speaker:"Kest",text:"The wyrm is the last pulse. Rest it at the altar so Reed's kiln can rest."},
      {speaker:"Kest",text:"The cards you carry are the echo's memory. Lay them down as a road, not a cage."},
      {speaker:"Kest",text:"You named the whole road in shards. The pulse is the last name."},
      {speaker:"Kest",text:"Walk east. The gate behind you still heals. Press E at the heart altar. That ends the campaign."},
      {speaker:"Kest",text:"The road remembers us now, Moon Night."},
      {speaker:"Kest",text:"Come on. We walk out as people."},
      {speaker:"Moon Night",text:"Then we walk it together."}
    ],
    palette:{skin:"#c99a80",cloak:"#3a2048",trim:"#d45a6a",accent:"#ffc8a0"}
  },
  {id:"calen",name:"Calen",map:1,x:820,talkRadius:150,cardId:BABY_DRAGON_CARD.id,helm:true,
    firstTalk:[
      {speaker:"Calen",text:"Hold. Rain since dusk has been carrying the signal I watch."},
      {speaker:"Moon Night",text:"I came for that echo."},
      {speaker:"Calen",text:"Then keep your sword ready. A young ash dragon hunts the moonlit stone ahead."},
      {speaker:"Calen",text:"I thought the rain was the call. Listen closer — the animals are the echo. The spark is in the beast."},
      {speaker:"Calen",text:"Bind it, then go east. The east portal heals you."},
      {speaker:"Calen",text:"If it falls, press E, then Q. I'll still be here if you walk back."}
    ],
    againTalk:[{speaker:"Calen",text:"The rain hasn't stopped, Moon Night. Bind the dragon if you haven't, then go east. The east portal heals you."},{speaker:"Calen",text:"There is a rain-cut groove farther along the floor. Press E there if the road feels thin."}],
    afterCaptureTalk:[
      {speaker:"Calen",text:"That dragon wasn't quarry. It was the first spark of the signal."},
      {speaker:"Calen",text:"Carry it if you want the spark walking with you. The east portal heals you."},
      {speaker:"Calen",text:"The rain I watched since dusk is quieter now. That is the first shard."},
      {speaker:"Calen",text:"Go east. If we meet again, I'll know you kept the echo walking."}
    ],
    palette:{skin:"#c9b08a",cloak:"#2a3348",trim:"#8aa4c8",accent:"#c8e4ff"}
  },
  {id:"calen",name:"Calen",map:4,x:3180,talkRadius:150,cardId:PALE_STAG_CARD.id,helm:true,
    firstTalk:[
      {speaker:"Calen",text:"This cliff wind is the same watch. I left the castle rain for it."},
      {speaker:"Moon Night",text:"The signal pooled here."},
      {speaker:"Calen",text:"Aye. Pale antlers, not a castle dragon. The animals are the echo."},
      {speaker:"Calen",text:"The well is trying to bottle what you already carry."},
      {speaker:"Calen",text:"Bind the stag, then go east. The east gate heals you. Reed still keeps a kiln through it."}
    ],
    againTalk:[
      {speaker:"Calen",text:"We meet again. I left the castle rain for this watch."},
      {speaker:"Calen",text:"Same spark, later wind. The moonwell still bottles what we carry. Press E there if the pool feels thin."}
    ],
    afterCaptureTalk:[
      {speaker:"Calen",text:"Pale antlers. The moonwell poured the signal into that stag."},
      {speaker:"Calen",text:"You bound the pool, not just a beast. That's why the well looks dimmer now."},
      {speaker:"Calen",text:"The rain I watched is pooled here. This stag is the moonwell walking."},
      {speaker:"Calen",text:"The east gate heals you. Reed's kiln is through it."},
      {speaker:"Calen",text:"Tell him a castle watcher still stands."}
    ],
    palette:{skin:"#c9b08a",cloak:"#2a3348",trim:"#8aa4c8",accent:"#c8e4ff"}
  },
  {id:"sera",name:"Sera",map:2,x:480,talkRadius:150,cardId:SUNSET_JACKAL_CARD.id,
    firstTalk:[
      {speaker:"Sera",text:"Threes on the sand. That's how the jackals hunt here."},
      {speaker:"Moon Night",text:"Then I'll take the dusk road with one of them."},
      {speaker:"Sera",text:"Sunset Jackals. Dusk-born, four-legged, not the castle dragon. The animals are the echo."},
      {speaker:"Sera",text:"Bind one, then go east. The east portal heals you. Push on before the light dies."}
    ],
    againTalk:[{speaker:"Sera",text:"Still here, Moon Night. Bind a jackal if you haven't, then go east. The east portal heals you."},{speaker:"Sera",text:"A dusk-shell sits on a mid-beach ledge. Press E there if the gold feels thin."}],
    afterCaptureTalk:[
      {speaker:"Sera",text:"You took a jackal card. That's the dusk of the signal walking with you."},
      {speaker:"Sera",text:"Leave the extra scout to the sand. One dusk shard is enough to carry."},
      {speaker:"Sera",text:"The east portal heals you. Push on before the last gold dies."},
      {speaker:"Sera",text:"Ash Hollow smolders past that gate. I walk when the light fails."}
    ],
    palette:{skin:"#d4a07a",cloak:"#6a3418",trim:"#f08a3a",accent:"#ffd27a"}
  },
  {id:"sera",name:"Sera",map:5,x:5720,talkRadius:150,cardId:EMBER_LYNX_CARD.id,
    firstTalk:[
      {speaker:"Sera",text:"Three on the shore. One heat here. I still count before I walk."},
      {speaker:"Moon Night",text:"Reed keeps the kiln."},
      {speaker:"Sera",text:"He does. The lynx wear coal pelts — tufted ears, bobbed tails. Not jackals."},
      {speaker:"Sera",text:"The animals are the echo. Bind a lynx if you still need the heat."},
      {speaker:"Sera",text:"The east gate heals you. Press E at the heart altar. That ends the campaign."}
    ],
    againTalk:[
      {speaker:"Sera",text:"We keep crossing roads. Shore dusk, then this kiln."},
      {speaker:"Sera",text:"Same dusk, later heat."},
      {speaker:"Sera",text:"The quiet kiln still sits west. Press E there if the heat feels thin."}
    ],
    afterCaptureTalk:[
      {speaker:"Sera",text:"Coal pelt, not dusk fur. You bound the last heat the shore could not keep."},
      {speaker:"Sera",text:"The east gate heals you. Talk to Kest. Press E at the altar to end the campaign."},
      {speaker:"Sera",text:"If Bram is still walking, tell him the signal isn't quarry. We're carrying it."},
      {speaker:"Sera",text:"Then we walk out as people. I'll keep counting till this kiln can rest."}
    ],
    palette:{skin:"#d4a07a",cloak:"#6a3418",trim:"#f08a3a",accent:"#ffd27a"}
  },
  {id:"bram",name:"Bram",map:3,x:480,talkRadius:150,cardId:CINDER_FOX_CARD.id,
    firstTalk:[
      {speaker:"Bram",text:"Ash in the lungs. I'm Bram. I scout the hollow so nobody walks in blind."},
      {speaker:"Moon Night",text:"Foxfire moves between the trunks."},
      {speaker:"Bram",text:"Cinder Foxes. Ember coats, white-tipped tails. Leftover heat — the animals are the echo."},
      {speaker:"Bram",text:"Bind a fox, then go east. The east portal heals you. Read the split cairn mid-hollow before the well."}
    ],
    againTalk:[{speaker:"Bram",text:"Still scouting, Moon Night. Bind a fox if you haven't, then go east. The east portal heals you."},{speaker:"Bram",text:"The cairn is the part nobody wants to hear. Press E there if the stones feel thin."}],
    afterCaptureTalk:[
      {speaker:"Bram",text:"You took the leftover fire. That's foxfire — the echo shedding heat."},
      {speaker:"Bram",text:"Don't think the cliffs will be quieter. The stag will try to hold what you just carried."},
      {speaker:"Bram",text:"The cairn twist is leftover fire in the foxes, not the next gate."},
      {speaker:"Bram",text:"The east portal heals you. I'll take the long way around."}
    ],
    palette:{skin:"#c09070",cloak:"#3a1c12",trim:"#ff7a3a",accent:"#ffc08a"}
  },
  {id:"bram",name:"Bram",map:6,x:1480,talkRadius:150,cardId:HEART_WYRM_CARD.id,
    firstTalk:[
      {speaker:"Bram",text:"Ash in the lungs even here. I tracked the hollow this far."},
      {speaker:"Moon Night",text:"Kest walked ahead."},
      {speaker:"Bram",text:"He's west of the wyrm. Long-bodied, ribbon-finned. Not a fox. Then the echo can stop running."},
      {speaker:"Bram",text:"The animals are the echo. Bind the wyrm if you still need the pulse."},
      {speaker:"Bram",text:"The gate behind you still heals. Press E at the heart altar. That ends the campaign."}
    ],
    againTalk:[{speaker:"Bram",text:"We meet at the last echo. Cairn twist, then this heart."},{speaker:"Bram",text:"I'm not leaving until the leftover fire can rest."},{speaker:"Bram",text:"An echo-stone sits farther east. Press E there if the leftover fire feels thin."}],
    afterCaptureTalk:[
      {speaker:"Bram",text:"You bound the last pulse. That's the leftover fire I tracked, still at last."},
      {speaker:"Bram",text:"Walk east. The gate behind you still heals. Press E at the heart altar. That ends the campaign."},
      {speaker:"Bram",text:"Then we walk out as people."}
    ],
    palette:{skin:"#c09070",cloak:"#3a1c12",trim:"#ff7a3a",accent:"#ffc08a"}
  },
  {id:"orrin",name:"Orrin",map:1,x:2280,talkRadius:150,cardId:BABY_DRAGON_CARD.id,
    firstTalk:[
      {speaker:"Orrin",text:"The rain writes the same line every night. I'm Orrin. I copy it so we don't forget."},
      {speaker:"Moon Night",text:"The echo is already in the walls."},
      {speaker:"Orrin",text:"Aye. Calen watches the spark. I watch the writing. The animals are the echo."},
      {speaker:"Orrin",text:"Bind the dragon, then go east. The east portal heals you."},
      {speaker:"Orrin",text:"The rain still writes after that. The road just has a name walking it."}
    ],
    againTalk:[{speaker:"Orrin",text:"Still copying, Moon Night. Bind the dragon if you haven't, then go east. The east portal heals you."},{speaker:"Orrin",text:"The plaque higher up says the same thing in older stone. Press E there if the rain feels thin."}],
    afterCaptureTalk:[
      {speaker:"Orrin",text:"You took the first spark. The rain I copy is quieter now."},
      {speaker:"Orrin",text:"The east portal heals you. If the well still pools light, I'll meet you there."},
      {speaker:"Orrin",text:"I want the same line in moonwater."}
    ],
    palette:{skin:"#b8a090",cloak:"#1e2a38",trim:"#6a8aa0",accent:"#c8dce8"}
  },
  {id:"orrin",name:"Orrin",map:4,x:650,talkRadius:150,cardId:PALE_STAG_CARD.id,
    firstTalk:[
      {speaker:"Orrin",text:"The well writes in moonwater now. I left the castle rain to copy that line."},
      {speaker:"Moon Night",text:"The stag is holding the pool."},
      {speaker:"Orrin",text:"That's the line I came for. Pale antlers, not castle rain. The animals are the echo."},
      {speaker:"Orrin",text:"Bind the stag, then go east. The east gate heals you."},
      {speaker:"Orrin",text:"Calen keeps the later watch. I keep the words so the well does not lie."}
    ],
    againTalk:[{speaker:"Orrin",text:"We meet again. Castle rain, then cliff wind. Same road."},{speaker:"Orrin",text:"A cliff notch sits east, cut to listen. Press E there if the wind feels thin."}],
    afterCaptureTalk:[
      {speaker:"Orrin",text:"You bound the pool I came to copy. The well looks dimmer, and the rain I wrote is finally still."},
      {speaker:"Orrin",text:"The east gate heals you. Reed's kiln is through it."},
      {speaker:"Orrin",text:"Tell him a scribe still walks."}
    ],
    palette:{skin:"#b8a090",cloak:"#1e2a38",trim:"#6a8aa0",accent:"#c8dce8"}
  },
  {id:"nia",name:"Nia",map:2,x:4360,talkRadius:150,cardId:SUNSET_JACKAL_CARD.id,
    firstTalk:[
      {speaker:"Nia",text:"The light dies slow here. I'm Nia. I walk dusk until it fails."},
      {speaker:"Moon Night",text:"Jackals hunt in threes."},
      {speaker:"Nia",text:"They do. Sera counts them. I follow the gold until it goes out. The animals are the echo."},
      {speaker:"Nia",text:"Bind one shard, then go east. The east portal heals you."},
      {speaker:"Nia",text:"Leave the rest to the sand. The hollow waits when the light fails."}
    ],
    againTalk:[{speaker:"Nia",text:"Still here, Moon Night. Bind a dusk shard if you haven't, then go east. The east portal heals you."},{speaker:"Nia",text:"The hollow waits when the light fails. The gold is already thinning on this last stretch."}],
    afterCaptureTalk:[
      {speaker:"Nia",text:"You took the dusk. That's why the shore looks thinner."},
      {speaker:"Nia",text:"The east portal heals you. I walk when the light dies."}
    ],
    palette:{skin:"#d8b090",cloak:"#4a2848",trim:"#e8a060",accent:"#ffd8a0"}
  },
  {id:"nia",name:"Nia",map:6,x:3280,talkRadius:150,cardId:HEART_WYRM_CARD.id,
    firstTalk:[
      {speaker:"Nia",text:"The last light I followed ends here. Shore dusk walked this far."},
      {speaker:"Moon Night",text:"Kest walked ahead."},
      {speaker:"Nia",text:"The pulse is not dusk. We were never chasing a gate."},
      {speaker:"Nia",text:"The animals are the echo. Bind the wyrm if you still need the pulse."},
      {speaker:"Nia",text:"The gate behind you still heals. Press E at the heart altar. That ends the campaign."}
    ],
    againTalk:[{speaker:"Nia",text:"We keep meeting at the edge of the light. Shore dusk, then this heart."},{speaker:"Nia",text:"The last gold I followed ends here."},{speaker:"Nia",text:"An echo-stone still sits east. Press E there if the last light feels thin."}],
    afterCaptureTalk:[
      {speaker:"Nia",text:"You bound the last pulse. That's the dusk I followed, finished."},
      {speaker:"Nia",text:"Walk east. The gate behind you still heals. Press E at the heart altar. That ends the campaign."},
      {speaker:"Nia",text:"Then we walk out as people."}
    ],
    palette:{skin:"#d8b090",cloak:"#4a2848",trim:"#e8a060",accent:"#ffd8a0"}
  },
  {id:"vess",name:"Vess",map:3,x:5140,talkRadius:150,cardId:CINDER_FOX_CARD.id,
    firstTalk:[
      {speaker:"Vess",text:"Ash in the writing. I'm Vess. I read the cairn so nobody lies to themselves."},
      {speaker:"Moon Night",text:"The signal feels closer to the animals."},
      {speaker:"Vess",text:"That's the twist. The animals are the echo. Bram scouts the foxes. I read the stones."},
      {speaker:"Vess",text:"Bind leftover heat, then go east. The east portal heals you. Don't mistake the gate for the call."}
    ],
    againTalk:[{speaker:"Vess",text:"Still reading, Moon Night. Bind leftover heat if you haven't, then go east. The east portal heals you."},{speaker:"Vess",text:"If you skipped the cairn, walk back. Press E there if the stones feel thin."}],
    afterCaptureTalk:[
      {speaker:"Vess",text:"You took the leftover fire. The cairn was right."},
      {speaker:"Vess",text:"The east portal heals you. I'll walk the kiln road. If Reed still tends heat, tell him the ash already knew."}
    ],
    palette:{skin:"#c4a888",cloak:"#2a2824",trim:"#8a7060",accent:"#e8c8a0"}
  },
  {id:"vess",name:"Vess",map:5,x:2960,talkRadius:150,cardId:EMBER_LYNX_CARD.id,
    firstTalk:[
      {speaker:"Vess",text:"I still read the ash. The cairn sent me as far as this kiln."},
      {speaker:"Moon Night",text:"Reed keeps the fire."},
      {speaker:"Vess",text:"He does. Lynx-shaped coals, not foxes. Same echo, later heat."},
      {speaker:"Vess",text:"The animals are the echo. Bind a lynx if you still need the heat."},
      {speaker:"Vess",text:"The east gate heals you. Press E at the heart altar. That ends the campaign."}
    ],
    againTalk:[{speaker:"Vess",text:"We meet where the ash learned to wait. Cairn twist, then kiln."},{speaker:"Vess",text:"Quiet bellows sit west of the kiln road. Press E there if the breath feels thin."}],
    afterCaptureTalk:[
      {speaker:"Vess",text:"Coal pelt, not foxfire. You bound the last heat the cairn promised."},
      {speaker:"Vess",text:"The east gate heals you. Talk to Kest. Press E at the altar to end the campaign."},
      {speaker:"Vess",text:"If Nia is still walking dusk, tell her the light didn't fail. It banked."},
      {speaker:"Vess",text:"Then we walk out as people. The ash I read can stay banked."}
    ],
    palette:{skin:"#c4a888",cloak:"#2a2824",trim:"#8a7060",accent:"#e8c8a0"}
  },
  {id:"tamsin",name:"Tamsin",map:1,x:3980,talkRadius:150,cardId:BABY_DRAGON_CARD.id,
    firstTalk:[
      {speaker:"Tamsin",text:"The east wall still watches a road that already left. I'm Tamsin."},
      {speaker:"Moon Night",text:"The spark is in the dragon, not the stone."},
      {speaker:"Tamsin",text:"Then you heard Calen. I keep the last merlon so nobody mistakes the wall for the call."},
      {speaker:"Tamsin",text:"The animals are the echo."},
      {speaker:"Tamsin",text:"Bind the spark, then go east. The east portal heals you. The shore is longer than it looks from here."}
    ],
    againTalk:[{speaker:"Tamsin",text:"Still on the wall, Moon Night. Bind the spark if you haven't, then go east. The east portal heals you."},{speaker:"Tamsin",text:"The merlon is farther east. Press E there if the rain feels thin."}],
    afterCaptureTalk:[
      {speaker:"Tamsin",text:"You took the first spark. The rain on this wall is quieter now."},
      {speaker:"Tamsin",text:"The east portal heals you. I'll take the long road to the kiln. Tell Reed a merlon-watcher still stands."}
    ],
    palette:{skin:"#c8b49a",cloak:"#243040",trim:"#7a9ab0",accent:"#d0e8f0"}
  },
  {id:"tamsin",name:"Tamsin",map:5,x:5000,talkRadius:150,cardId:EMBER_LYNX_CARD.id,
    firstTalk:[
      {speaker:"Tamsin",text:"I left the merlon standing. This kiln road still needs that wall."},
      {speaker:"Moon Night",text:"Reed keeps the fire."},
      {speaker:"Tamsin",text:"He does. Lynx-shaped coals, not castle rain."},
      {speaker:"Tamsin",text:"The animals are the echo. Bind a lynx if you still need the heat."},
      {speaker:"Tamsin",text:"The east gate heals you. Press E at the heart altar. That ends the campaign."}
    ],
    againTalk:[{speaker:"Tamsin",text:"We meet again. Castle merlon, then kiln road. Same watch, later fire."},{speaker:"Tamsin",text:"The quiet kiln sits west. Press E there if the fire feels thin."}],
    afterCaptureTalk:[
      {speaker:"Tamsin",text:"You bound the last heat. The merlon I left behind can finally stop watching."},
      {speaker:"Tamsin",text:"The east gate heals you. Talk to Kest. Press E at the altar. That ends the campaign."},
      {speaker:"Tamsin",text:"If Orrin is still copying rain, tell him the wall already knew the line."},
      {speaker:"Tamsin",text:"Then we walk out as people. The merlon I left can stay quiet."}
    ],
    palette:{skin:"#c8b49a",cloak:"#243040",trim:"#7a9ab0",accent:"#d0e8f0"}
  },
  {id:"lira",name:"Lira",map:2,x:2480,talkRadius:150,cardId:SUNSET_JACKAL_CARD.id,
    firstTalk:[
      {speaker:"Lira",text:"The gold thins here. I'm Lira. I count dusk until it fails."},
      {speaker:"Moon Night",text:"Jackals hunt the dusk of the echo."},
      {speaker:"Lira",text:"They do. Sera counts the pack. Nia follows the last light. The animals are the echo."},
      {speaker:"Lira",text:"Bind one shard, then go east. The east portal heals you. Leave the extra scout to the sand."}
    ],
    againTalk:[{speaker:"Lira",text:"Still counting, Moon Night. Bind one dusk shard if you haven't, then go east. The east portal heals you."},{speaker:"Lira",text:"The drowned post mid-beach keeps the same count. Press E there if the light feels thin."}],
    afterCaptureTalk:[
      {speaker:"Lira",text:"You took the dusk shard. That's why the shore looks thinner."},
      {speaker:"Lira",text:"The east portal heals you. I walk the cliffs later if the well still pools light."}
    ],
    palette:{skin:"#e0b888",cloak:"#5a3020",trim:"#f0a050",accent:"#ffe0a8"}
  },
  {id:"lira",name:"Lira",map:4,x:4480,talkRadius:150,cardId:PALE_STAG_CARD.id,
    firstTalk:[
      {speaker:"Lira",text:"I count this pool now. Shore gold ended; the well still holds a number."},
      {speaker:"Moon Night",text:"The stag is holding the signal."},
      {speaker:"Lira",text:"Pale antlers, not dusk fur. Same echo, later shard. The animals are the echo."},
      {speaker:"Lira",text:"Bind the pool, then go east. The east gate heals you. Calen keeps the east watch. Orrin copies the well."}
    ],
    againTalk:[{speaker:"Lira",text:"We meet again. Shore dusk, then cliff wind. Same count, later light."},{speaker:"Lira",text:"The gold I counted on the sand is pooled in this moonwell. Press E there if the light feels thin."}],
    afterCaptureTalk:[
      {speaker:"Lira",text:"You bound the pool shard. The dusk I counted on the shore is quieter now."},
      {speaker:"Lira",text:"The east gate heals you. Reed's kiln is through it."},
      {speaker:"Lira",text:"Tell him a dusk-counter still walks."}
    ],
    palette:{skin:"#e0b888",cloak:"#5a3020",trim:"#f0a050",accent:"#ffe0a8"}
  },
  {id:"holt",name:"Holt",map:3,x:3800,talkRadius:150,cardId:CINDER_FOX_CARD.id,
    firstTalk:[
      {speaker:"Holt",text:"Ash on the stones. I'm Holt. I walk the cairn road so the twist stays honest."},
      {speaker:"Moon Night",text:"The signal is closer to the animals than the gate."},
      {speaker:"Holt",text:"That's the part. The animals are the echo. Bram scouts the foxes. Vess reads the writing."},
      {speaker:"Holt",text:"Bind leftover heat, then go east. The east portal heals you. The well is through that gate."}
    ],
    againTalk:[{speaker:"Holt",text:"Still on the cairn road, Moon Night. Bind leftover heat if you haven't, then go east."},{speaker:"Holt",text:"The east portal heals you."},{speaker:"Holt",text:"If you skipped the split cairn, walk west. Press E there if the stones feel thin."}],
    afterCaptureTalk:[
      {speaker:"Holt",text:"You took the leftover-fire shard. That's foxfire — the echo shedding what the shore dropped."},
      {speaker:"Holt",text:"The cairn stayed honest. Leftover fire lives in the animals, not the next gate."},
      {speaker:"Holt",text:"I'll take the long way. If the ash stays honest, we'll speak again."}
    ],
    palette:{skin:"#c89878",cloak:"#2c1a14",trim:"#d86838",accent:"#f0b888"}
  },
  {id:"holt",name:"Holt",map:6,x:3580,talkRadius:150,cardId:HEART_WYRM_CARD.id,
    firstTalk:[
      {speaker:"Holt",text:"The last stones still have to stay honest. I walked the ash this far."},
      {speaker:"Moon Night",text:"Kest walked ahead."},
      {speaker:"Holt",text:"He's west of the wyrm. Long-bodied, ribbon-finned. Not leftover fire. We were never chasing a gate."},
      {speaker:"Holt",text:"The animals are the echo. Bind the wyrm if you still need the pulse."},
      {speaker:"Holt",text:"The gate behind you still heals. Press E at the heart altar. That ends the campaign."}
    ],
    againTalk:[{speaker:"Holt",text:"We meet again. Cairn twist, then heart. Same road, last page."},{speaker:"Holt",text:"An echo-stone sits east. Press E there if the last stones feel thin."}],
    afterCaptureTalk:[
      {speaker:"Holt",text:"You bound the last pulse. That's the cairn road, honest at last."},
      {speaker:"Holt",text:"Walk east. The gate behind you still heals. Press E at the heart altar. That ends the campaign."},
      {speaker:"Holt",text:"Then we walk out as people."}
    ],
    palette:{skin:"#c89878",cloak:"#2c1a14",trim:"#d86838",accent:"#f0b888"}
  },
  {id:"maer",name:"Maer",map:1,x:5480,talkRadius:150,cardId:BABY_DRAGON_CARD.id,
    firstTalk:[
      {speaker:"Maer",text:"Leftover rain keeps walking after the wall gives up. I'm Maer."},
      {speaker:"Moon Night",text:"The spark is in the dragon, not the stone."},
      {speaker:"Maer",text:"Then you heard Calen and Tamsin. I keep the stretch after the merlon so nobody turns back."},
      {speaker:"Maer",text:"The animals are the echo."},
      {speaker:"Maer",text:"Bind the first spark, then go east. The east portal heals you. The shore is longer than this rain looks."}
    ],
    againTalk:[{speaker:"Maer",text:"Still on the leftover road, Moon Night. Bind the spark if you haven't, then go east."},{speaker:"Maer",text:"The east portal heals you."},{speaker:"Maer",text:"The merlon is west. Press E there if the rain feels thin."}],
    afterCaptureTalk:[
      {speaker:"Maer",text:"You took the first spark. The leftover road I walk is quieter now."},
      {speaker:"Maer",text:"The east portal heals you. I'll keep the leftover rain walking."},
      {speaker:"Maer",text:"Tell Reed a rain-walker still stands."}
    ],
    palette:{skin:"#c4a888",cloak:"#1c2834",trim:"#6a88a0",accent:"#c0d8e8"}
  },
  {id:"maer",name:"Maer",map:5,x:3600,talkRadius:150,cardId:EMBER_LYNX_CARD.id,
    firstTalk:[
      {speaker:"Maer",text:"Leftover rain walked me here. I left the castle for this kiln heat."},
      {speaker:"Moon Night",text:"Reed keeps the fire."},
      {speaker:"Maer",text:"He does. Lynx-shaped coals, not castle rain."},
      {speaker:"Maer",text:"The animals are the echo. Bind a lynx if you still need the heat."},
      {speaker:"Maer",text:"The east gate heals you. Press E at the heart altar. That ends the campaign."}
    ],
    againTalk:[{speaker:"Maer",text:"We meet again. Castle rain, then kiln road. Same leftover walk, later fire."},{speaker:"Maer",text:"Quiet bellows sit west. Press E there if the leftover fire feels thin."}],
    afterCaptureTalk:[
      {speaker:"Maer",text:"You bound the last heat. The leftover rain I followed can finally rest."},
      {speaker:"Maer",text:"The east gate heals you. Talk to Kest. Press E at the heart altar. That ends the campaign."},
      {speaker:"Maer",text:"If Lira is still counting light, tell her the gold banked here."},
      {speaker:"Maer",text:"Then we walk out as people. The leftover rain can stay quiet."}
    ],
    palette:{skin:"#c4a888",cloak:"#1c2834",trim:"#6a88a0",accent:"#c0d8e8"}
  },
  {id:"perrin",name:"Perrin",map:2,x:4000,talkRadius:150,cardId:SUNSET_JACKAL_CARD.id,
    firstTalk:[
      {speaker:"Perrin",text:"Late sand. I'm Perrin. I keep the last stretch so dusk does not strand anyone."},
      {speaker:"Moon Night",text:"The hollow waits when the light fails."},
      {speaker:"Perrin",text:"It does. Lira counts mid-beach. I watch the gate. The animals are the echo."},
      {speaker:"Perrin",text:"Bind one dusk shard, then go east. The east portal heals you. Leave the rest. The hollow is through that gate."}
    ],
    againTalk:[{speaker:"Perrin",text:"Still on the late sand, Moon Night. Bind a dusk shard if you haven't, then go east. The east portal heals you."},{speaker:"Perrin",text:"A tide-cut step sits farther east. Press E there if the shore feels thin."}],
    afterCaptureTalk:[
      {speaker:"Perrin",text:"You took the dusk shard. The late sand can go dark without taking you."},
      {speaker:"Perrin",text:"The east portal heals you. The hollow is through that gate."},
      {speaker:"Perrin",text:"I'll walk when the late sand dies. Tell Reed a late-shore walker still stands."}
    ],
    palette:{skin:"#d4a878",cloak:"#3a2418",trim:"#e88840",accent:"#ffd090"}
  },
  {id:"perrin",name:"Perrin",map:5,x:3260,talkRadius:150,cardId:EMBER_LYNX_CARD.id,
    firstTalk:[
      {speaker:"Perrin",text:"Late coals now. I left the shore so nobody strands on this kiln road."},
      {speaker:"Moon Night",text:"Reed keeps the kiln."},
      {speaker:"Perrin",text:"He does. Lynx-shaped coals, not dusk fur."},
      {speaker:"Perrin",text:"The animals are the echo. Bind a lynx if you still need the heat."},
      {speaker:"Perrin",text:"The east gate heals you. Press E at the heart altar. That ends the campaign."}
    ],
    againTalk:[{speaker:"Perrin",text:"We meet again. Late shore, then kiln road. Same watch, later heat."},{speaker:"Perrin",text:"Quiet bellows sit west. Press E there if the heat feels thin."}],
    afterCaptureTalk:[
      {speaker:"Perrin",text:"You bound the coal shard. The dusk I watched on the late sand is finished here."},
      {speaker:"Perrin",text:"The east gate heals you. Talk to Kest. Press E at the heart altar. That ends the campaign."},
      {speaker:"Perrin",text:"If Holt is still on the cairn road, tell him the ash banked."},
      {speaker:"Perrin",text:"Then we walk out as people. The late coals can go dark."}
    ],
    palette:{skin:"#d4a878",cloak:"#3a2418",trim:"#e88840",accent:"#ffd090"}
  },
  {id:"wren",name:"Wren",map:1,x:1200,talkRadius:150,cardId:BABY_DRAGON_CARD.id,
    firstTalk:[
      {speaker:"Wren",text:"The rain speaks if you stand still. I'm Wren."},
      {speaker:"Moon Night",text:"I came for that echo."},
      {speaker:"Wren",text:"Calen watches the spark. Orrin copies the line. I listen so we don't chase the wall. The animals are the echo."},
      {speaker:"Wren",text:"Bind the first spark, then go east. The east portal heals you. The shore dusk is longer than this rain looks."}
    ],
    againTalk:[{speaker:"Wren",text:"Still listening, Moon Night. Bind the spark if you haven't, then go east. The east portal heals you."},{speaker:"Wren",text:"There is a rain-cut groove farther along the floor. Press E there if the signal feels thin."}],
    afterCaptureTalk:[
      {speaker:"Wren",text:"You took the first spark. That's why the rain I listen to is quieter."},
      {speaker:"Wren",text:"Each bound animal is a shard. This one is the first spark in the rain."},
      {speaker:"Wren",text:"The east portal heals you. I walk the cliffs later if the well still pools light."}
    ],
    palette:{skin:"#d0b898",cloak:"#243848",trim:"#7ab0c8",accent:"#b8e8f0"}
  },
  {id:"wren",name:"Wren",map:4,x:5200,talkRadius:150,cardId:PALE_STAG_CARD.id,
    firstTalk:[
      {speaker:"Wren",text:"The well still speaks if you stand still. I left the castle to listen."},
      {speaker:"Moon Night",text:"The stag is holding the pool."},
      {speaker:"Wren",text:"Pale antlers, not castle rain. Same echo, later shard. The animals are the echo."},
      {speaker:"Wren",text:"Bind the pool, then go east. The east gate heals you. Lira counts the light. Orrin copies the well."}
    ],
    againTalk:[{speaker:"Wren",text:"We meet again. Castle rain, then this cliff. Same listen, later wind."},{speaker:"Wren",text:"The rain I listened to is still in this moonwell. Press E there if the pool feels thin."}],
    afterCaptureTalk:[
      {speaker:"Wren",text:"You bound the pool shard. The rain I listened to in the castle is finally still."},
      {speaker:"Wren",text:"The east gate heals you. Reed's kiln is through it."},
      {speaker:"Wren",text:"Tell him a rain-listener still walks."}
    ],
    palette:{skin:"#d0b898",cloak:"#243848",trim:"#7ab0c8",accent:"#b8e8f0"}
  },
  {id:"dell",name:"Dell",map:2,x:3680,talkRadius:150,cardId:SUNSET_JACKAL_CARD.id,
    firstTalk:[
      {speaker:"Dell",text:"The gold thins and then holds. I'm Dell. I walk the stretch Lira counted."},
      {speaker:"Moon Night",text:"Jackals hunt the dusk of the echo."},
      {speaker:"Dell",text:"They do. Lira keeps the count. Perrin watches the late sand. The animals are the echo."},
      {speaker:"Dell",text:"Bind one dusk shard, then go east. The east portal heals you."},
      {speaker:"Dell",text:"Leave the extra scout. The hollow is through that gate."}
    ],
    againTalk:[{speaker:"Dell",text:"Still on the later gold, Moon Night. Bind a dusk shard if you haven't, then go east."},{speaker:"Dell",text:"The east portal heals you."},{speaker:"Dell",text:"One dusk shard is enough to carry. The extra scout can keep the sand."}],
    afterCaptureTalk:[
      {speaker:"Dell",text:"You took the dusk shard. That's why this gold looks thinner."},
      {speaker:"Dell",text:"The east portal heals you. The hollow is through that gate."},
      {speaker:"Dell",text:"I walk when the gold fails. If the dusk still holds, we may share that road."}
    ],
    palette:{skin:"#d8a870",cloak:"#4a2018",trim:"#e07030",accent:"#ffc070"}
  },
  {id:"dell",name:"Dell",map:6,x:4180,talkRadius:150,cardId:HEART_WYRM_CARD.id,
    firstTalk:[
      {speaker:"Dell",text:"The gold holds even here. I walked the shore this far."},
      {speaker:"Moon Night",text:"Kest walked ahead."},
      {speaker:"Dell",text:"He's west of the wyrm. Long-bodied, ribbon-finned. Not dusk fur. We were never chasing a gate."},
      {speaker:"Dell",text:"The animals are the echo. Bind the wyrm if you still need the pulse."},
      {speaker:"Dell",text:"The gate behind you still heals. Press E at the heart altar. That ends the campaign."}
    ],
    againTalk:[{speaker:"Dell",text:"We meet again. Shore dusk, then heart. Same road, last gold."},{speaker:"Dell",text:"An echo-stone sits east. Press E there if the gold feels thin."}],
    afterCaptureTalk:[
      {speaker:"Dell",text:"You bound the last pulse. That's the dusk I followed, finished at the heart altar."},
      {speaker:"Dell",text:"Walk east. The gate behind you still heals. Press E at the heart altar. That ends the campaign."},
      {speaker:"Dell",text:"Then we walk out as people. The shore can go dark without taking us."}
    ],
    palette:{skin:"#d8a870",cloak:"#4a2018",trim:"#e07030",accent:"#ffc070"}
  },
  {id:"isk",name:"Isk",map:3,x:1820,talkRadius:150,cardId:CINDER_FOX_CARD.id,
    firstTalk:[
      {speaker:"Isk",text:"Ash in the breath. I'm Isk. I walk the leftover heat so the foxes don't lie."},
      {speaker:"Moon Night",text:"The signal feels closer to the animals."},
      {speaker:"Isk",text:"That's the cairn twist. The animals are the echo. Bram scouts west. Holt walks the later stones."},
      {speaker:"Isk",text:"Bind leftover heat, then go east. The east portal heals you. The well is through that gate."}
    ],
    againTalk:[{speaker:"Isk",text:"Still in the early ash, Moon Night. Bind leftover heat if you haven't, then go east."},{speaker:"Isk",text:"The east portal heals you."},{speaker:"Isk",text:"A foxfire hollow sits on a stepped ledge west. Press E there if the ash feels thin."}],
    afterCaptureTalk:[
      {speaker:"Isk",text:"You took the leftover-fire shard. That's foxfire — the echo shedding what the shore dropped."},
      {speaker:"Isk",text:"The cairn twist was leftover fire in the foxes, not the next gate."},
      {speaker:"Isk",text:"The east portal heals you. The well will try to hold this leftover fire."}
    ],
    palette:{skin:"#c08868",cloak:"#2a1810",trim:"#c05028",accent:"#e8a070"}
  },
  {id:"isk",name:"Isk",map:5,x:1770,talkRadius:150,cardId:EMBER_LYNX_CARD.id,
    firstTalk:[
      {speaker:"Isk",text:"Banked breath. I left the cairn so this kiln heat doesn't lie."},
      {speaker:"Moon Night",text:"Reed keeps the fire."},
      {speaker:"Isk",text:"He does. Lynx-shaped coals, not foxes."},
      {speaker:"Isk",text:"The animals are the echo. Bind a lynx if you still need the heat."},
      {speaker:"Isk",text:"The east gate heals you. Press E at the heart altar. That ends the campaign."}
    ],
    againTalk:[{speaker:"Isk",text:"We meet again. Cairn twist, then kiln heat. Same leftover walk, later fire."},{speaker:"Isk",text:"A banked coal-bed sits west. Press E there if the heat feels thin."}],
    afterCaptureTalk:[
      {speaker:"Isk",text:"You bound the coal shard. The leftover fire I walked in the hollow banked here."},
      {speaker:"Isk",text:"The east gate heals you. Talk to Kest. Press E at the heart altar. That ends the campaign."},
      {speaker:"Isk",text:"If Wren is still listening on the cliffs, tell her the rain banked."},
      {speaker:"Isk",text:"Then we walk out as people. This kiln heat can stay honest."}
    ],
    palette:{skin:"#c08868",cloak:"#2a1810",trim:"#c05028",accent:"#e8a070"}
  },
  {id:"rowan",name:"Rowan",map:1,x:4730,talkRadius:150,cardId:BABY_DRAGON_CARD.id,
    firstTalk:[
      {speaker:"Rowan",text:"The wall keeps a leftover road. I'm Rowan. I walk it so nobody turns around."},
      {speaker:"Moon Night",text:"The spark is in the dragon, not the stone."},
      {speaker:"Rowan",text:"Then you heard Calen and Tamsin. I keep the stretch after the merlon watch. The animals are the echo."},
      {speaker:"Rowan",text:"Bind the first spark, then go east. The east portal heals you. Shore dusk is longer than this rain looks."}
    ],
    againTalk:[{speaker:"Rowan",text:"Still on the leftover wall-road, Moon Night. Bind the spark if you haven't, then go east."},{speaker:"Rowan",text:"The east portal heals you."},{speaker:"Rowan",text:"Tamsin is west. Maer is farther east. The dragon still keeps the ruins."}],
    afterCaptureTalk:[
      {speaker:"Rowan",text:"You took the first spark. The leftover road I walk is quieter now."},
      {speaker:"Rowan",text:"Shards, not quarry. This one is rain-spark, not the whole road."},
      {speaker:"Rowan",text:"The east portal heals you. I'll take the leftover road east."},
      {speaker:"Rowan",text:"If Kest is still ahead, tell him a leftover-walker still stands."}
    ],
    palette:{skin:"#c8b080",cloak:"#1a2830",trim:"#5a8898",accent:"#a8d0d8"}
  },
  {id:"rowan",name:"Rowan",map:6,x:3880,talkRadius:150,cardId:HEART_WYRM_CARD.id,
    firstTalk:[
      {speaker:"Rowan",text:"The leftover road ends here. I walked the castle so nobody turns back."},
      {speaker:"Moon Night",text:"Kest walked ahead."},
      {speaker:"Rowan",text:"He's west of the wyrm. Long-bodied, ribbon-finned. Not castle rain."},
      {speaker:"Rowan",text:"The animals are the echo. Bind the wyrm if you still need the pulse."},
      {speaker:"Rowan",text:"The gate behind you still heals. Press E at the heart altar. That ends the campaign."}
    ],
    againTalk:[{speaker:"Rowan",text:"We meet again. Castle rain, then heart. Same leftover walk, last pulse."},{speaker:"Rowan",text:"An echo-stone still sits east. Press E there if the leftover road feels thin."}],
    afterCaptureTalk:[
      {speaker:"Rowan",text:"You bound the last pulse. That's every leftover step I walked, still in one place."},
      {speaker:"Rowan",text:"Walk east. The gate behind you still heals. Press E at the heart altar. That ends the campaign."},
      {speaker:"Rowan",text:"Then we walk out as people. The leftover road can go quiet."}
    ],
    palette:{skin:"#c8b080",cloak:"#1a2830",trim:"#5a8898",accent:"#a8d0d8"}
  },
  {id:"ryn",name:"Ryn",map:4,x:5565,talkRadius:150,cardId:PALE_STAG_CARD.id,
    firstTalk:[
      {speaker:"Ryn",text:"I keep this last cliff gate. The kiln road stays open if I stand here."},
      {speaker:"Moon Night",text:"Reed keeps the quiet fire."},
      {speaker:"Ryn",text:"He does. The animals are the echo. Bind the stag if you still need the pool, then go east."},
      {speaker:"Ryn",text:"The east gate heals you."},
      {speaker:"Ryn",text:"Kiln heat is next. Reed is through this gate."}
    ],
    againTalk:[{speaker:"Ryn",text:"Still on the last cliff, Moon Night. Bind the stag if you still need the pool, then go east."},{speaker:"Ryn",text:"The east gate heals you."},{speaker:"Ryn",text:"Reed is through it."}],
    afterCaptureTalk:[
      {speaker:"Ryn",text:"You bound the pool shard. The well can dim. The kiln still needs that heat."},
      {speaker:"Ryn",text:"The east gate heals you. Talk to Reed. Kiln heat is through this gate."}
    ],
    palette:{skin:"#c8a888",cloak:"#2a3038",trim:"#8aa8b8",accent:"#d0e8f0"}
  },
  {id:"ryn",name:"Ryn",map:5,x:5300,talkRadius:150,cardId:EMBER_LYNX_CARD.id,
    firstTalk:[
      {speaker:"Ryn",text:"I still keep the gate. Last coals before the heart stay open."},
      {speaker:"Moon Night",text:"Reed keeps the kiln."},
      {speaker:"Ryn",text:"West of here. Kest is through the east gate."},
      {speaker:"Ryn",text:"The animals are the echo. Bind a lynx if you still need the heat."},
      {speaker:"Ryn",text:"The east gate heals you. Press E at the heart altar. That ends the campaign."}
    ],
    againTalk:[{speaker:"Ryn",text:"We meet again. Cliff wind, then kiln gate. Same watch, later heat."}],
    afterCaptureTalk:[
      {speaker:"Ryn",text:"You bound the coal shard. The heart can take that heat now."},
      {speaker:"Ryn",text:"The east gate heals you. Press E at the heart altar. That ends the campaign."},
      {speaker:"Ryn",text:"Then we walk out as people. I'll keep this last gate."}
    ],
    palette:{skin:"#c8a888",cloak:"#2a3038",trim:"#8aa8b8",accent:"#d0e8f0"}
  },
  {id:"edan",name:"Edan",map:6,x:4900,talkRadius:150,cardId:HEART_WYRM_CARD.id,
    firstTalk:[
      {speaker:"Edan",text:"I wait by the last stone. Nobody turns around this close."},
      {speaker:"Moon Night",text:"Kest walked ahead."},
      {speaker:"Edan",text:"He waited west. I keep the last stone. The cooled vein is east."},
      {speaker:"Edan",text:"The animals are the echo. Bind the wyrm if you still need the pulse."},
      {speaker:"Edan",text:"The gate behind you still heals. Press E at the heart altar. That ends the campaign."}
    ],
    againTalk:[{speaker:"Edan",text:"Still by the last stone, Moon Night. Bind the wyrm if you still need the pulse. Walk east."},{speaker:"Edan",text:"Press E at the altar. The campaign ends when the signal rests."},{speaker:"Edan",text:"Press E at the cooled vein. An echo-stone sits past it. Press E there if the pulse feels loud."},{speaker:"Edan",text:"When the signal rests, we walk out as people. This last stone can stay."}],
    afterCaptureTalk:[
      {speaker:"Edan",text:"You bound the last pulse. That's every shard, still in one place."},
      {speaker:"Edan",text:"Walk east. Press E at the heart altar. That ends the campaign."},
      {speaker:"Edan",text:"Then we walk out as people. The last stone can stay empty."}
    ],
    palette:{skin:"#c09080",cloak:"#2c1828",trim:"#c86878",accent:"#f0c0b0"}
  },
  {id:"hale",name:"Hale",map:4,x:4080,talkRadius:150,cardId:PALE_STAG_CARD.id,
    firstTalk:[
      {speaker:"Hale",text:"The wind forgets you between watches. I'm Hale."},
      {speaker:"Moon Night",text:"I won't let it forget."},
      {speaker:"Hale",text:"Pale antlers keep the pool. The animals are the echo."},
      {speaker:"Hale",text:"Bind the stag if you still need the pool, then go east."},
      {speaker:"Hale",text:"The east gate heals you. Calen watches west. Lira counts east."}
    ],
    againTalk:[{speaker:"Hale",text:"Still on the quiet stretch, Moon Night. Bind the stag if you haven't, then go east."},{speaker:"Hale",text:"The east gate heals you."},{speaker:"Hale",text:"The wind still forgets you if nobody speaks."}],
    afterCaptureTalk:[
      {speaker:"Hale",text:"You bound the pool shard. That's why this quiet wind went still."},
      {speaker:"Hale",text:"The east gate heals you. Reed's kiln is through it."},
      {speaker:"Hale",text:"I keep the stretch the wind forgets. The pool can rest now."}
    ],
    palette:{skin:"#d2a890",cloak:"#3a2432",trim:"#c87888",accent:"#f0c8d0"}
  },
  {id:"hale",name:"Hale",map:5,x:4040,talkRadius:150,cardId:EMBER_LYNX_CARD.id,
    firstTalk:[
      {speaker:"Hale",text:"This kiln forgets the quiet cliff. I'm still Hale."},
      {speaker:"Moon Night",text:"Reed keeps the fire."},
      {speaker:"Hale",text:"He does. Cliff quiet, then this kiln. Lynx-shaped coals, not pale antlers."},
      {speaker:"Hale",text:"The animals are the echo. Bind a lynx if you still need the heat."},
      {speaker:"Hale",text:"The east gate heals you. Press E at the heart altar. That ends the campaign."}
    ],
    againTalk:[{speaker:"Hale",text:"We meet again. Cliff quiet, then this kiln."},{speaker:"Hale",text:"The kiln can forget the cliff, Moon Night. I still keep this stretch."},{speaker:"Hale",text:"The quiet kiln still sits west. Press E there if the coals feel thin."},{speaker:"Hale",text:"When this kiln can rest, we walk out as people. I'll keep this stretch."}],
    afterCaptureTalk:[
      {speaker:"Hale",text:"You bound the coal shard. That's kiln heat the heart can take."},
      {speaker:"Hale",text:"The east gate heals you. Talk to Kest. Press E at the heart altar. That ends the campaign."},
      {speaker:"Hale",text:"The wind can forget the cliff now. The kiln heat remembers."},
      {speaker:"Hale",text:"Then we walk out as people. This stretch can stay quiet."}
    ],
    palette:{skin:"#d2a890",cloak:"#3a2432",trim:"#c87888",accent:"#f0c8d0"}
  }
];
const talkTargetAt=(map:MapId,x:number,footY:number)=>{
  const npc=NPCS.find(n=>n.map===map&&Math.abs(x-n.x)<n.talkRadius)??null;
  const landmark=landmarkAt(map,x,footY)??null;
  if(npc&&landmark) return Math.abs(x-landmark.x)<=Math.abs(x-npc.x)?{npc:null,landmark}:{npc,landmark:null};
  return {npc,landmark:npc?null:landmark};
};
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
  {x:5100,y:560,w:720,h:210},{x:5740,y:590,w:680,h:180},{x:6340,y:545,w:860,h:225},
  {x:1020,y:475,w:170,h:18},{x:1600,y:490,w:150,h:18},{x:1740,y:430,w:140,h:18},
  {x:2260,y:470,w:160,h:18},{x:2320,y:508,w:140,h:18},{x:2448,y:428,w:150,h:18},
  {x:2588,y:382,w:210,h:18},{x:2780,y:468,w:150,h:18},{x:3320,y:455,w:180,h:18},{x:3780,y:430,w:170,h:18},
  {x:5280,y:470,w:170,h:18},{x:5860,y:455,w:160,h:18},
  {x:6380,y:500,w:150,h:18},{x:6520,y:430,w:170,h:18},{x:6680,y:500,w:150,h:18}
];
const map2Platforms: Platform[] = [
  {x:0,y:590,w:535,h:180},{x:500,y:568,w:470,h:202},{x:940,y:588,w:410,h:182},
  {x:1320,y:562,w:455,h:208},{x:1740,y:538,w:430,h:232},{x:2140,y:560,w:430,h:210},
  {x:2540,y:585,w:420,h:185},{x:2925,y:558,w:405,h:212},{x:3295,y:578,w:520,h:192},
  {x:3740,y:562,w:520,h:208},{x:4180,y:548,w:520,h:222},{x:4620,y:570,w:420,h:200},{x:4960,y:558,w:440,h:212},
  {x:610,y:466,w:150,h:18},{x:1140,y:472,w:180,h:18},{x:1418,y:498,w:160,h:18},{x:1515,y:430,w:155,h:18},{x:1680,y:498,w:150,h:18},
  {x:2245,y:445,w:200,h:18},{x:2360,y:448,w:155,h:18},{x:2750,y:468,w:165,h:18},{x:3140,y:438,w:150,h:18},
  {x:3920,y:458,w:160,h:18},{x:4480,y:448,w:170,h:18},
  {x:5080,y:500,w:140,h:18},{x:5180,y:432,w:160,h:18}
];
const map3Platforms: Platform[] = [
  {x:0,y:590,w:560,h:180},{x:520,y:566,w:520,h:204},{x:1000,y:600,w:470,h:170},
  {x:1430,y:548,w:520,h:222},{x:1910,y:575,w:500,h:195},{x:2370,y:535,w:520,h:235},
  {x:2850,y:580,w:500,h:190},{x:3310,y:548,w:690,h:222},
  {x:3920,y:575,w:620,h:195},{x:4480,y:540,w:620,h:230},{x:5040,y:565,w:760,h:205},
  {x:620,y:448,w:180,h:18},{x:1170,y:475,w:170,h:18},{x:1400,y:488,w:150,h:18},{x:1510,y:418,w:200,h:18},{x:1690,y:488,w:150,h:18},
  {x:2160,y:446,w:180,h:18},{x:1780,y:400,w:170,h:18},{x:2520,y:410,w:190,h:18},
  {x:3150,y:452,w:175,h:18},{x:3540,y:420,w:190,h:18},{x:4080,y:448,w:170,h:18},
  {x:4380,y:500,w:140,h:18},{x:4500,y:430,w:160,h:18},{x:4640,y:500,w:140,h:18}
];
const map4Platforms: Platform[] = [
  {x:0,y:590,w:1180,h:180},{x:1140,y:560,w:980,h:210},{x:2080,y:575,w:900,h:195},{x:2940,y:545,w:1260,h:225},
  {x:4100,y:560,w:720,h:210},{x:4760,y:545,w:720,h:225},{x:5420,y:555,w:580,h:215},
  {x:720,y:455,w:160,h:18},{x:1080,y:500,w:140,h:18},{x:1220,y:435,w:160,h:18},
  {x:1760,y:430,w:180,h:18},{x:2460,y:508,w:140,h:18},{x:2580,y:440,w:170,h:18},{x:2720,y:508,w:140,h:18},
  {x:2860,y:420,w:190,h:18},{x:3480,y:400,w:170,h:18},{x:3720,y:480,w:150,h:18},{x:3880,y:418,w:160,h:18},
  {x:4680,y:450,w:170,h:18},{x:5200,y:500,w:140,h:18},{x:5320,y:430,w:160,h:18},{x:5460,y:500,w:140,h:18}
];
const map5Platforms: Platform[] = [
  {x:0,y:590,w:1280,h:180},{x:1180,y:570,w:820,h:200},{x:1900,y:590,w:780,h:180},
  {x:2560,y:565,w:720,h:205},{x:3160,y:575,w:640,h:195},{x:3700,y:555,w:700,h:215},
  {x:4320,y:575,w:680,h:195},{x:4940,y:560,w:680,h:210},{x:5560,y:550,w:640,h:220},
  {x:720,y:455,w:160,h:18},{x:1360,y:508,w:140,h:18},{x:1480,y:440,w:170,h:18},{x:1620,y:508,w:140,h:18},
  {x:2180,y:455,w:180,h:18},{x:1760,y:430,w:160,h:18},{x:2880,y:430,w:160,h:18},{x:3480,y:420,w:150,h:18},
  {x:4680,y:450,w:160,h:18},{x:5220,y:440,w:150,h:18},
  {x:5640,y:488,w:150,h:18},{x:5780,y:422,w:160,h:18},{x:5920,y:488,w:140,h:18}
];
const map6Platforms: Platform[] = [
  {x:0,y:590,w:1180,h:180},{x:1140,y:560,w:780,h:210},{x:1920,y:590,w:1160,h:180},
  {x:2960,y:565,w:840,h:205},{x:3660,y:545,w:1140,h:225},
  {x:4700,y:565,w:720,h:205},{x:5360,y:545,w:1240,h:225},
  {x:720,y:455,w:160,h:18},{x:1680,y:425,w:180,h:18},{x:2680,y:415,w:190,h:18},
  {x:3380,y:430,w:180,h:18},{x:3480,y:400,w:200,h:18},
  {x:4880,y:450,w:170,h:18},{x:5280,y:430,w:160,h:18},
  {x:5780,y:490,w:150,h:18},{x:5920,y:430,w:180,h:18},{x:6080,y:490,w:150,h:18},
  {x:6160,y:490,w:150,h:18},{x:6300,y:430,w:160,h:18}
];
const clamp = (n:number,a:number,b:number) => Math.max(a,Math.min(b,n));
const cameraXFor=(playerX:number,worldW:number,viewW:number)=>clamp(playerX-viewW*.38,-CAM_EDGE_PAD,Math.max(0,worldW-viewW)+CAM_EDGE_PAD);
const finishInCameraAt=(landmarkX:number,playerX:number,worldW:number,viewW:number,inset=36)=>{const cam=cameraXFor(playerX,worldW,viewW);return landmarkX>=cam+inset&&landmarkX<=cam+viewW-inset;};
const nextUsableLoadout=(equipped:(string|null)[],itemId:string,selected:number)=>{
  const next=equipped.slice() as (string|null)[];
  const already=next.indexOf(itemId);
  if(already>=0)return {equipped:next,selected:already,replaced:null as string|null};
  const open=next.indexOf(null);
  if(open>=0){next[open]=itemId;return {equipped:next,selected:open,replaced:null as string|null};}
  const slot=clamp(selected,0,ACTIVE_SLOT_COUNT-1);
  const replaced=next[slot];
  next[slot]=itemId;
  return {equipped:next,selected:slot,replaced};
};
const easeInOut = (t:number) => t*t*(3-2*t);
const MODE_BLEND_MS = 260;
const DRAGON_FLAP_MS = 320;
const JACKAL_HOP_MS = 560;
const JACKAL_POUNCE_MS = 620;
const tickAnimalGait = (animal:{gait:number}, dt:number)=>{animal.gait=(animal.gait||0)+dt*1000;};
const locoClock = (animal:{mode:DragonMode;gait:number;modeStarted:number}, now:number)=>animal.mode==="sleep"||animal.mode==="attack"?now-animal.modeStarted:animal.gait||now-animal.modeStarted;
const rememberModeChange = (animal:{mode:DragonMode;prevMode:DragonMode;modeBlendAt:number}, mode:DragonMode, now:number)=>{
  if(animal.mode===mode)return false;
  animal.prevMode=animal.mode;animal.modeBlendAt=now;return true;
};
const flapPhase = (gait:number)=>{
  const t=((gait%DRAGON_FLAP_MS)+DRAGON_FLAP_MS)%DRAGON_FLAP_MS/DRAGON_FLAP_MS;
  const shaped=t<0.38?easeInOut(t/0.38)*0.48:0.48+easeInOut((t-0.38)/0.62)*0.52;
  return {t, shaped, lift:Math.sin(shaped*Math.PI), tilt:Math.sin(shaped*Math.PI*2)*0.04};
};
const flapFrame = (gait:number, frames:number)=>{
  const count=Math.max(1,frames);
  return Math.min(count-1, Math.floor(flapPhase(gait).shaped*count));
};
const hopArc = (t:number, height:number)=>{
  const u=clamp(t,0,1), peak=0.36;
  const shaped=u<peak?easeInOut(u/peak):1-easeInOut((u-peak)/(1-peak));
  return shaped*height;
};
const groundBeastHop = (beast:{id:string;mode:DragonMode;leapStarted:number;leapUntil:number}, now:number)=>{
  if(now>=beast.leapUntil||beast.id.startsWith("heart-wyrm")||beast.id.startsWith("ash-roost"))return 0;
  if(beast.mode!=="walk"&&beast.mode!=="run"&&beast.mode!=="idle")return 0;
  const span=beast.leapUntil-beast.leapStarted;
  const hopT=span>0?clamp((now-beast.leapStarted)/span,0,1):0;
  return hopArc(hopT,52);
};
const flyLandAmt = (animal:{mode:DragonMode;prevMode:DragonMode;modeBlendAt:number}, now:number)=>
  animal.prevMode==="fly"&&(animal.mode==="idle"||animal.mode==="walk"||animal.mode==="run")?(1-gaitBlendAmt(animal.modeBlendAt,now))*28:0;
const SLEEP_SETTLE_MS = 420;
const WAKE_BLEND_MS = 340;
const HURT_FLASH_MS = 90;
const sleepPoseAmt = (mode:DragonMode, prevMode:DragonMode, blendAt:number, now:number, elapsed:number) => {
  if(mode==="sleep") return easeInOut(clamp(elapsed/SLEEP_SETTLE_MS,0,1));
  if(prevMode==="sleep") return 1-easeInOut(clamp((now-blendAt)/WAKE_BLEND_MS,0,1));
  return 0;
};
const gaitBlendAmt = (blendAt:number, now:number)=>easeInOut(clamp((now-blendAt)/MODE_BLEND_MS,0,1));
const companionIdleLeftover = (ally:{mode:DragonMode;prevMode:DragonMode;modeBlendAt:number;gait:number;groundY:number;y:number}, groundAlly:boolean, now:number) => {
  const land=flyLandAmt(ally,now);
  if(!groundAlly) return land;
  const leftoverAir=Math.max(0,ally.groundY-ally.y);
  const hopPrev=(ally.prevMode==="run"||ally.mode==="run")?Math.min(leftoverAir,Math.abs(Math.sin((ally.gait||0)*.008))*38):0;
  return hopPrev*(1-gaitBlendAmt(ally.modeBlendAt,now));
};
const locoCadence = (mode:DragonMode, walk=180, run=110)=>mode==="run"?run:walk;
const locoPoseMode = (animal:{mode:DragonMode;prevMode:DragonMode;modeBlendAt:number}, now:number):DragonMode => {
  const blend=gaitBlendAmt(animal.modeBlendAt,now);
  if(animal.mode==="sleep"||animal.prevMode==="sleep") return animal.mode;
  if(blend<0.58&&animal.prevMode==="fly"&&(animal.mode==="idle"||animal.mode==="walk"||animal.mode==="run")) return animal.prevMode;
  if(blend<0.5&&(animal.prevMode==="walk"||animal.prevMode==="idle"||animal.prevMode==="run")&&animal.mode==="fly") return animal.prevMode;
  if(blend<0.5&&(animal.prevMode==="fly"||animal.prevMode==="run")&&(animal.mode==="idle"||animal.mode==="walk")) return animal.prevMode;
  if(blend<0.42&&(animal.prevMode==="walk"||animal.prevMode==="run"||animal.prevMode==="attack")&&(animal.mode==="walk"||animal.mode==="run"||animal.mode==="attack"||animal.mode==="idle")) return animal.prevMode;
  return animal.mode;
};
const pixelHurtFlash = (now:number) => Math.floor(now/HURT_FLASH_MS)%2===0;
const rgbaFromHex = (hex:string,alpha:number) => {const value=parseInt(hex.replace("#",""),16);return `rgba(${value>>16},${value>>8&255},${value&255},${alpha})`;};
const mixHex = (hex:string,r:number,g:number,b:number,t:number) => {
  const value=parseInt(hex.replace("#",""),16),rr=value>>16,gg=value>>8&255,bb=value&255;
  return `rgb(${Math.round(rr+(r-rr)*t)},${Math.round(gg+(g-gg)*t)},${Math.round(bb+(b-bb)*t)})`;
};
const lateMapContactShade = (map:MapId) => map===5
  ? {core:"rgba(18,6,4,.68)",mid:rgbaFromHex("#ff8c4a",.22),edge:"rgba(255,140,80,0)"}
  : map===6
  ? {core:"rgba(16,4,10,.68)",mid:rgbaFromHex("#d45a6a",.2),edge:"rgba(212,90,106,0)"}
  : null;
const worldWidthFor = (map:MapId) => map===1?MAP1_W:map===2?MAP2_W:map===3?MAP3_W:map===4?MAP4_W:map===5?MAP5_W:MAP6_W;
const platformsFor = (map:MapId) => map===1?map1Platforms:map===2?map2Platforms:map===3?map3Platforms:map===4?map4Platforms:map===5?map5Platforms:map6Platforms;
const surfaceYAt=(map:MapId,x:number,currentY:number)=>{const surfaces=platformsFor(map).filter(p=>p.h>80&&x>=p.x&&x<=p.x+p.w);if(!surfaces.length)return null;return surfaces.reduce((best,p)=>Math.abs(p.y-currentY)<Math.abs(best.y-currentY)?p:best).y;};
const plantedYAt=(map:MapId,x:number)=>(surfaceYAt(map,x,590)??590)-PH;
const creatureEdgeAt=(map:MapId,x:number)=>clamp(x,PLAYER_EDGE_MARGIN,worldWidthFor(map)-PLAYER_EDGE_MARGIN);
const cardBlockedAt=(map:MapId,x:number)=>{
  if(SCENERY_PROP_XS.some(px=>Math.abs(px-x)<CARD_WALL_CLEAR))return true;
  if(map===6){for(let i=0;i<17;i++){if(Math.abs((240+i*430)-x)<26)return true;}}
  const plat=platformsFor(map).filter(p=>p.h>80&&x>=p.x&&x<=p.x+p.w).sort((a,b)=>Math.abs(a.y-590)-Math.abs(b.y-590))[0];
  if(!plat)return true;
  return x<plat.x+CARD_FLOOR_INSET||x>plat.x+plat.w-CARD_FLOOR_INSET;
};
const plantedFloorAt=(map:MapId,x:number)=>{
  const worldW=worldWidthFor(map);
  let px=clamp(x,48,worldW-48);
  const hit=(nx:number)=>surfaceYAt(map,nx,590);
  const clear=(nx:number)=>{
    const g=hit(nx);
    if(g===null||cardBlockedAt(map,nx))return null;
    const head=g-PH;
    if(platformsFor(map).some(p=>p.h<=24&&nx+PW*.5>p.x&&nx-PW*.5<p.x+p.w&&p.y<g-2&&p.y+p.h>head+2))return null;
    return g;
  };
  const first=clear(px);
  if(first!==null)return {x:px,groundY:first};
  for(let d=8;d<=420;d+=8){
    const left=px-d,right=px+d;
    if(left>=48){const g=clear(left);if(g!==null)return {x:left,groundY:g};}
    if(right<=worldW-48){const g=clear(right);if(g!==null)return {x:right,groundY:g};}
  }
  const fallback=hit(px);
  if(fallback!==null)return {x:px,groundY:fallback};
  return {x:px,groundY:590};
};
const seatDeadBeast=(beast:{x:number;groundY:number;vx:number},map:MapId)=>{
  const floor=plantedFloorAt(map,beast.x);
  beast.x=floor.x;beast.groundY=floor.groundY;beast.vx=0;
  return floor;
};
const keepCreatureOnRoad=(creature:{x:number;y:number;groundY:number},map:MapId)=>{
  creature.x=creatureEdgeAt(map,creature.x);
  const ground=surfaceYAt(map,creature.x,creature.groundY)??surfaceYAt(map,creature.x,590);
  if(ground!==null){
    creature.groundY=ground;
    if(creature.y>ground+28)creature.y=ground;
    if(creature.y>ground)creature.y=ground;
    return ground;
  }
  const floor=plantedFloorAt(map,creature.x);
  creature.x=creatureEdgeAt(map,floor.x);
  creature.groundY=floor.groundY;
  if(creature.y>floor.groundY+28)creature.y=floor.groundY;
  if(creature.y>floor.groundY)creature.y=floor.groundY;
  return floor.groundY;
};
const atHeartAltar=(x:number)=>Math.abs(x-MAP6_HEART_X)<ALTAR_INTERACT_RANGE;
const lateObjectiveFor=(map:MapId,held:string[],ended:boolean)=>{
  if(ended) return "The echo is still. Ashfall keeps its heart.";
  if(map===6&&held.includes(HEART_WYRM_CARD.id)) return "Press E at the heart altar to end the campaign.";
  if(map===5&&held.includes(EMBER_LYNX_CARD.id)) return "Take the healing east gate to Ashfall's Heart.";
  if(map===4&&held.includes(PALE_STAG_CARD.id)) return "Take the far gate into The Quiet Ember.";
  if(map===3&&held.includes(CINDER_FOX_CARD.id)) return "Reach the moonwell gate.";
  if(map===2&&held.some(isSunsetJackalCardId)) return "Take the eastern portal to Ash Hollow.";
  if(map===1&&held.includes(BABY_DRAGON_CARD.id)) return "Take the far-right portal to Sunset Shore.";
  return MAP_STORY[map].objective;
};
const hudLockFor=(map:MapId,held:string[],ended:boolean)=>({name:MAP_STORY[map].name,objective:lateObjectiveFor(map,held,ended)});
const sixMapWorldPolishApplied=true;
const spawnFor = (map:MapId, from:MapId|null) => {
  if(from===null){const floor=plantedFloorAt(1,230);return {x:floor.x,y:plantedYAt(1,floor.x),facing:1 as 1|-1};}
  if(map===1){const floor=plantedFloorAt(1,6860);return {x:floor.x,y:plantedYAt(1,floor.x),facing:-1 as 1|-1};}
  const arrivingFromPrev = (map===2&&from===1)||(map===3&&from===2)||(map===4&&from===3)||(map===5&&from===4)||(map===6&&from===5);
  if(arrivingFromPrev){const floor=plantedFloorAt(map,340);return {x:floor.x,y:plantedYAt(map,floor.x),facing:1 as 1|-1};}
  const x=Math.max(240,worldWidthFor(map)-340);
  const floor=plantedFloorAt(map,x);return {x:floor.x,y:plantedYAt(map,floor.x),facing:-1 as 1|-1};
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
  const worldMapOpenRef = useRef(false);
  const unlockedMapsRef = useRef<Set<MapId>>(new Set<MapId>([1]));
  const inventoryRef = useRef<InventoryItem[]>([]);
  const equippedRef = useRef<(string|null)[]>(Array(ACTIVE_SLOT_COUNT).fill(null));
  const selectedSlotRef = useRef(0);
  const companionRef = useRef<Companion>({active:false,itemId:null,map:1,x:150,y:590,groundY:590,vx:0,facing:1,mode:"idle",modeStarted:0,gait:0,prevMode:"idle",modeBlendAt:0,summonedAt:0,recallStarted:0,teleportAt:0,attackUntil:0,attackLanded:false,targetX:0,lastPlayerAttack:-1,health:DRAGON_MAX_HEALTH,maxHealth:DRAGON_MAX_HEALTH});
  const seenIntroRef = useRef<Set<MapId>>(new Set());
  const metNpcRef = useRef<Set<string>>(new Set());
  const campaignEndedRef = useRef(false);
  const audioRef = useRef<AudioContext|null>(null);
  const soundRef = useRef(true);
  const [started,setStarted] = useState(false);
  const [mapNumber,setMapNumber] = useState<MapId>(1);
  const [dialogue,setDialogue] = useState<Line[]|null>(null);
  const [dialogueIndex,setDialogueIndex] = useState(0);
  const [nearAction,setNearAction] = useState<string|null>(null);
  const [promptAnchor,setPromptAnchor] = useState<{left:number;bottom:number}|null>(null);
  const [objective,setObjective] = useState(MAP_STORY[1].objective);
  const [campaignEnded,setCampaignEnded] = useState(false);
  const [soundOn,setSoundOn] = useState(true);
  const [health,setHealth] = useState(MAX_HEALTH);
  const [stamina,setStamina] = useState(MAX_STAMINA);
  const [inventoryOpen,setInventoryOpen] = useState(false);
  const [worldMapOpen,setWorldMapOpen] = useState(false);
  const [unlockedMaps,setUnlockedMaps] = useState<MapId[]>([1]);
  const [mapProgress,setMapProgress] = useState(4);
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
      if(next&&worldMapOpenRef.current){worldMapOpenRef.current=false;setWorldMapOpen(false);}
      keys.current={};jumpQueued.current=false;slideQueued.current=false;
      return next;
    });
  },[]);

  const toggleWorldMap=useCallback(()=>{if(!startedRef.current)return;setWorldMapOpen(open=>{const next=!open;worldMapOpenRef.current=next;if(next&&inventoryOpenRef.current){inventoryOpenRef.current=false;setInventoryOpen(false);}keys.current={};jumpQueued.current=false;slideQueued.current=false;return next;});},[]);

  const collectInventoryItem = useCallback((item:InventoryItem)=>{
    if(inventoryRef.current.some(existing=>existing.id===item.id))return true;
    if(inventoryRef.current.length>=INVENTORY_CAPACITY)return false;
    const next=[...inventoryRef.current,item];inventoryRef.current=next;setInventory(next);
    return true;
  },[]);

  const toggleEquippedItem = useCallback((itemId:string)=>{
    const current=equippedRef.current;
    const equippedIndex=current.indexOf(itemId);
    if(equippedIndex>=0){
      const next=[...current];
      next[equippedIndex]=null;
      const ally=companionRef.current;
      if(ally.active&&ally.itemId===itemId&&ally.recallStarted===0){const now=performance.now(),direction:1|-1=ally.x>=player.current.x?1:-1;ally.recallStarted=now;ally.attackUntil=0;ally.vx=0;companionCastRef.current={started:now,kind:"recall",direction};player.current.facing=direction;}
      equippedRef.current=next;setEquipped(next);
      return;
    }
    const loadout=nextUsableLoadout(current,itemId,selectedSlotRef.current);
    if(loadout.replaced){
      const ally=companionRef.current;
      if(ally.active&&ally.itemId===loadout.replaced&&ally.recallStarted===0){const now=performance.now(),direction:1|-1=ally.x>=player.current.x?1:-1;ally.recallStarted=now;ally.attackUntil=0;ally.vx=0;companionCastRef.current={started:now,kind:"recall",direction};player.current.facing=direction;}
    }
    equippedRef.current=loadout.equipped;setEquipped(loadout.equipped);
    selectedSlotRef.current=loadout.selected;setSelectedSlot(loadout.selected);
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
    if(!unlockedMapsRef.current.has(map)){unlockedMapsRef.current.add(map);setUnlockedMaps(Array.from(unlockedMapsRef.current).sort((a,b)=>a-b));}
    mapRef.current=map;setMapNumber(map);
    const pl=player.current;
    const spawn=spawnFor(map, from);
    pl.x=spawn.x;pl.y=spawn.y;pl.facing=spawn.facing;
    setObjective(hudLockFor(map,inventoryRef.current.map(item=>item.id),campaignEndedRef.current).objective);
    if(!seenIntroRef.current.has(map)){
      seenIntroRef.current.add(map);
      showDialogue(MAP_STORY[map].intro);
    }else{
      dialogueRef.current=null;setDialogue(null);
    }
    pl.vx=0;pl.vy=0;pl.grounded=true;pl.jumpsLeft=2;pl.crouched=false;pl.sliding=false;
    pl.health=pl.maxHealth;staminaRef.current=MAX_STAMINA;staminaUsedAt.current=-Infinity;setHealth(pl.maxHealth);setStamina(MAX_STAMINA); // portal heal still fires after companion reseat
    const ally=companionRef.current;
    if(ally.active&&ally.itemId){
      const now=performance.now();
      const groundAlly=cardStats(ally.itemId).ground;
      ally.map=map;
      const seat=plantedFloorAt(map,pl.x-pl.facing*96);
      ally.x=creatureEdgeAt(map,seat.x);
      const arrivalGround=seat.groundY; // companion portal reseat still plants after #38 floors
      rememberModeChange(ally,groundAlly?"run":"fly",now);
      ally.groundY=arrivalGround;
      ally.y=groundAlly?arrivalGround:arrivalGround-58;ally.vx=0;ally.facing=pl.facing;
      ally.mode=groundAlly?"run":"fly";ally.modeStarted=now;ally.modeBlendAt=now;ally.teleportAt=now;
      ally.attackUntil=0;ally.attackLanded=false;ally.recallStarted=0;ally.targetX=ally.x;
      keepCreatureOnRoad(ally,map);
    }
    slideUntil.current=0;actionUntil.current=0;cameraReset.current=true;
    portalFlashUntil.current=performance.now()+430; // portal flash still fires after companion reseat
    tone(610,.25,.028);window.setTimeout(()=>tone(360,.2,.02),100); // portal enter tone still fires after companion reseat
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
    const target=talkTargetAt(map,x,player.current.y+PH);
    if(target.npc){
      const npc=target.npc;
      const talkKey=npcTalkKey(npc);
      const hasCard=inventoryRef.current.some(entry=>npc.cardId===SUNSET_JACKAL_CARD.id?isSunsetJackalCardId(entry.id):entry.id===npc.cardId);
      if(!metNpcRef.current.has(talkKey)){metNpcRef.current.add(talkKey);showDialogue(npc.firstTalk);}
      else if(hasCard) showDialogue(npc.afterCaptureTalk);
      else showDialogue(npc.againTalk);
      return;
    }
    if(target.landmark){showDialogue(target.landmark.lines);return;}
    if(map===1&&nearPortalAt(x,MAP1_PORTAL_X)) enterMap(2,1);
    else if(map===2&&nearPortalAt(x,MAP2_PORTAL_X)) enterMap(1,2);
    else if(map===2&&nearPortalAt(x,MAP2_EXIT_X)) enterMap(3,2);
    else if(map===3&&nearPortalAt(x,MAP3_ENTRY_X)) enterMap(2,3);
    else if(map===3&&nearPortalAt(x,MAP3_EXIT_X)) enterMap(4,3);
    else if(map===4&&nearPortalAt(x,MAP4_ENTRY_X)) enterMap(3,4);
    else if(map===4&&nearPortalAt(x,MAP4_EXIT_X)) enterMap(5,4);
    else if(map===5&&nearPortalAt(x,MAP5_ENTRY_X)) enterMap(4,5);
    else if(map===5&&nearPortalAt(x,MAP5_EXIT_X)) enterMap(6,5);
    else if(map===6&&nearPortalAt(x,MAP6_ENTRY_X)) enterMap(5,6);
    else if(map===6&&atHeartAltar(x)){ // altar E still wins after #56 Dell/Rowan walk-out; no nearby talk radius covers this window
      if(!campaignEndedRef.current){campaignEndedRef.current=true;setCampaignEnded(true);}
      setObjective(hudLockFor(6,inventoryRef.current.map(item=>item.id),true).objective);
      showDialogue(ENDING_LINES);
    }
  },[advanceDialogue,enterMap,setObjective,showDialogue]);

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
    if (!startedRef.current||dialogueRef.current||inventoryOpenRef.current||worldMapOpenRef.current) return;
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
      if(k==="m"&&!e.repeat){toggleWorldMap();return;}
      if(startedRef.current&&/^[1-5]$/.test(k)&&!e.repeat){selectUsableSlot(Number(k)-1);return;}
      if(startedRef.current&&k==="q"&&!e.repeat){
        if(inventoryOpenRef.current){inventoryOpenRef.current=false;setInventoryOpen(false);}
        if(!worldMapOpenRef.current)deployQueued.current=true;
        return;
      }
      if(inventoryOpenRef.current||worldMapOpenRef.current){keys.current[k]=false;return;}
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
  },[advanceDialogue,interact,selectUsableSlot,startGame,toggleInventory,toggleWorldMap,updateAim]);

  useEffect(()=>{
    const canvas=canvasRef.current, ctx=canvas?.getContext("2d");
    if (!canvas||!ctx) return;
    let raf=0,last=performance.now(),cameraX=0,lastAction="",lastPromptLeft=-1,lastPromptBottom=-1,lastHealth=player.current.health,lastStamina=Math.round(staminaRef.current),lastMapProgress=-1,lastHudMap:MapId=1;
    const backdrop=new Image(); backdrop.src=assetUrl("/pixel-castle-night.png");
    const beachBackdrop=new Image(); beachBackdrop.src=assetUrl("/map2-sunset-beach.png");
    const knight=new Image(); knight.src=assetUrl("/knight-sprite-sheet.png");
    const dragonImage=new Image(); dragonImage.src=assetUrl("/baby-dragon-sprite-sheet.png");
    const jackalCardArt=new Image(); jackalCardArt.src=assetUrl("/sunset-jackal-card.svg");
    const dragon:Dragon={x:1710,y:570,groundY:570,vx:0,facing:1,mode:"idle",modeStarted:last,modeUntil:last+2800,gait:0,prevMode:"idle",modeBlendAt:last,health:DRAGON_MAX_HEALTH,maxHealth:DRAGON_MAX_HEALTH,attackDamage:DRAGON_ATTACK_DAMAGE,lastPlayerAttack:-1,attackLanded:false,hurtStarted:0,hurtUntil:0,hitDirection:1,lastDamage:0,angry:false,landing:false,targetX:1840,awarenessUntil:0};
    const createJackal=(id:string,x:number,patrolMin:number,patrolMax:number):Jackal=>({
      id,x,y:590,groundY:590,vx:0,facing:1,mode:"idle",modeStarted:last,modeUntil:last+2200+Math.random()*1800,gait:0,prevMode:"idle",modeBlendAt:last,
      health:JACKAL_MAX_HEALTH,maxHealth:JACKAL_MAX_HEALTH,attackDamage:JACKAL_ATTACK_DAMAGE,lastPlayerAttack:-1,attackLanded:false,
      hurtStarted:0,hurtUntil:0,hitDirection:1,lastDamage:0,angry:false,landing:false,targetX:x+80,awarenessUntil:0,patrolMin,patrolMax,leapStarted:0,leapUntil:0
    });
    const jackals:Jackal[]=[
      createJackal("sunset-jackal-a",980,720,1280),
      createJackal("sunset-jackal-b",1880,1580,2280),
      createJackal("sunset-jackal-scout",2400,2320,2480),
      createJackal("sunset-jackal-c",2860,2520,3320)
    ];
    const createBeast=(id:string,x:number,patrolMin:number,patrolMax:number,health:number,damage:number):Jackal=>({...createJackal(id,x,patrolMin,patrolMax),health,maxHealth:health,attackDamage:damage,y:590,groundY:590});
    const roosts:Jackal[]=[
      createBeast("ash-roost",6180,5980,6360,80,8)
    ];
    const foxes:Jackal[]=[
      createBeast("cinder-fox-a",920,620,1480,FOX_MAX_HEALTH,FOX_ATTACK_DAMAGE),
      createBeast("cinder-fox-c",1780,1600,1960,FOX_MAX_HEALTH,FOX_ATTACK_DAMAGE),
      createBeast("cinder-fox-b",2480,2100,3300,FOX_MAX_HEALTH,FOX_ATTACK_DAMAGE)
    ];
    const stags:Jackal[]=[
      createBeast("pale-stag-a",1760,1180,2680,STAG_MAX_HEALTH,STAG_ATTACK_DAMAGE),
      createBeast("pale-stag-b",5320,5080,5640,STAG_MAX_HEALTH,STAG_ATTACK_DAMAGE)
    ];
    const lynxes:Jackal[]=[
      createBeast("ember-lynx-a",1280,980,1680,LYNX_MAX_HEALTH,LYNX_ATTACK_DAMAGE),
      createBeast("ember-lynx-d",2620,2520,2720,LYNX_MAX_HEALTH,LYNX_ATTACK_DAMAGE),
      createBeast("ember-lynx-b",2140,1960,2480,LYNX_MAX_HEALTH,LYNX_ATTACK_DAMAGE),
      createBeast("ember-lynx-c",4520,4160,4980,LYNX_MAX_HEALTH,LYNX_ATTACK_DAMAGE)
    ];
    const wyrmPack:Jackal[]=[
      createBeast("heart-wyrm",2480,1880,3180,WYRM_MAX_HEALTH,WYRM_ATTACK_DAMAGE)
    ];
    const seedPackGround=(pack:Jackal[],map:MapId)=>{for(const beast of pack){const ground=surfaceYAt(map,beast.x,beast.groundY);if(ground!==null){beast.groundY=ground;beast.y=ground;}}};
    seedPackGround(roosts,1);seedPackGround(jackals,2);seedPackGround(foxes,3);seedPackGround(stags,4);seedPackGround(lynxes,5);seedPackGround(wyrmPack,6);
    const wildPackFor=(map:MapId)=>map===1?roosts:map===2?jackals:map===3?foxes:map===4?stags:map===5?lynxes:map===6?wyrmPack:null;
    const wildCardFor=(map:MapId)=>map===2?SUNSET_JACKAL_CARD:map===3?CINDER_FOX_CARD:map===4?PALE_STAG_CARD:map===5?EMBER_LYNX_CARD:map===6?HEART_WYRM_CARD:null;
    let playerHurtUntil=0,playerRespawnAt=0,dragonCardCollected=inventoryRef.current.some(item=>item.id===BABY_DRAGON_CARD.id);
    const jackalCardsCollected=new Set(Object.values(JACKAL_CARD_BY_BEAST).filter(card=>inventoryRef.current.some(item=>item.id===card.id)).map(card=>card.id));
    const otherWildCollected=new Set(
      [CINDER_FOX_CARD.id,PALE_STAG_CARD.id,EMBER_LYNX_CARD.id,HEART_WYRM_CARD.id]
        .filter(id=>inventoryRef.current.some(item=>item.id===id))
    );
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
    const shadeLayer=document.createElement("canvas");
    const shadeCtx=shadeLayer.getContext("2d");
    const rain=Array.from({length:140},(_,i)=>({x:(i*157)%1500,y:(i*83)%800,l:8+(i%5)*3,s:7+(i%7)}));
    const stars=Array.from({length:56},(_,i)=>({x:(i*193)%1600,y:22+(i*71)%285,p:i*.61,r:i%9===0?1.7:1}));
    const motes=Array.from({length:64},(_,i)=>({x:(i*223)%7200,y:240+(i*71)%280,p:i*.7}));
    const leaves=Array.from({length:24},(_,i)=>({x:(i*311)%1600,y:120+(i*97)%460,p:i*.83,s:18+(i%5)*5}));
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
      const activeBackdrop=map===1?backdrop:map===2?beachBackdrop:null;
      const g=ctx.createLinearGradient(0,0,0,h);
      if(map===1){g.addColorStop(0,"#030710");g.addColorStop(.56,"#0b1428");g.addColorStop(1,"#070811");}
      else if(map===2){g.addColorStop(0,"#4b5288");g.addColorStop(.48,"#ed766b");g.addColorStop(1,"#c36f49");}
      else if(map===3){g.addColorStop(0,"#1a100c");g.addColorStop(.45,"#3a2218");g.addColorStop(1,"#24140e");}
      else if(map===4){g.addColorStop(0,"#07141c");g.addColorStop(.5,"#163448");g.addColorStop(1,"#0c1c24");}
      else if(map===5){g.addColorStop(0,"#140806");g.addColorStop(.5,"#3a1810");g.addColorStop(1,"#1a0c0a");}
      else{g.addColorStop(0,"#120814");g.addColorStop(.5,"#3a2038");g.addColorStop(1,"#241018");}
      ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
      if (activeBackdrop&&activeBackdrop.complete&&activeBackdrop.naturalWidth) {
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
        for(let i=0;i<5;i++){
          const fy=h*(.5+i*.09)+Math.sin(now*.00035+i)*12;
          const fx=((now*(.007+i*.003)+i*420)%(w+700))-350;
          const fog=ctx.createRadialGradient(fx,fy,20,fx,fy,330+i*70);
          fog.addColorStop(0,"rgba(128,151,176,"+(.09-i*.012)+")");fog.addColorStop(1,"rgba(128,151,176,0)");
          ctx.fillStyle=fog;ctx.fillRect(fx-500,fy-115,1000,230);ctx.fillRect(fx+w*.75-500,fy-115,1000,230);
        }
        ctx.restore();
        const storm=(now%17000);
        if(storm>15600&&storm<15830){const flash=Math.sin((storm-15600)/230*Math.PI)*.055;ctx.fillStyle="rgba(190,204,226,"+flash+")";ctx.fillRect(0,0,w,h);}
      }else if(map===2){
        for(let i=0;i<18;i++){
          const waveY=h*(.55+(i%4)*.037),waveX=((i*173+now*.015*(1+i%3))%(w+180))-90;
          const sparkle=.16+Math.max(0,Math.sin(now*.003+i))* .38;
          ctx.fillStyle="rgba(255,226,154,"+sparkle+")";ctx.fillRect(waveX,waveY,8+(i%4)*5,2);
        }
        const warmth=ctx.createLinearGradient(0,h*.58,0,h);
        warmth.addColorStop(0,"rgba(255,190,102,0)");warmth.addColorStop(1,"rgba(153,75,47,.14)");
        ctx.fillStyle=warmth;ctx.fillRect(0,h*.58,w,h*.42);
        ctx.save();
        for(let i=0;i<4;i++){
          const fy=h*(.5+i*.08)+Math.sin(now*.0004+i)*10;
          const fx=((now*(.006+i*.002)+i*360)%(w+640))-320;
          const haze=ctx.createRadialGradient(fx,fy,18,fx,fy,290+i*50);
          haze.addColorStop(0,"rgba(255,196,120,"+(.08-i*.012)+")");haze.addColorStop(1,"rgba(255,196,120,0)");
          ctx.fillStyle=haze;ctx.fillRect(fx-420,fy-100,840,200);
        }
        ctx.restore();
        for(let i=0;i<22;i++){
          const mx=(w*(i*47%100)/100+Math.sin(now*.0012+i)*14)%w,my=h*.32+(i*41%200);
          ctx.fillStyle="rgba(255,226,165,"+(.1+Math.max(0,Math.sin(now*.002+i))*.28)+")";
          ctx.fillRect(mx,my,1.8,1.8);
        }
      }else if(map===3){
        ctx.save();
        for(let i=0;i<4;i++){
          const cx=((now*.004*(i+1)+i*w*.3)%(w+480))-240,cy=h*(.12+i*.05);
          const cloud=ctx.createRadialGradient(cx,cy,10,cx,cy,210+i*28);
          cloud.addColorStop(0,"rgba(18,10,8,.38)");cloud.addColorStop(1,"rgba(18,10,8,0)");
          ctx.fillStyle=cloud;ctx.fillRect(cx-300,cy-160,600,320);
        }
        ctx.restore();
        for(let i=0;i<42;i++){
          const ashX=(w*(i*53%100)/100+Math.sin(now*.0007+i)*22)%w;
          const ashY=h-((now*.022*(1+i%4)+i*71)%(h*.9));
          ctx.fillStyle="rgba(210,160,120,"+(.12+Math.max(0,Math.sin(now*.0018+i))*.28)+")";
          ctx.fillRect(ashX,ashY,1.4+(i%2),2+(i%3));
        }
        const hollow=ctx.createLinearGradient(0,h*.5,0,h);
        hollow.addColorStop(0,"rgba(180,70,30,0)");hollow.addColorStop(1,"rgba(90,35,16,.2)");
        ctx.fillStyle=hollow;ctx.fillRect(0,h*.5,w,h*.5);
      }else if(map===4){
        ctx.fillStyle="rgba(214,236,255,.82)";ctx.beginPath();ctx.arc(w*.78,h*.16,42,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="rgba(214,236,255,.18)";ctx.beginPath();ctx.arc(w*.78,h*.16,70,0,Math.PI*2);ctx.fill();
        for(const star of stars){
          const alpha=.16+Math.max(0,Math.sin(now*.0016+star.p))*.44;
          ctx.fillStyle="rgba(180,236,255,"+alpha+")";ctx.fillRect((star.x+80)%(w+20),star.y,star.r,star.r);
        }
        ctx.save();
        for(let i=0;i<3;i++){
          const fy=h*(.48+i*.1)+Math.sin(now*.0004+i)*10;
          const fx=((now*(.005+i*.002)+i*380)%(w+640))-320;
          const mist=ctx.createRadialGradient(fx,fy,16,fx,fy,300+i*60);
          mist.addColorStop(0,"rgba(150,210,220,"+(.1-i*.02)+")");mist.addColorStop(1,"rgba(150,210,220,0)");
          ctx.fillStyle=mist;ctx.fillRect(fx-420,fy-100,840,200);
        }
        ctx.restore();
        for(let i=0;i<28;i++){
          const mx=(w*(i*47%100)/100+Math.sin(now*.0011+i)*12)%w,my=h*.28+(i*37%180);
          ctx.fillStyle="rgba(142,231,255,"+(.12+Math.max(0,Math.sin(now*.002+i))*.32)+")";
          ctx.fillRect(mx,my,1.6,1.6);
        }
      }else if(map===5||map===6){
        ctx.save();
        for(let i=0;i<4;i++){
          const cx=((now*.005*(i+1)+i*w*.34)%(w+480))-240;
          const cy=h*(.14+i*.06);
          const cloud=ctx.createRadialGradient(cx,cy,10,cx,cy,220+i*30);
          const cloudColor=map===5?"18,7,4":"14,6,16";
          cloud.addColorStop(0,"rgba("+cloudColor+",.32)");cloud.addColorStop(1,"rgba("+cloudColor+",0)");
          ctx.fillStyle=cloud;ctx.fillRect(cx-320,cy-170,640,340);
        }
        ctx.restore();
        for(let i=0;i<34;i++){
          const emberX=(w*(i*61%100)/100+Math.sin(now*.0009+i)*18)%w;
          const emberY=h-((now*.028*(1+i%5)+i*83)%(h*.82));
          const alpha=.22+Math.max(0,Math.sin(now*.0022+i))*.42;
          ctx.fillStyle=map===5?"rgba(255,140,72,"+alpha+")":"rgba(224,110,150,"+alpha+")";
          ctx.fillRect(emberX,emberY,1.6+(i%3)*.8,3+(i%3));
        }
        const glowPulse=map===6?.14+Math.sin(now*.0016)*.08:0;
        if(glowPulse>0){
          const heart=ctx.createRadialGradient(w*.72,h*.42,10,w*.72,h*.42,w*.48);
          heart.addColorStop(0,"rgba(212,90,106,"+glowPulse+")");heart.addColorStop(1,"rgba(212,90,106,0)");
          ctx.fillStyle=heart;ctx.fillRect(0,0,w,h);
        }
        const warmth=ctx.createLinearGradient(0,h*.55,0,h);
        warmth.addColorStop(0,map===5?"rgba(255,120,60,0)":"rgba(212,90,106,0)");
        warmth.addColorStop(1,map===5?"rgba(120,50,20,.22)":"rgba(80,30,60,.24)");
        ctx.fillStyle=warmth;ctx.fillRect(0,h*.55,w,h*.45);
      }
      drawRegionalBackdropDepth(w,h,now,map);
    };
    const drawRegionalBackdropDepth=(w:number,h:number,now:number,map:MapId)=>{
      ctx.save();
      const parallax=cameraX*.035;
      if(map===1){
        ctx.fillStyle="rgba(8,14,24,.28)";ctx.beginPath();ctx.moveTo(0,h*.68);for(let x=-80;x<=w+100;x+=140)ctx.lineTo(x,h*.58+Math.sin((x+parallax)*.008)*22);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();
        for(let i=0;i<8;i++){const x=((i*210-parallax*.8)%(w+420))-210,y=h*.62;ctx.fillStyle="rgba(18,28,42,.42)";ctx.fillRect(x,y-48,36,48);ctx.fillRect(x-6,y-58,14,12);ctx.fillRect(x+22,y-58,14,12);}
      }else if(map===2){
        ctx.fillStyle="rgba(90,42,28,.22)";ctx.beginPath();ctx.moveTo(0,h*.7);for(let x=-80;x<=w+100;x+=150)ctx.lineTo(x,h*.6+Math.sin((x+parallax)*.007)*18);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();
        for(let i=0;i<7;i++){const x=((i*230-parallax*.7)%(w+460))-230;ctx.fillStyle="rgba(72,38,28,.32)";ctx.beginPath();ctx.moveTo(x-50,h*.72);ctx.lineTo(x-8,h*.58);ctx.lineTo(x+46,h*.72);ctx.closePath();ctx.fill();}
      }else if(map===3){
        ctx.fillStyle="rgba(24,12,8,.34)";ctx.beginPath();ctx.moveTo(0,h*.64);for(let x=-80;x<=w+100;x+=120)ctx.lineTo(x,h*.5+Math.sin((x+parallax)*.009)*45);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();
        for(let i=0;i<9;i++){const x=((i*190-parallax*.9)%(w+380))-190,y=h*.57;ctx.fillStyle="rgba(10,7,6,.58)";ctx.fillRect(x,y-105-(i%3)*25,11,145+(i%3)*25);ctx.strokeStyle="rgba(10,7,6,.55)";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x+5,y-65);ctx.lineTo(x-34,y-104);ctx.moveTo(x+5,y-82);ctx.lineTo(x+42,y-128);ctx.stroke();}
      }else if(map===4){
        ctx.fillStyle="rgba(5,17,24,.42)";for(let i=0;i<7;i++){const x=((i*255-parallax*.7)%(w+510))-255,top=h*(.3+(i%3)*.06);ctx.beginPath();ctx.moveTo(x-70,h*.7);ctx.lineTo(x-32,top+45);ctx.lineTo(x,top);ctx.lineTo(x+36,top+58);ctx.lineTo(x+78,h*.7);ctx.closePath();ctx.fill();ctx.fillStyle="rgba(142,231,255,.07)";ctx.fillRect(x-2,top+35,4,h*.28);ctx.fillStyle="rgba(5,17,24,.42)";}
      }else if(map===5){
        for(let i=0;i<8;i++){const x=((i*225-parallax*.75)%(w+450))-225,base=h*.66,hh=90+(i%4)*38;ctx.fillStyle="rgba(22,8,5,.56)";ctx.fillRect(x,base-hh,68+(i%3)*20,hh);ctx.fillRect(x+14,base-hh-30,16,30);ctx.fillStyle="rgba(255,118,56,.055)";ctx.fillRect(x+8,base-hh+18,4,38);const smoke=ctx.createRadialGradient(x+22,base-hh-42,4,x+22,base-hh-42,80);smoke.addColorStop(0,"rgba(32,13,9,.2)");smoke.addColorStop(1,"rgba(32,13,9,0)");ctx.fillStyle=smoke;ctx.fillRect(x-60,base-hh-110,160,100);}
      }else{
        for(let i=0;i<8;i++){const x=((i*250-parallax*.6)%(w+500))-250;ctx.strokeStyle="rgba(30,10,25,.48)";ctx.lineWidth=18;ctx.beginPath();ctx.arc(x,h*.7,120+(i%3)*28,Math.PI,Math.PI*2);ctx.stroke();ctx.strokeStyle="rgba(212,90,106,.06)";ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,h*.7,116+(i%3)*28,Math.PI,Math.PI*2);ctx.stroke();}
      }
      ctx.restore();
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
      const late=lateMapContactShade(mapRef.current);
      ctx.save();ctx.translate(pl.x+pl.facing*anchorLocalX,pl.y+anchorLocalY);ctx.rotate(swordAngle);ctx.scale(1,pl.facing);
      ctx.imageSmoothingEnabled=false;ctx.shadowColor=late?"rgba(255,246,210,.88)":"rgba(135,62,198,.3)";ctx.shadowBlur=late?12:7; // LMB sword rim stays readable on maps 5–6 after #48/#50 late stroke
      ctx.drawImage(attackWeaponLayer,ATTACK_WEAPON.x,ATTACK_WEAPON.y,ATTACK_WEAPON.w,ATTACK_WEAPON.h,-(ATTACK_WEAPON.anchorX-ATTACK_WEAPON.x)*weaponScale,-(ATTACK_WEAPON.anchorY-ATTACK_WEAPON.y)*weaponScale,ATTACK_WEAPON.w*weaponScale,ATTACK_WEAPON.h*weaponScale);
      ctx.shadowBlur=0;ctx.imageSmoothingEnabled=true;ctx.restore();
    };
    const drawCompanionCast=(pl:Player,now:number)=>{
      const cast=companionCastRef.current;
      if(!cast.kind)return;
      const duration=cast.kind==="recall"?COMPANION_RECALL_DURATION:COMPANION_SUMMON_DURATION,progress=clamp((now-cast.started)/duration,0,1);
      if(progress>=1){cast.kind=null;return;}
      const eased=progress*progress*(3-2*progress),fade=1-easeInOut(clamp((progress-.68)/.32,0,1));
      const ally=companionRef.current;
      if(!ally)return;
      const palette=inventoryRef.current.find(item=>item.id===ally.itemId)?.palette??BABY_DRAGON_CARD.palette;
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
        const moteFade=fade*easeInOut(.4+(mote%3)*.2);
        ctx.globalAlpha=moteFade;ctx.fillStyle=mote%3===0?"#ffffff":color;ctx.beginPath();ctx.arc(mx,my,1.1+(mote%2)*.8,0,Math.PI*2);ctx.fill();
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
        const contact=ctx.createRadialGradient(0,PH+2,2,0,PH+2,42);
        contact.addColorStop(0,"rgba(2,4,8,.62)");contact.addColorStop(.55,"rgba(2,4,8,.22)");contact.addColorStop(1,"rgba(2,4,8,0)");
        ctx.fillStyle=contact;ctx.beginPath();ctx.ellipse(0,PH+2,40,9,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="rgba(1,2,4,.78)";ctx.beginPath();ctx.ellipse(2,PH+3,24,5,0,0,Math.PI*2);ctx.fill();
        const lateShade=lateMapContactShade(mapRef.current);
        if(lateShade){
          const warm=ctx.createRadialGradient(1,PH+3,1,1,PH+3,36);
          warm.addColorStop(0,lateShade.core);warm.addColorStop(.45,lateShade.mid);warm.addColorStop(1,lateShade.edge);
          ctx.fillStyle=warm;ctx.beginPath();ctx.ellipse(1,PH+3,34,7,0,0,Math.PI*2);ctx.fill();
        }
        ctx.fillStyle=mapRef.current===1?"rgba(179,158,235,.3)":mapRef.current===3?"rgba(255,140,80,.36)":mapRef.current===4?"rgba(142,231,255,.36)":mapRef.current===5?"rgba(255,150,90,.36)":mapRef.current===6?"rgba(224,120,160,.36)":"rgba(255,215,139,.36)";ctx.fillRect(-20,PH-1,40,2);
      }
      let list=SPRITE_FRAMES.idle;
      let index=Math.floor(now/620)%list.length;
      const attacking=actionUntil.current>now;
      const castState=companionCastRef.current,castDuration=castState.kind==="recall"?COMPANION_RECALL_DURATION:COMPANION_SUMMON_DURATION,casting=Boolean(castState.kind&&now-castState.started<castDuration);
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
        ctx.shadowColor="rgba(103,45,179,.42)";ctx.shadowBlur=10;
        const sheet=casting&&castBodyLayer.width?castBodyLayer:attacking&&attackBodyLayer.width?attackBodyLayer:knight;
        ctx.drawImage(sheet,f.x,f.y,f.w,f.h,-dw/2,drawY,dw,dh);
        ctx.shadowBlur=0;
        if(shadeCtx){
          const sw=Math.max(1,Math.ceil(dw)),sh=Math.max(1,Math.ceil(dh));
          if(shadeLayer.width!==sw||shadeLayer.height!==sh){shadeLayer.width=sw;shadeLayer.height=sh;}
          shadeCtx.clearRect(0,0,sw,sh);shadeCtx.imageSmoothingEnabled=false;
          shadeCtx.drawImage(sheet,f.x,f.y,f.w,f.h,0,0,sw,sh);
          shadeCtx.globalCompositeOperation="source-atop";
          const rim=shadeCtx.createLinearGradient(0,0,sw*.58,sh*.42);
          rim.addColorStop(0,"rgba(214,232,255,.46)");rim.addColorStop(.32,"rgba(214,232,255,.1)");rim.addColorStop(1,"rgba(214,232,255,0)");
          shadeCtx.fillStyle=rim;shadeCtx.fillRect(0,0,sw,sh);
          const bounce=shadeCtx.createLinearGradient(0,sh*.52,0,sh);
          const bounceColor=mapRef.current===1?"rgba(120,140,190,.2)":mapRef.current===3?"rgba(255,120,70,.2)":mapRef.current===4?"rgba(142,231,255,.22)":mapRef.current===5?"rgba(255,140,80,.2)":mapRef.current===6?"rgba(224,120,160,.2)":"rgba(255,200,120,.2)";
          bounce.addColorStop(0,"rgba(0,0,0,0)");bounce.addColorStop(1,bounceColor);
          shadeCtx.fillStyle=bounce;shadeCtx.fillRect(0,0,sw,sh);
          const occlude=shadeCtx.createLinearGradient(sw*.62,0,sw,sh*.7);
          occlude.addColorStop(0,"rgba(10,6,18,0)");occlude.addColorStop(1,"rgba(10,6,18,.28)");
          shadeCtx.fillStyle=occlude;shadeCtx.fillRect(0,0,sw,sh);
          shadeCtx.globalCompositeOperation="source-over";
          ctx.drawImage(shadeLayer,-dw/2,drawY,dw,dh);
        }
        ctx.imageSmoothingEnabled=true;
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
      rememberModeChange(dragon,mode,now);
      dragon.mode=mode;dragon.modeStarted=now;dragon.modeUntil=now+duration;dragon.landing=false;
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
      if(!ally.active||ally.map!==mapRef.current||ally.recallStarted>0)return;
      ally.targetX=targetX;ally.attackUntil=now+2400;ally.attackLanded=false;
      if(Math.abs(targetX-ally.x)<COMPANION_STRIKE_RANGE+16){rememberModeChange(ally,"attack",now);ally.mode="attack";ally.modeStarted=now;ally.facing=targetX>=ally.x?1:-1;}
    };
    const updateDragon=(dt:number,now:number)=>{
      if(!startedRef.current||mapRef.current!==1)return;
      tickAnimalGait(dragon,dt);
      const pl=player.current;
      if(dragon.health<=0){
        dragon.angry=false;
        seatDeadBeast(dragon,1);
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
            seatDeadBeast(dragon,1);
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
        keepCreatureOnRoad(dragon,1);
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
          const targetY=dragon.mode==="fly"?(dragon.landing?dragon.groundY-42:dragon.groundY-122+flapPhase(dragon.gait).lift*12):dragon.groundY;
          dragon.y+=(targetY-dragon.y)*(1-Math.exp(-(dragon.mode==="fly"?(dragon.landing?6.2:4.2):13)*dt));
        }
      }else{
        dragon.vx+=(0-dragon.vx)*(1-Math.exp(-8*dt));
        dragon.y+=(dragon.groundY-dragon.y)*(1-Math.exp(-12*dt));
      }
      keepCreatureOnRoad(dragon,1);

      if(playerRespawnAt&&now>=playerRespawnAt){
        pl.health=pl.maxHealth;const floor=plantedFloorAt(mapRef.current,respawnXFor(mapRef.current));pl.x=floor.x;pl.y=plantedYAt(mapRef.current,pl.x);pl.vx=0;pl.vy=0;pl.grounded=true;pl.jumpsLeft=2;pl.crouched=false;pl.sliding=false;
        staminaRef.current=MAX_STAMINA;staminaUsedAt.current=-Infinity;
        playerRespawnAt=0;cameraReset.current=true;portalFlashUntil.current=now+430;
      }
    };
    const beginJackalMode=(jackal:Jackal,mode:DragonMode,now:number,duration:number)=>{
      const canFly=jackal.id.startsWith("heart-wyrm")||jackal.id.startsWith("ash-roost");
      const nextMode=!canFly&&mode==="fly"?"run":mode;
      rememberModeChange(jackal,nextMode,now);
      jackal.mode=nextMode;jackal.modeStarted=now;jackal.modeUntil=now+duration;jackal.landing=false;
      if(nextMode==="sleep"||nextMode==="attack"){jackal.leapUntil=0;jackal.leapStarted=0;}
      if(nextMode==="idle"||nextMode==="sleep")jackal.vx*=.5;
      if(nextMode==="attack")jackal.vx*=.22;
    };
    const startJackalLeap=(jackal:Jackal,now:number)=>{
      if(jackal.id.startsWith("heart-wyrm")||jackal.id.startsWith("ash-roost"))return;
      jackal.leapStarted=now;
      jackal.leapUntil=now+JACKAL_HOP_MS+Math.random()*80;
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
      else if((jackal.id.startsWith("heart-wyrm")||jackal.id.startsWith("ash-roost"))&&roll<.9)beginJackalTravel(jackal,"fly",now,780+Math.random()*420,randomTarget);
      else if(roll<.9){beginJackalTravel(jackal,"run",now,780+Math.random()*420,randomTarget);startJackalLeap(jackal,now);}
      else if(distance>220)beginJackalMode(jackal,"sleep",now,4200+Math.random()*3200);
      else{beginJackalMode(jackal,"idle",now,1400);jackal.facing=pl.x>=jackal.x?1:-1;}
    };
    const jackalCounterAttack=(jackal:Jackal,now:number)=>{
      jackal.facing=player.current.x>=jackal.x?1:-1;
      jackal.attackLanded=false;
      beginJackalMode(jackal,"attack",now,920);
      tone(280,.1,.02);window.setTimeout(()=>tone(160,.16,.022),150);
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
          jackal.angry=false;jackal.awarenessUntil=0;jackal.attackLanded=true;
          seatDeadBeast(jackal,mapRef.current);
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
      if(!startedRef.current)return;
    const jackals=wildPackFor(mapRef.current);
    if(!jackals)return;
      const pl=player.current;
      for(const jackal of jackals){
        tickAnimalGait(jackal,dt);
        const terrainY=surfaceYAt(mapRef.current,jackal.x,jackal.groundY)??surfaceYAt(mapRef.current,jackal.x,590);
        if(terrainY!==null)jackal.groundY+=(terrainY-jackal.groundY)*(1-Math.exp(-13*dt));
        if(jackal.y>jackal.groundY+28)jackal.y=jackal.groundY;
        keepCreatureOnRoad(jackal,mapRef.current);
        if(jackal.health<=0){
          jackal.angry=false;
          seatDeadBeast(jackal,mapRef.current);
          jackal.y+=(jackal.groundY-jackal.y)*(1-Math.exp(-8*dt));
          continue;
        }
        hitJackalWithSword(jackal,now);
        if(jackal.health<=0)continue;
        const playerDistance=Math.abs(pl.x-jackal.x);
        const sightDistance=Math.hypot(pl.x-jackal.x,(pl.y+PH*.45)-(jackal.y-24));
        const startled=playerDistance<110&&(pl.x-jackal.x)*pl.vx<0&&Math.abs(pl.vx)>140;
        if(!jackal.angry&&isCombatOnlyBeast(jackal.id)&&pl.health>0&&playerDistance<COMBAT_ONLY_AGGRO_RANGE){
          jackal.angry=true;jackal.awarenessUntil=now+7000;
        }
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
          const lungeBound=chaseBounds(jackal.angry,jackal.patrolMin,jackal.patrolMax,worldWidthFor(mapRef.current));
          jackal.x=clamp(jackal.x,lungeBound.min,lungeBound.max);
          jackal.y+=(jackal.groundY-8-hopArc(lunge,22)-jackal.y)*(1-Math.exp(-10*dt));
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
              if(beastCanStrikePlayer(jackal,pl,JACKAL_ATTACK_RANGE+12,BEAST_ATTACK_VERTICAL+12))jackalCounterAttack(jackal,now);
              else{const bounds=chaseBounds(true,jackal.patrolMin,jackal.patrolMax,worldWidthFor(mapRef.current));jackal.targetX=clamp(pl.x,bounds.min,bounds.max);beginJackalMode(jackal,"run",now,800);jackal.facing=pl.x>=jackal.x?1:-1;}
            }else{jackal.angry=false;beginJackalMode(jackal,"idle",now,1200);jackal.facing=pl.x>=jackal.x?1:-1;}
          }
          continue;
        }
        if(jackal.angry){
          if(playerDistance>16)jackal.facing=pl.x>=jackal.x?1:-1;
          if(beastCanStrikePlayer(jackal,pl)){jackalCounterAttack(jackal,now);continue;}
          const bounds=chaseBounds(true,jackal.patrolMin,jackal.patrolMax,worldWidthFor(mapRef.current));
          jackal.targetX=clamp(pl.x,bounds.min,bounds.max);
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
            const move=chaseBounds(jackal.angry,jackal.patrolMin,jackal.patrolMax,worldWidthFor(mapRef.current));
            if(jackal.x<=move.min){jackal.x=move.min;jackal.targetX=jackal.angry?clamp(pl.x,move.min,move.max):jackal.patrolMax;jackal.facing=1;}
            if(jackal.x>=move.max){jackal.x=move.max;jackal.targetX=jackal.angry?clamp(pl.x,move.min,move.max):jackal.patrolMin;jackal.facing=-1;}
            const wyrmFly=jackal.mode==="fly"&&(jackal.id.startsWith("heart-wyrm")||jackal.id.startsWith("ash-roost"));
            const flyLeap=wyrmFly?(jackal.landing?flapPhase(jackal.gait).lift*36:54+flapPhase(jackal.gait).lift*56):0;
            const hop=groundBeastHop(jackal,now);
            const land=flyLandAmt(jackal,now);
            const targetY=jackal.groundY-(flyLeap||hop||land);
            jackal.y+=(targetY-jackal.y)*(1-Math.exp(-10*dt));
          }
        }else{
          jackal.vx+=(0-jackal.vx)*(1-Math.exp(-8*dt));
          const hop=groundBeastHop(jackal,now);
          const land=flyLandAmt(jackal,now);
          jackal.y+=(jackal.groundY-hop-land-jackal.y)*(1-Math.exp(-12*dt));
        }
        keepCreatureOnRoad(jackal,mapRef.current);
      }
      if(playerRespawnAt&&now>=playerRespawnAt){
        pl.health=pl.maxHealth;const floor=plantedFloorAt(mapRef.current,respawnXFor(mapRef.current));pl.x=floor.x;pl.y=plantedYAt(mapRef.current,pl.x);pl.vx=0;pl.vy=0;pl.grounded=true;pl.jumpsLeft=2;pl.crouched=false;pl.sliding=false;
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
      rememberModeChange(ally,mode,now);
      ally.mode=mode;ally.modeStarted=now;
      if(mode==="attack")ally.attackLanded=false;
    };
    const updateCompanion=(dt:number,now:number)=>{
      const ally=companionRef.current;
      if(!ally?.active||!ally.itemId)return;
      tickAnimalGait(ally,dt);
      const pl=player.current,map=mapRef.current;
      if(ally.recallStarted>0){
        ally.attackUntil=0;ally.vx+=(0-ally.vx)*(1-Math.exp(-12*dt));ally.x+=ally.vx*dt;
        keepCreatureOnRoad(ally,map);
        const recallGround=companionSurfaceAt(ally.x,ally.groundY,map);
        if(recallGround!==null)ally.groundY+=(recallGround-ally.groundY)*(1-Math.exp(-10*dt));
        ally.y+=(ally.groundY-ally.y)*(1-Math.exp(-5.4*dt));
        if(now-ally.recallStarted>=COMPANION_RECALL_DURATION){ally.active=false;ally.itemId=null;ally.recallStarted=0;setDeployedItemId(null);}
        return;
      }
      const groundAlly=cardStats(ally.itemId).ground;
      if(ally.map!==map){
        ally.map=map;
        const seat=plantedFloorAt(map,pl.x-pl.facing*96);
        ally.x=creatureEdgeAt(map,seat.x);
        const reseatGround=seat.groundY; // companion portal reseat still plants after #38 floors
        ally.groundY=reseatGround;ally.y=groundAlly?reseatGround:reseatGround-52;ally.vx=0;
        setCompanionMode(groundAlly?"run":"fly",now);ally.teleportAt=now;
      }

      const livePack=wildPackFor(map)??[];
      const mapHostiles:HuntTarget[]=map===1&&dragon.health>0?[dragon,...livePack]:livePack;
      const hunted=nearestHuntTarget(ally.x,mapHostiles,COMPANION_HUNT_RANGE);
      const hunting=Boolean(hunted);
      if(hunting&&hunted){ally.targetX=hunted.x;ally.attackUntil=now+1600;}
      const followX=creatureEdgeAt(map,pl.x-pl.facing*104);
      const playerGround=pl.y+PH;
      const stayForHunt=hunted&&Math.abs(pl.x-hunted.x)<COMPANION_HUNT_RANGE+140&&Math.abs(ally.x-hunted.x)<COMPANION_TELEPORT_DISTANCE;
      if(Math.abs(pl.x-ally.x)>COMPANION_TELEPORT_DISTANCE&&!stayForHunt){
        const seat=!hunting?plantedFloorAt(map,followX):null;
        const arrivalX=seat?creatureEdgeAt(map,seat.x):followX;
        const arrivalGround=seat?seat.groundY:(companionSurfaceAt(followX,playerGround,map)??surfaceYAt(map,followX,590)??playerGround);
        ally.x=arrivalX;ally.groundY=arrivalGround;ally.y=groundAlly?arrivalGround:arrivalGround-58;ally.vx=0;ally.attackUntil=0;ally.teleportAt=now;ally.facing=pl.facing;setCompanionMode(groundAlly?"run":"fly",now);
        keepCreatureOnRoad(ally,map);
      }
      const targetX=hunting?hunted!.x:followX;
      const holdX=hunting?targetX-(targetX>=ally.x?1:-1)*96:targetX;
      const delta=holdX-ally.x,distance=Math.abs(delta);
      const strikeDistance=hunted?Math.abs(hunted.x-ally.x):distance;
      if(distance>18)ally.facing=delta>=0?1:-1;
      else if(hunting&&hunted)ally.facing=hunted.x>=ally.x?1:-1;

      if(hunting&&strikeDistance<COMPANION_STRIKE_RANGE){
        setCompanionMode("attack",now);
        ally.vx+=(0-ally.vx)*(1-Math.exp(-10*dt));
        ally.x+=ally.vx*dt;
        if(strikeDistance<78)ally.x+=(holdX-ally.x)*(1-Math.exp(-8*dt));
        const pounceHeight=groundAlly?8+hopArc(clamp((now-ally.modeStarted)/JACKAL_POUNCE_MS,0,1),28):50;
        const plantedGround=companionSurfaceAt(ally.x,ally.groundY,map);
        if(plantedGround!==null)ally.groundY+=(plantedGround-ally.groundY)*(1-Math.exp(-12*dt));
        ally.y+=(ally.groundY-pounceHeight-ally.y)*(1-Math.exp(-10*dt));
        const attackElapsed=now-ally.modeStarted;
        if(!ally.attackLanded&&attackElapsed>390){
          ally.attackLanded=true;
          const strike=hunted!;
          if(map===1&&strike===dragon&&Math.abs(dragon.x-ally.x)<COMPANION_STRIKE_RANGE+20){
            dragon.health=Math.max(0,dragon.health-COMPANION_STRIKE_DAMAGE);dragon.hurtStarted=now;dragon.hurtUntil=now+420;dragon.lastDamage=COMPANION_STRIKE_DAMAGE;dragon.hitDirection=dragon.x>=ally.x?1:-1;
            if(dragon.health===0){dragon.angry=false;dragon.awarenessUntil=0;seatDeadBeast(dragon,1);beginDragonMode("sleep",now,999999999);}
            else{dragon.angry=true;dragon.awarenessUntil=now+8000;}
            tone(112,.1,.022);
          }else if(strike!==dragon&&Math.abs(strike.x-ally.x)<COMPANION_STRIKE_RANGE+18){
            const prey=strike as Jackal;
            prey.health=Math.max(0,prey.health-COMPANION_STRIKE_DAMAGE);prey.hurtStarted=now;prey.hurtUntil=now+400;prey.lastDamage=COMPANION_STRIKE_DAMAGE;prey.hitDirection=prey.x>=ally.x?1:-1;
            if(prey.health===0){prey.angry=false;prey.awarenessUntil=0;seatDeadBeast(prey,map);beginJackalMode(prey,"sleep",now,999999999);}
            else{prey.angry=true;prey.awarenessUntil=now+7000;}
            tone(118,.1,.02);
          }
        }
        if(attackElapsed>COMPANION_STRIKE_RECOVERY){ally.modeStarted=now;ally.attackLanded=false;}
        keepCreatureOnRoad(ally,map);
        return;
      }

      const currentSurface=companionSurfaceAt(ally.x,ally.groundY,map);
      if(currentSurface!==null)ally.groundY+=(currentSurface-ally.groundY)*(1-Math.exp(-11*dt));
      const noGroundAhead=companionSurfaceAt(ally.x+ally.facing*48,ally.groundY,map)===null;
      const huntHeight=hunted&&"groundY" in hunted?Math.abs((hunted as Dragon).groundY-ally.groundY):Math.abs(playerGround-ally.groundY);
      const needsFlight=!groundAlly&&(huntHeight>34||noGroundAhead);
      if(distance>46){
        const followMode:DragonMode=needsFlight?"fly":distance>170?"run":"walk";
        setCompanionMode(followMode,now);
        const speed=followMode==="fly"?128:followMode==="run"?(groundAlly?176:158):64;
        const response=followMode==="walk"?4.2:followMode==="fly"?4.8:6.6;
        ally.vx+=(ally.facing*speed-ally.vx)*(1-Math.exp(-response*dt));ally.x+=ally.vx*dt;
        ally.x=creatureEdgeAt(map,ally.x);
        const nextSurface=companionSurfaceAt(ally.x,ally.groundY,map);
        if(nextSurface!==null)ally.groundY+=(nextSurface-ally.groundY)*(1-Math.exp(-10*dt));
        const hop=groundAlly&&distance>190?Math.abs(Math.sin(ally.gait*.008))*38:0;
        const hopPrev=groundAlly&&(ally.prevMode==="run"||ally.mode==="run")&&distance>80?Math.abs(Math.sin(ally.gait*.008))*38:0;
        const hopBlend=hopPrev+(hop-hopPrev)*easeInOut(clamp((now-ally.modeBlendAt)/MODE_BLEND_MS,0,1));
        const huntSeat=hunting&&hunted&&"groundY" in hunted?(hunted as {groundY:number}).groundY:playerGround;
        const targetY=followMode==="fly"?Math.min(huntSeat-68,ally.groundY-76):ally.groundY-hopBlend;
        ally.y+=(targetY-ally.y)*(1-Math.exp(-(followMode==="fly"?5:12)*dt));
      }else{
        setCompanionMode("idle",now);ally.vx+=(0-ally.vx)*(1-Math.exp(-9*dt));ally.x+=ally.vx*dt;
        const idleSeat=!hunting?plantedFloorAt(map,ally.x):null;
        if(idleSeat){ally.x=creatureEdgeAt(map,idleSeat.x);ally.groundY=idleSeat.groundY;}
        const idleGround=idleSeat?idleSeat.groundY:(companionSurfaceAt(ally.x,ally.groundY,map)??surfaceYAt(map,ally.x,590));
        if(idleGround!==null)ally.groundY=idleGround;
        const leftover=companionIdleLeftover(ally,groundAlly,now);
        ally.y+=(ally.groundY-leftover-ally.y)*(1-Math.exp(-12*dt)); // hop/roost leftover still eases through idle after sleep→wake and portal reseat
        if(ally.y>ally.groundY+28)ally.y=ally.groundY;
        ally.facing=hunting&&hunted?(hunted.x>=ally.x?1:-1):(pl.x>=ally.x?1:-1);
      }
      keepCreatureOnRoad(ally,map);
    };
    const currentHuntTarget=()=>{
      const ally=companionRef.current;
      if(!ally?.active||!ally.itemId||ally.recallStarted>0||ally.map!==mapRef.current)return null;
      const livePack=wildPackFor(mapRef.current)??[];
      const mapHostiles:HuntTarget[]=mapRef.current===1&&dragon.health>0?[dragon,...livePack]:livePack;
      return nearestHuntTarget(ally.x,mapHostiles,COMPANION_HUNT_RANGE);
    };
    const drawHuntMark=(x:number,y:number,now:number,marked:boolean)=>{
      if(!marked)return;
      const pulse=.55+Math.sin(now*.01)*.28;
      const late=lateMapContactShade(mapRef.current);
      ctx.save();ctx.translate(x,y);ctx.textAlign="center";ctx.textBaseline="bottom";
      ctx.font="900 8px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.lineWidth=late?4:3;ctx.strokeStyle=late?"rgba(6,2,4,.96)":"rgba(4,10,6,.9)";ctx.strokeText("HUNT",0,-10);
      ctx.fillStyle=(late?"rgba(220,255,140,":"rgba(185,255,99,")+pulse+")";ctx.fillText("HUNT",0,-10);
      ctx.fillStyle=(late?"rgba(220,255,140,":"rgba(185,255,99,")+(.35+pulse*.35)+")";ctx.strokeStyle=late?"rgba(220,255,140,.9)":"rgba(185,255,99,.85)";ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(7,2);ctx.lineTo(0,7);ctx.lineTo(-7,2);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.restore();
    };
    const drawHurtNumber=(x:number,y:number,dmg:number,progress:number,fill:string)=>{
      const late=lateMapContactShade(mapRef.current);
      ctx.save();ctx.globalAlpha=Math.max(0,1-progress);ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.font="900 15px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.lineWidth=late?5:4;ctx.strokeStyle=late?"rgba(4,2,6,.96)":"rgba(8,4,8,.92)";ctx.strokeText("-"+dmg,x,y);
      ctx.fillStyle=fill;ctx.shadowColor=late?"rgba(255,248,210,.95)":"rgba(255,240,180,.7)";ctx.shadowBlur=late?8:6;ctx.fillText("-"+dmg,x,y);
      ctx.restore();
    };
    const drawPixelJackal=(x:number,y:number,groundY:number,facing:1|-1,mode:DragonMode,elapsed:number,now:number,size:number,hurt:boolean,variant?:{tint?:BeastTint;antlers?:boolean;tufts?:boolean;kind?:BeastKind;gait?:number;prevMode?:DragonMode;modeBlendAt?:number})=>{
      const scale=size/90;
      const kind=variant?.kind??(variant?.tufts?"lynx":variant?.antlers?"stag":variant?.tint===FOX_TINT?"fox":"jackal");
      const prevMode=variant?.prevMode??mode;
      const modeBlendAt=variant?.modeBlendAt??0;
      const loco=variant?.gait??elapsed;
      const gaitBlend=gaitBlendAmt(modeBlendAt,now);
      const runCycle=(loco/(locoCadence(prevMode)+(locoCadence(mode)-locoCadence(prevMode))*gaitBlend))%1;
      const gait=Math.sin(runCycle*Math.PI*2);
      const air=clamp((groundY-y)/52,0,1);
      const leap=air;
      const attack=mode==="attack"?clamp(elapsed/920,0,1):prevMode==="attack"?(1-gaitBlend)*0.35:0;
      const pounce=attack>0?hopArc(attack,1):0;
      const sleepBlend=mode==="sleep"?easeInOut(clamp(elapsed/MODE_BLEND_MS,0,1)):0;
      const landSquash=prevMode==="fly"&&(mode==="idle"||mode==="walk"||mode==="run")?(1-easeInOut(clamp((now-modeBlendAt)/240,0,1)))*.12:0;
      const sleepPose=sleepPoseAmt(mode,prevMode,modeBlendAt,now,elapsed);
      const waking=prevMode==="sleep"&&mode!=="sleep";
      const sleep=mode==="sleep"&&sleepPose>=0.72; // curl only while asleep; sleep→wake uses sleepPoseAmt stand-up, no frozen curl frame
      const idleBreath=Math.sin(now*.0038);
      const weightShift=mode==="idle"?idleBreath*1.4:0;
      const bob=mode==="idle"?idleBreath*1.8:mode==="walk"||mode==="run"?Math.abs(gait)*2.4:mode==="sleep"||waking?Math.sin(now*.0026)*.7:0;
      const lunge=attack>0.32&&attack<.72?(attack-.32)/.4:0;
      const tail = sleep ? 0.9 : mode==="attack" ? -0.55-pounce*.2 : leap>0.12 ? 0.85 : 0.35+Math.sin(now*.008+loco*.01)*0.55;
      const earFlick = waking?0.55*(1-sleepPose):Math.sin(now*.012+loco*.004)>0.82?0.35:0;
      const footLift=(sleep?14:kind==="stag"?31:kind==="lynx"?23:kind==="fox"?25:27)*scale;
      const plantY=y-bob-leap*8-footLift;
      const restY=groundY-8-bob;
      const poseY=plantY+(restY-plantY)*sleepPose;
      const standRot=leap>0.05?-0.22*leap:mode==="attack"?-0.10+lunge*0.38:gait*0.05;
      const wakeStretch=waking?hopArc(1-sleepPose,0.07):0;
      ctx.save();ctx.translate(x+facing*lunge*8,groundY+3);ctx.scale(1+pounce*.08,.3);
      const shadow=ctx.createRadialGradient(0,0,2,0,0,30*scale);shadow.addColorStop(0,"rgba(18,10,8,"+(0.56-leap*.24+(mode==="attack"?0.1:0))+")");shadow.addColorStop(1,"rgba(18,10,8,0)");ctx.fillStyle=shadow;ctx.beginPath();ctx.arc(0,0,30*scale,0,Math.PI*2);ctx.fill();
      ctx.restore();
      ctx.save();ctx.translate(x,groundY+4);ctx.globalAlpha=.55-leap*.25;ctx.fillStyle="rgba(8,4,4,.72)";ctx.fillRect(-16*scale,0,32*scale,2);ctx.restore();
      ctx.save();
      ctx.translate(x+facing*(lunge*18+weightShift*.55),poseY);
      ctx.rotate(facing*(standRot+(0.12-standRot)*sleepPose));
      ctx.scale(facing*scale*(1+pounce*.14+wakeStretch+landSquash),(kind==="stag"?scale*1.08:scale)*(1-pounce*.08-wakeStretch*.4-landSquash+(sleepPose>0.2?Math.sin(now*.0028)*.02:0)));
      const tint=variant?.tint;
      const fur=tint?.fur??"#c45a28",furDark=tint?.furDark??"#6b2e18",furLight=tint?.furLight??"#f0a056",chest=tint?.chest??"#ffd2a0",outline="#2a1410",eye=tint?.eye??"#ffe27a";
      const map=mapRef.current;
      const rimGlow=map===1?"rgba(214,232,255,.28)":map===3?"rgba(255,168,96,.22)":map===4?"rgba(180,240,255,.28)":map===5?"rgba(255,176,96,.22)":map===6?"rgba(255,186,206,.24)":"rgba(255,220,176,.28)";
      const bellyShade=map===1?"rgba(10,14,28,.3)":map===3?"rgba(28,10,6,.28)":map===4?"rgba(6,16,24,.3)":map===5?"rgba(24,8,6,.28)":map===6?"rgba(22,8,16,.3)":"rgba(28,12,8,.26)";
      if(hurt&&pixelHurtFlash(now))ctx.globalAlpha=.4;
      const drawLimb=(lx:number,ly:number,lw:number,lh:number,rot:number)=>{
        ctx.save();ctx.translate(lx,ly);ctx.rotate(rot);ctx.fillStyle=outline;ctx.fillRect(-lw/2-1,-1,lw+2,lh+2);ctx.fillStyle=furDark;ctx.fillRect(-lw/2,0,lw,lh);ctx.restore();
      };
      if(sleep){
        ctx.fillStyle=outline;ctx.beginPath();ctx.ellipse(0,-10,23,16,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=fur;ctx.beginPath();ctx.ellipse(0,-10,21,14,0,0,Math.PI*2);ctx.fill();
        const sleepShade=ctx.createLinearGradient(-8,-22,12,6);sleepShade.addColorStop(0,furLight);sleepShade.addColorStop(.4,fur);sleepShade.addColorStop(1,furDark);ctx.fillStyle=sleepShade;ctx.beginPath();ctx.ellipse(0,-11,18,11,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=rimGlow;ctx.beginPath();ctx.ellipse(-2,-16,12,3.2,-.1,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=bellyShade;ctx.beginPath();ctx.ellipse(2,-4,14,5,.08,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=chest;ctx.beginPath();ctx.ellipse(6,-8,10,8,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=furDark;ctx.beginPath();ctx.ellipse(-16,-6,kind==="lynx"?6:8,kind==="lynx"?5:6,.6,0,Math.PI*2);ctx.fill();
        if(kind==="lynx"){ctx.fillStyle="#1a0c08";ctx.beginPath();ctx.ellipse(-18,-5,3.2,2.6,0,0,Math.PI*2);ctx.fill();}
        ctx.fillStyle=outline;ctx.beginPath();ctx.moveTo(12,-22);ctx.lineTo(16,-34);ctx.lineTo(8,-24);ctx.fill();
        ctx.fillStyle=furLight;ctx.beginPath();ctx.moveTo(12,-22);ctx.lineTo(15,-31);ctx.lineTo(9,-23);ctx.fill();
        if(kind==="lynx"){ctx.strokeStyle=furLight;ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(14,-32);ctx.lineTo(12,-40);ctx.stroke();}
        ctx.fillStyle=eye;ctx.globalAlpha=hurt?ctx.globalAlpha:0.35;ctx.beginPath();ctx.ellipse(14,-14,2.2,1.2,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=hurt&&pixelHurtFlash(now)?.4:1;
        ctx.restore();return;
      }
      const swingFor=(pose:DragonMode, amt:number)=>{
        if(pose==="idle")return {front:0.06+idleBreath*0.03,back:-0.06-idleBreath*0.03};
        if(leap>0.12&&pose!=="attack"&&pose!=="sleep")return {front:0.85,back:-0.7};
        if(pose==="attack")return {front:0.2+lunge*0.9,back:-0.15-lunge*0.4};
        const span=pose==="run"?0.82:0.62;
        return {front:amt*span,back:-amt*span};
      };
      const swingFrom=swingFor(prevMode,gait),swingTo=swingFor(mode,gait);
      const frontSwing=swingFrom.front+(swingTo.front-swingFrom.front)*gaitBlend;
      const backSwing=swingFrom.back+(swingTo.back-swingFrom.back)*gaitBlend;
      const legLen=kind==="stag"?22:kind==="lynx"?16:18;
      ctx.save();ctx.globalAlpha=.68;ctx.translate(-1.5,1.7);drawLimb(-12,8,kind==="lynx"?7:6,legLen,backSwing);drawLimb(-6,8,6,legLen-1,backSwing*0.7+0.15);ctx.restore();
      const bodyW=kind==="lynx"?22:kind==="fox"?16:20,bodyH=kind==="lynx"?15:kind==="stag"?14:13;
      ctx.fillStyle=outline;ctx.beginPath();ctx.ellipse(0,-6,bodyW,bodyH,0,0,Math.PI*2);ctx.fill();
      const bodyShade=ctx.createLinearGradient(-8,-20,10,13);bodyShade.addColorStop(0,furLight);bodyShade.addColorStop(.28,fur);bodyShade.addColorStop(.78,furDark);bodyShade.addColorStop(1,outline);ctx.fillStyle=bodyShade;ctx.beginPath();ctx.ellipse(0,-6,bodyW-2,bodyH-1.5,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=rimGlow;ctx.beginPath();ctx.ellipse(2,-11,Math.max(7,bodyW*.55),3.2,-.08,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=bellyShade;ctx.beginPath();ctx.ellipse(1,1,Math.max(8,bodyW*.5),3.4,.12,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=chest;ctx.beginPath();ctx.ellipse(8,-2,8,7,0,0,Math.PI*2);ctx.fill();
      if(kind==="lynx"){
        ctx.fillStyle=furDark;ctx.fillRect(-8,-10,3,2);ctx.fillRect(1,-5,3,2);ctx.fillRect(-3,1,2,2);ctx.fillRect(6,-12,2,2);ctx.fillRect(-10,-2,2,2);
        ctx.fillStyle=furLight;ctx.beginPath();ctx.moveTo(8,-12);ctx.lineTo(18,-7);ctx.lineTo(8,-4);ctx.fill();
      }
      ctx.save();ctx.translate(-16,-6);ctx.rotate(tail);
      if(kind==="lynx"){
        ctx.fillStyle=outline;ctx.beginPath();ctx.ellipse(-1,0,7,5.2,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=fur;ctx.beginPath();ctx.ellipse(-1,0,5.5,4,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#1a0c08";ctx.beginPath();ctx.ellipse(-5,-1,3.2,2.6,0,0,Math.PI*2);ctx.fill();
      }else if(kind==="fox"){
        ctx.fillStyle=outline;ctx.fillRect(-3,-5,26,12);ctx.fillStyle=fur;ctx.fillRect(-2,-4,24,10);ctx.fillStyle="#fff6e8";ctx.fillRect(16,-3,8,8);
      }else if(kind==="stag"){
        ctx.fillStyle=outline;ctx.fillRect(-2,-2,12,6);ctx.fillStyle=furDark;ctx.fillRect(-1,-1,10,4);
      }else{
        ctx.fillStyle=outline;ctx.fillRect(-3,-3,20,8);ctx.fillStyle=furDark;ctx.fillRect(-2,-2,18,6);ctx.fillStyle=furLight;ctx.fillRect(10,-1,7,4);
      }
      ctx.restore();
      ctx.fillStyle=outline;ctx.beginPath();ctx.ellipse(kind==="lynx"?14:16,-14,kind==="fox"?10:11,kind==="lynx"?10:9,0,0,Math.PI*2);ctx.fill();
      const headShade=ctx.createLinearGradient(11,-23,24,-7);headShade.addColorStop(0,furLight);headShade.addColorStop(.42,fur);headShade.addColorStop(1,furDark);ctx.fillStyle=headShade;ctx.beginPath();ctx.ellipse(16,-14,kind==="fox"?8.5:9.5,kind==="lynx"?8.5:7.5,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=rimGlow;ctx.beginPath();ctx.ellipse(15,-18,5.6,2,-.12,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=furLight;ctx.fillRect(20,-16,kind==="lynx"?5:7,5);
      if(kind==="lynx"){
        ctx.fillStyle=furLight;ctx.beginPath();ctx.ellipse(10,-8,7,5.5,.35,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=chest;ctx.beginPath();ctx.ellipse(12,-6,5,4,.2,0,Math.PI*2);ctx.fill();
      }
      ctx.fillStyle=outline;ctx.fillRect(kind==="lynx"?24:26,-15,4,3);
      ctx.fillStyle="#1a0c08";ctx.fillRect(kind==="lynx"?25:27,-14,3,2);
      ctx.save();ctx.translate(12,-22);ctx.rotate(-0.2-earFlick);ctx.fillStyle=outline;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(4,kind==="lynx"?-16:-14);ctx.lineTo(8,1);ctx.fill();ctx.fillStyle=furLight;ctx.beginPath();ctx.moveTo(1,0);ctx.lineTo(4,kind==="lynx"?-14:-12);ctx.lineTo(7,1);ctx.fill();ctx.fillStyle=kind==="lynx"?furLight:"#e8784a";ctx.beginPath();ctx.moveTo(3,-1);ctx.lineTo(4,-8);ctx.lineTo(6,0);ctx.fill();
      if(kind==="lynx"){ctx.strokeStyle=furLight;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(4,-15);ctx.lineTo(2,-23);ctx.stroke();}
      ctx.restore();
      ctx.save();ctx.translate(18,-21);ctx.rotate(0.15+earFlick*0.6);ctx.fillStyle=outline;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(3,kind==="lynx"?-14:-12);ctx.lineTo(7,1);ctx.fill();ctx.fillStyle=fur;ctx.beginPath();ctx.moveTo(1,0);ctx.lineTo(3,kind==="lynx"?-12:-10);ctx.lineTo(6,1);ctx.fill();
      if(kind==="lynx"){ctx.strokeStyle=furLight;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(3,-13);ctx.lineTo(5,-21);ctx.stroke();}
      ctx.restore();
      if(kind==="stag"||variant?.antlers){
        ctx.save();ctx.translate(14,-26);ctx.strokeStyle=furLight;ctx.lineWidth=2;ctx.lineCap="round";
        ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(3,-16);ctx.moveTo(2,-8);ctx.lineTo(-3,-13);ctx.moveTo(3,-12);ctx.lineTo(8,-16);ctx.stroke();
        ctx.beginPath();ctx.moveTo(6,-2);ctx.lineTo(10,-17);ctx.moveTo(8,-9);ctx.lineTo(4,-15);ctx.moveTo(9,-13);ctx.lineTo(14,-17);ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle=eye;ctx.beginPath();ctx.ellipse(20,-16,2.4,2.1,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#2a1410";ctx.beginPath();ctx.ellipse(20.7,-16,1.1,1.4,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#fff6c8";ctx.fillRect(19.2,-16.8,1,1);
      drawLimb(8,9,kind==="lynx"?7:6,legLen-1,frontSwing);drawLimb(14,9,5,legLen-2,frontSwing*0.75-0.1);
      if(mode==="attack"&&attack>.4){
        ctx.fillStyle="#fff1c8";ctx.globalAlpha=.8;ctx.fillRect(27,-13,6,2);ctx.fillRect(27,-10,5,2);
      }
      ctx.restore();
    };
    const drawPixelWyrm=(x:number,y:number,groundY:number,facing:1|-1,mode:DragonMode,elapsed:number,now:number,size:number,hurt:boolean,gait?:number,prevMode?:DragonMode,modeBlendAt?:number)=>{
      const scale=size/150;
      const loco=gait??elapsed;
      const gaitBlend=gaitBlendAmt(modeBlendAt??0,now);
      const flyAmt=clamp((groundY-y)/90,0,1);
      const wave=Math.sin(now*.006+loco*.01);
      const hover=8*flyAmt+Math.sin(now*.004)*6*flyAmt+Math.sin(now*.003)*2*(1-flyAmt);
      const attack=mode==="attack"?clamp(elapsed/920,0,1):prevMode==="attack"?(1-gaitBlend)*0.28:0;
      const lunge=attack>0.32&&attack<.72?(attack-.32)/.4:0;
      const sleepPose=sleepPoseAmt(mode, prevMode??mode, modeBlendAt??0, now, elapsed);
      const landSquash=(prevMode??mode)==="fly"&&(mode==="idle"||mode==="walk"||mode==="run")?(1-easeInOut(clamp((now-(modeBlendAt??0))/240,0,1)))*.1:0;
      const curl=sleepPose*(14+Math.sin(now*.0024)*1.4);
      ctx.save();
      ctx.fillStyle="rgba(16,6,12,"+(0.58-(flyAmt*0.24)+sleepPose*.08)+")";
      ctx.beginPath();ctx.ellipse(x,groundY+3,34*(1-flyAmt*.3)*scale,6.5*scale,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="rgba(10,4,8,.7)";ctx.fillRect(x-18*scale,groundY+4,36*scale,2);
      ctx.translate(x+facing*lunge*16,y-hover+curl);
      ctx.rotate(facing*(-0.18*flyAmt+(attack>0?-0.1+lunge*.3:wave*.04)*(1-flyAmt*.35)+sleepPose*.18));
      ctx.scale(facing*scale*(1+lunge*.1+landSquash),(scale)*(1-sleepPose*.08-lunge*.05-landSquash));
      if(hurt&&pixelHurtFlash(now))ctx.globalAlpha=.4;
      const body="#4a2048",bodyDark="#140816",belly="#d45a6a",glow="#ffc8a0",outline="#1a0810";
      for(let i=6;i>=0;i--){
        const sx=-16-i*12,sy=-10+Math.sin(wave+i*.65)*8,sr=11-i*1.15;
        ctx.fillStyle=outline;ctx.beginPath();ctx.ellipse(sx,sy,sr+1.6,sr*.62+1.2,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=i%2?body:bodyDark;ctx.beginPath();ctx.ellipse(sx,sy,sr,sr*.55,0,0,Math.PI*2);ctx.fill();
        if(i<3){ctx.fillStyle=belly;ctx.beginPath();ctx.ellipse(sx+1,sy+2,sr*.55,sr*.28,0,0,Math.PI*2);ctx.fill();}
        if(i%2===0){
          ctx.save();ctx.translate(sx,sy-sr*.4);ctx.rotate(-0.7+Math.sin(wave+i)*.2);
          ctx.fillStyle=outline;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-4,-18);ctx.lineTo(5,-8);ctx.closePath();ctx.fill();
          ctx.fillStyle=glow;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-2,-14);ctx.lineTo(3,-7);ctx.closePath();ctx.fill();
          ctx.restore();
        }
      }
      ctx.fillStyle=outline;ctx.beginPath();ctx.ellipse(2,-14,20,15,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(2,-14,18,13,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=belly;ctx.beginPath();ctx.ellipse(6,-10,11,8,0,0,Math.PI*2);ctx.fill();
      ctx.save();ctx.globalAlpha=hurt?ctx.globalAlpha:.55+.4*Math.sin(now*.008);ctx.fillStyle=glow;ctx.shadowColor=glow;ctx.shadowBlur=12;
      ctx.beginPath();ctx.moveTo(4,-14);ctx.bezierCurveTo(10,-24,20,-8,4,4);ctx.bezierCurveTo(-12,-8,-2,-24,4,-14);ctx.fill();
      ctx.restore();if(hurt&&pixelHurtFlash(now))ctx.globalAlpha=.4;
      ctx.save();ctx.translate(-2,-24);ctx.rotate(-0.55+wave*.18);
      ctx.fillStyle=outline;ctx.fillRect(-2,-2,5,32);ctx.fillStyle=belly;ctx.fillRect(-1,0,3,28);ctx.fillStyle=glow;ctx.fillRect(0,16,2,10);
      ctx.restore();
      ctx.save();ctx.translate(8,-22);ctx.rotate(0.5-wave*.18);
      ctx.fillStyle=outline;ctx.fillRect(-2,-2,5,30);ctx.fillStyle=glow;ctx.fillRect(-1,0,3,26);
      ctx.restore();
      ctx.fillStyle=outline;ctx.beginPath();ctx.ellipse(22,-20,15,10,.18,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(22,-20,13,8,.18,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=glow;ctx.fillRect(30,-22,12,4);
      ctx.fillStyle=outline;ctx.fillRect(40,-21,5,3);
      ctx.strokeStyle=glow;ctx.lineWidth=2.2;ctx.lineCap="round";
      ctx.beginPath();ctx.moveTo(16,-28);ctx.lineTo(10,-44);ctx.moveTo(22,-28);ctx.lineTo(24,-46);ctx.stroke();
      ctx.fillStyle="#ffe8f0";ctx.beginPath();ctx.ellipse(26,-22,2.8,2.3,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#2a0810";ctx.beginPath();ctx.ellipse(26.7,-22,1.2,1.5,0,0,Math.PI*2);ctx.fill();
      if(mode==="attack"&&attack>.4){ctx.fillStyle="#ffe0ea";ctx.globalAlpha=.85;ctx.fillRect(40,-20,8,2);ctx.fillRect(40,-16,6,2);}
      ctx.restore();
    };
    const drawCompanion=(now:number)=>{
      const ally=companionRef.current;
      if(!ally?.active||!ally.itemId||ally.map!==mapRef.current)return;
      const isJackal=Boolean(GROUND_BEAST_CARD_IDS.has(ally.itemId));
      const wyrmTint=ally.itemId===HEART_WYRM_CARD.id;
      if(!isJackal&&!wyrmTint&&(!dragonImage.complete||!dragonImage.naturalWidth))return;
      const palette=inventoryRef.current.find(item=>item.id===ally.itemId)?.palette??(isJackal?SUNSET_JACKAL_CARD.palette:wyrmTint?HEART_WYRM_CARD.palette:BABY_DRAGON_CARD.palette);
      const companionName=cardDisplayName(ally.itemId);
      const companionTint=beastTintFor(ally.itemId),companionAntlers=beastAntlersFor(ally.itemId),companionTufts=beastTuftsFor(ally.itemId),companionKind=beastKindFor(ally.itemId);
      const frames=DRAGON_FRAMES[ally.mode]??DRAGON_FRAMES.idle,elapsed=now-ally.modeStarted,gait=ally.gait||elapsed;
      let index=0;
      if(ally.mode==="idle"){
        const wake=ally.prevMode==="sleep"?easeInOut(clamp((now-ally.modeBlendAt)/WAKE_BLEND_MS,0,1)):1;
        if(wake<0.28)index=3;
        else if(wake<0.55)index=2;
        else if(wake<0.8)index=1;
        else{const phase=elapsed%2900;index=phase<1550?0:phase<2150?1:phase<2500?2:3;} // companion dragon idle uses stand-breath, not the curl-row 520ms cycle
      }
      else if(ally.mode==="walk")index=Math.floor(gait/180)%Math.max(1,frames.length);
      else if(ally.mode==="run")index=Math.floor(gait/100)%Math.max(1,frames.length);
      else if(ally.mode==="fly")index=flapFrame(gait,frames.length);
      else if(ally.mode==="attack")index=Math.min(Math.max(0,frames.length-1),Math.floor(elapsed/175));
      const poseMode=locoPoseMode(ally,now);
      const poseFrames=DRAGON_FRAMES[poseMode]??frames;
      if(poseMode!==ally.mode&&poseMode==="fly")index=flapFrame(gait,poseFrames.length);
      else if(poseMode!==ally.mode&&poseMode==="run")index=Math.floor(gait/100)%Math.max(1,poseFrames.length);
      else if(poseMode!==ally.mode&&poseMode==="walk")index=Math.floor(gait/180)%Math.max(1,poseFrames.length);
      else if(poseMode!==ally.mode&&poseMode==="attack")index=Math.min(Math.max(0,poseFrames.length-1),Math.floor(elapsed/175));
      const frame=frames[index]??DRAGON_FRAMES.idle[0],size=108,spriteScale=size/DRAGON_CELL;
      const poseFrame=poseFrames[index]??frame;
      const smooth=(value:number)=>value*value*(3-2*value);
      const summon=clamp((now-ally.summonedAt)/COMPANION_SUMMON_DURATION,0,1);
      const summonCreature=smooth(clamp((summon-.14)/.7,0,1));
      const recall=ally.recallStarted>0?clamp((now-ally.recallStarted)/COMPANION_RECALL_DURATION,0,1):0;
      const recallCreature=1-smooth(clamp((recall-.06)/.78,0,1));
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
        if(isJackal){ctx.save();ctx.translate(0,8);ctx.scale(0.42,0.42);drawPixelJackal(0,0,18,1,"idle",elapsed,now,70,false,{tint:companionTint??undefined,antlers:companionAntlers,tufts:companionTufts,kind:companionKind});ctx.restore();}
        else if(wyrmTint){ctx.save();ctx.translate(0,10);ctx.scale(0.28,0.28);drawPixelWyrm(0,0,18,1,"idle",elapsed,now,90,false);ctx.restore();}
        else{ctx.drawImage(dragonImage,cardFrame.x,cardFrame.y,cardFrame.w,cardFrame.h,-15,-25,30,36);}
        ctx.restore();
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
        drawPixelJackal(ally.x,ally.y+summonLift-recallPull,ally.groundY,ally.facing,ally.mode,elapsed,now,96*spriteGrow,false,{tint:companionTint??undefined,antlers:companionAntlers,tufts:companionTufts,kind:companionKind,gait,prevMode:ally.prevMode,modeBlendAt:ally.modeBlendAt});
        ctx.restore();
      }else if(wyrmTint){
        ctx.save();ctx.globalAlpha=visibility;ctx.shadowColor=ally.mode==="attack"?"rgba(212,90,106,.85)":"rgba(212,90,106,.5)";ctx.shadowBlur=ally.mode==="attack"?17:9;
        drawPixelWyrm(ally.x,ally.y+summonLift-recallPull,ally.groundY,ally.facing,ally.mode,elapsed,now,128*spriteGrow,false,gait,ally.prevMode,ally.modeBlendAt);
        ctx.restore();
      }else{
        ctx.save();ctx.translate(ally.x,ally.y+summonLift-recallPull);ctx.rotate(ally.facing*(1-recallCreature)*.72);ctx.scale(ally.facing*spriteGrow,spriteGrow);
        ctx.globalAlpha=visibility;ctx.shadowColor=ally.mode==="attack"?"rgba(179,255,71,.8)":"rgba(95,224,48,.42)";ctx.shadowBlur=ally.mode==="attack"?17:9;
        ctx.drawImage(dragonImage,poseFrame.x,poseFrame.y,poseFrame.w,poseFrame.h,-poseFrame.anchorX*spriteScale,-poseFrame.anchorY*spriteScale,poseFrame.w*spriteScale,poseFrame.h*spriteScale);ctx.restore();
      }

      if(summon>.72&&recall<.46){
        const healthRatio=clamp(ally.health/ally.maxHealth,0,1),barY=ally.y-112;
        const huntTag=currentHuntTarget()?" · HUNT":"";
        const late=lateMapContactShade(mapRef.current);
        ctx.save();ctx.globalAlpha=visibility;ctx.textAlign="center";ctx.textBaseline="bottom";ctx.font="900 8px ui-monospace, SFMono-Regular, Menlo, monospace";ctx.lineWidth=late?4:3;ctx.strokeStyle=late?"rgba(6,2,4,.96)":"rgba(2,6,8,.92)";ctx.strokeText(`ALLY · ${companionName}${huntTag}  ${Math.ceil(ally.health)} / ${ally.maxHealth}`,ally.x,barY-5);ctx.fillStyle=isJackal?"#ffe1b0":wyrmTint?"#ffc8d8":"#d9ffb0";ctx.fillText(`ALLY · ${companionName}${huntTag}  ${Math.ceil(ally.health)} / ${ally.maxHealth}`,ally.x,barY-5);
        ctx.fillStyle="rgba(2,7,8,.84)";ctx.beginPath();ctx.roundRect(ally.x-48,barY,96,7,3.5);ctx.fill();
        const healthGradient=ctx.createLinearGradient(ally.x-46,0,ally.x+46,0);healthGradient.addColorStop(0,"#5ed52d");healthGradient.addColorStop(1,"#b7ff57");ctx.fillStyle=healthGradient;ctx.beginPath();ctx.roundRect(ally.x-46,barY+2,92*healthRatio,3,1.5);ctx.fill();ctx.strokeStyle="rgba(190,255,132,.72)";ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(ally.x-48,barY,96,7,3.5);ctx.stroke();ctx.restore();
      }
    };
    const drawCardPressE=(x:number,y:number)=>{
      const late=lateMapContactShade(mapRef.current);
      ctx.font="900 8px ui-monospace, SFMono-Regular, Menlo, monospace";ctx.textAlign="center";ctx.textBaseline="top";
      ctx.lineWidth=late?4:3;ctx.strokeStyle=late?"rgba(6,2,4,.96)":"rgba(7,3,16,.9)";ctx.strokeText("PRESS E",x,y);
      ctx.fillStyle="#fff6d2";ctx.fillText("PRESS E",x,y);
    };
    const drawLateStudyableTag=(x:number,y:number,label:string)=>{
      const late=lateMapContactShade(mapRef.current);
      ctx.save();ctx.globalAlpha=1;
      ctx.font="900 8px ui-monospace, SFMono-Regular, Menlo, monospace";ctx.textAlign="center";ctx.textBaseline="bottom";
      ctx.lineWidth=late?4:3;ctx.strokeStyle=late?"rgba(6,2,4,.96)":"rgba(7,3,16,.9)";ctx.strokeText(label,x,y);
      ctx.fillStyle="#fff6d2";ctx.fillText(label,x,y);
      drawCardPressE(x,y+3);
      ctx.restore();
    };
    const drawMagicalAnimalCard=(name:string,x:number,groundY:number,now:number,formedAt:number,image:HTMLImageElement|null,portrait:{x:number;y:number;w:number;h:number}|null,palette:CardPalette)=>{
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
      const lowerName=name.toLowerCase();
      const jackalPortrait=lowerName.includes("jackal");
      const sheetPortrait=Boolean(image&&/baby-dragon|sprite-sheet/i.test(image.src));
      if(jackalPortrait){
        if(image&&image.complete&&image.naturalWidth>0&&!sheetPortrait){
          ctx.drawImage(image,-29,-44,58,62);
        }else{
          ctx.save();ctx.translate(2,14);drawPixelJackal(0,0,20,1,"idle",now,now,82,false,{kind:"jackal"});ctx.restore();
        }
      }else if(lowerName.includes("fox")||lowerName.includes("stag")||lowerName.includes("lynx")){
        const tint=lowerName.includes("fox")?FOX_TINT:lowerName.includes("stag")?STAG_TINT:LYNX_TINT;
        const kind:BeastKind=lowerName.includes("fox")?"fox":lowerName.includes("stag")?"stag":"lynx";
        ctx.save();ctx.translate(0,18);drawPixelJackal(0,0,16,1,"idle",now,now,78,false,{tint,antlers:kind==="stag",tufts:kind==="lynx",kind});ctx.restore();
      }else if(lowerName.includes("wyrm")){
        ctx.save();ctx.translate(0,16);drawPixelWyrm(0,0,18,1,"idle",now,now,86,false);ctx.restore();
      }else if(image&&portrait){
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
      drawCardPressE(x,riseY+cardH/2*scale+6);
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
      if(!dragonCardCollected){const floor=plantedFloorAt(1,dragon.x);drawMagicalAnimalCard("Baby Dragon",floor.x,floor.groundY,now,dragon.modeStarted+350,dragonImage,{x:0,y:25,w:256,h:260},BABY_DRAGON_CARD.palette);}
    };
    const drawDragon=(now:number)=>{
      if(mapRef.current!==1||!dragonImage.complete||!dragonImage.naturalWidth)return;
      const elapsed=now-dragon.modeStarted,gait=dragon.gait||elapsed,frames=DRAGON_FRAMES[dragon.mode];
      if(dragon.health<=0){drawDragonCardTransformation(now);return;}
      let index=0;
      if(dragon.mode==="idle"){
        const wake=dragon.prevMode==="sleep"?easeInOut(clamp((now-dragon.modeBlendAt)/WAKE_BLEND_MS,0,1)):1;
        if(wake<0.28)index=3;
        else if(wake<0.55)index=2;
        else if(wake<0.8)index=1;
        else{const phase=elapsed%2900;index=phase<1550?0:phase<2150?1:phase<2500?2:3;}
      }      else if(dragon.mode==="walk")index=Math.floor(gait/220)%frames.length;
      else if(dragon.mode==="run")index=Math.floor(gait/95)%frames.length;
      else if(dragon.mode==="fly")index=flapFrame(gait,frames.length);
      else if(dragon.mode==="sleep"){
        const remaining=dragon.modeUntil-now;
        const settle=easeInOut(clamp(elapsed/SLEEP_SETTLE_MS,0,1));
        if(settle<0.22)index=0;
        else if(settle<0.48)index=1;
        else if(settle<0.76)index=2;
        else if(elapsed<420)index=0;
        else if(elapsed<820)index=1;
        else if(elapsed<1220)index=2;
        else if(remaining>1050)index=3;
        else if(remaining>680)index=2;
        else if(remaining>330)index=1;
        else index=0;
      }
      else index=Math.min(frames.length-1,Math.floor(elapsed/235));
      const poseMode=locoPoseMode(dragon,now);
      const poseFrames=DRAGON_FRAMES[poseMode]??frames;
      if(poseMode!==dragon.mode&&poseMode==="fly")index=flapFrame(gait,poseFrames.length);
      else if(poseMode!==dragon.mode&&poseMode==="run")index=Math.floor(gait/95)%poseFrames.length;
      else if(poseMode!==dragon.mode&&poseMode==="walk")index=Math.floor(gait/220)%poseFrames.length;
      else if(poseMode!==dragon.mode&&poseMode==="attack")index=Math.min(poseFrames.length-1,Math.floor(elapsed/235));
      const frame=poseFrames[Math.min(index,poseFrames.length-1)]??frames[index],size=DRAGON_RENDER_SIZE;
      const spriteScale=size/DRAGON_CELL;
      const airHeight=clamp((dragon.groundY-dragon.y)/125,0,1),shadowScale=1-airHeight*.46;
      const hurtActive=dragon.hurtUntil>now;
      const hurtProgress=hurtActive?clamp((now-dragon.hurtStarted)/520,0,1):1;
      const hurtPulse=hurtActive?Math.sin(hurtProgress*Math.PI):0;
      const recoilX=hurtPulse*12*dragon.hitDirection;
      const hitSquash=hurtPulse*.08;
      ctx.save();ctx.fillStyle="rgba(1,4,5,"+(.58-airHeight*.22)+")";ctx.beginPath();ctx.ellipse(dragon.x,dragon.groundY+3,35*shadowScale,7*shadowScale,0,0,Math.PI*2);ctx.fill();ctx.restore();
      ctx.save();ctx.translate(dragon.x+recoilX,dragon.y);
      if(dragon.mode==="fly"||poseMode==="fly"){
        const beat=flapPhase(gait);
        const bank=Math.sin(gait*.0055)*.03;
        ctx.rotate((bank+beat.tilt)*dragon.facing*(poseMode==="fly"&&dragon.mode!=="fly"?1-gaitBlendAmt(dragon.modeBlendAt,now):1));
      }
      const breatheScale=dragon.mode==="sleep"&&index===3?1+Math.sin(now*.0032)*.012:dragon.mode==="idle"?1+Math.sin(now*.0024)*.006:dragon.mode==="fly"?1+flapPhase(gait).lift*.02:1;
      ctx.scale(dragon.facing*(1+hitSquash),breatheScale-hitSquash);ctx.imageSmoothingEnabled=true;
      ctx.globalAlpha=hurtActive&&pixelHurtFlash(now)?.4:1;
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
        ctx.globalAlpha=1;
        drawHurtNumber(dragon.x+recoilX,barY-19-hurtProgress*22,dragon.lastDamage,hurtProgress*1.15,"#f4ffb0");
      }
      drawHuntMark(dragon.x+recoilX,barY-28,now,currentHuntTarget()===dragon);
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
      const droppedJackalCard=JACKAL_CARD_BY_BEAST[jackal.id];
      if(droppedJackalCard&&!jackalCardsCollected.has(droppedJackalCard.id)){const floor=plantedFloorAt(2,jackal.x);drawMagicalAnimalCard("Sunset Jackal",floor.x,floor.groundY,now,jackal.modeStarted+350,jackalCardArt,null,SUNSET_JACKAL_CARD.palette);}
    };
    const drawJackals=(now:number)=>{
      if(mapRef.current!==2)return;
      for(const jackal of jackals){
        if(jackal.health<=0){drawJackalCardTransformation(jackal,now);continue;}
        const elapsed=locoClock(jackal,now);
        const hurtActive=jackal.hurtUntil>now;
        const hurtProgress=hurtActive?clamp((now-jackal.hurtStarted)/480,0,1):1;
        const hurtPulse=hurtActive?Math.sin(hurtProgress*Math.PI):0;
        const recoilX=hurtPulse*10*jackal.hitDirection;
        ctx.save();ctx.shadowColor=hurtActive?"rgba(255,220,140,.9)":jackal.mode==="attack"?"rgba(255,170,70,.55)":jackal.angry?"rgba(255,90,40,.5)":"rgba(240,138,58,.2)";ctx.shadowBlur=hurtActive?18:jackal.angry?12:6;
        drawPixelJackal(jackal.x+recoilX,jackal.y,jackal.groundY,jackal.facing,jackal.mode,elapsed,now,JACKAL_RENDER_SIZE,hurtActive,{kind:"jackal",gait:jackal.gait,prevMode:jackal.prevMode,modeBlendAt:jackal.modeBlendAt});
        ctx.restore();
        const barW=78,barH=8,barX=jackal.x+recoilX-barW/2,barY=jackal.groundY-112;
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
        if(hurtActive)drawHurtNumber(jackal.x+recoilX,barY-16-hurtProgress*18,jackal.lastDamage,hurtProgress,"#ffe7a8");
        drawHuntMark(jackal.x+recoilX,barY-26,now,currentHuntTarget()===jackal); // jackal scout shares stroked hurt + HUNT
        ctx.restore();
      }
    };
    const drawWyrmCardTransformation=(wyrm:Jackal,now:number)=>{
      const elapsed=now-wyrm.modeStarted;
      const absorb=clamp((elapsed-140)/820,0,1);
      if(absorb<1){
        const pull=1-Math.pow(1-absorb,2);
        ctx.save();ctx.globalAlpha=1-pull;ctx.translate(0,-pull*44);
        drawPixelWyrm(wyrm.x,wyrm.y,wyrm.groundY,wyrm.facing,"sleep",elapsed,now,WYRM_RENDER_SIZE*(1-pull*.7),false);
        ctx.restore();
      }
      if(!otherWildCollected.has(HEART_WYRM_CARD.id)){const floor=plantedFloorAt(6,wyrm.x);drawMagicalAnimalCard("Heart Wyrm",floor.x,floor.groundY,now,wyrm.modeStarted+380,dragonImage,{x:0,y:25,w:256,h:260},HEART_WYRM_CARD.palette);}
    };
    const drawWyrm=(wyrm:Jackal,now:number)=>{
      if(wyrm.health<=0){drawWyrmCardTransformation(wyrm,now);return;}
      const elapsed=now-wyrm.modeStarted;
      const hurtActive=wyrm.hurtUntil>now,hurtProgress=hurtActive?clamp((now-wyrm.hurtStarted)/520,0,1):1;
      const hurtPulse=hurtActive?Math.sin(hurtProgress*Math.PI):0,recoilX=hurtPulse*13*wyrm.hitDirection;
      ctx.save();ctx.shadowColor=hurtActive?"rgba(255,200,220,.95)":wyrm.mode==="attack"?"rgba(212,90,106,.6)":wyrm.angry?"rgba(212,90,106,.55)":"rgba(212,90,106,.24)";ctx.shadowBlur=hurtActive?24:wyrm.mode==="attack"?18:wyrm.angry?14:8;
      drawPixelWyrm(wyrm.x+recoilX,wyrm.y,wyrm.groundY,wyrm.facing,wyrm.mode,elapsed,now,WYRM_RENDER_SIZE,hurtActive,wyrm.gait,wyrm.prevMode,wyrm.modeBlendAt);
      ctx.restore();
      const barW=132,barH=11,barX=wyrm.x+recoilX-barW/2,barY=wyrm.y-92;
      const healthRatio=clamp(wyrm.health/wyrm.maxHealth,0,1);
      const healthLabel=(wyrm.angry?"ANGRY  ":"")+"HEART WYRM  "+wyrm.health+" / "+wyrm.maxHealth;
      const late=lateMapContactShade(mapRef.current);
      ctx.save();ctx.textAlign="center";ctx.textBaseline="bottom";ctx.font="700 10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.lineWidth=late?4:3;ctx.strokeStyle=late?"rgba(6,2,4,.96)":"rgba(10,2,10,.9)";ctx.strokeText(healthLabel,wyrm.x+recoilX,barY-3); // heart wyrm health keeps late stroke with HUNT
      ctx.fillStyle=wyrm.angry?"#ffb3c4":"#ffd8e4";ctx.fillText(healthLabel,wyrm.x+recoilX,barY-3);
      ctx.fillStyle="rgba(10,2,10,.9)";ctx.fillRect(barX-2,barY-2,barW+4,barH+4);
      ctx.fillStyle="#3a1424";ctx.fillRect(barX,barY,barW,barH);
      const healthGradient=ctx.createLinearGradient(barX,barY,barX+barW,barY);
      healthGradient.addColorStop(0,"#ff7a92");healthGradient.addColorStop(1,"#d45a6a");
      ctx.fillStyle=healthGradient;ctx.fillRect(barX,barY,barW*healthRatio,barH);
      ctx.strokeStyle="rgba(255,200,216,.72)";ctx.lineWidth=1;ctx.strokeRect(barX-.5,barY-.5,barW+1,barH+1);
      if(hurtActive)drawHurtNumber(wyrm.x+recoilX,barY-18-hurtProgress*18,wyrm.lastDamage,hurtProgress,"#ffdfe8");
      drawHuntMark(wyrm.x+recoilX,barY-28,now,currentHuntTarget()===wyrm);
      ctx.restore();
    };
    const drawGroundBeastCardTransformation=(beast:Jackal,now:number,card:InventoryItem,renderSize:number,tint?:BeastTint,antlers?:boolean,tufts?:boolean,kind?:BeastKind,showCard=true)=>{
      const elapsed=now-beast.modeStarted;
      const absorb=clamp((elapsed-120)/720,0,1);
      if(absorb<1){
        const pull=1-Math.pow(1-absorb,2);
        ctx.save();ctx.globalAlpha=1-pull;ctx.translate(0,-pull*24);
        drawPixelJackal(beast.x,beast.y,beast.groundY,beast.facing,"sleep",elapsed,now,renderSize*(1-pull*.7),false,{tint,antlers,tufts,kind});
        ctx.restore();
      }
      if(showCard&&!isCombatOnlyBeast(beast.id)&&!otherWildCollected.has(card.id)){const floor=plantedFloorAt(mapRef.current,beast.x);drawMagicalAnimalCard(card.name,floor.x,floor.groundY,now,beast.modeStarted+340,dragonImage,{x:0,y:25,w:256,h:260},card.palette);}
    };
    const drawRoosts=(now:number)=>{
      if(mapRef.current!==1||!dragonImage.complete||!dragonImage.naturalWidth)return;
      const size=96,spriteScale=size/DRAGON_CELL;
      for(const roost of roosts){
        const elapsed=now-roost.modeStarted;
        if(roost.health<=0){
          const absorb=clamp((elapsed-120)/720,0,1);
          if(absorb<1){
            const pull=1-Math.pow(1-absorb,2);
            const frame=DRAGON_FRAMES.sleep[3];
            ctx.save();ctx.translate(roost.x,roost.y-pull*28);ctx.rotate(roost.facing*pull*.5);ctx.scale(roost.facing*(1-pull*.78),1-pull*.7);ctx.globalAlpha=1-pull;
            ctx.shadowColor="rgba(168,255,67,.8)";ctx.shadowBlur=8+pull*18;
            ctx.drawImage(dragonImage,frame.x,frame.y,frame.w,frame.h,-frame.anchorX*spriteScale,-frame.anchorY*spriteScale,frame.w*spriteScale,frame.h*spriteScale);
            ctx.restore();
          }
          continue;
        }
        const frames=DRAGON_FRAMES[roost.mode==="fly"? "fly":roost.mode==="attack"?"attack":roost.mode==="sleep"?"sleep":roost.mode==="run"||roost.mode==="walk"?"run":"idle"];
        const loco=roost.mode==="sleep"||roost.mode==="attack"||roost.mode==="idle"?elapsed:(roost.gait||elapsed);
        let index=roost.mode==="fly"?flapFrame(roost.gait||elapsed,frames.length):Math.min(frames.length-1,Math.floor(loco/(roost.mode==="run"?95:220))%frames.length);
        if(roost.mode==="sleep"){
          const settle=easeInOut(clamp(elapsed/SLEEP_SETTLE_MS,0,1));
          index=settle<0.28?0:settle<0.58?1:settle<0.82?2:Math.min(3,frames.length-1);
        }else if(roost.mode==="idle"&&roost.prevMode==="sleep"){
          const wake=easeInOut(clamp((now-roost.modeBlendAt)/WAKE_BLEND_MS,0,1));
          if(wake<0.3)index=3;else if(wake<0.58)index=2;else if(wake<0.82)index=1;
          else{const phase=elapsed%2900;index=phase<1550?0:phase<2150?1:phase<2500?2:3;} // after sleep→wake, roost idle holds stand-breath instead of a frozen curl-row cycle
        }
        const poseMode=locoPoseMode(roost,now);
        const poseFrames=DRAGON_FRAMES[poseMode==="fly"?"fly":poseMode==="attack"?"attack":poseMode==="sleep"?"sleep":poseMode==="run"||poseMode==="walk"?"run":"idle"];
        if(poseMode!==roost.mode&&poseMode==="fly")index=flapFrame(roost.gait||elapsed,poseFrames.length);
        else if(poseMode!==roost.mode&&(poseMode==="walk"||poseMode==="run"))index=Math.min(poseFrames.length-1,Math.floor(loco/(poseMode==="run"?95:220))%poseFrames.length);
        else if((roost.mode==="idle"||poseMode==="idle")&&roost.prevMode!=="sleep"){
          const phase=elapsed%2900;index=phase<1550?0:phase<2150?1:phase<2500?2:3;
        }
        const frame=poseFrames[Math.min(index,poseFrames.length-1)]??frames[index];
        const hurtActive=roost.hurtUntil>now,hurtProgress=hurtActive?clamp((now-roost.hurtStarted)/480,0,1):1;
        const recoilX=hurtActive?Math.sin(hurtProgress*Math.PI)*10*roost.hitDirection:0;
        ctx.save();ctx.fillStyle="rgba(1,4,5,.5)";ctx.beginPath();ctx.ellipse(roost.x,roost.groundY+3,26,5.5,0,0,Math.PI*2);ctx.fill();ctx.restore();
        ctx.save();ctx.translate(roost.x+recoilX,roost.y);
        if(roost.mode==="fly"||poseMode==="fly"){
          const beat=flapPhase(roost.gait||elapsed);
          ctx.rotate((beat.tilt)*roost.facing*(poseMode==="fly"&&roost.mode!=="fly"?1-gaitBlendAmt(roost.modeBlendAt,now):1));
        }
        ctx.scale(roost.facing,1);ctx.imageSmoothingEnabled=true;
        ctx.globalAlpha=hurtActive&&pixelHurtFlash(now)?.4:1;
        ctx.shadowColor=hurtActive?"rgba(255,245,151,.9)":roost.angry?"rgba(255,92,58,.5)":"rgba(81,188,41,.22)";ctx.shadowBlur=hurtActive?18:roost.angry?11:6;
        ctx.drawImage(dragonImage,frame.x,frame.y,frame.w,frame.h,-frame.anchorX*spriteScale,-frame.anchorY*spriteScale,frame.w*spriteScale,frame.h*spriteScale);
        ctx.restore();
        const barW=72,barH=8,barX=roost.x+recoilX-barW/2,barY=roost.y-78;
        const healthRatio=clamp(roost.health/roost.maxHealth,0,1);
        const healthLabel=(roost.angry?"ANGRY  ":"")+"ASH ROOSTLING  "+roost.health+" / "+roost.maxHealth;
        ctx.save();ctx.textAlign="center";ctx.textBaseline="bottom";ctx.font="700 8px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.lineWidth=3;ctx.strokeStyle="rgba(2,6,8,.9)";ctx.strokeText(healthLabel,roost.x+recoilX,barY-3);
        ctx.fillStyle=roost.angry?"#ffb19d":"#efffd6";ctx.fillText(healthLabel,roost.x+recoilX,barY-3);
        ctx.fillStyle="rgba(2,6,8,.9)";ctx.fillRect(barX-2,barY-2,barW+4,barH+4);
        ctx.fillStyle="#401924";ctx.fillRect(barX,barY,barW,barH);
        ctx.fillStyle="#9cf63d";ctx.fillRect(barX,barY,barW*healthRatio,barH);
        if(hurtActive)drawHurtNumber(roost.x+recoilX,barY-16-hurtProgress*16,roost.lastDamage,hurtProgress,"#f4ffb0");
        drawHuntMark(roost.x+recoilX,barY-26,now,currentHuntTarget()===roost); // roostling keep HUNT + stroked hurt
        ctx.restore();
      }
    };
    const drawOtherWildlife=(now:number)=>{
      const map=mapRef.current;
      if(map===1){drawRoosts(now);return;}
      if(map===6){for(const wyrm of wyrmPack)drawWyrm(wyrm,now);return;}
      const pack=wildPackFor(map),card=wildCardFor(map);
      if(!pack||!card||map===2)return;
      const tint=beastTintFor(card.id),antlers=beastAntlersFor(card.id),tufts=beastTuftsFor(card.id),kind=beastKindFor(card.id);
      const renderSize=card.id===CINDER_FOX_CARD.id?FOX_RENDER_SIZE:card.id===PALE_STAG_CARD.id?STAG_RENDER_SIZE:card.id===EMBER_LYNX_CARD.id?LYNX_RENDER_SIZE:JACKAL_RENDER_SIZE;
      for(const beast of pack){
        if(beast.health<=0){
          const bearer=pack.find(entry=>entry.health<=0&&!isCombatOnlyBeast(entry.id));
          drawGroundBeastCardTransformation(beast,now,card,renderSize,tint??undefined,antlers,tufts,kind,beast===bearer);
          continue;
        }
        const elapsed=now-beast.modeStarted;
        const hurtActive=beast.hurtUntil>now;
        const hurtProgress=hurtActive?clamp((now-beast.hurtStarted)/480,0,1):1;
        const hurtPulse=hurtActive?Math.sin(hurtProgress*Math.PI):0;
        const recoilX=hurtPulse*10*beast.hitDirection;
        ctx.save();ctx.shadowColor=hurtActive?"rgba(255,220,140,.9)":beast.mode==="attack"?"rgba(255,170,70,.55)":beast.angry?"rgba(255,90,40,.5)":"rgba(240,138,58,.2)";ctx.shadowBlur=hurtActive?18:beast.angry?12:6;
        drawPixelJackal(beast.x+recoilX,beast.y,beast.groundY,beast.facing,beast.mode,elapsed,now,renderSize,hurtActive,{tint:tint??undefined,antlers,tufts,kind,gait:beast.gait,prevMode:beast.prevMode,modeBlendAt:beast.modeBlendAt});
        ctx.restore();
        const barW=78,barH=8,barX=beast.x+recoilX-barW/2,barY=beast.groundY-renderSize*.94;
        const healthRatio=clamp(beast.health/beast.maxHealth,0,1);
        const healthLabel=(beast.angry?"ANGRY  ":"")+card.name.toUpperCase()+"  "+beast.health+" / "+beast.maxHealth;
        const late=lateMapContactShade(map);
        ctx.save();
        ctx.textAlign="center";ctx.textBaseline="bottom";ctx.font="700 8px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.lineWidth=late?4:3;ctx.strokeStyle=late?"rgba(6,2,4,.96)":"rgba(20,8,4,.9)";ctx.strokeText(healthLabel,beast.x+recoilX,barY-3); // kiln lynx health keeps late stroke with HUNT
        ctx.fillStyle=beast.angry?"#ffb19d":"#ffe7c2";ctx.fillText(healthLabel,beast.x+recoilX,barY-3);
        ctx.fillStyle="rgba(20,8,4,.9)";ctx.fillRect(barX-2,barY-2,barW+4,barH+4);
        ctx.fillStyle="#4a1c14";ctx.fillRect(barX,barY,barW,barH);
        const healthGradient=ctx.createLinearGradient(barX,barY,barX+barW,barY);
        healthGradient.addColorStop(0,"#ffb347");healthGradient.addColorStop(1,"#e05a22");
        ctx.fillStyle=healthGradient;ctx.fillRect(barX,barY,barW*healthRatio,barH);
        ctx.strokeStyle="rgba(255,210,140,.7)";ctx.lineWidth=1;ctx.strokeRect(barX-.5,barY-.5,barW+1,barH+1);
        if(hurtActive)drawHurtNumber(beast.x+recoilX,barY-16-hurtProgress*18,beast.lastDamage,hurtProgress,"#ffe7a8");
        drawHuntMark(beast.x+recoilX,barY-26,now,currentHuntTarget()===beast); // fox/stag/lynx keep HUNT + stroked hurt
        ctx.restore();
      }
    };
    const drawNpcs=(now:number)=>{
      const map=mapRef.current,pl=player.current;
      for(const npc of NPCS){
        if(npc.map!==map)continue;
        const bob=Math.sin(now*.0026+npc.x*.01)*2.2,groundY=surfaceYAt(map,npc.x,590)??590,x=npc.x,y=groundY-2+bob;
        const near=Math.abs(pl.x-npc.x)<npc.talkRadius;
        const cloakDark=mixHex(npc.palette.cloak,8,6,12,.38);
        const cloakLight=mixHex(npc.palette.cloak,230,236,255,.34);
        const skinShade=mixHex(npc.palette.skin,40,24,18,.32);
        const skinLit=mixHex(npc.palette.skin,255,236,214,.28);
        ctx.save();
        const contact=ctx.createRadialGradient(x+2,groundY+3,1,x+2,groundY+3,28);
        contact.addColorStop(0,"rgba(2,4,8,.58)");contact.addColorStop(.5,"rgba(2,4,8,.2)");contact.addColorStop(1,"rgba(2,4,8,0)");
        ctx.fillStyle=contact;ctx.beginPath();ctx.ellipse(x+2,groundY+3,26,7,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="rgba(2,4,5,.55)";ctx.beginPath();ctx.ellipse(x,groundY+2,16,4.2,0,0,Math.PI*2);ctx.fill();
        const glow=ctx.createRadialGradient(x-6,y-54,3,x,y-30,62);
        glow.addColorStop(0,rgbaFromHex(npc.palette.accent,.28));glow.addColorStop(1,rgbaFromHex(npc.palette.accent,0));
        ctx.fillStyle=glow;ctx.fillRect(x-62,y-92,124,114);
        ctx.translate(x,y);
        ctx.fillStyle=cloakDark;ctx.beginPath();ctx.moveTo(-15,2);ctx.quadraticCurveTo(-19,-38,-12,-56);ctx.lineTo(12,-56);ctx.quadraticCurveTo(18,-38,14,2);ctx.closePath();ctx.fill();
        ctx.fillStyle=npc.palette.cloak;ctx.beginPath();ctx.moveTo(-12,0);ctx.quadraticCurveTo(-16,-40,-9,-55);ctx.lineTo(9,-55);ctx.quadraticCurveTo(15,-40,11,0);ctx.closePath();ctx.fill();
        ctx.fillStyle=cloakLight;ctx.beginPath();ctx.moveTo(-11,-8);ctx.quadraticCurveTo(-13,-36,-8,-52);ctx.lineTo(-3,-52);ctx.quadraticCurveTo(-7,-30,-6,-6);ctx.closePath();ctx.fill();
        ctx.fillStyle=mixHex(npc.palette.cloak,12,10,16,.5);ctx.fillRect(-7,0,6,8);ctx.fillRect(2,0,6,8);
        ctx.fillStyle=npc.palette.trim;ctx.fillRect(-13,-8,26,4);
        ctx.fillStyle=mixHex(npc.palette.trim,255,230,200,.28);ctx.fillRect(-13,-8,26,1.5);
        ctx.fillStyle=npc.palette.accent;ctx.beginPath();ctx.ellipse(-1,-50,3.6,3.6,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=rgbaFromHex(npc.palette.accent,.45);ctx.beginPath();ctx.ellipse(-2,-51,1.6,1.4,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=skinShade;ctx.beginPath();ctx.ellipse(1,-63,10,11,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=npc.palette.skin;ctx.beginPath();ctx.ellipse(-1,-64,9.2,10.4,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=skinLit;ctx.beginPath();ctx.ellipse(-3,-67,4.2,3.4,0,0,Math.PI*2);ctx.fill();
        if(npc.helm){
          ctx.fillStyle=mixHex(npc.palette.trim,20,24,32,.28);ctx.beginPath();ctx.ellipse(1,-69,11.4,8.2,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle=npc.palette.trim;ctx.beginPath();ctx.ellipse(0,-70,11,8,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle=cloakLight;ctx.beginPath();ctx.ellipse(-4,-73,4,2.2,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle=npc.palette.cloak;ctx.fillRect(-11,-70,22,5);
          ctx.fillStyle="rgba(8,10,16,.72)";ctx.fillRect(-8,-66,16,4);
          ctx.fillStyle=npc.palette.accent;ctx.fillRect(10,-28,3,18);
          ctx.fillStyle=rgbaFromHex(npc.palette.accent,.5);ctx.fillRect(10,-28,1.4,18);
        }else{
          ctx.fillStyle=cloakDark;ctx.beginPath();ctx.ellipse(1,-70,11.4,7.2,0,0,Math.PI);ctx.fill();
          ctx.fillStyle=npc.palette.cloak;ctx.beginPath();ctx.ellipse(0,-71,11,7,0,0,Math.PI);ctx.fill();
          ctx.fillStyle=cloakLight;ctx.beginPath();ctx.ellipse(-4,-73,4.5,2.4,0,0,Math.PI);ctx.fill();
        }
        ctx.fillStyle="#160e0a";ctx.beginPath();ctx.ellipse(-4,-65,1.4,1.8,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(4,-65,1.4,1.8,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="rgba(255,255,255,.28)";ctx.beginPath();ctx.ellipse(-4.5,-65.8,.5,.6,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(3.5,-65.8,.5,.6,0,0,Math.PI*2);ctx.fill();
        ctx.restore();
        ctx.save();ctx.globalAlpha=near?(.55+Math.sin(now*.005)*.18):.32;ctx.fillStyle=npc.palette.accent;ctx.font="900 8px ui-monospace, SFMono-Regular, Menlo, monospace";ctx.textAlign="center";ctx.fillText(npc.name.toUpperCase(),x,y-100);ctx.restore();
      }
    };
    const drawKilnMouth=(x:number,groundY:number,now:number,scale:number,labeled:boolean)=>{
      const pulse=.5+Math.sin(now*.0018+x*.01)*.22;
      ctx.save();
      const glow=ctx.createRadialGradient(x,groundY-48*scale,6,x,groundY-48*scale,140*scale);
      glow.addColorStop(0,"rgba(255,140,80,"+(.14+pulse*.12)+")");glow.addColorStop(1,"rgba(255,140,80,0)");
      ctx.fillStyle=glow;ctx.fillRect(x-160*scale,groundY-180*scale,320*scale,200*scale);
      ctx.fillStyle="#2a140e";ctx.fillRect(x-28*scale,groundY-62*scale,56*scale,62*scale);
      ctx.fillStyle="#4a2418";ctx.fillRect(x-32*scale,groundY-70*scale,64*scale,10*scale);
      ctx.fillStyle="#1a0c08";ctx.beginPath();ctx.ellipse(x,groundY-28*scale,16*scale,18*scale,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="rgba(255,150,70,"+(.4+pulse*.4)+")";ctx.beginPath();ctx.ellipse(x,groundY-28*scale,10*scale,12*scale,0,0,Math.PI*2);ctx.fill();
      for(let i=0;i<6;i++){
        const sparkY=groundY-40*scale-((now*.04+i*37)%(90*scale));
        ctx.fillStyle="rgba(255,170,90,"+(.2+i*.08)+")";ctx.fillRect(x-6*scale+(i%3)*5*scale,sparkY,2*scale,3*scale);
      }
      if(labeled)drawLateStudyableTag(x,groundY-78*scale,"KILN");
      ctx.restore();
    };
    const drawQuietKiln=(now:number)=>{
      if(mapRef.current!==5)return;
      drawKilnMouth(1420,570,now,.72,false);
      drawKilnMouth(MAP5_KILN_X,590,now,1,true);
      drawKilnMouth(3340,575,now,.78,false);
      drawKilnMouth(5120,560,now,.7,false);
    };
    const drawHeartRoadPulse=(now:number)=>{
      if(mapRef.current!==6)return;
      const x=MAP6_PULSE_X,groundY=surfaceYAt(6,x,590)??545;
      const bound=otherWildCollected.has(HEART_WYRM_CARD.id);
      const pulse=.4+Math.sin(now*.0024)*.22+(bound?.18:0);
      ctx.save();
      const glow=ctx.createRadialGradient(x,groundY-10,6,x,groundY-10,bound?150:110);
      glow.addColorStop(0,"rgba(212,90,106,"+(.16+pulse*.18)+")");glow.addColorStop(1,"rgba(212,90,106,0)");
      ctx.fillStyle=glow;ctx.fillRect(x-160,groundY-90,320,110);
      ctx.fillStyle="#1c0c14";ctx.beginPath();ctx.ellipse(x,groundY-3,36,9,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="rgba(224,120,150,"+(.28+pulse*.3)+")";ctx.beginPath();ctx.ellipse(x,groundY-5,24,5,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#341020";ctx.beginPath();ctx.moveTo(x-4,groundY-8);ctx.lineTo(x+18,groundY-16);ctx.lineTo(x-2,groundY-12);ctx.closePath();ctx.fill();
      ctx.fillStyle="rgba(255,180,196,"+(.4+pulse*.32)+")";ctx.beginPath();ctx.moveTo(x-2,groundY-9);ctx.lineTo(x+16,groundY-15);ctx.lineTo(x,groundY-11);ctx.closePath();ctx.fill();
      ctx.font="900 8px ui-monospace, SFMono-Regular, Menlo, monospace";ctx.textAlign="center";ctx.textBaseline="bottom";
      ctx.lineWidth=4;ctx.strokeStyle="rgba(6,2,4,.96)";ctx.strokeText(bound?"ALTAR EAST":"PULSE",x,groundY-28);
      ctx.fillStyle="#fff6d2";ctx.fillText(bound?"ALTAR EAST":"PULSE",x,groundY-28);
      ctx.restore();
    };
    const drawCooledVein=(now:number)=>{
      if(mapRef.current!==6)return;
      const x=MAP6_VEIN_X,groundY=545,pulse=.5+Math.sin(now*.002)*.24;
      ctx.save();
      const glow=ctx.createRadialGradient(x,groundY-8,8,x,groundY-8,130);
      glow.addColorStop(0,"rgba(212,90,106,"+(.2+pulse*.16)+")");glow.addColorStop(1,"rgba(212,90,106,0)");
      ctx.fillStyle=glow;ctx.fillRect(x-150,groundY-90,300,120);
      ctx.fillStyle="#1c0c14";ctx.beginPath();ctx.ellipse(x,groundY-4,58,14,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="rgba(224,120,150,"+(.3+pulse*.28)+")";ctx.beginPath();ctx.ellipse(x,groundY-6,42,8,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#341020";ctx.fillRect(x-3,groundY-18,6,22);
      ctx.fillStyle="rgba(255,180,196,"+(.4+pulse*.3)+")";ctx.fillRect(x-2,groundY-16,4,18);
      drawLateStudyableTag(x,groundY-36,"VEIN");
      ctx.restore();
    };
    const drawHeartColumns=(now:number,viewW:number)=>{
      if(mapRef.current!==6)return;
      for(let i=0;i<17;i++){
        const tx=240+i*430;
        if(tx<cameraX-80||tx>cameraX+viewW+80)continue;
        const sway=Math.sin(now*.0007+i)*2;
        ctx.fillStyle="#1a0c14";ctx.fillRect(tx+sway,210,18,380);
        ctx.fillStyle="#2a1420";ctx.fillRect(tx-8+sway,200,34,18);
        ctx.fillStyle="rgba(212,90,106,"+(.08+Math.max(0,Math.sin(now*.0018+i))*.12)+")";ctx.fillRect(tx+6+sway,280,4,90);
      }
    };
    const drawMoonwell=(now:number)=>{
      if(mapRef.current!==4)return;
      const x=MAP4_MOONWELL_X,groundY=575,pulse=.45+Math.sin(now*.0014)*.2;
      ctx.save();
      const glow=ctx.createRadialGradient(x,groundY-8,8,x,groundY-8,120);
      glow.addColorStop(0,"rgba(142,231,255,"+(.2+pulse*.16)+")");glow.addColorStop(1,"rgba(142,231,255,0)");
      ctx.fillStyle=glow;ctx.fillRect(x-140,groundY-90,280,120);
      ctx.fillStyle="#163040";ctx.beginPath();ctx.ellipse(x,groundY-6,54,16,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="rgba(180,240,255,"+(.28+pulse*.22)+")";ctx.beginPath();ctx.ellipse(x,groundY-8,44,11,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="rgba(215,251,255,.5)";ctx.fillRect(x-18,groundY-10,28,3);
      ctx.globalAlpha=.32+pulse*.18;ctx.fillStyle="#d7fbff";ctx.font="900 8px ui-monospace, SFMono-Regular, Menlo, monospace";ctx.textAlign="center";
      ctx.fillText("MOONWELL",x,groundY-36);
      ctx.restore();
    };
    const drawAshTrees=(now:number,viewW:number)=>{
      if(mapRef.current!==3)return;
      for(let i=0;i<24;i++){
        const tx=180+i*270;
        if(tx<cameraX-80||tx>cameraX+viewW+80)continue;
        const sway=Math.sin(now*.0008+i)*4;
        ctx.fillStyle="#1a100c";ctx.fillRect(tx,430,10,160);
        ctx.strokeStyle="rgba(12,8,6,.9)";ctx.lineWidth=4;
        ctx.beginPath();ctx.moveTo(tx+5,470);ctx.lineTo(tx-18+sway,430);ctx.moveTo(tx+5,490);ctx.lineTo(tx+26+sway,440);ctx.stroke();
        ctx.fillStyle="rgba(255,110,40,"+(.12+Math.max(0,Math.sin(now*.002+i))*.18)+")";ctx.fillRect(tx-4,578,18,6);
      }
    };
    const drawAshfallHeartAltar=(now:number)=>{
      if(mapRef.current!==6)return;
      const x=MAP6_ALTAR_X,groundY=545,pulse=.5+Math.sin(now*.0022)*.28;
      ctx.save();
      const glow=ctx.createRadialGradient(x,groundY-70,6,x,groundY-70,190);
      glow.addColorStop(0,"rgba(212,90,106,"+(.24+pulse*.14)+")");glow.addColorStop(1,"rgba(212,90,106,0)");
      ctx.fillStyle=glow;ctx.fillRect(x-220,groundY-260,440,280);
      ctx.fillStyle="#1c0c14";ctx.fillRect(x-26,groundY-38,52,38);
      ctx.fillStyle="#3a1824";ctx.fillRect(x-20,groundY-46,40,10);
      ctx.save();ctx.translate(x,groundY-66);ctx.scale(1+pulse*.05,1+pulse*.05);
      ctx.fillStyle="rgba(255,150,170,"+(.55+pulse*.35)+")";ctx.shadowColor="#ffb0c0";ctx.shadowBlur=22;
      ctx.beginPath();ctx.moveTo(0,-13);ctx.bezierCurveTo(9,-24,20,-6,0,10);ctx.bezierCurveTo(-20,-6,-9,-24,0,-13);ctx.fill();
      ctx.restore();
      ctx.restore();
    };
    const drawPixelPlatform=(p:Platform,now:number,map:MapId)=>{
      const ledge=p.h<=24;
      const depth=Math.min(p.h,ledge?24:150);
      const body=ctx.createLinearGradient(0,p.y,0,p.y+depth);
      if(map===1){body.addColorStop(0,"#3c485a");body.addColorStop(.1,"#263244");body.addColorStop(.5,"#151d2a");body.addColorStop(1,"#080c13");}
      else if(map===3){body.addColorStop(0,"#5a3a28");body.addColorStop(.14,"#3e2418");body.addColorStop(.58,"#24140e");body.addColorStop(1,"#120c0a");}
      else if(map===4){body.addColorStop(0,"#4a6574");body.addColorStop(.14,"#2a4450");body.addColorStop(.58,"#162830");body.addColorStop(1,"#0a1418");}
      else if(map===5){body.addColorStop(0,"#4a2418");body.addColorStop(.14,"#341810");body.addColorStop(.58,"#1e0f0c");body.addColorStop(1,"#0e0808");}
      else if(map===6){body.addColorStop(0,"#3a2030");body.addColorStop(.14,"#281422");body.addColorStop(.58,"#180c18");body.addColorStop(1,"#0c0610");}
      else{body.addColorStop(0,"#d89a59");body.addColorStop(.14,"#b77346");body.addColorStop(.58,"#764937");body.addColorStop(1,"#342b2d");}
      ctx.fillStyle=body;ctx.fillRect(p.x,p.y,p.w,p.h);

      const capTop=map===1?"#71869e":map===3?"#c07040":map===4?"#8ee7ff":map===5?"#ff8a4a":map===6?"#e06888":"#ffd18a";
      const capMid=map===1?"#46566b":map===3?"#8a4a28":map===4?"#4a7a88":map===5?"#c8541e":map===6?"#a83a5a":"#e6a866";
      ctx.fillStyle=capTop;ctx.fillRect(p.x,p.y,p.w,3);
      ctx.fillStyle=capMid;ctx.fillRect(p.x,p.y+3,p.w,5);
      for(let tx=p.x+8;tx<p.x+p.w;tx+=32){
        const seed=Math.floor(tx/8)+Math.floor(p.y);
        const capW=10+(seed%4)*4;
        ctx.fillStyle=map===1?(seed%3===0?"#92a5ba":seed%3===1?"#61758c":"#52657b"):map===3?(seed%3===0?"#d08050":seed%3===1?"#a05830":"#7a3c20"):map===4?(seed%3===0?"#b8e8f0":seed%3===1?"#6a90a0":"#3a6070"):map===5?(seed%3===0?"#ff9c5a":seed%3===1?"#e0703a":"#c05828"):map===6?(seed%3===0?"#e888a8":seed%3===1?"#c86888":"#a84c70"):(seed%3===0?"#ffe1a3":seed%3===1?"#eebb75":"#d99758");
        ctx.fillRect(tx,p.y-2-(seed%3),capW,3+(seed%2));
      }

      if(!ledge){
        for(let tx=p.x+9;tx<p.x+p.w-8;tx+=38){
          const seed=Math.floor(tx/19)+Math.floor(p.y/10);
          const row=(seed%3)*22;
          const rockY=p.y+14+row;
          const rockW=20+(seed%5)*5;
          ctx.fillStyle=map===1?(seed%4===0?"#33445a":seed%4===1?"#243247":"#1c2839"):map===3?(seed%4===0?"#5a3018":seed%4===1?"#3e2010":"#24140c"):map===4?(seed%4===0?"#2a4450":seed%4===1?"#1c3038":"#101c24"):map===5?(seed%4===0?"#5a2c18":seed%4===1?"#3e1c10":"#2a140c"):map===6?(seed%4===0?"#4a2038":seed%4===1?"#341828":"#20101c"):(seed%4===0?"#c68350":seed%4===1?"#a86642":"#8e563d");
          ctx.fillRect(tx,rockY,Math.min(rockW,p.x+p.w-tx),9+(seed%3)*3);
          ctx.fillStyle=map===1?"rgba(139,163,188,.16)":map===3?"rgba(255,140,80,.16)":map===4?"rgba(142,231,255,.2)":map===5?"rgba(255,140,80,.22)":map===6?"rgba(224,120,160,.2)":"rgba(255,223,164,.18)";ctx.fillRect(tx,rockY,Math.min(rockW-5,p.x+p.w-tx),2);
        }
        for(let tx=p.x+27;tx<p.x+p.w;tx+=79){
          const crack=13+(Math.floor(tx/11)%4)*5;
          ctx.fillStyle=map===1?"rgba(3,7,13,.76)":map===3?"rgba(80,30,16,.7)":map===4?"rgba(8,20,28,.7)":map===5?"rgba(255,110,40,"+(.32+Math.max(0,Math.sin(now*.002+tx*.02))*.22)+")":map===6?"rgba(212,90,106,"+(.28+Math.max(0,Math.sin(now*.002+tx*.02))*.2)+")":"rgba(91,51,42,.46)";ctx.fillRect(tx,p.y+35,3,crack);
          ctx.fillRect(tx+3,p.y+35+crack-3,7,3);
        }
        const shimmer=.1+Math.max(0,Math.sin(now*.0014+p.x*.01))*.08;
        ctx.fillStyle=map===1?"rgba(113,139,165,"+shimmer+")":map===3?"rgba(255,140,80,"+(shimmer+.05)+")":map===4?"rgba(142,231,255,"+(shimmer+.08)+")":map===5?"rgba(255,150,90,"+(shimmer+.08)+")":map===6?"rgba(224,120,150,"+(shimmer+.06)+")":"rgba(255,218,145,"+(shimmer+.05)+")";ctx.fillRect(p.x,p.y+9,p.w,3);
      }
    };
    const drawRegionalScenery=(now:number,viewW:number,map:MapId)=>{
      const props=SCENERY_PROP_XS;
      for(let i=0;i<props.length;i++){const x=props[i];if(x>worldWidthFor(map)-90||x<cameraX-120||x>cameraX+viewW+120)continue;const ground=surfaceYAt(map,x,590);if(ground===null)continue;ctx.save();ctx.translate(x,ground);
        if(map===1){if(i%3===0){ctx.strokeStyle="rgba(61,82,96,.82)";ctx.lineWidth=3;for(let b=-3;b<=3;b++){const sway=Math.sin(now*.0025+x*.04+b)*5;ctx.beginPath();ctx.moveTo(b*5,0);ctx.quadraticCurveTo(b*5+sway*.2,-12,b*5+sway,-20-Math.abs(b)*2);ctx.stroke();}}else{const rock=ctx.createLinearGradient(-25,-48,22,0);rock.addColorStop(0,"#71869e");rock.addColorStop(.45,"#3c485a");rock.addColorStop(1,"#151d2a");ctx.fillStyle=rock;ctx.beginPath();ctx.moveTo(-28,0);ctx.lineTo(-20,-26);ctx.lineTo(-6,-40);ctx.lineTo(14,-34);ctx.lineTo(26,-12);ctx.lineTo(22,0);ctx.closePath();ctx.fill();ctx.fillStyle="rgba(156,202,199,.22)";ctx.fillRect(-10,-20,12,3);}}
        else if(map===2){if(i%3===0){ctx.strokeStyle="rgba(94,76,48,.85)";ctx.lineWidth=3;for(let b=-3;b<=3;b++){const sway=Math.sin(now*.0028+x*.01+b)*4;ctx.beginPath();ctx.moveTo(b*5,0);ctx.quadraticCurveTo(b*5+sway*.3,-18,b*5+sway,-36-Math.abs(b)*2);ctx.stroke();}}else{const rock=ctx.createLinearGradient(-25,-48,22,0);rock.addColorStop(0,"#d49a68");rock.addColorStop(.45,"#85584d");rock.addColorStop(1,"#403236");ctx.fillStyle=rock;ctx.beginPath();ctx.moveTo(-30,0);ctx.lineTo(-23,-28);ctx.lineTo(-7,-45);ctx.lineTo(17,-37);ctx.lineTo(29,-13);ctx.lineTo(24,0);ctx.closePath();ctx.fill();}}
        else if(map===3){ctx.fillStyle="#1b0d08";ctx.fillRect(-7,-68,14,68);ctx.strokeStyle="#2d160d";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(0,-48);ctx.lineTo(-25,-78);ctx.moveTo(1,-40);ctx.lineTo(28,-66);ctx.stroke();ctx.fillStyle="rgba(255,104,40,.22)";ctx.fillRect(-9,-3,18,3);}
        else if(map===4){ctx.fillStyle="#294856";ctx.beginPath();ctx.moveTo(-22,0);ctx.lineTo(-9,-72);ctx.lineTo(0,-95);ctx.lineTo(11,-66);ctx.lineTo(22,0);ctx.closePath();ctx.fill();ctx.fillStyle="rgba(142,231,255,.35)";ctx.beginPath();ctx.moveTo(-4,-88);ctx.lineTo(0,-95);ctx.lineTo(5,-66);ctx.lineTo(1,-38);ctx.closePath();ctx.fill();}
        else if(map===5){ctx.fillStyle="#2b130d";ctx.fillRect(-29,-52,58,52);ctx.fillStyle="#4b2416";ctx.fillRect(-34,-60,68,12);ctx.fillStyle="rgba(255,130,62,"+(.25+Math.max(0,Math.sin(now*.003+i))*.2)+")";ctx.beginPath();ctx.ellipse(0,-25,10,15,0,0,Math.PI*2);ctx.fill();}
        else{ctx.strokeStyle="#321426";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(-30,0);ctx.quadraticCurveTo(-5,-75,0,-92);ctx.quadraticCurveTo(9,-62,32,0);ctx.stroke();ctx.strokeStyle="rgba(224,110,150,.28)";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-26,-2);ctx.quadraticCurveTo(-3,-68,0,-85);ctx.stroke();}
        ctx.restore();
      }
      const eastProps=map===5?MAP5_EAST_SCENERY_XS:map===6?MAP6_EAST_SCENERY_XS:null;
      if(eastProps){
        for(let i=0;i<eastProps.length;i++){
          const x=eastProps[i];
          if(x<cameraX-120||x>cameraX+viewW+120)continue;
          const ground=surfaceYAt(map,x,590);if(ground===null)continue;
          ctx.save();ctx.translate(x,ground);
          if(map===5){
            ctx.fillStyle="#2b130d";ctx.fillRect(-18,-40,36,40);
            ctx.fillStyle="#4b2416";ctx.fillRect(-22,-46,44,10);
            ctx.fillStyle="rgba(255,130,62,"+(.22+Math.max(0,Math.sin(now*.003+x))*.18)+")";
            ctx.beginPath();ctx.ellipse(0,-18,8,12,0,0,Math.PI*2);ctx.fill();
          }else{
            ctx.fillStyle="#2a1420";ctx.beginPath();ctx.moveTo(-16,0);ctx.lineTo(-8,-36);ctx.lineTo(2,-48);ctx.lineTo(14,-28);ctx.lineTo(16,0);ctx.closePath();ctx.fill();
            ctx.fillStyle="rgba(224,120,150,"+(.22+Math.max(0,Math.sin(now*.0028+x))*.16)+")";ctx.fillRect(-2,-32,4,22);
          }
          ctx.restore();
        }
      }
    };
    const drawPortal=(x:number,groundY:number,now:number,map:MapId,colorOverride?:string,label?:string)=>{
      const cx=x+55,cy=groundY-91,pulse=.34+Math.sin(now*.0022)*.1;
      const portalColor=colorOverride??(map===1?"116,230,226":"255,185,104");
      const glow=ctx.createRadialGradient(cx,cy,4,cx,cy,185);glow.addColorStop(0,"rgba("+portalColor+","+pulse+")");glow.addColorStop(1,"rgba("+portalColor+",0)");ctx.fillStyle=glow;ctx.fillRect(cx-205,cy-205,410,410);
      ctx.fillStyle=map===1?"#061214":"#241521";ctx.fillRect(x,groundY-180,110,180);
      ctx.strokeStyle="rgba("+portalColor+",.86)";ctx.lineWidth=4;ctx.strokeRect(x+10,groundY-168,90,168);
      ctx.shadowColor=map===1?"#74e6e2":"#ffb968";ctx.shadowBlur=25;ctx.strokeRect(x+18,groundY-160,74,160);ctx.shadowBlur=0;
      ctx.fillStyle="rgba("+portalColor+","+(.12+Math.sin(now*.003)*.04)+")";ctx.fillRect(x+22,groundY-156,66,154);
      for(let i=0;i<6;i++){
        const sy=groundY-150+((now*.035+i*29)%138);
        ctx.fillStyle="rgba("+portalColor+","+(.28+i*.045)+")";ctx.fillRect(x+29+(i*13)%46,sy,4+(i%2)*3,2);
      }
      if(label){
        const late=lateMapContactShade(map);
        ctx.save();ctx.textAlign="center";ctx.textBaseline="bottom";
        ctx.font="900 11px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.lineWidth=late?5:4;ctx.strokeStyle=late?"rgba(6,2,4,.96)":"rgba(6,8,10,.88)";ctx.strokeText(label,cx,groundY-188);
        ctx.fillStyle="#fff6d2";ctx.fillText(label,cx,groundY-188); // early-map west/east tags keep cream fill after #48/#50 late stroke
        ctx.font="900 8px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.lineWidth=late?5:4;ctx.strokeStyle=late?"rgba(6,2,4,.96)":"rgba(6,8,10,.88)";
        ctx.strokeText("PRESS E",cx,groundY-174); // maps 5–6 entry/exit keep #52 cream fill + late stroke with nearPortalAt
        ctx.fillStyle="#fff6d2";ctx.fillText("PRESS E",cx,groundY-174);
        ctx.restore();
      }
    };
    const drawSecrets=(now:number)=>{
      const map=mapRef.current;
      const pulse=.45+Math.sin(now*.002)*.2;
      const marks=LANDMARKS.filter(mark=>mark.map===map&&mark.kind!=="kiln"&&mark.kind!=="vein"&&mark.kind!=="moonwell");
      for(const mark of marks){
        const x=mark.x,groundY=mark.groundY;
        ctx.save();
        if(mark.kind==="plaque"){
          const glow=ctx.createRadialGradient(x,groundY-24,4,x,groundY-24,70);
          glow.addColorStop(0,"rgba(116,230,226,"+(.16+pulse*.12)+")");glow.addColorStop(1,"rgba(116,230,226,0)");
          ctx.fillStyle=glow;ctx.fillRect(x-80,groundY-90,160,100);
          ctx.fillStyle="#2a3848";ctx.fillRect(x-16,groundY-52,32,52);
          ctx.fillStyle="#71869e";ctx.fillRect(x-18,groundY-58,36,8);
          ctx.fillStyle="rgba(200,220,230,.35)";ctx.fillRect(x-10,groundY-44,20,3);ctx.fillRect(x-10,groundY-36,16,3);ctx.fillRect(x-10,groundY-28,18,3);
          ctx.globalAlpha=.34+pulse*.16;ctx.fillStyle="#c8e4ff";ctx.font="900 8px ui-monospace, SFMono-Regular, Menlo, monospace";ctx.textAlign="center";ctx.fillText("PLAQUE",x,groundY-66);
        }else if(mark.kind==="groove"){
          const glow=ctx.createRadialGradient(x,groundY-6,4,x,groundY-6,70);
          glow.addColorStop(0,"rgba(116,230,226,"+(.14+pulse*.1)+")");glow.addColorStop(1,"rgba(116,230,226,0)");
          ctx.fillStyle=glow;ctx.fillRect(x-90,groundY-50,180,70);
          ctx.fillStyle="#151d2a";ctx.beginPath();ctx.ellipse(x,groundY-2,48,7,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle="rgba(156,202,199,"+(.28+pulse*.22)+")";ctx.fillRect(x-40,groundY-4,80,3);
          ctx.globalAlpha=.34+pulse*.16;ctx.fillStyle="#c8e4ff";ctx.font="900 8px ui-monospace, SFMono-Regular, Menlo, monospace";ctx.textAlign="center";ctx.fillText("GROOVE",x,groundY-22);
        }else if(mark.kind==="shell"){
          const glow=ctx.createRadialGradient(x,groundY-10,4,x,groundY-10,54);
          glow.addColorStop(0,"rgba(255,210,122,"+(.2+pulse*.14)+")");glow.addColorStop(1,"rgba(255,210,122,0)");
          ctx.fillStyle=glow;ctx.fillRect(x-60,groundY-60,120,70);
          ctx.fillStyle="#d49a68";ctx.beginPath();ctx.ellipse(x,groundY-8,16,10, -.2,0,Math.PI*2);ctx.fill();
          ctx.fillStyle="#ffe1a3";ctx.beginPath();ctx.ellipse(x+3,groundY-10,8,5,-.2,0,Math.PI*2);ctx.fill();
          ctx.globalAlpha=.5+pulse*.25;ctx.fillStyle="#ffd27a";ctx.font="900 11px ui-monospace, SFMono-Regular, Menlo, monospace";ctx.textAlign="center";ctx.fillText("SHELL",x,groundY-32);
        }else if(mark.kind==="post"){
          const glow=ctx.createRadialGradient(x,groundY-28,4,x,groundY-28,64);
          glow.addColorStop(0,"rgba(255,210,122,"+(.16+pulse*.12)+")");glow.addColorStop(1,"rgba(255,210,122,0)");
          ctx.fillStyle=glow;ctx.fillRect(x-70,groundY-80,140,90);
          ctx.fillStyle="#5a3a28";ctx.fillRect(x-5,groundY-54,10,54);
          ctx.fillStyle="#d49a68";ctx.fillRect(x-14,groundY-62,28,10);
          ctx.fillStyle="#ffe1a3";ctx.fillRect(x-8,groundY-48,3,8);ctx.fillRect(x-2,groundY-48,3,8);ctx.fillRect(x+4,groundY-48,3,8);
          ctx.globalAlpha=.5+pulse*.25;ctx.fillStyle="#ffd27a";ctx.font="900 11px ui-monospace, SFMono-Regular, Menlo, monospace";ctx.textAlign="center";ctx.fillText("POST",x,groundY-72);
        }else if(mark.kind==="hollow"){
          ctx.fillStyle="#1b0d08";ctx.fillRect(x-9,groundY-38,18,38);
          ctx.fillStyle="rgba(255,104,40,"+(.22+pulse*.2)+")";ctx.beginPath();ctx.ellipse(x,groundY-40,14,10,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle="rgba(255,170,90,"+(.3+pulse*.25)+")";ctx.beginPath();ctx.ellipse(x,groundY-42,7,5,0,0,Math.PI*2);ctx.fill();
          ctx.globalAlpha=.5+pulse*.25;ctx.fillStyle="#ffc08a";ctx.font="900 11px ui-monospace, SFMono-Regular, Menlo, monospace";ctx.textAlign="center";ctx.fillText("HOLLOW",x,groundY-60);
        }else if(mark.kind==="cairn"){
          ctx.fillStyle="#2a140e";ctx.beginPath();ctx.moveTo(x-18,groundY);ctx.lineTo(x-10,groundY-28);ctx.lineTo(x+4,groundY-22);ctx.lineTo(x+16,groundY);ctx.closePath();ctx.fill();
          ctx.fillStyle="#3e2010";ctx.beginPath();ctx.moveTo(x-6,groundY-18);ctx.lineTo(x+2,groundY-46);ctx.lineTo(x+12,groundY-16);ctx.closePath();ctx.fill();
          ctx.fillStyle="rgba(255,140,80,"+(.28+pulse*.2)+")";ctx.fillRect(x-1,groundY-40,3,18);
          ctx.globalAlpha=.5+pulse*.25;ctx.fillStyle="#ffc08a";ctx.font="900 11px ui-monospace, SFMono-Regular, Menlo, monospace";ctx.textAlign="center";ctx.fillText("CAIRN",x,groundY-56);
        }else if(mark.kind==="notch"){
          const glow=ctx.createRadialGradient(x,groundY-18,4,x,groundY-18,70);
          glow.addColorStop(0,"rgba(142,231,255,"+(.16+pulse*.12)+")");glow.addColorStop(1,"rgba(142,231,255,0)");
          ctx.fillStyle=glow;ctx.fillRect(x-80,groundY-80,160,90);
          ctx.fillStyle="#294856";ctx.beginPath();ctx.moveTo(x-22,groundY);ctx.lineTo(x-8,groundY-36);ctx.lineTo(x+6,groundY-28);ctx.lineTo(x+20,groundY);ctx.closePath();ctx.fill();
          ctx.fillStyle="rgba(142,231,255,"+(.3+pulse*.22)+")";ctx.fillRect(x-10,groundY-22,8,3);
          ctx.globalAlpha=.34+pulse*.16;ctx.fillStyle="#d7fbff";ctx.font="900 8px ui-monospace, SFMono-Regular, Menlo, monospace";ctx.textAlign="center";ctx.fillText("NOTCH",x,groundY-48);
        }else if(mark.kind==="coal"){
          ctx.fillStyle="#2b130d";ctx.fillRect(x-22,groundY-16,44,16);
          ctx.fillStyle="rgba(255,130,62,"+(.28+pulse*.22)+")";ctx.beginPath();ctx.ellipse(x,groundY-18,12,8,0,0,Math.PI*2);ctx.fill();
          for(let i=0;i<5;i++){
            const sparkY=groundY-22-((now*.045+i*29)%48);
            ctx.fillStyle="rgba(255,170,90,"+(.18+i*.08)+")";ctx.fillRect(x-6+(i%3)*5,sparkY,2,3);
          }
          drawLateStudyableTag(x,groundY-36,"COAL");
        }else if(mark.kind==="bellows"){
          ctx.fillStyle="#2b130d";ctx.fillRect(x-24,groundY-28,48,28);
          ctx.fillStyle="#4b2416";ctx.fillRect(x-28,groundY-34,56,8);
          ctx.fillStyle="rgba(255,130,62,"+(.22+pulse*.18)+")";ctx.beginPath();ctx.ellipse(x,groundY-14,8,10,0,0,Math.PI*2);ctx.fill();
          drawLateStudyableTag(x,groundY-46,"BELLOWS");
        }else if(mark.kind==="echo"){
          ctx.fillStyle="#2a1420";ctx.beginPath();ctx.moveTo(x-14,groundY);ctx.lineTo(x-8,groundY-46);ctx.lineTo(x+2,groundY-58);ctx.lineTo(x+12,groundY-40);ctx.lineTo(x+16,groundY);ctx.closePath();ctx.fill();
          ctx.fillStyle="rgba(224,120,150,"+(.28+pulse*.22)+")";ctx.fillRect(x-2,groundY-44,4,28);
          drawLateStudyableTag(x,groundY-68,"ECHO");
        }else if(mark.kind==="step"){
          ctx.fillStyle="#281422";ctx.fillRect(x-26,groundY-10,52,10);
          ctx.fillStyle="#3a2030";ctx.fillRect(x-22,groundY-16,44,6);
          ctx.fillStyle="rgba(224,120,150,"+(.24+pulse*.2)+")";ctx.fillRect(x-12,groundY-14,24,3);
          drawLateStudyableTag(x,groundY-28,"STEP");
        }else if(mark.kind==="merlon"){
          const glow=ctx.createRadialGradient(x,groundY-24,4,x,groundY-24,70);
          glow.addColorStop(0,"rgba(116,230,226,"+(.16+pulse*.12)+")");glow.addColorStop(1,"rgba(116,230,226,0)");
          ctx.fillStyle=glow;ctx.fillRect(x-80,groundY-90,160,100);
          ctx.fillStyle="#2a3848";ctx.fillRect(x-18,groundY-48,36,48);
          ctx.fillStyle="#71869e";ctx.fillRect(x-22,groundY-56,14,10);ctx.fillRect(x+8,groundY-56,14,10);
          ctx.fillStyle="rgba(200,220,230,.35)";ctx.fillRect(x-8,groundY-36,16,3);
          ctx.globalAlpha=.34+pulse*.16;ctx.fillStyle="#c8e4ff";ctx.font="900 8px ui-monospace, SFMono-Regular, Menlo, monospace";ctx.textAlign="center";ctx.fillText("MERLON",x,groundY-66);
        }else if(mark.kind==="tide"){
          const glow=ctx.createRadialGradient(x,groundY-10,4,x,groundY-10,54);
          glow.addColorStop(0,"rgba(255,210,122,"+(.2+pulse*.14)+")");glow.addColorStop(1,"rgba(255,210,122,0)");
          ctx.fillStyle=glow;ctx.fillRect(x-60,groundY-60,120,70);
          ctx.fillStyle="#85584d";ctx.fillRect(x-22,groundY-12,44,12);
          ctx.fillStyle="#d49a68";ctx.fillRect(x-16,groundY-18,32,6);
          ctx.fillStyle="#ffe1a3";ctx.fillRect(x-10,groundY-8,20,3);
          ctx.globalAlpha=.5+pulse*.25;ctx.fillStyle="#ffd27a";ctx.font="900 11px ui-monospace, SFMono-Regular, Menlo, monospace";ctx.textAlign="center";ctx.fillText("TIDE",x,groundY-32);
        }else if(mark.kind==="nest"){
          ctx.fillStyle="#1b0d08";ctx.beginPath();ctx.ellipse(x,groundY-6,20,8,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle="#3e2010";ctx.beginPath();ctx.ellipse(x,groundY-10,14,6,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle="rgba(255,104,40,"+(.22+pulse*.2)+")";ctx.beginPath();ctx.ellipse(x,groundY-14,7,5,0,0,Math.PI*2);ctx.fill();
          ctx.globalAlpha=.5+pulse*.25;ctx.fillStyle="#ffc08a";ctx.font="900 11px ui-monospace, SFMono-Regular, Menlo, monospace";ctx.textAlign="center";ctx.fillText("NEST",x,groundY-36);
        }else if(mark.kind==="lichen"){
          const glow=ctx.createRadialGradient(x,groundY-12,4,x,groundY-12,60);
          glow.addColorStop(0,"rgba(142,231,255,"+(.18+pulse*.12)+")");glow.addColorStop(1,"rgba(142,231,255,0)");
          ctx.fillStyle=glow;ctx.fillRect(x-70,groundY-70,140,80);
          ctx.fillStyle="#294856";ctx.beginPath();ctx.ellipse(x,groundY-4,18,7,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle="rgba(142,231,255,"+(.32+pulse*.22)+")";ctx.beginPath();ctx.ellipse(x+2,groundY-8,10,5,0,0,Math.PI*2);ctx.fill();
          ctx.globalAlpha=.34+pulse*.16;ctx.fillStyle="#d7fbff";ctx.font="900 8px ui-monospace, SFMono-Regular, Menlo, monospace";ctx.textAlign="center";ctx.fillText("LICHEN",x,groundY-28);
        }
        ctx.restore();
      }
    };
    const drawWorld=(w:number,h:number,scale:number,now:number)=>{
      ctx.save();ctx.scale(scale,scale);ctx.translate(-cameraX,0);
      const viewW=w/scale,map=mapRef.current,activePlatforms=platformsFor(map);
      const portalGround=(x:number)=>surfaceYAt(map,x+55,590)??590;
      for(const p of activePlatforms){
        if(p.x+p.w<cameraX-100||p.x>cameraX+viewW+100)continue;
        drawPixelPlatform(p,now,map);
      }
      drawRegionalScenery(now,viewW,map);
      if(map===1){
        drawPortal(MAP1_PORTAL_X,portalGround(MAP1_PORTAL_X),now,map,undefined,"EAST · SHORE");
        ctx.strokeStyle="rgba(61,82,96,.78)";ctx.lineWidth=3;
        for(let gx=90;gx<MAP1_W;gx+=57){
          const surface=activePlatforms.find(p=>gx>p.x&&gx<p.x+p.w&&p.h>80)?.y;
          if(!surface||gx<cameraX-80||gx>cameraX+viewW+80)continue;
          const sway=Math.sin(now*.0025+gx*.04)*7;
          ctx.beginPath();ctx.moveTo(gx,surface);ctx.quadraticCurveTo(gx+sway*.2,surface-10,gx+sway,surface-20-(gx%13));ctx.stroke();
        }
        ctx.strokeStyle="rgba(156,202,199,.28)";ctx.lineWidth=1.5;
        for(let i=0;i<28;i++){
          const rx=180+(i*247)%(MAP1_W-400);
          const surface=activePlatforms.find(p=>rx>p.x&&rx<p.x+p.w&&p.h>80)?.y;
          if(!surface||rx<cameraX-100||rx>cameraX+viewW+100)continue;
          const phase=(now*.055+i*17)%70,alpha=1-phase/70;
          ctx.globalAlpha=alpha*.65;ctx.beginPath();ctx.ellipse(rx,surface+3,phase*.34,phase*.08,0,0,Math.PI*2);ctx.stroke();
        }
        ctx.globalAlpha=1;
        for(const m of motes){
          if(m.x<cameraX-40||m.x>cameraX+viewW+40)continue;
          const a=.22+.32*Math.sin(now*.0015+m.p);ctx.fillStyle="rgba(116,230,226,"+a+")";ctx.beginPath();ctx.arc(m.x,m.y+Math.sin(m.p+now*.001)*14,2.1,0,Math.PI*2);ctx.fill();
        }
      }else if(map===2){
        drawPortal(MAP2_PORTAL_X,portalGround(MAP2_PORTAL_X),now,map,undefined,"WEST · RAIN");
        drawPortal(MAP2_EXIT_X,portalGround(MAP2_EXIT_X),now,map,undefined,"EAST · HOLLOW");
        for(let sx=430;sx<MAP2_W;sx+=173){
          const twinkle=.18+Math.max(0,Math.sin(now*.0021+sx*.01))*.4;
          const surface=surfaceYAt(2,sx,590)??590;ctx.fillStyle="rgba(255,226,165,"+twinkle+")";ctx.fillRect(sx,surface-8-(sx%3),5+(sx%4),2);
        }
        for(let i=0;i<36;i++){
          const mx=(i*271)%MAP2_W,my=250+(i*83)%240;
          if(mx<cameraX-40||mx>cameraX+viewW+40)continue;
          ctx.fillStyle="rgba(255,214,140,"+(.12+Math.max(0,Math.sin(now*.0018+i))*.26)+")";ctx.beginPath();ctx.arc(mx,my+Math.sin(now*.001+i)*10,1.8,0,Math.PI*2);ctx.fill();
        }
      }else if(map===3){
        drawAshTrees(now,viewW);
        drawPortal(MAP3_ENTRY_X,portalGround(MAP3_ENTRY_X),now,map,"255,140,80","WEST · SHORE");
        drawPortal(MAP3_EXIT_X,portalGround(MAP3_EXIT_X),now,map,"255,140,80","EAST · CLIFFS");
        for(let i=0;i<36;i++){
          const ax=((i*197+now*.03*(1+(i%3)))%(MAP3_W+200))-80;
          const ay=590-((now*.02*(1+i%4)+i*83)%480);
          ctx.fillStyle="rgba(210,150,110,"+(.12+Math.max(0,Math.sin(now*.0016+i))*.26)+")";ctx.fillRect(ax,ay,2,3);
        }
      }else if(map===4){
        drawMoonwell(now);
        drawPortal(MAP4_ENTRY_X,portalGround(MAP4_ENTRY_X),now,map,"142,231,255","WEST · HOLLOW");
        drawPortal(MAP4_EXIT_X,portalGround(MAP4_EXIT_X),now,map,"142,231,255","EAST · EMBER");
        for(let sx=380;sx<MAP4_W;sx+=190){
          const twinkle=.14+Math.max(0,Math.sin(now*.0018+sx*.01))*.3;
          ctx.fillStyle="rgba(142,231,255,"+twinkle+")";ctx.fillRect(sx,538-(sx%4),4,2);
        }
        for(let i=0;i<32;i++){
          const mx=(i*263)%MAP4_W,my=240+(i*79)%220;
          if(mx<cameraX-40||mx>cameraX+viewW+40)continue;
          ctx.fillStyle="rgba(180,236,255,"+(.12+Math.max(0,Math.sin(now*.0017+i))*.28)+")";ctx.beginPath();ctx.arc(mx,my+Math.sin(now*.001+i)*12,1.7,0,Math.PI*2);ctx.fill();
        }
      }else if(map===5){
        drawQuietKiln(now);
        drawPortal(MAP5_ENTRY_X,portalGround(MAP5_ENTRY_X),now,map,"255,140,80","WEST · CLIFFS");
        drawPortal(MAP5_EXIT_X,portalGround(MAP5_EXIT_X),now,map,"255,140,80","EAST · HEART");
        for(let i=0;i<40;i++){
          const ex=((i*211+now*.04*(1+(i%3)))%(MAP5_W+220))-110;
          const ey=590-((now*.03*(1+i%4)+i*97)%520);
          const alpha=.18+Math.max(0,Math.sin(now*.0018+i))*.32;
          ctx.fillStyle="rgba(255,138,74,"+alpha+")";ctx.fillRect(ex,ey,2+(i%3),2+(i%2));
        }
        for(let sx=430;sx<MAP5_W;sx+=173){
          const twinkle=.14+Math.max(0,Math.sin(now*.002+sx*.012))*.28;
          ctx.fillStyle="rgba(255,150,90,"+twinkle+")";ctx.fillRect(sx,586-(sx%3),4+(sx%3),2);
        }
      }else if(map===6){
        drawHeartColumns(now,viewW);
        drawCooledVein(now);
        drawHeartRoadPulse(now);
        drawPortal(MAP6_ENTRY_X,portalGround(MAP6_ENTRY_X),now,map,"212,90,106","WEST · EMBER");
        drawAshfallHeartAltar(now);
        const heartPulse=.2+Math.sin(now*.0016)*.12;
        ctx.save();ctx.globalCompositeOperation="screen";
        const hglow=ctx.createRadialGradient(MAP6_HEART_X,220,20,MAP6_HEART_X,220,520);
        hglow.addColorStop(0,"rgba(212,90,106,"+heartPulse+")");hglow.addColorStop(1,"rgba(212,90,106,0)");
        ctx.fillStyle=hglow;ctx.fillRect(MAP6_HEART_X-520,0,1040,WORLD_H);
        ctx.restore();
        for(let i=0;i<40;i++){
          const ex=((i*233+now*.035*(1+(i%3)))%(MAP6_W+220))-110;
          const ey=590-((now*.028*(1+i%4)+i*101)%520);
          const alpha=.16+Math.max(0,Math.sin(now*.002+i))*.3;
          ctx.fillStyle="rgba(224,120,150,"+alpha+")";ctx.fillRect(ex,ey,2+(i%3),2+(i%2));
        }
      }
      ctx.globalAlpha=1;
      drawSecrets(now);
      if(portalFlashUntil.current>now){ctx.fillStyle="rgba(255,244,214,"+((portalFlashUntil.current-now)/430*.18)+")";ctx.fillRect(cameraX,0,viewW,WORLD_H);}
      drawDragon(now);drawJackals(now);drawOtherWildlife(now);drawNpcs(now);drawCompanion(now);
      drawPlayer(player.current,now);ctx.restore();
    };
    const frame=(now:number)=>{
      const dt=Math.min((now-last)/1000,.032);last=now;const w=canvas.clientWidth,h=canvas.clientHeight,scale=Math.max(w/1280,h/WORLD_H),pl=player.current,map=mapRef.current,activeWorldW=worldWidthFor(map);
      const hudProgress=Math.round(clamp(pl.x/activeWorldW*100,0,100));if(map!==lastHudMap||lastMapProgress<0||Math.abs(hudProgress-lastMapProgress)>=2){if(map!==lastHudMap){const hud=hudLockFor(map,inventoryRef.current.map(item=>item.id),campaignEndedRef.current);setMapNumber(map);setObjective(hud.objective);}lastHudMap=map;lastMapProgress=hudProgress;setMapProgress(hudProgress);}
      if(actionUntil.current<=now)activeAttackDamage.current=0;
      if(pl.health!==lastHealth){lastHealth=pl.health;setHealth(pl.health);}
      if(startedRef.current&&staminaRef.current<MAX_STAMINA&&now-staminaUsedAt.current>=STAMINA_REGEN_DELAY){staminaRef.current=Math.min(MAX_STAMINA,staminaRef.current+STAMINA_REGEN_PER_SECOND*dt);}
      const displayedStamina=Math.round(staminaRef.current);
      if(displayedStamina!==lastStamina){lastStamina=displayedStamina;setStamina(displayedStamina);}
      if(startedRef.current&&!dialogueRef.current&&!inventoryOpenRef.current&&!worldMapOpenRef.current&&playerRespawnAt===0){
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
        pl.vy+=1180*dt;const oldBottom=pl.y+PH;const nextX=clamp(pl.x+pl.vx*dt,PLAYER_EDGE_MARGIN,activeWorldW-PLAYER_EDGE_MARGIN);if(!pl.grounded||groundAt(nextX,oldBottom)<Infinity)pl.x=nextX;pl.y+=pl.vy*dt;const newBottom=pl.y+PH,ground=groundAt(pl.x,oldBottom);
        if(pl.vy>=0&&ground<Infinity&&oldBottom<=ground+STEP_HEIGHT&&newBottom>=ground){pl.y=ground-PH;pl.vy=0;pl.grounded=true;pl.jumpsLeft=2;}else{pl.grounded=false;pl.crouched=false;pl.sliding=false;slideUntil.current=0;}
        if(wasGrounded&&!didJump&&!pl.grounded)pl.jumpsLeft=Math.min(pl.jumpsLeft,1);
        if(pl.y>WORLD_H+80){const floor=plantedFloorAt(map,Math.max(120,pl.x-180));pl.x=floor.x;pl.y=plantedYAt(map,floor.x);pl.vy=0;pl.grounded=true;pl.jumpsLeft=2;pl.crouched=false;pl.sliding=false;slideUntil.current=0;}pl.step+=Math.abs(pl.vx)*dt*.048;
      }else{pl.vx*=.82;pl.crouched=false;pl.sliding=false;slideUntil.current=0;}
      const castState=companionCastRef.current;
      const castDuration=castState.kind==="recall"?COMPANION_RECALL_DURATION:COMPANION_SUMMON_DURATION;
      if(castState.kind&&now-castState.started<castDuration)pl.facing=castState.direction;
      updateDragon(dt,now);updateJackals(dt,now);
      if(deployQueued.current){
        const itemId=equippedRef.current[selectedSlotRef.current];
        const item=itemId?inventoryRef.current.find(entry=>entry.id===itemId):null;
        const ally=companionRef.current;
        if(item?.type==="animal-card"){
          if(ally.active&&ally.itemId===item.id){
            if(ally.recallStarted===0){const direction:1|-1=ally.x>=pl.x?1:-1;ally.recallStarted=now;ally.attackUntil=0;ally.vx=0;companionCastRef.current={started:now,kind:"recall",direction};pl.facing=direction;tone(470,.16,.022);window.setTimeout(()=>tone(280,.22,.024),180);window.setTimeout(()=>tone(135,.34,.022),610);}
            else{
              ally.recallStarted=0;
              const summonX=creatureEdgeAt(map,pl.x+pl.facing*COMPANION_DEPLOY_DISTANCE);
              const summonFloor=plantedFloorAt(map,summonX);
              const summonGround=companionSurfaceAt(summonFloor.x,pl.y+PH,map)??surfaceYAt(map,summonFloor.x,pl.y+PH)??summonFloor.groundY;
              ally.x=creatureEdgeAt(map,summonFloor.x);ally.groundY=summonGround;ally.y=summonGround;ally.vx=0;ally.facing=pl.facing;
              keepCreatureOnRoad(ally,map);
              if(ally.y>ally.groundY)ally.y=ally.groundY;
              const direction:1|-1=summonX>=pl.x?1:-1;companionCastRef.current={started:now,kind:"summon",direction};pl.facing=direction;setDeployedItemId(item.id);tone(330,.18,.024);window.setTimeout(()=>tone(620,.22,.022),170);window.setTimeout(()=>tone(940,.28,.02),420);
            }
          }else{
            const summonX=creatureEdgeAt(map,pl.x+pl.facing*COMPANION_DEPLOY_DISTANCE);
            const summonFloor=plantedFloorAt(map,summonX);
            const summonGround=companionSurfaceAt(summonFloor.x,pl.y+PH,map)??surfaceYAt(map,summonFloor.x,pl.y+PH)??summonFloor.groundY;
            ally.active=true;ally.itemId=item.id;ally.map=map;ally.x=creatureEdgeAt(map,summonFloor.x);ally.groundY=summonGround;ally.y=summonGround;ally.vx=0;ally.facing=pl.facing;ally.prevMode="idle";ally.modeBlendAt=now;ally.gait=0;ally.mode="idle";ally.modeStarted=now;ally.summonedAt=now;ally.recallStarted=0;ally.teleportAt=0;ally.attackUntil=0;ally.attackLanded=false;ally.lastPlayerAttack=actionStartedAt.current;
            keepCreatureOnRoad(ally,map);
            if(ally.y>ally.groundY)ally.y=ally.groundY;
            ally.maxHealth=cardStats(item.id).hp;ally.health=ally.maxHealth;
            const direction:1|-1=summonX>=pl.x?1:-1;companionCastRef.current={started:now,kind:"summon",direction};pl.facing=direction;setDeployedItemId(item.id);tone(330,.18,.024);window.setTimeout(()=>tone(620,.22,.022),170);window.setTimeout(()=>tone(940,.28,.02),420);
          }
        }
        deployQueued.current=false;
      }
      updateCompanion(dt,now);
      const cardReady=map===1&&dragon.health<=0&&!dragonCardCollected&&now-dragon.modeStarted>900;
      const dragonFloor=plantedFloorAt(1,dragon.x);
      const nearDragonCard=cardReady&&Math.abs(pl.x-dragonFloor.x)<105&&Math.abs((pl.y+PH)-dragonFloor.groundY)<85;
      const readyJackal=map===2?jackals.find(jackal=>{
        const card=JACKAL_CARD_BY_BEAST[jackal.id];
        const floor=plantedFloorAt(2,jackal.x);
        return Boolean(card)&&!jackalCardsCollected.has(card.id)&&jackal.health<=0&&now-jackal.modeStarted>900&&Math.abs(pl.x-floor.x)<105&&Math.abs((pl.y+PH)-floor.groundY)<85;
      }):undefined;
      const otherWildCard=map>=3&&map<=6?wildCardFor(map):null;
      const readyOtherWild=otherWildCard&&!otherWildCollected.has(otherWildCard.id)?wildPackFor(map)?.find(beast=>{
        const floor=plantedFloorAt(map,beast.x);
        return beast.health<=0&&!isCombatOnlyBeast(beast.id)&&now-beast.modeStarted>900&&Math.abs(pl.x-floor.x)<115&&Math.abs((pl.y+PH)-floor.groundY)<95;
      }):undefined;
      if(pickupQueued.current){
        if(nearDragonCard&&collectInventoryItem(BABY_DRAGON_CARD)){
          dragonCardCollected=true;toggleEquippedItem(BABY_DRAGON_CARD.id);
          setObjective(hudLockFor(map,inventoryRef.current.map(item=>item.id),campaignEndedRef.current).objective);
          tone(760,.16,.025);window.setTimeout(()=>tone(1040,.22,.018),90);
        }else if(readyJackal){
          const jackalCard=JACKAL_CARD_BY_BEAST[readyJackal.id];
          if(jackalCard&&collectInventoryItem(jackalCard)){
            jackalCardsCollected.add(jackalCard.id);toggleEquippedItem(jackalCard.id);
            setObjective(hudLockFor(map,inventoryRef.current.map(item=>item.id),campaignEndedRef.current).objective);
            tone(640,.16,.024);window.setTimeout(()=>tone(980,.22,.018),90);
          }
        }else if(readyOtherWild&&otherWildCard&&collectInventoryItem(otherWildCard)){
          otherWildCollected.add(otherWildCard.id);toggleEquippedItem(otherWildCard.id);
          setObjective(hudLockFor(map,inventoryRef.current.map(item=>item.id),campaignEndedRef.current).objective);
          tone(660,.16,.024);window.setTimeout(()=>tone(1000,.22,.018),90);
        }
        pickupQueued.current=false;
      }
      const viewW=w/scale;
      const cameraTarget=cameraXFor(pl.x,activeWorldW,viewW);
      if(cameraReset.current){cameraX=cameraTarget;cameraReset.current=false;}else cameraX+=(cameraTarget-cameraX)*Math.min(1,dt*3.8);
      cameraXRef.current=cameraX;renderScaleRef.current=scale;
      if(pointerAim.current.active){
        const aimWorldX=cameraX+pointerAim.current.x/scale,aimWorldY=pointerAim.current.y/scale;
        aimAngle.current=Math.atan2(aimWorldY-(pl.y+34),aimWorldX-pl.x);
      }
      let action="";
      let promptAt:{x:number;y:number}|null=null;
      if(!dialogueRef.current){
        const nearTalk=talkTargetAt(map,pl.x,pl.y+PH);
        const nearNpc=nearTalk.npc;
        const nearLandmark=nearTalk.landmark;
        if(nearDragonCard){action=inventoryRef.current.length>=INVENTORY_CAPACITY?"Inventory full":"Pick up Baby Dragon card";promptAt={x:dragonFloor.x,y:dragonFloor.groundY};}
        else if(readyJackal){action=inventoryRef.current.length>=INVENTORY_CAPACITY?"Inventory full":"Pick up Sunset Jackal card";const floor=plantedFloorAt(2,readyJackal.x);promptAt={x:floor.x,y:floor.groundY};}
        else if(readyOtherWild&&otherWildCard){action=inventoryRef.current.length>=INVENTORY_CAPACITY?"Inventory full":"Pick up "+otherWildCard.name+" card";const floor=plantedFloorAt(map,readyOtherWild.x);promptAt={x:floor.x,y:floor.groundY};}
        else if(nearNpc)action="Talk to "+nearNpc.name;
        else if(nearLandmark)action=nearLandmark.action;
        else if(map===1&&nearPortalAt(pl.x,MAP1_PORTAL_X))action="Enter Sunset Shore";
        else if(map===2&&nearPortalAt(pl.x,MAP2_PORTAL_X))action="Return to The Signal in the Rain";
        else if(map===2&&nearPortalAt(pl.x,MAP2_EXIT_X))action="Enter Ash Hollow";
        else if(map===3&&nearPortalAt(pl.x,MAP3_ENTRY_X))action="Return to Sunset Shore";
        else if(map===3&&nearPortalAt(pl.x,MAP3_EXIT_X))action="Enter Moonwell Cliffs";
        else if(map===4&&nearPortalAt(pl.x,MAP4_ENTRY_X))action="Return to Ash Hollow";
        else if(map===4&&nearPortalAt(pl.x,MAP4_EXIT_X))action="Enter The Quiet Ember";
        else if(map===5&&nearPortalAt(pl.x,MAP5_ENTRY_X))action="Return to Moonwell Cliffs";
        else if(map===5&&nearPortalAt(pl.x,MAP5_EXIT_X))action="Enter Ashfall's Heart";
        else if(map===6&&nearPortalAt(pl.x,MAP6_ENTRY_X))action="Return to The Quiet Ember";
        else if(map===6&&atHeartAltar(pl.x))action=campaignEndedRef.current?"Rest at Ashfall's Heart":"Press E at Ashfall's Heart"; // altar prompt still wins after #56 Dell/Rowan walk-out
      }
      if(action!==lastAction){lastAction=action;setNearAction(action||null);}
      const nextAnchor=promptAt?{left:Math.round(clamp((promptAt.x-cameraX)*scale,78,w-78)),bottom:Math.round(clamp(h-(promptAt.y-88)*scale,96,h*.58))}:null;
      const nextLeft=nextAnchor?.left??-1,nextBottom=nextAnchor?.bottom??-1;
      if(nextLeft!==lastPromptLeft||nextBottom!==lastPromptBottom){lastPromptLeft=nextLeft;lastPromptBottom=nextBottom;setPromptAnchor(nextAnchor);}
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
  },[collectInventoryItem,setObjective,toggleEquippedItem,tone]);

  const touch=useCallback((key:string,value:boolean,e:React.PointerEvent)=>{e.preventDefault();keys.current[key]=value;if(key==="w"&&value&&!dialogueRef.current)jumpQueued.current=true;if(key==="s"&&value&&!dialogueRef.current)slideQueued.current=true;},[]);
  const toggleSound=()=>{soundRef.current=!soundRef.current;setSoundOn(soundRef.current);if(soundRef.current)tone(520,.16,.025);};

  return <main className="game-shell" aria-label="Echoes of Ashfall game">
    <canvas ref={canvasRef} className="game-canvas" data-sword-damage={SWORD_DAMAGE} aria-label={`${PLAYER_NAME} in a playable side-scrolling world. Move the cursor to aim and left click to attack for ${SWORD_DAMAGE} damage. Four rapid sword attacks are available before stamina must recover.`} onPointerDown={(e)=>{if(e.button===0){e.preventDefault();updateAim(e.clientX,e.clientY);attack();}}}/>
    <div className="vignette"/><div className="film-grain"/>
    <div className="topbar">
      <div className="hud-left">
        <div className="health-hud">
          <p className="player-name">{PLAYER_NAME}</p>
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
              <span>{index+1}</span>{item?<i className={"quick-card-thumb"+cardThumbClass(item)} style={{backgroundImage:`url(${item.image})`,borderColor:item.palette.accent}}/>:<i className="quick-empty"/>}
            </button>;
          })}
          <small><b>1–5</b> Select · <b>Q</b> Deploy</small>
        </div>
        <div className="chapter-mark"><span className="chapter-line"/><div><p className="eyebrow">Map {mapNumber}</p><p className="chapter-name">{MAP_STORY[mapNumber].name}</p></div></div>
      </div>
      {started&&<div className="objective"><p className="objective-label">Current objective</p><p className="objective-copy">{objective}</p></div>}
    </div>
    {started&&<button className="world-map-button" onClick={toggleWorldMap} aria-label="Open Ashfall world map"><MapIcon size={16}/><span>World Map</span><kbd>M</kbd></button>}
    {worldMapOpen&&<section className="world-map-screen" role="dialog" aria-modal="true" aria-label="Ashfall world map"><div className="world-map-panel">
      <header className="world-map-header"><div><p>Exploration map</p><h2>Ashfall</h2><small>The road reveals itself only as you reach it.</small></div><button onClick={toggleWorldMap} aria-label="Close world map"><X size={18}/><span>Close</span></button></header>
      <div className="world-map-route">{([1,2,3,4,5,6] as MapId[]).map((id)=>{const revealed=unlockedMaps.includes(id);const highest=Math.max(...unlockedMaps);const frontier=!revealed&&id===highest+1;if(!revealed&&!frontier)return null;return <div className="world-map-stop-wrap" key={id}>{id>1&&<span className={"world-map-link "+(revealed?"open":"locked")}/>} {revealed?<article className={"world-map-region map-theme-"+id+" "+(mapNumber===id?"current":"")}><span className="world-map-number">{String(id).padStart(2,"0")}</span><div className="world-map-region-copy"><p>Map {id}</p><h3>{MAP_STORY[id].name}</h3></div>{mapNumber===id&&<span className="world-map-player" style={{left:clamp(mapProgress,7,93)+"%"}}><i/><b>You</b></span>}</article>:<article className="world-map-region world-map-fog"><LockKeyhole size={25}/><strong>Unknown region</strong><small>Reach the next gate to reveal this part of Ashfall.</small></article>}</div>;})}</div>
      <footer className="world-map-footer"><span>Current location</span><strong>Map {mapNumber} · {MAP_STORY[mapNumber].name} · {objective} · {mapProgress}% across</strong><small>Press M to close</small></footer>
    </div></section>}
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
            const item=inventory.find(entry=>entry.id===itemId);
            return <button key={index} className={"active-slot "+(item?"filled ":"")+(index===selectedSlot?"selected":"")} onClick={()=>selectUsableSlot(index)} aria-pressed={index===selectedSlot} aria-label={item?`Select slot ${index+1}, ${item.name}`:`Select empty usable slot ${index+1}`}>
              <span className="slot-number">{index+1}</span>
              {item?<><span className={"inventory-card-thumb"+cardThumbClass(item)} style={{backgroundImage:`url(${item.image})`,borderColor:item.palette.accent,boxShadow:`0 0 16px ${item.palette.accent}55`}}/><strong>{item.name}</strong></>:<span className="empty-mark">+</span>}
            </button>;
          })}
        </div>
        <div className="inventory-section-title"><span>Collected items</span><small>Click an item to equip or unequip it</small></div>
        <div className="inventory-grid">
          {Array.from({length:INVENTORY_CAPACITY},(_,index)=>{
            const item=inventory[index];
            const isEquipped=Boolean(item&&equipped.includes(item.id));
            return <button key={index} className={"inventory-slot "+(item?"filled ":"")+(isEquipped?"equipped":"")} onClick={()=>item&&toggleEquippedItem(item.id)} aria-pressed={isEquipped} aria-label={item?`${item.name}, ${isEquipped?"equipped":"stored"}`:`Empty inventory slot ${index+1}`}>
              <span className="slot-number">{index+1}</span>
              {item&&<><span className={"inventory-card-thumb"+cardThumbClass(item)} style={{backgroundImage:`url(${item.image})`,borderColor:item.palette.accent,boxShadow:`0 0 16px ${item.palette.accent}55`}}/><strong>{item.name}</strong><small>{isEquipped?"Usable":"Stored"}</small></>}
            </button>;
          })}
        </div>
        <p className="inventory-help">Press <b>1–5</b> to select a usable slot, then <b>Q</b> to deploy or recall it. A late bind swaps onto the selected slot if all five are full. Defeated animals become cards; press <b>E</b> nearby to collect them.</p>
      </div>
    </section>}
    {dialogue&&<div className="dialogue-wrap"><div className="dialogue-box" onClick={advanceDialogue}><p className="speaker">{dialogue[dialogueIndex]?.speaker}</p><p className="dialogue-text">{dialogue[dialogueIndex]?.text}</p><p className="continue-hint">Click or press E to continue</p></div></div>}
    {campaignEnded&&!dialogue&&<section className="title-screen" aria-live="polite"><div className="title-card"><p className="title-kicker">The road ends here</p><h1 className="game-title">Echoes<br/>of Ashfall<span>Chapter Six — Ashfall&apos;s Heart</span></h1><p className="start-hint">The echo is still. Moon Night carried the signal home. Thank you for playing.</p></div></section>}
    {nearAction&&<div className={"interaction"+(promptAnchor?" near-card":"")} style={promptAnchor?{left:promptAnchor.left,bottom:promptAnchor.bottom}:undefined}><span className="keycap">E</span>{nearAction}</div>}
    <div className="controls"><span><b>A D</b> Move</span><span><b>W / Space ×2</b> Double jump</span><span><b>S</b> Crouch / slide</span><span><b>Shift</b> Run</span><span><b>Mouse 1</b> Attack</span><span><b>E</b> Interact</span><span><b>1–5 + Q</b> Select / deploy</span><span><b>Tab</b> Inventory</span><span><b>M</b> World map</span></div>
    <button className="sound-button" onClick={toggleSound} aria-label={soundOn?"Mute sound":"Turn sound on"}>{soundOn?<Volume2 size={16}/>:<VolumeX size={16}/>}</button>
    <div className="touch-controls" aria-label="Touch controls">
      <div className="touch-group"><button className="touch-btn" aria-label="Move left" onPointerDown={(e)=>touch("a",true,e)} onPointerUp={(e)=>touch("a",false,e)} onPointerCancel={(e)=>touch("a",false,e)}>←</button><button className="touch-btn" aria-label="Move right" onPointerDown={(e)=>touch("d",true,e)} onPointerUp={(e)=>touch("d",false,e)} onPointerCancel={(e)=>touch("d",false,e)}>→</button></div>
      <div className="touch-group"><button className="touch-btn attack" aria-label="Sword attack" onPointerDown={(e)=>{e.preventDefault();attack();}}>⚔</button><button className="touch-btn action" aria-label="Interact" onClick={()=>{pickupQueued.current=true;interact();}}>E</button><button className="touch-btn action" aria-label="Crouch or slide" onPointerDown={(e)=>touch("s",true,e)} onPointerUp={(e)=>touch("s",false,e)} onPointerCancel={(e)=>touch("s",false,e)}>↓</button><button className="touch-btn" aria-label="Jump" onPointerDown={(e)=>touch("w",true,e)} onPointerUp={(e)=>touch("w",false,e)} onPointerCancel={(e)=>touch("w",false,e)}>↑</button></div>
    </div>
  </main>;
}
