function normalizePy(value) {
    if (value === null || value === undefined) return value;
    if (typeof value === 'object' && typeof value.toJs === 'function') {
        let converted;
        try {
            converted = value.toJs({ dict_converter: Object.fromEntries });
        } finally {
            if (typeof value.destroy === 'function') {
                try { value.destroy(); } catch (e) {}
            }
        }
        return normalizePy(converted);
    }
    if (value instanceof Map) {
        const obj = {};
        value.forEach((v, k) => { obj[k] = normalizePy(v); });
        return obj;
    }
    if (Array.isArray(value)) return value.map(normalizePy);
    return value;
}

function pyReady() {
    return typeof window.runPython === 'function';
}

function py(code, silent = false) {
    if (!pyReady()) return undefined;
    try {
        return normalizePy(window.runPython(code));
    } catch (err) {
        if (!silent) {
            console.error('[Pyodide error]', err, '\n', code);
            const lines = String(err && err.message ? err.message : err).split('\n').filter(Boolean);
            logConsole(`Python error: ${lines[lines.length - 1] || 'unknown error'}`);
        }
        return undefined;
    }
}

function pyJson(code) {
    const raw = py(code);
    if (typeof raw !== 'string') return null;
    try {
        return JSON.parse(raw);
    } catch (e) {
        console.error('[pyJson] parsing error:', raw, e);
        return null;
    }
}

function pyStr(value) {
    return JSON.stringify(String(value));
}

function pythonStateReady() {
    if (!pyReady()) return false;
    return py(`all(n in globals() for n in ("grid", "inventory_hash", "climate_queue", "quest_tree", "CROP_DATABASE"))`, true) === true;
}

function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, ch => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
    ));
}

window.slugify = window.slugify || function (text) {
    return String(normalizePy(text) || '')
        .trim()
        .toLowerCase()
        .replace(/\s+seeds?$/, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

function syncCoinsToPython() {
    if (!pyReady()) return;
    py(`
user_coins = ${Math.floor(userCoins)}
if 'player' in globals() and hasattr(player, 'coins'):
    player.coins = user_coins
    `);
}

function setCoins(amount) {
    userCoins = Math.max(0, Math.floor(Number(amount) || 0));
    syncCoinsToPython();
}

function addCoins(delta) {
    setCoins(userCoins + Number(delta || 0));
}

function loadCoinsFromPython() {
    const pyCoins = py(`(player.coins if ('player' in globals() and hasattr(player, 'coins')) else (user_coins if 'user_coins' in globals() else None))`);
    if (typeof pyCoins === 'number') {
        userCoins = pyCoins;
    } else {
        syncCoinsToPython();
    }
}

function syncBucketToPython() {
    if (pyReady()) py(`grid.bucket_level = ${Math.floor(userBucket)}`);
}