"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { browserLocalPersistence, getAuth, setPersistence, type Auth } from "firebase/auth";

/**
 * Client Firebase (navigateur). La configuration web Firebase est
 * publique par conception (elle identifie le projet, elle ne donne
 * aucun droit) ; elle reste néanmoins dans les variables d'environnement.
 */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  config.apiKey && config.authDomain && config.projectId,
);

let auth: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase non configuré : variables NEXT_PUBLIC_FIREBASE_* requises.");
  }
  if (!auth) {
    const app: FirebaseApp = getApps().length ? getApp() : initializeApp(config);
    auth = getAuth(app);
    auth.languageCode = "fr";
    void setPersistence(auth, browserLocalPersistence).catch(() => {});
  }
  return auth;
}
