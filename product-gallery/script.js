fetch('products.json')
  .then(res => res.json())
  .then(data => {
    const gallery = document.getElementById('gallery');
    const searchBar = document.getElementById('searchBar');
    const categoryFilter = document.getElementById('categoryFilter');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');

    const categories = [...new Set(data.map(p => p.category).filter(Boolean))];
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categoryFilter.appendChild(opt);
    });

    function renderProducts(filter = '', category = '') {
      gallery.innerHTML = '';
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
        gallery.appendChild(div);
      });

      document.querySelectorAll('.image-wrapper img').forEach(img => {
        img.addEventListener('click', () => {
          lightboxImg.src = img.dataset.full;
          lightbox.classList.remove('hidden');
        });
      });
    }

    lightboxClose.addEventListener('click', () => {
      lightbox.classList.add('hidden');
      lightboxImg.src = '';
    });

    renderProducts();

    searchBar.addEventListener('input', () => {
      renderProducts(searchBar.value, categoryFilter.value);
    });

    categoryFilter.addEventListener('change', () => {
      renderProducts(searchBar.value, categoryFilter.value);
    });
  });
