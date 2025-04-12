/**
 * Tests for the pill system implementation
 */

// Using import syntax instead of require
import { Pill } from '../src/x-apig-adaptive-cards-designer-servicenow/pill-system/Pill';
import { PillGenerationSystem } from '../src/x-apig-adaptive-cards-designer-servicenow/pill-system/PillGenerationSystem';
import { ServiceNowService } from '../src/x-apig-adaptive-cards-designer-servicenow/pill-system/ServiceNowService';

describe('Pill', () => {
  test('should correctly initialize with field data', () => {
    const field = {
      element: 'short_description',
      column_label: 'Short Description',
      internal_type: 'string'
    };
    
    const pill = new Pill(field, 'incident');
    
    expect(pill.id).toBe('incident.short_description');
    expect(pill.label).toBe('Short Description');
    expect(pill.table).toBe('incident');
    expect(pill.field).toBe('short_description');
    expect(pill.type).toBe('string');
  });
  
  test('should map field types correctly', () => {
    const stringField = { element: 'test', internal_type: 'string' };
    const numberField = { element: 'test', internal_type: 'integer' };
    const booleanField = { element: 'test', internal_type: 'boolean' };
    
    const stringPill = new Pill(stringField, 'test');
    const numberPill = new Pill(numberField, 'test');
    const booleanPill = new Pill(booleanField, 'test');
    
    expect(stringPill.type).toBe('string');
    expect(numberPill.type).toBe('number');
    expect(booleanPill.type).toBe('boolean');
  });
  
  test('should provide correct visual properties', () => {
    const field = { element: 'test', internal_type: 'string' };
    const pill = new Pill(field, 'test');
    
    const visualProps = pill.getVisualProperties();
    expect(visualProps.color).toBe('#4CAF50'); // String color
    expect(visualProps.icon).toBe('text_format');
  });
});

describe('PillGenerationSystem', () => {
  test('should generate pills from table schema', () => {
    const tableSchema = [
      { element: 'number', column_label: 'Number', internal_type: 'string' },
      { element: 'priority', column_label: 'Priority', internal_type: 'integer' },
      { element: 'active', column_label: 'Active', internal_type: 'boolean' }
    ];
    
    const pillGenerator = new PillGenerationSystem();
    const { pills, categories } = pillGenerator.generatePills(tableSchema, 'incident');
    
    expect(pills.length).toBe(3);
    expect(categories.string.length).toBe(1);
    expect(categories.number.length).toBe(1);
    expect(categories.boolean.length).toBe(1);
  });
  
  test('should filter out system fields', () => {
    const tableSchema = [
      { element: 'number', column_label: 'Number', internal_type: 'string' },
      { element: 'sys_id', column_label: 'Sys ID', internal_type: 'string' },
      { element: 'sys_created_on', column_label: 'Created', internal_type: 'datetime' }
    ];
    
    const pillGenerator = new PillGenerationSystem();
    const { pills } = pillGenerator.generatePills(tableSchema, 'incident');
    
    expect(pills.length).toBe(1);
    expect(pills[0].field).toBe('number');
  });
  
  test('should search pills correctly', () => {
    const tableSchema = [
      { element: 'number', column_label: 'Number', internal_type: 'string' },
      { element: 'short_description', column_label: 'Short Description', internal_type: 'string' },
      { element: 'description', column_label: 'Description', internal_type: 'string' }
    ];
    
    const pillGenerator = new PillGenerationSystem();
    pillGenerator.generatePills(tableSchema, 'incident');
    
    const results = pillGenerator.searchPills('description');
    expect(results.length).toBe(2);
  });
});

describe('ServiceNowService', () => {
  test('should fetch available tables', async () => {
    const tables = await ServiceNowService.fetchServiceNowTables();
    
    expect(Array.isArray(tables)).toBe(true);
    expect(tables.length).toBeGreaterThan(0);
    expect(tables[0]).toHaveProperty('name');
    expect(tables[0]).toHaveProperty('label');
  });
  
  test('should fetch table schema for incident table', async () => {
    const schema = await ServiceNowService.fetchTableSchema('incident');
    
    expect(Array.isArray(schema)).toBe(true);
    expect(schema.length).toBeGreaterThan(0);
    expect(schema[0]).toHaveProperty('element');
    expect(schema[0]).toHaveProperty('column_label');
    expect(schema[0]).toHaveProperty('internal_type');
  });
  
  test('should handle unknown table names', async () => {
    const schema = await ServiceNowService.fetchTableSchema('unknown_table');
    
    expect(Array.isArray(schema)).toBe(true);
    expect(schema.length).toBeGreaterThan(0);
    // Should return default schema for unknown tables
    expect(schema[0].element).toBe('number');
  });
});

// Integration tests would require a more complex setup with DOM testing
// These would be added in a real implementation
