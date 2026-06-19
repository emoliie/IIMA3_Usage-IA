# TRI-O-MATIC 🕹️

Interface web rétro-arcade qui reconnaît la matière d'un déchet (webcam ou image) et indique le **bon bac de tri parisien**. Le modèle est un classifieur d'images **Teachable Machine** exécuté dans le navigateur via **TensorFlow.js** — aucune image n'est envoyée sur internet.

Projet d'école IIM A3 · stack **p5.js**.

---

## Lancer le projet

La webcam exige un **contexte sécurisé** : impossible d'ouvrir le fichier en `file://`, il faut un serveur local.

```bash
# au choix
python3 -m http.server 8000
# ou
npx serve
```

Puis ouvrir **http://127.0.0.1:8000/**

Au chargement, le statut doit passer à **MODEL OK** (en haut à droite).

---

## Utilisation

| Bouton | Action |
|---|---|
| ⏻ **CAM ON / OFF** | allume / éteint la webcam (le voyant s'éteint vraiment) |
| 📷 **PHOTO** | fige l'image courante → verdict stable (actif seulement cam allumée) |
| **INSERT IMAGE** | classe une image importée du disque |

La webcam est affichée **en miroir**. Le verdict indique **dans quelle poubelle jeter**, la matière détectée + confiance s'affichent en petit, et les *power bars* montrent la probabilité de chaque classe.

---

## Structure

```
index.html        # page + chargement des libs (p5, tfjs, teachablemachine)
style.css         # styles arcade (Press Start 2P + VT323, boutons, ⚙ réglages)
sketch.js         # logique p5 : canvas, webcam, prédiction, mapping bacs, UI
```

---

## Mapping matière → bac

Défini dans `binFor()` (sketch.js). Reconnaît les libellés FR et EN.

| Classe modèle | Bac |
|---|---|
| PLASTIC · PAPER · CARDBOARD · METAL | 🟡 **YELLOW BIN** (emballages) |
| GLASS | ⚪ **WHITE BIN** (verre) |
| ORGANIC · VEGETATION | 🟤 **BROWN BIN** (alimentaire) |
| MISCELLANEOUS | 🟢 **GREEN BIN** (non-recyclable) |
| TEXTILE | 🟣 **TEXTILE BANK** (borne à textiles) |
| Rien / fond | — **NOTHING** |

➡️ **Une classe affiche `???`** ? Elle n'est pas reconnue : ajoute son mot-clé dans la regex correspondante de `binFor()`.

---

## Personnalisation

- **Changer de modèle** : déplier `⚙ model` en haut, coller l'URL Teachable Machine, cliquer **LOAD**. URL actuelle :
  `https://teachablemachine.withgoogle.com/models/sM_ql2ICj/`
- **Couleurs / libellés des bacs** : objet `BINS` dans sketch.js.
- **Règles de tri** : fonction `binFor()`.

---

## RGPD

Tout tourne **en local dans le navigateur** : la webcam et la classification ne quittent jamais la machine, aucune image n'est transmise à un serveur.

---

## Dépannage

| Problème | Piste |
|---|---|
| Webcam noire / bloquée | ouvert en `file://` → relancer via le serveur local (`localhost`) |
| Statut **ERROR** | vérifier l'URL du modèle ; tester que `.../model.json` répond ; connexion réseau (les libs + le modèle se chargent depuis le CDN) |
| Verdict affiche `???` | classe non mappée → compléter `binFor()` |
| Prédictions fausses | problème de **dataset** (volume, équilibre, conditions réelles), pas de framework — réentraîner avec plus d'images variées et équilibrées |
