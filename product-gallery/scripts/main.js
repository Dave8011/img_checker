// scripts/main.js

/* ===========================
   Fetch Product Data and Setup
   =========================== */
fetch(`../products.json?t=${Date.now()}`)
  .then(res => res.json())
  .then(data => {
    window.productData = data; // Store product data globally for other features (ZIP, etc.)

    /* ===========================
       Initialize Variables and DOM Elements
       =========================== */
    let currentImages = [];
    let currentIndex = 0;

    const gallery = document.getElementById('gallery');
    const searchBar = document.getElementById('searchBar');
    const categoryFilter = document.getElementById('categoryFilter');
    const listingTypeFilter = document.getElementById('listingTypeFilter');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');
    const emptyState = document.getElementById('emptyState');

    /* ===========================
       Populate Filters from Data
       =========================== */
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

    /* ===========================
       Render Product Cards
       =========================== */
    function renderProducts(filter = '', category = '', listingType = '') {
      gallery.innerHTML = '';
      const filtered = data.filter(p =>
        (p.title.toLowerCase().includes(filter.toLowerCase()) ||
         p.sku.toLowerCase().includes(filter.toLowerCase())) &&
        (category === '' || p.category === category) &&
        (listingType === '' || p.listingType === listingType)
      );

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

      filtered.forEach(product => {
        const div = document.createElement('div');
        div.className = 'product';
        div.setAttribute('role', 'region');
        div.setAttribute('aria-label', `${product.title}, SKU ${product.sku}`);

        div.innerHTML = `
          <div class="tag-row">
            ${product.category ? `<div class="category-tag" title="Category">${product.category}</div>` : ''}
            ${product.listingType ? `<div class="listing-type-tag" title="Listing Type">${product.listingType}</div>` : ''}
          </div>
          <h2>${product.title} (<code>${product.sku}</code>)</h2>
          <div class="images" role="list">
            ${product.images.map((url, index) => `
              <div class="image-wrapper" tabindex="0" role="listitem">
                <img src="${url}" data-full="${url}" alt="${product.title} image ${index + 1}" loading="lazy" />
                <span class="image-number">${getImageLabel(index)}</span>
              </div>
            `).join('')}
          </div>
        `;
        gallery.appendChild(div);
      });

      // Setup lightbox events
      document.querySelectorAll('.image-wrapper').forEach(wrapper => {
        function openLightbox() {
          const productDiv = wrapper.closest('.product');
          currentImages = Array.from(productDiv.querySelectorAll('img')).map(img => img.dataset.full);
          const img = wrapper.querySelector('img');
          currentIndex = currentImages.indexOf(img.dataset.full);

          updateLightboxImage();
          lightbox.classList.remove('hidden');
          lightboxClose.focus();
        }
        wrapper.addEventListener('click', openLightbox);
        wrapper.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openLightbox();
          }
        });
      });
    }

    function updateLightboxImage() {
      lightboxImg.src = currentImages[currentIndex];
      lightboxImg.alt = `Image ${currentIndex + 1} of ${currentImages.length}`;
    }

    // Lightbox close events
    lightboxClose.addEventListener('click', () => lightbox.classList.add('hidden'));
    lightboxClose.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        lightbox.classList.add('hidden');
      }
    });

    // Lightbox navigation via keyboard
    window.addEventListener('keydown', e => {
      if (!lightbox.classList.contains('hidden')) {
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
          currentIndex--;
          updateLightboxImage();
        } else if (e.key === 'ArrowRight' && currentIndex < currentImages.length - 1) {
          currentIndex++;
          updateLightboxImage();
        } else if (e.key === 'Escape') {
          lightbox.classList.add('hidden');
        }
      }
    });

    // Filters & search
    searchBar.addEventListener('input', () => renderProducts(searchBar.value, categoryFilter.value, listingTypeFilter.value));
    categoryFilter.addEventListener('change', () => renderProducts(searchBar.value, categoryFilter.value, listingTypeFilter.value));
    listingTypeFilter.addEventListener('change', () => renderProducts(searchBar.value, categoryFilter.value, listingTypeFilter.value));

    /* ===========================
       Image Labeling Function
       =========================== */
    function getImageLabel(index) {
      if (index === 0) return 'MAIN';
      return `PT${String(index).padStart(2, '0')}`;
    }

    /* ===========================
       Image Fetch as Blob
       =========================== */
    function fetchImageAsBlob(url) {
      return fetch(url).then(res => {
        if (!res.ok) throw new Error('Image fetch failed');
        return res.blob();
      });
    }

    /* ===========================
       ZIP Download Button Setup
       =========================== */
    document.getElementById('downloadZipBtn').addEventListener('click', () => {
      showZipPopup();
    });

    /* ===========================
       ZIP Popup Logic
       =========================== */
    let selectedZipProduct = null;

    function showZipPopup() {
      const popup = document.getElementById('zipPopup');
      const searchInput = document.getElementById('zipSearchInput');
      const resultsDiv = document.getElementById('zipSearchResults');
      const confirmBtn = document.getElementById('zipDownloadConfirmBtn');
      selectedZipProduct = null;

      popup.classList.remove('hidden');
      searchInput.value = '';
      resultsDiv.innerHTML = '';
      confirmBtn.disabled = true;

      searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        resultsDiv.innerHTML = '';

        const matches = window.productData.filter(p =>
          p.sku.toLowerCase().includes(query) || p.title.toLowerCase().includes(query)
        );

        matches.forEach(product => {
          const item = document.createElement('div');
          item.className = 'zip-result-item';
          item.textContent = `${product.title} (${product.sku})`;
          item.addEventListener('click', () => {
            selectedZipProduct = product;
            confirmBtn.disabled = false;
            searchInput.value = `${product.title} (${product.sku})`;
            resultsDiv.innerHTML = '';
          });
          resultsDiv.appendChild(item);
        });
      });

      document.getElementById('zipPopupCloseBtn').onclick = () => {
        popup.classList.add('hidden');
      };

      confirmBtn.onclick = () => {
        popup.classList.add('hidden');
        if (selectedZipProduct) {
          generateZipForProduct(selectedZipProduct);
        }
      };
    }

    /* ===========================
       Generate ZIP File
       =========================== */
    async function generateZipForProduct(product) {
      const zipLoading = document.getElementById('zipLoadingOverlay');
      const progressText = document.getElementById('zipProgressText');
      zipLoading.classList.remove('hidden');
      progressText.textContent = 'Starting download...';

      const zip = new JSZip();
      const asinMap = await fetch('asin_map_zip.json').then(res => res.json());
      const asinEntry = asinMap.find(entry => entry.sku === product.sku);

      if (!asinEntry) {
        zipLoading.classList.add('hidden');
        alert(`❌ No ASIN found for SKU: ${product.sku}`);
        return;
      }

      const asin = asinEntry.asin;
      const productEl = [...document.querySelectorAll('.product')].find(el =>
        el.querySelector('h2')?.innerText.includes(product.sku)
      );

      if (!productEl) {
        zipLoading.classList.add('hidden');
        alert(`⚠️ Product not currently visible on screen.`);
        return;
      }

      const images = productEl.querySelectorAll('img');
      const total = images.length;
      let completed = 0;

      const downloadPromises = Array.from(images).map((img, index) => {
        const label = getImageLabel(index);
        const imgURL = img.src;

        return new Promise(resolve => {
          const onSuccess = (blob) => {
            zip.file(`${asin}.${label}.jpg`, blob);
            completed++;
            progressText.textContent = `📷 Downloaded ${completed} of ${total} images...`;
            resolve();
          };

          const onFail = () => {
            completed++;
            progressText.textContent = `📷 Downloaded ${completed} of ${total} images...`;
            resolve();
          };

          if (img.complete && img.naturalWidth > 0) {
            fetchImageAsBlob(imgURL).then(onSuccess).catch(onFail);
          } else {
            img.onload = () => fetchImageAsBlob(imgURL).then(onSuccess).catch(onFail);
            img.onerror = onFail;
          }
        });
      });

      await Promise.all(downloadPromises);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${asin}_images.zip`;
      a.click();

      zipLoading.classList.add('hidden');
      progressText.textContent = '';
    }

    /* ===========================
       Mobile Menu Toggle
       =========================== */
    const menuToggle = document.getElementById('menuToggle');
    const controlGroup = document.getElementById('controlGroup');

    menuToggle.addEventListener('click', () => {
      controlGroup.classList.toggle('show');
    });

    /* ===========================
       Initial Page Render
       =========================== */
    renderProducts('', '', '');
  });
