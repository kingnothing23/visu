// Page « Épargne dormante » : simulateur d'une taxe sur l'épargne liquide au-delà d'un seuil,
// dont on est exonéré en réorientant l'excédent vers des actions (transition, start-up, IA).
(function(){
const nf0 = new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0});
const nf1 = new Intl.NumberFormat("fr-FR",{maximumFractionDigits:1, minimumFractionDigits:1});
const md = v => (Math.abs(v)>=100 ? nf0.format(v) : nf1.format(v)) + " Md€";
const eur = v => nf0.format(Math.round(v)) + " €";
const mil = v => v>=1e6 ? nf1.format(v/1e6)+" million"+(v>=2e6?"s":"") : nf0.format(Math.round(v/1000)*1000);
const PIB = 2991.1, MENAGES = 30.8e6;

// BCE, Distributional Wealth Accounts, France, T1 2026 (Md€), ménages classés par patrimoine net
const G = [
  { k:"B50", l:"50 % les moins dotés", part:0.5, dep:339, av:74 },
  { k:"D6",  l:"50 à 60 %",           part:0.1, dep:144, av:45 },
  { k:"D7",  l:"60 à 70 %",           part:0.1, dep:180, av:88 },
  { k:"D8",  l:"70 à 80 %",           part:0.1, dep:243, av:130 },
  { k:"D9",  l:"80 à 90 %",           part:0.1, dep:328, av:311 },
  { k:"D10", l:"10 % les plus dotés", part:0.1, dep:646, av:1293 },
];
const FONDS_EUROS = 1570.6/(1570.6+606.7); // part des fonds euros dans l'assurance-vie (Banque de France, fin 2025)

// Loi normale (approximation d'Abramowitz et Stegun)
function Phi(x){ const t = 1/(1+0.2316419*Math.abs(x)), d = 0.3989423*Math.exp(-x*x/2);
  const p = d*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274)))); return x>0 ? 1-p : p; }
// Montant au-delà d'un seuil T, pour n ménages dont l'avoir moyen est m, réparti selon une log-normale de dispersion s
function excess(n, m, s, T){
  if(m<=0) return { hh:0, exc:0 };
  const mu = Math.log(m) - s*s/2, a = (Math.log(T)-mu)/s;
  const above = 1-Phi(a), mass = m*(1-Phi(a-s));
  return { hh: n*above, exc: n*Math.max(0, mass - T*above) };
}

const DEF = { seuil:100000, livrets:45000, av:false, seuilAv:150000, taux:1, reor:50, sig:1.0, alloc_t:30, alloc_ia:30, alloc_inf:25 };
// Répartition de l'argent réorienté (en %), le reste va aux autres entreprises françaises
const ALLOC = () => { const t = st.alloc_t, ia = Math.min(st.alloc_ia, 100-t), inf = Math.min(st.alloc_inf, 100-t-ia); return { t, ia, inf, au: 100-t-ia-inf }; };
const st = {...DEF};
try{ Object.assign(st, JSON.parse(localStorage.getItem("visu-epargne")||"{}")); }catch(e){}
try{ if(location.hash.startsWith("#e=")) Object.assign(st, JSON.parse(decodeURIComponent(location.hash.slice(3)))); }catch(e){}
const save = () => { const d = Object.fromEntries(Object.entries(st).filter(([k,v])=>DEF[k]!==v));
  try{ localStorage.setItem("visu-epargne", JSON.stringify(d)); }catch(e){}
  try{ history.replaceState(null,"",location.pathname+(Object.keys(d).length?"#e="+encodeURIComponent(JSON.stringify(d)):"")); }catch(e){} };

function compute(){
  const rows = G.map(g=>{
    const n = MENAGES*g.part;
    // Dépôts : seuil + livrets réglementés exonérés (assimilés à un relèvement du seuil)
    const d = excess(n, g.dep*1e9/n, st.sig, st.seuil + st.livrets);
    const a = st.av ? excess(n, g.av*FONDS_EUROS*1e9/n, st.sig, st.seuilAv) : { hh:0, exc:0 };
    const base = (d.exc + a.exc)/1e9;
    return { ...g, n, hhDep:d.hh, hhAv:a.hh, baseDep:d.exc/1e9, baseAv:a.exc/1e9, base,
      reor: base*st.reor/100, taxe: base*(1-st.reor/100)*st.taux/100 };
  });
  const sum = k => rows.reduce((a,r)=>a+r[k],0);
  const hh = rows.reduce((a,r)=>a+Math.max(r.hhDep, r.hhAv),0);
  return { rows, base:sum("base"), baseDep:sum("baseDep"), baseAv:sum("baseAv"), reor:sum("reor"), taxe:sum("taxe"), hh };
}

// Assiette pour un seuil quelconque (courbe)
function baseAt(T){ return G.reduce((a,g)=>{ const n=MENAGES*g.part, d=excess(n,g.dep*1e9/n,st.sig,T+st.livrets);
  const v = st.av ? excess(n,g.av*FONDS_EUROS*1e9/n,st.sig,st.seuilAv) : {exc:0,hh:0}; a.b+=(d.exc+v.exc)/1e9; a.h+=Math.max(d.hh,v.hh); return a; }, {b:0,h:0}); }

// Placements des ménages, fin 2025 (Banque de France), en Md€
const PLACEMENTS = [
  ["Livret A, LDDS, LEP, PEL", 947.5, "liq"], ["Comptes courants et espèces", 763.0, "liq"], ["Comptes à terme, livrets bancaires", 415.8, "liq"],
  ["Assurance-vie en fonds euros", 1570.6, "eur"], ["Assurance-vie en unités de compte", 606.7, "act"],
  ["Actions cotées", 263.3, "act"], ["Fonds d'actions", 198.6, "act"], ["Actions non cotées (entreprises familiales…)", 1507.4, "nc"],
];
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const COL = () => ({ liq:css("--dep"), eur:css("--niche"), act:css("--etat"), nc:css("--muted"), reor:css("--rec"), tax:css("--dep"),
  t:css("--rec"), ia:css("--etat"), inf:css("--fin"), au:css("--coll"), ink:css("--ink"), muted:css("--muted"), line:css("--line") });

// Aide sur chaque réglage
const HELP = {
  seuil:"La taxe ne touche que l'argent qui dépasse ce montant, par ménage, sur l'ensemble de ses dépôts : comptes courants, livrets (Livret A, LDDS, LEP, livrets bancaires), comptes à terme et plans d'épargne logement. Exemple : avec 100 k€, un ménage qui a 130 000 € de dépôts est concerné pour 30 000 € ; un ménage qui en a 80 000 € ne l'est pas du tout.",
  livrets:"Ajoute au seuil une franchise pour les livrets réglementés (Livret A, LDDS, LEP), afin de les protéger. 45 000 € correspond aux trois livrets remplis au plafond pour une personne, 90 000 € pour un couple. Exemple : seuil de 100 k€ + 45 000 € → seuls les dépôts au-delà de 145 000 € sont visés.",
  av:"Ajoute à l'assiette les fonds euros de l'assurance-vie, avec leur propre seuil. Un fonds euros est la partie « sans risque » d'un contrat d'assurance-vie : le capital est garanti par l'assureur, qui le place surtout en obligations (dette de l'État et des grandes entreprises). C'est le premier placement des Français (1 571 Md€), mais il finance très peu les actions.",
  seuilAv:"Montant de fonds euros par ménage au-delà duquel la taxe s'applique. Il est séparé de celui des dépôts : les fonds euros sont souvent de l'épargne de long terme (retraite, transmission).",
  taux:"Pourcentage prélevé chaque année sur l'épargne qui dépasse le seuil et qui n'a pas été réorientée. Exemple : 1 % sur 30 000 € = 300 € par an. Pour comparer, le Livret A rapporte 1,5 % par an et l'inflation était de 0,8 % fin 2025.",
  reor:"Hypothèse sur la réaction des ménages : quelle part de leur épargne au-dessus du seuil ils déplacent vers des investissements éligibles pour échapper à la taxe. 0 % : personne ne bouge, la taxe rapporte le maximum mais ne finance rien. 100 % : tout est réorienté, la taxe ne rapporte rien mais l'objectif est atteint. La réalité serait entre les deux.",
  alloc_t:"Part de l'argent réorienté qui irait vers des actions d'entreprises de la transition énergétique (énergies renouvelables, rénovation, transports bas carbone…), par exemple via des fonds labellisés Greenfin.",
  alloc_inf:"Part de l'argent réorienté qui irait vers de grands projets de long terme : réseaux électriques, nouveaux réacteurs nucléaires, ferroviaire, réseaux de chaleur, stockage d'énergie. L'épargne réorientée y serait placée via des obligations de projet, des fonds d'infrastructure ou un livret dédié géré par la Caisse des Dépôts ou Bpifrance, qui transmettent l'argent aux projets. Rendement plus modeste que les actions, mais plus régulier. Pour ne pas alourdir la dette publique, ces projets doivent être portés par des entreprises ou des organismes hors du budget de l'État (EDF, RTE, SNCF Réseau, sociétés de projet).",
  alloc_ia:"Part de l'argent réorienté qui irait vers des start-up et des entreprises de l'intelligence artificielle et de l'électrification (batteries, réseaux, pompes à chaleur…), par exemple via des fonds de capital-risque ou un PEA dédié. Le reste va aux autres entreprises françaises.",
  sig:"Les données de la BCE donnent l'épargne moyenne de chaque tranche de ménages, pas sa répartition à l'intérieur de la tranche. On suppose une répartition plus ou moins étalée : « forte » signifie que quelques ménages ont beaucoup plus que la moyenne, ce qui augmente l'épargne au-dessus d'un seuil élevé. Ce réglage montre l'incertitude du calcul, il ne représente pas un choix politique.",
};
const GLOSSAIRE = [
  ["Dépôts", "Tout l'argent laissé à la banque : comptes courants, livrets, comptes à terme, plans d'épargne logement. Disponible rapidement, peu ou pas rémunéré."],
  ["Livrets réglementés", "Livret A, LDDS (livret de développement durable et solidaire) et LEP (livret d'épargne populaire, réservé aux revenus modestes). Taux fixé par l'État, sans impôt, plafonnés (22 950 €, 12 000 € et 10 000 €). Une grande partie est prêtée par la Caisse des Dépôts au logement social et aux collectivités."],
  ["Compte à terme", "Argent bloqué à la banque pour une durée fixe, contre un taux d'intérêt connu d'avance."],
  ["Assurance-vie", "Contrat d'épargne proposé par les assureurs et les banques, fiscalement avantageux après 8 ans et pour la transmission. Il contient des fonds euros et/ou des unités de compte."],
  ["Fonds euros", "Partie sécurisée de l'assurance-vie : le capital ne peut pas baisser, l'assureur le place surtout en obligations. Rendement modeste (souvent 2 à 3 % par an)."],
  ["Unités de compte", "Partie de l'assurance-vie investie dans des fonds (actions, immobilier…) : le rendement espéré est plus élevé, mais le capital peut baisser."],
  ["Actions", "Parts d'entreprises. Cotées : échangées en bourse. Non cotées : entreprises familiales, start-up, PME, dont les parts ne s'échangent pas en bourse."],
  ["PEA", "Plan d'épargne en actions : enveloppe pour détenir des actions européennes, sans impôt sur les gains après 5 ans (les prélèvements sociaux restent dus), plafonnée à 150 000 €."],
  ["Réorienter", "Placer une partie de son épargne liquide dans des investissements éligibles de long terme : actions d'entreprises, start-up, ou grands projets d'infrastructure via des obligations et fonds dédiés. L'argent ne disparaît pas : il change de placement, une seule fois."],
];
function addHelp(){
  root.querySelectorAll("[data-k]").forEach(el=>{
    const k = el.dataset.k, lab = el.closest("label"); if(!lab || !HELP[k] || lab.querySelector(".aj-info")) return;
    const b = document.createElement("button"); b.type="button"; b.className="aj-info"; b.textContent="?"; b.setAttribute("aria-label","Explication"); b.setAttribute("aria-expanded","false");
    const d = document.createElement("span"); d.className="ep-help"; d.hidden=true; d.textContent=HELP[k];
    if(el.type==="checkbox"){ lab.appendChild(b); lab.after(d); }
    else { const t = [...lab.childNodes].find(n=>n.nodeType===3 && n.textContent.trim());
      const row = document.createElement("span"); row.className="ep-lt"; row.textContent = t ? t.textContent.trim() : "";
      if(t) t.replaceWith(row); else lab.prepend(row); const hy = lab.querySelector(".ep-hyp"); if(hy) row.appendChild(hy); row.appendChild(b); lab.appendChild(d); }
    b.addEventListener("click",e=>{ e.preventDefault(); d.hidden=!d.hidden; b.setAttribute("aria-expanded",String(!d.hidden)); });
  });
}

const root = document.getElementById("epargne");
const fmtK = v => v>=1e6 ? nf1.format(v/1e6)+" M€" : nf0.format(v/1000)+" k€";
function render(){
  root.innerHTML = `
  <section class="card"><h2>Où dort l'épargne des ménages</h2>
    <p class="sub">Patrimoine financier des ménages fin 2025, par placement (Md€). En orange l'épargne liquide, en jaune les fonds euros, en bleu ce qui est déjà investi en actions.</p>
    <div id="ch-plac" class="ep-ch"></div>
    <ul class="ep-legend">
      <li><i style="background:var(--dep)"></i><b>Orange, épargne liquide :</b> visée par la mesure, mais seulement pour la part qui dépasse le seuil de chaque ménage (les livrets peuvent être exonérés en plus).</li>
      <li><i style="background:var(--niche)"></i><b>Jaune, fonds euros :</b> visés seulement si l'option « Inclure les fonds euros » est cochée, au-delà de leur propre seuil.</li>
      <li><i style="background:var(--etat)"></i><b>Bleu, déjà en actions :</b> jamais taxé. C'est vers là que la mesure pousse l'épargne.</li>
      <li><i style="background:var(--muted)"></i><b>Gris, actions non cotées :</b> jamais taxé (entreprises familiales, PME, start-up).</li>
    </ul>
    <p class="sub" id="ep-plac-share"></p></section>
  <div class="tx-ctrl">
    <fieldset><legend>Qui paie</legend>
      <label>Seuil de dépôts par ménage <b data-out="seuil">${fmtK(st.seuil)}</b><input type="range" min="20000" max="500000" step="10000" value="${st.seuil}" data-k="seuil"></label>
      <label>Livrets réglementés exonérés en plus<select data-k="livrets">${[[0,"Aucun"],[45000,"45 000 € (1 personne au plafond)"],[90000,"90 000 € (couple)"]].map(([v,l])=>`<option value="${v}" ${st.livrets==v?"selected":""}>${l}</option>`).join("")}</select></label>
      <label class="tx-chk"><input type="checkbox" data-k="av" ${st.av?"checked":""}> Inclure les fonds euros</label>
      ${st.av?`<label>Seuil fonds euros <b data-out="seuilAv">${fmtK(st.seuilAv)}</b><input type="range" min="50000" max="1000000" step="50000" value="${st.seuilAv}" data-k="seuilAv"></label>`:""}
    </fieldset>
    <fieldset><legend>Taxe et réaction</legend>
      <label>Taux annuel <b data-out="taux">${nf1.format(st.taux)} %</b><input type="range" min="0" max="3" step="0.1" value="${st.taux}" data-k="taux"></label>
      <label>Part réorientée vers l'investissement de long terme <span class="ep-hyp">hypothèse</span> <b data-out="reor">${st.reor} %</b><input type="range" min="0" max="100" step="5" value="${st.reor}" data-k="reor"><span class="tx-s">Ce qui est réorienté n'est plus taxé.</span></label>
    </fieldset>
    <fieldset><legend>Fléchage (hypothèse)</legend>
      <label>Transition énergétique <b data-out="alloc_t">${st.alloc_t} %</b><input type="range" min="0" max="100" step="5" value="${st.alloc_t}" data-k="alloc_t"></label>
      <label>Start-up, IA, électrification <b data-out="alloc_ia">${st.alloc_ia} %</b><input type="range" min="0" max="100" step="5" value="${st.alloc_ia}" data-k="alloc_ia"></label>
      <label>Grands projets énergie et infrastructures <b data-out="alloc_inf">${st.alloc_inf} %</b><input type="range" min="0" max="100" step="5" value="${st.alloc_inf}" data-k="alloc_inf"></label>
      <span class="tx-s" id="ep-alloc-rest"></span>
    </fieldset>
    <fieldset><legend>Hypothèse</legend>
      <label>Dispersion dans chaque tranche <span class="ep-hyp">hypothèse</span><select data-k="sig" data-num>${[[0.8,"Faible"],[1.0,"Moyenne"],[1.2,"Forte"]].map(([v,l])=>`<option value="${v}" ${st.sig==v?"selected":""}>${l}</option>`).join("")}</select><span class="tx-s">Encadre l'incertitude du calcul.</span></label>
      <button type="button" id="ep-reset">Réglages par défaut</button>
    </fieldset>
  </div>
  <section class="card"><h2>Trois ménages pour comprendre</h2>
    <p class="sub">Calculés avec les réglages ci-dessus (seuil, livrets exonérés, taux, part réorientée, fléchage). Les livrets ne sont exonérés que pour le montant réellement détenu, dans la limite choisie.</p>
    <div class="scroller"><table class="tx-table ep-cases" id="ep-cases"></table></div></section>
  <details class="card ep-gloss"><summary><b>Comprendre les termes</b> <span class="tx-s">fonds euros, livrets réglementés, PEA… Cliquez aussi sur les <b>?</b> à côté de chaque réglage.</span></summary>
    <dl>${GLOSSAIRE.map(([t,d])=>`<dt>${t}</dt><dd>${d}</dd>`).join("")}</dl></details>
  <div class="kpis" id="ep-kpis"></div>
  <section class="card"><h2>Le chemin de l'argent</h2><p class="sub" id="ep-flow-intro"></p><div class="scroller"><div id="ch-flow" class="ep-ch"></div></div></section>
  <div class="tx-grid">
    <section class="card"><h2>Qui est concerné ?</h2><p class="sub">Épargne visée par tranche de patrimoine (Md€). En gris toute l'épargne visable de la tranche (« sur … » en haut) ; la partie colorée est celle qui dépasse le seuil (montant en orange juste au-dessus) : en vert ce qui est réorienté, en orange ce qui reste et paie la taxe. Sous chaque colonne : le nombre de ménages concernés.</p><div id="ch-groups" class="ep-ch"></div></section>
    <section class="card"><h2>L'effet du seuil</h2><p class="sub">Épargne au-dessus du seuil selon le niveau choisi. Plus le seuil est haut, moins il y a de ménages et de milliards concernés.</p><div id="ch-seuil" class="ep-ch"></div></section>
  </div>
  <section class="card"><h2>Face aux besoins</h2><p class="sub" id="ep-fin-intro"></p><div id="ch-fin" class="ep-ch"></div></section>
  <section class="card"><h2>Simuler un ménage</h2>
    <p class="sub">Entrez l'épargne d'un ménage : la page calcule ce qui est concerné avec les réglages ci-dessus, puis compare sur 10 ans trois choix possibles.</p>
    <div class="tx-sim ep-simin">
      <label>Dépôts au total (comptes, livrets, comptes à terme, PEL) <span><input type="number" id="sim-d" min="0" step="5000" value="180000"> €</span></label>
      <label>dont livrets réglementés (Livret A, LDDS, LEP) <span><input type="number" id="sim-l" min="0" step="1000" value="30000"> €</span></label>
      <label>Fonds euros d'assurance-vie <span><input type="number" id="sim-a" min="0" step="10000" value="0"> €</span></label>
      <label>Rendement espéré des investissements de long terme <span class="ep-hyp">hypothèse</span><select id="sim-r"><option value="3">3 % par an (prudent, grands projets)</option><option value="5" selected>5 % par an (mélange)</option><option value="7">7 % par an (actions, sur longue période)</option></select></label>
    </div>
    <div id="sim-out"></div>
  </section>
  <section class="card"><h2>Implémentation</h2>
    <p class="sub">Comment mettre la mesure en place sans brusquer les épargnants, les banques, les assureurs ni le financement de l'État.</p>
    <ol class="ep-impl">
      <li><b>Créer d'abord les placements éligibles.</b> Avant toute taxe, il faut que chaque épargnant puisse réorienter facilement : un « livret projets » géré par la Caisse des Dépôts ou Bpifrance pour les grands projets d'énergie et d'infrastructure, un PEA « transition et innovation », des fonds labellisés (transition, start-up, IA), et l'obligation pour chaque contrat d'assurance-vie de proposer ces supports.</li>
      <li><b>Monter en charge progressivement.</b> Le taux augmente par paliers sur plusieurs années (par exemple 0,5 %, puis 1 %, puis le taux cible). Les ménages ont le temps de réorienter leur épargne, et les projets le temps d'absorber l'argent sans faire flamber les prix des actifs.</li>
      <li><b>Pour l'assurance-vie, un simple arbitrage suffit.</b> Déplacer de l'argent du fonds euros vers une unité de compte éligible dans le même contrat exonère de la taxe. L'épargnant garde l'ancienneté et l'avantage fiscal de son contrat ; l'assureur n'a rien à rembourser et vend ses obligations à son rythme, ce qui ménage la dette publique.</li>
      <li><b>Protéger l'épargne de précaution.</b> Les livrets réglementés sont exonérés jusqu'à la limite choisie (en fonction de ce que le ménage détient vraiment), et le seuil est assez haut pour que la grande majorité des ménages ne soit jamais concernée.</li>
      <li><b>Calculer simplement.</b> Les banques et assureurs déclarent déjà chaque année les comptes de leurs clients au fisc (fichier des comptes bancaires, déclarations de revenus de capitaux). La taxe peut être calculée sur le solde moyen de l'année par foyer fiscal, et pré-remplie comme l'impôt sur le revenu.</li>
      <li><b>Suivre et ajuster.</b> Un bilan chaque année : montants réorientés, projets financés, effets sur le crédit bancaire, sur le logement social et sur les taux d'emprunt de l'État. Le taux et le seuil peuvent être révisés en fonction.</li>
    </ol>
    <h3 class="ep-h3">Calendrier de montée en charge</h3>
    <label class="ep-dur">Durée de la montée en charge <select id="impl-n"><option value="3">3 ans</option><option value="5" selected>5 ans</option><option value="7">7 ans</option></select></label>
    <p class="sub">Le taux et la part réorientée montent par paliers réguliers jusqu'aux valeurs choisies dans les réglages (taux annuel et part réorientée). Chaque année, une partie de l'épargne au-dessus du seuil est réorientée, la même chaque année <span class="ep-hyp">hypothèse</span> ; le reste paie la taxe de l'année.</p>
    <div id="ch-impl" class="ep-ch"></div>
    <div class="scroller"><table class="tx-table" id="impl-table"></table></div>
  </section>`;
  bind(); addHelp(); drawPlacements(); update(); if(window.makeFoldable) makeFoldable();
}

function svgIn(id, h){ const el = document.getElementById(id); el.innerHTML = ""; const w = Math.max(320, el.getBoundingClientRect().width);
  return d3.select(el).append("svg").attr("viewBox",`0 0 ${w} ${h}`).attr("width","100%").attr("height",h).style("display","block").datum(w); }

function drawPlacements(){
  const c = COL(), data = PLACEMENTS.slice().sort((a,b)=>b[1]-a[1]);
  const h = 26*data.length + 10, svg = svgIn("ch-plac", h), w = svg.datum(), narrow = w < 560;
  const lw = narrow ? 150 : 300, x = d3.scaleLinear().domain([0, d3.max(data,d=>d[1])]).range([0, w-lw-70]);
  const g = svg.selectAll("g").data(data).join("g").attr("transform",(d,i)=>`translate(0,${i*26+4})`);
  g.append("text").attr("x",lw-8).attr("y",14).attr("text-anchor","end").style("font-size", narrow?"11px":"12.5px").text(d=>narrow && d[0].length>24 ? d[0].slice(0,22)+"…" : d[0]);
  g.append("rect").attr("x",lw).attr("y",2).attr("height",17).attr("rx",3).attr("width",d=>x(d[1])).attr("fill",d=>c[d[2]]);
  g.append("text").attr("class","lab-v").attr("x",d=>lw+x(d[1])+6).attr("y",15).text(d=>nf0.format(d[1]));
}

function drawFlow(o){
  const c = COL(), A = ALLOC(), at = A.t, ai = A.ia, inf = A.inf, rest = A.au;
  const nodes = [], links = [], add = (id,l,col) => nodes.push({id,l,col});
  if(o.baseDep>0.05) add("dep","Dépôts au-dessus du seuil",c.liq);
  if(o.baseAv>0.05) add("av","Fonds euros au-dessus du seuil",c.eur);
  add("exc","Épargne visée",c.muted);
  const reste = o.base - o.reor;
  if(o.reor>0.05){ add("reor","Réorientée vers l'investissement de long terme",c.reor);
    if(at) add("t","Entreprises de la transition énergétique",c.t); if(ai) add("ia","Start-up, IA, électrification",c.ia); if(inf) add("inf","Grands projets énergie et infrastructures",c.inf); if(rest) add("au","Autres entreprises françaises",c.au); }
  if(reste>0.05) add("reste",`Reste placée et taxée : ${md(o.taxe)} par an`,c.tax);
  if(o.baseDep>0.05) links.push({source:"dep",target:"exc",value:o.baseDep});
  if(o.baseAv>0.05) links.push({source:"av",target:"exc",value:o.baseAv});
  if(o.reor>0.05){ links.push({source:"exc",target:"reor",value:o.reor});
    if(at) links.push({source:"reor",target:"t",value:o.reor*at/100}); if(ai) links.push({source:"reor",target:"ia",value:o.reor*ai/100}); if(inf) links.push({source:"reor",target:"inf",value:o.reor*inf/100}); if(rest) links.push({source:"reor",target:"au",value:o.reor*rest/100}); }
  if(reste>0.05) links.push({source:"exc",target:"reste",value:reste});
  const el = document.getElementById("ch-flow"); el.innerHTML = "";
  if(!links.length){ el.innerHTML = `<p class="sub">Aucune épargne au-dessus du seuil avec ces réglages.</p>`; return; }
  if(el.parentNode.getBoundingClientRect().width < 600){ // version compacte pour mobile : deux barres empilées
    const src = nodes.filter(n=>n.id==="dep"||n.id==="av").map(n=>[n.l, links.find(l=>l.source===n.id).value, n.col]);
    const dst = nodes.filter(n=>["t","ia","inf","au","reste"].includes(n.id)).map(n=>[n.id==="reste"?"Reste placée et taxée":n.l, links.find(l=>l.target===n.id).value, n.col]);
    const bar = (title, parts) => { const tot = parts.reduce((a,p)=>a+p[1],0)||1;
      return `<div class="ep-mb"><div class="ep-mbt">${title}</div><div class="ep-mbar">${parts.map(p=>`<i style="width:${p[1]/tot*100}%;background:${p[2]}"></i>`).join("")}</div>
        <ul class="ep-mleg">${parts.map(p=>`<li><i style="background:${p[2]}"></i>${p[0]} <b>${md(p[1])}</b></li>`).join("")}</ul></div>`; };
    el.innerHTML = bar("D'où vient l'argent visé", src) + bar("Où il va", dst);
    return;
  }
  const w = Math.max(760, el.getBoundingClientRect().width), h = 300;
  const svg = d3.select(el).append("svg").attr("viewBox",`0 0 ${w} ${h}`).attr("width",w).attr("height",h).style("display","block");
  const sk = d3.sankey().nodeId(d=>d.id).nodeWidth(14).nodePadding(18).nodeAlign(d3.sankeyLeft).extent([[10,20],[w-260,h-10]]);
  const gr = sk({nodes:nodes.map(d=>({...d})), links:links.map(d=>({...d}))});
  svg.append("g").selectAll("path").data(gr.links).join("path").attr("d",d3.sankeyLinkHorizontal()).attr("fill","none")
    .attr("stroke",d=>d.target.col).attr("stroke-opacity",.35).attr("stroke-width",d=>Math.max(1,d.width));
  const n = svg.append("g").selectAll("g").data(gr.nodes).join("g");
  n.append("rect").attr("x",d=>d.x0).attr("y",d=>d.y0).attr("width",d=>d.x1-d.x0).attr("height",d=>Math.max(2,d.y1-d.y0)).attr("fill",d=>d.col);
  n.append("text").attr("x",d=>d.x1+6).attr("y",d=>(d.y0+d.y1)/2-2).style("font-size","12.5px").style("font-weight",d=>d.id==="reste"||d.id==="reor"?600:400).text(d=>d.l);
  n.append("text").attr("class","lab-v").attr("x",d=>d.x1+6).attr("y",d=>(d.y0+d.y1)/2+12).text(d=>md(d.value));
}

function drawGroups(o){
  const c = COL(), h = 230, svg = svgIn("ch-groups", h), w = svg.datum();
  const tot = r => r.dep + (st.av ? r.av*FONDS_EUROS : 0);
  const short = w < 560 ? ["50 % bas","6e","7e","8e","9e","10 % haut"] : ["50 % du bas","50-60 %","60-70 %","70-80 %","80-90 %","10 % du haut"];
  const x = d3.scaleBand().domain(o.rows.map(r=>r.k)).range([40, w-10]).padding(0.25), y = d3.scaleLinear().domain([0, d3.max(o.rows,tot)]).nice().range([h-34, 10]);
  svg.append("g").attr("transform",`translate(40,0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(w-50)).tickFormat(v=>nf0.format(v))).call(g=>{ g.select(".domain").remove(); g.selectAll("line").attr("stroke",c.line); g.selectAll("text").attr("fill",c.muted).style("font-size","11px"); });
  const g = svg.selectAll("g.c").data(o.rows).join("g").attr("class","c").attr("transform",r=>`translate(${x(r.k)},0)`);
  g.append("rect").attr("y",r=>y(tot(r))).attr("height",r=>y(0)-y(tot(r))).attr("width",x.bandwidth()).attr("fill",c.line);
  g.append("rect").attr("y",r=>y(r.base)).attr("height",r=>y(0)-y(r.base)).attr("width",x.bandwidth()).attr("fill",c.tax);
  g.append("rect").attr("y",r=>y(r.reor)).attr("height",r=>y(0)-y(r.reor)).attr("width",x.bandwidth()).attr("fill",c.reor);
  g.append("text").attr("x",x.bandwidth()/2).attr("y",r=>y(r.base)-4).attr("text-anchor","middle").style("font-size","10.5px").style("font-weight",600).attr("fill",c.tax).text(r=>r.base>=1?nf0.format(r.base)+" Md€":"");
  g.append("text").attr("x",x.bandwidth()/2).attr("y",r=>y(tot(r))-4).attr("text-anchor","middle").style("font-size","10px").attr("fill",c.muted).text(r=>"sur "+nf0.format(tot(r)));
  g.append("text").attr("x",x.bandwidth()/2).attr("y",h-18).attr("text-anchor","middle").style("font-size","10.5px").attr("fill",c.muted).text((r,i)=>short[i]);
  g.append("text").attr("x",x.bandwidth()/2).attr("y",h-5).attr("text-anchor","middle").style("font-size","10px").attr("fill",c.muted).text(r=>mil(Math.max(r.hhDep,r.hhAv)).replace(" million","M").replace("s",""));
}

function drawSeuil(){
  const c = COL(), h = 230, svg = svgIn("ch-seuil", h), w = svg.datum();
  const pts = d3.range(20000, 500001, 10000).map(T=>({T, ...baseAt(T)}));
  const x = d3.scaleLinear().domain([20000,500000]).range([46, w-30]), y = d3.scaleLinear().domain([0, d3.max(pts,p=>p.b)]).nice().range([h-30, 12]);
  svg.append("g").attr("transform",`translate(0,${h-30})`).call(d3.axisBottom(x).ticks(5).tickFormat(v=>nf0.format(v/1000)+" k€")).call(g=>{ g.selectAll("text").attr("fill",c.muted).style("font-size","11px"); g.selectAll("line,.domain").attr("stroke",c.line); });
  svg.append("g").attr("transform",`translate(46,0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(w-70)).tickFormat(v=>nf0.format(v))).call(g=>{ g.select(".domain").remove(); g.selectAll("line").attr("stroke",c.line); g.selectAll("text").attr("fill",c.muted).style("font-size","11px"); });
  svg.append("path").datum(pts).attr("fill","none").attr("stroke",c.liq).attr("stroke-width",2.5).attr("d",d3.line().x(p=>x(p.T)).y(p=>y(p.b)));
  const cur = baseAt(st.seuil), cx = x(st.seuil), cy = y(cur.b);
  svg.append("line").attr("x1",cx).attr("x2",cx).attr("y1",cy).attr("y2",h-30).attr("stroke",c.ink).attr("stroke-dasharray","3,3");
  svg.append("circle").attr("cx",cx).attr("cy",cy).attr("r",5).attr("fill",c.ink);
  const right = cx > w*0.6;
  svg.append("text").attr("x",right?cx-8:cx+8).attr("y",cy-10).attr("text-anchor",right?"end":"start").style("font-size","12px").style("font-weight",600)
    .text(w<560 ? `${fmtK(st.seuil)} : ${md(cur.b)}` : `${fmtK(st.seuil)} : ${md(cur.b)}, ${mil(cur.h)} ménages`);
}

function drawFin(o){
  const c = COL(), flux = o.reor, A = ALLOC(), at = A.t, ai = A.ia, inf = A.inf, rest = A.au;
  const items = [
    ["Transition énergétique (réorienté)", flux*at/100, c.t, ""], ["Besoin climat supplémentaire, chaque année (I4CE)", 87, c.muted, "repère"],
    ["Start-up, IA, électrification (réorienté)", flux*ai/100, c.ia, ""], ["Investissements IA annoncés (2025, surtout étrangers)", 109, c.muted, "repère"],
    ["Grands projets énergie et infrastructures (réorienté)", flux*inf/100, c.inf, ""],
    ["Autres entreprises françaises (réorienté)", flux*rest/100, c.au, ""], ["Encours actuel de tous les PEA", 126.5, c.muted, "repère"],
  ];
  const h = 30*items.length+8, svg = svgIn("ch-fin", h), w = svg.datum(), narrow = w<560, lw = narrow?160:360;
  const x = d3.scaleLinear().domain([0, d3.max(items,d=>d[1])||1]).range([0, w-lw-70]);
  const g = svg.selectAll("g").data(items).join("g").attr("transform",(d,i)=>`translate(0,${i*30+4})`);
  g.append("text").attr("x",lw-8).attr("y",15).attr("text-anchor","end").style("font-size",narrow?"10.5px":"12.5px").attr("fill",d=>d[3]?c.muted:c.ink).text(d=>narrow&&d[0].length>28?d[0].slice(0,26)+"…":d[0]);
  g.append("rect").attr("x",lw).attr("y",3).attr("height",18).attr("rx",3).attr("width",d=>Math.max(0,x(d[1]))).attr("fill",d=>d[2]).attr("fill-opacity",d=>d[3]?.45:1);
  g.append("text").attr("class","lab-v").attr("x",d=>lw+x(d[1])+6).attr("y",16).text(d=>md(d[1]));
  document.getElementById("ep-fin-intro").innerHTML = `L'argent réorienté (en couleur) comparé à des repères (en gris). Les ${md(flux)} sont déplacés <b>une seule fois</b> ; la part fléchée vers la transition couvre ${nf1.format(flux*at/100/87)} année${flux*at/100/87>=2?"s":""} du besoin supplémentaire estimé par I4CE.`;
}

function update(){
  const o = compute();
  document.getElementById("ep-kpis").innerHTML = `
    <div class="kpi"><div class="l">Ménages concernés</div><div class="v">${mil(o.hh)}</div><div class="s">${nf0.format(o.hh/MENAGES*100)} % des ménages</div></div>
    <div class="kpi"><div class="l">Épargne au-dessus du seuil</div><div class="v">${md(o.base)}</div><div class="s">dont dépôts ${md(o.baseDep)}${st.av?` · fonds euros ${md(o.baseAv)}`:""}</div></div>
    <div class="kpi"><div class="l">Réorientés vers l'investissement de long terme <span class="ep-hyp">hypothèse</span></div><div class="v" style="color:var(--rec)">${md(o.reor)}</div><div class="s">${nf1.format(o.reor/268)} fois les actions cotées des ménages</div></div>
    <div class="kpi"><div class="l">Recette annuelle</div><div class="v" style="color:var(--dep)">${md(o.taxe)}</div><div class="s">${nf1.format(o.taxe/PIB*100)} % du PIB</div></div>`;
  const A = ALLOC();
  document.getElementById("ep-alloc-rest").textContent = `Reste ${A.au} % vers les autres entreprises françaises.`;
  document.getElementById("ep-flow-intro").innerHTML = `De l'épargne au-dessus du seuil jusqu'à son utilisation. La taxe ne porte que sur ce qui reste placé : <b>${md(o.base-o.reor)}</b> × ${nf1.format(st.taux)} % = <b>${md(o.taxe)} par an</b>.`;
  drawFlow(o); drawGroups(o); drawSeuil(); drawFin(o); sim(); cases(); impl();
  const V = { reor: md(o.reor), dep: md(o.baseDep*st.reor/100), av: st.av ? md(o.baseAv*st.reor/100) : "0 Md€ (option désactivée)", taxe: md(o.taxe), liv: eur(st.livrets), ratio: nf1.format(o.reor/268) };
  document.querySelectorAll("[data-vg]").forEach(e=>{ e.textContent = V[e.dataset.vg]; });
  const liq = 947.5+763.0+415.8;
  document.getElementById("ep-plac-share").innerHTML = `Avec les réglages actuels, <b>${md(o.baseDep)}</b> d'épargne liquide sont visés, soit ${nf0.format(o.baseDep/liq*100)} % des ${md(liq)} en orange${st.av?`, et <b>${md(o.baseAv)}</b> de fonds euros sur 1 571 Md€ (${nf0.format(o.baseAv/1570.6*100)} %)`:""}. Le reste appartient à des ménages sous le seuil.`;
}
const CASES = [["130 000 € d'épargne, aucun livret réglementé",130000,0],["130 000 € dont 50 000 € sur un Livret A",130000,50000],["150 000 € dont 45 000 € de livrets",150000,45000]];
function cases(){
  const A = ALLOC(), at = A.t, ai = A.ia, inf = A.inf, rest = A.au;
  const C = CASES.map(([l,d,liv])=>{ const exo = Math.min(liv, st.livrets), pris = d - exo, ex = Math.max(0, pris - st.seuil), re = ex*st.reor/100, rs = ex-re;
    return { l, d, liv, exo, pris, ex, re, rs, tax: rs*st.taux/100 }; });
  const row = (lab, f, cls="") => `<tr class="${cls}"><td class="l">${lab}</td>${C.map(c=>`<td>${f(c)}</td>`).join("")}</tr>`;
  document.getElementById("ep-cases").innerHTML = `<thead><tr><th class="l"></th>${C.map(c=>`<th>${c.l}</th>`).join("")}</tr></thead><tbody>`
    + row("Épargne en dépôts", c=>eur(c.d))
    + row("dont livrets réglementés", c=>eur(c.liv))
    + row(`Livrets exonérés (limite ${eur(st.livrets)})`, c=>c.exo?"− "+eur(c.exo):"0 €")
    + row("Dépôts pris en compte", c=>eur(c.pris))
    + row(`Au-dessus du seuil de ${eur(st.seuil)}`, c=>c.ex?`<b>${eur(c.ex)}</b>`:`<span class="ep-ok">${eur(st.seuil-c.pris)} sous le seuil</span>`)
    + row(`Réorienté vers l'investissement de long terme (${st.reor} %)`, c=>c.re?`${eur(c.re)}<br><span class="tx-s">${eur(c.re*at/100)} transition · ${eur(c.re*ai/100)} IA, start-up · ${eur(c.re*inf/100)} grands projets · ${eur(c.re*rest/100)} autres</span>`:"0 €")
    + row("Reste placé et taxé", c=>eur(c.rs))
    + row(`Taxe par an (${nf1.format(st.taux)} %)`, c=>`<b>${eur(c.tax)}</b>`, "tx-tot")
    + row("Pour ne rien payer", c=>c.rs?`réorienter aussi ${eur(c.rs)}`:"rien à faire")
    + `</tbody>`;
}
function sim(){
  const d = +document.getElementById("sim-d").value||0, l = Math.min(d, +document.getElementById("sim-l").value||0), a = +document.getElementById("sim-a").value||0;
  const r = (+document.getElementById("sim-r").value)/100, rLiv = 0.015, rAut = 0.005, rFe = 0.025;
  const exo = Math.min(l, st.livrets), pris = d - exo, exD = Math.max(0, pris - st.seuil), exA = st.av ? Math.max(0, a - st.seuilAv) : 0, ex = exD + exA;
  const out = document.getElementById("sim-out");
  const lines = [
    ["Dépôts au total", eur(d)], ["Livrets exonérés (limite "+eur(st.livrets)+")", exo ? "− "+eur(exo) : "0 €"],
    ["Dépôts pris en compte", eur(pris)], ["Dépôts au-dessus du seuil de "+eur(st.seuil), `<b>${eur(exD)}</b>`],
  ];
  if(st.av) lines.push(["Fonds euros au-dessus du seuil de "+eur(st.seuilAv), `<b>${eur(exA)}</b>`]);
  else if(a) lines.push(["Fonds euros", `${eur(a)} — non concernés (option désactivée)`]);
  lines.push(["<b>Total concerné</b>", `<b>${eur(ex)}</b>`]);
  let h = `<table class="tx-table ep-simtab"><tbody>${lines.map(([k,v])=>`<tr><td class="l">${k}</td><td>${v}</td></tr>`).join("")}</tbody></table>`;
  if(!ex){ out.innerHTML = h + `<p class="ep-simres ep-ok">Ce ménage n'est pas concerné : rien à payer, rien à changer.</p>`; return; }
  // Rendement de l'argent concerné s'il reste en place (dépôts : mélange livret / compte, fonds euros à 2,5 %)
  const rStay = (exD*((rLiv+rAut)/2) + exA*rFe)/ex;
  const A = ALLOC(), part = st.reor/100;
  const scen = (p) => { // p = part réorientée
    let reste = ex*(1-p), inv = ex*p, taxes = 0;
    for(let y=0;y<10;y++){ taxes += reste*st.taux/100; reste = reste*(1+rStay) - reste*st.taux/100; inv *= (1+r); }
    return { taxe1: ex*(1-p)*st.taux/100, taxes, final: reste+inv, gain: reste+inv-ex };
  };
  const S = [["Ne rien faire", 0], [`Réorienter ${st.reor} % (hypothèse de la page)`, part], ["Tout réorienter", 1]].map(([l,p])=>({l,p,...scen(p)}));
  h += `<h3 class="ep-h3">Trois choix sur 10 ans</h3><div class="scroller"><table class="tx-table ep-simtab"><thead><tr><th class="l">Choix</th><th>Réorienté</th><th>Taxe la 1re année</th><th>Taxes payées en 10 ans</th><th>Valeur de ces ${eur(ex)} après 10 ans, taxes déduites</th></tr></thead><tbody>`
    + S.map(x=>`<tr><td class="l">${x.l}</td><td>${eur(ex*x.p)}</td><td>${eur(x.taxe1)}</td><td>${eur(x.taxes)}</td><td><b>${eur(x.final)}</b> <span class="tx-s">(${x.gain>=0?"+":"−"}${eur(Math.abs(x.gain))})</span></td></tr>`).join("")
    + `</tbody></table></div>`;
  const re = ex*part;
  h += `<p class="sub ep-simres">Avec ${st.reor} % réorientés, ses ${eur(re)} iraient à : ${eur(re*A.t/100)} entreprises de la transition, ${eur(re*A.ia/100)} start-up, IA et électrification, ${eur(re*A.inf/100)} grands projets énergie et infrastructures, ${eur(re*A.au/100)} autres entreprises françaises.</p>
    <p class="tx-s">La valeur après 10 ans tient compte des taxes payées chaque année, mais pas de l'impôt sur les gains au moment d'une vente (aucun dans un PEA de plus de 5 ans, hors prélèvements sociaux). Hypothèses : l'argent qui reste rapporte ${nf1.format(rStay*100)} % par an (dépôts : moitié livrets à 1,5 %, moitié comptes courants et comptes à terme à 0,5 % en moyenne ; fonds euros 2,5 %), moins la taxe ; l'argent réorienté rapporte ${nf0.format(r*100)} % par an en moyenne, <b>sans garantie</b> : les actions et les start-up peuvent perdre de la valeur certaines années, les grands projets rapportent moins mais plus régulièrement. Taux de la taxe constant sur 10 ans.</p>`;
  out.innerHTML = h;
}
function impl(){
  const o = compute(), N = +document.getElementById("impl-n").value, rows = [];
  let cum = 0;
  for(let y=1;y<=N+2;y++){
    const k = Math.min(1, y/N), taux = st.taux*k, cible = o.base*st.reor/100*k, flux = Math.max(0, cible - cum); cum += flux;
    rows.push({ y, taux, flux, cum, taxe:(o.base-cum)*taux/100 });
  }
  document.getElementById("impl-table").innerHTML = `<thead><tr><th class="l">Année</th><th>Taux de la taxe</th><th>Réorienté dans l'année</th><th>Réorienté au total</th><th>Recette de l'année</th></tr></thead><tbody>`
    + rows.map(r=>`<tr><td class="l">Année ${r.y}${r.y>N?" (régime de croisière)":""}</td><td>${nf1.format(r.taux)} %</td><td>${md(r.flux)}</td><td>${md(r.cum)}</td><td>${md(r.taxe)}</td></tr>`).join("") + `</tbody>`;
  const c = COL(), h = 190, svg = svgIn("ch-impl", h), w = svg.datum();
  const x = d3.scaleBand().domain(rows.map(r=>r.y)).range([50, w-10]).padding(0.3), y = d3.scaleLinear().domain([0, Math.max(87, d3.max(rows,r=>r.flux))*1.15]).range([h-26, 10]);
  svg.append("g").attr("transform",`translate(50,0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(w-60)).tickFormat(v=>nf0.format(v))).call(g=>{ g.select(".domain").remove(); g.selectAll("line").attr("stroke",c.line); g.selectAll("text").attr("fill",c.muted).style("font-size","11px"); });
  svg.selectAll("rect.b").data(rows).join("rect").attr("class","b").attr("x",r=>x(r.y)).attr("width",x.bandwidth()).attr("y",r=>y(r.flux)).attr("height",r=>y(0)-y(r.flux)).attr("fill",c.reor);
  svg.selectAll("text.v").data(rows).join("text").attr("class","v").attr("x",r=>x(r.y)+x.bandwidth()/2).attr("y",r=>y(r.flux)-4).attr("text-anchor","middle").style("font-size","11px").attr("fill",c.muted).text(r=>r.flux>=1?nf0.format(r.flux):"");
  svg.selectAll("text.a").data(rows).join("text").attr("class","a").attr("x",r=>x(r.y)+x.bandwidth()/2).attr("y",h-8).attr("text-anchor","middle").style("font-size","11px").attr("fill",c.muted).text(r=>"An "+r.y);
  svg.append("line").attr("x1",50).attr("x2",w-10).attr("y1",y(87)).attr("y2",y(87)).attr("stroke",c.ink).attr("stroke-dasharray","4,3");
  svg.append("text").attr("x",w-12).attr("y",y(87)-5).attr("text-anchor","end").style("font-size","11px").text("Besoin climat supplémentaire : 87 Md€ par an (I4CE)");
}
function bind(){
  root.querySelectorAll("[data-k]").forEach(el=>{
    const k = el.dataset.k, ev = el.type==="range" ? "input" : "change";
    el.addEventListener(ev,()=>{
      st[k] = el.type==="checkbox" ? el.checked : (el.type==="range" || el.dataset.num!==undefined || k==="livrets") ? +el.value : el.value;
      if(k.startsWith("alloc_")){ const others = ["alloc_t","alloc_ia","alloc_inf"].filter(x=>x!==k), sum = others.reduce((a,x)=>a+st[x],0);
        if(st[k] + sum > 100){ st[k] = 100 - sum; el.value = st[k]; } }
      const o = root.querySelector(`[data-out="${k}"]`);
      if(o) o.textContent = (k==="seuil"||k==="seuilAv") ? fmtK(st[k]) : k==="taux" ? nf1.format(st[k])+" %" : st[k]+" %";
      save(); if(k==="av") render(); else update();
    });
  });
  document.getElementById("ep-reset").addEventListener("click",()=>{ Object.assign(st, DEF); save(); render(); });
  ["sim-d","sim-l","sim-a"].forEach(id=>document.getElementById(id).addEventListener("input", sim));
  document.getElementById("sim-r").addEventListener("change", sim);
  document.getElementById("impl-n").addEventListener("change", impl);
}
render();
let rt; addEventListener("resize",()=>{ clearTimeout(rt); rt = setTimeout(()=>{ drawPlacements(); update(); }, 150); });
matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{ drawPlacements(); update(); });
window.__ep = { compute, st };
})();
