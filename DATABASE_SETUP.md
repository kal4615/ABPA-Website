# Shared Database Setup

This site now saves to Firebase Firestore when `js/firebase-config.js` has real Firebase settings. Until then, it keeps using local browser storage.

## 1. Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Create a project.
3. Add a Web app.
4. Copy the Firebase config object into `js/firebase-config.js`.

## 2. Create Firestore Database

1. In Firebase, open **Firestore Database**.
2. Create a database.
3. Start in production mode if you want to use rules below.

## 3. Admin Login

1. In Firebase, open **Authentication**.
2. Click **Get started**.
3. Enable **Email/Password** sign-in.
4. Add one user for yourself.
5. Copy that user's email into `js/firebase-config.js` as `adminEmail`.
6. The site will ask for only the password when someone clicks **Manage**.

## 4. Firestore Rules

For quick testing, these rules let anyone read and write the league document:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /leagues/abpa {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

Only use open write rules while testing. Anyone who can load the site can change the standings.

For the real site, use these rules after your admin user is created. Copy your admin user's **User UID** from Firebase Authentication and paste it below:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /leagues/abpa {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.uid == "YOUR_ADMIN_UID_HERE";
    }
  }
}
```

## 5. Data Location

The app stores the league state in this Firestore document:

```txt
leagues/abpa
```
