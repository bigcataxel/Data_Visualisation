/* ================================================
   FUITES DE DONNÉES — Dashboard D3.js v7
   Pas de framework, pas de bundler, commentaires en français
   ================================================ */

// === CONFIGURATION ===

const FICHIER_CSV = 'IIB%20Data%20Breaches%20-%20LATEST%20-%20breaches.csv';
const DUREE = 750; // durée des transitions en ms

// Couleurs par secteur
const COULEURS_SECTEUR = {
    tech: '#00ffff', health: '#00ff88', finance: '#ffaa00',
    government: '#ff4466', web: '#aa44ff', retail: '#ff6633',
    telecoms: '#44aaff', academia: '#ffe033', transport: '#33ffcc',
    gaming: '#ff44cc', misc: '#9988bb', unknown: '#444466',
};

// Traductions des secteurs et méthodes en français
const SECTEURS_FR = {
    tech: 'Technologie', health: 'Santé', finance: 'Finance',
    government: 'Gouvernement', web: 'Web / Internet', retail: 'Commerce',
    telecoms: 'Télécoms', academia: 'Éducation', transport: 'Transport',
    gaming: 'Jeux en ligne', misc: 'Divers', unknown: 'Inconnu',
};

const METHODES_FR = {
    'hacked': 'Hacking', 'poor security': 'Sécurité défaillante',
    'inside job': 'Menace interne', 'oops!': 'Erreur humaine',
    'lost device': 'Appareil perdu', 'accidentally published': 'Publication accidentelle',
};

// Marges du bar chart
const MARGE = { haut: 20, droite: 20, bas: 52, gauche: 62 };


// === ÉTAT GLOBAL ===

// Toutes les modifications de filtre passent par cet objet
let etat = {
    anneeMin: 2004,
    anneeMax: 2025,
    secteur: 'tous',
    methodeFiltree: null, // méthode cliquée dans le donut
};

let donneesBrutes  = []; // chargées une fois
let donneesFiltrees = []; // recalculées à chaque filtre

// Références aux SVG créés par D3 (pour éviter de recréer à chaque update)
let svgBulles = null, svgBarres = null, svgDonut = null;
let groupeBulles = null, groupeBarres = null;


// === UTILITAIRES ===

// Formate un grand nombre : 5700000 → "5.7M"
function formater(n) {
    if (!n || isNaN(n)) return '–';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'G';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
    return n.toString();
}

// Tronque un texte trop long
function tronquer(txt, max = 180) {
    if (!txt) return '';
    return txt.length > max ? txt.slice(0, max) + '…' : txt;
}

// Retourne la couleur du secteur (prend le premier si plusieurs)
function couleur(secteur) {
    const s = (secteur || '').split(',')[0].trim().toLowerCase();
    return COULEURS_SECTEUR[s] || COULEURS_SECTEUR.unknown;
}

// Traduit un nom de méthode en français
function methodeFr(m) {
    return METHODES_FR[m] || (m ? m.charAt(0).toUpperCase() + m.slice(1) : 'Inconnu');
}

// Traduit un secteur en français
function secteurFr(s) {
    return SECTEURS_FR[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Inconnu');
}


// === CHARGEMENT ET NETTOYAGE DES DONNÉES ===

async function charger() {
    afficherMsg('chargement');

    let brut;
    try {
        brut = await d3.csv(FICHIER_CSV);
    } catch (e) {
        afficherMsg('erreur', 'Impossible de charger le CSV. Utilisez un serveur local (Live Server, etc.)');
        return;
    }

    // Le header CSV a "year   " avec des espaces → on normalise toutes les clés
    const lignes = brut.map(row => {
        const r = {};
        Object.keys(row).forEach(k => { r[k.trim()] = row[k]; });
        return r;
    });

    // Nettoyer et filtrer chaque ligne
    donneesBrutes = lignes.map((d, i) => {
        // "records lost" peut contenir des virgules ou points-virgules → on les supprime
        const recStr = (d['records lost'] || '').replace(/[,;\s]/g, '');
        const records = parseInt(recStr, 10);
        const annee   = parseInt((d['year'] || '').trim(), 10);
        const secteur = (d['sector'] || '').split(',')[0].trim().toLowerCase() || 'unknown';
        const methode = (d['method'] || '').trim().toLowerCase() || 'unknown';

        return { id: i, organisation: (d['organisation'] || '').trim(), records, annee, secteur, methode, histoire: (d['story'] || '').trim() };
    }).filter(d =>
        d.records > 0 && d.annee >= 1990 && d.annee <= 2030
        && d.organisation.length > 0 && d.organisation.length < 150
    );

    // Compteur dans le header
    document.getElementById('compteur').textContent = `${donneesBrutes.length} incidents référencés`;

    // Plage d'années réelle dans les données
    const [anneeMin, anneeMax] = d3.extent(donneesBrutes, d => d.annee);
    etat.anneeMin = anneeMin;
    etat.anneeMax = anneeMax;

    // Initialiser les sliders
    ['annee-min', 'annee-max'].forEach(id => {
        const el = document.getElementById(id);
        el.min = anneeMin; el.max = anneeMax;
        el.value = id === 'annee-min' ? anneeMin : anneeMax;
    });
    document.getElementById('annee-min-txt').textContent = anneeMin;
    document.getElementById('annee-max-txt').textContent = anneeMax;
    majSlider();

    // Remplir le dropdown des secteurs (en français)
    const secteurs = [...new Set(donneesBrutes.map(d => d.secteur))].sort();
    const select = document.getElementById('filtre-secteur');
    secteurs.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = secteurFr(s);
        select.appendChild(opt);
    });

    majTout();
}


// === FILTRAGE ===

function majTout() {
    donneesFiltrees = donneesBrutes.filter(d =>
        d.annee >= etat.anneeMin && d.annee <= etat.anneeMax
        && (etat.secteur === 'tous' || d.secteur === etat.secteur)
    );

    // Mise à jour des compteurs
    document.getElementById('nb-incidents').textContent = donneesFiltrees.length.toLocaleString('fr-FR');
    document.getElementById('nb-records').textContent   = formater(d3.sum(donneesFiltrees, d => d.records));

    dessinerBulles();
    dessinerBarres();
    dessinerDonut();
}


// === TOOLTIP ===

const tt = d3.select('#tooltip');

function montrerTooltip(event, html) {
    tt.html(html).classed('visible', true);
    placerTooltip(event);
}

function placerTooltip(event) {
    const n = tt.node(), marge = 12;
    let x = event.clientX + marge, y = event.clientY + marge;
    if (x + n.offsetWidth  + marge > window.innerWidth)  x = event.clientX - n.offsetWidth  - marge;
    if (y + n.offsetHeight + marge > window.innerHeight) y = event.clientY - n.offsetHeight - marge;
    tt.style('left', x + 'px').style('top', y + 'px');
}

function cacherTooltip() { tt.classed('visible', false); }


// === 1. GRAPHIQUE À BULLES ===

function dessinerBulles() {
    const conteneur = document.getElementById('bulles');
    if (!conteneur) return;

    const L = Math.max(conteneur.clientWidth, 300);
    const H = Math.max(Math.round(L * 0.52), 280);

    // Créer le SVG une seule fois
    if (!svgBulles) {
        svgBulles = d3.select('#bulles').append('svg')
            .attr('viewBox', `0 0 ${L} ${H}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');
        groupeBulles = svgBulles.append('g')
            .attr('class', 'groupe-bulles')
            .attr('transform', `translate(${L/2},${H/2})`);
        // Clic sur le fond = désélectionner
        svgBulles.on('click', () => { etat.bulleId = null; majHighlight(); });
    }

    svgBulles.attr('viewBox', `0 0 ${L} ${H}`);
    groupeBulles.attr('transform', `translate(${L/2},${H/2})`);

    if (donneesFiltrees.length === 0) {
        groupeBulles.selectAll('circle').remove();
        return;
    }

    // Échelle de rayon : racine carrée pour ne pas écraser les petites bulles
    const echelleR = d3.scaleSqrt()
        .domain([0, d3.max(donneesFiltrees, d => d.records)])
        .range([3, Math.min(L, H) * 0.16]);

    // Préparer les nœuds avec leur rayon
    const noeuds = donneesFiltrees.map(d => ({ ...d, r: Math.max(3, echelleR(d.records)) }));

    // Force simulation pour éviter les chevauchements (calculée hors animation)
    const sim = d3.forceSimulation(noeuds)
        .force('x', d3.forceX(0).strength(0.06))
        .force('y', d3.forceY(0).strength(0.06))
        .force('collision', d3.forceCollide(d => d.r + 1.2).strength(0.85).iterations(3))
        .stop();
    for (let i = 0; i < 250; i++) sim.tick(); // 250 itérations précalculées

    // Garder les bulles dans les limites
    noeuds.forEach(d => {
        d.x = Math.max(-L/2 + d.r, Math.min(L/2 - d.r, d.x));
        d.y = Math.max(-H/2 + d.r, Math.min(H/2 - d.r, d.y));
    });

    // Jointure D3 (clé = id de l'incident pour les transitions)
    const bulles = groupeBulles.selectAll('circle.bulle')
        .data(noeuds, d => d.id);

    // ENTRÉE : nouvelles bulles
    bulles.enter()
        .append('circle')
        .attr('class', 'bulle')
        .attr('r', 0)         // démarre invisible
        .attr('cx', 0).attr('cy', 0)
        .attr('fill', d => couleur(d.secteur))
        .attr('fill-opacity', 0.72)
        .attr('stroke', d => couleur(d.secteur))
        .attr('stroke-width', 0.5)
        .on('mouseover', (event, d) => {
            montrerTooltip(event, `
                <strong>${d.organisation}</strong>
                <div class="ligne"><span class="cle">Année</span><span class="val">${d.annee}</span></div>
                <div class="ligne"><span class="cle">Records</span><span class="val">${formater(d.records)}</span></div>
                <div class="ligne"><span class="cle">Secteur</span><span class="val">${secteurFr(d.secteur)}</span></div>
                <div class="ligne"><span class="cle">Méthode</span><span class="val">${methodeFr(d.methode)}</span></div>
                ${d.histoire ? `<div class="histoire">${tronquer(d.histoire)}</div>` : ''}
            `);
            etat.bulleId = d.id;
            majHighlight();
        })
        .on('mousemove', placerTooltip)
        .on('mouseout', () => { cacherTooltip(); etat.bulleId = null; majHighlight(); })
        .on('click', (event, d) => {
            etat.bulleId = etat.bulleId === d.id ? null : d.id;
            majHighlight();
            event.stopPropagation();
        })
        // MISE À JOUR + ENTRÉE : transition vers les positions calculées
        .merge(bulles)
        .transition().duration(DUREE).ease(d3.easeCubicOut)
        .attr('cx', d => d.x).attr('cy', d => d.y).attr('r', d => d.r)
        .attr('fill', d => couleur(d.secteur));

    // SORTIE : bulles qui disparaissent
    bulles.exit().transition().duration(DUREE / 2).attr('r', 0).remove();
}

// Atténue toutes les bulles sauf celle sélectionnée
function majHighlight() {
    if (!groupeBulles) return;
    groupeBulles.selectAll('circle.bulle')
        .classed('attenuation', etat.bulleId != null ? d => d.id !== etat.bulleId : false);
}


// === 2. HISTOGRAMME PAR ANNÉE ===

function dessinerBarres() {
    const conteneur = document.getElementById('barres');
    if (!conteneur) return;

    const L = Math.max(conteneur.clientWidth, 260);
    const H = 280;

    // Créer le SVG une seule fois
    if (!svgBarres) {
        svgBarres = d3.select('#barres').append('svg')
            .attr('viewBox', `0 0 ${L} ${H}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        groupeBarres = svgBarres.append('g')
            .attr('transform', `translate(${MARGE.gauche},${MARGE.haut})`);
        groupeBarres.append('g').attr('class', 'grille');
        groupeBarres.append('g').attr('class', 'axis axe-x');
        groupeBarres.append('g').attr('class', 'axis axe-y');

        // Dégradé cyan → violet pour les barres
        const defs = svgBarres.append('defs');
        const grad = defs.append('linearGradient').attr('id', 'degrade-barre')
            .attr('x1','0%').attr('y1','0%').attr('x2','0%').attr('y2','100%');
        grad.append('stop').attr('offset','0%').attr('stop-color','#00ffff').attr('stop-opacity', 0.9);
        grad.append('stop').attr('offset','100%').attr('stop-color','#6600cc').attr('stop-opacity', 0.55);
    }

    svgBarres.attr('viewBox', `0 0 ${L} ${H}`);

    const larg = L - MARGE.gauche - MARGE.droite;
    const haut = H - MARGE.haut  - MARGE.bas;

    // Agréger : total des records et nombre d'incidents par année
    const parAnnee = Array.from(
        d3.rollup(donneesFiltrees, v => ({ total: d3.sum(v, d => d.records), nb: v.length }), d => d.annee),
        ([annee, val]) => ({ annee, ...val })
    ).sort((a, b) => a.annee - b.annee);

    // Échelles
    const echelleX = d3.scaleBand().domain(parAnnee.map(d => d.annee)).range([0, larg]).padding(0.25);
    const echelleY = d3.scaleLinear().domain([0, d3.max(parAnnee, d => d.total) || 1]).nice().range([haut, 0]);

    // Axe X (années en diagonale)
    groupeBarres.select('.axe-x')
        .attr('transform', `translate(0,${haut})`)
        .transition().duration(DUREE)
        .call(d3.axisBottom(echelleX).tickFormat(d3.format('d')).tickSizeOuter(0))
        .selectAll('text').attr('transform', 'rotate(-45)').style('text-anchor', 'end')
        .attr('dx', '-0.4em').attr('dy', '0.15em');

    // Axe Y (valeurs formatées)
    groupeBarres.select('.axe-y')
        .transition().duration(DUREE)
        .call(d3.axisLeft(echelleY).ticks(5).tickFormat(d => formater(d)));

    // Grille horizontale
    groupeBarres.select('.grille')
        .transition().duration(DUREE)
        .call(d3.axisLeft(echelleY).ticks(5).tickSize(-larg).tickFormat(''))
        .call(g => g.select('.domain').remove());

    // Barres (jointure par année)
    const barres = groupeBarres.selectAll('rect.barre').data(parAnnee, d => d.annee);

    barres.enter()
        .append('rect').attr('class', 'barre')
        .attr('fill', 'url(#degrade-barre)').attr('rx', 2)
        .attr('x', d => echelleX(d.annee)).attr('width', echelleX.bandwidth())
        .attr('y', haut).attr('height', 0)
        .on('mouseover', (event, d) => montrerTooltip(event, `
            <strong>Année ${d.annee}</strong>
            <div class="ligne"><span class="cle">Records</span><span class="val">${formater(d.total)}</span></div>
            <div class="ligne"><span class="cle">Incidents</span><span class="val">${d.nb} fuites</span></div>
        `))
        .on('mousemove', placerTooltip).on('mouseout', cacherTooltip)
        .merge(barres)
        .transition().duration(DUREE).ease(d3.easeCubicOut)
        .attr('x', d => echelleX(d.annee)).attr('width', echelleX.bandwidth())
        .attr('y', d => echelleY(d.total)).attr('height', d => haut - echelleY(d.total));

    barres.exit().transition().duration(DUREE / 2).attr('y', haut).attr('height', 0).remove();
}


// === 3. DONUT — MÉTHODES D'ATTAQUE ===

function dessinerDonut() {
    const conteneur = document.getElementById('donut');
    if (!conteneur) return;

    const L = Math.max(conteneur.clientWidth, 260);
    const H = 280;

    if (!svgDonut) {
        svgDonut = d3.select('#donut').append('svg')
            .attr('viewBox', `0 0 ${L} ${H}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');
        svgDonut.append('g').attr('class', 'groupe-donut');
        svgDonut.append('g').attr('class', 'groupe-legende');
    }

    svgDonut.attr('viewBox', `0 0 ${L} ${H}`);

    // Anneau à gauche, légende à droite
    const zoneDonut = L * 0.47;
    const rayon     = Math.min(zoneDonut, H) / 2 - 16;
    const rayonInt  = rayon * 0.54;

    svgDonut.select('.groupe-donut').attr('transform', `translate(${zoneDonut/2},${H/2})`);
    svgDonut.select('.groupe-legende').attr('transform', `translate(${zoneDonut + 8},20)`);

    // Agrégation par méthode
    const parMethode = Array.from(
        d3.rollup(donneesFiltrees, v => v.length, d => d.methode),
        ([methode, nb]) => ({ methode, nb })
    ).sort((a, b) => b.nb - a.nb);

    const total = donneesFiltrees.length;

    // Couleurs ordinales pour les méthodes
    const couleurs = d3.scaleOrdinal()
        .domain(parMethode.map(d => d.methode))
        .range(['#00ffff','#9933ff','#ff00aa','#00ff88','#ffaa00','#44aaff','#ff4466','#aaaacc']);

    // Générateurs
    const pie = d3.pie().value(d => d.nb).sort(null).padAngle(0.025);
    const arc     = d3.arc().innerRadius(rayonInt).outerRadius(rayon);
    const arcSurvol = d3.arc().innerRadius(rayonInt - 2).outerRadius(rayon + 7);

    const secteurs = pie(parMethode);

    // Jointure des arcs (clé = méthode)
    const arcs = svgDonut.select('.groupe-donut')
        .selectAll('path.arc').data(secteurs, d => d.data.methode);

    arcs.enter()
        .append('path').attr('class', 'arc')
        .attr('fill', d => couleurs(d.data.methode))
        .attr('stroke', '#09090f').attr('stroke-width', 1.5)
        .each(function(d) { this._precedent = { startAngle: d.startAngle, endAngle: d.startAngle }; })
        .on('mouseover', function(event, d) {
            d3.select(this).transition().duration(180).attr('d', arcSurvol(d));
            const pct = total > 0 ? ((d.data.nb / total) * 100).toFixed(1) : 0;
            montrerTooltip(event, `
                <strong>${methodeFr(d.data.methode)}</strong>
                <div class="ligne"><span class="cle">Incidents</span><span class="val">${d.data.nb}</span></div>
                <div class="ligne"><span class="cle">Part</span><span class="val">${pct}%</span></div>
            `);
        })
        .on('mousemove', placerTooltip)
        .on('mouseout', function(event, d) {
            d3.select(this).transition().duration(180).attr('d', arc(d));
            cacherTooltip();
        })
        .on('click', function(event, d) {
            etat.methodeFiltree = etat.methodeFiltree === d.data.methode ? null : d.data.methode;
            majHighlightDonut();
        })
        // Animation : interpolation depuis la position précédente
        .merge(arcs)
        .transition().duration(DUREE)
        .attrTween('d', function(d) {
            const debut = this._precedent || { startAngle: d.startAngle, endAngle: d.startAngle };
            const interp = d3.interpolate(debut, d);
            this._precedent = d;
            return t => arc(interp(t));
        });

    arcs.exit()
        .transition().duration(DUREE / 2)
        .attrTween('d', function(d) {
            const interp = d3.interpolate(d, { startAngle: d.endAngle, endAngle: d.endAngle });
            return t => arc(interp(t));
        }).remove();

    // Texte central
    const gD = svgDonut.select('.groupe-donut');
    gD.selectAll('.centre').remove();
    gD.append('text').attr('class', 'centre').attr('text-anchor', 'middle').attr('dy', '-0.1em')
        .style('font-family', 'var(--police-mono)').style('font-size', '1.3rem')
        .style('font-weight', '700').style('fill', '#00ffff').text(total);
    gD.append('text').attr('class', 'centre').attr('text-anchor', 'middle').attr('dy', '1.3em')
        .style('font-family', 'var(--police-mono)').style('font-size', '0.5rem')
        .style('fill', 'var(--texte-gris)').style('letter-spacing', '0.1em').text('INCIDENTS');

    // Légende cliquable
    const gL = svgDonut.select('.groupe-legende');
    const items = gL.selectAll('g.item-legende').data(parMethode, d => d.methode);

    const entree = items.enter().append('g').attr('class', 'item-legende')
        .on('click', (event, d) => {
            etat.methodeFiltree = etat.methodeFiltree === d.methode ? null : d.methode;
            majHighlightDonut();
        });
    entree.append('rect').attr('width', 9).attr('height', 9).attr('rx', 2);
    entree.append('text').attr('x', 14).attr('y', 9)
        .style('font-family', 'var(--police-mono)').style('font-size', '0.62rem')
        .style('fill', 'var(--texte-gris)');

    items.merge(entree)
        .attr('transform', (d, i) => `translate(0,${i * 22})`)
        .select('rect').attr('fill', d => couleurs(d.methode));
    items.merge(entree)
        .select('text').text(d => `${methodeFr(d.methode)} (${d.nb})`);

    items.exit().remove();
    majHighlightDonut();
}

function majHighlightDonut() {
    if (!svgDonut) return;
    svgDonut.select('.groupe-donut').selectAll('.arc')
        .classed('attenuation', etat.methodeFiltree ? d => d.data.methode !== etat.methodeFiltree : false);
    svgDonut.select('.groupe-legende').selectAll('.item-legende')
        .classed('attenuation', etat.methodeFiltree ? d => d.methode !== etat.methodeFiltree : false);
}


// === MESSAGES UI ===

function afficherMsg(type, texte = '') {
    const cls = type === 'erreur' ? 'msg-erreur' : type === 'vide' ? 'msg-vide' : 'msg-chargement';
    const contenu = type === 'chargement' ? 'Chargement des données…'
                  : type === 'erreur'     ? `⚠ ${texte}` : texte;
    ['#bulles', '#barres', '#donut'].forEach(id =>
        d3.select(id).html(`<div class="${cls}">${contenu}</div>`)
    );
}


// === CONTRÔLES ===

function initSlider() {
    const sMin = document.getElementById('annee-min');
    const sMax = document.getElementById('annee-max');

    function onChange() {
        let min = parseInt(sMin.value, 10), max = parseInt(sMax.value, 10);
        if (min > max) { min = max; sMin.value = min; }
        document.getElementById('annee-min-txt').textContent = min;
        document.getElementById('annee-max-txt').textContent = max;
        majSlider();
        etat.anneeMin = min; etat.anneeMax = max;
        majTout();
    }

    sMin.addEventListener('input', onChange);
    sMax.addEventListener('input', onChange);
}

// Met à jour la zone colorée entre les deux handles du slider
function majSlider() {
    const sMin = document.getElementById('annee-min');
    const sMax = document.getElementById('annee-max');
    const fill = document.getElementById('slider-remplissage');
    if (!sMin || !fill) return;
    const span = parseInt(sMin.max) - parseInt(sMin.min) || 1;
    const p1 = ((parseInt(sMin.value) - parseInt(sMin.min)) / span) * 100;
    const p2 = ((parseInt(sMax.value) - parseInt(sMin.min)) / span) * 100;
    fill.style.left = p1 + '%';
    fill.style.width = (p2 - p1) + '%';
}

function initControles() {
    initSlider();

    document.getElementById('filtre-secteur').addEventListener('change', function() {
        etat.secteur = this.value;
        majTout();
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
        const [min, max] = d3.extent(donneesBrutes, d => d.annee);
        etat.anneeMin = min; etat.anneeMax = max;
        etat.secteur = 'tous'; etat.methodeFiltree = null; etat.bulleId = null;

        document.getElementById('annee-min').value = min;
        document.getElementById('annee-max').value = max;
        document.getElementById('filtre-secteur').value = 'tous';
        document.getElementById('annee-min-txt').textContent = min;
        document.getElementById('annee-max-txt').textContent = max;
        majSlider();
        majTout();
    });
}


// === RESPONSIVE ===

// Recrée les SVG si la fenêtre est redimensionnée (debounce 300ms)
let timerResize;
window.addEventListener('resize', () => {
    clearTimeout(timerResize);
    timerResize = setTimeout(() => {
        if (svgBulles) { svgBulles.remove(); svgBulles = null; groupeBulles = null; }
        if (svgBarres) { svgBarres.remove(); svgBarres = null; groupeBarres = null; }
        if (svgDonut)  { svgDonut.remove();  svgDonut  = null; }
        majTout();
    }, 300);
});


// === DÉMARRAGE ===

document.addEventListener('DOMContentLoaded', () => {
    initControles();
    charger();
});
