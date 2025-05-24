// Fetch the product data from a local JSON file
fetch('products.json')
  .then(res => res.json()) // Parse the JSON response
  .then(data => {
    // Get references to all relevant DOM elements
    const gallery = document.getElementById('gallery');
    const searchBar = document.getElementById('searchBar');
    const categoryFilter = document.getElementById('categoryFilter');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');

    // Extract unique product categories (ignoring empty/undefined ones)
    const categories = [...new Set(data.map(p => p.category).filter(Boolean))];
    categories.forEach(cat => {
      const opt = document.createElement('option'); // Create <option> element
      opt.value = cat; // Set its value attribute
      opt.textContent = cat; // Set the text visible to users
      categoryFilter.appendChild(opt); // Add to the dropdown menu
    });

    // Function to render product cards with optional search & filter
    function renderProducts(filter = '', category = '') {
      gallery.innerHTML = ''; // Clear current gallery content

      // Filter products based on search input and selected category
      const filtered = data.filter(p =>
        (p.title.toLowerCase().includes(filter.toLowerCase()) || // Match title
         p.sku.toLowerCase().includes(filter.toLowerCase())) && // Match SKU
        (category === '' || p.category === category) // Match category if selected
      );

      // Generate HTML for each filtered product
      filtered.forEach(product => {
        const div = document.createElement('div');
        div.className = 'product'; // Assign CSS class

        // Set inner HTML of the product card
        div.innerHTML = `
          ${product.category ? `<div class="category-tag">${product.category}</div>` : ''} <!-- Optional category tag -->
          <h2>${product.title} (<code>${product.sku}</code>)</h2> <!-- Product title and SKU -->
          <div class="images">
            ${product.images.map((url, index) => `
              <div class="image-wrapper">
                <img src="${url}" data-full="${url}" />
                <span class="image-number">${index + 1}</span> <!-- Image index badge -->
              </div>
            `).join('')}
          </div>
        `;

        // ⭐ Add Compare button at the bottom of each product card
        const compareBtn = document.createElement('button');
        compareBtn.className = 'compare-btn';
        compareBtn.textContent = '🔄 Compare';
        compareBtn.onclick = () => {
          // Get current list from localStorage
          const selected = JSON.parse(localStorage.getItem('compareList') || '[]');

          // Check for duplicates before adding
          if (!selected.some(p => p.sku === product.sku)) {
            selected.push(product); // Add new product
            localStorage.setItem('compareList', JSON.stringify(selected)); // Save back to storage
            alert(`${product.title} added to comparison.`);
          } else {
            alert(`${product.title} is already added.`);
          }
        };

        div.appendChild(compareBtn); // Add button to card
        gallery.appendChild(div); // Add product card to the gallery
      });

      // Add click event to images for lightbox viewing
      document.querySelectorAll('.image-wrapper img').forEach(img => {
        img.addEventListener('click', () => {
          lightboxImg.src = img.dataset.full; // Set full-size image in lightbox
          lightbox.classList.remove('hidden'); // Show lightbox
        });
      });
    }

    // Lightbox close button functionality
    lightboxClose.addEventListener('click', () => {
      lightbox.classList.add('hidden'); // Hide lightbox
      lightboxImg.src = ''; // Clear image source
    });

    // Initial render (show all products)
    renderProducts();

    // Filter products as user types in the search bar
    searchBar.addEventListener('input', () => {
      renderProducts(searchBar.value, categoryFilter.value); // Re-render with search input
    });

    // Filter products when user changes category
    categoryFilter.addEventListener('change', () => {
      renderProducts(searchBar.value, categoryFilter.value); // Re-render with selected category
    });
  });
