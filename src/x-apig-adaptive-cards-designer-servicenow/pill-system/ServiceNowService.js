import { Pill } from './Pill';

/**
 * Service for interacting with ServiceNow APIs to fetch table information
 */
export class ServiceNowService {
  /**
   * Fetch available tables from ServiceNow
   * @returns {Promise<Array>} Promise resolving to array of tables
   */
  static async fetchServiceNowTables() {
    try {
      // In a real implementation, this would call the ServiceNow API
      // For now, we'll return a mock response
      return [
        { name: 'incident', label: 'Incident' },
        { name: 'task', label: 'Task' },
        { name: 'change_request', label: 'Change Request' },
        { name: 'problem', label: 'Problem' },
        { name: 'sc_request', label: 'Service Catalog Request' }
      ];
    } catch (error) {
      console.error('Error fetching tables:', error);
      throw new Error(`Failed to fetch tables: ${error.message}`);
    }
  }

  /**
   * Fetch schema for a specific table
   * @param {string} tableName - The name of the table to fetch schema for
   * @returns {Promise<Array>} Promise resolving to array of field definitions
   */
  static async fetchTableSchema(tableName) {
    try {
      // In a real implementation, this would call the ServiceNow API
      // For now, we'll return a mock schema based on the table name
      switch (tableName) {
        case 'incident':
          return [
            { element: 'number', column_label: 'Number', internal_type: 'string' },
            { element: 'short_description', column_label: 'Short Description', internal_type: 'string' },
            { element: 'description', column_label: 'Description', internal_type: 'journal' },
            { element: 'priority', column_label: 'Priority', internal_type: 'integer' },
            { element: 'state', column_label: 'State', internal_type: 'integer' },
            { element: 'assigned_to', column_label: 'Assigned To', internal_type: 'reference', reference: 'sys_user' },
            { element: 'category', column_label: 'Category', internal_type: 'string' },
            { element: 'opened_at', column_label: 'Opened At', internal_type: 'datetime' }
          ];
        case 'task':
          return [
            { element: 'number', column_label: 'Number', internal_type: 'string' },
            { element: 'short_description', column_label: 'Short Description', internal_type: 'string' },
            { element: 'description', column_label: 'Description', internal_type: 'journal' },
            { element: 'priority', column_label: 'Priority', internal_type: 'integer' },
            { element: 'state', column_label: 'State', internal_type: 'integer' },
            { element: 'assigned_to', column_label: 'Assigned To', internal_type: 'reference', reference: 'sys_user' },
            { element: 'due_date', column_label: 'Due Date', internal_type: 'date' }
          ];
        case 'change_request':
          return [
            { element: 'number', column_label: 'Number', internal_type: 'string' },
            { element: 'short_description', column_label: 'Short Description', internal_type: 'string' },
            { element: 'description', column_label: 'Description', internal_type: 'journal' },
            { element: 'type', column_label: 'Type', internal_type: 'string' },
            { element: 'risk', column_label: 'Risk', internal_type: 'integer' },
            { element: 'impact', column_label: 'Impact', internal_type: 'integer' },
            { element: 'start_date', column_label: 'Start Date', internal_type: 'datetime' },
            { element: 'end_date', column_label: 'End Date', internal_type: 'datetime' }
          ];
        default:
          return [
            { element: 'number', column_label: 'Number', internal_type: 'string' },
            { element: 'short_description', column_label: 'Short Description', internal_type: 'string' },
            { element: 'description', column_label: 'Description', internal_type: 'journal' }
          ];
      }
    } catch (error) {
      console.error(`Error fetching schema for ${tableName}:`, error);
      throw new Error(`Failed to fetch schema for ${tableName}: ${error.message}`);
    }
  }
}
