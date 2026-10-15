function submitQuestCrop() {
    if (!pyReady()) return;
    if (!selectedInventoryKey) {
        logConsole("Error: select a harvested crop from your inventory first!");
        return;
    }

    // Set temporary global Python variable for selected inventory key
    py(`_selected_key = ${pyStr(selectedInventoryKey)}`);

    const res = pyJson(`
import json

def _process_quest():
    try:
        # Get active season
        s = climate_queue.get_current_season() if 'climate_queue' in globals() else "Spring"
        s_clean = str(s).split()[0].strip()

        # Get quest requirement
        if hasattr(quest_tree, 'get_current_req'):
            req_crop, req_amt = quest_tree.get_current_req(s_clean)
        else:
            req_crop = getattr(quest_tree.current_node, 'required_crop', 'Parsnip')
            req_amt = getattr(quest_tree.current_node, 'required_amount', 1)

        req_amt = int(req_amt)

        # Lookup item in inventory hash
        item = inventory_hash.get(_selected_key)
        if not item or not isinstance(item, dict):
            return json.dumps({"status": "not_crop"})

        is_crop = (str(item.get("type", "")).lower() == "crop")
        count = int(item.get("count", 0))

        match = (str(_selected_key).strip().lower() == str(req_crop).strip().lower())

        if not is_crop:
            return json.dumps({"status": "not_crop"})
        if not match:
            return json.dumps({"status": "wrong_crop", "req_crop": str(req_crop), "req_amt": req_amt})
        if count < req_amt:
            return json.dumps({"status": "not_enough", "req_crop": str(req_crop), "req_amt": req_amt})

        # Deduct items from hash
        for _ in range(req_amt):
            inventory_hash.consume(_selected_key)

        exp = int(getattr(quest_tree.current_node, 'exp_reward', 150))
        coins = int(getattr(quest_tree.current_node, 'coin_reward', 50))
        lvl_up = bool(quest_tree.add_exp(exp))

        new_node = quest_tree.current_node
        return json.dumps({
            "status": "success",
            "data": {
                "exp": exp,
                "coins": coins,
                "level_up": lvl_up,
                "level": int(getattr(new_node, 'level', 1)),
                "perk": str(getattr(new_node, 'perk', '')),
                "req_crop": str(req_crop),
                "req_amt": req_amt
            }
        })
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})

_process_quest()
    `);

    if (!res) {
        logConsole("Error: Could not evaluate quest submission in Python.");
        return;
    }

    if (res.status === "error") {
        logConsole(`Error during quest submission: ${res.message || 'Unknown error'}`);
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
        logConsole(`LEVEL UP! Wumbus reached Level ${data.level}! Unlocked: ${wumbusText(data.perk)}`);
        logConsole(`Quest Completed! (+${data.exp} EXP, +${data.coins} Coins) + LEVEL BONUS (+${levelBonus} Coins)!`);
    } else {
        logConsole(`Quest Hand-in Successful! Received +${data.exp} EXP & +${data.coins} Coins!`);
        logPythonTrace("Quest Submission Hand-In", [
            { file: "queue.py", fn: "climate_queue.get_current_season()", dsa: "Queue State Reading" },
            { file: "hierarchical_tree_and_traversals.py", fn: "quest_tree.get_current_req(season)", dsa: "Tree Lookup" },
            { file: "hash.py", fn: "inventory_hash.get(key) / consume(key)", dsa: "Hash Table Linear Probing" },
            { file: "hierarchical_tree_and_traversals.py", fn: "quest_tree.add_exp(exp)", dsa: "Parent-Child Node Traversal" }
        ]);
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
    logConsole(`Purchased ${FERTILIZER_KEY}`);

    logPythonTrace("Purchased Fertilizer", [
        { file: "hash.py", fn: "inventory_hash.add(FERTILIZER_KEY, item)", dsa: "Linear Probing Hash Table Insertion" },
        { file: "oop_concepts.py", fn: "Fertilizer Item Lookup", dsa: "Static Property Encapsulation" }
    ]);
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
     logConsole(`T${safeTier} Bag rolled ${seedKey} [cost: ${cost}]`);

    logPythonTrace("Bought Mystery Seed Bag & Rolled Seed", [
        { file: "queue.py", fn: "climate_queue.get_current_season()", dsa: "FIFO Queue State Query" },
        { file: "paradigms.py", fn: "buy_seasonal_mystery_bag(tier, season)", dsa: "Greedy Probabilistic Bag Roll" },
        { file: "oop_concepts.py", fn: "CROP_DATABASE.values() Lookup", dsa: "Object Property Matching" },
        { file: "hash.py", fn: "inventory_hash.add(seedKey, item)", dsa: "Hash Table Insertion" }
    ]);
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