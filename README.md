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
#### Registering the event

After deploying the component you must register the event in your instance so UI Builder can react to it:

1. Create a row in **sys_ux_event** named `reference-table-requested`.
2. Open the component's **sys_ux_macroponent** record and add that event in the *Dispatched Events* related list (the CLI may not populate this automatically).
3. Place the component on a page in UI Builder and wire the event to refresh your data resource that supplies `referenceFields`.

Once registered, clicking the arrow next to a reference field will dispatch the event and trigger your handler.
