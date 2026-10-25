// Page « Taxe sous-occupation » : simulateur détaillé, indépendant de la page Ajustement.
(function(){
const D = window.SOUSOCC; if(!D) return;
const C = Object.fromEntries(D.cols.map((c,i)=>[c,i]));
const ROWS = D.rows;
// Alsace-Moselle : pas de données DVF (livre foncier). On estime le prix par la moyenne, pondérée par le nombre
// de logements, des communes de la même zone hors Île-de-France.
(function(){
  const IDF = new Set(["75","77","78","91","92","93","94","95"]), acc = {};
  for(const r of ROWS){ if(IDF.has(r[C.dep]) || !r[C.pm] || !r[C.pa]) continue; const a = acc[r[C.zone]] ||= [0,0,0,0];
    a[0]+=r[C.pm]*r[C.rpm]; a[1]+=r[C.rpm]; a[2]+=r[C.pa]*r[C.rpa]; a[3]+=r[C.rpa]; }
  for(const r of ROWS){ if(r[C.pm] && r[C.pa]) continue; const a = acc[r[C.zone]]; if(!a) continue;
    if(!r[C.pm]) r[C.pm] = Math.round(a[0]/a[1]); if(!r[C.pa]) r[C.pa] = Math.round(a[2]/a[3]); r[C.src] = "x"; }
})();
const nf0 = new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0});
const nf1 = new Intl.NumberFormat("fr-FR",{maximumFractionDigits:1, minimumFractionDigits:1});
const nf2 = new Intl.NumberFormat("fr-FR",{maximumFractionDigits:2});
const md = v => (Math.abs(v)>=100 ? nf0.format(v) : nf1.format(v)) + " Md€";
const eur = v => nf0.format(Math.round(v/10)*10) + " €";
const keur = v => nf0.format(Math.round(v/1000)) + " k€";
const mil = v => v>=1e6 ? nf2.format(v/1e6)+" million"+(v>=2e6?"s":"") : nf0.format(Math.round(v/100)*100);
const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");
const DEFICIT_2025 = 152.5, PIB_2025 = 2991.1;
const ZONE_LABEL = {1:"Zone tendue", 2:"Zone touristique et tendue", 3:"Hors zone tendue"};

// Taux nationaux Insee (Insee Première n° 2064) servant à répartir la sous-occupation d'une commune
const RATE = { maison:0.41, appart:0.04, prop:0.39, loc:0.07 };

const DEF = { z1:true, z2:false, z3:false, seuil:"3", t3:1, t2:0.5, qui:"prop", sm:130, sa:90, fr:0, cap:0, dem:0 };
const st = {...DEF};
try{ Object.assign(st, JSON.parse(localStorage.getItem("visu-taxe")||"{}")); }catch(e){}
try{ if(location.hash.startsWith("#t=")) Object.assign(st, JSON.parse(decodeURIComponent(location.hash.slice(3)))); }catch(e){}
const save = () => { const diff = Object.fromEntries(Object.entries(st).filter(([k,v])=>DEF[k]!==v));
  try{ localStorage.setItem("visu-taxe", JSON.stringify(diff)); }catch(e){}
  try{ history.replaceState(null,"",location.pathname+(Object.keys(diff).length ? "#t="+encodeURIComponent(JSON.stringify(diff)) : "")); }catch(e){} };

// Calcul par commune
function compute(){
  const zones = new Set([st.z1&&1, st.z2&&2, st.z3&&3].filter(Boolean));
  const out = { N:0, rev:0, val:0, freed:0, suro:0, rp:0, tacc:0, list:[], byDep:{}, hist:[] };
  for(const r of ROWS){
    const z = r[C.zone]; if(!zones.has(z)) continue;
    const rp=r[C.rp], rpm=r[C.rpm], rpa=r[C.rpa], prop=r[C.prop], t3=r[C.tacc], t2=r[C.acc];
    const wM = RATE.maison*rpm, wA = RATE.appart*rpa, sM = (wM+wA) ? wM/(wM+wA) : 1;
    const wP = RATE.prop*prop, wL = RATE.loc*Math.max(0,rp-prop), sO = st.qui==="tous" ? 1 : ((wP+wL) ? wP/(wP+wL) : 0.89);
    const pm = r[C.pm], pa = r[C.pa];
    const v3 = sM*st.sm*pm + (1-sM)*st.sa*pa, v2 = sM*(st.sm-10)*pm + (1-sM)*(st.sa-10)*pa;
    const tax = (v,rate) => { let x = Math.max(0, v - st.fr)*rate/100; if(st.cap) x = Math.min(x, st.cap); return x; };
    const n3 = t3*sO, n2 = st.seuil==="2" ? t2*sO : 0;
    const x3 = tax(v3, st.t3), x2 = tax(v2, st.t2);
    const keep = 1 - st.dem/100;
    const rev = (n3*x3 + n2*x2)*keep;
    const N = n3 + n2;
    out.N += N*keep; out.rev += rev; out.val += (n3*v3 + n2*v2)*keep; out.freed += N*st.dem/100;
    out.suro += r[C.suro]; out.rp += rp; out.tacc += t3;
    const avg = N ? (n3*x3 + n2*x2)/N : 0;
    out.list.push({ code:r[C.code], nom:r[C.nom], dep:r[C.dep], epci:r[C.epci], z, rp, N:N*keep, vmoy: N ? (n3*v3+n2*v2)/N : 0, tmoy:avg, rev, freed:N*st.dem/100, suro:r[C.suro], src:r[C.src] });
    const d = out.byDep[r[C.dep]] ||= { dep:r[C.dep], rev:0, N:0, freed:0, suro:0 };
    d.rev += rev; d.N += N*keep; d.freed += N*st.dem/100; d.suro += r[C.suro];
    if(N*keep>0) out.hist.push([avg, N*keep]);
  }
  return out;
}

// Rendu
const root = document.getElementById("taxe");
const opt = (v,l,cur) => `<option value="${v}" ${String(cur)===String(v)?"selected":""}>${l}</option>`;
function controlsHTML(){
  return `<div class="tx-ctrl">
    <fieldset><legend>Où</legend>
      <label><input type="checkbox" data-k="z1" ${st.z1?"checked":""}> Zones tendues <span class="tx-s">1 430 communes</span></label>
      <label><input type="checkbox" data-k="z2" ${st.z2?"checked":""}> Zones touristiques et tendues <span class="tx-s">2 259 communes</span></label>
      <label><input type="checkbox" data-k="z3" ${st.z3?"checked":""}> Reste de la France <span class="tx-s">31 169 communes</span></label>
    </fieldset>
    <fieldset><legend>Quels logements</legend>
      <label>Pièces en trop<select data-k="seuil">${opt("3","3 ou plus",st.seuil)}${opt("2","2 ou plus",st.seuil)}</select></label>
      <label>Qui paie<select data-k="qui">${opt("prop","Propriétaires occupants",st.qui)}${opt("tous","Aussi les logements loués (taxe due par le bailleur)",st.qui)}</select></label>
      <label>Franchise sur la valeur<select data-k="fr" data-num>${[0,100000,200000,300000].map(v=>opt(v, v?nf0.format(v/1000)+" k€ non taxés":"Aucune", st.fr)).join("")}</select></label>
      <label>Plafond par logement<select data-k="cap" data-num>${[0,5000,10000,20000].map(v=>opt(v, v?nf0.format(v)+" € par an":"Aucun", st.cap)).join("")}</select></label>
    </fieldset>
    <fieldset><legend>Taux annuel (% de la valeur du logement)</legend>
      <label>3 pièces ou plus en trop <b data-out="t3">${nf2.format(st.t3)} %</b><input type="range" min="0" max="3" step="0.1" value="${st.t3}" data-k="t3"></label>
      <label ${st.seuil==="2"?"":"class=\"tx-off\""}>Exactement 2 pièces en trop <b data-out="t2">${nf2.format(st.t2)} %</b><input type="range" min="0" max="3" step="0.1" value="${st.t2}" data-k="t2" ${st.seuil==="2"?"":"disabled"}></label>
    </fieldset>
    <fieldset><legend>Hypothèses</legend>
      <label>Ménages qui vendent et partent <b data-out="dem">${st.dem} %</b><input type="range" min="0" max="80" step="5" value="${st.dem}" data-k="dem"></label>
      <label>Surface d'une maison concernée <b data-out="sm">${st.sm} m²</b><input type="range" min="90" max="200" step="5" value="${st.sm}" data-k="sm"><span class="tx-s">Moyenne de toutes les maisons en France : ≈ 112 m². Les maisons sous-occupées ont souvent 5 pièces ou plus, donc sont plus grandes.</span></label>
      <label>Surface d'un appartement concerné <b data-out="sa">${st.sa} m²</b><input type="range" min="60" max="150" step="5" value="${st.sa}" data-k="sa"><span class="tx-s">Moyenne de tous les appartements : ≈ 63 m². Un appartement avec 3 pièces en trop a au moins 4 ou 5 pièces.</span></label>
      <button type="button" id="tx-reset">Réglages par défaut</button>
    </fieldset>
  </div>`;
}
function render(){
  root.innerHTML = `${controlsHTML()}
    <div class="kpis" id="tx-kpis"></div>
    <div class="tx-grid">
      <section class="card"><h2>Rendement par département</h2><p class="sub">Les 15 départements qui rapportent le plus, en millions d'euros par an.</p><div id="tx-dep" class="tx-bars"></div></section>
      <section class="card"><h2>Combien paie un ménage concerné ?</h2><p class="sub">Répartition des logements taxés selon la taxe moyenne de leur commune.</p><div id="tx-hist" class="tx-bars"></div></section>
    </div>
    <section class="card"><h2>Logements libérés et ménages à l'étroit</h2><p class="sub" id="tx-freed-intro"></p><div id="tx-freed" class="tx-bars"></div></section>
    <section class="card"><h2>Grandes villes et Île-de-France</h2>
      <p class="sub">Les 10 plus grandes villes hors Île-de-France (classées par nombre de résidences principales) et l'ensemble de l'Île-de-France. <span id="tx-count"></span></p>
      <div class="scroller"><table class="tx-table" id="tx-table"></table></div></section>
    <section class="card"><h2>Simuler un logement</h2>
      <div class="tx-sim"><label>Valeur du logement<input type="number" id="sim-v" min="0" step="10000" value="500000"> €</label>
        <label>Pièces en trop<select id="sim-p">${opt("3","3 ou plus","3")}${opt("2","2","3")}</select></label>
        <div id="sim-out" class="tx-simout"></div></div></section>`;
  bind(); update();
}
function update(){
  const o = compute();
  document.getElementById("tx-kpis").innerHTML = `
    <div class="kpi"><div class="l">Rendement annuel</div><div class="v">${md(o.rev/1e9)}</div><div class="s">${nf1.format(o.rev/1e9/PIB_2025*100)} % du PIB · ${nf0.format(o.rev/1e9/DEFICIT_2025*100)} % du déficit public 2025</div></div>
    <div class="kpi"><div class="l">Logements taxés</div><div class="v">${mil(o.N)}</div><div class="s">${st.dem?`après départ de ${mil(o.freed)} ménages`:"aucun départ supposé"}</div></div>
    <div class="kpi"><div class="l">Taxe moyenne</div><div class="v">${o.N?eur(o.rev/o.N):"—"}</div><div class="s">par an et par logement · valeur moyenne ${o.N?keur(o.val/o.N):"—"}</div></div>
    <div class="kpi"><div class="l">Grands logements libérés</div><div class="v">${mil(o.freed)}</div><div class="s">face à ${mil(o.suro)} ménages en suroccupation dans ces zones</div></div>`;
  // départements
  const deps = Object.values(o.byDep).sort((a,b)=>b.rev-a.rev).slice(0,15), mx = Math.max(1,...deps.map(d=>d.rev));
  document.getElementById("tx-dep").innerHTML = deps.map(d=>`<div class="tx-bar"><span class="tx-bl">${esc(DEPNAME[d.dep]||d.dep)}</span><span class="tx-bt"><i style="width:${d.rev/mx*100}%"></i></span><span class="tx-bv">${nf0.format(d.rev/1e6)} M€</span></div>`).join("") || `<p class="sub">Choisissez au moins une zone.</p>`;
  // histogramme
  const B = [[0,1000],[1000,2500],[2500,5000],[5000,7500],[7500,10000],[10000,15000],[15000,1e12]], h = B.map(()=>0);
  for(const [t,n] of o.hist){ const i = B.findIndex(([a,b])=>t>=a && t<b); if(i>=0) h[i]+=n; }
  const hm = Math.max(1,...h), lab = ([a,b]) => b>1e11 ? `${nf0.format(a)} € et plus` : `${nf0.format(a)} à ${nf0.format(b)} €`;
  document.getElementById("tx-hist").innerHTML = B.map((b,i)=>`<div class="tx-bar"><span class="tx-bl">${lab(b)}</span><span class="tx-bt"><i style="width:${h[i]/hm*100}%"></i></span><span class="tx-bv">${mil(h[i])}</span></div>`).join("");
  // logements libérés vs suroccupation
  document.getElementById("tx-freed-intro").innerHTML = st.dem
    ? `Si ${st.dem} % des ménages taxés vendent, ${mil(o.freed)} grands logements (au moins ${st.seuil==="2"?"2":"3"} pièces de plus que les besoins de leurs occupants) reviennent sur le marché. En face : les ménages en <b>suroccupation</b>, qui ont moins de pièces que la norme, souvent des familles. Les 10 départements où il y en a le plus :`
    : `Réglez la part de « ménages qui vendent et partent » pour voir combien de grands logements seraient libérés, face aux ménages en <b>suroccupation</b> (moins de pièces que la norme, souvent des familles).`;
  const fd = Object.values(o.byDep).sort((a,b)=>b.suro-a.suro).slice(0,10), fm = Math.max(1,...fd.map(d=>Math.max(d.suro,d.freed)));
  document.getElementById("tx-freed").innerHTML = fd.map(d=>`<div class="tx-bar tx-pair"><span class="tx-bl">${esc(DEPNAME[d.dep]||d.dep)}</span>
      <span class="tx-bt"><i class="f" style="width:${d.freed/fm*100}%"></i><i class="s" style="width:${d.suro/fm*100}%"></i></span>
      <span class="tx-bv">${nf0.format(d.freed/1000)} k libérés · ${nf0.format(d.suro/1000)} k à l'étroit</span></div>`).join("")
    + `<p class="tx-s"><i class="tx-key f"></i> logements libérés <i class="tx-key s"></i> ménages en suroccupation (recensement 2022)</p>`;
  table(o); sim();
}
// Tableau compact : les 10 plus grandes villes hors Île-de-France (par nombre de résidences principales) et l'Île-de-France entière
const IDF_DEPS = new Set(["75","77","78","91","92","93","94","95"]);
function table(o){
  const big = o.list.filter(r=>!String(r.code).startsWith("D") && !IDF_DEPS.has(r.dep)).sort((a,b)=>b.rp-a.rp).slice(0,10);
  const idf = o.list.filter(r=>IDF_DEPS.has(r.dep)).reduce((a,r)=>{ a.rp+=r.rp; a.N+=r.N; a.rev+=r.rev; a.val+=r.vmoy*r.N; a.n++;
    if(String(r.code).startsWith("D")) a.rest=true; else a.c++; a.z.add(r.z); return a; }, {rp:0,N:0,rev:0,val:0,n:0,c:0,rest:false,z:new Set()});
  const row = (nom, note, z, rp, N, vmoy, rev, cls="") => `<tr class="${cls}"><td class="l">${esc(nom)} <span class="tx-s">${note}</span></td><td class="l">${z}</td><td>${nf0.format(rp)}</td><td>${nf0.format(N)}</td><td>${vmoy?keur(vmoy):"—"}</td><td>${N?eur(rev/N):"—"}</td><td>${nf1.format(rev/1e6)} M€</td></tr>`;
  const rows = big.map(r=>row(r.nom, esc(r.dep)+(r.src==="x"?" · prix estimé (pas de DVF en Alsace-Moselle)":r.src!=="c"?" · prix du département":""), ZONE_LABEL[r.z], r.rp, r.N, r.vmoy, r.rev));
  if(idf.n) rows.push(row("Île-de-France", idf.rest ? "toute la région, Paris compris" : `${nf0.format(idf.c)} communes, Paris compris`, idf.z.size>1 ? "Plusieurs zones" : ZONE_LABEL[[...idf.z][0]], idf.rp, idf.N, idf.N?idf.val/idf.N:0, idf.rev, "tx-tot"));
  const share = o.rev ? ([...big].reduce((a,r)=>a+r.rev,0) + idf.rev)/o.rev*100 : 0;
  document.getElementById("tx-count").textContent = o.rev ? `Ces lignes représentent ${nf0.format(share)} % du rendement total.` : "";
  document.getElementById("tx-table").innerHTML = `<thead><tr><th class="l">Commune</th><th class="l">Zone</th><th>Rés. principales</th><th>Logements taxés</th><th>Valeur moyenne</th><th>Taxe moyenne</th><th>Rendement</th></tr></thead><tbody>${rows.join("") || `<tr><td class="l" colspan="7">Aucune commune dans les zones choisies.</td></tr>`}</tbody>`;
}
function sim(){
  const v = +document.getElementById("sim-v").value||0, p = document.getElementById("sim-p").value;
  const rate = p==="3" ? st.t3 : (st.seuil==="2" ? st.t2 : 0);
  let x = Math.max(0, v - st.fr)*rate/100; if(st.cap) x = Math.min(x, st.cap);
  document.getElementById("sim-out").innerHTML = rate
    ? `<b>${eur(x)} par an</b>, soit ${eur(x/12)} par mois.${st.fr?` Franchise de ${nf0.format(st.fr)} € déduite.`:""}${st.cap&&x>=st.cap?" Plafond atteint.":""} En dix ans : ${eur(x*10)}, soit ${nf1.format(v?x*10/v*100:0)} % de la valeur du logement.`
    : `Avec les réglages actuels, un logement avec 2 pièces en trop n'est pas taxé (choisissez « 2 ou plus »).`;
}
function bind(){
  root.querySelectorAll("[data-k]").forEach(el=>{
    const k = el.dataset.k, ev = el.type==="range" ? "input" : "change";
    el.addEventListener(ev,()=>{
      st[k] = el.type==="checkbox" ? el.checked : (el.type==="range" || el.dataset.num!==undefined) ? +el.value : el.value;
      const o = root.querySelector(`[data-out="${k}"]`); if(o) o.textContent = k==="dem" ? st[k]+" %" : (k==="sm"||k==="sa") ? st[k]+" m²" : nf2.format(st[k])+" %";
      save(); if(k==="seuil") render(); else update();
    });
  });
  document.getElementById("tx-reset").addEventListener("click",()=>{ Object.assign(st, DEF); save(); render(); });
  document.getElementById("sim-v").addEventListener("input",sim);
  document.getElementById("sim-p").addEventListener("change",sim);
}

const DEPNAME = {"01":"Ain","02":"Aisne","03":"Allier","04":"Alpes-de-Haute-Provence","05":"Hautes-Alpes","06":"Alpes-Maritimes","07":"Ardèche","08":"Ardennes","09":"Ariège","10":"Aube","11":"Aude","12":"Aveyron","13":"Bouches-du-Rhône","14":"Calvados","15":"Cantal","16":"Charente","17":"Charente-Maritime","18":"Cher","19":"Corrèze","2A":"Corse-du-Sud","2B":"Haute-Corse","21":"Côte-d'Or","22":"Côtes-d'Armor","23":"Creuse","24":"Dordogne","25":"Doubs","26":"Drôme","27":"Eure","28":"Eure-et-Loir","29":"Finistère","30":"Gard","31":"Haute-Garonne","32":"Gers","33":"Gironde","34":"Hérault","35":"Ille-et-Vilaine","36":"Indre","37":"Indre-et-Loire","38":"Isère","39":"Jura","40":"Landes","41":"Loir-et-Cher","42":"Loire","43":"Haute-Loire","44":"Loire-Atlantique","45":"Loiret","46":"Lot","47":"Lot-et-Garonne","48":"Lozère","49":"Maine-et-Loire","50":"Manche","51":"Marne","52":"Haute-Marne","53":"Mayenne","54":"Meurthe-et-Moselle","55":"Meuse","56":"Morbihan","57":"Moselle","58":"Nièvre","59":"Nord","60":"Oise","61":"Orne","62":"Pas-de-Calais","63":"Puy-de-Dôme","64":"Pyrénées-Atlantiques","65":"Hautes-Pyrénées","66":"Pyrénées-Orientales","67":"Bas-Rhin","68":"Haut-Rhin","69":"Rhône","70":"Haute-Saône","71":"Saône-et-Loire","72":"Sarthe","73":"Savoie","74":"Haute-Savoie","75":"Paris","76":"Seine-Maritime","77":"Seine-et-Marne","78":"Yvelines","79":"Deux-Sèvres","80":"Somme","81":"Tarn","82":"Tarn-et-Garonne","83":"Var","84":"Vaucluse","85":"Vendée","86":"Vienne","87":"Haute-Vienne","88":"Vosges","89":"Yonne","90":"Territoire de Belfort","91":"Essonne","92":"Hauts-de-Seine","93":"Seine-Saint-Denis","94":"Val-de-Marne","95":"Val-d'Oise","971":"Guadeloupe","972":"Martinique","973":"Guyane","974":"La Réunion","976":"Mayotte"};

render();
window.__taxe = { compute, st };
})();
