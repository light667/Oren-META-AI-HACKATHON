# Oren — direction de design

À copier dans `docs/DESIGN.md` du dépôt. Toute l'interface suit ce document. Il fixe l'identité, les parcours et la structure des écrans. Il ne change pas la logique métier.

## Principe

Chaleureux, fiable, local. Un commerçant de Lomé doit comprendre le produit en 5 secondes, et un client doit commander en 3 gestes. Pas d'allure « outil technique » : un produit grand public, soigné et rapide. Niveau de clarté visé : celui des meilleurs produits web (Stripe, Linear). Chaleur visée côté client : celle des applications de livraison. Lisibilité du chat visée : celle des messageries.

## Identité

- **Nom :** Oren, lu depuis `NEXT_PUBLIC_PRODUCT_NAME`, jamais écrit en dur.
- **Logo :** le mot « oren » en minuscules, police de titre, précédé d'un petit symbole : une bulle de dialogue arrondie avec un point orange. Simple, en SVG, qui fonctionne en une couleur.
- **Couleurs** (à définir comme variables CSS, avec version sombre) :

| Rôle | Clair | Sombre |
| --- | --- | --- |
| Fond | `#FBF8F3` | `#11100E` |
| Surface (cartes) | `#FFFFFF` | `#1A1816` |
| Texte | `#1C1917` | `#F5F2EC` |
| Texte secondaire | `#6B645C` | `#A59E94` |
| Accent (boutons principaux, liens) | `#C2410C` | `#F97316` |
| Succès | `#15803D` | `#4ADE80` |
| Attention | `#B45309` | `#FBBF24` |
| Erreur | `#B91C1C` | `#F87171` |

  Le texte blanc sur l'accent clair doit garder un contraste d'au moins 4,5. Les statuts de commande ont chacun une couleur distincte : reçue (bleu), acceptée (violet), en préparation (ambre), prête (vert clair), livrée (vert), annulée (gris).
- **Typographie :** titres en « Bricolage Grotesque », texte en « Inter », chargées avec `next/font`. Taille de base 16 px, titres fluides.
- **Formes :** rayons de 12 à 16 px, ombres douces, bordures fines, espaces généreux sur une échelle de 4 px.
- **Icônes :** lucide-react, trait fin.
- **Visuels :** formes géométriques douces et dégradés chauds. Pas de photos de stock. Les photos viennent des commerçants ; sans photo de plat, une tuile colorée avec une icône de la catégorie.
- **Mouvement :** transitions de 150 à 250 ms, apparitions en fondu avec léger glissement, CSS d'abord, `prefers-reduced-motion` respecté.

## Règles d'interface

- Mobile d'abord (390 px), puis tablette et bureau. Zones tactiles d'au moins 44 px, texte d'au moins 16 px.
- Une action principale par écran, bien visible.
- Chaque écran a ses quatre états : chargement (squelettes), vide (illustration et prochaine action), erreur (message humain et bouton Réessayer), succès.
- Français simple et chaleureux, vouvoiement. Aucun jargon visible (pas de « slug », « token », « RLS », « webhook »).
- Montants affichés « 2 000 FCFA » (séparateur d'espace insécable).
- Accessibilité : contraste d'au moins 4,5, focus visible, labels sur tous les champs, navigation au clavier.
- Performance : pages légères, images optimisées, aucune bibliothèque lourde ajoutée sans raison.
- Cohérence : un seul en-tête et un seul pied de page publics, une seule navigation dans l'espace patron, composants shadcn/ui habillés par les variables ci-dessus.
- **Aucun faux contenu :** pas de faux témoignage, de faux chiffre, de faux logo de client ni de fausse note d'avis. Ce qui n'existe pas encore est étiqueté « bientôt ».

## Parcours à relier (aucune impasse)

- **Visiteur :** Accueil, Essayer la démo, Créer mon assistant, Inscription, Bienvenue (assistant de mise en route en 3 étapes), Vérification, Essayer mon assistant, Mon lien et QR code, Espace patron.
- **Client :** lien ou QR code, Chat, Menu et panier, Récapitulatif, Confirmation, Suivi de commande, Reçu, Commander à nouveau.
- **Patron au quotidien :** Commandes en temps réel, Conversations, Menu, Mon entreprise, Équipe.

## Page d'accueil

1. **En-tête :** logo, liens (Comment ça marche, Pour qui, Questions), boutons « Essayer la démo » (secondaire) et « Créer mon assistant » (principal).
2. **Hero :** promesse en une phrase (« Votre assistant répond à vos clients et prend leurs commandes, jour et nuit. »), sous-titre (prêt en moins d'une heure, en français, à partir d'une photo de votre menu), deux boutons, et un téléphone qui montre un vrai chat de démonstration, interactif ou animé.
3. **Comment ça marche, en 3 étapes illustrées :** photographiez votre menu, vérifiez ce que l'assistant a compris, partagez votre lien ou QR code.
4. **Quatre bénéfices :** ne ratez plus aucune commande ; des prix toujours justes (calculés par le programme, pas par l'IA) ; vous gardez la main (reprise humaine, bouton de coupure) ; pensé pour le Togo (FCFA, français).
5. **Confiance :** l'assistant ne confirme jamais une commande sans accord du client ; les données de chaque entreprise sont isolées ; l'assistant se présente toujours comme une IA.
6. **Pour qui :** restaurants (disponible), hôtels, salons, écoles (bientôt).
7. **Questions fréquentes** (6 questions honnêtes : prix, langue, données, que faire si l'assistant se trompe, besoin d'un site web, paiement).
8. **Appel final** et pied de page (mentions, contact, WhatsApp).

## Chat client

- En-tête avec nom et logo du restaurant, statut ouvert ou fermé selon les horaires, retour.
- Message d'accueil et puces d'actions rapides : « Voir le menu », « Passer commande », « Horaires et livraison », « Parler à un humain ».
- Menu en cartes (nom, description, prix, boutons + et −), catégories en onglets, panier flottant dont le total vient du code.
- Bulles type messagerie, indicateur d'écriture, réponse en continu, sources discrètes.
- Carte de récapitulatif propre (lignes, livraison, total, mode de paiement) et bouton « Je confirme » bien visible.
- Suivi de commande : frise d'étapes (Reçue, Acceptée, En préparation, Prête, Livrée) avec heures, reçu, « Commander à nouveau ».
- Mention discrète « Assistant IA, vous pouvez demander un humain ». Bouton WhatsApp discret.

## Espace patron

- **Navigation :** Commandes, Conversations, Menu, Mon entreprise, Équipe, Mise en route, Mon lien et QR. En bas de l'écran sur mobile, barre latérale sur ordinateur.
- **Commandes (page d'accueil) :** colonnes Nouvelles, En préparation, Prêtes, Terminées ; cartes lisibles (numéro, client, plats, total, temps d'attente coloré) ; gros boutons d'action ; interrupteur du son ; badge des nouvelles commandes.
- **Checklist de démarrage** avec progression : menu, horaires, zones de livraison, test de l'assistant, partage du lien.
- **Mise en route guidée en 3 étapes :** Importer (photo, voix ou saisie), Vérifier (lignes à corriger, incertitudes surlignées), Publier puis « Essayer mon assistant » (aperçu du chat).
- **Conversations :** liste et fil type messagerie, étiquette « À reprendre », bouton « Reprendre la main ».
- **Bouton « Couper l'assistant »** clair, avec confirmation.
- **Menu :** liste éditable avec interrupteur « Disponible ».

## Vérification visuelle

Captures de chaque écran principal à 390 px et à 1280 px de large, enregistrées dans `docs/captures/`.
