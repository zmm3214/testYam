(() => {
  const carousel = document.querySelector('.carusel');
  const items = Array.from(document.querySelectorAll('.el'));
  const slides = Array.from(document.querySelectorAll('.slide-card'));
  const sliderSection = document.querySelector('.slider-wrapper');

  const N = items.length;

  // Настройки карусели
  const R = 353;
  const ANGLE_STEP = 22;
  const BASE_ANGLE = -11;

  // Синхронизировано с CSS (0.8s = 800ms)
  const DURATION = 800;

  // Состояние
  let currentSlide = 0;
  let isAnimating = false;

  // Переменные для анимации карусели
  let currentAngle = 0;
  let startAngle = 0;
  let endAngle = 0;
  let animationProgress = 1;
  let startTime = 0;

  // Медиа-запрос — один раз, чтобы не дёргать matchMedia в цикле
  const mobileMQ = window.matchMedia('(max-width: 768px)');
  const isMobile = () => mobileMQ.matches;

  // Обновление активных классов
  function updateUI(index) {
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
    });
    items.forEach((el, i) => {
      el.classList.toggle('active', i === index);
    });
  }

  // Переключение слайда
  function goToSlide(index, { animate = true } = {}) {
    if (index < 0 || index >= N) return;

    currentSlide = index;
    updateUI(index);

    // На мобилке (или когда анимация не нужна) — сразу ставим финальный угол,
    // чтобы при возврате на десктоп карусель оказалась в правильном положении.
    if (isMobile() || !animate) {
      currentAngle = index * ANGLE_STEP;
      startAngle = currentAngle;
      endAngle = currentAngle;
      animationProgress = 1;
      isAnimating = false;
      return;
    }

    // Десктоп — плавная анимация
    isAnimating = true;
    startAngle = currentAngle;
    endAngle = index * ANGLE_STEP;
    startTime = performance.now();
    animationProgress = 0;

    setTimeout(() => {
      isAnimating = false;
    }, DURATION);
  }

  // Анимационный цикл карусели
  function tick(now) {
    if (animationProgress < 1) {
      const elapsed = now - startTime;
      animationProgress = Math.min(elapsed / DURATION, 1);

      // Ease-out
      const easeOut = 1 - Math.pow(1 - animationProgress, 3);
      currentAngle = startAngle + (endAngle - startAngle) * easeOut;
    }

    // Расстановка элементов по дуге
    items.forEach((el, i) => {
      const angleDeg = (i * ANGLE_STEP) - currentAngle + BASE_ANGLE;
      const angleRad = angleDeg * Math.PI / 180;

      const x = Math.cos(angleRad) * R;
      const y = Math.sin(angleRad) * R;

      const depth = (Math.cos(angleRad) + 1) / 2;

      el.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
      el.style.zIndex = Math.round(depth * 100);
    });

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  // ============================================
  // ДЕСКТОП: перехват колеса мыши
  // ============================================
  window.addEventListener('wheel', (e) => {
    // На мобилке ничего не перехватываем — нативный скролл
    if (isMobile()) return;

    const rect = sliderSection.getBoundingClientRect();

    const isInView =
      rect.top < window.innerHeight * 0.5 &&
      rect.bottom > window.innerHeight * 0.5;

    if (!isInView) return;

    if (isAnimating) {
      e.preventDefault();
      return;
    }

    if (e.deltaY > 0) {
      if (currentSlide < N - 1) {
        e.preventDefault();
        goToSlide(currentSlide + 1);
      }
    } else if (e.deltaY < 0) {
      if (currentSlide > 0) {
        e.preventDefault();
        goToSlide(currentSlide - 1);
      }
    }
  }, { passive: false });

  // ============================================
  // МОБИЛКА: отслеживаем, какой слайд в зоне видимости.
  // Это нужно только чтобы при возврате на десктоп показать корректный слайд.
  // ============================================
  const observer = new IntersectionObserver((entries) => {
    if (!isMobile()) return;

    // Выбираем слайд с максимальным пересечением
    let bestEntry = null;
    let bestRatio = 0;

    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
        bestEntry = entry;
        bestRatio = entry.intersectionRatio;
      }
    });

    if (bestEntry && bestRatio > 0.5) {
      const index = slides.indexOf(bestEntry.target);
      if (index !== -1 && index !== currentSlide) {
        goToSlide(index, { animate: false });
      }
    }
  }, {
    threshold: [0, 0.25, 0.5, 0.75, 1],
  });

  slides.forEach((slide) => observer.observe(slide));

  // ============================================
  // Переключение mobile <-> desktop
  // ============================================
  mobileMQ.addEventListener('change', (e) => {
    if (e.matches) {
      // desktop -> mobile: прокручиваем страницу к текущему слайду,
      // чтобы пользователь увидел тот же слайд, что и на десктопе
      requestAnimationFrame(() => {
        const slide = slides[currentSlide];
        if (slide) {
          slide.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
      });
    } else {
      // mobile -> desktop: ставим карусель на нужный угол без анимации,
      // чтобы мгновенно показать корректный слайд
      currentAngle = currentSlide * ANGLE_STEP;
      startAngle = currentAngle;
      endAngle = currentAngle;
      animationProgress = 1;
      isAnimating = false;
      updateUI(currentSlide);
    }
  });

  // Стартовая инициализация
  updateUI(0);
})();