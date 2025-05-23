fetch('products.json')
  .then(res => res.json())
  .then(data => {
    const gallery = document.getElementById('gallery');
    const searchBar = document.getElementById('searchBar');

    function renderProducts(filter = '') {
      gallery.innerHTML = '';
      const filtered = data.filter(p =>
        p.title.toLowerCase().includes(filter.toLowerCase()) ||
        p.sku.toLowerCase().includes(filter.toLowerCase())
      );
      filtered.forEach(product => {
        const div = document.createElement('div');
        div.className = 'product';
        div.innerHTML = `
          <h2>${product.title} (<code>${product.sku}</code>)</h2>
          <div class="images">
            ${product.images.map((url, index) => `
              <div class="image-wrapper">
                <img src="${url}" alt="${product.title}" />
                <span class="image-number">${index + 1}</span>
              </div>
            `).join('')}
          </div>
        `;
        gallery.appendChild(div);
      });
    }

    renderProducts();
    searchBar.addEventListener('input', () => renderProducts(searchBar.value));
  });

// Lightbox
const lightbox = document.createElement('div');
lightbox.id = 'lightbox';
lightbox.classList.add('lightbox', 'hidden');
lightbox.innerHTML = `
  <span id="lightbox-close">&times;</span>
  <img id="lightbox-img" src="" />
`;
document.body.appendChild(lightbox);

const lightboxImg = document.getElementById('lightbox-img');
const lightboxClose = document.getElementById('lightbox-close');

document.addEventListener('click', e => {
  if (e.target.tagName === 'IMG' && e.target.closest('.image-wrapper')) {
    lightboxImg.src = e.target.src;
    lightbox.classList.remove('hidden');
  }
});

lightboxClose.addEventListener('click', () => {
  lightbox.classList.add('hidden');
  lightboxImg.src = '';
});

lightbox.addEventListener('click', e => {
  if (e.target === lightbox) {
    lightbox.classList.add('hidden');
    lightboxImg.src = '';
  }
});
