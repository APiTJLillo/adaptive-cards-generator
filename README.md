adaptive-cards-designer-servicenow
===================================
Design adaptive cards with a UI Builder component.

### Reference field navigation

Reference type fields displayed in the picker now include an arrow button. When
clicked the component dispatches a `REFERENCE_TABLE_FIELDS_REQUESTED` event bubbling
from the component's root. The event detail follows the `type`/`payload`
format expected by UI Builder and includes the referenced table name:

```javascript
detail: {
  type: 'REFERENCE_TABLE_FIELDS_REQUESTED',
  payload: { tableName: 'sys_user' }
}
```

Listen for this event in UI Builder and provide the resulting fields back to the
component via the `referenceFields` property. When both the `referenceTable`
and `referenceFields` properties are populated, the component caches the table's
fields locally and refreshes the modal with the new options. Subsequent requests
for the same table reuse the cached values. Both the properties and the
`REFERENCE_TABLE_FIELDS_REQUESTED` event are declared in `now-ui.json` so they appear in
the UI Builder configuration panel.

### Registering the event in the instance

UI Builder only exposes events that are registered on the instance. After
deploying the component, create a `sys_ux_event` record with the name
`REFERENCE_TABLE_FIELDS_REQUESTED` and add it to the dispatched events list on the
component's macroponent record. Once registered you can map the event to any
handler action on your page.

### Saving and loading cards

The designer emits a `CARD_STATE_CHANGED` event whenever the card JSON is
modified. The event payload includes both the `card` object and a
`cardString` value with the JSON serialized. Listen for this event and
persist the card using the ServiceNow table API or your own storage
mechanism.

```javascript
detail: {
  card: { /* updated card */ },
  cardString: '{"type":"AdaptiveCard"...}'
}
```

To load a previously saved card into the designer, assign the card JSON to the
`predefinedCard` property:

```javascript
component.predefinedCard = savedCard;
```

Utility helpers `saveCard` and `loadCard` are available in
`src/x-apig-adaptive-cards-designer-servicenow/util/cardStorage.js` and show how
to interact with the table API.

The component hides the designer's default toolbar and bottom toolbox (including
the JSON editor) to provide a streamlined editing surface.

### Icon fonts

The designer relies on the Fluent and Codicon icon fonts. These fonts are bundled
with the component and loaded when the designer initializes so the toolbar and
Monaco editor icons display correctly.

Run `npx eslint .` to check for style issues. The project uses the flat config
in `eslint.config.js`.

### Loading the designer from the CDN

Include the Adaptive Cards Designer bundle before using the component:

```html
<script src="https://adaptivecards.microsoft.com/main.bundle.js"></script>
```

The component automatically sets the `assetPath` to
`https://adaptivecards.microsoft.com` so all designer resources load from the
same CDN.

The designer and Monaco editor are provided by the bundle, so the
`adaptivecards-designer` and `monaco-editor` packages are no longer required in
your build or webpack configuration.
