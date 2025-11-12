/* ===========================
   Product Gallery App (Refactor)
   - ES Module style script (copy-paste ready)
   - Requires JSZip to be available globally (window.JSZip)
   =========================== */

(async function ProductGalleryApp() {
  'use strict';

  /* ===========================
     Config
     =========================== */
  const PRODUCTS_URL = '../products.json';
  const ASIN_MAP_URL = 'asin_map_zip.json';
  const IMAGE_HEAD_TIMEOUT = 8000; // ms
  const IMAGE_FALLBACK_TIMEOUT = 12000; // ms (for <img> fallback)
  const SEARCH_DEBOUNCE_MS = 250;

  /* ===========================
     Cached state & DOM refs
     =========================== */
  let productData = [];
  let asinMap = null; // cached asin map array
  let currentImages = [];
  let currentIndex = 0;

  const $ = id => document.getElementById(id);

  // Required DOM elements (please ensure these exist in your HTML)
  const gallery = $('gallery');
  const searchBar = $('searchBar');
  const categoryFilter = $('categoryFilter');
  const listingTypeFilter = $('listingTypeFilter');
  const lightbox = $('lightbox');
  const lightboxImg = $('lightbox-img');
  const lightboxClose = $('lightbox-close');
  const emptyState = $('emptyState');
  const downloadZipBtn = $('downloadZipBtn');
  const zipPopup = $('zipPopup');
  const zipSearchInput = $('zipSearchInput');
  const zipSearchResults = $('zipSearchResults');
  const zipDownloadConfirmBtn = $('zipDownloadConfirmBtn');
  const zipPopupCloseBtn = $('zipPopupCloseBtn');
  const zipLoadingOverlay = $('zipLoadingOverlay');
  const zipProgressText = $('zipProgressText');
  const zipProgressBar = $('zipProgressBar'); // progress element <progress>
  const downloadMissingBtn = $('downloadMissingBtn');
  const missingLoadingOverlay = $('missingLoadingOverlay');
  const missingProgressText = $('missingProgressText');
  const missingProgressBar = $('missingProgressBar'); // progress element <progress>
  const menuToggle = $('menuToggle');
  const controlGroup = $('controlGroup');
  const resetFiltersBtnId = 'resetFiltersBtn'; // will create in empty state

  // Defensive checks
  if (!gallery || !searchBar || !categoryFilter || !listingTypeFilter) {
    console.error('Missing required DOM elements. Make sure IDs exist (gallery, searchBar, categoryFilter, listingTypeFilter).');
  }

  /* ===========================
     Utilities
     =========================== */

  function sanitizeFilename(name) {
    // Remove or replace characters not allowed on most filesystems
    return String(name).replace(/[\/\\:*?"<>|]+/g, '_');
  }

  function getImageLabel(index) {
    return index === 0 ? 'MAIN' : `PT${String(index).padStart(2, '0')}`;
  }

  function debounce(fn, delay = 250) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }

  function createElem(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v);
    }
    children.forEach(c => el.appendChild(c));
    return el;
  }

  function normalizeData(raw = []) {
    return raw.map(p => ({
      sku: (p.sku || '').trim(),
      title: p.title || '(Untitled)',
      category: p.category || 'Uncategorized',
      listingType: p.listingType || 'N/A',
      images: Array.isArray(p.images) ? p.images.slice() : [],
      ...p
    }));
  }

  /* Robust image existence check:
     1) Try HEAD (fast) using fetch + AbortController
     2) If HEAD fails (CORS or not allowed) fallback to loading via Image element (slower)
  */
  async function checkImageExistsHead(url, timeout = IMAGE_HEAD_TIMEOUT) {
    if (!url) return false;
    let controller = new AbortController();
    let id = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, { method: 'HEAD', signal: controller.signal, cache: 'no-store' });
      clearTimeout(id);
      return res.ok;
    } catch (err) {
      clearTimeout(id);
      return null; // signal to use fallback
    }
  }

  function checkImageExistsImg(url, timeout = IMAGE_FALLBACK_TIMEOUT) {
    return new Promise(resolve => {
      if (!url) return resolve(false);
      const img = new Image();
      let done = false;
      const to = setTimeout(() => {
        if (!done) {
          done = true;
          resolve(false);
        }
      }, timeout);

      img.onload = () => {
        if (!done) {
          done = true;
          clearTimeout(to);
          resolve(true);
        }
      };
      img.onerror = () => {
        if (!done) {
          done = true;
          clearTimeout(to);
          resolve(false);
        }
      };

      // Trigger load (may be cached)
      img.src = url;
      // Some browsers will not fire onload for data: URIs after set src; but it's okay.
    });
  }

  async function checkImageURL(url) {
    // Returns true/false
    const head = await checkImageExistsHead(url);
    if (head === true) return true;
    if (head === false) return false; // HEAD returned non-ok status
    // head === null -> fallback
    return await checkImageExistsImg(url);
  }

  /* ===========================
     Fetching / Initialization
     =========================== */

  async function fetchJSON(url) {
    try {
      const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async function loadProducts() {
    try {
      const raw = await fetchJSON(PRODUCTS_URL);
      productData = normalizeData(raw);
      populateFilters(productData);
      renderProducts(); // initial render
    } catch (err) {
      alert('❌ Failed to load product data. Open console for details.');
    }
  }

  async function loadAsinMap() {
    if (asinMap) return asinMap;
    try {
      const map = await fetchJSON(ASIN_MAP_URL);
      asinMap = Array.isArray(map) ? map : [];
      return asinMap;
    } catch (err) {
      console.warn('ASIN map not found or failed to load.', err);
      asinMap = [];
      return asinMap;
    }
  }

  /* ===========================
     Filter population
     =========================== */

  function clearSelectOptions(selectEl) {
    while (selectEl.options.length > 1) { // keep first (empty) option
      selectEl.remove(1);
    }
  }

  function populateFilters(data) {
    const categories = [...new Set(data.map(p => p.category).filter(Boolean))].sort();
    const listingTypes = [...new Set(data.map(p => p.listingType).filter(Boolean))].sort();

    clearSelectOptions(categoryFilter);
    clearSelectOptions(listingTypeFilter);

    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categoryFilter.appendChild(opt);
    });

    listingTypes.forEach(type => {
      const opt = document.createElement('option');
      opt.value = type;
      opt.textContent = type;
      listingTypeFilter.appendChild(opt);
    });
  }

  /* ===========================
     Rendering products
     =========================== */

  function renderEmptyState(filterText = '') {
    emptyState.innerHTML = `
      <div style="text-align:center;padding:20px;">
        <img src="https://cdn.jsdelivr.net/gh/edent/SuperTinyIcons/images/svg/emoji-sad.svg" width="120" style="margin-bottom:12px;opacity:.78;" alt="No results"/>
        <div style="font-size:1.15rem;color:#666;margin-bottom:12px;">No products found. Try adjusting your filter or search terms.</div>
        <button id="${resetFiltersBtnId}" style="padding:8px 12px;border-radius:6px;border:1px solid #bbb;background:#fff;cursor:pointer;">Reset filters</button>
      </div>
    `;
    emptyState.style.display = 'block';

    const resetBtn = document.getElementById(resetFiltersBtnId);
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        searchBar.value = '';
        categoryFilter.value = '';
        listingTypeFilter.value = '';
        renderProducts();
      });
    }
  }

  function clearGallery() {
    gallery.innerHTML = '';
  }

  function makeProductElement(product) {
    const wrapper = createElem('div', { class: 'product' });
    // tag row
    const tagRow = createElem('div', { class: 'tag-row' });
    if (product.category) {
      const cat = createElem('div', { class: 'category-tag', html: product.category });
      tagRow.appendChild(cat);
    }
    if (product.listingType) {
      const lt = createElem('div', { class: 'listing-type-tag', html: product.listingType });
      tagRow.appendChild(lt);
    }
    wrapper.appendChild(tagRow);

    const h2 = createElem('h2', { html: `${escapeHtml(product.title)} (<code>${escapeHtml(product.sku)}</code>)` });
    wrapper.appendChild(h2);

    const imagesContainer = createElem('div', { class: 'images' });
    product.images.forEach((url, i) => {
      const imageWrapper = createElem('div', { class: 'image-wrapper', tabindex: '0' });
      const img = createElem('img', {
        src: url,
        'data-full': url,
        loading: 'lazy',
        alt: `${product.title} - ${getImageLabel(i)}`
      });
      img.style.width = '200px';
      const labelSpan = createElem('span', { class: 'image-number', html: escapeHtml(getImageLabel(i)) });

      imageWrapper.appendChild(img);
      imageWrapper.appendChild(labelSpan);

      // Accessibility: open lightbox on Enter key
      imageWrapper.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          imageWrapper.click();
        }
      });

      imagesContainer.appendChild(imageWrapper);
    });

    wrapper.appendChild(imagesContainer);
    return wrapper;
  }

  // Simple HTML escape for injecting text into innerHTML
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function attachImageClickHandlers(container) {
    container.querySelectorAll('.image-wrapper').forEach(wrapper => {
      wrapper.addEventListener('click', () => {
        const productDiv = wrapper.closest('.product');
        currentImages = Array.from(productDiv.querySelectorAll('img')).map(img => img.dataset.full);
        currentIndex = currentImages.indexOf(wrapper.querySelector('img').dataset.full);
        updateLightboxImage();
        lightbox.classList.remove('hidden');
        // focus for keyboard navigation
        lightbox.focus?.();
      });
    });
  }

  function renderProducts(filter = searchBar.value || '', category = categoryFilter.value || '', listingType = listingTypeFilter.value || '') {
    clearGallery();
    emptyState.style.display = 'none';

    const q = String(filter).trim().toLowerCase();

    const filtered = productData.filter(p => {
      const matchText = p.title.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      const matchCategory = !category || p.category === category;
      const matchListing = !listingType || p.listingType === listingType;
      return matchText && matchCategory && matchListing;
    });

    if (!filtered.length) {
      renderEmptyState(filter);
      return;
    }

    // Build document fragment for performance
    const frag = document.createDocumentFragment();
    filtered.forEach(product => {
      const el = makeProductElement(product);
      frag.appendChild(el);
    });
    gallery.appendChild(frag);

    // Attach handlers (delegated approach could be used; this is fine for moderate sizes)
    attachImageClickHandlers(gallery);
  }

  /* ===========================
     Lightbox
     =========================== */

  function updateLightboxImage() {
    if (!currentImages.length) return;
    const url = currentImages[currentIndex];
    // Optionally use decode() to avoid flicker on some browsers
    lightboxImg.classList.remove('visible');
    lightboxImg.src = url;
    // ensure alt is updated
    lightboxImg.alt = `Image ${currentIndex + 1} of ${currentImages.length}`;
    // show after decode if available
    if (lightboxImg.decode) {
      lightboxImg.decode().catch(() => {}).then(() => lightboxImg.classList.add('visible'));
    } else {
      lightboxImg.classList.add('visible');
    }
  }

  lightboxClose?.addEventListener('click', () => {
    lightbox.classList.add('hidden');
  });

  // keyboard navigation for lightbox
  window.addEventListener('keydown', e => {
    if (lightbox && lightbox.classList.contains('hidden')) return;
    if (e.key === 'ArrowRight') {
      currentIndex = Math.min(currentIndex + 1, currentImages.length - 1);
      updateLightboxImage();
    }
    if (e.key === 'ArrowLeft') {
      currentIndex = Math.max(currentIndex - 1, 0);
      updateLightboxImage();
    }
    if (e.key === 'Escape') {
      lightbox.classList.add('hidden');
    }
  });

  /* ===========================
     ZIP Download (popup + generation)
     =========================== */

  function showZipPopup() {
    if (!zipPopup) return;
    zipPopup.classList.remove('hidden');
    zipSearchInput.value = '';
    zipSearchResults.innerHTML = '';
    zipDownloadConfirmBtn.disabled = true;
    selectedZipProduct = null;

    zipSearchInput.focus();
  }

  let selectedZipProduct = null;

  function hideZipPopup() {
    if (!zipPopup) return;
    zipPopup.classList.add('hidden');
  }

  // search handler for zip popup
  function zipSearchHandler() {
    const q = zipSearchInput.value.trim().toLowerCase();
    zipSearchResults.innerHTML = '';
    if (!q) return;
    const matches = productData.filter(p => p.sku.toLowerCase().includes(q) || p.title.toLowerCase().includes(q)).slice(0, 50);
    const frag = document.createDocumentFragment();
    matches.forEach(product => {
      const div = createElem('div', { class: 'zip-result-item', html: `${escapeHtml(product.title)} (${escapeHtml(product.sku)})` });
      div.addEventListener('click', () => {
        selectedZipProduct = product;
        zipDownloadConfirmBtn.disabled = false;
        zipSearchInput.value = `${product.title} (${product.sku})`;
        zipSearchResults.innerHTML = '';
      });
      frag.appendChild(div);
    });
    zipSearchResults.appendChild(frag);
  }

  // sanitize a path-friendly name
  function makeZipFilename(asin) {
    return sanitizeFilename(`${asin}_images.zip`);
  }

  async function generateZipForProduct(product) {
    if (!product) return;
    zipLoadingOverlay.classList.remove('hidden');
    zipProgressText.textContent = 'Initializing...';
    zipProgressBar?.setAttribute('value', '0');

    // load cached asin map
    const map = await loadAsinMap();
    const entry = map.find(e => String(e.sku || '') === String(product.sku || ''));

    if (!entry || !entry.asin) {
      zipLoadingOverlay.classList.add('hidden');
      alert(`❌ No ASIN found for SKU: ${product.sku}`);
      return;
    }
    const asin = entry.asin;
    const productEl = [...document.querySelectorAll('.product')].find(el =>
      el.querySelector('h2')?.innerText.includes(product.sku)
    );

    if (!productEl) {
      zipLoadingOverlay.classList.add('hidden');
      alert('⚠️ Product not currently visible on screen. Please search/ensure product is visible and try again.');
      return;
    }

    const images = Array.from(productEl.querySelectorAll('img'));
    const total = images.length;
    let completed = 0;

    const zip = new JSZip();

    // Process images sequentially-ish but allow concurrency to speed up (limit concurrency)
    const concurrency = 4;
    const queue = images.map((img, index) => ({ img, index }));
    async function worker() {
      while (queue.length) {
        const item = queue.shift();
        const { img, index } = item;
        const label = getImageLabel(index);
        const imgURL = img.dataset.full || img.src;

        zipProgressText.textContent = `Checking ${label}... (${completed}/${total})`;
        try {
          // Wait for image to be available in browser cache if possible
          await waitForImageComplete(img, 5000).catch(() => null);
          // fetch as blob (not HEAD because we need the image content)
          const blob = await fetchWithTimeout(imgURL, 20000).then(res => res.blob());
          // Add to zip with sanitized filename
          zip.file(`${sanitizeFilename(asin)}.${sanitizeFilename(label)}.jpg`, blob);
        } catch (err) {
          console.warn('Skipped image', label, err);
        }
        completed++;
        // update UI
        if (zipProgressBar) zipProgressBar.value = Math.round((completed / total) * 100);
        zipProgressText.textContent = `Processed ${completed} of ${total} images...`;
      }
    }

    // spawn workers
    const workers = Array.from({ length: Math.min(concurrency, total) }).map(worker);
    await Promise.all(workers);

    zipProgressText.textContent = 'Generating ZIP...';

    try {
      const zipBlob = await zip.generateAsync({ type: 'blob' }, (meta) => {
        if (zipProgressBar) zipProgressBar.value = Math.round(meta.percent);
        zipProgressText.textContent = `Compressing... ${Math.round(meta.percent)}%`;
      });

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = makeZipFilename(asin);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      zipProgressText.textContent = '✅ Done';
    } catch (err) {
      console.error('ZIP generation failed', err);
      alert('❌ ZIP generation failed. See console for details.');
    } finally {
      setTimeout(() => zipLoadingOverlay.classList.add('hidden'), 600);
    }
  }

  function waitForImageComplete(imgEl, timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (!imgEl) return reject(new Error('No image element'));
      if (imgEl.complete && imgEl.naturalWidth > 0) return resolve();
      let done = false;
      const to = setTimeout(() => {
        if (!done) {
          done = true;
          reject(new Error('timeout waiting for image load'));
        }
      }, timeout);
      imgEl.onload = () => {
        if (!done) {
          done = true;
          clearTimeout(to);
          resolve();
        }
      };
      imgEl.onerror = () => {
        if (!done) {
          done = true;
          clearTimeout(to);
          reject(new Error('image error'));
        }
      };
    });
  }

  // fetch with timeout helper
  async function fetchWithTimeout(url, timeout = 15000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  /* ===========================
     Missing images CSV (grouped by product)
     =========================== */

  async function generateMissingImagesCSV() {
    missingLoadingOverlay.classList.remove('hidden');
    missingProgressText.textContent = 'Preparing...';
    missingProgressBar?.setAttribute('value', '0');

    const missingMap = new Map();
    const products = productData;
    const totalImages = products.reduce((sum, p) => sum + (p.images?.length || 0), 0);
    let checked = 0;

    // We'll process with a small delay between requests to avoid saturating network
    // and support concurrency of HEAD checks.
    const concurrency = 8;
    const tasks = [];

    for (const product of products) {
      const { sku, title, category = '', listingType = '', images = [] } = product;
      images.forEach((url, idx) => {
        const label = getImageLabel(idx);
        tasks.push({ sku, title, category, listingType, url, label });
      });
    }

    let idx = 0;
    async function worker() {
      while (idx < tasks.length) {
        const task = tasks[idx++];
        const { sku, title, category, listingType, url, label } = task;
        // slight stagger
        await new Promise(r => setTimeout(r, 20));
        let exists = false;
        try {
          const headRes = await checkImageExistsHead(url);
          if (headRes === true) exists = true;
          else if (headRes === false) exists = false;
          else {
            // fallback
            exists = await checkImageExistsImg(url);
          }
        } catch (err) {
          exists = false;
        }

        checked++;
        if (missingProgressBar) missingProgressBar.value = Math.round((checked / totalImages) * 100);
        missingProgressText.textContent = `Checked ${checked} of ${totalImages} images...`;

        if (!exists) {
          if (!missingMap.has(sku)) {
            missingMap.set(sku, { sku, title, category, listingType, labels: [], urls: [] });
          }
          const rec = missingMap.get(sku);
          rec.labels.push(label);
          rec.urls.push(url);
        }
      }
    }

    // spawn workers
    const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, worker);
    await Promise.all(workers);

    missingLoadingOverlay.classList.add('hidden');

    if (missingMap.size === 0) {
      alert('✅ No missing images found!');
      return;
    }

    // Build CSV
    const csvHeader = 'sku,title,category,listingType,missingImageLabels,missingImageURLs\n';
    const rows = Array.from(missingMap.values()).map(item => {
      const titleSafe = item.title.replace(/"/g, '""');
      const labels = item.labels.join('|');
      const urls = item.urls.join(' ');
      return `${item.sku},"${titleSafe}",${item.category},${item.listingType},"${labels}","${urls}"`;
    });
    const csvContent = csvHeader + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'missing_images_report.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /* ===========================
     Event wiring
     =========================== */

  // Debounced search
  const debouncedRender = debounce(() => renderProducts(), SEARCH_DEBOUNCE_MS);
  searchBar.addEventListener('input', debouncedRender);
  categoryFilter.addEventListener('change', () => {
    renderProducts();
    // auto-close mobile control group if present
    controlGroup?.classList.remove('show');
  });
  listingTypeFilter.addEventListener('change', () => {
    renderProducts();
    controlGroup?.classList.remove('show');
  });

  // Mobile menu toggle
  menuToggle?.addEventListener('click', () => controlGroup?.classList.toggle('show'));

  // Zip popup wiring
  downloadZipBtn?.addEventListener('click', () => {
    showZipPopup();
  });

  zipPopupCloseBtn?.addEventListener('click', hideZipPopup);
  zipSearchInput?.addEventListener('input', debounce(zipSearchHandler, 120));
  zipDownloadConfirmBtn?.addEventListener('click', async () => {
    hideZipPopup();
    if (selectedZipProduct) {
      await generateZipForProduct(selectedZipProduct);
      selectedZipProduct = null;
    }
  });

  // Missing images
  downloadMissingBtn?.addEventListener('click', async () => {
    try {
      await generateMissingImagesCSV();
    } catch (err) {
      console.error(err);
      alert('❌ Error while checking images. See console.');
    }
  });

  /* ===========================
     Small UX: Close popup when clicking outside
     =========================== */
  document.addEventListener('click', (evt) => {
    if (!zipPopup) return;
    if (!zipPopup.classList.contains('hidden')) {
      if (!zipPopup.contains(evt.target) && evt.target !== downloadZipBtn) {
        hideZipPopup();
      }
    }
  });

  /* ===========================
     Initialization
     =========================== */

  await loadProducts();

  // pre-load asin map in background
  loadAsinMap().catch(() => null);

})();
