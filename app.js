document.addEventListener('DOMContentLoaded', () => {
  const productsContainer = document.getElementById('products-container');
  const searchInput = document.getElementById('search-input');

  let products = [];

  async function fetchProducts() {
    try {
      if (typeof supabaseClient !== 'undefined') {
        const { data, error } = await supabaseClient.from('products').select('*');
        if (error) throw error;
        products = data || [];
      } else {
        products = getFallbackProducts();
      }
      renderProducts(products);
    } catch (err) {
      console.warn('Error conectando a backend, cargando datos locales:', err.message);
      products = getFallbackProducts();
      renderProducts(products);
    }
  }

  function renderProducts(items) {
    if (!productsContainer) return;
    if (items.length === 0) {
      productsContainer.innerHTML = '<p>No se encontraron productos.</p>';
      return;
    }

    productsContainer.innerHTML = items.map(item => `
      <article class="product-card">
        <img src="${item.image || 'placeholder.jpg'}" alt="${item.title}" loading="lazy">
        <div class="product-info">
          <h4>${item.title}</h4>
          <p class="price">$${item.price.toLocaleString('es-CL')}</p>
        </div>
      </article>
    `).join('');
  }

  function getFallbackProducts() {
    return [
      { id: 1, title: 'Producto Ejemplo 1', price: 15000, image: 'screenshots/desktop-storefront.png' },
      { id: 2, title: 'Producto Ejemplo 2', price: 22000, image: 'screenshots/mobile-storefront.png' }
    ];
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = products.filter(p => p.title.toLowerCase().includes(term));
      renderProducts(filtered);
    });
  }

  fetchProducts();
});
