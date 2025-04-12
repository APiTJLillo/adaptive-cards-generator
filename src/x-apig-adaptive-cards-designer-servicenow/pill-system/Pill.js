/**
 * Pill class representing a field from a ServiceNow table
 * that can be dragged and dropped into adaptive card parameters
 */
export class Pill {
  /**
   * Create a new pill from a field definition
   * @param {Object} field - The field definition from ServiceNow
   * @param {string} tableName - The name of the table this field belongs to
   */
  constructor(field, tableName) {
    this.id = `${tableName}.${field.element}`;
    this.label = field.column_label || field.element;
    this.table = tableName;
    this.field = field.element;
    this.type = this.mapFieldType(field.internal_type);
    this.path = [tableName, field.element];
    this.reference = field.reference || null;
    this.isArray = false;
    this.metadata = {
      originalField: field
    };
  }

  /**
   * Map ServiceNow field types to simplified types for pills
   * @param {string} internalType - The internal type from ServiceNow
   * @returns {string} The simplified type for the pill
   */
  mapFieldType(internalType) {
    const typeMap = {
      'string': 'string',
      'integer': 'number',
      'float': 'number',
      'boolean': 'boolean',
      'date': 'date',
      'datetime': 'datetime',
      'reference': 'reference',
      'glide_list': 'array',
      'journal': 'text',
      'journal_input': 'text',
      'journal_list': 'text'
    };

    return typeMap[internalType] || 'string';
  }

  /**
   * Get visual representation properties for the pill
   * @returns {Object} Object containing color and icon for the pill
   */
  getVisualProperties() {
    const typeColors = {
      'string': '#4CAF50',
      'number': '#2196F3',
      'boolean': '#FF9800',
      'date': '#9C27B0',
      'datetime': '#9C27B0',
      'reference': '#F44336',
      'array': '#795548',
      'text': '#607D8B'
    };

    return {
      color: typeColors[this.type] || '#9E9E9E',
      icon: this.getIconForType(this.type)
    };
  }

  /**
   * Get icon for pill type
   * @param {string} type - The pill type
   * @returns {string} The icon name for the type
   */
  getIconForType(type) {
    const icons = {
      'string': 'text_format',
      'number': 'filter_1',
      'boolean': 'toggle_on',
      'date': 'calendar_today',
      'datetime': 'access_time',
      'reference': 'link',
      'array': 'list',
      'text': 'notes'
    };

    return icons[type] || 'label';
  }
}
