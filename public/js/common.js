
// public/js/common.js
document.addEventListener("DOMContentLoaded", () => {
  async function updateCartBadge() {
    const badge = document.querySelector(".cart-badge");
    if (!badge) return;

    try {
      const res = await fetch("/get-cart-count");
      const data = await res.json();
      if (data.success) {
        badge.textContent = data.cartCount;
        badge.style.display = data.cartCount > 0 ? "inline-block" : "none";
      }
    } catch (err) {
      console.error("Failed to update cart badge:", err);
    }
  }

  updateCartBadge();
});