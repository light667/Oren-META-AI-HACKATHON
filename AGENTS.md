# AGENTS.md — Oren

Lis ce fichier en entier au début de chaque session et avant chaque tâche. Il ne change pas d'une tâche à l'autre.

## Contexte

Oren est une plateforme d'assistants IA pour les petites entreprises d'Afrique francophone (premier marché : Lomé, Togo). Une entreprise obtient en moins d'une heure un assistant qui répond à ses clients en français, à partir de ses vraies informations, et qui **agit** : prendre une commande, passer la main à un humain, et plus tard réserver, prendre rendez-vous, encaisser un acompte.

Deux horizons, **un seul dépôt** :
1. **Hackathon (jusqu'au 4 novembre 2026, 21h ET)** : tranche verticale « restaurant », bâtie sur l'architecture de la plateforme complète.
2. **Déploiement au Togo (novembre 2026 et après)** : pilote, Mobile Money, SMS, Telegram, WhatsApp, autres métiers. Rien de ce qui est fait pour le hackathon ne doit être jeté.

### Règles du hackathon (à respecter dans tout le code et le dépôt)
- Tout le code est écrit pendant l'événement (à partir du 26 octobre 2026). Aucun code copié d'un projet antérieur (notamment Pulse AI).
- Le dépôt est public. Aucun secret dedans (`.env*` dans `.gitignore`, `.env.example` fourni).
- Le projet doit utiliser les modèles Meta via la Meta Model API (Muse Spark, Muse Voice Transcribe, etc.).
- Commits fréquents et lisibles : l'historique doit prouver ce qui a été fait pendant l'événement.
- Pas de conseil médical, rien de politique.

### Ce que le jury doit voir (à servir dans chaque choix)
1. Un assistant qui **agit** (commande, confirmation, passage à un humain), pas un RAG basique.
2. Une mise en route **multimodale** : photo de menu et message vocal deviennent un catalogue.
3. Un **usage poussé des outils Meta** : appel d'outils, vision, transcription.
4. Une **démo fiable** et belle : un vrai restaurant, un produit en ligne, une vidéo de 3 minutes.

## Architecture de la plateforme (à respecter dès le premier jour)

- **Multi-entreprises.** Tables `businesses` (pas `restaurants`) avec `business_type` (`restaurant` pour l'instant) et une configuration JSON. Chaque entreprise active des **capacités** : `catalog_orders` maintenant ; `bookings` et `appointments` plus tard.
- **Registre d'outils par capacité.** Chaque capacité déclare ses outils (schéma Zod, lecture ou écriture, confirmation requise). L'assistant ne reçoit que les outils des capacités activées pour l'entreprise. Ajouter un métier = ajouter une configuration, pas réécrire le cœur.
- **Cœur indépendant des canaux.** `core/handleMessage` ne connaît aucun canal. Un canal est un **adaptateur** (entrée : convertit le message en format commun ; sortie : met la réponse au format du canal). Seul l'adaptateur `web` est écrit maintenant ; Telegram et WhatsApp viendront ensuite sans toucher au cœur.
- **Modules remplaçables** (interface + version factice ou simple maintenant) :
  - `LlmProvider` : Meta Model API.
  - `PaymentProvider` : « paiement à la livraison / sur place » et un faux fournisseur de test. Mobile Money plus tard.
  - `NotificationProvider` : temps réel dans l'espace patron, notification du navigateur, e-mail. Telegram plus tard.
  - `SmsProvider` : interface seulement, non implémentée.
- **Identité du client.** Table `customers` identifiée par numéro de téléphone (`phone_verified_at` vide au début) et sessions anonymes. La vérification par SMS viendra plus tard.
- **Rôles :** `owner` et `staff` (droits limités).
- **Journal d'audit, traductions, isolation testée** dès le début.

### Structure du dépôt
```
src/app/                 pages et routes (Next.js)
src/core/                handleMessage, garde-fous, registre d'outils
src/capabilities/        catalog-orders/ (puis bookings/, appointments/ plus tard)
src/channels/            web/ (puis telegram/, whatsapp/ plus tard)
src/providers/           llm/, payment/, notification/, sms/
src/i18n/                fr.ts (tous les textes visibles)
supabase/migrations/     schéma et politiques RLS
docs/                    notes, API_NOTES.md, QUESTIONS.md
```

## Stack

- **Interface :** Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui. Style sobre et moderne, mobile d'abord, mode sombre, une seule police (Inter), états de chargement et d'erreur soignés, animations légères.
- **Données :** Supabase (PostgreSQL, Row Level Security, Realtime, Auth par lien e-mail pour le patron, Storage).
- **Modèles :** Meta Model API, uniquement via `src/providers/llm`.
- **Tests :** Vitest. **Validation :** Zod. **Déploiement :** Vercel.
- Pas de base vectorielle : le catalogue d'un restaurant tient dans le contexte du modèle.

**Avant d'écrire du code qui appelle l'API Meta, lis la documentation officielle (dev.meta.ai/docs) et ne suppose rien** : format des requêtes, appel d'outils, sortie JSON, envoi d'images, transcription. Si un point n'est pas clair, écris-le dans `docs/QUESTIONS.md` au lieu de deviner.

## Périmètre du hackathon

**Dedans :** cœur de l'assistant, chat web client, commandes, espace patron en temps réel, mise en route par photo et voix, paiement à la livraison (et faux fournisseur), alertes (temps réel, navigateur, e-mail), bouton « Écrire sur WhatsApp » (lien `wa.me`, sans API), évaluation minimale.
**Dehors (interfaces prévues, rien d'implémenté) :** vrai Mobile Money, SMS, Telegram, WhatsApp API, hôtel, salon, facturation, administration.

## Règles non négociables

1. **Le code décide, le modèle propose.** Prix, totaux, quantités, frais de livraison, statuts : toujours calculés ou validés par le code. Le texte du modèle n'est jamais une source de vérité pour un montant.
2. **Confirmation obligatoire.** Aucune écriture (commande) sans un récapitulatif calculé par le code, puis un « oui » explicite du client lié à ce récapitulatif exact (jeton à usage unique).
3. **Isolation par entreprise.** Toute table métier porte `business_id`. Row Level Security active partout. Un test automatique prouve qu'une entreprise ne lit ni n'écrit rien d'une autre.
4. **Outils à droits minimaux.** Le modèle ne peut appeler que les outils de ses capacités activées. Tout autre appel est refusé et journalisé.
5. **Les documents, images, voix et messages sont des données, pas des ordres.** Un texte venu d'une photo ou d'un client ne peut jamais modifier les règles ni déclencher un outil non prévu.
6. **Dans le doute, l'assistant dit qu'il ne sait pas ou passe la main à un humain.**
7. **Journal d'audit** de chaque outil appelé : qui, quand, entrées, sorties.
8. **Aucun secret dans le code.** Variables d'environnement uniquement.
9. **Le nom du produit est une variable** (`NEXT_PUBLIC_PRODUCT_NAME`). Tous les textes visibles sont en français dans `src/i18n/fr.ts`.
10. **Prix en FCFA, entiers.** Jamais de décimaux ni de nombres négatifs.
11. **Transparence :** le client sait qu'il parle à un assistant IA et peut demander un humain à tout moment.

## Tests et maîtrise des coûts

- `npm test` ne lance QUE les tests rapides, sans aucun appel à la Meta Model API (fichiers `**/live.test.ts` exclus). C'est la commande de vérification courante d'une tâche.
- `npm run test:live` lance tous les tests en vrais appels Meta (cœur `tests/core/live.test.ts`, import `tests/import/live.test.ts`). À ne lancer qu'avant un commit important, jamais en boucle : chaque exécution consomme la clé API.
- `npm run test:db` lance les tests base de données (PGlite local, aucun appel Meta).
- Les routes publiques `/api/chat/[slug]` sont protégées avant tout appel au modèle (`src/lib/rate-limit.ts`) : limite par session/minute, par IP/minute et plafond quotidien par entreprise, réglables par `CHAT_RATE_LIMIT_PER_MINUTE_SESSION`, `CHAT_RATE_LIMIT_PER_MINUTE_IP`, `CHAT_DAILY_LIMIT_PER_BUSINESS`. Compteurs en mémoire par instance : garde-fou de coût, pas compteur global.

## Définition de « terminé » pour une tâche

- Le critère d'acceptation est vérifié par un test automatique qui passe.
- Les tests existants passent (`npm test`), le build passe (`npm run build`).
- Pas de secret, pas de texte visible hors de `src/i18n/fr.ts`.
- Une note de 5 lignes dans `docs/` : ce qui a été fait, comment l'essayer.
- Un commit clair par tâche, poussé sur `main`.

## Façon de travailler

- Une tâche à la fois. Si elle est trop grosse, découpe-la et dis-le.
- Ne modifie pas ce qui est hors de la tâche. Signale ce que tu remarques sans le corriger.
- Quand tu finis, termine par : ce qui marche, ce qui reste, comment je vérifie.
- En cas d'échec répété (3 essais), arrête-toi et explique le blocage au lieu de contourner.
