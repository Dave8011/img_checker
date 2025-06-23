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

 
    renderProducts(); // Initial load of product cards
  });
