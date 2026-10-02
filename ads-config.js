const AdsConfig = {
  enabled: true,
  defaultBanner: {
    imageUrl: 'screenshots/mobile-retro-polaroid.png',
    link: '#',
    alt: 'Promoción destacada'
  },
  init() {
    if (!this.enabled) return;
    const adContainer = document.getElementById('ad-banner');
    if (adContainer) {
      adContainer.innerHTML = `
        <a href="${this.defaultBanner.link}">
          <img src="${this.defaultBanner.imageUrl}" alt="${this.defaultBanner.alt}" loading="lazy">
        </a>
      `;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => AdsConfig.init());
