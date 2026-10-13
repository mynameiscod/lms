jest.mock('../models/Lead', () => ({ __esModule: true, default: {} }));
jest.mock('../controllers/leadSourceConfigController', () => ({ getDecryptedTokens: jest.fn() }));
jest.mock('../controllers/metaLeadAdsController', () => ({ graphGet: jest.fn() }));
jest.mock('../controllers/adCampaignController', () => ({ linkLeadToCampaign: jest.fn() }));
import { extractReferral, adFields, lookupAd } from '../services/whatsAppAdReferralService';
import { getDecryptedTokens } from '../controllers/leadSourceConfigController';
import { graphGet } from '../controllers/metaLeadAdsController';

describe('Click-to-WhatsApp ad referral', () => {
  it('reads the ad from the first message of an ad chat, and ignores ordinary messages', () => {
    expect(extractReferral({ type: 'text', text: { body: 'hi' } })).toBeNull();
    expect(extractReferral({ referral: {} })).toBeNull();
    expect(extractReferral({ referral: { source_id: '1203', source_type: 'ad', headline: 'Java Full Stack', ctwa_clid: 'abc', source_url: 'https://fb.me/x' } }))
      .toMatchObject({ adId: '1203', sourceType: 'ad', headline: 'Java Full Stack', ctwaClid: 'abc', sourceUrl: 'https://fb.me/x' });
  });
  it('stores the ad like a Meta lead-form lead, falling back to the headline when the ad name is unknown', () => {
    const f = adFields({ adId: '1203', headline: 'Java Full Stack', ctwaClid: 'abc' }, {});
    expect(f.sourceDetails).toMatchObject({ platform: 'whatsapp', adId: '1203', adName: 'Java Full Stack', ctwaClid: 'abc' });
    expect(f.utmParams).toEqual({ source: 'facebook', medium: 'click_to_whatsapp' });
    const g = adFields({ adId: '1203', headline: 'Java Full Stack' }, { adName: 'Java Ad v2', campaignName: 'Oct Java' });
    expect(g.sourceDetails).toMatchObject({ adName: 'Java Ad v2', campaignName: 'Oct Java' });
    expect(g.utmParams.campaign).toBe('Oct Java');
  });
  it('looks up the ad and campaign names, and quietly returns nothing when Meta refuses', async () => {
    (getDecryptedTokens as jest.Mock).mockResolvedValue({ metaAds: { pageAccessToken: 'tok' } });
    (graphGet as jest.Mock).mockResolvedValueOnce({ name: 'Java Ad v2', adset: { id: '9', name: 'Hyd 21-30' }, campaign: { id: '8', name: 'Oct Java' } });
    expect(await lookupAd('t1', '1203')).toEqual({ adName: 'Java Ad v2', adSetId: '9', adSetName: 'Hyd 21-30', campaignName: 'Oct Java' });
    (graphGet as jest.Mock).mockRejectedValueOnce(new Error('(#10) permission'));
    expect(await lookupAd('t1', '1203')).toEqual({});
    expect(await lookupAd('t1', 'not-a-number')).toEqual({});
  });
});
