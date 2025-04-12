import { createCustomElement } from "@servicenow/ui-core";
import styles from "../styles.scss";

/**
 * Pill Panel component for displaying and managing pills
 */
const view = (state, { updateState, dispatch }) => {
  const { 
    pills, 
    categories, 
    searchText, 
    expandedCategories, 
    loadingPills, 
    pillError, 
    tableName 
  } = state;

  // Get filtered pills based on search text
  const getFilteredPills = () => {
    if (!searchText) {
      return pills;
    }
    
    const lowerSearch = searchText.toLowerCase();
    return pills.filter(pill => 
      pill.label.toLowerCase().includes(lowerSearch) || 
      pill.field.toLowerCase().includes(lowerSearch)
    );
  };

  // Get human-readable category label
  const getCategoryLabel = (category) => {
    const labels = {
      'string': 'Text',
      'number': 'Numbers',
      'boolean': 'True/False',
      'date': 'Dates',
      'datetime': 'Date & Time',
      'reference': 'References',
      'array': 'Lists',
      'text': 'Long Text'
    };
    
    return labels[category] || category;
  };

  // Render a single pill
  const renderPill = (pill) => {
    const { color, icon } = pill.getVisualProperties();
    
    return (
      <div 
        className="pill"
        key={pill.id}
        draggable="true"
        onDragStart={(e) => {
          // Set drag data
          e.dataTransfer.setData('application/json', JSON.stringify(pill));
          e.dataTransfer.effectAllowed = 'copy';
          
          // Add custom drag image if needed
          const dragImage = document.createElement('div');
          dragImage.className = 'pill-drag-image';
          dragImage.textContent = pill.label;
          dragImage.style.backgroundColor = color;
          document.body.appendChild(dragImage);
          
          e.dataTransfer.setDragImage(dragImage, 0, 0);
          
          // Clean up the drag image after drag ends
          setTimeout(() => {
            document.body.removeChild(dragImage);
          }, 0);
        }}
        style={{ backgroundColor: color }}
      >
        <i className="pill-icon">{icon}</i>
        <span className="pill-label">{pill.label}</span>
        <span className="pill-field">{pill.field}</span>
      </div>
    );
  };

  // Render pills by category
  const renderPillsByCategory = () => {
    const filteredPills = getFilteredPills();
    
    return Object.keys(categories).map(category => {
      const categoryPills = filteredPills.filter(pill => pill.type === category);
      
      if (categoryPills.length === 0) {
        return null;
      }
      
      const isExpanded = expandedCategories.includes(category);
      
      return (
        <div className="pill-category" key={category}>
          <div 
            className="category-header"
            onClick={() => {
              const newExpandedCategories = isExpanded
                ? expandedCategories.filter(cat => cat !== category)
                : [...expandedCategories, category];
              
              updateState({ expandedCategories: newExpandedCategories });
            }}
          >
            <i className="category-icon">{isExpanded ? 'expand_more' : 'chevron_right'}</i>
            <span className="category-name">{getCategoryLabel(category)}</span>
            <span className="category-count">{categoryPills.length}</span>
          </div>
          
          {isExpanded && (
            <div className="category-pills">
              {categoryPills.map(pill => renderPill(pill))}
            </div>
          )}
        </div>
      );
    });
  };

  if (loadingPills) {
    return <div className="pill-panel loading">Loading pills...</div>;
  }
  
  if (pillError) {
    return <div className="pill-panel error">{pillError}</div>;
  }
  
  if (!tableName) {
    return (
      <div className="pill-panel empty">
        <p>Select a table to view available fields</p>
      </div>
    );
  }
  
  return (
    <div className="pill-panel">
      <div className="pill-panel-header">
        <h3>Available Fields</h3>
        <div className="pill-search">
          <input
            type="text"
            placeholder="Search fields..."
            value={searchText}
            onChange={(e) => updateState({ searchText: e.target.value })}
          />
        </div>
      </div>
      
      <div className="pill-panel-content">
        {renderPillsByCategory()}
      </div>
    </div>
  );
};

/**
 * Action handlers for the PillPanel component
 */
const actionHandlers = {
  /**
   * Initialize the component
   */
  'NOW_COMPONENT_INIT': ({ updateState, properties }) => {
    updateState({ 
      pills: properties.pills || [],
      categories: properties.categories || {},
      searchText: '',
      expandedCategories: Object.keys(properties.categories || {}),
      loadingPills: properties.loadingPills || false,
      pillError: properties.pillError || null,
      tableName: properties.tableName || ''
    });
  },
  
  /**
   * Handle property changes
   */
  'NOW_COMPONENT_PROPS_CHANGE': ({ updateState, properties }) => {
    updateState({ 
      pills: properties.pills || [],
      categories: properties.categories || {},
      loadingPills: properties.loadingPills || false,
      pillError: properties.pillError || null,
      tableName: properties.tableName || ''
    });
  }
};

/**
 * Properties for the PillPanel component
 */
const properties = {
  pills: {
    default: []
  },
  categories: {
    default: {}
  },
  loadingPills: {
    default: false
  },
  pillError: {
    default: null
  },
  tableName: {
    default: ''
  }
};

/**
 * Create the PillPanel custom element
 */
createCustomElement('x-apig-pill-panel', {
  view,
  actionHandlers,
  properties,
  styles
});

export default {
  name: 'x-apig-pill-panel'
};
