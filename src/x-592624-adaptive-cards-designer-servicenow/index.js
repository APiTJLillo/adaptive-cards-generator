import { createCustomElement, actionTypes } from "@servicenow/ui-core";
import snabbdom from "@servicenow/ui-renderer-snabbdom";
import styles from "./styles.scss";
import * as ACDesigner from "adaptivecards-designer";
import * as monaco from "monaco-editor";

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
    document.head.appendChild = function(child) {
        return child;
    };
};

const configureMonaco = () => {
    // Disable web workers
    window.MonacoEnvironment = {
        getWorkerUrl: function (moduleId, label) {
            return 'data:text/javascript;charset=utf-8,';
        }
    };

    // Configure Monaco
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: false,
        allowComments: true,
        schemas: [],
        enableSchemaRequest: false
    });
};

const initializeDesigner = async (properties, updateState, host) => {
    const shadowRoot = host.shadowRoot;
    let element = document.createElement('style');
    //This will be a font loaded from https://static2.sharepointonline.com/files/fabric/assets/icons/fabricmdl2icons-3.54.woff
    element.innerHTML = `
        @font-face {
            font-family: "FabricMDL2Icons";
            src: url("https://static2.sharepointonline.com/files/fabric/assets/icons/fabricmdl2icons-3.54.woff") format("woff");
        }
    `;
    top.window.document.head.appendChild(element);
    
    createGlobalDocumentProxy(shadowRoot);
    configureMonaco();

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
    ACDesigner.GlobalSettings.showDataStructureToolbox = false;
    ACDesigner.GlobalSettings.showSampleDataEditorToolbox = false;
    ACDesigner.GlobalSettings.showSampleHostDataEditorToolbox = false;
    ACDesigner.GlobalSettings.showVersionPicker = false;
    ACDesigner.GlobalSettings.showCardStructureToolbox = true;
    ACDesigner.GlobalSettings.selectedHostContainerControlsTargetVersion = true;
    ACDesigner.GlobalSettings.showTargetVersionMismatchWarning = false;

    try {
        const designer = new ACDesigner.CardDesigner(hostContainers);
        designer.attachTo(designerHostElement);
        designer.monacoModuleLoaded(monaco);

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