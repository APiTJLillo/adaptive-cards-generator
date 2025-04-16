import { createCustomElement, actionTypes } from "@servicenow/ui-core";
import snabbdom from "@servicenow/ui-renderer-snabbdom";
import * as monaco from "monaco-editor";
import * as ACDesigner from "adaptivecards-designer";

// Custom CardDesigner class
class ServiceNowCardDesigner extends ACDesigner.CardDesigner {
    constructor(hostContainers) {
        super(hostContainers);
        this._toolboxInitialized = false;
    }

    initializeToolbox(toolboxContent, toolboxHeader) {
        this._toolboxInitialized = true;
        this._toolbox = {
            content: toolboxContent,
            header: toolboxHeader,
            isVisible: true,
            getHeaderBoundingRect: function() {
                if (!this.header) return null;
                const rect = this.header.getBoundingClientRect();
                return {
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                    right: rect.right,
                    bottom: rect.bottom
                };
            }
        };
    }

    get toolbox() {
        return this._toolbox;
    }

    updateToolboxLayout() {
        if (!this._toolboxInitialized) return;
        super.updateToolboxLayout();
    }

    updateJsonEditorsLayout() {
        if (!this._toolboxInitialized) return;
        super.updateJsonEditorsLayout();
    }
}

const view = (state, { updateState, dispatch }) => {
    console.log('View function called with state:', state);
    const { properties, currentCardState, designerInitialized, designer } = state;
    
    if (designerInitialized && designer) {
        console.log('Designer is initialized, current card state:', currentCardState);
        if (properties.predefinedCard) {
            console.log('PredefinedCard in properties:', properties.predefinedCard);
        }
    } else {
        console.log('Designer not yet initialized');
    }
    
    // Always return empty wrapper to avoid any text rendering
    const emptyWrapper = {
        type: 'div',
        props: {
            className: 'designer-host',
            style: {
                width: '100%',
                height: '100%',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }
        },
        children: [{
            type: 'div',
            props: {
                id: 'designerRootHost',
                style: {
                    flex: 1,
                    position: 'relative',
                    margin: 0,
                    padding: 0,
                    overflow: 'hidden'
                }
            }
        }]
    };
    
    return emptyWrapper;
};

const createGlobalDocumentProxy = (shadowRoot) => {
    const originalGetElementById = document.getElementById.bind(document);
    const originalQuerySelector = document.querySelector.bind(document);
    const originalQuerySelectorAll = document.querySelectorAll.bind(document);
    const originalGetElementByClassName = document.getElementsByClassName.bind(document);
    const originalBodyAppendChild = document.body.appendChild.bind(document.body);
    const originalBodyRemoveChild = document.body.removeChild.bind(document.body);
    const originalCreateElement = document.createElement.bind(document);


    // Enhance getElementById to better handle Monaco elements
    document.getElementById = function(id) {
        // Check for Monaco-specific elements first
        if (id && (id.startsWith('monaco-') || id.includes('editor'))) {
            let element = shadowRoot.getElementById(id);
            if (!element) {
                element = originalGetElementById(id);
                if (element) {
                    try {
                        shadowRoot.appendChild(element);
                    } catch (e) {
                        console.warn('Could not move element to shadow root:', e);
                    }
                }
            }
            return element;
        }
        return shadowRoot.getElementById(id) || originalGetElementById(id);
    };

    document.querySelector = function(selector) {
        return shadowRoot.querySelector(selector) || originalQuerySelector(selector);
    };

    document.querySelectorAll = function(selector) {
        const shadowResults = shadowRoot.querySelectorAll(selector);
        if (shadowResults.length > 0) return shadowResults;
        return originalQuerySelectorAll(selector);
    };

    document.getElementsByClassName = function(className) {
        return shadowRoot.getElementsByClassName(className) || originalGetElementByClassName(className);
    };

    // Enhanced appendChild handling for Monaco
    document.head.appendChild = function(child) {
        if (child.tagName === 'STYLE' || child.tagName === 'LINK') {
            const clone = child.cloneNode(true);
            shadowRoot.appendChild(clone);
        }
        return child;
    };

    document.body.appendChild = function(child) {
        if (child.tagName === 'IFRAME' && child.getAttribute('data-monaco-frame')) {
            return shadowRoot.appendChild(child);
        }
        if (child.style) {
            for (let prop in child.style) {
                if (child.style[prop] && child.style[prop].includes && child.style[prop].includes('50000px')) {
                    return originalBodyAppendChild(child);
                }
            }
        }
        return shadowRoot.appendChild(child);
    };

    document.body.removeChild = function(child) {
        if (shadowRoot.contains(child)) {
            return shadowRoot.removeChild(child);
        }
        return originalBodyRemoveChild(child);
    };
};

const initializeDesigner = async (properties, updateState, host) => {
    try {
        const shadowRoot = host.shadowRoot;
        shadowRoot.innerHTML = ''; // Clear any existing content
        const mainStyles = document.createElement('style');
        mainStyles.textContent = `
        @font-face {
            font-family: "FabricMDL2Icons";
            src: url("https://static2.sharepointonline.com/files/fabric/assets/icons/fabricmdl2icons-3.54.woff") format("woff");
        }
        :host {
            display: block;
            margin: 0;
            padding: 0;
            overflow: hidden;
        }
        .designer-host {
            margin: 0;
            padding: 0;
            overflow: hidden;
        }
        `;
        top.window.document.head.appendChild(mainStyles);

        // Add custom Monaco styles
        const monacoStyles = document.createElement('style');
        monacoStyles.textContent = `
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
        `;
        shadowRoot.appendChild(monacoStyles);

        createGlobalDocumentProxy(shadowRoot);

        // Configure Monaco environment
        console.log('Setting up Monaco environment...');
        
        // Initialize Monaco features
        await Promise.all([
            monaco.languages.register({ id: 'json' }),
            monaco.languages.register({ id: 'javascript' })
        ]);

        // Configure Monaco's loader
        self.MonacoEnvironment = {
            getWorkerUrl: function(moduleId, label) {
                // Embed the worker code directly
                const workerCode = `
                    self.MonacoEnvironment = {
                        baseUrl: '${window.location.origin}'
                    };

                    // Basic worker implementation
                    self.onmessage = function(e) {
                        const { data } = e;
                        if (!data) return;
                        
                        switch (data.type) {
                            case 'initialize':
                                self.postMessage({ type: 'initialized' });
                                break;
                            case 'validate':
                                try {
                                    const json = JSON.parse(data.value);
                                    self.postMessage({ 
                                        type: 'validation-result',
                                        markers: []
                                    });
                                } catch (e) {
                                    self.postMessage({ 
                                        type: 'validation-result',
                                        markers: [{
                                            message: e.message,
                                            severity: 8,
                                            startLineNumber: 1,
                                            startColumn: 1,
                                            endLineNumber: 1,
                                            endColumn: 1
                                        }]
                                    });
                                }
                                break;
                        }
                    };
                `;
                
                const blob = new Blob([workerCode], { type: 'application/javascript' });
                return URL.createObjectURL(blob);
            }
        };

        // Disable advanced features that require workers
        monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
            validate: false,
            allowComments: true,
            schemas: [],
            enableSchemaRequest: false
        });

        monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
            noLib: true,
            allowNonTsExtensions: true
        });

        // Ensure DOM elements are ready
        const ensureElement = (id) => {
            let element = shadowRoot.getElementById(id);
            if (!element) {
                element = document.createElement("div");
                element.id = id;
                shadowRoot.appendChild(element);
            }
            return element;
        };

        const designerHostElement = ensureElement("designerRootHost");

        // Create the designer container
        const designerContainer = document.createElement('div');
        designerContainer.className = 'adaptive-cards-designer';
        designerContainer.style.width = '100%';
        designerContainer.style.height = '98vh';
        designerContainer.style.position = 'relative';
        designerContainer.style.margin = '0';
        designerContainer.style.padding = '0';
        designerContainer.style.overflow = 'hidden';
        designerHostElement.appendChild(designerContainer);

        // Create toolbox elements
        const toolboxContainer = document.createElement('div');
        toolboxContainer.className = 'acd-toolbox';
        toolboxContainer.style.width = '100%';
        toolboxContainer.style.height = '40px';
        designerContainer.appendChild(toolboxContainer);

        const toolboxContent = document.createElement('div');
        toolboxContent.className = 'acd-toolbox-content';
        toolboxContainer.appendChild(toolboxContent);

        const toolboxHeader = document.createElement('div');
        toolboxHeader.className = 'acd-toolbox-header';
        toolboxContent.appendChild(toolboxHeader);

        // Configure global settings
        let hostContainers = [ACDesigner.defaultMicrosoftHosts[1]];
        ACDesigner.GlobalSettings.enableDataBindingSupport = false;
        ACDesigner.GlobalSettings.showDataStructureToolbox = false;
        ACDesigner.GlobalSettings.showSampleDataEditorToolbox = false;
        ACDesigner.GlobalSettings.showSampleHostDataEditorToolbox = false;
        ACDesigner.GlobalSettings.showVersionPicker = false;
        ACDesigner.GlobalSettings.showCardStructureToolbox = true;
        ACDesigner.GlobalSettings.selectedHostContainerControlsTargetVersion = false;
        ACDesigner.GlobalSettings.showTargetVersionMismatchWarning = false;

        // Create and initialize the designer
        const designer = new ServiceNowCardDesigner(hostContainers);
        designer.assetPath = "https://unpkg.com/adaptivecards-designer@2.4.4/dist";
        
        // Initialize toolbox
        designer.initializeToolbox(toolboxContent, toolboxHeader);
        
        // Configure designer features
        designer._sampleDataEditorToolbox = { isVisible: false };
        designer._sampleHostDataEditorToolbox = { isVisible: false };
        designer._copyJSONButton = { isVisible: false };
        designer._jsonEditorsPanel = { isVisible: true };
        designer._jsonEditor = { isVisible: true };

        // Initialize with empty card
        designer.card = { type: "AdaptiveCard", version: "1.0", body: [] };

        // Attach designer to DOM
        designer.attachTo(designerContainer);
        designer.hostElement = designerContainer;

        // Wait for initial render
        await new Promise(resolve => setTimeout(resolve, 100));

        // Initialize designer with Monaco
        await designer.monacoModuleLoaded(monaco);
        console.log('Monaco editor initialized successfully');

        // Set up card handling
        const setupCardHandling = async () => {
            try {
                let originalSetJsonFromCard = designer.updateJsonFromCard.bind(designer);
                designer.updateJsonFromCard = () => {
                    try {
                        const cardPayload = designer.getCard();
                        console.log('Card updated, new payload:', cardPayload);
                        updateState({ currentCardState: cardPayload });
                        originalSetJsonFromCard();
                    } catch (error) {
                        console.error('Error in updateJsonFromCard:', error);
                    }
                };

                // Handle initial card if provided
                if (properties.predefinedCard) {
                    console.log('Initial card found in properties:', properties.predefinedCard);
                    const maxRetries = 3;
                    let lastError = null;

                    for (let i = 0; i < maxRetries; i++) {
                        try {
                            await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
                            
                            const initialCard = typeof properties.predefinedCard === 'string' 
                                ? JSON.parse(properties.predefinedCard) 
                                : properties.predefinedCard;
                            
                            console.log(`Setting initial card (attempt ${i + 1}/${maxRetries}):`, initialCard);
                            
                            designer.setCard(initialCard);
                            await new Promise(resolve => setTimeout(resolve, 50));
                            
                            designer.updateJsonFromCard();
                            updateState({ currentCardState: initialCard });
                            
                            console.log('Initial card set successfully');
                            lastError = null;
                            break;
                        } catch (error) {
                            lastError = error;
                            console.error(`Error setting initial card (attempt ${i + 1}/${maxRetries}):`, error);
                        }
                    }

                    if (lastError) {
                        throw lastError;
                    }
                }
            } catch (error) {
                console.error('Error in setupCardHandling:', error);
                throw error;
            }
        };

        await setupCardHandling();

        updateState({
            status: "Designer initialized successfully",
            designerInitialized: true,
            designer: designer,
            currentCardState: designer.getCard(),
            properties: properties
        });

    } catch (error) {
        console.error('Error initializing Monaco editor:', error);
        throw error;
    }
};

createCustomElement("x-apig-adaptive-cards-designer-servicenow", {
	renderer: { type: snabbdom },
	view,
properties: {
    predefinedCard: {
        default: '{}',
    }
},
initialState: {
designer: null,
currentCardState: null,
designerInitialized: false
},
	actionHandlers: {
		[actionTypes.COMPONENT_CONNECTED]: ({
			updateState,
			dispatch,
			host,
			properties,
		}) => {
			initializeDesigner(properties, updateState, host);
		},
[actionTypes.COMPONENT_PROPERTY_CHANGED]: async ({
action,
state,
updateState,
}) => {
const { propertyName, newValue } = action.payload;
if (propertyName === "predefinedCard") {
    console.log('Property change detected:', { propertyName, newValue });
    if (newValue && state.designer) {
        console.log('Updating card with new value:', newValue);
        const maxRetries = 3;
        let lastError = null;

        for (let i = 0; i < maxRetries; i++) {
            try {
                const newCard = typeof newValue === 'string' ? JSON.parse(newValue) : newValue;
                console.log(`Updating card (attempt ${i + 1}/${maxRetries}):`, newCard);
                
                // Wait for designer to be ready
                await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
                
                state.designer.setCard(newCard);
                await new Promise(resolve => setTimeout(resolve, 50));
                
                state.designer.updateJsonFromCard();
                const currentCard = state.designer.getCard();
                console.log('Current card state:', currentCard);
                
                updateState({ currentCardState: newCard });
                console.log('Component state updated successfully');
                lastError = null;
                break;
            } catch (error) {
                lastError = error;
                console.error(`Error updating card (attempt ${i + 1}/${maxRetries}):`, error);
                if (i === maxRetries - 1) {
                    console.error('All attempts to update card failed');
                }
            }
        }
        
        if (lastError) {
            console.error('Final error updating card:', lastError);
        }
    } else {
        console.log('Missing required values:', { 
            hasNewValue: !!newValue, 
            hasDesigner: !!state.designer 
        });
    }
}
},
[actionTypes.COMPONENT_DISCONNECTED]: ({host}) => {
    if (host.shadowRoot) {
        host.shadowRoot.innerHTML = '';
    }
}
},
});
