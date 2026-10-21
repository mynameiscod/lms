# Explicit call recording access

The gateway adds three read-only Outpero tools under the new `mcp_recordings_read` scope:

- `codebegun_call_recordings`: paginated call IDs, duration and stored-recording/transcript flags. All dates by default; optional `days` narrows to 1–90 days. Flags reflect database metadata, not a successful storage fetch.
- `codebegun_call_transcript`: one `recordId` from the listing, optional character `offset`; returns up to 20,000 characters and `nextOffset`. Reads existing text only; no paid job or write.
- `codebegun_call_audio`: one `recordId`; returns complete stored audio as an MCP audio block. Maximum 8 MiB; MP3, WAV, Ogg and FLAC. Larger/unsupported files fail explicitly without truncation. No provider URLs, storage keys or passwords are returned.

All require the existing `manage_leads` native permission, enabled leads module and current tenant-owned MCP role opt-in. Content always joins an active lead in the authenticated tenant, including ALL users. OWN and TEAM restrictions remain effective. Unmatched/archived/foreign-lead calls are excluded. This extension covers OutperoCall storage, not the separate manually uploaded SalesCallRecording module.

Existing `mcp_calls_read` tokens cannot read recordings. `--all-read-domains` deliberately retains its previous eight-domain meaning; recording access requires explicit `--domains recordings`. Database privileges, native LMS permissions and existing tokens are unchanged.

## Deployment on the managed VPS

Use the reviewed commit from this change's PR, with passing CI. These steps restart only the isolated MCP gateway, never the LMS or MongoDB.

1. Fetch and check out the reviewed recording branch commit in `/root/lms-mcp-test`. Keep the previous deployment journal; do not reset or delete production state.
2. Obtain the **existing storage zone's read-only password**, zone name and regional hostname from Bunny Storage. Use the zone holding `outpero-recordings/<tenantId>/<callId>`. Do not use the account API key or read/write storage password. Do not reset/rotate the LMS key. Bunny read-only passwords apply to the storage zone; the gateway further restricts all reads to this enabled account's tenant and canonical Outpero recording path.
3. Stage the read-only storage configuration. The command prompts for the existing zone, regional hostname and hidden password:

   ```bash
   python3 scripts/mcp-production.py recording-storage \
     --email codebegun@gmail.com
   ```

   Use the existing regional hostname if different. The password is entered at a hidden terminal prompt, never in shell arguments or chat. This saves a private backup and changes no consent/roles. A successful save does not verify credential correctness or prove the entered password is read-only; confirm its source in Bunny. No write-probe is performed against customer storage.

4. Activate the reviewed code and configuration:

   ```bash
   python3 scripts/mcp-production.py upgrade
   ```

5. Preview the narrowly scoped access change:

   ```bash
   python3 scripts/mcp-production.py scope-plan \
     --email codebegun@gmail.com --domains recordings
   ```

   Review the tenant/account, existing scopes plus `mcp_recordings_read`, and the three new tools. The client allowlist affects all accounts' eligibility; this workflow changes only the original individually enabled account's MCP role. Apply the **new plan ID printed by this command**, not an earlier plan:

   ```bash
   python3 scripts/mcp-production.py scope-apply --plan-id NEW_REVIEWED_PLAN_ID
   ```

6. Reauthorize CodeBegun Production as that LMS account. Select the consent option that explicitly includes “Read permitted call recordings and full stored transcripts”. Old grants remain narrow. Refresh the tool catalog once after this code/consent change.

## Acceptance checks

- `diagnose-tools --email codebegun@gmail.com` should report 18 eligible tools and a new grant including the recording scope. This still is not proof of the current assistant token.
- From the assistant's actual connection: invoke `codebegun_call_recordings` with `{"limit":1}`. Check `audioStorageConfigured` and find a record with `hasStoredRecording:true` using pagination.
- Invoke `codebegun_call_audio` with that row's `_id` as `recordId`. A successful MCP audio block proves authorized bytes were retrieved from storage. Separately confirm the client can consume/play that block; MCP audio support alone is not a guarantee of ChatGPT audio analysis in every client. Do not claim to have listened until this succeeds.
- Read `codebegun_call_transcript` for a record with a stored transcript; follow `nextOffset` until null. Missing transcripts stay missing; the tool does not trigger transcription.
- Verify old metadata-only grants cannot invoke any new content tool. Synthetic tests cover cross-tenant, OWN/TEAM, archived/unmatched leads, role revocation, missing consent, bounded streaming, canonical paths, redirection refusal and audit failure. Do not probe other real tenants.
- `recording_storage_not_configured`: check configured tenant/zone/hostname and the hidden key input. `recording_unavailable`: verify read-only credentials and storage health. `recording_not_found`: stored object is missing, unlinked, or not authorized. Database presence flags do not prove an object exists. `recording_too_large`/`unsupported_recording_format`: use LMS playback; this release does not transcode.

## Rollback

If the recording scope was applied, run `scope-rollback` first (only while its journal is still the most recent scope change). This restores the previous role/client scopes and revokes grants containing the added scope, while preserving narrow grants. Then run `upgrade-rollback` for the corresponding gateway upgrade. Never run rollback against an unrelated later change.

To remove saved storage credentials, run `recording-storage-remove --email codebegun@gmail.com` and activate with a reviewed `upgrade`. Private configuration backups may still contain the credential; preserve audit/recovery requirements and manage those root-only files deliberately. Removing the staged field alone does not revoke an already running process's cached credential.
