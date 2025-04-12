import { createCustomElement, actionTypes } from "@servicenow/ui-core";
import snabbdom from "@servicenow/ui-renderer-snabbdom";
import styles from "./styles.scss";

// Console logging helper
const log = (message, data) => {
  console.log(`[AdaptiveCardsDesigner] ${message}`, data || '');
};

// Error logging helper
const logError = (message, error) => {
  console.error(`[AdaptiveCardsDesigner] ${message}`, error);
};

// Simple mock data for tables
const MOCK_TABLES = [
  { name: 'incident', label: 'Incident' },
  { name: 'task', label: 'Task' },
  { name: 'change_request', label: 'Change Request' }
];

// Simple mock data for table fields
const MOCK_FIELDS = {
  incident: [
    { name: 'number', label: 'Number', type: 'string' },
    { name: 'short_description', label: 'Short Description', type: 'string' },
    { name: 'priority', label: 'Priority', type: 'number' }
  ],
  task: [
    { name: 'number', label: 'Number', type: 'string' },
    { name: 'short_description', label: 'Short Description', type: 'string' },
    { name: 'due_date', label: 'Due Date', type: 'date' }
  ],
  change_request: [
    { name: 'number', label: 'Number', type: 'string' },
    { name: 'short_description', label: 'Short Description', type: 'string' },
    { name: 'risk', label: 'Risk', type: 'number' }
  ]
};

// Simple view function with diagnostic logging
const view = (state, { updateState, dispatch }) => {
  log('Rendering component with state', state);
  
  const { selectedTable, fields, parameters } = state;
  
  return (
    <div className="adaptive-cards-designer">
      <div className="designer-header">
        <h2>Adaptive Cards Designer</h2>
      </div>
      
      <div className="designer-body">
        <div className="designer-content">
          {/* Table selector */}
          <div className="designer-configuration">
            <div className="table-selector">
              <label htmlFor="table-select">Notification Source Table</label>
              <select 
                id="table-select"
                value={selectedTable}
                onChange={(e) => {
                  const value = e.target.value;
                  log('Table selected', value);
                  dispatch('TABLE_SELECTED', { table: value });
                }}
              >
                <option value="">-- Select a table --</option>
                {MOCK_TABLES.map(table => (
                  <option key={table.name} value={table.name}>
                    {table.label} ({table.name})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Field list */}
            {selectedTable && (
              <div className="field-list">
                <h3>Available Fields</h3>
                <ul>
                  {fields.map(field => (
                    <li 
                      key={field.name}
                      className={`field-item field-type-${field.type}`}
                      draggable="true"
                      onDragStart={(e) => {
                        log('Field drag started', field);
                        e.dataTransfer.setData('text/plain', JSON.stringify(field));
                      }}
                    >
                      {field.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Parameters */}
            <div className="parameters">
              <h3>Card Parameters</h3>
              {Object.keys(parameters).map(paramId => (
                <div 
                  key={paramId}
                  className="parameter-field"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('drag-over');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('drag-over');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('drag-over');
                    try {
                      const fieldData = JSON.parse(e.dataTransfer.getData('text/plain'));
                      log('Field dropped on parameter', { parameter: paramId, field: fieldData });
                      dispatch('FIELD_DROPPED', { 
                        parameterId: paramId, 
                        field: fieldData 
                      });
                    } catch (error) {
                      logError('Error handling field drop', error);
                    }
                  }}
                >
                  <label>{parameters[paramId].label}</label>
                  <div className="parameter-value">
                    {parameters[paramId].field ? (
                      <div className="parameter-field-value">
                        <span>{parameters[paramId].field.label}</span>
                        <button 
                          onClick={() => {
                            log('Field removed from parameter', paramId);
                            dispatch('FIELD_REMOVED', { parameterId: paramId });
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <input 
                        type="text" 
                        value={parameters[paramId].value || ''}
                        onChange={(e) => {
                          dispatch('PARAMETER_VALUE_CHANGED', {
                            parameterId: paramId,
                            value: e.target.value
                          });
                        }}
                        placeholder="Drag a field here or enter value"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Card preview */}
          <div className="card-preview">
            <h3>Card Preview</h3>
            <div className="preview-container">
              <div className="preview-card">
                <div className="preview-card-title">
                  {renderPreviewValue(parameters.title)}
                </div>
                {parameters.subtitle && (
                  <div className="preview-card-subtitle">
                    {renderPreviewValue(parameters.subtitle)}
                  </div>
                )}
                {parameters.body && (
                  <div className="preview-card-body">
                    {renderPreviewValue(parameters.body)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to render preview values
const renderPreviewValue = (parameter) => {
  if (parameter.field) {
    return `[${parameter.field.label}]`;
  }
  return parameter.value || '';
};

// Action handlers with diagnostic logging
const actionHandlers = {
  [actionTypes.COMPONENT_BOOTSTRAPPED]: ({ updateState }) => {
    log('Component bootstrapped');
    
    // Initialize with simple state
    updateState({
      selectedTable: '',
      fields: [],
      parameters: {
        title: {
          label: 'Title',
          value: 'Sample Title',
          field: null
        },
        subtitle: {
          label: 'Subtitle',
          value: 'Sample Subtitle',
          field: null
        },
        body: {
          label: 'Body',
          value: 'This is a sample body text for the adaptive card.',
          field: null
        }
      }
    });
  },
  
  [actionTypes.COMPONENT_RENDERED]: () => {
    log('Component rendered');
  },
  
  'TABLE_SELECTED': ({ action, updateState }) => {
    const { table } = action.payload;
    log('Table selected action', table);
    
    // Get fields for the selected table
    const fields = table ? MOCK_FIELDS[table] || [] : [];
    
    updateState({ 
      selectedTable: table,
      fields
    });
  },
  
  'FIELD_DROPPED': ({ action, updateState }) => {
    const { parameterId, field } = action.payload;
    log('Field dropped action', { parameterId, field });
    
    // Update parameter with field
    updateState(state => {
      const parameters = { ...state.parameters };
      parameters[parameterId] = {
        ...parameters[parameterId],
        field
      };
      
      return { parameters };
    });
  },
  
  'FIELD_REMOVED': ({ action, updateState }) => {
    const { parameterId } = action.payload;
    log('Field removed action', parameterId);
    
    // Remove field from parameter
    updateState(state => {
      const parameters = { ...state.parameters };
      parameters[parameterId] = {
        ...parameters[parameterId],
        field: null
      };
      
      return { parameters };
    });
  },
  
  'PARAMETER_VALUE_CHANGED': ({ action, updateState }) => {
    const { parameterId, value } = action.payload;
    log('Parameter value changed action', { parameterId, value });
    
    // Update parameter value
    updateState(state => {
      const parameters = { ...state.parameters };
      parameters[parameterId] = {
        ...parameters[parameterId],
        value
      };
      
      return { parameters };
    });
  }
};

// Create the custom element
createCustomElement("x-apig-adaptive-cards-designer-servicenow", {
  renderer: { type: snabbdom },
  view,
  styles,
  actionHandlers
});
