function clearSelection() {
    selectedNode = null;
    selectedLink = null;
    
    if (window.getSelection) {
        window.getSelection().removeAllRanges();
    }
    
    updateSelectionVisuals();
}

function updateSelectionVisuals() {
    nodesGroup.selectAll(".node")
        .classed("selected", d => selectedNode && d.id === selectedNode.id);

    linksGroup.selectAll(".link")
        .classed("selected", d => selectedLink &&
            d.source === selectedLink.source &&
            d.target === selectedLink.target);
}

function showContextMenu(event) {
    const contextMenu = document.getElementById('contextMenu');

    contextMenu.style.left = event.pageX + 'px';
    contextMenu.style.top = event.pageY + 'px';
    contextMenu.classList.add('visible');

    const hideContext = (e) => {
        if (!contextMenu.contains(e.target)) {
            contextMenu.classList.remove('visible');
            document.removeEventListener('click', hideContext);
        }
    };

    setTimeout(() => {
        document.addEventListener('click', hideContext);
    }, 100);
}

function checkNodeProximity(event) {
    const mousePos = d3.pointer(event, g.node());
    if (!mousePos || mousePos.length < 2) return;

    const adjustedMouseX = mousePos[0];
    const adjustedMouseY = mousePos[1];

    buttonsGroup.selectAll(".node-buttons").each(function(d) {
        const buttonGroup = d3.select(this);

        const correspondingNode = nodesGroup.selectAll(".node")
            .filter(nodeData => nodeData.id === d.id);
        
        const isDragging = correspondingNode.classed("dragging");
        const isEditing = inlineEditor.activeEditingElement !== null;
        
        if (isDragging || isEditing) {
            buttonGroup.classed('node-buttons-visible', false);
            return;
        }

        const isInProximity = isNodeInProximity(d, adjustedMouseX, adjustedMouseY);
        buttonGroup.classed('node-buttons-visible', isInProximity);
    });
}

function isNodeInProximity(nodeData, mouseX, mouseY) {
    const deltaX = Math.abs(nodeData.x - mouseX);
    const deltaY = Math.abs(nodeData.y - mouseY);

    const nodeWidth = getNodeWidth(nodeData.text || 'Default');
    const adaptiveThresholdX = Math.max(PROXIMITY_THRESHOLD_X, nodeWidth * 0.8);

    const normalizedDistance = Math.pow(deltaX / adaptiveThresholdX, 2) +
                             Math.pow(deltaY / PROXIMITY_THRESHOLD_Y, 2);

    return normalizedDistance <= 1;
}

function moveSelectedNode(key, fastMode) {
    if (!selectedNode) return;
    
    const moveDistance = fastMode ? 10 : 2;
    const movements = {
        'ArrowUp': () => selectedNode.y -= moveDistance,
        'ArrowDown': () => selectedNode.y += moveDistance,
        'ArrowLeft': () => selectedNode.x -= moveDistance,
        'ArrowRight': () => selectedNode.x += moveDistance
    };
    
    if (movements[key]) {
        movements[key]();
        updateTree();
        saveCurrentTree();
    }
}

const KEY_HANDLERS = {
    'Delete': () => selectedNode ? deleteNode() : selectedLink ? deleteLink() : null,
    'Backspace': () => selectedNode ? deleteNode() : selectedLink ? deleteLink() : null
};

const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
            e.preventDefault();
            redo();
        }
    }
    
    if (KEY_HANDLERS[e.key]) {
        KEY_HANDLERS[e.key]();
    }
    
    if (selectedNode && ARROW_KEYS.includes(e.key)) {
        e.preventDefault();
        moveSelectedNode(e.key, e.ctrlKey || e.metaKey);
    }
});