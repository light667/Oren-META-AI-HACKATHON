# Vidéo de démonstration Oren

Vidéo produite **entièrement par script**, à partir du vrai produit en cours
d'exécution : aucune maquette, aucun faux chiffre, aucun faux témoignage.
Si une scène ne peut pas être produite honnêtement, elle laisse un emplacement
marqué dans le montage plutôt qu'une simulation (voir RAPPORT.md).

## Prérequis

1. Le produit tourne et répond sur `DEMO_URL` :
   `npm run dev` (défaut http://localhost:3000).
2. `.env` contient les clés Supabase (URL, anon, service_role) et la clé Meta
   Model API — jamais affichées : la connexion patron se fait par jeton vérifié
   côté serveur, aucun secret ne transite par une URL filmée.
3. ffmpeg sur le PATH (`winget install Gyan.FFmpeg`) et Playwright installé
   (`npm i -D playwright`, pilote le Microsoft Edge déjà présent, aucun
   navigateur téléchargé).
4. Variables d'environnement optionnelles : voir `.env.example`, section
   « Vidéo de démonstration » (`DEMO_URL`, `DEMO_EMAIL`, …). Le compte démo
   (`demo-video@oren.example`, adresse factice réservée) et l'entreprise
   « Chez Chef T » sont créés par le script via l'API admin Supabase.

## Relancer une scène

Chaque scène se teste séparément, sans rejouer tout le parcours :

```powershell
npx tsx scripts/demo-record.ts --scene 3
```

Ordre de dépendance entre scènes : 3 (publication du menu) → 4 (commande
cliente) → 5 (réception patron) → 6 (injection, réutilise le téléphone).
En mode `--scene`, la base n'est **pas** réinitialisée : les scènes rejouent
sur l'état laissé par les précédentes.

## Relancer l'ensemble

```powershell
npm run demo:video
```

Soit `demo-record.ts` (prise complète, les deux contextes navigateur en
parallèle : ordinateur 1920x1080 pour le patron, téléphone 390x844 tactile
pour la cliente, afin que la commande arrive réellement chez le patron), puis
`demo-compose.ts` (montage ffmpeg : fondus 200 ms, cadre téléphone, incrustation
côte à côte scène 5, sous-titres anglais gravés).

Une prise complète réinitialise l'entreprise de démonstration au départ
(menu et zones réimportés par la scène 3, anciennes commandes effacées) et ne
rejoue le parcours réel qu'**une fois**. Ne pas enchaîner les prises : chaque
exécution consomme de vrais appels Meta (vision, transcription, chat).

## Voix off

Aucune voix de synthèse locale de qualité n'étant disponible, la vidéo est
livrée sans voix. Les textes à enregistrer sont fournis, synchronisés sur les
durées réelles des scènes :

- `voix-off-en.txt` / `voix-off-fr.txt` — texte par scène avec timecodes.
- `sous-titres-en.srt` / `sous-titres-fr.srt` — sous-titres prêts à l'emploi
  (les anglais sont aussi gravés dans `oren-demo.mp4`).

`oren-demo-sans-voix.mp4` est la même vidéo, fournie pour accueillir la voix
enregistrée en post-production.

## Musique (optionnel)

Déposer un fichier libre de droits dans `scripts/demo-assets/musique.mp3` :
le montage le mélange à faible volume (0,07) avec fondus, sans autre changement.

## Ce qui est incrusté ou accéléré

Détaillé dans RAPPORT.md : compteur de temps réel sur les attentes accélérées
(scène 3), anneau de curseur, cartes HTML aux couleurs du produit (scènes 1, 6, 7).
