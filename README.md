# Data Breaches — L'impact sur les entreprises

Tableau de bord interactif visualisant les plus grandes fuites de données mondiales depuis 2004.
Chaque incident est représenté par sa taille, son secteur, son année et sa méthode d'attaque,
avec des filtres coordonnés entre les trois graphiques.


## Groupe : 
- bigcataxel
- Smile-wq-afk
- MaximeVitiPro
- Noah-ndf
- Mikee-hub

---

## Visualisations

| Graphique | Description |
|-----------|-------------|
| **Bubble Chart** | Une bulle par incident · taille ∝ records volés · couleur = secteur |
| **Bar Chart** | Total des enregistrements exposés par année |
| **Donut Chart** | Répartition des incidents par méthode d'attaque (hacking, erreur humaine…) |

Les trois graphiques sont **coordonnés** : les filtres appliqués à l'un se répercutent sur tous.

---

## Source des données

- **Nom** : World's Biggest Data Breaches & Hacks
- **Auteur** : Information is Beautiful
- **Lien** : https://informationisbeautiful.net/visualizations/worlds-biggest-data-breaches-hacks/
- **Fichier** : `IIB Data Breaches - LATEST - breaches.csv`

---

## Technologies utilisées

- **D3.js v7** (via CDN — aucun bundler, aucun framework)
- HTML5 / CSS3 (Flexbox, CSS Grid, Custom Properties)
- JavaScript ES2017 (`async/await`)
- Police : [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) (Google Fonts)

---

## Lancer localement

Le chargement du CSV nécessite un serveur HTTP local (les navigateurs bloquent `fetch` sur `file://`).

**Option 1 — VS Code Live Server** (recommandé)

1. Installer l'extension [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. Clic droit sur `index.html` → **Open with Live Server**

**Option 2 — Python**

```bash
# Python 3
python -m http.server 8080
# puis ouvrir http://localhost:8080
```

**Option 3 — Node.js**

```bash
npx http-server .
```

---

## Structure des fichiers

```
.
├── index.html                              # Structure HTML, conteneurs SVG, filtres
├── style.css                               # Thème cyber sombre (cyan / violet)
├── script.js                               # Toute la logique D3.js v7
├── IIB Data Breaches - LATEST - breaches.csv  # Dataset source
└── README.md
```

---

## GitHub Pages

> Lien démo : **https://bigcataxel.github.io/Data_Visualisation/**
>
> 

Pour publier :
1. Pousser les fichiers sur GitHub
2. Aller dans **Settings → Pages → Source : main / root**
3. GitHub Pages sert automatiquement `index.html`

---

## Captures d'écran
> <img width="3790" height="1061" alt="image" src="https://github.com/user-attachments/assets/de4cc024-eabf-4236-bb07-d8cfca652b24" />

> <img width="1603" height="1748" alt="image" src="https://github.com/user-attachments/assets/e743b202-9601-4836-80c9-2ad11b763111" />



---

## Licence

Données : © Information is Beautiful (CC BY-NC-SA 4.0)  
