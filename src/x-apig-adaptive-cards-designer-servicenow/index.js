import { createCustomElement, actionTypes } from "@servicenow/ui-core";
import snabbdom from "@servicenow/ui-renderer-snabbdom";
import styles from "./styles.scss";
import * as ACDesigner from "adaptivecards-designer";
import * as monaco from "monaco-editor";
import "adaptivecards-designer/dist/adaptivecards-designer.css";

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
                minHeight: '800px',
                display: 'flex',
                flexDirection: 'column'
            }
        },
        children: [{
            type: 'div',
            props: {
                id: 'designerRootHost',
                style: {
                    flex: 1,
                    position: 'relative'
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

    // Proxy document.createElement to handle Monaco's iframe creation
    document.createElement = function(tagName) {
        const element = originalCreateElement(tagName);
        if (tagName.toLowerCase() === 'iframe') {
            // Handle Monaco iframe specifics
            element.setAttribute('data-monaco-frame', 'true');
            shadowRoot.appendChild(element);
        }
        return element;
    };

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
        
        // Initialize font
        let element = document.createElement("style");
        element.innerHTML = `
            @font-face {
                font-family: "FabricMDL2Icons";
                src: url("https://static2.sharepointonline.com/files/fabric/assets/icons/fabricmdl2icons-3.54.woff") format("woff");
            }
        `;
        top.window.document.head.appendChild(element);

        createGlobalDocumentProxy(shadowRoot);

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

        // Create the designer container
        const designerContainer = document.createElement('div');
        designerContainer.className = 'adaptive-cards-designer';
        designerContainer.style.width = '100%';
        designerContainer.style.height = '100vh';
        designerContainer.style.minHeight = '800px';
        designerContainer.style.position = 'relative';
        designerHostElement.appendChild(designerContainer);

        // Create the designer instance with minimal config
        const designer = new ACDesigner.CardDesigner(hostContainers);
        
        // Configure designer features
        designer._sampleDataEditorToolbox = { isVisible: false };
        designer._sampleHostDataEditorToolbox = { isVisible: false };
        designer._copyJSONButton = { isVisible: false };
        designer._jsonEditorsPanel = { isVisible: true };
        designer._jsonEditor = { isVisible: true };
        designer._toolbox = { isVisible: true };

        // Initialize toolbox with minimal functionality
        designer.toolbox = {
            getHeaderBoundingRect: () => ({
                left: 0,
                top: 0,
                width: designerContainer.offsetWidth || 800,
                height: 40
            }),
            updateLayout: () => {},
            isVisible: true
        };

        // Attach to DOM and wait for render
        try {
            designer.card = { type: "AdaptiveCard", version: "1.0", body: [] };
            designer.attachTo(designerContainer);
            designer.hostElement = designerContainer;
            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
            console.warn('Initial render warning:', error);
        }

        // Initialize basic state
        designer.isReady = true;

        // Initialize Monaco with error handling
        try {
            console.log('Initializing Monaco editor...');
            await new Promise(resolve => setTimeout(resolve, 100)); // Give designer time to setup
            designer.monacoModuleLoaded(monaco);
            console.log('Monaco editor initialized successfully');
        } catch (error) {
            console.error('Error initializing Monaco editor:', error);
        }

        // Wait for designer initialization
        await new Promise(resolve => {
            const checkDesigner = () => {
                if (designer.isReady) {
                    resolve();
                } else {
                    setTimeout(checkDesigner, 50);
                }
            };
            checkDesigner();
        });

        // Wait for toolbox initialization
        await new Promise(resolve => {
            const checkToolbox = () => {
                if (designer.toolbox && typeof designer.toolbox.getHeaderBoundingRect === 'function') {
                    resolve();
                } else {
                    setTimeout(checkToolbox, 50);
                }
            };
            checkToolbox();
        });

        console.log('Initializing designer with properties:', properties);

        // Set up card handling with retry mechanism
        const setupCardHandling = async () => {
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
                        const initialCard = typeof properties.predefinedCard === 'string' 
                            ? JSON.parse(properties.predefinedCard) 
                            : properties.predefinedCard;
                        
                        console.log(`Setting initial card (attempt ${i + 1}/${maxRetries}):`, initialCard);
                        
                        // Wait for designer to be ready
                        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
                        
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
                        if (i === maxRetries - 1) {
                            console.error('All attempts to set initial card failed');
                        }
                    }
                }

                if (lastError) {
                    throw lastError; // Propagate last error if all retries failed
                }
            } else {
                console.log('No initial card provided');
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
		console.error("Error initializing designer:", error);
		updateState({
			status: "Error initializing designer: " + error.message,
			designerInitialized: false,
		});
	}
};

createCustomElement("x-apig-adaptive-cards-designer-servicenow", {
	renderer: { type: snabbdom },
	view,
	styles,
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
	},
});
