import { createCustomElement, actionTypes } from "@servicenow/ui-core";
import snabbdom from "@servicenow/ui-renderer-snabbdom";
import { ServiceNowCardDesigner } from './components/ServiceNowCardDesigner.js';
import { view } from './components/DesignerView.js';
import { initializeDesigner } from './components/DesignerInitializer.js';
import { addFieldPickersToDesigner } from './components/FieldPicker.js';
import { processTableFields, processCardData } from './util/servicenow-data-processor.js';
import { loadCard } from './util/cardStorage.js';

// Main component definition
createCustomElement("x-apig-adaptive-cards-designer-servicenow", {
        renderer: { type: snabbdom },
        view,
        dispatches: {
                // Simple direct event for UI Builder visual mapping - matches the format in now-ui.json
                // This is what UI Builder expects when using visual mapping
                "REFERENCE_TABLE_FIELDS_REQUESTED": {
                        schema: {
                                type: "object",
                                properties: {
                                        tableName: { type: "string" }
                                },
                                additionalProperties: false
                        }
                },
                // Event for cleanup when a field is selected
                "FIELD_SELECTION_COMPLETE": {
                        schema: {
                                type: "object",
                                properties: {
                                        cleanupRequired: { type: "boolean" }
                                },
                                additionalProperties: false
                        }
                },
               "CARD_STATE_CHANGED": {
                       schema: {
                               type: "object",
                               properties: {
                                       card: { type: "object" },
                                       cardString: { type: "string" }
                                },
                                additionalProperties: false
                        }
                },
                "LOAD_CARD": {
                        schema: {
                                type: "object",
                                properties: {
                                        card: { type: "object" },
                                        sysId: { type: "string" }
                                },
                                additionalProperties: false
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
                isLoadingReferenceFields: false,
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
				// Add listener for field selection complete event
				host.addEventListener('sn:FIELD_SELECTION_COMPLETE', (event) => {
					console.log("Field selection complete event received, cleaning up modals");
					
					// Reset loading state
					updateState({ isLoadingReferenceFields: false });
					
					// Clean up any remaining modals
					if (state.designer && state.designer.hostElement) {
						const allModals = state.designer.hostElement.querySelectorAll('.acd-field-picker-modal');
						console.log(`Found ${allModals.length} modals to clean up from field selection`);
						allModals.forEach(modal => modal.remove());
						
						// Also clean overlays
						const allOverlays = state.designer.hostElement.querySelectorAll('.acd-field-picker-overlay');
						allOverlays.forEach(overlay => overlay.remove());
						
						// Ensure the modal references are cleared
						if (state.designer._fieldPickerModal) {
							state.designer._fieldPickerModal = null;
						}
						if (state.designer._fieldPickerOverlay) {
							state.designer._fieldPickerOverlay = null;
						}
					}
				});
				
				// Add listener for DOM custom events that might come from parent components
				host.addEventListener('sn:REFERENCE_TABLE_FIELDS_REQUESTED', (event) => {
					if (event.detail && (event.detail.tableName || event.detail.table)) {
						const tableName = event.detail.tableName || event.detail.table;
						console.log("Received DOM event for reference table:", tableName);
						
						// Check if we're already loading reference fields to prevent loops
						if (!state.isLoadingReferenceFields) {
							// Simple direct dispatch - just like your button example
							dispatch('REFERENCE_TABLE_FIELDS_REQUESTED', {
								tableName: tableName
							});
							// Set loading flag to prevent duplicate dispatches
							updateState({ isLoadingReferenceFields: true });
						} else {
							console.log("Already loading reference fields, skipping duplicate dispatch");
						}
					}
				});
				
				// Add listener for the new event name we're using from the field picker
				host.addEventListener('sn:REFERENCE_FIELDS_NEEDED', (event) => {
					if (event.detail && (event.detail.tableName || event.detail.table)) {
						const tableName = event.detail.tableName || event.detail.table;
						console.log("Received new-format DOM event for reference table:", tableName);
						
						// Check if we're already loading reference fields to prevent loops
						if (!state.isLoadingReferenceFields) {
							// Simple direct dispatch - just like your button example
							dispatch('REFERENCE_TABLE_FIELDS_REQUESTED', {
								tableName: tableName
							});
							// Set loading flag to prevent duplicate dispatches
							updateState({ isLoadingReferenceFields: true });
						} else {
							console.log("Already loading reference fields, skipping duplicate dispatch");
						}
					}
				});
			
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
                                        host,
                                        dispatch
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
					
					// Update state with the processed fields
					updateState({ tableFields: parsedFields });

					// Add field pickers to the designer right away since we have the instance
					if (designer) {
                                                // Store fields directly on the designer as a property
                                                designer._availableFieldPickerFields = parsedFields;
                                                
                                                // Double check we have some fields
                                                console.log(`Adding ${parsedFields.length} fields to field picker`);
                                                
                                                // Then call addFieldPickersToDesigner which sets up the observers and handlers
                                                addFieldPickersToDesigner(designer, parsedFields, dispatch);
                                                
                                                // Save the fields on the window for emergency recovery
                                                window.__lastKnownTableFields = parsedFields;
                                                
                                                // Log the state of fields on the designer after setup
                                                console.log("Fields stored on designer:", {
                                                    count: designer._availableFieldPickerFields?.length || 0,
                                                    sample: designer._availableFieldPickerFields?.length > 0 ? 
                                                        JSON.stringify(designer._availableFieldPickerFields[0], null, 2) : "No fields"
                                                });
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
                                        console.log(
                                            "COMPONENT_CONNECTED: Parsed referenceFields count:",
                                            parsedFields.length
                                        );
                                        if (parsedFields.length > 0) {
                                            console.log(
                                                "COMPONENT_CONNECTED: First reference field:",
                                                JSON.stringify(parsedFields[0], null, 2)
                                            );
                                        }

                                        updateState({ referenceFields: parsedFields });

                                        if (designer) {
                                                addFieldPickersToDesigner(designer, parsedFields, dispatch);
                                        }
                                }

                                if (properties.referenceTable) {
                                        console.log(
                                            "COMPONENT_CONNECTED: referenceTable provided",
                                            properties.referenceTable
                                        );
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
                                
                                // Get current reference table
                                const currentReferenceTable = state.referenceTable || "";
                                
                                // Update the cache with the new fields for the current reference table
                                const newCache = { ...state.referenceCache };
                                
                                if (currentReferenceTable) {
                                        console.log(`Caching ${parsedFields.length} fields for reference table ${currentReferenceTable}`);
                                        newCache[currentReferenceTable] = parsedFields;
                                } else {
                                        console.warn("No current reference table set, can't cache fields properly");
                                }

                                // Update state with new fields and cache, and reset loading state
                                updateState({ 
                                        referenceFields: parsedFields, 
                                        referenceCache: newCache,
                                        isLoadingReferenceFields: false 
                                });

                                if (state.designer) {
                                        // Clean up ALL field picker modals before showing new ones
                                        // This ensures proper cleanup especially after field selection
                                        const cleanupAllModals = () => {
                                            if (state.designer.hostElement) {
                                                const allModals = state.designer.hostElement.querySelectorAll('.acd-field-picker-modal');
                                                allModals.forEach(modal => modal.remove());
                                                
                                                const allOverlays = state.designer.hostElement.querySelectorAll('.acd-field-picker-overlay');
                                                allOverlays.forEach(overlay => overlay.remove());
                                            }
                                        };
                                        
                                        // Run cleanup
                                        cleanupAllModals();
                                        
                                        // Then add the field pickers with the new fields
                                        addFieldPickersToDesigner(state.designer, parsedFields, dispatch);
                                        
                                        // Wait a moment before reopening the field picker to avoid any race conditions
                                        setTimeout(() => {
                                            if (state.designer._showFieldPicker && state.designer._lastFieldPickerInput) {
                                                // Run cleanup again in case any new modals appeared
                                                cleanupAllModals();
                                                
                                                console.log("Reopening field picker with new reference fields");
                                                
                                                // Get the dot-walk path that was stored when the reference field was clicked
                                                const dotWalkPath = state.designer._lastDotWalkPath || "";
                                                
                                                console.log("Using dot walk path for reopened picker:", dotWalkPath);
                                                
                                                // Pass the dot-walk path to the field picker so it can build the proper field references
                                                state.designer._showFieldPicker(
                                                    state.designer._lastFieldPickerInput, 
                                                    dotWalkPath
                                                );
                                            }
                                        }, 50);
                                } else {
                                        console.warn("Designer not initialized yet, field pickers will be added when it's ready");
                                }

                        } else if (name === "referenceTable") {
                                // Always update the reference table state
                                updateState({ referenceTable: value });
                                
                                // If we have cached fields for this table
                                if (state.referenceCache[value] && state.designer) {
                                        console.log(`Using cached fields for reference table ${value}:`, 
                                            state.referenceCache[value].length);
                                        
                                        // Update the designer with these fields
                                        addFieldPickersToDesigner(state.designer, state.referenceCache[value], dispatch);
                                        
                                        // Reopen the field picker if it was open
                                        if (state.designer._showFieldPicker && state.designer._lastFieldPickerInput) {
                                                console.log("Reopening field picker with cached fields");
                                                
                                                // Get the dot-walk path that was stored when the reference field was clicked
                                                const dotWalkPath = state.designer._lastDotWalkPath || "";
                                                
                                                console.log("Using dot walk path for reopened picker with cached fields:", dotWalkPath);
                                                
                                                // Pass the dot-walk path to the field picker so it can build the proper references
                                                state.designer._showFieldPicker(
                                                    state.designer._lastFieldPickerInput,
                                                    dotWalkPath
                                                );
                                        }
                                } else {
                                        console.log(`No cached fields found for reference table ${value}, need to request them`);
                                        
                                        // Simple direct event dispatch for UI Builder
                                        try {
                                            // Since we only want to dispatch this once, check if we're already loading
                                            if (!state.isLoadingReferenceFields) {
                                                // Use direct dispatch format matching the example
                                                dispatch('REFERENCE_TABLE_FIELDS_REQUESTED', {
                                                    tableName: value
                                                });
                                                
                                                // Set loading state to prevent repeated dispatches
                                                updateState({isLoadingReferenceFields: true});
                                                console.log("Dispatched event for reference table:", value);
                                            } else {
                                                console.log("Already loading reference fields, skipping duplicate dispatch");
                                            }
                                        } catch (error) {
                                            console.error("Error dispatching reference table event:", error);
                                        }
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

                                                if (state.designer.updateJsonFromCard) {
                                                    state.designer.updateJsonFromCard();
                                                }

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
                // Legacy handler name - keeping for compatibility but redirecting to the new handler
                "reference-table-requested": ({ action, updateState, dispatch, state }) => {
                        // Redirect to the new uppercase handler by redispatching
                        console.log("Legacy handler 'reference-table-requested' called, redirecting to REFERENCE_TABLE_FIELDS_REQUESTED");
                        
                        // If we have a tableName, extract it and redispatch
                        let tableName = null;
                        if (action) {
                            if (typeof action === 'object') {
                                tableName = action.tableName || action.table;
                                if (action.payload && typeof action.payload === 'object') {
                                    tableName = tableName || action.payload.tableName || action.payload.table;
                                }
                            } else if (typeof action === 'string') {
                                tableName = action;
                            }
                        }
                        
                        if (tableName) {
                            // Check if we're already loading reference fields to prevent infinite loops
                            if (!state.isLoadingReferenceFields) {
                                // Redispatch with the correct format
                                dispatch('REFERENCE_TABLE_FIELDS_REQUESTED', {
                                    tableName: tableName
                                });
                                // Set loading state to prevent repeated dispatches
                                updateState({isLoadingReferenceFields: true});
                            } else {
                                console.log("Already loading reference fields, skipping duplicate dispatch");
                            }
                        } else {
                            console.error("Could not extract tableName from legacy action:", action);
                        }
                },
                
                // Main handler with the correct uppercase name
                "REFERENCE_TABLE_FIELDS_REQUESTED": ({ action, updateState, dispatch, state }) => {
                        // Simplified extraction focused on the direct format
                        let tableName = null;
                        
                        // For debugging: log the full action structure
                        console.log("REFERENCE_TABLE_FIELDS_REQUESTED action received:", action);
                        
                        // Try to extract tableName - simplified to handle direct format
                        if (action) {
                            // Handle simple string value
                            if (typeof action === 'string') {
                                tableName = action;
                            }
                            // Handle object with direct properties (UI Builder format)
                            else if (typeof action === 'object') {
                                tableName = action.tableName || action.table;
                                
                                // If not found at top level, check payload
                                if (!tableName && action.payload) {
                                    if (typeof action.payload === 'string') {
                                        tableName = action.payload;
                                    }
                                    else if (typeof action.payload === 'object') {
                                        tableName = action.payload.tableName || action.payload.table;
                                    }
                                }
                                
                                // If still not found, check for event detail format
                                if (!tableName && action.detail) {
                                    tableName = action.detail.tableName || action.detail.table;
                                }
                            }
                        }
                        
                        console.log("Extracted table name:", tableName);
                        
                        if (!tableName) {
                                console.error("No table name found in action payload");
                                return;
                        }

                        // Create a loading indicator 
                        if (state.designer && state.designer.hostElement) {
                                const loadingModal = document.createElement("div");
                                loadingModal.className = "acd-field-picker-modal";
                                loadingModal.innerHTML = `
                                    <div style="font-weight: bold; margin-bottom: 8px;">Loading fields from ${tableName}...</div>
                                    <div style="display: flex; justify-content: center;">
                                        <div class="acd-loading-spinner"></div>
                                    </div>
                                `;
                                state.designer.hostElement.appendChild(loadingModal);
                                state.designer._fieldPickerModal = loadingModal;
                        }
                        
                        // Update the reference table in the state and set loading flag
                        updateState({ 
                                referenceTable: tableName,
                                isLoadingReferenceFields: true 
                        });
                        
                        // Safety timeout to reset loading state if no fields come back
                        setTimeout(() => {
                            if (state.isLoadingReferenceFields) {
                                console.log("Safety timeout: Resetting loading state after timeout");
                                updateState({ isLoadingReferenceFields: false });
                            }
                        }, 10000); // 10 seconds timeout
                        
                        // With ServiceNow UI Builder, we ALREADY have dispatched the event
                        // DO NOT dispatch the same event again - this causes infinite loops
                        try {
                            console.log("Reference table fields requested for table:", tableName);
                            
                            // As a backup for components that might be listening for DOM events,
                            // but use a DIFFERENT event name to avoid loops
                            if (state.designer && state.designer.hostElement) {
                                // Get the host element
                                const eventHost = state.designer.hostElement.getRootNode().host || 
                                                 state.designer.hostElement;
                                                 
                                // Create and dispatch a DOM event with a different name
                                const customEvent = new CustomEvent("sn:REFERENCE_FIELDS_LOADING", {
                                    bubbles: true,
                                    composed: true,
                                    detail: { 
                                        tableName: tableName,
                                        timestamp: Date.now()
                                    }
                                });
                                eventHost.dispatchEvent(customEvent);
                            }
                        } catch (error) {
                            console.error("Error dispatching reference table fields request:", error);
                            
                            // Reset loading state since we encountered an error
                            updateState({ isLoadingReferenceFields: false });
                            
                            // Show error in the loading modal
                            if (state.designer && state.designer._fieldPickerModal) {
                                state.designer._fieldPickerModal.innerHTML = `
                                    <div style="color: #d32f2f; font-weight: bold; margin-bottom: 8px;">
                                        Failed to request fields from ${tableName}
                                    </div>
                                    <div>${error.message}</div>
                                    <button id="retry-ref-request" style="margin-top: 16px; padding: 8px 16px;">Retry</button>
                                `;
                                
                                // Add retry button handler
                                const retryBtn = state.designer._fieldPickerModal.querySelector("#retry-ref-request");
                                if (retryBtn) {
                                    retryBtn.onclick = () => {
                                        // Reset loading state before retry
                                        updateState({ isLoadingReferenceFields: false });
                                        // Then dispatch the request
                                        dispatch('REFERENCE_TABLE_FIELDS_REQUESTED', {
                                            tableName: tableName
                                        });
                                    };
                                }
                            }
                        }
                },
                "LOAD_CARD": async ({ action, state, updateState }) => {
                        let cardData = null;
                        if (action) {
                                if (typeof action.card === "object") {
                                        cardData = action.card;
                                } else if (action.payload && typeof action.payload.card === "object") {
                                        cardData = action.payload.card;
                                }

                                if (!cardData && action.sysId) {
                                        try {
                                                cardData = await loadCard(action.sysId);
                                        } catch (error) {
                                                console.error("Error loading card:", error);
                                        }
                                }
                        }

                        if (cardData && state.designer) {
                                const processed = processCardData(cardData);
                                state.designer.setCard(processed);

                                if (state.designer.updateJsonFromCard) {
                                    state.designer.updateJsonFromCard();
                                }

                                updateState({ currentCardState: processed });
                        }
                },
                [actionTypes.COMPONENT_DISCONNECTED]: ({ host }) => {
			if (host.shadowRoot) {
				host.shadowRoot.innerHTML = "";
			}
		},
                // Handler for cleanup after field selection
                "FIELD_SELECTION_COMPLETE": ({ state, updateState }) => {
                        console.log("FIELD_SELECTION_COMPLETE action handler triggered");
                        
                        // Reset the loading state
                        updateState({ isLoadingReferenceFields: false });
                        
                        // Clean up any modals that might be lingering
                        if (state.designer && state.designer.hostElement) {
                                const allModals = state.designer.hostElement.querySelectorAll('.acd-field-picker-modal');
                                console.log(`UI Core handler found ${allModals.length} modals to clean up`);
                                allModals.forEach(modal => modal.remove());
                                
                                // Also clean up overlays
                                const allOverlays = state.designer.hostElement.querySelectorAll('.acd-field-picker-overlay');
                                allOverlays.forEach(overlay => overlay.remove());
                        }
                },
	},
});
