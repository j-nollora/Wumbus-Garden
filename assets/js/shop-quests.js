function submitQuestCrop() {
    if (!pyReady()) return;
    if (!selectedInventoryKey) {
        logConsole("Error: select a harvested crop from your inventory first!");
        return;
    }

    const res = pyJson(`
import json
try:
    _s = climate_queue.get_current_season() if 'climate_queue' in globals() else "Spring"
    _req_crop, _req_amt = quest_tree.get_current_req(_s)
    
    _item = inventory_hash.get(${pyStr(selectedInventoryKey)})
    _is_crop = _item.get("type") == "crop" if _item else False
    _count = _item.get("count", 0) if _item else 0
    
    _match = selectedInventoryKey.lower() == str(_req_crop).lower()
    
    if not _is_crop:
        _status = "not_crop"
    elif not _match:
        _status = "wrong_crop"
    elif _count < _req_amt:
        _status = "not_enough"
    else:
        # Deduct requested crop count from inventory
        for _ in range(_req_amt):
            inventory_hash.consume(${pyStr(selectedInventoryKey)})
            
        _exp = getattr(quest_tree.current_node, 'exp_reward', 100)
        _coins = getattr(quest_tree.current_node, 'coin_reward', 50)
        _lvl_up = quest_tree.add_exp(_exp)
        
        _status = "success"
        _res_data = {
            "exp": _exp,
            "coins": _coins,
            "level_up": True if _lvl_up else False,
            "level": getattr(quest_tree.current_node, 'level', 1),
            "perk": getattr(quest_tree.current_node, 'perk', ''),
            "req_crop": _req_crop,
            "req_amt": _req_amt
        }
        
    json.dumps({"status": _status, "data": _res_data if _status == "success" else {}, "req_crop": _req_crop, "req_amt": _req_amt})
except Exception as _e:
    json.dumps({"status": "error", "message": str(_e)})
    `);

    if (!res || res.status === "error") {
        logConsole("Error during quest submission.");
        return;
    }

    if (res.status === "not_crop") {
        logConsole(`Error: ${selectedInventoryKey} is not a valid harvested crop!`);
        return;
    }
    if (res.status === "wrong_crop") {
        logConsole(`Wumbus: "Ribbit! I do not want ${selectedInventoryKey}! Bring me ${res.req_amt}x ${res.req_crop}!"`);
        return;
    }
    if (res.status === "not_enough") {
        logConsole(`Wumbus: "Ribbit! You don't have enough! I need ${res.req_amt}x ${res.req_crop}!"`);
        return;
    }

    const data = res.data;
    let payout = Number(data.coins) || 0;

    if (data.level_up) {
        const levelBonus = 200 * Number(data.level);
        payout += levelBonus;
        logConsole(`LEVEL UP! Wumbus leveled up! Unlocked: ${wumbusText(data.perk)}`);
        logConsole(`Quest Completed! (+${data.exp} EXP, +${data.coins} Coins) + LEVEL BONUS (+${levelBonus} Coins)!`);
    } else {
        logConsole(`Quest Hand-in Successful! Received +${data.exp} EXP & +${data.coins} Coins!`);
    }

    addCoins(payout);
    clearSelectionIfEmpty();
    renderMinecraftHotbar();
    updateStatusUI();
}
window.sumbmitQuestCrop = submitQuestCrop;

function sellHarvestedCrop() {
    if (!pyReady()) return;
    if (!selectedInventoryKey) {
        logConsole("Error: select a harvested crop from your inventory to sell!");
        return;
    }

    const isCrop = py(`(lambda _i: _i.get("type") == "crop" if _i else False)(inventory_hash.get(${pyStr(selectedInventoryKey)}))`);
    if (!isCrop) {
        logConsole(`Error: ${selectedInventoryKey} is not a valid crop to sell!`);
        return;
    }

    const sellPrice = Number(py(`getattr(CROP_DATABASE.get(${pyStr(selectedInventoryKey)}), 'sell_price', 30)`)) || 30;

    consumeItem(selectedInventoryKey);
    addCoins(sellPrice);
    logConsole(`Sold 1x ${selectedInventoryKey} to Wumbus for +${sellPrice} Coins!`);

    clearSelectionIfEmpty();
    renderMinecraftHotbar();
    updateStatusUI();
}

function buyFertilizer(cost = 20) {
    if (!pyReady()) {
        logConsole("Error: the Python engine is still loading.");
        return;
    }
    if (userCoins < cost) {
        logConsole("Not enough coins!");
        return;
    }

    const added = py(`
inventory_hash.add(${pyStr(FERTILIZER_KEY)}, {"type": "fertilizer", "count": 1, "icon": ${pyStr(FERTILIZER_ICON)}})
True
    `);
    if (added !== true) return;

    addCoins(-cost);
    selectInventoryItem(FERTILIZER_KEY);
    updateStatusUI();
    logConsole(`Purchased ${FERTILIZER_KEY} for ${cost} Coins!`);
}

function buyMysteryBag(tier, cost) {
    if (!pyReady()) {
        logConsole("Error: the Python engine is still loading.");
        return;
    }
    if (userCoins < cost) {
        logConsole("Not enough coins!");
        return;
    }

    const safeTier = Math.min(3, Math.max(1, Math.trunc(Number(tier)) || 1));

    // Execute seasonal seed selection directly in Pyodide
    const rawResult = py(`
def _roll_bag():
    try:
        if 'buy_seasonal_mystery_bag' in globals():
            fn = buy_seasonal_mystery_bag
        else:
            from paradigms import buy_seasonal_mystery_bag as fn
            
        s = climate_queue.get_current_season() if 'climate_queue' in globals() else "Spring"
        s_clean = str(s).split()[0].strip()
        
        crop_obj = fn(${safeTier}, s_clean)
        if crop_obj and hasattr(crop_obj, 'name'):
            return str(crop_obj.name)
        return "Parsnip"
    except Exception as e:
        print("Mystery Bag Python Error:", e)
        return "Parsnip"

_roll_bag()
    `);

    // Ensure we always get a valid crop name string
    const cropName = (typeof rawResult === 'string' && rawResult.trim().length > 0) ? rawResult.trim() : "Parsnip";

    const seedKey = `${cropName} Seed`;
    
    // Add seed item to Python inventory_hash
    const added = py(`
inventory_hash.add(${pyStr(seedKey)}, {
    "type": "seed", 
    "count": 1, 
    "icon": ${pyStr(getSeedImgUrl(cropName))}, 
    "crop_key": ${pyStr(slugify(cropName))}
})
True
    `);

    addCoins(-cost);
    selectInventoryItem(seedKey);
    updateStatusUI();
    logConsole(`Purchased Tier ${safeTier} Mystery Seed Bag for ${cost} Coins! Received: ${seedKey}!`);
}

function renderShopSeasonalCrops() {
    const container = document.getElementById('shop-crop-list')
        || document.getElementById('shop-seasonal-crops-list')
        || document.getElementById('shop-crops-preview');
    if (!container) return;

    container.innerHTML = '';

    let season = 'Spring';
    let crops = [];

    if (pyReady()) {
        const data = pyJson(`
import json
try:
    _s = climate_queue.get_current_season()
except Exception:
    _s = "Spring"
_season = (str(_s).split() or ["Spring"])[0].strip()
_key = "fall" if _season.lower() == "autumn" else _season.lower()
json.dumps({
    "season": _season,
    "crops": [
        {"name": c.name, "rarity": c.rarity, "season": c.season}
        for c in CROP_DATABASE.values()
        if str(c.season).lower() == _key
    ]
})
        `);
        if (data) {
            season = data.season || season;
            crops = Array.isArray(data.crops) ? data.crops : [];
        }
    }

    const titleEl = document.getElementById('shop-season-title');
    if (titleEl) {
        const icon = titleEl.querySelector('img');
        const label = titleEl.querySelector('span');
        if (icon) icon.src = getSeasonIconUrl(season);
        if (label) label.textContent = `${season} crops in seed bags`;
    }

    if (crops.length === 0) {
        container.innerHTML = `<p style="font-size:0.8rem; opacity:0.6; padding:8px;">No seasonal preview available.</p>`;
        return;
    }

    crops.forEach(crop => {
        const itemEl = document.createElement('div');
        itemEl.className = 'shop-crop-item';
        itemEl.style.cssText = 'display:inline-flex; align-items:center; gap:6px; background:rgba(0,0,0,0.05); padding:4px 8px; border-radius:6px; margin:3px;';

        const iconUrl = getSeedImgUrl(crop.name);

        itemEl.innerHTML = `
            <img src="${escapeHtml(iconUrl)}" alt="${escapeHtml(crop.name)}" referrerpolicy="no-referrer" style="width:20px; height:20px; object-fit:contain;" onerror="this.onerror=null;this.src='${GENERIC_CROP_ICON}'">
            <span style="font-size:0.75rem; font-weight:bold;">${escapeHtml(crop.name)}</span>
            <span style="font-size:0.65rem; opacity:0.7; text-transform:capitalize;">(${escapeHtml(crop.rarity)})</span>
        `;
        container.appendChild(itemEl);
    });
}