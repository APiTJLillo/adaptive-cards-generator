import { createCustomElement } from "@servicenow/ui-core";
import styles from "../styles.scss";

/**
 * Table Selector component for selecting a ServiceNow table
 */
const view = (state, { updateState, dispatch }) => {
  const { tables, loading, selectedTable, error } = state;

  return (
    <div className="table-selector">
      <label htmlFor="table-select">Notification Source Table</label>
      {loading ? (
        <div className="loading">Loading tables...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <select 
          id="table-select"
          value={selectedTable}
          onChange={(e) => {
            const value = e.target.value;
            updateState({ selectedTable: value });
            dispatch('TABLE_SELECTED', { table: value });
          }}
        >
          <option value="">-- Select a table --</option>
          {tables.map(table => (
            <option key={table.name} value={table.name}>
              {table.label} ({table.name})
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

/**
 * Action handlers for the TableSelector component
 */
const actionHandlers = {
  /**
   * Initialize the component
   */
  'NOW_COMPONENT_INIT': ({ updateState, dispatch }) => {
    updateState({ 
      tables: [],
      loading: true,
      selectedTable: '',
      error: null
    });
    
    dispatch('FETCH_TABLES');
  },
  
  /**
   * Fetch available tables from ServiceNow
   */
  'FETCH_TABLES': async ({ updateState, dispatch }) => {
    try {
      // Import the service dynamically to avoid circular dependencies
      const { ServiceNowService } = await import('../pill-system/ServiceNowService');
      const tables = await ServiceNowService.fetchServiceNowTables();
      
      updateState({ 
        tables,
        loading: false
      });
    } catch (error) {
      updateState({ 
        error: 'Failed to load tables',
        loading: false
      });
    }
  },
  
  /**
   * Handle table selection
   */
  'TABLE_SELECTED': ({ action, dispatch }) => {
    const { table } = action.payload;
    
    // Notify parent component about table selection
    dispatch('NOTIFY_TABLE_SELECTED', { table });
  }
};

/**
 * Properties for the TableSelector component
 */
const properties = {
  value: {
    default: ''
  }
};

/**
 * Create the TableSelector custom element
 */
createCustomElement('x-apig-table-selector', {
  view,
  actionHandlers,
  properties,
  styles
});

export default {
  name: 'x-apig-table-selector'
};
