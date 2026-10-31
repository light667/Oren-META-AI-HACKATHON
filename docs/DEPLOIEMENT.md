# Mise en ligne sur Vercel — étapes à faire vous-même

Le code est prêt à déployer tel quel. Ces étapes demandent vos comptes (Vercel, Supabase, Resend, cron-job.org) : je ne peux pas les faire à votre place.

## 1. Supabase (déjà en place, à vérifier)

1. Dans le SQL Editor, coller `supabase/apply_all.sql` puis `supabase/seed.sql` (entreprise de démonstration « Chez Chef T », adresse publique `/chez-chef-t`).
2. En local : `npm run check:remote` doit afficher OK partout.

## 2. Vercel

1. vercel.com → Add New → Project → importer ce dépôt GitHub, branche `main`. Framework détecté : Next.js, rien à changer.
2. Dans Settings → Environment Variables (Production), ajouter — valeurs depuis votre `.env` local, jamais dans le dépôt :
   - `NEXT_PUBLIC_PRODUCT_NAME=Oren`
   - `MODEL_API_KEY` (clé Meta Model API)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
   - `RESEND_API_KEY`, `EMAIL_FROM` (nécessite un compte Resend et un domaine vérifié)
   - `CRON_SECRET` (une longue chaîne aléatoire, la même qu'à l'étape 3)
   - Optionnel : `ORDER_ALERT_DELAY_MINUTES=3`, `CHAT_RATE_LIMIT_PER_MINUTE_SESSION=12`, `CHAT_RATE_LIMIT_PER_MINUTE_IP=60`, `CHAT_DAILY_LIMIT_PER_BUSINESS=1000`
3. Deploy. Le plan gratuit (Hobby) suffit ; attention, ses crons sont limités à 1×/jour, d'où l'étape 3.

## 3. E-mail de secours toutes les minutes (cron-job.org)

Le forfait gratuit Vercel n'exécute un cron qu'une fois par jour : le filet quotidien `vercel.json` ne remplace pas le délai de 3 minutes. Créer un compte gratuit sur cron-job.org : URL `https://VOTRE-DOMAINE/api/cron/order-alerts`, toutes les minutes, en-tête `x-cron-secret: VOTRE_CRON_SECRET`. Détail : `docs/ALERTES_CRON.md`.

## 4. Vérification publique (le critère)

1. Ouvrir `https://VOTRE-DOMAINE/` : la promesse, les trois bénéfices et le bouton « Essayer l'assistant de démonstration » doivent apparaître (mode sombre, lisible sur téléphone).
2. Cliquer : vous arrivez sur `/chez-chef-t`. Demander les horaires, commander deux plats, donner nom et numéro, choisir « payer à la livraison », cliquer « Je confirme ».
3. La commande doit apparaître dans l'espace patron connecté (avec le son), et son statut doit revenir à l'écran du client sans rechargement.

Avant chaque déploiement important : `npm test`, `npm run test:live` (vrais appels Meta, à lancer seulement à ce moment-là), `npm run build`.
