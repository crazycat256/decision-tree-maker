function zoomIn() {
    svg.call(zoom.scaleBy, 1.2);
}

function zoomOut() {
    svg.call(zoom.scaleBy, 0.8);
}

function saveTree() {
    showModal('saveTreeModal');
    updateSavedTreesList();
}

function loadTree() {
    showModal('loadTreeModal');
    updateLoadTreesList();
}

function loadFromFile() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            showFileConfirmation(e.target.files[0]);
        }
    });
    
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
}

function newTree() {
    showModal('newTreeModal');
}

function exportTree() {
    const dataStr = JSON.stringify(graphData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = (graphData.title || 'decision_tree')
        .replace(/\s+/g, '_').replace(/[^\w\-_.]/g, '')
        .replace(/_+/g, '_').replace(/^_|_$/g, '');
    a.download = `${fileName}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function exportPng() {
    try {
        const svgElement = d3.select("#tree-container svg").node();
        const gElement = d3.select("#tree-container svg g").node();
        
        if (!svgElement || !gElement) {
            alert('No tree to export');
            return;
        }
        
        const bbox = gElement.getBBox();
        const padding = 100;
                
        const svgClone = svgElement.cloneNode(true);
        
        const currentStyle = window.getComputedStyle(document.documentElement);
        const bgWhite = currentStyle.getPropertyValue('--color-bg-white').trim();
        
        svgClone.setAttribute('width', bbox.width + padding * 2);
        svgClone.setAttribute('height', bbox.height + padding * 2);
        svgClone.setAttribute('viewBox', `0 0 ${bbox.width + padding * 2} ${bbox.height + padding * 2}`);
        
        const clonedG = svgClone.querySelector('g');
        if (clonedG) {
            clonedG.setAttribute('transform', `translate(${padding - bbox.x}, ${padding - bbox.y})`);
        }
        
        const gridBackground = svgClone.querySelector('rect[fill="url(#grid)"]');
        if (gridBackground) {
            gridBackground.remove();
        }
        
        const buttons = svgClone.querySelectorAll('.node-buttons, .action-button');
        buttons.forEach(button => button.remove());
        
        const spots = svgClone.querySelectorAll('.connection-spot');
        spots.forEach(spot => spot.remove());
        
        const tempElements = svgClone.querySelectorAll('.temp-node-group, .temp-arrow-group');
        tempElements.forEach(element => element.remove());
        
        const selectedElements = svgClone.querySelectorAll('.selected');
        selectedElements.forEach(element => element.classList.remove('selected'));
        
        const draggingElements = svgClone.querySelectorAll('.dragging');
        draggingElements.forEach(element => element.classList.remove('dragging'));
        
        const foreignObjects = svgClone.querySelectorAll('foreignObject');
        foreignObjects.forEach(fo => {
            const input = fo.querySelector('input');
            if (input && input.value.trim()) {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', parseFloat(fo.getAttribute('x')) + parseFloat(fo.getAttribute('width')) / 2);
                text.setAttribute('y', parseFloat(fo.getAttribute('y')) + parseFloat(fo.getAttribute('height')) / 2);
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('dominant-baseline', 'middle');
                
                if (fo.classList.contains('node-text-container')) {
                    text.setAttribute('font-size', '13px');
                    text.setAttribute('font-weight', '500');
                    text.setAttribute('fill', currentStyle.getPropertyValue('--color-text-primary').trim());
                } else if (fo.classList.contains('title-text-container')) {
                    text.setAttribute('font-size', '36px');
                    text.setAttribute('font-weight', '600');
                    text.setAttribute('fill', currentStyle.getPropertyValue('--color-text-primary').trim());
                } else if (fo.classList.contains('link-label')) {
                    text.setAttribute('font-size', '13px');
                    text.setAttribute('font-weight', '600');
                    text.setAttribute('fill', currentStyle.getPropertyValue('--color-text-secondary').trim());
                }
                
                text.setAttribute('font-family', 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif');
                text.textContent = input.value.trim();
                
                fo.parentNode.replaceChild(text, fo);
            } else {
                fo.remove();
            }
        });
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            .node-rect { fill: ${bgWhite}; stroke: ${currentStyle.getPropertyValue('--color-text-muted').trim()}; stroke-width: 2; filter: none; }
            .node-text { fill: ${currentStyle.getPropertyValue('--color-text-primary').trim()}; font-size: 13px; font-weight: 500; text-anchor: middle; dominant-baseline: middle; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            .link { fill: none; stroke: ${currentStyle.getPropertyValue('--color-link').trim()}; stroke-width: 2; opacity: 0.8; }
            .link-label { fill: ${currentStyle.getPropertyValue('--color-text-secondary').trim()}; font-size: 13px; font-weight: 600; text-anchor: middle; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            .title-text { fill: ${currentStyle.getPropertyValue('--color-text-primary').trim()}; font-size: 36px; font-weight: 600; text-anchor: middle; dominant-baseline: middle; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            .edit-input { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; border: none; background: transparent; text-align: center; outline: none; }
            .node-edit-input { font-size: 13px; font-weight: 500; color: ${currentStyle.getPropertyValue('--color-text-primary').trim()}; }
            .title-edit-input { font-size: 36px; font-weight: 600; color: ${currentStyle.getPropertyValue('--color-text-primary').trim()}; }
            .link-edit-input { font-size: 13px; font-weight: 600; color: ${currentStyle.getPropertyValue('--color-text-secondary').trim()}; }
        `;
        
        const defs = svgClone.querySelector('defs');
        if (defs) {
            defs.appendChild(styleSheet);
        } else {
            svgClone.insertBefore(styleSheet, svgClone.firstChild);
        }
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        const scale = 2;
        const finalWidth = bbox.width + padding * 2;
        const finalHeight = bbox.height + padding * 2;
        
        canvas.width = finalWidth * scale;
        canvas.height = finalHeight * scale;
        ctx.scale(scale, scale);
        
        ctx.fillStyle = bgWhite;
        ctx.fillRect(0, 0, finalWidth, finalHeight);
        
        const svgString = new XMLSerializer().serializeToString(svgClone);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        img.onload = function() {
            try {
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob(function(blob) {
                    if (blob) {
                        const downloadUrl = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = downloadUrl;
                        const fileName = (graphData.title || 'decision_tree')
                            .replace(/\s+/g, '_').replace(/[^\w\-_.]/g, '')
                            .replace(/_+/g, '_').replace(/^_|_$/g, '');
                        a.download = `${fileName}.png`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(downloadUrl);
                    } else {
                        alert('Error creating PNG file');
                    }
                    URL.revokeObjectURL(url);
                }, 'image/png', 0.95);
            } catch (drawError) {
                console.error('Error drawing to canvas:', drawError);
                alert('Error generating PNG: ' + drawError.message);
                URL.revokeObjectURL(url);
            }
        };
        
        img.onerror = function(e) {
            console.error('Error loading SVG into image:', e);
            alert('Error loading SVG for PNG export');
            URL.revokeObjectURL(url);
        };
        
        img.src = url;
        
    } catch (error) {
        console.error('Error exporting PNG:', error);
        alert('Error exporting PNG: ' + error.message);
    }
}

function getMaxId(graphData) {
    let maxId = 0;
    graphData.nodes.forEach(node => {
        maxId = Math.max(maxId, node.id);
    });
    return maxId;
}

function saveCurrentTree() {
    const currentTreeData = {
        title: graphData.title || "Decision Tree",
        nodes: JSON.parse(JSON.stringify(graphData.nodes)),
        links: JSON.parse(JSON.stringify(graphData.links)),
        currentNodeId: currentNodeId,
        lastModified: new Date().toISOString()
    };
    localStorage.setItem('currentDecisionTree', JSON.stringify(currentTreeData));
}

function loadCurrentTree() {
    try {
        const savedTree = localStorage.getItem('currentDecisionTree');
        if (savedTree) {
            const treeData = JSON.parse(savedTree);
            
            if (treeData.nodes && Array.isArray(treeData.nodes) && treeData.nodes.length > 0) {
                graphData = {
                    title: treeData.title || "Decision Tree",
                    nodes: treeData.nodes,
                    links: treeData.links || []
                };
                currentNodeId = treeData.currentNodeId || getMaxId(graphData);
                
                selectedNode = null;
                selectedLink = null;
                
                updateTree();
                
                return true;
            }
        }
    } catch (error) {
        console.warn('Error loading current tree from localStorage:', error);
    }
    return false;
}

function showModal(modalId) {
    const overlay = document.getElementById('modalOverlay');
    const modal = document.getElementById(modalId);
    overlay.style.display = 'flex';
    modal.style.display = 'block';
    
    const firstInput = modal.querySelector('input[type="text"], textarea');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
    }
}

function hideModal(modalId) {
    const overlay = document.getElementById('modalOverlay');
    const modal = document.getElementById(modalId);
    overlay.style.display = 'none';
    modal.style.display = 'none';
}

function updateSavedTreesList() {
    const savedTrees = JSON.parse(localStorage.getItem('decisionTrees') || '{}');
    const listContainer = document.getElementById('savedTreesList');
    
    listContainer.innerHTML = '';
    
    const treeNames = Object.keys(savedTrees);
    if (treeNames.length === 0) {
        listContainer.innerHTML = '<p>No saved trees found.</p>';
        return;
    }
    
    treeNames.forEach(name => {
        const treeItem = document.createElement('div');
        treeItem.className = 'saved-tree-item clickable';
        
        const treeNameSpan = document.createElement('span');
        treeNameSpan.className = 'tree-name';
        treeNameSpan.textContent = name;
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn btn-danger btn-sm';
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.addEventListener('click', () => deleteTree(name, updateSavedTreesList));
        
        treeItem.appendChild(treeNameSpan);
        treeItem.appendChild(deleteButton);
        
        treeItem.addEventListener('click', (e) => {
            if (!e.target.closest('.btn')) {
                document.getElementById('saveTreeName').value = name;
                checkNameWarning();
            }
        });
        
        listContainer.appendChild(treeItem);
    });
}

function updateLoadTreesList() {
    const savedTrees = JSON.parse(localStorage.getItem('decisionTrees') || '{}');
    const listContainer = document.getElementById('loadTreesList');
    
    listContainer.innerHTML = '';
    
    const treeNames = Object.keys(savedTrees);
    if (treeNames.length === 0) {
        listContainer.innerHTML = '<p>No saved trees found.</p>';
        return;
    }
    
    treeNames.forEach(name => {
        const treeItem = document.createElement('div');
        treeItem.className = 'load-tree-item';
        
        const treeInfo = document.createElement('div');
        treeInfo.className = 'tree-info';
        
        const treeName = document.createElement('span');
        treeName.className = 'tree-name';
        treeName.textContent = name;
        
        const treeNodes = document.createElement('span');
        treeNodes.className = 'tree-nodes';
        treeNodes.textContent = `${savedTrees[name].nodes.length} nodes`;
        
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.gap = '8px';
        
        const loadButton = document.createElement('button');
        loadButton.className = 'btn btn-primary';
        loadButton.textContent = 'Load';
        loadButton.addEventListener('click', () => loadSavedTree(name));
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn btn-danger btn-sm';
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.title = 'Delete tree';
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTree(name, updateLoadTreesList);
        });
        
        buttonsContainer.appendChild(loadButton);
        buttonsContainer.appendChild(deleteButton);
        
        treeInfo.appendChild(treeName);
        treeInfo.appendChild(treeNodes);
        treeItem.appendChild(treeInfo);
        treeItem.appendChild(buttonsContainer);
        listContainer.appendChild(treeItem);
    });
}

function loadSavedTree(treeName) {
    const savedTrees = JSON.parse(localStorage.getItem('decisionTrees') || '{}');
    if (savedTrees[treeName]) {
        saveState();
        graphData = JSON.parse(JSON.stringify(savedTrees[treeName]));
        if (!graphData.title) {
            graphData.title = "Decision Tree";
        }
        currentNodeId = getMaxId(graphData);
        selectedNode = null;
        selectedLink = null;
        updateTree();
        saveCurrentTree();
        hideModal('loadTreeModal');
    }
}

function deleteTree(treeName, updateCallback) {
    if (confirm(`Delete tree "${treeName}"?`)) {
        const savedTrees = JSON.parse(localStorage.getItem('decisionTrees') || '{}');
        delete savedTrees[treeName];
        localStorage.setItem('decisionTrees', JSON.stringify(savedTrees));
        updateCallback();
    }
}

function confirmNewTree() {
    const rootQuestion = document.getElementById('newTreeRootQuestion').value.trim();
    const treeTitle = document.getElementById('newTreeTitle').value.trim();
    
    saveState();
    graphData = {
        title: treeTitle || "Decision Tree",
        nodes: [
            {
                id: 1,
                text: rootQuestion || "Root question",
                x: 0,
                y: -300
            }
        ],
        links: []
    };
    currentNodeId = 1;
    selectedNode = null;
    selectedLink = null;
    updateTree();
    saveCurrentTree();
    resetZoom();
    
    document.getElementById('newTreeRootQuestion').value = '';
    document.getElementById('newTreeTitle').value = '';
    hideModal('newTreeModal');
}

function confirmSaveTree() {
    const treeName = document.getElementById('saveTreeName').value.trim();
    
    if (!treeName) {
        alert('Please enter a tree name.');
        return;
    }
    
    const savedTrees = JSON.parse(localStorage.getItem('decisionTrees') || '{}');
    
    if (savedTrees[treeName]) {
        if (!confirm(`Tree "${treeName}" already exists. Overwrite?`)) {
            return;
        }
    }
    
    const treeData = JSON.parse(JSON.stringify(graphData));
    treeData.savedAt = new Date().toISOString();
    
    savedTrees[treeName] = treeData;
    localStorage.setItem('decisionTrees', JSON.stringify(savedTrees));
    
    document.getElementById('saveTreeName').value = '';
    hideModal('saveTreeModal');
}

function checkNameWarning() {
    const treeName = document.getElementById('saveTreeName').value.trim();
    const savedTrees = JSON.parse(localStorage.getItem('decisionTrees') || '{}');
    const warningElement = document.getElementById('nameWarning');
    
    if (treeName && savedTrees[treeName]) {
        warningElement.style.display = 'block';
    } else {
        warningElement.style.display = 'none';
    }
}

function handleFileLoad(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const loadedData = JSON.parse(e.target.result);
            
            if (!loadedData.nodes || !Array.isArray(loadedData.nodes)) {
                throw new Error('Invalid tree format');
            }
            
            saveState();
            graphData = loadedData;
            currentNodeId = getMaxId(graphData);
            selectedNode = null;
            selectedLink = null;
            updateTree();
            saveCurrentTree();
            hideModal('fileConfirmationModal');
        } catch (error) {
            alert('Error loading file: ' + error.message);
        }
    };
    reader.readAsText(file);
}

function showFileConfirmation(file) {
    if (file.type !== 'application/json') {
        alert('Please select a JSON file.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const fileData = JSON.parse(e.target.result);
            
            if (!fileData.nodes || !Array.isArray(fileData.nodes)) {
                throw new Error('Invalid tree format');
            }
            
            window.selectedFile = file;
            
            document.getElementById('selectedFileName').textContent = file.name;
            document.getElementById('selectedFileTitle').textContent = fileData.title || 'Decision Tree';
            document.getElementById('selectedFileNodes').textContent = fileData.nodes.length;
            document.getElementById('selectedFileLinks').textContent = (fileData.links || []).length;
            
            showModal('fileConfirmationModal');
        } catch (error) {
            alert('Error reading file: ' + error.message);
        }
    };
    reader.readAsText(file);
}

function confirmFileLoad() {
    if (window.selectedFile) {
        handleFileLoad(window.selectedFile);
        window.selectedFile = null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = btn.getAttribute('data-modal');
            if (modalId) {
                hideModal(modalId);
            }
        });
    });
    
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'modalOverlay') {
            document.querySelectorAll('.modal').forEach(modal => {
                if (modal.style.display === 'block') {
                    hideModal(modal.id);
                }
            });
        }
    });
    
    document.getElementById('confirmNewTree').addEventListener('click', confirmNewTree);
    document.getElementById('confirmSaveTree').addEventListener('click', confirmSaveTree);
    document.getElementById('confirmFileLoad').addEventListener('click', confirmFileLoad);
    
    const saveTreeNameInput = document.getElementById('saveTreeName');
    if (saveTreeNameInput) {
        saveTreeNameInput.addEventListener('input', checkNameWarning);
    }
    checkNameWarning();
    
    setupGlobalDragDrop();
});

function setupGlobalDragDrop() {
    let dragCounter = 0;
    
    document.addEventListener('dragenter', (e) => {
        if (inlineEditor && inlineEditor.activeEditingElement) return;
        e.preventDefault();
        dragCounter++;
        if (dragCounter === 1) {
            document.body.classList.add('drag-active');
        }
    });
    
    document.addEventListener('dragleave', (e) => {
        if (inlineEditor && inlineEditor.activeEditingElement) return;
        e.preventDefault();
        dragCounter--;
        if (dragCounter === 0) {
            document.body.classList.remove('drag-active');
        }
    });
    
    document.addEventListener('dragover', (e) => {
        if (inlineEditor && inlineEditor.activeEditingElement) return;
        e.preventDefault();
    });
    
    document.addEventListener('drop', (e) => {
        if (inlineEditor && inlineEditor.activeEditingElement) return;
        e.preventDefault();
        dragCounter = 0;
        document.body.classList.remove('drag-active');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            showFileConfirmation(file);
        }
    });
}