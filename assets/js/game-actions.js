function getCropStageImgUrl(tile) {
    if (!tile) return GENERIC_CROP_ICON;

    const name = tile.name;
    const assets = CROP_ASSETS[name];

    if (assets && assets.stage_images && assets.stage_images.length > 0) {
        const stage = Number(tile.stage) || 0;
        const maxStage = Math.max(1, Number(tile.max_stage) || 1);

        let tier;
        if (stage <= 0) tier = 0;
        else if (stage >= maxStage) tier = 3;
        else if (stage >= Math.floor(maxStage / 2)) tier = 2;
        else tier = 1;

        return assets.stage_images[tier] || assets.item_icon;
    }

    return getCropImgUrl(tile.name);
}

function cropImg(name, cls = '', alt = '') {
    const src = getCropImgUrl(name);
    return `<img class="${escapeHtml(cls)}" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${GENERIC_CROP_ICON}'">`;
}

function refillWaterAtWell() {
    if (activeTool !== 'water') {
        logConsole("Warning: select the Watering Can before clicking the Well!");
        return;
    }
    if (userBucket >= maxBucket) {
        logConsole(`Your watering can is already full (${maxBucket}L).`);
        return;
    }
    if (userEnergy < WELL_ENERGY_COST) {
        logConsole(`Error: need ${WELL_ENERGY_COST} Energy to refill water at the Well!`);
        return;
    }
    userEnergy -= WELL_ENERGY_COST;
    userBucket = maxBucket;
    syncBucketToPython();
    logConsole(`Refilled watering can to ${maxBucket}L at the Well! (-${WELL_ENERGY_COST} Energy)`);
    updateStatusUI();
}

function handleTileClick(r, c) {
    if (!pyReady()) return;

    if (userEnergy < ENERGY_PER_ACTION) {
        logConsole("Error: out of energy! Click End Day to recover.");
        return;
    }

    const aoe = Math.max(1, Number(py(`quest_tree.get_aoe_range()`)) || 1);
    let actionExecuted = false;
    aoeAborted = false;

    outer:
    for (let dr = 0; dr < aoe; dr++) {
        for (let dc = 0; dc < aoe; dc++) {
            if (aoeAborted) break outer;
            const tr = r + dr;
            const tc = c + dc;
            if (tr < GRID_ROWS && tc < GRID_COLS) {
                if (executeToolOnTile(tr, tc)) actionExecuted = true;
            }
        }
    }

    if (actionExecuted) {
        userEnergy -= ENERGY_PER_ACTION;
        syncBucketToPython();
        updateStatusUI();
    }
    window.syncPythonToUI();
}

function executeToolOnTile(r, c) {
    if (activeTool === 'hoe') {
        const ok = py(`grid.till_soil(${r}, ${c})`);
        if (ok) {
            logConsole(`Tilled soil at tile [${r}, ${c}]`);
            return true;
        }

    } else if (activeTool === 'water') {
        if (userBucket <= 0) {
            logConsole("Error: Watering Can is empty (0 L)! Click the Well to refill.");
            aoeAborted = true;
            return false;
        }
        const ok = py(`grid.water_soil(${r}, ${c})`);
        if (ok) {
            userBucket -= 1;
            logConsole(`Watered tile [${r}, ${c}] (-1L Water)`);
            return true;
        }

    } else if (activeTool === 'plant') {
        if (!selectedInventoryKey || !selectedInventoryKey.toLowerCase().includes('seed')) {
            logConsole("Error: select a seed from your Inventory first!");
            aoeAborted = true;
            return false;
        }
        if (getInventoryCount(selectedInventoryKey) <= 0) {
            logConsole(`Error: no ${selectedInventoryKey}s remaining!`);
            selectedInventoryKey = null;
            aoeAborted = true;
            return false;
        }

        const cropKey = selectedInventoryKey.replace(/\s+seed$/i, '');
        const planted = py(`
_crop = CROP_DATABASE.get(${pyStr(cropKey)})
grid.plant_seed(${r}, ${c}, _crop) if _crop is not None else False
        `);

        if (planted) {
            consumeItem(selectedInventoryKey);
            logConsole(`Planted ${cropKey} at tile [${r}, ${c}]`);
            clearSelectionIfEmpty();
            return true;
        }
        logConsole(`Warning: cannot plant at [${r}, ${c}]! (Tile must be tilled soil without existing crops)`);

    } else if (activeTool === 'fertilizer') {
        if (!selectedInventoryKey || !selectedInventoryKey.toLowerCase().includes('fertilizer')) {
            logConsole("Error: select Fertilizer from your Inventory first! (Buy it in the Shop)");
            aoeAborted = true;
            return false;
        }
        if (getInventoryCount(selectedInventoryKey) <= 0) {
            logConsole("Error: out of Fertilizer! Buy more in the Shop.");
            selectedInventoryKey = null;
            aoeAborted = true;
            return false;
        }

        const applied = py(`grid.apply_fertilizer(${r}, ${c})`);
        if (applied) {
            consumeItem(selectedInventoryKey);
            logConsole(`Applied fertilizer defense shield to tile [${r}, ${c}]!`);
            clearSelectionIfEmpty();
            return true;
        }
        logConsole(`Warning: cannot apply fertilizer at [${r}, ${c}]! (Requires an unshielded active crop)`);

    } else if (activeTool === 'scythe') {
        const result = pyJson(`
import json
_tile = grid.get_tile(${r}, ${c})
_crop = _tile.crop if _tile else None
_ready = bool(_crop is not None and _tile.growth_stage >= _crop.days_to_grow)
_harvested = grid.harvest_crop(${r}, ${c}) if _ready else None
json.dumps({
    "had_crop": _crop is not None,
    "ready": _ready,
    "name": _harvested.name if _harvested else None
})
        `);

        if (result && result.name) {
            const cropUrl = getCropImgUrl(result.name);

            py(`inventory_hash.add(${pyStr(result.name)}, {"type": "crop", "count": 1, "icon": ${pyStr(cropUrl)}, "crop_key": ${pyStr(slugify(result.name))}})`);
            logConsole(`Harvested 1x ${result.name} from tile [${r}, ${c}]!`);
            return true;
        } else if (result && result.had_crop && !result.ready) {
            logConsole(`Warning: crop at [${r}, ${c}] is not ready for harvest yet!`);
        } else {
            logConsole(`Warning: there is nothing to harvest at tile [${r}, ${c}]!`);
        }

    } else if (activeTool === 'shovel') {
        const result = pyJson(`
import json
_tile = grid.get_tile(${r}, ${c})
_removed = None
if _tile and (_tile.crop is not None or _tile.is_tilled):
    _removed = _tile.crop.name if _tile.crop else "tilled soil"
    _tile.crop = None
    _tile.growth_stage = 0
    _tile.is_tilled = False
    _tile.is_watered = False
    _tile.is_wilted = False
    _tile.is_fertilized = False
    _tile.hp = 100
json.dumps({"removed": _removed})
        `);

        if (result && result.removed) {
            logConsole(`Cleared ${result.removed} from tile [${r}, ${c}]!`);
            return true;
        }
    }
    return false;
}

function advanceNextDay() {
    if (!pyReady()) return;

    const night = pyJson(`
import json
climate_queue.advance_day(grid)
_disaster = bool(getattr(grid, 'disaster_occurred', False))
_name = str(getattr(grid, 'last_disaster_name', '') or '')
if hasattr(grid, 'disaster_occurred'):
    grid.disaster_occurred = False
json.dumps({"disaster": _disaster, "name": _name})
    `);

    if (!night) {
        logConsole("Error: could not advance the day (see console for the Python error).");
        return;
    }

    userEnergy = maxEnergy;
    const gridEl = document.getElementById('soil-grid');

    if (night.disaster && night.name) {
        logConsole(`NIGHT DISASTER ALERT: A severe [${night.name}] struck your field! Shielded crops absorbed damage!`);
        if (gridEl) {
            gridEl.classList.add('disaster-blink');
            setTimeout(() => gridEl.classList.remove('disaster-blink'), 3000);
        }
    } else {
        logConsole("Advanced to Next Day! Energy restored. Unwatered or out-of-season crops wilted!");
    }

    updateStatusUI();
    window.syncPythonToUI();
}

window.syncPythonToUI = function () {
    if (!pyReady()) return;

    const matrix = pyJson(`
import json

def _tile_to_dict(t):
    crop = t.crop
    return {
        "tilled": bool(t.is_tilled),
        "watered": bool(t.is_watered),
        "wilted": bool(t.is_wilted),
        "fertilized": bool(t.is_fertilized),
        "hp": getattr(t, 'hp', 100),
        "max_hp": getattr(t, 'max_hp', 100),
        "has_crop": crop is not None,
        "name": crop.name if crop else "",
        "symbol": crop.symbol if crop else "",
        "stage": t.growth_stage,
        "max_stage": crop.days_to_grow if crop else 1
    }

json.dumps([[_tile_to_dict(t) for t in row] for row in grid.grid], default=str)
    `);

    if (matrix) renderGridFromMatrix(matrix);
    renderMinecraftHotbar();
};

function renderGridFromMatrix(matrix) {
    const gridContainer = document.getElementById('soil-grid');
    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    const cols = matrix.length ? matrix[0].length : GRID_COLS;

    matrix.forEach((row, r) => {
        row.forEach((tile, c) => {
            const el = document.createElement('div');
            el.className = 'soil-tile';
            el.setAttribute('role', 'gridcell');
            el.tabIndex = 0;
            if (tile.tilled) el.classList.add('tilled');
            if (tile.watered) el.classList.add('watered');
            if (tile.wilted) el.classList.add('wilted');
            if (tile.fertilized) el.classList.add('fertilized');

            let spriteHtml = "";
            let label = `Tile ${r},${c}`;

            if (tile.wilted) {
                spriteHtml = `<img class="tile-sprite" src="https://stardewvalleywiki.com/mediawiki/images/d/d0/Fiber_Stage_4_Fall.png" alt="Wilted" referrerpolicy="no-referrer" onerror="this.style.display='none'">`;
                label += ', wilted crop';
            } else if (tile.has_crop || tile.symbol) {
                const stageImgUrl = getCropStageImgUrl(tile);
                spriteHtml = `<img class="tile-sprite" src="${escapeHtml(stageImgUrl)}" alt="${escapeHtml(tile.name)}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${GENERIC_CROP_ICON}'">`;
                if (tile.stage >= tile.max_stage) {
                    label += `, ${tile.name || 'crop'} ready`;
                } else {
                    label += `, ${tile.name || 'crop'} (Stage ${tile.stage}/${tile.max_stage})`;
                }
            } else if (tile.tilled) {
                label += ', tilled';
            }
            el.setAttribute('aria-label', label);

            let healthBarHtml = "";
            if (tile.has_crop && !tile.wilted) {
                const maxHp = Number(tile.max_hp) || 100;
                const hpPct = Math.max(0, Math.min(100, Math.floor(((Number(tile.hp) || 0) / maxHp) * 100)));
                const barColor = hpPct > 50 ? '#22c55e' : (hpPct > 20 ? '#eab308' : '#ef4444');
                healthBarHtml = `
                    <div class="crop-hp-bar-bg">
                        <div class="crop-hp-bar-fill" style="width: ${hpPct}%; background-color: ${barColor};"></div>
                    </div>
                `;
            }

            el.innerHTML = `
                <div class="tile-header">
                    <span class="tile-coord">${r},${c}</span>
                    ${tile.fertilized ? `<img class="fertilizer-badge" src="${FERTILIZER_ICON}" title="Shielded with Fertilizer" alt="Shielded" referrerpolicy="no-referrer">` : ''}
                </div>
                ${spriteHtml || '<span></span>'}
                ${healthBarHtml || '<span></span>'}
            `;
            el.onclick = () => handleTileClick(r, c);
            el.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    lastFocusedTile = { r, c };
                    handleTileClick(r, c);
                }
            };
            gridContainer.appendChild(el);
        });
    });

    if (lastFocusedTile) {
        const target = gridContainer.children[lastFocusedTile.r * cols + lastFocusedTile.c];
        if (target) target.focus({ preventScroll: true });
        lastFocusedTile = null;
    }
}

function renderFallbackGrid() {
    const gridContainer = document.getElementById('soil-grid');
    if (!gridContainer) return;
    gridContainer.innerHTML = '';
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const el = document.createElement('div');
            el.className = 'soil-tile';
            el.setAttribute('role', 'gridcell');
            el.innerHTML = `<div class="tile-header"><span class="tile-coord">${r},${c}</span></div><span></span><span></span>`;
            gridContainer.appendChild(el);
        }
    }
}