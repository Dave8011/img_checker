// scripts/main.js

// Fetch and render product data from local JSON file
fetch(`../products.json?t=${Date.now()}`)
  .then(res => res.json())
  .then(data => {
    // DOM elements
    const gallery = document.getElementById('gallery');
    const searchBar = document.getElementById('searchBar');
    const categoryFilter = document.getElementById('categoryFilter');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');
    const compareButton = document.getElementById('compareButton');
    const toggleCompare = document.getElementById('toggleCompare');

    const selectedProducts = new Set(); // Track selected SKUs for comparison

    // Extract unique categories and populate category dropdown
    const categories = [...new Set(data.map(p => p.category).filter(Boolean))];
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categoryFilter.appendChild(opt);
    });

    // Main render function to display products
    function renderProducts(filter = '', category = '') {
      gallery.innerHTML = ''; // Clear current gallery

      // Filter based on search text and selected category
      const filtered = data.filter(p =>
        (p.title.toLowerCase().includes(filter.toLowerCase()) ||
         p.sku.toLowerCase().includes(filter.toLowerCase())) &&
        (category === '' || p.category === category)
      );

      // Loop through filtered products and create cards
      filtered.forEach(product => {
        const div = document.createElement('div');
        div.className = 'product';

        const isChecked = selectedProducts.has(product.sku); // If selected previously

        // Generate HTML for the product card
        div.innerHTML = `
          ${product.category ? `<div class="category-tag">${product.category}</div>` : ''}
          <h2>${product.title} (<code>${product.sku}</code>)</h2>

          ${toggleCompare.checked ? `
            <label class="compare-label">
              <input type="checkbox" data-sku="${product.sku}" ${isChecked ? 'checked' : ''}>
              <span>Select for Comparison</span>
            </label>
          ` : ''}

          <div class="images">
            ${product.images.map((url, index) => `
              <div class="image-wrapper">
                <img src="${url}" data-full="${url}" style="width: 200px;" />
                <span class="image-number">${index + 1}</span>
              </div>
            `).join('')}
          </div>
        `;
        gallery.appendChild(div);
      });

      // Lightbox image click logic
      document.querySelectorAll('.image-wrapper img').forEach(img => {
        img.addEventListener('click', () => {
          lightboxImg.src = img.dataset.full;
          lightbox.classList.remove('hidden');
        });
      });

      // Handle compare checkbox clicks (if visible)
      if (toggleCompare.checked) {
        document.querySelectorAll('input[type="checkbox"][data-sku]').forEach(checkbox => {
          checkbox.addEventListener('change', () => {
            const sku = checkbox.dataset.sku;
            if (checkbox.checked) {
              selectedProducts.add(sku);
            } else {
              selectedProducts.delete(sku);
            }
          });
        });
      }
    }

    // Close lightbox
    lightboxClose.addEventListener('click', () => {
      lightbox.classList.add('hidden');
      lightboxImg.src = '';
    });

    // Search and filter listeners
    searchBar.addEventListener('input', () => {
      renderProducts(searchBar.value, categoryFilter.value);
    });

    categoryFilter.addEventListener('change', () => {
      renderProducts(searchBar.value, categoryFilter.value);
    });

    // Compare button sends user to compare.html with selected SKUs in URL
    compareButton.addEventListener('click', () => {
      const skus = Array.from(selectedProducts);
      if (skus.length >= 2) {
        // Store selected products in localStorage
        localStorage.setItem('selectedProducts', JSON.stringify(skus));
        window.location.href = `compare.html?skus=${skus.join(',')}`;
      } else {
        alert('Please select at least two products to compare.');
      }
    });

    // Toggle comparison mode on/off
    toggleCompare.addEventListener('change', () => {
      renderProducts(searchBar.value, categoryFilter.value); // Rerender with/without checkboxes
    });

    renderProducts(); // Initial load of product cards
  });
