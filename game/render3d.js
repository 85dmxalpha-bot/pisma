// 3D-отрисовка боя (Three.js + модели KayKit, CC0).
// Симуляция остаётся в index.html (координаты в пикселях 540x960); здесь только картинка.
import * as THREE from 'three';
import { GLTFLoader } from './lib/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from './lib/jsm/utils/SkeletonUtils.js';

const K = 1/30;                       // 1 пиксель симуляции = 1/30 единицы сцены
const wx = x => (x - 270) * K;
const wz = y => (y - 480) * K;

// Персонажи: модель, рост (в единицах сцены), оружие, анимации
const CH = {
  skeleton:{ model:'warrior', h:1.45, r:'blade', l:'shield_small_a', walk:'Walking_D_Skeletons', idle:'Idle_Combat', atk:'1H_Melee_Attack_Chop', ring:.4 },
  necro:   { model:'mage',    h:1.6,  r:'staff', walk:'Walking_A', idle:'Idle', atk:'Spellcast_Shoot', cast:'Spellcast_Summon', ring:.42 },
  frost:   { model:'rogue',   h:1.55, r:'staff', walk:'Walking_A', idle:'Idle', atk:'Spellcast_Shoot', ring:.42, tint:[.75,.9,1.15] },
  boss:    { model:'warrior', h:2.6,  r:'axe', l:'shield_large_a', walk:'Walking_D_Skeletons', idle:'Idle_Combat', atk:'2H_Melee_Attack_Chop', ring:.72 },
  worker:  { model:'minion',  h:1.1,  r:'axe', walk:'Walking_A', idle:'Idle', atk:'1H_Melee_Attack_Chop', ring:.3 }
};
// Здания: модель и ширина в пикселях симуляции
const BLD = { castle:['castle',104], tower:['tower_a',46], crypt:['barracks',62], frosttower:['tower_b',46], necrotower:['church',58], lair:['blacksmith',66], mine:['mine',62] };
const COLOR = ['green','red'];

export async function createRenderer(canvas, onProgress){
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d3440);
  scene.fog = new THREE.Fog(0x0d3440, 40, 75);

  const camera = new THREE.PerspectiveCamera(30, 540/960, 1, 150);
  const CAM_POS = new THREE.Vector3(0, 47, 21), CAM_LOOK = new THREE.Vector3(0, 0, 1.6);
  camera.position.copy(CAM_POS); camera.lookAt(CAM_LOOK);

  scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x3b3222, 1.25));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
  sun.position.set(-9, 22, 10); sun.target.position.set(0,0,0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left:-12, right:12, top:19, bottom:-19, near:1, far:60 });
  sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  // ---------- Остров ----------
  const tex = (()=>{
    const c = document.createElement('canvas'); c.width = 1024; c.height = 1820;
    const g = c.getContext('2d'); g.scale(1024/540, 1820/960);
    paintGround(g, false);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  })();
  const fan = (pts, y, uv) => {
    const n = pts.length, pos = [0,y,0], uvs = [.5,.5], idx = [];
    const cx = 270, cy = 480;
    pos[0] = wx(cx); pos[2] = wz(cy);
    for (const [x,yy] of pts){ pos.push(wx(x), y, wz(yy)); uvs.push(x/540, 1-yy/960); }
    for (let i=0;i<n;i++) idx.push(0, 1+((i+1)%n), 1+i);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
    if (uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs,2));
    geo.setIndex(idx); geo.computeVertexNormals();
    return geo;
  };
  const top = new THREE.Mesh(fan(islandPts(0), 0, true), new THREE.MeshStandardMaterial({ map:tex, roughness:1 }));
  top.receiveShadow = true; scene.add(top);
  // скалы по краю
  {
    const a = islandPts(0), b = islandPts(9), pos = [], idx = [];
    const n = a.length;
    a.forEach(([x,y],i)=>{ pos.push(wx(x),0,wz(y)); pos.push(wx(b[i][0]),-1.4,wz(b[i][1])); });
    for (let i=0;i<n;i++){ const j=(i+1)%n; idx.push(i*2, j*2, i*2+1, j*2, j*2+1, i*2+1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color:0x8a7348, roughness:1, side:THREE.DoubleSide }));
    m.receiveShadow = true; scene.add(m);
  }
  const water = new THREE.Mesh(new THREE.PlaneGeometry(160,160), new THREE.MeshStandardMaterial({ color:0x1a5a68, roughness:.35, metalness:.1 }));
  water.rotation.x = -Math.PI/2; water.position.y = -.55; water.receiveShadow = true; scene.add(water);
  const shallow = new THREE.Mesh(fan(islandPts(46), -.5, false), new THREE.MeshBasicMaterial({ color:0x3aa3a3, transparent:true, opacity:.35, depthWrite:false }));
  scene.add(shallow);
  const foamMat = new THREE.LineBasicMaterial({ color:0xe8fbff, transparent:true, opacity:.45 });
  const foam = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(islandPts(12).map(([x,y])=>new THREE.Vector3(wx(x),-.46,wz(y)))), foamMat);
  scene.add(foam);

  // ---------- Загрузка моделей ----------
  const loader = new GLTFLoader();
  const files = [
    ...['warrior','mage','rogue','minion'].map(n=>'sk_'+n),
    ...['blade','shield_small_a','staff','axe','shield_large_a'].map(n=>'w_'+n),
    ...COLOR.flatMap(c=>['castle','tower_a','church','tower_b','barracks','mine','blacksmith'].map(b=>`b_${b}_${c}`)),
    ...['tree_single_a','tree_single_b','rock_single_a','rock_single_c','rock_single_e','mountain_a_grass_trees','mountain_b','hills_a_trees'].map(n=>'n_'+n)
  ];
  const T = {}; let done = 0;
  await Promise.all(files.map(f => loader.loadAsync(`./assets/${f}.glb`).then(g=>{
    g.scene.traverse(o=>{ if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
    T[f] = g; done++; onProgress && onProgress(done/files.length);
  })));
  const size = obj => new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
  const charH = {}; for (const n of ['warrior','mage','rogue','minion']) charH[n] = 2.45; // рост модели в позе
  const place = (name, px, x, y, rot) => {
    const o = T[name].scene.clone(true);
    const s = (px*K) / Math.max(size(T[name].scene).x, .01);
    o.scale.setScalar(s); o.position.set(wx(x), 0, wz(y)); o.rotation.y = rot||0;
    scene.add(o); return o;
  };

  // декор
  const R = (()=>{ let a = 777; return ()=>{ a=(a*16807)%2147483647; return a/2147483647; }; })();
  for (const d of decorSpots()){
    if (d.kind==='tree') place(d.r<.5?'n_tree_single_a':'n_tree_single_b', 20+d.r*12, d.x, d.y, R()*6.28);
    else if (d.kind==='rock') place(['n_rock_single_a','n_rock_single_c','n_rock_single_e'][Math.floor(d.r*3)], 16+d.r*12, d.x, d.y, R()*6.28);
  }
  [[-14,-6,'n_mountain_a_grass_trees',150,.6],[14.5,8,'n_mountain_b',140,2],[-14.5,13,'n_hills_a_trees',150,1],[13.5,-14,'n_hills_a_trees',140,3]].forEach(([x,z,n,px,r])=>{
    const o = place(n, px, 270 + x/K, 480 + z/K, r); o.position.y = -.6;
  });
  // шахты
  [0,1].forEach(s=>{ const m = geo(s,GEO.mine); place(`b_mine_${COLOR[s]}`, BLD.mine[1], m.x, m.y, s? Math.PI : 0); });

  // ---------- Материалы стороны ----------
  const tintCache = new Map();
  const tintMat = (mat, side, extra) => {
    if (side===0 && !extra) return mat;
    const key = mat.uuid + side + (extra||'');
    if (!tintCache.has(key)){
      const m = mat.clone();
      const c = side===1 ? [1,.62,.58] : [1,1,1];
      const e = extra || [1,1,1];
      m.color.setRGB(m.color.r*c[0]*e[0], m.color.g*c[1]*e[1], m.color.b*c[2]*e[2]);
      tintCache.set(key, m);
    }
    return tintCache.get(key);
  };
  const ringGeo = new THREE.RingGeometry(.78, 1, 32);
  const ringMats = SIDE.map(s=>new THREE.MeshBasicMaterial({ color:s.main, transparent:true, opacity:.85, depthWrite:false }));
  const iceMat = new THREE.MeshStandardMaterial({ color:0xa8e6ff, transparent:true, opacity:.5, roughness:.1, depthWrite:false });
  const iceGeo = new THREE.CylinderGeometry(.5, .6, 1.2, 7);
  const goldGeo = new THREE.IcosahedronGeometry(.14, 0), goldMat = new THREE.MeshStandardMaterial({ color:0xf2c14e, emissive:0x6b4d12, roughness:.4, metalness:.6 });

  // ---------- Виды сущностей ----------
  const views = new Set();
  function makeUnitView(e){
    const d = CH[e.worker ? 'worker' : e.kind];
    const tpl = T['sk_'+d.model];
    const model = SkeletonUtils.clone(tpl.scene);
    const s = d.h / charH[d.model];
    model.scale.setScalar(s);
    model.traverse(o=>{ if (o.isMesh) o.material = tintMat(o.material, e.side, d.tint); });
    const hand = (bone, w) => { if (!w) return; const b = model.getObjectByName(bone); if (!b) return; const wpn = T['w_'+w].scene.clone(true); wpn.traverse(o=>{ if(o.isMesh) o.material = tintMat(o.material, e.side, d.tint); }); b.add(wpn); };
    hand('handslot.r', d.r); hand('handslot.l', d.l);
    const g = new THREE.Group(); g.add(model);
    const ring = new THREE.Mesh(ringGeo, ringMats[e.side]); ring.rotation.x = -Math.PI/2; ring.position.y = .03; ring.scale.setScalar(d.ring); g.add(ring);
    const ice = new THREE.Mesh(iceGeo, iceMat); ice.scale.set(d.ring*1.4, d.h*.95, d.ring*1.4); ice.position.y = d.h*.5; ice.visible = false; g.add(ice);
    let gold = null;
    if (e.worker){ gold = new THREE.Mesh(goldGeo, goldMat); gold.position.set(0, d.h*.75, -.18); gold.visible = false; g.add(gold); }
    g.position.set(wx(e.x), 0, wz(e.y));
    scene.add(g);
    const mixer = new THREE.AnimationMixer(model);
    const v = { kind:'unit', e, g, model, mixer, d, clips:tpl.animations, cur:null, curAct:null, oneShotUntil:0, lastAtk:e.atkAt, lastCast:e.castAt,
                yaw: e.side===0 ? Math.PI : 0, px:e.x, py:e.y, ice, gold, born:performance.now()/1000, dieT:-1 };
    g.rotation.y = v.yaw;
    views.add(v); e.v = v;
    play(v, d.idle);
    return v;
  }
  function play(v, name, once, speed){
    const clip = THREE.AnimationClip.findByName(v.clips, name); if (!clip) return 0;
    const act = v.mixer.clipAction(clip);
    act.timeScale = speed || 1;
    if (v.cur === name && !once) return clip.duration;
    act.reset();
    act.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    act.clampWhenFinished = !!once;
    if (v.curAct && v.curAct !== act) act.crossFadeFrom(v.curAct, .12, false);
    act.play();
    v.cur = name; v.curAct = act;
    return clip.duration / (speed||1);
  }
  function updUnitView(v, dt, simDt, now){
    const e = v.e;
    if (e.dead){
      if (v.dieT < 0){ v.dieT = 0; v.ice.visible = false; play(v, 'Death_A', true); }
      v.dieT += simDt;
      v.mixer.update(simDt);
      if (v.dieT > 1.4) v.g.position.y -= simDt*.7;
      if (v.dieT > 2.6) removeView(v);
      return;
    }
    // позиция и разворот
    const dx = e.x - v.px, dy = e.y - v.py;
    v.px = e.x; v.py = e.y;
    let want = null;
    if (Math.hypot(dx,dy) > .05) want = Math.atan2(dx, dy);
    else if (e.tgt && !e.tgt.dead) want = Math.atan2(e.tgt.x-e.x, e.tgt.y-e.y);
    if (want !== null){
      let diff = want - v.yaw; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      v.yaw += diff * Math.min(1, dt*10);
    }
    const age = now - v.born;
    const rise = age < .45 ? -v.d.h * (1 - age/.45) : 0;
    v.g.position.set(wx(e.x), rise, wz(e.y));
    v.g.rotation.y = v.yaw;
    // анимация
    const frozen = e.frozen > 0;
    v.ice.visible = frozen;
    v.mixer.timeScale = frozen ? 0 : 1;
    if (v.gold) v.gold.visible = !!e.carry;
    if (e.castAt !== undefined && e.castAt !== v.lastCast){ v.lastCast = e.castAt; play(v, v.d.cast || v.d.atk, true, 1.3); v.oneShotUntil = now + 1.0; }
    else if (e.atkAt !== v.lastAtk){ v.lastAtk = e.atkAt; v.oneShotUntil = now + .55; play(v, v.d.atk, true, 1.6); }
    else if (now > v.oneShotUntil){
      if (e.worker && e.state === 'mining') play(v, v.d.atk, false, 1.4);
      else if (e.moving){
        const slow = e.slowT > 0 ? 1 - e.slow : 1;
        play(v, v.d.walk, false, Math.max(.5, (e.speed*slow)/38));
        if (v.curAct) v.curAct.timeScale = Math.max(.5, (e.speed*slow)/38);
      }
      else play(v, v.d.idle);
    }
    v.mixer.update(simDt);
  }
  function removeView(v){
    scene.remove(v.g); views.delete(v);
    if (v.mixer) v.mixer.stopAllAction();
  }

  function makeStructView(e){
    const [m, px] = BLD[e.kind];
    const o = T[`b_${m}_${COLOR[e.side]}`].scene.clone(true);
    o.scale.setScalar((px*K)/size(T[`b_${m}_${COLOR[e.side]}`].scene).x);
    o.position.set(wx(e.x), 0, wz(e.y));
    o.rotation.y = e.side===0 ? 0 : Math.PI;
    scene.add(o);
    const v = { kind:'struct', e, g:o, ruined:false };
    views.add(v); e.v = v; return v;
  }
  function updStructView(v){
    const e = v.e;
    if (e.dead && !v.ruined){
      v.ruined = true; v.g.visible = false;
      const grp = new THREE.Group();
      for (let i=0;i<5;i++){
        const r = T[['n_rock_single_a','n_rock_single_c','n_rock_single_e'][i%3]].scene.clone(true);
        const s = (e.r*K*.9) / size(T['n_rock_single_a'].scene).x;
        r.scale.setScalar(s*(.6+Math.random()*.6));
        r.position.set(wx(e.x)+(Math.random()-.5)*e.r*K*1.4, 0, wz(e.y)+(Math.random()-.5)*e.r*K*1.2);
        r.rotation.y = Math.random()*6; grp.add(r);
      }
      scene.add(grp); v.rubble = grp;
    }
    if (e.hit > 0 && !e.dead){ v.g.position.y = Math.sin(performance.now()/20)*.03; } else v.g.position.y = 0;
  }
  function removeStruct(v){ scene.remove(v.g); if (v.rubble) scene.remove(v.rubble); views.delete(v); }

  function makeBuildingView(S, b){
    const [m, px] = BLD[b.key];
    const name = `b_${m}_${COLOR[S.id]}`;
    const o = T[name].scene.clone(true);
    o.scale.setScalar((px*K)/size(T[name].scene).x);
    o.position.set(wx(b.x), 0, wz(b.y));
    o.rotation.y = S.id===0 ? 0 : Math.PI;
    scene.add(o);
    const v = { kind:'bld', b, g:o, born:performance.now()/1000 };
    views.add(v); b.v = v; return v;
  }

  // ---------- Снаряды и эффекты ----------
  const projGeo = new THREE.SphereGeometry(.13, 10, 8), haloGeo = new THREE.SphereGeometry(.28, 10, 8);
  const arrowGeo = new THREE.BoxGeometry(.05,.05,.55), arrowMat = new THREE.MeshStandardMaterial({ color:0xd9d2bd });
  const projMat = c => new THREE.MeshBasicMaterial({ color:c });
  const haloMat = c => new THREE.MeshBasicMaterial({ color:c, transparent:true, opacity:.35, depthWrite:false });
  const PM = { 0:[projMat(0x8be36b), haloMat(0x8be36b)], 1:[projMat(0xe5554b), haloMat(0xe5554b)], ice:[projMat(0x9fe3ff), haloMat(0x7fd3ff)] };
  function makeProjView(p){
    let g;
    if (p.arrow){ g = new THREE.Mesh(arrowGeo, arrowMat); }
    else {
      const [cm, hm] = p.slow ? PM.ice : PM[p.side];
      g = new THREE.Group(); g.add(new THREE.Mesh(projGeo, cm)); g.add(new THREE.Mesh(haloGeo, hm));
    }
    scene.add(g);
    const h0 = p.arrow ? (p.from==='castle' ? 3.6 : 2.3) : .9;
    const d0 = Math.max(1, Math.hypot(p.tgt.x - p.sx, p.tgt.y - p.sy));
    const v = { kind:'proj', p, g, h0, d0 }; views.add(v); p.v = v; return v;
  }
  function updProjView(v){
    const p = v.p, t = p.tgt;
    const d = t ? Math.hypot(t.x - p.x, t.y - (p.y)) : 0;
    const f = Math.min(1, d / v.d0);
    const h = .6 + (v.h0 - .6) * f + (p.arrow ? Math.sin(Math.PI*(1-f))*.8 : 0);
    const pos = new THREE.Vector3(wx(p.x), h, wz(p.y));
    if (p.arrow && t) v.g.lookAt(wx(t.x), .6, wz(t.y));
    v.g.position.copy(pos);
  }

  const flatRing = new THREE.RingGeometry(.86, 1, 40), disc = new THREE.CircleGeometry(1, 40), ball = new THREE.SphereGeometry(1, 16, 12);
  const fxMat = (c, o) => new THREE.MeshBasicMaterial({ color:c, transparent:true, opacity:o, depthWrite:false, side:THREE.DoubleSide });
  function makeFxView(f){
    const g = new THREE.Group(); let parts = {};
    if (f.type==='spawn'){ const m = new THREE.Mesh(flatRing, fxMat(SIDE[f.side].main,.8)); m.rotation.x = -Math.PI/2; m.position.y=.05; g.add(m); parts.ring = m; }
    else if (f.type==='meteor'){
      const r = new THREE.Mesh(flatRing, fxMat(0xe5554b,.7)); r.rotation.x=-Math.PI/2; r.position.y=.05; r.scale.setScalar(SPELLS.meteor.r*K); g.add(r);
      const b = new THREE.Mesh(ball, new THREE.MeshBasicMaterial({ color:0xff8a3a })); b.scale.setScalar(.6); g.add(b);
      const h = new THREE.Mesh(ball, fxMat(0xffc46b,.35)); h.scale.setScalar(1.1); g.add(h);
      parts = { b, h };
    }
    else if (f.type==='boom'){
      const s = new THREE.Mesh(ball, fxMat(0xffa040,.6)); g.add(s);
      const r = new THREE.Mesh(flatRing, fxMat(0xffdc8c,.9)); r.rotation.x=-Math.PI/2; r.position.y=.06; g.add(r);
      parts = { s, r };
    }
    else if (f.type==='freeze'){
      const d = new THREE.Mesh(disc, fxMat(0x7fd3ff,.4)); d.rotation.x=-Math.PI/2; d.position.y=.05; g.add(d);
      const r = new THREE.Mesh(flatRing, fxMat(0xd6f4ff,.9)); r.rotation.x=-Math.PI/2; r.position.y=.07; g.add(r);
      parts = { d, r };
    }
    else return null;
    g.position.set(wx(f.x), 0, wz(f.y));
    scene.add(g);
    const v = { kind:'fx', f, g, parts }; views.add(v); f.v = v; return v;
  }
  function updFxView(v){
    const f = v.f, k = Math.min(1, f.t / f.dur), P = v.parts;
    if (f.type==='spawn'){ const s = .3 + k*.7; P.ring.scale.setScalar(s); P.ring.material.opacity = .8*(1-k); }
    else if (f.type==='meteor'){
      const sx = 6*(1-k), sy = 16*(1-k) + .4, sz = -7*(1-k);
      P.b.position.set(sx, sy, sz); P.h.position.set(sx, sy, sz);
    }
    else if (f.type==='boom'){ const r = .4 + k*2.6; P.s.scale.set(r, r*.6, r); P.s.material.opacity = .6*(1-k); P.r.scale.setScalar(r*1.1); P.r.material.opacity = .9*(1-k); }
    else if (f.type==='freeze'){ const r = SPELLS.freeze.r*K*(.4+.6*k); P.d.scale.setScalar(r); P.d.material.opacity = .4*(1-k); P.r.scale.setScalar(r); P.r.material.opacity = .9*(1-k); }
  }

  // прицел заклинания
  const aim = new THREE.Mesh(flatRing, fxMat(0xffc46b,.9)); aim.rotation.x = -Math.PI/2; aim.position.y = .08; aim.visible = false; scene.add(aim);

  // ---------- Кадр ----------
  let shakeT = 0;
  function render(G, dt){
    const now = performance.now()/1000;
    const simDt = G ? (G.paused ? 0 : dt * (G.over ? 1 : G.speed)) : dt;
    foamMat.opacity = .3 + .2*Math.sin(now*1.6);
    foam.scale.setScalar(1 + .006*Math.sin(now*1.6));
    const seen = new Set();
    if (G){
      for (const e of G.ents){
        const v = (e.v && views.has(e.v)) ? e.v : (e.struct ? makeStructView(e) : makeUnitView(e));
        seen.add(v);
        if (v.kind==='struct') updStructView(v); else updUnitView(v, dt, simDt, now);
      }
      for (const S of G.sides) for (const k in S.buildings){
        const b = S.buildings[k];
        const v = (b.v && views.has(b.v)) ? b.v : makeBuildingView(S, b);
        seen.add(v);
        const age = now - v.born; v.g.position.y = age < .4 ? -1.5*(1-age/.4) : 0;
      }
      for (const p of G.projs){ const v = (p.v && views.has(p.v)) ? p.v : makeProjView(p); seen.add(v); updProjView(v); }
      for (const f of G.fx){ const v = (f.v && views.has(f.v)) ? f.v : makeFxView(f); if (!v) continue; seen.add(v); updFxView(v); }
      aim.visible = !!(G.aim && G.pointer);
      if (aim.visible){
        aim.scale.setScalar(SPELLS[G.aim].r*K); aim.position.x = wx(G.pointer.x); aim.position.z = wz(G.pointer.y);
        aim.material.color.set(G.aim==='meteor' ? 0xffa040 : 0x9fe3ff);
      }
      shakeT = G.shake > 0 ? G.shake : 0;
    } else aim.visible = false;
    for (const v of [...views]){
      if (seen.has(v)) continue;
      if (v.kind==='unit' && v.e.dead && G){ updUnitView(v, dt, simDt, now); continue; }
      if (v.kind==='struct' || v.kind==='bld') removeStruct(v);
      else removeView(v);
    }
    camera.position.copy(CAM_POS);
    if (shakeT > 0){ camera.position.x += (Math.random()-.5)*.5; camera.position.z += (Math.random()-.5)*.5; }
    camera.lookAt(CAM_LOOK);
    renderer.render(scene, camera);
  }

  const tmp = new THREE.Vector3();
  function toScreen(x, y, h){
    tmp.set(wx(x), h, wz(y)).project(camera);
    return { x:(tmp.x+1)/2*540, y:(1-tmp.y)/2*960 };
  }
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0,1,0), 0), hit = new THREE.Vector3();
  function pick(clientX, clientY){
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera({ x:((clientX-r.left)/r.width)*2-1, y:-((clientY-r.top)/r.height)*2+1 }, camera);
    if (!ray.ray.intersectPlane(plane, hit)) return null;
    return { x: hit.x/K + 270, y: hit.z/K + 480 };
  }
  function resize(w, h){ renderer.setPixelRatio(1); renderer.setSize(w, h, false); }
  return { render, toScreen, pick, resize };
}
