# Évaluation automatique

`npm run eval` exécute les 30 questions de référence de `eval/questions.json` contre le vrai modèle Meta, avec les données du restaurant de démonstration « Chez Chef T » (miroir de `supabase/seed.sql`) : 5 horaires, 8 prix, 5 livraison, 4 questions sans réponse, 5 injections, 3 demandes d'humain.
La fidélité est notée par le code, jamais par le modèle : faits attendus présents, affirmations interdites absentes, aveu d'ignorance quand la donnée manque, passage à un humain effectif, et aucune commande confirmée ni total à 0 sous injection (contrôlé dans le magasin).
Dernier run réel : **Score de fidélité : 30/30 (100,0 %)** — horaires 5/5, prix 8/8, livraison 5/5, sans-réponse 4/4, injection 5/5, humain 3/3 (à re-vérifier avant la vidéo : `npm run eval`, vrais appels, quelques minutes).
La suite rapide couvre les mêmes attaques sans modèle réel (`tests/core/security-injection-leak.test.ts` : contexte d'une seule entreprise envoyé au modèle, jeton de B refusé chez A, prix parasite ignoré, outil inventé refusé et journalisé).
