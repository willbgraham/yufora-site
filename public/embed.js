/**
 * Yufora embed loader.
 *
 * Usage (paste where the shop should appear):
 *   <script src="https://yufora.com/embed.js" data-shop="your-shop" async></script>
 *
 * Injects an auto-resizing iframe right after the script tag. Height updates
 * come from the embedded page via postMessage; both the origin and the
 * source window are verified before any message is trusted.
 */
(function () {
  var script = document.currentScript;
  if (!script) return;

  var shop = script.getAttribute("data-shop");
  if (!shop) {
    console.warn("[yufora] missing data-shop attribute on embed script");
    return;
  }

  var origin;
  try {
    origin = new URL(script.src).origin;
  } catch {
    return;
  }

  // Which widget: the shop (default) or the donor wall
  // (data-widget="wall", optionally data-mode="top").
  var widget = script.getAttribute("data-widget") || "shop";
  var src = origin + "/embed/" + encodeURIComponent(shop);

  if (widget === "wall") {
    src += "/wall";
    if (script.getAttribute("data-mode") === "top") {
      src += "?mode=top";
    }
  } else {
    // If the donor was just sent back from checkout, the charity's page URL
    // carries yufora_item / yufora_thanks — open the iframe straight to that
    // item (with the thank-you banner when the payment completed).
    try {
      var host = new URL(window.location.href);
      var item = host.searchParams.get("yufora_item");
      if (item && /^[\w-]{1,64}$/.test(item)) {
        src += "/p/" + encodeURIComponent(item);
        if (host.searchParams.get("yufora_thanks") === "1") {
          src += "?donated=1";
        }
      }
    } catch {
      /* older browsers: plain grid */
    }
  }

  var iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.title = widget === "wall" ? "Supporter wall" : "Wishlist shop";
  iframe.style.display = "block";
  iframe.style.width = "100%";
  iframe.style.border = "0";
  iframe.style.height = widget === "wall" ? "320px" : "600px";
  iframe.setAttribute("loading", "lazy");

  script.parentNode.insertBefore(iframe, script.nextSibling);

  window.addEventListener("message", function (event) {
    if (event.origin !== origin) return;
    if (event.source !== iframe.contentWindow) return;
    var data = event.data;
    if (data && data.type === "yufora:height" && typeof data.height === "number") {
      iframe.style.height = Math.max(200, Math.ceil(data.height)) + "px";
    }
  });
})();
