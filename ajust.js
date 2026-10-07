// Page « Ajustement » : construire son propre budget à partir de l'exécution 2025.
// Périmètres : budget de l'État (par ministère), puis État élargi seul ou avec Sécurité sociale et/ou collectivités.
(function(){
const F = window.FINANCES;
const YEAR = 2025;
const BV = F.budget_view[YEAR];
const T = BV.totals;
const NA = F.years[YEAR].modes["3"]; // comptabilité nationale, 3 blocs
const nf1 = new Intl.NumberFormat("fr-FR",{maximumFractionDigits:1, minimumFractionDigits:1});
const nf2 = new Intl.NumberFormat("fr-FR",{maximumFractionDigits:2, minimumFractionDigits:0});
const nf0 = new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0});
const POP = (F.pop||{})[YEAR] || 68.6;
const PIB = (F.pib||{})[YEAR] || 2991.1; // PIB 2025 en Md€ (Insee, via Eurostat)
const md = v => (Math.abs(v) >= 100 ? nf0.format(v) : nf1.format(v)) + " Md€";
const fmtPct = p => { const r = Math.round(p); return r===0 ? "0 %" : (r>0?"+":"−")+nf0.format(Math.abs(r))+" %"; };
const sgn = v => (v>0?"+":v<0?"−":"±") + md(Math.abs(v));
const esc = s => String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");

// ---------------------------------------------------------------------------
// Définitions des lignes du budget de l'État (libellés tels qu'ils figurent dans les données)
const DEF = {
  "Enseignement scolaire public du premier degré (prog. 140)": "Écoles maternelles et élémentaires publiques : surtout les salaires des professeurs des écoles et de leurs inspecteurs.",
  "Enseignement scolaire public du second degré (prog. 141)": "Collèges et lycées publics (généraux, technologiques et professionnels) : salaires des professeurs, des chefs d'établissement et des conseillers principaux d'éducation.",
  "Enseignement privé sous contrat (prog. 139)": "Écoles, collèges et lycées privés sous contrat avec l'État : l'État paie les enseignants et une partie du fonctionnement (forfait d'externat).",
  "Vie de l'élève (prog. 230)": "Tout ce qui entoure la classe : accompagnants d'élèves en situation de handicap (AESH), assistants d'éducation, bourses de collège et de lycée, médecine et infirmières scolaires.",
  "Soutien de la politique de l'éducation nationale (prog. 214)": "Administration du ministère : services centraux, rectorats, organisation des examens et concours, informatique.",
  "Engagements financiers de l'État (charge de la dette…)": "Surtout les intérêts de la dette de l'État (et le surcoût des obligations indexées sur l'inflation), plus quelques garanties et primes d'épargne logement. Ce n'est pas le remboursement du capital, qui est refinancé par de nouveaux emprunts.",
  "Gestion des finances publiques (DGFiP, douanes)": "Direction générale des finances publiques (calcul et recouvrement des impôts, paiement des dépenses publiques, cadastre) et douanes.",
  "Économie": "Soutien aux entreprises et à l'industrie (dont la compensation du coût du carbone pour les industries électro-intensives), Insee, direction du Trésor, protection des consommateurs (DGCCRF), déploiement du très haut débit.",
  "Plan de relance": "Derniers paiements du plan France Relance lancé en 2020 : projets engagés les années précédentes et payés au fil de leur avancement.",
  "Aide économique et financière au développement (prog. 110, 365)": "Aide au développement gérée par Bercy : contributions aux banques et fonds multilatéraux (Banque mondiale, fonds africains…), bonification des prêts de l'Agence française de développement, renforcement de ses fonds propres.",
  "Régimes de retraite des mines, SEITA et divers (prog. 195)": "Subventions d'équilibre à des régimes de retraite fermés ou en déclin (mineurs, ex-SEITA, ORTF…) qui n'ont plus assez de cotisants pour payer leurs pensions.",
  "Recherche économique et industrielle (prog. 192)": "Écoles d'ingénieurs rattachées à Bercy (Institut Mines-Télécom, Genes) et soutien à la recherche industrielle (pôles de compétitivité, microélectronique).",
  "Défense": "Les armées : salaires des militaires et des civils de la défense, achat et entretien des équipements (avions, navires, blindés, dissuasion nucléaire), opérations extérieures. Encadré par la loi de programmation militaire.",
  "Anciens combattants, mémoire (prog. 169)": "Pensions militaires d'invalidité, retraite du combattant, aides de l'Office national des combattants et victimes de guerre, actions de mémoire.",
  "Recherche duale (prog. 191)": "Recherche « duale », c'est-à-dire utile à la fois au civil et au militaire (spatial, nucléaire, aéronautique, cybersécurité). Pilotée par la Direction générale de l'armement, versée surtout au CNES et au CEA.",
  "Solidarité, insertion et égalité des chances": "Surtout l'allocation aux adultes handicapés (AAH) et la prime d'activité, plus l'aide alimentaire, la protection juridique des majeurs vulnérables et l'égalité femmes-hommes.",
  "Travail, emploi": "Subvention à France Travail, aides à l'embauche d'apprentis, contrats aidés, insertion par l'activité économique, certaines exonérations de cotisations ciblées compensées à la Sécurité sociale.",
  "Santé": "Aide médicale de l'État (soins des étrangers en situation irrégulière) et politiques de prévention en santé.",
  "Écologie, développement et mobilité durables": "Soutien aux énergies renouvelables électriques, chèque énergie, transports (trains d'équilibre du territoire, infrastructures), prévention des risques, biodiversité, Météo-France, et agents du ministère.",
  "Régimes de retraite transports terrestres et marins (prog. 198, 197)": "Subventions d'équilibre aux régimes spéciaux de retraite de la SNCF, de la RATP et des marins, qui ont plus de retraités que de cotisants.",
  "Recherche énergie et mobilité durables (prog. 190)": "Recherche sur l'énergie et les transports : CEA (nucléaire civil), IFP Énergies nouvelles, soutien à la recherche aéronautique civile.",
  "Sécurités (police, gendarmerie, sécurité civile)": "Police nationale, gendarmerie nationale, sécurité civile (moyens nationaux comme les avions bombardiers d'eau) et sécurité routière.",
  "Administration générale et territoriale (préfectures)": "Préfectures et sous-préfectures (titres d'identité, permis, étrangers), administration centrale du ministère, organisation des élections.",
  "Immigration, asile et intégration": "Hébergement et allocation des demandeurs d'asile, Ofpra et Ofii, centres de rétention et éloignements, cours de français et parcours d'intégration.",
  "Formations supérieures et recherche universitaire (prog. 150)": "Subventions aux universités et écoles publiques : salaires des enseignants-chercheurs, formations de la licence au doctorat, bibliothèques universitaires.",
  "Recherches scientifiques et technologiques pluridisciplinaires (prog. 172)": "Grands organismes de recherche (CNRS, Inserm, Inria, CEA hors énergie…) et Agence nationale de la recherche, qui finance des projets sur appels d'offres.",
  "Vie étudiante (prog. 231)": "Bourses sur critères sociaux, Crous (restaurants et logements universitaires), santé des étudiants.",
  "Recherche spatiale (prog. 193)": "Contribution française à l'Agence spatiale européenne (ESA) et subvention au CNES.",
  "Cohésion des territoires (APL, hébergement…)": "Aides personnelles au logement (APL) pour leur part financée par l'État, hébergement d'urgence et logement adapté, politique de la ville, aménagement du territoire.",
  "Relations avec les collectivités territoriales": "Dotations d'investissement aux communes et départements (DETR, DSIL…) et compensation des compétences transférées. La principale dotation, la DGF, n'est pas ici : voir « Dotations aux collectivités ».",
  "Justice": "Tribunaux (magistrats, greffiers), prisons (administration pénitentiaire), protection judiciaire de la jeunesse, aide juridictionnelle pour ceux qui ne peuvent pas payer un avocat.",
  "Agriculture, alimentation, forêt": "Aides aux agriculteurs en complément de la politique agricole européenne, sécurité sanitaire des aliments (services vétérinaires), forêt, gestion des crises agricoles.",
  "Enseignement technique agricole (prog. 143)": "Lycées agricoles publics et privés.",
  "Recherche agricole (prog. 142)": "Enseignement supérieur et recherche agricoles : écoles d'ingénieurs agronomes et écoles vétérinaires.",
  "Action extérieure de l'État": "Ambassades et consulats, contributions aux organisations internationales (ONU, OTAN…), réseau des lycées français à l'étranger, diplomatie culturelle.",
  "Solidarité avec les pays en développement (prog. 209)": "Aide au développement gérée par le Quai d'Orsay : dons pour des projets (via l'Agence française de développement), aide humanitaire, contributions à des fonds internationaux.",
  "Fonds de solidarité pour le développement (prog. 384)": "Financé par la taxe sur les billets d'avion et la taxe sur les transactions financières : contributions à la santé mondiale (Fonds mondial contre le sida, la tuberculose et le paludisme, Gavi, Unitaid) et au climat.",
  "Culture": "Patrimoine (monuments historiques, musées, archives), création (spectacle vivant, arts plastiques), écoles d'art, éducation artistique et pass Culture.",
  "Médias, livre et industries culturelles": "Aides à la presse, livre et lecture (dont la Bibliothèque nationale de France), soutien aux industries culturelles.",
  "Investir pour la France de 2030 (SGPI)": "Plan d'investissement France 2030 : aides à l'innovation et à l'industrie (nucléaire, hydrogène, semi-conducteurs, santé…), versées via Bpifrance, l'ADEME, l'ANR ou la Caisse des Dépôts.",
  "Direction de l'action du gouvernement": "Services du Premier ministre : défense et sécurité nationale (dont l'ANSSI, chargée de la cybersécurité), autorités indépendantes (CNIL, Défenseur des droits…), information du Gouvernement.",
  "Indemnisation des victimes des persécutions (prog. 158)": "Indemnisation des orphelins de victimes de persécutions antisémites et d'actes de barbarie pendant la Seconde Guerre mondiale, et des spoliations.",
  "Outre-mer": "Compensation des exonérations de cotisations des entreprises ultramarines, logement social outre-mer, aides aux collectivités, service militaire adapté.",
  "Pouvoirs publics (Présidence, Parlement…)": "Dotations de la Présidence de la République, de l'Assemblée nationale, du Sénat, du Conseil constitutionnel et de la Cour de justice de la République.",
  "Conseil et contrôle de l'État (Conseil d'État, Cour des comptes, CESE)": "Conseil d'État et tribunaux administratifs, Cour des comptes et chambres régionales des comptes, Conseil économique, social et environnemental.",
  "Sport, jeunesse et vie associative": "Sport (Agence nationale du sport, sport de haut niveau), Service civique, soutien aux associations et à la jeunesse.",
  "Transformation et fonction publiques": "Modernisation de l'administration (fonds de transformation, numérique), formation des fonctionnaires, action sociale interministérielle.",
  "psr.coll": "Versements de l'État aux collectivités prélevés directement sur ses recettes : surtout la dotation globale de fonctionnement (DGF) et le remboursement de la TVA payée sur leurs investissements (FCTVA).",
  "psr.ue": "Contribution de la France au budget de l'Union européenne, calculée surtout sur son revenu national. Une partie revient en France via les politiques européennes (agriculture, fonds régionaux…).",
};

// ---------------------------------------------------------------------------
// Périmètre 1 : budget de l'État par ministère (comptabilité budgétaire)
const LOCK_HINT = {
  "Engagements financiers": "Surtout la charge de la dette : elle dépend des taux d'intérêt et de la dette passée, pas d'une décision de l'année. La baisser revient à supposer des taux plus bas ou moins de dette.",
};
const budgetGroups = BV.ministeres.slice().sort((a,b)=>(b.v-(b.pensions||0))-(a.v-(a.pensions||0))).map((m,gi)=>{
  const p = m.pensions || 0, ratio = m.v ? (m.v - p)/m.v : 1;
  return { key:"m"+gi, label:m.l, fixed:p, fixedLabel:"de cotisations retraite (fixes)",
    lines: m.pieces.map(([l,v],li)=>({ key:`m${gi}.${li}`, label:l, base:+(v*ratio).toFixed(3), def:DEF[l],
      hint: Object.entries(LOCK_HINT).find(([k])=>l.startsWith(k))?.[1] })) };
});
budgetGroups.push({ key:"psr", label:"Versements hors ministères", fixed:0, lines:[
  { key:"psr.coll", label:"Dotations aux collectivités (DGF, FCTVA…)", base:T.psr_coll, def:DEF["psr.coll"] },
  { key:"psr.ue", label:"Contribution au budget de l'Union européenne", base:T.psr_ue, def:DEF["psr.ue"],
    hint:"Fixée par les règles de financement de l'UE : la France ne peut pas la réduire seule." },
]});

// ---------------------------------------------------------------------------
// Périmètres 2 et 3 : comptabilité nationale (Insee/Eurostat), par grande nature de dépense
const flow = (s,t) => { const l = NA.find(x=>x.source===s && x.target===t && !x.kind); return l ? l.value : 0; };
const tflow = (s,t) => { const l = NA.find(x=>x.source===s && x.target===t && x.kind==="transfer"); return l ? l.value : 0; };
const detail = s => (NA.find(x=>x.source===s && x.target==="presta")||{}).detail || {};
const inflow = c => NA.filter(x=>x.target===c && !x.kind && x.source!=="deficit").reduce((a,x)=>a+x.value,0);
const PE = detail("c_etat"), PS = detail("c_secu");
const DETTE = "Dépend des taux d'intérêt et de la dette accumulée, pas d'une décision de l'année. La baisser revient à supposer des taux plus bas ou moins de dette.";

// Chaque ligne : bloc (e = État et agences, s = Sécurité sociale, c = collectivités), clé, libellé, montant, définition.
// « to » : bloc destinataire d'un versement interne (la ligne disparaît quand ce bloc est inclus).
const L = (b,k,label,v,def,hint,to) => ({ b, to, key:"n."+k, label, base:+(+v).toFixed(3), def, hint });
const PC = detail("coll");
const BLOCK = { e:{node:"c_etat", tag:"État"}, s:{node:"c_secu", tag:"Sécu"}, c:{node:"coll", tag:"Coll."} };
const natGroups = [
  { key:"g.presta", label:"Prestations sociales", lines:[
    L("s","s.ret","Retraites des régimes de base et complémentaires", PS.p_retraites, "Pensions de vieillesse et de réversion versées par la Sécurité sociale au sens large : régime général (CNAV), Agirc-Arrco, CNRACL (fonctionnaires territoriaux et hospitaliers), régimes des indépendants, des agriculteurs…"),
    L("e","e.ret","Retraites des fonctionnaires de l'État et régimes spéciaux", PE.p_retraites, "Pensions des fonctionnaires civils et militaires de l'État (payées par le compte spécial Pensions) et subventions aux régimes spéciaux (SNCF, RATP, mines, marins…)."),
    L("c","c.ret","Allocation personnalisée d'autonomie (APA)", PC.p_retraites, "Aide des départements aux personnes âgées en perte d'autonomie, à domicile ou en établissement, et autres aides sociales aux personnes âgées. Cofinancée par la CNSA (Sécurité sociale)."),
    L("s","s.sante","Remboursements de soins", PS.p_sante, "Soins de ville, médicaments et dispositifs médicaux remboursés par l'Assurance maladie. Les dépenses des hôpitaux publics apparaissent surtout en salaires et achats."),
    L("s","s.inv","Indemnités maladie, invalidité, accidents du travail", PS.p_invalidite, "Indemnités journalières en cas d'arrêt maladie ou d'accident du travail, pensions d'invalidité, prestations de compensation du handicap."),
    L("e","e.inv","Allocation aux adultes handicapés (AAH) et autres aides", PE.p_invalidite, "Surtout l'AAH, versée par les CAF pour le compte de l'État, et les pensions militaires d'invalidité."),
    L("c","c.inv","Prestation de compensation du handicap (PCH)", PC.p_invalidite, "Aide des départements pour financer les besoins liés au handicap (aide humaine, aménagement du logement…), et aide sociale aux personnes handicapées."),
    L("s","s.fam","Prestations familiales", PS.p_famille, "Allocations familiales, prestations pour la petite enfance (PAJE), allocation de rentrée scolaire, congés de maternité et de paternité."),
    L("e","e.fam","Aides aux familles versées par l'État", PE.p_famille, "Aides aux familles financées par l'État (prestations diverses, bourses familiales…)."),
    L("c","c.fam","Aides aux familles des collectivités", PC.p_famille, "Aides financières des départements et communes aux familles (aide sociale à l'enfance sous forme d'allocations, aides des centres communaux d'action sociale…)."),
    L("s","s.cho","Allocations chômage (Unédic)", PS.p_chomage, "Allocations d'aide au retour à l'emploi versées par France Travail pour le compte de l'Unédic, financées par les cotisations et une part de CSG."),
    L("e","e.cho","Allocations de solidarité chômage", PE.p_chomage, "Allocation de solidarité spécifique (ASS) pour les chômeurs en fin de droits et autres aides financées par l'État."),
    L("e","e.log","Aides au logement (APL)", PE.p_logement, "Aides personnelles au logement (APL, ALF, ALS), versées par les CAF et financées par l'État."),
    L("e","e.excl","Prime d'activité et lutte contre la pauvreté", PE.p_exclusion, "Surtout la prime d'activité, complément de revenu pour les travailleurs modestes, et l'aide alimentaire. Le RSA, lui, est payé par les départements."),
    L("c","c.excl","Revenu de solidarité active (RSA)", PC.p_exclusion, "Revenu minimum versé par les départements (par l'intermédiaire des CAF) aux personnes sans ressources ou à très faibles revenus."),
    L("e","e.sante","Soins pris en charge par l'État", PE.p_sante, "Petites dépenses de soins financées directement par l'État et ses agences (hors aide médicale de l'État, classée ailleurs en comptabilité nationale)."),
    L("c","c.sante","Soins pris en charge par les collectivités", PC.p_sante, "Petites dépenses de soins financées directement par les collectivités (centres de santé, vaccination…)."),
    L("e","e.autres","Autres prestations de l'État", PE.p_autres, "Bourses d'études, aides diverses aux ménages versées par l'État et ses agences."),
    L("c","c.autres","Autres aides sociales des collectivités", PC.p_autres, "Bourses et aides diverses des régions, départements et communes, secours des centres communaux d'action sociale."),
  ]},
  { key:"g.remu", label:"Salaires des agents", lines:[
    L("e","e.remu","Agents de l'État et de ses agences", flow("c_etat","remu"), "Rémunérations et cotisations employeur des enseignants, militaires, policiers, magistrats, agents des impôts, ainsi que des agents des agences et universités."),
    L("s","s.remu","Hôpitaux publics et caisses de Sécurité sociale", flow("c_secu","remu"), "Rémunérations des soignants et autres personnels des hôpitaux publics, et des agents des caisses (CPAM, CAF, Urssaf, France Travail pour la partie Unédic)."),
    L("c","c.remu","Agents des collectivités", flow("coll","remu"), "Fonctionnaires territoriaux : agents des mairies, Atsem et cantines des écoles, agents des collèges et lycées, voirie, travailleurs sociaux des départements, polices municipales, pompiers professionnels…"),
  ]},
  { key:"g.fonct", label:"Achats et fonctionnement", lines:[
    L("e","e.fonct","Achats de l'État et de ses agences", flow("c_etat","fonct"), "Énergie, carburant, loyers, fournitures, informatique, entretien du matériel militaire, prestations de services."),
    L("s","s.fonct","Achats des hôpitaux et caisses", flow("c_secu","fonct"), "Médicaments et fournitures des hôpitaux, énergie, restauration, informatique, prestations de services."),
    L("c","c.fonct","Achats des collectivités", flow("coll","fonct"), "Énergie et entretien des bâtiments (écoles, collèges, lycées, équipements sportifs), repas des cantines, contrats de transport scolaire et de collecte des déchets, fournitures."),
  ]},
  { key:"g.invest", label:"Investissement", lines:[
    L("e","e.invest","Investissement de l'État et de ses agences", flow("c_etat","invest"), "Équipements militaires, bâtiments publics, routes nationales et réseaux, logiciels, dépenses de recherche."),
    L("s","s.invest","Investissement des hôpitaux et caisses", flow("c_secu","invest"), "Construction et rénovation d'hôpitaux, équipements médicaux lourds, informatique."),
    L("c","c.invest","Investissement des collectivités", flow("coll","invest"), "Les collectivités réalisent la majorité de l'investissement public civil : écoles, collèges et lycées, voirie, transports en commun, eau et assainissement, équipements sportifs et culturels."),
  ]},
  { key:"g.int", label:"Intérêts de la dette", lines:[
    L("e","e.int","Intérêts payés par l'État et ses agences", flow("c_etat","interets"), "Intérêts de la dette de l'État et de ses agences, en comptabilité nationale (la Cour des comptes publie 51,6 Md€ pour le seul budget de l'État, en comptabilité budgétaire).", DETTE),
    L("s","s.int","Intérêts payés par la Sécurité sociale", flow("c_secu","interets"), "Intérêts de la dette sociale, portée surtout par la Caisse d'amortissement de la dette sociale (CADES).", DETTE),
    L("c","c.int","Intérêts payés par les collectivités", flow("coll","interets"), "Intérêts des emprunts des collectivités. Elles ne peuvent emprunter que pour investir, pas pour financer leur fonctionnement (« règle d'or »).", DETTE),
  ]},
  { key:"g.subv", label:"Subventions aux entreprises", lines:[
    L("e","e.subv","Subventions de l'État et de ses agences", flow("c_etat","subv"), "Aides directes aux entreprises : aides à l'embauche d'apprentis, soutien aux énergies renouvelables, compensations tarifaires (transports, énergie), aides agricoles nationales."),
    L("s","s.subv","Subventions de la Sécurité sociale", flow("c_secu","subv"), "Petites aides versées aux entreprises par les organismes sociaux."),
    L("c","c.subv","Subventions des collectivités", flow("coll","subv"), "Surtout le financement des réseaux de transport public exploités par des entreprises (bus, tram, TER), et les aides économiques des régions."),
  ]},
  { key:"g.autres", label:"Autres transferts", lines:[
    L("e","e.autres_t","Autres transferts de l'État et de ses agences", flow("c_etat","autres"), "Subventions aux associations, aide au développement, crédit d'impôt recherche et autres crédits d'impôt versés, transferts en capital, dépenses diverses."),
    L("e","e.ue","Contribution au budget de l'Union européenne", flow("c_etat","ue"), "Contribution de la France au budget européen, calculée surtout sur son revenu national. Une partie revient en France via les politiques européennes.", "Fixée par les règles de financement de l'UE : la France ne peut pas la réduire seule."),
    L("s","s.autres_t","Autres transferts de la Sécurité sociale", flow("c_secu","autres"), "Action sociale des caisses, financement d'établissements médico-sociaux, dépenses diverses."),
    L("c","c.autres_t","Autres transferts des collectivités", flow("coll","autres"), "Subventions aux associations (sport, culture, social), hébergement des enfants placés et des personnes âgées ou handicapées en établissement, aides à l'investissement, dépenses diverses."),
  ]},
  { key:"g.coll", label:"Versements aux collectivités", lines:[
    L("e","e.coll","Versés par l'État et ses agences", tflow("c_etat","coll"), "Dotations et subventions nettes versées aux communes, départements et régions (DGF, FCTVA, dotations d'investissement…). Disparaît quand les collectivités sont incluses, car c'est alors un mouvement interne.", null, "c"),
    L("s","s.coll","Versés par la Sécurité sociale", tflow("c_secu","coll"), "Surtout la CNSA, qui finance une partie de l'allocation personnalisée d'autonomie (APA) et de la prestation de compensation du handicap (PCH) versées par les départements. Disparaît quand les collectivités sont incluses.", null, "c"),
  ]},
  { key:"g.secu", label:"Versements à la Sécurité sociale", lines:[
    L("e","e.secu","Versés par l'État et ses agences", tflow("c_etat","c_secu"), "Transferts nets vers la Sécurité sociale : compensation de certaines exonérations de cotisations, subventions d'équilibre. Disparaît quand la Sécurité sociale est incluse, car c'est alors un mouvement interne.", null, "s"),
  ]},
];

// Périmètre = ensemble de blocs. Recettes : recettes propres des blocs inclus + versements reçus des blocs exclus.
function natScope(blocks){
  const has = b => blocks.includes(b);
  const groups = natGroups.map(g=>({ key:g.key, label:g.label, fixed:0,
    lines: g.lines.filter(l=>has(l.b) && !(l.to && has(l.to)) && l.base>0.004) })).filter(g=>g.lines.length);
  let rec = blocks.reduce((a,b)=>a+inflow(BLOCK[b].node),0);
  for(const x of "esc") for(const y of blocks) if(!has(x) && x!==y) rec += tflow(BLOCK[x].node, BLOCK[y].node);
  return { groups, recettes:rec, blocks };
}
const internes = blocks => {
  const has = b => blocks.includes(b), out = [];
  for(const g of natGroups) for(const l of g.lines) if(l.to && has(l.b) && has(l.to)) out.push(`versements ${l.b==="e"?"de l'État et de ses agences":"de la Sécurité sociale"} ${l.to==="c"?"aux collectivités":"à la Sécurité sociale"} (${md(l.base)})`);
  return out.length ? ` Consolidation : les ${out.join(", les ")} sont des mouvements internes et ne comptent pas en dépense.` : "";
};
const NA_FOOT = blocks => `Comptabilité nationale 2025 (Insee, Eurostat), mêmes chiffres que la vue « par nature » de la visualisation.${internes(blocks)} Le partage des prestations sociales par risque reprend la structure de 2024, la dernière publiée. Bpifrance et la Caisse des Dépôts ne figurent pas ici : ils prêtent et garantissent, ils ne dépensent pas au sens comptable.`;
const COMME_SI = "On fait ici comme si tout formait une seule caisse : en réalité, chaque ensemble a ses propres recettes et l'argent ne passe pas librement de l'un à l'autre.";

const SCOPES = {
  etat: { label:"État", groups:budgetGroups, fixed:T.rd_locaux, recettes:T.recettes, blocks:[],
    title:"Budget de l'État", deficitLabel:"budget général",
    intro:`Point de départ : le <b>budget de l'État</b> réellement exécuté en 2025 (budget général, comptabilité budgétaire), ministère par ministère. Les variations portent sur la part <b>hors cotisations retraite des agents</b> : ces cotisations financent des pensions déjà dues et restent fixes.`,
    foot:`Non modifiables ici : dégrèvements d'impôts locaux (${md(T.rd_locaux)}). Les remboursements d'impôts (137 Md€) sont déjà déduits des recettes. Ministères regroupés comme dans la vue « par ministère » 2025.` },
  ee: { label:"État élargi", ...natScope(["e"]), fixed:0,
    title:"Dépenses de l'État et de ses agences", deficitLabel:"État et agences",
    intro:`Point de départ : les dépenses 2025 de l'<b>État et de ses agences</b> (opérateurs, universités, organismes de recherche…), en <b>comptabilité nationale</b> (Insee). Le découpage se fait par grande nature de dépense, pas par ministère : ces comptes ne sont pas publiés ministère par ministère.`,
    foot:NA_FOOT(["e"]) },
  es: { label:"État élargi + Sécu", ...natScope(["e","s"]), fixed:0,
    title:"Dépenses de l'État, de ses agences et de la Sécurité sociale", deficitLabel:"État, agences et Sécu",
    intro:`Point de départ : les dépenses 2025 de l'<b>État, de ses agences et de la Sécurité sociale</b> (Assurance maladie, retraites, famille, Unédic, hôpitaux…), en <b>comptabilité nationale</b> (Insee). ${COMME_SI}`,
    foot:NA_FOOT(["e","s"]) },
  ec: { label:"État élargi + collectivités", ...natScope(["e","c"]), fixed:0,
    title:"Dépenses de l'État, de ses agences et des collectivités", deficitLabel:"État, agences et collectivités",
    intro:`Point de départ : les dépenses 2025 de l'<b>État, de ses agences et des collectivités locales</b> (communes, intercommunalités, départements, régions), en <b>comptabilité nationale</b> (Insee). ${COMME_SI} Les collectivités ne peuvent d'ailleurs emprunter que pour investir.`,
    foot:NA_FOOT(["e","c"]) },
  esc: { label:"État élargi + Sécu + collectivités", ...natScope(["e","s","c"]), fixed:0,
    title:"Dépenses publiques totales", deficitLabel:"toutes administrations",
    intro:`Point de départ : l'ensemble des <b>dépenses publiques</b> 2025, État, agences, Sécurité sociale et collectivités, en <b>comptabilité nationale</b> (Insee) : les fameux 1 714 Md€. ${COMME_SI}`,
    foot:NA_FOOT(["e","s","c"]) },
};
// Recettes par origine (fixes), pour le schéma de flux
const REC_LABEL = { tva:"TVA", ir:"Impôt sur le revenu & CSG", cotis:"Cotisations sociales", prod:"Autres impôts sur la production", is:"Impôt sur les sociétés",
  ventes:"Ventes & services", capital:"Successions & donations", patrimoine:"Revenus du patrimoine", autimp:"Autres impôts courants", transf_in:"Transferts reçus (UE…)",
  b_tva:"TVA nette (part de l'État)", b_ir:"Impôt sur le revenu (net)", b_is:"Impôt sur les sociétés (net)", b_ticpe:"Accise sur l'énergie (part État)",
  b_autres:"Autres recettes fiscales nettes", b_rnf:"Recettes non fiscales", b_fdc:"Fonds de concours" };
const REC_ORDER = ["ir","cotis","tva","prod","is","ventes","capital","patrimoine","autimp","transf_in"];
SCOPES.etat.sources = BV.links.filter(l=>l.target==="budget" && l.source!=="b_deficit").map(l=>({id:l.source, l:REC_LABEL[l.source]||l.source, v:l.value}));
for(const k of ["ee","es","ec","esc"]){
  const sc = SCOPES[k], has = b => sc.blocks.includes(b), acc = {};
  for(const b of sc.blocks) for(const x of NA) if(x.target===BLOCK[b].node && !x.kind && x.source!=="deficit") acc[x.source]=(acc[x.source]||0)+x.value;
  const src = REC_ORDER.filter(i=>acc[i]>0.004).map(i=>({id:i, l:REC_LABEL[i], v:acc[i]}));
  for(const x of "esc") if(!has(x)){ const v = sc.blocks.reduce((a,y)=>a+tflow(BLOCK[x].node,BLOCK[y].node),0);
    if(v>0.004) src.push({id:"from_"+x, l:x==="e"?"Versé par l'État et ses agences":"Versé par la Sécurité sociale", v, t:"transfer"}); }
  sc.sources = src;
}
SCOPES.etat.center = "Budget de l'État"; SCOPES.ee.center = "État et agences"; SCOPES.es.center = "État, agences et Sécu";
SCOPES.ec.center = "État, agences et collectivités"; SCOPES.esc.center = "Toutes les administrations publiques";
budgetGroups.find(g=>g.key==="psr").split = true;

for(const k in SCOPES){
  const S = SCOPES[k];
  S.baseTotal = S.groups.reduce((s,g)=>s+g.fixed+g.lines.reduce((a,l)=>a+l.base,0),0) + S.fixed;
  S.baseDeficit = k==="etat" ? -T.solde_bg : S.baseTotal - S.recettes;
}

// ---------------------------------------------------------------------------
// État de l'utilisateur : périmètre + variations en % (clés partagées entre « État élargi » et « + Sécu »)
let scope = "etat";
const pct = {};
const S = () => SCOPES[scope];
// Une ligne « par fonction » regroupe des parts (une par bloc et par fonction), chacune avec sa propre variation :
// le curseur fixe la même variation pour toutes ses parts, ce qui garde les montants exacts quand on change de périmètre.
const lineVal = l => l.parts ? l.parts.reduce((a,p)=>a+p.base*(1+(pct[p.key]||0)/100),0) : l.base * (1 + (pct[l.key]||0)/100);
const linePct = l => l.parts ? (l.base ? (lineVal(l)/l.base-1)*100 : 0) : (pct[l.key]||0);
const setPct = (l,v) => { if(l.parts) l.parts.forEach(p=>{ pct[p.key]=v; }); else pct[l.key]=v; };
const clearLine = l => { if(l.parts) l.parts.forEach(p=>{ delete pct[p.key]; }); else delete pct[l.key]; };
const groupBase = g => g.lines.reduce((a,l)=>a+l.base,0);
const groupVal = g => g.lines.reduce((a,l)=>a+lineVal(l),0);

// --- Détail par fonction (périmètres en comptabilité nationale) ---------------
// Chaque ligne « nature × bloc » (ex. investissement de l'État) est répartie entre ~19 fonctions
// (défense, recherche, transports…) selon la structure COFOG 2024. En mode détaillé, un curseur par fonction.
let detailMode = false;
const DET = F.ajust_detail || {cats:[], parts:{}};
const CAT_LABEL = Object.fromEntries(DET.cats);
const CAT_DEF = {
  defense:"Armées : militaires et civils de la défense, matériels, entretien, opérations. Hors recherche militaire, comptée dans « Recherche ».",
  recherche:"Toute la recherche publique, quel que soit le domaine : organismes (CNRS, CEA, Inserm…), recherche universitaire, recherche militaire, spatiale, médicale, agricole. En investissement, les dépenses de recherche comptent comme un investissement.",
  securite:"Police, gendarmerie, polices municipales, tribunaux, prisons, pompiers et sécurité civile.",
  admin:"Fonctionnement général des administrations : ministères, préfectures, services des impôts, mairies et hôtels de département ou de région, élections, assemblées.",
  aide_dev:"Aide économique aux pays en développement et contributions aux organisations internationales de développement.",
  emploi:"Politique de l'emploi et aides économiques générales : apprentissage, contrats aidés, France Travail (part État), aides à l'investissement des entreprises (France 2030…).",
  agri:"Aides à l'agriculture, à la forêt et à la pêche, services vétérinaires, Office national des forêts.",
  energie:"Soutien aux énergies renouvelables, chèque énergie, boucliers tarifaires, réseaux de chaleur.",
  industrie:"Soutien à l'industrie, au commerce, au tourisme, aux médias et aux autres secteurs économiques.",
  transports:"Routes, ferroviaire, transports en commun (bus, tram, métro, TER), ports, aéroports, voies navigables.",
  environnement:"Collecte et traitement des déchets, assainissement des eaux usées, lutte contre la pollution, protection de la nature.",
  logement:"Aménagement urbain et rural, logement social (aides à la pierre), éclairage public, eau potable, voirie communale hors transports.",
  hopital:"Hôpitaux publics : soignants, médicaments, équipements, bâtiments.",
  sante:"Santé hors hôpital : prévention, agences sanitaires, centres de santé, médecine scolaire et du travail.",
  culture:"Équipements sportifs, piscines, musées, bibliothèques, conservatoires, patrimoine, spectacles, soutien aux associations.",
  scolaire:"Écoles maternelles et élémentaires, collèges et lycées : enseignants (État), agents et bâtiments (communes, départements, régions).",
  sup:"Universités et grandes écoles (hors recherche, comptée à part), vie étudiante.",
  ens_autres:"Services autour de l'école : cantines, transport scolaire, internats, orientation, bourses et aides diverses.",
  social:"Action sociale et gestion de la protection sociale : agents des caisses et des services sociaux, établissements pour personnes âgées ou handicapées, aide sociale à l'enfance, insertion.",
  autres:"Petites fonctions regroupées (moins de 50 M€ chacune).",
};
const DET_GROUPS = new Set(["g.remu","g.fonct","g.invest","g.subv","g.autres"]);
const natOf = l => { const m = /^n\.[esc]\.(remu|fonct|invest|subv|autres_t)$/.exec(l.key); return m ? m[1].replace("_t","") : null; };
const partsOf = l => { const n = natOf(l); return n ? (DET.parts[l.b]||{})[n] : null; };
const normParts = p => { const t = Object.values(p).reduce((a,x)=>a+x,0); return Object.entries(p).map(([k,x])=>[k,x/t]); };
const BLOCK_NAME = { e:"État et agences", s:"Sécurité sociale", c:"collectivités" };
function detailGroups(groups){
  return groups.map(g=>{
    if(!DET_GROUPS.has(g.key)) return g;
    const keep = [], acc = {};
    for(const l of g.lines){
      const p = partsOf(l);
      if(!p){ keep.push(l); continue; }
      for(const [c,sh] of normParts(p)){ (acc[c] ||= {base:0, parts:[]}); acc[c].base += l.base*sh; acc[c].parts.push({b:l.b, base:l.base*sh, key:`d.${g.key}.${l.b}.${c}`}); }
    }
    let cats = Object.entries(acc).sort((a,b)=>b[1].base-a[1].base);
    const small = cats.filter(([,v])=>v.base<0.05); cats = cats.filter(([,v])=>v.base>=0.05);
    if(small.length){ const m = {base:0, parts:[]}; for(const [,v] of small){ m.base+=v.base; m.parts.push(...v.parts); } cats.push(["autres", m]); }
    const lines = cats.map(([c,v])=>{
      const byB = {}; for(const p of v.parts) byB[p.b] = (byB[p.b]||0) + p.base;
      const who = Object.keys(byB).length>1 ? " En 2025 : " + Object.entries(byB).sort((a,b)=>b[1]-a[1]).map(([b,x])=>`${BLOCK_NAME[b]} ${md(x)}`).join(", ") + "." : "";
      return { key:`d.${g.key}.${c}`, label:(CAT_LABEL[c]||"Autres fonctions"), base:v.base, parts:v.parts, cat:c,
        def:(CAT_DEF[c]||"") + who + " Montants estimés avec la répartition par fonction de 2024." };
    });
    return { ...g, lines:[...lines, ...keep] };
  });
}
let gCache = null;
const G = () => gCache || (gCache = (detailMode && scope!=="etat") ? detailGroups(S().groups) : S().groups);
const invalidate = () => { gCache = null; };
// Passage simple <-> détaillé en conservant exactement les montants (sur toutes les lignes, tous blocs confondus)
function toDetail(){
  for(const g of natGroups){ if(!DET_GROUPS.has(g.key)) continue;
    for(const l of g.lines){ const p = partsOf(l); if(!p) continue; const v = pct[l.key]||0; delete pct[l.key];
      if(v) for(const [c] of normParts(p)) pct[`d.${g.key}.${l.b}.${c}`] = v; } }
}
function toSimple(){
  for(const g of natGroups){ if(!DET_GROUPS.has(g.key)) continue;
    for(const l of g.lines){ const p = partsOf(l); if(!p) continue;
      const v = normParts(p).reduce((a,[c,sh])=>a + sh*(1+(pct[`d.${g.key}.${l.b}.${c}`]||0)/100), 0);
      const r = (v-1)*100; if(Math.abs(r)>1e-6) pct[l.key] = +r.toFixed(4); else delete pct[l.key]; } }
  for(const k of Object.keys(pct)) if(k.startsWith("d.")) delete pct[k];
}
const total = () => G().reduce((s,g)=>s+g.fixed+groupVal(g),0) + S().fixed;

function save(){
  const p = Object.fromEntries(Object.entries(pct).filter(([,v])=>v));
  const hasP = Object.keys(p).length;
  const st = detailMode ? {s:scope,p,d:1} : {s:scope,p};
  const enc = (hasP || scope!=="etat") ? "#a=" + encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(st))))) : "";
  try{ history.replaceState(null,"",location.pathname+location.search+enc); }catch(e){}
  try{ localStorage.setItem("visu-ajust", JSON.stringify(st)); }catch(e){}
}
function apply(o){
  if(!o || typeof o!=="object") return;
  const p = o.p && typeof o.p==="object" ? o.p : (o.s ? {} : o); // ancien format : objet de % direct
  if(SCOPES[o.s]) scope = o.s;
  detailMode = !!o.d;
  for(const [k,v] of Object.entries(p)) if(isFinite(+v)) pct[k] = +v;
}
function load(){
  let o = null;
  try{ if(location.hash.startsWith("#a=")) o = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(location.hash.slice(3)))))); }catch(e){}
  if(!o){ try{ o = JSON.parse(localStorage.getItem("visu-ajust")||"null"); }catch(e){} }
  apply(o);
}

// ---------------------------------------------------------------------------
// Rendu
const root = document.getElementById("ajust");
const open = new Set();
const shown = new Set(); // définitions dépliées
const tag = l => l.b && S().blocks.length>1 ? `<span class="aj-tag ${l.b}">${BLOCK[l.b].tag}</span> ` : "";
function nameHTML(l){
  const hasDef = !!l.def;
  return `<div class="aj-name">${tag(l)}${esc(l.label)}${hasDef?` <button type="button" class="aj-info" data-d="${l.key}" aria-expanded="${shown.has(l.key)}" aria-label="Définition : ${esc(l.label)}" title="Qu'est-ce que c'est ?">?</button>`:""}${l.hint?` <span class="aj-warn" title="${esc(l.hint)}">⚠</span>`:""}
    ${hasDef?`<div class="aj-def" ${shown.has(l.key)?"":"hidden"}>${esc(l.def)}${l.hint?`<br><span class="aj-hint">⚠ ${esc(l.hint)}</span>`:""}</div>`:""}</div>`;
}
function rowHTML(l, small){
  const v = lineVal(l), d = v - l.base, p = linePct(l);
  return `<div class="aj-row${small?" aj-sub":""}" data-k="${l.key}">
    ${nameHTML(l)}
    <input class="aj-range" type="range" min="-100" max="100" step="1" value="${Math.round(p)}" aria-label="Variation de ${esc(l.label)} en pourcentage">
    <div class="aj-pct">${fmtPct(p)}</div>
    <input class="aj-num" type="number" step="0.1" min="0" value="${v.toFixed(2)}" aria-label="Montant en milliards d'euros">
    <div class="aj-delta ${d>0.005?"up":d<-0.005?"down":""}">${Math.abs(d)<0.05?"—":sgn(d)}</div>
  </div>`;
}
function summaryHTML(){
  const s = S(), tot = total(), dTot = tot - s.baseTotal, def = s.baseDeficit + dTot;
  return `<div class="kpi"><div class="l">${s.title}</div><div class="v">${md(tot)}</div><div class="s">${Math.abs(dTot)<0.005?"comme en 2025":sgn(dTot)+" par rapport à 2025 ("+(dTot>0?"+":"−")+nf1.format(Math.abs(dTot)/s.baseTotal*100)+" %)"}</div></div>
      <div class="kpi"><div class="l">${def>=0?"Déficit":"Excédent"} (${s.deficitLabel})</div><div class="v ${def<s.baseDeficit-0.005?"good":def>s.baseDeficit+0.005?"bad":""}">${md(Math.abs(def))} <span class="aj-pib">${nf1.format(Math.abs(def)/PIB*100)} % du PIB</span></div><div class="s">2025 réel : ${md(s.baseDeficit)} (${nf1.format(s.baseDeficit/PIB*100)} % du PIB) · recettes inchangées (${md(s.recettes)})</div></div>
      <div class="kpi"><div class="l">Par habitant</div><div class="v">${dTot>=0?"+":"−"}${nf0.format(Math.abs(dTot)*1000/POP)} €</div><div class="s">de dépenses en plus ou en moins par an</div></div>`;
}
function render(){
  const s = S();
  let h = `<div class="controls" style="margin:4px 0 10px"><div><span class="ctl-label">Périmètre</span><span class="seg" id="aj-scope">${
      Object.entries(SCOPES).map(([k,v])=>`<button type="button" data-s="${k}" aria-pressed="${k===scope}">${v.label}</button>`).join("")}</span></div>
      ${scope==="etat" ? "" : `<div><span class="ctl-label">Curseurs</span><span class="seg" id="aj-detail"><button type="button" data-d="0" aria-pressed="${!detailMode}">Simples</button><button type="button" data-d="1" aria-pressed="${detailMode}">Par fonction</button></span></div>`}</div>
    ${scope!=="etat" && detailMode ? `<p class="sub aj-detnote">Mode <b>par fonction</b> : salaires, achats, investissement, subventions et autres transferts sont découpés par domaine (défense, recherche, transports, écoles…). Les montants par fonction sont estimés en appliquant à 2025 la répartition de 2024, la dernière publiée.</p>` : ""}
    <p class="sub">${s.intro}</p>
    <div class="aj-summary"><div class="aj-kpis" id="aj-kpis">${summaryHTML()}</div>
      <div class="kpi aj-actions"><button type="button" id="aj-reset">Tout remettre à zéro</button><button type="button" id="aj-copy">Copier le lien de mon budget</button><span id="aj-msg" class="s"></span></div>
    </div>
    <div class="aj-flows"><div class="aj-flows-head"><h3>Le budget ajusté, en flux</h3><button type="button" id="aj-flowtog" aria-expanded="${showFlows}">${showFlows?"Masquer le schéma":"Afficher le schéma"}</button></div>
      <div class="scroller" id="aj-sk-wrap" ${showFlows?"":"hidden"}><svg id="aj-sk" role="img" aria-label="Schéma des recettes et des dépenses ajustées"></svg></div>
      <p class="sub" id="aj-sk-note" ${showFlows?"":"hidden"}>Recettes fixes, dépenses telles que vous les avez réglées. L'emprunt (déficit) s'ajuste pour équilibrer. Entre parenthèses : l'écart avec 2025. Survolez un flux pour le détail.</p></div>
    <p class="sub">Modifiez chaque poste avec le curseur (en %) ou en tapant directement un montant. Cliquez sur <b>?</b> pour savoir ce que recouvre une ligne. Les recettes ne bougent pas pour l'instant.</p>
    <div class="aj-head"><div>Poste</div><div>Variation</div><div></div><div>Montant (Md€)</div><div>Écart</div></div>`;
  for(const g of G()){
    const isOpen = open.has(g.key);
    h += `<div class="aj-group">
      <div class="aj-row aj-main" data-g="${g.key}">
        <div class="aj-name"><button type="button" class="aj-tog" data-g="${g.key}" aria-expanded="${isOpen}">${isOpen?"▾":"▸"}</button>${esc(g.label)}
          <div class="aj-meta">${md(groupBase(g))}${g.fixed?" hors retraites":""} en 2025${g.fixed>=0.05?` · + ${md(g.fixed)} ${g.fixedLabel}`:""} · ${g.lines.length} ligne${g.lines.length>1?"s":""}</div>
          <div class="aj-bar"><span></span></div></div>
        <input class="aj-range" type="range" min="-100" max="100" step="1" value="0" aria-label="Variation de ${esc(g.label)}">
        <div class="aj-pct"></div>
        <div class="aj-numtxt"></div>
        <div class="aj-delta"></div>
      </div>`;
    if(isOpen) h += g.lines.map(l=>rowHTML(l,true)).join("");
    h += `</div>`;
  }
  h += `<p class="sub" style="margin-top:12px">${s.foot}</p>`;
  root.innerHTML = h;
  bind(); refresh();
}
function setDelta(el, d){ el.className = "aj-delta " + (d>0.05?"up":d<-0.05?"down":""); el.textContent = Math.abs(d)<0.05?"—":sgn(d); }
function refresh(active){
  document.getElementById("aj-kpis").innerHTML = summaryHTML();
  scheduleSankey();
  const groups = G();
  const maxDelta = Math.max(1, ...groups.map(g=>Math.abs(groupVal(g)-groupBase(g))));
  for(const g of groups){
    const row = root.querySelector(`.aj-main[data-g="${g.key}"]`); if(!row) continue;
    const gb=groupBase(g), gv=groupVal(g), d=gv-gb, gp = gb ? Math.round((gv/gb-1)*100) : 0;
    const r = row.querySelector(".aj-range"); if(r!==active) r.value = gp;
    row.querySelector(".aj-pct").textContent = fmtPct(gp);
    row.querySelector(".aj-numtxt").textContent = nf2.format(+gv.toFixed(2));
    setDelta(row.querySelector(".aj-delta"), d);
    const w = Math.abs(d)/maxDelta*50, b = row.querySelector(".aj-bar span");
    b.className = d<0?"down":"up"; b.style.cssText = d<0?`right:50%;width:${w}%`:`left:50%;width:${w}%`;
    for(const l of g.lines){
      const lr = root.querySelector(`.aj-row[data-k="${l.key}"]`); if(!lr) continue;
      const p = linePct(l), v = lineVal(l);
      const rr = lr.querySelector(".aj-range"); if(rr!==active) rr.value = Math.round(p);
      lr.querySelector(".aj-pct").textContent = fmtPct(p);
      const n = lr.querySelector(".aj-num"); if(document.activeElement!==n) n.value = v.toFixed(2);
      setDelta(lr.querySelector(".aj-delta"), v-l.base);
    }
  }
}
function bind(){
  const groups = G(), lines = groups.flatMap(g=>g.lines);
  root.querySelectorAll("#aj-scope button").forEach(b=>b.addEventListener("click",()=>{ scope=b.dataset.s; open.clear(); invalidate(); save(); render(); }));
  root.querySelectorAll("#aj-detail button").forEach(b=>b.addEventListener("click",()=>{ const d = b.dataset.d==="1"; if(d===detailMode) return;
    d ? toDetail() : toSimple(); detailMode = d; invalidate(); save(); render(); }));
  root.querySelectorAll(".aj-main .aj-range").forEach(r=>{
    const g = groups.find(x=>x.key===r.closest(".aj-row").dataset.g);
    r.addEventListener("input",()=>{ g.lines.forEach(l=>setPct(l,+r.value)); save(); refresh(r); });
  });
  root.querySelectorAll(".aj-row[data-k] .aj-range").forEach(r=>{
    const k = r.closest(".aj-row").dataset.k, l = lines.find(x=>x.key===k);
    r.addEventListener("input",()=>{ setPct(l,+r.value); save(); refresh(r); });
  });
  root.querySelectorAll(".aj-num").forEach(inp=>{
    const k = inp.closest(".aj-row").dataset.k, l = lines.find(x=>x.key===k);
    inp.addEventListener("change",()=>{ const v=Math.max(0,parseFloat(String(inp.value).replace(",","."))||0); setPct(l, l.base ? +(((v/l.base)-1)*100).toFixed(4) : 0); save(); refresh(); });
  });
  root.querySelectorAll(".aj-tog").forEach(b=>b.addEventListener("click",()=>{ const k=b.dataset.g; open.has(k)?open.delete(k):open.add(k); render(); }));
  root.querySelectorAll(".aj-info").forEach(b=>b.addEventListener("click",()=>{
    const k=b.dataset.d, d=b.parentElement.querySelector(".aj-def"); const on=!shown.has(k);
    on?shown.add(k):shown.delete(k); d.hidden=!on; b.setAttribute("aria-expanded",String(on));
  }));
  document.getElementById("aj-flowtog").addEventListener("click",e=>{ showFlows=!showFlows; try{ localStorage.setItem("visu-ajust-flows", showFlows?"1":"0"); }catch(_){}
    document.getElementById("aj-sk-wrap").hidden=!showFlows; document.getElementById("aj-sk-note").hidden=!showFlows;
    e.target.textContent = showFlows?"Masquer le schéma":"Afficher le schéma"; e.target.setAttribute("aria-expanded",String(showFlows)); scheduleSankey(); });
  document.getElementById("aj-reset").addEventListener("click",()=>{ lines.forEach(clearLine); save(); refresh(); });
  document.getElementById("aj-copy").addEventListener("click",async()=>{
    save(); const msg=document.getElementById("aj-msg");
    try{ await navigator.clipboard.writeText(location.href); msg.textContent="Lien copié."; }catch(e){ msg.textContent="Copiez l'adresse de la page : elle contient vos réglages."; }
  });
}

// ---------------------------------------------------------------------------
// Schéma de flux (Sankey) ajusté
let showFlows = true, skPending = false;
try{ showFlows = localStorage.getItem("visu-ajust-flows")!=="0"; }catch(e){}
const cssv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const tip = document.getElementById("tip");
const showTip = (h,ev) => { if(!tip) return; tip.innerHTML=h; tip.style.opacity=1; moveTip(ev); };
const moveTip = ev => { if(!tip) return; const w=tip.offsetWidth, x=Math.min(ev.clientX+14, innerWidth-w-8); tip.style.left=x+"px"; tip.style.top=(ev.clientY+14)+"px"; };
const hideTip = () => { if(tip) tip.style.opacity=0; };
function scheduleSankey(){ if(skPending || !showFlows) return; skPending = true; requestAnimationFrame(()=>{ skPending=false; drawSankey(); }); }
function drawSankey(){
  const svgEl = document.getElementById("aj-sk"); if(!svgEl || !window.d3 || !d3.sankey || !showFlows) return;
  const s = S();
  // nœuds de droite : un par groupe (ou par ligne pour les groupes « split »), plus les montants fixes
  const right = [];
  for(const g of G()){
    if(g.split) for(const l of g.lines) right.push({id:"r_"+l.key, l:l.label, v:lineVal(l), b:l.base});
    else right.push({id:"r_"+g.key, l:g.label, v:groupVal(g)+g.fixed, b:groupBase(g)+g.fixed, fixed:g.fixed});
  }
  if(s.fixed) right.push({id:"r_fixed", l:"Dégrèvements d'impôts locaux", v:s.fixed, b:s.fixed});
  const tot = total(), rec = s.recettes, def = tot - rec, baseDef = s.baseDeficit;
  const left = s.sources.map(x=>({...x}));
  if(def > 0.005) left.push({id:"deficit", l:`Emprunt (déficit) · ${nf1.format(def/PIB*100)} % du PIB`, v:def, b:baseDef, t:"deficit"});
  else if(def < -0.005) right.push({id:"excedent", l:`Excédent · ${nf1.format(-def/PIB*100)} % du PIB`, v:-def, t:"good"});
  const C = {id:"center", l:s.center, t:"etat"};
  const nodes = [...left, C, ...right].map(n=>({...n}));
  const links = [...left.filter(n=>n.v>0.004).map(n=>({source:n.id, target:"center", value:n.v})),
                 ...right.filter(n=>n.v>0.004).map(n=>({source:"center", target:n.id, value:n.v}))];
  const used = new Set(links.flatMap(l=>[l.source,l.target]));
  const N = nodes.filter(n=>used.has(n.id));
  const nL = N.filter(n=>left.some(x=>x.id===n.id)).length, nR = N.length-nL-1;
  const box = svgEl.parentNode.getBoundingClientRect();
  const W = Math.max(960, box.width), H = Math.max(420, 34*Math.max(nL,nR) + 60);
  const mL = 270, mR = 330, top = 26;
  const svg = d3.select(svgEl).attr("viewBox",`0 0 ${W} ${H}`).attr("width",W).attr("height",H);
  svg.selectAll("*").remove();
  const sk = d3.sankey().nodeId(d=>d.id).nodeWidth(14).nodePadding(13).nodeAlign(d3.sankeyJustify)
    .nodeSort(null).linkSort(null).extent([[mL, top],[W-mR, H-8]]);
  const g = sk({nodes:N, links});
  const col = t => cssv({rec:"--rec",dep:"--dep",etat:"--etat",deficit:"--deficit",transfer:"--transfer",good:"--rec"}[t]||"--dep");
  const typ = n => n.id==="center" ? "etat" : n.t ? n.t : n.depth===0 ? "rec" : "dep";
  const colhead = (x,anchor,txt) => svg.append("text").attr("class","colhead").attr("x",x).attr("y",12).attr("text-anchor",anchor).text(txt);
  colhead(mL-6,"end","Recettes (fixes)"); colhead(W-mR+20,"start","Dépenses (ajustées)");
  const fmtD = (v,b) => { const d=v-b; return Math.abs(d)<0.05 ? "" : ` (${d>0?"+":"−"}${nf1.format(Math.abs(d))})`; };
  const link = svg.append("g").selectAll("path").data(g.links).join("path")
    .attr("class",d=>"link"+(d.source.t==="transfer"?" transfer":""))
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", d=> d.source.id==="center" ? col(typ(d.source)) : col(typ(d.source)))
    .attr("stroke-width", d=>Math.max(1,d.width))
    .on("mouseenter",(ev,d)=>{ link.classed("dim",l=>l!==d).classed("hi",l=>l===d);
      const n = d.source.id==="center" ? d.target : d.source;
      showTip(`<b>${esc(n.l)}</b><br>${md(n.value)}${n.b!==undefined && Math.abs(n.value-n.b)>=0.05 ? `<br>2025 : ${md(n.b)} · écart ${sgn(n.value-n.b)}`:""}${n.fixed>=0.05?`<br><span style="opacity:.75">dont ${md(n.fixed)} de cotisations retraite (fixes)</span>`:""}<br><span style="opacity:.75">${nf0.format(n.value/(tot+Math.max(0,-def))*100)} % du total</span>`, ev); })
    .on("mousemove",moveTip).on("mouseleave",()=>{ link.classed("dim",false).classed("hi",false); hideTip(); });
  const node = svg.append("g").selectAll("g").data(g.nodes).join("g");
  node.append("rect").attr("x",d=>d.x0).attr("y",d=>d.y0).attr("width",d=>d.x1-d.x0).attr("height",d=>Math.max(1,d.y1-d.y0)).attr("fill",d=>col(typ(d)));
  node.each(function(d){
    const sel = d3.select(this), h = d.y1-d.y0, cy = (d.y0+d.y1)/2;
    if(d.id==="center"){
      sel.append("text").attr("x",d.x1+6).attr("y",d.y0-14).style("font-weight",650).style("fill",col("etat")).text(d.l);
      sel.append("text").attr("class","lab-v").attr("x",d.x1+6).attr("y",d.y0-1).text(md(d.value));
      return;
    }
    const isL = d.depth===0, x = isL ? d.x0-8 : d.x1+8, anchor = isL ? "end" : "start";
    const delta = d.b!==undefined ? fmtD(d.value, d.b) : "", dcol = (d.value-d.b)>0 ? cssv("--deficit") : cssv("--rec");
    const addV = t => { t.append("tspan").attr("class","lab-v").text(md(d.value)); if(delta) t.append("tspan").style("fill",dcol).style("font-weight",600).style("font-size","11.5px").text(delta); };
    const lab = d.l.length>48 ? d.l.slice(0,46).replace(/[\s,]+\S*$/,"")+"…" : d.l;
    sel.append("title").text(d.l);
    if(h >= 20){
      sel.append("text").attr("x",x).attr("y",cy-2).attr("text-anchor",anchor).text(lab);
      addV(sel.append("text").attr("x",x).attr("y",cy+12).attr("text-anchor",anchor));
    } else {
      const t = sel.append("text").attr("x",x).attr("y",cy+4).attr("text-anchor",anchor).text(lab+"  "); addV(t);
    }
  });
}
let skRt; addEventListener("resize",()=>{ clearTimeout(skRt); skRt=setTimeout(scheduleSankey,150); });

load();
window.renderAjust = render;
window.__ajust = { SCOPES, total:()=>total() }; // pour les vérifications
})();
