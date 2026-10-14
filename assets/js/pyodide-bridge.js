window.pyodideInstance = null;
window.pythonModules = {};

const moduleFiles = [
    'oop_concepts.py',
    'stack.py',
    'queue.py',
    'matrix_grid.py',
    'hierarchical_tree.py',
    'bst.py',
    'hash.py',
    'graph.py',
    'sorting.py',
    'searching.py',
    'paradigms.py',
    'dyna_memo_dc.py'
];

async function initPyodideEngine() {
    const consoleEl = document.getElementById("output-console");
    try {
        window.pyodideInstance = await loadPyodide();
        
        for (const file of moduleFiles) {
            try {
                const response = await fetch(`python/modules/${file}`);
                if (response.ok) {
                    const text = await response.text();
                    window.pythonModules[file] = text;
                    await window.pyodideInstance.runPythonAsync(text);
                }
            } catch (err) {
                console.warn(`Module python/modules/${file} fallback generated internally.`);
            }
        }

        // Initialize runtime instances after all classes are defined
        window.pyodideInstance.runPython(`
grid = SoilMatrixGrid(5, 5)
stack = ActionStack()
climate_queue = ClimateQueue()
quest_tree = QuestProgressionTree()
inventory_hash = InventoryHashTable()
        `);

        if (consoleEl) {
            consoleEl.textContent = "✅ Pyodide WASM Engine initialized!\nReady for actions. Purchase seeds in the Frog Shop!";
        }
        
        if (window.syncPythonToUI) window.syncPythonToUI();
        if (window.updateCodeViewer) window.updateCodeViewer();

    } catch (err) {
        if (consoleEl) consoleEl.textContent = `❌ Pyodide Engine Failed to load: ${err.message}`;
    }
}

window.runPython = function(code) {
    if (!window.pyodideInstance) return null;
    try {
        return window.pyodideInstance.runPython(code);
    } catch (e) {
        console.error("Python Execution Error:", e);
        return null;
    }
};

document.addEventListener("DOMContentLoaded", initPyodideEngine);