adaptive-cards-designer-servicenow
===================================
Design adaptive cards with a UI Builder component.

### Reference field navigation

Reference type fields displayed in the picker now include an arrow button.
Clicking the arrow dispatches the `reference-table-requested` action with a
payload containing the referenced table name:

```javascript
{ tableName: 'sys_user' }
```

Handle this action in UI Builder to fetch and provide the dot‑walked fields back
through the `referenceFields` property. Both the property and the
`reference-table-requested` action are declared in `now-ui.json` so they appear
in the UI Builder configuration panel.
