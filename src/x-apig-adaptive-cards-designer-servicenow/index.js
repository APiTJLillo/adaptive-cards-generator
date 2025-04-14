import { createCustomElement, actionTypes } from "@servicenow/ui-core";
import snabbdom from "@servicenow/ui-renderer-snabbdom";
import styles from "./styles.scss";
import * as ACDesigner from "adaptivecards-designer";
import 'vs/editor/editor.main.css';
import * as monaco from 'vs/editor/editor.main.js';

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
    
    return {};
};

const createGlobalDocumentProxy = (shadowRoot) => {
	const originalGetElementById = document.getElementById.bind(document);

	document.getElementById = function (id) {
		return shadowRoot.getElementById(id) || originalGetElementById(id);
	};

	const originalQuerySelector = document.querySelector.bind(document);
	document.querySelector = function (selector) {
		return (
			shadowRoot.querySelector(selector) || originalQuerySelector(selector)
		);
	};

	const originalQuerySelectorAll = document.querySelectorAll.bind(document);
	document.querySelectorAll = function (selector) {
		return (
			shadowRoot.querySelectorAll(selector) ||
			originalQuerySelectorAll(selector)
		);
	};
	
	const originalGetElementByClassName =
		document.getElementsByClassName.bind(document);
	document.getElementsByClassName = function (className) {
		return (
			shadowRoot.getElementsByClassName(className) ||
			originalGetElementByClassName(className)
		);
	};

	// Proxy appendChild to catch stylesheet additions
	document.head.appendChild = function (child) {
		return child;
	};

    const originalBodyAppendChild = document.body.appendChild.bind(document.body);
    document.body.appendChild = function (child) {

        if (child.style) {
            for (let prop in child.style) {
                if (child.style[prop] && child.style[prop].includes && child.style[prop].includes('50000px')) {
                    return originalBodyAppendChild(child);
                }
            }
        }
        return shadowRoot.appendChild(child);
    };

	const originalBodyRemoveChild = document.body.removeChild.bind(document.body);
	document.body.removeChild = function (child) {
		return shadowRoot.removeChild(child);
	};
};

const initializeDesigner = async (properties, updateState, host) => {
    const shadowRoot = host.shadowRoot;
    let element = document.createElement("style");
    element.innerHTML = `
        @font-face {
            font-family: "FabricMDL2Icons";
            src: url("https://static2.sharepointonline.com/files/fabric/assets/icons/fabricmdl2icons-3.54.woff") format("woff");
        }
    `;
    top.window.document.head.appendChild(element);

    createGlobalDocumentProxy(shadowRoot);

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

    let hostContainers = [ACDesigner.defaultMicrosoftHosts[1]];
    ACDesigner.GlobalSettings.enableDataBindingSupport = false;
    ACDesigner.GlobalSettings.showDataStructureToolbox = false;
    ACDesigner.GlobalSettings.showSampleDataEditorToolbox = false;
    ACDesigner.GlobalSettings.showSampleHostDataEditorToolbox = false;
    ACDesigner.GlobalSettings.showVersionPicker = false;
    ACDesigner.GlobalSettings.showCardStructureToolbox = true;
    ACDesigner.GlobalSettings.selectedHostContainerControlsTargetVersion = false;
    ACDesigner.GlobalSettings.showTargetVersionMismatchWarning = false;

    try {
        const designer = new ACDesigner.CardDesigner(hostContainers);
        designer._sampleHostDataEditorToolbox = {isVisible: false};
        designer._copyJSONButton.isVisible = false;
        
        // Set up Monaco environment first
        window.MonacoEnvironment = {
            getWorkerUrl: function(moduleId, label) {
                if (label === 'json') {
                    return './vs/language/json/json.worker.js';
                }
                return './vs/editor/editor.worker.js';
            }
        };

        // Wait for Monaco to be fully loaded
        await new Promise((resolve) => {
            const checkMonaco = () => {
                if (monaco && monaco.editor && monaco.languages && monaco.languages.json) {
                    console.log('Monaco editor fully loaded');
                    designer._isMonacoEditorLoaded = true;
                    
                    // Configure Monaco JSON validation
                    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
                        validate: true,
                        allowComments: true,
                        schemas: [{
                            uri: "http://adaptivecards.io/schemas/adaptive-card.json",
                            fileMatch: ["*"],
                            schema: {
                                type: "object",
                                properties: {
                                    type: {
                                        type: "string",
                                        enum: ["AdaptiveCard"]
                                    },
                                    version: {
                                        type: "string"
                                    },
                                    body: {
                                        type: "array"
                                    },
                                    actions: {
                                        type: "array"
                                    }
                                }
                            }
                        }]
                    });
                    
                    designer.monacoModuleLoaded();
                    resolve();
                } else {
                    console.log('Waiting for Monaco editor to load...');
                    setTimeout(checkMonaco, 100);
                }
            };
            checkMonaco();
        });

        // Now attach the designer
        await designer.attachTo(designerHostElement);

        // Wait for designer surface and layout initialization
        await new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 20;
            const interval = 100;
            
            const checkLayout = () => {
                attempts++;
                if (designer.designerSurface && designer.designerSurface.layout) {
                    console.log('Designer surface and layout initialized');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('Designer layout failed to initialize'));
                } else {
                    console.log('Waiting for designer surface and layout, attempt ' + attempts);
                    setTimeout(checkLayout, interval);
                }
            };
            checkLayout();
        });

        // Continue with initialization only after layout is ready
        if (properties.predefinedCard) {
            console.log('Initial card found in properties:', properties.predefinedCard);
            try {
                const initialCard = typeof properties.predefinedCard === 'string' 
                    ? JSON.parse(properties.predefinedCard) 
                    : properties.predefinedCard;
                
                console.log('Setting initial card:', initialCard);
                
                // Set the new card directly
                designer.setCard(initialCard);
                
                // Rebuild the surface with the new card
                designer.buildPalette();
                designer.recreateDesignerSurface();
                
                updateState({
                    currentCardState: initialCard,
                    status: "Initial card set successfully"
                });
                console.log('Initial card set successfully');
            } catch (error) {
                console.error('Error setting initial card:', error);
            }
        }

        updateState({
            status: "Designer initialized successfully",
            designerInitialized: true,
            designer: designer,
            currentCardState: designer.getCard(),
            properties: properties
        });
        
        // Hide elements that should not be visible
        var elementsToHide = [/*'jsonEditorPanel', 'bottomCollapsedPaneTabHost', 'toolbarHost'*/];
        elementsToHide.forEach(element => {
            const el = shadowRoot.getElementById(element);
            if (el) el.style.display = "none";
        });
        
    } catch (error) {
        console.error('Error during designer setup:', error);
        updateState({
            status: "Error during designer setup: " + error.message,
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
		status: "Initializing...",
		designerInitialized: false,
		currentCardState: null,
		designer: null,
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
    [actionTypes.COMPONENT_PROPERTY_CHANGED]: ({
        action,
        state,
        updateState,
    }) => {
        const { propertyName, newValue } = action.payload;
        if (propertyName === "predefinedCard") {
            console.log('Property change detected:', { propertyName, newValue });
            if (newValue && state.designer) {
                console.log('Updating card with new value:', newValue);
                try {
                    const newCard = typeof newValue === 'string' ? JSON.parse(newValue) : newValue;
                    console.log('Parsed card:', newCard);
                    
                    // Set the card using setCard method
                    state.designer.setCard(newCard);
                    console.log('Card set in designer');
                    
                    // Force a refresh of the designer surface
                    state.designer.recreateDesignerSurface();
                    console.log('Designer surface recreated');
                    
                    // Update component state
                    updateState({ currentCardState: newCard });
                    console.log('Component state updated');
                } catch (error) {
                    console.error('Error updating card:', error);
                }
            } else {
                console.log('Missing required values:', { 
                    hasNewValue: !!newValue, 
                    hasDesigner: !!state.designer 
                });
            }
        }
    },
}
});
