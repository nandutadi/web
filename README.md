# Thanvis order tracking

Static site for Thanvis Art Gallery order tracking, with room for upcoming studio modules. Ready for [GitHub Pages](https://pages.github.com/).

## Pages

| Path | App |
|------|-----|
| `/` | Hub — Orders + Accounts |
| `/orders.html` | Candle & resin order tracker |
| `/accounts.html` | Amounts billed, received, and outstanding |

All paths are relative, so the site works at both:

- `https://nandutadi.github.io/web/`
- a custom domain (optional)

## Architecture (`orders`)

The orders app follows a clean layered layout with native ES modules (no bundler):

```
orders.html                 # HTML shell + Firebase / auth scripts
css/orders.css              # Orders UI styles
js/
  app/                      # Composition root (bootstrap, state, UI hooks)
  core/                     # Shared constants & utilities
  domain/                   # Pure business rules (orders, catalog)
  data/                     # localStorage + Firestore repositories / sync
  presentation/             # DOM rendering, dialogs, event binding
```

- **Domain** has no DOM or Firebase imports.
- **Data** persists and syncs; UI updates go through hooks registered in `app/bootstrap.js`.
- **Presentation** renders and binds events; it calls repositories for writes.

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

ES modules require HTTP (not `file://`).

## Notes

- **Orders** and **categories** sync with Firebase Firestore across devices. See [FIREBASE-SETUP.md](FIREBASE-SETUP.md).
- Data loads from browser cache first, then syncs in the background.
- Without Firebase, data stays in the browser (`localStorage`).
- Export JSON backups from Orders regularly.
- `.nojekyll` disables Jekyll processing on GitHub Pages.
