import * as monaco from "monaco-editor";
import * as ACDesigner from "adaptivecards-designer";
import { ServiceNowCardDesigner } from '../components/ServiceNowCardDesigner.js';
import { createGlobalDocumentProxy } from '../util/DocumentProxy.js';
import { designerStyles, monacoStyles } from '../styles/designerStyles.js';
import { codiconStyles, codiconModifierStyles, codiconFontFace } from '../styles/codiconStyles.js';
import fabricIcons from '../fabricmdl2icons-3.54.woff';

const ensureGlobalFonts = () => {
        if (!document.getElementById('designer-fonts')) {
                const style = document.createElement('style');
                style.id = 'designer-fonts';
                style.textContent = `
        @font-face {
            font-family: "FabricMDL2Icons";
            src: url("${fabricIcons}") format("woff");
        }
        ${codiconFontFace}
        `;
                document.head.appendChild(style);
        }
};
import { areJsonEqual, debounce } from '../util/state-utils.js';

export const initializeDesigner = async (properties, updateState, host, dispatch, state) => {
        try {
                ensureGlobalFonts();
                const shadowRoot = host.shadowRoot;
		shadowRoot.innerHTML = ""; // Clear any existing content
		const mainStyles = document.createElement("style");
		mainStyles.textContent = designerStyles;
		shadowRoot.appendChild(mainStyles);

		// Add custom Monaco styles
                const monacoStylesElement = document.createElement("style");
                monacoStylesElement.textContent = monacoStyles;
                shadowRoot.appendChild(monacoStylesElement);

                const codiconStylesElement = document.createElement("style");
                codiconStylesElement.textContent = codiconStyles + codiconModifierStyles;
                shadowRoot.appendChild(codiconStylesElement);

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
                designer.assetPath = "https://adaptivecards.microsoft.com";

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

                // Store initial card state
                host.__currentCardState = initialCard;
                
                // Create debounced updateJsonFromCard function
                const debouncedUpdateJson = debounce((cardPayload) => {
                    if (!areJsonEqual(cardPayload, host.__currentCardState)) {
                        host.__currentCardState = cardPayload;
                        updateState((state) => ({
                            ...state,
                            currentCardState: cardPayload,
                            designer: designer
                        }));

                        const cardString = JSON.stringify(cardPayload);
                        if (typeof dispatch === "function") {
                            dispatch("CARD_STATE_CHANGED", {
                                card: cardPayload,
                                cardString
                            });
                        }
                    }
                }, 250); // 250ms debounce
                
                // Override updateJsonFromCard to use debouncing and comparison
                const originalSetJsonFromCard = designer.updateJsonFromCard.bind(designer);
                designer.updateJsonFromCard = () => {
                    try {
                        const cardPayload = designer.getCard();
                        debouncedUpdateJson(cardPayload);
                        originalSetJsonFromCard();
                    } catch (error) {
                        console.error("Error in updateJsonFromCard:", error);
                    }
                };

                // Update initial state
                updateState((state) => ({
                    ...state,
                    designerInitialized: true,
                    designer: designer,
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

             const cardString = JSON.stringify(cardPayload);
             if (typeof dispatch === "function") {
                     dispatch("CARD_STATE_CHANGED", {
                             card: cardPayload,
                             cardString
                     });
             }
             const changeEvent = new CustomEvent("sn:CARD_STATE_CHANGED", {
                     bubbles: true,
                     composed: true,
                     detail: { card: cardPayload, cardString }
             });
             host.dispatchEvent(changeEvent);

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
              host.__currentCardState = initialCard;

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

                host.__currentCardState = designer.getCard();
                updateState({
                        status: "Designer initialized successfully",
                        designerInitialized: true,
                        designer: designer,
                        properties: properties,
                });

		return designer;
	} catch (error) {
		console.error("Error initializing Monaco editor:", error);
		throw error;
	}
};
