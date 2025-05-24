// utils.js

// Function to render products in the gallery
export function renderProducts(data, filter, category, container) {
  container.innerHTML = '';
  const filtered = data.filter(p =>
    (p.title.toLowerCase().includes(filter.toLowerCase()) ||
     p.sku.toLowerCase().includes(filter.toLowerCase())) &&
    (category === '' || p.category === category)
  );

  filtered.forEach(product => {
    const div = document.createElement('div');
    div.className = 'product';
    div.innerHTML = `
      ${product.category ? `<div class="category-tag">${product.category}</div>` : ''}
      <h2>${product.title} (<code>${product.sku}</code>)</h2>
      <div class="images">
        ${product.images.map((url, index) => `
          <div class="image-wrapper">
            <img src="${url}" data-full="${url}" />
            <span class="image-number">${index + 1}</span>
          </div>
        `).join('')}
      </div>
    `;
    container.appendChild(div);
  });
}

// Function to handle lightbox events
export function setupLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');

  document.querySelectorAll('.image-wrapper img').forEach(img => {
    img.addEventListener('click', () => {
      lightboxImg.src = img.dataset.full;
      lightbox.classList.remove('hidden');
    });
  });

  lightboxClose.addEventListener('click', () => {
    lightbox.classList.add('hidden');
    lightboxImg.src = '';
  });
}
