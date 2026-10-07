"""Contributions employeur au CAS Pensions par programme, LFI 2026 (crédits votés).
Source : projets annuels de performances (PAP) 2027, colonne « LFI 2026 » des lignes « Total en titre 2 » et
« Total en titre 2 hors CAS Pensions » de chaque programme (budget.gouv.fr, PLF 2027).
Contrôle : total ≈ 52,4 Md€, total 51,8 Md€, identique au chiffre du rapport général de l'Assemblée nationale sur le PLF 2026.
Programmes sans titre 2 publié ou sans CAS (163, 368, 349, 551) : non repris (montants négligeables).
"""
# (titre 2 y.c. CAS, titre 2 hors CAS), €
P26 = {"105": [1385974708, 1181598669], "107": [3577268990, 2331719080], "112": [8107239, 6000000], "126": [27791045, 24650495], "129": [316889793, 277947001], "134": [431192560, 319122687], "138": [213051761, 149665335], "139": [7974120679, 7901521123], "140": [27854974129, 17643473505], "141": [39646484228, 26309533786], "142": [269023864, 182186230], "143": [1149864516, 898463469], "147": [19143320, 13804992], "148": [290000, 290000], "150": [450978971, 313597387], "152": [9137624242, 5096468803], "155": [1077279008, 789591295], "156": [6964133632, 4732746014], "158": [1508987, 1237949], "161": [250131179, 175230639], "164": [242247396, 181242664], "165": [462581368, 341234245], "166": [3237994681, 2307577064], "176": [12066407605, 7928669172], "182": [709749261, 510292281], "206": [369807303, 281128453], "212": [23831227901, 14255010154], "214": [2199743616, 1596220329], "215": [566607893, 417306852], "216": [898254925, 630102081], "217": [2916787954, 1977745732], "218": [540525394, 392008575], "219": [134338185, 93126673], "220": [411473058, 295195393], "224": [763632585, 558528232], "230": [5631528394, 4948032387], "232": [15222943, 14670343], "235": [228831827, 215957794], "302": [1387045629, 946409029], "305": [149139453, 127992313], "308": [69996998, 64603479], "310": [260250459, 210906929], "335": [3978491, 3227297], "354": [2149963134, 1548836600]}
MIN26 = {
 "Éducation nationale": ["140","141","230","139","214"],
 "Enseignement supérieur, Recherche et Espace": ["150"],
 "Armées et Anciens combattants": ["212"],
 "Économie, Finances, Souveraineté (Bercy)": ["134","220","305"],
 "Action et Comptes publics": ["156","218","302","148"],
 "Travail, Solidarités et Santé (ministères sociaux)": ["155"],
 "Transition écologique, Transports": ["217","235"],
 "Intérieur": ["176","152","161","354","232","216"],
 "Ville et Logement": ["147"],
 "Aménagement du territoire et Décentralisation": ["112"],
 "Justice": ["166","107","182","310","335"],
 "Agriculture et Souveraineté alimentaire": ["206","215","143","142"],
 "Europe et Affaires étrangères": ["105"],
 "Services du Premier ministre": ["129","308","158"],
 "Culture": ["224"], "Outre-mer": ["138"],
 "Pouvoirs publics et juridictions": ["165","126","164"],
 "Sports, Jeunesse et Vie associative": ["219"],
}
_used = {p for ps in MIN26.values() for p in ps}
assert _used == set(P26), set(P26) ^ _used
PAR_MINISTERE = {m: round(sum(P26[p][0] - P26[p][1] for p in ps) / 1e6) for m, ps in MIN26.items()}
