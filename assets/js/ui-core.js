document.addEventListener('DOMContentLoaded', () => {
    renderFallbackGrid();
    updateStatusUI();
    renderMinecraftHotbar();

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal(overlay.id);
        });
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(m => closeModal(m.id));
        }
    });

    let tries = 0;
    const timer = setInterval(() => {
        tries += 1;
        if (pythonInitDone) {
            clearInterval(timer);
        } else if (pythonStateReady()) {
            clearInterval(timer);
            onPyodideReady();
        } else if (tries > 300) {
            clearInterval(timer);
        }
    }, 300);
});

function onPyodideReady() {
    if (pythonInitDone) return;
    pythonInitDone = true;
    loadCoinsFromPython();
    syncBucketToPython();
    updateStatusUI();
    window.syncPythonToUI();
    updateCodeViewer();
    logConsole('Python engine ready. View Mechanics.');
}
window.onPyodideReady = onPyodideReady;

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function readHudState() {
    return pyJson(`
import json

def _hud_safe(fn, default=None):
    try:
        value = fn()
        return value() if callable(value) else value
    except Exception:
        return default

_season = _hud_safe(lambda: climate_queue.get_current_season(), "Spring")
_node = _hud_safe(lambda: quest_tree.current_node)

json.dumps({
    "season": _season,
    "day": _hud_safe(lambda: climate_queue.current_day),
    "weather": _hud_safe(lambda: climate_queue.get_current_weather()),
    "aoe": _hud_safe(lambda: quest_tree.get_aoe_range(), 1),
    "max_bucket": _hud_safe(lambda: quest_tree.get_max_bucket(), 5),
    "quest_desc": _hud_safe(lambda: quest_tree.get_current_quest_desc(_season)),
    "level": getattr(_node, "level", None),
    "title": getattr(_node, "title", None),
    "exp": _hud_safe(lambda: quest_tree.current_exp, 0),
    "req_exp": _hud_safe(lambda: quest_tree.exp_to_next_level, 0)
}, default=str)
    `);
}

function updateStatusUI() {
    const hud = pyReady() ? readHudState() : null;

    if (hud) {
        maxBucket = Math.max(1, Number(hud.max_bucket) || 5);
        if (userBucket > maxBucket) userBucket = maxBucket;
    }

    setText('stat-energy', `${userEnergy}`);
    const energyEl = document.getElementById('stat-energy');
    if (energyEl) energyEl.title = `${userEnergy} / ${maxEnergy}`;
    setText('stat-bucket', `${userBucket}/${maxBucket}`);
    setText('stat-coins', `${userCoins}`);

    if (!hud) return;

    if (hud.season) {
        const seasonEl = document.getElementById('stat-season');
        if (seasonEl) {
            const seasonInfo = `${hud.season} (Day ${hud.day})`;
            seasonEl.innerHTML = `<img src="${escapeHtml(getSeasonIconUrl(hud.season))}" alt="${escapeHtml(hud.season)}" referrerpolicy="no-referrer" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 6px;"> ${escapeHtml(formatSeason(seasonInfo))}`;
        }
    }

    if (hud.weather) {
        setText('stat-weather', String(hud.weather));
        const weatherIcon = document.getElementById('weather-icon');
        if (weatherIcon) weatherIcon.src = getWeatherIconUrl(hud.weather);
    }

    const aoe = Math.max(1, Number(hud.aoe) || 1);
    setText('aoe-status', `Tool Tier: ${aoe}x${aoe} AOE`);

    if (hud.quest_desc) setText('frog-quest-desc', `"${wumbusText(hud.quest_desc)}"`);
    if (hud.level !== null && hud.level !== undefined) setText('frog-level', `Lvl ${hud.level}`);
    if (hud.title) setText('frog-title', wumbusText(hud.title));

    const exp = Number(hud.exp) || 0;
    const reqExp = Number(hud.req_exp) || 0;
    const expPercent = reqExp > 0 ? Math.max(0, Math.min(100, Math.floor((exp / reqExp) * 100))) : 0;
    const bar = document.getElementById('frog-exp-bar');
    if (bar) bar.style.width = `${expPercent}%`;
}
window.updateStatsUI = updateStatusUI;

function syncToolButtons() {
    document.querySelectorAll('.tool-btn').forEach(btn => {
        const on = btn.id === `tool-${activeTool}`;
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
}

function setTool(toolName, silent = false) {
    activeTool = toolName;
    syncToolButtons();
    if (!silent) logConsole(`Selected Tool: ${String(toolName).toUpperCase()}`);
}

function switchTab(name) {
    ['quests', 'shop', 'sell'].forEach(t => {
        const tab = document.getElementById(`tab-${t}`);
        const panel = document.getElementById(`panel-${t}`);
        const on = t === name;
        if (tab) {
            tab.setAttribute('aria-selected', on ? 'true' : 'false');
            tab.classList.toggle('active', on);
            tab.tabIndex = on ? 0 : -1;
        }
        if (panel) panel.hidden = !on;
    });

    // SQA Function Call Trace
    if (name === 'quests') {
        logPythonTrace("Opened Quests View", [
            { file: "hierarchical_tree_and_traversals.py", fn: "quest_tree.get_current_quest_desc()", dsa: "Tree Pointer Traversal" }
        ]);
    } else if (name === 'shop') {
        logPythonTrace("Opened Shop View", [
            { file: "queue.py", fn: "climate_queue.get_current_season()", dsa: "FIFO Queue Inspection" },
            { file: "oop_concepts.py", fn: "CROP_DATABASE.values()", dsa: "Static Registry Iteration" }
        ]);
    } else if (name === 'sell') {
        logPythonTrace("Opened Sell View", [
            { file: "hash.py", fn: "inventory_hash.to_list()", dsa: "Hash Table Array Serialization" }
        ]);
    }
}

function logConsole(msg) {
    const el = document.getElementById('output-console');
    if (!el) return;
    el.textContent = `${msg}`;
    el.title = msg; // Native hover tooltip fallback
}
window.logConsole = logConsole;

function openModal(id) {
    if (id === 'shop-modal') renderShopSeasonalCrops();
    if (id === 'code-modal') updateCodeViewer();
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

function updateCodeViewer() {
    const selector = document.getElementById('file-selector');
    const viewer = document.getElementById('code-viewer');
    if (!selector || !viewer) return;

    const modules = window.pythonModules;
    let source;
    if (modules instanceof Map) source = modules.get(selector.value);
    else if (modules && typeof modules === 'object') source = modules[selector.value];

    viewer.textContent = source || "# Code loading...";
}
window.updateCodeViewer = updateCodeViewer;

function getSeasonIconUrl(season) {
    const s = String(normalizePy(season) || '').toLowerCase();
    if (s.includes('summer')) return 'https://stardewvalleywiki.com/mediawiki/images/8/85/Summer.png';
    if (s.includes('fall') || s.includes('autumn')) return 'https://stardewvalleywiki.com/mediawiki/images/5/5d/Fall.png';
    if (s.includes('winter')) return 'https://stardewvalleywiki.com/Special:FilePath/Winter.png';
    return 'https://stardewvalleywiki.com/mediawiki/images/9/9c/Spring.png';
}

function getWeatherIconUrl(weather) {
    const w = String(normalizePy(weather) || '').toLowerCase();
    if (w.includes('storm') || w.includes('thunder')) return STORM_ICON;
    if (w.includes('rain') || w.includes('drizzle') || w.includes('shower')) return RAIN_ICON;
    if (w.includes('snow') || w.includes('frost') || w.includes('blizzard')) return SNOW_ICON;
    return SUN_ICON;
}

function wumbusText(text) {
    return String(text || '').replace(/The Frog Prince/g, 'Wumbus').replace(/Frog Prince/g, 'Wumbus');
}

function formatSeason(text) {
    const m = String(text || '').match(/^(\S+)\s*\(Day\s*(\d+)\)/i);
    return m ? `${m[1]} ${String(m[2]).padStart(2, '0')}` : text;
}

// Tab switcher for Action Log vs Function Trace View
function switchLogTab(tabName) {
    const actionsTab = document.getElementById('log-tab-actions');
    const traceTab = document.getElementById('log-tab-trace');
    const consoleBox = document.getElementById('output-console');
    const traceBox = document.getElementById('trace-console');

    if (tabName === 'actions') {
        if (actionsTab) actionsTab.classList.add('active');
        if (traceTab) traceTab.classList.remove('active');
        if (consoleBox) consoleBox.hidden = false;
        if (traceBox) traceBox.hidden = true;
    } else {
        if (traceTab) traceTab.classList.add('active');
        if (actionsTab) actionsTab.classList.remove('active');
        if (traceBox) traceBox.hidden = false;
        if (consoleBox) consoleBox.hidden = true;
    }
}
window.switchLogTab = switchLogTab;

/**
 * Dynamically records and renders Python function traces for any triggered action
 * @param {string} actionTitle - Name of the action (e.g., "Day Advance", "Till Soil")
 * @param {Array<{fn: string, file: string, dsa: string}>} calls - List of executed python functions
 */
// Appends Python function traces live to the right-side panel
function logPythonTrace(actionTitle, calls) {
    const traceBox = document.getElementById('trace-console');
    if (!traceBox) return;

    let traceHTML = `<div style="color: #f59e0b; font-weight: bold; margin-bottom: 6px; border-bottom: 1px dashed rgba(245, 158, 11, 0.4); padding-bottom: 2px;">▶ [ACTION]: ${escapeHtml(actionTitle)}</div>`;
    traceHTML += `<ul style="list-style-type: none; padding-left: 4px; margin: 0 0 8px 0; line-height: 1.6;">`;

    calls.forEach(call => {
        traceHTML += `<li style="margin-bottom: 4px;">
            <span style="color: #a7f3d0; font-weight: bold;">📁 ${escapeHtml(call.file)}</span> 
            <span style="color: #f3f4f6;">➔ ⚙️ <code style="color: #fef08a;">${escapeHtml(call.fn)}</code></span>
            ${call.dsa ? `<br><span style="font-size: 0.7rem; color: #cbd5e1; background: rgba(255,255,255,0.1); padding: 1px 5px; border-radius: 4px; margin-left: 20px;">💡 ${escapeHtml(call.dsa)}</span>` : ''}
        </li>`;
    });

    traceHTML += `</ul>`;

    // Append new trace at top of right panel
    traceBox.innerHTML = traceHTML + traceBox.innerHTML;
}
window.logPythonTrace = logPythonTrace;