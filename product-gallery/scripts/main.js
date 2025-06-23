// scripts/main.js

fetch(`../products.json?t=${Date.now()}`)
  .then(res => res.json())
  .then(data => {
    // Grab DOM elements
    const gallery = document.getElementById('gallery');
    const searchBar = document.getElementById('searchBar');
    const categoryFilter = document.getElementById('categoryFilter');
    const listingTypeFilter = document.getElementById('listingTypeFilter');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');
    const emptyState = document.getElementById('emptyState');

    // Populate dropdowns with unique categories and listing types
    const categories = [...new Set(data.map(p => p.category).filter(Boolean))];
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categoryFilter.appendChild(opt);
    });
    const listingTypes = [...new Set(data.map(p => p.listingType).filter(Boolean))];
    listingTypes.forEach(type => {
      const opt = document.createElement('option');
      opt.value = type;
      opt.textContent = type;
      listingTypeFilter.appendChild(opt);
    });

    // Render product cards
    function renderProducts(filter = '', category = '', listingType = '') {
      gallery.innerHTML = '';

      // Filter product data
      const filtered = data.filter(p =>
        (p.title.toLowerCase().includes(filter.toLowerCase()) ||
         p.sku.toLowerCase().includes(filter.toLowerCase())) &&
        (category === '' || p.category === category) &&
        (listingType === '' || p.listingType === listingType)
      );

      // Handle empty state
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

      // For each product, create a card
      filtered.forEach(product => {
        const div = document.createElement('div');
        div.className = 'product';
        div.setAttribute('role', 'region');
        div.setAttribute('aria-label', `${product.title}, SKU ${product.sku}`);

        // Tag row: category and listing type
        div.innerHTML = `
          <div class="tag-row">
            ${product.category ? `<div class="category-tag" title="Category">${product.category}</div>` : ''}
            ${product.listingType ? `<div class="listing-type-tag" title="Listing Type">${product.listingType}</div>` : ''}
          </div>
          <h2>${product.title} (<code>${product.sku}</code>)</h2>
          <div class="images" role="list">
            ${product.images.map((url, index) => `
              <div class="image-wrapper" tabindex="0" role="listitem" aria-label="Image ${index + 1} for ${product.title}">
                <img 
                  src="${url}" 
                  data-full="${url}" 
                  style="width: 200px;" 
                  alt="${product.title} image ${index + 1}" 
                  loading="lazy"
                />
                <span class="image-number">${index + 1}</span>
              </div>
            `).join('')}
          </div>
        `;
        gallery.appendChild(div);
      });

      // Add click and keyboard events for lightbox
      document.querySelectorAll('.image-wrapper').forEach(wrapper => {
        wrapper.addEventListener('click', () => {
          const img = wrapper.querySelector('img');
          lightboxImg.src = img.dataset.full;
          lightboxImg.alt = img.alt;
          lightbox.classList.remove('hidden');
          lightboxClose.focus();
        });
        wrapper.addEventListener('keydown', (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            const img = wrapper.querySelector('img');
            lightboxImg.src = img.dataset.full;
            lightboxImg.alt = img.alt;
            lightbox.classList.remove('hidden');
            lightboxClose.focus();
          }
        });
      });
    }

    // Lightbox close: mouse and keyboard
    lightboxClose.addEventListener('click', () => {
      lightbox.classList.add('hidden');
      lightboxImg.src = '';
    });
    lightboxClose.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        lightbox.classList.add('hidden');
        lightboxImg.src = '';
      }
    });
    window.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('hidden') && e.key === 'Escape') {
        lightbox.classList.add('hidden');
        lightboxImg.src = '';
      }
    });

    // Filter and search events
    searchBar.addEventListener('input', () => {
      renderProducts(searchBar.value, categoryFilter.value, listingTypeFilter.value);
    });
    categoryFilter.addEventListener('change', () => {
      renderProducts(searchBar.value, categoryFilter.value, listingTypeFilter.value);
    });
    listingTypeFilter.addEventListener('change', () => {
      renderProducts(searchBar.value, categoryFilter.value, listingTypeFilter.value);
    });

    // Initial render
    renderProducts('', '', '');
  });
