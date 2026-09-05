/**
 * The two pieces of this feature that can be wrong without anybody noticing.
 *
 * Device parsing, because a wrong device on an audit screen is worse than an absent one —
 * somebody will read "desktop" and go looking for a laptop bug that was always a phone bug.
 *
 * meta bounding, because the failure mode is silent and inverted: an oversized payload used to
 * make the row unstorable, so the noisiest events — the ones worth reading — were exactly the
 * ones that went missing.
 */
import { parseUserAgent } from '../services/careerPilotActivityService';

describe('reading a device off a user agent', () => {
  const UA = {
    chromeWin: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    edgeWin: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    chromeAndroid: 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
    safariIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
    chromeIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/119.0.0.0 Mobile/15E148 Safari/604.1',
    ipad: 'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/604.1',
    androidTablet: 'Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    samsung: 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
    firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    safariMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  };

  it('does not mistake Edge for Chrome, though Edge says Chrome', () => {
    expect(parseUserAgent(UA.edgeWin).browser).toBe('Edge');
    expect(parseUserAgent(UA.chromeWin).browser).toBe('Chrome');
  });

  it('does not mistake Chrome on iOS for Safari, though it says Safari', () => {
    expect(parseUserAgent(UA.chromeIos).browser).toBe('Chrome (iOS)');
    expect(parseUserAgent(UA.safariIphone).browser).toBe('Safari');
  });

  it('does not mistake Samsung Internet for Chrome', () => {
    expect(parseUserAgent(UA.samsung).browser).toBe('Samsung Internet');
  });

  it('reads the operating system', () => {
    expect(parseUserAgent(UA.chromeWin).os).toBe('Windows');
    expect(parseUserAgent(UA.chromeAndroid).os).toBe('Android');
    expect(parseUserAgent(UA.safariIphone).os).toBe('iOS');
    expect(parseUserAgent(UA.safariMac).os).toBe('macOS');
    expect(parseUserAgent(UA.firefox).os).toBe('Windows');
  });

  describe('form factor — the field an admin acts on', () => {
    it('calls a phone a phone', () => {
      expect(parseUserAgent(UA.chromeAndroid).deviceType).toBe('mobile');
      expect(parseUserAgent(UA.safariIphone).deviceType).toBe('mobile');
    });

    it('calls a laptop a desktop', () => {
      expect(parseUserAgent(UA.chromeWin).deviceType).toBe('desktop');
      expect(parseUserAgent(UA.safariMac).deviceType).toBe('desktop');
    });

    it('separates tablets, including the Android ones that only differ by omitting "Mobile"', () => {
      expect(parseUserAgent(UA.ipad).deviceType).toBe('tablet');
      expect(parseUserAgent(UA.androidTablet).deviceType).toBe('tablet');
    });

    it('marks a crawler as a bot, so a funnel is not counting robots as visitors', () => {
      expect(parseUserAgent(UA.googlebot).deviceType).toBe('bot');
    });
  });

  it('reports a version, trimmed to something readable', () => {
    expect(parseUserAgent(UA.chromeWin).browserVersion).toBe('120.0');
    expect(parseUserAgent(UA.firefox).browserVersion).toBe('121.0');
  });

  it('says unknown rather than guessing', () => {
    expect(parseUserAgent('').browser).toBe('unknown');
    expect(parseUserAgent(undefined).os).toBe('unknown');
    const junk = parseUserAgent('not a user agent at all');
    expect(junk.browser).toBe('unknown');
    expect(junk.deviceType).toBe('unknown');
  });
});
