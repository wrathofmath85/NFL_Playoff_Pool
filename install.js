/* ============================================================
   "Add to Home Screen" helper — self-contained, no dependencies.
   Include on any page:
     <script src="install.js" defer
             data-name="Spread Pool"          (shown in the banner)
             data-icon="apple-touch-icon.png"
             data-accent="#f4581f"            (button color)
             data-on-accent="#ffffff"         (button text color)
             data-bg="#0d1a32"                (banner/sheet background)
             data-auto="1"></script>          (1 = pop the banner on this page, 0 = don't)
   Any element with a  data-install  attribute opens the how-to when tapped.
   Shows only on phones, never once the site is added, and tapping ×
   hides it for 3 days.
   ============================================================ */
(function () {
  "use strict";
  var me = document.currentScript || document.querySelector('script[src*="install.js"]');
  var cfg = function (k, d) { return (me && me.getAttribute("data-" + k)) || d; };
  var NAME = cfg("name", document.title), ICON = cfg("icon", "apple-touch-icon.png");
  var ACC = cfg("accent", "#f4581f"), ON = cfg("on-accent", "#fff"), BG = cfg("bg", "#102039");
  var AUTO = cfg("auto", "1") === "1";
  var KEY = "a2hs_" + location.pathname.replace(/[^/]*$/, ""); // per-site storage key

  var UA = navigator.userAgent || "";
  var isIOS = /iPhone|iPad|iPod/.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/i.test(UA);
  var isInApp = /FBAN|FBAV|Instagram|Line\/|Twitter|LinkedInApp|Snapchat/i.test(UA);
  var standalone = function () { return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; };
  var get = function (k) { try { return localStorage.getItem(KEY + k); } catch (e) { return null; } };
  var set = function (k, v) { try { localStorage.setItem(KEY + k, v); } catch (e) {} };
  var deferred = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; });
  window.addEventListener("appinstalled", function () { set("done", "1"); hide(); });

  var css = "\
.a2-bar{position:fixed;left:10px;right:10px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:9990;max-width:520px;margin:0 auto;display:flex;align-items:center;gap:12px;padding:10px 10px 10px 12px;border-radius:18px;background:" + BG + ";border:1px solid " + ACC + "66;box-shadow:0 18px 44px rgba(0,0,0,.55);color:#eef3ff;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;transform:translateY(24px);opacity:0;transition:transform .3s cubic-bezier(.2,.8,.2,1),opacity .3s}\
.a2-bar.show{transform:none;opacity:1}\
.a2-bar img{width:44px;height:44px;border-radius:11px;flex-shrink:0}\
.a2-t{flex:1;min-width:0;line-height:1.25}.a2-t b{display:block;font-size:14px}.a2-t span{font-size:12px;opacity:.65}\
.a2-go{border:0;border-radius:999px;padding:9px 16px;font:700 14px system-ui,sans-serif;background:" + ACC + ";color:" + ON + ";cursor:pointer}\
.a2-x{width:32px;height:32px;flex-shrink:0;border:0;background:none;color:inherit;opacity:.5;font-size:22px;cursor:pointer;border-radius:50%}\
.a2-bg{position:fixed;inset:0;z-index:9995;background:rgba(0,0,0,.55);opacity:0;transition:opacity .2s}\
.a2-sheet{position:fixed;left:0;right:0;bottom:0;z-index:9996;max-height:88vh;overflow:auto;background:" + BG + ";color:#eef3ff;border-radius:22px 22px 0 0;border-top:1px solid rgba(255,255,255,.14);padding:12px 18px calc(22px + env(safe-area-inset-bottom,0px));font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.45;transform:translateY(105%);transition:transform .28s cubic-bezier(.2,.8,.2,1);max-width:560px;margin:0 auto}\
.a2-open .a2-bg{opacity:1}.a2-open .a2-sheet{transform:none}\
.a2-grab{width:40px;height:5px;border-radius:5px;background:rgba(255,255,255,.2);margin:0 auto 14px}\
.a2-hd{display:flex;gap:14px;align-items:center;margin-bottom:10px}.a2-hd img{width:56px;height:56px;border-radius:13px}\
.a2-hd b{display:block;font-size:19px}.a2-hd span{font-size:13px;opacity:.65}\
.a2-st{display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-top:1px solid rgba(255,255,255,.1)}\
.a2-n{flex-shrink:0;width:28px;height:28px;border-radius:50%;background:" + ACC + ";color:" + ON + ";font-weight:800;display:grid;place-items:center}\
.a2-st div{padding-top:3px}.a2-st svg{vertical-align:-4px}\
.a2-ok{width:100%;margin-top:12px;padding:13px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:inherit;font:700 15px system-ui,sans-serif;cursor:pointer}\
.a2-note{font-size:12.5px;opacity:.55;margin-top:6px}\
@media(min-width:861px){.a2-bar{display:none}}\
@media(prefers-reduced-motion:reduce){.a2-bar,.a2-sheet,.a2-bg{transition:none}}";

  var SHARE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/></svg>';
  var PLUS = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
  var DOTS = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

  function addCss() { if (document.getElementById("a2-css")) return; var s = document.createElement("style"); s.id = "a2-css"; s.textContent = css; document.head.appendChild(s); }
  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }
  function hide() { var b = document.querySelector(".a2-bar"); if (b) { b.classList.remove("show"); setTimeout(function () { b.remove(); }, 300); } }
  function closeSheet() { document.body.classList.remove("a2-open"); setTimeout(function () { var a = document.querySelector(".a2-bg"), b = document.querySelector(".a2-sheet"); a && a.remove(); b && b.remove(); }, 300); }

  function help() {
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function (r) { if (r && r.outcome === "accepted") { set("done", "1"); hide(); } }).catch(function () {});
      deferred = null; return;
    }
    addCss();
    var step = function (n, h) { return '<div class="a2-st"><span class="a2-n">' + n + "</span><div>" + h + "</div></div>"; };
    var steps;
    if (isInApp) steps = step(1, "Tap this app's <b>⋯</b> or " + SHARE + " menu and choose <b>Open in browser</b>.") + step(2, "Then tap <b>Add to Home Screen</b> from there.");
    else if (isIOS) steps = step(1, "Tap the <b>Share</b> button " + SHARE + ". In Safari it's at the bottom of the screen (on newer iPhones, tap <b>⋯</b> first).") +
      step(2, "Scroll down and tap <b>Add to Home Screen</b> " + PLUS) + step(3, "Tap <b>Add</b> in the top-right corner. Done!") +
      '<p class="a2-note">Don\'t see it? Open this page in <b>Safari</b> and try again.</p>';
    else if (isAndroid) steps = step(1, "Tap the <b>menu</b> " + DOTS + " in the top-right corner of Chrome.") + step(2, "Tap <b>Add to Home screen</b> or <b>Install app</b>.") + step(3, "Tap <b>Install</b> or <b>Add</b>. Done!");
    else steps = step(1, "Open this page on your phone.") + step(2, "iPhone: Share " + SHARE + " → <b>Add to Home Screen</b>. Android: menu " + DOTS + " → <b>Install app</b>.");
    var bg = el('<div class="a2-bg"></div>'), sh = el('<div class="a2-sheet" role="dialog" aria-modal="true"><div class="a2-grab"></div><div class="a2-hd"><img src="' + esc(ICON) + '" alt=""><div><b>Add ' + esc(NAME) + ' to your phone</b><span>Opens like an app, one tap from your home screen.</span></div></div>' + steps + '<button class="a2-ok" type="button">Got it</button></div>');
    document.body.appendChild(bg); document.body.appendChild(sh);
    bg.addEventListener("click", closeSheet); sh.querySelector(".a2-ok").addEventListener("click", closeSheet);
    requestAnimationFrame(function () { requestAnimationFrame(function () { document.body.classList.add("a2-open"); }); });
  }
  window.showInstallHelp = help;

  function banner() {
    if (!AUTO || standalone() || get("done") || !(isIOS || isAndroid)) return;
    if (Date.now() < Number(get("snooze") || 0)) return;
    setTimeout(function () {
      if (document.querySelector(".a2-bar")) return;
      addCss();
      var b = el('<div class="a2-bar" role="dialog" aria-label="Add to home screen"><img src="' + esc(ICON) + '" alt=""><div class="a2-t"><b>Get the ' + esc(NAME) + ' app</b><span>Add it to your home screen</span></div><button class="a2-go" type="button">Add</button><button class="a2-x" type="button" aria-label="Not now">×</button></div>');
      document.body.appendChild(b);
      requestAnimationFrame(function () { b.classList.add("show"); });
      b.querySelector(".a2-go").addEventListener("click", function () { hide(); help(); });
      b.querySelector(".a2-x").addEventListener("click", function () { hide(); set("snooze", String(Date.now() + 3 * 864e5)); });
    }, 2500);
  }

  function boot() {
    document.addEventListener("click", function (e) { var t = e.target.closest && e.target.closest("[data-install]"); if (t) { e.preventDefault(); help(); } });
    if (standalone()) document.querySelectorAll("[data-install]").forEach(function (x) { x.style.display = "none"; });
    banner();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
