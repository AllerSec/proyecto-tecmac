/* ============================================
   TECMAC — Main JavaScript v3
   GSAP 3.12.5 + ScrollTrigger + Canvas Particles
   Premium Animation Rebuild — April 2026
   ============================================ */

function initApp() {

  // ── GSAP Setup ──
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: 'expo.out', overwrite: 'auto' });

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    gsap.set('.reveal, .reveal-left, .reveal-right, .reveal-scale', {
      autoAlpha: 1, x: 0, y: 0, scale: 1
    });
  }

  // ── Page Loader ──
  const loader = document.querySelector('.page-loader');
  let loaderDoneCallbacks = [];
  let loaderFinished = false;

  const loaderReady = (fn) => {
    if (loaderFinished) { fn(); return; }
    loaderDoneCallbacks.push(fn);
  };

  const resolveLoader = () => {
    loaderFinished = true;
    loaderDoneCallbacks.forEach(fn => fn());
    loaderDoneCallbacks = [];
  };

  // Wait for fonts to be ready (or timeout) before hiding loader — prevents CLS from font swap
  const fontsReady = (document.fonts && document.fonts.ready)
    ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))])
    : Promise.resolve();

  if (loader) {
    if (sessionStorage.getItem('tecmac_loaded')) {
      fontsReady.then(() => { loader.remove(); resolveLoader(); });
    } else {
      const loaderLogo = loader.querySelector('.page-loader__logo');
      const loaderBar  = loader.querySelector('.page-loader__bar-inner');
      const loaderTl   = gsap.timeline({
        onComplete: () => {
          gsap.to(loader, {
            autoAlpha: 0, duration: 0.8, ease: 'power2.inOut',
            onComplete: () => {
              loader.remove();
              sessionStorage.setItem('tecmac_loaded', '1');
              resolveLoader();
            }
          });
        }
      });
      loaderTl
        .to(loaderLogo, { autoAlpha: 1, scale: 1, duration: 0.7, ease: 'back.out(1.4)' })
        .to(loaderBar,  { width: '100%', duration: 1.2, ease: 'expo.inOut' }, '-=0.2')
        .to(loaderLogo, { autoAlpha: 0, y: -15, duration: 0.5, ease: 'power3.in' }, '+=0.15');

      // Fallback: si la página ya cargó y el loader aún es visible, ocultarlo inmediatamente
      window.addEventListener('load', () => {
        if (loader && loader.parentNode && !loaderFinished) {
          loaderTl.kill();
          gsap.to(loader, {
            autoAlpha: 0, duration: 0.5, ease: 'power2.inOut',
            onComplete: () => {
              loader.remove();
              sessionStorage.setItem('tecmac_loaded', '1');
              resolveLoader();
            }
          });
        }
      });
    }
  } else {
    resolveLoader();
  }

  // ── Scroll Progress ──
  const scrollBar = document.querySelector('.scroll-progress');
  if (scrollBar) {
    let scrollBarTicking = false;
    window.addEventListener('scroll', () => {
      if (!scrollBarTicking) {
        requestAnimationFrame(() => {
          const h = document.documentElement;
          scrollBar.style.width = ((h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100) + '%';
          scrollBarTicking = false;
        });
        scrollBarTicking = true;
      }
    }, { passive: true });
  }


  // ── Back to Top ──
  const btt = document.querySelector('.back-to-top');
  if (btt) {
    window.addEventListener('scroll', () => {
      btt.classList.toggle('visible', window.scrollY > 500);
    }, { passive: true });
    btt.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ── Header Scroll ──
  const header = document.querySelector('.header');
  if (header) {
    let headerTicking = false;
    window.addEventListener('scroll', () => {
      if (!headerTicking) {
        requestAnimationFrame(() => {
          header.classList.toggle('scrolled', window.scrollY > 60);
          headerTicking = false;
        });
        headerTicking = true;
      }
    }, { passive: true });
  }

  // ── Mobile Menu (GSAP) ──
  const toggle     = document.querySelector('.header__toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  const overlay    = document.querySelector('.mobile-menu__overlay');

  if (toggle && mobileMenu) {
    const menuLinks = mobileMenu.querySelectorAll('a');
    const openMenu = () => {
      toggle.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
      if (overlay) overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      mobileMenu.style.display = 'flex';
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.fromTo(mobileMenu, { x: '100%' }, { x: '0%', duration: 0.7 })
        .fromTo(menuLinks, { autoAlpha: 0, x: 40 }, { autoAlpha: 1, x: 0, stagger: 0.06, duration: 0.6 }, '-=0.35');
    };
    const closeMenu = () => {
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      if (overlay) overlay.classList.remove('open');
      document.body.style.overflow = '';
      gsap.to(mobileMenu, {
        x: '100%', duration: 0.5, ease: 'power3.in',
        onComplete: () => { mobileMenu.style.display = ''; }
      });
    };
    toggle.addEventListener('click', () => {
      toggle.classList.contains('open') ? closeMenu() : openMenu();
    });
    if (overlay) overlay.addEventListener('click', closeMenu);
    menuLinks.forEach(link => link.addEventListener('click', () => {
      if (toggle.classList.contains('open')) closeMenu();
    }));
  }

  // ── Hero Particle System (Steel Sparks with Glow) ──
  const particleCanvas = document.querySelector('.hero__particles canvas');
  if (!particleCanvas && document.querySelector('.hero__particles')) {
    const canvas    = document.createElement('canvas');
    const container = document.querySelector('.hero__particles');
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let particles = [];
    let w, h;

    const resize = () => {
      w = canvas.width  = container.offsetWidth;
      h = canvas.height = container.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x        = Math.random() * w;
        this.y        = Math.random() * h;
        this.size     = Math.random() * 2.2 + 0.4;
        this.speedX   = (Math.random() - 0.5) * 0.35;
        this.speedY   = -(Math.random() * 0.25 + 0.05);
        this.gravity  = Math.random() * 0.008;
        this.drift    = Math.random() * 0.03 + 0.01;
        this.driftAmp = Math.random() * 0.6 + 0.2;
        this.age      = 0;
        this.life     = Math.random() * 180 + 120;
        this.maxLife  = this.life;
        this.hue      = Math.random() > 0.7 ? 0 : 30;
        this.pulse    = Math.random() * Math.PI * 2;
      }
      update() {
        this.age++;
        this.speedY += this.gravity;
        this.x      += this.speedX + Math.sin(this.age * this.drift) * this.driftAmp;
        this.y      += this.speedY;
        this.pulse  += 0.04;
        this.life--;
        if (this.life <= 0 || this.x < -10 || this.x > w + 10 || this.y > h + 10 || this.y < -10) this.reset();
      }
      draw() {
        const t     = this.life / this.maxLife;
        const alpha = Math.sin(t * Math.PI) * 0.7;
        const glow  = 0.3 + Math.sin(this.pulse) * 0.15;
        const r     = this.size * (0.85 + Math.sin(this.pulse * 0.7) * 0.15);

        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r * 3.5);
        if (this.hue === 0) {
          grad.addColorStop(0, `rgba(230,57,70,${alpha * glow})`);
        } else {
          grad.addColorStop(0, `rgba(255,140,80,${alpha * glow * 0.6})`);
        }
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fillStyle = this.hue === 0
          ? `rgba(255,80,90,${alpha})`
          : `rgba(255,160,90,${alpha * 0.8})`;
        ctx.fill();
      }
    }

    const count = Math.min(80, Math.floor((w * h) / 15000));
    for (let i = 0; i < count; i++) particles.push(new Particle());

    const drawConnections = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx   = particles[i].x - particles[j].x;
          const dy   = particles[i].y - particles[j].y;
          const dist = dx * dx + dy * dy;
          if (dist < 14400) {
            const alpha = (1 - Math.sqrt(dist) / 120) * 0.1;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(230,57,70,${alpha})`;
            ctx.lineWidth   = 0.5;
            ctx.stroke();
          }
        }
      }
    };

    let animId = null;
    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      particles.forEach(p => { p.update(); p.draw(); });
      drawConnections();
      animId = requestAnimationFrame(animate);
    };

    const heroObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && !prefersReduced) {
          if (!animId) animate();
        } else if (animId) {
          cancelAnimationFrame(animId);
          animId = null;
        }
      });
    }, { threshold: 0.1 });
    heroObs.observe(container);
  }

  // ── Hero Entrance Timeline (premium stagger) ──
  if (document.querySelector('.hero')) {
    gsap.set(
      ['.hero__tagline', '.hero__title', '.hero__subtitle', '.hero__cta', '.hero__scroll'],
      { autoAlpha: 0, y: 30 }
    );
    loaderReady(() => {
      const tl = gsap.timeline({ delay: 0.2 });
      tl.fromTo('.hero__tagline',
        { autoAlpha: 0, y: 20 },
        { autoAlpha: 1, y: 0, duration: 1.4, ease: 'expo.out' })
      .fromTo('.hero__title',
        { autoAlpha: 0, y: 50 },
        { autoAlpha: 1, y: 0, duration: 1.6, ease: 'expo.out' }, '-=0.9')
      .fromTo('.hero__subtitle',
        { autoAlpha: 0, y: 20 },
        { autoAlpha: 1, y: 0, duration: 1.3, ease: 'expo.out' }, '-=0.8')
      .fromTo('.hero__cta',
        { autoAlpha: 0, y: 18, scale: 0.97 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 1.1, ease: 'back.out(1.2)' }, '-=0.7')
      .fromTo('.hero__scroll',
        { autoAlpha: 0, y: 10 },
        { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power4.out' }, '-=0.4');
    });
  }

  // ── Page Header Animation ──
  if (document.querySelector('.page-header')) {
    gsap.set(['.page-header__title', '.page-header__breadcrumb'], { autoAlpha: 0, y: 25 });
    loaderReady(() => {
      gsap.timeline({ delay: 0.2 })
        .to('.page-header__title',     { autoAlpha: 1, y: 0, duration: 1.4, ease: 'expo.out' })
        .to('.page-header__breadcrumb', { autoAlpha: 1, y: 0, duration: 1.0, ease: 'expo.out' }, '-=0.7');
    });
  }

  // ── Hero Slider (crossfade with incoming scale) ──
  const slides = document.querySelectorAll('.hero__slide');
  if (slides.length > 1) {
    let current = 0;
    gsap.set(slides, { autoAlpha: 0 });
    gsap.set(slides[0], { autoAlpha: 1, scale: 1 });
    const nextSlide = () => {
      const prev = current;
      current = (current + 1) % slides.length;
      const tl = gsap.timeline();
      tl.fromTo(slides[current],
        { autoAlpha: 0, scale: 1.05 },
        { autoAlpha: 1, scale: 1, duration: 2.4, ease: 'circ.inOut' })
      .to(slides[prev],
        { autoAlpha: 0, duration: 1.8, ease: 'power2.in' }, 0);
    };
    setInterval(nextSlide, 7500);
  } else if (slides.length === 1) {
    gsap.set(slides[0], { autoAlpha: 1 });
  }

  // ── Hero Mouse Parallax ──
  const hero = document.querySelector('.hero');
  if (hero && !prefersReduced) {
    const heroSlider  = hero.querySelector('.hero__slider');
    const heroContent = hero.querySelector('.hero__content');
    if (heroSlider && heroContent) {
      hero.addEventListener('mousemove', (e) => {
        const rect = hero.getBoundingClientRect();
        const xPos = (e.clientX - rect.left) / rect.width  - 0.5;
        const yPos = (e.clientY - rect.top)  / rect.height - 0.5;
        gsap.to(heroSlider,  { x: xPos * -20, y: yPos * -12, duration: 1.5, ease: 'power2.out' });
        gsap.to(heroContent, { x: xPos *  12, y: yPos *   6, duration: 1.5, ease: 'power2.out' });
      });
      hero.addEventListener('mouseleave', () => {
        gsap.to([heroSlider, heroContent], { x: 0, y: 0, duration: 2, ease: 'elastic.out(1, 0.5)' });
      });
    }
  }

  // ── ScrollTrigger Reveals (premium easing + variety) ──
  if (!prefersReduced) {
    gsap.set('.reveal',       { autoAlpha: 0, y: 50 });
    gsap.set('.reveal-left',  { autoAlpha: 0, x: -60 });
    gsap.set('.reveal-right', { autoAlpha: 0, x: 60 });
    gsap.set('.reveal-scale', { autoAlpha: 0, scale: 0.85, y: 20 });

    ScrollTrigger.batch('.reveal', {
      onEnter: (batch) => gsap.to(batch, {
        autoAlpha: 1, y: 0,
        stagger: { amount: 0.5, ease: 'power2.inOut' },
        duration: 1.4, ease: 'expo.out', clearProps: 'transform'
      }),
      start: 'top 90%', once: true
    });
    ScrollTrigger.batch('.reveal-left', {
      onEnter: (batch) => gsap.to(batch, {
        autoAlpha: 1, x: 0,
        stagger: 0.15, duration: 1.4, ease: 'expo.out', clearProps: 'transform'
      }),
      start: 'top 90%', once: true
    });
    ScrollTrigger.batch('.reveal-right', {
      onEnter: (batch) => gsap.to(batch, {
        autoAlpha: 1, x: 0,
        stagger: 0.15, duration: 1.4, ease: 'expo.out', clearProps: 'transform'
      }),
      start: 'top 90%', once: true
    });
    ScrollTrigger.batch('.reveal-scale', {
      onEnter: (batch) => gsap.to(batch, {
        autoAlpha: 1, scale: 1, y: 0,
        stagger: 0.12, duration: 1.2, ease: 'back.out(1.2)', clearProps: 'transform'
      }),
      start: 'top 92%', once: true
    });

    // ── fab-item-badge: badge pop on enter ──
    if (document.querySelector('.fab-item-badge')) {
      gsap.set('.fab-item-badge', { scale: 0, autoAlpha: 0 });
      ScrollTrigger.batch('.fab-item-badge', {
        onEnter: (batch) => gsap.to(batch, {
          scale: 1, autoAlpha: 1,
          stagger: 0.15, duration: 0.7, ease: 'back.out(2)', delay: 0.3
        }),
        start: 'top 96%', once: true
      });
    }

    // ── fab-fade: fabricacion gallery batch reveal ──
    if (document.querySelector('.fab-fade')) {
      gsap.set('.fab-fade', { autoAlpha: 0, y: 28 });
      ScrollTrigger.batch('.fab-fade', {
        interval: 0.08,
        batchMax: 6,
        onEnter: (batch) => gsap.to(batch, {
          autoAlpha: 1, y: 0,
          stagger: 0.07,
          duration: 0.9,
          ease: 'expo.out',
          clearProps: 'transform'
        }),
        start: 'top 100%',
        once: true
      });
      setTimeout(() => {
        document.querySelectorAll('.fab-fade').forEach(el => {
          if (parseFloat(getComputedStyle(el).opacity) < 0.1) {
            gsap.set(el, { autoAlpha: 1, y: 0, clearProps: 'transform' });
          }
        });
      }, 2500);
    }
  }

  // ── Keyword Highlight on scroll ──
  document.querySelectorAll('.keyword-highlight').forEach(el => {
    ScrollTrigger.create({
      trigger: el, start: 'top 85%', once: true,
      onEnter: () => gsap.delayedCall(0.6, () => el.classList.add('active'))
    });
  });

  // ── Counter Animation (expo burst) ──
  document.querySelectorAll('.counter').forEach(counter => {
    const target = parseInt(counter.dataset.target, 10);
    if (isNaN(target)) return;
    ScrollTrigger.create({
      trigger: counter, start: 'top 85%', once: true,
      onEnter: () => {
        gsap.to({ val: 0 }, {
          val: target, duration: 2.6, ease: 'expo.out',
          onUpdate: function () { counter.textContent = Math.round(this.targets()[0].val); }
        });
      }
    });
  });

  // ── Feature Card Hover (premium settle) ──
  document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      gsap.to(card, { y: -10, scale: 1.02, boxShadow: '0 24px 60px rgba(0,0,0,0.30)', duration: 0.7, ease: 'expo.out' });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, { y: 0, scale: 1, boxShadow: '0 4px 24px rgba(0,0,0,0.10)', duration: 0.9, ease: 'elastic.out(1, 0.5)' });
    });
  });

  // ── CTA Button Micro-interactions ──
  document.querySelectorAll('.hero__cta, .eng-category__btn, .contact-form__btn, .error-page__btn').forEach(btn => {
    const arrow = btn.querySelector('svg');
    if (arrow) {
      btn.addEventListener('mouseenter', () => gsap.to(arrow, { x: 6, duration: 0.5, ease: 'expo.out' }));
      btn.addEventListener('mouseleave', () => gsap.to(arrow, { x: 0, duration: 0.6, ease: 'elastic.out(1, 0.6)' }));
    }
  });

  // ── Magnetic Button Effect ──
  document.querySelectorAll('.hero__cta, .error-page__btn').forEach(btn => {
    if ('ontouchstart' in window) return;
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width  / 2;
      const y = e.clientY - rect.top  - rect.height / 2;
      gsap.to(btn, { x: x * 0.18, y: y * 0.18, duration: 0.7, ease: 'power2.out' });
    });
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1,0.4)' });
    });
  });

  // ── Services List Stagger on hover ──
  document.querySelectorAll('.services-list__item').forEach(item => {
    const svg = item.querySelector('svg');
    if (!svg) return;
    item.addEventListener('mouseenter', () => gsap.to(svg, { rotation: 360, scale: 1.15, duration: 0.8, ease: 'expo.out' }));
    item.addEventListener('mouseleave', () => gsap.to(svg, { rotation: 0, scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.5)' }));
  });

  // ── Gallery Lightbox ──
  const galleryItems = document.querySelectorAll('.gallery-item');
  const lightbox     = document.querySelector('.lightbox');

  if (galleryItems.length > 0 && lightbox) {
    const lightboxImg = lightbox.querySelector('.lightbox__img');
    const closeBtn    = lightbox.querySelector('.lightbox__close');
    const prevBtn     = lightbox.querySelector('.lightbox__prev');
    const nextBtn     = lightbox.querySelector('.lightbox__next');
    let currentIndex  = 0;
    const images      = Array.from(galleryItems).map(item => item.querySelector('img')?.src).filter(Boolean);

    const openLightbox = (index) => {
      currentIndex = index;
      lightboxImg.src = images[currentIndex];
      lightbox.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      gsap.fromTo(lightbox, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' });
      gsap.fromTo(lightboxImg, { scale: 0.90, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, delay: 0.15, ease: 'back.out(1.2)' });
    };
    const closeLightbox = () => {
      gsap.to(lightboxImg, { scale: 0.93, opacity: 0, duration: 0.35, ease: 'power3.in' });
      gsap.to(lightbox, {
        opacity: 0, duration: 0.4, delay: 0.1,
        onComplete: () => { lightbox.style.display = ''; document.body.style.overflow = ''; }
      });
    };
    const changeSlide = (newIndex) => {
      gsap.to(lightboxImg, {
        opacity: 0, x: newIndex > currentIndex ? -30 : 30, duration: 0.35, ease: 'power3.in',
        onComplete: () => {
          currentIndex = newIndex;
          lightboxImg.src = images[currentIndex];
          gsap.fromTo(lightboxImg,
            { opacity: 0, x: newIndex > currentIndex ? -30 : 30 },
            { opacity: 1, x: 0, duration: 0.5, ease: 'expo.out' });
        }
      });
    };

    galleryItems.forEach((item, i) => item.addEventListener('click', () => openLightbox(i)));
    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
    if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); changeSlide((currentIndex - 1 + images.length) % images.length); });
    if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); changeSlide((currentIndex + 1) % images.length); });
    document.addEventListener('keydown', (e) => {
      if (lightbox.style.display !== 'flex') return;
      if (e.key === 'Escape')     closeLightbox();
      if (e.key === 'ArrowLeft'  && prevBtn) prevBtn.click();
      if (e.key === 'ArrowRight' && nextBtn) nextBtn.click();
    });
  }

  // ── Cookie Banner ──
  const cookieBanner = document.querySelector('.cookie-banner');
  if (cookieBanner && !localStorage.getItem('tecmac_cookies')) {
    setTimeout(() => cookieBanner.classList.add('visible'), 1500);
    const acceptBtn = cookieBanner.querySelector('.cookie-banner__btn--accept');
    const rejectBtn = cookieBanner.querySelector('.cookie-banner__btn--reject');
    if (acceptBtn) acceptBtn.addEventListener('click', () => { localStorage.setItem('tecmac_cookies', 'accepted'); cookieBanner.classList.remove('visible'); });
    if (rejectBtn) rejectBtn.addEventListener('click', () => { localStorage.setItem('tecmac_cookies', 'rejected'); cookieBanner.classList.remove('visible'); });
  }

  // ── Contact Form ──
  const contactForm = document.querySelector('#contact-form');
  if (contactForm) {
    const FORM_URL = 'https://api.web3forms.com/submit';
    const FORM_KEY = 'f4a7bd76-1d17-46e5-b21a-b0445bd98c57';
    const formLoadTime = Date.now();
    const MIN_FILL_SECONDS = 3;
    const SPINNER_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';

    const looksLikeSpam = (d) => {
      const blob = `${d.nombre} ${d.apellidos} ${d.mensaje}`;
      if (/<script|function\s*\(|MailApp\.|ContentService|doPost|\.createTextOutput|onclick=|<iframe/i.test(blob)) return true;
      if ((blob.match(/https?:\/\//gi) || []).length >= 2) return true;
      if (/(.)\1{6,}/.test(blob)) return true;
      const name = `${d.nombre}${d.apellidos}`;
      if (name.length > 8 && /^[A-Za-z]+$/.test(name)) {
        const transitions = name.split('').slice(1).filter((c, i) => {
          const prev = name[i];
          return (c === c.toUpperCase()) !== (prev === prev.toUpperCase());
        }).length;
        if (transitions / name.length > 0.45) return true;
      }
      return false;
    };

    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = contactForm.querySelector('.contact-form__btn');
      const originalHTML = btn.innerHTML;
      const honeypot = contactForm.querySelector('[name="website"]');
      const elapsed = (Date.now() - formLoadTime) / 1000;
      const data = {
        nombre:    contactForm.querySelector('[name="nombre"]').value.trim(),
        apellidos: contactForm.querySelector('[name="apellidos"]').value.trim(),
        email:     contactForm.querySelector('[name="email"]').value.trim(),
        telefono:  contactForm.querySelector('[name="telefono"]').value.trim(),
        mensaje:   contactForm.querySelector('[name="mensaje"]').value.trim(),
        elapsed:   Math.round(elapsed),
        token:     'tecmac-' + Math.floor(formLoadTime / 1000)
      };

      const fakeSuccess = () => {
        contactForm.reset();
        btn.textContent = contactForm.dataset.success || 'Enviado';
        setTimeout(() => { btn.innerHTML = originalHTML; btn.disabled = false; }, 3000);
      };

      if ((honeypot && honeypot.value) || elapsed < MIN_FILL_SECONDS || looksLikeSpam(data)) {
        btn.disabled = true;
        btn.innerHTML = SPINNER_SVG;
        setTimeout(fakeSuccess, 800);
        return;
      }

      btn.innerHTML = SPINNER_SVG;
      btn.disabled = true;
      const payload = {
        access_key: FORM_KEY,
        subject: `Nuevo contacto desde tecmac.es — ${data.nombre} ${data.apellidos}`.trim(),
        from_name: `${data.nombre} ${data.apellidos}`.trim(),
        replyto: data.email,
        nombre: data.nombre,
        apellidos: data.apellidos,
        email: data.email,
        telefono: data.telefono,
        mensaje: data.mensaje,
        botcheck: ''
      };
      const restoreBtn = () => { btn.innerHTML = originalHTML; btn.disabled = false; };
      fetch(FORM_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) })
        .then(r => r.json())
        .then(res => {
          if (res && res.success) { contactForm.reset(); btn.textContent = contactForm.dataset.success || 'Enviado'; }
          else { btn.textContent = contactForm.dataset.error || 'Error'; }
          setTimeout(restoreBtn, 3000);
        })
        .catch(() => { btn.textContent = contactForm.dataset.error || 'Error'; setTimeout(restoreBtn, 3000); });
    });
  }

  // ── Smooth Anchor Links ──
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });

  // ── Image Load Reveal ──
  document.querySelectorAll('.feature-card__bg img, .eng-category__preview-thumb img').forEach(img => {
    const reveal = () => img.classList.add('img-loaded');
    if (img.complete && img.naturalHeight !== 0) reveal();
    else { img.addEventListener('load', reveal); img.addEventListener('error', reveal); }
  });

  // ── Parallax on Page Header BG ──
  const pageHeaderBg = document.querySelector('.page-header__bg');
  if (pageHeaderBg && !prefersReduced) {
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      if (scrollY < 600) gsap.set(pageHeaderBg, { y: scrollY * 0.3 });
    }, { passive: true });
  }

  // ── Tilt Effect on Reference Items ──
  if (!('ontouchstart' in window)) {
    document.querySelectorAll('.reference-item').forEach(item => {
      item.addEventListener('mousemove', (e) => {
        const rect = item.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width  - 0.5;
        const y = (e.clientY - rect.top)  / rect.height - 0.5;
        gsap.to(item, { rotationY: x * 10, rotationX: -y * 10, duration: 0.7, ease: 'power2.out', transformPerspective: 600 });
      });
      item.addEventListener('mouseleave', () => {
        gsap.to(item, { rotationY: 0, rotationX: 0, duration: 1.0, ease: 'elastic.out(1, 0.4)' });
      });
    });
  }

  // ── Language Auto-Detection (only root, never inside subfolders) ──
  const inSubfolder = /\/(es|en|eu|fr)(\/|$)/.test(window.location.pathname);
  if (!inSubfolder && (window.location.pathname === '/' || window.location.pathname.endsWith('index.html'))) {
    const saved = localStorage.getItem('tecmac_lang');
    if (!saved) {
      const lang = (navigator.language || 'es').toLowerCase();
      let target = null;
      if (lang.startsWith('fr')) target = 'fr/index.html';
      else if (lang.startsWith('en')) target = 'en/index.html';
      if (target) {
        localStorage.setItem('tecmac_lang', lang.substring(0, 2));
        sessionStorage.setItem('tecmac_loaded', '1');
        window.location.replace(target);
      }
    }
  }

  // ── Prefetch pages for instant navigation ──
  const prefetchPages = () => {
    document.querySelectorAll('.header__nav a, .footer__links a, .mobile-menu a').forEach(link => {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('http') && !href.startsWith('mailto')) {
        const prefetchLink = document.createElement('link');
        prefetchLink.rel  = 'prefetch';
        prefetchLink.href = href;
        document.head.appendChild(prefetchLink);
      }
    });
  };
  if ('requestIdleCallback' in window) requestIdleCallback(prefetchPages);
  else setTimeout(prefetchPages, 2000);

}

// Guaranteed to run after GSAP (loaded in <head>) and DOM are both ready
function safeInitApp() {
  try {
    initApp();
  } catch (err) {
    console.error('TECMAC initApp error:', err);
    const loader = document.querySelector('.page-loader');
    if (loader) loader.remove();
    document.querySelectorAll('[style*="visibility: hidden"]').forEach(el => {
      el.style.visibility = 'visible';
      el.style.opacity = '1';
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', safeInitApp);
} else {
  safeInitApp();
}
