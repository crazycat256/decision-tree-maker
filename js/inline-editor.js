class InlineEditor {
    constructor() {
        this.activeEditingElement = null;
        this.originalHandlers = new Map();
    }

    cancelAllEditing() {
        if (this.activeEditingElement) {
            this.exitEditMode(this.activeEditingElement, false);
        }
    }

    enterEditMode(foreignObject, onSave, onComplete, onInput) {
        this.cancelAllEditing();
        
        const input = foreignObject.select('input');
        if (input.empty()) return;

        this.activeEditingElement = foreignObject;
        
        const originalDblClickHandler = foreignObject.on('dblclick');
        this.originalHandlers.set(foreignObject.node(), originalDblClickHandler);
        
        buttonsGroup.selectAll(".node-buttons").classed('node-buttons-visible', false);
        
        input
            .style('pointer-events', 'auto')
            .style('user-select', 'text')
            .style('-webkit-user-select', 'text')
            .style('-moz-user-select', 'text')
            .style('-ms-user-select', 'text')
            .property('readOnly', false);

        foreignObject.on('dblclick', function(event) {
            event.stopPropagation();
            event.preventDefault();
        });

        const setupListeners = () => {
            input.on('blur', () => {
                setTimeout(() => {
                    if (this.activeEditingElement === foreignObject) {
                        this.exitEditMode(foreignObject, true, onSave, onComplete);
                    }
                }, 100);
            });

            input.on('keydown', (event) => {
                event.stopPropagation();
                if (['Enter', 'Escape', 'Tab'].includes(event.key)) {
                    event.preventDefault();
                    this.exitEditMode(foreignObject, event.key !== 'Escape', onSave, onComplete);
                }
            });

            if (onInput) {
                input.on('input', onInput);
            }
        };

        setupListeners();

        setTimeout(() => {
            const inputNode = input.node();
            if (inputNode) {
                inputNode.focus();
                inputNode.select();
            }
        }, 50);
    }

    exitEditMode(foreignObject, saveChanges = false, onSave = null, onComplete = null) {
        if (this.activeEditingElement !== foreignObject) return;
        
        const input = foreignObject.select('input');
        if (input.empty()) return;

        let newValue = '';
        try {
            newValue = input.node().value.trim();
        } catch (e) {
            console.warn('Error getting input value:', e);
        }

        const inputNode = input.node();
        if (inputNode) {
            inputNode.blur();
            inputNode.setSelectionRange(0, 0);
        }

        input
            .style('pointer-events', 'none')
            .style('user-select', 'none')
            .style('-webkit-user-select', 'none')
            .style('-moz-user-select', 'none')
            .style('-ms-user-select', 'none')
            .style('background', 'transparent')
            .style('border', 'none')
            .style('box-shadow', 'none')
            .property('readOnly', true)
            .on('blur', null)
            .on('keydown', null)
            .on('input', null);

        const originalHandler = this.originalHandlers.get(foreignObject.node());
        if (originalHandler) {
            foreignObject.on('dblclick', originalHandler);
            this.originalHandlers.delete(foreignObject.node());
        } else {
            foreignObject.on('dblclick', null);
        }

        setTimeout(() => {
            if (window.getSelection) {
                window.getSelection().removeAllRanges();
            }
            
            if (inputNode) {
                inputNode.setSelectionRange(0, 0);
            }
        }, 10);

        if (saveChanges && onSave) {
            onSave(newValue);
        }

        this.activeEditingElement = null;

        if (onComplete) {
            onComplete();
        }
    }
}

const inlineEditor = new InlineEditor();

function cancelAllEditing() {
    inlineEditor.cancelAllEditing();
}