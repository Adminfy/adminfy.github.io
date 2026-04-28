const header = document.querySelector('[data-header]');
const nav = document.querySelector('[data-nav]');
const navToggle = document.querySelector('[data-nav-toggle]');

window.addEventListener('scroll', () => {
  header?.classList.toggle('is-scrolled', window.scrollY > 8);
});

navToggle?.addEventListener('click', () => {
  nav?.classList.toggle('is-open');
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

const WEBHOOK_URL = 'https://adminfy.app.n8n.cloud/webhook/40aa633d-e0d3-4017-b0ec-825f62f68596';
const contactForms = document.querySelectorAll('#contactForm, #formContacto, form[data-n8n-webhook]');

contactForms.forEach((contactForm) => {
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const status = contactForm.querySelector('[data-form-status]');
    const data = new FormData(contactForm);
    const name = String(data.get('name') || data.get('nombre') || '').trim();
    const email = String(data.get('email') || data.get('correo') || '').trim();
    const message = String(data.get('message') || data.get('mensaje') || '').trim();

    if (!name || !email || !message) {
      if (status) {
        status.textContent = 'Completa los campos obligatorios para poder enviar el mensaje.';
        status.className = 'form-status error';
      } else {
        alert('Completa los campos obligatorios para poder enviar el mensaje.');
      }
      return;
    }

    if (status) {
      status.textContent = 'Enviando mensaje...';
      status.className = 'form-status';
    }

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        body: data,
      });

      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}`);
      }

      if (status) {
        status.textContent = 'Mensaje enviado correctamente. Te responderemos lo antes posible.';
        status.className = 'form-status ok';
      }
      contactForm.reset();
    } catch (error) {
      console.error(error);
      if (status) {
        status.textContent = 'No se pudo conectar con el servidor. Inténtalo de nuevo en unos minutos.';
        status.className = 'form-status error';
      } else {
        alert('No se pudo conectar con el servidor.');
      }
    }
  });
});
