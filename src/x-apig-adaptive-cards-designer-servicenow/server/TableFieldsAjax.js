var TableFieldsAjax = Class.create();
TableFieldsAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {
    getFields: function() {
        var tableName = this.getParameter('sysparm_table');
        var fields = [];
        
        var gr = new GlideRecord('sys_dictionary');
        gr.addQuery('name', tableName);
        gr.addQuery('active', true);
        gr.addQuery('internal_type', '!=', 'collection');
        gr.query();
        
        while (gr.next()) {
            fields.push({
                name: gr.element + '',
                label: gr.column_label + '' || gr.element + '',
                type: gr.internal_type + '',
                isReference: !!gr.reference,
                referenceTable: gr.reference + ''
            });
        }
        
        return JSON.stringify(fields);
    },
    type: 'TableFieldsAjax'
});
