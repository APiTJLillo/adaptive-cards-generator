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
    designer._availableFieldPickerFields = availableFields;
    
    // Log full fields details to help debug
    console.log("Field picker available fields:", JSON.stringify(availableFields, null, 2));

    // Function to show field picker modal
    const showFieldPicker = (input) => {
        console.log("Showing field picker for input:", input);

        const fieldsForModal = designer._availableFieldPickerFields || [];
        console.log(
            "showFieldPicker: availableFields at modal creation:",
            "Count:", fieldsForModal.length,
            "Fields:", JSON.stringify(fieldsForModal, null, 2)
        );
                    
        // Double check that we have the designer host element
        if (!designer.hostElement) {
            console.error("Designer host element is missing, cannot show field picker");
            return;
        }

        const overlay = document.createElement("div");
        overlay.className = "acd-field-picker-overlay";
        designer.hostElement.appendChild(overlay);

        const modal = document.createElement("div");
        modal.className = "acd-field-picker-modal";
        
        if (fieldsForModal.length > 0) {
            modal.innerHTML = '<div style="font-weight: bold; margin-bottom: 8px;">Select a field to insert:</div>';
            console.log("Created modal with fields heading");
        } else {
            modal.innerHTML = '<div style="font-weight: bold; margin-bottom: 8px;">No fields available</div>' + 
                             '<div>Please select fields in the configuration panel.</div>';
            console.log("Created modal with no fields message");
        }
        
        designer.hostElement.appendChild(modal);

        if (fieldsForModal.length > 0) {
            fieldsForModal.forEach((field, index) => {
                if (!field || !field.name) {
                    console.error(`Invalid field at index ${index}:`, field);
                    return; // Skip this field
                }
                
                const item = document.createElement("div");
                item.className = "acd-field-item";

                const labelSpan = document.createElement("span");
                labelSpan.textContent = `${field.label || field.name} (${field.name})`;
                item.appendChild(labelSpan);

                if (field.isReference && field.referenceTable) {
                    const arrow = document.createElement("button");
                    arrow.type = "button";
                    arrow.className = "acd-field-reference-arrow";
                    arrow.textContent = "→";
                    arrow.title = `Show fields from ${field.referenceTable}`;
                    arrow.onclick = (ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        if (typeof dispatch === "function") {
                            dispatch("reference-table-requested", { tableName: field.referenceTable });
                        }
                    };
                    item.appendChild(arrow);
                }
                
                // Log whether this field is a reference field
                console.log(`Field ${field.name} isReference:`, field.isReference, "Type:", field.type);
                
                item.onclick = () => {
                    const reference = field.isReference
                        ? `\${current.${field.name}.display_value}`
                        : `\${current.${field.name}}`;

                    console.log("Field selected:", { field, reference, isRef: field.isReference });

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
                };
                modal.appendChild(item);
            });
        }

        overlay.onclick = () => {
            overlay.remove();
            modal.remove();
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
