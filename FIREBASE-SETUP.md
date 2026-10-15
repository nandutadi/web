# Firebase setup for Thanvis Orders

Orders and categories sync through **Cloud Firestore** so phone and laptop share the same data.

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

## 5. Security rules + page allowlist

Firestore → **Rules** → publish (use your real emails):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAllowed() {
      return request.auth != null
        && request.auth.token.email in [
          "nandatadi12344@gmail.com",
          "sathvis4@gmail.com"
        ];
    }

    match /orders/{orderId} {
      allow read, write: if isAllowed();
    }

    match /settings/{docId} {
      allow read, write: if isAllowed();
    }
  }
}
```

Also put the **same emails** in `auth-config.js`:

```js
window.THANVIS_ALLOWED_EMAILS = [
  "nandatadi12344@gmail.com",
  "sathvis4@gmail.com"
];
```

- Firestore rules protect orders + categories (`settings/categories`)
- `auth-config.js` locks every page (home, orders) behind Google sign-in for those emails only

## 6. Connect the website

The Thanvi Arts Firebase config is already built into the app, so every signed-in device syncs automatically.

1. Open `orders.html` (local or GitHub Pages)
2. Click **Sign in with Google**
3. Status pill should say **Synced · your@email.com**
4. Existing local orders and categories upload once automatically

## What syncs

| Data | Firestore path |
|------|----------------|
| Orders | `orders/{orderId}` |
| Categories (types + nested subs + images) | `settings/categories` |

## 7. Test

1. Add an order on your laptop
2. Open the same site on your phone → order should appear
3. Edit categories → should appear on the other device
4. Toggle Completed / Delivered / Paid → should update everywhere

## Notes

- The app loads from **browser cache first** (`localStorage` + Firestore IndexedDB persistence), then syncs in the background
- Status pill shows `Cached` while serving local data, then `Synced` after the server confirms
- Export JSON backups still work from the ↓ button
- Large subcategory images count toward the Firestore document size limit (1 MB for `settings/categories`). Keep photos small (the app already compresses uploads)
