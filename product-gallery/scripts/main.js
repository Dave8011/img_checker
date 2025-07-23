/* ===========================
   Fetch Product Data
   =========================== */
fetch(`../products.json?t=${Date.now()}`)
  .then(res => res.json())
  .then(data => {
    window.productData = data;

    /* ===========================
       State & DOM References
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
       Populate Filters
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
       Render Product Gallery
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
        emptyState.innerHTML = `<img src="https://cdn.jsdelivr.net/gh/edent/SuperTinyIcons/images/svg/emoji-sad.svg" width="120" style="margin-bottom:20px;opacity:.7;" />
          <div style="font-size:1.4rem;color:#888;">No products found. Try adjusting your filter or search terms!</div>`;
        emptyState.style.display = 'block';
        return;
      } else {
        emptyState.style.display = 'none';
      }

      filtered.forEach(product => {
        const div = document.createElement('div');
        div.className = 'product';
        div.innerHTML = `
          <div class="tag-row">
            ${product.category ? `<div class="category-tag">${product.category}</div>` : ''}
            ${product.listingType ? `<div class="listing-type-tag">${product.listingType}</div>` : ''}
          </div>
          <h2>${product.title} (<code>${product.sku}</code>)</h2>
          <div class="images">
            ${product.images.map((url, i) => `
              <div class="image-wrapper" tabindex="0">
                <img src="${url}" data-full="${url}" style="width: 200px;" loading="lazy" />
                <span class="image-number">${getImageLabel(i)}</span>
              </div>`).join('')}
          </div>
        `;
        gallery.appendChild(div);
      });

      // Lightbox trigger
      document.querySelectorAll('.image-wrapper').forEach(wrapper => {
        const productDiv = wrapper.closest('.product');
        wrapper.addEventListener('click', () => {
          currentImages = Array.from(productDiv.querySelectorAll('img')).map(img => img.dataset.full);
          currentIndex = currentImages.indexOf(wrapper.querySelector('img').dataset.full);
          updateLightboxImage();
          lightbox.classList.remove('hidden');
        });
      });
    }

    /* ===========================
       Lightbox Navigation
       =========================== */
    function updateLightboxImage() {
      lightboxImg.src = currentImages[currentIndex];
    }

    lightboxClose.onclick = () => lightbox.classList.add('hidden');
    window.addEventListener('keydown', e => {
      if (lightbox.classList.contains('hidden')) return;
      if (e.key === 'ArrowRight') currentIndex = Math.min(currentIndex + 1, currentImages.length - 1);
      if (e.key === 'ArrowLeft') currentIndex = Math.max(currentIndex - 1, 0);
      if (e.key === 'Escape') lightbox.classList.add('hidden');
      updateLightboxImage();
    });

    /* ===========================
       Helpers
       =========================== */
    function getImageLabel(i) {
      return i === 0 ? 'MAIN' : `PT${String(i).padStart(2, '0')}`;
    }

    function fetchImageAsBlob(url) {
      return fetch(url).then(res => {
        if (!res.ok) throw new Error('Fetch failed');
        return res.blob();
      });
    }

    /* ===========================
       ZIP Download Logic
       =========================== */
    document.getElementById('downloadZipBtn').addEventListener('click', () => {
      showZipPopup();
    });

    let selectedZipProduct = null;

    function showZipPopup() {
      const popup = document.getElementById('zipPopup');
      const searchInput = document.getElementById('zipSearchInput');
      const resultsDiv = document.getElementById('zipSearchResults');
      const confirmBtn = document.getElementById('zipDownloadConfirmBtn');

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
          const div = document.createElement('div');
          div.className = 'zip-result-item';
          div.textContent = `${product.title} (${product.sku})`;
          div.onclick = () => {
            selectedZipProduct = product;
            confirmBtn.disabled = false;
            searchInput.value = div.textContent;
            resultsDiv.innerHTML = '';
          };
          resultsDiv.appendChild(div);
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

    // ===========================
// 🔧 Generate ZIP for selected product
// ===========================
async function generateZipForProduct(product) {
  const zipLoading = document.getElementById('zipLoadingOverlay');
  const progressText = document.getElementById('zipProgressText');
  zipLoading.classList.remove('hidden');
  progressText.textContent = 'Initializing download...';

  const zip = new JSZip();

  // Load ASIN map
  const asinMap = await fetch('asin_map_zip.json').then(res => res.json());
  const asinEntry = asinMap.find(entry => entry.sku === product.sku);

  if (!asinEntry) {
    zipLoading.classList.add('hidden');
    alert(`❌ No ASIN found for SKU: ${product.sku}`);
    return;
  }

  const asin = asinEntry.asin;

  // Find the product element (on screen)
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

  return new Promise(async (resolve) => {
    const timeout = new Promise((res) => setTimeout(res, 5000)); // 5 sec timeout
    const waitForImage = new Promise((res, rej) => {
      if (img.complete && img.naturalWidth > 0) {
        res();
      } else {
        img.onload = res;
        img.onerror = rej;
      }
    });

    try {
      await Promise.race([waitForImage, timeout]); // Whichever finishes first
      const blob = await fetchImageAsBlob(imgURL);
      zip.file(`${asin}.${label}.jpg`, blob);
    } catch (e) {
      console.warn(`❌ Skipped: ${label} (timeout or error)`);
    }

    completed++;
    progressText.textContent = `📷 Processed ${completed} of ${total} images...`;
    resolve();
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
}

    /* ===========================
       Search & Filters
       =========================== */
    searchBar.addEventListener('input', () => renderProducts(searchBar.value, categoryFilter.value, listingTypeFilter.value));
    categoryFilter.addEventListener('change', () => renderProducts(searchBar.value, categoryFilter.value, listingTypeFilter.value));
    listingTypeFilter.addEventListener('change', () => renderProducts(searchBar.value, categoryFilter.value, listingTypeFilter.value));

    /* ===========================
       Mobile Menu Toggle
       =========================== */
    document.getElementById('menuToggle').addEventListener('click', () => {
      document.getElementById('controlGroup').classList.toggle('show');
    });

    /* ===========================
       Initial Render
       =========================== */
    renderProducts();
  });
