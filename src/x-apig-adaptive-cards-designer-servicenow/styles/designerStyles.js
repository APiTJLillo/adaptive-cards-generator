import fabricIcons from "../fabricmdl2icons-3.54.woff";

export const designerStyles = `
    :host {
        display: block;
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
    }
    .designer-host {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }
    .designer-toolbar {
        padding: 8px;
        background: #f8f8f8;
        border-bottom: 1px solid #e0e0e0;
    }
    .adaptive-cards-designer {
        flex: 1;
        min-height: 0;
        position: relative;
    }
    #designerRootHost {
        flex: 1;
        min-height: 0;
        position: relative;
    }
    .acd-field-picker-button {
        position: absolute;
        right: 4px;
        top: 50%;
        transform: translateY(-50%);
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 3px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .acd-field-picker-button:hover {
        background: #f4f4f4;
    }
    
    .acd-field-picker-button:before {
        content: "⚡";
        font-size: 14px;
        color: #666;
    }
    
    .acd-field-picker-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 16px;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        max-height: 80vh;
        overflow-y: auto;
        z-index: 1000001;
    }
    
    .acd-field-picker-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 1000000;
    }
    
    .acd-field-item {
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 3px;
    }

    .acd-field-reference-arrow {
        margin-left: auto;
        background: transparent;
        border: none;
        cursor: pointer;
    }
    
    .acd-field-item:hover {
        background: #f4f4f4;
    }
    
    .property-input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
    }
`;

export const monacoStyles = `
    /* Monaco editor styles */
    .monaco-editor {
        position: absolute !important;
        width: 100% !important;
        height: 100vh !important;
        min-height: 400px !important;
        overflow: visible !important;
        contain: strict !important;
    }

    .monaco-editor .monaco-scrollable-element {
        position: absolute !important;
        width: 100% !important;
        height: 100vh !important;
        min-height: 400px !important;
        overflow: hidden !important;
        contain: strict !important;
    }
    .inputarea {
        position: absolute !important;
        width: 100% !important;
        height: 100vh !important;
        min-height: 400px !important;
        overflow: hidden !important;
        contain: strict !important;
        border: none !important;
        user-select: none !important;
        pointer-events: none !important;
    }
    .acd-toolbox {
        overflow: hidden !important;
    }

    /* Hide the main toolbar and bottom panels */
    #toolbarHost {
        display: none !important;
    }
    #jsonEditorPanel {
        display: none !important;
    }
`;
