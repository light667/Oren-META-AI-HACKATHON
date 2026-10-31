# Déclenchement de l'e-mail de secours : pourquoi pas le cron Vercel gratuit

## Le piège (vérifié dans la documentation officielle Vercel)

La route `/api/cron/order-alerts` envoie l'e-mail de secours quand une commande reçue n'est pas acceptée après le délai réglable (3 minutes par défaut). Elle doit donc être appelée **toutes les minutes**.

Or, sur le forfait gratuit Vercel (**Hobby**) : les cron jobs sont limités à **une exécution par jour**, avec une précision « à l'heure près ». Pire : une expression plus fréquente qu'une fois par jour (comme notre ancien `* * * * *`) **fait échouer le déploiement** avec « Hobby accounts are limited to daily cron jobs ». Source : [Usage & Pricing for Cron Jobs](https://vercel.com/docs/cron-jobs/usage-and-pricing) — « Hobby | Once per day | Per-hour (±59 min) ».

Donc : ne jamais remettre `* * * * *` dans `vercel.json` tant que le projet est en Hobby. Le cron Vercel restant (`0 12 * * *`, une fois par jour à midi UTC) n'est qu'un filet de sécurité si le déclencheur principal tombe ; il ne sert pas le délai de 3 minutes.

## La solution retenue : cron-job.org (gratuit), toutes les minutes

[cron-job.org](https://cron-job.org/en/faq/) est gratuit, exécute jusqu'à 60 fois par heure (donc toutes les minutes) et accepte des en-têtes HTTP personnalisés — exactement ce qu'il faut pour appeler notre route protégée. Aucun code à changer : la route accepte déjà GET et POST, avec l'en-tête `x-cron-secret` ou `Authorization: Bearer`.

### Configuration pas à pas (5 minutes, une seule fois)

1. Déployer le projet (ou utiliser le domaine de production, par ex. `https://VOTRE-DOMAINE`).
2. Créer un compte gratuit sur [cron-job.org](https://cron-job.org), puis « Create cronjob » :
   - **Title** : `Oren - alertes commandes`
   - **URL** : `https://VOTRE-DOMAINE/api/cron/order-alerts`
   - **Schedule** : every **1 minute(s)**
   - **Request method** : GET
3. Dans « Advanced » (ou l'onglet des en-têtes), ajouter l'en-tête :
   - Name : `x-cron-secret`
   - Value : la valeur de `CRON_SECRET` (la même que dans les variables d'environnement du projet, jamais en clair dans un dépôt).
4. Enregistrer, puis « Run now » / tester le job : la réponse attendue est `{"sent":0}` (ou un nombre supérieur si une alerte part). Un `401` signifie que l'en-tête ne correspond pas à `CRON_SECRET` ; un `503` signifie que `CRON_SECRET` n'est pas configuré côté serveur.
5. Laisser le job actif. En cas de panne du service, cron-job.org signale les échecs, et le cron Vercel quotidien prend le relais comme filet.

Vérification rapide depuis un terminal (sans navigateur) :

```bash
curl -H "x-cron-secret: VOTRE_CRON_SECRET" https://VOTRE-DOMAINE/api/cron/order-alerts
# -> {"sent":0}
```

## Alternatives gratuites, si cron-job.org ne convient pas

- **Supabase `pg_cron` + `pg_net`** : planifier dans la base elle-même un appel HTTP minuté vers la même route. Reste dans l'écosystème déjà utilisé, mais demande d'activer les extensions et de stocker l'URL + le secret dans une table de configuration protégée. À privilégier si l'on veut éviter tout service tiers.
- **GitHub Actions** (`schedule: */5 * * * *`) : gratuit dans une certaine limite de minutes, mais granularité réelle souvent supérieure à 5 minutes et dépôt public = pas de secret dans le workflow (utiliser les secrets GitHub). Acceptable en dépannage, moins précis.
- **Passer Vercel en Pro** : le cron natif toutes les minutes redevient possible (`* * * * *` dans `vercel.json`), au prix de l'abonnement. Aucun changement de code, seulement de forfait et d'expression.

## Ce qui ne change pas

Le délai reste réglable par entreprise (« Mon entreprise », défaut 3 minutes), un e-mail déjà envoyé n'est jamais renvoyé (`fallback_email_sent_at`), et l'envoi passe toujours par `NotificationProvider` (Resend si `RESEND_API_KEY` / `EMAIL_FROM` sont définis). Sans compte Resend, la route répond mais ne peut rien envoyer : `sent` reste à 0.
