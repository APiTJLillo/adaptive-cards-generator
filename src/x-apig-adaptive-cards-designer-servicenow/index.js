import { createCustomElement, actionTypes } from "@servicenow/ui-core";
import snabbdom from "@servicenow/ui-renderer-snabbdom";
import { ServiceNowCardDesigner } from './components/ServiceNowCardDesigner.js';
import { view } from './components/DesignerView.js';
import { initializeDesigner } from './components/DesignerInitializer.js';
import { addFieldPickersToDesigner } from './components/FieldPicker.js';
import { processTableFields, processCardData } from './util/servicenow-data-processor.js';

// Main component definition
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
					const parsedFields = processTableFields(properties.fields);
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
            const { name, value } = action.payload;
				console.log("Property changed:", { name, value });

			if (name === "fields" && Array.isArray(value)) {
				console.log("COMPONENT_PROPERTY_CHANGED: Received fields update. Raw value:", JSON.stringify(value, null, 2));
				
				// Process the fields using our utility function
				const parsedFields = processTableFields(value);
				
				console.log("COMPONENT_PROPERTY_CHANGED: Parsed fields:", JSON.stringify(parsedFields, null, 2));
				
				updateState({ tableFields: parsedFields });
				
				// Add field pickers if designer is initialized
				if (state.designer) {
					addFieldPickersToDesigner(state.designer, parsedFields);
				}
			} else if (
				name === "predefinedCard" &&
				state.designerInitialized &&
				state.designer
			) {
				console.log("Updating card with new value:", value);
				const maxRetries = 3;
				let lastError = null;

				for (let i = 0; i < maxRetries; i++) {
					try {
						// Add a small delay between retries
						await new Promise((resolve) => setTimeout(resolve, 100 * (i + 1)));

						// Process the card data using our utility function
						const cardData = processCardData(value);

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
