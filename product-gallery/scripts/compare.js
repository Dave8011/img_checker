// scripts/compare.js

// Get SKUs from query string
const urlParams = new URLSearchParams(window.location.search);
const skuList = urlParams.get('skus')?.split(',') || [];

// Load product data
fetch('../products.json')
  .then(res => res.json())
  .then(data => {
    const tableContainer = document.getElementById('comparisonTable');
    const compareProducts = data.filter(p => skuList.includes(p.sku));

    if (compareProducts.length < 2) {
      tableContainer.innerHTML = '<p>❗ Not enough products selected for comparison.</p>';
      return;
    }

    const table = document.createElement('table');
    const headers = ['Title', 'SKU', 'Category', 'Images'];

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    headRow.appendChild(document.createElement('th')); // Empty corner

    compareProducts.forEach(p => {
      const th = document.createElement('th');
      th.textContent = p.title;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    headers.forEach(attr => {
      const row = document.createElement('tr');
      const labelCell = document.createElement('td');
      labelCell.textContent = attr;
      row.appendChild(labelCell);

      compareProducts.forEach(product => {
        const cell = document.createElement('td');
        if (attr === 'Images') {
          product.images.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            img.style.width = '50px';
            img.style.margin = '2px';
            cell.appendChild(img);
          });
        } else {
          cell.textContent = product[attr.toLowerCase()];
        }
        row.appendChild(cell);
      });

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    tableContainer.appendChild(table);
  });
