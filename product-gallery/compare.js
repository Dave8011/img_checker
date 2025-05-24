// compare.js

// Load compare list from localStorage
const compareList = JSON.parse(localStorage.getItem('compareList') || '[]');
const container = document.getElementById('comparison-container');

// If no products, show message
if (!compareList.length) {
  container.innerHTML = `<p class="placeholder-text">No products selected. Go back and add some to compare.</p>`;
} else {
  const table = document.createElement('table');
  table.className = 'compare-table';

  // Define which fields to compare
  const fields = ['title', 'sku', 'category', 'images'];

  // Create table header
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headRow.innerHTML = `<th>Property</th>` + compareList.map(p => `<th>${p.title}</th>`).join('');
  thead.appendChild(headRow);
  table.appendChild(thead);

  // Create table body
  const tbody = document.createElement('tbody');
  fields.forEach(field => {
    const row = document.createElement('tr');
    row.innerHTML = `<td><strong>${field.charAt(0).toUpperCase() + field.slice(1)}</strong></td>` +
      compareList.map(p => {
        if (field === 'images') {
          return `<td><img src="${p.images[0]}" width="80" /></td>`;
        } else {
          return `<td>${p[field]}</td>`;
        }
      }).join('');
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  container.appendChild(table);

  // Add Clear Button
  const clearBtn = document.createElement('button');
  clearBtn.textContent = '🧹 Clear Comparison';
  clearBtn.className = 'clear-compare';
  clearBtn.onclick = () => {
    localStorage.removeItem('compareList');
    location.reload();
  };
  container.appendChild(clearBtn);
}
