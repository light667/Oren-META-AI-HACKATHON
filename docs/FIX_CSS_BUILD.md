# Correctif affichage + build (CSS Tailwind v4, clés i18n)

1. Cause de l'écran sans style : `src/app/globals.css` utilise la syntaxe Tailwind v4
   (`@custom-variant`, `@theme`), mais aucun plugin CSS n'était branché, donc Next.js
   ignorait tout le CSS.
2. Premier essai (config PostCSS + `@tailwindcss/postcss`) : OK en `next build`, mais
   `next dev` sous Turbopack échouait avec `Cannot find module '@tailwindcss/postcss'`
   (le runtime Turbopack n'arrive pas à charger la config PostCSS).
3. Correctif retenu : intégration native Turbopack documentée par Tailwind
   (`turbopack.rules` sur `*.css` avec `@tailwindcss/turbopack` dans `next.config.ts`,
   paquet déjà présent en devDependencies). `postcss.config.mjs` supprimé, aucune
   dépendance ajoutée. Aucun changement visuel, le design existant s'applique enfin.
4. Le build révélait aussi 10 erreurs TypeScript : `public-chat.tsx` et `chat-menu.tsx`
   utilisaient des clés i18n inexistantes. Renommées vers les clés existantes
   (`paymentLabel`, `paymentDelivery`, `confirmedTitle`, `confirmedBody`, `menuEmpty`) ;
   `rateLimitBlocked` et `orderSteps` (Reçue / En préparation / Prête / Livrée) ajoutés
   à `src/i18n/fr.ts`, sans doublon de texte.
5. Vérifié : `npm run build` passe sans warning CSS ni erreur TS ; `npm test` : 161 tests
   OK ; `npm run dev` sert `/` en HTTP 200 (était 500). Pour essayer : `npm run dev`,
   ouvrir http://localhost:3000. Reste signalé : textes en dur dans `public-chat.tsx`
   (« Votre reçu : », « Panier (… plats) ») à déplacer vers `fr.ts`.
