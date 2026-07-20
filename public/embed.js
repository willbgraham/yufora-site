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

  var iframe = document.createElement("iframe");
  iframe.src = origin + "/embed/" + encodeURIComponent(shop);
  iframe.title = "Wishlist shop";
  iframe.style.display = "block";
  iframe.style.width = "100%";
  iframe.style.border = "0";
  iframe.style.height = "600px";
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
