/* ==========================================================================
   Математическая экология — логика страницы
   ========================================================================== */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n, d = 2) => Number(n).toLocaleString("ru-RU", { minimumFractionDigits: d, maximumFractionDigits: d });
  const icon = (id) => `<svg class="ico" aria-hidden="true"><use href="#i-${id}"/></svg>`;

  /* ---------- Состояние ---------- */
  const state = {
    lang: "ru",
    planSection: 1,
    taskSection: 1,     // 0 = все, 1–4 разделы, 5 = итоговые
    taskLevel: 0,       // 0 = все, 1–3
    openAnswers: new Set(),
    route: "forest",
    modalList: [],
    modalIndex: 0,
    modalAnswer: false
  };

  const t = (key) => (UI[state.lang] && UI[state.lang][key] != null ? UI[state.lang][key] : UI.ru[key] || "");
  const L = (obj) => (obj ? (obj[state.lang] != null ? obj[state.lang] : obj.ru) : "");
  const sectionShort = (s) => (s === 5 ? t("tasksFinal") : L(SECTIONS[s - 1].short));
  const stars = (l) => "★".repeat(l);
  const outOf = (m) => t("critOf").replace("{m}", m);

  /* ---------- Язык ---------- */
  function readLang() {
    const p = new URLSearchParams(location.search).get("lang");
    if (p === "kz" || p === "ru") return p;
    try { const v = localStorage.getItem("me-lang"); if (v === "kz" || v === "ru") return v; } catch (e) { /* хранилище недоступно */ }
    return "ru";
  }
  function saveLang() { try { localStorage.setItem("me-lang", state.lang); } catch (e) { /* ничего */ } }

  function applyStatic() {
    document.documentElement.lang = state.lang === "kz" ? "kk" : "ru";
    document.title = t("pageTitle");
    $$("[data-i18n]").forEach((el) => {
      const v = t(el.dataset.i18n);
      if (el.id === "tasksLangNote") { el.hidden = !v; }
      el.innerHTML = v;
    });
    $$("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
    const lb = $("#langBtn");
    lb.textContent = t("langBtn");
    lb.setAttribute("aria-label", t("langAria"));
    $("#menuBtn").setAttribute("aria-label", t("menuAria"));
  }

  function renderAll() {
    applyStatic();
    renderPlan();
    renderMaterials();
    renderTaskFilters();
    renderTasks();
    renderRoutes();
    renderRegion();
    renderResults();
    renderReviews();
    renderRequest();
    if (!$("#taskModal").hidden) renderModal();
    if (!$("#docModal").hidden) renderDoc();
  }

  /* ---------- План занятий ---------- */
  function renderPlan() {
    const tabs = $("#planTabs");
    tabs.innerHTML = SECTIONS.map((s) => `
      <button class="tab" role="tab" type="button" id="tab-${s.id}" aria-controls="planPanel"
        aria-selected="${s.id === state.planSection}" tabindex="${s.id === state.planSection ? 0 : -1}" data-sec="${s.id}">
        <img src="${s.img}" alt="" loading="lazy">
        <span><span class="tab-n">${["I", "II", "III", "IV"][s.id - 1]} · ${s.hours} ${esc(t("planHours"))}</span>
        <span class="tab-t">${esc(L(s.name))}</span></span>
      </button>`).join("");

    const s = SECTIONS[state.planSection - 1];
    const th = parseFloat(s.theory.replace(",", ".")), pr = parseFloat(s.practice.replace(",", "."));
    const lessons = LESSONS.filter((l) => l.s === s.id);
    $("#planPanel").setAttribute("aria-labelledby", "tab-" + s.id);
    $("#planPanel").innerHTML = `
      <aside class="plan-side">
        <img src="${s.img}" alt="" loading="lazy">
        <div class="plan-side-body">
          <div class="kicker">${["I", "II", "III", "IV"][s.id - 1]} · ${s.hours} ${esc(t("planHours"))}</div>
          <h3>${esc(L(s.name))}</h3>
          <div class="hours-bar" role="img" aria-label="${esc(t("planTheory"))} ${s.theory} ${esc(t("planHours"))}, ${esc(t("planPractice"))} ${s.practice} ${esc(t("planHours"))}">
            <span class="th" style="width:${(th / s.hours) * 100}%"></span><span class="pr" style="width:${(pr / s.hours) * 100}%"></span>
          </div>
          <div class="hours-legend"><span><i style="background:var(--gold)"></i>${esc(t("planTheory"))} ${s.theory} ${esc(t("planHours"))}</span><span><i style="background:var(--green3)"></i>${esc(t("planPractice"))} ${s.practice} ${esc(t("planHours"))}</span></div>
          <dl>
            <dt>${esc(t("planGoal"))}</dt><dd>${esc(L(s.goal))}</dd>
            <dt>${esc(t("planControl"))}</dt><dd>${esc(L(s.control))}</dd>
          </dl>
        </div>
      </aside>
      <ol class="lessons">
        ${lessons.map((l) => `
          <li class="lesson" id="lesson-${l.n}">
            <span class="lesson-n" aria-label="${esc(t("planLesson"))} ${l.n}">${l.n}</span>
            <div class="lesson-top">
              <h4 class="lesson-t">${esc(L(l.t))}</h4>
              <span class="badge">${esc(L(FORMS[l.f]))}</span>
              ${l.proj ? `<span class="badge proj">${esc(t("planProject"))}</span>` : ""}
              ${l.exc ? `<a class="badge exc" href="#${l.exc === "region" ? "region" : "excursions"}" data-route="${l.exc}">${esc(t("planExc"))} →</a>` : ""}
            </div>
            <p class="lesson-m"><b>${esc(t("planMath"))}:</b> ${esc(L(l.m))}</p>
            <p class="lesson-d"><b>${esc(t("planDigital"))}:</b> ${esc(L(l.d))}</p>
          </li>`).join("")}
      </ol>`;
  }

  function selectPlan(id, focus) {
    state.planSection = id;
    renderPlan();
    if (focus) $("#tab-" + id).focus();
  }

  /* ---------- Материалы ---------- */
  function renderMaterials() {
    $("#materialsGrid").innerHTML = MATERIALS.map((m) => {
      const title = esc(L(m.t));
      if (m.anchor) {
        return `<article class="card">
          <a class="card-cover photo" href="${m.anchor}" tabindex="-1" aria-hidden="true"><img src="${m.cover}" alt="" loading="lazy"></a>
          <div class="card-body"><h3>${title}</h3><p>${esc(L(m.d))}</p>
            <div class="card-actions"><a class="btn primary" href="${m.anchor}"><span>${esc(t("matGoExc"))}</span>${icon("arrow")}</a></div>
          </div></article>`;
      }
      const lang = t("matLang");
      const full = !!access.key;
      const label = full ? t("matOpenFull") : t("matView");
      const status = full ? t("matUnlocked") : t("matFragment").replace("{n}", m.preview);
      return `<article class="card">
        <button type="button" class="card-cover" data-doc="${m.doc}" tabindex="-1" aria-hidden="true"><img src="${m.cover}" alt="" loading="lazy" draggable="false"></button>
        <div class="card-body"><h3>${title}</h3><p>${esc(L(m.d))}</p>
          <div class="card-meta">${m.pages} ${esc(t("matPages"))} · ${esc(status)}${lang ? " · " + esc(lang) : ""}</div>
          <div class="card-actions">
            <button type="button" class="btn primary" data-doc="${m.doc}" aria-label="${esc(label)}: ${title}">${icon(full ? "open" : "eye")}<span>${esc(label)}</span></button>
            ${full ? "" : `<a class="card-req" href="#request">${esc(t("matRequest"))} →</a>`}
          </div>
        </div></article>`;
    }).join("");
  }

  /* ---------- Доступ к полным версиям по паролю ----------
     Полные страницы лежат в assets/full/<документ>/<n>.bin в зашифрованном виде (AES-256-GCM).
     Ключ страниц зашифрован паролем в assets/full/keys.json (PBKDF2-SHA256).
     После ввода верного пароля ключ запоминается на этом устройстве. */
  const access = { key: null, keys: null };
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const toB64 = (u8) => { let s = ""; u8.forEach((b) => { s += String.fromCharCode(b); }); return btoa(s); };
  const normPw = (pw) => pw.toUpperCase().replace(/[\s-]+/g, "");
  const cryptoOk = () => !!(window.crypto && window.crypto.subtle);
  const pageCache = new Map();

  async function loadKeys() {
    if (!access.keys) {
      const r = await fetch("assets/full/keys.json", { cache: "no-cache" });
      if (!r.ok) throw new Error("keys");
      access.keys = await r.json();
    }
    return access.keys;
  }
  const importK = (raw) => crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
  function decryptBuf(key, buf) {
    const u8 = new Uint8Array(buf);
    return crypto.subtle.decrypt({ name: "AES-GCM", iv: u8.slice(0, 12) }, key, u8.slice(12));
  }
  async function unlock(password) {
    const k = await loadKeys();
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(normPw(password)), "PBKDF2", false, ["deriveKey"]);
    const kek = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(k.salt), iterations: k.iter, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    const raw = new Uint8Array(await decryptBuf(kek, b64(k.key))); // неверный пароль → ошибка
    access.key = await importK(raw);
    try { localStorage.setItem("me-access", JSON.stringify({ k: toB64(raw), s: k.salt })); } catch (e) { /* только на эту сессию */ }
  }
  async function restoreAccess() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem("me-access") || "null"); } catch (e) { saved = null; }
    if (!saved || !saved.k || !cryptoOk()) return false;
    try {
      const k = await loadKeys();
      if (k.salt !== saved.s) { lock(); return false; } // пароль сменили — нужен новый
      access.key = await importK(b64(saved.k));
      return true;
    } catch (e) { return false; }
  }
  function lock() {
    access.key = null;
    pageCache.forEach((p) => p.then((u) => URL.revokeObjectURL(u)).catch(() => {}));
    pageCache.clear();
    try { localStorage.removeItem("me-access"); } catch (e) { /* ничего */ }
  }
  function fullPageUrl(doc, i) {
    const id = doc + "/" + i;
    if (!pageCache.has(id)) {
      const p = (async () => {
        const r = await fetch(`assets/full/${doc}/${i}.bin`);
        if (!r.ok) throw new Error("page");
        const plain = await decryptBuf(access.key, await r.arrayBuffer());
        return URL.createObjectURL(new Blob([plain], { type: "image/webp" }));
      })();
      p.catch(() => pageCache.delete(id));
      pageCache.set(id, p);
    }
    return pageCache.get(id);
  }

  let formSeq = 0;
  function unlockForm() {
    const id = "pw-" + (++formSeq);
    return `<form class="unlock" data-unlock novalidate>
      <label for="${id}">${esc(t("pwLabel"))}</label>
      <div class="unlock-row">
        <input id="${id}" type="password" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX" required>
        <button type="submit" class="btn primary">${esc(t("pwButton"))}</button>
      </div>
      <p class="unlock-msg" role="status" aria-live="polite"></p>
    </form>`;
  }
  function contactsHTML() {
    const c = typeof CONTACT === "object" ? CONTACT : {};
    const items = [];
    if (c.email) items.push(`<a class="req-item" href="mailto:${esc(c.email)}"><span class="res-ico">${icon("mail")}</span><span><span class="res-type">${esc(t("reqEmail"))}</span>${esc(c.email)}</span></a>`);
    if (c.phone) items.push(`<a class="req-item" href="tel:${esc(c.phone.replace(/[^\d+]/g, ""))}"><span class="res-ico">${icon("phone")}</span><span><span class="res-type">${esc(t("reqPhone"))}</span>${esc(c.phone)}</span></a>`);
    if (c.whatsapp) items.push(`<a class="req-item" href="https://wa.me/${esc(c.whatsapp.replace(/\D/g, ""))}" target="_blank" rel="noopener"><span class="res-ico">${icon("chat")}</span><span><span class="res-type">${esc(t("reqWhatsapp"))}</span>+${esc(c.whatsapp.replace(/\D/g, ""))}</span></a>`);
    return items.length ? `<div class="request-contacts">${items.join("")}</div>` : `<p class="req-fallback">${esc(t("reqFallback"))}</p>`;
  }

  /* ---------- Блок «Полные версии» под карточками ---------- */
  function renderRequest() {
    if (access.key) {
      $("#requestContacts").innerHTML = `<div class="access-open"><p>${icon("open")}<span>${esc(t("accessOpen"))}</span></p>
        <button type="button" class="text-link" data-lock>${esc(t("accessLock"))}</button></div>`;
    } else {
      $("#requestContacts").innerHTML = unlockForm() + `<p class="route-sub req-how">${esc(t("reqHowGet"))}</p>` + contactsHTML();
    }
  }

  async function onUnlockSubmit(form) {
    const input = form.querySelector("input"), btn = form.querySelector("button"), msg = form.querySelector(".unlock-msg");
    if (!cryptoOk()) { msg.textContent = t("pwNoCrypto"); msg.className = "unlock-msg err"; return; }
    if (!input.value.trim()) { input.focus(); return; }
    btn.disabled = true; msg.textContent = t("pwChecking"); msg.className = "unlock-msg";
    try {
      await unlock(input.value);
      msg.textContent = t("pwOk"); msg.className = "unlock-msg ok";
      renderMaterials();
      renderRequest();
      if (!$("#docModal").hidden) { viewer.page = 1; renderDoc(); $("#docNext").focus(); }
    } catch (e) {
      btn.disabled = false;
      msg.textContent = t("pwWrong"); msg.className = "unlock-msg err";
      input.select();
    }
  }

  /* ---------- Просмотр документа: фрагмент или полная версия ---------- */
  const viewer = { doc: null, page: 0, lastFocus: null, token: 0 };
  const docInfo = (slug) => MATERIALS.find((m) => m.doc === slug);
  const pageSrc = (slug, i) => `assets/preview/${slug}-${i}.webp`;

  function openDoc(slug) {
    if (!docInfo(slug)) return;
    viewer.doc = slug; viewer.page = 1;
    viewer.lastFocus = document.activeElement;
    $("#docModal").hidden = false;
    document.body.classList.add("modal-open");
    renderDoc();
    $("#docNext").focus();
  }
  function closeDoc() {
    $("#docModal").hidden = true;
    document.body.classList.remove("modal-open");
    if (viewer.lastFocus && viewer.lastFocus.focus) viewer.lastFocus.focus();
  }
  function renderDoc() {
    const m = docInfo(viewer.doc);
    if (!m) return;
    const full = !!access.key;
    const n = full ? m.pages : m.preview;
    if (viewer.page > (full ? n : n + 1)) viewer.page = 1;
    const end = !full && viewer.page > n;
    const token = ++viewer.token;
    $("#docTitle").textContent = L(m.t);
    $("#docMeta").textContent = full ? t("viewerFull").replace("{total}", m.pages)
      : t("viewerFragment").replace("{n}", n).replace("{total}", m.pages);
    if (end) {
      $("#docBody").innerHTML = `<div class="doc-end">
        <h4>${esc(t("viewerEndTitle"))}</h4>
        <p>${esc(t("viewerEndText").replace("{n}", n).replace("{total}", m.pages))}</p>
        ${unlockForm()}
        <p class="route-sub req-how">${esc(t("reqHowGet"))}</p>
        ${contactsHTML()}
      </div>`;
      $("#docCount").textContent = "";
    } else {
      const alt = `${L(m.t)} — ${t("viewerPage").replace("{i}", viewer.page).replace("{n}", n)}`;
      if (full) {
        $("#docBody").innerHTML = `<div class="doc-page loading"><img alt="${esc(alt)}" draggable="false"></div>`;
        fullPageUrl(m.doc, viewer.page).then((u) => {
          if (token !== viewer.token) return;
          const img = $("#docBody img");
          if (img) { img.src = u; img.parentElement.classList.remove("loading"); }
        }).catch(() => {
          if (token === viewer.token) $("#docBody").innerHTML = `<p class="doc-error">${esc(t("accessLoadError"))}</p>`;
        });
        if (viewer.page < n) fullPageUrl(m.doc, viewer.page + 1).catch(() => {});
      } else {
        $("#docBody").innerHTML = `<div class="doc-page"><img src="${pageSrc(m.doc, viewer.page)}" alt="${esc(alt)}" draggable="false"></div>`;
        if (viewer.page < n) { const pre = new Image(); pre.src = pageSrc(m.doc, viewer.page + 1); }
      }
      $("#docCount").textContent = t("viewerPage").replace("{i}", viewer.page).replace("{n}", n);
    }
    $("#docBody").scrollTop = 0;
    $("#docPrev").disabled = viewer.page <= 1;
    $("#docNext").disabled = full ? viewer.page >= n : end;
  }
  function stepDoc(d) {
    const m = docInfo(viewer.doc);
    if (!m) return;
    const max = access.key ? m.pages : m.preview + 1;
    const p = viewer.page + d;
    if (p < 1 || p > max) return;
    viewer.page = p; renderDoc();
  }

  /* ---------- Тренажёр задач ---------- */
  function filteredTasks() {
    return TASKS.filter((x) => (state.taskSection === 0 || x.s === state.taskSection) && (state.taskLevel === 0 || x.l === state.taskLevel));
  }

  function renderTaskFilters() {
    const secs = [{ v: 0, label: t("tasksAll") }].concat(SECTIONS.map((s) => ({ v: s.id, label: L(s.short) })), [{ v: 5, label: t("tasksFinal") }]);
    $("#sectionFilter").innerHTML = secs.map((o) => `<button type="button" class="chip" data-sec="${o.v}" aria-pressed="${o.v === state.taskSection}">${esc(o.label)}</button>`).join("");
    const lv = [{ v: 0, label: t("tasksAll") }, { v: 1, label: `<span class="stars">★</span> ${esc(t("lvl1"))}` }, { v: 2, label: `<span class="stars">★★</span> ${esc(t("lvl2"))}` }, { v: 3, label: `<span class="stars">★★★</span> ${esc(t("lvl3"))}` }];
    $("#levelFilter").innerHTML = lv.map((o) => `<button type="button" class="chip" data-lvl="${o.v}" aria-pressed="${o.v === state.taskLevel}">${o.v === 0 ? esc(o.label) : o.label}</button>`).join("");
  }

  function answerHTML(x) {
    return `<p><b>${esc(t("tasksAnswer"))}:</b> ${esc(x.a)}</p><p><b>${esc(t("tasksSolution"))}:</b> ${esc(x.r)}</p>`;
  }

  function renderTasks() {
    const list = filteredTasks();
    $("#taskCount").textContent = t("tasksCount").replace("{n}", list.length);
    if (!list.length) { $("#taskGrid").innerHTML = `<p class="task-empty">${esc(t("tasksEmpty"))}</p>`; return; }
    $("#taskGrid").innerHTML = list.map((x) => {
      const open = state.openAnswers.has(x.n);
      return `<article class="task" id="task-${x.n}">
        <div class="task-head"><span class="task-no">${esc(t("taskNo"))}${x.n}</span><span class="task-stars" title="${esc(t("lvl" + x.l))}" aria-label="${esc(t("tasksLevel"))}: ${esc(t("lvl" + x.l))}">${stars(x.l)}</span></div>
        <div class="task-sec">${esc(sectionShort(x.s))}</div>
        <p class="task-q" lang="ru">${esc(x.q)}</p>
        <div class="task-ans" id="ans-${x.n}" lang="ru" ${open ? "" : "hidden"}>${answerHTML(x)}</div>
        <div class="task-actions">
          <button type="button" class="btn ghost" data-toggle="${x.n}" aria-expanded="${open}" aria-controls="ans-${x.n}">${esc(open ? t("tasksHide") : t("tasksShow"))}</button>
          <button type="button" class="btn ghost" data-project="${x.n}">${icon("screen")}<span>${esc(t("tasksProject"))}</span></button>
        </div>
      </article>`;
    }).join("");
  }

  /* ---------- Окно «на экран» ---------- */
  let lastFocus = null;
  function openModal(n) {
    state.modalList = filteredTasks();
    if (!state.modalList.some((x) => x.n === n)) state.modalList = TASKS.slice();
    state.modalIndex = Math.max(0, state.modalList.findIndex((x) => x.n === n));
    state.modalAnswer = false;
    lastFocus = document.activeElement;
    $("#taskModal").hidden = false;
    document.body.classList.add("modal-open");
    renderModal();
    $("#modalToggle").focus();
  }
  function closeModal() {
    $("#taskModal").hidden = true;
    document.body.classList.remove("modal-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function renderModal() {
    const x = state.modalList[state.modalIndex];
    if (!x) return;
    $("#modalMeta").innerHTML = `${esc(sectionShort(x.s))} · <span class="task-stars">${stars(x.l)}</span> ${esc(t("lvl" + x.l))} · ${state.modalIndex + 1} / ${state.modalList.length}`;
    $("#modalTitle").textContent = t("taskNo") + x.n;
    $("#modalQ").textContent = x.q;
    $("#modalQ").lang = "ru";
    $("#modalAnswer").innerHTML = answerHTML(x);
    $("#modalAnswer").hidden = !state.modalAnswer;
    $("#modalToggle").textContent = state.modalAnswer ? t("tasksHide") : t("tasksShow");
    $("#modalPrev").disabled = state.modalIndex === 0;
    $("#modalNext").disabled = state.modalIndex === state.modalList.length - 1;
  }
  function stepModal(d) {
    const i = state.modalIndex + d;
    if (i < 0 || i >= state.modalList.length) return;
    state.modalIndex = i; state.modalAnswer = false; renderModal();
  }

  /* ---------- Экскурсии ---------- */
  const linkMeta = { video: ["play", "linkVideo"], search: ["search", "linkSearch"], map: ["map", "linkMap"], site: ["globe", "linkSite"] };

  function renderRoutes() {
    $("#excTabs").innerHTML = EXCURSIONS.map((r) => `
      <button type="button" class="route-tab" role="tab" id="route-${r.id}" aria-controls="excPanel" aria-selected="${r.id === state.route}" tabindex="${r.id === state.route ? 0 : -1}" data-route="${r.id}">
        <img src="${r.img}" alt="">
        <span><small>${["I", "II", "III", "IV"][r.s - 1]} · ${esc(L(SECTIONS[r.s - 1].short))}</small><b>${esc(L(r.title))}</b></span>
      </button>`).join("");

    const r = EXCURSIONS.find((x) => x.id === state.route) || EXCURSIONS[0];
    $("#excPanel").setAttribute("aria-labelledby", "route-" + r.id);
    $("#excPanel").innerHTML = `
      <div class="route-main">
        <div class="kicker">${esc(L(SECTIONS[r.s - 1].name))}</div>
        <h3>${esc(L(r.title))}</h3>
        <p class="route-text">${esc(L(r.text))}</p>
        <div class="route-meta"><span class="badge">${esc(t("excLessons"))}</span>${r.lessons.map((n) => `<a class="badge exc" href="#lesson-${n}" data-lesson="${n}">${n}</a>`).join("")}</div>
        <div class="fact">${icon("bulb")}<div><strong>${esc(t("excFact"))}</strong><p>${esc(L(r.fact))}</p></div></div>
        <p class="route-sub">${esc(t("excMath"))}</p>
        <div class="route-tasks">
          ${r.tasks.map((k, i) => `<div class="route-task"><p>${esc(L(k).q)}</p>
            <button type="button" class="link-btn" data-rt="${r.id}-${i}" aria-expanded="false" aria-controls="rt-${r.id}-${i}">${esc(t("excCheck"))} ${icon("arrow")}</button>
            <div class="ans" id="rt-${r.id}-${i}" hidden>${esc(L(k).a)}</div></div>`).join("")}
        </div>
      </div>
      <div class="route-side">
        <img src="${r.img}" alt="" loading="lazy">
        <p class="route-sub">${esc(t("excResources"))}</p>
        <ul class="res-list">${r.links.map(linkItem).join("")}</ul>
      </div>`;
  }

  function linkItem(k) {
    const [ic, key] = linkMeta[k.type];
    return `<li><a href="${esc(k.url)}" target="_blank" rel="noopener"><span class="res-ico">${icon(ic)}</span><span><span class="res-type">${esc(t(key))}</span>${esc(L(k))}</span><span class="ext">${icon("open")}</span></a></li>`;
  }

  function renderRegion() {
    $("#regionLinks").innerHTML = REGION_LINKS.map((k) => {
      const ic = linkMeta[k.type][0];
      return `<a class="region-link" href="${esc(k.url)}" target="_blank" rel="noopener"><span class="res-ico">${icon(ic)}</span><span><strong>${esc(L(k.t))}</strong><span class="d">${esc(L(k.d))}</span></span><span class="ext">${icon("open")}</span></a>`;
    }).join("");
    $("#extraVideos").innerHTML = EXTRA_VIDEOS.map((v) => `<li><a href="${esc(v.url)}" target="_blank" rel="noopener">${icon("play")}<span>${esc(L(v))}</span></a></li>`).join("");
  }

  function selectRoute(id, focus) {
    state.route = id;
    renderRoutes();
    if (focus) $("#route-" + id).focus();
  }

  /* ---------- Результаты ---------- */
  const LV = ["low", "mid", "high"];
  const lvKey = { low: "lvlLow", mid: "lvlMid", high: "lvlHigh" };

  function renderResults() {
    const R = RESULTS;
    $("#levelsLegend").innerHTML = LV.map((k) => `<span><i style="background:var(--lvl-${k})"></i>${esc(t(lvKey[k]))}</span>`).join("");
    const row = (which, label) => `
      <div class="lv-row"><span class="lv-label">${esc(label)}</span>
        <div class="lv-bar">${LV.map((k) => {
          const p = R.levelPct[which][k], c = R.levels[which][k];
          const tip = `${label}: ${t(lvKey[k])} — ${fmt(p, 1)}% (${c} ${t("people")})`;
          return `<span class="lv-seg ${k}" style="flex:${p} 1 0" tabindex="0" data-tip="${esc(tip)}" aria-label="${esc(tip)}"><span class="lbl">${fmt(p, 1)}%</span></span>`;
        }).join("")}</div>
      </div>`;
    $("#levelsChart").innerHTML = row("before", t("rowBefore")) + row("after", t("rowAfter")) +
      `<div class="lv-axis"><span></span><div><span>0</span><span>50</span><span>100%</span></div></div>` +
      `<div class="lv-counts">${LV.map((k) => `<div class="lv-count"><span><i style="background:var(--lvl-${k})"></i>${esc(t(lvKey[k]))}</span><b>${R.levels.before[k]} → ${R.levels.after[k]}</b><small>${esc(t("people"))}</small></div>`).join("")}</div>`;

    requestAnimationFrame(fitLabels);
    $("#critLegend").innerHTML = `<span><i style="background:var(--lvl-low)"></i>${esc(t("rowBefore"))}</span><span><i style="background:var(--lvl-high)"></i>${esc(t("rowAfter"))}</span>`;
    $("#critChart").innerHTML = R.criteria.map((c) => {
      const name = t("crit_" + c.key);
      const bar = (which, cls, label) => {
        const v = c[which], tip = `${name} · ${label}: ${fmt(v)} (${outOf(c.max)})`;
        return `<div class="cr-bar"><div class="cr-track"><span class="cr-fill ${cls}" style="width:${(v / c.max) * 100}%" tabindex="0" data-tip="${esc(tip)}" aria-label="${esc(tip)}"></span></div><span class="cr-val">${fmt(v)}</span></div>`;
      };
      return `<div class="cr-item"><div class="cr-name">${esc(name)}<span>${esc(outOf(c.max))}</span></div>${bar("before", "before", t("rowBefore"))}${bar("after", "after", t("rowAfter"))}</div>`;
    }).join("");

    const delta = { ru: "Динамика", kz: "Динамика" }[state.lang];
    const sign = (v, d = 2) => (v > 0 ? "+" : v < 0 ? "−" : "") + fmt(Math.abs(v), d);
    const lvRow = (k) => {
      const b = R.levelPct.before[k], a = R.levelPct.after[k], d = ((R.levels.after[k] - R.levels.before[k]) / R.students) * 100;
      return `<tr><td>${esc(t(lvKey[k]))}</td><td class="num">${fmt(b, 1)}% (${R.levels.before[k]})</td><td class="num">${fmt(a, 1)}% (${R.levels.after[k]})</td><td class="num">${sign(d, 1)} ${esc(t("pp"))}</td></tr>`;
    };
    $("#resTable").innerHTML = `
      <thead><tr><th>${esc(t("tableIndicator"))}</th><th class="num">${esc(t("rowBefore"))}</th><th class="num">${esc(t("rowAfter"))}</th><th class="num">${esc(delta)}</th></tr></thead>
      <tbody>
        <tr><td>${esc(t("stat1"))}</td><td class="num">${fmt(R.avg.before)}</td><td class="num">${fmt(R.avg.after)}</td><td class="num">${sign(R.avg.after - R.avg.before)}</td></tr>
        ${["high", "mid", "low"].map(lvRow).join("")}
        ${R.criteria.map((c) => `<tr><td>${esc(t("crit_" + c.key))} (${esc(outOf(c.max))})</td><td class="num">${fmt(c.before)}</td><td class="num">${fmt(c.after)}</td><td class="num">${sign(c.delta)}</td></tr>`).join("")}
        <tr><td>${esc(t("stat3"))}</td><td class="num">—</td><td class="num">—</td><td class="num">${fmt(R.positive, 1)}%</td></tr>
      </tbody>`;
  }

  function fitLabels() {
    $$(".lv-seg .lbl").forEach((l) => { l.style.visibility = ""; if (l.scrollWidth > l.parentElement.clientWidth - 4) l.style.visibility = "hidden"; });
  }
  window.addEventListener("resize", fitLabels);

  function renderReviews() {
    $("#reviews").innerHTML = REVIEWS.map((r) => `
      <figure class="review"><blockquote lang="ru">${esc(r.q)}</blockquote>
      <figcaption><strong>${esc(r.name)}</strong>${esc(L(r.role))}</figcaption></figure>`).join("");
  }

  /* ---------- Подсказки на диаграммах ---------- */
  const tip = $("#chartTip");
  function showTip(el, x, y) {
    tip.textContent = el.dataset.tip;
    tip.hidden = false;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let left = x + 14, top = y - h - 12;
    if (left + w > window.innerWidth - 8) left = x - w - 14;
    if (top < 8) top = y + 16;
    tip.style.left = Math.max(8, left) + "px";
    tip.style.top = top + "px";
  }
  document.addEventListener("mousemove", (e) => {
    const el = e.target.closest && e.target.closest("[data-tip]");
    if (el) showTip(el, e.clientX, e.clientY); else tip.hidden = true;
  });
  document.addEventListener("focusin", (e) => {
    const el = e.target.closest && e.target.closest("[data-tip]");
    if (el) { const b = el.getBoundingClientRect(); showTip(el, b.left + b.width / 2, b.top); } else tip.hidden = true;
  });
  window.addEventListener("scroll", () => { tip.hidden = true; }, { passive: true });

  /* ---------- Обработчики ---------- */
  function tabKeys(e, selector, onSelect) {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(e.key)) return;
    const tabs = $$(selector);
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    let j = i;
    if (e.key === "ArrowRight") j = (i + 1) % tabs.length;
    if (e.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
    if (e.key === "Home") j = 0;
    if (e.key === "End") j = tabs.length - 1;
    onSelect(tabs[j], true);
  }

  function bind() {
    $("#langBtn").addEventListener("click", () => {
      state.lang = state.lang === "ru" ? "kz" : "ru";
      saveLang();
      renderAll();
    });

    const nav = $("#mainNav"), menu = $("#menuBtn");
    menu.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      menu.setAttribute("aria-expanded", open);
    });
    $$("#mainNav a").forEach((a) => a.addEventListener("click", () => { nav.classList.remove("open"); menu.setAttribute("aria-expanded", "false"); }));

    // План
    $("#planTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-sec]"); if (b) selectPlan(+b.dataset.sec); });
    $("#planTabs").addEventListener("keydown", (e) => tabKeys(e, "#planTabs .tab", (b, f) => selectPlan(+b.dataset.sec, f)));
    $("#planPanel").addEventListener("click", (e) => {
      const a = e.target.closest("[data-route]");
      if (a && a.dataset.route !== "region") selectRoute(a.dataset.route);
    });

    // Задачи
    $("#sectionFilter").addEventListener("click", (e) => { const b = e.target.closest("[data-sec]"); if (!b) return; state.taskSection = +b.dataset.sec; renderTaskFilters(); renderTasks(); });
    $("#levelFilter").addEventListener("click", (e) => { const b = e.target.closest("[data-lvl]"); if (!b) return; state.taskLevel = +b.dataset.lvl; renderTaskFilters(); renderTasks(); });
    $("#taskGrid").addEventListener("click", (e) => {
      const tg = e.target.closest("[data-toggle]");
      if (tg) {
        const n = +tg.dataset.toggle;
        const open = !state.openAnswers.has(n);
        open ? state.openAnswers.add(n) : state.openAnswers.delete(n);
        $("#ans-" + n).hidden = !open;
        tg.setAttribute("aria-expanded", open);
        tg.textContent = open ? t("tasksHide") : t("tasksShow");
        return;
      }
      const pj = e.target.closest("[data-project]");
      if (pj) openModal(+pj.dataset.project);
    });
    $("#randomTask").addEventListener("click", () => {
      const list = filteredTasks().length ? filteredTasks() : TASKS;
      openModal(list[Math.floor(Math.random() * list.length)].n);
    });

    // Окно
    $("#taskModal").addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeModal(); });
    $("#modalPrev").addEventListener("click", () => stepModal(-1));
    $("#modalNext").addEventListener("click", () => stepModal(1));
    $("#modalToggle").addEventListener("click", () => { state.modalAnswer = !state.modalAnswer; renderModal(); });
    document.addEventListener("keydown", (e) => {
      if ($("#taskModal").hidden) return;
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowRight") stepModal(1);
      if (e.key === "ArrowLeft") stepModal(-1);
      if (e.key === "Tab") {
        const f = $$("#taskModal button:not([disabled])");
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // Фрагменты документов
    document.addEventListener("click", (e) => {
      const d = e.target.closest && e.target.closest("[data-doc]");
      if (d) { e.preventDefault(); openDoc(d.dataset.doc); }
    });
    $("#docModal").addEventListener("click", (e) => {
      if (e.target.closest("[data-close]")) closeDoc();
      else if (e.target.closest('a[href="#request"]')) closeDoc();
    });
    document.addEventListener("submit", (e) => {
      const f = e.target.closest && e.target.closest("form[data-unlock]");
      if (f) { e.preventDefault(); onUnlockSubmit(f); }
    });
    document.addEventListener("click", (e) => {
      if (e.target.closest && e.target.closest("[data-lock]")) { lock(); renderMaterials(); renderRequest(); }
    });
    $("#docPrev").addEventListener("click", () => stepDoc(-1));
    $("#docNext").addEventListener("click", () => stepDoc(1));
    document.addEventListener("keydown", (e) => {
      if ($("#docModal").hidden) return;
      if (e.key === "Escape") closeDoc();
      if (e.key === "ArrowRight") stepDoc(1);
      if (e.key === "ArrowLeft") stepDoc(-1);
      if (e.key === "Tab") {
        const f = $$("#docModal button:not([disabled]), #docModal a[href]");
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    // Без контекстного меню «Сохранить картинку» на страницах документов и обложках
    document.addEventListener("contextmenu", (e) => {
      if (e.target.closest && e.target.closest(".doc-page, .card-cover")) e.preventDefault();
    });

    // Экскурсии
    $("#excTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-route]"); if (b) selectRoute(b.dataset.route); });
    $("#excTabs").addEventListener("keydown", (e) => tabKeys(e, "#excTabs .route-tab", (b, f) => selectRoute(b.dataset.route, f)));
    $("#excPanel").addEventListener("click", (e) => {
      const rt = e.target.closest("[data-rt]");
      if (rt) {
        const box = $("#rt-" + rt.dataset.rt);
        const open = box.hidden;
        box.hidden = !open;
        rt.setAttribute("aria-expanded", open);
        rt.innerHTML = `${esc(open ? t("excHide") : t("excCheck"))} ${open ? "" : icon("arrow")}`;
        return;
      }
      const ls = e.target.closest("[data-lesson]");
      if (ls) {
        e.preventDefault();
        const n = +ls.dataset.lesson;
        selectPlan(LESSONS.find((l) => l.n === n).s);
        const el = $("#lesson-" + n);
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("flash");
        setTimeout(() => el.classList.remove("flash"), 1700);
      }
    });

    // Кнопка «наверх» и активный пункт меню
    const toTop = $("#toTop");
    window.addEventListener("scroll", () => toTop.classList.toggle("show", window.scrollY > 700), { passive: true });
    toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    if ("IntersectionObserver" in window) {
      const links = $$("#mainNav a");
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id));
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      ["home", "about", "plan", "materials", "tasks", "excursions", "results", "author"].forEach((id) => { const s = document.getElementById(id); if (s) io.observe(s); });
    }
  }

  /* ---------- Запуск ---------- */
  state.lang = readLang();
  bind();
  renderAll();
  restoreAccess().then((ok) => { if (ok) { renderMaterials(); renderRequest(); } });
})();
