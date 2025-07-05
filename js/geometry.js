function getBestConnectionSpots(sourceNode, targetNode) {
    const allowedSourceSpots = ['left', 'bottom', 'right'];
    const allowedTargetSpots = ['left', 'top', 'right'];

    const deltaX = targetNode.x - sourceNode.x;
    const deltaY = targetNode.y - sourceNode.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (sourceNode.y < targetNode.y) {
        const ratio = absDeltaY / (absDeltaX + 1);

        const VERTICAL_THRESHOLD = 0.35;
        if (ratio > VERTICAL_THRESHOLD) {
            return {
                sourceSpot: 'bottom',
                targetSpot: 'top'
            };
        }
    }

    const combinations = [];

    for (const sourceSpot of allowedSourceSpots) {
        for (const targetSpot of allowedTargetSpots) {
            if (sourceSpot === 'bottom' && targetNode.y < sourceNode.y) {
                continue;
            }

            const sourcePos = getSpotPosition(sourceNode, sourceSpot);
            const targetPos = getSpotPosition(targetNode, targetSpot);

            const distance = Math.sqrt(
                Math.pow(targetPos.x - sourcePos.x, 2) +
                Math.pow(targetPos.y - sourcePos.y, 2)
            );

            let directionBonus = 0;
            
            if (deltaX < 0) {
                if (sourceSpot === 'right' && targetSpot === 'right') {
                    directionBonus = -50;
                }
            } else if (deltaX > 0) {
                if (sourceSpot === 'left' && targetSpot === 'left') {
                    directionBonus = -50;
                }
            }

            combinations.push({
                sourceSpot,
                targetSpot,
                distance: distance + directionBonus,
                sourcePos,
                targetPos
            });
        }
    }

    combinations.sort((a, b) => a.distance - b.distance);
    const best = combinations[0];

    if (targetNode.text === 'Virtual') {
        const oppositeSpots = {
            'left': 'right',
            'right': 'left',
            'top': 'bottom',
            'bottom': 'top'
        };
        return {
            sourceSpot: best.sourceSpot,
            targetSpot: oppositeSpots[best.sourceSpot] || 'right'
        };
    }

    return {
        sourceSpot: best.sourceSpot,
        targetSpot: best.targetSpot
    };
}

function getSpotPosition(node, spot) {
    if (node.text === 'Virtual') {
        return { x: node.x, y: node.y };
    }
    
    const nodeHalfWidth = getNodeWidth(node.text || 'Default') / 2;

    const spotPositions = {
        'top': { x: node.x, y: node.y - 25 },
        'bottom': { x: node.x, y: node.y + 25 },
        'left': { x: node.x - nodeHalfWidth, y: node.y },
        'right': { x: node.x + nodeHalfWidth, y: node.y }
    };
    return spotPositions[spot];
}

function getPointOnBezierCurve(p0, p1, p2, p3, t) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    return {
        x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
        y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
    };
}

function createBezierPath(sourceNode, targetNode) {
    const { sourceSpot, targetSpot } = getBestConnectionSpots(sourceNode, targetNode);
    const sourcePos = getSpotPosition(sourceNode, sourceSpot);
    const targetPos = getSpotPosition(targetNode, targetSpot);

    const distance = 80;
    const spotDirections = {
        'top': { x: 0, y: -distance },
        'bottom': { x: 0, y: distance },
        'left': { x: -distance, y: 0 },
        'right': { x: distance, y: 0 }
    };

    const sourceControl = {
        x: sourcePos.x + spotDirections[sourceSpot].x,
        y: sourcePos.y + spotDirections[sourceSpot].y
    };

    const targetControl = {
        x: targetPos.x + spotDirections[targetSpot].x,
        y: targetPos.y + spotDirections[targetSpot].y
    };

    return {
        path: `M ${sourcePos.x},${sourcePos.y} C ${sourceControl.x},${sourceControl.y} ${targetControl.x},${targetControl.y} ${targetPos.x},${targetPos.y}`,
        sourcePos,
        targetPos,
        sourceControl,
        targetControl
    };
}

function getLabelPositionOnCurve(sourceNode, targetNode) {
    const bezier = createBezierPath(sourceNode, targetNode);
    return getPointOnBezierCurve(bezier.sourcePos, bezier.sourceControl, bezier.targetControl, bezier.targetPos, 0.5);
}

function findNodeAtPosition(x, y) {
    return graphData.nodes.find(node => {
        const nodeWidth = getNodeWidth(node.text || 'Default');
        const nodeHalfWidth = nodeWidth / 2;

        const withinX = x >= (node.x - nodeHalfWidth) && x <= (node.x + nodeHalfWidth);
        const withinY = y >= (node.y - 25) && y <= (node.y + 25);

        return withinX && withinY;
    });
}

function measureTextWidth(text, fontSize = 13, fontFamily = 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif') {
    if (!text) return 0;
    
    let canvas = measureTextWidth.canvas;
    if (!canvas) {
        canvas = measureTextWidth.canvas = document.createElement('canvas');
    }
    
    const context = canvas.getContext('2d');
    context.font = `${fontSize}px ${fontFamily}`;
    
    return context.measureText(text).width;
}

function getNodeWidth(nodeText) {
    const textWidth = measureTextWidth(nodeText);
    return Math.max(120, textWidth + 40);
}

function getLinkPath(d) {
    const sourceNode = graphData.nodes.find(n => n.id === d.source);
    const targetNode = graphData.nodes.find(n => n.id === d.target);
    return (!sourceNode || !targetNode) ? "" : createBezierPath(sourceNode, targetNode).path;
}

const linkLabelOffset = 10;

function getLabelPosition(d) {
    const sourceNode = graphData.nodes.find(n => n.id === d.source);
    const targetNode = graphData.nodes.find(n => n.id === d.target);
    if (!sourceNode || !targetNode) return { x: 0, y: 0 };
    const position = getLabelPositionOnCurve(sourceNode, targetNode);
    return { x: position.x, y: position.y - linkLabelOffset };
}

function getTitleWidth(titleText) {
    const textWidth = measureTextWidth(titleText, 36, 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif');
    return Math.max(300, textWidth + 80);
}

function getLinkLabelWidth(labelText) {
    const textWidth = measureTextWidth(labelText, 13, 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif');
    return Math.max(60, textWidth + 20);
}