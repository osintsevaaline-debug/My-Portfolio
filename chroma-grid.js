/**
 * ChromaGrid — порт React Bits на vanilla JS + GSAP.
 * Подсветка курсором и цветовой «прожектор» для секции проектов.
 */
(function () {
  function initChromaGrid(root) {
    if (!window.gsap) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
      root.classList.add("chroma-grid--static");
      return;
    }

    const fadeEl = root.querySelector(".chroma-fade");
    if (!fadeEl) return;

    const radius = Number(root.dataset.radius) || 280;
    const damping = Number(root.dataset.damping) || 0.45;
    const fadeOut = Number(root.dataset.fadeOut) || 0.6;
    const ease = root.dataset.ease || "power3.out";

    root.style.setProperty("--r", `${radius}px`);

    const pos = { x: 0, y: 0 };
    let setX = null;
    let setY = null;

    function centerPointer() {
      const rect = root.getBoundingClientRect();
      pos.x = rect.width / 2;
      pos.y = rect.height / 2;
      setX?.(pos.x);
      setY?.(pos.y);
    }

    function bindSetters() {
      setX = gsap.quickSetter(root, "--x", "px");
      setY = gsap.quickSetter(root, "--y", "px");
      centerPointer();
    }

    bindSetters();

    function moveTo(x, y) {
      gsap.to(pos, {
        x,
        y,
        duration: damping,
        ease,
        onUpdate: () => {
          setX?.(pos.x);
          setY?.(pos.y);
        },
        overwrite: true
      });
    }

    function handleMove(e) {
      const rect = root.getBoundingClientRect();
      moveTo(e.clientX - rect.left, e.clientY - rect.top);
      gsap.to(fadeEl, { opacity: 0, duration: 0.25, overwrite: true });
    }

    function handleLeave() {
      gsap.to(fadeEl, {
        opacity: 1,
        duration: fadeOut,
        overwrite: true
      });
    }

    function handleCardMove(e) {
      const card = e.currentTarget;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
      card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
    }

    root.addEventListener("pointermove", handleMove);
    root.addEventListener("pointerleave", handleLeave);

    root.querySelectorAll(".chroma-card").forEach((card) => {
      card.addEventListener("mousemove", handleCardMove);
    });

    window.addEventListener(
      "resize",
      () => {
        bindSetters();
      },
      { passive: true }
    );
  }

  function boot() {
    document.querySelectorAll(".chroma-grid").forEach(initChromaGrid);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
