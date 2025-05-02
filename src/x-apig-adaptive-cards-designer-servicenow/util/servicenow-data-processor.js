/**
 * ServiceNow data processing utilities
 */

/**
 * Processes table fields data from ServiceNow
 * @param {Array} fieldsData - Raw fields data from ServiceNow
 * @returns {Array} - Processed fields data
 */
export const processTableFields = (fieldsData) => {
    if (!Array.isArray(fieldsData)) {
        console.warn('Invalid fields data provided to processTableFields', fieldsData);
        return [];
    }

    // Ensure we handle the data properly with additional logging
    console.log("Processing fields data:", fieldsData.slice(0, 2));
    
    const mappedFields = fieldsData.map(field => {
        const internalType = field.internal_type?.displayValue;
        // Check both lowercase and capitalized versions of "reference"
        const isRef = internalType === "reference" || internalType === "Reference";
        
        return {
            name: field.element?.displayValue,
            label: field.column_label?.displayValue || field.sys_name?.displayValue,
            type: internalType,
            isReference: isRef,
            referenceTable: field.reference?.displayValue,
            displayValue: field.sys_name?.displayValue,
        };
    });
    
    console.log("Field mapping example:", mappedFields.length > 0 ? mappedFields[0] : "No fields");
    
    return mappedFields.filter(
        (f) =>
            // Filter out null/undefined fields and certain types we don't want to show
            f?.name &&
            f?.type &&
            !["collection", "journal_list"].includes(f.type)
    );
};

/**
 * Processes a ServiceNow card payload
 * @param {Object|string} cardData - Card data as object or JSON string
 * @returns {Object} - Processed card data
 */
export const processCardData = (cardData) => {
    try {
        return typeof cardData === "string" ? JSON.parse(cardData) : cardData;
    } catch (error) {
        console.error("Error processing card data:", error);
        return { type: "AdaptiveCard", version: "1.0", body: [] };
    }
};
