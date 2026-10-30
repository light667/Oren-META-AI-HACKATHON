# Initialisation (2026-10-30)

Projet Next.js (TypeScript, App Router, Tailwind v4, shadcn/ui avec button/card/input/dialog, Vitest, Zod) créé à la racine, structure AGENTS.md en place, textes visibles dans `src/i18n/fr.ts`.
Fournisseurs remplaçables créés : `src/providers/llm` (interface `chat`/`transcribe` + implémentation Meta Model API + factice), `payment` (espèces + factice), `notification` (factice + console), `sms` (interface seule, factice qui n'envoie rien).
Smoke test réel : `npm run smoke` affiche OK/ÉCHEC pour (a) texte, (b) outil, (c) JSON, (d) image `test/menu.jpg`, (e) audio — résultats honnêtes dans `docs/API_NOTES.md`.
Pour l'essayer : mettre `MODEL_API_KEY` dans `.env.local`, déposer `test/voix.wav`, puis `npm run smoke` ; `npm test` et `npm run build` passent déjà sans clé.
Reste : clé API réelle, fichier audio de test, photo de menu en meilleure résolution (voir `docs/QUESTIONS.md`).
