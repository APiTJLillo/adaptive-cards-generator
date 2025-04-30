import { createCustomElement, actionTypes } from "@servicenow/ui-core";
import snabbdom from "@servicenow/ui-renderer-snabbdom";
import * as monaco from "monaco-editor";
import * as ACDesigner from "adaptivecards-designer";

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
			getHeaderBoundingRect: function () {
				if (!this.header) return null;
				const rect = this.header.getBoundingClientRect();
				return {
					left: rect.left,
					top: rect.top,
					width: rect.width,
					height: rect.height,
					right: rect.right,
					bottom: rect.bottom,
				};
			},
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

// Field handling now happens via the field picker buttons

const view = (state, { updateState, dispatch }) => {
	console.log("View function called with state:", state);
	const {
		properties = {},
		currentCardState,
		designerInitialized,
		designer,
		tableFields,
	} = state || {};

	// Trigger setup of field pickers when view renders if designer is ready
	if (designerInitialized && designer) {
		setTimeout(() => {
			console.log("View rendered, setting up field pickers");
			addFieldPickersToDesigner(designer, tableFields || []);
		}, 0);
	}

	// Return a basic wrapper that will be populated by the designer
	const wrapper = {
		tag: "div",
		props: {
			className: "designer-host",
			style: {
				width: "100%",
				height: "100%",
				margin: 0,
				padding: 0,
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
			},
		},
		children: [
			{
				tag: "div",
				props: {
					id: "designerRootHost",
					style: {
						flex: 1,
						position: "relative",
						margin: 0,
						padding: 0,
						overflow: "hidden",
					},
				},
			},
		],
	};

	return wrapper;
};

const createGlobalDocumentProxy = (shadowRoot) => {
	const originalGetElementById = document.getElementById.bind(document);
	const originalQuerySelector = document.querySelector.bind(document);
	const originalQuerySelectorAll = document.querySelectorAll.bind(document);
	const originalGetElementByClassName =
		document.getElementsByClassName.bind(document);
	const originalBodyAppendChild = document.body.appendChild.bind(document.body);
	const originalBodyRemoveChild = document.body.removeChild.bind(document.body);
	const originalCreateElement = document.createElement.bind(document);

	// Enhance getElementById to better handle Monaco elements
	document.getElementById = function (id) {
		// Check for Monaco-specific elements first
		if (id && (id.startsWith("monaco-") || id.includes("editor"))) {
			let element = shadowRoot.getElementById(id);
			if (!element) {
				element = originalGetElementById(id);
				if (element) {
					try {
						shadowRoot.appendChild(element);
					} catch (e) {
						console.warn("Could not move element to shadow root:", e);
					}
				}
			}
			return element;
		}
		return shadowRoot.getElementById(id) || originalGetElementById(id);
	};

	document.querySelector = function (selector) {
		return (
			shadowRoot.querySelector(selector) || originalQuerySelector(selector)
		);
	};

	document.querySelectorAll = function (selector) {
		const shadowResults = shadowRoot.querySelectorAll(selector);
		if (shadowResults.length > 0) return shadowResults;
		return originalQuerySelectorAll(selector);
	};

	document.getElementsByClassName = function (className) {
		return (
			shadowRoot.getElementsByClassName(className) ||
			originalGetElementByClassName(className)
		);
	};

	// Enhanced appendChild handling for Monaco
	document.head.appendChild = function (child) {
		if (child.tagName === "STYLE" || child.tagName === "LINK") {
			const clone = child.cloneNode(true);
			shadowRoot.appendChild(clone);
		}
		return child;
	};

	document.body.appendChild = function (child) {
		if (child.tagName === "IFRAME" && child.getAttribute("data-monaco-frame")) {
			return shadowRoot.appendChild(child);
		}
		if (child.style) {
			for (let prop in child.style) {
				if (
					child.style[prop] &&
					child.style[prop].includes &&
					child.style[prop].includes("50000px")
				) {
					return originalBodyAppendChild(child);
				}
			}
		}
		return shadowRoot.appendChild(child);
	};

	document.body.removeChild = function (child) {
		if (shadowRoot.contains(child)) {
			return shadowRoot.removeChild(child);
		}
		return originalBodyRemoveChild(child);
	};
};

const initializeDesigner = async (properties, updateState, host) => {
	try {
		const shadowRoot = host.shadowRoot;
		shadowRoot.innerHTML = ""; // Clear any existing content
		const mainStyles = document.createElement("style");
		mainStyles.textContent = `
            @font-face {
                font-family: "FabricMDL2Icons";
                src: url("https://static2.sharepointonline.com/files/fabric/assets/icons/fabricmdl2icons-3.54.woff") format("woff");
            }
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
            
            .acd-field-item:hover {
                background: #f4f4f4;
            }
            
            .property-input-wrapper {
                position: relative;
                display: flex;
                align-items: center;
            }
        `;
		shadowRoot.appendChild(mainStyles);

		// Add custom Monaco styles
		const monacoStyles = document.createElement("style");
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
		console.log("Setting up Monaco environment...");

		// Initialize Monaco features
		await Promise.all([
			monaco.languages.register({ id: "json" }),
			monaco.languages.register({ id: "javascript" }),
		]);

		// Configure Monaco's loader
		self.MonacoEnvironment = {
			getWorkerUrl: function (moduleId, label) {
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

				const blob = new Blob([workerCode], { type: "application/javascript" });
				return URL.createObjectURL(blob);
			},
		};

		// Disable advanced features that require workers
		monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
			validate: false,
			allowComments: true,
			schemas: [],
			enableSchemaRequest: false,
		});

		monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
			noLib: true,
			allowNonTsExtensions: true,
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
		const designerContainer = document.createElement("div");
		designerContainer.className = "adaptive-cards-designer";
		designerContainer.style.width = "100%";
		designerContainer.style.height = "98vh";
		designerContainer.style.position = "relative";
		designerContainer.style.margin = "0";
		designerContainer.style.padding = "0";
		designerContainer.style.overflow = "hidden";
		designerHostElement.appendChild(designerContainer);

		// Create toolbox elements
		const toolboxContainer = document.createElement("div");
		toolboxContainer.className = "acd-toolbox";
		toolboxContainer.style.width = "100%";
		toolboxContainer.style.height = "40px";
		designerContainer.appendChild(toolboxContainer);

		const toolboxContent = document.createElement("div");
		toolboxContent.className = "acd-toolbox-content";
		toolboxContainer.appendChild(toolboxContent);

		const toolboxHeader = document.createElement("div");
		toolboxHeader.className = "acd-toolbox-header";
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

		// Initialize with empty card or predefined card
		const initialCard = properties.predefinedCard
			? typeof properties.predefinedCard === "string"
				? JSON.parse(properties.predefinedCard)
				: properties.predefinedCard
			: { type: "AdaptiveCard", version: "1.0", body: [] };

		designer.card = initialCard;

		// Attach designer to DOM and update state
		designer.attachTo(designerContainer);
		designer.hostElement = designerContainer;

		// Update initial state
		updateState((state) => ({
			...state,
			designerInitialized: true,
			designer: designer,
			currentCardState: initialCard,
			properties: properties,
		}));

		// Wait for initial render
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Initialize designer with Monaco
		await designer.monacoModuleLoaded(monaco);
		console.log("Monaco editor initialized successfully");

		// Set up card handling
		const setupCardHandling = async () => {
			try {
				let originalSetJsonFromCard =
					designer.updateJsonFromCard.bind(designer);
				designer.updateJsonFromCard = () => {
					try {
						const cardPayload = designer.getCard();
						console.log("Card updated, new payload:", cardPayload);
						// Update both currentCardState and designer in state atomically
						updateState((state) => ({
							...state,
							currentCardState: cardPayload,
							designer: designer,
						}));
						originalSetJsonFromCard();
					} catch (error) {
						console.error("Error in updateJsonFromCard:", error);
					}
				};

				// Handle initial card if provided
				if (properties.predefinedCard) {
					console.log(
						"Initial card found in properties:",
						properties.predefinedCard
					);
					const maxRetries = 3;
					let lastError = null;

					for (let i = 0; i < maxRetries; i++) {
						try {
							await new Promise((resolve) =>
								setTimeout(resolve, 100 * (i + 1))
							);

							const initialCard =
								typeof properties.predefinedCard === "string"
									? JSON.parse(properties.predefinedCard)
									: properties.predefinedCard;

							console.log(
								`Setting initial card (attempt ${i + 1}/${maxRetries}):`,
								initialCard
							);

							designer.setCard(initialCard);
							await new Promise((resolve) => setTimeout(resolve, 50));

							designer.updateJsonFromCard();
							updateState({ currentCardState: initialCard });

							console.log("Initial card set successfully");
							lastError = null;
							break;
						} catch (error) {
							lastError = error;
							console.error(
								`Error setting initial card (attempt ${i + 1}/${maxRetries}):`,
								error
							);
						}
					}

					if (lastError) {
						throw lastError;
					}
				}
			} catch (error) {
				console.error("Error in setupCardHandling:", error);
				throw error;
			}
		};

		await setupCardHandling();

		updateState({
			status: "Designer initialized successfully",
			designerInitialized: true,
			designer: designer,
			currentCardState: designer.getCard(),
			properties: properties,
		});

		return designer;
	} catch (error) {
		console.error("Error initializing Monaco editor:", error);
		throw error;
	}
};

// Field handling now happens in UI Builder via Data Resources

createCustomElement("x-apig-adaptive-cards-designer-servicenow", {
	renderer: { type: snabbdom },
	view,
	properties: {
		predefinedCard: {
			schema: { type: "object" },
			default: {},
		},
		tableName: {
			schema: { type: "string" },
			default: "",
			required: false,
		},
		fields: {
			schema: {
				type: "array",
				items: { type: "object" },
			},
			default: [],
			required: false,
		},
	},
	initialState: {
		status: "Initializing...",
		designerInitialized: false,
		currentCardState: null,
		designer: null,
		tableFields: [],
		properties: {},
	},
	actionHandlers: {
		[actionTypes.COMPONENT_CONNECTED]: async ({
			updateState,
			dispatch,
			host,
			properties,
			state,
		}) => {
			try {
				// First initialize the designer
				const designer = await initializeDesigner(
					properties,
					updateState,
					host
				);

				// After designer is initialized, handle fields if provided
				if (properties.fields && Array.isArray(properties.fields)) {
					const parsedFields = properties.fields
						.map((field) => ({
							name: field.sys_name?.value,
							label: field.column_label?.value || field.sys_name?.value,
							type: field.internal_type?.value,
							isReference: field.internal_type?.value === "reference",
							referenceTable: field.reference?.value,
							displayValue: field.sys_name?.displayValue,
						}))
						.filter(
							(f) =>
								// Filter out null/undefined fields and certain types we don't want to show
								f?.name &&
								f?.type &&
								!["collection", "journal_list"].includes(f.type)
						);

					updateState({ tableFields: parsedFields });

					// Add field pickers to the designer right away since we have the instance
					if (designer) {
						addFieldPickersToDesigner(designer, parsedFields);
					}
				}
			} catch (error) {
				console.error("Error in COMPONENT_CONNECTED:", error);
			}
		},
		[actionTypes.COMPONENT_PROPERTY_CHANGED]: async ({
			action,
			state,
			updateState,
			dispatch,
		}) => {
			const { propertyName, newValue } = action.payload;

			if (propertyName === "fields" && Array.isArray(newValue)) {
				// Parse fields from the data resource format
				const parsedFields =
					newValue?.results
						?.map((field) => ({
							name: field.sys_name?.value,
							label: field.column_label?.value || field.sys_name?.value,
							type: field.internal_type?.value,
							isReference: field.internal_type?.value === "reference",
							referenceTable: field.reference?.value,
							displayValue: field.sys_name?.displayValue,
						}))
						.filter(
							(f) =>
								// Filter out null/undefined fields and certain types we don't want to show
								f?.name &&
								f?.type &&
								!["collection", "journal_list"].includes(f.type)
						) || [];

				updateState({ tableFields: parsedFields });

				// Add field pickers if designer is initialized
				if (state.designer) {
					addFieldPickersToDesigner(state.designer, parsedFields);
				}
			} else if (
				propertyName === "predefinedCard" &&
				state.designerInitialized &&
				state.designer
			) {
				console.log("Updating card with new value:", newValue);
				const maxRetries = 3;
				let lastError = null;

				for (let i = 0; i < maxRetries; i++) {
					try {
						// Add a small delay between retries
						await new Promise((resolve) => setTimeout(resolve, 100 * (i + 1)));

						const cardData =
							typeof newValue === "string" ? JSON.parse(newValue) : newValue;

						console.log(
							`Setting card (attempt ${i + 1}/${maxRetries}):`,
							cardData
						);
						state.designer.setCard(cardData);

						// Wait a bit for the UI to update
						await new Promise((resolve) => setTimeout(resolve, 50));

						updateState({ currentCardState: cardData });

						lastError = null;
						break;
					} catch (error) {
						lastError = error;
						console.error(
							`Error setting card (attempt ${i + 1}/${maxRetries}):`,
							error
						);
					}
				}

				if (lastError) {
					console.error("Final error setting card:", lastError);
				}
			}
		},
		[actionTypes.COMPONENT_DISCONNECTED]: ({ host }) => {
			if (host.shadowRoot) {
				host.shadowRoot.innerHTML = "";
			}
		},
	},
});

const addFieldPickersToDesigner = (designer, tableFields) => {
    console.log("addFieldPickersToDesigner called with:", {
        designer: designer,
        tableFields: tableFields,
        designerHostElement: designer?.hostElement,
        designerProperties: {
            isToolboxInitialized: designer?._toolboxInitialized,
            hasJsonEditor: !!designer?._jsonEditor,
            hasHostElement: !!designer?.hostElement,
        },
    });

    if (!designer) {
        console.log("Designer is required but not provided");
        return;
    }

    // Initialize tableFields as empty array if not provided
    const availableFields = Array.isArray(tableFields) ? tableFields : [];

    // Function to show field picker modal
    const showFieldPicker = (input) => {
        console.log("Showing field picker for input:", input);
        const overlay = document.createElement("div");
        overlay.className = "acd-field-picker-overlay";
        designer.hostElement.appendChild(overlay);

        const modal = document.createElement("div");
        modal.className = "acd-field-picker-modal";
        modal.innerHTML = availableFields.length > 0
            ? '<div style="font-weight: bold; margin-bottom: 8px;">Select a field to insert:</div>'
            : '<div style="font-weight: bold; margin-bottom: 8px;">No fields available</div><div>Please select fields in the configuration panel.</div>';
        designer.hostElement.appendChild(modal);

        if (availableFields.length > 0) {
            availableFields.forEach((field) => {
                const item = document.createElement("div");
                item.className = "acd-field-item";
                item.textContent = `${field.column_label?.value || field.sys_name?.value} (${field.sys_name?.value})`;
                item.onclick = () => {
                    const reference = field.internal_type?.value === "reference"
                        ? `\${current.${field.sys_name?.value}.display_value}`
                        : `\${current.${field.sys_name?.value}}`;

                    console.log("Field selected:", { field, reference });

                    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
                        const start = input.selectionStart ?? 0;
                        const end = input.selectionEnd ?? start;
                        input.value = input.value.substring(0, start) + reference + input.value.substring(end);
                        input.dispatchEvent(new Event("input", { bubbles: true }));
                        input.dispatchEvent(new Event("change", { bubbles: true }));
                    }

                    overlay.remove();
                    modal.remove();
                };
                modal.appendChild(item);
            });
        }

        overlay.onclick = () => {
            overlay.remove();
            modal.remove();
        };
    };

    // Function to add field picker button to an input
    const addFieldPickerToInput = (input) => {
        console.log("Adding field picker to input:", {
            input: input,
            type: input.type,
            className: input.className,
            parentClassName: input.parentNode?.className,
            closestPropertySheet: input.closest("#propertySheetPanel"),
            parentElement: input.parentElement,
        });

        if (input.parentNode?.className === "property-input-wrapper") {
            console.log("Input already wrapped, skipping");
            return;
        }

        const isTextInput = input.matches('input[type="text"], textarea');
        const propertiesPane = input.closest("#propertySheetPanel");
        console.log("Input validation:", {
            isTextInput,
            hasPropertiesPane: !!propertiesPane,
            parentElements: Array.from(input.parentElement?.children || []).map(el => ({
                tagName: el.tagName,
                className: el.className,
            }))
        });

        if (!isTextInput || !propertiesPane) {
            console.log("Input validation failed, not adding picker");
            return;
        }

        const wrapper = document.createElement("div");
        wrapper.className = "property-input-wrapper";
        wrapper.style.position = "relative";
        wrapper.style.display = "flex";
        wrapper.style.alignItems = "center";

        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);

        const button = document.createElement("button");
        button.className = "acd-field-picker-button";
        button.title = "Insert field reference";
        button.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            showFieldPicker(input);
        };
        wrapper.appendChild(button);
        console.log("Added field picker button to input");
    };

    // Initialize mutation observer
    const observer = new MutationObserver((mutations) => {
        console.log("Mutation observer triggered:", mutations.length, "mutations");
        mutations.forEach((mutation) => {
            const propertiesPane = mutation.target.closest("#propertySheetPanel");
            if (!propertiesPane) {
                console.log("Mutation not in property sheet panel:", mutation.target);
                return;
            }

            console.log("Processing mutation:", {
                type: mutation.type,
                target: mutation.target,
                addedNodes: mutation.addedNodes.length
            });

            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                    console.log("Processing added node:", {
                        node: node,
                        className: node.className
                    });
                    const inputs = node.querySelectorAll('input[type="text"], textarea');
                    console.log(`Found ${inputs.length} inputs in added node`);
                    inputs.forEach(input => addFieldPickerToInput(input));
                }
            });
        });
    });

    // Set up field pickers
    const setupFieldPickers = () => {
        console.log("Setting up field pickers");
        console.log("Designer host element:", designer.hostElement);

        const shadowRoot = designer.hostElement.getRootNode();
        console.log("Shadow root:", shadowRoot);

        const propertiesPane = shadowRoot.querySelector("#propertySheetPanel");
        console.log("Found properties pane:", propertiesPane);

        if (!propertiesPane) {
            console.log("Properties pane not found, retrying in 100ms");
            setTimeout(setupFieldPickers, 100);
            return;
        }

        observer.observe(propertiesPane, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
            attributeFilter: ["style", "class"]
        });
        console.log("Started observing properties pane");

        const existingInputs = propertiesPane.querySelectorAll('input[type="text"], textarea');
        console.log(`Found ${existingInputs.length} existing inputs`);
        existingInputs.forEach(input => addFieldPickerToInput(input));
    };

    // Start the setup process
    setupFieldPickers();
};
