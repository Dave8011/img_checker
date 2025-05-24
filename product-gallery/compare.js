// compare.js
fetch('products.json')
  .then(res => res.json())
  .then(data => {
    const table = document.getElementById('comparison-table');

    // Get first 2 products to compare for demo
    const [p1, p2] = data.slice(0, 2);

    // Generate HTML table
    table.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Attribute</th>
            <th>${p1.title}</th>
            <th>${p2.title}</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>SKU</td><td>${p1.sku}</td><td>${p2.sku}</td></tr>
          <tr><td>Category</td><td>${p1.category}</td><td>${p2.category}</td></tr>
          <tr><td>Image</td><td><img src="${p1.images[0]}" width="100"></td><td><img src="${p2.images[0]}" width="100"></td></tr>
        </tbody>
      </table>
    `;
  });
