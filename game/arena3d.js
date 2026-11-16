// Арена боя: узкое полотно между скал. Низ — земли нежити (базальт, лава, черепа, духи),
// верх — земли людей (плитка с мозаиками единорога, грифона, феникса). По бокам драконы, наверху лик древнего бога.
import * as THREE from 'three';
import { mergeVertices, mergeGeometries } from './lib/jsm/utils/BufferGeometryUtils.js';

export const FIELD = { x0:90, x1:450 };      // ширина полотна в пикселях симуляции

export function buildArena(scene, K, envTex){
  const wx = x => (x - 270) * K, wz = y => (y - 480) * K;
  let seed = 20240;
  const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const updaters = [];

  // ---------------- Текстура полотна ----------------
  const X0 = 40, X1 = 500, Y0 = -80, Y1 = 1040, S = 2;
  const c = document.createElement('canvas'); c.width = (X1-X0)*S; c.height = (Y1-Y0)*S;
  const g = c.getContext('2d'); g.scale(S,S); g.translate(-X0,-Y0);
  const ec = document.createElement('canvas'); ec.width = (X1-X0); ec.height = (Y1-Y0);
  const ge = ec.getContext('2d'); ge.translate(-X0,-Y0);
  ge.fillStyle = '#000'; ge.fillRect(X0,Y0,X1-X0,Y1-Y0);
  // карта рельефа: светлое — выше, тёмное — ниже
  const bc = document.createElement('canvas'); bc.width = (X1-X0)*S; bc.height = (Y1-Y0)*S;
  const gb = bc.getContext('2d'); gb.scale(S,S); gb.translate(-X0,-Y0);
  gb.fillStyle = '#202020'; gb.fillRect(X0,Y0,X1-X0,Y1-Y0);

  // Земли людей: плитка
  g.fillStyle = '#5f574a'; g.fillRect(X0,Y0,X1-X0,Y1-Y0);
  const T = 22;
  for (let ty = Y0, row = 0; ty < 620; ty += T, row++){
    const off = row % 2 ? T/2 : 0;
    for (let tx = X0 - T; tx < X1; tx += T){
      const v = (R()-.5)*22, w = R() < .08 ? -18 : 0;
      g.fillStyle = `rgb(${186+v+w},${174+v+w},${150+v+w})`;
      g.fillRect(tx+off+1, ty+1, T-2, T-2);
      // износ и пятна на камне
      for (let k=0;k<3;k++){ g.fillStyle = `rgba(${R()<.5?90:230},${R()<.5?80:220},${R()<.5?60:200},.12)`; g.beginPath(); g.arc(tx+off+3+R()*(T-6), ty+3+R()*(T-6), 1+R()*3, 0, 6.28); g.fill(); }
      const hl = g.createLinearGradient(tx+off, ty, tx+off+T, ty+T); hl.addColorStop(0,'rgba(255,250,235,.22)'); hl.addColorStop(.5,'rgba(255,255,255,0)'); hl.addColorStop(1,'rgba(40,30,20,.28)');
      g.fillStyle = hl; g.fillRect(tx+off+1, ty+1, T-2, T-2);
      if (R() < .06){ g.fillStyle = 'rgba(70,96,52,.35)'; g.fillRect(tx+off, ty+T-3, T, 3); }
      // рельеф плитки: выпуклая середина, скошенные края
      const bv = 150 + Math.floor((R()-.5)*30);
      gb.fillStyle = `rgb(${bv-50},${bv-50},${bv-50})`; gb.fillRect(tx+off+1, ty+1, T-2, T-2);
      gb.fillStyle = `rgb(${bv-20},${bv-20},${bv-20})`; gb.fillRect(tx+off+2, ty+2, T-4, T-4);
      gb.fillStyle = `rgb(${bv},${bv},${bv})`; gb.fillRect(tx+off+3.5, ty+3.5, T-7, T-7);
      for (let k=0;k<4;k++){ gb.fillStyle = `rgba(0,0,0,${.1+R()*.15})`; gb.beginPath(); gb.arc(tx+off+3+R()*(T-6), ty+3+R()*(T-6), .6+R()*1.6, 0, 6.28); gb.fill(); }
      if (R() < .07){ const y1 = ty+4+R()*10, y2 = ty+6+R()*10; [[g,'rgba(50,40,30,.55)',.8],[gb,'#303030',1.1]].forEach(([k,c2,w])=>{ k.strokeStyle = c2; k.lineWidth = w; k.beginPath(); k.moveTo(tx+off+3, y1); k.lineTo(tx+off+T/2, (y1+y2)/2+2); k.lineTo(tx+off+T-4, y2); k.stroke(); }); }
    }
  }
  // кайма вдоль скал
  [[FIELD.x0, 1],[FIELD.x1, -1]].forEach(([x, d])=>{
    g.fillStyle = '#8a6a2e'; g.fillRect(x - (d>0?0:8), Y0, 8, 640);
    for (let y = Y0; y < 620; y += 26){ g.fillStyle = '#d4af37'; g.beginPath(); g.arc(x + d*4 - (d>0?0:0), y, 2.2, 0, 6.28); g.fill(); }
  });

  const gold = '#d9b44a', lapis = '#24365e', ivory = '#efe6cf';
  function medallion(cx, cy, r, beast){
    g.save();
    g.fillStyle = lapis; g.beginPath(); g.arc(cx,cy,r,0,6.28); g.fill();
    g.strokeStyle = gold; g.lineWidth = 4; g.beginPath(); g.arc(cx,cy,r-2,0,6.28); g.stroke();
    g.lineWidth = 1.5; g.beginPath(); g.arc(cx,cy,r-9,0,6.28); g.stroke();
    for (let i=0;i<24;i++){ const a = i/24*6.28; g.fillStyle = i%2 ? gold : '#7b9ad1'; g.beginPath(); g.arc(cx+Math.cos(a)*(r-5.5), cy+Math.sin(a)*(r-5.5), 1.6, 0, 6.28); g.fill(); }
    // звезда
    g.strokeStyle = 'rgba(217,180,74,.35)'; g.lineWidth = 1;
    for (let i=0;i<8;i++){ const a = i/8*6.28; g.beginPath(); g.moveTo(cx,cy); g.lineTo(cx+Math.cos(a)*(r-12), cy+Math.sin(a)*(r-12)); g.stroke(); }
    const s = r/70;
    g.translate(cx, cy); g.scale(s, s);
    g.fillStyle = ivory; g.strokeStyle = gold; g.lineWidth = 2; g.lineJoin = 'round'; g.lineCap = 'round';
    if (beast === 'unicorn'){
      g.beginPath(); g.ellipse(-4, 8, 26, 13, 0, 0, 6.28); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(12, 2); g.lineTo(22, -22); g.lineTo(32, -18); g.lineTo(24, 6); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(32, -24, 11, 6.5, -.4, 0, 6.28); g.fill(); g.stroke();
      g.strokeStyle = gold; g.lineWidth = 3; g.beginPath(); g.moveTo(34, -30); g.lineTo(46, -50); g.stroke();
      g.lineWidth = 4; g.strokeStyle = ivory; [[-20,18,-26,42],[-10,19,-8,44],[8,18,12,42],[16,16,24,40]].forEach(([a,b,c2,d])=>{ g.beginPath(); g.moveTo(a,b); g.lineTo(c2,d); g.stroke(); });
      g.strokeStyle = '#c98bd8'; g.lineWidth = 3; g.beginPath(); g.moveTo(-28, 4); g.quadraticCurveTo(-46, 0, -42, 26); g.stroke();
      g.beginPath(); g.moveTo(22, -26); g.quadraticCurveTo(10, -18, 14, -2); g.stroke();
    } else if (beast === 'griffin'){
      g.beginPath(); g.ellipse(0, 10, 24, 12, 0, 0, 6.28); g.fill(); g.stroke();
      g.fillStyle = '#e8c766'; g.beginPath(); g.moveTo(-6, 2); g.lineTo(-30, -36); g.lineTo(-14, -30); g.lineTo(2, -40); g.lineTo(8, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = ivory; g.beginPath(); g.arc(26, -6, 10, 0, 6.28); g.fill(); g.stroke();
      g.fillStyle = gold; g.beginPath(); g.moveTo(34, -8); g.lineTo(46, -2); g.lineTo(34, 0); g.fill();
      g.strokeStyle = ivory; g.lineWidth = 4; [[-14,18,-18,38],[12,18,16,38]].forEach(([a,b,c2,d])=>{ g.beginPath(); g.moveTo(a,b); g.lineTo(c2,d); g.stroke(); });
    } else {
      g.fillStyle = '#f2a640'; g.strokeStyle = gold;
      g.beginPath(); g.moveTo(0, -4); g.lineTo(-40, -30); g.lineTo(-26, -6); g.lineTo(-44, 2); g.lineTo(-8, 8); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(0, -4); g.lineTo(40, -30); g.lineTo(26, -6); g.lineTo(44, 2); g.lineTo(8, 8); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#e5554b'; g.beginPath(); g.ellipse(0, 4, 7, 14, 0, 0, 6.28); g.fill(); g.stroke();
      g.beginPath(); g.arc(0, -14, 6, 0, 6.28); g.fill(); g.stroke();
      g.strokeStyle = '#f2a640'; g.lineWidth = 3; for (let i=-2;i<=2;i++){ g.beginPath(); g.moveTo(0, 16); g.quadraticCurveTo(i*10, 30, i*14, 44); g.stroke(); }
    }
    g.restore();
    // свечение золота
    ge.strokeStyle = 'rgba(217,180,74,.55)'; ge.lineWidth = 2.5; ge.beginPath(); ge.arc(cx,cy,r-2,0,6.28); ge.stroke();
  }
  const MEDALS = [[270,330,70,'unicorn'],[170,455,40,'griffin'],[370,455,40,'phoenix'],[170,190,30,'griffin'],[370,190,30,'phoenix']];
  // тень-углубление под медальонами
  MEDALS.forEach(([x,y,r])=>{ const rg = g.createRadialGradient(x,y,r*.9,x,y,r*1.25); rg.addColorStop(0,'rgba(20,14,8,.55)'); rg.addColorStop(1,'rgba(20,14,8,0)'); g.fillStyle = rg; g.beginPath(); g.arc(x,y,r*1.25,0,6.28); g.fill(); });
  // золотой рунный круг вокруг замка людей
  const runeRing = (cx, cy, r, col, ctxs) => ctxs.forEach(k=>{
    k.save(); k.strokeStyle = col; k.lineWidth = 2; k.beginPath(); k.arc(cx,cy,r,0,6.28); k.stroke(); k.beginPath(); k.arc(cx,cy,r-12,0,6.28); k.stroke();
    k.font = '10px serif'; k.fillStyle = col; k.textAlign = 'center'; k.textBaseline = 'middle';
    const glyphs = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
    for (let i=0;i<28;i++){ const a = i/28*6.28; k.save(); k.translate(cx+Math.cos(a)*(r-6), cy+Math.sin(a)*(r-6)); k.rotate(a+1.57); k.fillText(glyphs[i%glyphs.length],0,0); k.restore(); }
    k.restore();
  });
  runeRing(270, 100, 78, '#d9b44a', [g]); runeRing(270, 100, 78, 'rgba(217,180,74,.7)', [ge]);

  // Земли нежити (низ) с рваной границей
  const border = [];
  for (let x = X0; x <= X1; x += 12) border.push([x, 540 + Math.sin(x*.05)*14 + (R()-.5)*26]);
  const undeadClip = k => { k.beginPath(); k.moveTo(X0, Y1); border.forEach(([x,y])=>k.lineTo(x,y)); k.lineTo(X1, Y1); k.closePath(); };
  // выжженная полоса
  g.save(); g.lineCap = 'round';
  for (let i=0;i<3;i++){ g.strokeStyle = `rgba(20,14,12,${.25-.07*i})`; g.lineWidth = 24 + i*22; g.beginPath(); border.forEach(([x,y],j)=> j?g.lineTo(x,y-6):g.moveTo(x,y-6)); g.stroke(); }
  g.restore();
  g.save(); undeadClip(g); g.clip();
  g.fillStyle = '#1e191e'; g.fillRect(X0, 400, X1-X0, Y1-400);
  gb.save(); undeadClip(gb); gb.clip(); gb.fillStyle = '#5a5a5a'; gb.fillRect(X0, 400, X1-X0, Y1-400);
  for (let i=0;i<900;i++){ const v = Math.floor(60+R()*90); gb.fillStyle = `rgba(${v},${v},${v},.5)`; gb.beginPath(); gb.arc(X0+R()*(X1-X0), 480+R()*(Y1-480), 1+R()*5, 0, 6.28); gb.fill(); }
  gb.restore();
  for (let i=0;i<360;i++){ const x = X0+R()*(X1-X0), y = 480+R()*(Y1-480), r = 6+R()*28; g.fillStyle = R()<.5 ? 'rgba(52,42,50,.35)' : 'rgba(8,6,8,.35)'; g.beginPath(); g.arc(x,y,r,0,6.28); g.fill(); }
  // базальтовые плиты
  g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.2;
  gb.save(); undeadClip(gb); gb.clip();
  for (let i=0;i<90;i++){
    const x = X0+R()*(X1-X0), y = 520+R()*(Y1-520), r = 14+R()*20, pts = [];
    for (let k=0;k<6;k++){ const a = k/6*6.28 + R()*.3; pts.push([x+Math.cos(a)*r, y+Math.sin(a)*r]); }
    const poly = k => { k.beginPath(); pts.forEach(([px,py],j)=>j?k.lineTo(px,py):k.moveTo(px,py)); k.closePath(); };
    poly(g); g.stroke();
    const sh = g.createLinearGradient(x-r, y-r, x+r, y+r); sh.addColorStop(0,'rgba(120,100,120,.16)'); sh.addColorStop(1,'rgba(0,0,0,.25)'); g.fillStyle = sh; poly(g); g.fill();
    const v = Math.floor(110+R()*50); gb.fillStyle = `rgb(${v},${v},${v})`; poly(gb); gb.fill(); gb.strokeStyle = '#151515'; gb.lineWidth = 2; poly(gb); gb.stroke();
  }
  gb.restore();
  g.restore();
  ge.save(); undeadClip(ge); ge.clip();
  // трещины лавы
  const crack = (x, y, len) => {
    const pts = [[x,y]]; let a = R()*6.28;
    for (let i=0;i<len;i++){ a += (R()-.5)*1.1; x += Math.cos(a)*9; y += Math.sin(a)*9; pts.push([x,y]); if (R()<.12) crack(x, y, Math.floor(len*.5)); }
    [[gb,'#000',5],[g,'#2a0c05',5.5],[g,'#5a1606',4],[g,'#ff5a14',1.8],[g,'#ffd27a',.6],[ge,'#ff5a14',3.2],[ge,'#ffcf6a',1.1]].forEach(([k,col,w])=>{
      k.strokeStyle = col; k.lineWidth = w; k.lineCap = 'round'; k.lineJoin = 'round'; k.beginPath(); pts.forEach(([px,py],j)=>j?k.lineTo(px,py):k.moveTo(px,py)); k.stroke();
    });
  };
  g.save(); undeadClip(g); g.clip();
  for (let i=0;i<26;i++) crack(FIELD.x0+R()*(FIELD.x1-FIELD.x0), 560+R()*440, 6+Math.floor(R()*10));
  // озёра лавы у скал
  [[FIELD.x0+6, 700, 30],[FIELD.x1-6, 640, 26],[FIELD.x0+4, 960, 34],[FIELD.x1-4, 900, 30]].forEach(([x,y,r])=>{
    [[gb,'#000',1.1],[g,'#2a0c05',1.3],[g,'#3a0d04',1.2],[g,'#ff5a14',1],[g,'#ffb347',.55],[ge,'#ff6a1a',1],[ge,'#ffd27a',.5]].forEach(([k,col,s])=>{ k.fillStyle = col; k.beginPath(); k.ellipse(x, y, r*s, r*s*1.6, 0, 0, 6.28); k.fill(); });
  });
  g.restore();
  ge.restore();
  // зелёный рунный круг у замка нежити
  runeRing(270, 860, 80, '#8be36b', [g]); runeRing(270, 860, 80, 'rgba(139,227,107,.85)', [ge]);
  // кайма нежити
  g.save(); undeadClip(g); g.clip();
  [[FIELD.x0, 1],[FIELD.x1, -1]].forEach(([x])=>{ g.fillStyle = '#3c2b2b'; g.fillRect(x-4, 400, 8, 700); });
  g.restore();

  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const emap = new THREE.CanvasTexture(ec); emap.colorSpace = THREE.SRGBColorSpace;
  const bump = new THREE.CanvasTexture(bc); bump.anisotropy = 8;
  const groundMat = new THREE.MeshStandardMaterial({ map, emissiveMap:emap, emissive:0xffffff, emissiveIntensity:1.3, roughness:.88, bumpMap:bump, bumpScale:2.2 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry((X1-X0)*K, (Y1-Y0)*K), groundMat);
  ground.rotation.x = -Math.PI/2; ground.position.set(wx((X0+X1)/2), 0, wz((Y0+Y1)/2));
  ground.receiveShadow = true; scene.add(ground);
  updaters.push(t => { groundMat.emissiveIntensity = 1.15 + .25*Math.sin(t*1.7); });

  // Бездна под ареной
  const abyss = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshBasicMaterial({ color:0x170f19 }));
  abyss.rotation.x = -Math.PI/2; abyss.position.y = -6; scene.add(abyss);
  const lavaSea = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshBasicMaterial({ color:0x6a1c08 }));
  lavaSea.rotation.x = -Math.PI/2; lavaSea.position.set(0, -5.5, 18); scene.add(lavaSea);

  // ---------------- Скалы ----------------
  const rockGeos = [];
  for (let i=0;i<6;i++){
    let geo = new THREE.IcosahedronGeometry(1, 1);
    geo.deleteAttribute('normal'); geo.deleteAttribute('uv');
    geo = mergeVertices(geo);
    const p = geo.attributes.position;
    for (let k=0;k<p.count;k++){ const f = .72 + R()*.5; p.setXYZ(k, p.getX(k)*f, p.getY(k)*(.8+R()*.4), p.getZ(k)*f); }
    geo = geo.toNonIndexed(); geo.computeVertexNormals();
    rockGeos.push(geo);
  }
  const basalt = new THREE.MeshStandardMaterial({ color:0x2e272c, roughness:.9, flatShading:true });
  const basalt2 = new THREE.MeshStandardMaterial({ color:0x3d3238, roughness:.9, flatShading:true });
  const sand = new THREE.MeshStandardMaterial({ color:0xb59a72, roughness:.85, flatShading:true });
  const sand2 = new THREE.MeshStandardMaterial({ color:0x9c8160, roughness:.85, flatShading:true });
  const edgeX = (FIELD.x1 - 270) * K;   // половина ширины полотна
  const DRAGON_Z = { '-1':[5.5,-6], '1':[11.5,-1] };
  const rock = (x, y, z, sx, sy, sz, mat) => {
    const m = new THREE.Mesh(rockGeos[Math.floor(R()*rockGeos.length)], mat);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.y = R()*6.28;
    m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
  };
  for (const side of [-1, 1]){
    for (let z = -20; z <= 20; z += 1.15){
      const undead = z + (R()-.5)*3 > 2;
      const m1 = undead ? (R()<.5?basalt:basalt2) : (R()<.5?sand:sand2);
      const h = 2.2 + R()*3.2 + (Math.abs(z) > 14 ? 2 : 0);
      const ledge = (DRAGON_Z[side]||[]).some(dz => Math.abs(z - dz) < 2.3);
      if (ledge){ rock(side*(edgeX + 1.6), -.2, z, 1.3+R()*.4, .55, 1.3, m1); continue; }
      rock(side*(edgeX + .8 + R()*.6), h*.35, z, 1.1+R()*.7, h, 1.1+R()*.6, m1);
      rock(side*(edgeX + 2.6 + R()*1.2), h*.6, z + R()*.6, 1.6+R()*.8, h*1.5, 1.4+R()*.8, m1);
      if (R() < .5) rock(side*(edgeX + .2), .1, z + R(), .5+R()*.4, .5+R()*.3, .5+R()*.4, m1);
    }
  }
  // ряд скал за спиной нежити и за спиной людей
  for (let x = -edgeX-1; x <= edgeX+1; x += 1.3){
    rock(x, 1.2, 17.6 + R()*.8, 1.3+R()*.6, 2.6+R()*2, 1.2, R()<.5?basalt:basalt2);
  }

  // лавовый ручей у подножия скал нежити
  const lavaMat = new THREE.MeshBasicMaterial({ color:0xff6a1a });
  for (const side of [-1,1]){
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(.35, 15), lavaMat);
    strip.rotation.x = -Math.PI/2; strip.position.set(side*(edgeX+.15), .02, 9.5); scene.add(strip);
  }
  updaters.push(t => { lavaMat.color.setHSL(.05, 1, .5 + .08*Math.sin(t*3)); });
  [[-edgeX, 1.2, 7],[edgeX, 1.2, 13]].forEach(([x,y,z])=>{ const l = new THREE.PointLight(0xff6a1a, 40, 9, 2); l.position.set(x,y,z); scene.add(l); updaters.push(t=>{ l.intensity = 34 + 10*Math.sin(t*5+x); }); });

  // ---------------- Обелиски людей (футуристичные руны) ----------------
  const obeliskMat = new THREE.MeshStandardMaterial({ color:0xd8ccb0, roughness:.6, metalness:.1, flatShading:true });
  const runeMat = new THREE.MeshBasicMaterial({ color:0x7fe7ff });
  const crystalMat = new THREE.MeshStandardMaterial({ color:0x7fe7ff, emissive:0x2fb8d8, emissiveIntensity:1.6, roughness:.2, metalness:.3, flatShading:true });
  [[-1,-4],[1,-7.5],[-1,-12]].forEach(([side, z])=>{
    const grp = new THREE.Group();
    const ob = new THREE.Mesh(new THREE.CylinderGeometry(.22, .4, 3.4, 4), obeliskMat); ob.position.y = 1.7; ob.rotation.y = Math.PI/4; ob.castShadow = true; grp.add(ob);
    for (let i=0;i<4;i++){ const r = new THREE.Mesh(new THREE.BoxGeometry(.06, .22, .02), runeMat); r.position.set(-side*.24, .9 + i*.5, 0); r.rotation.y = side*Math.PI/2; grp.add(r); }
    const cr = new THREE.Mesh(new THREE.OctahedronGeometry(.32, 0), crystalMat); cr.position.y = 4; grp.add(cr);
    grp.position.set(side*(edgeX + .45), 0, z); scene.add(grp);
    const l = new THREE.PointLight(0x7fe7ff, 14, 6, 2); l.position.set(side*(edgeX-.3), 3.4, z); scene.add(l);
    const ph = R()*6;
    updaters.push(t => { cr.position.y = 4 + .25*Math.sin(t*1.6+ph); cr.rotation.y = t*1.2; runeMat.color.setHSL(.53, 1, .62 + .1*Math.sin(t*2)); });
  });

  // ---------------- Драконы ----------------
  function makeDragon(style){
    const bone = style === 'bone';
    const skin = new THREE.MeshStandardMaterial({ color: bone ? 0xd8cfb8 : 0x56616b, roughness: bone ? .7 : .55, metalness: bone ? 0 : .35, flatShading:true });
    const hornM = new THREE.MeshStandardMaterial({ color: bone ? 0x8a7d66 : 0xd4af37, roughness:.4, metalness: bone ? 0 : .8, flatShading:true });
    const eyeM = new THREE.MeshBasicMaterial({ color: bone ? 0x8be36b : 0xffc83d });
    const toothM = new THREE.MeshStandardMaterial({ color:0xf3ecd9, roughness:.5, flatShading:true });
    const head = new THREE.Group();
    const skull = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5), skin); skull.scale.set(.95, .75, 1.2); head.add(skull);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(.9, .55, 1.5), skin); snout.position.set(0, -.05, 1.35); head.add(snout);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(.75, .45, .3), skin); nose.position.set(0, -.02, 2.15); head.add(nose);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(1.2, .25, .5), skin); brow.position.set(0, .45, .55); brow.rotation.x = -.3; head.add(brow);
    const jawPivot = new THREE.Group(); jawPivot.position.set(0, -.35, .2); head.add(jawPivot);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(.8, .22, 1.9), skin); jaw.position.set(0, -.1, 1.05); jawPivot.add(jaw);
    for (let i=0;i<4;i++) for (const sx of [-1,1]){
      const tt = new THREE.Mesh(new THREE.ConeGeometry(.07, .28, 4), toothM); tt.position.set(sx*.33, -.42, .9 + i*.32); tt.rotation.x = Math.PI; head.add(tt);
      const bt = new THREE.Mesh(new THREE.ConeGeometry(.06, .22, 4), toothM); bt.position.set(sx*.3, .1, .4 + i*.36); jawPivot.add(bt);
    }
    for (const sx of [-1,1]){
      const eye = new THREE.Mesh(new THREE.SphereGeometry(.13, 8, 6), eyeM); eye.position.set(sx*.42, .25, .85); head.add(eye);
      let px = sx*.45, py = .45, pz = -.3, r = .26;
      for (let k=0;k<4;k++){
        const h = new THREE.Mesh(new THREE.ConeGeometry(r, .75, 6), hornM);
        h.position.set(px, py, pz); h.rotation.set(-1.1 - k*.25, 0, sx*(.35 + k*.05)); head.add(h);
        px += sx*.12; py += .25 - k*.05; pz -= .55; r *= .72;
      }
      for (let k=0;k<3;k++){ const sp = new THREE.Mesh(new THREE.ConeGeometry(.08, .4, 4), hornM); sp.position.set(sx*.75, -.1 - k*.18, -.1 - k*.25); sp.rotation.z = sx*1.6; head.add(sp); }
    }
    // шея уходит в скалу
    const neck = new THREE.Group();
    for (let k=0;k<4;k++){ const n = new THREE.Mesh(new THREE.SphereGeometry(.7 - k*.02, 7, 5), skin); n.position.set(0, -.25 - k*.1, -1.1 - k*.75); n.scale.set(1, .9, 1.1); neck.add(n);
      if (bone){ const rib = new THREE.Mesh(new THREE.TorusGeometry(.62, .06, 4, 10), hornM); rib.position.copy(n.position); neck.add(rib); }
      else { const sp = new THREE.Mesh(new THREE.ConeGeometry(.12, .5, 4), hornM); sp.position.set(0, .45 - k*.1, -1.1 - k*.75); sp.rotation.x = -.5; neck.add(sp); } }
    const grp = new THREE.Group(); grp.add(neck); grp.add(head);
    grp.traverse(o=>{ if (o.isMesh){ o.castShadow = true; } });
    return { grp, head, jawPivot, eyeM, mouth:new THREE.Vector3(0, -.2, 2.3) };
  }
  const puffTex = (()=>{ const cc = document.createElement('canvas'); cc.width = cc.height = 64; const k = cc.getContext('2d'); const rg = k.createRadialGradient(32,32,0,32,32,32); rg.addColorStop(0,'rgba(255,255,255,1)'); rg.addColorStop(.4,'rgba(255,255,255,.5)'); rg.addColorStop(1,'rgba(255,255,255,0)'); k.fillStyle = rg; k.fillRect(0,0,64,64); return new THREE.CanvasTexture(cc); })();
  const breath = [];
  const dragons = [
    { style:'bone',  x:-(edgeX+1.5), y:3.0, z:5.5,  dir:[1,.6],  s:1.45, fire:0x8be36b },
    { style:'bone',  x:(edgeX+1.5),  y:3.2, z:11.5, dir:[-1,.6], s:1.4, fire:0x8be36b },
    { style:'stone', x:-(edgeX+1.5), y:3.0, z:-6,   dir:[1,.5],  s:1.4, fire:0xffb347 },
    { style:'stone', x:(edgeX+1.5),  y:2.9, z:-1,   dir:[-1,.6], s:1.35, fire:0x7fe7ff }
  ];
  // Модель дракона (OBJ) → тот же интерфейс, что у самодельной головы
  function objDragonMaker(obj){
    const base = obj.clone(true);
    const box = new THREE.Box3().setFromObject(base), sz = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const n = 1 / sz.z;                       // длина дракона = 1
    base.position.set(-c.x*n, -box.min.y*n, -c.z*n); base.scale.setScalar(n);
    let tip = new THREE.Vector3(0,0,-1e9);
    base.traverse(o=>{ if (o.isMesh){ const p = o.geometry.attributes.position; for (let i=0;i<p.count;i++){ if (p.getZ(i) > tip.z) tip.set(p.getX(i), p.getY(i), p.getZ(i)); } } });
    tip.set((tip.x - c.x)*n, (tip.y - box.min.y)*n, (tip.z - c.z)*n);
    return style => {
      const bone = style === 'bone';
      const mat = new THREE.MeshStandardMaterial({ color: bone ? 0xd9d0bb : 0x4e5866, roughness: bone ? .65 : .32, metalness: bone ? 0 : .7,
        emissive: bone ? 0x0b2a0b : 0x2a1c05, flatShading:true, envMap: envTex, envMapIntensity: bone ? .3 : 1.1 });
      const model = base.clone(true);
      model.traverse(o=>{ if (o.isMesh){ o.material = mat; o.castShadow = true; o.receiveShadow = true; } });
      const head = new THREE.Group(); head.add(model);
      const eyeM = new THREE.MeshBasicMaterial({ color: bone ? 0x8be36b : 0xffc83d });
      for (const sx of [-1,1]){ const e = new THREE.Mesh(new THREE.SphereGeometry(.018, 8, 6), eyeM); e.position.set(tip.x + sx*.035, tip.y + .045, tip.z - .1); head.add(e); }
      const grp = new THREE.Group(); grp.add(head);
      return { grp, head, jawPivot:new THREE.Object3D(), eyeM, mouth: tip.clone().add(new THREE.Vector3(0, -.01, .02)), full:true };
    };
  }
  function spawnDragons(make){
  dragons.forEach((d, i)=>{
    const D = make(d.style);
    D.grp.position.set(D.full ? Math.sign(d.x)*(edgeX + .15) : d.x, D.full ? .05 : d.y, d.z); D.grp.scale.setScalar(D.full ? d.s*3.1 : d.s);
    const yaw = D.full ? Math.atan2(d.dir[0]*.8, 1) : Math.atan2(d.dir[0], d.dir[1]);
    D.grp.rotation.y = yaw; scene.add(D.grp);
    let next = 3 + i*2.3 + R()*3, fireT = -1;
    const fireMat = new THREE.SpriteMaterial({ map:puffTex, color:d.fire, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false });
    updaters.push((t, dt) => {
      D.head.rotation.y = (D.full ? .08 : .18)*Math.sin(t*.6 + i);
      const bow = fireT >= 0 ? (D.full ? .12 : .15) : 0;
      D.head.rotation.x += ((D.full ? .03 : .08)*Math.sin(t*.9 + i*2) + bow - D.head.rotation.x*(D.full?0:0) - D.head.rotation.x) * Math.min(1, dt*4);
      if (D.full){ const br = 1 + .025*Math.sin(t*1.8 + i); D.head.scale.set(1, br, 1 + (br-1)*.5); }
      const open = fireT >= 0 ? .55 : .08 + .06*Math.sin(t*1.3+i);
      D.jawPivot.rotation.x += (open - D.jawPivot.rotation.x) * Math.min(1, dt*6);
      D.eyeM.color.setHSL(new THREE.Color(d.style==='bone'?0x8be36b:0xffc83d).getHSL({}).h, 1, .55 + .15*Math.sin(t*3+i));
      if (t > next && fireT < 0){ fireT = 0; }
      if (fireT >= 0){
        fireT += dt;
        if (fireT < 1.1){
          for (let k=0;k<2;k++){
            const sp = new THREE.Sprite(fireMat.clone());
            const mouth = D.mouth.clone().applyMatrix4(D.head.matrixWorld);
            sp.position.copy(mouth); sp.scale.setScalar(.4);
            const fw = new THREE.Vector3(Math.sin(yaw), -.25, Math.cos(yaw)).normalize();
            breath.push({ sp, v: fw.multiplyScalar(4 + Math.random()*2).add(new THREE.Vector3((Math.random()-.5),(Math.random()-.2),(Math.random()-.5))), life:0 });
            scene.add(sp);
          }
        } else { fireT = -1; next = t + 7 + R()*6; }
      }
    });
  });
  }
  updaters.push((t, dt) => {
    for (let i = breath.length-1; i >= 0; i--){
      const b = breath[i]; b.life += dt;
      b.sp.position.addScaledVector(b.v, dt); b.v.multiplyScalar(1 - dt*1.5); b.v.y += dt*.8;
      b.sp.scale.setScalar(.4 + b.life*1.8); b.sp.material.opacity = Math.max(0, 1 - b.life/1.1);
      if (b.life > 1.1){ scene.remove(b.sp); b.sp.material.dispose(); breath.splice(i,1); }
    }
  });

  // ---------------- Лик древнего бога ----------------
  {
    const W = 1024, H = 560, cc = document.createElement('canvas'); cc.width = W; cc.height = H;
    const k = cc.getContext('2d');
    const ecc = document.createElement('canvas'); ecc.width = W; ecc.height = H; const ke = ecc.getContext('2d'); ke.fillStyle = '#000'; ke.fillRect(0,0,W,H);
    const bg = k.createLinearGradient(0,0,0,H); bg.addColorStop(0,'#8c7656'); bg.addColorStop(1,'#5c4b36'); k.fillStyle = bg; k.fillRect(0,0,W,H);
    for (let i=0;i<500;i++){ k.fillStyle = `rgba(${R()<.5?40:200},${R()<.5?30:180},${R()<.5?20:150},.08)`; k.beginPath(); k.arc(R()*W, R()*H, 4+R()*30, 0, 6.28); k.fill(); }
    const cx = W/2;
    const carve = (fn, light) => { k.save(); k.translate(3,4); k.strokeStyle = 'rgba(30,20,12,.7)'; fn(k); k.restore(); k.save(); k.strokeStyle = light || 'rgba(235,215,170,.85)'; fn(k); k.restore(); };
    // корона-лучи
    carve(c2 => { c2.lineWidth = 10; for (let i=-6;i<=6;i++){ const a = -1.57 + i*.2; c2.beginPath(); c2.moveTo(cx+Math.cos(a)*190, 300+Math.sin(a)*190); c2.lineTo(cx+Math.cos(a)*290, 300+Math.sin(a)*290); c2.stroke(); } });
    // контур лица
    carve(c2 => { c2.lineWidth = 12; c2.beginPath(); c2.moveTo(cx-170, 120); c2.quadraticCurveTo(cx-185, 380, cx-90, 520); c2.lineTo(cx+90, 520); c2.quadraticCurveTo(cx+185, 380, cx+170, 120); c2.closePath(); c2.stroke(); });
    // брови, нос, губы, борода
    carve(c2 => { c2.lineWidth = 9;
      c2.beginPath(); c2.moveTo(cx-140, 210); c2.quadraticCurveTo(cx-80, 175, cx-20, 205); c2.stroke();
      c2.beginPath(); c2.moveTo(cx+140, 210); c2.quadraticCurveTo(cx+80, 175, cx+20, 205); c2.stroke();
      c2.beginPath(); c2.moveTo(cx, 215); c2.lineTo(cx-28, 340); c2.lineTo(cx+28, 340); c2.stroke();
      c2.beginPath(); c2.moveTo(cx-60, 395); c2.quadraticCurveTo(cx, 415, cx+60, 395); c2.stroke();
      for (let i=-4;i<=4;i++){ c2.beginPath(); c2.moveTo(cx+i*20, 430); c2.quadraticCurveTo(cx+i*24, 480, cx+i*18, 540); c2.stroke(); }
    });
    // глаза светятся
    [[cx-80, 250],[cx+80, 250]].forEach(([x,y])=>{
      k.fillStyle = '#1a120c'; k.beginPath(); k.ellipse(x, y, 52, 22, 0, 0, 6.28); k.fill();
      k.fillStyle = '#7fe7ff'; k.beginPath(); k.ellipse(x, y, 34, 13, 0, 0, 6.28); k.fill();
      ke.fillStyle = '#7fe7ff'; ke.beginPath(); ke.ellipse(x, y, 40, 16, 0, 0, 6.28); ke.fill();
      ke.fillStyle = '#ffffff'; ke.beginPath(); ke.ellipse(x, y, 16, 7, 0, 0, 6.28); ke.fill();
    });
    // светящиеся руны по краям
    ke.font = '42px serif'; k.font = '42px serif'; ke.fillStyle = '#7fe7ff'; k.fillStyle = '#3a8fa3';
    const gl = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃ';
    for (let i=0;i<6;i++){ [70, W-70].forEach(x=>{ k.fillText(gl[i*2%gl.length], x-14, 120+i*70); ke.fillText(gl[i*2%gl.length], x-14, 120+i*70); }); }
    const tex = new THREE.CanvasTexture(cc); tex.colorSpace = THREE.SRGBColorSpace;
    const etex = new THREE.CanvasTexture(ecc); etex.colorSpace = THREE.SRGBColorSpace;
    const gm = new THREE.MeshStandardMaterial({ map:tex, emissiveMap:etex, emissive:0xffffff, emissiveIntensity:1.4, roughness:.9 });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(15, 8.2), gm);
    face.position.set(0, .6, -17.6); face.rotation.x = -1.15; scene.add(face);
    updaters.push(t => { gm.emissiveIntensity = 1.1 + .5*Math.sin(t*.8); });
  }

  // ---------------- Духи над землями нежити ----------------
  const ghostMat = new THREE.SpriteMaterial({ map:puffTex, color:0x9fe8b0, transparent:true, opacity:.35, blending:THREE.AdditiveBlending, depthWrite:false });
  for (let i=0;i<11;i++){
    const sp = new THREE.Sprite(ghostMat.clone()); scene.add(sp);
    const tail = new THREE.Sprite(ghostMat.clone()); tail.material.opacity = .25; scene.add(tail);
    const ox = (R()-.5)*edgeX*2.2, oz = 3 + R()*13, ph = R()*6.28, sp2 = .3 + R()*.4, rad = 1 + R()*2.5;
    updaters.push(t => {
      const a = t*sp2 + ph;
      const x = ox + Math.cos(a)*rad, z = oz + Math.sin(a*1.3)*rad*.6, y = 1.6 + .5*Math.sin(t*1.7+ph);
      sp.position.set(x, y, z); sp.scale.set(.55, .8, .55);
      tail.position.set(x - Math.cos(a+.6)*.35, y - .2, z - Math.sin(a*1.3+.6)*.25); tail.scale.setScalar(.45);
      sp.material.opacity = .22 + .14*Math.sin(t*3+ph);
    });
  }

  // ---------------- Искры лавы и золотые огоньки ----------------
  const particles = (n, color, size, area, speed) => {
    const pos = new Float32Array(n*3), vel = [];
    for (let i=0;i<n;i++){ pos[i*3] = area.x0 + R()*(area.x1-area.x0); pos[i*3+1] = R()*area.h; pos[i*3+2] = area.z0 + R()*(area.z1-area.z0); vel.push(speed*(.5+R())); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, map:puffTex, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false }));
    scene.add(pts);
    updaters.push((t, dt) => {
      for (let i=0;i<n;i++){
        pos[i*3+1] += vel[i]*dt; pos[i*3] += Math.sin(t*2 + i)*dt*.2;
        if (pos[i*3+1] > area.h){ pos[i*3+1] = 0; pos[i*3] = area.x0 + R()*(area.x1-area.x0); pos[i*3+2] = area.z0 + R()*(area.z1-area.z0); }
      }
      geo.attributes.position.needsUpdate = true;
    });
  };
  particles(140, 0xff7a2a, .22, { x0:-edgeX-1.5, x1:edgeX+1.5, z0:2.5, z1:18, h:4.5 }, .9);
  particles(60, 0xffe6a0, .16, { x0:-edgeX, x1:edgeX, z0:-18, z1:0, h:3.5 }, .25);

  // ---------------- 3D-медальоны с рельефными существами ----------------
  const goldM = new THREE.MeshStandardMaterial({ color:0xe0b54a, metalness:1, roughness:.28 });
  const ivoryM = new THREE.MeshStandardMaterial({ color:0xf1e8d2, metalness:0, roughness:.35 });
  const lapisM = new THREE.MeshStandardMaterial({ color:0x1d3464, metalness:.25, roughness:.4 });
  const stoneM = new THREE.MeshStandardMaterial({ color:0xcbbd9c, roughness:.7 });
  const redM = new THREE.MeshStandardMaterial({ color:0xc53a2a, metalness:.35, roughness:.35 });
  const orangeM = new THREE.MeshStandardMaterial({ color:0xf08a2c, metalness:.4, roughness:.3, emissive:0x5a2000 });
  [goldM, ivoryM, lapisM, redM, orangeM].forEach(m=>{ m.envMap = envTex; m.envMapIntensity = 1.2; });
  const gemM = [0x3fd0ff, 0xe5554b, 0x8be36b].map(c=>new THREE.MeshStandardMaterial({ color:c, metalness:.2, roughness:.1, emissive:c, emissiveIntensity:.35 }));
  // контуры в координатах ±50, y вверх
  const shp = (cmds) => { const s2 = new THREE.Shape(); cmds(s2); return s2; };
  const SH = {
    unicorn:{
      body: shp(s=>{ s.moveTo(24,4); s.bezierCurveTo(26,-4,24,-10,22,-14); s.lineTo(24,-34); s.lineTo(23,-46); s.lineTo(17,-46); s.lineTo(17,-36); s.lineTo(15,-16);
        s.bezierCurveTo(8,-18,-10,-18,-18,-15); s.lineTo(-20,-30); s.lineTo(-18,-46); s.lineTo(-24,-46); s.lineTo(-27,-30);
        s.bezierCurveTo(-30,-22,-34,-14,-36,-6); s.bezierCurveTo(-38,4,-34,12,-26,13); s.bezierCurveTo(-14,14,4,14,12,16);
        s.bezierCurveTo(18,24,24,34,28,42); s.lineTo(32,46); s.lineTo(33,40); s.bezierCurveTo(40,36,46,30,48,24); s.bezierCurveTo(48,20,44,18,40,19);
        s.bezierCurveTo(34,20,30,16,28,10); s.bezierCurveTo(27,8,26,6,24,4); }),
      mane: shp(s=>{ s.moveTo(10,17); s.bezierCurveTo(14,30,20,40,30,45); s.bezierCurveTo(26,36,24,30,22,24); s.bezierCurveTo(20,28,16,24,18,16); s.closePath(); }),
      tail: shp(s=>{ s.moveTo(-34,10); s.bezierCurveTo(-50,8,-56,-14,-46,-28); s.bezierCurveTo(-49,-14,-45,0,-32,4); s.closePath(); }),
      horn:[36,42, 50,62]
    },
    griffin:{
      body: shp(s=>{ s.moveTo(20,0); s.bezierCurveTo(20,-10,14,-14,10,-14); s.lineTo(12,-34); s.lineTo(6,-34); s.lineTo(4,-16); s.bezierCurveTo(-6,-18,-16,-16,-22,-14);
        s.lineTo(-22,-34); s.lineTo(-28,-34); s.lineTo(-30,-12); s.bezierCurveTo(-36,-6,-36,4,-30,8); s.bezierCurveTo(-20,10,0,10,12,12);
        s.bezierCurveTo(16,18,22,24,28,24); s.bezierCurveTo(34,24,40,20,42,16); s.lineTo(48,12); s.lineTo(40,10); s.bezierCurveTo(36,6,28,4,20,0); }),
      wing: shp(s=>{ s.moveTo(4,10); s.bezierCurveTo(-4,30,-20,46,-42,50); s.lineTo(-32,42); s.lineTo(-40,38); s.lineTo(-28,34); s.lineTo(-36,28); s.lineTo(-24,24); s.lineTo(-28,18); s.lineTo(-14,14); s.closePath(); }),
      tail: shp(s=>{ s.moveTo(-32,2); s.bezierCurveTo(-44,6,-46,-10,-40,-14); s.bezierCurveTo(-44,-6,-40,0,-32,-2); s.closePath(); })
    },
    phoenix:{
      wingR: shp(s=>{ s.moveTo(4,4); s.bezierCurveTo(16,14,30,30,46,46); s.lineTo(40,32); s.lineTo(50,30); s.lineTo(40,20); s.lineTo(48,14); s.lineTo(34,8); s.lineTo(40,0); s.bezierCurveTo(26,-2,14,-2,6,-4); s.closePath(); }),
      body: shp(s=>{ s.absellipse(0,0,7,15,0,Math.PI*2); }),
      head: shp(s=>{ s.absarc(0,19,6,0,Math.PI*2); }),
      tail: shp(s=>{ s.moveTo(-4,-10); s.bezierCurveTo(-12,-26,-16,-36,-8,-48); s.bezierCurveTo(-6,-36,-2,-26,0,-16); s.bezierCurveTo(2,-26,6,-36,8,-48); s.bezierCurveTo(16,-36,12,-26,4,-10); s.closePath(); })
    }
  };
  const ext = (shape, depth, mat) => {
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled:true, bevelThickness:1.6, bevelSize:1.1, bevelSegments:3, curveSegments:14 });
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m;
  };
  function medal(cx, cy, r, beast){
    const R0 = r*K, grp = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(R0*1.02, R0*1.08, .08, 64), stoneM); base.position.y = .04; base.receiveShadow = true; grp.add(base);
    const lap = new THREE.Mesh(new THREE.CylinderGeometry(R0*.86, R0*.86, .02, 64), lapisM); lap.position.y = .085; lap.receiveShadow = true; grp.add(lap);
    [[.93,.045],[.82,.02]].forEach(([k,t])=>{ const tor = new THREE.Mesh(new THREE.TorusGeometry(R0*k, R0*t, 10, 72), goldM); tor.rotation.x = -Math.PI/2; tor.position.y = .09; tor.castShadow = true; grp.add(tor); });
    const n = r > 50 ? 24 : 16;
    for (let i=0;i<n;i++){ const a = i/n*6.28; const gm = new THREE.Mesh(new THREE.SphereGeometry(R0*.035, 10, 8), i%2 ? goldM : gemM[i%3]); gm.position.set(Math.cos(a)*R0*.93, .11, Math.sin(a)*R0*.93); grp.add(gm); }
    // существо: лежит на лазурите, голова к дальнему краю
    const rel = new THREE.Group(); const sc = R0*1.45/100;
    rel.scale.set(sc, sc, sc*.9); rel.rotation.x = -Math.PI/2; rel.position.y = .095;
    const S2 = SH[beast];
    if (beast==='unicorn'){
      rel.add(ext(S2.body, 2.6, ivoryM)); const mn = ext(S2.mane, 3.2, goldM); rel.add(mn); const tl = ext(S2.tail, 3, goldM); rel.add(tl);
      const [hx,hy,tx,ty] = S2.horn; const len = Math.hypot(tx-hx, ty-hy);
      const horn = new THREE.Mesh(new THREE.ConeGeometry(2.2, len, 12, 6), goldM); horn.position.set((hx+tx)/2, (hy+ty)/2, 3); horn.rotation.z = Math.atan2(ty-hy, tx-hx) - Math.PI/2; rel.add(horn);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 6), lapisM); eye.position.set(38, 30, 4.2); rel.add(eye);
    } else if (beast==='griffin'){
      rel.add(ext(S2.body, 2.6, goldM)); const w = ext(S2.wing, 3.4, ivoryM); w.position.z = .5; rel.add(w); rel.add(ext(S2.tail, 2.4, goldM));
      const eye = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 6), redM); eye.position.set(32, 18, 4.2); rel.add(eye);
    } else {
      const wr = ext(S2.wingR, 2.4, goldM); rel.add(wr);
      const wl = ext(S2.wingR, 2.4, goldM); wl.scale.x = -1; rel.add(wl);
      rel.add(ext(S2.body, 3, redM)); rel.add(ext(S2.head, 3, redM)); rel.add(ext(S2.tail, 2, orangeM));
    }
    grp.add(rel);
    grp.position.set(wx(cx), 0, wz(cy));
    scene.add(grp);
  }
  MEDALS.forEach(([x,y,r,b])=>medal(x,y,r,b));

  // светящиеся кольца рун у замков
  [[270,100,78,0xd9b44a],[270,860,80,0x8be36b]].forEach(([x,y,r,c2])=>{
    const m = new THREE.MeshBasicMaterial({ color:c2, transparent:true, opacity:.7, depthWrite:false });
    const tor = new THREE.Mesh(new THREE.TorusGeometry(r*K, .03, 6, 96), m); tor.rotation.x = -Math.PI/2; tor.position.set(wx(x), .04, wz(y)); scene.add(tor);
    updaters.push(t=>{ m.opacity = .45 + .3*Math.sin(t*2 + x); });
  });

  // ---------------- 3D-черепа (из модели скелета) ----------------
  const deint = geo => {
    const out = new THREE.BufferGeometry();
    for (const name of ['position','normal','uv']){
      const at = geo.getAttribute(name); if (!at) continue;
      const n = at.itemSize, arr = new Float32Array(at.count*n), get = ['getX','getY','getZ','getW'];
      for (let i=0;i<at.count;i++) for (let k=0;k<n;k++) arr[i*n+k] = at[get[k]](i);
      out.setAttribute(name, new THREE.BufferAttribute(arr, n));
    }
    if (geo.index) out.setIndex(Array.from(geo.index.array));
    return out;
  };
  function addModels(T, dragonObj){
    spawnDragons(dragonObj ? objDragonMaker(dragonObj) : makeDragon);
    const src = T['sk_minion']?.scene; if (!src) return;
    const parts = [];
    let mat = null, eyeGeo = null;
    src.traverse(o=>{
      if (!o.isMesh) return;
      if (o.name.includes('Head') || o.name.includes('Jaw')){ parts.push(deint(o.geometry)); mat = o.material; }
      if (o.name.includes('Eyes')){ eyeGeo = deint(o.geometry); eyeGeo.deleteAttribute('uv'); }
    });
    if (!parts.length) return;
    const geo = mergeGeometries(parts); geo.translate(0, -1.62, 0);
    if (eyeGeo) eyeGeo.translate(0, -1.62, 0);
    const skMat = mat.clone(); skMat.color = new THREE.Color(0xd8cdb4);
    const eyeMat = new THREE.MeshBasicMaterial({ color:0x8be36b });
    const spots = [];
    for (let i=0;i<22;i++) spots.push([FIELD.x0+14+R()*(FIELD.x1-FIELD.x0-28), 590+R()*400, .45+R()*.2]);
    [[FIELD.x0+16, 800],[FIELD.x1-16, 760],[FIELD.x0+18, 610],[FIELD.x1-18, 930]].forEach(([x,y])=>{ for (let i=0;i<6;i++) spots.push([x+(R()-.5)*30, y+(R()-.5)*34, .5+R()*.2]); });
    const inst = new THREE.InstancedMesh(geo, skMat, spots.length);
    const glow = eyeGeo ? new THREE.InstancedMesh(eyeGeo, eyeMat, spots.length) : null;
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), Sc = new THREE.Vector3();
    let ng = 0;
    spots.forEach(([x,y,s2], i)=>{
      E.set((R()-.5)*.6, R()*6.28, (R()-.5)*.9); Q.setFromEuler(E);
      P.set(wx(x), .1*s2/.3 - .04, wz(y)); Sc.setScalar(s2);
      M.compose(P, Q, Sc); inst.setMatrixAt(i, M);
      if (glow && R() < .35) glow.setMatrixAt(ng++, M);
    });
    inst.castShadow = true; inst.receiveShadow = true; scene.add(inst);
    if (glow){ glow.count = ng; scene.add(glow); updaters.push(t=>{ eyeMat.color.setHSL(.28, .8, .45 + .15*Math.sin(t*2.5)); }); }
  }

  return { update(t, dt){ for (const u of updaters) u(t, dt); }, addModels };
}
