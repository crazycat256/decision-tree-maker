const margin = { top: 40, right: 40, bottom: 40, left: 40 };
const width = window.innerWidth - margin.left - margin.right;
const height = window.innerHeight - margin.top - margin.bottom;

let graphData = {
    title: "Decision Tree",
    nodes: [
        {
            id: 1,
            text: "Root question",
            x: 0,
            y: -300
        }
    ],
    links: []
};

let currentNodeId = 1;
let selectedNode = null;
let selectedLink = null;

const svg = d3.select("#tree-container")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

const defs = svg.append("defs");

const rootStyles = getComputedStyle(document.documentElement);
const arrowFillColor = rootStyles.getPropertyValue('--color-link').trim();
const arrowSelectedColor = rootStyles.getPropertyValue('--color-arrow-selected').trim();

defs.append("marker")
    .attr("id", "arrowhead")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 9)
    .attr("refY", 0)
    .attr("orient", "auto")
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .append("path")
    .attr("d", "M3,-4L10,0L3,4L5,0Z")
    .attr("fill", arrowFillColor);

defs.append("marker")
    .attr("id", "arrowhead-selected")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 9)
    .attr("refY", 0)
    .attr("orient", "auto")
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .append("path")
    .attr("d", "M3,-4L10,0L3,4L5,0Z")
    .attr("fill", arrowSelectedColor);

const gridPattern = defs.append("pattern")
    .attr("id", "grid")
    .attr("width", 20)
    .attr("height", 20)
    .attr("patternUnits", "userSpaceOnUse");

gridPattern.append("path")
    .attr("d", "M 20 0 L 0 0 0 20")
    .attr("fill", "none")
    .attr("stroke", rootStyles.getPropertyValue('--color-grid-stroke').trim())
    .attr("stroke-width", 1.5);

const gridSize = 100000;
const gridBackground = svg.append("rect")
    .attr("x", -gridSize)
    .attr("y", -gridSize)
    .attr("width", gridSize * 2)
    .attr("height", gridSize * 2)
    .attr("fill", "url(#grid)");

const g = svg.append("g");

const linksGroup = g.append("g").attr("class", "links-group");
const nodesGroup = g.append("g").attr("class", "nodes-group");  
const buttonsGroup = g.append("g").attr("class", "buttons-group");
const titleGroup = g.append("g").attr("class", "title-group");

const zoom = d3.zoom()
    .scaleExtent([0.1, 3])
    .wheelDelta(function(event) {
        const delta = -event.deltaY * (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002);
        return event.ctrlKey || event.metaKey ? delta * 1.5 : delta * 0.75;
    })
    .filter(event => {
        if (event.type === 'wheel') return true;
        if (event.type === 'dblclick') return false;
        if (inlineEditor && inlineEditor.activeEditingElement) return false;
        return !event.target.closest('.node');
    })
    .on("zoom", (event) => {
        g.attr("transform", event.transform);
        gridBackground.attr("transform", event.transform);
    });

svg.call(zoom);

svg.on("click", function(event) {
    if (inlineEditor && inlineEditor.activeEditingElement) {
        return;
    }
    if (event.target === this || event.target.tagName === 'svg' || event.target.tagName === 'rect') {
        clearSelection();
    }
});

let isDraggingNewNode = false;
let draggedNodeData = null;
let tempNode = null;
let parentNodeData = null;

let isDraggingArrow = false;
let arrowSourceNode = null;
let tempArrow = null;

const PROXIMITY_THRESHOLD_X = 140;
const PROXIMITY_THRESHOLD_Y = 80;

d3.select("#tree-container").on("mouseleave", function() {
    buttonsGroup.selectAll(".node-buttons")
        .classed('node-buttons-visible', false);
});

svg.on("mousemove", function(event) {
    checkNodeProximity(event);
});

function updateTree() {
    updateLinks();
    updateNodes();
    updateNodeButtons();
    updateSelectionVisuals();
    updateTitle();
}

function updateLinks() {
    const links = linksGroup.selectAll(".link")
        .data(graphData.links);

    links.enter()
        .append("path")
        .attr("class", "link")
        .on("click", function(event, d) {
            event.stopPropagation();
            selectedLink = d;
            selectedNode = null;
            updateSelectionVisuals();
            const firstLabel = linksGroup.select(".link-label").node();
            if (firstLabel) {
                linksGroup.node().insertBefore(this, firstLabel);
            }
        })
        .on("dblclick", function(event, d) {
            event.stopPropagation();
            const linkLabel = linksGroup.selectAll(".link-label")
                .filter(labelData => labelData.source === d.source && labelData.target === d.target)
                .node();
            if (linkLabel) {
                editLinkLabelInline(linkLabel, d);
            }
        })
        .on("contextmenu", function(event, d) {
            event.preventDefault();
            selectedLink = d;
            selectedNode = null;
            updateSelectionVisuals();
            showContextMenu(event);
        })
        .merge(links)
        .attr("d", getLinkPath)
        .attr("marker-end", "url(#arrowhead)");

    links.exit().remove();

    const linkLabels = linksGroup.selectAll(".link-label")
        .data(graphData.links);

    const linkLabelEnter = linkLabels.enter()
        .append("foreignObject")
        .attr("class", "link-label");

    linkLabelEnter
        .on("click", function (event, d) {
            event.stopPropagation();
            selectedLink = d;
            selectedNode = null;
            updateSelectionVisuals();
        })
        .on("dblclick", function (event, d) {
            event.stopPropagation();
            editLinkLabelInline(this, d);
        })
        .on("contextmenu", function(event, d) {
            event.preventDefault();
            selectedLink = d;
            selectedNode = null;
            updateSelectionVisuals();
            showContextMenu(event);
        });

    linkLabelEnter.append("xhtml:input")
        .attr("type", "text")
        .attr("class", "edit-input link-edit-input")
        .style("pointer-events", "none")
        .property("readOnly", true);

    const linkLabelUpdate = linkLabelEnter.merge(linkLabels);

    linkLabelUpdate
        .on("click", function (event, d) {
            event.stopPropagation();
            selectedLink = d;
            selectedNode = null;
            updateSelectionVisuals();
        })
        .on("dblclick", function (event, d) {
            event.stopPropagation();
            editLinkLabelInline(this, d);
        })
        .on("contextmenu", function(event, d) {
            event.preventDefault();
            selectedLink = d;
            selectedNode = null;
            updateSelectionVisuals();
            showContextMenu(event);
        });

    linkLabelUpdate
        .attr("x", d => {
            const pos = getLabelPosition(d);
            const textWidth = getLinkLabelWidth(d.label || "");
            return pos.x - textWidth / 2;
        })
        .attr("y", d => getLabelPosition(d).y - 15)
        .attr("width", d => getLinkLabelWidth(d.label || ""))
        .attr("height", 30);

    linkLabelUpdate.select("input")
        .property("value", d => d.label || "");

    linkLabels.exit().remove();
}

function updateNodes() {
    const nodes = nodesGroup.selectAll(".node")
        .data(graphData.nodes);

    const nodeEnter = nodes.enter()
        .append("g")
        .attr("class", "node")
        .on("click", function(event, d) {
            event.stopPropagation();
            
            if (typeof cancelAllEditing === 'function' && selectedNode && selectedNode.id !== d.id) {
                cancelAllEditing();
            }
            
            selectedNode = d;
            selectedLink = null;
            updateSelectionVisuals();
            
            const clickedNodeButtons = buttonsGroup.selectAll(".node-buttons")
                .filter(buttonData => buttonData.id === d.id);
            if (!clickedNodeButtons.empty()) {
                clickedNodeButtons.raise();
            }
        })
        .on("dblclick", function(event, d) {
            event.stopPropagation();
            selectedNode = d;
            renameNodeInline(this, d);
        })
        .on("contextmenu", function(event, d) {
            event.preventDefault();
            selectedNode = d;
            showContextMenu(event);
        });

    nodeEnter.append("rect")
        .attr("class", "node-rect")
        .attr("x", -60)
        .attr("y", -25)
        .attr("width", 120)
        .attr("height", 50)
        .attr("rx", 6)
        .attr("ry", 6);

    nodeEnter
        .call(d3.drag()
            .clickDistance(8)
            .filter(function(event) {
                return !(inlineEditor && inlineEditor.activeEditingElement);
            })
            .on("start", function(event, d) {
                if (event.sourceEvent.detail > 1) return;
                dragStarted(event, d);
            })
            .on("drag", dragged)
            .on("end", dragEnded)
        );

    nodeEnter.append("foreignObject")
        .attr("class", "node-text-container")
        .attr("x", d => -getNodeWidth(d.text || 'Default') / 2)
        .attr("y", -25)
        .attr("width", d => getNodeWidth(d.text || 'Default'))
        .attr("height", 50)
        .append("xhtml:input")
        .attr("type", "text")
        .attr("class", "edit-input node-edit-input")
        .style("pointer-events", "none")
        .property("readOnly", true);

    createConnectionSpots(nodeEnter);

    const nodeUpdate = nodeEnter.merge(nodes);

    nodeUpdate
        .attr("transform", d => `translate(${d.x},${d.y})`);

    nodeUpdate.select(".node-rect")
        .attr("width", d => getNodeWidth(d.text || 'Default'))
        .attr("x", d => -getNodeWidth(d.text || 'Default') / 2);

    nodeUpdate.select(".node-text-container")
        .attr("x", d => -getNodeWidth(d.text || 'Default') / 2)
        .attr("width", d => getNodeWidth(d.text || 'Default'));

    nodeUpdate.select(".node-edit-input")
        .property("value", d => d.text);

    nodeUpdate.select(".spot-left")
        .attr("cx", d => -getNodeWidth(d.text || 'Default') / 2);

    nodeUpdate.select(".spot-right")
        .attr("cx", d => getNodeWidth(d.text || 'Default') / 2);

    nodes.exit().remove();

    updateNodeButtons();
    updateSelectionVisuals();
    updateTitle();
}

function createConnectionSpots(nodeEnter) {
    const spotRadius = 4;
    const spots = [
        { class: "spot-top", cx: 0, cy: -25 },
        { class: "spot-bottom", cx: 0, cy: 25 },
        { class: "spot-left", cx: d => -getNodeWidth(d.text || 'Default') / 2, cy: 0 },
        { class: "spot-right", cx: d => getNodeWidth(d.text || 'Default') / 2, cy: 0 }
    ];

    spots.forEach(spot => {
        nodeEnter.append("circle")
            .attr("class", `connection-spot ${spot.class}`)
            .attr("cx", spot.cx)
            .attr("cy", spot.cy)
            .attr("r", spotRadius);
    });
}

function updateNodeButtons() {
    const nodeButtons = buttonsGroup.selectAll(".node-buttons")
        .data(graphData.nodes);

    const nodeButtonsEnter = nodeButtons.enter()
        .append("g")
        .attr("class", "node-buttons");

    createActionButton(nodeButtonsEnter, "yes-button", 
        '<i class="fas fa-check"></i><span>Yes</span>', 60, 30, 
        (event, d) => startDragNewNode(event, d, 'Yes'));

    createActionButton(nodeButtonsEnter, "no-button", 
        '<i class="fas fa-times"></i><span>No</span>', 60, 30, 
        (event, d) => startDragNewNode(event, d, 'No'));

    createActionButton(nodeButtonsEnter, "arrow1-button", 
        '<i class="fas fa-arrow-left"></i>', 40, 30, 
        (event, d) => startDragArrow(event, d));

    createActionButton(nodeButtonsEnter, "arrow2-button", 
        '<i class="fas fa-arrow-right"></i>', 40, 30, 
        (event, d) => startDragArrow(event, d));

    const nodeButtonsUpdate = nodeButtonsEnter.merge(nodeButtons);

    nodeButtonsUpdate
        .attr("transform", d => `translate(${d.x}, ${d.y})`);

    nodeButtonsUpdate.select(".yes-button")
        .attr("transform", "translate(-40, 55)");

    nodeButtonsUpdate.select(".no-button")
        .attr("transform", "translate(40, 55)");

    nodeButtonsUpdate.select(".arrow1-button")
        .attr("transform", d => `translate(${-getNodeWidth(d.text || 'Default') / 2 - 40}, 0)`);

    nodeButtonsUpdate.select(".arrow2-button")
        .attr("transform", d => `translate(${getNodeWidth(d.text || 'Default') / 2 + 40}, 0)`);

    nodeButtons.exit().remove();
}

function createActionButton(parent, className, html, width, height, clickHandler) {
    const button = parent.append("g")
        .attr("class", `action-button ${className}`)
        .style("cursor", "pointer")
        .on("mousedown", function(event, d) {
            event.stopPropagation();
            event.preventDefault();
            clickHandler(event, d);
        });

    button.append("rect")
        .attr("x", -width / 2)
        .attr("y", -height / 2)
        .attr("width", width)
        .attr("height", height)
        .attr("rx", 5);

    button.append("foreignObject")
        .attr("x", -width / 2)
        .attr("y", -height / 2)
        .attr("width", width)
        .attr("height", height)
        .append("xhtml:div")
        .style("width", "100%")
        .style("height", "100%")
        .style("display", "flex")
        .style("align-items", "center")
        .style("justify-content", "center")
        .style("font-size", width > 50 ? "14px" : "16px")
        .style("font-weight", "500")
        .style("color", rootStyles.getPropertyValue('--color-text-muted').trim())
        .style("pointer-events", "none")
        .style("gap", "6px")
        .html(html);
}

function updateTitle() {
    const titleElement = titleGroup.selectAll(".tree-title")
        .data([graphData]);

    const titleEnter = titleElement.enter()
        .append("g")
        .attr("class", "tree-title")
        .on("dblclick", function(event, d) {
            event.stopPropagation();
            editTitleInline(this, d);
        });

    titleEnter.append("foreignObject")
        .attr("class", "title-text-container")
        .attr("y", -22)
        .attr("height", 50)
        .append("xhtml:input")
        .attr("type", "text")
        .attr("class", "edit-input title-edit-input")
        .style("pointer-events", "none")
        .property("readOnly", true);

    const titleUpdate = titleEnter.merge(titleElement);

    titleUpdate
        .attr("transform", `translate(0, -405)`);

    titleUpdate.select(".title-edit-input")
        .property("value", d => d.title || "Decision Tree");

    titleUpdate.select(".title-text-container")
        .attr("width", d => getTitleWidth(d.title || "Decision Tree"))
        .attr("x", d => -getTitleWidth(d.title || "Decision Tree") / 2);

    titleElement.exit().remove();
}

function editTitleInline(titleElement, d) {
    const currentText = d.title || 'Decision Tree';
    const titleContainer = d3.select(titleElement).select('.title-text-container');
    
    inlineEditor.enterEditMode(
        titleContainer,
        (newValue) => {
            const trimmedValue = newValue || 'Decision Tree';
            if (trimmedValue !== currentText) {
                saveState();
                d.title = trimmedValue;
                graphData.title = d.title;
            }
        },
        () => {
            updateTree();
            saveCurrentTree();
        },
        () => {
            const input = titleContainer.select('input').node();
            if (input) {
                const currentValue = input.value || 'Decision Tree';
                const newWidth = getTitleWidth(currentValue);
                titleContainer
                    .attr("width", newWidth)
                    .attr("x", -newWidth / 2);
            }
        }
    );
}

function centerOnRoot() {
    const rootNode = graphData.nodes.find(n => n.id === 1);
    if (rootNode) {
        const transform = d3.zoomIdentity
            .translate(width / 2 + margin.left, height / 2 + margin.top)
            .translate(-rootNode.x, -rootNode.y);
        svg.transition().duration(750).call(zoom.transform, transform);
    }
}

function resetZoom() {
    const transform = d3.zoomIdentity
        .translate(width / 2 + margin.left, height / 2 + margin.top);
    svg.call(zoom.transform, transform);
}

updateTree();
centerOnRoot();

document.addEventListener('DOMContentLoaded', () => {
    loadHistoryFromStorage();
    if (!loadCurrentTree()) {
        saveCurrentTree();
    }
});

document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);
document.getElementById('newTreeBtn').addEventListener('click', newTree);
document.getElementById('saveTreeBtn').addEventListener('click', saveTree);
document.getElementById('loadTreeBtn').addEventListener('click', loadTree);
document.getElementById('loadFromFileBtn').addEventListener('click', loadFromFile);
document.getElementById('exportTreeBtn').addEventListener('click', exportTree);
document.getElementById('exportPngBtn').addEventListener('click', exportPng);
document.getElementById('zoomInBtn').addEventListener('click', zoomIn);
document.getElementById('zoomOutBtn').addEventListener('click', zoomOut);
document.getElementById('resetZoomBtn').addEventListener('click', resetZoom);
document.getElementById('renameNodeBtn').addEventListener('click', () => {
    if (selectedNode) {
        renameNodeContextual();
    } else if (selectedLink) {
        renameLinkContextual();
    }
});
document.getElementById('deleteNodeBtn').addEventListener('click', () => {
    if (selectedNode) {
        deleteNode();
    } else if (selectedLink) {
        deleteLink();
    }
});

updateUndoRedoButtons();
resetZoom();