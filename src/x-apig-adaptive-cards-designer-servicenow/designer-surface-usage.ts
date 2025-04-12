/**
 * Example usage of SafeDesignerSurface wrapper
 */

import { SafeDesignerSurface } from './designer-surface-wrapper';

export function initializeDesigner(existingDesignerSurface: any) {
    // Create wrapper around existing designer surface instance
    const safeDesigner = new SafeDesignerSurface({
        getSelectedElement: () => existingDesignerSurface.getSelectedElement?.(),
        clearSelection: () => existingDesignerSurface.clearSelection?.()
    });

    // Example: Set up remove button handler
    const removeButton = document.getElementById('removeCommandElement');
    if (removeButton) {
        const originalHandler = removeButton.onclick;
        removeButton.onclick = (e) => {
            e.preventDefault();
            try {
                safeDesigner.safeRemoveSelected();
            } catch (error) {
                console.error('[DesignerSurface] Error in remove handler:', error);
            }
        };
    }

    // Example: Set up tree item selection handling
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'selected') {
                const treeItem = mutation.target;
                if (treeItem instanceof HTMLElement) {
                    safeDesigner.safeHandleTreeScroll(treeItem);
                }
            }
        }
    });

    // Watch for selection changes on tree items
    document.querySelectorAll('.designer-peer-treeitem').forEach(item => {
        observer.observe(item, {
            attributes: true,
            attributeFilter: ['selected']
        });
    });

    // Clean up function
    return () => {
        observer.disconnect();
        if (removeButton) {
            removeButton.onclick = null;
        }
    };
}

/**
 * Usage example:
 * 
 * // When initializing the designer
 * const cleanup = initializeDesigner(existingDesignerSurfaceInstance);
 * 
 * // When destroying/unmounting
 * cleanup();
 */
