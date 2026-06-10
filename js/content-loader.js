(function () {
  const DRAFT_KEY = "portfolio-content-draft";
  const CONTENT_URL = "./data/content.json";

  function padNum(n) {
    return String(n).padStart(2, "0");
  }

  function projectClasses(item) {
    const classes = ["project-showcase-card", "chroma-card", "cursor-target"];
    if (item.layout === "lead") classes.push("project-showcase-card--lead");
    if (item.layout === "lead-reverse") {
      classes.push("project-showcase-card--lead", "project-showcase-card--lead-reverse");
    }
    if (item.theme) classes.push("project-showcase-card--" + item.theme);
    return classes.join(" ");
  }

  function renderProject(item) {
    const article = document.createElement("article");
    article.className = projectClasses(item);
    article.style.cssText =
      "--card-border: " + item.borderColor + "; --card-gradient: " + item.gradient + ";";
    article.innerHTML =
      '<figure class="project-showcase-card__frame">' +
      '<img src="' + item.image + '" alt="' + item.imageAlt + '" loading="lazy" decoding="async">' +
      "</figure>" +
      '<div class="project-showcase-card__body">' +
      '<span class="project-tag">' + item.tag + "</span>" +
      "<h3>" + item.title + "</h3>" +
      "<p>" + item.description + "</p>" +
      '<p class="project-meta">' + item.meta + "</p>" +
      "</div>";
    return article;
  }

  function renderTestimonial(item, index) {
    const article = document.createElement("article");
    article.className = "testimonial-card cursor-target";
    article.dataset.card = String(index);
    article.innerHTML =
      '<img class="testimonial-card__avatar" src="' + item.avatar + '" alt="" width="128" height="128" loading="lazy" decoding="async">' +
      '<blockquote class="testimonial-card__quote">' + item.quote + "</blockquote>" +
      '<p class="testimonial-card__author">' + item.author + "</p>";
    return article;
  }

  function applyContent(data) {
    window.__PORTFOLIO_CONTENT__ = data;

    if (data.meta) {
      document.title = data.meta.title || document.title;
      var desc = document.querySelector('meta[name="description"]');
      if (desc && data.meta.description) desc.setAttribute("content", data.meta.description);
    }

    if (data.hero) {
      var eyebrow = document.querySelector(".hero .eyebrow");
      var lead = document.querySelector(".hero-lead");
      var photo = document.querySelector(".hero-photo-img");
      if (eyebrow) eyebrow.textContent = data.hero.eyebrow;
      if (lead) lead.textContent = data.hero.lead;
      if (photo) {
        if (data.hero.photo) photo.src = data.hero.photo;
        if (data.hero.photoAlt) photo.alt = data.hero.photoAlt;
      }
      if (data.hero.typewriter && data.hero.typewriter[0]) {
        var heroType = document.getElementById("heroTextType");
        if (heroType) heroType.setAttribute("aria-label", data.hero.typewriter[0]);
      }
    }

    if (data.about) {
      var aboutTitle = document.querySelector("#about .section-title");
      if (aboutTitle) aboutTitle.textContent = data.about.title;
      var aboutProse = document.querySelector("#about .prose");
      if (aboutProse && data.about.paragraphs) {
        var services = (data.about.services || [])
          .map(function (s) { return "<li>" + s + "</li>"; })
          .join("");
        aboutProse.innerHTML =
          "<p>" + data.about.paragraphs[0] + "</p>" +
          '<p class="label">Я делаю:</p>' +
          '<ul class="tag-list">' + services + "</ul>" +
          "<p>" + (data.about.paragraphs[1] || "") + "</p>";
      }
    }

    if (data.skills) {
      var skillsTitle = document.querySelector("#skills .section-title");
      if (skillsTitle) skillsTitle.textContent = data.skills.title;
      var cardsGrid = document.querySelector("#skills .cards-grid");
      if (cardsGrid && data.skills.items) {
        cardsGrid.innerHTML = data.skills.items
          .map(function (item, i) {
            return (
              '<article class="card">' +
              '<span class="card-num">' + padNum(i + 1) + "</span>" +
              "<h3>" + item.title + "</h3>" +
              "<p>" + item.text + "</p>" +
              "</article>"
            );
          })
          .join("");
      }
    }

    if (data.process) {
      var processTitle = document.querySelector("#process .section-title");
      if (processTitle) processTitle.textContent = data.process.title;
      var processList = document.querySelector("#process .process-list");
      if (processList && data.process.steps) {
        processList.innerHTML = data.process.steps
          .map(function (step, i) {
            return (
              "<li>" +
              '<span class="process-step">' + padNum(i + 1) + "</span>" +
              "<div><h3>" + step.title + "</h3><p>" + step.text + "</p></div>" +
              "</li>"
            );
          })
          .join("");
      }
    }

    if (data.projects) {
      var projectsTitle = document.querySelector("#projects .section-title");
      var projectsLead = document.querySelector("#projects .section-lead");
      if (projectsTitle) projectsTitle.textContent = data.projects.title;
      if (projectsLead) projectsLead.textContent = data.projects.lead;
      var showcase = document.querySelector("#projects .projects-showcase");
      if (showcase && data.projects.items) {
        showcase.innerHTML = "";
        data.projects.items.forEach(function (item) {
          showcase.appendChild(renderProject(item));
        });
        if (typeof window.reinitChromaGrid === "function") {
          window.setTimeout(window.reinitChromaGrid, 50);
        }
      }
    }

    if (data.why) {
      var whyTitle = document.querySelector("#why .section-title");
      var whyIntro = document.querySelector("#why .prose");
      var highlight = document.querySelector("#why .highlight-line");
      if (whyTitle) whyTitle.textContent = data.why.title;
      if (whyIntro) whyIntro.textContent = data.why.intro;
      var whyGrid = document.querySelector("#why .why-grid");
      if (whyGrid) {
        var notOnly = (data.why.notOnly || []).map(function (x) { return "<li>" + x + "</li>"; }).join("");
        var butAlso = (data.why.butAlso || []).map(function (x) { return "<li>" + x + "</li>"; }).join("");
        whyGrid.innerHTML =
          "<div><p class=\"label\">Не только:</p><ul class=\"plain-list\">" + notOnly + "</ul></div>" +
          "<div><p class=\"label\">Но и:</p><ul class=\"plain-list\">" + butAlso + "</ul></div>";
      }
      if (highlight) highlight.textContent = data.why.highlight;
    }

    if (data.stack) {
      var stackTitle = document.querySelector("#stack .section-title");
      var badges = document.querySelector("#stack .badges");
      var stackNote = document.querySelector("#stack .stack-note");
      if (stackTitle) stackTitle.textContent = data.stack.title;
      if (badges && data.stack.badges) {
        badges.innerHTML = data.stack.badges.map(function (b) { return "<span>" + b + "</span>"; }).join("");
      }
      if (stackNote) stackNote.textContent = data.stack.note;
    }

    if (data.audience) {
      var audienceTitle = document.querySelector("#audience .section-title");
      var audienceList = document.querySelector("#audience .audience-list");
      if (audienceTitle) audienceTitle.textContent = data.audience.title;
      if (audienceList && data.audience.items) {
        audienceList.innerHTML = data.audience.items.map(function (x) { return "<li>" + x + "</li>"; }).join("");
      }
    }

    if (data.manifest) {
      var quote = document.querySelector(".manifest-quote");
      if (quote) quote.textContent = data.manifest.quote;
    }

    if (data.reviews) {
      var reviewsTitle = document.getElementById("reviews-title");
      var reviewsLead = document.querySelector("#reviews .section-lead");
      var reviewsHint = document.getElementById("testimonialsHint");
      if (reviewsTitle) reviewsTitle.textContent = data.reviews.title;
      if (reviewsLead) reviewsLead.textContent = data.reviews.lead;
      if (reviewsHint) reviewsHint.textContent = data.reviews.hint;
      var viewport = document.getElementById("testimonialsViewport");
      if (viewport && data.reviews.items) {
        viewport.innerHTML = "";
        data.reviews.items.forEach(function (item, i) {
          viewport.appendChild(renderTestimonial(item, i));
        });
        document.dispatchEvent(new CustomEvent("testimonials:updated"));
      }
    }

    if (data.cta) {
      var ctaTitle = document.querySelector("#cta .section-title");
      var ctaLead = document.querySelector("#cta .section-lead");
      if (ctaTitle) ctaTitle.textContent = data.cta.title;
      if (ctaLead) ctaLead.textContent = data.cta.lead;
    }

    if (data.contacts) {
      var contactsTitle = document.querySelector("#contact .section-title");
      var contactsList = document.querySelector("#contact .contacts");
      if (contactsTitle) contactsTitle.textContent = data.contacts.title;
      if (contactsList) {
        var c = data.contacts;
        contactsList.innerHTML =
          "<li><strong>Telegram:</strong> <a href=\"" + c.telegram.url + "\">" + c.telegram.label + "</a></li>" +
          "<li><strong>Email:</strong> <a href=\"" + c.email.url + "\">" + c.email.label + "</a></li>" +
          "<li><strong>Оформить заявку :</strong> <a href=\"" + c.application.url + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + c.application.label + "</a></li>";
      }
    }

    if (data.privacy) {
      var privacyTitle = document.getElementById("privacy-title");
      var privacyText = document.querySelector(".privacy-policy__text");
      if (privacyTitle) privacyTitle.textContent = data.privacy.title;
      if (privacyText && data.privacy.paragraphs) {
        privacyText.innerHTML = data.privacy.paragraphs
          .map(function (p) {
            var html = p
              .replace(/Осинцева Алина/g, "<strong>Осинцева Алина</strong>")
              .replace(/Osintseva\.aline@gmail\.com/g, '<a href="mailto:Osintseva.aline@gmail.com">Osintseva.aline@gmail.com</a>')
              .replace(/№ 152-ФЗ/g, "№&nbsp;152-ФЗ")
              .replace(/п\. 1 ч\. 1 ст\. 6/g, "п.&nbsp;1 ч.&nbsp;1 ст.&nbsp;6");
            return "<p>" + html + "</p>";
          })
          .join("");
      }
    }

    if (data.footer) {
      var footerBrand = document.querySelector(".footer-inner > p");
      if (footerBrand) footerBrand.textContent = data.footer.brand + " · " + data.footer.year;
    }

    document.dispatchEvent(new CustomEvent("portfolio:content-ready", { detail: data }));
  }

  function loadContent() {
    var params = new URLSearchParams(window.location.search);
    var useDraft = params.has("draft") || params.get("preview") === "1";

    if (useDraft) {
      try {
        var draft = localStorage.getItem(DRAFT_KEY);
        if (draft) {
          applyContent(JSON.parse(draft));
          return Promise.resolve();
        }
      } catch (e) { /* ignore */ }
    }

    return fetch(CONTENT_URL + "?v=" + Date.now())
      .then(function (res) {
        if (!res.ok) throw new Error("content.json not found");
        return res.json();
      })
      .then(applyContent)
      .catch(function () {
        /* fallback: оставляем захардкоженный HTML */
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadContent);
  } else {
    loadContent();
  }
})();
