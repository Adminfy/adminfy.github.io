const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const normalize = (text = "") => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

let rotationIndex = 0;
let selectedBusiness = null;

document.addEventListener("DOMContentLoaded", () => {
  $(".year") && ($(".year").textContent = new Date().getFullYear());
  initNavigation();
  initReveal();
  initRecommenders();
  initContactForm();
});

function initNavigation() {
  const toggle = $(".nav-toggle");
  const nav = $("#main-nav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
}

function initReveal() {
  const items = $$(".reveal");
  if (!items.length || !("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  items.forEach((item) => observer.observe(item));
}

function initRecommenders() {
  $$(".recommender").forEach((widget) => {
    const input = $(".business-input", widget);
    const suggestions = $(".suggestions", widget);
    const form = $(".business-form", widget);
    const panel = $(".results-panel", widget);
    if (!input || !suggestions || !form || !panel) return;

    input.addEventListener("input", () => showSuggestions(input, suggestions));
    input.addEventListener("focus", () => showSuggestions(input, suggestions));

    suggestions.addEventListener("click", (event) => {
      const option = event.target.closest("button[data-business]");
      if (!option) return;
      input.value = option.dataset.business;
      suggestions.classList.remove("open");
      selectedBusiness = findBusiness(input.value);
      rotationIndex = 0;
      renderRecommendations(widget, selectedBusiness);
    });

    document.addEventListener("click", (event) => {
      if (!widget.contains(event.target)) suggestions.classList.remove("open");
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      selectedBusiness = findBusiness(input.value);
      rotationIndex = 0;
      renderRecommendations(widget, selectedBusiness);
    });
  });
}

function showSuggestions(input, container) {
  const query = normalize(input.value);
  const results = ELEVA_DATA.businesses
    .map((business) => ({ business, score: scoreBusiness(business, query) }))
    .filter((item) => item.score > 0 || query.length === 0)
    .sort((a, b) => b.score - a.score || a.business.name.localeCompare(b.business.name))
    .slice(0, 8);

  container.innerHTML = results.map(({ business }) => `<button type="button" role="option" data-business="${escapeHtml(business.name)}">${escapeHtml(business.name)}</button>`).join("");
  container.classList.toggle("open", results.length > 0);
}

function scoreBusiness(business, query) {
  if (!query) return 1;
  const haystack = normalize([business.name, ...(business.aliases || []), business.families, business.notes].join(" "));
  if (normalize(business.name).startsWith(query)) return 100;
  if (haystack.includes(query)) return 50;
  return query.split(/\s+/).every((term) => haystack.includes(term)) ? 20 : 0;
}

function findBusiness(value) {
  const query = normalize(value);
  if (!query) return null;
  const exact = ELEVA_DATA.businesses.find((business) => normalize(business.name) === query || (business.aliases || []).some(alias => normalize(alias) === query));
  if (exact) return exact;
  return ELEVA_DATA.businesses
    .map((business) => ({ business, score: scoreBusiness(business, query) }))
    .sort((a, b) => b.score - a.score)[0]?.score > 0
    ? ELEVA_DATA.businesses.map((business) => ({ business, score: scoreBusiness(business, query) })).sort((a, b) => b.score - a.score)[0].business
    : null;
}

function renderRecommendations(widget, business) {
  const panel = $(".results-panel", widget);
  const mode = widget.dataset.mode || "experience";

  if (!business) {
    panel.innerHTML = `<div class="empty-state"><strong>No he encontrado ese negocio.</strong><br>Prueba con una opción como cafetería, clínica, spa, ropa, restaurante, decoración o banco.</div>`;
    return;
  }

  const fragranceNames = business.fragrances || [];
  const start = rotationIndex % Math.max(fragranceNames.length, 1);
  const selected = [...fragranceNames.slice(start), ...fragranceNames.slice(0, start)].slice(0, 3);

  panel.innerHTML = `
    <div class="result-header">
      <div>
        <p class="eyebrow">${escapeHtml(business.name)}</p>
        <h3>3 fragancias recomendadas</h3>
        <p><strong>Familias:</strong> ${escapeHtml(business.families)}</p>
        <p><strong>Notas aconsejadas:</strong> ${escapeHtml(business.notes || "Según perfil del espacio")}</p>
      </div>
      <button type="button" class="btn secondary reroll">Proponer otras 3</button>
    </div>
    <div class="fragrance-grid">
      ${selected.map((name) => fragranceCard(name, mode)).join("")}
    </div>
  `;

  $(".reroll", panel)?.addEventListener("click", () => {
    rotationIndex = (rotationIndex + 3) % fragranceNames.length;
    renderRecommendations(widget, business);
  });
}

function fragranceCard(name, mode) {
  const fragrance = ELEVA_DATA.fragrances[name] || {
    family: "Fragancia recomendada",
    desc: "Fragancia presente en el catálogo de recomendación por negocio. Añade aquí la pirámide olfativa completa cuando la tengas cargada.",
    image: "Imagen coherente con el perfil del negocio."
  };
  const detail = mode === "image" ? fragrance.image : fragrance.desc;
  const label = mode === "image" ? "Imagen que proyecta" : "Descripción";
  return `
    <article class="fragrance-card">
      <span>${escapeHtml(fragrance.family)}</span>
      <h4>${escapeHtml(name)}</h4>
      <p><strong>${label}:</strong> ${escapeHtml(detail)}</p>
    </article>
  `;
}

function initContactForm() {
  const form = $(".contact-form");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const subject = encodeURIComponent(`Consulta Eleva Aromas - ${data.get("negocio") || "nuevo cliente"}`);
    const body = encodeURIComponent(`Nombre: ${data.get("nombre")}\nEmail: ${data.get("email")}\nNegocio: ${data.get("negocio")}\n\nMensaje:\n${data.get("mensaje")}`);
    window.location.href = `mailto:contacto@elevaromas.com?subject=${subject}&body=${body}`;
  });
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));
}
