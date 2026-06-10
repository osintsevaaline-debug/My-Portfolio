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
    var body = new URLSearchParams();
    body.append("name", payload.name);
    body.append("email", payload.email);
    body.append("phone", payload.phone);
    body.append("source", payload.source || "portfolio-contact-form");

    return fetch(config.submissionsApiUrl, {
      method: "POST",
      mode: "no-cors",
      body: body
    }).then(function () {
      return { success: true };
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
})();
