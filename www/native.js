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
})();
