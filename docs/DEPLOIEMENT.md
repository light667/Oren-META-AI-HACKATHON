# Mise en ligne sur Vercel — étapes à faire vous-même

Le code est prêt à déployer tel quel. Ces étapes demandent vos comptes (Vercel, Supabase, Firebase, Resend, cron-job.org) : je ne peux pas les faire à votre place.

## 1. Supabase (déjà en place, à vérifier)

1. Dans le SQL Editor, coller `supabase/apply_all.sql` puis `supabase/seed.sql` (entreprise de démonstration « Chez Chef T », adresse publique `/chez-chef-t`).
2. **Projet déjà initialisé :** n'exécuter que `supabase/migrations/20261106000100_firebase_identities.sql` (liaison Firebase → Supabase). Sans elle, la connexion échoue.
3. En local : `npm run check:remote` doit afficher OK partout.

## 1 bis. Firebase (connexion des patrons)

1. console.firebase.google.com → créer (ou ouvrir) le projet → Ajouter une application **Web** → copier la configuration.
2. Authentication → Sign-in method : activer **E-mail/Mot de passe** et **Google**.
3. Authentication → Settings → **Authorized domains** : ajouter le domaine de prod (et `localhost` pour le développement).
4. Optionnel : Authentication → Templates : passer les e-mails en français et personnaliser l'expéditeur.
Détail du fonctionnement : `docs/AUTH_FIREBASE.md`.

## 2. Vercel

1. vercel.com → Add New → Project → importer ce dépôt GitHub, branche `main`. Framework détecté : Next.js, rien à changer.
2. Dans Settings → Environment Variables (Production), ajouter — valeurs depuis votre `.env` local, jamais dans le dépôt :
   - `NEXT_PUBLIC_PRODUCT_NAME=Oren`
   - `MODEL_API_KEY` (clé Meta Model API)
   - `NEXT_PUBLIC_SITE_URL` (ex. `https://oren.vercel.app` : liens des e-mails, QR code, SEO)
   - Relais IA : `MISTRAL_API_KEY`, `MISTRAL_CHAT_MODEL=ministral-8b-latest`, `GEMINI_API_KEY` (optionnel), `LLM_TIMEOUT_MS=30000`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`
   - Optionnel : `NEXT_PUBLIC_CONTACT_WHATSAPP` (lien WhatsApp du pied de page)
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

4. Connexion : `/inscription` → e-mail de vérification Firebase reçu → la page continue seule → `/bienvenue` → espace patron. Se déconnecter puis se reconnecter par mot de passe et par Google.

Avant chaque déploiement important : `npm test`, `npm run test:db`, `npm run check:llm` (vrais appels, une fois), `npm run build`.
