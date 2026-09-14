# Habit Tracker

A static habit tracker + PPL workout schedule, backed by Firebase Firestore.

## Structure

```
.
├── index.html              Entry point
├── manifest.json            PWA manifest
├── firestore.rules          Reference copy of Firestore Security Rules
│                            (the real ones live in the Firebase console)
├── .well-known/
│   └── assetlinks.json      Domain verification (must stay at repo root)
├── css/
│   └── style.css
├── js/
│   ├── firebase-config.js   Firebase project config (safe to be public,
│   │                        see comment inside the file)
│   └── script.js            App logic
└── assets/
    └── icons/                App icons
```

## Running locally

No build step needed — it's plain HTML/CSS/JS. Serve the folder with any
static server, e.g.:

```
npx serve .
```

or

```
python -m http.server 8000
```

Then open the printed local URL in your browser.

## Security notes

- `js/firebase-config.js` contains Firebase's public client config. This is
  expected to be public in Firebase apps — it identifies the project, it
  does not grant access by itself.
- Actual data access is controlled by Firestore Security Rules, set in the
  Firebase console (kept in sync here in `firestore.rules` for reference).
- For extra hardening, restrict the API key in Google Cloud Console
  (APIs & Services > Credentials) to your deployed domain(s).
