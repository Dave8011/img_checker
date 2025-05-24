// scripts/main.js

// Fetch and render product data from local JSON
fetch('../products.json')
  .then(res => res.json())
  .then(data => {
    const gallery = document.getElementById('gallery');
    const searchBar = document.getElementById('searchBar');
    const categoryFilter = document.getElementById('categoryFilter');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');
    const compareButton = document.getElementById('compareButton');

    const selectedProducts = new Set(); // To store SKUs for comparison

    // Dynamically populate category dropdown
    const categories = [...new Set(data.map(p => p.category).filter(Boolean))];
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categoryFilter.appendChild(opt);
    });

    // Render products based on search/filter input
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

        const isChecked = selectedProducts.has(product.sku);

        div.innerHTML = `
          ${product.category ? `<div class="category-tag">${product.category}</div>` : ''}
          <h2>${product.title} (<code>${product.sku}</code>)</h2>
          <label>
            <input type="checkbox" data-sku="${product.sku}" ${isChecked ? 'checked' : ''}>
            Select for Comparison
          </label>
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

      // Lightbox functionality
      document.querySelectorAll('.image-wrapper img').forEach(img => {
        img.addEventListener('click', () => {
          lightboxImg.src = img.dataset.full;
          lightbox.classList.remove('hidden');
        });
      });

      // Checkbox to select items for comparison
      document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
          const sku = checkbox.dataset.sku;
          if (checkbox.checked) selectedProducts.add(sku);
          else selectedProducts.delete(sku);
        });
      });
    }

    // Close lightbox
    lightboxClose.addEventListener('click', () => {
      lightbox.classList.add('hidden');
      lightboxImg.src = '';
    });

    // Filter triggers
    searchBar.addEventListener('input', () => {
      renderProducts(searchBar.value, categoryFilter.value);
    });
    categoryFilter.addEventListener('change', () => {
      renderProducts(searchBar.value, categoryFilter.value);
    });

    // Go to comparison page with selected SKUs in URL
    compareButton.addEventListener('click', () => {
      const skus = Array.from(selectedProducts);
      if (skus.length >= 2) {
        window.location.href = `compare.html?skus=${skus.join(',')}`;
      } else {
        alert('Please select at least two products to compare.');
      }
    });

    renderProducts(); // Initial load
  });
