// List your static images or dynamically generate if needed
const images = [
  'images/img1.jpg',
  'images/img2.jpg',
  'images/img3.jpg',
  'images/img4.jpg',
  'images/img5.jpg',
  'images/img6.jpg',
  'images/img7.jpg',
  'images/img8.jpg',
  'images/img9.jpg'
];

window.showSelectedImages = function() {
  const selected = Array.from(document.querySelectorAll('#image-selector input[type="checkbox"]:checked')).map(cb => parseInt(cb.value, 10) - 1);
  const gallery = document.getElementById('gallery-selector');
  gallery.innerHTML = '';

  if (selected.length === 0) {
    gallery.innerHTML = '<span style="color: #888;">No images selected.</span>';
    return;
  }

  selected.forEach(idx => {
    if (images[idx]) {
      const img = document.createElement('img');
      img.src = images[idx];
      img.alt = `Image ${idx + 1}`;
      img.style.width = '150px';
      img.style.margin = '10px';
      img.style.cursor = 'pointer';
      img.tabIndex = 0;

      // Optional: open in lightbox if you want shared functionality
      img.addEventListener('click', () => openLightbox(images[idx], `Image ${idx + 1}`));
      img.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') openLightbox(images[idx], `Image ${idx + 1}`);
      });

      gallery.appendChild(img);
    }
  });
};

function openLightbox(src, alt) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  lightboxImg.src = src;
  lightboxImg.alt = alt;
  lightbox.classList.remove('hidden');
  lightbox.style.display = 'flex';
  document.getElementById('lightbox-close').focus();
}

document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
document.getElementById('lightbox-close').addEventListener('keydown', function(e) {
  if (e.key === 'Enter' || e.key === ' ') closeLightbox();
});
document.getElementById('lightbox').addEventListener('click', function(e) {
  if (e.target === this) closeLightbox();
});

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  lightbox.classList.add('hidden');
  lightbox.style.display = '';
  document.getElementById('lightbox-img').src = '';
}
