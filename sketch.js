let model=null, labels=[], predictions=null, busy=false;
let status='boot';            // boot | loading | ready | error
let capture=null, usingWebcam=false, uploadedImg=null, source=null;
let pg;                       // buffer basse résolution pour l'effet pixel
let cnv, blink=0;
let btnRects=[];              // boutons dessinés dans la borne (hit-test souris)

const BINS = {
  jaune:    {name:"YELLOW BIN", sub:"packaging + paper",             col:[255,210,63],  fg:[20,16,8]},
  verre:    {name:"WHITE BIN",  sub:"glass only",                    col:[37,229,198], fg:[10,28,24]},
  marron:   {name:"BROWN BIN",  sub:"food waste",                    col:[224,138,60], fg:[28,14,4]},
  residuel: {name:"GREEN BIN",  sub:"non-recyclable / incineration", col:[76,200,104], fg:[10,30,14]},
  textile:  {name:"TEXTILE BANK",sub:"clothing drop-off point",      col:[150,120,230],fg:[255,255,255]},
  rien:     {name:"NOTHING",    sub:"show some waste",               col:[126,111,192],fg:[12,8,24]},
  unknown:  {name:"???",        sub:"material not recognized",       col:[255,93,162], fg:[255,255,255]}
};
function binFor(label){
  const s=(label||'').toLowerCase();
  if(/(rien|none|nothing|fond|background|vide|empty|main|hand|visage|face)/.test(s)) return 'rien';
  if(/(textile|tissu|vetement|vêtement|cloth|fabric)/.test(s)) return 'textile';
  if(/(glass|verre)/.test(s)) return 'verre';
  if(/(plastic|plastique|pet|hdpe)/.test(s)) return 'jaune';
  if(/(metal|métal|alumin|canette|\bcan\b|tin)/.test(s)) return 'jaune';
  if(/(cardboard|carton)/.test(s)) return 'jaune';
  if(/(paper|papier)/.test(s)) return 'jaune';
  if(/(organic|aliment|food|compost|biolog|epluch|marron|vegetation|végét|veget|plant|jardin|garden|green ?waste)/.test(s)) return 'marron';
  if(/(trash|déchet|dechet|ordure|résidu|residu|autre|general|général|miscellaneous|misc|divers)/.test(s)) return 'residuel';
  return 'unknown';
}

function setup(){
  const W=Math.min(720, window.innerWidth-24);
  cnv=createCanvas(W, Math.round(W*1.32));    // un peu plus haut pour loger le cadre de borne
  cnv.parent('holder');
  pixelDensity(1); noSmooth(); frameRate(30);
  pg=createGraphics(96,72); pg.noSmooth();
  textFont('"Press Start 2P"');
  loadTMModel();

  document.getElementById('loadBtn').onclick=loadTMModel;
  document.getElementById('fileInput').onchange=handleFile;
}
function windowResized(){
  const W=Math.min(720, window.innerWidth-24);
  resizeCanvas(W, Math.round(W*1.32));
}

async function loadTMModel(){
  let base=document.getElementById('modelUrl').value.trim();
  if(!base){ status='error'; return; }
  if(!base.endsWith('/')) base+='/';
  status='loading';
  try{
    model=await tmImage.load(base+'model.json', base+'metadata.json');
    labels=model.getClassLabels();
    status='ready';
  }catch(e){ console.error(e); status='error'; model=null; }
}
function startWebcam(){
  if(capture) capture.remove();
  capture=createCapture(VIDEO, ()=>{}); capture.size(192,144); capture.hide();
  usingWebcam=true; uploadedImg=null; source=capture; predictions=null;
}
function takePhoto(){
  // fige l'image courante de la webcam (en MIROIR) -> verdict stable
  if(!usingWebcam || !capture || !capture.elt || capture.elt.readyState<2) return;
  const g=createGraphics(capture.width, capture.height); g.noSmooth();
  g.push(); g.translate(g.width,0); g.scale(-1,1);
  g.image(capture, 0,0,g.width,g.height); g.pop();
  stopWebcam();                 // coupe la cam live
  uploadedImg=g; source=g;      // l'image statique devient la source classée
  predictions=null;
}
function stopWebcam(){
  // coupe vraiment la caméra : on stoppe les pistes (le voyant s'éteint) puis on retire l'élément
  if(capture){
    if(capture.elt && capture.elt.srcObject){
      capture.elt.srcObject.getTracks().forEach(t=>t.stop());
    }
    capture.remove(); capture=null;
  }
  usingWebcam=false;
  if(!uploadedImg){ source=null; predictions=null; }
}
function openFile(){ document.getElementById('fileInput').click(); }
function handleFile(e){
  const f=e.target.files[0]; if(!f) return;
  stopWebcam();
  loadImage(URL.createObjectURL(f), img=>{ uploadedImg=img; source=img; });
}

async function runPrediction(){
  if(!model || busy) return;
  let src=null;
  if(usingWebcam && capture && capture.elt && capture.elt.readyState>=2) src=capture.elt;
  else if(uploadedImg) src=uploadedImg.canvas;
  if(!src) return;
  busy=true;
  try{ predictions=await model.predict(src); }catch(err){}
  busy=false;
}

// ---------- helpers de dessin "borne" ----------
function bevelRect(x,y,w,h, base, light, dark){
  noStroke();
  fill(dark[0],dark[1],dark[2]);   rect(x+3,y+3,w,h);          // ombre portée
  fill(base[0],base[1],base[2]);   rect(x,y,w,h);              // corps
  fill(light[0],light[1],light[2]);rect(x,y,w,4); rect(x,y,4,h); // arête lumineuse haut+gauche
  fill(dark[0],dark[1],dark[2]);   rect(x,y+h-4,w,4); rect(x+w-4,y,4,h); // arête sombre bas+droite
}

function draw(){
  background(8,5,20);
  blink+=0.08;
  const W=width, H=height, m=Math.round(W*0.03);

  // ---- Corps de la borne ----
  bevelRect(m, m, W-2*m, H-2*m, [40,28,84], [74,56,140], [16,11,38]);
  const ip = Math.round(W*0.05);               // padding intérieur de la borne
  const cx = m+ip, cw = W-2*(m+ip);
  let y = m+ip;

  // ---- Marquee (titre lumineux) ----
  const mh = Math.round(W*0.085);
  noStroke(); fill(24,16,52); rect(cx, y, cw, mh);
  // grilles haut-parleur décoratives
  fill(70,54,128);
  for(let gx=0; gx<3; gx++) for(let gy=0; gy<3; gy++){
    rect(cx+6+gx*7, y+mh/2-9+gy*7, 3,3);
    rect(cx+cw-6-3-gx*7, y+mh/2-9+gy*7, 3,3);
  }
  push();
  textAlign(CENTER,CENTER); textSize(Math.max(13,W*0.04));
  const glow=150+Math.sin(blink*1.4)*60;
  fill(255,210,63, glow); text("TRI-O-MATIC", W/2+2, y+mh/2+2);
  fill(255,93,162);       text("TRI-O-MATIC", W/2,   y+mh/2);
  pop();
  y += mh + Math.round(W*0.025);

  // ---- Statut (LED) ----
  push();
  textAlign(RIGHT,TOP); textSize(8);
  let led=[120,120,120];
  if(status==='ready'){ led=[37,229,198]; }
  else if(status==='loading'){ led=[255,210,63]; }
  else if(status==='error'){ led=[255,80,80]; }
  noStroke(); fill(led[0],led[1],led[2], 160+Math.sin(blink*3)*80);
  rect(cx+cw-10, y+1, 7,7);
  fill(led[0],led[1],led[2]);
  const stxt = status==='ready'?"MODEL OK": status==='loading'?"LOADING": status==='error'?"ERROR":"BOOT...";
  text(stxt, cx+cw-16, y);
  // pastille cam
  fill(usingWebcam? [255,93,162] : [70,54,128]);
  textAlign(LEFT,TOP);
  text(usingWebcam? "CAM ON":"CAM OFF", cx, y);
  pop();
  y += Math.round(W*0.03);

  // ---- Ecran (webcam pixelisee) ----
  const camW=cw, camH=Math.round(camW*0.52);
  bevelRect(cx, y, camW, camH, [12,9,28], [40,30,72], [4,3,12]);
  const sx=cx+5, sy=y+5, sw=camW-10, sh=camH-10;
  noStroke(); fill(6,4,16); rect(sx,sy,sw,sh);
  if(source){
    pg.background(0);
    if(usingWebcam){              // webcam live : miroir (vue selfie)
      pg.push(); pg.translate(pg.width,0); pg.scale(-1,1);
      pg.image(capture, 0,0,pg.width,pg.height); pg.pop();
    } else {                      // photo figee (deja en miroir) ou image importee
      pg.image(uploadedImg, 0,0,pg.width,pg.height);
    }
    image(pg, sx,sy,sw,sh);
    stroke(0,0,0,70); strokeWeight(1);
    for(let yy=sy; yy<sy+sh; yy+=3) line(sx,yy,sx+sw,yy);
  }else{
    push();
    textAlign(CENTER,CENTER); noStroke();
    textSize(11); fill(126,111,192,150+Math.sin(blink)*100);
    text("> INSERT WASTE", W/2, sy+sh/2-10);
    textSize(8); fill(90,80,150);
    text(usingWebcam? "STARTING CAM..." : "WEBCAM  or  IMAGE", W/2, sy+sh/2+12);
    pop();
  }
  y += camH + Math.round(W*0.03);

  // ---- Verdict ----
  let topLabel=null, topProb=0;
  if(predictions){ predictions.forEach(p=>{ if(p.probability>topProb){ topProb=p.probability; topLabel=p.className; } }); }
  const binKey = topLabel ? binFor(topLabel) : 'rien';
  const bin = BINS[binKey];
  const isBin = binKey!=='rien' && binKey!=='unknown';
  const vH=Math.round(W*0.165);
  push();
  noStroke();
  fill(bin.col[0]*0.35,bin.col[1]*0.35,bin.col[2]*0.35); rect(cx+4,y+4,cw,vH);
  fill(bin.col[0],bin.col[1],bin.col[2]); rect(cx,y,cw,vH);
  fill(bin.fg[0],bin.fg[1],bin.fg[2]);
  if(isBin){
    // consigne : juste DANS QUELLE POUBELLE jeter
    textFont('"VT323"'); textAlign(CENTER,CENTER); textSize(Math.max(13,W*0.034));
    text("THROW IT IN", W/2, y+vH*0.29);
    textFont('"Press Start 2P"'); textSize(Math.max(13,W*0.05));
    // fleches clignotantes autour du nom de poubelle
    if(Math.sin(blink*2)>0){
      textAlign(LEFT,CENTER);  text(">", cx+10, y+vH*0.66);
      textAlign(RIGHT,CENTER); text("<", cx+cw-10, y+vH*0.66);
    }
    textAlign(CENTER,CENTER);
    text(bin.name, W/2, y+vH*0.66);
    // matiere detectee + confiance, discret en haut a droite
    textFont('"VT323"'); textAlign(RIGHT,TOP); textSize(Math.max(12,W*0.027));
    text(topLabel.toUpperCase()+" "+Math.round(topProb*100)+"%", cx+cw-10, y+7);
  } else {
    textAlign(CENTER,CENTER); textSize(Math.max(12,W*0.042));
    text(bin.name, W/2, y+vH*0.36);
    textFont('"VT323"'); textSize(Math.max(15,W*0.034));
    text(bin.sub.toUpperCase(), W/2, y+vH*0.72);
  }
  textFont('"Press Start 2P"');
  pop();
  y += vH + Math.round(W*0.03);

  // ---- Boutons (dessinés en bas de la borne) ----
  const innerBottom = m + (H-2*m) - ip;
  const bh = Math.round(W*0.085);
  const btnY = innerBottom - bh;

  // ---- Barres de confiance (power bars) ----
  if(predictions){
    push(); textFont('"VT323"'); textAlign(LEFT,CENTER);
    const avail=(btnY - Math.round(W*0.025)) - y;   // espace entre verdict et boutons
    const rowH=Math.max(16, Math.min(32, avail/predictions.length));
    predictions.forEach((p,i)=>{
      const ry=y+i*rowH, b=BINS[binFor(p.className)];
      noStroke(); fill(190); textSize(Math.min(18,rowH*0.7));
      text(p.className.toUpperCase(), cx, ry+rowH/2-2);
      const bx=cx+cw*0.36, bw=cx+cw-bx, seg=12, gap=2;
      const segw=(bw-(seg-1)*gap)/seg, filled=Math.round(p.probability*seg);
      for(let s=0;s<seg;s++){
        if(s<filled){ fill(b.col[0],b.col[1],b.col[2]); } else { fill(28,20,56); }
        rect(bx+s*(segw+gap), ry+rowH*0.24, segw, rowH*0.5);
      }
    });
    pop();
  }

  drawButtons(cx, cw, btnY, bh);

  if(frameCount%4===0) runPrediction();
}

// ---- icônes pixel ----
function powerIcon(px,py,s,fg){
  push();
  noFill(); stroke(fg[0],fg[1],fg[2]); strokeWeight(Math.max(2,s*0.13)); strokeCap(PROJECT);
  arc(px, py, s, s, radians(-55), radians(235));
  line(px, py - s*0.55, px, py - s*0.02);
  pop();
}
function cameraIcon(px,py,s,fg,face){
  push(); noStroke();
  fill(fg[0],fg[1],fg[2]);
  rect(px - s*0.55, py - s*0.18, s*1.1, s*0.66);     // corps
  rect(px - s*0.18, py - s*0.34, s*0.36, s*0.18);    // viseur
  fill(face[0],face[1],face[2]); ellipse(px, py+s*0.14, s*0.44, s*0.44); // objectif (trou)
  fill(fg[0],fg[1],fg[2]);       ellipse(px, py+s*0.14, s*0.18, s*0.18); // pastille centre
  pop();
}

function drawButtons(cx, cw, by, bh){
  const camOn=usingWebcam;
  const defs=[
    {id:'cam',  kind:'power',  en:true,
      col: camOn?[91,227,106]:[96,86,128], dark: camOn?[31,138,45]:[52,44,82],
      fg:  camOn?[12,40,16]:[210,205,235], sub: camOn?'CAM ON':'CAM OFF'},
    {id:'photo',kind:'camera', en:camOn,
      col:[37,229,198], dark:[18,133,119], fg:[10,40,36], sub:'PHOTO'},
    {id:'img',  kind:'text',   en:true,
      col:[255,93,162], dark:[161,45,99], fg:[255,255,255], sub:'INSERT IMAGE'},
  ];
  const gap=Math.round(cw*0.03);
  const bw=(cw-(defs.length-1)*gap)/defs.length;
  btnRects=[];
  push(); textAlign(CENTER,CENTER);
  defs.forEach((d,i)=>{
    const x=cx+i*(bw+gap);
    const hover = mouseX>=x && mouseX<=x+bw && mouseY>=by && mouseY<=by+bh;
    const pressed = d.en && hover && mouseIsPressed;
    const oy = pressed?2:0;
    let face=d.col, dark=d.dark, fg=d.fg;
    if(!d.en){ face=[60,50,96]; dark=[34,28,60]; fg=[120,108,150]; }
    noStroke();
    fill(dark[0],dark[1],dark[2]); rect(x+4, by+4, bw, bh);     // ombre
    fill(face[0],face[1],face[2]); rect(x+oy, by+oy, bw, bh);   // face
    const icx=x+bw/2+oy;
    if(d.kind==='text'){
      textFont('"VT323"'); textSize(Math.max(15, Math.min(26, bw*0.135)));
      fill(fg[0],fg[1],fg[2]); text(d.sub, icx, by+bh/2+oy+1);
    } else {
      const s=bh*0.42, iy=by+bh*0.40+oy;
      if(d.kind==='power')  powerIcon(icx, iy, s, fg);
      if(d.kind==='camera') cameraIcon(icx, iy, s, fg, face);
      textFont('"VT323"'); textSize(Math.max(12, Math.min(18, bw*0.11)));
      fill(fg[0],fg[1],fg[2]); text(d.sub, icx, by+bh*0.82+oy);
    }
    btnRects.push({x, y:by, w:bw, h:bh, id:d.id, en:d.en});
  });
  pop();
}

function mousePressed(){
  for(const b of btnRects){
    if(!b.en) continue;
    if(mouseX>=b.x && mouseX<=b.x+b.w && mouseY>=b.y && mouseY<=b.y+b.h){
      if(b.id==='cam')   usingWebcam ? stopWebcam() : startWebcam();
      if(b.id==='photo') takePhoto();
      if(b.id==='img')   openFile();
      return;
    }
  }
}
