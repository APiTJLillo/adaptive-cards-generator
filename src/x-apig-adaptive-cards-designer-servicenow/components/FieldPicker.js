export const addFieldPickersToDesigner = (designer, tableFields, dispatch) => {
    console.log("addFieldPickersToDesigner called with:", {
        designer: designer,
        tableFieldsCount: tableFields?.length || 0,
        tableFieldsExample: tableFields?.length > 0 ? tableFields[0] : null,
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

    // Disconnect any previously registered observer to avoid duplicate
    // callbacks which could reference stale field data
    if (designer._fieldPickerObserver) {
        try {
            designer._fieldPickerObserver.disconnect();
        } catch (e) {
            console.warn("Failed to disconnect old field picker observer", e);
        }
        designer._fieldPickerObserver = null;
    }

    // Initialize tableFields as empty array if not provided
    // Store available fields on the designer so click handlers always use
    // the latest values even if they were created before fields loaded.
    const availableFields = Array.isArray(tableFields) ? tableFields : [];
    
    // Check if any fields appear to be reference fields but are missing required properties
    const fieldsWithIssues = availableFields.filter(field => 
        field.isReference && (!field.referenceTable || field.referenceTable === "")
    );
    
    if (fieldsWithIssues.length > 0) {
        console.warn("Found reference fields with missing reference tables:", 
            fieldsWithIssues.map(f => f.name).join(", "));
    }
    
    // Store fields on the designer for use by click handlers
    // Make sure we don't overwrite existing fields with an empty array
    if (availableFields.length > 0 || !Array.isArray(designer._availableFieldPickerFields)) {
        designer._availableFieldPickerFields = availableFields;
        console.log("Updated designer's available fields:", availableFields.length);
    } else {
        console.log("Preserving existing fields on designer:", designer._availableFieldPickerFields?.length || 0);
    }
    
    // Also store the dispatch function on the designer so it's available for reference field navigation
    if (typeof dispatch === "function") {
        designer._fieldPickerDispatch = dispatch;
    } else {
        console.warn("No dispatch function provided to addFieldPickersToDesigner, dot-walking may not work");
        // Create a safe fallback dispatch function that logs errors
        designer._fieldPickerDispatch = (type, payload) => {
            console.error("Cannot dispatch event, no dispatch function available", {type, payload});
            return false;
        };
    }
    
    // Log summary of available fields with more detailed information
    console.log("Field picker available fields:", 
        `Total: ${availableFields.length}, ` + 
        `Reference fields: ${availableFields.filter(f => f.isReference).length}`);
    
    // Log field type distribution to help debug
    const fieldTypes = {};
    availableFields.forEach(f => {
        const type = f.type || 'unknown';
        fieldTypes[type] = (fieldTypes[type] || 0) + 1;
    });
    console.log("Field types distribution:", fieldTypes);
    
    // Log detailed information about fields to help debug
    if (availableFields.length > 0) {
        console.log("First 3 fields sample:", 
            availableFields.slice(0, 3).map(f => ({ 
                name: f.name,
                type: f.type,
                isReference: !!f.isReference,
                refTable: f.referenceTable || null
            }))
        );
        
        // Log reference fields specifically
        const referenceFields = availableFields.filter(f => f.isReference);
        if (referenceFields.length > 0) {
            console.log("Reference fields:", 
                referenceFields.map(f => ({ 
                    name: f.name, 
                    refTable: f.referenceTable 
                }))
            );
        }
    }

    // Function to show field picker modal
    const showFieldPicker = (input, currentPath = "") => {
        designer._showFieldPicker = showFieldPicker;
        designer._lastFieldPickerInput = input;
        
        // Store the current dot walk path - this is what we'll prefix to field names
        designer._currentDotWalkPath = currentPath || "";
        
        console.log("Showing field picker with path:", designer._currentDotWalkPath);

        if (designer._fieldPickerOverlay) {
            designer._fieldPickerOverlay.remove();
            designer._fieldPickerOverlay = null;
        }
        if (designer._fieldPickerModal) {
            designer._fieldPickerModal.remove();
            designer._fieldPickerModal = null;
        }

        console.log("Showing field picker for input:", input);
        
        // Ensure we have fields - try multiple sources with fallbacks
        let fieldsForModal = Array.isArray(designer._availableFieldPickerFields) && 
            designer._availableFieldPickerFields.length > 0 ? 
            designer._availableFieldPickerFields : 
            availableFields || [];
            
        // Last resort - check if we have emergency backup on window
        if (fieldsForModal.length === 0 && window.__lastKnownTableFields && 
            Array.isArray(window.__lastKnownTableFields) && 
            window.__lastKnownTableFields.length > 0) {
            console.log("Using emergency backup fields from window.__lastKnownTableFields");
            fieldsForModal = window.__lastKnownTableFields;
            // Update the designer's fields with our recovery data
            designer._availableFieldPickerFields = window.__lastKnownTableFields;
        }
            
        console.log(
            "showFieldPicker: availableFields at modal creation:",
            "Count:", fieldsForModal.length,
            "Fields sample:", fieldsForModal.length > 0 ? 
                JSON.stringify(fieldsForModal.slice(0, 2), null, 2) : "No fields"
        );
                    
        // Double check that we have the designer host element
        if (!designer.hostElement) {
            console.error("Designer host element is missing, cannot show field picker");
            return;
        }

        const overlay = document.createElement("div");
        overlay.className = "acd-field-picker-overlay";
        designer.hostElement.appendChild(overlay);
        designer._fieldPickerOverlay = overlay;

        const modal = document.createElement("div");
        modal.className = "acd-field-picker-modal";
        
        // Check field availability - try multiple sources
        const fieldsAvailable = fieldsForModal.length > 0;
        
        if (fieldsAvailable) {
            // Create a more visually structured header showing the current path
            let headerContent = '<div style="font-weight: bold; margin-bottom: 8px;">Select a field to insert:</div>';
            
            // Show dot-walk path in a clear, structured way if we have one
            if (designer._currentDotWalkPath) {
                // Create a navigation breadcrumb-style path display
                const pathParts = designer._currentDotWalkPath.split('.');
                const pathDisplay = pathParts.map((part, index) => {
                    // Last part is highlighted
                    if (index === pathParts.length - 1) {
                        return `<span style="font-weight: bold;">${part}</span>`;
                    }
                    return part;
                }).join('<span style="margin: 0 3px; color: #666;">.</span>');
                
                headerContent += `
                    <div style="background-color: #f0f7ff; border: 1px solid #cce5ff; border-radius: 4px; padding: 6px 10px; margin-bottom: 12px;">
                        <div style="font-size: 0.85em; color: #555; margin-bottom: 2px;">Current path:</div>
                        <div style="color: #0066bb; font-size: 0.95em;">
                            ${pathDisplay}
                        </div>
                    </div>
                `;
            }
            
            // Add navigation links if we're in a dot-walk path
            if (designer._currentDotWalkPath) {
                // Create breadcrumb navigation
                const pathParts = designer._currentDotWalkPath.split('.');
                let breadcrumbs = '';
                let currentPath = '';
                
                // Create a breadcrumb for each path part
                pathParts.forEach((part, index) => {
                    // Build the path up to this part
                    currentPath = currentPath ? `${currentPath}.${part}` : part;
                    
                    // Add separator except for first item
                    if (index > 0) {
                        breadcrumbs += '<span style="margin: 0 5px; color: #666;"> › </span>';
                    }
                    
                    // For previous parts, make them clickable to navigate back
                    if (index < pathParts.length - 1) {
                        breadcrumbs += `<a href="#" class="path-nav-link" data-path="${currentPath}" 
                            style="color: #0066bb; text-decoration: none;">${part}</a>`;
                    } else {
                        // Current part is bold and not clickable
                        breadcrumbs += `<span style="font-weight: bold;">${part}</span>`;
                    }
                });
                
                // Add a "back" button at the beginning
                breadcrumbs = `<a href="#" class="path-nav-link" data-path="" 
                    style="color: #0066bb; text-decoration: none; margin-right: 8px;">
                    <span style="font-size: 1.1em;">⟵</span> root
                </a>` + breadcrumbs;
                
                // Add the breadcrumb navigation to the header
                headerContent += `
                    <div style="padding: 8px 0; margin-bottom: 10px; border-bottom: 1px solid #eee;">
                        ${breadcrumbs}
                    </div>
                `;
            }
            
            modal.innerHTML = headerContent;
            
            // Add event listeners for the navigation links
            if (designer._currentDotWalkPath) {
                const links = modal.querySelectorAll('.path-nav-link');
                links.forEach(link => {
                    link.onclick = (e) => {
                        e.preventDefault();
                        const targetPath = link.getAttribute('data-path');
                        
                        // Close current modal
                        overlay.remove();
                        modal.remove();
                        
                        // Reopen field picker with the selected path
                        showFieldPicker(input, targetPath);
                    };
                });
            }
            console.log("Created modal with fields heading, found", fieldsForModal.length, "fields");
            
            // Debug log the first field to help diagnose issues
            if (fieldsForModal.length > 0) {
                console.log("First field sample:", JSON.stringify(fieldsForModal[0], null, 2));
            }
        } else {
            // Add additional information and options when no fields are available
            modal.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 8px;">No fields available</div>
                <div style="margin-bottom: 16px;">Please ensure fields are configured for this component.</div>
                <div style="color: #666; font-size: 0.9em;">
                    You can check the following:
                    <ul style="margin: 8px 0; padding-left: 20px;">
                        <li>Table is selected in component properties</li>
                        <li>Fields are provided via the "fields" property</li>
                        <li>Table has fields that can be displayed</li>
                    </ul>
                </div>
            `;
            console.log("Created modal with no fields message - fields missing in designer");
        }
        
        designer.hostElement.appendChild(modal);
        designer._fieldPickerModal = modal;

        if (fieldsForModal.length > 0) {
            fieldsForModal.forEach((field, index) => {
                if (!field || !field.name) {
                    console.error(`Invalid field at index ${index}:`, field);
                    return; // Skip this field
                }
                
                const item = document.createElement("div");
                item.className = "acd-field-item";
                
                // Add a class if we're in a dot-walk path to style these items differently
                if (designer._currentDotWalkPath) {
                    item.classList.add("acd-field-item-dotwalked");
                    item.style.borderLeft = "3px solid #0066bb";
                    item.style.paddingLeft = "8px";
                    item.style.backgroundColor = "#f8f9fa";
                }

                const labelSpan = document.createElement("span");
                // Add a small icon or marker for reference fields
                const refMarker = field.isReference ? '🔗 ' : '';
                
                // Create label text showing field name/label
                const nameText = field.label && field.label !== field.name ? 
                    `${refMarker}${field.label} (${field.name})` : 
                    `${refMarker}${field.name}`;
                    
                // Show the current dot-walk path in a clear, more compact format
                if (designer._currentDotWalkPath) {
                    // Create a structured display for dot-walked fields
                    const pathPrefix = `<span class="acd-field-path-context" style="color: #0066bb; font-weight: normal; margin-right: 4px;">
                        ${designer._currentDotWalkPath}.
                    </span>`;
                    
                    // Combine the path and field name
                    labelSpan.innerHTML = pathPrefix + nameText;
                    
                    // Set a tooltip that shows the full reference
                    const fullPath = `${designer._currentDotWalkPath}.${field.name}`;
                    labelSpan.title = `Full path: ${fullPath}${field.isReference ? ' (reference field)' : ''}`;
                } else {
                    // No path, just show the field name
                    labelSpan.innerHTML = nameText;
                }
                
                // Make reference fields visually distinct
                if (field.isReference) {
                    labelSpan.style.fontWeight = 'bold';
                    labelSpan.title = `Reference to ${field.referenceLabel || field.referenceTable}`;
                }
                
                item.appendChild(labelSpan);

                if (field.isReference && field.referenceTable) {
                    const arrow = document.createElement("button");
                    arrow.type = "button";
                    arrow.className = "acd-field-reference-arrow";
                    arrow.textContent = "→";
                    arrow.title = `Show fields from ${field.referenceLabel || field.referenceTable}`;
                    
                    // Track reference field request status to prevent multiple clicks
                    let isRequestInProgress = false;
                    
                    arrow.onclick = (ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        
                        // Prevent rapid clicking causing multiple dispatches
                        if (isRequestInProgress) {
                            console.log("Reference field request already in progress, ignoring click");
                            return;
                        }
                        
                        // Set flag to prevent duplicate requests
                        isRequestInProgress = true;
                        
                        // Add a visual indicator to the arrow
                        const originalText = arrow.textContent;
                        arrow.textContent = "⏳";
                        arrow.disabled = true;
                        
                        // Reset the flag and visual indicator after some time
                        setTimeout(() => {
                            arrow.textContent = originalText;
                            arrow.disabled = false;
                            isRequestInProgress = false;
                        }, 2000);
                        
                        // Calculate new dot walk path
                        // Take current path and append this field's name
                        const newPath = designer._currentDotWalkPath ? 
                            `${designer._currentDotWalkPath}.${field.name}` : 
                            field.name;
                            
                        console.log(
                            "Dot-walk requested for", field.referenceTable, 
                            "with path:", newPath
                        );
                        
                        // Store the field name for the current dot walk path
                        designer._lastDotWalkField = field.name;
                        designer._lastDotWalkPath = newPath;

                        // Store the current field picker input so it can be reopened
                        // when the reference fields are loaded
                        designer._lastFieldPickerInput = input;

                        // Close current field picker modal
                        if (designer._fieldPickerOverlay) {
                            designer._fieldPickerOverlay.remove();
                            designer._fieldPickerOverlay = null;
                        }
                        if (designer._fieldPickerModal) {
                            designer._fieldPickerModal.remove();
                            designer._fieldPickerModal = null;
                        }
                        
                        // Find the dispatch function - from parameter or stored on designer
                        const dispatchFunction = typeof dispatch === "function" ? 
                            dispatch : 
                            designer._fieldPickerDispatch;
                            
                        try {
                            // For ServiceNow custom elements, we need to ensure we dispatch events 
                            // in multiple ways for maximum compatibility with different component types
                            
                            // 1. First, get the proper host element for DOM events
                            const rootNode = designer.hostElement.getRootNode();
                            const host = rootNode.host || designer.hostElement;
                            
                            // 2. Dispatch UI Core event first - this is the most reliable method for ServiceNow UI Builder
                            if (typeof dispatchFunction === "function") {
                                // Simple direct dispatch - matches UI Builder's expected format
                                dispatchFunction('REFERENCE_TABLE_FIELDS_REQUESTED', {
                                    tableName: field.referenceTable
                                });
                                
                                console.log(
                                    "UI Core dispatch sent with standard format for UI Builder",
                                    { tableName: field.referenceTable }
                                );
                            } else {
                                console.warn("No dispatch function available, falling back to DOM events only");
                            }
                            
                            // 3. Dispatch DOM events as backup for non-UI-Core consumers
                            // Use the namespaced version which is the ServiceNow standard with a DIFFERENT name
                            // to avoid triggering the same handler and causing loops
                            const customEvent = new CustomEvent("sn:REFERENCE_FIELDS_NEEDED", {
                                bubbles: true,
                                composed: true,
                                detail: { 
                                    tableName: field.referenceTable,
                                    table: field.referenceTable,
                                    timestamp: Date.now(), // Add timestamp to prevent deduplication
                                    source: "field-picker" // Add source to identify where this event came from
                                }
                            });
                            
                            host.dispatchEvent(customEvent);
                            console.log("Dispatched DOM custom event with unique name");
                        } catch (error) {
                            console.error("Error during reference table dispatch:", error);
                            
                            // Reset the request flag immediately
                            isRequestInProgress = false;
                            arrow.textContent = originalText;
                            arrow.disabled = false;
                            
                            // Show error in field picker
                            const errorModal = document.createElement("div");
                            errorModal.className = "acd-field-picker-modal";
                            errorModal.innerHTML = `
                                <div style="font-weight: bold; color: #d32f2f; margin-bottom: 8px;">
                                    Error requesting fields from ${field.referenceTable}
                                </div>
                                <div>${error.message}</div>
                                <button style="margin-top: 16px; padding: 8px 16px;" id="retry-reference-fields">Retry</button>
                                <button style="margin-top: 16px; margin-left: 8px; padding: 8px 16px;" id="cancel-reference-fields">Cancel</button>
                            `;
                            
                            designer.hostElement.appendChild(errorModal);
                            designer._fieldPickerModal = errorModal;
                            
                            // Add retry handler
                            const retryBtn = errorModal.querySelector("#retry-reference-fields");
                            if (retryBtn) {
                                retryBtn.onclick = () => {
                                    errorModal.remove();
                                    // Brief timeout before retry to ensure clean state
                                    setTimeout(() => {
                                        arrow.click(); // Retry the operation
                                    }, 100);
                                };
                            }
                            
                            // Add cancel button
                            const cancelBtn = errorModal.querySelector("#cancel-reference-fields");
                            if (cancelBtn) {
                                cancelBtn.onclick = () => {
                                    errorModal.remove();
                                    designer._fieldPickerModal = null;
                                    
                                    // Reopen the original field picker - preserve original path if any
                                    if (typeof designer._showFieldPicker === 'function') {
                                        // Get the previous path (before this reference click)
                                        // by removing the last segment from the current path
                                        let previousPath = '';
                                        if (designer._currentDotWalkPath && designer._currentDotWalkPath.includes('.')) {
                                            previousPath = designer._currentDotWalkPath.substring(0, 
                                                designer._currentDotWalkPath.lastIndexOf('.'));
                                        }
                                        
                                        // Reopen with the previous path context
                                        designer._showFieldPicker(input, previousPath);
                                    }
                                };
                            }
                        }
                    };
                    item.appendChild(arrow);
                }
                
                // Log whether this field is a reference field
                console.log(`Field ${field.name} isReference:`, field.isReference, "Type:", field.type);
                
                item.onclick = () => {
                    // Build the field reference path using any current dot-walk path
                    const fieldPath = designer._currentDotWalkPath ? 
                        `${designer._currentDotWalkPath}.${field.name}` : 
                        field.name;
                        
                    // Create the reference string with proper display_value for reference fields
                    const reference = field.isReference
                        ? `\${current.${fieldPath}.display_value}`
                        : `\${current.${fieldPath}}`;
                        
                    // Show a brief selection notification
                    const notification = document.createElement('div');
                    notification.className = 'acd-field-selected-notification';
                    notification.style.position = 'fixed';
                    notification.style.bottom = '20px';
                    notification.style.right = '20px';
                    notification.style.padding = '10px 15px';
                    notification.style.backgroundColor = '#4CAF50';
                    notification.style.color = 'white';
                    notification.style.borderRadius = '4px';
                    notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
                    notification.style.zIndex = '10000';
                    notification.innerHTML = `Added: <strong>${fieldPath}</strong>`;
                    document.body.appendChild(notification);
                    
                    // Remove notification after 2 seconds
                    setTimeout(() => {
                        notification.style.opacity = '0';
                        notification.style.transition = 'opacity 0.5s';
                        setTimeout(() => notification.remove(), 500);
                    }, 2000);

                    console.log("Field selected:", { 
                        field, 
                        reference, 
                        isRef: field.isReference,
                        dotWalkPath: designer._currentDotWalkPath 
                    });

                    if (input instanceof HTMLSelectElement) {
                        // Add option if it doesn't exist
                        if (![...input.options].some(o => o.value === reference)) {
                            input.add(new Option(reference, reference));
                        }
                        input.value = reference;
                        input.dispatchEvent(new Event("change", { bubbles: true }));
                    } else if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
                        const start = input.selectionStart ?? 0;
                        const end = input.selectionEnd ?? start;
                        input.value = input.value.substring(0, start) + reference + input.value.substring(end);
                        input.dispatchEvent(new Event("input", { bubbles: true }));
                        input.dispatchEvent(new Event("change", { bubbles: true }));
                    }

                    overlay.remove();
                    modal.remove();
                    designer._fieldPickerOverlay = null;
                    designer._fieldPickerModal = null;
                };
                modal.appendChild(item);
            });
        }

        overlay.onclick = () => {
            overlay.remove();
            modal.remove();
            designer._fieldPickerOverlay = null;
            designer._fieldPickerModal = null;
        };
    };

    // Function to add or update field picker button for an input
    const addFieldPickerToInput = (input) => {
        console.log("Adding/Updating field picker for input:", {
            input: input,
            type: input.type,
            className: input.className,
            parentClassName: input.parentNode?.className,
            closestPropertySheet: input.closest("#propertySheetPanel"),
            parentElement: input.parentElement,
        });

        const isTextInput = input.matches('input[type="text"], textarea, select');
        const propertiesPane = input.closest("#propertySheetPanel");

        if (!isTextInput || !propertiesPane) {
            console.log("Input validation failed, not adding/updating picker");
            return;
        }

        let wrapper = input.parentNode;
        let button = null;

        // Check if the input is already wrapped
        if (wrapper?.className === "property-input-wrapper") {
            console.log("Input already wrapped, finding existing button.");
            button = wrapper.querySelector(".acd-field-picker-button");
            if (button) {
                console.log("Existing button found. Updating its click handler.");
                // Update the existing button's click handler to use the current showFieldPicker
                button.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    showFieldPicker(input); // Use the showFieldPicker from the current scope
                };
                console.log("Updated click handler for existing button.");
                return; // Button handler updated, nothing more to do for this input
            } else {
                console.warn("Wrapper found but button missing. Proceeding to create button.");
                // Button missing, fall through to create it within the existing wrapper
            }
        } else {
            console.log("Input not wrapped. Creating wrapper and button.");
            // Input is not wrapped, create the wrapper
            wrapper = document.createElement("div");
            wrapper.className = "property-input-wrapper";
            wrapper.style.position = "relative";
            wrapper.style.display = "flex";
            wrapper.style.alignItems = "center";

            // Insert the wrapper before the input and move the input inside
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(input);
        }

        // Create the button if it wasn't found or if the wrapper was just created
        if (!button) {
            button = document.createElement("button");
            button.className = "acd-field-picker-button";
            button.title = "Insert field reference";
            button.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Just before opening the picker, double check that we have fields
                if (!designer._availableFieldPickerFields || designer._availableFieldPickerFields.length === 0) {
                    console.warn("No fields available when opening field picker, checking for fields in closure");
                    designer._availableFieldPickerFields = availableFields || [];
                }
                
                // Log the state of fields just before opening the picker
                console.log("Fields before opening picker:", {
                    fieldsFromDesigner: designer._availableFieldPickerFields?.length || 0,
                    fieldsFromClosure: availableFields?.length || 0
                });
                
                showFieldPicker(input); // Use the showFieldPicker from the current scope
            };
            wrapper.appendChild(button);
            console.log("Added new field picker button to input/wrapper.");
        }
    };

    // Before we set up the observer, check if fields are available
    if (availableFields.length === 0) {
        console.warn("No fields available for field picker. This might cause issues when trying to pick fields.");
    }
    
    // Initialize mutation observer
    const observer = new MutationObserver((mutations) => {
        console.log("Mutation observer triggered:", mutations.length, "mutations");
        // Re-check field availability on DOM changes in case fields were updated
        if ((designer._availableFieldPickerFields || []).length === 0) {
            console.warn("No fields available during mutation observer callback");
        }
        
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
                    const inputs = node.querySelectorAll('input[type="text"], textarea, select');
                    console.log(`Found ${inputs.length} inputs in added node`);
                    inputs.forEach(input => addFieldPickerToInput(input));
                }
            });
        });
    });
    // store observer on designer so it can be cleaned up on subsequent calls
    designer._fieldPickerObserver = observer;

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

        const existingInputs = propertiesPane.querySelectorAll('input[type="text"], textarea, select');
        console.log(`Found ${existingInputs.length} existing inputs`);
        existingInputs.forEach(input => addFieldPickerToInput(input));
    };

    // Start the setup process
    setupFieldPickers();
};
