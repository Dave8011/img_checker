# 🛍️ Product Gallery & Comparison Tool

A responsive web application to display a product gallery with filtering, search, and comparison features.

## ✨ Features
- Live search by name or SKU
- Dynamic dropdown filters (Brand, Category, Listing Type, Packaging)
- Sticky filter bar
- Lightbox image zoom
- Select products to compare
- Compare page with side-by-side layout
- Bulk image Zip downloads & Missing Image report

## 📁 Folder Structure

├── index.html
├── compare.html
├── products.json
├── style.css
└── scripts/
  ├── main.js
  └── compare.js

## 🚀 Usage
1. Place all files in a folder and host locally or on a static server (GitHub Pages, Netlify).
2. Add your products in `products.json`.
3. Open `index.html` in your browser.

## 🛠️ Customization & Guides

### 1. How to Add a Brand
Brands are generated automatically from `products.json`. To add a new brand:
1. Open `products.json`.
2. Add or edit a product and set its `"brand"` field to your new brand name (e.g., `"brand": "My New Brand"`).
3. The dropdown in the web app will automatically create an option for the new brand.

### 2. How to Add Images
1. Open `products.json`.
2. Find the product you want to add images to.
3. Add your image URLs to the `"images"` array:
   ```json
   "images": [
     "https://cdn.example.com/image1.MAIN.jpg",
     "https://cdn.example.com/image1.PT01.jpg"
   ]
   ```

### 3. How to Add New Custom Filters
If you want to filter by a new property (e.g., "Color"):
1. **Update `products.json`**: Add the new property (e.g., `"color": "Red"`) to your products.
2. **Update `index.html`**: Add a new dropdown in the `<div id="controlGroup">` section:
   ```html
   <select id="colorFilter">
     <option value="">🎨 All Colors</option>
   </select>
   ```
3. **Update `scripts/main.js`**:
   - Reference the element: `const colorFilter = document.getElementById('colorFilter');`
   - Dynamically populate it (like categories):
     ```javascript
     const colors = [...new Set(data.map(p => p.color).filter(Boolean))];
     colors.forEach(col => {
       const opt = document.createElement('option');
       opt.value = col;
       opt.textContent = col;
       colorFilter.appendChild(opt);
     });
     ```
   - Add it to the filtering logic in `renderProducts()` and state update function.

## 📦 Tech Stack
- HTML5, CSS3
- JavaScript (ES Modules)
- JSON (local)

## 📄 License
MIT
