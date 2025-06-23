// scripts/main.js

// Fetch and render product data from local JSON file
fetch(`../products.json?t=${Date.now()}`)
  .then(res => res.json())
  .then(data => {
    // Get DOM elements
    const gallery = document.getElementById('gallery');
    const searchBar = document.getElementById('searchBar');
    const categoryFilter = document.getElementById('categoryFilter');
    const listingTypeFilter = document.getElementById('listingTypeFilter');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');
    const emptyState = document.getElementById('emptyState');

    // Populate category dropdown with unique categories
    const categories = [...new Set(data.map(p => p.category).filter(Boolean))];
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categoryFilter.appendChild(opt);
    });

    // Populate listing type dropdown with unique listing types
    const listingTypes = [...new Set(data.map(p => p.listingType).filter(Boolean))];
    listingTypes.forEach(type => {
      const opt = document.createElement('option');
      opt.value = type;
      opt.textContent = `🏷️ ${type}`; // Add icon to each listing type option
      listingTypeFilter.appendChild(opt);
    });

    /**
     * Render the filtered list of products
     * @param {string} filter - Search text
     * @param {string} category - Selected category
     * @param {string} listingType - Selected listing type
     */
    function renderProducts(filter = '', category = '', listingType = '') {
      gallery.innerHTML = ''; // Clear current gallery

      // Filter products based on search, category, and listing type
      const filtered = data.filter(p =>
        (p.title.toLowerCase().includes(filter.toLowerCase()) ||
         p.sku.toLowerCase().includes(filter.toLowerCase())) &&
        (category === '' || p.category === category) &&
        (listingType === '' || p.listingType === listingType)
      );

      // Handle empty state: show friendly image/message if no products
      if (filtered.length === 0) {
        if (emptyState) {
          emptyState.innerHTML = `
            <img src="https://cdn.jsdelivr.net/gh/edent/SuperTinyIcons/images/svg/emoji-sad.svg" alt="No Results" width="120" style="margin-bottom:20px;opacity:.7;" />
            <div style="font-size:1.4rem;color:#888;">No products found. Try adjusting your filter or search terms!</div>
          `;
          emptyState.style.display = 'block';
        }
        return;
      } else if (emptyState) {
        emptyState.style.display = 'none';
      }

      // Render each product card with fade-in effect for smooth transition
      filtered.forEach(product => {
        const div = document.createElement('div');
        div.className = 'product'; // The .product class triggers CSS animation

        // Product tags, title, images
        div.innerHTML = `
          ${product.category ? `<div class="category-tag">${product.category}</div>` : ''}
          ${product.listingType ? `<div class="listing-type-tag">🏷️ ${product.listingType}</div>` : ''}
          <h2>${product.title} (<code>${product.sku}</code>)</h2>
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

      // Add click event listeners for lightbox functionality
      document.querySelectorAll('.image-wrapper img').forEach(img => {
        img.addEventListener('click', () => {
          lightboxImg.src = img.dataset.full;
          lightbox.classList.remove('hidden');
        });
      });
    }

    // Lightbox close button event
    lightboxClose.addEventListener('click', () => {
      lightbox.classList.add('hidden');
      lightboxImg.src = '';
    });

    // Search bar input event: re-render products on typing
    searchBar.addEventListener('input', () => {
      renderProducts(searchBar.value, categoryFilter.value, listingTypeFilter.value);
    });

    // Category dropdown event: re-render products on change
    categoryFilter.addEventListener('change', () => {
      renderProducts(searchBar.value, categoryFilter.value, listingTypeFilter.value);
    });

    // Listing type dropdown event: re-render products on change
    listingTypeFilter.addEventListener('change', () => {
      renderProducts(searchBar.value, categoryFilter.value, listingTypeFilter.value);
    });

    // Initial render
    renderProducts('', '', '');
  });
