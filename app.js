/* ==========================================================================
   EMBER & SALT - 11-SCENE SCROLLYTELLING ENGINE
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Register GSAP plugins
  gsap.registerPlugin(ScrollTrigger);

  // Initialize Lenis Smooth Scroll (Fine pointers only)
  let lenis;
  if (!prefersReducedMotion && typeof Lenis !== 'undefined') {
    lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // smooth exponential ease
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      smoothTouch: false,
      infinite: false
    });

    // Update ScrollTrigger on Lenis scroll
    lenis.on('scroll', ScrollTrigger.update);

    // Sync GSAP ticker with Lenis requestAnimationFrame
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    // Disable lag smoothing to prevent visual latency
    gsap.ticker.lagSmoothing(0);
  }

  // Global DOM elements
  const scrollyCanvas = document.getElementById('scrolly-canvas');
  const globalProgressFill = document.getElementById('global-progress-fill');
  const globalSceneIndicator = document.getElementById('global-scene-indicator');
  const badgeTextPath = document.getElementById('badge-text-path');
  const globalBadge = document.getElementById('global-badge');

  // Custom Cursor
  const cursorDot = document.getElementById('cursor-dot');
  const cursorRing = document.getElementById('cursor-ring');
  
  if (cursorDot && cursorRing && !prefersReducedMotion) {
    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;
    
    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursorDot.style.left = `${mouseX}px`;
      cursorDot.style.top = `${mouseY}px`;
      cursorDot.style.opacity = '1';
      cursorRing.style.opacity = '1';
    });

    const animateCursor = () => {
      ringX += (mouseX - ringX) / 6;
      ringY += (mouseY - ringY) / 6;
      cursorRing.style.left = `${ringX}px`;
      cursorRing.style.top = `${ringY}px`;
      requestAnimationFrame(animateCursor);
    };
    animateCursor();

    document.addEventListener('mouseover', (e) => {
      if (e.target.closest('a, button, select, input, textarea, .chrome-rotating-badge')) {
        document.body.classList.add('hovered');
      } else {
        document.body.classList.remove('hovered');
      }
    });

    document.addEventListener('mouseleave', () => {
      cursorDot.style.opacity = '0';
      cursorRing.style.opacity = '0';
    });
  }

  // ==========================================================================
  // Headline Word-by-Word Reveal Splitter
  // ==========================================================================
  function splitHeadline(element) {
    const text = element.innerText.trim();
    const words = text.split(/\s+/);
    element.innerHTML = "";
    words.forEach(word => {
      const span = document.createElement("span");
      span.className = "blur-reveal-word";
      span.innerText = word + " ";
      element.appendChild(span);
    });
  }
  document.querySelectorAll('.blur-reveal-headline').forEach(splitHeadline);

  // Helper to build the GSAP timeline for blur-to-focus reveals
  function buildBlurReveal(headlineSelector, timeline, labelPosition = null) {
    const words = document.querySelectorAll(`${headlineSelector} .blur-reveal-word`);
    if (words.length === 0) return;
    
    timeline.fromTo(words, {
      filter: "blur(12px)",
      opacity: 0,
      scale: 1.08
    }, {
      filter: "blur(0px)",
      opacity: 1,
      scale: 1,
      stagger: 0.12,
      ease: "power2.out",
      duration: 0.8
    }, labelPosition);
  }

  // ==========================================================================
  // Unified Canvas Particle Rendering Engine
  // ==========================================================================
  let width = scrollyCanvas.width = window.innerWidth;
  let height = scrollyCanvas.height = window.innerHeight;
  const ctx = scrollyCanvas.getContext('2d');

  window.addEventListener('resize', () => {
    width = scrollyCanvas.width = window.innerWidth;
    height = scrollyCanvas.height = window.innerHeight;
  });

  let currentActiveScene = 1;

  // Particle sets
  const particles = [];
  const sparks = [];
  const textSparks = [];
  let sparkEmitterPoint = { x: 0, y: 0, active: false };

  // Drifting Embers (Swaps direction in Scene 5)
  class ScrollyParticle {
    constructor() {
      this.reset(true);
    }
    reset(initScatter = false) {
      this.x = Math.random() * width;
      const direction = (currentActiveScene === 5) ? -1 : 1;
      
      if (initScatter) {
        this.y = Math.random() * height;
      } else {
        this.y = direction === 1 ? (height + Math.random() * 50) : (-Math.random() * 50);
      }
      
      this.size = Math.random() * 1.6 + 0.5;
      this.speedY = (Math.random() * 0.6 + 0.2) * direction;
      this.speedX = Math.random() * 0.4 - 0.2;
      this.alpha = 1;
      this.fade = Math.random() * 0.0035 + 0.001;
      this.color = Math.random() > 0.45 ? '#c1440e' : '#d9b968';
    }
    update() {
      const direction = (currentActiveScene === 5) ? -1 : 1;
      this.y -= this.speedY; 
      this.x += this.speedX + Math.sin(this.y / 50) * 0.1;
      this.alpha -= this.fade;
      
      if (this.alpha <= 0 || (direction === 1 && this.y < -10) || (direction === -1 && this.y > height + 10)) {
        this.reset(false);
      }
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      ctx.shadowBlur = this.size * 3;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Scene 2 Sparks (Spit from line tip)
  class TrailSpark {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.size = Math.random() * 1.6 + 0.5;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2.8 + 1.2;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed - 0.3;
      this.alpha = 1;
      this.decay = Math.random() * 0.03 + 0.015;
      this.color = Math.random() > 0.3 ? '#c1440e' : '#e2703a';
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += 0.04; 
      this.alpha -= this.decay;
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      ctx.shadowBlur = this.size * 3;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Scene 8 Monospace Word Fragment Sparks Class
  const fragmentWords = ["SEAR 240°C", "BASTE", "PLATE", "GARNISH", "OAK FIRE", "REST 4 MIN"];
  class TextSpark {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.word = fragmentWords[Math.floor(Math.random() * fragmentWords.length)];
      this.speedY = Math.random() * 0.8 + 0.4;
      this.alpha = 1;
      this.fade = Math.random() * 0.003 + 0.002;
      this.color = Math.random() > 0.4 ? '#c1440e' : '#d9b968';
    }
    update() {
      this.y += this.speedY; 
      this.alpha -= this.fade;
    }
    draw(progress) {
      ctx.save();
      ctx.font = '600 11px "IBM Plex Mono", monospace';
      const colAlpha = Math.max(0, this.alpha - progress * 1.5);
      ctx.globalAlpha = colAlpha;
      ctx.fillStyle = this.color;
      ctx.fillText(this.word, this.x, this.y);
      ctx.restore();
    }
  }

  // Spawn initial embers
  for (let i = 0; i < 50; i++) {
    particles.push(new ScrollyParticle());
  }

  // Canvas loop
  const animateCanvas = () => {
    ctx.clearRect(0, 0, width, height);

    if (prefersReducedMotion) return;

    const activeEmbers = [1, 5, 10, 11];
    if (activeEmbers.includes(currentActiveScene)) {
      particles.forEach(p => {
        p.update();
        p.draw();
      });
    }

    if (currentActiveScene === 2 && sparkEmitterPoint.active) {
      for (let i = 0; i < 3; i++) {
        sparks.push(new TrailSpark(sparkEmitterPoint.x, sparkEmitterPoint.y));
      }
    }
    
    if (sparks.length > 0) {
      for (let i = sparks.length - 1; i >= 0; i--) {
        sparks[i].update();
        if (sparks[i].alpha <= 0) {
          sparks.splice(i, 1);
        } else {
          sparks[i].draw();
        }
      }
    }

    if (currentActiveScene === 8) {
      const scene8Trigger = ScrollTrigger.getById('st-scene-08');
      const progress = scene8Trigger ? scene8Trigger.progress : 0;

      if (Math.random() < 0.05 && textSparks.length < 25) {
        textSparks.push(new TextSpark(Math.random() * width, Math.random() * -50));
      }

      for (let i = textSparks.length - 1; i >= 0; i--) {
        textSparks[i].update();
        if (textSparks[i].alpha <= 0) {
          textSparks.splice(i, 1);
        } else {
          textSparks[i].draw(progress);
        }
      }
    } else {
      textSparks.length = 0; 
    }

    requestAnimationFrame(animateCanvas);
  };
  animateCanvas();

  // ==========================================================================
  // Fixed Ambient Gradient Wash Controls
  // ==========================================================================
  function shiftGradientWash(color1, color2, x1, y1, x2, y2) {
    if (prefersReducedMotion) return;
    
    gsap.to('#glow-orb-1', {
      background: `radial-gradient(circle, ${color1} 0%, rgba(193, 68, 14, 0) 70%)`,
      xPercent: x1,
      yPercent: y1,
      duration: 1.5,
      ease: "power2.out"
    });
    gsap.to('#glow-orb-2', {
      background: `radial-gradient(circle, ${color2} 0%, rgba(201, 162, 39, 0) 70%)`,
      xPercent: x2,
      yPercent: y2,
      duration: 1.5,
      ease: "power2.out"
    });
  }

  // Active scene pointer tracks (1 to 11)
  const totalScenes = 11;
  const badgeLabels = [
    "EXPLORE THE MENU &bull; RESERVE NOW &bull; ",
    "EXPLORE THE HEARTH &bull; EMBER &amp; SALT &bull; ",
    "EVERY CRYSTAL &bull; KONKAN HARVEST &bull; ",
    "TOMAHAWK SPIN &bull; FIRE SEAR &bull; ",
    "OUR SMOKE &bull; OUR STANDARD &bull; ",
    "SEE THE SOURCING &bull; FARM TO FLAME &bull; ",
    "LOBSTER SPIN &bull; MISO COALS &bull; ",
    "TASTING SELECTION &bull; CRAFT &bull; ",
    "DESSERT SPIN &bull; VALRHONA SWEET &bull; ",
    "LOW LIGHT &bull; NO RUSH &bull; ",
    "RESERVE NOW &bull; COME SIT BY THE FIRE &bull; "
  ];

  function updateBadgeLabel(index) {
    if (badgeTextPath) {
      gsap.to(globalBadge, {
        opacity: 0,
        scale: 0.8,
        duration: 0.3,
        onComplete: () => {
          badgeTextPath.innerHTML = badgeLabels[index];
          gsap.to(globalBadge, {
            opacity: 1,
            scale: 1,
            duration: 0.3
          });
        }
      });
    }
  }

  // Smooth scroll routing helper (Lenis integration)
  const smoothScrollToElement = (targetElement) => {
    if (targetElement) {
      const scrollPosition = ScrollTrigger.create({
        trigger: targetElement,
        start: "top top"
      }).start;

      if (lenis) {
        lenis.scrollTo(scrollPosition, {
          duration: 1.2,
          ease: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
        });
      } else {
        window.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        });
      }
    }
  };

  // ==========================================================================
  // Pinned GSAP ScrollTrigger Scene Timelines
  // ==========================================================================
  const initScrollytelling = () => {

    const registerNavigationMetrics = (sceneIndex) => {
      currentActiveScene = sceneIndex;
      globalSceneIndicator.innerText = `${sceneIndex < 10 ? '0' + sceneIndex : sceneIndex} / 11`;
      gsap.to(globalProgressFill, { scaleX: sceneIndex / totalScenes, ease: "power2.out", duration: 0.3 });
      updateBadgeLabel(sceneIndex - 1);
    };

    // 01 — HERO: FIRE. REVOLUTIONIZED.
    const tl1 = gsap.timeline({
      scrollTrigger: {
        trigger: "#scene-01",
        start: "top top",
        end: "+=100%",
        pin: true,
        scrub: 1.2,
        id: "st-scene-01",
        onToggle: (self) => {
          if (self.isActive) {
            registerNavigationMetrics(1);
            shiftGradientWash('#c1440e', '#c9a227', -20, -20, 20, 20);
          }
        }
      }
    });
    tl1.to("#scene-01 .zoom-img", { scale: 1.12, ease: "none" });
    buildBlurReveal("#scene-01", tl1, 0);

    // 02 — FIRST, THE HEARTH.
    const mainFuse = document.getElementById('fuse-main');
    const branch1 = document.getElementById('fuse-branch-1');
    const branch2 = document.getElementById('fuse-branch-2');
    const branch3 = document.getElementById('fuse-branch-3');

    const mainLen = mainFuse ? mainFuse.getTotalLength() : 0;
    const b1Len = branch1 ? branch1.getTotalLength() : 0;
    const b2Len = branch2 ? branch2.getTotalLength() : 0;
    const b3Len = branch3 ? branch3.getTotalLength() : 0;

    if (mainFuse) {
      mainFuse.style.strokeDasharray = mainLen;
      mainFuse.style.strokeDashoffset = mainLen;
      mainFuse.style.stroke = '#c1440e';
    }
    if (branch1) {
      branch1.style.strokeDasharray = b1Len;
      branch1.style.strokeDashoffset = b1Len;
      branch1.style.stroke = '#e2703a';
    }
    if (branch2) {
      branch2.style.strokeDasharray = b2Len;
      branch2.style.strokeDashoffset = b2Len;
      branch2.style.stroke = '#e2703a';
    }
    if (branch3) {
      branch3.style.strokeDasharray = b3Len;
      branch3.style.strokeDashoffset = b3Len;
      branch3.style.stroke = '#e2703a';
    }

    const tl2 = gsap.timeline({
      scrollTrigger: {
        trigger: "#scene-02",
        start: "top top",
        end: "+=120%",
        pin: true,
        scrub: 1.2,
        id: "st-scene-02",
        onToggle: (self) => {
          if (self.isActive) {
            registerNavigationMetrics(2);
            shiftGradientWash('#e2703a', '#0a0908', -30, -10, 0, 0);
          }
        },
        onUpdate: (self) => {
          if (prefersReducedMotion || !mainFuse) return;
          const progress = self.progress;
          sparkEmitterPoint.active = progress > 0.02 && progress < 0.98;
          
          if (sparkEmitterPoint.active) {
            const currentDistance = progress * mainLen;
            const pt = mainFuse.getPointAtLength(currentDistance);
            const rect = mainFuse.ownerSVGElement.getBoundingClientRect();
            
            sparkEmitterPoint.x = rect.left + (pt.x / 1000) * rect.width;
            sparkEmitterPoint.y = rect.top + (pt.y / 1000) * rect.height;
          }
        }
      }
    });
    if (mainFuse) tl2.to(mainFuse, { strokeDashoffset: 0, ease: "none" });
    if (branch1) tl2.to(branch1, { strokeDashoffset: 0, ease: "none" }, "-=0.75");
    if (branch2) tl2.to(branch2, { strokeDashoffset: 0, ease: "none" }, "-=0.5");
    if (branch3) tl2.to(branch3, { strokeDashoffset: 0, ease: "none" }, "-=0.35");
    buildBlurReveal("#scene-02", tl2, 0.15);

    // 03 — MACRO DETAIL: EVERY GRAIN OF SALT.
    const tl3 = gsap.timeline({
      scrollTrigger: {
        trigger: "#scene-03",
        start: "top top",
        end: "+=100%",
        pin: true,
        scrub: 1.2,
        id: "st-scene-03",
        onToggle: (self) => {
          if (self.isActive) {
            registerNavigationMetrics(3);
            shiftGradientWash('#d9b968', '#120f0d', 40, 10, -30, 40);
          }
        }
      }
    });
    if (!prefersReducedMotion) {
      tl3.fromTo("#salt-img", {
        filter: "blur(20px)",
        scale: 1.08
      }, {
        filter: "blur(0px)",
        scale: 1.0,
        ease: "none"
      });
    }
    buildBlurReveal("#scene-03", tl3, 0.1);

    // Helper to build 3D pedestal dish timelines
    function setupDishSpinTimeline(sceneId, triggerId, courseIndex, ambientColors) {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sceneId,
          start: "top top",
          end: "+=150%", 
          pin: true,
          scrub: 1.2,
          id: triggerId,
          onToggle: (self) => {
            if (self.isActive) {
              registerNavigationMetrics(courseIndex);
              shiftGradientWash(ambientColors[0], ambientColors[1], ambientColors[2], ambientColors[3], ambientColors[4], ambientColors[5]);
            }
          }
        }
      });

      // 1. 3D Spin rotateY 0 -> 360 & scale zoom-in
      tl.to(`${sceneId} .dish-pedestal`, {
        rotateY: 360,
        scale: 1.08,
        ease: "power1.inOut",
        duration: 1.2
      });

      // Perspective Shadow updates
      tl.to(`${sceneId} .dish-pedestal-shadow`, {
        scale: 1.1,
        opacity: 0.7,
        ease: "power1.inOut",
        duration: 1.2
      }, 0);

      // 2. Steam Container fade in at the end of spin
      tl.to(`${sceneId} .steam-container`, {
        opacity: 1,
        duration: 0.3
      });

      // 3. Details slide & fade in at the end
      tl.to(`${sceneId} .dish-details`, {
        opacity: 1,
        y: 0,
        duration: 0.4
      }, "-=0.15");

      // Stagger details headlines focus in
      buildBlurReveal(`${sceneId} .dish-details`, tl, "-=0.35");
    }

    // 04 — SIGNATURE DISH SPIN REVEAL: THE TOMAHAWK.
    setupDishSpinTimeline(
      "#scene-04", 
      "st-scene-04", 
      4, 
      ['#c1440e', '#d9b968', 10, -20, -10, 20]
    );

    // 05 — "OUR SMOKE. OUR STANDARD."
    const tl5 = gsap.timeline({
      scrollTrigger: {
        trigger: "#scene-05",
        start: "top top",
        end: "+=100%",
        pin: true,
        scrub: 1.2,
        id: "st-scene-05",
        onToggle: (self) => {
          if (self.isActive) {
            registerNavigationMetrics(5);
            shiftGradientWash('#e2703a', '#c1440e', -40, 30, 10, -30);
          }
        }
      }
    });
    tl5.to("#scene-05 .scale-img", { scale: 1.12, ease: "none" });
    buildBlurReveal("#scene-05", tl5, 0);

    // 06 — "WE GO TO THE SOURCE."
    const tl6 = gsap.timeline({
      scrollTrigger: {
        trigger: "#scene-06",
        start: "top top",
        end: "+=100%",
        pin: true,
        scrub: 1.2,
        id: "st-scene-06",
        onToggle: (self) => {
          if (self.isActive) {
            registerNavigationMetrics(6);
            shiftGradientWash('#c9a227', '#17110c', -10, -10, 30, 30);
          }
        }
      }
    });
    tl6.fromTo("#scene-06 .zoom-out-img", { scale: 1.15 }, { scale: 1.0, ease: "none" });
    buildBlurReveal("#scene-06", tl6, 0);

    // 07 — SIGNATURE DISH SPIN REVEAL: THE LOBSTER.
    setupDishSpinTimeline(
      "#scene-07", 
      "st-scene-07", 
      7, 
      ['#8ba870', '#d9b968', 20, 20, -20, -20]
    );

    // 08 — "TESTING. TASTING. AND MORE TASTING."
    const tl8 = gsap.timeline({
      scrollTrigger: {
        trigger: "#scene-08",
        start: "top top",
        end: "+=150%",
        pin: true,
        scrub: 1.2,
        id: "st-scene-08",
        onToggle: (self) => {
          if (self.isActive) {
            registerNavigationMetrics(8);
            shiftGradientWash('#c1440e', '#120f0d', -30, 10, 20, 30);
          }
        }
      }
    });
    tl8.fromTo("#tasting-img", { opacity: 0, scale: 1.12 }, { opacity: 1, scale: 1.0, ease: "none" });
    tl8.fromTo("#tasting-scrim", { opacity: 0 }, { opacity: 1, ease: "none" }, 0);
    buildBlurReveal("#scene-08", tl8, 0.2);

    // 09 — SIGNATURE DISH SPIN REVEAL: THE DESSERT.
    setupDishSpinTimeline(
      "#scene-09", 
      "st-scene-09", 
      9, 
      ['#784226', '#c1440e', 30, -20, -30, 10]
    );

    // 10 — THE ROOM: LOW LIGHT. NO RUSH.
    const tl10 = gsap.timeline({
      scrollTrigger: {
        trigger: "#scene-10",
        start: "top top",
        end: "+=100%",
        pin: true,
        scrub: 1.2,
        id: "st-scene-10",
        onToggle: (self) => {
          if (self.isActive) {
            registerNavigationMetrics(10);
            shiftGradientWash('#c9a227', '#17110c', 10, 10, -10, -10);
          }
        }
      }
    });
    buildBlurReveal("#scene-10", tl10, 0);

    if (!prefersReducedMotion) {
      gsap.to('.loop-zoom-img', {
        scale: 1.08,
        duration: 25,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
      gsap.to('#glow-orb-1', {
        opacity: 0.23,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    }

    // 11 — CLOSING: COME SIT BY THE FIRE.
    const tl11 = gsap.timeline({
      scrollTrigger: {
        trigger: "#scene-11",
        start: "top top",
        end: "+=100%",
        pin: true,
        scrub: 1.2,
        id: "st-scene-11",
        onToggle: (self) => {
          if (self.isActive) {
            registerNavigationMetrics(11);
            shiftGradientWash('#c1440e', '#e2703a', 0, 0, 0, 0);
          }
        }
      }
    });
    tl11.to("#scene-11 .zoom-img", { scale: 1.12, ease: "none" });
    buildBlurReveal("#scene-11", tl11, 0);
    tl11.fromTo("#open-reserve-btn", { opacity: 0 }, { opacity: 1, ease: "power2.out" }, "-=0.2");
  };

  // ==========================================================================
  // Preloader Execution
  // ==========================================================================
  const preloader = document.getElementById('preloader');
  const preloaderBar = document.getElementById('preloader-bar');
  
  if (preloader) {
    if (prefersReducedMotion) {
      preloader.style.display = 'none';
      initScrollytelling();
    } else {
      const loadTl = gsap.timeline({
        onComplete: () => {
          preloader.style.display = 'none';
          initScrollytelling();
        }
      });
      loadTl.to('.preloader-logo', { opacity: 1, y: 0, duration: 0.6 });
      loadTl.to(preloaderBar, { scaleX: 1, duration: 1.2, ease: "power1.inOut" }, "-=0.2");
      loadTl.to(preloader, { opacity: 0, yPercent: -100, duration: 0.8, ease: "power3.inOut" });
    }
  }

  // ==========================================================================
  // Global Badge Clicks (Auto scroll to target scenes)
  // ==========================================================================
  if (globalBadge) {
    globalBadge.addEventListener('click', () => {
      let nextScene = currentActiveScene + 1;
      if (nextScene > 11) nextScene = 1;
      
      const targetSceneEl = document.getElementById(`scene-${nextScene < 10 ? '0' + nextScene : nextScene}`);
      smoothScrollToElement(targetSceneEl);
    });
  }

  // ==========================================================================
  // Full-Screen Nav Glass Panel Menu Drawer
  // ==========================================================================
  const menuToggle = document.getElementById('menu-toggle');
  const chromeHeader = document.querySelector('.global-chrome-header');
  const fullScreenNav = document.getElementById('full-screen-nav');
  const navLinks = document.querySelectorAll('.nav-item-link');

  if (menuToggle && fullScreenNav) {
    menuToggle.addEventListener('click', () => {
      chromeHeader.classList.toggle('open');
      fullScreenNav.classList.toggle('active');
    });

    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        chromeHeader.classList.remove('open');
        fullScreenNav.classList.remove('active');

        const index = parseInt(link.getAttribute('data-index'));
        const targetSceneEl = document.getElementById(`scene-${index < 10 ? '0' + index : index}`);
        smoothScrollToElement(targetSceneEl);
      });
    });
  }

  // ==========================================================================
  // Reservation Modal Form Validation & Confirms
  // ==========================================================================
  const openReserveBtn = document.getElementById('open-reserve-btn');
  const reserveModal = document.getElementById('reserve-modal');
  const closeModalBtn = document.getElementById('close-modal');
  const bookingForm = document.getElementById('booking-form');
  
  const ticketModal = document.getElementById('ticket-modal');
  const closeTicketBtn = document.getElementById('close-ticket-btn');

  if (openReserveBtn && reserveModal && closeModalBtn) {
    openReserveBtn.addEventListener('click', () => {
      reserveModal.classList.add('active');
      if (lenis) lenis.stop(); // Stop scroll when modal is open
    });
    closeModalBtn.addEventListener('click', () => {
      reserveModal.classList.remove('active');
      if (lenis) lenis.start();
    });
    const dateInput = document.getElementById('form-date');
    if (dateInput) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.setAttribute('min', today);
    }
  }

  if (bookingForm && ticketModal) {
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('form-name').value;
      const guests = document.getElementById('form-guests').value;
      const phone = document.getElementById('form-phone').value;
      const dateVal = document.getElementById('form-date').value;
      const timeVal = document.getElementById('form-time').value;

      reserveModal.classList.remove('active');

      const ticketNum = 'ES-' + Math.floor(1000 + Math.random() * 9000);
      document.getElementById('ticket-number').innerText = `TICKET #${ticketNum}`;
      document.getElementById('modal-confirm-name').innerText = name;
      document.getElementById('modal-confirm-guests').innerText = guests;

      const dateObj = new Date(dateVal);
      const formattedDate = dateObj.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      document.getElementById('modal-confirm-date').innerText = formattedDate;

      const [hours, minutes] = timeVal.split(':');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedTime = `${hours % 12 || 12}:${minutes} ${ampm}`;
      document.getElementById('modal-confirm-time').innerText = formattedTime;

      document.getElementById('modal-confirm-phone').innerText = phone;

      ticketModal.classList.add('active');
      bookingForm.reset();
    });
  }

  if (closeTicketBtn && ticketModal) {
    closeTicketBtn.addEventListener('click', () => {
      ticketModal.classList.remove('active');
      if (lenis) lenis.start();
    });
  }

});
