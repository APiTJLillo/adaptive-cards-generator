import { createCustomElement } from "@servicenow/ui-core";
import styles from "../styles.scss";

/**
 * Parameter Field component with drop zone functionality for pills
 */
const view = (state, { updateState, dispatch }) => {
  const { 
    label, 
    value, 
    parameterType, 
    hasPill, 
    pill, 
    isDragOver 
  } = state;
  
  // Render a pill that has been dropped into this parameter
  const renderPill = () => {
    if (!pill) return null;
    
    const { color, icon } = pill.getVisualProperties();
    
    return (
      <div 
        className="parameter-pill"
        style={{ backgroundColor: color }}
      >
        <i className="pill-icon">{icon}</i>
        <span className="pill-label">{pill.label}</span>
        <button 
          className="pill-remove"
          onClick={() => dispatch('PILL_REMOVED')}
        >
          <i>close</i>
        </button>
      </div>
    );
  };
  
  const className = `parameter-field ${isDragOver ? 'drag-over' : ''} ${hasPill ? 'has-pill' : ''}`;
  
  return (
    <div className="parameter-container">
      <label>{label}</label>
      <div 
        className={className}
        ref={(el) => {
          if (el && !state.initialized) {
            setupDropZone(el, dispatch);
            updateState({ initialized: true });
          }
        }}
      >
        {hasPill ? (
          renderPill()
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => dispatch('VALUE_CHANGED', { value: e.target.value })}
            placeholder="Drag a field here or enter value"
          />
        )}
      </div>
    </div>
  );
};

/**
 * Set up drop zone for a parameter field
 * @param {HTMLElement} element - The element to set up as a drop zone
 * @param {Function} dispatch - The dispatch function for events
 */
function setupDropZone(element, dispatch) {
  // Set up drag events
  element.addEventListener('dragover', (event) => {
    // Prevent default to allow drop
    event.preventDefault();
    
    // Set drop effect
    event.dataTransfer.dropEffect = 'copy';
    
    // Check if the pill is compatible with this parameter
    try {
      const pillData = JSON.parse(event.dataTransfer.getData('application/json') || '{}');
      const isCompatible = isPillCompatibleWithParameter(pillData, element.getAttribute('data-parameter-type'));
      
      if (isCompatible) {
        dispatch('DRAG_OVER', { isDragOver: true });
      } else {
        event.dataTransfer.dropEffect = 'none';
      }
    } catch (error) {
      // If we can't parse the data yet (first dragover event), just allow the drop
      dispatch('DRAG_OVER', { isDragOver: true });
    }
  });
  
  element.addEventListener('dragleave', () => {
    dispatch('DRAG_LEAVE');
  });
  
  element.addEventListener('drop', (event) => {
    // Prevent default behavior
    event.preventDefault();
    
    // Reset drag over state
    dispatch('DRAG_LEAVE');
    
    try {
      // Get the pill data
      const pillData = JSON.parse(event.dataTransfer.getData('application/json') || '{}');
      
      // Check compatibility again
      const isCompatible = isPillCompatibleWithParameter(pillData, element.getAttribute('data-parameter-type'));
      
      if (!isCompatible) {
        return;
      }
      
      // Call the onPillDrop callback
      dispatch('PILL_DROPPED', { pill: pillData });
    } catch (error) {
      console.error('Error handling pill drop:', error);
    }
  });
}

/**
 * Check if pill type is compatible with parameter type
 * @param {Object} pill - The pill object
 * @param {string} parameterType - The parameter type
 * @returns {boolean} True if compatible
 */
function isPillCompatibleWithParameter(pill, parameterType) {
  if (!pill || !pill.type) return false;
  
  // Define compatibility rules
  const compatibilityMap = {
    'string': ['string', 'text', 'reference'],
    'number': ['number'],
    'boolean': ['boolean'],
    'date': ['date', 'datetime'],
    'datetime': ['datetime', 'date'],
    'array': ['array'],
    'object': ['reference']
  };
  
  const compatibleTypes = compatibilityMap[parameterType] || [];
  return compatibleTypes.includes(pill.type);
}

/**
 * Action handlers for the ParameterField component
 */
const actionHandlers = {
  /**
   * Initialize the component
   */
  'NOW_COMPONENT_INIT': ({ updateState, properties }) => {
    updateState({ 
      label: properties.label || '',
      value: properties.value || '',
      parameterType: properties.parameterType || 'string',
      hasPill: properties.hasPill || false,
      pill: properties.pill || null,
      isDragOver: false,
      initialized: false
    });
  },
  
  /**
   * Handle property changes
   */
  'NOW_COMPONENT_PROPS_CHANGE': ({ updateState, properties }) => {
    updateState({ 
      label: properties.label || '',
      value: properties.value || '',
      parameterType: properties.parameterType || 'string',
      hasPill: properties.hasPill || false,
      pill: properties.pill || null
    });
  },
  
  /**
   * Handle drag over event
   */
  'DRAG_OVER': ({ updateState, action }) => {
    updateState({ isDragOver: action.payload.isDragOver });
  },
  
  /**
   * Handle drag leave event
   */
  'DRAG_LEAVE': ({ updateState }) => {
    updateState({ isDragOver: false });
  },
  
  /**
   * Handle pill drop event
   */
  'PILL_DROPPED': ({ action, dispatch, properties }) => {
    const { pill } = action.payload;
    
    // Notify parent component about pill drop
    dispatch('NOTIFY_PILL_DROPPED', { 
      parameterId: properties.parameterId,
      pill 
    });
  },
  
  /**
   * Handle pill removal
   */
  'PILL_REMOVED': ({ dispatch, properties }) => {
    // Notify parent component about pill removal
    dispatch('NOTIFY_PILL_REMOVED', { 
      parameterId: properties.parameterId 
    });
  },
  
  /**
   * Handle value change
   */
  'VALUE_CHANGED': ({ action, dispatch, properties }) => {
    const { value } = action.payload;
    
    // Notify parent component about value change
    dispatch('NOTIFY_VALUE_CHANGED', { 
      parameterId: properties.parameterId,
      value 
    });
  }
};

/**
 * Properties for the ParameterField component
 */
const properties = {
  label: {
    default: ''
  },
  value: {
    default: ''
  },
  parameterType: {
    default: 'string'
  },
  hasPill: {
    default: false
  },
  pill: {
    default: null
  },
  parameterId: {
    default: ''
  }
};

/**
 * Create the ParameterField custom element
 */
createCustomElement('x-apig-parameter-field', {
  view,
  actionHandlers,
  properties,
  styles
});

export default {
  name: 'x-apig-parameter-field'
};
