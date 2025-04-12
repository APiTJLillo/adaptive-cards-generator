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
    parameterPills,
    designerInitialized
  } = state;

  return (
    <div className="adaptive-cards-designer">
      <div className="designer-header">
        <h2>Adaptive Cards Designer</h2>
      </div>
      
      <div className="designer-body">
        {/* Add pill panel to the left side - only show when table is selected */}
        {sourceTable && (
          <div className="pill-panel-container">
            <x-apig-pill-panel
              pills={availablePills}
              categories={pillCategories}
              loadingPills={loadingPills}
              pillError={pillError}
              tableName={sourceTable}
            />
          </div>
        )}
        
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
          
          {/* Card designer area - always visible */}
          <div 
            id="designer-container" 
            className="card-designer-container"
            ref={(el) => {
              if (el && !designerInitialized) {
                // Initialize the designer when the element is available
                // and not already initialized
                dispatch('INITIALIZE_DESIGNER', { container: el });
              }
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

// Create a proxy for document methods to work within shadow DOM
const createGlobalDocumentProxy = (shadowRoot) => {
  const originalGetElementById = document.getElementById.bind(document);
  document.getElementById = function (id) {
    return shadowRoot.getElementById(id) || originalGetElementById(id);
  };
  
  const originalQuerySelector = document.querySelector.bind(document);
  document.querySelector = function (selector) {
    return shadowRoot.querySelector(selector) || originalQuerySelector(selector);
  };
  
  const originalQuerySelectorAll = document.querySelectorAll.bind(document);
  document.querySelectorAll = function (selector) {
    return shadowRoot.querySelectorAll(selector) || originalQuerySelectorAll(selector);
  };
};

// Sample card template for demo
const getSampleCardTemplate = () => {
  return {
    "type": "AdaptiveCard",
    "version": "1.0",
    "body": [
      {
        "type": "TextBlock",
        "size": "Medium",
        "weight": "Bolder",
        "text": "${title}"
      },
      {
        "type": "TextBlock",
        "text": "${subtitle}",
        "isSubtle": true,
        "wrap": true
      },
      {
        "type": "TextBlock",
        "text": "${body}",
        "wrap": true
      }
    ],
    "actions": [
      {
        "type": "Action.OpenUrl",
        "title": "View Details",
        "url": "https://example.com"
      }
    ],
    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json"
  };
};

// Generate sample data for a specific table
const generateSampleData = (tableName) => {
  const sampleData = {
    incident: {
      number: "INC0001234",
      short_description: "Email service is down",
      description: "Users are reporting that they cannot access their email. The issue started at 9:00 AM.",
      priority: "1 - Critical",
      state: "In Progress",
      assigned_to: "John Smith",
      category: "Email",
      opened_at: "2025-04-12T09:00:00Z"
    },
    task: {
      number: "TASK0005678",
      short_description: "Update server configurations",
      description: "Need to update the configuration files on all production servers to apply the latest security patches.",
      priority: "2 - High",
      state: "Open",
      assigned_to: "Jane Doe",
      due_date: "2025-04-15"
    },
    change_request: {
      number: "CHG0009012",
      short_description: "Deploy new application version",
      description: "Deploy version 2.5 of the customer portal application to production environment.",
      type: "Normal",
      risk: "3 - Moderate",
      impact: "2 - Significant",
      start_date: "2025-04-20T01:00:00Z",
      end_date: "2025-04-20T03:00:00Z"
    }
  };
  
  return sampleData[tableName] || {
    number: "SAMPLE001",
    short_description: "Sample record",
    description: "This is a sample record for demonstration purposes."
  };
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
      designerInitialized: false,
      designerInstance: null,
      parameters: {
        title: {
          label: 'Title',
          type: 'string',
          value: 'Sample Title'
        },
        subtitle: {
          label: 'Subtitle',
          type: 'string',
          value: 'Sample Subtitle'
        },
        body: {
          label: 'Body',
          type: 'string',
          value: 'This is a sample body text for the adaptive card.'
        }
      }
    });
  },
  
  [actionTypes.COMPONENT_RENDERED]: ({ dispatch, host }) => {
    // Create document proxy for shadow DOM
    createGlobalDocumentProxy(host.shadowRoot);
  },
  
  'INITIALIZE_DESIGNER': ({ action, updateState, dispatch }) => {
    const { container } = action.payload;
    
    try {
      // Initialize the Adaptive Cards Designer
      const designer = new ACDesigner.CardDesigner();
      
      // Set host config
      const hostConfig = {
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
        spacing: {
          small: 3,
          default: 8,
          medium: 20,
          large: 30,
          extraLarge: 40,
          padding: 10
        },
        separator: {
          lineThickness: 1,
          lineColor: "#EEEEEE"
        },
        supportsInteractivity: true,
        fontSizes: {
          small: 12,
          default: 14,
          medium: 17,
          large: 21,
          extraLarge: 26
        },
        fontWeights: {
          lighter: 200,
          default: 400,
          bolder: 600
        },
        containerStyles: {
          default: {
            backgroundColor: "#FFFFFF",
            foregroundColors: {
              default: {
                default: "#333333",
                subtle: "#EE333333"
              }
            }
          }
        }
      };
      
      designer.hostConfig = new ACDesigner.HostConfig(hostConfig);
      
      // Load the designer
      designer.attachTo(container);
      
      // Set a sample card
      designer.setCard(getSampleCardTemplate());
      
      // Update state with designer instance
      updateState({ 
        designerInitialized: true,
        designerInstance: designer
      });
      
      // Update card preview with current parameters
      dispatch('UPDATE_CARD_CONFIGURATION');
      
    } catch (error) {
      console.error('Error initializing designer:', error);
    }
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
    const { parameters, parameterPills, designerInstance, sourceTable } = state;
    
    if (!designerInstance) {
      return;
    }
    
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
    
    // Get the current card JSON
    const cardJson = designerInstance.getCard();
    
    // Create a data context with sample data
    const dataContext = {};
    
    if (sourceTable) {
      // Generate sample data for the selected table
      const sampleData = generateSampleData(sourceTable);
      dataContext[sourceTable] = sampleData;
    }
    
    // Apply the data context to the card
    try {
      // Use the Adaptive Cards templating engine to apply data
      const template = new ACDesigner.Template(cardJson);
      const card = template.expand({
        $root: dataContext
      });
      
      // Update the designer with the expanded card
      designerInstance.setCard(card);
    } catch (error) {
      console.error('Error updating card preview:', error);
    }
  }
};

createCustomElement("x-apig-adaptive-cards-designer-servicenow", {
  renderer: { type: snabbdom },
  view,
  styles: [styles, pillStyles],
  actionHandlers
});
