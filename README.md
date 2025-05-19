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
component via the `referenceFields` property. When both the `referenceTable`
and `referenceFields` properties are populated, the component caches the table's
fields locally and refreshes the modal with the new options. Subsequent requests
for the same table reuse the cached values. Both the properties and the
`reference-table-requested` event are declared in `now-ui.json` so they appear in
the UI Builder configuration panel.

### Registering the event in the instance

UI Builder only exposes events that are registered on the instance. After
deploying the component, create a `sys_ux_event` record with the name
`reference-table-requested` and add it to the dispatched events list on the
component's macroponent record. Once registered you can map the event to any
handler action on your page.

### Saving and loading cards

The designer emits a `CARD_STATE_CHANGED` event whenever the card JSON is
modified. Listen for this event and persist the `card` payload using the
ServiceNow table API or your own storage mechanism.

To load a previously saved card into the designer, dispatch the `LOAD_CARD`
action with the card JSON:

```javascript
component.dispatch('LOAD_CARD', { card: savedCard });
```

Utility helpers `saveCard` and `loadCard` are available in
`src/x-apig-adaptive-cards-designer-servicenow/util/cardStorage.js` and show how
to interact with the table API.

### Linting

Run `npx eslint .` to check for style issues. The project uses the flat config
in `eslint.config.js`.
