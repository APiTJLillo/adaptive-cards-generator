import { createCustomElement, actionTypes } from "@servicenow/ui-core";
import snabbdom from "@servicenow/ui-renderer-snabbdom";
import styles from "./styles.scss";
import * as ACDesigner from "adaptivecards-designer";

const view = (state, { updateState, dispatch }) => {};

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
	//This will be a font loaded from https://static2.sharepointonline.com/files/fabric/assets/icons/fabricmdl2icons-3.54.woff
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
		designer._isMonacoEditorLoaded = false;
		designer.attachTo(designerHostElement)
		
		if (properties.predefinedCard) {
			designer.setCard(properties.predefinedCard);
		}

		let originalSetJsonFromCard = designer.updateJsonFromCard.bind(designer);
		designer.updateJsonFromCard = () => {
			const cardPayload = designer.getCard();
			updateState({ currentCardState: cardPayload });
			originalSetJsonFromCard();
		};
		
		updateState({
			status: "Designer initialized successfully",
			designerInitialized: true,
			designer: designer,
			currentCardState: designer.getCard()
		});
	} catch (error) {
		console.error("Error initializing designer:", error);
		updateState({
			status: "Error initializing designer: " + error.message,
			designerInitialized: false,
		});
	}
	var elementsToHide = ['jsonEditorPanel', 'bottomCollapsedPaneTabHost', 'toolbarHost'];
	elementsToHide.forEach(element => {
		shadowRoot.getElementById(element).style.display = "none";
	});
};

createCustomElement("x-apig-adaptive-cards-designer-servicenow", {
	renderer: { type: snabbdom },
	view,
	styles,
	properties: {
		predefinedCard: { default: null },
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
			if (propertyName === "predefinedCard" && newValue && state.designer) {
				state.designer.setCard(newValue);
			}
		},
	},
});
