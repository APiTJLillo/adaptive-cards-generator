import { createCustomElement, actionTypes } from "@servicenow/ui-core";
import snabbdom from "@servicenow/ui-renderer-snabbdom";
import styles from "./styles.scss";
import pillStyles from "./pill-system/pill-styles.scss";
import * as ACDesigner from "adaptivecards-designer";
import { Pill } from "./pill-system/Pill";
import { PillGenerationSystem } from "./pill-system/PillGenerationSystem";
import { ServiceNowService } from "./pill-system/ServiceNowService";

// Import custom components
import "./containers/TableSelector";
import "./containers/PillPanel";
import "./containers/ParameterField";

const view = (state, { updateState, dispatch }) => {
  const { 
    sourceTable, 
    availablePills, 
    pillCategories, 
    loadingPills, 
    pillError,
    parameterPills
  } = state;

  return (
    <div className="adaptive-cards-designer">
      <div className="designer-header">
        {/* Existing header content */}
      </div>
      
      <div className="designer-body">
        {/* Add pill panel to the left side */}
        <x-apig-pill-panel
          pills={availablePills}
          categories={pillCategories}
          loadingPills={loadingPills}
          pillError={pillError}
          tableName={sourceTable}
        />
        
        <div className="designer-content">
          {/* Table selector */}
          <div className="designer-configuration">
            <x-apig-table-selector 
              value={sourceTable}
              on-notify_table_selected={({ detail }) => {
                dispatch('TABLE_SELECTED', { table: detail.table });
              }}
            />
            
            {/* Parameter fields with pill support */}
            {state.parameters && Object.keys(state.parameters).map(parameterId => {
              const parameter = state.parameters[parameterId];
              const hasPill = parameterPills[parameterId] !== undefined;
              const pill = parameterPills[parameterId];
              
              return (
                <x-apig-parameter-field
                  key={parameterId}
                  label={parameter.label || parameterId}
                  value={parameter.value || ''}
                  parameterType={parameter.type || 'string'}
                  hasPill={hasPill}
                  pill={pill}
                  parameterId={parameterId}
                  on-notify_pill_dropped={({ detail }) => {
                    dispatch('PILL_DROPPED', { 
                      parameterId: detail.parameterId, 
                      pill: detail.pill 
                    });
                  }}
                  on-notify_pill_removed={({ detail }) => {
                    dispatch('PILL_REMOVED', { 
                      parameterId: detail.parameterId 
                    });
                  }}
                  on-notify_value_changed={({ detail }) => {
                    dispatch('PARAMETER_VALUE_CHANGED', { 
                      parameterId: detail.parameterId, 
                      value: detail.value 
                    });
                  }}
                />
              );
            })}
          </div>
          
          {/* Card preview area */}
          <div id="designer-container"></div>
        </div>
      </div>
    </div>
  );
};

const createGlobalDocumentProxy = (shadowRoot) => {
  // Existing proxy implementation
};

const actionHandlers = {
  [actionTypes.COMPONENT_BOOTSTRAPPED]: ({ updateState, dispatch }) => {
    // Initialize component state
    updateState({
      sourceTable: '',
      availablePills: [],
      pillCategories: {},
      loadingPills: false,
      pillError: null,
      parameterPills: {},
      parameters: {
        title: {
          label: 'Title',
          type: 'string',
          value: ''
        },
        subtitle: {
          label: 'Subtitle',
          type: 'string',
          value: ''
        },
        body: {
          label: 'Body',
          type: 'string',
          value: ''
        },
        // Add more default parameters as needed
      }
    });
  },
  
  'TABLE_SELECTED': ({ action, updateState, dispatch }) => {
    const { table } = action.payload;
    
    // Update selected table
    updateState({ 
      sourceTable: table,
      loadingPills: true,
      pillError: null
    });
    
    // Generate pills for the selected table
    dispatch('GENERATE_PILLS', { tableName: table });
  },
  
  'GENERATE_PILLS': async ({ action, updateState }) => {
    const { tableName } = action.payload;
    
    if (!tableName) {
      updateState({ 
        availablePills: [],
        pillCategories: {},
        loadingPills: false
      });
      return;
    }
    
    try {
      // Fetch table schema
      const tableSchema = await ServiceNowService.fetchTableSchema(tableName);
      
      // Generate pills
      const pillGenerator = new PillGenerationSystem();
      const { pills, categories } = pillGenerator.generatePills(tableSchema, tableName);
      
      // Update state with available pills
      updateState({ 
        availablePills: pills,
        pillCategories: categories,
        loadingPills: false 
      });
    } catch (error) {
      updateState({ 
        pillError: `Failed to generate pills: ${error.message}`,
        loadingPills: false,
        availablePills: [],
        pillCategories: {}
      });
    }
  },
  
  'PILL_DROPPED': ({ action, updateState, dispatch }) => {
    const { parameterId, pill } = action.payload;
    
    // Update parameter pills
    updateState(state => {
      const parameterPills = {
        ...state.parameterPills,
        [parameterId]: pill
      };
      
      return { parameterPills };
    });
    
    // Update card configuration
    dispatch('UPDATE_CARD_CONFIGURATION');
  },
  
  'PILL_REMOVED': ({ action, updateState, dispatch }) => {
    const { parameterId } = action.payload;
    
    // Remove pill from parameter
    updateState(state => {
      const parameterPills = { ...state.parameterPills };
      delete parameterPills[parameterId];
      
      return { parameterPills };
    });
    
    // Update card configuration
    dispatch('UPDATE_CARD_CONFIGURATION');
  },
  
  'PARAMETER_VALUE_CHANGED': ({ action, updateState, dispatch }) => {
    const { parameterId, value } = action.payload;
    
    // Update parameter value
    updateState(state => {
      const parameters = { ...state.parameters };
      parameters[parameterId] = {
        ...parameters[parameterId],
        value
      };
      
      return { parameters };
    });
    
    // Update card configuration
    dispatch('UPDATE_CARD_CONFIGURATION');
  },
  
  'UPDATE_CARD_CONFIGURATION': ({ state, updateState }) => {
    const { parameters, parameterPills } = state;
    
    // Create a new configuration object
    const configuration = {};
    
    // Update parameters with pill references or values
    Object.keys(parameters).forEach(parameterId => {
      const parameter = parameters[parameterId];
      const pill = parameterPills[parameterId];
      
      if (pill) {
        // Create a pill reference string (e.g., "${incident.number}")
        const pillReference = `\${${pill.table}.${pill.field}}`;
        configuration[parameterId] = pillReference;
      } else {
        configuration[parameterId] = parameter.value || '';
      }
    });
    
    // Update the card preview
    updateState({ configuration });
    
    // TODO: Update the actual card preview with the new configuration
  }
};

createCustomElement("x-apig-adaptive-cards-designer-servicenow", {
  renderer: { type: snabbdom },
  view,
  styles: [styles, pillStyles],
  actionHandlers
});
