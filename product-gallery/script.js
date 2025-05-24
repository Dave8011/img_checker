// Main script.js
import { renderProducts, setupLightbox } from './utils.js';

// Fetch product data and initialize the UI
fetch('products.json')
  .then(res => res.json())
  .then(data => {
    const gallery = document.getElementById('gallery');
    const searchBar = document.getElementById('searchBar');
    const categoryFilter = document.getElementById('categoryFilter');
    const compareBtn = document.getElementById('comparePageBtn');

    // Fill category dropdown
    const categories = [...new Set(data.map(p => p.category).filter(Boolean))];
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categoryFilter.appendChild(opt);
    });

    // Initial rendering of all products
    renderProducts(data, '', '', gallery);

    // Search/filter listeners
    searchBar.addEventListener('input', () => {
      renderProducts(data, searchBar.value, categoryFilter.value, gallery);
    });
    categoryFilter.addEventListener('change', () => {
      renderProducts(data, searchBar.value, categoryFilter.value, gallery);
    });

    setupLightbox();

    compareBtn.addEventListener('click', () => {
      window.location.href = 'compare.html';
    });
  });
