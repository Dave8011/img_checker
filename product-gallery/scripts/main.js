/* ===========================
   Product Gallery — main.js (fixed)
   Improvements / fixes applied:
   - Fixed syntax errors (variable names, typos)
   - Normalize PackagingType / packagingType keys (handle both casings)
   - Ensure product.images is always an array
   - Include packagingType in filters and renderProducts call
   - Fixed CSV generation (no duplicate var names, include packagingType)
   - Fixed event listener typos (addEventListener)
   - Safer DOM creation (no innerHTML with user data)
   - Keep existing concurrency & image check logic
   =========================== */

(async function () {
  // Load product data (with error handling)
  let data;
  try {
    const res = await fetch(`../products.json?t=${Date.now()}`);
    if (!res.ok) throw new Error(`Failed to fetch products.json (${res.status})`);
    data = await res.json();
    // ensure data is an array
    if (!Array.isArray(data)) throw new Error('products.json did not return an array');
    // normalize product fields a little
    data.forEach(p => {
      // normalize packagingType key casing: prefer lowercase property "packagingType", fallback to "PackagingType"
      if (!p.packagingType && p.PackagingType) {
        p.packagingType = String(p.PackagingType).trim();
      }
      // ensure images is an array
      if (!Array.isArray(p.images)) p.images = [];
    });
    window.productData = data;
  } catch (err) {
    console.error('Failed to load product data:', err);
    const emptyStateEl = document.getElementById('emptyState');
    if (emptyStateEl) {
      emptyStateEl.style.display = 'block';
      emptyStateEl.textContent = 'Failed to load product data. See console for details.';
    }
    return;
  }

  /* ===========================
     State & DOM References
     =========================== */
  let currentImages = [];
  let currentIndex = 0;

  const gallery = document.getElementById('gallery');
  const searchBar = document.getElementById('searchBar');
  const categoryFilter = document.getElementById('categoryFilter');
  const listingTypeFilter = document.getElementById('listingTypeFilter');
  const packagingTypeFilter = document.getElementById('packagingTypeFilter');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');
  const emptyState = document.getElementById('emptyState');

  /* ===========================
     Helpers
     =========================== */
  function getImageLabel(i) {
    return i === 0 ? 'MAIN' : `PT${String(i).padStart(2, '0')}`;
  }

  // Single, robust image existence check (uses Image()).
  // Returns true if image loads within timeout.
  function checkImageURL(url, timeout = 15000) {
    return new Promise((resolve) => {
      const img = new Image();
      let done = false;

      const timer = setTimeout(() => {
        if (!done) {
          done = true;
          resolve(false);
        }
      }, timeout);

      img.onload = () => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(true);
        }
      };

      img.onerror = () => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(false);
        }
      };

      // Start load
      // add cache-busting param to avoid stale CDN 500s being cached by browser checks in dev
      try {
        img.src = url;
      } catch (e) {
        clearTimeout(timer);
        resolve(false);
      }
    });
  }

  function fetchImageAsBlob(url) {
    return fetch(url, { mode: 'cors' }).then(res => {
      if (!res.ok) throw new Error('Fetch failed: ' + res.status);
      return res.blob();
    });
  }

  // Concurrency-limited runner for async tasks
  async function runWithConcurrency(items, worker, maxConcurrent = 10) {
    const results = [];
    const executing = new Set();

    for (const item of items) {
      const p = Promise.resolve().then(() => worker(item));
      results.push(p);
      executing.add(p);

      const remove = () => executing.delete(p);
      p.then(remove, remove);

      if (executing.size >= maxConcurrent) {
        await Promise.race(executing);
      }
    }
    return Promise.all(results);
  }

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

  const packagingTypes = [...new Set(data.map(p => (p.packagingType || '').toString().trim()).filter(Boolean))];
  packagingTypes.forEach(type => {
    const opt = document.createElement('option');
    opt.value = type;
    opt.textContent = type;
    packagingTypeFilter.appendChild(opt);
  });

  /* ===========================
     Render Product Gallery (safe DOM creation)
     =========================== */
  function renderProducts(filter = '', category = '', listingType = '', packagingType = '') {
    gallery.innerHTML = ''; // clear
    const frag = document.createDocumentFragment();

    const normalized = (filter || '').trim().toLowerCase();

    const filtered = data.filter(p => {
      const matchesFilter = !normalized ||
        (p.title && p.title.toLowerCase().includes(normalized)) ||
        (p.sku && p.sku.toLowerCase().includes(normalized));
      const matchesCategory = !category || p.category === category;
      const matchesListing = !listingType || p.listingType === listingType;
      const matchesPackaging = !packagingType || (p.packagingType || '').toString().trim() === packagingType;
      return matchesFilter && matchesCategory && matchesListing && matchesPackaging;
    });

    if (filtered.length === 0) {
      emptyState.innerHTML = '';
      // safe creation of empty state content
      const img = document.createElement('img');
      img.src = 'https://cdn.jsdelivr.net/gh/edent/SuperTinyIcons/images/svg/emoji-sad.svg';
      img.width = 120;
      img.style.marginBottom = '20px';
      img.style.opacity = '.7';
      img.alt = '';
      emptyState.appendChild(img);

      const msg = document.createElement('div');
      msg.style.fontSize = '1.4rem';
      msg.style.color = '#888';
      msg.textContent = 'No products found. Try adjusting your filter or search terms!';
      emptyState.appendChild(msg);

      emptyState.style.display = 'block';
      return;
    } else {
      emptyState.style.display = 'none';
      emptyState.innerHTML = '';
    }

    filtered.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product';

      // Tag row
      const tagRow = document.createElement('div');
      tagRow.className = 'tag-row';
      if (product.category) {
        const ctag = document.createElement('div');
        ctag.className = 'category-tag';
        ctag.textContent = product.category;
        tagRow.appendChild(ctag);
      }
      if (product.listingType) {
        const ltag = document.createElement('div');
        ltag.className = 'listing-type-tag';
        ltag.textContent = product.listingType;
        tagRow.appendChild(ltag);
      }
      if (product.packagingType) {
        const pt = document.createElement('div');
        pt.className = 'packaging-type-tag';
        pt.textContent = product.packagingType;
        tagRow.appendChild(pt);
      }
      card.appendChild(tagRow);

      // Title and SKU
      const h2 = document.createElement('h2');
      h2.textContent = product.title || 'Untitled';
      const code = document.createElement('code');
      code.textContent = ` (${product.sku || 'NO-SKU'})`;
      h2.appendChild(code);
      card.appendChild(h2);

      // Images container
      const imagesWrap = document.createElement('div');
      imagesWrap.className = 'images';

      const images = Array.isArray(product.images) ? product.images : [];
      images.forEach((url, i) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper';
        wrapper.tabIndex = 0;
        wrapper.setAttribute('role', 'button');
        wrapper.setAttribute('aria-label', `${product.title || product.sku} image ${getImageLabel(i)}`);

        const img = document.createElement('img');
        // Use dataset.full for the full-resolution URL, but src can point to the same by default.
        img.src = url || '';
        img.dataset.full = url || '';
        img.loading = 'lazy';
        img.alt = `${product.title || ''} — ${getImageLabel(i)}`;
        img.width = 200; // placeholder; prefer CSS sizing
        wrapper.appendChild(img);

        const label = document.createElement('span');
        label.className = 'image-number';
        label.textContent = getImageLabel(i);
        wrapper.appendChild(label);

        imagesWrap.appendChild(wrapper);
      });

      card.appendChild(imagesWrap);
      frag.appendChild(card);
    });

    gallery.appendChild(frag);
  }

  // Delegated click / keyboard handler for gallery (open lightbox)
  gallery.addEventListener('click', (e) => {
    const wrapper = e.target.closest('.image-wrapper');
    if (!wrapper) return;
    openLightboxForWrapper(wrapper);
  });

  gallery.addEventListener('keydown', (e) => {
    const wrapper = e.target.closest('.image-wrapper');
    if (!wrapper) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openLightboxForWrapper(wrapper);
    }
  });

  function openLightboxForWrapper(wrapper) {
    const productDiv = wrapper.closest('.product');
    currentImages = Array.from(productDiv.querySelectorAll('img')).map(img => img.dataset.full || img.src);
    const clickedImg = wrapper.querySelector('img');
    currentIndex = currentImages.indexOf(clickedImg.dataset.full || clickedImg.src);
    if (currentIndex === -1) currentIndex = 0;
    updateLightboxImage();
    // Show and manage focus
    lightbox.classList.remove('hidden');
    lightbox.setAttribute('aria-hidden', 'false');
    lightboxClose.focus();
  }

  function updateLightboxImage() {
    lightboxImg.src = currentImages[currentIndex] || '';
    lightboxImg.alt = `Image ${currentIndex + 1} of ${currentImages.length}`;
  }

  // Lightbox controls
  lightboxClose.addEventListener('click', () => {
    lightbox.classList.add('hidden');
    lightbox.setAttribute('aria-hidden', 'true');
  });

  window.addEventListener('keydown', (e) => {
    if (lightbox.classList.contains('hidden')) return;
    if (e.key === 'ArrowRight') {
      currentIndex = Math.min(currentIndex + 1, currentImages.length - 1);
      updateLightboxImage();
    } else if (e.key === 'ArrowLeft') {
      currentIndex = Math.max(currentIndex - 1, 0);
      updateLightboxImage();
    } else if (e.key === 'Escape') {
      lightbox.classList.add('hidden');
      lightbox.setAttribute('aria-hidden', 'true');
    }
  });

  /* ===========================
     ZIP Download Logic
     =========================== */
  const downloadZipBtn = document.getElementById('downloadZipBtn');
  if (downloadZipBtn) downloadZipBtn.addEventListener('click', showZipPopup);

  let selectedZipProduct = null;

  function showZipPopup() {
    const popup = document.getElementById('zipPopup');
    const searchInput = document.getElementById('zipSearchInput');
    const resultsDiv = document.getElementById('zipSearchResults');
    const confirmBtn = document.getElementById('zipDownloadConfirmBtn');

    if (!popup || !searchInput || !resultsDiv || !confirmBtn) return;

    popup.classList.remove('hidden');
    searchInput.value = '';
    resultsDiv.innerHTML = '';
    confirmBtn.disabled = true;
    selectedZipProduct = null;

    // Use one handler (replace previous) to avoid stacking
    searchInput.oninput = () => {
      const query = searchInput.value.trim().toLowerCase();
      resultsDiv.innerHTML = '';
      if (!query) return;

      const matches = window.productData.filter(p =>
        (p.sku && p.sku.toLowerCase().includes(query)) ||
        (p.title && p.title.toLowerCase().includes(query))
      ).slice(0, 20);

      matches.forEach(product => {
        const div = document.createElement('div');
        div.className = 'zip-result-item';
        div.textContent = `${product.title} (${product.sku})`;
        div.tabIndex = 0;
        div.onclick = () => {
          selectedZipProduct = product;
          confirmBtn.disabled = false;
          searchInput.value = div.textContent;
          resultsDiv.innerHTML = '';
        };
        div.onkeydown = (e) => {
          if (e.key === 'Enter') div.click();
        };
        resultsDiv.appendChild(div);
      });
    };

    const closeHandler = () => {
      popup.classList.add('hidden');
      searchInput.oninput = null;
    };
    document.getElementById('zipPopupCloseBtn').onclick = closeHandler;

    confirmBtn.onclick = async () => {
      popup.classList.add('hidden');
      searchInput.oninput = null;
      if (selectedZipProduct) {
        await generateZipForProduct(selectedZipProduct);
      }
    };
  }

  // Generate ZIP for product — safer and more robust
  async function generateZipForProduct(product) {
    const zipLoading = document.getElementById('zipLoadingOverlay');
    const progressText = document.getElementById('zipProgressText');
    if (zipLoading) zipLoading.classList.remove('hidden');
    if (progressText) progressText.textContent = 'Initializing download...';

    const zip = new JSZip();

    let asinMap;
    try {
      const res = await fetch('asin_map_zip.json');
      if (!res.ok) throw new Error('Failed to load asin_map_zip.json');
      asinMap = await res.json();
    } catch (err) {
      if (zipLoading) zipLoading.classList.add('hidden');
      alert(`❌ Failed to load ASIN map: ${err.message}`);
      return;
    }

    const asinEntry = asinMap.find(entry => entry.sku === product.sku);
    if (!asinEntry) {
      if (zipLoading) zipLoading.classList.add('hidden');
      alert(`❌ No ASIN found for SKU: ${product.sku}`);
      return;
    }
    const asin = asinEntry.asin;

    // Find the product element in DOM to get the current images shown
    const productEl = [...document.querySelectorAll('.product')].find(el =>
      el.querySelector('h2')?.innerText.includes(product.sku)
    );

    if (!productEl) {
      if (zipLoading) zipLoading.classList.add('hidden');
      alert('⚠️ Product not currently visible on screen. Please search or filter so it is visible and try again.');
      return;
    }

    const images = Array.from(productEl.querySelectorAll('img'));
    const total = images.length;
    let completed = 0;

    // Build tasks as functions so we can run them with runWithConcurrency
    const tasks = images.map((img, index) => async () => {
      const label = getImageLabel(index);
      const imgURL = img.dataset.full || img.src;
      try {
        // Wait for the image to be present/loaded (small check)
        if (!(img.complete && img.naturalWidth > 0)) {
          await Promise.race([checkImageURL(imgURL, 8000), new Promise((r) => setTimeout(r, 8000))]);
        }
        const blob = await fetchImageAsBlob(imgURL);
        // Use extension from blob type if possible
        const ext = (blob.type && blob.type.split('/')[1]) ? `.${blob.type.split('/')[1].split('+')[0]}` : '.jpg';
        zip.file(`${asin}.${label}${ext}`, blob);
      } catch (e) {
        console.warn(`Skipped ${label} (${imgURL}):`, e);
      } finally {
        completed++;
        if (progressText) progressText.textContent = `📷 Processed ${completed} of ${total} images...`;
      }
    });

    // Run with concurrency of 4 to be gentle on network
    await runWithConcurrency(tasks, t => t(), 4);

    if (progressText) progressText.textContent = '✅ All images processed. Generating ZIP...';
    try {
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${asin}_images.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to generate ZIP: ' + err.message);
    } finally {
      if (zipLoading) zipLoading.classList.add('hidden');
    }
  }

  /* ===========================
     Missing Image CSV Logic (Grouped by Product)
     =========================== */
  const downloadMissingBtn = document.getElementById('downloadMissingBtn');
  if (downloadMissingBtn) {
    downloadMissingBtn.addEventListener('click', async () => {
      const overlay = document.getElementById('missingLoadingOverlay');
      const progressText = document.getElementById('missingProgressText');
      if (overlay) overlay.classList.remove('hidden');
      if (progressText) progressText.textContent = '🔍 Checking image URLs...';

      const missingMap = new Map(); // Map SKU → { sku, title, category, listingType, packagingType, labels[] }
      const products = window.productData || [];
      let totalChecked = 0;
      const totalImages = products.reduce((sum, p) => sum + (Array.isArray(p.images) ? p.images.length : 0), 0);

      // Build a list of checks
      const checks = [];
      products.forEach(product => {
        const { sku, title, category = '', listingType = '', images = [] } = product;
        const packagingType = product.packagingType || '';
        images.forEach((url, index) => {
          const label = getImageLabel(index);
          checks.push({ sku, title, category, listingType, url, label, packagingType });
        });
      });

      // Worker for each check
      const worker = async (item) => {
        const exists = await checkImageURL(item.url, 12000);
        totalChecked++;
        if (progressText) progressText.textContent = `🖼️ Checked ${totalChecked} of ${totalImages} images...`;
        if (!exists) {
          if (!missingMap.has(item.sku)) {
            missingMap.set(item.sku, {
              sku: item.sku,
              title: item.title,
              category: item.category,
              listingType: item.listingType,
              packagingType: item.packagingType,
              labels: []
            });
          }
          missingMap.get(item.sku).labels.push(item.label);
        }
      };

      // Run checks with concurrency limit
      await runWithConcurrency(checks, worker, 10);

      if (overlay) overlay.classList.add('hidden');

      if (missingMap.size === 0) {
        alert("✅ No missing images found!");
        return;
      }

      // Generate CSV
      const csvHeader = 'sku,title,category,listingType,packagingType,missingImageLabels\n';
      const csvRows = Array.from(missingMap.values()).map(item => {
        const safeTitle = `"${(item.title || '').replace(/"/g, '""')}"`;
        const safeCategory = `"${(item.category || '').replace(/"/g, '""')}"`;
        const safeListing = `"${(item.listingType || '').replace(/"/g, '""')}"`;
        const safePackaging = `"${(item.packagingType || '').replace(/"/g, '""')}"`;
        const labels = `"${(item.labels || []).join(', ').replace(/"/g, '""')}"`;
        return `${item.sku},${safeTitle},${safeCategory},${safeListing},${safePackaging},${labels}`;
      });

      const csvContent = csvHeader + csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'missing_images_report.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  /* ===========================
     Search & Filters bindings
     =========================== */
  searchBar.addEventListener('input', () => renderProducts(searchBar.value, categoryFilter.value, listingTypeFilter.value, packagingTypeFilter.value));
  categoryFilter.addEventListener('change', () => renderProducts(searchBar.value, categoryFilter.value, listingTypeFilter.value, packagingTypeFilter.value));
  listingTypeFilter.addEventListener('change', () => renderProducts(searchBar.value, categoryFilter.value, listingTypeFilter.value, packagingTypeFilter.value));
  packagingTypeFilter.addEventListener('change', () => renderProducts(searchBar.value, categoryFilter.value, listingTypeFilter.value, packagingTypeFilter.value));

 /* ===========================
   🔝 Back to Top & 🔍 Search Toggle (Smooth)
   =========================== */
const backToTopBtn = document.getElementById("backToTop");
const openSearchBtn = document.getElementById("openSearch");
const controls = document.getElementById("controls");

let lastScrollY = 0;
let isHidden = false;

window.addEventListener("scroll", () => {
  const currentScroll = window.scrollY;
  const scrolled = currentScroll > 120;

  // Floating buttons
  backToTopBtn.classList.toggle("show", scrolled);
  openSearchBtn.classList.toggle("show", scrolled);

  // Floating mode only when scrolled
  controls.classList.toggle("floating", scrolled);

  // Hide bar when scrolling down, show when scrolling up
  if (currentScroll > lastScrollY && scrolled && !isHidden) {
    controls.classList.add("hide");
    isHidden = true;
  } else if ((currentScroll < lastScrollY || currentScroll < 100) && isHidden) {
    controls.classList.remove("hide");
    isHidden = false;
  }

  // Reset search icon at top
  if (currentScroll < 100) {
    openSearchBtn.textContent = "🔍";
  }

  lastScrollY = currentScroll;
});

// Back to top
backToTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// Toggle search manually
openSearchBtn.addEventListener("click", () => {
  isHidden = !isHidden;
  controls.classList.toggle("hide", isHidden);
  openSearchBtn.textContent = isHidden ? "🔍" : "❌";
});

  /* ===========================
     Mobile Menu Toggle
     =========================== */
  const menuToggle = document.getElementById('menuToggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      document.getElementById('controlGroup').classList.toggle('show');
    });
  }

  /* ===========================
     Initial Render
     =========================== */
  renderProducts();
})();
