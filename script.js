(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const nav = document.getElementById("navbar");
  const navLinks = Array.from(document.querySelectorAll('#navbar a[href^="#"]'));
  const sections = Array.from(document.querySelectorAll("section"));

  if (navLinks.length) {
    navLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        const targetId = link.getAttribute("href");
        if (!targetId || targetId === "#") {
          return;
        }

        const targetSection = document.querySelector(targetId);
        if (!targetSection) {
          return;
        }

        // Prevent default jump, perform smooth scroll, and push hash to history
        event.preventDefault();
        targetSection.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
        // Update the URL without forcing an extra jump, enabling Back/Forward between sections
        history.pushState({ section: targetId }, "", targetId);
        // Keep nav state in sync immediately
        if (targetSection.id) {
          highlightNavigation(targetSection.id);
        }
      });
    });
  }

  const highlightNavigation = (id) => {
    if (!navLinks.length) {
      return;
    }

    navLinks.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  if (nav) {
    const progressBar = document.createElement("div");
    progressBar.id = "scroll-progress";
    progressBar.setAttribute("aria-hidden", "true");
    Object.assign(progressBar.style, {
      position: "fixed",
      top: "0",
      left: "0",
      height: "4px",
      width: "0%",
      background: "linear-gradient(90deg, #1f7aec, #4aa3ff)",
      zIndex: "2000",
      transition: "width 0.2s ease-out",
    });
    document.body.appendChild(progressBar);

    const updateNavState = () => {
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = documentHeight > 0 ? (window.scrollY / documentHeight) * 100 : 0;
      progressBar.style.width = `${progress}%`;

      nav.classList.toggle("scrolled", window.scrollY > 20);
    };

    window.addEventListener("scroll", updateNavState, { passive: true });
    updateNavState();
  }

  if (sections.length) {
    sections.forEach((section) => {
      if (prefersReducedMotion) {
        return;
      }

      section.dataset.revealed = "false";
      section.style.opacity = "0";
      section.style.transform = "translateY(60px)";
      section.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    });

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const section = entry.target;
          if (entry.isIntersecting) {
            if (!prefersReducedMotion && section.dataset.revealed !== "true") {
              section.style.opacity = "1";
              section.style.transform = "translateY(0)";
              section.dataset.revealed = "true";
            }

            if (section.id) {
              highlightNavigation(section.id);
            }
          }
        });
      },
      {
        threshold: 0.35,
      }
    );

    sections.forEach((section) => sectionObserver.observe(section));
  }

  // Handle browser Back/Forward to restore section position and active nav
  window.addEventListener("popstate", () => {
    const hash = window.location.hash;
    const target = hash ? document.querySelector(hash) : null;
    if (target) {
      target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
      if (target.id) {
        highlightNavigation(target.id);
      }
    } else {
      // No hash: go to top and clear active state
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
      highlightNavigation("");
    }
  });

  const projectTiles = document.querySelectorAll(".project-tile");
  if (projectTiles.length && !prefersReducedMotion) {
    const tileObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const tile = entry.target;
            tile.style.opacity = "1";
            tile.style.transform = "translateY(0)";
            tile.style.boxShadow = "0 12px 25px rgba(0, 0, 0, 0.2)";
            observer.unobserve(tile);
          }
        });
      },
      { threshold: 0.3 }
    );

    projectTiles.forEach((tile, index) => {
      tile.style.opacity = "0";
      tile.style.transform = "translateY(30px)";
      tile.style.transition = `opacity 0.6s ease ${(index + 1) * 90}ms, transform 0.6s ease ${(index + 1) * 90}ms, box-shadow 0.6s ease`;
      tileObserver.observe(tile);
    });
  }

  const welcomeSection = document.getElementById("welcome-section");
  if (welcomeSection) {
    const spotlightGradient = (event) => {
      const rect = welcomeSection.getBoundingClientRect();
      const xRatio = ((event.clientX - rect.left) / rect.width) * 100;
      const yRatio = ((event.clientY - rect.top) / rect.height) * 100;
      welcomeSection.style.background = `radial-gradient(circle at ${xRatio}% ${yRatio}%, rgba(74, 163, 255, 0.2), transparent 60%), linear-gradient(135deg, #1f2933, #3f4c6b)`;
    };

    if (!prefersReducedMotion) {
      welcomeSection.addEventListener("mousemove", spotlightGradient);
      welcomeSection.addEventListener("mouseleave", () => {
        welcomeSection.style.background = "linear-gradient(135deg, #1f2933, #3f4c6b)";
      });
    }

    const heroElements = welcomeSection.querySelectorAll("h1, p, a");
    heroElements.forEach((element) => {
      element.style.transition = "transform 0.6s ease, text-shadow 0.6s ease";
      element.addEventListener("mouseenter", () => {
        element.style.transform = "translateY(-4px)";
        element.style.textShadow = "0 15px 30px rgba(0, 0, 0, 0.2)";
      });
      element.addEventListener("mouseleave", () => {
        element.style.transform = "translateY(0)";
        element.style.textShadow = "none";
      });
    });
  }

  const tagline = document.querySelector(".tagline");
  if (tagline && !prefersReducedMotion) {
    const fullText = tagline.textContent.trim().replace(/^"|"$/g, "");
    tagline.setAttribute("aria-label", fullText);
    tagline.textContent = "";

    let index = 0;
    const type = () => {
      const nextIndex = Math.min(index + 1, fullText.length);
      tagline.textContent = fullText.slice(0, nextIndex) + (nextIndex < fullText.length ? "|" : "");
      index = nextIndex;
      if (index < fullText.length) {
        setTimeout(type, 75);
      } else {
        setTimeout(() => {
          tagline.textContent = fullText;
        }, 400);
      }
    };

    setTimeout(type, 400);
  }

  if (sections.length) {
    const onLoadSection = sections.find((section) => {
      const rect = section.getBoundingClientRect();
      return rect.top >= 0 && rect.top < window.innerHeight * 0.6;
    });
    if (onLoadSection) {
      if (!prefersReducedMotion) {
        requestAnimationFrame(() => {
          onLoadSection.style.opacity = "1";
          onLoadSection.style.transform = "translateY(0)";
          onLoadSection.dataset.revealed = "true";
        });
      }

      if (onLoadSection.id) {
        highlightNavigation(onLoadSection.id);
      }
    }
  }
})();
