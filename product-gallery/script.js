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
            ${product.images.map(url => `<img src="${url}" alt="${product.title}" loading="lazy" />`).join('')}
          </div>
        `;
        gallery.appendChild(div);
      });
    }

    renderProducts();
    searchBar.addEventListener('input', () => renderProducts(searchBar.value));
  });
