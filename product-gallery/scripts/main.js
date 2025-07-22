// scripts/main.js

// Fetch product data (cache-busted each time)
fetch(`../products.json?t=${Date.now()}`)
  .then(res => res.json())
  .then(data => {
    // --- State for lightbox navigation ---
    let currentImages = []; // Array of current product's images in lightbox
    let currentIndex = 0;   // Index of the currently displayed image in lightbox

    // --- Grab DOM elements ---
    const gallery = document.getElementById('gallery');
    const searchBar = document.getElementById('searchBar');
    const categoryFilter = document.getElementById('categoryFilter');
    const listingTypeFilter = document.getElementById('listingTypeFilter');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');
    const emptyState = document.getElementById('emptyState');

    // --- Populate dropdowns with unique categories and listing types ---
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

    // --- Helper: Update the lightbox image based on currentIndex ---
    function updateLightboxImage() {
      lightboxImg.src = currentImages[currentIndex];
      lightboxImg.alt = `Image ${currentIndex + 1} of ${currentImages.length}`;
    }

    // --- Render product cards based on filters/search ---
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

      // --- Add click and keyboard events for lightbox + navigation setup ---
      document.querySelectorAll('.image-wrapper').forEach(wrapper => {
        // Open lightbox on click or keyboard (Enter/Space)
        function openLightbox() {
          // Get all images for this product card
          const productDiv = wrapper.closest('.product');
          currentImages = Array.from(productDiv.querySelectorAll('.image-wrapper img')).map(img => img.dataset.full);
          const img = wrapper.querySelector('img');
          currentIndex = currentImages.indexOf(img.dataset.full);

          updateLightboxImage();
          lightbox.classList.remove('hidden');
          lightboxClose.focus();
        }
        wrapper.addEventListener('click', openLightbox);
        wrapper.addEventListener('keydown', (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openLightbox();
          }
        });
      });
    }

    // --- Lightbox close: mouse and keyboard ---
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

    // --- Lightbox keyboard navigation (arrow keys & Esc) ---
    window.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('hidden')) {
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
          currentIndex--;
          updateLightboxImage();
        } else if (e.key === 'ArrowRight' && currentIndex < currentImages.length - 1) {
          currentIndex++;
          updateLightboxImage();
        } else if (e.key === 'Escape') {
          lightbox.classList.add('hidden');
          lightboxImg.src = '';
        }
      }
    });

    // --- Touch swipe navigation for lightbox (on mobile) ---
    let touchStartX = 0;
    lightbox.addEventListener('touchstart', e => {
      if (e.touches.length === 1) touchStartX = e.touches[0].clientX;
    });
    lightbox.addEventListener('touchend', e => {
      if (e.changedTouches.length === 1) {
        let deltaX = e.changedTouches[0].clientX - touchStartX;
        if (deltaX > 50 && currentIndex > 0) {
          currentIndex--;
          updateLightboxImage();
        } else if (deltaX < -50 && currentIndex < currentImages.length - 1) {
          currentIndex++;
          updateLightboxImage();
        }
      }
    });

    // --- Filter and search events ---
    searchBar.addEventListener('input', () => {
      renderProducts(searchBar.value, categoryFilter.value, listingTypeFilter.value);
    });
    categoryFilter.addEventListener('change', () => {
      renderProducts(searchBar.value, categoryFilter.value, listingTypeFilter.value);
    });
    listingTypeFilter.addEventListener('change', () => {
      renderProducts(searchBar.value, categoryFilter.value, listingTypeFilter.value);
    });

    // --- Missing IMG CSV download logic ---
document.getElementById('downloadMissingBtn').addEventListener('click', () => {
  const missingImagesData = [];

  document.querySelectorAll('.product').forEach(productEl => {
    const titleText = productEl.querySelector('h2')?.innerText || '';
    const skuMatch = titleText.match(/\(([^)]+)\)/);
    const sku = skuMatch ? skuMatch[1] : '';
    const title = titleText.replace(/\s*\([^)]+\)/, '');
    const category = productEl.querySelector('.category-tag')?.textContent?.trim() || '';
    const listingType = productEl.querySelector('.listing-type-tag')?.textContent?.trim() || '';

    const imageElements = productEl.querySelectorAll('img');
    const missingNumbers = [];

    imageElements.forEach((img, index) => {
      if (!img.complete || img.naturalWidth === 0) {
        missingNumbers.push(index + 1); // 1-based index
      }
    });

    if (missingNumbers.length > 0) {
      missingImagesData.push({
        sku,
        title,
        category,
        listingType,
        missingImageNumbers: missingNumbers.join(', ')
      });
    }
  });

  if (missingImagesData.length === 0) {
    alert("✅ No missing images found!");
    return;
  }

  const csvHeader = 'sku,title,category,listingType,missingImageNumbers\n';
  const csvRows = missingImagesData.map(item =>
    `${item.sku},"${item.title.replace(/"/g, '""')}",${item.category},${item.listingType},"${item.missingImageNumbers}"`
  );

  const csvContent = csvHeader + csvRows.join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'missing_images_report.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});



    // --- Initial render ---
    renderProducts('', '', '');
  });
