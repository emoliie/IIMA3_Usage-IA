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
| TEXTILE | 🟣 **TEXTILE BANK** (borne à textiles) |
| MISCELLANEOUS · fond / personne | — **NOTHING** (voir *Limites connues*) |
| _trash / ordures_ (libellé générique) | 🟢 **GREEN BIN** (non-recyclable) |

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

## Limites connues

- **Pas de classe « Rien » dans le modèle.** Le dataset (type RealWaste) ne contient aucune classe « rien à trier ». Faute de mieux, le modèle range le **fond et les personnes** dans sa classe fourre-tout **MISCELLANEOUS**, souvent avec une confiance élevée.
  - *Contournement côté interface* : dans `binFor()`, MISCELLANEOUS est traité comme **NOTHING** (« rien à trier ») au lieu d'afficher un faux bac vert. Mieux vaut ne rien afficher qu'afficher n'importe quoi en continu.
  - *Conséquence* : un vrai déchet non-recyclable classé MISCELLANEOUS n'affiche pas non plus le bac vert.
  - *Vraie correction* : ajouter une classe `Nothing` (captures de fonds / mains / visage) et **réentraîner** le modèle.
- **Précision dépendante des données**, pas du framework : confusions entre matières visuellement proches (plastique/verre, papier/carton).
- **Simplifications de tri** : TEXTILE et VEGETATION mappés de façon pragmatique, pas selon toutes les règles parisiennes réelles.
- **Dépendance internet** pour charger les librairies (CDN) et le modèle (serveurs Google) — l'app ne fonctionne pas hors-ligne.
- **Miroir purement visuel** : la prédiction en direct se fait sur l'image non-miroir.

---

## Dépannage

| Problème | Piste |
|---|---|
| Webcam noire / bloquée | ouvert en `file://` → relancer via le serveur local (`localhost`) |
| Statut **ERROR** | vérifier l'URL du modèle ; tester que `.../model.json` répond ; connexion réseau (les libs + le modèle se chargent depuis le CDN) |
| Verdict affiche `???` | classe non mappée → compléter `binFor()` |
| Prédictions fausses | problème de **dataset** (volume, équilibre, conditions réelles), pas de framework — réentraîner avec plus d'images variées et équilibrées |
