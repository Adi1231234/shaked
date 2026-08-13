// GitHub Pages serves index.html with a short cache but the bundles are
// content-hashed, so for a few minutes after a deploy a returning visitor can
// get yesterday's HTML pointing at asset names that no longer exist - a blank
// page. This injects a guard that notices the 404 and reloads once, past the
// cache. Injected into every app from the shared preset, so it lives in one file.

// The flag is only cleared when the page loaded with no asset failure, so a
// genuinely broken deploy can never put the browser in a reload loop.
const GUARD = `(function(){var K='shaked:stale-html',failed=false;
function s(v){try{v?sessionStorage.setItem(K,'1'):sessionStorage.removeItem(K)}catch(e){}}
function g(){try{return sessionStorage.getItem(K)}catch(e){return '1'}}
addEventListener('error',function(e){var t=e.target;if(!t||t.tagName!=='SCRIPT'&&t.tagName!=='LINK')return;failed=true;if(g())return;s(1);location.replace(location.pathname+'?r='+Date.now())},true);
addEventListener('load',function(){if(!failed)s(0)})})();`;

export function staleHtmlGuard() {
  return {
    name: 'shaked-stale-html-guard',
    apply: 'build',
    transformIndexHtml() {
      return [{ tag: 'script', children: GUARD, injectTo: 'head-prepend' }];
    },
  };
}
