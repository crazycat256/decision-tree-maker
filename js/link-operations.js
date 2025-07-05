function deleteLink() {
    if (!selectedLink) return;

    saveState();

    graphData.links = graphData.links.filter(l =>
        !(l.source === selectedLink.source && l.target === selectedLink.target));

    selectedLink = null;
    updateTree();
    saveCurrentTree();

    document.getElementById('contextMenu').classList.remove('visible');
}

function editLinkLabelInline(labelElement, d) {
    const currentText = d.label || '';
    const labelContainer = d3.select(labelElement);

    inlineEditor.enterEditMode(
        labelContainer,
        (newValue) => {
            if (newValue !== (d.label || '')) {
                saveState();
                d.label = newValue;
            }
        },
        () => {
            updateTree();
            saveCurrentTree();
        },
        () => {
            const input = labelContainer.select('input').node();
            if (input) {
                const currentValue = input.value || '';
                const newWidth = getLinkLabelWidth(currentValue);
                const pos = getLabelPosition(d);
                labelContainer
                    .attr("width", newWidth)
                    .attr("x", pos.x - newWidth / 2);
            }
        }
    );
}

function startDragArrow(event, sourceNode) {
    isDraggingArrow = true;
    arrowSourceNode = sourceNode;

    const mousePos = d3.pointer(event, g.node());

    tempArrow = g.append("g")
        .attr("class", "temp-arrow-group");

    const tempLink = tempArrow.append("path")
        .attr("class", "temp-arrow-link");

    const tempLabel = tempArrow.append("text")
        .attr("class", "temp-arrow-label")
        .text("Link");

    updateTempArrow(tempLink, tempLabel, sourceNode, mousePos);

    d3.select("body")
        .on("mousemove.arrow", dragArrow)
        .on("mouseup.arrow", endDragArrow);
}

function updateTempArrow(linkElement, labelElement, sourceNode, mousePos) {
    const hoveredNode = findNodeAtPosition(mousePos[0], mousePos[1]);
    let targetNode;
    
    if (hoveredNode && hoveredNode.id !== sourceNode.id) {
        targetNode = hoveredNode;
    } else {
        targetNode = { 
            x: mousePos[0], 
            y: mousePos[1],
            text: 'Virtual'
        };
    }

    const bezier = createBezierPath(sourceNode, targetNode);

    linkElement
        .attr("d", bezier.path)
        .attr("marker-end", "url(#arrowhead)");

    const labelPos = getPointOnBezierCurve(bezier.sourcePos, bezier.sourceControl, bezier.targetControl, bezier.targetPos, 0.5);
    labelElement
        .attr("x", labelPos.x)
        .attr("y", labelPos.y);
}

function dragArrow(event) {
    if (!isDraggingArrow || !tempArrow) return;

    const mousePos = d3.pointer(event, g.node());

    if (arrowSourceNode) {
        updateTempArrow(tempArrow.select(".temp-arrow-link"), tempArrow.select(".temp-arrow-label"), arrowSourceNode, mousePos);
    }
}

function endDragArrow(event) {
    if (!isDraggingArrow) return;

    isDraggingArrow = false;

    const finalMousePos = d3.pointer(event, g.node());

    if (tempArrow) {
        tempArrow.remove();
        tempArrow = null;
    }

    d3.select("body")
        .on("mousemove.arrow", null)
        .on("mouseup.arrow", null);

    const targetNode = findNodeAtPosition(finalMousePos[0], finalMousePos[1]);

    if (targetNode && arrowSourceNode && targetNode.id !== arrowSourceNode.id) {
        const existingLink = graphData.links.find(l =>
            l.source === arrowSourceNode.id && l.target === targetNode.id
        );

        if (!existingLink) {
            saveState();
            
            graphData.links.push({
                source: arrowSourceNode.id,
                target: targetNode.id,
                label: 'Link'
            });

            updateTree();
            saveCurrentTree();
        }
    }

    arrowSourceNode = null;
}

function renameLinkContextual() {
    if (!selectedLink) return;

    document.getElementById('contextMenu').classList.remove('visible');

    const linkLabel = linksGroup.selectAll(".link-label")
        .filter(labelData => labelData.source === selectedLink.source && labelData.target === selectedLink.target)
        .node();

    if (linkLabel) {
        editLinkLabelInline(linkLabel, selectedLink);
    }
}