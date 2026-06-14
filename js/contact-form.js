(function () {
  const CONFIG_URL = "./data/contact-config.json";
  let contactConfig = null;

  function loadConfig() {
    if (contactConfig) return Promise.resolve(contactConfig);
    return fetch(CONFIG_URL + "?v=" + Date.now())
      .then(function (res) {
        if (!res.ok) throw new Error("config");
        return res.json();
      })
      .then(function (data) {
        contactConfig = data || {};
        return contactConfig;
      })
      .catch(function () {
        contactConfig = {};
        return contactConfig;
      });
  }

  function saveSubmissionLocally(payload) {
    try {
      var key = "portfolio-submissions";
      var list = JSON.parse(localStorage.getItem(key) || "[]");
      list.unshift({
        id: Date.now(),
        createdAt: new Date().toISOString(),
        name: payload.name,
        email: payload.email,
        phone: payload.phone
      });
      localStorage.setItem(key, JSON.stringify(list.slice(0, 100)));
    } catch (err) {
      /* ignore */
    }
  }

  function sendViaWeb3Forms(config, payload) {
    if (!config.web3formsAccessKey) {
      return Promise.reject(new Error("no_web3forms"));
    }
    return fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: config.web3formsAccessKey,
        subject: "Заявка с портфолио vcod.online",
        from_name: "Vibe Coder Portfolio",
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        message: "Новая заявка из формы «Написать мне»"
      })
    }).then(function (res) {
      return res.json();
    }).then(function (data) {
      if (!data.success) throw new Error(data.message || "send_failed");
      return data;
    });
  }

  function sendViaSheet(config, payload) {
    if (!config.submissionsApiUrl) {
      return Promise.reject(new Error("no_sheet"));
    }

    return new Promise(function (resolve) {
      var iframeName = "portfolio-sheet-" + Date.now();
      var iframe = document.createElement("iframe");
      iframe.name = iframeName;
      iframe.title = "portfolio-sheet-submit";
      iframe.setAttribute("hidden", "hidden");
      iframe.style.cssText = "position:absolute;width:0;height:0;border:0;visibility:hidden;";
      document.body.appendChild(iframe);

      var form = document.createElement("form");
      form.method = "POST";
      form.action = config.submissionsApiUrl;
      form.target = iframeName;
      form.acceptCharset = "UTF-8";

      [
        ["name", payload.name],
        ["email", payload.email],
        ["phone", payload.phone],
        ["source", payload.source || "portfolio-contact-form"]
      ].forEach(function (pair) {
        var input = document.createElement("input");
        input.type = "hidden";
        input.name = pair[0];
        input.value = pair[1];
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();

      window.setTimeout(function () {
        if (form.parentNode) form.parentNode.removeChild(form);
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        resolve({ success: true });
      }, 2000);
    });
  }

  function initContactForm() {
    var modal = document.getElementById("contactModal");
    var form = document.getElementById("contactForm");
    var errorEl = document.getElementById("contactFormError");
    var successEl = document.getElementById("contactFormSuccess");
    if (!modal || !form) return;

    var openTriggers = document.querySelectorAll("[data-open-contact]");
    var closeTriggers = modal.querySelectorAll("[data-close-contact]");
    var submitBtn = form.querySelector(".contact-form__submit");
    var lastFocus = null;

    function showError(msg) {
      if (!errorEl) return;
      errorEl.textContent = msg;
      errorEl.hidden = !msg;
    }

    function openModal() {
      lastFocus = document.activeElement;
      modal.hidden = false;
      modal.setAttribute("aria-hidden", "false");
      requestAnimationFrame(function () {
        modal.classList.add("is-open");
      });
      document.body.classList.add("contact-modal-open");
      var first = form.querySelector("input:not([type='checkbox'])");
      window.setTimeout(function () {
        first && first.focus();
      }, 80);
    }

    function closeModal() {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("contact-modal-open");
      showError("");
      window.setTimeout(function () {
        if (!modal.classList.contains("is-open")) {
          modal.hidden = true;
        }
      }, 360);
      if (lastFocus && typeof lastFocus.focus === "function") {
        lastFocus.focus();
      }
    }

    function resetFormState() {
      form.reset();
      modal.classList.remove("contact-modal--success");
      form.hidden = false;
      if (successEl) successEl.hidden = true;
      form.querySelectorAll(".is-invalid").forEach(function (el) {
        el.classList.remove("is-invalid");
      });
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Отправить";
      }
      showError("");
    }

    openTriggers.forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        resetFormState();
        openModal();
      });
    });

    closeTriggers.forEach(function (el) {
      el.addEventListener("click", closeModal);
    });

    modal.addEventListener("click", function (e) {
      if (e.target === modal.querySelector(".contact-modal__backdrop")) {
        closeModal();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal.classList.contains("is-open")) {
        closeModal();
      }
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      showError("");
      form.querySelectorAll(".is-invalid").forEach(function (el) {
        el.classList.remove("is-invalid");
      });

      var name = form.querySelector("#contactName");
      var email = form.querySelector("#contactEmail");
      var phone = form.querySelector("#contactPhone");
      var consent = form.querySelector("#contactConsent");

      if (!name.value.trim()) {
        name.classList.add("is-invalid");
        showError("Укажите имя.");
        name.focus();
        return;
      }
      if (!email.value.trim() || !email.checkValidity()) {
        email.classList.add("is-invalid");
        showError("Укажите корректный email.");
        email.focus();
        return;
      }
      if (!phone.value.trim()) {
        phone.classList.add("is-invalid");
        showError("Укажите номер телефона.");
        phone.focus();
        return;
      }
      if (!consent.checked) {
        showError("Нужно дать согласие на обработку персональных данных.");
        consent.focus();
        return;
      }

      var payload = {
        name: name.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim(),
        source: "portfolio-contact-form",
        createdAt: new Date().toISOString()
      };

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Отправка…";
      }

      loadConfig().then(function (config) {
        var tasks = [];

        if (config.web3formsAccessKey) {
          tasks.push(sendViaWeb3Forms(config, payload));
        }
        if (config.submissionsApiUrl) {
          tasks.push(sendViaSheet(config, payload));
        }

        if (!tasks.length) {
          saveSubmissionLocally(payload);
          modal.classList.add("contact-modal--success");
          form.hidden = true;
          if (successEl) successEl.hidden = false;
          return;
        }

        return Promise.allSettled(tasks).then(function (results) {
          var ok = results.some(function (r) { return r.status === "fulfilled"; });
          if (!ok) {
            throw new Error("send_failed");
          }
          saveSubmissionLocally(payload);
          modal.classList.add("contact-modal--success");
          form.hidden = true;
          if (successEl) successEl.hidden = false;
        });
      }).catch(function () {
        showError("Не удалось отправить заявку. Напишите в Telegram: @Alina_Osintseva");
      }).finally(function () {
        if (submitBtn && !modal.classList.contains("contact-modal--success")) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Отправить";
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initContactForm);
  } else {
    initContactForm();
  }
  document.addEventListener('DOMContentLoaded', function () {
  const form = document.querySelector('form');
  if (!form || form.dataset.formspree) return;
  form.dataset.formspree = 'true';

  const btn = form.querySelector('button[type="submit"]') || form.querySelector('button');
  const originalText = btn ? btn.innerText : 'Отправить';

  // Если кнопки нет — добавим кнопку в форму
  if (!btn) {
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.innerText = 'Отправить';
    form.appendChild(submitBtn);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.innerText = 'Отправка...'; }

    const formData = new FormData(form);
    fetch('https://formspree.io/f/mrevrzrl', {
      method: 'POST',
      body: formData,
      headers: { 'Accept': 'application/json' }
    })
    .then(res => res.json())
    .then(data => {
      alert('Сообщение отправлено! Мы свяжемся с вами.');
      form.reset();
      if (btn) { btn.disabled = false; btn.innerText = originalText; }
    })
    .catch(err => {
      console.error(err);
      alert('Ошибка при отправке. Попробуйте позже.');
      if (btn) { btn.disabled = false; btn.innerText = originalText; }
    });
  });
});
