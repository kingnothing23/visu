"""
Construit data/data.js à partir des comptes nationaux des administrations publiques (Eurostat)
et des données complémentaires de data/raw/niches_financements.py.

  python scripts/build_data.py            -> valeurs figées dans data/raw/
  python scripts/build_data.py --fetch    -> retélécharge les comptes depuis l'API Eurostat (internet requis)
  python scripts/build_data.py --fetch --years 2022 2023 2024 2025

Périmètre retenu :
- « État élargi » = administration centrale (État + agences, S1311) + Sécurité sociale (S1314 : Assurance
  maladie, CNAV, CNRACL, Agirc-Arrco, Unédic, hôpitaux…), consolidés entre eux,
  + Bpifrance et Caisse des Dépôts (flux de financement, présentés à part).
- « Collectivités » = administrations publiques locales (S1313).
- Option : niches fiscales et allègements de cotisations comptés comme des dépenses.
"""
import json, sys, argparse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "data" / "raw"))
from niches_financements import NICHES, FINANCEMENTS  # noqa: E402
import budget_etat as B  # noqa: E402

API = ("https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{ds}?format=JSON&lang=EN"
       "&geo=FR&unit=MIO_EUR&sector={sec}&time={year}{extra}")
POP = {2022: 68.0, 2023: 68.3, 2024: 68.4, 2025: 68.6}  # millions d'habitants (Insee, arrondi)
E_SECTORS = ("S1311", "S1314")
A = "S1313"
ALL = E_SECTORS + (A,)


def jsonstat_to_dict(js, dim):
    d = js["dimension"][dim]
    idx = d["category"]["index"] if "category" in d else d["index"]
    inv = {v: k for k, v in idx.items()}
    return {inv[int(k)]: v for k, v in js["value"].items()}


def fetch(ds, sec, year, extra=""):
    with urllib.request.urlopen(API.format(ds=ds, sec=sec, year=year, extra=extra), timeout=60) as r:
        return json.load(r)


def load(years, online):
    main, cofog = {}, {}
    if online:
        for y in years:
            for s in ALL:
                main[(s, y)] = jsonstat_to_dict(fetch("gov_10a_main", s, y), "na_item")
            for s in ("S13", A):
                try:
                    cofog[(s, y)] = jsonstat_to_dict(fetch("gov_10a_exp", s, y, "&na_item=TE"), "cofog99")
                except Exception:
                    pass  # COFOG publié avec ~1 an de retard
    else:
        from main_values import NA_ITEMS, RAW, COFOG_CODES, COFOG_RAW
        for k, vals in RAW.items():
            main[k] = {NA_ITEMS[i]: v for i, v in vals.items()}
        for k, vals in COFOG_RAW.items():
            cofog[k] = {COFOG_CODES[i]: v for i, v in vals.items()}
    return main, cofog


SECT_LABEL = {"S1311": "État et agences", "S1314": "Sécurité sociale", "S1313": "Collectivités"}
REC_IDS = {"tva", "prod", "ir", "is", "autimp", "capital", "cotis", "ventes", "patrimoine", "transf_in"}
DEP_IDS = {"remu", "fonct", "invest", "presta", "interets", "subv", "ue", "autres"}


def g(d, k):
    return float(d.get(k) or 0.0)


def recettes(d):
    return {
        "tva": g(d, "D211REC"),
        "prod": g(d, "D2REC") - g(d, "D211REC"),
        "ir": g(d, "D51A_C1REC"),          # IR + CSG/CRDS (impôts sur le revenu des ménages)
        "is": g(d, "D51B_C2REC"),
        "autimp": g(d, "D5REC") - g(d, "D51A_C1REC") - g(d, "D51B_C2REC"),
        "capital": g(d, "D91REC"),
        "cotis": g(d, "D61REC"),
        "ventes": g(d, "P11_P12_P131"),
        "patrimoine": g(d, "D4REC"),
        "transf_in": g(d, "D7REC") + g(d, "D9REC") - g(d, "D91REC") + g(d, "D39REC"),
    }


def depenses(d):
    return {
        "remu": g(d, "D1PAY"),
        "fonct": g(d, "P2"),
        "invest": g(d, "P5") + g(d, "NP"),
        "presta": g(d, "D62_D632PAY"),
        "interets": g(d, "D4PAY"),
        "subv": g(d, "D3PAY"),
        "ue": g(d, "D76PAY"),
        "autres": g(d, "D7PAY") + g(d, "D9PAY") - g(d, "D76PAY") + g(d, "D29PAY") + g(d, "D5PAY") + g(d, "D8"),
    }


def flows_for_year(M, year):
    md = lambda x: round(x / 1000, 2)
    # matrices des flux entre sous-secteurs : transferts (D7+D9) et intérêts (D4)
    T = {p: {r: g(M[p], f"D7PAY_{r}") + g(M[p], f"D9PAY_{r}") for r in ALL if r != p} for p in ALL}
    I = {p: {r: g(M[p], f"D4PAY_{r}") for r in ALL if r != p} for p in ALL}
    R, D = {}, {}
    for s in ALL:
        r, d = recettes(M[s]), depenses(M[s])
        r["transf_in"] -= sum(T[p][s] for p in ALL if p != s)
        r["patrimoine"] -= sum(I[p][s] for p in ALL if p != s)
        d["autres"] -= sum(T[s].values())
        d["interets"] -= sum(I[s].values())
        R[s], D[s] = r, d
    comb = lambda parts, secs: {k: sum(parts[s][k] for s in secs) for k in parts[secs[0]]}
    # répartition des prestations sociales par fonction (structure COFOG 2024 de chaque sous-secteur)
    from main_values import PRESTA_COFOG
    CATS = {"p_retraites": ("GF1002", "GF1003"), "p_sante": ("GF07",), "p_invalidite": ("GF1001",), "p_famille": ("GF1004",),
            "p_chomage": ("GF1005",), "p_logement": ("GF1006",), "p_exclusion": ("GF1007",)}
    def presta_detail(secs):
        out = {}
        for s in secs:
            P = PRESTA_COFOG[(s, 2024)]
            shares = {c: sum(P.get(k, 0) for k in ks) / P["TOTAL"] for c, ks in CATS.items()}
            shares["p_autres"] = 1 - sum(shares.values())
            for c, sh in shares.items():
                out[c] = out.get(c, 0) + sh * D[s]["presta"]
        return {c: md(v) for c, v in out.items() if v > 50}

    MODES = {"3": [("c_etat", ["S1311"]), ("c_secu", ["S1314"]), ("coll", [A])],
             "2": [("etat", list(E_SECTORS)), ("coll", [A])],
             "1": [("apu", list(ALL))]}
    NICHE_TARGET = {"3": ("c_etat", "c_secu"), "2": ("etat", "etat"), "1": ("apu", "apu")}
    modes = {}
    for mk, groups in MODES.items():
        links, bal = [], {}
        for gid, secs in groups:
            r, d = comb(R, secs), comb(D, secs)
            b9 = sum(g(M[s], "B9") for s in secs)
            r["deficit"] = max(0.0, -b9); d["excedent"] = max(0.0, b9)
            for k, v in list(r.items()) + list(d.items()):
                assert v > -1, ("flux négatif", mk, gid, k, v)
            links += [{"source": k, "target": gid, "value": md(v)} for k, v in r.items() if v > 50]
            for k, v in d.items():
                if v > 50:
                    l = {"source": gid, "target": k, "value": md(v)}
                    if k == "presta":
                        l["detail"] = presta_detail(secs)
                    links.append(l)
            bal[gid] = [sum(r.values()), sum(d.values())]
        for i, (ga, sa) in enumerate(groups):
            for gb, sb in groups[i + 1:]:
                ab = sum(T[p][q] + I[p][q] for p in sa for q in sb)
                ba = sum(T[q][p] + I[q][p] for p in sa for q in sb)
                net = ab - ba
                src, tgt = (ga, gb) if net >= 0 else (gb, ga)
                links.append({"source": src, "target": tgt, "value": md(abs(net)), "kind": "transfer",
                              "brut": [md(ab), md(ba)] if net >= 0 else [md(ba), md(ab)]})
                bal[src][1] += abs(net); bal[tgt][0] += abs(net)
        for gid, (i_, o_) in bal.items():
            assert abs(i_ - o_) < 1, ("bouclage", mk, gid, i_, o_)
        n = NICHES.get(year)
        if n:
            tf, ts = NICHE_TARGET[mk]
            ent = n["df_entreprises"] - n["ci_entreprises"]
            men = n["df_total"] - n["df_entreprises"] - n["ci_menages"]
            links += [
                {"source": "niche_fisc", "target": tf, "value": round(ent + men, 2), "kind": "niche"},
                {"source": tf, "target": "niche_ent", "value": round(ent, 2), "kind": "niche"},
                {"source": tf, "target": "niche_men", "value": round(men, 2), "kind": "niche"},
                {"source": "niche_soc", "target": ts, "value": n["allegements"], "kind": "niche"},
                {"source": ts, "target": "alleg", "value": n["allegements"], "kind": "niche"}]
        f = FINANCEMENTS.get(year)
        if f:
            links.append({"source": "fin_in", "target": "fin", "value": round(sum(f.values()), 2), "kind": "fin"})
            links += [{"source": "fin", "target": k, "value": v, "kind": "fin"} for k, v in f.items()]
        modes[mk] = links
    links = modes["2"]
    E_to_A = sum(T[s][A] + I[s][A] for s in E_SECTORS)
    A_to_E = sum(T[A][s] + I[A][s] for s in E_SECTORS)
    b9E = sum(g(M[s], "B9") for s in E_SECTORS)
    b9A = g(M[A], "B9")
    n = NICHES.get(year); f = FINANCEMENTS.get(year)

    # ---- contrôle « chaque euro classé une seule fois » ----
    audit = []
    for s_ in ALL:
        r0, d0 = recettes(M[s_]), depenses(M[s_])
        audit.append({"l": f"{SECT_LABEL[s_]} : recettes non classées (total − somme des catégories)", "v": md(g(M[s_], "TR") - sum(r0.values())), "ref": 0})
        audit.append({"l": f"{SECT_LABEL[s_]} : dépenses non classées (total − somme des catégories)", "v": md(g(M[s_], "TE") - sum(d0.values())), "ref": 0})
    intra = sum(T[p][q] + I[p][q] for p in ALL for q in ALL if p != q)
    rec_final = {mk: sum(l["value"] for l in L if l["source"] in REC_IDS and l.get("kind") is None) for mk, L in modes.items()}
    dep_final = {mk: sum(l["value"] for l in L if l["target"] in DEP_IDS and l.get("kind") is None) for mk, L in modes.items()}
    conso_r = md(sum(g(M[s_], "TR") for s_ in ALL) - intra)
    conso_d = md(sum(g(M[s_], "TE") for s_ in ALL) - intra)
    audit.append({"l": "Recettes des trois sous-secteurs, avant consolidation", "v": md(sum(g(M[s_], "TR") for s_ in ALL)), "ref": None})
    audit.append({"l": "− transferts et intérêts entre administrations (classés « internes », jamais en recette ni en dépense finale)", "v": md(intra), "ref": None})
    for mk, lab in (("1", "1 bloc"), ("2", "2 blocs"), ("3", "3 blocs")):
        audit.append({"l": f"Recettes finales = somme des bandes vertes du diagramme ({lab})", "v": round(rec_final[mk], 1), "ref": conso_r})
    for mk, lab in (("1", "1 bloc"), ("2", "2 blocs"), ("3", "3 blocs")):
        audit.append({"l": f"Dépenses finales = somme des bandes orange du diagramme ({lab})", "v": round(dep_final[mk], 1), "ref": conso_d})
    if n:
        audit.append({"l": "Niches ajoutées (hors comptes publics, même montant en entrée et en sortie)", "v": round(n["df_total"] - n["ci_entreprises"] - n["ci_menages"] + n["allegements"], 1), "ref": None})
    if f:
        audit.append({"l": "Bpifrance & CDC (opérations financières, bloc séparé)", "v": round(sum(f.values()), 1), "ref": None})

    TR = {s: g(M[s], "TR") for s in ALL}
    TE = {s: g(M[s], "TE") for s in ALL}
    intra_E = sum(T[p][r] + I[p][r] for p in E_SECTORS for r in E_SECTORS if p != r)
    totals = {
        "etat": {"recettes": md(TR["S1311"] + TR["S1314"] - intra_E), "depenses": md(TE["S1311"] + TE["S1314"] - intra_E),
                 "solde": md(b9E)},
        "coll": {"recettes": md(TR[A]), "depenses": md(TE[A]), "solde": md(b9A)},
        "conso": {"recettes": md(sum(TR.values()) - intra_E - E_to_A - A_to_E),
                  "depenses": md(sum(TE.values()) - intra_E - E_to_A - A_to_E), "solde": md(b9E + b9A)},
        "transfert_etat_coll_brut": md(E_to_A),
        "composition": {"etat_central": {"depenses": md(TE["S1311"]), "solde": md(g(M["S1311"], "B9"))},
                        "secu": {"depenses": md(TE["S1314"]), "solde": md(g(M["S1314"], "B9"))}},
        "subventions": md(sum(g(M[s], "D3PAY") for s in ALL)),
    }
    if n:
        totals["niches"] = {"fiscales_brut": n["df_total"], "fiscales_entreprises": n["df_entreprises"],
                            "allegements": n["allegements"],
                            "ajout": round(n["df_total"] - n["ci_entreprises"] - n["ci_menages"] + n["allegements"], 2)}
    if f:
        totals["financements"] = round(sum(f.values()), 2)
        totals["bpi"] = round(sum(v for k, v in f.items() if k.startswith("bpi")), 2)
    totals["audit"] = audit
    return {"2": links, **modes}, totals


# Détail par fonction pour la page « Ajustement » : part de chaque grande fonction dans chaque nature de dépense,
# par sous-secteur (structure COFOG 2024 croisée avec les postes de dépense, gov_10a_exp).
AJ_CATS = [
    ("defense", "Défense", ["GF0201", "GF0202", "GF0203", "GF0205"]),
    ("recherche", "Recherche", ["GF0104", "GF0105", "GF0204", "GF0305", "GF0408", "GF0505", "GF0605", "GF0705", "GF0805", "GF0907", "GF1008"]),
    ("securite", "Police, justice, prisons, pompiers", ["GF0301", "GF0302", "GF0303", "GF0304", "GF0306"]),
    ("admin", "Administration générale", ["GF0101", "GF0103", "GF0106", "GF0107", "GF0108"]),
    ("aide_dev", "Aide au développement", ["GF0102"]),
    ("emploi", "Emploi et aides économiques générales", ["GF0401"]),
    ("agri", "Agriculture, forêt, pêche", ["GF0402"]),
    ("energie", "Énergie", ["GF0403"]),
    ("industrie", "Industrie, commerce, tourisme", ["GF0404", "GF0406", "GF0407", "GF0409"]),
    ("transports", "Transports", ["GF0405"]),
    ("environnement", "Environnement (déchets, eau, nature)", ["GF0501", "GF0502", "GF0503", "GF0504", "GF0506"]),
    ("logement", "Logement, urbanisme, éclairage", ["GF0601", "GF0602", "GF0603", "GF0604", "GF0606"]),
    ("hopital", "Hôpitaux", ["GF0703"]),
    ("sante", "Santé hors hôpital", ["GF0701", "GF0702", "GF0704", "GF0706"]),
    ("culture", "Sport, culture, loisirs", ["GF0801", "GF0802", "GF0803", "GF0804", "GF0806"]),
    ("scolaire", "Écoles, collèges, lycées", ["GF0901", "GF0902", "GF0903"]),
    ("sup", "Enseignement supérieur", ["GF0904"]),
    ("ens_autres", "Cantines, transport scolaire, autres (enseignement)", ["GF0905", "GF0906", "GF0908"]),
    ("social", "Action sociale et gestion de la protection sociale", ["GF1001", "GF1002", "GF1003", "GF1004", "GF1005", "GF1006", "GF1007", "GF1009"]),
]


def ajust_detail(main):
    raw = json.loads((ROOT / "data" / "raw" / "cofog_nature_2024.json").read_text(encoding="utf-8"))
    codes = {c for _, _, cs in AJ_CATS for c in cs}
    out = {}
    for sec, blk in (("S1311", "e"), ("S1314", "s"), ("S1313", "c")):
        R = raw[sec]
        get = lambda n, c: (R.get(n) or {}).get(c, 0.0)
        natures = {"remu": lambda c: get("D1", c), "fonct": lambda c: get("P2", c), "invest": lambda c: get("P51G", c),
                   "subv": lambda c: get("D3", c)}
        # autres transferts : D7 + D9 hors transferts entre administrations (GF0108) et hors contribution à l'UE (dans GF0101)
        ue = g(main[(sec, 2024)], "D76PAY") if (sec, 2024) in main else 0.0
        natures["autres"] = lambda c: (0.0 if c == "GF0108" else get("D7", c) + get("D9", c) - (ue if c == "GF0101" else 0.0))
        out[blk] = {}
        for nat, f in natures.items():
            v = {k: max(0.0, sum(f(c) for c in cs)) for k, _, cs in AJ_CATS}
            tot = sum(v.values())
            if tot <= 0:
                continue
            out[blk][nat] = {k: round(x / tot, 5) for k, x in v.items() if x / tot >= 0.0005}
    assert all(c.startswith("GF") for c in codes)
    return {"cats": [[k, l] for k, l, _ in AJ_CATS], "parts": out,
            "source": "Eurostat gov_10a_exp 2024 (fonctions COFOG croisées avec les postes de dépense)"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fetch", action="store_true")
    ap.add_argument("--years", nargs="*", type=int, default=[2024, 2025])
    args = ap.parse_args()
    M, C = load(args.years, args.fetch)
    years = sorted({y for (_, y) in M})
    data = {"years": {}, "cofog": {}, "pop": POP,
            "source": "Eurostat, comptes des administrations publiques (gov_10a_main, gov_10a_exp), SEC 2010 ; "
                      "PLF 2026 Voies et moyens t. II ; Sénat rapport n°808 ; Bpifrance ; Caisse des Dépôts"}
    for y in years:
        if all((s, y) in M for s in ALL):
            modes, totals = flows_for_year({s: M[(s, y)] for s in ALL}, y)
            data["years"][y] = {"links": modes["2"], "modes": modes, "totals": totals}
        if ("S13", y) in C and (A, y) in C:
            S, L = C[("S13", y)], C[(A, y)]
            data["cofog"][y] = {k: [round(max(0.0, g(S, k) - g(L, k)) / 1000, 2), round(g(L, k) / 1000, 2)]
                                for k in S if k != "TOTAL"}
    # Budget de l'État par mission (comptabilité budgétaire)
    for i, y in enumerate((2025, 2024)):
        tot = sum(v[i] for v in B.MISSIONS.values())
        assert abs(tot - B.TOTAL_BRUT[y]) <= 2, ("somme missions", y, tot)
    data["budget"] = {y: {"missions": {k: round(v[i] / 1000, 2) for k, v in B.MISSIONS.items()},
                          "net": round(B.TOTAL_NET[y] / 1000, 2), "brut": round(B.TOTAL_BRUT[y] / 1000, 2),
                          "psr": {k: round(v / 1000, 2) for k, v in B.PSR[y].items()}}
                      for i, y in enumerate((2025, 2024))}
    # Vue « par ministère » (comptabilité budgétaire, budget général de l'État)
    data["budget_view"] = {}
    for y, E in B.EQUILIBRE.items():
        md = lambda x: round(x / 1000, 2)
        autres = E["recettes_fiscales_nettes"] - E["tva"] - E["ir"] - E["is"] - E["ticpe"]
        L = [{"source": k, "target": "budget", "value": md(v)} for k, v in (
            ("b_tva", E["tva"]), ("b_ir", E["ir"]), ("b_is", E["is"]), ("b_ticpe", E["ticpe"]), ("b_autres", autres),
            ("b_rnf", E["recettes_non_fiscales"]), ("b_fdc", E["fonds_de_concours"]), ("b_deficit", -E["solde_bg"]))]
        mins = []
        for i, (name, pieces) in enumerate(sorted(B.MINISTERES[y], key=lambda m: -sum(v for _, v in m[1]))):
            tot = sum(v for _, v in pieces)
            pm = B.PENSIONS_MINISTERE.get(y, {}).get(name)
            mins.append({"id": f"m{i}", "l": name, "v": md(tot), "pieces": [[l, md(v)] for l, v in pieces],
                         **({"pensions": md(pm)} if pm else {})})
            L.append({"source": "budget", "target": f"m{i}", "value": md(tot)})
        L += [{"source": "budget", "target": "b_psr_coll", "value": md(E["psr_coll"]), "kind": "transfer"},
              {"source": "budget", "target": "b_psr_ue", "value": md(E["psr_ue"])},
              {"source": "budget", "target": "b_rd_loc", "value": md(E["rd_locaux"])}]
        if E.get("fdc_depenses"):
            L.append({"source": "budget", "target": "b_fdc_dep", "value": md(E["fdc_depenses"])})
        inn = sum(l["value"] for l in L if l["target"] == "budget"); out = sum(l["value"] for l in L if l["source"] == "budget")
        assert abs(inn - out) < 0.05, ("équilibre budget", inn, out)
        assert abs(sum(m["v"] for m in mins) - md(E["depenses_brutes"] - E["rd_etat"] - E["rd_locaux"])) < 0.05
        C = B.CAS_PENSIONS[y]
        if C.get("simplifie"):
            CL = [{"source": "cas_min_norm", "target": "cas", "value": md(C["contrib_ministeres"] * B.PART_COTISATION_NORMALE), "kind": "niche"},
                  {"source": "cas_min_eq", "target": "cas", "value": md(C["contrib_ministeres"] * (1 - B.PART_COTISATION_NORMALE)), "kind": "niche"},
                  {"source": "cas_reste", "target": "cas", "value": md(C["depenses"] - C["contrib_ministeres"])},
                  {"source": "cas", "target": "cas_tot", "value": md(C["depenses"])}]
        else:
          rec_aut = C["recettes"] - C["contrib_employeurs_total"] - C["cotis_agents"] - C["compensations"] - C["subventions"]
          dep_aut = C["depenses"] - C["pensions_civiles"] - C["pensions_militaires"] - C["victimes_guerre"] - C["ati"]
          CL = [{"source": k, "target": "cas", "value": md(v), "kind": kd} for k, v, kd in (
            ("cas_min_norm", C["contrib_ministeres"] * B.PART_COTISATION_NORMALE, "niche"),
            ("cas_min_eq", C["contrib_ministeres"] * (1 - B.PART_COTISATION_NORMALE), "niche"), ("cas_emp", C["contrib_employeurs_total"] - C["contrib_ministeres"], None),
            ("cas_agents", C["cotis_agents"], None), ("cas_comp", C["compensations"] + C["subventions"], None),
            ("cas_autres", rec_aut, None), ("cas_def", C["depenses"] - C["recettes"], None))]
          CL += [{"source": "cas", "target": k, "value": md(v)} for k, v in (
            ("cas_civ", C["pensions_civiles"]), ("cas_mil", C["pensions_militaires"]), ("cas_vg", C["victimes_guerre"]), ("cas_ati", C["ati"] + dep_aut))]
        data["budget_view"][y] = {"links": L, "cas_links": CL, "ministeres": mins, "statut": B.STATUT[y],
            "fdc_depenses": md(E.get("fdc_depenses", 0)), "cas_simplifie": bool(C.get("simplifie")),
            "totals": {"recettes": md(E["recettes_fiscales_nettes"] + E["recettes_non_fiscales"] + E["fonds_de_concours"]),
                       "depenses": md(E["depenses_nettes"] + E.get("fdc_depenses", 0) + E["psr_ue"] + E["psr_coll"]), "depenses_nettes": md(E["depenses_nettes"] + E.get("fdc_depenses", 0)),
                       "solde_bg": md(E["solde_bg"]), "solde_general": md(B.SOLDE_BUDGETAIRE[y]),
                       "rd": md(E["rd_etat"] + E["rd_locaux"]), "brut": md(E["depenses_brutes"]),
                       "psr_coll": md(E["psr_coll"]), "psr_ue": md(E["psr_ue"]), "rd_locaux": md(E["rd_locaux"]),
                       "pensions": md(C["depenses"]), "contrib_ministeres": md(C["contrib_ministeres"])}}
    # Prévisions de comptabilité nationale pour les années sans comptes publiés (PLF 2027, 1er octobre 2026)
    data["ajust_detail"] = ajust_detail(M)
    PIB = json.loads((ROOT / "data" / "raw" / "cofog_nature_2024.json").read_text(encoding="utf-8"))["gdp"]
    data["pib"] = {int(k): round(v / 1000, 1) for k, v in PIB.items()}
    data["previsions"] = {2026: {"deficit_pib": 5.4, "depenses_pib": 57.1, "dette_pib": 119.3, "croissance": 0.5,
                                 "source": "Projet de loi de finances pour 2027 (1er octobre 2026)"}}
    # Contrôles de cohérence avec des sources indépendantes
    INSEE = {2025: {"rec": 1561.7, "dep": 1714.2, "solde": -152.5, "apuc": -130.3, "apul": -15.6, "asso": -6.7},
             2024: {"rec": 1503.0, "dep": 1672.1, "solde": -169.1, "apuc": -152.5, "apul": -17.8, "asso": 1.1}}
    checks = {}
    for y in years:
        if not all((s, y) in M for s in ALL):
            continue
        m = {s: M[(s, y)] for s in ALL}
        t = data["years"][y]["totals"]
        I = INSEE.get(y, {})
        c = []
        add = lambda lab, ours, ref, src, note="": c.append({"l": lab, "ours": round(ours, 1), "ref": ref, "src": src, "note": note})
        if I:
            add("Recettes publiques totales", t["conso"]["recettes"], I["rec"], "Insee, compte des APU")
            add("Dépenses publiques totales", t["conso"]["depenses"], I["dep"], "Insee, compte des APU")
            add("Déficit public", t["conso"]["solde"], I["solde"], "Insee, compte des APU")
            add("Solde État + agences (APUC)", g(m["S1311"], "B9") / 1000, I["apuc"], "Insee (État + ODAC)")
            add("Solde Sécurité sociale", g(m["S1314"], "B9") / 1000, I["asso"], "Insee (ASSO)")
            add("Solde collectivités", g(m[A], "B9") / 1000, I["apul"], "Insee (APUL)")
            if y == 2025:
                add("Solde Sécurité sociale, périmètre « LFSS » (régimes de base + FSV)", g(m["S1314"], "B9") / 1000, -21.6,
                    "Commission des comptes de la Sécurité sociale",
                    "Pas une erreur : les −21,6 Md€ ne couvrent que les régimes obligatoires de base et le FSV. Le secteur « Sécurité sociale » des comptes nationaux inclut aussi la CADES (qui rembourse chaque année environ 16 Md€ de dette sociale, d'où un excédent), les retraites complémentaires Agirc-Arrco, l'Unédic et les hôpitaux.")
            add("Solde « État élargi » (État + agences + Sécurité sociale)", (g(m["S1311"], "B9") + g(m["S1314"], "B9")) / 1000,
                round(I["apuc"] + I["asso"], 1), "Insee (APUC + ASSO)",
                "Le solde du bloc « État élargi » additionne l'État avec ses agences et la Sécurité sociale ; ce n'est pas le solde de l'État seul.")
        tva = sum(g(m[s], "D211REC") for s in ALL) / 1000
        add("TVA totale (État + Sécu + collectivités)", tva, round(B.TVA_DGFIP[y] / 1000, 1), "DGFiP, statistiques TVA" + (" (2024 déduit de +1,3 %)" if y == 2024 else ""),
            "Comptabilité nationale : TVA en droits constatés, nette des montants jugés irrécouvrables ; la DGFiP mesure la TVA « économique » déclarée.")
        add("TVA de l'État", g(m["S1311"], "D211REC") / 1000, round(B.TVA_ETAT_NETTE[y] / 1000, 1), "Budget de l'État, TVA nette (Cour des comptes)")
        add("Contribution au budget de l'UE", g(m["S1311"], "D76PAY") / 1000, round(B.PSR[y]["ue"] / 1000, 1), "Budget de l'État, prélèvement sur recettes UE")
        if y in B.CHARGE_DETTE:
            add("Intérêts payés par l'État + agences", g(m["S1311"], "D4PAY") / 1000, round(B.CHARGE_DETTE[y] / 1000, 1), "Cour des comptes, charge de la dette de l'État",
                "Les agences (ODAC) et les règles de rattachement des intérêts expliquent l'écart.")
        add("Solde État + agences vs solde budgétaire", g(m["S1311"], "B9") / 1000, round(B.SOLDE_BUDGETAIRE[y] / 1000, 1), "Budget de l'État, solde général d'exécution (Cour des comptes)",
            "Concepts différents : la comptabilité nationale inclut les agences et enregistre en droits constatés, le budget en encaissements/décaissements.")
        checks[y] = c
    data["checks"] = checks
    out = ROOT / "data" / "data.js"
    out.write_text("// Généré par scripts/build_data.py — ne pas éditer à la main\nwindow.FINANCES = "
                   + json.dumps(data, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
    for y, v in data["years"].items():
        print(y, json.dumps(v["totals"], ensure_ascii=False))
    print("COFOG:", list(data["cofog"]), "->", out)


if __name__ == "__main__":
    main()
