(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Timeline expand/collapse
  const list = document.querySelector(".timeline");
  const toggleAllBtn = document.getElementById("toggle-all");
  if (list) {
    const items = Array.from(list.querySelectorAll("li"));

    // Make each item toggle details on click
    items.forEach((li) => {
      li.setAttribute("tabindex", "0");
      li.setAttribute("role", "button");
      li.setAttribute("aria-expanded", "false");
      li.addEventListener("click", () => {
        const expanded = li.getAttribute("aria-expanded") === "true";
        li.setAttribute("aria-expanded", String(!expanded));
      });
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          li.click();
        }
      });
    });

    if (toggleAllBtn) {
      toggleAllBtn.addEventListener("click", () => {
        const anyClosed = items.some((li) => li.getAttribute("aria-expanded") !== "true");
        items.forEach((li) => li.setAttribute("aria-expanded", anyClosed ? "true" : "false"));
        const next = anyClosed ? "true" : "false";
        toggleAllBtn.setAttribute("aria-expanded", next);
        toggleAllBtn.textContent = anyClosed ? "Collapse all" : "Expand all";
      });
    }
  }

  // Back to top button
  const toTop = document.getElementById("back-to-top");
  if (toTop) {
    const onScroll = () => {
      const show = window.scrollY > 320;
      toTop.classList.toggle("is-visible", show);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    toTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
  }
})();

