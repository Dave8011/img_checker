fetch('products.json')
  .then(res => res.json())
  .then(data => {
    const gallery = document.getElementById('gallery');
    const searchBar = document.getElementById('searchBar');
    const categoryFilter = document.getElementById('categoryFilter');

    // Extract unique categories
    const categories = [...new Set(data.map(p => p.category).filter(Boolean))];
    categories.sort().forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      categoryFilter.appendChild(option);
    });

    function renderProducts(filter = '', category = '') {
      gallery.innerHTML = '';
      const filtered = data.filter(p => {
        const matchesText = p.title.toLowerCase().includes(filter.toLowerCase()) ||
                            p.sku.toLowerCase().includes(filter.toLowerCase());
        const matchesCategory = category === '' || p.category === category;
        return matchesText && matchesCategory;
      });

      filtered.forEach(product => {
        const div = document.createElement('div');
        div.className = 'product';
        div.innerHTML = `
          <h2>${product.title} <code>(${product.sku})</code></h2>
          ${product.category ? `<div class="category-tag">${product.category}</div>` : ''}
          <div class="images">
            ${product.images.map((url, index) => `
              <div class="image-wrapper">
                <img src="${url}" onclick="openLightbox('${url}')" />
                <span class="image-number">${index + 1}</span>
              </div>
            `).join('')}
          </div>
        `;
        gallery.appendChild(div);
      });
    }

    renderProducts();

    searchBar.addEventListener('input', () => {
      renderProducts(searchBar.value, categoryFilter.value);
    });

    categoryFilter.addEventListener('change', () => {
      renderProducts(searchBar.value, categoryFilter.value);
    });
  });

// Lightbox feature
function openLightbox(url) {
  const overlay = document.createElement('div');
  overlay.className = 'lightbox';
  overlay.innerHTML = `
    <div class="lightbox-content">
      <span class="lightbox-close" onclick="this.parentElement.parentElement.remove()">×</span>
      <img src="${url}" />
    </div>
  `;
  document.body.appendChild(overlay);
}
