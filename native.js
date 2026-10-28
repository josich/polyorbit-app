/* Polyorbit inside the Android app (Capacitor). Loaded first in the page by tools/native-patch.py, only in the app.
   It gives the web APIs an Android WebView lacks to the app's own code, so the app needs no changes of its own:
   - navigator.share / canShare  -> the Android share sheet (files are written to the app's cache first);
   - a "download" link click      -> the file saved to the phone's Documents/Polyorbit folder;
   - navigator.wakeLock           -> the screen kept awake while the wheel plays;
   - window.open of a web address -> opened by Android (the browser, the Play Store...);
   - a tapped Polyorbit link      -> the app opens it (challenges, patterns, routines). */
(function(){
  "use strict";
  var C = window.Capacitor;
  if(!C || !C.Plugins) return;
  var P = C.Plugins;
  /* v544 (Oscar): the APK's own build number beside the web build under (i) - "Build v544 · app 15" */
  try{ if(P.App && P.App.getInfo) Promise.resolve(P.App.getInfo()).then(function(i){
    var n = i && i.build; if(!n) return; window.POLY_APP_BUILD = String(n);
    var t = document.getElementById("buildTag"); if(t && t.textContent.indexOf(" · app ") < 0) t.textContent += " · app " + n;
  }).catch(function(){}); } catch(e){}

  function toB64(blob){
    return new Promise(function(res, rej){
      var r = new FileReader();
      r.onload = function(){ var s = String(r.result), i = s.indexOf(","); res(i >= 0 ? s.slice(i + 1) : ""); };
      r.onerror = function(){ rej(r.error); };
      r.readAsDataURL(blob);
    });
  }
  function safeName(n){ return String(n || "file").replace(/[\\\/:*?"<>|]+/g, "_").slice(0, 120); }
  function abortErr(){ var e = new Error("Share cancelled"); e.name = "AbortError"; return e; }
  function def(obj, key, val){ try{ Object.defineProperty(obj, key, {value:val, configurable:true, writable:true}); } catch(e){ try{ obj[key] = val; } catch(e2){} } }

  /* a small note at the foot of the screen, for what Android does quietly (a file saved) */
  var toastEl = null, toastT = 0;
  function toast(msg){
    if(!document.body) return;
    if(!toastEl){
      toastEl = document.createElement("div");
      toastEl.style.cssText = "position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translateX(-50%);" +
        "z-index:95;max-width:86vw;padding:10px 16px;border-radius:12px;background:rgba(20,26,33,.96);color:#E9EEF2;" +
        "font:500 13px/1.35 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.4);pointer-events:none;opacity:0;transition:opacity .2s";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.style.opacity = "1";
    clearTimeout(toastT);
    toastT = setTimeout(function(){ toastEl.style.opacity = "0"; }, 2600);
  }

  /* ---- sharing ---- */
  if(P.Share && P.Filesystem){
    def(navigator, "canShare", function(d){ return !!d; });
    def(navigator, "share", function(d){
      d = d || {};
      var files = [].slice.call(d.files || []);
      var stamp = Date.now().toString(36);
      var write = Promise.all(files.map(function(f){
        return toB64(f).then(function(data){
          return P.Filesystem.writeFile({path:"share/" + stamp + "/" + safeName(f.name), data:data, directory:"CACHE", recursive:true});
        }).then(function(r){ return r.uri; });
      }));
      return write.then(function(uris){
        var o = {dialogTitle:d.title || "Share"};
        if(d.title) o.title = d.title;
        if(d.text) o.text = d.text;
        if(d.url) o.url = d.url;
        if(uris.length) o.files = uris;
        return P.Share.share(o);
      }).then(function(){ return undefined; }, function(e){
        var m = String((e && (e.message || e.errorMessage)) || e || "");
        if(/cancel/i.test(m)) throw abortErr();
        throw e;
      });
    });
  }

  /* ---- saving: the app's "download" links write into Documents/Polyorbit ---- */
  if(P.Filesystem){
    var aClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function(){
      var name = this.getAttribute("download"), href = this.href || "";
      if(name == null || !/^(blob:|data:)/.test(href)) return aClick.call(this);
      var nm = safeName(name || "Polyorbit file");
      fetch(href).then(function(r){ return r.blob(); }).then(toB64).then(function(data){
        return P.Filesystem.writeFile({path:"Polyorbit/" + nm, data:data, directory:"DOCUMENTS", recursive:true});
      }).then(function(){ toast("Saved to Documents/Polyorbit: " + nm); },
              function(e){ toast("Could not save the file: " + String((e && e.message) || e)); });
    };
  }

  /* ---- the screen stays awake while the wheel plays ---- */
  if(P.KeepAwake){
    def(navigator, "wakeLock", {
      request: function(){
        return Promise.resolve(P.KeepAwake.keepAwake()).then(function(){
          var ls = [], gone = false;
          return {
            type:"screen", released:false,
            release: function(){
              if(gone) return Promise.resolve(); gone = true; this.released = true;
              ls.forEach(function(f){ try{ f(); } catch(e){} });
              return Promise.resolve(P.KeepAwake.allowSleep()).catch(function(){});
            },
            addEventListener: function(t, f){ if(t === "release") ls.push(f); },
            removeEventListener: function(){}
          };
        });
      }
    });
  }

  /* ---- web addresses open outside the app ---- */
  if(P.AppLauncher){
    var wOpen = window.open;
    window.open = function(url){
      if(url && /^(https?:|mailto:|market:)/i.test(String(url))){ P.AppLauncher.openUrl({url:String(url)}).catch(function(){}); return null; }
      return wOpen.apply(window, arguments);
    };
  }

  /* ---- a tapped Polyorbit link opens in the app ----
     The page boots with the link's ?c= / ?p= / ?r= in its address and its own handlers do the rest. */
  if(P.App){
    var seenKey = "polyorbit-native:link";
    var openLink = function(url){
      if(!url) return;
      var q;
      try{ q = new URL(url).searchParams; } catch(e){ return; }
      var keep = new URLSearchParams();
      ["c", "p", "r"].forEach(function(k){ if(q.has(k)) keep.set(k, q.get(k)); });
      var qs = keep.toString();
      if(!qs) return;
      try{   /* the reload below sees the same launch link again: once is enough */
        var was = JSON.parse(sessionStorage.getItem(seenKey) || "null");
        if(was && was.u === url && Date.now() - was.t < 20000) return;
        sessionStorage.setItem(seenKey, JSON.stringify({u:url, t:Date.now()}));
      } catch(e){}
      location.replace(location.pathname + "?" + qs);
    };
    try{ P.App.addListener("appUrlOpen", function(e){ openLink(e && e.url); }); } catch(e){}
    try{ Promise.resolve(P.App.getLaunchUrl()).then(function(r){ openLink(r && r.url); }).catch(function(){}); } catch(e){}
  }

  /* ---- the system bars follow the skin (the app's own PolyBars plugin, native-src/; v555: renamed from SystemBars,
     which is Capacitor 8's own core plugin) ---- */
  if(P.PolyBars){
    var barsWas = "";
    var barsPaint = function(){
      var root = document.documentElement, g = "";
      try{ g = getComputedStyle(root).getPropertyValue("--ground").trim(); } catch(e){}
      if(!/^#[0-9a-f]{6}$/i.test(g)) return;
      var light = root.getAttribute("data-skin") === "light", key = g + light;
      if(key === barsWas) return;
      barsWas = key;
      Promise.resolve(P.PolyBars.set({color:g, light:light})).catch(function(){ barsWas = ""; });
    };
    try{ new MutationObserver(barsPaint).observe(document.documentElement, {attributes:true, attributeFilter:["data-skin"]}); } catch(e){}
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", barsPaint); else barsPaint();
  }

  /* ---- v555: Play Billing (the Play build only: window.POLY_STORE = "play") ----
     window.POLY_BILL for the app's own code, over the NativePurchases plugin (@capgo/native-purchases, no server):
     buy(id, consumable) -> "ok" | "pending" | "owned" | "cancel"; owned() -> the product ids this Google account owns;
     prices(ids) -> {id: "4,99 €"} in the player's own currency. */
  if(P.NativePurchases && window.POLY_STORE === "play"){
    var NP = P.NativePurchases;
    var done = function(t){ var s = t && String(t.purchaseState); return s === "1" || s === "PURCHASED"; };
    var pend = function(t){ var s = t && String(t.purchaseState); return s === "0" || s === "PENDING"; };
    var ready = function(){
      return Promise.resolve(NP.isBillingSupported()).then(function(r){ if(!(r && r.isBillingSupported)) throw new Error("billing not supported"); });
    };
    window.POLY_BILL = {
      buy: function(id, consumable){
        return ready().then(function(){
          return NP.purchaseProduct({productIdentifier:id, productType:"inapp", quantity:1, isConsumable:!!consumable});
        }).then(function(t){ return pend(t) ? "pending" : "ok"; }, function(e){
          var m = String((e && (e.message || e.code || e.errorMessage)) || e || "");
          if(/cancel/i.test(m)) return "cancel";
          if(/already.?owned|ITEM_ALREADY_OWNED/i.test(m)) return "owned";
          throw e;
        });
      },
      owned: function(){
        return ready().then(function(){ return Promise.resolve(NP.restorePurchases()).catch(function(){}); })
          .then(function(){ return NP.getPurchases({productType:"inapp"}); })
          .then(function(r){ return ((r && r.purchases) || []).filter(done).map(function(t){ return t.productIdentifier; }); });
      },
      prices: function(ids){
        return ready().then(function(){ return NP.getProducts({productIdentifiers:ids, productType:"inapp"}); }).then(function(r){
          var o = {}; ((r && r.products) || []).forEach(function(p){ if(p && p.identifier && p.priceString) o[p.identifier] = p.priceString; }); return o;
        });
      }
    };
  }

  /* ---- v600: Google's own rating sheet (the Play build only), over the InAppReview plugin (@capacitor-community/in-app-review).
     window.POLY_REVIEW() resolves once Google has handled the request - Google never says whether the sheet showed (it has a quota). */
  if(P.InAppReview && window.POLY_STORE === "play"){
    window.POLY_REVIEW = function(){ return Promise.resolve(P.InAppReview.requestReview()); };
  }

  /* ---- a newer build on GitHub: a small card offers it (an APK installed by download never updates by itself;
     the Play Store version will, and then this goes) ---- */
  if(P.App && P.AppLauncher && window.POLY_STORE !== "play"){   /* v555: never in the Play build - an app from Play updates only through Play */
    var APK = "https://github.com/josich/polyorbit-app/releases/latest/download/polyorbit.apk";
    var CHECK_KEY = "polyorbit-native:upd-check", SKIP_KEY = "polyorbit-native:upd-skip", EVERY = 6 * 3600e3;
    var updCard = null, updWait = 0;
    var busy = function(){
      var d = document.documentElement.dataset, play = document.getElementById("play");
      return !!(d.tour || d.game || d.course || d.gscr || d.rdg || d.pscr || d.rscr || d.cwin || d.gwin || d.rwin ||
        d.stage || d.cal || d.along || d.video || d.wgame || d.chal) || (play && play.dataset.on === "1") ||
        !!document.querySelector(".modal:not([hidden])");
    };
    var showUpd = function(n){
      clearTimeout(updWait);
      if(busy()){ updWait = setTimeout(function(){ showUpd(n); }, 20000); return; }
      if(!updCard){
        updCard = document.createElement("div");
        updCard.style.cssText = "position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:90;" +
          "max-width:520px;margin:0 auto;display:flex;align-items:center;gap:10px;padding:10px 10px 10px 16px;border-radius:14px;" +
          "background:var(--panel,#1A222B);color:var(--ink,#E9EEF2);border:1.5px solid var(--c2,#2FC9BC);" +
          "box-shadow:0 8px 28px rgba(0,0,0,.45);font-weight:600;font-size:14px;line-height:1.3";
        updCard.innerHTML = '<span style="flex:1;min-width:0">New version ready</span>' +
          '<button type="button" data-u="go" style="all:unset;cursor:pointer;padding:8px 14px;border-radius:10px;background:var(--c2,#2FC9BC);color:var(--ground,#0D1318);font-weight:700">Download</button>' +
          '<button type="button" data-u="x" aria-label="Not now" style="all:unset;cursor:pointer;width:34px;height:34px;display:grid;place-items:center;border-radius:10px;border:1px solid color-mix(in srgb,var(--c3,#F0729D) 45%,var(--line,#35424F));color:var(--c3,#F0729D);font-size:18px">×</button>';
        updCard.addEventListener("click", function(e){
          var b = e.target.closest("button"); if(!b) return;
          updCard.style.display = "none";
          try{ localStorage.setItem(SKIP_KEY, String(updCard.dataset.n)); } catch(err){}
          if(b.dataset.u === "go"){
            P.AppLauncher.openUrl({url:APK}).catch(function(){});
            toast("Open the downloaded file and tap Update. Your progress stays.");
          }
        });
        document.body.appendChild(updCard);
      }
      updCard.dataset.n = n;
      updCard.style.display = "flex";
    };
    var checkUpd = function(force){
      var last = 0, skip = 0;
      try{ last = +localStorage.getItem(CHECK_KEY) || 0; skip = +localStorage.getItem(SKIP_KEY) || 0; } catch(e){}
      if(!force && Date.now() - last < EVERY) return;
      try{ localStorage.setItem(CHECK_KEY, String(Date.now())); } catch(e){}
      Promise.all([
        Promise.resolve(P.App.getInfo()),
        fetch("https://api.github.com/repos/josich/polyorbit-app/releases/latest", {cache:"no-store"}).then(function(r){ return r.ok ? r.json() : null; })
      ]).then(function(a){
        var mine = parseInt(a[0] && a[0].build, 10), m = a[1] && /^build-(\d+)$/.exec(a[1].tag_name || ""), n = m ? +m[1] : 0;
        if(n && mine && n > mine && n > skip) showUpd(n);
      }).catch(function(){});
    };
    setTimeout(function(){ checkUpd(false); }, 5000);
    document.addEventListener("visibilitychange", function(){ if(document.visibilityState === "visible") checkUpd(false); });
  }
})();
