import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import GoogleSheetIntegration from '../models/GoogleSheetIntegration';
import { extractSheetId, fetchSheetHeaders, syncGoogleSheet } from '../services/googleSheetSyncService';

// GET /google-sheet-integrations - List all integrations for tenant
export const getIntegrations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const integrations = await GoogleSheetIntegration.find({ tenantId: req.tenantId })
      .populate('defaultStageId', 'name color')
      .populate('assignToUserId', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: integrations });
  } catch (err: any) {
    console.error('[GSHEET] Error fetching integrations:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /google-sheet-integrations/:id - Get single integration with logs
export const getIntegrationById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const integration = await GoogleSheetIntegration.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    })
      .populate('defaultStageId', 'name color')
      .populate('assignToUserId', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    if (!integration) {
      res.status(404).json({ success: false, message: 'Integration not found' });
      return;
    }

    res.json({ success: true, data: integration });
  } catch (err: any) {
    console.error('[GSHEET] Error fetching integration:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /google-sheet-integrations/fetch-headers - Fetch headers from a sheet URL
export const fetchHeaders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sheetUrl, sheetName } = req.body;

    if (!sheetUrl) {
      res.status(400).json({ success: false, message: 'Sheet URL is required' });
      return;
    }

    const sheetId = extractSheetId(sheetUrl);
    if (!sheetId) {
      res.status(400).json({ success: false, message: 'Invalid Google Sheets URL' });
      return;
    }

    const headers = await fetchSheetHeaders(sheetId, sheetName || 'Sheet1');

    res.json({ success: true, data: { sheetId, headers } });
  } catch (err: any) {
    console.error('[GSHEET] Error fetching headers:', err);
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to fetch sheet headers. Make sure the sheet is shared publicly.'
    });
  }
};

// POST /google-sheet-integrations - Create new integration
export const createIntegration = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      name, sheetUrl, sheetName, columnMapping, headerRow,
      syncInterval, defaultSource, defaultPriority, defaultStageId, assignToUserId
    } = req.body;

    if (!name || !sheetUrl) {
      res.status(400).json({ success: false, message: 'Name and Sheet URL are required' });
      return;
    }

    const sheetId = extractSheetId(sheetUrl);
    if (!sheetId) {
      res.status(400).json({ success: false, message: 'Invalid Google Sheets URL' });
      return;
    }

    if (!columnMapping || columnMapping.length === 0) {
      res.status(400).json({ success: false, message: 'At least one column mapping is required' });
      return;
    }

    // Verify the sheet is accessible
    try {
      await fetchSheetHeaders(sheetId, sheetName || 'Sheet1');
    } catch {
      res.status(400).json({
        success: false,
        message: 'Cannot access the Google Sheet. Make sure it is shared as "Anyone with the link can view".'
      });
      return;
    }

    const integration = new GoogleSheetIntegration({
      tenantId: req.tenantId,
      name,
      sheetId,
      sheetUrl,
      sheetName: sheetName || 'Sheet1',
      columnMapping,
      headerRow: headerRow || 1,
      syncInterval: syncInterval || 10,
      defaultSource: defaultSource || 'google_sheet',
      defaultPriority: defaultPriority || 'warm',
      defaultStageId: defaultStageId || undefined,
      assignToUserId: assignToUserId || undefined,
      createdBy: req.user!.id,
      isActive: true,
      lastSyncedRow: 0
    });

    await integration.save();

    res.status(201).json({ success: true, data: integration, message: 'Integration created successfully' });
  } catch (err: any) {
    console.error('[GSHEET] Error creating integration:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /google-sheet-integrations/:id - Update integration
export const updateIntegration = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      name, sheetUrl, sheetName, columnMapping, headerRow,
      syncInterval, isActive, defaultSource, defaultPriority,
      defaultStageId, assignToUserId
    } = req.body;

    const integration = await GoogleSheetIntegration.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    });

    if (!integration) {
      res.status(404).json({ success: false, message: 'Integration not found' });
      return;
    }

    // If changing sheet URL, validate and reset sync position
    if (sheetUrl && sheetUrl !== integration.sheetUrl) {
      const newSheetId = extractSheetId(sheetUrl);
      if (!newSheetId) {
        res.status(400).json({ success: false, message: 'Invalid Google Sheets URL' });
        return;
      }
      integration.sheetId = newSheetId;
      integration.sheetUrl = sheetUrl;
      integration.lastSyncedRow = 0; // Reset sync position
    }

    if (name !== undefined) integration.name = name;
    if (sheetName !== undefined) integration.sheetName = sheetName;
    if (columnMapping !== undefined) integration.columnMapping = columnMapping;
    if (headerRow !== undefined) integration.headerRow = headerRow;
    if (syncInterval !== undefined) integration.syncInterval = syncInterval;
    if (isActive !== undefined) integration.isActive = isActive;
    if (defaultSource !== undefined) integration.defaultSource = defaultSource;
    if (defaultPriority !== undefined) integration.defaultPriority = defaultPriority;
    if (defaultStageId !== undefined) integration.defaultStageId = defaultStageId || undefined;
    if (assignToUserId !== undefined) integration.assignToUserId = assignToUserId || undefined;

    await integration.save();

    res.json({ success: true, data: integration, message: 'Integration updated successfully' });
  } catch (err: any) {
    console.error('[GSHEET] Error updating integration:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /google-sheet-integrations/:id
export const deleteIntegration = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await GoogleSheetIntegration.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId
    });

    if (!result) {
      res.status(404).json({ success: false, message: 'Integration not found' });
      return;
    }

    res.json({ success: true, message: 'Integration deleted successfully' });
  } catch (err: any) {
    console.error('[GSHEET] Error deleting integration:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /google-sheet-integrations/:id/sync - Manual sync trigger
export const triggerSync = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const integration = await GoogleSheetIntegration.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    });

    if (!integration) {
      res.status(404).json({ success: false, message: 'Integration not found' });
      return;
    }

    const syncLog = await syncGoogleSheet(integration);

    // Emit real-time update
    const io = req.app.get('io');
    if (io && req.tenantId) {
      io.to(`tenant_${req.tenantId}`).emit('leads_updated', {
        source: 'google_sheet',
        newLeads: syncLog.newLeads
      });
    }

    res.json({
      success: true,
      data: syncLog,
      message: `Sync complete: ${syncLog.newLeads} new leads, ${syncLog.duplicatesSkipped} duplicates skipped, ${syncLog.errors} errors`
    });
  } catch (err: any) {
    console.error('[GSHEET] Error triggering sync:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /google-sheet-integrations/:id/reset-sync - Reset sync position
export const resetSync = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const integration = await GoogleSheetIntegration.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    });

    if (!integration) {
      res.status(404).json({ success: false, message: 'Integration not found' });
      return;
    }

    integration.lastSyncedRow = 0;
    integration.syncLogs = [];
    integration.lastError = undefined;
    await integration.save();

    res.json({ success: true, message: 'Sync position reset. Next sync will process all rows.' });
  } catch (err: any) {
    console.error('[GSHEET] Error resetting sync:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
