# Thanvis order tracking

Static site for Thanvis Art Gallery order tracking, with room for upcoming studio modules. Ready for [GitHub Pages](https://pages.github.com/).

## Pages

| Path | App |
|------|-----|
| `/` | Hub — Orders + upcoming modules |
| `/orders.html` | Candle & resin order tracker |

All paths are relative, so the site works at both:

- `https://nandutadi.github.io/web/`
- a custom domain (optional)

## Enable GitHub Pages

1. Push this repo to GitHub (branch `main`).
2. Open **Settings → Pages**.
3. Under **Build and deployment**:
   - **Source:** Deploy from a branch
   - **Branch:** `main` / `/ (root)`
4. Save, wait a minute, then open the site URL shown on that page.

Or use the included GitHub Actions workflow (Settings → Pages → Source: **GitHub Actions**). After the first push to `main`, approve/run the workflow if prompted.

## Local preview

Open `index.html` in a browser, or from this folder:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Notes

- **Orders** sync with Firebase Firestore across devices. See [FIREBASE-SETUP.md](FIREBASE-SETUP.md).
- Without Firebase, data stays in the browser (`localStorage`).
- Export JSON backups from Orders regularly.
- `.nojekyll` disables Jekyll processing on GitHub Pages.
