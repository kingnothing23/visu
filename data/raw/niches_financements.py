"""Données hors comptabilité nationale (Md€), saisies à la main. Modifiables librement.
Sources :
- Dépenses fiscales : Évaluation des voies et moyens, tome II, PLF 2026 (2024 constaté : 89,4 ; 2025 estimé : 91,8).
- Part entreprises : commission d'enquête du Sénat, rapport n°808 (2025) — 43,5 Md€ en 2023, reconduit.
- Crédits d'impôt restituables, déjà comptés en dépenses par l'Insee (retirés pour éviter le double compte) :
  CIR ≈ 8,0 ; emploi d'un salarié à domicile ≈ 7,2 ; garde d'enfants ≈ 1,8 (coûts PLF 2026).
- Allègements de cotisations patronales : Sénat, rapport n°808 — 77 Md€ en 2023, reconduit.
- Bpifrance : bilans d'activité 2024 (60 Md€) et 2025 (72 Md€).
- Caisse des Dépôts, fonds d'épargne : prêts signés 2024 (Banque des Territoires, 28,5 Md€) et 2025 (CDC, 41,7 Md€).
"""
NICHES = {
  2024: {"df_total": 89.4, "df_entreprises": 43.5, "ci_entreprises": 8.0, "ci_menages": 9.0, "allegements": 77.0},
  2025: {"df_total": 91.8, "df_entreprises": 43.5, "ci_entreprises": 8.0, "ci_menages": 9.0, "allegements": 77.0},
}
# Engagements (prêts, garanties, fonds propres) — pas des dépenses définitives
FINANCEMENTS = {
  # Bpifrance : total publié 60 Md€ (2024) et 72 Md€ (2025) ; « autres » = écart avec la somme des lignes détaillées.
  # CDC fonds d'épargne : total 28,5 Md€ (2024) et 41,7 Md€ (2025) ; « autres » = total − logement − secteur public local
  # (la « transition écologique », 15,7 Md€ en 2025, recoupe les autres catégories : non additionnée).
  2024: {"bpi_credit": 20.0, "bpi_garanties": 9.0, "bpi_innovation": 5.2, "bpi_fonds_propres": 3.5, "bpi_export": 22.0, "bpi_autres": 0.3,
         "cdc_logement": 15.0, "cdc_territoires": 7.6, "cdc_autres": 5.9},
  2025: {"bpi_credit": 21.0, "bpi_garanties": 10.0, "bpi_innovation": 3.4, "bpi_fonds_propres": 2.5, "bpi_export": 33.0, "bpi_autres": 2.1,
         "cdc_logement": 22.9, "cdc_territoires": 9.5, "cdc_autres": 9.3},
}
