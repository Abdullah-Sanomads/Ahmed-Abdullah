class ProductPopup extends HTMLElement {
  constructor() {
    super();
    this.product = null;
    this.selectedOptions = {};
    this.currentVariant = null;
  }

  connectedCallback() {
    this.overlay = this.querySelector('.product-popup-overlay');
    this.closeBtn = this.querySelector('.product-popup__close');
    this.content = this.querySelector('.product-popup__content');
    this.init();
  }

  init() {
    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());
    if (this.overlay) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) this.close();
      });
    }

    document.addEventListener('click', (e) => {
      const hotspot = e.target.closest('[data-hotspot]');
      if (hotspot) {
        const productJson = hotspot.getAttribute('data-product');
        if (productJson) {
          try {
            const decoded = this.decodeHtml(productJson);
            const productData = JSON.parse(decoded);
            this.open(productData);
          } catch (err) {
            console.error('Error parsing product data:', err);
          }
        }
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  }

  decodeHtml(html) {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  }

  open(product) {
    if (!product || !product.variants) return;
    this.product = product;
    this.selectedOptions = {};

    if (this.product.variants.length > 0) {
      const firstVariant = this.product.variants[0];
      const options = this.product.options;
      if (Array.isArray(options)) {
        options.forEach((option, index) => {
          const optionName = (typeof option === 'string' ? option : option.name).toLowerCase();
          const key = `option${index + 1}`;

          if (optionName === 'size') {
            this.selectedOptions[key] = '';
            return;
          }

          this.selectedOptions[key] = firstVariant[key];
        });
      }
    }

    this.render();
    if (this.overlay) {
      this.overlay.style.display = 'flex';
      setTimeout(() => {
        this.overlay.classList.add('active');
        this.overlay.style.opacity = '1';
      }, 10);
    }
    document.body.style.overflow = 'hidden';
  }

  close() {
    if (this.overlay) {
      this.overlay.style.opacity = '0';
      setTimeout(() => {
        this.overlay.classList.remove('active');
        this.overlay.style.display = 'none';
      }, 300);
    }
    document.body.style.overflow = '';
  }

  render() {
    if (!this.product || !this.content) return;

    const { title, price, description, featured_image, options } = this.product;

    this.currentVariant = this.getSelectedVariant();
    const displayPrice = this.currentVariant ? this.currentVariant.price : price;
    const formattedPrice = this.formatPrice(displayPrice);

    let sortedOptions = [...options];
    sortedOptions.sort((a, b) => {
      const aName = (typeof a === 'string' ? a : a.name).toLowerCase();
      const bName = (typeof b === 'string' ? b : b.name).toLowerCase();
      if (aName === 'color') return -1;
      if (bName === 'color') return 1;
      return 0;
    });

    let optionsHtml = '';
    sortedOptions.forEach((option) => {
      const originalIndex = options.indexOf(option);
      const optionName = typeof option === 'string' ? option : option.name;
      const optionValues = typeof option === 'string' ? this.getUniqueOptionValues(originalIndex + 1) : option.values;

      const isColor = optionName.toLowerCase() === 'color';
      const isSize = optionName.toLowerCase() === 'size';
      const optionKey = `option${originalIndex + 1}`;

      optionsHtml += `
          <div class="variant-option">
            <span class="variant-option__label">${optionName}</span>
            ${isSize ?
          this.renderSizeSelector(optionValues, optionKey) :
          this.renderButtonSelector(optionValues, optionKey, isColor)}
          </div>
        `;
    });

    this.content.innerHTML = `
      <div class="product-popup__header">
        <div class="product-popup__media">
          <img src="${featured_image}" alt="${title}">
        </div>
        <div class="product-popup__info-head">
          <h2 class="product-popup__title">${title}</h2>
          <div class="product-popup__price">${formattedPrice}</div>
          <div class="product-popup__description">${this.truncateDesc(description)}</div>
        </div>
      </div>
      
      <div class="variant-selectors">
        ${optionsHtml}
      </div>

      <button class="add-to-cart-btn" ${!this.currentVariant ? 'disabled' : ''}>
        <span class="btn-text">ADD TO CART</span>
        <div class="arrow-svg">
          <svg width="27" height="12" viewBox="0 0 27 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0.75 4.77295L7.83954e-08 4.77295L-7.83954e-08 6.27295L0.75 6.27295L0.75 4.77295ZM26.7876 6.05328C27.0805 5.76039 27.0805 5.28551 26.7876 4.99262L22.0146 0.21965C21.7217 -0.0732435 21.2468 -0.0732435 20.9539 0.21965C20.6611 0.512543 20.6611 0.987417 20.9539 1.28031L25.1966 5.52295L20.9539 9.76559C20.6611 10.0585 20.6611 10.5334 20.9539 10.8263C21.2468 11.1191 21.7217 11.1191 22.0146 10.8263L26.7876 6.05328ZM0.75 6.27295L26.2572 6.27295L26.2572 4.77295L0.75 4.77295L0.75 6.27295Z" fill="white"/>
          </svg>
        </div>
        <div class="loading-overlay"></div>
      </button>
    `;

    this.setupEventListeners();
  }

  getUniqueOptionValues(optionIndex) {
    const key = `option${optionIndex}`;
    const values = this.product.variants.map(v => v[key]);
    return [...new Set(values)];
  }

  truncateDesc(desc) {
    if (!desc) return '';
    const text = desc.replace(/<[^>]*>/g, '');
    return text.split(' ').slice(0, 22).join(' ') + '...';
  }

  renderButtonSelector(values, optionKey, isColor) {
    if (!values) return '';
    const buttons = values.map(valObj => {
      const value = valObj.name;
      let colorStyle = '';
      if (isColor) {
        if (valObj.swatch && valObj.swatch.image) {
          colorStyle = `style="background-image: url(${valObj.swatch.image}); background-size: cover;"`;
        } else if (valObj.swatch && valObj.swatch.color) {
          const rgbVal = valObj.swatch.color.includes(',') ? valObj.swatch.color : valObj.swatch.color.split(' ').join(',');
          colorStyle = `style="background-color: rgb(${rgbVal});"`;
        } else {
          colorStyle = `style="background-color: ${value.toLowerCase()};"`;
        }
      }
      return `
        <div class="variant-option__value ${this.selectedOptions[optionKey] === value ? 'selected' : ''}" 
             data-value="${value}">
          ${isColor ? `<span class="variant-option__color-bar" ${colorStyle}></span>` : ''}
          ${value}
        </div>
      `;
    }).join('');

    return `<div class="variant-option__values">${buttons}</div>`;
  }

  renderSizeSelector(values, optionKey) {
    if (!values) return '';
    const selectedValue = this.selectedOptions[optionKey];
    let optionsList = `<option value="" ${selectedValue === '' ? 'selected' : ''}>Choose your size</option>`;
    optionsList += values.map(valObj => `
      <option value="${valObj.name}" ${selectedValue === valObj.name ? 'selected' : ''}>${valObj.name}</option>
    `).join('');

    return `
      <div class="variant-option__select-wrapper" data-option-key="${optionKey}">
        <select class="variant-option__select">${optionsList}</select>
        <div class="variant-option__select-icon">
            <svg viewBox="0 0 14 10" fill="none" width="14" height="10"><path d="M1 1L7 7L13 1" stroke="currentColor" stroke-width="2"/></svg>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    this.content.querySelectorAll('.variant-option__value').forEach(btn => {
      btn.addEventListener('click', () => {
        const optionLabel = btn.closest('.variant-option').querySelector('.variant-option__label').textContent.trim();
        const optionIndex = this.product.options.findIndex(o => (typeof o === 'string' ? o : o.name) === optionLabel) + 1;
        this.selectedOptions[`option${optionIndex}`] = btn.dataset.value;
        this.render();
      });
    });

    this.content.querySelectorAll('.variant-option__select').forEach(select => {
      select.addEventListener('change', (e) => {
        const wrapper = select.closest('.variant-option__select-wrapper');
        const optionKey = wrapper.dataset.optionKey;
        this.selectedOptions[optionKey] = e.target.value;
        this.render();
      });

      // Handle Chevron Rotation
      select.addEventListener('focus', () => {
        select.closest('.variant-option__select-wrapper').classList.add('open');
      });
      select.addEventListener('blur', () => {
        select.closest('.variant-option__select-wrapper').classList.add('open');
        // Small delay so we can see the click happen before it closes
        setTimeout(() => {
          const wrapper = select.closest('.variant-option__select-wrapper');
          if (wrapper) wrapper.classList.remove('open');
        }, 200);
      });
    });

    const atcBtn = this.content.querySelector('.add-to-cart-btn');
    if (atcBtn) atcBtn.addEventListener('click', () => this.addToCart());
  }

  getSelectedVariant() {
    if (!this.product || !this.product.variants) return null;
    return this.product.variants.find(variant => {
      return Object.keys(this.selectedOptions).every(key => {
        if (this.selectedOptions[key] === '') return false;
        return variant[key] === this.selectedOptions[key];
      });
    });
  }

  formatPrice(price) {
    const val = (price / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
    return `${val.replace('.', ',')}€`;
  }

  async addToCart() {
    if (!this.currentVariant) return;
    const atcBtn = this.content.querySelector('.add-to-cart-btn');
    atcBtn.classList.add('loading');
    atcBtn.disabled = true;

    const cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
    const body = { id: this.currentVariant.id, quantity: 1 };
    if (cart && typeof cart.getSectionsToRender === 'function') {
      body.sections = cart.getSectionsToRender().map(s => s.id);
      body.sections_url = window.location.pathname;
    }

    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const parsed = await response.json();
      if (!response.ok) throw new Error(parsed.description || 'Error');
      await this.handleSpecialLogic();
      if (cart && typeof cart.renderContents === 'function') cart.renderContents(parsed);
      this.close();
    } catch (e) {
      alert(e.message);
    } finally {
      atcBtn.classList.remove('loading');
      atcBtn.disabled = false;
    }
  }

  async handleSpecialLogic() {
    if (!this.product || !this.currentVariant) return;
    const colorIdx = this.product.options.findIndex(o => {
      const name = (typeof o === 'string' ? o : o.name).toLowerCase();
      return name === 'color';
    });
    const sizeIdx = this.product.options.findIndex(o => {
      const name = (typeof o === 'string' ? o : o.name).toLowerCase();
      return name === 'size';
    });

    if (colorIdx === -1 || sizeIdx === -1) return;

    const colorValue = this.currentVariant[`option${colorIdx + 1}`];
    const sizeValue = this.currentVariant[`option${sizeIdx + 1}`];

    if (colorValue && sizeValue && colorValue.toLowerCase() === 'black' && sizeValue.toLowerCase() === 'medium') {
      const res = await fetch('/products/soft-winter-jacket.js');
      if (res.ok) {
        const p = await res.json();
        const v = p.variants.find(v => v.available);
        if (v) await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [{ id: v.id, quantity: 1 }] })
        });
      }
    }
  }
}
if (!customElements.get('product-popup')) customElements.define('product-popup', ProductPopup);
