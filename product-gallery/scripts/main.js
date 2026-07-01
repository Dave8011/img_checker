/* ===========================
   Fetch Product Data
   =========================== */
Promise.all([
  fetch(`products.json?t=${Date.now()}`).then(res => res.json()),
  fetch(`videos.json?t=${Date.now()}`).then(res => res.json().catch(() => []))
])
  .then(([productData, videosData]) => {
    // Create a mapping of SKU -> video URL
    const videoMap = {};
    const videoProductNames = [];
    if (Array.isArray(videosData)) {
      videosData.forEach(v => {
        if (v.SKU && v.video) {
          videoMap[v.SKU] = v.video;
        }
        
        const bulkSku = v["Bulk SKU"] || (v.SKU ? v.SKU.split('-')[0] : "");
        const prodName = v["Product Name"];
        
        if (prodName && v.video) {
          if (!videoProductNames.some(item => item.name === prodName && item.bulkSku === bulkSku)) {
            videoProductNames.push({ 
              name: prodName, 
              bulkSku: bulkSku, 
              video: v.video,
              skus: [v.SKU]
            });
          } else {
            const existing = videoProductNames.find(item => item.name === prodName && item.bulkSku === bulkSku);
            if (existing && v.SKU && !existing.skus.includes(v.SKU)) {
              existing.skus.push(v.SKU);
            }
          }
        }
      });
      videoProductNames.sort((a, b) => {
        const bulkCompare = a.bulkSku.localeCompare(b.bulkSku);
        if (bulkCompare !== 0) return bulkCompare;
        return a.name.localeCompare(b.name);
      });
    }

    // Normalize product keys (fix PackagingType → packagingType)
    let data = productData.map(p => {
      const normalized = {
        ...p,
        packagingType: p.packagingType || p.PackagingType || "",
        brand: p.brandName || p.BrandName || p.brand || p.Brand || ""
      };
      
      if (videoMap[p.sku]) {
        if (!normalized.images) normalized.images = [];
        normalized.images.push(videoMap[p.sku]);
      }
      
      return normalized;
    });
    window.productData = data;

    /* ===========================
       State & DOM References
       =========================== */
    let currentImages = [];
    let currentIndex = 0;
    
    // Pagination state
    let displayLimit = 40;
    let currentFiltered = [];


    const gallery = document.getElementById('gallery');
    const searchBar = document.getElementById('searchBar');
    const categoryFilter = document.getElementById('categoryFilter');
    const brandFilter = document.getElementById('brandFilter');
    const listingTypeFilter = document.getElementById('listingTypeFilter');
    const packagingTypeFilter = document.getElementById('packagingTypeFilter');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxVideo = document.getElementById('lightbox-video');
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
      const filtered = data.filter(p =>
        (p.title.toLowerCase().includes(filter.toLowerCase()) ||
          p.sku.toLowerCase().includes(filter.toLowerCase()) ||
          (p.asin && p.asin.toLowerCase().includes(filter.toLowerCase()))) &&
        (category === '' || p.category === category) &&
        (brand === '' || p.brand === brand) &&
        (listingType === '' || p.listingType === listingType) &&
        (packagingType === '' || p.packagingType === packagingType)
      );

      currentFiltered = filtered;
      displayLimit = 40; // reset limit on new filter
      renderGalleryContent();
    }
    
    function renderGalleryContent() {
      gallery.innerHTML = '';
      const filtered = currentFiltered;

      if (filtered.length === 0) {
        emptyState.innerHTML = `<img src="https://cdn.jsdelivr.net/gh/edent/SuperTinyIcons/images/svg/emoji-sad.svg" width="120" style="margin-bottom:20px;opacity:.7;" />
          <div style="font-size:1.4rem;color:#888;">No products found. Try adjusting your filter or search terms!</div>`;
        emptyState.style.display = 'block';
        return;
      } else {
        emptyState.style.display = 'none';
      }

      const limitedFiltered = filtered.slice(0, displayLimit);

      const htmlBlocks = limitedFiltered.map(product => {
        const safeCategory = escapeHTML(product.category || '');
        const safeListingType = escapeHTML(product.listingType || '');
        const safePackagingType = escapeHTML(product.packagingType || '');
        
        const copySvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" /></svg>`;

        return `
          <div class="product">
            <div class="tag-row">
              ${product.category ? `
                <button
                  type="button"
                  class="category-tag${categoryFilter.value === product.category ? ' is-active' : ''}"
                  data-filter-type="category"
                  data-filter-value="${safeCategory}"
                  title="Show all products in ${safeCategory}"
                >${safeCategory}</button>` : ''}
              ${product.listingType ? `
                <button
                  type="button"
                  class="listing-type-tag${listingTypeFilter.value === product.listingType ? ' is-active' : ''}"
                  data-filter-type="listingType"
                  data-filter-value="${safeListingType}"
                  title="Show all products with listing type ${safeListingType}"
                >${safeListingType}</button>` : ''}
              ${product.packagingType ? `
                <button
                  type="button"
                  class="packaging-type-tag${packagingTypeFilter.value === product.packagingType ? ' is-active' : ''}"
                  data-filter-type="packagingType"
                  data-filter-value="${safePackagingType}"
                  title="Show all products with packaging type ${safePackagingType}"
                >${safePackagingType}</button>` : ''}
            </div>
            <h2>
              ${product.title} 
              (<code>${product.sku}</code>
              <button class="copy-btn" data-copy="${product.sku}" title="Copy SKU">${copySvg}</button>)
              - 
              ${product.asin ? product.asin.split(',').map(a => `<a href="https://amazon.in/dp/${a.trim()}" target="_blank" style="text-decoration: none; color: var(--accent);">${a.trim()}</a><button class="copy-btn" data-copy="${a.trim()}" title="Copy ASIN">${copySvg}</button>`).join(', ') : 'No ASIN'}
            </h2>
            <div class="images">
              ${product.images.map((url, i) => {
                const isVideo = url.toLowerCase().endsWith('.mp4');
                const label = getImageLabel(url, i);
                if (isVideo) {
                  return `
                    <div class="image-wrapper video-thumb" tabindex="0">
                      <video src="${url}" poster="${product.images[0]}" preload="none" muted playsinline data-full="${url}" style="width: 100%; height: 110px; object-fit: contain; border-radius: var(--radius-sm); border: 1px solid var(--border);"></video>
                      <span class="image-number">${label}</span>
                      <button class="copy-btn" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.7); padding: 4px; border-radius: 4px; color: white; border: none; cursor: pointer;" title="Download Video" onclick="forceDownload('${url}', event)">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                      </button>
                    </div>`;
                } else {
                  return `
                    <div class="image-wrapper" tabindex="0">
                      <img src="${url}" data-full="${url}" loading="lazy" />
                      <span class="image-number">${label}</span>
                    </div>`;
                }
              }).join('')}
            </div>
          </div>
        `;
      });
      
      gallery.insertAdjacentHTML('beforeend', htmlBlocks.join(''));
      
      const oldObserver = document.getElementById('scroll-observer');
      if (oldObserver) oldObserver.remove();

      if (filtered.length > displayLimit) {
        const observerDiv = document.createElement('div');
        observerDiv.id = 'scroll-observer';
        observerDiv.style.height = '20px';
        observerDiv.style.marginTop = '20px';
        observerDiv.style.width = '100%';
        
        gallery.parentElement.appendChild(observerDiv);

        const observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            const nextStart = displayLimit;
            displayLimit += 40;
            observer.disconnect();
            renderGalleryContentAppended(filtered, nextStart);
          }
        }, { rootMargin: '200px' });
        
        observer.observe(observerDiv);
      }
    }

    function renderGalleryContentAppended(filtered, startIndex) {
        const limitedFiltered = filtered.slice(startIndex, displayLimit);
        
        const htmlBlocks = limitedFiltered.map(product => {
        const safeCategory = escapeHTML(product.category || '');
        const safeListingType = escapeHTML(product.listingType || '');
        const safePackagingType = escapeHTML(product.packagingType || '');
        
        const copySvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" /></svg>`;

        return `
          <div class="product">
            <div class="tag-row">
              ${product.category ? `
                <button
                  type="button"
                  class="category-tag${categoryFilter.value === product.category ? ' is-active' : ''}"
                  data-filter-type="category"
                  data-filter-value="${safeCategory}"
                  title="Show all products in ${safeCategory}"
                >${safeCategory}</button>` : ''}
              ${product.listingType ? `
                <button
                  type="button"
                  class="listing-type-tag${listingTypeFilter.value === product.listingType ? ' is-active' : ''}"
                  data-filter-type="listingType"
                  data-filter-value="${safeListingType}"
                  title="Show all products with listing type ${safeListingType}"
                >${safeListingType}</button>` : ''}
              ${product.packagingType ? `
                <button
                  type="button"
                  class="packaging-type-tag${packagingTypeFilter.value === product.packagingType ? ' is-active' : ''}"
                  data-filter-type="packagingType"
                  data-filter-value="${safePackagingType}"
                  title="Show all products with packaging type ${safePackagingType}"
                >${safePackagingType}</button>` : ''}
            </div>
            <h2>
              ${product.title} 
              (<code>${product.sku}</code>
              <button class="copy-btn" data-copy="${product.sku}" title="Copy SKU">${copySvg}</button>)
              - 
              ${product.asin ? product.asin.split(',').map(a => `<a href="https://amazon.in/dp/${a.trim()}" target="_blank" style="text-decoration: none; color: var(--accent);">${a.trim()}</a><button class="copy-btn" data-copy="${a.trim()}" title="Copy ASIN">${copySvg}</button>`).join(', ') : 'No ASIN'}
            </h2>
            <div class="images">
              ${product.images.map((url, i) => {
                const isVideo = url.toLowerCase().endsWith('.mp4');
                const label = getImageLabel(url, i);
                if (isVideo) {
                  return `
                    <div class="image-wrapper video-thumb" tabindex="0">
                      <video src="${url}" poster="${product.images[0]}" preload="none" muted playsinline data-full="${url}" style="width: 100%; height: 110px; object-fit: contain; border-radius: var(--radius-sm); border: 1px solid var(--border);"></video>
                      <span class="image-number">${label}</span>
                      <button class="copy-btn" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.7); padding: 4px; border-radius: 4px; color: white; border: none; cursor: pointer;" title="Download Video" onclick="forceDownload('${url}', event)">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                      </button>
                    </div>`;
                } else {
                  return `
                    <div class="image-wrapper" tabindex="0">
                      <img src="${url}" data-full="${url}" loading="lazy" />
                      <span class="image-number">${label}</span>
                    </div>`;
                }
              }).join('')}
            </div>
          </div>
        `;
      });
      
      gallery.insertAdjacentHTML('beforeend', htmlBlocks.join(''));
      
      const oldObserver = document.getElementById('scroll-observer');
      if (oldObserver) oldObserver.remove();

      if (filtered.length > displayLimit) {
        const observerDiv = document.createElement('div');
        observerDiv.id = 'scroll-observer';
        observerDiv.style.height = '20px';
        observerDiv.style.marginTop = '20px';
        observerDiv.style.width = '100%';
        
        gallery.parentElement.appendChild(observerDiv);

        const observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            const nextStart = displayLimit;
            displayLimit += 40;
            observer.disconnect();
            renderGalleryContentAppended(filtered, nextStart);
          }
        }, { rootMargin: '200px' });
        
        observer.observe(observerDiv);
      }
    }

    gallery.addEventListener('click', event => {
      const copyBtn = event.target.closest('.copy-btn');
      if (copyBtn) {
        const textToCopy = copyBtn.dataset.copy;
        navigator.clipboard.writeText(textToCopy).then(() => {
          const originalHTML = copyBtn.innerHTML;
          copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="color: var(--green);"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>`;
          setTimeout(() => copyBtn.innerHTML = originalHTML, 1500);
        });
        return;
      }

      const imageWrapper = event.target.closest('.image-wrapper');
      if (imageWrapper) {
        const productDiv = imageWrapper.closest('.product');
        // Select both imgs and videos
        const mediaElements = Array.from(productDiv.querySelectorAll('img, video'));
        currentImages = mediaElements.map(el => el.dataset.full);
        const clickedMedia = imageWrapper.querySelector('img, video');
        currentIndex = currentImages.indexOf(clickedMedia.dataset.full);
        updateLightboxMedia();
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
    function updateLightboxMedia() {
      const url = currentImages[currentIndex];
      if (url.toLowerCase().endsWith('.mp4')) {
        lightboxImg.classList.add('hidden');
        lightboxImg.src = '';
        lightboxVideo.src = url;
        lightboxVideo.classList.remove('hidden');
        lightboxVideo.play().catch(e => console.warn('Autoplay prevented', e));
      } else {
        lightboxVideo.classList.add('hidden');
        lightboxVideo.pause();
        lightboxVideo.src = '';
        lightboxImg.src = url;
        lightboxImg.classList.remove('hidden');
      }
    }

    lightboxClose.onclick = () => { lightbox.classList.add('hidden'); lightboxVideo.pause(); lightboxVideo.src = ''; lightboxImg.src = ''; };
    window.addEventListener('keydown', e => {
      if (lightbox.classList.contains('hidden')) return;
      if (e.key === 'ArrowRight') currentIndex = Math.min(currentIndex + 1, currentImages.length - 1);
      if (e.key === 'ArrowLeft') currentIndex = Math.max(currentIndex - 1, 0);
      if (e.key === 'Escape') { lightbox.classList.add('hidden'); lightboxVideo.pause(); lightboxVideo.src = ''; lightboxImg.src = ''; }
      updateLightboxMedia();
    });

    
    /* ===========================
       Dropdown Logic
       =========================== */
    const exportDropdown = document.getElementById('exportDropdown');
    const exportToggleBtn = document.getElementById('exportToggleBtn');
    const videosDropdown = document.getElementById('videosDropdown');
    
    if (exportToggleBtn) {
      exportToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        exportDropdown.classList.toggle('open');
        if (videosDropdown && videosDropdown.classList.contains('open')) {
          videosDropdown.classList.remove('open');
        }
      });
      
      document.addEventListener('click', (e) => {
        if (exportDropdown && !exportDropdown.contains(e.target)) {
          exportDropdown.classList.remove('open');
        }
      });
    }

    /* ===========================
       Videos Dropdown Logic
       =========================== */
    const videosToggleBtn = document.getElementById('videosToggleBtn');
    const videoSearchInput = document.getElementById('videoSearchInput');
    const videoListContainer = document.getElementById('videoListContainer');

    if (videosToggleBtn) {
      videosToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        videosDropdown.classList.toggle('open');
        if (exportDropdown && exportDropdown.classList.contains('open')) {
          exportDropdown.classList.remove('open');
        }
      });
      
      document.addEventListener('click', (e) => {
        if (videosDropdown && !videosDropdown.contains(e.target)) {
          videosDropdown.classList.remove('open');
        }
      });

      function renderVideoList(query = '') {
        if (!videoListContainer) return;
        videoListContainer.innerHTML = '';
        const lowerQuery = query.toLowerCase();
        
        const filtered = videoProductNames.filter(item => {
          const matchName = item.name.toLowerCase().includes(lowerQuery);
          const matchBulkSku = item.bulkSku.toLowerCase().includes(lowerQuery);
          const matchSku = item.skus.some(s => s && s.toLowerCase().includes(lowerQuery));
          return matchName || matchBulkSku || matchSku;
        });
        
        if (filtered.length === 0) {
          videoListContainer.innerHTML = '<div style="padding: 8px; color: #888; font-size: 0.9em; text-align: center;">No videos found.</div>';
          return;
        }

        filtered.forEach(item => {
          const btn = document.createElement('button');
          btn.style.cssText = 'width: 100%; text-align: left; padding: 8px; border: none; background: transparent; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 8px; color: inherit; font-size: 0.95em; transition: background 0.2s;';
          
          const displayText = item.bulkSku ? `${item.bulkSku} - ${item.name}` : item.name;

          btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;height:16px;flex-shrink:0;"><path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${displayText}">${displayText}</span>
          `;
          
          btn.onmouseover = () => btn.style.background = 'rgba(0,0,0,0.05)';
          btn.onmouseout = () => btn.style.background = 'transparent';
          
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentImages = [item.video];
            currentIndex = 0;
            updateLightboxMedia();
            lightbox.classList.remove('hidden');
            videosDropdown.classList.remove('open');
          });
          
          videoListContainer.appendChild(btn);
        });
      }

      renderVideoList();

      if (videoSearchInput) {
        videoSearchInput.addEventListener('input', (e) => {
          renderVideoList(e.target.value);
        });
        videoSearchInput.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }
    }

    
    /* ===========================
       Force Download Helper
       =========================== */
    function forceDownload(url, e) {
      e.preventDefault();
      e.stopPropagation();
      
      // Since the CDN does not have CORS enabled, fetching as Blob will fail cross-origin.
      // We must open it in a new tab. We show an alert first so the user understands why.
      alert("Server security prevents direct downloads. The video will now open in a new tab.\n\nTo save it: Click the three dots (⋮) in the video player and select 'Download'.");
      
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    /* ===========================
       Helpers
       =========================== */
    function getImageLabel(url, i) {
      if (url.toLowerCase().endsWith('.mp4')) return 'VIDEO';
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

      const images = productEl.querySelectorAll('img, video');
      const total = images.length;
      let completed = 0;

      const downloadPromises = Array.from(images).map((img, index) => {
        const imgURL = img.src || img.dataset.full;
        const label = getImageLabel(imgURL, index);
        const ext = imgURL.toLowerCase().endsWith('.mp4') ? 'mp4' : 'jpg';

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
            zip.file(`${filePrefix}.${label}.${ext}`, blob);
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
            const ext = imgUrl.toLowerCase().endsWith('.mp4') ? 'mp4' : 'jpg';
            allItems.push({
              url: imgUrl,
              filename: `${prefix}.${getImageLabel(imgUrl, idx)}.${ext}`
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
        const label = i === 0 ? 'MAIN' : `PT${String(i).padStart(2, '0')}`;
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
            const label = getImageLabel(imgUrl, idx);
            if (label === targetLabel) {
              const ext = imgUrl.toLowerCase().endsWith('.mp4') ? 'mp4' : 'jpg';
              allItems.push({
                url: imgUrl,
                filename: `${prefix}.${label}.${ext}`
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
