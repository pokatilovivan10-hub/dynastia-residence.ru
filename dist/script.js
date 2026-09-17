(function () {
  "use strict";

  var METRIKA_COUNTER_ID = 112655218;
  var TOUR_FORM_GOAL = "tour_form_submit";
  var PHONE_CLICK_GOAL = "phone_click";

  function reachGoal(goalName) {
    if (typeof window.ym === "function") {
      window.ym(METRIKA_COUNTER_ID, "reachGoal", goalName);
    }
  }

  var prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header background on scroll ---------- */
  var header = document.getElementById("siteHeader");
  function updateHeader() {
    if (window.scrollY > 40) {
      header.classList.add("is-scrolled");
    } else {
      header.classList.remove("is-scrolled");
    }
  }
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  /* ---------- Scroll progress bar ---------- */
  var progressBar = document.getElementById("scrollProgress");
  if (progressBar) {
    var progressTicking = false;
    function updateProgress() {
      progressTicking = false;
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      progressBar.style.width = pct.toFixed(2) + "%";
    }
    function requestProgressUpdate() {
      if (!progressTicking) {
        progressTicking = true;
        window.requestAnimationFrame(updateProgress);
      }
    }
    updateProgress();
    window.addEventListener("scroll", requestProgressUpdate, { passive: true });
    window.addEventListener("resize", requestProgressUpdate, { passive: true });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  var staggerSelector = ".day-timeline, .team-grid, .safety-grid, .situations, .faq-grid, .principles, .reviews-grid, .photo-gallery";

  revealEls.forEach(function (el) {
    if (el.matches(staggerSelector)) {
      Array.prototype.forEach.call(el.children, function (child, i) {
        child.style.setProperty("--stagger", i);
      });
      el.classList.add("reveal-stagger");
    }
  });

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Price count-up animation ---------- */
  var countEls = document.querySelectorAll("[data-count-to]");
  if (countEls.length && "IntersectionObserver" in window && !prefersReducedMotion) {
    var countObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          countObserver.unobserve(entry.target);
          var el = entry.target;
          var target = parseInt(el.getAttribute("data-count-to"), 10);
          var duration = 1100;
          var start = null;

          function step(ts) {
            if (!start) start = ts;
            var progress = Math.min((ts - start) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            var current = Math.round(eased * target);
            el.textContent = current.toLocaleString("ru-RU");
            if (progress < 1) {
              window.requestAnimationFrame(step);
            } else {
              el.textContent = target.toLocaleString("ru-RU");
            }
          }
          window.requestAnimationFrame(step);
        });
      },
      { threshold: 0.5 }
    );
    countEls.forEach(function (el) { countObserver.observe(el); });
  }

  /* ---------- Parallax depth on scroll ---------- */
  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll(".parallax-layer"));

  if (!prefersReducedMotion && parallaxEls.length) {
    var ticking = false;

    function updateParallax() {
      ticking = false;
      var vh = window.innerHeight || document.documentElement.clientHeight;

      parallaxEls.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        var elCenter = rect.top + rect.height / 2;
        var progress = (elCenter - vh / 2) / vh; // roughly -1 (above) to 1 (below)
        var amplitude = el.classList.contains("parallax-deep") ? 70 : 30;
        var translate = Math.max(-1, Math.min(1, progress)) * amplitude;
        el.style.setProperty("--py", translate.toFixed(1) + "px");
      });
    }

    function requestParallaxUpdate() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(updateParallax);
      }
    }

    updateParallax();
    window.addEventListener("scroll", requestParallaxUpdate, { passive: true });
    window.addEventListener("resize", requestParallaxUpdate, { passive: true });
  }

  /* ---------- Phone input: light formatting ---------- */
  var phoneInput = document.getElementById("phone");
  if (phoneInput) {
    phoneInput.addEventListener("input", function () {
      var digits = phoneInput.value.replace(/\D/g, "").slice(0, 11);
      phoneInput.value = digits ? "+" + digits : "";
    });
    phoneInput.addEventListener("focus", function () {
      if (!phoneInput.value) phoneInput.value = "+7";
    });
  }

  /* ---------- Form intent ---------- */
  var intentInput = document.getElementById("intent");
  var formTitle = document.getElementById("formTitle");
  var formSubmit = document.getElementById("formSubmit");

  function setFormIntent(intent) {
    if (!intent) return;
    if (intentInput) intentInput.value = intent;
    if (!formTitle || !formSubmit) return;

    if (intent.indexOf("стоимост") !== -1 || intent.indexOf("цен") !== -1) {
      formTitle.textContent = "Узнать точную стоимость";
      formSubmit.textContent = "Получить расчёт";
    } else if (intent.indexOf("Экскурс") !== -1) {
      formTitle.textContent = "Записаться на экскурсию";
      formSubmit.textContent = "Записаться на экскурсию";
    } else {
      formTitle.textContent = "Обсудить вашу ситуацию";
      formSubmit.textContent = "Получить консультацию";
    }
  }

  document.querySelectorAll("[data-form-intent]").forEach(function (link) {
    link.addEventListener("click", function () {
      setFormIntent(link.getAttribute("data-form-intent"));
    });
  });

  document.querySelectorAll('a[href^="tel:"]').forEach(function (link) {
    link.addEventListener("click", function () {
      reachGoal(PHONE_CLICK_GOAL);
    });
  });

  /* ---------- Form submit ---------- */
  var tourForm = document.getElementById("tourForm");
  if (tourForm) {
    var leadEndpoint = "/send-lead.php";

    function ensureHiddenInput(name, value) {
      var input = tourForm.querySelector('input[name="' + name + '"]');
      if (!input) {
        input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        tourForm.appendChild(input);
      }
      input.value = value;
    }

    function submitViaIframe(formData, onDone) {
      var frameName = "leadSubmitFrame";
      var iframe = document.getElementById(frameName);
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = frameName;
        iframe.name = frameName;
        iframe.title = "Отправка заявки";
        iframe.style.display = "none";
        document.body.appendChild(iframe);
      }

      formData.forEach(function (value, key) {
        ensureHiddenInput(key, value);
      });

      iframe.onload = function () { onDone(); };
      tourForm.action = leadEndpoint;
      tourForm.method = "POST";
      tourForm.target = frameName;
      tourForm.submit();
    }

    function showSuccess() {
      document.getElementById("formFields").style.display = "none";
      var success = document.getElementById("formSuccess");
      success.classList.add("is-visible");

      reachGoal(TOUR_FORM_GOAL);
      if (window.gtag) { /* window.gtag('event', 'generate_lead'); */ }
    }

    tourForm.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = document.getElementById("name");
      var phone = document.getElementById("phone");
      var consent = document.getElementById("consent");
      var formError = document.getElementById("formError");

      var digitsOnly = phone.value.replace(/\D/g, "");
      var valid = true;

      [name, phone].forEach(function (field) { field.classList.remove("field-error"); });
      formError.classList.remove("is-visible");
      formError.textContent = "";

      if (!name.value.trim()) {
        name.classList.add("field-error");
        valid = false;
      }
      if (digitsOnly.length < 10) {
        phone.classList.add("field-error");
        valid = false;
      }
      if (!consent.checked) {
        valid = false;
      }

      if (!valid) {
        formError.textContent = "Проверьте имя, телефон и согласие на обработку данных.";
        formError.classList.add("is-visible");
        var firstInvalid = tourForm.querySelector(".field-error") || consent;
        firstInvalid.focus();
        return;
      }

      var submitBtn = tourForm.querySelector("button[type=submit]");
      var submitLabel = submitBtn ? submitBtn.textContent : "Отправить";
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Отправляем..."; }

      var formData = new FormData();
      formData.append("name", name.value.trim());
      formData.append("phone", phone.value.trim());
      formData.append("relation", document.getElementById("relation").value.trim());
      formData.append("intent", intentInput ? intentInput.value : "Экскурсия");
      formData.append("contact_method", document.getElementById("contactMethod").value);
      formData.append("website", document.getElementById("website").value);
      formData.append("source", "Сайт «Династия», страница: " + window.location.pathname);

      var params = new URLSearchParams(window.location.search);
      ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "yclid"].forEach(function (key) {
        if (params.get(key)) formData.append(key, params.get(key).slice(0, 300));
      });

      submitViaIframe(formData, showSuccess);
    });
  }
})();
