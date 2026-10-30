# API Notes — Meta Model API

Date de vérification : 2026-10-30. Sources : documentation officielle
[dev.meta.ai/docs](https://dev.meta.ai/docs) (pages Overview, Quickstart,
Authentication, Models, Tool calling, Structured output, Image understanding,
Speech to text, Chat Completions, Pricing and rate limits), lues le même jour.
Aucun format ci-dessous n'est supposé : tout vient de ces pages.

## Ce qui est confirmé par la documentation

### Base, authentification, protocoles

| Élément | Valeur exacte |
| --- | --- |
| Base URL | `https://api.meta.ai/v1` |
| Auth | `Authorization: Bearer <clé>`, variable d'environnement `MODEL_API_KEY` |
| Clé | Dashboard dev.meta.ai → API keys → Create API key. Le SDK OpenAI ne lit pas `MODEL_API_KEY` tout seul : passer la clé explicitement ou copier dans `OPENAI_API_KEY`. |
| Protocoles | Responses `POST /v1/responses`, Chat Completions `POST /v1/chat/completions`, Messages (compatible Anthropic, base `https://api.meta.ai`). Même modèles, même auth. |
| Choix Oren | Chat Completions (format `messages`, le plus simple). Limite connue : Chat Completions ne conserve pas le raisonnement entre tours ; la doc recommande Responses pour les boucles d'agent multi-étapes. À trancher, voir QUESTIONS.md. |

### Modèles exacts (page Models)

| Modèle | ID exact | Entrée → sortie | Contexte |
| --- | --- | --- | --- |
| Muse Spark 1.3 (recommandé, défaut des exemples) | `muse-spark-1.3` | texte, image, vidéo, audio, PDF → texte | 1 048 576 tokens, sortie max 131 072 |
| Muse Spark 1.2 / 1.1 | `muse-spark-1.2`, `muse-spark-1.1` | idem | 1 048 576 |
| Muse Spark Contributor (moins cher, contenu utilisable pour l'entraînement) | `muse-spark-1.3-contributor`, `muse-spark-1.2-contributor` | idem | 1 048 576 |
| Muse Wonder (plus capable, preview, pay-as-you-go uniquement) | `muse-wonder-1.0` | texte, image, vidéo, audio, PDF → texte | 1 048 576 |
| Muse Image | `muse-image-1.0` | texte, image → image (`/v1/images/generations`, `/v1/images/edits`) | — |
| Muse Voice Transcribe | `muse-voice-transcribe-1.0` | audio → texte | — |
| SAM 3.1 | `sam-3.1` | prompt texte + image/vidéo → boîtes et masques | — |

Notes doc : audio « understanding » dégradé sur Spark 1.3 (utiliser 1.2 ou Voice
Transcribe pour l'audio). `muse-spark-1.1` : Standard uniquement, absent de Muse
Code. Wonder : pas de mode Contributor en pay-as-you-go, indisponible en Corée du
Sud. La disponibilité varie par pays (Geographic Use Policy) — Togo à confirmer.

### Formats par capacité (Chat Completions)

- **Texte** : `POST /v1/chat/completions`, body `{model, messages:[{role, content}]}`.
  Rôles : `developer` (le plus prioritaire), `system` (compat, même niveau que
  `developer`), `user`, `assistant`, `tool`. Réponse : texte dans
  `choices[0].message.content`, usage dans `usage.{prompt,completion,total}_tokens`.
  Streaming SSE avec `stream:true` (évite le 504 des longues réponses non streamées).
- **Outils** : `tools:[{type:"function", function:{name, description, parameters}}]`
  (en Responses, les champs sont à plat, sans le niveau `function`). Noms :
  `^[a-zA-Z0-9_.-]+$`, un point maximum. Réponse : `choices[0].message.tool_calls[]`
  avec `function.name` et `function.arguments` (chaîne JSON). On exécute nous-mêmes
  et on répond par un message `role:"tool"` avec `tool_call_id`. Les outils `custom`
  (texte libre) sont Responses uniquement : `{"type":"custom"}` en Chat Completions → HTTP 400.
- **JSON structuré** : `response_format:{type:"json_schema", json_schema:{name, schema, strict?}}`.
  Le JSON conforme arrive en chaîne dans `choices[0].message.content`. Limites schéma :
  profondeur 10, 5 000 propriétés, énumérations 1 000 valeurs, schémas récursifs rejetés (HTTP 400).
- **Image** : uniquement dans un message `user`, `content:[{type:"text",text},{type:"image_url",image_url:{url}}]`.
  `url` = URL publique ou `data:image/jpeg;base64,...`. Max 50 images/requête,
  50 Mo par image en inline (1 Gio via Files API), MIME : jpeg, jpg, png, gif, webp, x-icon.
  Image illisible/corrompue → HTTP 400. Coût proportionnel à la résolution (~1 300–1 500 tokens pour ~1 280 px).
- **Audio (transcription)** : modèle dédié, pas Spark. Fichier :
  `POST /v1/asr/transcribe`, multipart avec une partie `request` (JSON :
  `{mode, model:"muse-voice-transcribe-1.0", audioEncoding:"WAV", languageBias?, keywords?}`)
  et une partie `audio`. Temps réel : WebSocket `wss://api.meta.ai/v1/asr/realtime`
  (auth dans le handshake, pas en en-tête HTTP). Réponse JSON :
  `{sessionId, transcript, audioDurationMs, turns:[{turnId,startMs,endMs,transcript,speaker?}]}`.
  Modes : `PUSH_TO_TALK` (défaut), `ENDPOINTING`, `DIARIZATION`. 25 langues dont le
  français, `languageBias:["French"]` possible. Horodatages par tour uniquement,
  pas par mot. Prix : 0,18 $/heure d'audio.

### Prix et limites (Standard, par million de tokens sauf mention contraire)

| Modèle | Entrée | Entrée cachée | Sortie | Limites |
| --- | --- | --- | --- | --- |
| `muse-spark-1.3 / 1.2 / 1.1` | 1,25 $ | 0,15 $ | 4,25 $ | 3 000 req/min, 4 M tokens/min (par équipe) |
| `muse-spark-*-contributor` | 0,10 $ | 0,002 $ | 0,20 $ | 150 req/min, 3 M tokens/min |
| `muse-wonder-1.0` | 4,00 $ | 0,20 $ | 20,00 $ | 3 000 req/min, 4 M tokens/min |
| `muse-image-1.0` | 0,01 $/image | — | — | 150 req/min |
| `muse-voice-transcribe-1.0` | 0,18 $/heure d'audio | — | — | 256 flux simultanés, 16 000 flux/heure |
| `sam-3.1` | 2,50 $/1 000 images ; 0,20 $/1 000 frames vidéo | — | — | 3 000 req/min |

Erreurs documentées : `401 invalid_api_key`, `404 model_not_found`,
`400` (schéma, format, trop d'images), `429` (réessayer en backoff exponentiel,
respecter `Retry-After`), `504 gateway_timeout` (passer en streaming).
En-têtes `x-ratelimit-*` sur les réponses token. Recherche web intégrée
(`web_search`, Responses) : 2,50 $/1 000 requêtes. `reasoning_effort:"none"` → HTTP 400
(Spark raisonne toujours).

## Ce qui a été réellement testé le 2026-10-30

Commande : `npm run smoke` (`scripts/smoke.ts`, vrais appels, rien de simulé).

| Test | Résultat observé | Raison |
| --- | --- | --- |
| (a) texte FR | **ÉCHEC** | `MISSING_API_KEY` : aucune clé dans l'environnement ni `.env.local`. |
| (b) appel d'outil factice | **ÉCHEC** | Même raison, avant tout appel réseau. |
| (c) JSON structuré + validation Zod | **ÉCHEC** | Même raison. |
| (d) image `test/menu.jpg` | **ÉCHEC** | Même raison (le fichier existe et est bien envoyé en data URL dès qu'une clé est là). |
| (e) transcription audio | **ÉCHEC** | Aucun fichier audio dans `test/` (seul `menu.jpg` y est) et aucune clé. |

Sondes réseau sans clé valide (preuve que l'endpoint et le format d'erreur sont réels) :

- `GET https://api.meta.ai/v1/models` sans clé → `401 {"error":{"code":"invalid_api_key","message":"Unauthorized","type":"authentication_error"}}`.
- `POST /v1/chat/completions` avec une clé factice → même `401 invalid_api_key`.

Ce qui prouve le code client sans clé : `npm test` (Vitest, `fetch` simulé) — 6 tests
verts qui vérifient l'URL, l'en-tête Bearer, l'imbrication `tools[].function`,
la lecture de `tool_calls`, `response_format json_schema`, le refus d'un non-WAV
sans appel réseau et le multipart de transcription. Cela ne remplace pas un appel réel.

## Ce qui ne marche pas / risques connus

1. **Aucun appel réel n'a encore réussi** : il manque une clé valide. Créer la clé
   dans le dashboard dev.meta.ai, la mettre dans `.env.local` (`MODEL_API_KEY=...`),
   relancer `npm run smoke`. Tant que ce n'est pas fait, (a)–(e) restent ÉCHEC.
2. **Le M4A n'est pas accepté tel quel** par `/v1/asr/transcribe` : WAV RIFF mono
   PCM 16 bits à 16 ou 24 kHz uniquement, 32 Mo et 10 minutes max. Conversion
   documentée : `ffmpeg -i entree.m4a -ac 1 -ar 24000 -c:a pcm_s16le -map_metadata -1 sortie.wav`.
   Sur cette machine, ffmpeg est **absent** et aucun fichier audio n'est fourni :
   déposer un `test/voix.wav` déjà converti, ou installer ffmpeg.
3. **`test/menu.jpg` est une vignette basse résolution** (225 px de large environ,
   13 Ko) : à l'œil, les sections (Attiéké, Riz au gras, Frites, Alloco, desserts,
   boissons, « Chez CHEF T », Agoè Zilon) se devinent mais les prix sont illisibles.
   Même avec une clé, le test (d) risque de lire peu de prix. Pour la démo, fournir
   une photo nette et plus grande.
4. **Audio dans Spark 1.3 dégradé** (doc Models) : ne pas envoyer l'audio à Spark,
   passer par `muse-voice-transcribe-1.0`. C'est ce que fait notre `transcribe()`.
5. **Raisonner entre tours** : Chat Completions ne rejoue pas le raisonnement.
   Si la boucle d'outils perd le fil, basculer le provider sur Responses
   (`previous_response_id` + `reasoning.encrypted_content`). Voir QUESTIONS.md.

## Refaire la vérification complète

```powershell
# 1. Clé dans .env.local : MODEL_API_KEY=<clé dashboard dev.meta.ai>
# 2. Audio : déposer test/voix.wav (ou test/voix.m4a + ffmpeg installé)
npm run smoke   # attendu : [a]..[e] OK, bilan 5/5, code de sortie 0
npm test        # tests unitaires hors réseau
npm run build   # build de production
```
