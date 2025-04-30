/**
 * Table field utility functions
 */

/**
 * Formats a field reference for insertion into templates
 * @param {Object} field - The field object
 * @returns {string} - Formatted field reference string for templates
 */
export const formatFieldReference = (field) => {
    if (!field || !field.name) {
        return '';
    }
    
    return field.isReference
        ? `\${current.${field.name}.display_value}`
        : `\${current.${field.name}}`;
};

/**
 * Filters table fields by specified criteria
 * @param {Array} fields - Array of field objects
 * @param {Object} criteria - Filtering criteria
 * @returns {Array} - Filtered fields
 */
export const filterFields = (fields, criteria = {}) => {
    if (!Array.isArray(fields)) {
        return [];
    }
    
    return fields.filter(field => {
        // Skip fields without names
        if (!field.name) {
            return false;
        }
        
        // Filter by type if specified
        if (criteria.type && field.type !== criteria.type) {
            return false;
        }
        
        // Filter by name pattern if specified
        if (criteria.namePattern && !field.name.match(criteria.namePattern)) {
            return false;
        }
        
        // Exclude specific field types if specified
        if (criteria.excludeTypes && criteria.excludeTypes.includes(field.type)) {
            return false;
        }
        
        return true;
    });
};

/**
 * Groups fields by their type
 * @param {Array} fields - Array of field objects
 * @returns {Object} - Object with fields grouped by type
 */
export const groupFieldsByType = (fields) => {
    if (!Array.isArray(fields)) {
        return {};
    }
    
    return fields.reduce((groups, field) => {
        if (!field.type) {
            return groups;
        }
        
        if (!groups[field.type]) {
            groups[field.type] = [];
        }
        
        groups[field.type].push(field);
        return groups;
    }, {});
};
