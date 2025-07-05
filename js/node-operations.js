

function deleteNode() {
    if (!selectedNode) return;

    saveState();
    
    graphData.nodes = graphData.nodes.filter(n => n.id !== selectedNode.id);

    graphData.links = graphData.links.filter(l => l.source !== selectedNode.id && l.target !== selectedNode.id);

    selectedNode = null;
    updateTree();
    saveCurrentTree();

    document.getElementById('contextMenu').classList.remove('visible');
}

function dragStarted(event, d) {
    if (event.dx === 0 && event.dy === 0) {
        return;
    }
    
    cancelAllEditing();
    
    saveState();
    const nodeElement = nodesGroup.selectAll(".node").filter(nodeData => nodeData.id === d.id);
    nodeElement.raise().classed("dragging", true);
    
    buttonsGroup.selectAll(".node-buttons")
        .filter(buttonData => buttonData.id === d.id)
        .classed('node-buttons-visible', false);
    
    event.sourceEvent.stopPropagation();
}

function dragged(event, d) {
    d.x = event.x;
    d.y = event.y;
    const nodeElement = nodesGroup.selectAll(".node").filter(nodeData => nodeData.id === d.id);
    nodeElement.attr("transform", `translate(${d.x},${d.y})`);

    buttonsGroup.selectAll(".node-buttons")
        .filter(buttonData => buttonData.id === d.id)
        .attr("transform", `translate(${d.x}, ${d.y})`);

    linksGroup.selectAll(".link").attr("d", linkData => {
        const sourceNode = graphData.nodes.find(n => n.id === linkData.source);
        const targetNode = graphData.nodes.find(n => n.id === linkData.target);
        return (!sourceNode || !targetNode) ? "" : createBezierPath(sourceNode, targetNode).path;
    });

    linksGroup.selectAll(".link-label")
        .attr("x", linkData => {
            const pos = getLabelPosition(linkData);
            const textWidth = getLinkLabelWidth(linkData.label || "");
            return pos.x - textWidth / 2;
        })
        .attr("y", linkData => getLabelPosition(linkData).y - 15)
        .attr("width", linkData => getLinkLabelWidth(linkData.label || ""));
}

function dragEnded(event, d) {
    const nodeElement = nodesGroup.selectAll(".node").filter(nodeData => nodeData.id === d.id);
    nodeElement.classed("dragging", false);
    saveCurrentTree();
}

function renameNodeInline(nodeElement, d) {
    const currentText = d.text;
    const textContainer = d3.select(nodeElement).select('.node-text-container');

    inlineEditor.enterEditMode(
        textContainer,
        (newValue) => {
            if (newValue && newValue !== currentText) {
                saveState();
                d.text = newValue;
            }
        },
        () => {
            updateTree();
            saveCurrentTree();
        },
        () => {
            const input = textContainer.select('input').node();
            if (input) {
                const currentValue = input.value || 'Default';
                d.text = currentValue;
                
                const newWidth = getNodeWidth(currentValue);
                const nodeSelection = d3.select(nodeElement);
                
                nodeSelection.select('.node-rect')
                    .attr("width", newWidth)
                    .attr("x", -newWidth / 2);
                
                textContainer
                    .attr("width", newWidth)
                    .attr("x", -newWidth / 2);
                
                nodeSelection.select('.spot-left')
                    .attr("cx", -newWidth / 2);
                
                nodeSelection.select('.spot-right')
                    .attr("cx", newWidth / 2);
                
                updateLinks();
            }
        }
    );
}

function renameNodeContextual() {
    if (!selectedNode) return;

    document.getElementById('contextMenu').classList.remove('visible');

    const nodeElement = nodesGroup.selectAll('.node')
        .filter(d => d.id === selectedNode.id)
        .node();

    if (nodeElement) {
        const nodeData = d3.select(nodeElement).datum();
        renameNodeInline(nodeElement, nodeData);
    }
}

function startDragNewNode(event, parentNode, responseType) {
    cancelAllEditing();
    
    isDraggingNewNode = true;
    parentNodeData = parentNode;

    const newNodeData = {
        id: currentNodeId + 1,
        text: 'New question',
        x: 0,
        y: 0,
        parentResponse: responseType
    };

    draggedNodeData = newNodeData;

    const mousePos = d3.pointer(event, g.node());

    tempNode = g.append("g")
        .attr("class", "temp-node-group");

    const tempLink = tempNode.append("path")
        .attr("class", "temp-link");

    const tempLabel = tempNode.append("text")
        .attr("class", "temp-label")
        .text(responseType);

    const tempNodeElement = tempNode.append("g")
        .attr("class", "temp-node")
        .attr("transform", `translate(${mousePos[0]}, ${mousePos[1]})`);

    const tempRectWidth = Math.max(120, measureTextWidth(newNodeData.text) + 40);

    tempNodeElement.append("rect")
        .attr("class", "node-rect")
        .attr("x", -tempRectWidth / 2)
        .attr("y", -25)
        .attr("width", tempRectWidth)
        .attr("height", 50)
        .attr("rx", 6)
        .attr("ry", 6);

    tempNodeElement.append("text")
        .attr("class", "node-text")
        .attr("dy", "0.1em")
        .text(newNodeData.text);

    updateTempLink(tempLink, tempLabel, parentNodeData, mousePos);

    d3.select("body")
        .on("mousemove.drag", dragNewNode)
        .on("mouseup.drag", endDragNewNode);
}

function updateTempLink(linkElement, labelElement, parentNodeData, mousePos) {
    const tempTargetNode = { x: mousePos[0], y: mousePos[1] };
    const bezier = createBezierPath(parentNodeData, tempTargetNode);

    linkElement
        .attr("d", bezier.path)
        .attr("marker-end", "url(#arrowhead)");

    const labelPos = getPointOnBezierCurve(bezier.sourcePos, bezier.sourceControl, bezier.targetControl, bezier.targetPos, 0.5);
    labelElement
        .attr("x", labelPos.x)
        .attr("y", labelPos.y);
}

function dragNewNode(event) {
    if (!isDraggingNewNode || !tempNode) return;

    const mousePos = d3.pointer(event, g.node());

    tempNode.select(".temp-node").attr("transform", `translate(${mousePos[0]}, ${mousePos[1]})`);

    if (parentNodeData) {
        updateTempLink(tempNode.select(".temp-link"), tempNode.select(".temp-label"), parentNodeData, mousePos);
    }
}

function endDragNewNode(event) {
    if (!isDraggingNewNode) return;

    isDraggingNewNode = false;

    const finalMousePos = d3.pointer(event, g.node());

    if (tempNode) {
        tempNode.remove();
        tempNode = null;
    }

    d3.select("body")
        .on("mousemove.drag", null)
        .on("mouseup.drag", null);

    if (draggedNodeData && parentNodeData) {
        saveState();
        
        draggedNodeData.x = finalMousePos[0];
        draggedNodeData.y = finalMousePos[1];

        currentNodeId++;
        graphData.nodes.push(draggedNodeData);
        graphData.links.push({
            source: parentNodeData.id,
            target: draggedNodeData.id,
            label: draggedNodeData.parentResponse
        });

        updateTree();
        saveCurrentTree();
    }

    draggedNodeData = null;
    parentNodeData = null;
}