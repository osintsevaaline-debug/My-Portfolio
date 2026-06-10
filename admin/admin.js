(function () {
  const DRAFT_KEY = "portfolio-content-draft";
  const CONTENT_URL = "../data/content.json";
  const CONTACT_CONFIG_URL = "../data/contact-config.json";
  const LOCAL_SUBMISSIONS_KEY = "portfolio-submissions";
  let content = null;
  let contactConfig = null;
  let memoryAuth = false;

  const $ = function (sel, root) { return (root || document).querySelector(sel); };
  const $$ = function (sel, root) { return Array.from((root || document).querySelectorAll(sel)); };

  function normalizePass(value) {
    return String(value || "").trim().normalize("NFC");
  }

  function getConfigPassword() {
    return window.ADMIN_CONFIG && normalizePass(window.ADMIN_CONFIG.password);
  }

  function setAuthed(value) {
    memoryAuth = !!value;
    if (!window.ADMIN_CONFIG || !window.ADMIN_CONFIG.sessionKey) return;
    try {
      if (value) {
        sessionStorage.setItem(window.ADMIN_CONFIG.sessionKey, "1");
      } else {
        sessionStorage.removeItem(window.ADMIN_CONFIG.sessionKey);
      }
    } catch (err) {
      /* sessionStorage может быть недоступен — используем memoryAuth */
    }
  }

  function toast(msg) {
    var el = $("#adminToast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("is-visible");
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove("is-visible"); }, 2600);
  }

  function isAuthed() {
    if (memoryAuth) return true;
    if (!window.ADMIN_CONFIG || !window.ADMIN_CONFIG.sessionKey) return false;
    try {
      return sessionStorage.getItem(window.ADMIN_CONFIG.sessionKey) === "1";
    } catch (err) {
      return memoryAuth;
    }
  }

  function showApp() {
    var login = $("#adminLogin");
    var shell = $("#adminShell");
    if (!login || !shell) {
      showLoginError("Ошибка разметки админки. Обновите страницу.");
      return;
    }
    login.hidden = true;
    login.setAttribute("aria-hidden", "true");
    shell.hidden = false;
    shell.removeAttribute("hidden");
    shell.setAttribute("aria-hidden", "false");
    toast("Вход выполнен");
    loadAndRender();
  }

  function showLogin() {
    var login = $("#adminLogin");
    var shell = $("#adminShell");
    if (login) {
      login.hidden = false;
      login.setAttribute("aria-hidden", "false");
    }
    if (shell) {
      shell.hidden = true;
      shell.setAttribute("aria-hidden", "true");
    }
  }

  function showLoginError(msg) {
    var el = $("#loginError");
    if (el) {
      el.textContent = msg;
      el.hidden = !msg;
    }
    if (msg) toast(msg);
  }

  function tryLogin() {
    var expected = getConfigPassword();
    if (!expected) {
      showLoginError("Пароль не задан в конфиге. Обновите страницу: Ctrl+Shift+R");
      return;
    }

    var pass = normalizePass($("#loginPassword") && $("#loginPassword").value);
    if (!pass) {
      showLoginError("Введите пароль");
      return;
    }

    if (pass === expected) {
      showLoginError("");
      setAuthed(true);
      showApp();
      return;
    }

    showLoginError("Неверный пароль. Проверьте раскладку, регистр и символы.");
    $("#loginPassword").value = "";
    $("#loginPassword").focus();
  }

  function bindLogin() {
    var form = $("#loginForm");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      tryLogin();
    });

    var submitBtn = $("#loginSubmitBtn");
    if (submitBtn) {
      submitBtn.addEventListener("click", tryLogin);
    }

    var passwordInput = $("#loginPassword");
    if (passwordInput) {
      passwordInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          tryLogin();
        }
      });
    }

    var logout = $("#logoutBtn");
    if (logout) {
      logout.addEventListener("click", function () {
        setAuthed(false);
        showLogin();
      });
    }
  }

  function field(label, id, value, type) {
    type = type || "text";
    var multiline = type === "textarea";
    return (
      '<div class="admin-field">' +
      '<label for="' + id + '">' + label + "</label>" +
      (multiline
        ? '<textarea id="' + id + '" data-path="' + id + '">' + (value || "") + "</textarea>"
        : '<input type="' + type + '" id="' + id + '" data-path="' + id + '" value="' + (value || "").replace(/"/g, "&quot;") + '">') +
      "</div>"
    );
  }

  function listField(label, id, items) {
    return (
      '<div class="admin-field">' +
      '<label for="' + id + '">' + label + " (каждый пункт с новой строки)</label>" +
      '<textarea id="' + id + '" data-path="' + id + '">' + (items || []).join("\n") + "</textarea>" +
      "</div>"
    );
  }

  function readList(id) {
    var el = document.getElementById(id);
    if (!el) return [];
    return el.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function collectFromForm() {
    var c = JSON.parse(JSON.stringify(content));

    c.meta.title = $("#f-meta-title").value;
    c.meta.description = $("#f-meta-description").value;

    c.hero.eyebrow = $("#f-hero-eyebrow").value;
    c.hero.lead = $("#f-hero-lead").value;
    c.hero.photo = $("#f-hero-photo").value;
    c.hero.photoAlt = $("#f-hero-photoAlt").value;
    c.hero.typewriter = readList("f-hero-typewriter");
    c.hero.highlightWord = $("#f-hero-highlight").value;

    c.about.title = $("#f-about-title").value;
    c.about.paragraphs = [$("#f-about-p1").value, $("#f-about-p2").value];
    c.about.services = readList("f-about-services");

    c.skills.title = $("#f-skills-title").value;
    c.skills.items = $$("#skillsList .admin-card").map(function (card) {
      return {
        title: $(".f-skill-title", card).value,
        text: $(".f-skill-text", card).value
      };
    });

    c.process.title = $("#f-process-title").value;
    c.process.steps = $$("#processList .admin-card").map(function (card) {
      return {
        title: $(".f-step-title", card).value,
        text: $(".f-step-text", card).value
      };
    });

    c.projects.title = $("#f-projects-title").value;
    c.projects.lead = $("#f-projects-lead").value;
    c.projects.items = $$("#projectsList .admin-card").map(function (card) {
      return {
        tag: $(".f-proj-tag", card).value,
        title: $(".f-proj-title", card).value,
        description: $(".f-proj-desc", card).value,
        meta: $(".f-proj-meta", card).value,
        image: $(".f-proj-image", card).value,
        imageAlt: $(".f-proj-alt", card).value,
        layout: $(".f-proj-layout", card).value,
        theme: $(".f-proj-theme", card).value,
        borderColor: $(".f-proj-border", card).value,
        gradient: $(".f-proj-gradient", card).value
      };
    });

    c.why.title = $("#f-why-title").value;
    c.why.intro = $("#f-why-intro").value;
    c.why.notOnly = readList("f-why-not");
    c.why.butAlso = readList("f-why-but");
    c.why.highlight = $("#f-why-highlight").value;

    c.stack.title = $("#f-stack-title").value;
    c.stack.badges = readList("f-stack-badges");
    c.stack.note = $("#f-stack-note").value;

    c.audience.title = $("#f-audience-title").value;
    c.audience.items = readList("f-audience-items");

    c.manifest.quote = $("#f-manifest-quote").value;

    c.reviews.title = $("#f-reviews-title").value;
    c.reviews.lead = $("#f-reviews-lead").value;
    c.reviews.hint = $("#f-reviews-hint").value;
    c.reviews.items = $$("#reviewsList .admin-card").map(function (card) {
      return {
        quote: $(".f-review-quote", card).value,
        author: $(".f-review-author", card).value,
        avatar: $(".f-review-avatar", card).value
      };
    });

    c.cta.title = $("#f-cta-title").value;
    c.cta.lead = $("#f-cta-lead").value;

    c.contacts.title = $("#f-contacts-title").value;
    c.contacts.telegram = { label: $("#f-tg-label").value, url: $("#f-tg-url").value };
    c.contacts.email = { label: $("#f-email-label").value, url: $("#f-email-url").value };
    c.contacts.application = { label: $("#f-app-label").value, url: $("#f-app-url").value };

    c.privacy.title = $("#f-privacy-title").value;
    c.privacy.paragraphs = readList("f-privacy-text");

    c.footer.brand = $("#f-footer-brand").value;
    c.footer.year = $("#f-footer-year").value;

    return c;
  }

  function renderSkills(items) {
    $("#skillsList").innerHTML = items.map(function (item, i) {
      return (
        '<div class="admin-card" data-index="' + i + '">' +
        '<div class="admin-card__head"><strong>Карточка ' + (i + 1) + "</strong></div>" +
        field("Заголовок", "", item.title) +
        field("Текст", "", item.text, "textarea") +
        "</div>"
      ).replace(/id=""/g, function () { return ""; }).replace(/data-path=""/g, "");
    }).join("");
    $$("#skillsList .admin-card").forEach(function (card, i) {
      $(".f-skill-title", card) || (card.querySelector("input").className = "f-skill-title");
      var inputs = card.querySelectorAll("input, textarea");
      if (inputs[0]) inputs[0].className = "f-skill-title";
      if (inputs[1]) inputs[1].className = "f-skill-text";
    });
  }

  function skillCardHtml(item, i) {
    return (
      '<div class="admin-card">' +
      '<div class="admin-card__head"><strong>Карточка ' + (i + 1) + "</strong></div>" +
      '<div class="admin-field"><label>Заголовок</label><input class="f-skill-title" value="' + (item.title || "").replace(/"/g, "&quot;") + '"></div>' +
      '<div class="admin-field"><label>Текст</label><textarea class="f-skill-text">' + (item.text || "") + "</textarea></div>" +
      "</div>"
    );
  }

  function stepCardHtml(item, i) {
    return (
      '<div class="admin-card">' +
      '<div class="admin-card__head"><strong>Шаг ' + (i + 1) + "</strong></div>" +
      '<div class="admin-field"><label>Заголовок</label><input class="f-step-title" value="' + (item.title || "").replace(/"/g, "&quot;") + '"></div>' +
      '<div class="admin-field"><label>Текст</label><textarea class="f-step-text">' + (item.text || "") + "</textarea></div>" +
      "</div>"
    );
  }

  function projectCardHtml(item, i) {
    return (
      '<div class="admin-card">' +
      '<div class="admin-card__head"><strong>Проект ' + (i + 1) + '</strong><button type="button" class="btn btn-sm btn-danger js-remove-project">Удалить</button></div>' +
      '<div class="admin-grid-2">' +
      '<div class="admin-field"><label>Тег</label><input class="f-proj-tag" value="' + (item.tag || "").replace(/"/g, "&quot;") + '"></div>' +
      '<div class="admin-field"><label>Заголовок</label><input class="f-proj-title" value="' + (item.title || "").replace(/"/g, "&quot;") + '"></div>' +
      "</div>" +
      '<div class="admin-field"><label>Описание</label><textarea class="f-proj-desc">' + (item.description || "") + "</textarea></div>" +
      '<div class="admin-field"><label>Meta</label><input class="f-proj-meta" value="' + (item.meta || "").replace(/"/g, "&quot;") + '"></div>' +
      '<div class="admin-grid-2">' +
      '<div class="admin-field"><label>Изображение (путь)</label><input class="f-proj-image" value="' + (item.image || "").replace(/"/g, "&quot;") + '"></div>' +
      '<div class="admin-field"><label>Alt</label><input class="f-proj-alt" value="' + (item.imageAlt || "").replace(/"/g, "&quot;") + '"></div>' +
      "</div>" +
      '<div class="admin-grid-2">' +
      '<div class="admin-field"><label>Layout</label><select class="f-proj-layout"><option value=""' + (item.layout === "" ? " selected" : "") + '>обычный</option><option value="lead"' + (item.layout === "lead" ? " selected" : "") + '>lead</option><option value="lead-reverse"' + (item.layout === "lead-reverse" ? " selected" : "") + '>lead-reverse</option></select></div>' +
      '<div class="admin-field"><label>Theme</label><select class="f-proj-theme"><option value=""' + (!item.theme ? " selected" : "") + '>—</option><option value="warm"' + (item.theme === "warm" ? " selected" : "") + '>warm</option><option value="fintech"' + (item.theme === "fintech" ? " selected" : "") + '>fintech</option></select></div>' +
      "</div>" +
      '<div class="admin-grid-2">' +
      '<div class="admin-field"><label>Цвет рамки</label><input class="f-proj-border" value="' + (item.borderColor || "#c4ff4d").replace(/"/g, "&quot;") + '"></div>' +
      '<div class="admin-field"><label>Gradient CSS</label><input class="f-proj-gradient" value="' + (item.gradient || "").replace(/"/g, "&quot;") + '"></div>' +
      "</div>" +
      "</div>"
    );
  }

  function reviewCardHtml(item, i) {
    return (
      '<div class="admin-card">' +
      '<div class="admin-card__head"><strong>Отзыв ' + (i + 1) + '</strong><button type="button" class="btn btn-sm btn-danger js-remove-review">Удалить</button></div>' +
      '<div class="admin-field"><label>Цитата</label><textarea class="f-review-quote">' + (item.quote || "") + "</textarea></div>" +
      '<div class="admin-grid-2">' +
      '<div class="admin-field"><label>Автор</label><input class="f-review-author" value="' + (item.author || "").replace(/"/g, "&quot;") + '"></div>' +
      '<div class="admin-field"><label>Аватар URL</label><input class="f-review-avatar" value="' + (item.avatar || "").replace(/"/g, "&quot;") + '"></div>' +
      "</div>" +
      "</div>"
    );
  }

  function renderAll(data) {
    content = data;
    $("#panel-meta").innerHTML =
      field("Title", "f-meta-title", data.meta.title) +
      field("Description", "f-meta-description", data.meta.description, "textarea");

    $("#panel-hero").innerHTML =
      field("Eyebrow", "f-hero-eyebrow", data.hero.eyebrow) +
      field("Lead", "f-hero-lead", data.hero.lead, "textarea") +
      '<div class="admin-grid-2">' + field("Фото", "f-hero-photo", data.hero.photo) + field("Alt фото", "f-hero-photoAlt", data.hero.photoAlt) + "</div>" +
      listField("Typewriter (фразы)", "f-hero-typewriter", data.hero.typewriter) +
      field("Highlight word", "f-hero-highlight", data.hero.highlightWord);

    $("#panel-about").innerHTML =
      field("Заголовок", "f-about-title", data.about.title) +
      field("Абзац 1", "f-about-p1", data.about.paragraphs[0], "textarea") +
      listField("Услуги", "f-about-services", data.about.services) +
      field("Абзац 2", "f-about-p2", data.about.paragraphs[1], "textarea");

    $("#panel-skills").innerHTML =
      field("Заголовок секции", "f-skills-title", data.skills.title) +
      '<div id="skillsList">' + data.skills.items.map(skillCardHtml).join("") + "</div>" +
      '<button type="button" class="btn btn-sm" id="addSkillBtn">+ Карточка</button>';

    $("#panel-process").innerHTML =
      field("Заголовок", "f-process-title", data.process.title) +
      '<div id="processList">' + data.process.steps.map(stepCardHtml).join("") + "</div>" +
      '<button type="button" class="btn btn-sm" id="addStepBtn">+ Шаг</button>';

    $("#panel-projects").innerHTML =
      field("Заголовок", "f-projects-title", data.projects.title) +
      field("Lead", "f-projects-lead", data.projects.lead, "textarea") +
      '<div id="projectsList">' + data.projects.items.map(projectCardHtml).join("") + "</div>" +
      '<button type="button" class="btn btn-sm" id="addProjectBtn">+ Проект</button>';

    $("#panel-why").innerHTML =
      field("Заголовок", "f-why-title", data.why.title) +
      field("Intro", "f-why-intro", data.why.intro) +
      listField("Не только", "f-why-not", data.why.notOnly) +
      listField("Но и", "f-why-but", data.why.butAlso) +
      field("Highlight", "f-why-highlight", data.why.highlight);

    $("#panel-stack").innerHTML =
      field("Заголовок", "f-stack-title", data.stack.title) +
      listField("Бейджи", "f-stack-badges", data.stack.badges) +
      field("Примечание", "f-stack-note", data.stack.note, "textarea");

    $("#panel-audience").innerHTML =
      field("Заголовок", "f-audience-title", data.audience.title) +
      listField("Пункты", "f-audience-items", data.audience.items);

    $("#panel-manifest").innerHTML = field("Цитата", "f-manifest-quote", data.manifest.quote, "textarea");

    $("#panel-reviews").innerHTML =
      field("Заголовок", "f-reviews-title", data.reviews.title) +
      field("Lead", "f-reviews-lead", data.reviews.lead, "textarea") +
      field("Подсказка", "f-reviews-hint", data.reviews.hint) +
      '<div id="reviewsList">' + data.reviews.items.map(reviewCardHtml).join("") + "</div>" +
      '<button type="button" class="btn btn-sm" id="addReviewBtn">+ Отзыв</button>';

    $("#panel-cta").innerHTML =
      field("Заголовок", "f-cta-title", data.cta.title) +
      field("Lead", "f-cta-lead", data.cta.lead, "textarea");

    $("#panel-contacts").innerHTML =
      field("Заголовок", "f-contacts-title", data.contacts.title) +
      '<div class="admin-grid-2">' + field("Telegram label", "f-tg-label", data.contacts.telegram.label) + field("Telegram URL", "f-tg-url", data.contacts.telegram.url) + "</div>" +
      '<div class="admin-grid-2">' + field("Email label", "f-email-label", data.contacts.email.label) + field("Email URL", "f-email-url", data.contacts.email.url) + "</div>" +
      '<div class="admin-grid-2">' + field("Заявка label", "f-app-label", data.contacts.application.label) + field("Заявка URL", "f-app-url", data.contacts.application.url) + "</div>";

    renderSubmissionsPanel();

    $("#panel-privacy").innerHTML =
      field("Заголовок", "f-privacy-title", data.privacy.title) +
      listField("Абзацы (каждый с новой строки, для длинных — один абзац = одна строка)", "f-privacy-text", data.privacy.paragraphs);

    $("#panel-footer").innerHTML =
      '<div class="admin-grid-2">' + field("Бренд", "f-footer-brand", data.footer.brand) + field("Год", "f-footer-year", data.footer.year) + "</div>";

    bindDynamicButtons();
  }

  function bindDynamicButtons() {
    var addSkill = $("#addSkillBtn");
    if (addSkill) addSkill.onclick = function () {
      content.skills.items.push({ title: "", text: "" });
      $("#skillsList").insertAdjacentHTML("beforeend", skillCardHtml({ title: "", text: "" }, content.skills.items.length - 1));
    };
    var addStep = $("#addStepBtn");
    if (addStep) addStep.onclick = function () {
      $("#processList").insertAdjacentHTML("beforeend", stepCardHtml({ title: "", text: "" }, $$("#processList .admin-card").length));
    };
    var addProject = $("#addProjectBtn");
    if (addProject) addProject.onclick = function () {
      var item = { tag: "", title: "", description: "", meta: "", image: "", imageAlt: "", layout: "", theme: "", borderColor: "#c4ff4d", gradient: "linear-gradient(145deg, rgba(124, 92, 255, 0.28), var(--bg-elevated))" };
      $("#projectsList").insertAdjacentHTML("beforeend", projectCardHtml(item, $$("#projectsList .admin-card").length));
      bindRemoveButtons();
    };
    var addReview = $("#addReviewBtn");
    if (addReview) addReview.onclick = function () {
      $("#reviewsList").insertAdjacentHTML("beforeend", reviewCardHtml({ quote: "", author: "", avatar: "" }, $$("#reviewsList .admin-card").length));
      bindRemoveButtons();
    };
    bindRemoveButtons();
  }

  function bindRemoveButtons() {
    $$(".js-remove-project").forEach(function (btn) {
      btn.onclick = function () { btn.closest(".admin-card").remove(); };
    });
    $$(".js-remove-review").forEach(function (btn) {
      btn.onclick = function () { btn.closest(".admin-card").remove(); };
    });
  }

  function getLocalSubmissions() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_SUBMISSIONS_KEY) || "[]");
    } catch (err) {
      return [];
    }
  }

  function formatSubmissionDate(value) {
    if (!value) return "—";
    var d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function collectContactConfigFromForm() {
    var web3 = $("#f-web3forms-key");
    var api = $("#f-submissions-api");
    var email = $("#f-notify-email");
    return {
      web3formsAccessKey: web3 ? web3.value.trim() : "",
      submissionsApiUrl: api ? api.value.trim() : "",
      notifyEmail: email ? email.value.trim() : "",
      telegramHint: (contactConfig && contactConfig.telegramHint) || "@Alina_Osintseva"
    };
  }

  function mergeSubmissions(remote, local) {
    var all = [];
    if (remote && remote.length) {
      all = remote.slice();
    }
    local.forEach(function (loc) {
      var duplicate = all.some(function (row) {
        return row.email === loc.email &&
          row.phone === loc.phone &&
          row.createdAt === loc.createdAt;
      });
      if (!duplicate) all.push(loc);
    });
    all.sort(function (a, b) {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
    return all;
  }

  function renderNumberedSubmissionsList(rows) {
    if (!rows.length) {
      return '<p class="admin-submissions-empty">Пока нет заявок.</p>';
    }
    return (
      '<ol class="admin-submissions-ol">' +
      rows.map(function (row, index) {
        var num = index + 1;
        return (
          '<li class="admin-submission-item">' +
          '<span class="admin-submission-num" aria-hidden="true">' + num + "</span>" +
          '<div class="admin-submission-body">' +
          '<div class="admin-submission-top">' +
          '<strong class="admin-submission-name">' + escapeHtml(row.name || "Без имени") + "</strong>" +
          '<time class="admin-submission-date">' + escapeHtml(formatSubmissionDate(row.createdAt)) + "</time>" +
          "</div>" +
          '<div class="admin-submission-contacts">' +
          '<a href="mailto:' + escapeHtml(row.email) + '">' + escapeHtml(row.email) + "</a>" +
          '<span class="admin-submission-sep">·</span>' +
          '<a href="tel:' + escapeHtml(String(row.phone || "").replace(/\s/g, "")) + '">' + escapeHtml(row.phone) + "</a>" +
          "</div>" +
          "</div>" +
          "</li>"
        );
      }).join("") +
      "</ol>"
    );
  }

  function loadRemoteSubmissions(apiUrl) {
    if (!apiUrl) return Promise.resolve([]);
    return fetch(apiUrl + (apiUrl.indexOf("?") >= 0 ? "&" : "?") + "v=" + Date.now())
      .then(function (res) {
        if (!res.ok) throw new Error("fetch_failed");
        return res.json();
      })
      .then(function (data) {
        return (data && data.submissions) || [];
      })
      .catch(function () {
        return null;
      });
  }

  function refreshSubmissionsList() {
    var listEl = $("#submissionsList");
    var statusEl = $("#submissionsStatus");
    if (!listEl) return;

    var cfg = collectContactConfigFromForm();
    if (statusEl) {
      statusEl.textContent = "Загрузка…";
      statusEl.classList.remove("is-error");
    }

    loadRemoteSubmissions(cfg.submissionsApiUrl).then(function (remote) {
      var local = getLocalSubmissions();
      var merged = mergeSubmissions(remote === null ? null : (remote || []), local);
      var html = "";

      if (remote === null && cfg.submissionsApiUrl) {
        html += '<p class="admin-submissions-empty is-error">Не удалось загрузить заявки. Проверьте URL Google Apps Script.</p>';
        if (local.length) {
          html += '<p class="admin-submissions-note">Показаны только заявки из этого браузера:</p>';
          html += renderNumberedSubmissionsList(local);
        }
      } else if (merged.length) {
        html +=
          '<p class="admin-submissions-count">Всего заявок: <strong>' + merged.length + "</strong></p>" +
          renderNumberedSubmissionsList(merged);
      } else if (!cfg.web3formsAccessKey && !cfg.submissionsApiUrl) {
        html =
          '<p class="admin-submissions-empty">Список пуст. Настройте Google Таблицу ниже — тогда каждая заявка с сайта появится здесь под номером 1, 2, 3…</p>';
      } else if (cfg.web3formsAccessKey && !cfg.submissionsApiUrl) {
        html =
          '<p class="admin-submissions-empty">Заявки уходят на почту <strong>' + escapeHtml(cfg.notifyEmail || "из Web3Forms") + "</strong>. " +
          "Чтобы видеть их списком в админке, подключите Google Таблицу (инструкция ниже).</p>";
      } else {
        html = '<p class="admin-submissions-empty">Пока нет заявок. Когда клиент напишет через форму — появится заявка №1.</p>';
      }

      listEl.innerHTML = html;
      if (statusEl) {
        statusEl.textContent = merged.length
          ? "Обновлено · " + merged.length + " заявок"
          : "Обновлено";
      }
    });
  }

  function renderSubmissionsPanel() {
    var panel = $("#panel-submissions");
    if (!panel) return;

    var cfg = contactConfig || {
      web3formsAccessKey: "",
      submissionsApiUrl: "",
      notifyEmail: "Osintseva.aline@gmail.com",
      telegramHint: "@Alina_Osintseva"
    };

    panel.innerHTML =
      '<div class="admin-submissions-header">' +
      "<h2 class=\"admin-submissions-title\">Входящие заявки</h2>" +
      '<div class="admin-submissions-actions">' +
      '<button type="button" class="btn" id="refreshSubmissionsBtn">Обновить</button>' +
      "</div>" +
      "</div>" +
      '<p class="admin-submissions-status" id="submissionsStatus"></p>' +
      '<div id="submissionsList" class="admin-submissions-list"></div>' +
      '<details class="admin-submissions-settings">' +
      "<summary>Настройка приёма заявок</summary>" +
      '<div class="admin-hint admin-submissions-hint">' +
      "<p>Чтобы заявки с сайта появлялись в списке выше:</p>" +
      "<ol>" +
      "<li>Создайте <a href=\"https://docs.google.com/spreadsheets\" target=\"_blank\" rel=\"noopener\">Google Таблицу</a>.</li>" +
      "<li>Расширения → Apps Script → вставьте код из <code>admin/google-apps-script-contact.js</code>.</li>" +
      "<li>Развернуть → Web App → доступ «Anyone» → скопируйте URL в поле ниже.</li>" +
      "<li>Скачайте <code>contact-config.json</code> и замените файл в репозитории.</li>" +
      "</ol>" +
      "<p>Дополнительно: <a href=\"https://web3forms.com\" target=\"_blank\" rel=\"noopener\">Web3Forms</a> — дублирование на почту.</p>" +
      "</div>" +
      field("URL Google Apps Script", "f-submissions-api", cfg.submissionsApiUrl) +
      field("Web3Forms Access Key (почта)", "f-web3forms-key", cfg.web3formsAccessKey, "password") +
      field("Email для уведомлений", "f-notify-email", cfg.notifyEmail) +
      '<button type="button" class="btn btn-sm" id="exportContactConfigBtn">Скачать contact-config.json</button>' +
      "</details>";

    var refreshBtn = $("#refreshSubmissionsBtn");
    if (refreshBtn) refreshBtn.onclick = refreshSubmissionsList;

    var exportBtn = $("#exportContactConfigBtn");
    if (exportBtn) {
      exportBtn.onclick = function () {
        var data = collectContactConfigFromForm();
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "contact-config.json";
        a.click();
        URL.revokeObjectURL(a.href);
        toast("Файл contact-config.json скачан");
      };
    }

    refreshSubmissionsList();
  }

  function loadContactConfig() {
    return fetch(CONTACT_CONFIG_URL + "?v=" + Date.now())
      .then(function (r) {
        if (!r.ok) throw new Error("config");
        return r.json();
      })
      .then(function (data) {
        contactConfig = data || {};
        return contactConfig;
      })
      .catch(function () {
        contactConfig = contactConfig || {};
        return contactConfig;
      });
  }

  function bindNav() {
    $$(".admin-nav button[data-panel]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        $$(".admin-nav button").forEach(function (b) { b.classList.remove("is-active"); });
        $$(".admin-panel").forEach(function (p) { p.classList.remove("is-active"); });
        btn.classList.add("is-active");
        var panel = document.getElementById("panel-" + btn.dataset.panel);
        if (panel) panel.classList.add("is-active");
        $("#panelTitle").textContent = btn.textContent;
        if (btn.dataset.panel === "submissions") {
          refreshSubmissionsList();
        }
      });
    });
  }

  function bindActions() {
    var saveDraftBtn = $("#saveDraftBtn");
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener("click", function () {
        var data = collectFromForm();
        localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
        toast("Черновик сохранён — откройте сайт с ?draft=1");
      });
    }

    var exportBtn = $("#exportBtn");
    if (exportBtn) {
      exportBtn.addEventListener("click", function () {
        var data = collectFromForm();
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "content.json";
        a.click();
        URL.revokeObjectURL(a.href);
        toast("Файл content.json скачан");
      });
    }

    var importInput = $("#importInput");
    if (importInput) {
      importInput.addEventListener("change", function (e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            renderAll(JSON.parse(reader.result));
            toast("JSON импортирован");
          } catch (err) {
            toast("Ошибка чтения JSON");
          }
        };
        reader.readAsText(file);
        e.target.value = "";
      });
    }

    var publishHintBtn = $("#publishHintBtn");
    if (publishHintBtn) {
      publishHintBtn.addEventListener("click", function () {
        var data = collectFromForm();
        localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "content.json";
        a.click();
        URL.revokeObjectURL(a.href);
        toast("Скачайте content.json и замените data/content.json в репозитории");
      });
    }
  }

  function loadAndRender() {
    loadContactConfig().then(function () {
      return fetch(CONTENT_URL + "?v=" + Date.now())
        .then(function (r) { return r.json(); })
        .then(renderAll);
    }).catch(function () {
      toast("Не удалось загрузить content.json");
    });
  }

  function boot() {
    try {
      bindLogin();
      bindNav();
      bindActions();
      if (isAuthed() && getConfigPassword()) {
        showApp();
      } else {
        setAuthed(false);
        showLogin();
      }
    } catch (err) {
      console.error(err);
      showLoginError("Ошибка админки. Обновите страницу или откройте консоль (F12).");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
