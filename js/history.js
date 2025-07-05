let undoStack = [];
let redoStack = [];
const MAX_UNDO_STACK_SIZE = 1024;

function loadHistoryFromStorage() {
    try {
        const savedUndoStack = localStorage.getItem('undoStack');
        const savedRedoStack = localStorage.getItem('redoStack');
        
        if (savedUndoStack) {
            undoStack = JSON.parse(savedUndoStack);
        }
        if (savedRedoStack) {
            redoStack = JSON.parse(savedRedoStack);
        }
        
        updateUndoRedoButtons();
    } catch (error) {
        console.warn('Failed to load history from storage:', error);
        undoStack = [];
        redoStack = [];
    }
}

function saveHistoryToStorage() {
    try {
        localStorage.setItem('undoStack', JSON.stringify(undoStack));
        localStorage.setItem('redoStack', JSON.stringify(redoStack));
    } catch (error) {
        console.warn('Failed to save history to storage:', error);
    }
}

function createStateSnapshot() {
    return JSON.parse(JSON.stringify({
        title: graphData.title,
        nodes: graphData.nodes,
        links: graphData.links,
        currentNodeId: currentNodeId
    }));
}

function restoreStateSnapshot(state) {
    graphData.title = state.title;
    graphData.nodes = state.nodes;
    graphData.links = state.links;
    currentNodeId = state.currentNodeId;
    
    selectedNode = null;
    selectedLink = null;
    
    updateTree();
    updateUndoRedoButtons();
    saveCurrentTree();
    saveHistoryToStorage();
}

function saveState() {
    const currentState = createStateSnapshot();
    
    if (undoStack.length > 0) {
        const lastState = undoStack[undoStack.length - 1];
        if (JSON.stringify(lastState) === JSON.stringify(currentState)) {
            return;
        }
    }
    
    undoStack.push(currentState);
    
    if (undoStack.length > MAX_UNDO_STACK_SIZE) {
        undoStack.shift();
    }
    
    redoStack = [];
    
    saveHistoryToStorage();
    updateUndoRedoButtons();
}

function undo() {
    if (undoStack.length === 0) return;
    
    const currentState = createStateSnapshot();
    redoStack.push(currentState);
    
    const previousState = undoStack.pop();
    restoreStateSnapshot(previousState);
}

function redo() {
    if (redoStack.length === 0) return;
    
    const currentState = createStateSnapshot();
    undoStack.push(currentState);
    
    const nextState = redoStack.pop();
    restoreStateSnapshot(nextState);
}

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    
    if (undoBtn) {
        undoBtn.disabled = undoStack.length === 0;
    }
    
    if (redoBtn) {
        redoBtn.disabled = redoStack.length === 0;
    }
}