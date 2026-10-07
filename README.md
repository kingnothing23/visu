# visu — l'argent public en France

Visualisation des recettes et dépenses de l'État élargi (État, agences, Sécurité sociale, Bpifrance, CDC) et des collectivités locales (comptes nationaux, Eurostat/Insee).

## Ouvrir
Double-cliquer sur `index.html` (fonctionne hors ligne, aucune installation).

## Structure
- `index.html` — la page (Sankey des flux + dépenses par fonction)
- `data/data.js` — données prêtes à l'emploi (générées)
- `data/raw/main_values.py` — valeurs Eurostat brutes figées (2024-2025 ; État, Sécu, collectivités)
- `data/raw/niches_financements.py` — niches fiscales, allègements, Bpifrance, CDC (saisis à la main, sources en tête de fichier)
- `scripts/build_data.py` — calcule les flux et régénère `data/data.js`
- `lib/` — D3 et d3-sankey (copies locales)

## Mettre à jour les données
    python scripts/build_data.py --fetch --years 2022 2023 2024 2025
(télécharge depuis l'API Eurostat ; sans `--fetch`, utilise les valeurs figées)

## Mettre en ligne
Le dossier est un site statique : il suffit de le déposer tel quel sur GitHub Pages, Netlify, etc.

Après avoir modifié `niches_financements.py`, relancer `python scripts/build_data.py`.
