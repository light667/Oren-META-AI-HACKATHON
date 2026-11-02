/**
 * Narration de la vidéo de démonstration — source unique des textes.
 * - `voEn` / `voFr` : voix off (fichiers voix-off-en.txt / voix-off-fr.txt).
 * - Les sous-titres .srt sont générés par demo-compose.ts à partir d'ici et
 *   des durées RÉELLES des segments montés (jamais d'horodatage inventé).
 * - `targetSec` : durée cible de la scène au montage (plan), pas une mesure.
 */
export interface DemoSceneNarration {
  id: string;
  targetSec: number;
  voEn: string;
  voFr: string;
}

export const NARRATION: DemoSceneNarration[] = [
  {
    id: "s1-probleme",
    targetSec: 15,
    voEn: "In Lomé, a restaurant owner answers every order by hand, in the middle of service. Orders get missed, and most tools are built for big companies, in English.",
    voFr: "À Lomé, un restaurateur prend chaque commande à la main, en plein service. Des commandes sont manquées, et la plupart des outils sont pensés pour les grandes entreprises, en anglais.",
  },
  {
    id: "s2-promesse",
    targetSec: 15,
    voEn: "Oren gives any small business an AI assistant in under an hour. It answers customers in French, from real business data, and it acts: it takes orders. Built with Meta's Muse models.",
    voFr: "Oren donne à toute petite entreprise un assistant IA en moins d'une heure. Il répond aux clients en français, à partir des vraies données de l'entreprise, et il agit : il prend les commandes. Construit avec les modèles Muse de Meta.",
  },
  {
    id: "s3-mise-en-route",
    targetSec: 35,
    voEn: "The owner photographs the paper menu. Muse Spark's vision reads dishes and prices. A voice message, transcribed by Muse Voice, sets hours and delivery zones. Nothing goes live until the owner checks it.",
    voFr: "Le patron photographie son menu papier. La vision de Muse Spark lit les plats et les prix. Un message vocal, transcrit par Muse Voice, définit les horaires et les zones de livraison. Rien n'est publié tant que le patron n'a pas vérifié.",
  },
  {
    id: "s4-client",
    targetSec: 45,
    voEn: "A customer opens the link. No app, no account. The assistant answers from real data and prepares the order. The total is computed by code, never by the model, and nothing is saved until the customer confirms that exact summary.",
    voFr: "Un client ouvre le lien. Ni application, ni compte. L'assistant répond à partir des vraies données et prépare la commande. Le total est calculé par le code, jamais par le modèle, et rien n'est enregistré tant que le client n'a pas confirmé ce récapitulatif exact.",
  },
  {
    id: "s5-patron",
    targetSec: 25,
    voEn: "The owner sees the order instantly, with an alert. The customer's tracking updates live. The owner can take over any conversation, or switch the assistant off, at any time.",
    voFr: "Le patron voit la commande immédiatement, avec une alerte. Le suivi du client se met à jour en direct. Le patron peut reprendre n'importe quelle conversation, ou couper l'assistant, à tout moment.",
  },
  {
    id: "s6-fiable",
    targetSec: 25,
    voEn: "Because it acts, it has to be safe. The code decides prices and totals; the model only proposes. Each business is isolated and tested. Injected instructions are treated as data, not orders.",
    voFr: "Parce qu'il agit, il doit être sûr. Le code décide des prix et des totaux ; le modèle ne fait que proposer. Chaque entreprise est isolée et testée. Les instructions injectées sont traitées comme des données, pas comme des ordres.",
  },
  {
    id: "s7-fin",
    targetSec: 10,
    voEn: "Oren starts with restaurants in Lomé, and is designed for hotels, salons and schools. Small businesses in francophone Africa deserve assistants that work for them. This is Oren.",
    voFr: "Oren commence avec les restaurants à Lomé, et il est conçu pour les hôtels, les salons et les écoles. Les petites entreprises d'Afrique francophone méritent des assistants qui travaillent pour elles. Voici Oren.",
  },
];
