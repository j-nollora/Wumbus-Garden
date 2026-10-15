window.getCropImgUrl = window.getCropImgUrl || function (name) {
    const assets = CROP_ASSETS[name];
    return assets ? assets.item_icon : GENERIC_CROP_ICON;
};

window.getItemImgUrl = window.getItemImgUrl || function (name) {
    return itemImg({ key: name });
};

function getSeedImgUrl(cropKey) {
    const assets = CROP_ASSETS[cropKey];
    return assets ? assets.seed_icon : SEED_ICON;
}

function itemImg(item) {
    if (!item) return GENERIC_CROP_ICON;

    const jsItem = normalizePy(item);
    if (!jsItem || typeof jsItem !== 'object') return GENERIC_CROP_ICON;

    if (typeof jsItem.icon === 'string' && jsItem.icon.startsWith('http')) {
        return jsItem.icon;
    }

    const rawKey = String(jsItem.key || jsItem.name || '').trim();
    const lowerKey = rawKey.toLowerCase();

    if (lowerKey.includes('fertilizer') || jsItem.type === 'fertilizer') {
        return FERTILIZER_ICON;
    }

    if (lowerKey.includes('seed') || jsItem.type === 'seed') {
        const cropName = jsItem.crop_key || rawKey.replace(/\s+seed$/i, '').trim();
        const assets = CROP_ASSETS[cropName];
        return assets ? assets.seed_icon : SEED_ICON;
    }

    const cropName = jsItem.crop_key || rawKey;
    const assets = CROP_ASSETS[cropName];
    return assets ? assets.item_icon : GENERIC_CROP_ICON;
}

function normalizeInventoryItem(raw) {
    if (!raw) return null;
    let item = raw;
    if (Array.isArray(raw) && raw.length === 2 && typeof raw[0] === 'string') {
        const extra = (raw[1] && typeof raw[1] === 'object') ? raw[1] : { count: raw[1] };
        item = Object.assign({ key: raw[0] }, extra);
    }
    if (!item || typeof item !== 'object') return null;
    const key = String(item.key !== undefined ? item.key : (item.name !== undefined ? item.name : '')).trim();
    if (!key) return null;
    const count = item.count !== undefined ? Number(item.count) : 1;
    return Object.assign({}, item, { key, count });
}

function getInventoryItems() {
    const raw = py('inventory_hash.to_list()');
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeInventoryItem).filter(i => i && i.count > 0);
}

function getInventoryCount(key) {
    const n = py(`(lambda _i: _i.get("count", 0) if _i else 0)(inventory_hash.get(${pyStr(key)}))`);
    return Number(n) || 0;
}

function consumeItem(key) {
    py(`inventory_hash.consume(${pyStr(key)})`);
}

function clearSelectionIfEmpty() {
    if (selectedInventoryKey && getInventoryCount(selectedInventoryKey) <= 0) {
        selectedInventoryKey = null;
    }
}

function renderInventoryUI() {
    const gridEl = document.getElementById('mc-inventory-grid') || document.getElementById('inventory-grid');
    if (!gridEl) return;

    const items = pyReady() ? getInventoryItems() : [];

    if (selectedInventoryKey && !items.some(i => i.key.toLowerCase() === selectedInventoryKey.toLowerCase())) {
        selectedInventoryKey = null;
    }

    gridEl.innerHTML = '';
    const slotCount = Math.max(MIN_INVENTORY_SLOTS, items.length);

    for (let i = 0; i < slotCount; i++) {
        const item = items[i];
        const slotEl = document.createElement('div');
        slotEl.className = 'mc-slot';

        if (!item) {
            slotEl.innerHTML = `<span style="opacity:0.2; font-size:0.65rem;">Empty</span>`;
            gridEl.appendChild(slotEl);
            continue;
        }

        const itemKey = item.key;
        const count = item.count;
        const imgSrc = itemImg(item);
        const fallback = (item.type === 'crop') ? GENERIC_CROP_ICON : SEED_ICON;

        if (selectedInventoryKey && selectedInventoryKey.toLowerCase() === itemKey.toLowerCase()) {
            slotEl.classList.add('selected');
            slotEl.style.border = '2px solid #55ff55';
        }

        slotEl.style.cursor = 'pointer';
        slotEl.tabIndex = 0;
        slotEl.setAttribute('role', 'button');
        slotEl.setAttribute('aria-label', `${itemKey} x${count}`);
        slotEl.title = `${itemKey} x${count}`;
        slotEl.innerHTML = `
            <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(itemKey)}" referrerpolicy="no-referrer" style="width:28px; height:28px; object-fit:contain; pointer-events:none;" onerror="this.onerror=null;this.src='${fallback}'">
            ${count > 1 ? `<span class="mc-badge">${count}</span>` : ''}
        `;

        slotEl.addEventListener('click', (e) => {
            e.stopPropagation();
            selectInventoryItem(itemKey);
        });
        slotEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectInventoryItem(itemKey);
            }
        });

        gridEl.appendChild(slotEl);
    }
}

function selectInventoryItem(itemKey) {
    if (!itemKey) return;

    selectedInventoryKey = itemKey;
    const lowerKey = itemKey.toLowerCase();

    if (lowerKey.includes('fertilizer')) {
        setTool('fertilizer', true);
        logConsole(`Click on a tile to apply!`);
    } else if (lowerKey.includes('seed')) {
        setTool('plant', true);
        logConsole(`Click on a tilled tile to plant!`);
    } else {
        logConsole(`Selected ${itemKey}.`);
    }

    renderMinecraftHotbar();
}

function renderMinecraftHotbar() {
    syncToolButtons();
    renderInventoryUI();
    const indicator = document.getElementById('active-item-indicator');
    if (indicator) indicator.textContent = `Selected: ${selectedInventoryKey || 'None'}`;
}
window.renderMinecrafthotbar = renderMinecraftHotbar;