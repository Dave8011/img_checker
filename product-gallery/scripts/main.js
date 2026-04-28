/* ===========================
   Fetch Product Data
   =========================== */
fetch(`../products.json?t=${Date.now()}`)
  .then(res => res.json())
  .then(data => {
    // Normalize product keys (fix PackagingType → packagingType)
    data = data.map(p => ({
      ...p,
      packagingType: p.packagingType || p.PackagingType || "",
      brand: p.brandName || p.BrandName || p.brand || p.Brand || ""
    }));
    window.productData = data;

    /* ===========================
       State & DOM References
       =========================== */
    let currentImages = [];
    let currentIndex = 0;

    const gallery = document.getElementById('gallery');
    const searchBar = document.getElementById('searchBar');
    const categoryFilter = document.getElementById('categoryFilter');
    const brandFilter = document.getElementById('brandFilter');
    const listingTypeFilter = document.getElementById('listingTypeFilter');
    const packagingTypeFilter = document.getElementById('packagingTypeFilter');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');
    const emptyState = document.getElementById('emptyState');

    /* ===========================
       Populate Filters
       =========================== */
    const brands = [...new Set(data.map(p => p.brand).filter(Boolean))];
    brands.forEach(brand => {
      const opt = document.createElement('option');
      opt.value = brand;
      opt.textContent = brand;
      brandFilter.appendChild(opt);
    });

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

    const packagingTypes = [...new Set(data.map(p => p.packagingType).filter(Boolean))];
    packagingTypes.forEach(type => {
      const opt = document.createElement('option');
      opt.value = type;
      opt.textContent = type;
      packagingTypeFilter.appendChild(opt);
    });

    /* ===========================
       Render Product Gallery
       =========================== */
    function renderProducts(filter = '', category = '', listingType = '', packagingType = '', brand = '') {
      gallery.innerHTML = '';

      const filtered = data.filter(p =>
        (p.title.toLowerCase().includes(filter.toLowerCase()) ||
          p.sku.toLowerCase().includes(filter.toLowerCase()) ||
          (p.asin && p.asin.toLowerCase().includes(filter.toLowerCase()))) &&
        (category === '' || p.category === category) &&
        (brand === '' || p.brand === brand) &&
        (listingType === '' || p.listingType === listingType) &&
        (packagingType === '' || p.packagingType === packagingType)
      );

      if (filtered.length === 0) {
        emptyState.innerHTML = `<img src="https://cdn.jsdelivr.net/gh/edent/SuperTinyIcons/images/svg/emoji-sad.svg" width="120" style="margin-bottom:20px;opacity:.7;" />
          <div style="font-size:1.4rem;color:#888;">No products found. Try adjusting your filter or search terms!</div>`;
        emptyState.style.display = 'block';
        return;
      } else {
        emptyState.style.display = 'none';
      }

      const limitedFiltered = filtered.slice(0, 100);

      const htmlBlocks = limitedFiltered.map(product => {
        const safeCategory = escapeHTML(product.category || '');
        const safeListingType = escapeHTML(product.listingType || '');
        const safePackagingType = escapeHTML(product.packagingType || '');

        return `
          <div class="product">
            <div class="tag-row">
              ${product.category ? `
                <button
                  type="button"
                  class="category-tag${category === product.category ? ' is-active' : ''}"
                  data-filter-type="category"
                  data-filter-value="${safeCategory}"
                  aria-pressed="${category === product.category ? 'true' : 'false'}"
                  title="Show all products in ${safeCategory}"
                >${safeCategory}</button>` : ''}
              ${product.listingType ? `
                <button
                  type="button"
                  class="listing-type-tag${listingType === product.listingType ? ' is-active' : ''}"
                  data-filter-type="listingType"
                  data-filter-value="${safeListingType}"
                  aria-pressed="${listingType === product.listingType ? 'true' : 'false'}"
                  title="Show all products with listing type ${safeListingType}"
                >${safeListingType}</button>` : ''}
              ${product.packagingType ? `
                <button
                  type="button"
                  class="packaging-type-tag${packagingType === product.packagingType ? ' is-active' : ''}"
                  data-filter-type="packagingType"
                  data-filter-value="${safePackagingType}"
                  aria-pressed="${packagingType === product.packagingType ? 'true' : 'false'}"
                  title="Show all products with packaging type ${safePackagingType}"
                >${safePackagingType}</button>` : ''}
            </div>
            <h2>${product.title} (<code>${product.sku}</code>) - ${product.asin ? product.asin.split(',').map(a => `<a href="https://amazon.in/dp/${a.trim()}" target="_blank" style="text-decoration: none; color: #204ea8;">${a.trim()}</a>`).join(', ') : 'No ASIN'}</h2>
            <div class="images">
              ${product.images.map((url, i) => `
                <div class="image-wrapper" tabindex="0">
                  <img src="${url}" data-full="${url}" loading="lazy" />
                  <span class="image-number">${getImageLabel(i)}</span>
                </div>`).join('')}
            </div>
          </div>
        `;
      });

      gallery.innerHTML = htmlBlocks.join('');

      if (filtered.length > 100) {
        const warning = document.createElement('div');
        warning.style.textAlign = 'center';
        warning.style.marginTop = '20px';
        warning.style.paddingBottom = '30px';
        warning.style.color = '#666';
        warning.style.fontSize = '0.9rem';
        warning.innerText = `Showing 100 of ${filtered.length} results to maintain performance. Please refine your filter to see more.`;
        gallery.appendChild(warning);
      }
    }

    gallery.addEventListener('click', event => {
      const imageWrapper = event.target.closest('.image-wrapper');
      if (imageWrapper) {
        const productDiv = imageWrapper.closest('.product');
        currentImages = Array.from(productDiv.querySelectorAll('img')).map(img => img.dataset.full);
        currentIndex = currentImages.indexOf(imageWrapper.querySelector('img').dataset.full);
        updateLightboxImage();
        lightbox.classList.remove('hidden');
        return;
      }

      const tagButton = event.target.closest('[data-filter-type]');
      if (!tagButton) return;

      const { filterType, filterValue } = tagButton.dataset;
      if (!filterType) return;

      const filterMap = {
        category: categoryFilter,
        listingType: listingTypeFilter,
        packagingType: packagingTypeFilter
      };

      const targetFilter = filterMap[filterType];
      if (!targetFilter) return;

      targetFilter.value = targetFilter.value === filterValue ? '' : filterValue;
      updateStateAndRender();
    });

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

    function escapeHTML(value) {
      return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char]));
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
          p.sku.toLowerCase().includes(query) || p.title.toLowerCase().includes(query) || (p.asin && p.asin.toLowerCase().includes(query))
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
        const namingFormat = document.getElementById('zipNamingFormat').value;
        popup.classList.add('hidden');
        if (selectedZipProduct) {
          generateZipForProduct(selectedZipProduct, namingFormat);
        }
      };
    }

    // ===========================
    // 🔧 Generate ZIP for selected product
    // ===========================
    async function generateZipForProduct(product, namingFormat = 'asin') {
      const zipLoading = document.getElementById('zipLoadingOverlay');
      const progressText = document.getElementById('zipProgressText');
      zipLoading.classList.remove('hidden');
      progressText.textContent = 'Initializing download...';

      const zip = new JSZip();

      // Determine file prefix based on naming format
      let filePrefix;
      if (namingFormat === 'sku') {
        filePrefix = product.sku.substring(0, 15);
      } else {
        // Load ASIN map
        const asinMap = await fetch('asin_map_zip.json').then(res => res.json());
        const asinEntry = asinMap.find(entry => entry.sku === product.sku);

        if (!asinEntry) {
          zipLoading.classList.add('hidden');
          alert(`❌ No ASIN found for SKU: ${product.sku}`);
          return;
        }
        filePrefix = asinEntry.asin;
      }

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
            zip.file(`${filePrefix}.${label}.jpg`, blob);
          } catch (e) {
            console.warn(`❌ Skipped: ${label} (timeout or error)`);
          }

          completed++;
          progressText.textContent = `📷 Processed ${completed} of ${total} images...`;
          resolve();
        });
      });


      await Promise.all(downloadPromises);
      progressText.textContent = '✅ All images processed. Generating ZIP...';

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filePrefix}_images.zip`;
      a.click();

      zipLoading.classList.add('hidden');
    }

    /* ===========================
       Missing Image CSV Logic (Grouped by Product)
       ⚡ Optimized: fetch HEAD + high concurrency
       =========================== */
    document.getElementById('downloadMissingBtn').addEventListener('click', async () => {
      const overlay = document.getElementById('missingLoadingOverlay');
      const progressText = document.getElementById('missingProgressText');
      overlay.classList.remove('hidden');
      progressText.textContent = '🔍 Checking image URLs...';

      const missingMap = new Map(); // Map SKU → { title, category, listingType, labels[] }
      const products = window.productData;
      let totalChecked = 0;
      const totalImages = products.reduce((sum, p) => sum + p.images.length, 0);
      const startTime = performance.now();

      // ✅ Accurate image check using fetch HEAD with a reliable fallback
      async function checkImageURL(url, timeoutLimit = 10000) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), timeoutLimit);
          const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
          clearTimeout(timeout);
          return res.ok;
        } catch (err) {
          // Fallback to Image() loading if fetch fails (e.g. CORS)
          return new Promise((resolve) => {
            const img = new Image();
            let done = false;

            const timer = setTimeout(() => {
              if (!done) { done = true; img.src = ''; resolve(false); }
            }, timeoutLimit);

            img.onload = () => {
              if (!done) { done = true; clearTimeout(timer); resolve(true); }
            };
            img.onerror = () => {
              if (!done) { done = true; clearTimeout(timer); resolve(false); }
            };

            img.src = url;
          });
        }
      }

      // ⚡ Single retry on failure
      async function checkWithRetry(url) {
        const exists = await checkImageURL(url);
        if (exists) return true;
        await new Promise(r => setTimeout(r, 200));
        return await checkImageURL(url);
      }

      function formatSeconds(sec) {
        if (!isFinite(sec) || sec <= 0) return '—';
        const rounded = Math.round(sec);
        const m = Math.floor(rounded / 60);
        const s = rounded % 60;
        return m ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`;
      }

      // ✅ Build a flat task list
      const tasks = [];
      for (const product of products) {
        const { sku, title, category = '', listingType = '', images } = product;
        images.forEach((url, index) => {
          tasks.push({ sku, title, category, listingType, url, label: getImageLabel(index) });
        });
      }

      // ⚡ High concurrency — up to 80 parallel image checks (since HEAD is lightweight)
      const CONCURRENCY = 80;
      let pointer = 0;

      let lastUpdateCount = 0;
      let lastUpdateTime = performance.now();
      let currentSpeed = 0;

      async function worker() {
        while (true) {
          const idx = pointer++;
          if (idx >= tasks.length) return;

          const task = tasks[idx];
          const exists = await checkWithRetry(task.url);

          totalChecked++;

          // Rolling ETA calculation
          const now = performance.now();
          const elapsedStep = (now - lastUpdateTime) / 1000;
          if (elapsedStep >= 0.5) {
            const stepSpeed = (totalChecked - lastUpdateCount) / elapsedStep;
            currentSpeed = currentSpeed === 0 ? stepSpeed : (currentSpeed * 0.8 + stepSpeed * 0.2);
            lastUpdateCount = totalChecked;
            lastUpdateTime = now;
          }

          const overallElapsed = (now - startTime) / 1000;
          const displaySpeed = currentSpeed > 0 ? currentSpeed : (totalChecked / overallElapsed);
          const remaining = displaySpeed > 0 ? (tasks.length - totalChecked) / displaySpeed : 0;

          progressText.textContent = `🖼️ ${totalChecked}/${totalImages} — ${Math.round(displaySpeed)} img/s — ETA ${formatSeconds(remaining)}`;

          if (!exists) {
            if (!missingMap.has(task.sku)) {
              missingMap.set(task.sku, {
                sku: task.sku,
                title: task.title,
                category: task.category,
                listingType: task.listingType,
                labels: []
              });
            }
            missingMap.get(task.sku).labels.push(task.label);
          }
        }
      }

      // Launch worker pool
      const workers = [];
      for (let i = 0; i < Math.min(CONCURRENCY, tasks.length); i++) {
        workers.push(worker());
      }
      await Promise.all(workers);

      const totalElapsed = ((performance.now() - startTime) / 1000).toFixed(1);
      overlay.classList.add('hidden');

      if (missingMap.size === 0) {
        alert(`✅ No missing images found! (${totalElapsed}s)`);
        return;
      }

      // 🧾 Generate CSV content
      const csvHeader = 'sku,title,category,listingType,missingImageLabels\n';
      const csvRows = Array.from(missingMap.values()).map(item =>
        `${item.sku},"${item.title.replace(/"/g, '""')}",${item.category},${item.listingType},"${item.labels.join(', ')}"`
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

      alert(`✅ Done! Found ${missingMap.size} products with missing images. (${totalElapsed}s)`);
    });
    /* ===================================================
       📦 ZIP ALL IMAGES — SEPARATE BUTTON (SAFE / INDEPENDENT)
       ASIN-based naming, multi-threaded, skip missing,
       1500 images per ZIP, uses existing overlay.
       =================================================== */

    document.getElementById("downloadZipAllBtn").addEventListener("click", () => {
      // Show naming format popup first
      const namingPopup = document.getElementById("zipAllNamingPopup");
      namingPopup.classList.remove("hidden");

      document.getElementById("zipAllNamingCloseBtn").onclick = () => {
        namingPopup.classList.add("hidden");
      };

      document.getElementById("zipAllNamingConfirmBtn").onclick = async () => {
        const namingFormat = document.getElementById("zipAllNamingFormat").value;
        namingPopup.classList.add("hidden");
        await runZipAll(namingFormat);
      };
    });

    async function runZipAll(namingFormat = 'asin') {
      const overlay = document.getElementById("zipLoadingOverlay");
      const progressText = document.getElementById("zipProgressText");

      try {
        overlay.classList.remove("hidden");

        let asinBySku = new Map();
        if (namingFormat === 'asin') {
          progressText.textContent = "Loading ASIN mappings...";
          const asinMap = await fetch("asin_map_zip.json").then(r => r.json());
          asinBySku = new Map(asinMap.map(e => [e.sku, e.asin]));
        } else {
          progressText.textContent = "Preparing SKU-based download...";
        }

        const products = window.productData || [];
        const allItems = [];

        // Build list based on naming format
        products.forEach(product => {
          let prefix;
          if (namingFormat === 'sku') {
            prefix = product.sku.substring(0, 15);
          } else {
            prefix = asinBySku.get(product.sku);
            if (!prefix) return;
          }

          product.images.forEach((imgUrl, idx) => {
            allItems.push({
              url: imgUrl,
              filename: `${prefix}.${getImageLabel(idx)}.jpg`
            });
          });
        });

        if (allItems.length === 0) {
          overlay.classList.add("hidden");
          alert("No images found.");
          return;
        }

        const CHUNK_SIZE = 1000;     // max per ZIP
        const CONCURRENCY = 12;      // multi-thread download

        // Safe fetch with timeout + auto skip
        async function fetchWithTimeout(url, timeout = 15000) {
          try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(id);
            if (!res.ok) throw new Error();
            return await res.blob();
          } catch {
            return null;
          }
        }

        function formatSeconds(sec) {
          if (!isFinite(sec) || sec <= 0) return "—";
          const rounded = Math.round(sec);
          const m = Math.floor(rounded / 60);
          const s = rounded % 60;
          return m ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`;
        }

        let zipNum = 1;

        // ============================
        // ZIP GENERATION in chunks
        // ============================
        for (let start = 0; start < allItems.length; start += CHUNK_SIZE) {
          const chunk = allItems.slice(start, start + CHUNK_SIZE);
          const total = chunk.length;
          let processed = 0;
          let skipped = 0;
          let pointer = 0;

          const zip = new JSZip();
          const startTime = performance.now();

          progressText.textContent = `Starting ZIP ${zipNum} (${total} images)...`;

          let lastUpdateCount = 0;
          let lastUpdateTime = performance.now();
          let currentSpeed = 0;

          // Worker thread
          async function worker() {
            while (true) {
              const idx = pointer++;
              if (idx >= chunk.length) return;

              const item = chunk[idx];
              const blob = await fetchWithTimeout(item.url);

              if (blob) zip.file(item.filename, blob);
              else skipped++;

              processed++;

              // Rolling ETA
              const now = performance.now();
              const elapsedStep = (now - lastUpdateTime) / 1000;
              if (elapsedStep >= 0.5) {
                const stepSpeed = (processed - lastUpdateCount) / elapsedStep;
                currentSpeed = currentSpeed === 0 ? stepSpeed : (currentSpeed * 0.8 + stepSpeed * 0.2);
                lastUpdateCount = processed;
                lastUpdateTime = now;
              }

              const overallElapsed = (now - startTime) / 1000;
              const displaySpeed = currentSpeed > 0 ? currentSpeed : (processed / overallElapsed);
              const eta = displaySpeed > 0 ? (total - processed) / displaySpeed : 0;

              progressText.textContent =
                `ZIP ${zipNum}: ${processed}/${total} — Skipped ${skipped} — ETA ${formatSeconds(eta)}`;
            }
          }

          // Launch worker pool
          const workers = [];
          const count = Math.min(CONCURRENCY, total);
          for (let i = 0; i < count; i++) workers.push(worker());
          await Promise.all(workers);

          progressText.textContent = `Generating ZIP ${zipNum}...`;

          const zipBlob = await zip.generateAsync({ type: "blob" }, meta => {
            progressText.textContent =
              `ZIP ${zipNum}: creating file ${Math.round(meta.percent)}%`;
          });

          // Download
          const url = URL.createObjectURL(zipBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `ALL_IMAGES_${zipNum}.zip`;
          a.click();

          setTimeout(() => URL.revokeObjectURL(url), 8000);

          progressText.textContent = `ZIP ${zipNum} ready.`;
          zipNum++;

          await new Promise(r => setTimeout(r, 300)); // cool down
        }

        overlay.classList.add("hidden");
        alert("🎉 All ZIPs created!");

      } catch (err) {
        console.error(err);
        overlay.classList.add("hidden");
        alert("❌ ZIP ALL failed. Check console.");
      }
    }

    /* ===========================
       📦 ZIP BY TYPE Logic
       =========================== */
    const typeZipPopup = document.getElementById('typeZipPopup');
    const typeSelect = document.getElementById('typeSelect');
    const typeZipConfirmBtn = document.getElementById('typeZipConfirmBtn');

    document.getElementById('downloadTypeBtn').addEventListener('click', () => {
      if (!window.productData) return;

      const maxImages = Math.max(...window.productData.map(p => p.images.length));
      typeSelect.innerHTML = '';

      for (let i = 0; i < maxImages; i++) {
        const label = getImageLabel(i);
        const opt = document.createElement('option');
        opt.value = label;
        opt.textContent = label;
        typeSelect.appendChild(opt);
      }

      typeZipPopup.classList.remove('hidden');
    });

    document.getElementById('typeZipPopupCloseBtn').onclick = () => {
      typeZipPopup.classList.add('hidden');
    };

    typeZipConfirmBtn.onclick = () => {
      const selectedType = typeSelect.value;
      const namingFormat = document.getElementById('typeZipNamingFormat').value;
      typeZipPopup.classList.add('hidden');
      if (selectedType) {
        downloadImagesByType(selectedType, namingFormat);
      }
    };

    async function downloadImagesByType(targetLabel, namingFormat = 'asin') {
      const overlay = document.getElementById("zipLoadingOverlay");
      const progressText = document.getElementById("zipProgressText");

      try {
        overlay.classList.remove("hidden");

        let asinBySku = new Map();
        if (namingFormat === 'asin') {
          progressText.textContent = "Loading ASIN mappings...";
          const asinMap = await fetch("asin_map_zip.json").then(r => r.json());
          asinBySku = new Map(asinMap.map(e => [e.sku, e.asin]));
        } else {
          progressText.textContent = "Preparing SKU-based download...";
        }

        const products = window.productData || [];
        const allItems = [];

        products.forEach(product => {
          let prefix;
          if (namingFormat === 'sku') {
            prefix = product.sku.substring(0, 15);
          } else {
            prefix = asinBySku.get(product.sku);
            if (!prefix) return;
          }

          product.images.forEach((imgUrl, idx) => {
            const label = getImageLabel(idx);
            if (label === targetLabel) {
              allItems.push({
                url: imgUrl,
                filename: `${prefix}.${label}.jpg`
              });
            }
          });
        });

        if (allItems.length === 0) {
          overlay.classList.add("hidden");
          alert(`No images found for type: ${targetLabel}`);
          return;
        }

        const CHUNK_SIZE = 1000;
        const CONCURRENCY = 12;

        async function fetchWithTimeout(url, timeout = 15000) {
          try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(id);
            if (!res.ok) throw new Error();
            return await res.blob();
          } catch {
            return null;
          }
        }

        function formatSeconds(sec) {
          if (!isFinite(sec) || sec <= 0) return "—";
          const rounded = Math.round(sec);
          const m = Math.floor(rounded / 60);
          const s = rounded % 60;
          return m ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`;
        }

        let zipNum = 1;

        for (let start = 0; start < allItems.length; start += CHUNK_SIZE) {
          const chunk = allItems.slice(start, start + CHUNK_SIZE);
          const total = chunk.length;
          let processed = 0;
          let skipped = 0;
          let pointer = 0;

          const zip = new JSZip();
          const startTime = performance.now();

          progressText.textContent = `Starting ZIP ${zipNum} (${total} images)...`;

          let lastUpdateCount = 0;
          let lastUpdateTime = performance.now();
          let currentSpeed = 0;

          async function worker() {
            while (true) {
              const idx = pointer++;
              if (idx >= chunk.length) return;

              const item = chunk[idx];
              const blob = await fetchWithTimeout(item.url);

              if (blob) zip.file(item.filename, blob);
              else skipped++;

              processed++;

              const now = performance.now();
              const elapsedStep = (now - lastUpdateTime) / 1000;
              if (elapsedStep >= 0.5) {
                const stepSpeed = (processed - lastUpdateCount) / elapsedStep;
                currentSpeed = currentSpeed === 0 ? stepSpeed : (currentSpeed * 0.8 + stepSpeed * 0.2);
                lastUpdateCount = processed;
                lastUpdateTime = now;
              }

              const overallElapsed = (now - startTime) / 1000;
              const displaySpeed = currentSpeed > 0 ? currentSpeed : (processed / overallElapsed);
              const eta = displaySpeed > 0 ? (total - processed) / displaySpeed : 0;

              progressText.textContent =
                `ZIP ${zipNum} (${targetLabel}): ${processed}/${total} — Skipped ${skipped} — ETA ${formatSeconds(eta)}`;
            }
          }

          const workers = [];
          const count = Math.min(CONCURRENCY, total);
          for (let i = 0; i < count; i++) workers.push(worker());
          await Promise.all(workers);

          progressText.textContent = `Generating ZIP ${zipNum}...`;

          const zipBlob = await zip.generateAsync({ type: "blob" }, meta => {
            progressText.textContent = `ZIP ${zipNum}: creating file ${Math.round(meta.percent)}%`;
          });

          const url = URL.createObjectURL(zipBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `ALL_${targetLabel}_IMAGES_${zipNum}.zip`;
          a.click();

          setTimeout(() => URL.revokeObjectURL(url), 8000);

          progressText.textContent = `ZIP ${zipNum} ready.`;
          zipNum++;
          await new Promise(r => setTimeout(r, 300));
        }

        overlay.classList.add("hidden");
        alert(`🎉 All ${targetLabel} images ZIPs created!`);

      } catch (err) {
        console.error(err);
        overlay.classList.add("hidden");
        alert("❌ ZIP failed. Check console.");
      }
    }

    /* ===========================
       🏢 BRAND ZIP Logic
       =========================== */
    const brandZipPopup = document.getElementById('brandZipPopup');
    const brandZipSelect = document.getElementById('brandZipSelect');
    const brandZipConfirmBtn = document.getElementById('brandZipConfirmBtn');

    document.getElementById('downloadBrandBtn').addEventListener('click', () => {
      if (!window.productData) return;

      const brands = [...new Set(window.productData.map(p => p.brand).filter(Boolean))];
      brandZipSelect.innerHTML = '';

      brands.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        opt.textContent = b;
        brandZipSelect.appendChild(opt);
      });

      brandZipPopup.classList.remove('hidden');
    });

    document.getElementById('brandZipPopupCloseBtn').onclick = () => {
      brandZipPopup.classList.add('hidden');
    };

    brandZipConfirmBtn.onclick = () => {
      const selectedBrand = brandZipSelect.value;
      const namingFormat = document.getElementById('brandZipNamingFormat').value;
      brandZipPopup.classList.add('hidden');
      if (selectedBrand) {
        downloadImagesByBrand(selectedBrand, namingFormat);
      }
    };

    async function downloadImagesByBrand(targetBrand, namingFormat = 'asin') {
      const overlay = document.getElementById("zipLoadingOverlay");
      const progressText = document.getElementById("zipProgressText");

      try {
        overlay.classList.remove("hidden");

        let asinBySku = new Map();
        if (namingFormat === 'asin') {
          progressText.textContent = "Loading ASIN mappings...";
          const asinMap = await fetch("asin_map_zip.json").then(r => r.json());
          asinBySku = new Map(asinMap.map(e => [e.sku, e.asin]));
        } else {
          progressText.textContent = "Preparing SKU-based download...";
        }

        const products = window.productData || [];
        const allItems = [];

        products.forEach(product => {
          if (product.brand !== targetBrand) return;

          let prefix;
          if (namingFormat === 'sku') {
            prefix = product.sku.substring(0, 15);
          } else {
            prefix = asinBySku.get(product.sku);
            if (!prefix) return;
          }

          product.images.forEach((imgUrl, idx) => {
            const label = getImageLabel(idx);
            allItems.push({
              url: imgUrl,
              filename: `${prefix}.${label}.jpg`
            });
          });
        });

        if (allItems.length === 0) {
          overlay.classList.add("hidden");
          alert(`No images found for brand: ${targetBrand}`);
          return;
        }

        const CHUNK_SIZE = 1000;
        const CONCURRENCY = 12;

        async function fetchWithTimeout(url, timeout = 15000) {
          try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(id);
            if (!res.ok) throw new Error();
            return await res.blob();
          } catch {
            return null;
          }
        }

        function formatSeconds(sec) {
          if (!isFinite(sec) || sec <= 0) return "—";
          const rounded = Math.round(sec);
          const m = Math.floor(rounded / 60);
          const s = rounded % 60;
          return m ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`;
        }

        let zipNum = 1;

        for (let start = 0; start < allItems.length; start += CHUNK_SIZE) {
          const chunk = allItems.slice(start, start + CHUNK_SIZE);
          const total = chunk.length;
          let processed = 0;
          let skipped = 0;
          let pointer = 0;

          const zip = new JSZip();
          const startTime = performance.now();

          progressText.textContent = `Starting ZIP ${zipNum} (${total} images)...`;

          let lastUpdateCount = 0;
          let lastUpdateTime = performance.now();
          let currentSpeed = 0;

          async function worker() {
            while (true) {
              const idx = pointer++;
              if (idx >= chunk.length) return;

              const item = chunk[idx];
              const blob = await fetchWithTimeout(item.url);

              if (blob) zip.file(item.filename, blob);
              else skipped++;

              processed++;

              const now = performance.now();
              const elapsedStep = (now - lastUpdateTime) / 1000;
              if (elapsedStep >= 0.5) {
                const stepSpeed = (processed - lastUpdateCount) / elapsedStep;
                currentSpeed = currentSpeed === 0 ? stepSpeed : (currentSpeed * 0.8 + stepSpeed * 0.2);
                lastUpdateCount = processed;
                lastUpdateTime = now;
              }

              const overallElapsed = (now - startTime) / 1000;
              const displaySpeed = currentSpeed > 0 ? currentSpeed : (processed / overallElapsed);
              const eta = displaySpeed > 0 ? (total - processed) / displaySpeed : 0;

              progressText.textContent =
                `ZIP ${zipNum} (${targetBrand.substring(0, 15)}...): ${processed}/${total} — Skipped ${skipped} — ETA ${formatSeconds(eta)}`;
            }
          }

          const workers = [];
          const count = Math.min(CONCURRENCY, total);
          for (let i = 0; i < count; i++) workers.push(worker());
          await Promise.all(workers);

          progressText.textContent = `Generating ZIP ${zipNum}...`;

          const zipBlob = await zip.generateAsync({ type: "blob" }, meta => {
            progressText.textContent = `ZIP ${zipNum}: creating file ${Math.round(meta.percent)}%`;
          });

          const url = URL.createObjectURL(zipBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${targetBrand.replace(/[^a-z0-9]/gi, '_')}_IMAGES_${zipNum}.zip`;
          a.click();

          setTimeout(() => URL.revokeObjectURL(url), 8000);

          progressText.textContent = `ZIP ${zipNum} ready.`;
          zipNum++;
          await new Promise(r => setTimeout(r, 300));
        }

        overlay.classList.add("hidden");
        alert(`🎉 All ${targetBrand} images ZIPs created!`);

      } catch (err) {
        console.error(err);
        overlay.classList.add("hidden");
        alert("❌ ZIP failed. Check console.");
      }
    }

    /* ===========================
      🔝 Back to Top Button
         =========================== */
    const backToTopBtn = document.getElementById("backToTop");
    // Show/hide when scrolling
    window.addEventListener("scroll", () => {
      if (window.scrollY > 300) {
        backToTopBtn.classList.add("show");
      } else {
        backToTopBtn.classList.remove("show");
      }
    });

    // Scroll smoothly to top
    backToTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    /* ===========================
       Search & Filters (With URL Sync)
       =========================== */
    function updateStateAndRender() {
      const filter = searchBar.value;
      const category = categoryFilter.value;
      const brand = brandFilter?.value || '';
      const listingType = listingTypeFilter.value;
      const packagingType = packagingTypeFilter.value;

      updateURLParams(filter, category, listingType, packagingType, brand);
      renderProducts(filter, category, listingType, packagingType, brand);
      updateClearFiltersVisibility(filter, category, listingType, packagingType, brand);
    }

    function updateClearFiltersVisibility(search = '', category = '', listingType = '', packagingType = '', brand = '') {
      const hasActiveFilters = [search, category, listingType, packagingType, brand].some(Boolean);
      clearFiltersBtn.hidden = !hasActiveFilters;
    }

    function clearAllFilters() {
      searchBar.value = '';
      categoryFilter.value = '';
      if (brandFilter) brandFilter.value = '';
      listingTypeFilter.value = '';
      packagingTypeFilter.value = '';
      updateStateAndRender();
    }

    let searchTimeout;
    searchBar.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(updateStateAndRender, 300);
    });
    categoryFilter.addEventListener('change', updateStateAndRender);
    if (brandFilter) brandFilter.addEventListener('change', updateStateAndRender);
    listingTypeFilter.addEventListener('change', updateStateAndRender);
    packagingTypeFilter.addEventListener('change', updateStateAndRender);
    clearFiltersBtn.addEventListener('click', clearAllFilters);

    /* ===========================
       URL Management Helpers
       =========================== */
    function updateURLParams(search, category, listingType, packagingType, brand) {
      const url = new URL(window.location);

      if (search) url.searchParams.set('search', search); else url.searchParams.delete('search');
      if (category) url.searchParams.set('category', category); else url.searchParams.delete('category');
      if (brand) url.searchParams.set('brand', brand); else url.searchParams.delete('brand');
      if (listingType) url.searchParams.set('listingType', listingType); else url.searchParams.delete('listingType');
      if (packagingType) url.searchParams.set('packagingType', packagingType); else url.searchParams.delete('packagingType');

      window.history.replaceState({}, '', url);
    }

    function applyURLParams() {
      const params = new URLSearchParams(window.location.search);
      const search = params.get('search') || '';
      const category = params.get('category') || '';
      const brand = params.get('brand') || '';
      const listingType = params.get('listingType') || '';
      const packagingType = params.get('packagingType') || '';

      // Set DOM elements
      searchBar.value = search;
      categoryFilter.value = category;
      if (brandFilter) brandFilter.value = brand;
      listingTypeFilter.value = listingType;
      packagingTypeFilter.value = packagingType;

      // Render with these initial values
      renderProducts(search, category, listingType, packagingType, brand);
      updateClearFiltersVisibility(search, category, listingType, packagingType, brand);
    }

    /* ===========================
       Mobile Menu Toggle
       =========================== */
    document.getElementById('menuToggle').addEventListener('click', () => {
      const toggle = document.getElementById('menuToggle');
      const group = document.getElementById('controlGroup');
      const isOpen = group.classList.toggle('show');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      toggle.textContent = isOpen ? '✕ Close' : '☰ Filters';
    });

    /* ===========================
       Initial Render
       =========================== */
    applyURLParams();
  });
