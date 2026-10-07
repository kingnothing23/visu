"""Contributions employeur au CAS Pensions par programme, exécution 2025.
Source : rapports annuels de performances (RAP) 2025, annexes au projet de loi relatif aux résultats de la gestion 2025,
lignes « Total titre 2 (y.c. CAS Pensions) » et « Total titre 2 (hors CAS Pensions) » de chaque programme
(budget.gouv.fr pour Défense et Écologie ; assemblee-nationale.fr pour les autres missions).
Contrôle : total = 49 219 M€, cohérent avec les 49,2 Md€ du rapport de l'Assemblée nationale ;
total titre 2 = 156,2 Md€ = 107,0 (hors CAS) + 49,2 (CAS).
"""
# (T2 y.c. CAS, T2 hors CAS) exécution 2025, €  — RAP 2025
P = {
 "140":(27277406728,17623638732),"141":(38601565523,26089075028),"230":(5419402059,4782598254),"139":(7921531370,7870951070),
 "214":(2145427174,1581981870),"143":(1116701955,873145896),"150":(431153892,305575327),"142":(261683243,181105402),
 "212":(23500588200,14180723249),"158":(1539482,1280156),
 "156":(6811899682,4683252850),"218":(530471930,385752439),"302":(1343619307,927362425),
 "134":(414438833,311770636),"220":(393774464,285994601),"305":(143267731,121963141),
 "155":(1045474526,779321426),"217":(2872051192,1968207610),"235":(214212674,201220216),
 "176":(11703853758,7813726703),"152":(9163163645,5106699454),"161":(230745539,165714967),
 "354":(2052636587,1491821088),"232":(6707666,6313191),"216":(860591150,611276603),
 "112":(4738750,4130191),"147":(1203513,1203513),
 "166":(3049065712,2209671651),"107":(3285864956,2186909001),"182":(681021358,495256173),"310":(245166598,201909590),"335":(3431567,2818025),
 "206":(376094953,283077076),"215":(554593885,413136331),"105":(1323874519,1137797181),
 "129":(291408333,258083376),"308":(65243200,60347127),"224":(746807315,546596807),"138":(201327806,140011603),
 "165":(439901876,327367405),"126":(27682797,24694332),"164":(230911552,174671604),
 "219":(129856494,92232574),"163":(6138120,6138120),"148":(154997,154997),"368":(50972938,43971884),
}
MIN = {
 "Éducation nationale":["140","141","230","139","214"],
 "Enseignement supérieur et Recherche":["150"],
 "Armées":["212"],
 "Économie et Finances (Bercy)":["156","218","302","134","220","305"],
 "Travail, Santé, Solidarités et Familles":["155"],
 "Transition écologique, Énergie, Transports":["217","235"],
 "Intérieur":["176","152","161","354","232","216"],
 "Aménagement du territoire, Décentralisation, Logement":["112","147"],
 "Justice":["166","107","182","310","335"],
 "Agriculture":["206","215","143","142"],
 "Europe et Affaires étrangères":["105"],
 "Services du Premier ministre":["129","308","158"],
 "Culture":["224"], "Outre-mer":["138"],
 "Pouvoirs publics et juridictions":["165","126","164"],
 "Sports, Jeunesse et Vie associative":["219","163"],
 "Action publique, Fonction publique":["148","368"],
}
used=set(); out={}
for m,ps in MIN.items():
    out[m]=round(sum(P[p][0]-P[p][1] for p in ps)/1e6); used|=set(ps)
assert used==set(P), set(P)-used
PAR_MINISTERE = out
