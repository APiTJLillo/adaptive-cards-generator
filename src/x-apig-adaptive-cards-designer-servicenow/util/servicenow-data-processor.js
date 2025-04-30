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

    return fieldsData
        .map((field) => ({
            name: field.sys_name?.displayValue,
            label: field.column_label?.displayValue || field.sys_name?.displayValue,
            type: field.internal_type?.displayValue,
            isReference: field.internal_type?.displayValue === "reference",
            referenceTable: field.reference?.displayValue,
            displayValue: field.sys_name?.displayValue,
        }))
        .filter(
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
