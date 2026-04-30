/**
 * exotelService.ts
 * Wrapper around the Exotel REST API v2.
 *
 * Exotel makes an outbound call and connects it to an IVR App (AppID).
 * The App is configured in the Exotel dashboard with:
 *   1. Say/TTS verbs to ask qualification questions
 *   2. Record verb to capture lead responses
 *   3. On completion, Exotel POSTs the webhook to our /api/v1/ai-calls/webhook/exotel
 *
 * Docs: https://developer.exotel.com/api/
 */
import axios from 'axios';

export interface ExotelCallResult {
  callSid: string;
  status: string;
  dateCreated: string;
}

export interface ExotelCallbackPayload {
  CallSid: string;
  CallFrom: string;
  CallTo: string;
  CallStatus: string;
  Direction: string;
  RecordingUrl?: string;
  RecordingDuration?: string;
  Duration?: string;
  DialCallDuration?: string;
  StartTime?: string;
  EndTime?: string;
  // Custom passthrough params
  CustomField?: string;
  leadId?: string;
  tenantId?: string;
  attemptNumber?: string;
}

/**
 * Initiate an outbound call via Exotel.
 * The call connects the lead to an IVR App (AppID) configured in Exotel dashboard.
 */
export const initiateExotelCall = async (
  accountSid: string,
  apiKey: string,
  apiToken: string,
  virtualNumber: string,
  appId: string,
  toPhone: string,
  leadId: string,
  tenantId: string,
  attemptNumber: number
): Promise<ExotelCallResult> => {
  // Exotel API base URL (India cluster)
  const baseUrl = `https://api.in.exotel.com/v1/Accounts/${accountSid}`;

  // Format phone: Exotel expects 0 + 10-digit or +91...
  const formattedPhone = formatPhone(toPhone);

  const params = new URLSearchParams({
    From: virtualNumber,
    To: formattedPhone,
    CallerId: virtualNumber,
    // Custom data passed back in webhook
    CustomField: JSON.stringify({ leadId, tenantId, attemptNumber }),
    // Connect to the IVR App
    Url: `https://my.exotel.com/${accountSid}/exoml/start_voice/${appId}`,
    // Webhook for status updates (set in Exotel dashboard, or override here)
    StatusCallback: `${process.env.API_BASE_URL || ''}/api/v1/ai-calls/webhook/exotel`,
    StatusCallbackEvents: 'terminal',
    TimeLimit: '300',   // Max call duration 5 minutes
    TimeOut: '40'       // Ring timeout 40 seconds
  });

  const response = await axios.post(
    `${baseUrl}/Calls/connect`,
    params.toString(),
    {
      auth: { username: apiKey, password: apiToken },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000
    }
  );

  const call = response.data?.Call;
  if (!call?.Sid) {
    throw new Error(`Exotel API returned unexpected response: ${JSON.stringify(response.data)}`);
  }

  return {
    callSid: call.Sid,
    status: call.Status,
    dateCreated: call.DateCreated
  };
};

/**
 * Fetch call details from Exotel (used for polling if webhook not received).
 */
export const getExotelCallDetails = async (
  accountSid: string,
  apiKey: string,
  apiToken: string,
  callSid: string
): Promise<{ status: string; duration?: number; recordingUrl?: string }> => {
  const baseUrl = `https://api.in.exotel.com/v1/Accounts/${accountSid}`;

  const response = await axios.get(
    `${baseUrl}/Calls/${callSid}`,
    {
      auth: { username: apiKey, password: apiToken },
      timeout: 10000
    }
  );

  const call = response.data?.Call;
  return {
    status: call?.Status || 'unknown',
    duration: call?.Duration ? parseInt(call.Duration, 10) : undefined,
    recordingUrl: call?.RecordingUrl || undefined
  };
};

/**
 * Map Exotel CallStatus to our internal outcome type.
 */
export const mapExotelStatus = (
  exotelStatus: string
): 'answered' | 'not_answered' | 'busy' | 'failed' | 'in_progress' => {
  const s = (exotelStatus || '').toLowerCase();
  if (s === 'completed') return 'answered';
  if (s === 'no-answer' || s === 'timeout') return 'not_answered';
  if (s === 'busy') return 'busy';
  if (s === 'failed' || s === 'canceled' || s === 'cancelled') return 'failed';
  if (s === 'in-progress' || s === 'ringing') return 'in_progress';
  return 'failed';
};

/**
 * Normalize phone number for Exotel (India format: 0XXXXXXXXXX or +91XXXXXXXXXX).
 */
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) {
    return '0' + digits.slice(2); // 0 + 10 digits
  }
  if (digits.length === 10) {
    return '0' + digits;
  }
  // Already formatted
  return phone;
}
