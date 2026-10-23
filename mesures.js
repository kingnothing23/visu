// Mesures « en un clic » pour la page Ajustement.
// Chiffrages statiques (sans effets de comportement), appliqués à l'année 2025, en milliards d'euros.
// Chaque mesure décrit ses effets :
//  - en comptabilité nationale (périmètres élargis) : dépenses par groupe et par bloc (e = État et agences,
//    s = Sécurité sociale, c = collectivités) et recettes par origine et par bloc ;
//  - dans le budget de l'État (périmètre « État ») : recettes par ligne du budget, dépenses réparties entre ministères.
// Un effet n'est compté que si son bloc fait partie du périmètre affiché.
(function(){

// Distribution DREES de la pension mensuelle brute totale (droit direct + réversion + majoration enfants),
// retraités de droit direct, fin 2020, par tranche de 100 € (en % des retraités). Source : DREES, EIR 2020.
const DREES_BINS = [2.43,2.46,2.35,2.17,2,2.06,2.28,2.94,4.36,4.44,4.2,4.4,4.59,4.82,4.9,4.75,4.47,4.23,4,3.76,3.63,2.99,2.6,2.3,1.99,1.73,1.53,1.33,1.17,1.01,0.9,0.76,0.67,0.57,0.51,0.46,0.4,0.38,0.31,0.29,0.26,0.22,0.2,0.19,0.18];
const DREES_TOP = { share:1.82, mean:6000 }; // au-delà de 4 500 € : moyenne supposée de 6 000 €
// Revalorisations des pensions de base entre fin 2020 et 2025 (1,004 × 1,011 × 1,04 × 1,008 × 1,053 × 1,022)
const REVALO_2020_2025 = 1.004*1.011*1.04*1.008*1.053*1.022;
function capShare(cap2025){
  const cap = cap2025 / REVALO_2020_2025;
  const pts = DREES_BINS.map((w,i)=>[100*i+50, w]).concat([[DREES_TOP.mean, DREES_TOP.share]]);
  const mass = pts.reduce((a,[x,w])=>a+x*w,0);
  const exc = pts.reduce((a,[x,w])=>a+Math.max(0,x-cap)*w,0);
  const above = pts.reduce((a,[x,w])=>a+(x>cap?w:0),0);
  return { share: exc/mass, above };
}

const SRC = {
  zucman: [["L'Essentiel de l'Éco — Taxe Zucman : qui est pour, qui est contre", "https://lessentieldeleco.fr/3993-taxe-zucman-qui-est-pour-qui-est-contre/"]],
  isf: [["iFRAP — La Cour propose le retour de l'ISF (rendements ISF 2017 et IFI)", "https://www.ifrap.org/budget-et-fiscalite/la-cour-propose-le-retour-de-lisf-sans-le-nommer"]],
  pfu: [["L'Essentiel de l'Éco — Hausse de la flat tax (2,7 Md€ pour +1,4 point)", "https://lessentieldeleco.fr/4116-flat-tax/"]],
  surtaxe: [["LégiFiscal — Contribution exceptionnelle sur les bénéfices des grandes entreprises (PLF 2025)", "https://www.legifiscal.fr/actualites-fiscales/3896-plf-2025-instauration-contribution-exceptionnelle-benefices-grandes-entreprises.html"]],
  tva: [["Fipeco — La TVA (un point de taux normal ≈ 8,2 Md€, tous taux ≈ 13 Md€)", "https://www.fipeco.fr/pdf/TVA.pdf"]],
  cir: [["PLF 2025, Voies et moyens tome II (CIR : 7 745 M€ en 2025)", "https://www.publicsenat.fr/app/uploads/2025/04/PLF-2025-Voies_et_moyens_Tome_2_Depenses-fiscales-1.pdf"],
        ["MESR — Le crédit d'impôt recherche en 2020 (PME 29 %, ETI 27 %, grandes entreprises 44 %)", "https://www.enseignementsup-recherche.gouv.fr/sites/default/files/2023-11/le-cr-dit-d-imp-t-recherche-en-2020---semi-d-finitif-30069.pdf"]],
  allegements: [["Sénat, rapport n° 942 — coûts 2025 : réduction générale 39,1 Md€, bandeau maladie 24,9 Md€, bandeau famille 9,6 Md€", "https://www.senat.fr/rap/r25-942/r25-94223.html"]],
  insee_taille: [["Insee — Catégories d'entreprises (part des salariés : MIC 17,4 %, PME 28,8 %, ETI 25,0 %, GE 28,8 %)", "https://www.insee.fr/fr/statistiques/7678530"]],
  senat211: [["Public Sénat — 211 Md€ d'aides publiques aux entreprises (commission d'enquête)", "https://www.publicsenat.fr/actualites/economie/un-cout-annuel-de-211-milliards-deuros-la-commission-denquete-du-senat-sur-les-aides-publiques-aux-entreprises-reclame-un-choc-de-transparence"]],
  niches_ir: [["MoneyVox — Top 5 des niches de l'impôt sur le revenu 2025 (Voies et moyens)", "https://www.moneyvox.fr/impot/actualites/100196/impot-sur-le-revenu-le-top-5-des-niches-fiscales-les-plus-couteuses-en-2025"]],
  drees: [["DREES — Distribution des pensions mensuelles (EIR 2020)", "https://drees.solidarites-sante.gouv.fr/communique-de-presse/250617_DATA_distribution-des-pensions-retraite"]],
  ofce: [["OFCE — Année blanche : gel des pensions de base ≈ 3,7 Md€ pour 1,1 % de revalorisation évitée", "https://www.ofce.fr/blog2024/fr/2025/20250630_PIM/Post_AnneeBlanche.fr.pdf"]],
  montaigne: [["Institut Montaigne — Retraite à 65 ans : 13,3 Md€ par an en 2030 (de 62 à 65 ans)", "https://www.institutmontaigne.org/presidentielle-2022/legislatives-2022/les-republicains/repousser-lage-de-depart-a-la-retraite-a-65-ans-avec-des-exemptions-pour-les-situations-de-penibilite-et-de-carrieres-longues-2"]],
  ferie: [["Blick / AFP — Deux jours fériés supprimés : 4,2 Md€ affectés au budget de l'État", "https://www.blick.ch/fr/monde/france/tolle-en-france-un-rendement-de-4-2-milliards-deuros-en-supprimant-2-jours-feries-id21125232.html"]],
  indice: [["Acteurs publics — Coût de la hausse de 1,5 % du point d'indice (3,2 Md€ : État 1,5, territoriale 0,99, hospitalière 0,71)", "https://acteurspublics.fr/articles/la-facture-de-la-hausse-du-point-dindice-pour-chacun-des-3-versants-de-la-fonction-publique"]],
  departs: [["DGAFP, rapport annuel 2025 — départs à la retraite 2024 : État ≈ 59 200, territoriale ≈ 53 500, hospitalière ≈ 23 900", "https://www.fonction-publique.gouv.fr/files/files/publications/vue-rapport-annuel/ra_2025_vue_flux_de_personnels_retraites.pdf"],
            ["Sénat — Bilan de la RGPP : 860 M€ d'économies brutes en 2009", "https://www.senat.fr/rap/l10-111-314/l10-111-3143.html"]],
  af: [["Sénat, séance du 2 février 2022 — Rétablir l'universalité des allocations familiales : coût 830 M€ (rapporteur O. Henno)", "https://www.senat.fr/cra/s20220202/s20220202_5.html"]],
  sousocc: [["Insee, recensement 2022 — base Logement par commune (sous-occupation très accentuée et accentuée, statut d'occupation, maisons/appartements)", "https://www.insee.fr/fr/statistiques/8581474"],
            ["Insee Première n° 2064 — Un quart des ménages vivent dans un logement en sous-occupation très accentuée (taux par type : maisons 41 %, propriétaires 39 %, locataires 7 %)", "https://www.insee.fr/fr/statistiques/fichier/8606928/ip2064.pdf"],
            ["data.gouv.fr — Zonage TLV (zones tendues) après le décret du 22 décembre 2025", "https://www.data.gouv.fr/datasets/liste-des-communes-selon-le-zonage-tlv-1"],
            ["data.gouv.fr — Statistiques DVF (prix médians au m² par commune)", "https://www.data.gouv.fr/datasets/statistiques-dvf"]],
};

window.buildMesures = function(ctx){
  // ctx : { base(key) -> montant 2025 d'une ligne, tvaShare {e,s,c}, isOn(id), param(id,name) }
  const RET_E = ctx.base("n.e.ret"), RET_S = ctx.base("n.s.ret"), RET = RET_E + RET_S;
  const retSplit = v => [{g:"g.presta", b:"e", v:-v*RET_E/RET}, {g:"g.presta", b:"s", v:-v*RET_S/RET}];
  const tvaSplit = v => ["e","s","c"].map(b=>({src:"tva", b, v:v*ctx.tvaShare[b]}));
  const ALLEG_2025 = 39.129 + 24.930 + 9.556;     // allègements généraux 2025 (Sénat)
  const BANDEAUX_2025 = 24.930 + 9.556;
  const NON_PME = 0.25 + 0.288;                    // part des salariés dans les ETI et grandes entreprises (Insee)
  const CIR_2025 = 7.745, CIR_NON_PME = 0.27 + 0.44;
  const nonPmeAlleg = () => ctx.isOn("nonpme") && ctx.param("nonpme","alleg")==="oui";
  const DEP = { e:59.2, c:53.5, s:23.9 };            // départs à la retraite 2024, milliers
  const COUT_POSTE = 0.05;                          // 50 000 € par poste et par an, en M€ -> Md€ via milliers

  return [
  // ---------------------------------------------------------------- Plus aisés et capital
  { id:"zucman", theme:"Fiscalité des plus aisés et du capital", label:"Taxe Zucman",
    desc:"Impôt plancher de 2 % par an sur les patrimoines de plus de 100 M€ (environ 1 800 foyers) : chacun paie au moins 2 % de sa fortune, impôts déjà payés déduits.",
    params:[{id:"est", label:"Estimation", opts:[["auteur","Gabriel Zucman (≈ 20 Md€)"],["prudente","Prudente (≈ 5 Md€, Jaravel, Aghion)"]], def:"auteur"}],
    caveat:"Rendement très discuté : départs à l'étranger, valorisation des entreprises non cotées, paiement possible en titres. Gabriel Zucman annonce jusqu'à 25 Md€, d'autres économistes environ 5 Md€ après ajustements.",
    src:SRC.zucman,
    eff:p=>{ const v = p.est==="prudente" ? 5 : 20; return { rec:[{src:"autimp", b:"e", v, node:"Taxe Zucman"}], budget:{ rec:[{src:"b_autres", v, node:"Taxe Zucman"}] } }; } },
  { id:"isf", theme:"Fiscalité des plus aisés et du capital", label:"Rétablir l'ISF",
    desc:"Retour de l'impôt de solidarité sur la fortune à la place de l'impôt sur la fortune immobilière (IFI) : le patrimoine financier est de nouveau taxé.",
    caveat:"L'ISF rapportait environ 5 Md€ en 2017, l'IFI environ 2 Md€ depuis : gain net ≈ 3 Md€, sans tenir compte des départs ni de la hausse des patrimoines depuis 2017.",
    src:SRC.isf,
    eff:()=>({ rec:[{src:"autimp", b:"e", v:3, node:"ISF (net de l'IFI)"}], budget:{ rec:[{src:"b_autres", v:3, node:"ISF (net de l'IFI)"}] } }) },
  { id:"pfu", theme:"Fiscalité des plus aisés et du capital", label:"Relever la flat tax",
    desc:"Hausse du prélèvement forfaitaire unique sur les revenus du capital (dividendes, intérêts, plus-values), de 30 % aujourd'hui, par une hausse de la CSG sur ces revenus comme en 2026.",
    params:[{id:"pts", label:"Hausse", opts:[["1.4","+1,4 point (31,4 %)"],["3","+3 points (33 %)"],["5","+5 points (35 %)"]], def:"1.4"}],
    caveat:"Environ 1,9 Md€ par point (2,7 Md€ attendus pour +1,4 point). La CSG finance la Sécurité sociale : l'effet n'apparaît qu'avec un périmètre incluant la Sécu.",
    src:SRC.pfu, needs:"s",
    eff:p=>({ rec:[{src:"ir", b:"s", v:2.7/1.4*(+p.pts)}] }) },
  { id:"surtaxe", theme:"Fiscalité des plus aisés et du capital", label:"Renforcer la surtaxe d'IS des grandes entreprises",
    desc:"La contribution exceptionnelle sur les bénéfices des entreprises de plus de 1 Md€ de chiffre d'affaires (environ 400 entreprises) existe déjà en 2025 et rapporte environ 8 Md€. On la renforce.",
    params:[{id:"x", label:"Ampleur", opts:[["0.5","+50 % (≈ +4 Md€)"],["1","Doublée (≈ +8 Md€)"]], def:"1"}],
    caveat:"La surtaxe 2025 est déjà dans les recettes de base : seul le renforcement est compté.",
    src:SRC.surtaxe,
    eff:p=>{ const v = 8*(+p.x); return { rec:[{src:"is", b:"e", v}], budget:{ rec:[{src:"b_is", v}] } }; } },
  // ---------------------------------------------------------------- Consommation
  { id:"tva", theme:"Consommation", label:"Augmenter la TVA",
    desc:"Hausse des taux de TVA. Le surplus est partagé comme la TVA actuelle : environ 47 % pour l'État, 27 % pour la Sécurité sociale, 25 % pour les collectivités.",
    params:[{id:"pts", label:"Hausse", opts:[["1","+1 point"],["2","+2 points"],["3","+3 points"]], def:"1"},
            {id:"champ", label:"Taux", opts:[["normal","Taux normal seul (20 %)"],["tous","Tous les taux"]], def:"normal"}],
    caveat:"≈ 8,2 Md€ par point de taux normal, ≈ 13 Md€ par point sur tous les taux. Pèse proportionnellement plus sur les ménages modestes, qui consomment une plus grande part de leur revenu.",
    src:SRC.tva,
    eff:p=>{ const v = (+p.pts)*(p.champ==="tous"?13:8.2); return { rec:tvaSplit(v), budget:{ rec:[{src:"b_tva", v:v*ctx.tvaShare.e}] } }; } },
  { id:"tvasoc", theme:"Consommation", label:"TVA sociale",
    desc:"Hausse du taux normal de TVA dont tout le produit sert à baisser les cotisations patronales du même montant. Neutre pour le déficit : l'argent change seulement de forme.",
    params:[{id:"pts", label:"Hausse", opts:[["1","+1 point (≈ 8 Md€)"],["2","+2 points (≈ 16 Md€)"],["3","+3 points (≈ 25 Md€)"]], def:"2"}],
    caveat:"Effet nul sur le déficit par construction. L'intérêt attendu : baisser le coût du travail et faire contribuer les importations au financement de la protection sociale.",
    src:SRC.tva, needs:"s",
    eff:p=>{ const v = 8.2*(+p.pts); return { rec:[{src:"tva", b:"s", v}, {src:"cotis", b:"s", v:-v}] }; } },
  // ---------------------------------------------------------------- Aides aux entreprises
  { id:"nonpme", theme:"Aides aux entreprises", label:"Aides réservées aux PME et TPE",
    desc:"Les entreprises de taille intermédiaire (ETI) et les grandes entreprises perdent le crédit d'impôt recherche et, au choix, les allègements généraux de cotisations.",
    params:[{id:"alleg", label:"Allègements de cotisations", opts:[["oui","Inclus (≈ +40 Md€)"],["non","Non (CIR seul)"]], def:"oui"}],
    caveat:"Chiffrage approché : part des ETI et grandes entreprises dans le CIR (71 %) et dans l'emploi salarié (54 %), appliquée aux allègements. Ce dernier ratio surestime sans doute l'effet, car les bas salaires (les plus exonérés) sont plus fréquents dans les petites entreprises. Les autres aides (subventions, autres niches) ne sont pas comptées : elles ne sont pas publiées par taille d'entreprise.",
    src:[...SRC.cir, ...SRC.allegements, ...SRC.insee_taille, ...SRC.senat211],
    eff:p=>{ const cir = CIR_2025*CIR_NON_PME, al = p.alleg==="oui" ? ALLEG_2025*NON_PME : 0;
      // CIR : dépense en comptabilité nationale (crédit restituable), moindre impôt sur les sociétés dans le budget de l'État
      const out = { spend:[{g:"g.autres", b:"e", v:-cir}], rec:[], budget:{ rec:[{src:"b_is", v:cir}] } };
      if(al) out.rec.push({src:"cotis", b:"s", v:al});
      return out; } },
  { id:"cir", theme:"Aides aux entreprises", label:"Réduire le crédit d'impôt recherche",
    desc:"Le CIR rembourse une partie des dépenses de recherche des entreprises : 7,7 Md€ en 2025, la niche fiscale la plus coûteuse.",
    params:[{id:"x", label:"Réduction", opts:[["0.5","Divisé par deux"],["1","Supprimé"]], def:"0.5"}],
    caveat:"Si la mesure « Aides réservées aux PME et TPE » est aussi appliquée, seule la part des PME (29 %) est encore concernée ici. Effet possible sur la recherche privée et la localisation des centres de recherche.",
    src:SRC.cir,
    eff:p=>{ const v = CIR_2025*(ctx.isOn("nonpme") ? 1-CIR_NON_PME : 1)*(+p.x);
      return { spend:[{g:"g.autres", b:"e", v:-v}], budget:{ rec:[{src:"b_is", v}] } }; } },
  { id:"bandeaux", theme:"Aides aux entreprises", label:"Supprimer les allègements au-delà de 1,6 SMIC",
    desc:"Fin des « bandeaux » maladie et famille, ces baisses de cotisations patronales sur les salaires entre 1,6 et 3,5 SMIC. La réduction générale sur les bas salaires est conservée.",
    caveat:"Coût 2025 des deux bandeaux : 34,5 Md€. Depuis 2026, ils sont fondus dans une réduction unique : le chiffrage porte sur 2025. Si les allègements des ETI et grandes entreprises sont déjà supprimés, seule la part des PME est comptée ici.",
    src:SRC.allegements, needs:"s",
    eff:()=>({ rec:[{src:"cotis", b:"s", v:BANDEAUX_2025*(nonPmeAlleg() ? 1-NON_PME : 1)}] }) },
  { id:"resto", theme:"Aides aux entreprises", label:"Fin de la TVA réduite dans la restauration",
    desc:"Les repas au restaurant passent du taux de 10 % au taux normal de 20 %.",
    caveat:"Dépense fiscale chiffrée à 2,1 Md€ pour 2025. Une partie de la hausse serait répercutée sur les prix.",
    src:[["PLF 2025, Voies et moyens tome II (taux de 10 % restauration : 2 123 M€)", "https://www.publicsenat.fr/app/uploads/2025/04/PLF-2025-Voies_et_moyens_Tome_2_Depenses-fiscales-1.pdf"]],
    eff:()=>({ rec:tvaSplit(2.123), budget:{ rec:[{src:"b_tva", v:2.123*ctx.tvaShare.e}] } }) },
  { id:"domicile", theme:"Aides aux entreprises", label:"Réduire le crédit d'impôt emploi à domicile",
    desc:"Crédit d'impôt de 50 % des dépenses de ménage, garde d'enfants, soutien scolaire, aide aux personnes âgées à domicile : 6,9 Md€ en 2025.",
    params:[{id:"x", label:"Réduction", opts:[["0.5","Divisé par deux"],["1","Supprimé"]], def:"0.5"}],
    caveat:"Risque de retour au travail non déclaré, et effet sur les personnes âgées ou handicapées qui emploient une aide à domicile.",
    src:SRC.niches_ir,
    eff:p=>{ const v = 6.86*(+p.x); return { spend:[{g:"g.autres", b:"e", v:-v}], budget:{ rec:[{src:"b_ir", v}] } }; } },
  // ---------------------------------------------------------------- Retraites
  { id:"cap", theme:"Retraites", label:"Plafonner les pensions",
    desc:"Aucune pension totale (base, complémentaire et réversion) ne dépasse le plafond mensuel brut choisi.",
    params:[{id:"cap", label:"Plafond", opts:[["1500","1 500 € par mois"],["2000","2 000 € par mois"],["2500","2 500 € par mois"],["3000","3 000 € par mois"]], def:"2000"}],
    caveat:"Calculé avec la distribution des pensions de la DREES (fin 2020, montants revalorisés jusqu'en 2025). Mesure très lourde : à 2 000 €, environ 40 % des retraités seraient touchés. Elle romprait aussi le lien entre cotisations versées et pension, ce qui poserait des questions juridiques.",
    src:SRC.drees, needs:"e|s", na:"Les pensions ne passent pas par le budget général de l'État : choisissez un périmètre élargi.",
    eff:p=>{ const c = capShare(+p.cap); return { spend:retSplit(c.share*RET), info:`≈ ${Math.round(c.above)} % des retraités au-dessus du plafond` }; } },
  { id:"gel", theme:"Retraites", label:"Gel des pensions de base",
    desc:"Pas de revalorisation des pensions des régimes de base en 2025 (elles ont été augmentées de 2,2 % au 1er janvier 2025).",
    caveat:"≈ 3,4 Md€ par point de revalorisation évitée (OFCE). Perte de pouvoir d'achat pour les retraités équivalente à l'inflation de l'année.",
    src:SRC.ofce, needs:"e|s", na:"Les pensions ne passent pas par le budget général de l'État : choisissez un périmètre élargi.",
    eff:()=>({ spend:retSplit(3.7/1.1*2.2) }) },
  { id:"age65", theme:"Retraites", label:"Âge de départ à 65 ans",
    desc:"Âge légal porté à 65 ans au lieu de 64 ans (réforme de 2023).",
    caveat:"Effet en régime de croisière, atteint au bout de plusieurs années. Estimé au tiers du chiffrage de l'Institut Montaigne pour un passage de 62 à 65 ans (13,3 Md€ par an), soit ≈ 4,4 Md€. Une partie des économies est reprise par plus d'arrêts maladie, d'invalidité et de chômage chez les seniors.",
    src:SRC.montaigne, needs:"e|s", na:"Les pensions ne passent pas par le budget général de l'État : choisissez un périmètre élargi.",
    eff:()=>({ spend:retSplit(13.3/3) }) },
  { id:"abatt", theme:"Retraites", label:"Supprimer l'abattement de 10 % des retraités",
    desc:"Les retraités déduisent 10 % de leurs pensions avant le calcul de l'impôt sur le revenu (comme les frais professionnels des salariés). On supprime ou réduit cet avantage.",
    params:[{id:"x", label:"Ampleur", opts:[["1","Supprimé"],["0.5","Réduit à 5 %"]], def:"1"}],
    caveat:"Coût de l'abattement : 4,96 Md€ en 2025. Touche les retraités imposables, la moitié environ.",
    src:SRC.niches_ir,
    eff:p=>{ const v = 4.96*(+p.x); return { rec:[{src:"ir", b:"e", v}], budget:{ rec:[{src:"b_ir", v}] } }; } },
  // ---------------------------------------------------------------- Travail et fonction publique
  { id:"ferie", theme:"Travail et fonction publique", label:"Supprimer des jours fériés",
    desc:"Un ou deux jours fériés deviennent travaillés (proposition de 2025 : lundi de Pâques et 8 mai). Les employeurs versent en échange une contribution, comme pour la journée de solidarité.",
    params:[{id:"n", label:"Jours", opts:[["1","Un jour (≈ 2,1 Md€)"],["2","Deux jours (≈ 4,2 Md€)"]], def:"1"}],
    caveat:"Chiffrage du gouvernement de 2025 : 4,2 Md€ pour deux jours, affectés au budget de l'État. Effet éventuel sur l'activité non compté.",
    src:SRC.ferie,
    eff:p=>{ const v = 2.1*(+p.n); return { rec:[{src:"prod", b:"e", v, node:"Contribution jours fériés"}], budget:{ rec:[{src:"b_autres", v, node:"Contribution jours fériés"}] } }; } },
  { id:"indice", theme:"Travail et fonction publique", label:"Gel du point d'indice",
    desc:"Le point d'indice, qui fixe le traitement de base des fonctionnaires, n'est pas augmenté.",
    params:[{id:"x", label:"Au lieu de", opts:[["1","une hausse de 1 %"],["2","une hausse de 2 %"]], def:"1"}],
    caveat:"Attention : le point était déjà gelé en 2025. La mesure ne réduit donc pas les dépenses de 2025 ; elle est comptée comme l'économie par rapport à une hausse qui aurait été accordée. ≈ 2,1 Md€ par point (État 1,0, territoriale 0,66, hospitalière 0,47).",
    src:SRC.indice,
    eff:p=>{ const k = +p.x/1.5; return { spend:[{g:"g.remu", b:"e", v:-1.5*k}, {g:"g.remu", b:"c", v:-0.99*k}, {g:"g.remu", b:"s", v:-0.709*k}],
      budget:{ spend:[{fpe:true, v:-1.5*k}] } }; } },
  { id:"nonremp", theme:"Travail et fonction publique", label:"Un départ à la retraite sur deux non remplacé",
    desc:"Une partie des agents qui partent à la retraite ne sont pas remplacés : moins d'embauches de fonctionnaires.",
    params:[{id:"ver", label:"Fonctions publiques", opts:[["e","État seulement"],["tous","Les trois"]], def:"e"},
            {id:"ans", label:"Durée", opts:[["1","1 an"],["3","3 ans"],["5","5 ans"]], def:"1"}],
    caveat:"Économie en année pleine, cumulée sur la durée choisie, à ≈ 50 000 € par poste non pourvu (salaire et cotisations d'un agent recruté). Départs 2024 : État 59 200, territoriale 53 500, hospitalière 23 900. Lors de la RGPP (2009), la moitié des économies était reversée aux agents restants ; ce n'est pas le cas ici.",
    src:SRC.departs,
    eff:p=>{ const n = +p.ans, f = b => DEP[b]/2*COUT_POSTE*n;
      const sp = [{g:"g.remu", b:"e", v:-f("e")}]; if(p.ver==="tous") sp.push({g:"g.remu", b:"c", v:-f("c")}, {g:"g.remu", b:"s", v:-f("s")});
      return { spend:sp, budget:{ spend:[{fpe:true, v:-f("e")}] } }; } },
  // ---------------------------------------------------------------- Logement et famille
  { id:"sousocc", theme:"Logement et famille", label:"Taxe sur les logements sous-occupés",
    desc:"Taxe annuelle, en pourcentage de la valeur du logement, sur les propriétaires qui occupent une résidence principale nettement plus grande que les besoins du foyer (d'après la déclaration d'occupants), en zone tendue. But : les inciter, souvent des retraités, à vendre pour un logement plus petit dans une zone moins tendue, et libérer de grands logements pour les familles.",
    params:[{id:"zone", label:"Zones", opts:[["t","Zones tendues (1 430 communes)"],["tt","+ zones touristiques tendues (3 689 communes)"]], def:"t"},
            {id:"seuil", label:"Logements visés", opts:[["3","3 pièces ou plus en trop (≈ 1,4 million)"],["2","2 pièces ou plus en trop (≈ 2,9 millions)"]], def:"3"},
            {id:"taux", label:"Taux annuel", opts:[["0.5","0,5 % de la valeur"],["1","1 % de la valeur"],["2","2 % de la valeur"]], def:"1"},
            {id:"dem", label:"Ménages qui déménagent", opts:[["0","Aucun (chiffrage statique)"],["25","25 %"],["50","50 %"]], def:"0"}],
    caveat:"Calcul commune par commune : logements en sous-occupation du recensement 2022 dans les communes du zonage TLV, part des propriétaires et des maisons estimée avec les taux nationaux de l'Insee, valeur = prix médian au m² de la commune (DVF) × 130 m² pour une maison ou 90 m² pour un appartement (120 et 80 m² pour 2 pièces en trop). En zone tendue, ≈ 1,42 million de propriétaires ont au moins 3 pièces en trop, pour une valeur moyenne d'environ 520 000 € : à 1 %, ≈ 5 200 € par an et par logement. En Alsace-Moselle (pas de DVF), prix estimé par la moyenne des communes de même zone hors Île-de-France. Simulateur détaillé : page « Taxe sous-occupation ». Plus la taxe fonctionne, moins elle rapporte. Recette affectée ici au budget de l'État. Questions juridiques probables (égalité devant l'impôt, droit de propriété).",
    src:SRC.sousocc,
    eff:p=>{ // valeur des logements visés (propriétaires occupants), en Md€ : [3 pièces ou plus, exactement 2 pièces] par zone
      const V = { t:[740.5, 731.1], tt:[930.6, 864.5] }[p.zone];
      const base = V[0] + (+p.seuil===2 ? V[1] : 0), v = base*(+p.taux)/100*(1-(+p.dem)/100);
      return { rec:[{src:"autimp", b:"e", v, node:"Taxe logements sous-occupés"}], budget:{ rec:[{src:"b_autres", v, node:"Taxe logements sous-occupés"}] } }; } },
  { id:"af", theme:"Logement et famille", label:"Allocations familiales universelles",
    desc:"Retour aux allocations familiales identiques pour toutes les familles, quel que soit leur revenu. Depuis 2015, elles sont divisées par deux ou par quatre au-dessus de certains plafonds de revenus.",
    caveat:"Dépense supplémentaire d'environ 830 M€ par an (chiffre du rapporteur du Sénat en 2022). La modulation avait économisé 760 M€ en 2016. Profite aux familles les plus aisées.",
    src:SRC.af, needs:"s", na:"Les allocations familiales sont versées par la Sécurité sociale : choisissez un périmètre qui l'inclut (« + Sécu »).",
    eff:()=>({ spend:[{g:"g.presta", b:"s", v:0.83}] }) },
  ];
};
window.MESURES_CAP_SHARE = capShare;
})();
