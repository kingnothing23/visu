# Taxe sur les logements sous-occupés — calcul (octobre 2026)

Sources : Insee base-cc-logement-2022 (C22_RP_SOUSOCC_TACC = 3 pièces ou plus en trop, C22_RP_SOUSOCC_ACC = 2 pièces en trop),
zonage TLV après décret du 22/12/2025 (data.gouv.fr), Statistiques DVF « whole period » (prix médians au m² par commune, repli sur le département).

Hypothèses : part maisons/appartements dans la sous-occupation au prorata 41 % × RP maisons / 4 % × RP appartements (taux nationaux Insee) ;
part des propriétaires au prorata 39 % × RP propriétaires / 7 % × RP locataires ; surfaces 130 m² (maison) / 90 m² (appartement), 120/80 m² pour 2 pièces en trop.

| Zone | Communes | Rés. principales | 3+ pièces en trop | dont propriétaires | Valeur (propriétaires) | 2 pièces en trop, propriétaires | Valeur |
|---|---|---|---|---|---|---|---|
| Zone tendue | 1 430 | 12,04 M | 1,66 M | 1,42 M | 730,3 Md€ | 1,52 M | 721,5 Md€ |
| Zone touristique et tendue | 2 259 | 1,45 M | 0,44 M | 0,40 M | 187,8 Md€ | 0,31 M | 132,2 Md€ |
| Hors zone | 31 169 | 17,40 M | 5,49 M | 5,04 M | 1 171 Md€ | 3,81 M | 823 Md€ |

Contrôle : total 3+ pièces en trop = 7,59 M (Insee Première 2064 : 7,6 M).

Mise à jour : avec prix estimés pour l'Alsace-Moselle (pas de DVF ; moyenne des communes de même zone hors IDF), valeur propriétaires zone tendue = 740,5 Md€ (3+ pièces) et 731,1 Md€ (2 pièces) ; zone touristique : 190,1 et 133,4 Md€.
Données commune par commune : data/raw/sous_occupation_communes_2022.csv (et data/sous_occupation.js pour la page).
