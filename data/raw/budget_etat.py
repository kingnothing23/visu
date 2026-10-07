"""Budget de l'État (comptabilité budgétaire), en M€.
Source : DGFiP, Situation mensuelle de l'État — décembre 2025 définitive (CP consommés nets, budget général).
Contrôles : somme des missions = total des dépenses brutes du budget général (578 039 M€ en 2025, 587 341 M€ en 2024).
Les montants des missions incluent les dépenses de personnel (titre 2), donc les contributions employeur au CAS Pensions.
"""
MISSIONS = {  # mission: (2025, 2024)
  "Enseignement scolaire": (87746, 86400),
  "Défense": (62124, 58445),
  "Engagements financiers de l'État": (53180, 58765),
  "Solidarité, insertion et égalité des chances": (30857, 29726),
  "Recherche et enseignement supérieur": (30587, 30778),
  "Écologie, développement et mobilité durables": (26111, 22054),
  "Sécurités": (25789, 25505),
  "Cohésion des territoires": (23706, 22862),
  "Travail, emploi et administration des ministères sociaux": (20452, 22230),
  "Justice": (12380, 11876),
  "Gestion des finances publiques": (10695, 10609),
  "Régimes sociaux et de retraite": (6071, 6135),
  "Administration générale et territoriale de l'État": (4778, 4644),
  "Aide publique au développement": (4203, 5388),
  "Agriculture, alimentation, forêt et affaires rurales": (4051, 4497),
  "Relations avec les collectivités territoriales": (3930, 3895),
  "Culture": (3868, 3864),
  "Économie": (3784, 5104),
  "Action extérieure de l'État": (3378, 3457),
  "Investir pour la France de 2030": (3302, 6271),
  "Outre-mer": (3041, 2917),
  "Immigration, asile et intégration": (2058, 2185),
  "Anciens combattants, mémoire et liens avec la Nation": (1850, 1959),
  "Santé": (1538, 2803),
  "Plan de relance": (1486, 2236),
  "Sport, jeunesse et vie associative": (1351, 1548),
  "Pouvoirs publics": (1138, 1157),
  "Direction de l'action du gouvernement": (1071, 1044),
  "Conseil et contrôle de l'État": (864, 860),
  "Médias, livre et industries culturelles": (693, 712),
  "Transformation et fonction publiques": (593, 893),
  "Remboursements et dégrèvements": (141364, 146523),
}
TOTAL_BRUT = {2025: 578039, 2024: 587341}
TOTAL_NET = {2025: 441194, 2024: 445773}
# Prélèvements sur recettes (hors budget général)
PSR = {2025: {"coll": 46074, "ue": 22962}, 2024: {"coll": 45484, "ue": 22276}}
TVA_ETAT_NETTE = {2025: 98067, 2024: 98986}
SOLDE_BUDGETAIRE = {2025: -124206, 2024: -154576}
CHARGE_DETTE = {2025: 51600}
# DGFiP, statistiques TVA 2025 provisoires : TVA « économique » 212 Md€, +1,3 %
TVA_DGFIP = {2025: 212000, 2024: round(212000 / 1.013)}

# ---------------------------------------------------------------------------
# Corrections (Cour des comptes, « Le budget de l'État en 2025 », tableaux 3 et 5 — exécution réelle 2024,
# alors que la colonne 2024 de la SME est « retraitée » au périmètre 2025).
TVA_ETAT_NETTE = {2025: 98067, 2024: 96800}
SOLDE_BUDGETAIRE = {2025: -124206, 2024: -155930}

# Équilibre du budget général 2025 (M€) — Cour des comptes, tableau 3 ; SME déc. 2025 pour le détail des impôts
EQUILIBRE = {2025: {
    "recettes_fiscales_nettes": 356398,
    "tva": 98067, "ir": 94944, "is": 59918, "ticpe": 16277,   # « autres » = total − ces quatre impôts (87,2 Md€)
    "recettes_non_fiscales": 23992,
    "fonds_de_concours": 7353,
    "psr_ue": 22962, "psr_coll": 46074,
    "depenses_nettes": 441194, "depenses_brutes": 578039,
    "rd_etat": 136844, "rd_locaux": 4520,                   # programmes 200 et 201
    "solde_bg": -122488,
}}

# Ventilation par ministère (gouvernement en place la plus grande partie de 2025), au niveau programme
# quand une mission relève de plusieurs ministères. CP consommés 2025, M€ (SME décembre 2025).
MINISTERES = {2025: [
  # En 2025, un seul ministère (É. Borne) couvrait l'Éducation nationale et l'Enseignement supérieur-Recherche :
  # on les présente séparément pour la lisibilité.
  ("Éducation nationale", [
      ("Enseignement scolaire public du premier degré (prog. 140)", 27359),
      ("Enseignement scolaire public du second degré (prog. 141)", 38974),
      ("Enseignement privé sous contrat (prog. 139)", 8812),
      ("Vie de l'élève (prog. 230)", 7949),
      ("Soutien de la politique de l'éducation nationale (prog. 214)", 2964)]),
  ("Enseignement supérieur et Recherche", [
      ("Formations supérieures et recherche universitaire (prog. 150)", 15314),
      ("Recherches scientifiques et technologiques pluridisciplinaires (prog. 172)", 7902),
      ("Vie étudiante (prog. 231)", 3206), ("Recherche spatiale (prog. 193)", 1636)]),
  ("Armées", [("Défense", 62124), ("Anciens combattants, mémoire (prog. 169)", 1780), ("Recherche duale (prog. 191)", 133)]),
  ("Économie et Finances (Bercy)", [
      ("Engagements financiers de l'État (charge de la dette…)", 53180),
      ("Gestion des finances publiques (DGFiP, douanes)", 10695),
      ("Économie", 3784), ("Plan de relance", 1486),
      ("Aide économique et financière au développement (prog. 110, 365)", 1599),
      ("Régimes de retraite des mines, SEITA et divers (prog. 195)", 1091),
      ("Recherche économique et industrielle (prog. 192)", 368)]),
  ("Travail, Santé, Solidarités et Familles", [
      ("Solidarité, insertion et égalité des chances", 30857), ("Travail, emploi", 20452), ("Santé", 1538)]),
  ("Transition écologique, Énergie, Transports", [
      ("Écologie, développement et mobilité durables", 26111),
      ("Régimes de retraite transports terrestres et marins (prog. 198, 197)", 4979),
      ("Recherche énergie et mobilité durables (prog. 190)", 1614)]),
  ("Intérieur", [("Sécurités (police, gendarmerie, sécurité civile)", 25789),
      ("Administration générale et territoriale (préfectures)", 4778), ("Immigration, asile et intégration", 2058)]),
  ("Aménagement du territoire, Décentralisation, Logement", [
      ("Cohésion des territoires (APL, hébergement…)", 23706), ("Relations avec les collectivités territoriales", 3930)]),
  ("Justice", [("Justice", 12380)]),
  ("Agriculture", [("Agriculture, alimentation, forêt", 4051), ("Enseignement technique agricole (prog. 143)", 1688),
      ("Recherche agricole (prog. 142)", 414)]),
  ("Europe et Affaires étrangères", [("Action extérieure de l'État", 3378),
      ("Solidarité avec les pays en développement (prog. 209)", 1866), ("Fonds de solidarité pour le développement (prog. 384)", 738)]),
  ("Services du Premier ministre", [("Investir pour la France de 2030 (SGPI)", 3302),
      ("Direction de l'action du gouvernement", 1071), ("Indemnisation des victimes des persécutions (prog. 158)", 70)]),
  ("Culture", [("Culture", 3868), ("Médias, livre et industries culturelles", 693)]),
  ("Outre-mer", [("Outre-mer", 3041)]),
  ("Pouvoirs publics et juridictions", [("Pouvoirs publics (Présidence, Parlement…)", 1138),
      ("Conseil et contrôle de l'État (Conseil d'État, Cour des comptes, CESE)", 864)]),
  ("Sports, Jeunesse et Vie associative", [("Sport, jeunesse et vie associative", 1351)]),
  ("Action publique, Fonction publique", [("Transformation et fonction publiques", 593)]),
]}

# Retraites des fonctionnaires de l'État : compte d'affectation spéciale « Pensions » (M€)
# Source : retraitesdeletat.gouv.fr (exécution) ; contributions des ministères : rapport AN sur le PLRG 2025 (49,2 Md€).
CAS_PENSIONS = {2025: {
    "recettes": 67340, "depenses": 69337,
    "contrib_ministeres": 49200, "contrib_employeurs_total": 55084, "cotis_agents": 7530,
    "compensations": 1302, "subventions": 3170,
    "pensions_civiles": 54609, "pensions_militaires": 11223, "victimes_guerre": 3358, "ati": 141,
}}

# Cotisations retraite (CAS Pensions) comprises dans un ministère, quand un chiffre officiel existe (M€).
# Éducation nationale : mission Enseignement scolaire 87 746 M€, dont « 64 milliards d'euros hors pensions »
# (Assemblée nationale, rapport sur le PLRG 2025) → ≈ 23,7 Md€ ; ordre de grandeur confirmé par la question
# au Gouvernement n° 898 (« 87 milliards… dont 24 milliards pour les retraites »). Chiffre de la mission entière,
# enseignement technique agricole compris.
PENSIONS_MINISTERE = {2025: {"Éducation nationale": 87746 - 64000}}
# Partage des contributions de l'État employeur entre cotisation « normale » et cotisation d'équilibre,
# selon la réponse de la ministre des Comptes publics (QAG n° 898) : ≈ 11 Md€ normale / ≈ 41 Md€ d'équilibre sur ≈ 52 Md€.
PART_COTISATION_NORMALE = 11 / 52

# ===========================================================================
# 2026 : budget VOTÉ (loi de finances initiale n° 2026-103 du 19 février 2026) — prévision, pas exécution.
# Source : direction du Budget, « Le budget de l'État voté pour 2026 en quelques chiffres » (art. 147 à 153 LFI 2026).
STATUT = {2024: "exécution", 2025: "exécution", 2026: "LFI"}
EQUILIBRE[2026] = {
    "recettes_fiscales_nettes": 363603,
    "tva": 99805, "ir": 99836, "is": 61629, "ticpe": 25290,   # 2026 : « accises sur les énergies (montant brut) »
    "recettes_non_fiscales": 28900,
    "fonds_de_concours": 6143, "fdc_depenses": 6143,          # en LFI, dépenses sur fonds de concours présentées à part
    "psr_ue": 28440, "psr_coll": 44824,
    "depenses_nettes": 452716, "depenses_brutes": 593890,
    "rd_etat": 593890 - 452716, "rd_locaux": 145600 - (593890 - 452716),
    "solde_bg": -133477,
}
SOLDE_BUDGETAIRE[2026] = -134627
MISSIONS_2026 = {  # CP ouverts, M€
  "Action extérieure de l'État": 3454, "Administration générale et territoriale de l'État": 5082,
  "Agriculture, alimentation, forêt et affaires rurales": 4126, "Aide publique au développement": 3569,
  "Cohésion des territoires": 22571, "Conseil et contrôle de l'État": 866, "Crédits non répartis": 475, "Culture": 3745,
  "Défense": 66475, "Direction de l'action du Gouvernement": 1052, "Écologie, développement et mobilité durables": 22763,
  "Économie": 3513, "Engagements financiers de l'État": 60341, "Enseignement scolaire": 89621,
  "Gestion des finances publiques": 11018, "Immigration, asile et intégration": 2131, "Investir pour la France de 2030": 4398,
  "Justice": 12967, "Médias, livre et industries culturelles": 703, "Monde combattant, mémoire et liens avec la nation": 1730,
  "Outre-mer": 3277, "Pouvoirs publics": 1140, "Recherche et enseignement supérieur": 31634,
  "Régimes sociaux et de retraite": 6068, "Relations avec les collectivités territoriales": 3959,
  "Remboursements et dégrèvements": 145600, "Santé": 1888, "Sécurités": 25845,
  "Solidarité, insertion et égalité des chances": 31282, "Sport, jeunesse et vie associative": 1259,
  "Transformation et fonction publiques": 518, "Travail, emploi et administration des ministères sociaux": 20821,
}
assert sum(MISSIONS_2026.values()) == 593890 + 1 or abs(sum(MISSIONS_2026.values()) - 593890) <= 3

# Missions partagées entre ministères : le document ne donne que les missions ; on applique la répartition
# par programme constatée en 2025 (exécution) — approximation signalée sur la page.
_M = MISSIONS_2026
def _part(mission, num, den):
    return round(_M[mission] * num / den)
_res = lambda num: _part("Recherche et enseignement supérieur", num, 30587)
_sco_agri = _part("Enseignement scolaire", 1688, 87746)
_apd_eco = _part("Aide publique au développement", 1599, 4203)
_reg_mines = _part("Régimes sociaux et de retraite", 1091, 6070)
_coh_atd = _part("Cohésion des territoires", 518, 23706)
_mc_158 = _part("Monde combattant, mémoire et liens avec la nation", 70, 1850)
# Ministères du gouvernement en place en 2026 (liste des plafonds d'emplois de la LFI 2026).
MINISTERES[2026] = [
  ("Éducation nationale", [("Enseignement scolaire (hors enseignement agricole)", _M["Enseignement scolaire"] - _sco_agri)]),
  ("Enseignement supérieur, Recherche et Espace", [("Recherche et enseignement supérieur (hors recherche duale, énergie, industrie, agricole)",
      _res(15314 + 3206 + 7902 + 1636))]),
  ("Armées et Anciens combattants", [("Défense", _M["Défense"]),
      ("Monde combattant, mémoire (hors indemnisation des victimes)", _M["Monde combattant, mémoire et liens avec la nation"] - _mc_158),
      ("Recherche duale", _res(133))]),
  ("Économie, Finances, Souveraineté (Bercy)", [
      ("Engagements financiers de l'État (charge de la dette…)", _M["Engagements financiers de l'État"]), ("Économie", _M["Économie"]),
      ("Aide économique et financière au développement", _apd_eco), ("Régimes de retraite des mines, SEITA et divers", _reg_mines),
      ("Recherche économique et industrielle", _res(368))]),
  ("Action et Comptes publics", [("Gestion des finances publiques (DGFiP, douanes)", _M["Gestion des finances publiques"]),
      ("Transformation et fonction publiques", _M["Transformation et fonction publiques"])]),
  ("Travail, Solidarités et Santé (ministères sociaux)", [
      ("Solidarité, insertion et égalité des chances", _M["Solidarité, insertion et égalité des chances"]),
      ("Travail, emploi", _M["Travail, emploi et administration des ministères sociaux"]), ("Santé", _M["Santé"])]),
  ("Transition écologique, Transports", [("Écologie, développement et mobilité durables", _M["Écologie, développement et mobilité durables"]),
      ("Régimes de retraite transports terrestres et marins", _M["Régimes sociaux et de retraite"] - _reg_mines),
      ("Recherche énergie et mobilité durables", _res(1614))]),
  ("Intérieur", [("Sécurités", _M["Sécurités"]), ("Administration générale et territoriale", _M["Administration générale et territoriale de l'État"]),
      ("Immigration, asile et intégration", _M["Immigration, asile et intégration"])]),
  ("Ville et Logement", [("Cohésion des territoires : logement, hébergement, ville", _M["Cohésion des territoires"] - _coh_atd)]),
  ("Aménagement du territoire et Décentralisation", [("Relations avec les collectivités territoriales", _M["Relations avec les collectivités territoriales"]),
      ("Cohésion des territoires : aménagement du territoire", _coh_atd)]),
  ("Justice", [("Justice", _M["Justice"])]),
  ("Agriculture et Souveraineté alimentaire", [("Agriculture, alimentation, forêt", _M["Agriculture, alimentation, forêt et affaires rurales"]),
      ("Enseignement technique agricole", _sco_agri), ("Recherche agricole", _res(414))]),
  ("Europe et Affaires étrangères", [("Action extérieure de l'État", _M["Action extérieure de l'État"]),
      ("Aide publique au développement (part Affaires étrangères)", _M["Aide publique au développement"] - _apd_eco)]),
  ("Services du Premier ministre", [("Investir pour la France de 2030", _M["Investir pour la France de 2030"]),
      ("Direction de l'action du Gouvernement", _M["Direction de l'action du Gouvernement"]), ("Indemnisation des victimes des persécutions", _mc_158)]),
  ("Culture", [("Culture", _M["Culture"]), ("Médias, livre et industries culturelles", _M["Médias, livre et industries culturelles"])]),
  ("Outre-mer", [("Outre-mer", _M["Outre-mer"])]),
  ("Pouvoirs publics et juridictions", [("Pouvoirs publics", _M["Pouvoirs publics"]), ("Conseil et contrôle de l'État", _M["Conseil et contrôle de l'État"])]),
  ("Sports, Jeunesse et Vie associative", [("Sport, jeunesse et vie associative", _M["Sport, jeunesse et vie associative"])]),
  ("Crédits non répartis (réserve)", [("Crédits non répartis", _M["Crédits non répartis"])]),
]
_mins = sum(v for _, p in MINISTERES[2026] for _, v in p)
assert abs(_mins - (593890 - 145600)) <= 5, _mins
# CAS Pensions 2026 : seuls les crédits votés (69 930 M€) ; contributions des ministères ≈ 51,8 Md€ (rapport général AN PLF 2026).
CAS_PENSIONS[2026] = {"depenses": 69930, "contrib_ministeres": 51800, "simplifie": True}

# Cotisations retraite par ministère, exécution 2025 (M€), calculées programme par programme à partir des RAP 2025
from cas_pensions_rap2025 import PAR_MINISTERE as _CAS_MIN
PENSIONS_MINISTERE[2025] = dict(_CAS_MIN)

# ===========================================================================
# 2024 : exécution réelle (format 2024) — Cour des comptes, « Le budget de l'État en 2025 », tableaux 3 et 5,
# et SME décembre 2025, colonne « exécution 2024 » (CP consommés, format 2024). Regroupement par ministère identique
# à 2025 pour permettre la comparaison.
EQUILIBRE[2024] = {
    "recettes_fiscales_nettes": 325679,
    "tva": 96800, "ir": 88000, "is": 57400, "ticpe": 16000,   # Md€ arrondis à 0,1 (Cour des comptes) ; « autres » = solde
    "recettes_non_fiscales": 23212, "fonds_de_concours": 8309,
    "psr_ue": 22276, "psr_coll": 45457,
    "depenses_nettes": 443413, "depenses_brutes": 584982,
    "rd_etat": 141568, "rd_locaux": 4955,
    "solde_bg": -153946,
}
MINISTERES[2024] = [
  ("Éducation nationale", [("Enseignement scolaire public du premier degré (prog. 140)", 26686), ("Enseignement scolaire public du second degré (prog. 141)", 38247),
      ("Enseignement privé sous contrat (prog. 139)", 8939), ("Vie de l'élève (prog. 230)", 7934), ("Soutien de la politique de l'éducation nationale (prog. 214)", 2910)]),
  ("Enseignement supérieur et Recherche", [("Formations supérieures et recherche universitaire (prog. 150)", 15108),
      ("Recherches scientifiques et technologiques pluridisciplinaires (prog. 172)", 7737), ("Vie étudiante (prog. 231)", 3254), ("Recherche spatiale (prog. 193)", 1607)]),
  ("Armées", [("Défense", 58428), ("Anciens combattants, mémoire (prog. 169)", 1882), ("Recherche duale (prog. 191)", 150)]),
  ("Économie et Finances (Bercy)", [("Engagements financiers de l'État (charge de la dette…)", 58765), ("Gestion des finances publiques (DGFiP, douanes)", 10595),
      ("Économie", 5104), ("Plan de relance", 2236), ("Aide économique et financière au développement (prog. 110, 365)", 2025),
      ("Régimes de retraite des mines, SEITA et divers (prog. 195)", 1083), ("Recherche économique et industrielle (prog. 192)", 670)]),
  ("Travail, Santé, Solidarités et Familles", [("Solidarité, insertion et égalité des chances", 31031), ("Travail, emploi", 21432), ("Santé", 2803)]),
  ("Transition écologique, Énergie, Transports", [("Écologie, développement et mobilité durables", 24232),
      ("Régimes de retraite transports terrestres et marins (prog. 198, 197)", 4980), ("Recherche énergie et mobilité durables (prog. 190)", 2039)]),
  ("Intérieur", [("Sécurités (police, gendarmerie, sécurité civile)", 25486), ("Administration générale et territoriale (préfectures)", 4662), ("Immigration, asile et intégration", 2191)]),
  ("Aménagement du territoire, Décentralisation, Logement", [("Cohésion des territoires (APL, hébergement…)", 18497), ("Relations avec les collectivités territoriales", 3895)]),
  ("Justice", [("Justice", 11827)]),
  ("Agriculture", [("Agriculture, alimentation, forêt", 4498), ("Enseignement technique agricole (prog. 143)", 1682), ("Recherche agricole (prog. 142)", 421)]),
  ("Europe et Affaires étrangères", [("Action extérieure de l'État", 3289), ("Solidarité avec les pays en développement (prog. 209)", 2797)]),
  ("Services du Premier ministre", [("Investir pour la France de 2030 (SGPI)", 6271), ("Direction de l'action du gouvernement", 1017), ("Indemnisation des victimes des persécutions (prog. 158)", 77)]),
  ("Culture", [("Culture", 3865), ("Médias, livre et industries culturelles", 712)]),
  ("Outre-mer", [("Outre-mer", 2917)]),
  ("Pouvoirs publics et juridictions", [("Pouvoirs publics (Présidence, Parlement…)", 1157), ("Conseil et contrôle de l'État (Conseil d'État, Cour des comptes, CESE)", 861)]),
  ("Sports, Jeunesse et Vie associative", [("Sport, jeunesse et vie associative", 1548)]),
  ("Action publique, Fonction publique", [("Transformation et fonction publiques", 914)]),
]
_m24 = sum(v for _, p in MINISTERES[2024] for _, v in p)
assert abs(_m24 - (584982 - 146523)) <= 3, _m24
from cas_pensions_rap2024 import PAR_MINISTERE as _CAS24
PENSIONS_MINISTERE[2024] = dict(_CAS24)
CAS_PENSIONS[2024] = {"recettes": 64689, "depenses": 67885, "contrib_ministeres": round(sum(_CAS24.values())),
    "contrib_employeurs_total": 52618, "cotis_agents": 7504, "compensations": 1063, "subventions": 3038,
    "pensions_civiles": 53229, "pensions_militaires": 11080, "victimes_guerre": 3351, "ati": 142}
STATUT[2024] = "exécution"

# 2026 : cotisations retraite par ministère, crédits votés (PAP 2027, colonne LFI 2026)
from cas_pensions_lfi2026 import PAR_MINISTERE as _CAS26
PENSIONS_MINISTERE[2026] = dict(_CAS26)
CAS_PENSIONS[2026]["contrib_ministeres"] = round(sum(_CAS26.values()))
