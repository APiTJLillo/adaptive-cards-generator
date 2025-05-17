adaptive-cards-designer-servicenow
===================================
Design adaptive cards with a UI Builder component.

### Reference field navigation

Reference type fields displayed in the picker now include an arrow button. When
clicked the component dispatches a `reference-table-requested` event bubbling
from the component's root. The event detail contains the table name of the
reference:

```javascript
detail: { tableName: 'sys_user' }
```

Listen for this event in UI Builder and provide the resulting fields back to the
component via the `referenceFields` property to update the modal with the dot
walked table's fields. The event is declared as an action in `now-ui.json` so it
appears in the UI Builder configuration panel along with the corresponding
`referenceFields` property.

