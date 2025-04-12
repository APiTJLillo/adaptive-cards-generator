import { Pill } from './Pill';

/**
 * Pill Generation System for creating and managing pills based on table schema
 */
export class PillGenerationSystem {
  constructor() {
    this.pills = [];
    this.categories = {};
  }

  /**
   * Generate pills from table schema
   * @param {Array} tableSchema - The schema of the table from ServiceNow
   * @param {string} tableName - The name of the table
   * @returns {Object} Object containing pills and categories
   */
  generatePills(tableSchema, tableName) {
    this.pills = [];
    this.categories = {
      string: [],
      number: [],
      boolean: [],
      date: [],
      datetime: [],
      reference: [],
      array: [],
      text: []
    };

    // Create a pill for each field in the schema
    tableSchema.forEach(field => {
      // Skip system fields if needed
      if (this.isSystemField(field.element)) {
        return;
      }

      const pill = new Pill(field, tableName);
      this.pills.push(pill);

      // Categorize pill by type
      if (this.categories[pill.type]) {
        this.categories[pill.type].push(pill);
      } else {
        this.categories.string.push(pill);
      }
    });

    return {
      pills: this.pills,
      categories: this.categories
    };
  }

  /**
   * Check if a field is a system field
   * @param {string} fieldName - The name of the field
   * @returns {boolean} True if the field is a system field
   */
  isSystemField(fieldName) {
    const systemFields = [
      'sys_id', 'sys_created_on', 'sys_created_by', 
      'sys_updated_on', 'sys_updated_by', 'sys_mod_count'
    ];
    
    return systemFields.includes(fieldName) || fieldName.startsWith('sys_');
  }

  /**
   * Get pills by category
   * @param {string} category - The category to get pills for
   * @returns {Array} Array of pills in the category
   */
  getPillsByCategory(category) {
    return this.categories[category] || [];
  }

  /**
   * Search pills by text
   * @param {string} searchText - The text to search for
   * @returns {Array} Array of pills matching the search
   */
  searchPills(searchText) {
    if (!searchText) {
      return this.pills;
    }

    const lowerSearch = searchText.toLowerCase();
    return this.pills.filter(pill => 
      pill.label.toLowerCase().includes(lowerSearch) || 
      pill.field.toLowerCase().includes(lowerSearch)
    );
  }
}
