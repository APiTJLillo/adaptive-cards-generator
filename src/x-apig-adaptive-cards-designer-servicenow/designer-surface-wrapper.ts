/**
 * Generic interface for designer surface functionality
 */
interface IDesignerSurface {
    getSelectedElement?: () => Element | null;
    clearSelection?: () => void;
}

/**
 * Wraps the DesignerSurface component with additional error handling and safety checks
 */
export class SafeDesignerSurface {
    private designerSurface: IDesignerSurface;

    constructor(designerSurface: IDesignerSurface) {
        this.designerSurface = designerSurface;
    }

    /**
     * Safely removes selected elements with proper error handling
     */
    public safeRemoveSelected(): void {
        try {
            // Cache the parent element before removal
            const selectedElement = this.findSelectedElement();
            if (!selectedElement) {
                console.warn('[SafeDesignerSurface] No element selected for removal');
                return;
            }

            const parentElement = selectedElement.parentElement;
            if (!parentElement) {
                console.warn('[SafeDesignerSurface] Selected element has no parent');
                return;
            }

            // Ensure we clear selection state first
            this.clearSelectionState();

            // Perform the removal
            try {
                parentElement.removeChild(selectedElement);
            } catch (e) {
                console.error('[SafeDesignerSurface] Error removing element:', e);
                return;
            }

            // Set focus to parent only if it's still in the document
            if (document.contains(parentElement)) {
                try {
                    parentElement.focus();
                } catch (e) {
                    console.warn('[SafeDesignerSurface] Could not focus parent element:', e);
                }
            }

        } catch (e) {
            console.error('[SafeDesignerSurface] Error in safeRemoveSelected:', e);
        }
    }

    /**
     * Safely finds the currently selected element
     */
    private findSelectedElement(): Element | null {
        try {
            // Replace this with actual logic to find selected element
            // based on your designer surface implementation
            return this.designerSurface.getSelectedElement?.() || null;
        } catch (e) {
            console.error('[SafeDesignerSurface] Error finding selected element:', e);
            return null;
        }
    }

    /**
     * Safely clears selection state
     */
    private clearSelectionState(): void {
        try {
            // Replace with actual implementation
            // This should clear any selection tracking in the tree view
            this.designerSurface.clearSelection?.();
        } catch (e) {
            console.warn('[SafeDesignerSurface] Error clearing selection state:', e);
        }
    }

    /**
     * Handle scrolling in tree view safely
     */
    public safeHandleTreeScroll(treeItem: HTMLElement): void {
        if (!treeItem) {
            return;
        }

        try {
            let currentElement = treeItem;
            while (currentElement.parentElement) {
                currentElement = currentElement.parentElement;
                
                // Check if this is a scrollable container
                const style = window.getComputedStyle(currentElement);
                const isScrollable = style.overflow === 'auto' || style.overflow === 'scroll';
                
                if (isScrollable) {
                    const itemRect = treeItem.getBoundingClientRect();
                    const containerRect = currentElement.getBoundingClientRect();

                    // Determine if scrolling is needed
                    if (itemRect.top < containerRect.top) {
                        currentElement.scrollTop -= (containerRect.top - itemRect.top);
                    } else if (itemRect.bottom > containerRect.bottom) {
                        currentElement.scrollTop += (itemRect.bottom - containerRect.bottom);
                    }
                }
            }
        } catch (e) {
            console.warn('[SafeDesignerSurface] Error handling tree scroll:', e);
        }
    }
}
