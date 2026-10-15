(function () {
  const config = window.THANVIS_FIREBASE_CONFIG;
  const allowed = (window.THANVIS_ALLOWED_EMAILS || []).map(e => String(e).trim().toLowerCase()).filter(Boolean);

  const readyCallbacks = [];
  let readyUser = null;
  let readyFired = false;

  function isAllowed(user) {
    const email = (user?.email || "").trim().toLowerCase();
    return !!email && allowed.includes(email);
  }

  function onReady(cb) {
    if (readyFired && readyUser) cb(readyUser);
    else readyCallbacks.push(cb);
  }

  function fireReady(user) {
    readyUser = user;
    readyFired = true;
    readyCallbacks.splice(0).forEach(cb => {
      try { cb(user); } catch (e) { console.error(e); }
    });
    document.dispatchEvent(new CustomEvent("thanvis-auth-ready", { detail: { user } }));
  }

  function ensureStyles() {
    if (document.getElementById("auth-gate-styles")) return;
    const style = document.createElement("style");
    style.id = "auth-gate-styles";
    style.textContent = `
      #auth-gate {
        position: fixed; inset: 0; z-index: 99999;
        display: grid; place-items: center;
        padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
        overflow: auto;
        background:
          linear-gradient(180deg, rgba(247,241,234,.92), rgba(247,241,234,.96)),
          #f7f1ea;
        color: #3a2a28;
        font-family: "Segoe UI", ui-sans-serif, -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      }
      html[data-theme="dark"] #auth-gate {
        background: linear-gradient(180deg, rgba(26,21,20,.94), rgba(26,21,20,.97)), #1a1514;
        color: #f3e8e4;
      }
      #auth-gate .card {
        width: min(420px, 100%);
        background: rgba(255,250,246,.96);
        border: 1px solid #eadcd3;
        border-radius: 20px;
        padding: clamp(20px, 4vw, 28px) clamp(16px, 4vw, 24px);
        box-shadow: 0 16px 40px rgba(90,55,50,.12);
        text-align: center;
      }
      html[data-theme="dark"] #auth-gate .card {
        background: #241e1d;
        border-color: #3a2f2d;
      }
      #auth-gate h1 { margin: 0 0 8px; font-size: clamp(20px, 5vw, 24px); letter-spacing: -.03em; word-break: break-word; }
      #auth-gate p { margin: 0 0 18px; color: #8a6f6a; font-size: 14px; line-height: 1.45; overflow-wrap: anywhere; }
      html[data-theme="dark"] #auth-gate p { color: #b79b95; }
      #auth-gate .actions { display: flex; flex-direction: column; gap: 10px; }
      #auth-gate button {
        appearance: none; border: 1px solid #eadcd3; border-radius: 12px;
        padding: 12px 14px; font: inherit; font-weight: 650; cursor: pointer;
        background: #fff; color: #3a2a28;
      }
      #auth-gate button.primary {
        background: #c97b8a; border-color: transparent; color: #fff;
      }
      #auth-gate button.primary:hover { filter: brightness(1.05); }
      #auth-gate .error { color: #c34255; font-size: 13px; margin-top: 12px; }
      #auth-gate .hint { font-size: 12px; margin-top: 14px; color: #8a6f6a; }
      html.auth-locked body > *:not(#auth-gate) { display: none !important; }
    `;
    document.head.appendChild(style);
  }

  function renderGate(state) {
    ensureStyles();
    document.documentElement.classList.add("auth-locked");
    document.documentElement.classList.remove("auth-ok");

    let gate = document.getElementById("auth-gate");
    if (!gate) {
      gate = document.createElement("div");
      gate.id = "auth-gate";
      document.body.appendChild(gate);
    }

    if (!allowed.length) {
      gate.innerHTML = `
        <div class="card">
          <h1>Setup required</h1>
          <p>Add allowed Google emails to <code>auth-config.js</code> (same list as your Firestore rules), then refresh.</p>
        </div>`;
      return;
    }

    if (state === "loading") {
      gate.innerHTML = `
        <div class="card">
          <h1>Thanvis Art Gallery</h1>
          <p>Checking access…</p>
        </div>`;
      return;
    }

    if (state === "denied") {
      const email = firebase.auth().currentUser?.email || "this account";
      gate.innerHTML = `
        <div class="card">
          <h1>Access denied</h1>
          <p><strong>${email}</strong> is not on the allowlist.</p>
          <div class="actions">
            <button type="button" class="primary" id="auth-switch">Sign in with another Google account</button>
            <button type="button" id="auth-signout-denied">Sign out</button>
          </div>
          <p class="hint">Only approved emails can open these pages.</p>
        </div>`;
      document.getElementById("auth-switch").onclick = async () => {
        await firebase.auth().signOut();
        await signIn();
      };
      document.getElementById("auth-signout-denied").onclick = () => firebase.auth().signOut();
      return;
    }

    gate.innerHTML = `
      <div class="card">
        <h1>Thanvis Art Gallery</h1>
        <p>Sign in with an approved Google account to continue.</p>
        <div class="actions">
          <button type="button" class="primary" id="auth-signin">Sign in with Google</button>
        </div>
        <div class="error" id="auth-error" hidden></div>
      </div>`;
    document.getElementById("auth-signin").onclick = () => signIn();
  }

  function unlock(user) {
    document.documentElement.classList.remove("auth-locked");
    document.documentElement.classList.add("auth-ok");
    const gate = document.getElementById("auth-gate");
    if (gate) gate.remove();
    fireReady(user);
  }

  async function signIn() {
    const errEl = document.getElementById("auth-error");
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await firebase.auth().signInWithPopup(provider);
    } catch (err) {
      console.error(err);
      if (errEl) {
        errEl.hidden = false;
        errEl.textContent = err.message || "Sign-in failed";
      }
    }
  }

  async function signOut() {
    await firebase.auth().signOut();
  }

  function init() {
    if (!config?.apiKey) {
      renderGate("loading");
      document.querySelector("#auth-gate .card p").textContent = "Missing Firebase config in auth-config.js";
      return;
    }
    if (!firebase.apps.length) firebase.initializeApp(config);
    renderGate("loading");

    firebase.auth().onAuthStateChanged(user => {
      if (!user) {
        readyFired = false;
        readyUser = null;
        renderGate("signin");
        return;
      }
      if (!isAllowed(user)) {
        readyFired = false;
        readyUser = null;
        renderGate("denied");
        return;
      }
      unlock(user);
    });
  }

  window.ThanvisAuth = {
    onReady,
    signIn,
    signOut,
    isAllowed,
    get user() { return readyUser || firebase.auth().currentUser; }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
