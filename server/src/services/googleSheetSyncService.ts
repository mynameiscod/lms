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

// Decode HTML entities
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

// Fetch all tab (worksheet) names from a Google Sheet
export async function fetchSheetTabs(sheetId: string): Promise<string[]> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`;
  const html = await fetchSheetCsv(url);

  const tabs: string[] = [];
  let match: RegExpExecArray | null;

  // Pattern 1: items.push({name: "TabName", ...}) - primary pattern in Google htmlview
  const p1 = /items\.push\(\{name:\s*"([^"]+)"/g;
  while ((match = p1.exec(html)) !== null) {
    const name = decodeHtmlEntities(match[1].trim());
    if (name && !tabs.includes(name)) tabs.push(name);
  }
  if (tabs.length > 0) return tabs;

  // Pattern 2: {name: "TabName"} in inline script (alternative format)
  const p2 = /\{name:\s*"([^"]+)",\s*pageUrl:/g;
  while ((match = p2.exec(html)) !== null) {
    const name = decodeHtmlEntities(match[1].trim());
    if (name && !tabs.includes(name)) tabs.push(name);
  }
  if (tabs.length > 0) return tabs;

  // Pattern 3: <a href="#gid=...">TabName</a>
  const p3 = /<a[^>]+href=["']#gid=\d+["'][^>]*>([^<]+)<\/a>/gi;
  while ((match = p3.exec(html)) !== null) {
    const name = decodeHtmlEntities(match[1].trim());
    if (name && !tabs.includes(name)) tabs.push(name);
  }
  if (tabs.length > 0) return tabs;

  // Pattern 4: id="sheet-button-..." elements
  const p4 = /id=["']sheet-button-\d+["'][^>]*>([^<]+)/gi;
  while ((match = p4.exec(html)) !== null) {
    const name = decodeHtmlEntities(match[1].trim());
    if (name && !tabs.includes(name)) tabs.push(name);
  }
  if (tabs.length > 0) return tabs;

  // Fallback: return Sheet1
  return ['Sheet1'];
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

// Main sync function for a single integration (handles multiple tabs)
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
    // Backward compat: use sheetNames, fall back to old sheetName field
    const sheetNames = integration.sheetNames?.length > 0
      ? integration.sheetNames
      : [(integration as any).sheetName || 'Sheet1'];

    // Initialize lastSyncedRows map if needed
    if (!integration.lastSyncedRows) {
      integration.lastSyncedRows = new Map();
    }

    console.log(`[GSHEET-SYNC] Starting sync for "${integration.name}" - tabs: ${sheetNames.join(', ')}`);

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

    // Process each tab
    for (const sheetName of sheetNames) {
      try {
        console.log(`[GSHEET-SYNC] Syncing tab "${sheetName}"...`);
        const tabLog = await syncSingleTab(integration, sheetName, defaultStageId);

        syncLog.rowsSynced += tabLog.rowsSynced;
        syncLog.newLeads += tabLog.newLeads;
        syncLog.duplicatesSkipped += tabLog.duplicatesSkipped;
        syncLog.errors += tabLog.errors;
        if (tabLog.errorDetails?.length) {
          syncLog.errorDetails?.push(...tabLog.errorDetails.map(e => `[${sheetName}] ${e}`));
        }
      } catch (tabErr: any) {
        syncLog.errors++;
        syncLog.errorDetails?.push(`[${sheetName}] ${tabErr.message}`);
        console.error(`[GSHEET-SYNC] Tab "${sheetName}" error:`, tabErr.message);
      }
    }

    // Save state
    integration.lastSyncAt = new Date();
    integration.lastError = syncLog.errors > 0 ? `${syncLog.errors} errors during sync` : undefined;

    integration.syncLogs.push(syncLog);
    if (integration.syncLogs.length > 50) {
      integration.syncLogs = integration.syncLogs.slice(-50);
    }

    await integration.save();

    console.log(`[GSHEET-SYNC] Completed: ${syncLog.newLeads} new, ${syncLog.duplicatesSkipped} duplicates, ${syncLog.errors} errors (across ${sheetNames.length} tab(s))`);

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

// Sync a single tab of a Google Sheet
async function syncSingleTab(
  integration: IGoogleSheetIntegration,
  sheetName: string,
  defaultStageId: mongoose.Types.ObjectId
): Promise<ISyncLog> {
  const tabLog: ISyncLog = {
    syncedAt: new Date(),
    rowsSynced: 0,
    newLeads: 0,
    duplicatesSkipped: 0,
    errors: 0,
    errorDetails: []
  };

  // Fetch CSV data for this tab
  const url = buildSheetCsvUrl(integration.sheetId, sheetName);
  const csvData = await fetchSheetCsv(url);
  const allRows = parseCsvData(csvData);

  if (allRows.length === 0) {
    tabLog.errorDetails?.push('Tab is empty');
    return tabLog;
  }

  // Extract headers
  const headerRowIndex = (integration.headerRow || 1) - 1;
  if (headerRowIndex >= allRows.length) {
    tabLog.errorDetails?.push(`Header row ${integration.headerRow} exceeds tab rows (${allRows.length})`);
    return tabLog;
  }

  const headers = allRows[headerRowIndex];
  console.log(`[GSHEET-SYNC] [${sheetName}] Headers: ${headers.join(', ')}`);

  const dataStartIndex = headerRowIndex + 1;
  const lastSyncedRow = integration.lastSyncedRows?.get(sheetName) || 0;
  const startFromRow = Math.max(lastSyncedRow, 0);
  const newRows = allRows.slice(dataStartIndex + startFromRow);

  if (newRows.length === 0) {
    console.log(`[GSHEET-SYNC] [${sheetName}] No new rows`);
    return tabLog;
  }

  console.log(`[GSHEET-SYNC] [${sheetName}] Processing ${newRows.length} new rows`);

  for (let i = 0; i < newRows.length; i++) {
    const row = newRows[i];
    const currentRowNumber = startFromRow + i + 1;

    try {
      const mapped = mapRowToLead(row, headers, integration.columnMapping);

      if (!mapped.name && !mapped.phone && !mapped.email) {
        continue;
      }

      const leadName = mapped.name || mapped.email || 'Unknown';
      const leadPhone = mapped.phone || '';
      const leadEmail = mapped.email || '';

      if (!leadPhone && !leadEmail) {
        tabLog.errors++;
        tabLog.errorDetails?.push(`Row ${currentRowNumber}: No phone or email`);
        continue;
      }

      // Duplicate check
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
        existingLead.activities.push({
          type: 'note' as any,
          description: `Duplicate entry from Google Sheet "${integration.name}" tab "${sheetName}" (Row ${currentRowNumber + headerRowIndex + 1})`,
          createdBy: integration.createdBy,
          createdAt: new Date()
        } as any);
        await existingLead.save();
        tabLog.duplicatesSkipped++;
      } else {
        const customFields: Record<string, string> = {};
        const standardFields = ['name', 'email', 'phone', 'courseInterest', 'source'];
        for (const mapping of integration.columnMapping) {
          if (!standardFields.includes(mapping.leadField) && mapped[mapping.leadField]) {
            customFields[mapping.leadField] = mapped[mapping.leadField];
          }
        }

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
            campaignName: `${integration.name} / ${sheetName}`
          },
          activities: [{
            type: 'created',
            description: `Imported from Google Sheet "${integration.name}" tab "${sheetName}" (Row ${currentRowNumber + headerRowIndex + 1})`,
            createdBy: integration.createdBy,
            createdAt: new Date()
          }]
        });

        await newLead.save();
        tabLog.newLeads++;
      }

      tabLog.rowsSynced++;
    } catch (rowErr: any) {
      tabLog.errors++;
      tabLog.errorDetails?.push(`Row ${currentRowNumber}: ${rowErr.message}`);
      console.error(`[GSHEET-SYNC] [${sheetName}] Row ${currentRowNumber} error:`, rowErr.message);
    }
  }

  // Update last synced row for this tab
  integration.lastSyncedRows.set(sheetName, startFromRow + newRows.length);

  return tabLog;
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
