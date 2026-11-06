# E-mail de vérification Firebase : modèle Oren (à coller dans la console)

Sans domaine à soi, l'e-mail part de `noreply@ai-oren.firebaseapp.com` et peut arriver en spam. Ces réglages ne règlent pas la délivrabilité, mais rendent l'e-mail clairement identifiable comme venant d'Oren. Ils se font dans la console Firebase, projet `ai-oren` ; aucun code n'est nécessaire.

## 1. Nom public du projet (remplace « project-752675618 »)
Paramètres du projet (roue dentée) > Général > **Nom public** : `Oren`
C'est la valeur de `%APP_NAME%` dans tous les e-mails.

## 2. Modèle « Vérification de l'adresse e-mail »
Authentication > Templates > Vérification de l'adresse e-mail > crayon. Langue du modèle : **Français** (le site envoie `languageCode = "fr"`).

- **Nom de l'expéditeur** : `Oren`
- **Répondre à** : votre adresse de contact (ex. une boîte Gmail dédiée « Oren »)
- **Objet** : `Oren · Confirmez votre adresse e-mail`
- **Message** (si la console permet de le modifier pour ce modèle) :

```html
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1E1B4B">
  <p style="font-size:22px;font-weight:bold;color:#7C3AED;margin:0 0 16px">Oren</p>
  <p style="font-size:16px;margin:0 0 12px">Bonjour,</p>
  <p style="font-size:16px;line-height:1.5;margin:0 0 20px">
    Vous venez de créer votre espace <strong>Oren</strong>, l'assistant qui prend les commandes
    de votre restaurant. Confirmez l'adresse <strong>%EMAIL%</strong> pour l'activer :
  </p>
  <p style="margin:0 0 24px">
    <a href="%LINK%" style="display:inline-block;background:#F97316;color:#ffffff;font-weight:bold;
       text-decoration:none;padding:12px 22px;border-radius:8px;border:2px solid #1E1B4B">
      Confirmer mon adresse
    </a>
  </p>
  <p style="font-size:13px;color:#64748B;line-height:1.5;margin:0 0 8px">
    Le bouton ne marche pas ? Copiez ce lien dans votre navigateur :<br>%LINK%
  </p>
  <p style="font-size:13px;color:#64748B;line-height:1.5;margin:16px 0 0">
    Vous n'êtes pas à l'origine de cette demande ? Ignorez simplement cet e-mail.<br>
    L'équipe Oren · Lomé, Togo
  </p>
</div>
```

Variables reconnues par Firebase : `%LINK%` (lien de vérification), `%EMAIL%` (adresse du destinataire), `%APP_NAME%` (nom public), `%DISPLAY_NAME%`.
Si la console indique que le message de ce modèle n'est pas modifiable, les réglages 1 et 2 (nom, objet, expéditeur) suffisent déjà à remplacer « project-752675618 » par « Oren ».

## 3. Lien vers le site Oren au lieu de la page Google
Toujours dans Templates > crayon > **Personnaliser l'URL d'action** : `https://<domaine-prod>/auth/action` (en local : `http://localhost:3000/auth/action`). Le lien mène alors à la page Oren qui vérifie l'adresse et ouvre l'espace.

## 4. Pour sortir réellement du spam
Il faut un domaine (ex. `oren.tg`, `getoren.com`) : Templates > **Domaine personnalisé**, puis ajouter chez le registraire les enregistrements DNS que Firebase affiche (SPF, DKIM). Les e-mails partent alors de `noreply@votre-domaine` et sont authentifiés.
