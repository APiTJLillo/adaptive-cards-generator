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
        dispatches: {
                "reference-table-requested": {
                        schema: {
                                type: "object",
                                properties: {
                                        tableName: { type: "string" }
                                }
                        }
                }
        },
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
                referenceFields: {
                        schema: {
                                type: "array",
                                items: { type: "object" },
                        },
                        default: [],
                        required: false,
                },
                referenceTable: {
                        schema: { type: "string" },
                        default: "",
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
                referenceTable: "",
                referenceFields: [],
                referenceCache: {},
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
				console.log("COMPONENT_CONNECTED: Starting with properties:", {
				    hasFields: !!properties.fields,
				    fieldsIsArray: Array.isArray(properties.fields),
				    fieldsLength: Array.isArray(properties.fields) ? properties.fields.length : 'N/A',
				    fieldsType: typeof properties.fields
				});
				
				// First initialize the designer
				const designer = await initializeDesigner(
					properties,
					updateState,
					host
				);
				
				console.log("COMPONENT_CONNECTED: Designer initialized:", !!designer);

				// After designer is initialized, handle fields if provided
                                if (properties.fields) {
					console.log("COMPONENT_CONNECTED: Processing fields data");
					
					// Ensure we handle both array and non-array cases
					const fieldsArray = Array.isArray(properties.fields) ? properties.fields : 
					                   (typeof properties.fields === 'object' && properties.fields !== null) ? 
					                   [properties.fields] : [];
					                   
					// Process the fields
					const parsedFields = processTableFields(fieldsArray);
					
					console.log("COMPONENT_CONNECTED: Processed fields count:", parsedFields.length);
					if (parsedFields.length > 0) {
					    console.log("COMPONENT_CONNECTED: First processed field:", JSON.stringify(parsedFields[0], null, 2));
					}
					
					updateState({ tableFields: parsedFields });

					// Add field pickers to the designer right away since we have the instance
					if (designer) {
                                                addFieldPickersToDesigner(designer, parsedFields, dispatch);
					} else {
						console.warn("Designer not properly initialized, field pickers couldn't be added");
					}
                                } else {
                                        console.log("COMPONENT_CONNECTED: No fields provided in properties");
                                }

                                if (properties.referenceFields) {
                                        const fieldsArray = Array.isArray(properties.referenceFields) ? properties.referenceFields :
                                                               (typeof properties.referenceFields === 'object' && properties.referenceFields !== null) ?
                                                               [properties.referenceFields] : [];

                                        const parsedFields = processTableFields(fieldsArray);
                                        updateState({ referenceFields: parsedFields });

                                        if (designer) {
                                                addFieldPickersToDesigner(designer, parsedFields, dispatch);
                                        }
                                }

                                if (properties.referenceTable) {
                                        updateState({ referenceTable: properties.referenceTable });
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
            console.log("Property changed:", { name, value, valueType: typeof value });

                        if (name === "fields" && value) {
				console.log("COMPONENT_PROPERTY_CHANGED: Received fields update. Raw value type:", typeof value, 
				            "Is array?", Array.isArray(value),
				            "Length:", Array.isArray(value) ? value.length : 'N/A',
				            "Sample:", Array.isArray(value) && value.length > 0 ? JSON.stringify(value[0], null, 2) : 'No items');
				
				// Process the fields using our utility function - ensure we're passing an array
				const fieldsArray = Array.isArray(value) ? value : 
				                   (typeof value === 'object' && value !== null) ? [value] : [];
				                   
				const parsedFields = processTableFields(fieldsArray);
				
				console.log("COMPONENT_PROPERTY_CHANGED: Parsed fields count:", parsedFields.length);
				if (parsedFields.length > 0) {
				    console.log("COMPONENT_PROPERTY_CHANGED: First parsed field:", JSON.stringify(parsedFields[0], null, 2));
				}
				
				// Update state with the new fields
				updateState({ tableFields: parsedFields });
				
				// Add field pickers if designer is initialized
                                if (state.designer) {
                                        addFieldPickersToDesigner(state.designer, parsedFields, dispatch);
                                } else {
                                        console.warn("Designer not initialized yet, field pickers will be added when it's ready");
                                }
                        } else if (name === "referenceFields" && value) {
                                const fieldsArray = Array.isArray(value) ? value :
                                                   (typeof value === 'object' && value !== null) ? [value] : [];

                                const parsedFields = processTableFields(fieldsArray);

                                const newCache = { ...state.referenceCache };
                                if (state.referenceTable) {
                                        newCache[state.referenceTable] = parsedFields;
                                }

                                updateState({ referenceFields: parsedFields, referenceCache: newCache });

                                if (state.designer) {
                                        addFieldPickersToDesigner(state.designer, parsedFields, dispatch);
                                        if (state.designer._showFieldPicker && state.designer._lastFieldPickerInput) {
                                                state.designer._showFieldPicker(state.designer._lastFieldPickerInput);
                                        }
                                } else {
                                        console.warn("Designer not initialized yet, field pickers will be added when it's ready");
                                }
                        } else if (name === "referenceTable") {
                                if (state.referenceCache[value] && state.designer) {
                                        addFieldPickersToDesigner(state.designer, state.referenceCache[value], dispatch);
                                        if (state.designer._showFieldPicker && state.designer._lastFieldPickerInput) {
                                                state.designer._showFieldPicker(state.designer._lastFieldPickerInput);
                                        }
                                }
                                updateState({ referenceTable: value });
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
