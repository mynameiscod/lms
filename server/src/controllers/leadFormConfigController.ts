import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import LeadFormConfig, { DEFAULT_FIELDS, DEFAULT_SOURCES } from '../models/LeadFormConfig';

// Get form config for tenant (auto-initialize if not exists)
export const getFormConfig = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    let config = await LeadFormConfig.findOne({ tenantId: req.tenantId });

    if (!config) {
      // Auto-create default config
      config = await LeadFormConfig.create({
        tenantId: req.tenantId,
        fields: DEFAULT_FIELDS,
        sources: DEFAULT_SOURCES
      });
    }

    res.json({ success: true, message: 'Form config fetched', data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch form config', error: error.message });
  }
};

// Update form config (fields visibility, required, order + sources)
export const updateFormConfig = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { fields, sources } = req.body;

    if (!fields || !Array.isArray(fields)) {
      return res.status(400).json({ success: false, message: 'fields array is required' });
    }

    // Validate: name and phone must remain enabled & required
    const nameField = fields.find((f: any) => f.fieldKey === 'name');
    const phoneField = fields.find((f: any) => f.fieldKey === 'phone');
    if (nameField && (!nameField.enabled || !nameField.required)) {
      return res.status(400).json({ success: false, message: 'Name field must be enabled and required' });
    }
    if (phoneField && (!phoneField.enabled || !phoneField.required)) {
      return res.status(400).json({ success: false, message: 'Phone field must be enabled and required' });
    }

    // Validate custom field keys are unique
    const fieldKeys = fields.map((f: any) => f.fieldKey);
    const duplicates = fieldKeys.filter((k: string, i: number) => fieldKeys.indexOf(k) !== i);
    if (duplicates.length > 0) {
      return res.status(400).json({ success: false, message: `Duplicate field keys: ${duplicates.join(', ')}` });
    }

    let config = await LeadFormConfig.findOne({ tenantId: req.tenantId });
    if (!config) {
      config = await LeadFormConfig.create({
        tenantId: req.tenantId,
        fields,
        sources: sources || DEFAULT_SOURCES
      });
    } else {
      config.fields = fields;
      if (sources) config.sources = sources;
      await config.save();
    }

    res.json({ success: true, message: 'Form config updated', data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update form config', error: error.message });
  }
};

// Add a custom field
export const addCustomField = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { label, type, required, options, placeholder } = req.body;

    if (!label || !type) {
      return res.status(400).json({ success: false, message: 'Label and type are required' });
    }

    const validTypes = ['text', 'email', 'tel', 'number', 'date', 'time', 'select', 'textarea', 'checkbox'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, message: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
    }

    if (type === 'select' && (!options || !Array.isArray(options) || options.length === 0)) {
      return res.status(400).json({ success: false, message: 'Select fields require at least one option' });
    }

    let config = await LeadFormConfig.findOne({ tenantId: req.tenantId });
    if (!config) {
      config = await LeadFormConfig.create({
        tenantId: req.tenantId,
        fields: DEFAULT_FIELDS,
        sources: DEFAULT_SOURCES
      });
    }

    // Generate unique fieldKey from label
    const fieldKey = 'custom_' + label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

    // Check uniqueness
    if (config.fields.some((f: any) => f.fieldKey === fieldKey)) {
      return res.status(400).json({ success: false, message: 'A field with a similar name already exists' });
    }

    const maxOrder = config.fields.reduce((max: number, f: any) => Math.max(max, f.order), 0);

    config.fields.push({
      fieldKey,
      label,
      type,
      required: required || false,
      enabled: true,
      isBuiltIn: false,
      options: options || [],
      placeholder: placeholder || '',
      order: maxOrder + 1
    } as any);

    await config.save();

    res.status(201).json({ success: true, message: 'Custom field added', data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to add custom field', error: error.message });
  }
};

// Delete a custom field (only non-built-in)
export const deleteCustomField = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { fieldKey } = req.params;

    const config = await LeadFormConfig.findOne({ tenantId: req.tenantId });
    if (!config) {
      return res.status(404).json({ success: false, message: 'Form config not found' });
    }

    const field = config.fields.find((f: any) => f.fieldKey === fieldKey);
    if (!field) {
      return res.status(404).json({ success: false, message: 'Field not found' });
    }
    if ((field as any).isBuiltIn) {
      return res.status(400).json({ success: false, message: 'Cannot delete built-in fields' });
    }

    config.fields = config.fields.filter((f: any) => f.fieldKey !== fieldKey) as any;
    await config.save();

    res.json({ success: true, message: 'Custom field deleted', data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete custom field', error: error.message });
  }
};
