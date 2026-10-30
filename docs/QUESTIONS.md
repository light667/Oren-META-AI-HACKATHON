# Questions ouvertes

Points non tranchés, à confirmer plutôt qu'à deviner (règle AGENTS.md).

## Meta Model API (vérifiés dans la doc officielle le 2026-10-30, voir API_NOTES.md)

- [x] Base URL, auth, noms de modèles : `https://api.meta.ai/v1`, `MODEL_API_KEY`, `muse-spark-1.3`, `muse-voice-transcribe-1.0`.
- [x] Format image en Chat Completions et format WAV pour la transcription : voir API_NOTES.md.
- [ ] La disponibilité géographique (Togo) des modèles payants est-elle confirmée pour notre compte ? La doc signale que la disponibilité varie par pays.
- [ ] Faut-il préférer la Responses API (raisonnement rejoué entre tours) à Chat Completions pour la boucle d'outils de l'assistant ? Chat Completions ne conserve pas le raisonnement entre tours (doc « Chat Completions »).

## Produit

- [ ] Fichier audio de test pour le smoke test (e) : déposer `test/voix.wav` (WAV PCM mono 16/24 kHz) ou `test/voix.m4a` + installer ffmpeg pour la conversion. Aucun fichier audio n'est présent au 2026-10-30.
- [ ] Clé API : créer une clé dans le dashboard dev.meta.ai et la mettre dans `.env.local` (`MODEL_API_KEY`), puis relancer `npm run smoke`.
