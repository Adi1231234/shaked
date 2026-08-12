import { kindLabels } from './projects.js';

const previewUrl = (id) => `${import.meta.env.BASE_URL}previews/${id}.webp`;

/** One card. The whole thing is the link; the button is just the affordance. */
export function renderCard(project, index) {
  const { id, title, exam, blurb, kind, href, accent, external } = project;
  const action = project.action ?? 'פתיחה';

  const card = document.createElement('a');
  card.className = 'card';
  card.href = href;
  card.style.setProperty('--accent', accent);
  card.style.setProperty('--stagger', `${index * 55}ms`);
  if (external) {
    card.target = '_blank';
    card.rel = 'noopener';
  } else if (href.endsWith('.zip')) {
    card.download = '';
  }

  card.innerHTML = `
    <figure class="card__preview">
      <img src="${previewUrl(id)}" alt="" loading="lazy" decoding="async" />
      <figcaption class="card__kind">${kindLabels[kind]}</figcaption>
    </figure>
    <div class="card__body">
      <p class="card__exam">${exam}</p>
      <h2 class="card__title">${title}</h2>
      <p class="card__blurb">${blurb}</p>
      <span class="card__action">${action}<span aria-hidden="true" class="card__arrow">←</span></span>
    </div>
  `;

  // No screenshot yet? Fall back to the card's own accent instead of a broken image.
  card.querySelector('img').addEventListener('error', (event) => {
    event.target.closest('.card__preview').classList.add('card__preview--bare');
    event.target.remove();
  });

  return card;
}
