// scripts/main.js

// Fetch and render product data from local JSON file
fetch(`../products.json?t=${Date.now()}`)
  .then(res => res.json())
  .then(data => {
    // DOM elements
    const gallery = document.getElementById('gallery');
    const searchBar = document.getElementById('searchBar');
    const categoryFilter = document.getElementById('categoryFilter');
    const listingTypeFilter = document.getElementById('listingTypeFilter');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');

    // Extract unique categories and populate category dropdown
    const categories = [...new Set(data.map(p => p.category).filter(Boolean))];
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categoryFilter.appendChild(opt);
    });

    // Extract unique listingTypes and populate listingType dropdown
    const listingTypes = [...new Set(data.map(p => p.listingType).filter(Boolean))];
    listingTypes.forEach(type => {
      const opt = document.createElement('option');
      opt.value = type;
      opt.textContent = type;
      listingTypeFilter.appendChild(opt);
    });

    // Main render function to display products
   function renderProducts(filter = '', category = '', listingType = '') {
  gallery.innerHTML = ''; // Clear current gallery

  // Filter based on search text, selected category, and listing type
  const filtered = data.filter(p =>
    (p.title.toLowerCase().includes(filter.toLowerCase()) ||
     p.sku.toLowerCase().includes(filter.toLowerCase())) &&
    (category === '' || p.category === category) &&
    (listingType === '' || p.listingType === listingType)
  );

  // Empty-state logic
  const emptyState = document.getElementById('emptyState');
  if (filtered.length === 0) {
    emptyState.innerHTML = `
      <img src="https://cdn.jsdelivr.net/gh/edent/SuperTinyIcons/images/svg/emoji-sad.svg" alt="No Results" width="120" style="margin-bottom:20px;opacity:.7;" />
      <div style="font-size:1.4rem;color:#888;">No products found. Try adjusting your filter or search terms!</div>
    `;
    emptyState.style.display = 'block';
    return;
  } else {
    emptyState.style.display = 'none';
  }

  // Loop through filtered products and create cards
  filtered.forEach(product => {
    const div = document.createElement('div');
    div.className = 'product';
    div.innerHTML = `
      ${product.category ? `<div class="category-tag">${product.category}</div>` : ''}
      ${product.listingType ? `<div class="listing-type-tag">${product.listingType}</div>` : ''}
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

  // Lightbox image click logic (as before)
  document.querySelectorAll('.image-wrapper img').forEach(img => {
    img.addEventListener('click', () => {
      lightboxImg.src = img.dataset.full;
      lightbox.classList.remove('hidden');
    });
  });
}
       
    // Close lightbox
    lightboxClose.addEventListener('click', () => {
      lightbox.classList.add('hidden');
      lightboxImg.src = '';
    });

    // Search and filter listeners
    searchBar.addEventListener('input', () => {
      renderProducts(searchBar.value, categoryFilter.value, listingTypeFilter.value);
    });

    categoryFilter.addEventListener('change', () => {
      renderProducts(searchBar.value, categoryFilter.value, listingTypeFilter.value);
    });

    listingTypeFilter.addEventListener('change', () => {
      renderProducts(searchBar.value, categoryFilter.value, listingTypeFilter.value);
    });

    renderProducts('', '', ''); // Initial load of product cards
  });
