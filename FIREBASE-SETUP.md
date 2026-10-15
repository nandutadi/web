# Firebase setup for Thanvis Orders

Orders sync through **Cloud Firestore** so phone and laptop share the same data.

## 1. Create a Firebase project

1. Open [Firebase Console](https://console.firebase.google.com/)
2. **Add project** → name it e.g. `thanvis-orders`
3. Disable Google Analytics if you do not need it → **Create project**

## 2. Register a web app

1. Project overview → **Add app** → **Web** (`</>`)
2. App nickname: `thanvis-web`
3. Do **not** need Firebase Hosting for GitHub Pages
4. Register → copy the `firebaseConfig` object (apiKey, authDomain, projectId, …)

## 3. Create Firestore

1. Build → **Firestore Database** → **Create database**
2. Start in **production mode**
3. Pick a region close to you (e.g. `asia-south1`)

## 4. Enable Google sign-in

1. Build → **Authentication** → **Get started**
2. **Sign-in method** → **Google** → Enable → Save
3. **Authentication → Settings → Authorized domains**  
   Add: `localhost`, `nandutadi.github.io` (and any custom domain)

## 5. Security rules

Firestore → **Rules** → publish:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /orders/{orderId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Only signed-in Google users can read/write orders.

## 6. Connect the website

The Thanvi Arts Firebase config is already built into `orders.html`, so every device that opens the site syncs automatically — no paste step.

1. Open `orders.html` (local or GitHub Pages)
2. Click **Sign in with Google**
3. Status pill should say **Synced · your@email.com**
4. Existing local orders upload once automatically

## 7. Test

1. Add an order on your laptop
2. Open the same site on your phone → order should appear
3. Toggle Completed / Delivered / Paid → should update everywhere

## Notes

- Config is stored in that browser’s `localStorage` (not in the git repo)
- Export JSON backups still work from the ↓ button
- Large tile images count toward each Firestore document size limit (1 MB). Keep photos small (the app already compresses uploads)
