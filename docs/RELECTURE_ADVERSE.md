# Relecture adverse — prepare_order / confirm_order

Attaques rejouées d'abord en tests qui échouaient, puis corrigées : accords ambigus
(« oui mais enlève la boisson »), doublons de quantités (60 + 60), plus de 50 lignes,
jeton confirmé depuis une autre session ou une autre conversation, accord donné avant
le récapitulatif, deux confirmations simultanées, nom de plat modifié dans la commande
stockée, description de plat qui fabrique une fausse ligne de menu, traces d'outils
rejouées en rôle système, et `used_at` violant la contrainte base à cause du décalage
d'horloge client/base (trouvé uniquement contre le projet distant).

Corrections : vocabulaire d'accord fermé ; fusion des doublons avant plafonds ;
empreinte du récapitulatif incluant le nom du plat ; jeton lié à la session et à la
conversation de la commande, accord exigé après l'émission du jeton ; consommation
atomique du jeton (`used_at` borné par `created_at` lu en base) ; contexte du modèle
aplati sur une ligne et historique sans rôle système hors consigne.

Essayer : `npm test` (dont `tests/core/adversarial-orders.test.ts` et le magasin réel
sur PGlite, `tests/db/supabase-store-pglite.test.ts`), puis contre le projet distant :
`OREN_REMOTE_TEST=1 npx vitest run tests/db/remote-store.test.ts` (entreprise de test
créée puis supprimée en cascade, vérifiée absente après coup).
