import https from 'https';
import mongoose from 'mongoose';
import GoogleSheetIntegration, { IGoogleSheetIntegration, ISyncLog } from '../models/GoogleSheetIntegration';
import Lead from '../models/Lead';
import LeadStage from '../models/LeadStage';

// Google Sheets public CSV export URL pattern
// Works for sheets shared as "Anyone with the link can view"
function buildSheetCsvUrl(sheetId: string, sheetName: string): string {
  const encodedName = encodeURIComponent(sheetName);
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodedName}`;
}

// Parse CSV line handling quoted fields with commas
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Fetch CSV data from Google Sheets
function fetchSheetCsv(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const makeRequest = (requestUrl: string, redirectCount: number = 0) => {
      if (redirectCount > 5) {
        return reject(new Error('Too many redirects'));
      }

      const protocol = requestUrl.startsWith('https') ? https : require('http');
      protocol.get(requestUrl, (resp: any) => {
        // Handle redirects
        if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
          return makeRequest(resp.headers.location, redirectCount + 1);
        }

        if (resp.statusCode !== 200) {
          return reject(new Error(`Google Sheets returned status ${resp.statusCode}. Make sure the sheet is shared as "Anyone with the link can view".`));
        }

        let data = '';
        resp.on('data', (chunk: string) => { data += chunk; });
        resp.on('end', () => resolve(data));
        resp.on('error', reject);
      }).on('error', reject);
    };

    makeRequest(url);
  });
}

// Parse CSV data into rows
function parseCsvData(csvData: string): string[][] {
  const lines = csvData.split('\n').filter(line => line.trim().length > 0);
  return lines.map(line => parseCsvLine(line));
}

// Extract sheet ID from Google Sheets URL
export function extractSheetId(url: string): string | null {
  // Match patterns like:
  // https://docs.google.com/spreadsheets/d/SHEET_ID/edit
  // https://docs.google.com/spreadsheets/d/SHEET_ID/
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// Fetch headers from a Google Sheet
export async function fetchSheetHeaders(sheetId: string, sheetName: string = 'Sheet1'): Promise<string[]> {
  const url = buildSheetCsvUrl(sheetId, sheetName);
  const csvData = await fetchSheetCsv(url);
  const rows = parseCsvData(csvData);
  if (rows.length === 0) {
    throw new Error('Sheet is empty or inaccessible');
  }
  return rows[0]; // First row = headers
}

// Map a row to lead fields based on column mapping
function mapRowToLead(
  row: string[],
  headers: string[],
  columnMapping: { sheetColumn: string; leadField: string }[]
): Record<string, string> {
  const mapped: Record<string, string> = {};

  for (const mapping of columnMapping) {
    const colIndex = headers.findIndex(
      h => h.toLowerCase().trim() === mapping.sheetColumn.toLowerCase().trim()
    );
    if (colIndex >= 0 && colIndex < row.length && row[colIndex].trim()) {
      mapped[mapping.leadField] = row[colIndex].trim();
    }
  }

  return mapped;
}

// Main sync function for a single integration
export async function syncGoogleSheet(integration: IGoogleSheetIntegration): Promise<ISyncLog> {
  const syncLog: ISyncLog = {
    syncedAt: new Date(),
    rowsSynced: 0,
    newLeads: 0,
    duplicatesSkipped: 0,
    errors: 0,
    errorDetails: []
  };

  try {
    console.log(`[GSHEET-SYNC] Starting sync for "${integration.name}" (sheet: ${integration.sheetId})`);

    // Fetch all CSV data
    const url = buildSheetCsvUrl(integration.sheetId, integration.sheetName);
    const csvData = await fetchSheetCsv(url);
    const allRows = parseCsvData(csvData);

    if (allRows.length === 0) {
      syncLog.errorDetails?.push('Sheet is empty');
      return syncLog;
    }

    // Extract headers from the header row
    const headerRowIndex = (integration.headerRow || 1) - 1;
    if (headerRowIndex >= allRows.length) {
      syncLog.errorDetails?.push(`Header row ${integration.headerRow} exceeds sheet rows (${allRows.length})`);
      return syncLog;
    }

    const headers = allRows[headerRowIndex];
    console.log(`[GSHEET-SYNC] Headers: ${headers.join(', ')}`);

    // Data rows start after header row
    const dataStartIndex = headerRowIndex + 1;
    const totalDataRows = allRows.length - dataStartIndex;

    // Only process rows after lastSyncedRow
    const startFromRow = Math.max(integration.lastSyncedRow, 0);
    const newRows = allRows.slice(dataStartIndex + startFromRow);

    if (newRows.length === 0) {
      console.log(`[GSHEET-SYNC] No new rows to sync (total: ${totalDataRows}, lastSynced: ${startFromRow})`);
      return syncLog;
    }

    console.log(`[GSHEET-SYNC] Processing ${newRows.length} new rows (starting from row ${startFromRow + dataStartIndex + 1})`);

    // Get default stage for the tenant
    let defaultStageId = integration.defaultStageId;
    if (!defaultStageId) {
      const stage = await LeadStage.findOne({ tenantId: integration.tenantId, isDefault: true })
        || await LeadStage.findOne({ tenantId: integration.tenantId }).sort({ order: 1 });
      if (stage) {
        defaultStageId = stage._id;
      } else {
        syncLog.errorDetails?.push('No lead stages configured for this tenant');
        syncLog.errors = 1;
        return syncLog;
      }
    }

    // Process each new row
    for (let i = 0; i < newRows.length; i++) {
      const row = newRows[i];
      const currentRowNumber = startFromRow + i + 1; // 1-based data row number

      try {
        const mapped = mapRowToLead(row, headers, integration.columnMapping);

        // Skip rows without required fields
        if (!mapped.name && !mapped.phone && !mapped.email) {
          continue; // Empty/header row
        }

        // Need at least name and phone
        const leadName = mapped.name || mapped.email || 'Unknown';
        const leadPhone = mapped.phone || '';
        const leadEmail = mapped.email || '';

        if (!leadPhone && !leadEmail) {
          syncLog.errors++;
          syncLog.errorDetails?.push(`Row ${currentRowNumber}: No phone or email`);
          continue;
        }

        // Check for duplicate by phone (last 10 digits) or email
        let existingLead = null;
        if (leadPhone) {
          const phoneDigits = leadPhone.replace(/\D/g, '').slice(-10);
          if (phoneDigits.length >= 7) {
            existingLead = await Lead.findOne({
              tenantId: integration.tenantId,
              phone: { $regex: phoneDigits + '$' }
            });
          }
        }
        if (!existingLead && leadEmail) {
          existingLead = await Lead.findOne({
            tenantId: integration.tenantId,
            email: { $regex: new RegExp(`^${leadEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
          });
        }

        if (existingLead) {
          // Add activity to existing lead
          existingLead.activities.push({
            type: 'note' as any,
            description: `Duplicate entry from Google Sheet "${integration.name}" (Row ${currentRowNumber + headerRowIndex + 1})`,
            createdBy: integration.createdBy,
            createdAt: new Date()
          } as any);
          await existingLead.save();
          syncLog.duplicatesSkipped++;
        } else {
          // Build custom fields from unmapped columns
          const customFields: Record<string, string> = {};
          const mappedLeadFields = integration.columnMapping.map(m => m.leadField);
          const standardFields = ['name', 'email', 'phone', 'courseInterest', 'source'];

          for (const mapping of integration.columnMapping) {
            if (!standardFields.includes(mapping.leadField) && mapped[mapping.leadField]) {
              customFields[mapping.leadField] = mapped[mapping.leadField];
            }
          }

          // Create new lead
          const newLead = new Lead({
            tenantId: integration.tenantId,
            name: leadName,
            phone: leadPhone,
            email: leadEmail,
            courseInterest: mapped.courseInterest ? [mapped.courseInterest] : [],
            source: mapped.source || integration.defaultSource,
            priority: integration.defaultPriority,
            stageId: defaultStageId,
            assignedTo: integration.assignToUserId,
            createdBy: integration.createdBy,
            customFields,
            sourceDetails: {
              platform: 'google_sheet' as any,
              formId: integration.sheetId,
              campaignName: integration.name
            },
            activities: [{
              type: 'created',
              description: `Imported from Google Sheet "${integration.name}" (Row ${currentRowNumber + headerRowIndex + 1})`,
              createdBy: integration.createdBy,
              createdAt: new Date()
            }]
          });

          await newLead.save();
          syncLog.newLeads++;
        }

        syncLog.rowsSynced++;
      } catch (rowErr: any) {
        syncLog.errors++;
        syncLog.errorDetails?.push(`Row ${currentRowNumber}: ${rowErr.message}`);
        console.error(`[GSHEET-SYNC] Row ${currentRowNumber} error:`, rowErr.message);
      }
    }

    // Update last synced row
    integration.lastSyncedRow = startFromRow + newRows.length;
    integration.lastSyncAt = new Date();
    integration.lastError = syncLog.errors > 0 ? `${syncLog.errors} errors during sync` : undefined;

    // Keep only last 50 sync logs
    integration.syncLogs.push(syncLog);
    if (integration.syncLogs.length > 50) {
      integration.syncLogs = integration.syncLogs.slice(-50);
    }

    await integration.save();

    console.log(`[GSHEET-SYNC] Completed: ${syncLog.newLeads} new, ${syncLog.duplicatesSkipped} duplicates, ${syncLog.errors} errors`);

    return syncLog;
  } catch (err: any) {
    console.error(`[GSHEET-SYNC] Fatal error syncing "${integration.name}":`, err.message);
    syncLog.errors++;
    syncLog.errorDetails?.push(err.message);

    integration.lastError = err.message;
    integration.lastSyncAt = new Date();
    integration.syncLogs.push(syncLog);
    await integration.save();

    return syncLog;
  }
}

// Sync all active integrations (called by cron)
export async function syncAllActiveSheets(): Promise<void> {
  try {
    const now = new Date();
    const integrations = await GoogleSheetIntegration.find({ isActive: true });

    for (const integration of integrations) {
      // Check if enough time has passed since last sync
      if (integration.lastSyncAt) {
        const minutesSinceLastSync = (now.getTime() - integration.lastSyncAt.getTime()) / 60000;
        if (minutesSinceLastSync < integration.syncInterval) {
          continue; // Not time yet
        }
      }

      try {
        await syncGoogleSheet(integration);
      } catch (err: any) {
        console.error(`[GSHEET-SYNC] Failed to sync integration ${integration._id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error('[GSHEET-SYNC] Fatal error in syncAllActiveSheets:', err.message);
  }
}
