adaptive-cards-designer-servicenow
===================================
Design adaptive cards with a UI Builder component.

### Reference field navigation


Reference type fields displayed in the picker now include an arrow button. When
clicked the component dispatches a `reference-table-requested` event bubbling
from the component's root. The event detail follows the `type`/`payload`
format expected by UI Builder and includes the referenced table name:

```javascript
detail: {
  type: 'reference-table-requested',
  payload: { tableName: 'sys_user' }
}
```

Listen for this event in UI Builder and provide the resulting fields back to the
component via the `referenceFields` property to update the modal with the dot
walked table's fields. Both the property and the `reference-table-requested`
event are declared in `now-ui.json` so they appear in the UI Builder
configuration panel.

**Register the event in the instance**

For UI Builder to recognize the event, create a matching record in `sys_ux_event`
and add it to the component's dispatched events in the `sys_ux_macroponent`
table. Older versions of `now-cli` do not populate this list automatically, so
verify the association after deploying.
