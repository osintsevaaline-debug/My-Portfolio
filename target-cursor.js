/**
 * Target-style кастомный курсор (адаптация TargetCursor + GSAP под статический сайт).
 * Настройки: spinDuration, hoverDuration, parallaxOn, hideDefaultCursor, targetSelector
 */
(function () {
  const CONFIG = {
    targetSelector: ".cursor-target",
    spinDuration: 2,
    hideDefaultCursor: true,
    hoverDuration: 0.2,
    parallaxOn: true
  };

  const CONSTANTS = {
    borderWidth: 3,
    cornerSize: 12
  };

  function isMobileLike() {
    if (typeof window === "undefined") return true;
    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const small = window.innerWidth <= 768;
    const ua = (navigator.userAgent || navigator.vendor || "").toLowerCase();
    const mobileUa = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    return (hasTouch && small) || mobileUa;
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function removeCursorMarkup() {
    var el = document.getElementById("target-cursor");
    if (el) el.remove();
  }

  if (typeof gsap === "undefined") {
    removeCursorMarkup();
    return;
  }
  if (isMobileLike() || prefersReducedMotion()) {
    removeCursorMarkup();
    return;
  }

  const cursor = document.getElementById("target-cursor");
  const dot = document.getElementById("target-cursor-dot");
  if (!cursor || !dot) return;

  const corners = Array.from(cursor.querySelectorAll(".target-cursor-corner"));
  if (corners.length !== 4) return;

  document.querySelectorAll(
    ".btn, a.logo, .site-header .nav a, .card, .project-card, .to-top, .contacts a"
  ).forEach(function (el) {
    el.classList.add("cursor-target");
  });

  const originalBodyCursor = document.body.style.cursor;
  if (CONFIG.hideDefaultCursor) {
    document.body.style.cursor = "none";
  }

  let spinTl = null;
  let activeTarget = null;
  let currentLeaveHandler = null;
  let resumeTimeout = null;
  const activeStrength = { value: 0 };
  let targetCornerPositions = null;
  let tickerFn = null;

  function moveCursor(x, y) {
    gsap.to(cursor, {
      x: x,
      y: y,
      duration: 0.1,
      ease: "power3.out"
    });
  }

  gsap.set(cursor, {
    xPercent: -50,
    yPercent: -50,
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
  });

  function createSpinTimeline() {
    if (spinTl) spinTl.kill();
    spinTl = gsap.timeline({ repeat: -1 }).to(cursor, {
      rotation: "+=360",
      duration: CONFIG.spinDuration,
      ease: "none"
    });
  }

  createSpinTimeline();

  function cleanupTarget(target) {
    if (currentLeaveHandler && target) {
      target.removeEventListener("mouseleave", currentLeaveHandler);
    }
    currentLeaveHandler = null;
  }

  tickerFn = function () {
    if (!targetCornerPositions || !corners.length) return;
    const strength = activeStrength.value;
    if (strength === 0) return;

    const cursorX = gsap.getProperty(cursor, "x");
    const cursorY = gsap.getProperty(cursor, "y");

    corners.forEach(function (corner, i) {
      const currentX = gsap.getProperty(corner, "x");
      const currentY = gsap.getProperty(corner, "y");
      const targetX = targetCornerPositions[i].x - cursorX;
      const targetY = targetCornerPositions[i].y - cursorY;
      const finalX = currentX + (targetX - currentX) * strength;
      const finalY = currentY + (targetY - currentY) * strength;
      const duration = strength >= 0.99 ? (CONFIG.parallaxOn ? 0.2 : 0) : 0.05;
      gsap.to(corner, {
        x: finalX,
        y: finalY,
        duration: duration,
        ease: duration === 0 ? "none" : "power1.out",
        overwrite: "auto"
      });
    });
  };

  function onMouseMove(e) {
    moveCursor(e.clientX, e.clientY);
  }

  function onScroll() {
    if (!activeTarget || !cursor) return;
    const mouseX = gsap.getProperty(cursor, "x");
    const mouseY = gsap.getProperty(cursor, "y");
    const under = document.elementFromPoint(
      Math.round(mouseX),
      Math.round(mouseY)
    );
    const still =
      under &&
      (under === activeTarget || under.closest(CONFIG.targetSelector) === activeTarget);
    if (!still && currentLeaveHandler) {
      currentLeaveHandler();
    }
  }

  function onMouseDown() {
    gsap.to(dot, { scale: 0.7, duration: 0.3 });
    gsap.to(cursor, { scale: 0.9, duration: 0.2 });
  }

  function onMouseUp() {
    gsap.to(dot, { scale: 1, duration: 0.3 });
    gsap.to(cursor, { scale: 1, duration: 0.2 });
  }

  function onMouseOver(e) {
    const directTarget = e.target;
    const allTargets = [];
    let current = directTarget;
    while (current && current !== document.body) {
      if (current.matches && current.matches(CONFIG.targetSelector)) {
        allTargets.push(current);
      }
      current = current.parentElement;
    }
    const target = allTargets[0] || null;
    if (!target) return;
    if (activeTarget === target) return;
    if (activeTarget) {
      cleanupTarget(activeTarget);
    }
    if (resumeTimeout) {
      clearTimeout(resumeTimeout);
      resumeTimeout = null;
    }

    activeTarget = target;
    gsap.ticker.remove(tickerFn);
    gsap.killTweensOf(activeStrength);
    activeStrength.value = 0;
    corners.forEach(function (corner) {
      gsap.killTweensOf(corner);
    });

    gsap.killTweensOf(cursor, "rotation");
    if (spinTl) spinTl.pause();
    gsap.set(cursor, { rotation: 0 });

    const rect = target.getBoundingClientRect();
    const bw = CONSTANTS.borderWidth;
    const cs = CONSTANTS.cornerSize;
    const cursorX = gsap.getProperty(cursor, "x");
    const cursorY = gsap.getProperty(cursor, "y");

    targetCornerPositions = [
      { x: rect.left - bw, y: rect.top - bw },
      { x: rect.right + bw - cs, y: rect.top - bw },
      { x: rect.right + bw - cs, y: rect.bottom + bw - cs },
      { x: rect.left - bw, y: rect.bottom + bw - cs }
    ];

    gsap.ticker.add(tickerFn);
    gsap.to(activeStrength, {
      value: 1,
      duration: CONFIG.hoverDuration,
      ease: "power2.out"
    });

    corners.forEach(function (corner, i) {
      gsap.to(corner, {
        x: targetCornerPositions[i].x - cursorX,
        y: targetCornerPositions[i].y - cursorY,
        duration: 0.2,
        ease: "power2.out"
      });
    });

    function leaveHandler() {
      gsap.killTweensOf(corners);
      gsap.ticker.remove(tickerFn);
      activeStrength.value = 0;
      gsap.killTweensOf(activeStrength);
      targetCornerPositions = null;
      activeTarget = null;

      const cs2 = CONSTANTS.cornerSize;
      const positions = [
        { x: -cs2 * 1.5, y: -cs2 * 1.5 },
        { x: cs2 * 0.5, y: -cs2 * 1.5 },
        { x: cs2 * 0.5, y: cs2 * 0.5 },
        { x: -cs2 * 1.5, y: cs2 * 0.5 }
      ];
      const tl = gsap.timeline();
      corners.forEach(function (corner, index) {
        tl.to(
          corner,
          {
            x: positions[index].x,
            y: positions[index].y,
            duration: 0.3,
            ease: "power3.out"
          },
          0
        );
      });

      resumeTimeout = setTimeout(function () {
        if (!activeTarget && cursor && spinTl) {
          const currentRotation = gsap.getProperty(cursor, "rotation");
          const normalizedRotation = currentRotation % 360;
          spinTl.kill();
          spinTl = gsap
            .timeline({ repeat: -1 })
            .to(cursor, { rotation: "+=360", duration: CONFIG.spinDuration, ease: "none" });
          gsap.to(cursor, {
            rotation: normalizedRotation + 360,
            duration: CONFIG.spinDuration * (1 - normalizedRotation / 360),
            ease: "none",
            onComplete: function () {
              if (spinTl) spinTl.restart();
            }
          });
        }
        resumeTimeout = null;
      }, 50);

      cleanupTarget(target);
    }

    currentLeaveHandler = leaveHandler;
    target.addEventListener("mouseleave", leaveHandler);
  }

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseover", onMouseOver, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);

  window.addEventListener(
    "beforeunload",
    function () {
      gsap.ticker.remove(tickerFn);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseover", onMouseOver);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      if (activeTarget) cleanupTarget(activeTarget);
      if (spinTl) spinTl.kill();
      document.body.style.cursor = originalBodyCursor;
      activeStrength.value = 0;
      targetCornerPositions = null;
    },
    { once: true }
  );
})();
