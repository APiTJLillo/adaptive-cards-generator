import { createCustomElement, actionTypes } from "@servicenow/ui-core";
import snabbdom from "@servicenow/ui-renderer-snabbdom";
import styles from "./styles.scss";

import * as ACDesigner from "adaptivecards-designer";

const view = (state, { updateState, dispatch }) => {
    return (
        <div className="adaptive-card-designer-container">
            <div id="designerRootHost" className="designer-root"></div>
        </div>
    );
};

const createGlobalDocumentProxy = (shadowRoot) => {
    const originalGetElementById = document.getElementById.bind(document);
    
    document.getElementById = function(id) {
        return shadowRoot.getElementById(id) || originalGetElementById(id);
    };

    const originalQuerySelector = document.querySelector.bind(document);
    document.querySelector = function(selector) {
        return shadowRoot.querySelector(selector) || originalQuerySelector(selector);
    };

    const originalQuerySelectorAll = document.querySelectorAll.bind(document);
    document.querySelectorAll = function(selector) {
        return shadowRoot.querySelectorAll(selector) || originalQuerySelectorAll(selector);
    };

    // Proxy appendChild to catch stylesheet additions
    const originalAppendChild = document.head.appendChild.bind(document.head);
    document.head.appendChild = function(child) {
        if (child.tagName === 'LINK' && child.rel === 'stylesheet') {
            // Instead of appending to document.head, load the stylesheet manually
            loadStylesheet(child.href, shadowRoot);
            return child; // Return the child to mimic normal behavior
        }
        return originalAppendChild(child);
    };
};

// Function to load a stylesheet
const loadStylesheet = (href, shadowRoot) => {
    fetch(href)
        .then(response => response.text())
        .then(css => {
            const style = document.createElement('style');
            style.textContent = css;
            shadowRoot.appendChild(style);
        })
        .catch(error => console.error('Error loading stylesheet:', error));
};

const initializeDesigner = (properties, updateState, host) => {
    const shadowRoot = host.shadowRoot;
    
    // Create the global document proxy
    createGlobalDocumentProxy(shadowRoot);

    // Ensure necessary elements exist
    const ensureElement = (id) => {
        let element = shadowRoot.getElementById(id);
        if (!element) {
            element = document.createElement('div');
            element.id = id;
            shadowRoot.appendChild(element);
        }
        return element;
    };

    const designerHostElement = ensureElement("designerRootHost");

    let hostContainers = [ACDesigner.defaultMicrosoftHosts[1]];
    ACDesigner.GlobalSettings.enableDataBindingSupport = true;
    ACDesigner.GlobalSettings.showDataStructureToolbox = true;
    ACDesigner.GlobalSettings.showSampleDataEditorToolbox = true;
    ACDesigner.GlobalSettings.showSampleHostDataEditorToolbox = true;
    ACDesigner.GlobalSettings.showVersionPicker = false;
    ACDesigner.GlobalSettings.showCardStructureToolbox = true;
    ACDesigner.GlobalSettings.selectedHostContainerControlsTargetVersion = true;
    ACDesigner.GlobalSettings.showTargetVersionMismatchWarning = false;

    try {
        const designer = new ACDesigner.CardDesigner(hostContainers);

        designer.attachTo(designerHostElement);

        if (properties.predefinedCard) {
            designer.setCard(properties.predefinedCard);
        }

        designer.onCardDesignerUpdate = (event) => {
            const cardPayload = designer.getCard();
            updateState({ currentCardState: cardPayload });
        };

        updateState({
            status: "Designer initialized successfully",
            designerInitialized: true,
            designer: designer
        });
    } catch (error) {
        console.error("Error initializing designer:", error);
        updateState({
            status: "Error initializing designer: " + error.message,
            designerInitialized: false
        });
    }
};

createCustomElement("x-592624-adaptive-cards-designer-servicenow", {
    renderer: { type: snabbdom },
    view,
    styles,
    properties: {
        predefinedCard: { default: null }
    },
    initialState: {
        status: "Initializing...",
        designerInitialized: false,
        currentCardState: null,
        designer: null
    },
    actionHandlers: {
        [actionTypes.COMPONENT_CONNECTED]: ({ updateState, dispatch, host, properties }) => {
            initializeDesigner(properties, updateState, host);
        },
        [actionTypes.COMPONENT_PROPERTY_CHANGED]: ({ action, state, updateState }) => {
            const { propertyName, newValue } = action.payload;
            if (propertyName === 'predefinedCard' && newValue && state.designer) {
                state.designer.setCard(newValue);
            }
        }
    }
});