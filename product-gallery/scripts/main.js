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

    async function generateZipForProduct(product) {
      const zipLoading = document.getElementById('zipLoadingOverlay');
      const progressText = document.getElementById('zipProgressText');
      zipLoading.classList.remove('hidden');
      progressText.textContent = 'Starting...';

      const zip = new JSZip();
      const asinMap = await fetch('asin_map_zip.json').then(r => r.json());
      const asin = asinMap.find(x => x.sku === product.sku)?.asin;

      if (!asin) {
        alert(`ASIN not found for ${product.sku}`);
        zipLoading.classList.add('hidden');
        return;
      }

      const productEl = [...document.querySelectorAll('.product')].find(el =>
        el.querySelector('h2')?.innerText.includes(product.sku)
      );

      const images = productEl.querySelectorAll('img');
      const total = images.length;
      let completed = 0;

      const tasks = Array.from(images).map((img, index) => {
        const label = getImageLabel(index);
        const url = img.src;

        return fetchImageAsBlob(url)
          .then(blob => zip.file(`${asin}.${label}.jpg`, blob))
          .catch(() => null)
          .finally(() => {
            completed++;
            progressText.textContent = `📷 Downloaded ${completed} of ${total} images...`;
          });
      });

      await Promise.all(tasks);

      const blob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
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
