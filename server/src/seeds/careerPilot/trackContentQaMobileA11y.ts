/**
 * Career-track content: Mobile, Accessibility and Security Checks (QA_MOBILE_A11Y_SECURITY), QA / SDET, batch QA3.
 *
 * Quality beyond the functional happy path: what is different about mobile and how far browser emulation goes before
 * Appium and real devices are needed, accessibility testing by tool and by hand, the security checks a QA engineer
 * adds to a test plan (defensive and authorised only: headers, cookie flags, error pages, access checks, a ZAP
 * baseline scan on an app you own), and covering browsers, devices and visuals. It builds on Year 1 "Building for
 * Everyone" ("Keyboard Navigation", "Contrast, Size and Zoom", "Checking Your Own Work"), Year 3 "Usable Without a
 * Mouse", Year 1 "What Security Protects", this track's Playwright topic and "Testing Authentication, Authorisation
 * and Input Handling" (API auth tests are not repeated here), "Pairwise and Combinatorial Testing" and "Selenium Grid,
 * and Selenium versus Playwright"; those are referred to by title, not re-taught.
 *
 * One fictional app runs through the topic: SafarBus, a Hyderabad bus-booking site (Flask) with a buggy and a fixed
 * build. Planted defects: logo image without alt (A11Y-1), the "To" field labelled only by a placeholder (A11Y-2), a
 * "See festive offers" span that works by mouse only (A11Y-3), grey note text at 2.32:1 contrast (A11Y-4), no security
 * headers (SEC-1), a session cookie without HttpOnly, Secure or SameSite (SEC-2), the Werkzeug debugger traceback
 * served on errors (SEC-3), and a customer able to open the support refund queue (SEC-4). Every Playwright, pytest,
 * requests, Selenium and Pillow output quoted is real output from Python 3.13, pytest 9.1, Playwright 1.64 for Python
 * with pytest-playwright 0.10, Selenium 4.51, requests 2.34, Flask 3.1 and Pillow 13, run against that app with the
 * installed Google Chrome 156 and Microsoft Edge 156 on Windows. Not run, written from their documentation and marked
 * as such: Appium (server, drivers and the Python client), real Android or iOS devices and emulators, axe-core and
 * axe-playwright-python, screen readers, OWASP ZAP, pip-audit, cloud device farms, Percy/Applitools, and Firefox and
 * WebKit (their Playwright builds were not downloaded; the real "Executable doesn't exist" error is quoted).
 *
 * Skills: AUTOMATED_TESTING by default; the ACCESSIBILITY lesson is WEB_ACCESSIBILITY, and accessibility questions in
 * other units' checkpoints use ck('WEB_ACCESSIBILITY', ...).
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_QA_MOBILE_A11Y_SECURITY_BUNDLES: PilotBundle[] = [
  /* ── MOBILE_TESTING ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_MOBILE_A11Y_SECURITY_MOBILE_TESTING',
    notes: `SafarBus sells bus tickets out of Hyderabad, and most of its bookings come from phones: a student booking a
Vijayawada bus on a crowded metro, on a mid-range Android phone, on a network that drops between stations. A
release that is perfect on a laptop at office Wi-Fi can still fail most of SafarBus's customers.

## What is different about mobile

- **Devices.** Hundreds of Android models in active use in India, from budget phones with little memory to
  flagships, plus iPhones. Screen sizes, pixel densities and notches all differ.
- **OS versions.** Android users update slowly and unevenly; a bug can exist only on one OS version or one
  manufacturer's skin (battery savers that kill background work are a classic).
- **Networks.** 4G that becomes 3G in a lift, captive Wi-Fi, airplane mode mid-payment. Test slow and offline, not
  just fast.
- **Interruptions.** A call arrives, a notification is tapped, or the user switches to a UPI app to approve a
  payment and comes back. "Return from the UPI app" is where many Indian payment bugs live: the app was killed in
  the background and the booking state is lost.
- **Permissions.** Location, camera, notifications, SMS (OTP autofill). Each can be granted, denied, or denied
  "forever"; each path needs a test.
- **Install and upgrade.** Fresh install, upgrade from the previous version with data, low storage, the store build
  versus the debug build.
- **Touch and orientation.** Taps, swipes, long-press, the on-screen keyboard covering the Pay button, rotation.

## Three kinds of app, three kinds of tool

1. **Mobile web** (a site in the phone's browser). Browser automation works: Playwright and Selenium can emulate a
   phone's screen, touch and user agent in desktop Chrome, and cloud farms run the same tests on real phones.
2. **Native apps** (Kotlin/Java on Android, Swift on iOS). Browser tools cannot see them. Appium, Espresso
   (Android) and XCUITest (iOS) drive them.
3. **Hybrid apps** (a native shell with web views, or React Native/Flutter). Appium can switch between the native
   and web-view contexts.

**Emulators and simulators** (Android Studio's emulator; the iOS Simulator, which needs a Mac) are fast and free and
good for most functional checks. **Real devices** are needed for performance, camera, battery, real networks,
manufacturer quirks and the final sign-off. A sensible team runs most automation on emulators and a small, chosen
set of real devices, often rented from a device farm (next lessons).

## Mobile web with Playwright: device emulation

Playwright ships descriptors for common devices. With SafarBus running and the installed Chrome:

    pixel = p.devices["Pixel 7"]
    context = browser.new_context(**pixel)

    devices known: 207
    Pixel 7: {'viewport': {'width': 412, 'height': 839}, 'device_scale_factor': 2.625,
              'is_mobile': True, 'has_touch': True, 'default_browser_type': 'chromium'}

A descriptor sets viewport, pixel ratio, user agent, is_mobile and has_touch together. On the phone context the
desktop navigation is hidden and a Menu button appears; the script checked it like a user would:

    phone: nav visible? False | menu button visible? True
    after tap: aria-expanded = true
    search button width on phone: 380 of viewport 412
    horizontal scroll? False
    desktop: nav visible? True | menu button visible? False

"No horizontal scroll" is a cheap, valuable check: content wider than the screen is one of the commonest mobile
defects. tap() needs touch; on the desktop context it fails honestly:

    Locator.tap: The page does not support tap. Use hasTouch context option to enable touch support.

## Location, offline and slow networks

SafarBus has a "Find stops near me" button. Playwright fakes the position and the permission:

    ctx = browser.new_context(**pixel, geolocation={"latitude": 17.4375, "longitude": 78.4482},
                              permissions=["geolocation"])
    ...
    ctx.set_geolocation({"latitude": 17.4849, "longitude": 78.4138})   # move to Kukatpally

    geolocation granted: Nearest stop: Kukatpally
    geolocation not granted: Location not available. Type your stop instead.

The second line is the denied path, and it matters as much: the page must offer a way forward. Offline:

    online banner visible? False
    offline banner visible? True
    navigation while offline: Page.goto: net::ERR_INTERNET_DISCONNECTED at http://127.0.0.1:58646/bookings
    back online, banner visible? False

Playwright for Python has no throttling option, but on Chromium the DevTools Protocol does it:

    cdp = ctx.new_cdp_session(page)
    cdp.send("Network.enable")
    cdp.send("Network.emulateNetworkConditions", {"offline": False, "latency": 400,
             "downloadThroughput": 50 * 1024, "uploadThroughput": 20 * 1024})

    no throttling: load in 118 ms
    slow 3G-like: load in 1006 ms

Selenium does the same emulation through ChromeOptions; this ran with Selenium 4.51 and headless Chrome:

    opts.add_experimental_option("mobileEmulation", {"deviceMetrics": {"width": 412, "height": 839,
                                 "pixelRatio": 2.625, "touch": True, "mobile": True}})
    innerWidth: 412 / menu button displayed: True / nav displayed: False

**The limit of emulation:** it is desktop Chrome with a small window and a phone's user agent. It does not
reproduce a phone's CPU, memory, real Safari, the keyboard covering a field, or a UPI app switch.

## Appium in outline (written from the Appium documentation, not run here)

Appium is a server that speaks the WebDriver protocol and passes commands to a platform driver: UiAutomator2 for
Android, XCUITest for iOS. In Appium 2 the drivers are installed separately ("appium driver install uiautomator2")
and the server listens on http://127.0.0.1:4723 by default. A Python test uses the Appium client, which builds on
Selenium:

    from appium import webdriver
    from appium.options.android import UiAutomator2Options
    from appium.webdriver.common.appiumby import AppiumBy

    options = UiAutomator2Options()
    options.platform_name = "Android"
    options.device_name = "emulator-5554"
    options.app = "C:\\\\builds\\\\safarbus-qa.apk"
    driver = webdriver.Remote("http://127.0.0.1:4723", options=options)
    driver.find_element(AppiumBy.ACCESSIBILITY_ID, "Search buses").click()

Prefer accessibility ids (the content description on Android, the accessibility identifier on iOS): they are stable
and, like role-based locators on the web, they push the team towards an accessible app. XPath over the native tree
works but is slow and brittle. Appium Inspector shows the element tree of a running app. Waits, page objects and
pytest fixtures work as in the Selenium and Playwright topics.`,
    workedExample: `**Scenario.** Turn the mobile checks into a pytest suite that runs on a phone profile in CI, and see what
happens when someone runs it without the phone profile.

**Step 1: the tests.** They do not mention a device at all:

    def test_menu_opens_by_tap(page: Page):
        page.goto("/")
        menu = page.get_by_role("button", name="Menu")
        menu.tap()
        expect(menu).to_have_attribute("aria-expanded", "true")
        expect(page.get_by_role("link", name="My bookings")).to_be_visible()

    def test_nearest_stop_uses_location(page: Page):
        page.goto("/")
        page.get_by_role("button", name="Find stops near me").tap()
        expect(page.get_by_text("Nearest stop: Secunderabad")).to_be_visible()

**Step 2: location and permission in conftest.py**, by extending the plugin's browser_context_args fixture:

    @pytest.fixture(scope="session")
    def browser_context_args(browser_context_args):
        return {**browser_context_args,
                "geolocation": {"latitude": 17.4399, "longitude": 78.4983},   # Secunderabad
                "permissions": ["geolocation"]}

**Step 3: run with a device.** pytest-playwright's --device option applies the descriptor to every context:

    $ pytest mob -v --browser-channel chrome --device "Pixel 7"
    mob/test_mobile.py::test_menu_opens_by_tap[chromium] PASSED              [ 33%]
    mob/test_mobile.py::test_nearest_stop_uses_location[chromium] PASSED     [ 66%]
    mob/test_mobile.py::test_no_sideways_scroll[chromium] PASSED             [100%]
    3 passed in 4.69s

**Step 4: run without it**, as a teammate did:

    E   playwright._impl._errors.Error: Locator.tap: The page does not support tap. Use hasTouch context option ...
    FAILED mob/test_mobile.py::test_menu_opens_by_tap[chromium] - playwright._imp...
    FAILED mob/test_mobile.py::test_nearest_stop_uses_location[chromium] - playwr...
    2 failed, 1 passed in 4.57s

The failure is correct: these are phone tests. Put the device in the CI command or in pytest.ini addopts for the
mobile job, and keep a separate desktop job. Note the third test passed on desktop too, because a 1280-pixel page
also has no sideways scroll; it only means something on the phone profile.

**Step 5: what this suite does not prove.** It proves the responsive layout, touch, location and offline handling
of the mobile web page. It says nothing about a native app, a real phone's speed, or Safari: those go on the real
device list.`,
    mcqs: [
      mcq('SafarBus\'s Android app loses the booking when a user switches to a UPI app to approve the payment and comes back. Which kind of testing finds this?', [
        ['Interruption testing: background the app mid-flow and return to it', true],
        ['Responsive layout testing of the booking page across screen widths', false],
        ['Load testing the payment API with many users at the same moment', false],
        ['Contrast and font-size checks on the payment confirmation screen', false],
      ], 'The defect appears only when the app goes to the background and comes back, so the test must do exactly that, ideally on a real device where the OS may kill the app. Layout, load and contrast checks never leave the app.'),
      mcq('A test uses browser.new_context(**p.devices["Pixel 7"]) in desktop Chrome. What does it give you?', [
        ['A phone-sized viewport, touch, pixel ratio and a phone user agent', true],
        ['A real Android browser running inside a virtual Pixel 7 phone image', false],
        ['A remote connection to a Pixel 7 phone in a cloud device farm', false],
        ['The phone\'s CPU and memory limits, so slow pages show up as slow', false],
      ], 'A descriptor sets viewport, device_scale_factor, user agent, is_mobile and has_touch on a desktop browser context. No emulator, no real device and no CPU or memory limits are involved.'),
      mcq('Which locator does the Appium documentation steer you towards for SafarBus\'s native Search button?', [
        ['The accessibility id, set as the button\'s content description', true],
        ['An absolute XPath copied from the Appium Inspector element tree', false],
        ['The screen coordinates of the button on the emulator\'s display', false],
        ['The button\'s position in the list of all clickable elements', false],
      ], 'Accessibility ids are stable, fast and also help screen-reader users. Absolute XPath breaks with any layout change and is slow on native trees, and coordinates or positions break on another screen size.'),
    ],
    checkpoint: [
      mcq('The "Find stops near me" test sets a geolocation on the context but the page shows "Location not available". What is missing?', [
        ['permissions=["geolocation"] on the context', true],
        ['A call to page.reload() after the position is set', false],
        ['The has_touch option, needed for location to work', false],
        ['A real GPS device attached to the test machine', false],
      ], 'Setting coordinates does not grant the permission; without it the browser denies the request and the page takes its fallback path. Reloading, touch support and hardware have nothing to do with it.'),
      mcq('Which SafarBus risk can emulation in desktop Chrome NOT cover, so it goes on the real-device list?', [
        ['The keyboard covering the Pay button on a budget Android phone', true],
        ['The menu button replacing the full navigation below a 600-pixel viewport', false],
        ['The offline banner appearing when the network goes away', false],
        ['The nearest stop changing when the location is moved', false],
      ], 'The on-screen keyboard, real CPU, real browser and OS behaviour are not emulated. The layout switch, the offline event and a faked location are exactly what Playwright emulation was shown to cover.'),
      mcq('The team has an Android app built with Kotlin and a mobile web site. Which plan fits?', [
        ['Appium (or Espresso) for the app, Playwright emulation plus a few real phones for the site', true],
        ['Playwright with a Pixel descriptor for both, since the app also runs on a Pixel phone', false],
        ['Appium for the site only, since browser tools cannot run on a phone-sized screen', false],
        ['Manual testing only for both, since native mobile apps cannot be automated reliably on emulators', false],
      ], 'Browser tools cannot see a native app; Appium or Espresso can. The web site is well served by emulation for layout and touch plus a small real-device set. Browser tools handle phone-sized screens, and mobile automation on emulators is routine.'),
    ],
  },

  /* ── ACCESSIBILITY ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_MOBILE_A11Y_SECURITY_ACCESSIBILITY',
    notes: `You learned to build accessible pages in Year 1 ("Building for Everyone": semantics, keyboard, screen readers,
contrast, "Checking Your Own Work") and to check your own front end in "Usable Without a Mouse". This lesson is the
tester's side: how to test someone else's page systematically, automate what can be automated, and report what
you find so it gets fixed.

## WCAG in outline

The Web Content Accessibility Guidelines (WCAG, from the W3C) are the standard teams and laws point to. Version 2.2
is the current W3C Recommendation at the time of writing; check w3.org for later versions. It is organised as four
principles (POUR):

- **Perceivable:** text alternatives for images, captions, enough contrast, content that reflows.
- **Operable:** everything works from a keyboard, focus is visible, targets are big enough, nothing traps focus.
- **Understandable:** labels and instructions, predictable behaviour, helpful error messages.
- **Robust:** correct names, roles and values so assistive technology can read the page.

Each success criterion has a number and a level: A, AA or AAA. Most organisations and contracts target **level
AA**. In India the Rights of Persons with Disabilities Act 2016 and the GIGW guidelines for government sites refer
to these standards; banks, ed-tech and government work often have accessibility in the contract. A bug report
that names the criterion ("1.4.3 Contrast (Minimum), AA") gets triaged faster than "text is hard to read".

## What a tester checks, by hand

1. **Keyboard only.** Unplug the mouse. Tab through the page: is every control reachable, in a sensible order, with a
   visible focus indicator? Can you operate it with Enter or Space, and escape from dialogs? (2.1.1, 2.4.3, 2.4.7)
2. **Zoom and reflow.** 200% zoom, and a 320-pixel-wide window: nothing cut off, no sideways scrolling. (1.4.4, 1.4.10)
3. **Screen reader.** Do one real task: NVDA on Windows (free), TalkBack on Android, VoiceOver on iPhone and Mac.
   Do controls announce a sensible name and role? Are errors announced? (Not run for these notes.)
4. **Colour.** Is information carried by colour alone, such as a red border as the only error sign? (1.4.1)

## What can be automated, run on SafarBus

**Keyboard order.** Press Tab and record document.activeElement each time:

    for _ in range(12):
        page.keyboard.press("Tab")
        stops.append(page.evaluate("document.activeElement.tagName + '#' + document.activeElement.id"))

On the buggy build focus went Home, My bookings, Sign in, from, to, date, Search buses, Find stops near me, then
back to the top. "See festive offers" was never reached: it is a span with a click handler. On the fixed build it
has role="button", tabindex="0" and a keydown handler, and Tab stop 9 is span#offers; Enter applied FESTIVE10.

**The accessibility tree.** Playwright's aria_snapshot() prints what assistive technology is given:

    - banner:
      - img
      - navigation:
        - link "Home":
    ...
      - textbox "From"
      - textbox "To"
      - text: See festive offers

An img with no name (A11Y-1), offers as plain text rather than a button (A11Y-3). The fixed build shows
img "SafarBus home" and button "See festive offers". You can assert on a snapshot with
expect(locator).to_match_aria_snapshot(...).

**A placeholder is not a label.** The buggy "To" field has only placeholder="To", yet the tree says textbox "To"
because Chrome falls back to the placeholder for the name. So get_by_role("textbox", name="To") finds it, while
get_by_label("To") finds nothing (count 0). The placeholder disappears as soon as the user types, and it is usually
low-contrast. A home-made check that demands a real label, aria-label or aria-labelledby reported it:

    images without alt: ['<img src="/logo.svg" width="120" height="32">']
    inputs without a label: ['<input id="to" name="to" placeholder="To">']
    clickable but not focusable: ['<span id="offers" class="offers">See festive offers</span>']

**Contrast, computed in Python.** Read the computed colour and the nearest background, then apply the WCAG
relative-luminance formula:

    def luminance(c):
        def ch(v):
            v = v / 255
            return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
        r, g, b = (ch(v) for v in c)
        return 0.2126 * r + 0.7152 * g + 0.0722 * b

    def contrast(fg, bg):
        hi, lo = sorted((luminance(fg), luminance(bg)), reverse=True)
        return (hi + 0.05) / (lo + 0.05)

    contrast .note   fg=(170, 170, 170) bg=(255, 255, 255) size=14px: 2.32:1 FAIL (AA normal text 4.5:1)

AA needs 4.5:1 for normal text and 3:1 for large text (about 24px, or about 18.7px bold) and for the edges of
controls and icons. The fix, #595959, measured 7.00:1. A home-made check like this misses text over images and
gradients; treat it as a smoke test.

**Target size.** WCAG 2.2 added 2.5.8 Target Size (Minimum), AA: 24 by 24 CSS pixels, with a spacing exception. On
the Pixel 7 profile, bounding_box() flagged the Menu button at 49.4 x 21.0. A script flags; a person decides
whether the spacing exception applies.

## axe (written from the axe-core documentation, not run here)

axe-core is the open-source rules engine behind many tools (the axe browser extension, Lighthouse's accessibility
audit). For Playwright, @axe-core/playwright serves Node tests; in Python, the axe-playwright-python package
injects axe into the page:

    from axe_playwright_python.sync_playwright import Axe
    results = Axe().run(page)
    assert results.violations_count == 0, results.generate_report()

Each violation names a rule (image-alt, label, color-contrast...), the elements and the WCAG criteria. Run it on key
pages in CI and fail the build on new violations. Note that axe treats a non-empty placeholder as passing its
label rule, which is why the stricter home-made check above still earns its place.

## What automation cannot see

Whether alt text is meaningful, whether the reading order makes sense, whether an error message helps, whether a
custom widget behaves as its role promises, whether a task can be completed with a screen reader. Automated
checks catch the obvious; manual passes catch the rest.`,
    workedExample: `**Scenario.** SafarBus's ed-tech partner wants accessibility evidence before embedding the booking widget.
Turn the checks into a pytest suite, run it on both builds, and report the findings.

**Step 1: the suite** (helpers in a11y_checks.py, pytest-playwright's page fixture):

    def test_images_have_alt(home):
        assert home.evaluate(AUDIT_JS)["imgs"] == []

    @pytest.mark.parametrize("selector", [".note", "#updated", ".search-btn"])
    def test_text_contrast_meets_aa(home, selector):
        ratio = text_contrast(home.locator(selector).first)
        assert ratio >= 4.5, f"{selector} contrast {ratio:.2f}:1 is below 4.5:1"

    def test_offers_work_from_keyboard(home):
        for _ in range(15):
            home.keyboard.press("Tab")
            if home.evaluate("document.activeElement.id") == "offers":
                break
        else:
            pytest.fail("Tab never reached the festive offers control")
        home.keyboard.press("Enter")
        assert home.locator("#offers").inner_text() == "FESTIVE10 applied"

**Step 2: the buggy build.**

    E   AssertionError: .note contrast 2.32:1 is below 4.5:1
    E   Failed: Tab never reached the festive offers control
    FAILED a11ytests/test_a11y.py::test_images_have_alt[chromium]
    FAILED a11ytests/test_a11y.py::test_inputs_have_labels[chromium]
    FAILED a11ytests/test_a11y.py::test_clickables_are_focusable[chromium]
    FAILED a11ytests/test_a11y.py::test_text_contrast_meets_aa[chromium-.note]
    FAILED a11ytests/test_a11y.py::test_offers_work_from_keyboard[chromium]
    5 failed, 2 passed in 6.25s

**Step 3: the fixed build.** 7 passed in 5.50s.

**Step 4: report each finding with its criterion and the user it hurts.**

    A11Y-1  Logo has no alt (1.1.1 Non-text Content, A). Screen readers announce "image" or the file name.
    A11Y-2  "To" has no label, only a placeholder (3.3.2 Labels or Instructions, A). The hint
            vanishes once typing starts; voice-control users cannot say "click To".
    A11Y-3  Festive offers works by mouse only (2.1.1 Keyboard, A). Keyboard and switch users cannot get
            the discount. Fix: a real <button>, or role, tabindex and Enter/Space handling.
    A11Y-4  Grey note text 2.32:1 (1.4.3 Contrast (Minimum), AA). Needs 4.5:1; #595959 gives 7.00:1.

**Step 5: say what was not covered.** A screen-reader pass with NVDA and TalkBack, 200% zoom, and the meaning of
alt texts were manual items still to do. "Automated checks pass" is a statement about these seven checks, not
about the page being accessible.`,
    mcqs: [
      mcq('The SafarBus "To" field has placeholder="To" and no label. get_by_role("textbox", name="To") finds it. Why is it still a defect?', [
        ['The hint disappears once the user types, so it is not a persistent label', true],
        ['get_by_role only works when the field has an explicit aria-label set', false],
        ['Placeholders are ignored completely by every assistive technology on the market', false],
        ['The field fails the contrast rule, since placeholder text is white', false],
      ], 'Chrome uses the placeholder as a fallback name, which is why the role locator matched, but the visible hint vanishes when typing starts and is usually faint. get_by_role matched without aria-label, placeholders are not always ignored, and the colour is not white.'),
      mcq('Grey text #aaaaaa on white measured 2.32:1. Which WCAG AA requirement does it fail for 14px body text?', [
        ['4.5:1, the minimum for normal-sized text', true],
        ['3:1, the minimum for every size of text', false],
        ['7:1, the AA minimum for small body text', false],
        ['2:1, the minimum for any text at all', false],
      ], 'AA asks 4.5:1 for normal text and 3:1 for large text; 7:1 is the AAA level. 2.32:1 fails both AA thresholds, and there is no 2:1 rule.'),
      mcq('The axe report for a page is empty. What can the tester claim?', [
        ['The page passed axe\'s automated rules; manual checks are still needed', true],
        ['The page conforms to WCAG 2.2 at level AA across every success criterion', false],
        ['Screen-reader users can complete every task on the page without help', false],
        ['The alt texts on the page correctly describe what the images show', false],
      ], 'Automation catches only part of the problems; reading order, meaningful alt text, task completion and many criteria need a person. An empty report is evidence for the rules it ran, nothing more.'),
    ],
    checkpoint: [
      mcq('Tabbing through SafarBus never lands on "See festive offers", a span with a click handler. Which criterion does it fail and what is the fix?', [
        ['2.1.1 Keyboard; use a button, or add role, tabindex and Enter/Space', true],
        ['1.4.3 Contrast; darken the text of the span until it reaches at least 4.5:1', false],
        ['1.1.1 Non-text Content; add an alt attribute to the span element', false],
        ['2.4.7 Focus Visible; add an outline style to the span on :focus', false],
      ], 'The control cannot be reached or operated by keyboard at all, which is 2.1.1. A native button gives focus and Enter/Space for free. Contrast and alt are unrelated, and a focus outline is useless on an element that never receives focus.'),
      mcq('Which SafarBus check is a good fit for automation in CI rather than for a person?', [
        ['Every img on key pages has an alt attribute', true],
        ['The alt text of each image describes its purpose', false],
        ['The error message for a bad date helps the user', false],
        ['A screen-reader user can complete a booking', false],
      ], 'Presence of an attribute is mechanical and cheap to check on every build. Whether the text is meaningful, whether a message helps, and whether a task can be done with a screen reader are judgements a person makes.'),
      mcq('On the Pixel 7 profile the Menu button measures 49.4 by 21.0 CSS pixels. What should the tester do?', [
        ['Flag it against 2.5.8 and check by hand whether the spacing exception applies', true],
        ['Pass it, since target size rules apply only to desktop pointer targets', false],
        ['Fail the build at once, since 2.5.8 allows no exceptions of any kind at level AA', false],
        ['Ignore it, since target size was removed from WCAG in version 2.2', false],
      ], 'WCAG 2.2 added 2.5.8 Target Size (Minimum) at AA: 24 by 24 pixels, with a spacing exception, so a script flags and a person decides. It applies to touch too, it has exceptions, and 2.2 added it rather than removing it.'),
    ],
  },

  /* ── SECURITY_FOR_QA ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_MOBILE_A11Y_SECURITY_SECURITY_FOR_QA',
    notes: `A QA engineer is not a penetration tester, but many security defects are ordinary bugs that a functional test
plan can catch: a page that tells the world its stack trace, a cookie a script can read, a customer who can open a
support screen. This lesson adds those checks to SafarBus's plan.

**Ground rules, every time.** Test only applications you own or have written permission to test, in the scope and
environment agreed (a QA or staging environment, not production unless it is explicitly allowed), with synthetic
accounts and data. These are checks that defences exist, not attacks: no payload lists, no tools pointed at systems
you do not own. Report security findings privately to the team, not in a public channel. "What Security Protects"
in Year 1 gave the why; "Testing Authentication, Authorisation and Input Handling" in the API topic covered
two-user BOLA tests, token expiry and mass assignment, which are not repeated here.

## The OWASP Top 10 as a tester sees it

OWASP publishes a Top 10 list of web application risks and revises it every few years; check owasp.org for the
current edition. The 2021 edition, which most job descriptions still quote, read from a tester's chair:

- **A01 Broken Access Control:** a role or user reaches what they should not. Test every role against every
  protected page and action.
- **A02 Cryptographic Failures:** data sent or stored without protection. Check HTTPS everywhere, Secure cookies,
  no secrets in URLs or logs.
- **A03 Injection:** input treated as code. Check that input is validated and shown back as text.
- **A04 Insecure Design:** missing limits in the design itself, such as unlimited OTP attempts. Test the rules.
- **A05 Security Misconfiguration:** debug pages, default settings, missing headers, verbose errors.
- **A06 Vulnerable and Outdated Components:** known-vulnerable libraries. Run a dependency audit in CI.
- **A07 Identification and Authentication Failures:** weak login, lockout and session handling.
- **A08 Software and Data Integrity Failures:** untrusted updates or pipelines.
- **A09 Security Logging and Monitoring Failures:** attacks nobody would notice.
- **A10 Server-Side Request Forgery:** the server fetching URLs a user controls.

## The checks, run on SafarBus

**Security headers** (A05). Read them like any other response field:

    @pytest.mark.parametrize("path", ["/", "/login"])
    def test_security_headers_present(base_url, path):
        h = requests.get(base_url + path).headers
        missing = [name for name in ("Content-Security-Policy", "X-Content-Type-Options", "Referrer-Policy")
                   if name not in h]
        assert missing == [], f"{path} is missing {missing}"

Content-Security-Policy limits where scripts and other resources may load from (frame-ancestors 'none' also stops
the page being framed); X-Content-Type-Options: nosniff stops the browser guessing file types; Referrer-Policy
limits what URL leaks to other sites. Strict-Transport-Security only means something over HTTPS, so check it on
the HTTPS QA environment, not on a local http server.

**Cookie flags** (A02, A07). The session cookie should be HttpOnly (scripts cannot read it), Secure (sent only over
HTTPS) and SameSite (not sent on most cross-site requests):

    def test_session_cookie_is_flagged(asha_login):
        raw = asha_login.headers["Set-Cookie"]
        flags = {part.strip().split("=")[0].lower() for part in raw.split(";")[1:]}
        assert {"httponly", "secure", "samesite"} <= flags, f"sid cookie flags: {raw}"

**Error pages** (A05). Provoke an ordinary error with ordinary input, here an impossible date, and check that the
page reveals nothing internal:

    r = requests.get(f"{base_url}/search", params={"from": "Ameerpet", "to": "Vijayawada", "date": "31-02-2026"})
    for tell in ("Traceback", "File \\"", ".py", "Werkzeug Debugger"):
        assert tell not in r.text, f"error page contains {tell!r}"

**Access checks** (A01). Logged out goes to the login page; a customer gets 403 on the support refund queue; and
the positive case, support gets 200, so the test does not pass by everyone being refused.

**Input shown as text** (A03). A stop name typed as <b>D'Souza Colony</b> must come back escaped, as
&lt;b&gt;D&#39;Souza Colony&lt;/b&gt;. That is a functional check with an ordinary name, not an attack.

## What the run found

    E   AssertionError: / is missing ['Content-Security-Policy', 'X-Content-Type-Options', 'Referrer-Policy']
    E   AssertionError: sid cookie flags: sid=XuZ0rvn40UmETze17EtJx9C2wo1oajNY; Path=/
    E   AssertionError: error page contains 'Traceback'
    E   AssertionError: customer got 200
    5 failed, 3 passed in 1.23s

The buggy build's error page was the Werkzeug debugger, titled "ValueError: day is out of range for month", with
full file paths from the server. On the fixed build all 8 passed in 0.95s, and the error page was "Something went
wrong. Reference 459a532d." The reference lets support find the details in the server log without showing them
to the user. One more defect remained: the impossible date still gave 500, not 400. Input reaching code that did
not expect it is a bug in its own right; raise it.

Both builds also send "Server: Werkzeug/3.1.9 Python/3.13.15". It is the development server, which should never
face users; in production a proper server or proxy sets this, and the exact version is better hidden. Record it as
low severity.

## Dependency checks

A06 is caught by tools, not tests: pip-audit for Python, npm audit for JavaScript, or Dependabot on GitHub, run in
CI. (Written from their documentation; not run for these notes.)

## OWASP ZAP baseline scan (from the ZAP documentation, not run here)

ZAP is OWASP's free scanner. The baseline scan spiders the target for about a minute and then runs only passive
rules, which read the responses: missing headers, cookie flags, information leaks. It does not attack. Run it
with Docker against the QA environment you are authorised to test:

    docker run -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t https://qa.safarbus.example -r zap-report.html

Its exit code is 0 when nothing is flagged, 1 with failures, 2 with warnings only, and 3 on errors, so CI can gate
on it. A rules file (-c) marks each rule IGNORE, WARN or FAIL so known exceptions do not fail every build. The full
scan runs active, attacking rules: only with written permission, against a non-production environment, usually by
the security team.

## Writing it up

Each finding gets the OWASP category, the evidence (request, response, header), the impact in plain words, and the
retest result after the fix. Mark it confidential.`,
    workedExample: `**Scenario.** A teammate wrote the cookie check with Playwright instead of requests, and it passed on the buggy
build for SameSite. Find out why, and decide which check to keep.

**Step 1: what the browser stored.** After logging in through the UI, context.cookies() returned:

    buggy {'name': 'sid', 'httpOnly': False, 'secure': False, 'sameSite': 'Lax'}
      document.cookie sees: 'sid=z9FACZC45ENx5q8Han3Wg5z0A...
    fixed {'name': 'sid', 'httpOnly': True, 'secure': True, 'sameSite': 'Lax'}
      document.cookie sees: ''

**Step 2: what the server sent.** The raw Set-Cookie headers:

    buggy   sid=<token>; Path=/
    fixed   sid=<token>; Secure; HttpOnly; Path=/; SameSite=Lax

**Step 3: explain the difference.** The buggy server sent no SameSite at all. Chrome applies Lax by default to
cookies without the attribute, and context.cookies() reports what the browser stored, so it said Lax. Another
browser, or an older one, may treat the missing attribute differently. The defect is in what the server sends;
a check of the browser's view can hide it.

**Step 4: keep both, for different claims.**

- The requests test reads Set-Cookie and fails on the buggy build: "sid cookie flags: sid=...; Path=/". That
  proves what the server promises in every browser.
- The Playwright check proves the browser effect that matters to users: on the fixed build document.cookie is
  empty, so a script injected into the page could not read the session; on the buggy build it could.

**Step 5: the report.** "SEC-2: session cookie sid is set without HttpOnly, Secure or SameSite (OWASP A02/A07
area). Evidence: Set-Cookie: sid=...; Path=/. Impact: any script running in the page can read the session, and the
cookie may be sent over plain HTTP. Fixed build sends Secure; HttpOnly; SameSite=Lax; document.cookie no longer
shows it. Retested 28 Oct on QA, passed."`,
    mcqs: [
      mcq('A SafarBus error page shows "ValueError: day is out of range for month" with full file paths. How should the tester classify it?', [
        ['Security misconfiguration: internals leaked to users on an error', true],
        ['Broken access control: the error page should require a login', false],
        ['Injection: the date parameter was executed as Python on the server', false],
        ['Cryptographic failure: the error page was served over plain HTTP', false],
      ], 'A debug page left on in a deployed environment is classic misconfiguration (A05): it reveals code, paths and versions. Requiring login would not fix the leak, the date was only parsed, and HTTP is not the issue here.'),
      mcq('Why does the SafarBus access test also check that support staff get 200 on the refund queue?', [
        ['So the test cannot pass merely because the page refuses everyone', true],
        ['Because support staff are the only users who can see a 403 error', false],
        ['Because a 403 is only meaningful when it is compared with a 401', false],
        ['So the ZAP baseline scan can reuse the support login cookie later', false],
      ], 'A broken page that returns 403 to all users would pass a customer-only test. The positive case proves the check discriminates by role. Any role can receive 403, 401 is a separate case, and ZAP is unrelated.'),
      mcq('What does a ZAP baseline scan do to the target application?', [
        ['Spiders it briefly and applies passive rules to the responses', true],
        ['Sends attack payloads to every form field that it can find', false],
        ['Logs in as every user and compares what each user can see', false],
        ['Reads the server source code and flags dangerous function calls', false],
      ], 'The baseline scan only reads what normal browsing returns, which makes it safe for CI against an authorised QA environment. Active attacks belong to the full scan, ZAP does not discover role differences by itself, and it never sees source code.'),
    ],
    checkpoint: [
      mcq('Which cookie attribute stops a script running in the page from reading SafarBus\'s session cookie?', [
        ['HttpOnly', true],
        ['SameSite=Lax', false],
        ['Path=/', false],
        ['Secure', false],
      ], 'HttpOnly hides the cookie from document.cookie; on the fixed build it read as an empty string. Secure limits it to HTTPS, SameSite limits cross-site sending, and Path limits which URLs receive it.'),
      mcq('A colleague proposes running ZAP\'s full active scan against SafarBus production on sale day "to be thorough". What is the right response?', [
        ['Not without written permission, and on a non-production environment', true],
        ['Fine, as long as the scan runs late at night when sale traffic is low', false],
        ['Fine, because ZAP is a free tool published by OWASP itself', false],
        ['Run the baseline instead, since it also attacks every form', false],
      ], 'Active scans send attack traffic that can change data and break things; they need written authorisation and an agreed target, normally not production. Timing and the tool being free change nothing, and the baseline scan is passive.'),
      mcq('On the fixed build, an impossible date gives "Something went wrong. Reference 459a532d." with status 500. What should the tester do?', [
        ['Pass the leak check, and raise a defect that bad input should get 400', true],
        ['Pass it fully, since the page no longer shows any traceback at all', false],
        ['Fail the leak check, since a reference number exposes the server\'s own log', false],
        ['Ask for the reference to be removed, since users never need it', false],
      ], 'Nothing internal leaks, but a 500 means input reached code that did not expect it: a separate bug. A reference is the recommended way to link the user to logs without exposing them, and support teams rely on it.'),
    ],
  },

  /* ── CROSS_BROWSER ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_MOBILE_A11Y_SECURITY_CROSS_BROWSER',
    notes: `"Works on my machine" has a cousin: "works in my browser". SafarBus's customers arrive in Chrome on Android, Safari
on iPhones, Chrome and Edge on office laptops, and Samsung Internet. Running every test on every combination is
impossible; this lesson is about covering them efficiently, and catching the bugs only a screenshot shows.

## Engines, not brand names

What matters is the rendering engine:

- **Chromium (Blink):** Chrome, Edge, Samsung Internet, Opera, Brave.
- **Gecko:** Firefox.
- **WebKit:** Safari on Mac, and on iPhone and iPad all browsers have long had to use WebKit (the rules have
  loosened in some regions, but most iPhone traffic you see is still WebKit).

So "tested on Chrome and Edge" is one engine twice. SafarBus's home page, screenshotted in Chrome 156 and Edge 156
on the same machine, came out identical:

    chrome version 156.0.8078.48
    msedge version 156.0.4314.50
    chrome vs msedge: 0 pixels differ (0.000%), box None

A second Chromium brand adds little; a second engine adds a lot. Playwright covers the three engines with one API
("--browser chromium --browser firefox --browser webkit" in pytest-playwright). On the machine these notes were run
on, Playwright's Firefox and WebKit builds had not been downloaded, and asking for one failed honestly:

    BrowserType.launch: Executable doesn't exist at ...\\ms-playwright\\webkit-2370\\Playwright.exe

The fix is "playwright install firefox webkit" (or the CI image that includes them). Playwright's WebKit is close to
Safari but not Safari; the final check for iPhone behaviour is a real iPhone.

## Building the matrix

1. **Start from analytics,** not from a wish list. The product's own traffic tells you which browsers, OS versions
   and screen sizes customers use. Cover what makes up most of it, plus anything a contract names.
2. **Tier it.** Tier 1 (every pull request): one desktop Chromium, one phone profile. Tier 2 (nightly): Firefox and
   WebKit, a tablet size. Tier 3 (before release): real devices, the oldest supported OS, Safari on iPhone.
3. **Combine with pairwise.** Browser x OS x screen x language explodes quickly; the pairwise method from "Pairwise
   and Combinatorial Testing" covers every pair with a handful of runs.
4. **Run browser-sensitive tests across the matrix, not everything.** Layout, date pickers, file upload, video,
   clipboard and payment redirects differ between engines; business rules do not. Logic stays in fast single-browser
   or API tests.

## Grids and cloud device farms

Selenium Grid spreads tests over machines you run ("Selenium Grid, and Selenium versus Playwright"). Cloud device
farms rent you browsers and real phones: BrowserStack, Sauce Labs, LambdaTest, AWS Device Farm and Firebase Test
Lab are common names (written from their documentation; none was used for these notes). The pattern is the same
everywhere: your test connects to a remote WebDriver or Appium URL with capabilities naming the browser, OS or
device, and credentials come from environment variables, never from the code. To test an app that runs only inside
your network, farms provide a secure tunnel (BrowserStack Local, Sauce Connect). They cost money per minute or per
parallel session, so tier 3 runs there, not every commit.

## Visual regression testing

Functional tests check that the button works; they pass happily when a CSS change pushes it under the footer. A
visual test takes a screenshot, compares it with an approved baseline, and fails on a difference. Run on SafarBus
with Playwright and Pillow:

    def compare(a, b, tolerance=0):
        if a.size != b.size:
            return f"size differs: {a.size} vs {b.size}"
        diff = ImageChops.difference(a, b).convert("L").point(lambda v: 255 if v > tolerance else 0)
        changed = diff.histogram()[255]
        return f"{changed} pixels differ ({100 * changed / (a.size[0] * a.size[1]):.3f}%), box {diff.getbbox()}"

    same build again, clock unmasked: 45 pixels differ (0.004%), box (150, 319, 157, 328)
    same build again, clock masked:   0 pixels differ (0.000%), box None
    markup v2 (button padding 8px -> 10px): 17479 pixels differ (1.707%), box (16, 159, 916, 335)
    desktop baseline vs phone shot: size differs: (1280, 800) vs (412, 839)
    same page at device_scale_factor 2: size differs: (1280, 800) vs (2560, 1600)

Read these lines; they are the pitfalls:

- **Dynamic content** ("Fares updated at 10:42:13") changed 45 pixels on a page nobody touched. Mask it
  (page.screenshot(mask=[locator])), freeze the clock, or use fixed test data.
- **A two-pixel padding change** moved everything below the button: 1.7% of the page. The diff box shows where to look.
- **Baselines are per configuration.** Viewport, pixel ratio, browser and OS fonts all change the image. Keep one
  baseline per browser and viewport, and generate them in the same Docker image CI uses, or every laptop disagrees.
- **Animations and loading:** screenshot(animations="disabled") and wait for the page to settle first.
- **Thresholds:** a small tolerance absorbs anti-aliasing noise, but a high one hides real changes. Start strict and
  loosen with evidence.

Playwright's Node test runner has expect(page).toHaveScreenshot() built in, which manages baselines and diff images;
the Python plugin does not, so Python teams use a comparison like the one above or a plugin. Hosted services
(Percy, Applitools, written from their docs) store baselines, show side-by-side diffs and let a reviewer approve a
change. Whichever tool, a person reviews every diff and updates the baseline deliberately in the same pull request
as the change that caused it.`,
    mcqs: [
      mcq('SafarBus\'s test plan says "cross-browser: Chrome, Edge, Brave". What is the main gap?', [
        ['All three use Chromium; Gecko and WebKit are not covered at all', true],
        ['Brave blocks scripts by default, so its results are not reliable', false],
        ['Edge on Windows cannot run automated tests without a device farm', false],
        ['Chrome results already cover Safari, since both are WebKit based', false],
      ], 'The engine decides rendering and most behaviour; three Chromium browsers are nearly one test, as the identical Chrome and Edge screenshots showed. Edge automates locally, and Chrome is Blink, not WebKit.'),
      mcq('A visual test fails on every run with 45 pixels changed in a small box, though nobody touched the page. What is the likely cause?', [
        ['Dynamic content, such as a timestamp, inside the screenshot area', true],
        ['The baseline image was saved in a compressed, lossy image format', false],
        ['The browser was updated between the two screenshots of the run', false],
        ['The comparison tolerance is too high to detect real differences', false],
      ], 'A small, stable box of changes on an untouched page points at content that changes by itself; on SafarBus it was the "Fares updated at" clock, and masking it gave 0 pixels. Browser updates and lossy files cause wider noise, and a high tolerance would hide changes, not create them.'),
      mcq('Where should SafarBus run its real-iPhone Safari checks?', [
        ['In a tier run before release, on a device farm or a team phone', true],
        ['On every commit, in Playwright\'s WebKit build on Windows', false],
        ['Nowhere, since emulation in Chrome covers iPhone behaviour', false],
      ], 'Real-device runs are slower and cost money, so they belong to a pre-release tier. Playwright\'s WebKit is close to Safari but not the same, and Chrome emulation does not reproduce iPhone Safari at all.'),
    ],
    checkpoint: [
      mcq('The browser x OS x screen x language matrix for SafarBus has 96 combinations. What is the efficient way to cover it?', [
        ['A pairwise set of combinations, with the high-traffic ones always included', true],
        ['All 96 combinations on every pull request, using enough parallel workers in CI', false],
        ['Only the single most common combination, since the others are rare', false],
        ['A random sample of ten combinations, chosen again on every run', false],
      ], 'Pairwise covers every two-way interaction with a few runs, and analytics make sure the combinations most customers use are always in. All 96 on every PR is slow and costly, one combination misses engine bugs, and random samples are not repeatable.'),
      mcq('A two-pixel padding change on the Search button made 1.7% of the SafarBus screenshot differ. What should happen next?', [
        ['A person reviews the diff and, if intended, approves a new baseline in that PR', true],
        ['The tolerance is raised to 2% so that small CSS changes stop failing builds', false],
        ['The visual test is deleted, since functional tests already cover the button', false],
        ['The baseline is regenerated automatically on every run, so the tests stay green', false],
      ], 'Visual tests exist to make every visible change a decision. Raising tolerance hides the next real regression, functional tests passed despite the change, and auto-regenerating baselines makes the test meaningless.'),
      mcq('Visual baselines made on a developer laptop fail in CI on every screenshot, by small amounts all over the page. What is the cause and fix?', [
        ['Different fonts and rendering; make baselines in the CI image itself', true],
        ['CI is slower; add a fixed wait before taking each of the screenshots', false],
        ['The laptop has a bigger screen; crop every screenshot to the same size', false],
        ['CI runs headless; switch the CI job to headed mode with a display', false],
      ], 'Font rendering and anti-aliasing differ by OS and machine, giving small differences everywhere. Baselines must come from the same environment that compares them. A wait does not change fonts, size differences fail differently, and headed versus headless is not the main factor.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_MOBILE_A11Y_SECURITY_DEBUGGING',
    notes: `Six things that went wrong while building SafarBus's mobile, accessibility, security and visual checks. In
several of them the app was fine and the test was wrong; in two the test passed when it should not have. Every
message is real output from Playwright, pytest, requests or Pillow.

## 1. "The page does not support tap"

**Symptom.** Mobile tests that passed in the mobile CI job failed on a teammate's laptop:

    E   playwright._impl._errors.Error: Locator.tap: The page does not support tap. Use hasTouch context option ...
    2 failed, 1 passed in 4.57s

**Cause.** The suite was run without --device "Pixel 7", so contexts were desktop contexts with no touch.

**Fix.** Put the device in the command or in the mobile job's addopts, or set has_touch=True in
browser_context_args. Do not replace tap() with click() to make it pass; that tests a different thing.

## 2. Safari passed, but it was not Safari

**Symptom.** A report said "verified on iPhone 13 (Safari)". The test had used p.devices["iPhone 13"] with
p.chromium.launch(channel="chrome").

**Cause.** The descriptor changes the user agent, not the engine:

    Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 ... Mobile/15E148 Safari/604.1
    vendor: Google Inc. | engine has window.chrome: object
    browser actually running: chromium 156.0.8078.48

The descriptor itself says default_browser_type 'webkit'.

**Fix.** Report what ran ("Chromium with an iPhone 13 viewport"), use p.webkit for the WebKit engine, and keep real
Safari for the device tier.

## 3. Location set, location denied

**Symptom.** The page showed "Location not available. Type your stop instead." although the test set
geolocation to Ameerpet's coordinates.

**Cause.** Coordinates were given, permission was not. The browser denied the request, and the page (correctly)
took its fallback path.

**Fix.** permissions=["geolocation"] on the context; then the page said "Nearest stop: Ameerpet". Keep the denied
case as its own test: it found a real path users take.

## 4. Security headers broke "Find stops near me", and no test noticed

**Symptom.** After the Content-Security-Policy header was added, the button did nothing. All functional tests
were green, because none of them checked the result text after the click.

**Cause.** That build put the page script inline. default-src 'self' forbids inline scripts, and Chrome said so in
the console:

    error: Executing inline script violates the following Content Security Policy directive 'default-src 'self''.
    Either the 'unsafe-inline' keyword, a hash ('sha256-...'), or a nonce ('nonce-...') is required ...

**Fix.** Move the script to /app.js (what the fixed build does), or use a nonce. Do not add 'unsafe-inline', which
throws away most of the protection. And add a console listener to the UI suite that fails on errors:

    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    ...
    assert errors == []

## 5. A cookie check that passed on the buggy build

**Symptom.** A Playwright check asserted cookie["sameSite"] in ("Lax", "Strict") and passed on the build that sent
no SameSite.

**Cause.** Chrome treats a cookie without SameSite as Lax and context.cookies() reports what the browser stored:
{'name': 'sid', 'httpOnly': False, 'secure': False, 'sameSite': 'Lax'}. The server's header was "sid=...; Path=/".

**Fix.** Check the Set-Cookie header the server sends (requests, allow_redirects=False); keep the browser check
for HttpOnly's effect (document.cookie is empty on the fixed build).

## 6. A visual test that never passes

**Symptom.** Every run: "45 pixels differ (0.004%), box (150, 319, 157, 328)".

**Cause.** The box sits on "Fares updated at 10:42:13"; the clock changed between baseline and run.

**Fix.** mask=[page.locator("#updated")] in page.screenshot, or a fixed clock in the test app. After masking:
"0 pixels differ (0.000%), box None". Do not raise the tolerance to absorb it; that would also absorb a real
change of the same size.`,
    mcqs: [
      mcq('A mobile test fails with "Locator.tap: The page does not support tap" on a laptop but passes in CI. What is the right fix?', [
        ['Run with the same device option CI uses, or give the context touch', true],
        ['Replace tap() with click() everywhere so it works on both machines', false],
        ['Add a wait before tap() so the page has time to enable touch support', false],
        ['Upgrade Chrome on the laptop to the version that the CI machine runs', false],
      ], 'Touch is a context option; the laptop run had a desktop context. click() would make the test pass while testing something else, a wait cannot add touch support, and Chrome versions are not the cause.'),
      mcq('After adding a Content-Security-Policy, "Find stops near me" stopped working, yet all tests stayed green. Which change to the suite catches this class of bug?', [
        ['Fail any UI test that logs a console error, and assert the result text', true],
        ['Remove the CSP header in the QA environment so the tests keep passing', false],
        ['Add \'unsafe-inline\' to the policy so inline scripts are allowed again', false],
        ['Run the UI tests twice, once with and once without the security headers', false],
      ], 'Chrome logged the CSP violation; a console listener turns it into a failure, and asserting the outcome of the click catches a dead button. Removing the header or adding unsafe-inline throws away the protection, and running twice still has no assertion.'),
      mcq('A visual test reports "45 pixels differ, box (150, 319, 157, 328)" on every run. The box is the "Fares updated at" time. What is the fix?', [
        ['Mask that element or freeze the clock in the test app', true],
        ['Raise the tolerance to ignore differences under 0.01%', false],
        ['Regenerate the baseline before every run of the test', false],
        ['Take the screenshot twice and keep the matching pair', false],
      ], 'The difference comes from content that changes by design, so it should be removed from the comparison. A tolerance would also hide a real change of that size, regenerating baselines removes the test, and two shots seconds apart differ for the same reason.'),
      mcq('A report says "verified on iPhone 13 Safari", but the test launched Chrome with p.devices["iPhone 13"]. What actually ran?', [
        ['Chromium with an iPhone-sized viewport and Safari user agent', true],
        ['WebKit, because the descriptor switches the browser engine', false],
        ['Safari, because Playwright redirects iPhone runs to WebKit', false],
        ['An iOS Simulator started by Playwright on the test machine', false],
      ], 'Descriptors change viewport, touch and user agent; the engine is whatever was launched. navigator.vendor was "Google Inc." and window.chrome existed. Only p.webkit gives WebKit, and Playwright never starts an iOS Simulator.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_MOBILE_A11Y_SECURITY_PRACTICE',
    notes: `Eight exercises on SafarBus and pages like it. Try each before reading the answer. The contrast numbers were
computed with the function from the accessibility lesson; the code was run against the demo app.

## 1. Contrast by the numbers (easy)

Which pass AA for 16px text? (a) #777777 on white, (b) #767676 on white, (c) white on saffron #ff9933,
(d) white on green #138808.

**Answer.** (a) 4.48:1, fails, just; (b) 4.54:1, passes; (c) 2.13:1, fails; (d) 4.61:1, passes. Round nothing: 4.48
is a fail, and eyeballing cannot tell (a) from (b).

## 2. Name the criterion (easy)

Match: a CAPTCHA image with no text alternative; a dialog you cannot leave with the keyboard; a required field
shown only by a red border; an error message that is not announced.

**Answer.** 1.1.1 Non-text Content; 2.1.2 No Keyboard Trap; 1.4.1 Use of Color (and 3.3.2); 4.1.3 Status Messages.
SafarBus's "near me" result uses role="status" for exactly that last reason.

## 3. Write the keyboard test (medium)

Write a test that fails if "See festive offers" cannot be reached and used by keyboard.

**Answer.** The suite's test: press Tab up to 15 times until document.activeElement.id is "offers", fail with a clear
message if it never is, then press Enter and assert "FESTIVE10 applied". On the buggy build: "Failed: Tab never
reached the festive offers control".

## 4. Parse the cookie flags (medium)

Write the check for "sid=abc; Secure; HttpOnly; Path=/; SameSite=Lax" and say why Playwright's cookies() is the
wrong source for SameSite.

**Answer.**

    flags = {part.strip().split("=")[0].lower() for part in raw.split(";")[1:]}
    assert {"httponly", "secure", "samesite"} <= flags

Chrome reports Lax for a cookie sent without SameSite, so the browser view passed the buggy build.

## 5. A mobile test with location (medium)

Test that a user in Secunderabad (17.4399, 78.4983) sees Secunderabad as the nearest stop, on a phone profile.

**Answer.** Override browser_context_args with geolocation and permissions=["geolocation"], run with
--device "Pixel 7", tap "Find stops near me", and expect the text "Nearest stop: Secunderabad". Add a second test
with no permission that expects the "Type your stop instead" fallback.

## 6. Plan the matrix (medium)

Analytics: most traffic is Chrome on Android, a large share is Safari on iPhone, then desktop Chrome and Edge, a
small share Firefox. Budget: one browser on every pull request. Plan three tiers.

**Answer.** Every PR: Chromium with a Pixel profile (the biggest group, and it covers phone layout). Nightly:
desktop Chromium, Firefox, WebKit with an iPhone profile. Before release: real iPhone Safari and two or three real
Android phones on a farm, including an old OS version. Edge needs no slot of its own; it is Chromium.

## 7. Is this in scope? (medium)

A ZAP baseline report on the QA environment lists: a missing X-Content-Type-Options header, a cookie without
HttpOnly, and a third-party analytics domain without some header. What do you do with each?

**Answer.** Raise the first two against SafarBus. The third is not SafarBus's server: do not test it further; note
it for the team, and mark the rule IGNORE for that domain in the rules file with a reason, so the build gate stays
meaningful.

## 8. Should this visual diff fail the build? (hard)

A PR changes button padding from 8px to 10px; the diff is 17479 pixels (1.707%), box (16, 159, 916, 335). The PR
description says "slightly bigger search button for touch".

**Answer.** It should fail until a person looks, and then pass by approving a new baseline in this PR. The box
spans the form and everything below it, which is expected when a button grows. Check the phone screenshot too:
bigger targets help 2.5.8. A tolerance that let 1.7% through would have hidden it, which is the point.`,
    mcqs: [
      mcq('Grey #777777 on white measures 4.48:1. Does it pass WCAG AA for 16px body text?', [
        ['No; 4.48 is below 4.5 and the threshold is not rounded', true],
        ['Yes; 4.48 rounds to 4.5, which meets the AA threshold', false],
        ['Yes; 16px counts as large text, which only needs 3:1', false],
        ['No; body text always needs the 7:1 ratio for level AA', false],
      ], 'The threshold is a hard 4.5:1; #767676 (4.54:1) is the nearest grey that passes. 16px regular is normal text, large text starts around 24px or 18.7px bold, and 7:1 is AAA.'),
      mcq('A required field on a SafarBus form is shown only by a red border. Which criterion does this fail?', [
        ['1.4.1 Use of Color', true],
        ['1.4.3 Contrast (Minimum)', false],
        ['2.4.7 Focus Visible', false],
        ['1.1.1 Non-text Content', false],
      ], 'Colour is the only cue, which users who cannot distinguish red miss. Contrast is about ratios, Focus Visible about the keyboard indicator, and Non-text Content about alternatives for images.'),
      mcq('With a budget of one browser on every pull request and most traffic on Android Chrome, which should it be?', [
        ['Chromium with a phone profile such as Pixel 7', true],
        ['WebKit with an iPad profile, the hardest engine', false],
        ['Firefox on desktop, to cover the rarest engine', false],
        ['Edge on desktop, to cover the office laptops', false],
      ], 'The per-PR run should protect the most customers and the riskiest layout, phone-sized Chromium. WebKit and Firefox belong to the nightly tier, and Edge is Chromium already.'),
      mcq('A ZAP baseline report flags a missing header on a third-party analytics domain the SafarBus page loads. What should the tester do?', [
        ['Note it, and mark that rule IGNORE for the domain with a reason', true],
        ['Run ZAP\'s active scan against that analytics domain to confirm', false],
        ['Raise a defect against SafarBus\'s server for the missing header', false],
        ['Delete the baseline scan from CI since its results are unreliable', false],
      ], 'It is not SafarBus\'s server and not in the authorised scope, so it is recorded and excluded with a reason. Scanning it is unauthorised, SafarBus cannot set another domain\'s headers, and one out-of-scope finding is no reason to drop the gate.'),
      mcq('Which pair of SafarBus tests together covers the "near me" feature properly?', [
        ['Permission granted shows the nearest stop; not granted shows the type-your-stop fallback', true],
        ['Permission granted at Ameerpet; permission granted again at the same Ameerpet location', false],
        ['Permission granted on a phone profile; permission granted on a desktop profile instead', false],
        ['Permission not granted on a phone profile; not granted again in a fresh browser context', false],
      ], 'The feature has two real paths, granted and denied, and each needs a test. Repeating the same location, or the same path on another profile, adds runs but not coverage of the other path.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_MOBILE_A11Y_SECURITY_INTERVIEW_QUESTION',
    notes: `Four questions that come up in QA and SDET interviews at product companies, GCCs and service companies, with
an answer that scores well and the follow-up a good interviewer asks next. Say each aloud in about two minutes.

## Q1. "How would you test a mobile app differently from a web app?"

**Model answer.** "I add the risks a laptop does not have. Devices and OS versions: I would pick a device list from
our analytics, including a low-memory Android phone and the oldest OS we support. Networks: slow, switching and
offline, especially in the middle of a payment. Interruptions: a call, a notification, and switching to a UPI app
and back, which is where booking state gets lost. Permissions: location, camera, notifications, each granted and
denied. Install and upgrade with existing data. For automation, native apps need Appium or Espresso; mobile web I
can cover with Playwright device emulation, which I have used to test a responsive menu, location and offline
handling. Most runs go on emulators, and a small set of real devices, often in a device farm, before release."

**Follow-up.** "What can emulation not tell you?" — "Real performance, the real Safari engine, the keyboard
covering a button, OS killing the app in the background, camera and battery. Those need real devices."

## Q2. "How do you test a page for accessibility?"

**Model answer.** "Automated and manual, because automation catches only part of it. Automated: axe on the key
pages in CI, and a few checks of my own, like every input having a real label, since axe accepts a placeholder.
Manual: keyboard only, tab through, check focus is visible and every control works; zoom to 200% and a narrow
window; a screen reader for one real task, NVDA on Windows or TalkBack on Android; and colour not being the only
cue. I report against WCAG 2.2 AA criteria by number. On a demo app I found a mouse-only offers button, which fails
2.1.1, and grey text at 2.32:1, which fails 1.4.3."

**Follow-up.** "The axe report is clean. Is the page accessible?" — "It means the automated rules passed. Alt text
could still be meaningless, the order could be confusing, error messages unhelpful. I would not sign off without
the manual pass."

## Q3. "What security testing do you do as a QA engineer?"

**Model answer.** "Within the scope I am authorised for, on QA environments with test accounts, I add basic checks
to the plan: access control by role and by user, including two-user tests on APIs; session cookies with HttpOnly,
Secure and SameSite; security headers like Content-Security-Policy and nosniff; error pages that do not leak stack
traces; input shown back as text. I run an OWASP ZAP baseline scan in CI, which is passive, and a dependency audit.
Anything deeper, like an active scan or a penetration test, is done with written permission, usually with the
security team. I report findings privately, with evidence and the OWASP category."

**Follow-up.** "Why test the cookie header rather than what the browser shows?" — "Because the browser fills in
defaults. Chrome reports SameSite=Lax for a cookie sent without it, so a browser-side check can pass a server that
sends nothing."

## Q4. "How do you decide which browsers to test, and how do you catch visual bugs?"

**Model answer.** "From analytics, by engine rather than brand: Chromium, Firefox's Gecko and WebKit. Chrome and
Edge are both Chromium, so I do not spend two slots on them. I tier it: a phone-sized Chromium on every PR, the
other engines nightly, real devices before release, with pairwise to keep combinations small. For visual bugs I
compare screenshots with approved baselines, masking dynamic content like timestamps, keeping a baseline per
browser and viewport, generated in the CI image. A person reviews each diff and approves new baselines in the same
PR as the change."

**Follow-up.** "Your visual tests are flaky. What do you do?" — "Find what changes: a clock, an animation, a font
difference between machines. Mask or freeze it, disable animations, make baselines in CI. I would not just raise
the tolerance, because that hides real regressions."`,
    mcqs: [
      mcq('An interviewer asks how mobile testing differs from web testing. Which answer scores best?', [
        ['Device and OS spread, networks, interruptions, permissions, install and upgrade', true],
        ['Mobile testing is web testing on a smaller screen, run in the browser\'s emulator', false],
        ['Mobile apps are tested only manually, since automation tools do not support them', false],
      ], 'The strong answer names the risks a laptop does not have and how each is tested. Emulation covers only part of mobile web and none of native apps, and mobile automation with Appium or Espresso is routine.'),
      mcq('Asked "the axe report is clean; is the page accessible?", which answer would a senior tester give?', [
        ['The automated rules passed; manual checks are still needed before sign-off', true],
        ['Yes, axe covers the WCAG 2.2 AA criteria completely for that page', false],
        ['No, axe reports are unreliable, so they should be ignored in reviews', false],
      ], 'axe is valuable and trusted for what it checks, but many criteria need a person: meaningful alt text, order, helpful errors, real tasks with a screen reader. It does not cover all of AA, and dismissing it wastes a good tool.'),
      mcq('Asked what security testing a QA engineer does, which answer shows the right boundaries?', [
        ['Authorised basic checks and a passive scan, with deeper testing by permission', true],
        ['Any scan or attack that finds bugs, on whichever environment is available', false],
        ['None at all, since security belongs entirely to the security team', false],
      ], 'QA adds access, cookie, header and error-page checks plus a baseline scan within an agreed scope, and leaves active scans to written permission. Unscoped attacks are not acceptable, and leaving all security to one team misses cheap, ordinary bugs.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_MOBILE_A11Y_SECURITY_CHECKPOINT',
    notes: `Ten questions across the topic: mobile testing and emulation, Appium, accessibility checks by tool and by
hand, authorised security checks, and cross-browser and visual testing. Answer without notes; the result shows which
lesson to revisit.`,
    checkpoint: [
      mcq('Which SafarBus check needs a real phone rather than Playwright emulation?', [
        ['Booking state after the OS kills the app in the background', true],
        ['The menu button appearing below a 600-pixel viewport', false],
        ['The offline banner appearing when the network is switched off', false],
        ['The nearest stop when the location is set to Ameerpet', false],
      ], 'App lifecycle, real memory pressure and OS behaviour are outside emulation. The layout switch, offline events and faked location were all tested with Playwright emulation in desktop Chrome.'),
      mcq('For a native Android app, which tool stack drives the user interface in an automated test?', [
        ['Appium with the UiAutomator2 driver, or Espresso', true],
        ['Playwright with a Pixel 7 device descriptor', false],
        ['Selenium WebDriver with Chrome mobile emulation', false],
        ['requests and pytest against the app\'s screens', false],
      ], 'Native screens are not web pages, so browser tools cannot see them; Appium (via UiAutomator2 on Android) or Espresso can. requests tests the API behind the app, not its screens.'),
      ck('WEB_ACCESSIBILITY', 'Which SafarBus finding fails WCAG 1.1.1 Non-text Content?', [
        ['The logo img has no alt attribute at all', true],
        ['Grey note text at 2.32:1 against white', false],
        ['Festive offers reachable by mouse only', false],
        ['The Menu button is 21 pixels in height', false],
      ], 'An image with no text alternative fails 1.1.1. Low contrast is 1.4.3, mouse-only is 2.1.1, and a small target is 2.5.8.'),
      ck('WEB_ACCESSIBILITY', 'Why did a home-made label check flag the SafarBus "To" field when the accessibility tree named it "To"?', [
        ['The name came from a placeholder, not a real label', true],
        ['The accessibility tree ignored the field\'s label', false],
        ['The field had an aria-label in a foreign language', false],
        ['The label was hidden with display: none in CSS', false],
      ], 'Chrome falls back to the placeholder for the accessible name, so a role locator found it, but there was no label element or aria attribute. Nothing was ignored or hidden, and there was no aria-label.'),
      ck('WEB_ACCESSIBILITY', 'Which manual check finds problems that axe and the home-made checks could not?', [
        ['Completing a booking with NVDA or TalkBack', true],
        ['Counting images that lack an alt attribute', false],
        ['Computing the contrast ratio of the notes', false],
        ['Listing inputs with no associated label', false],
      ], 'A screen-reader task tests whether names, order and announcements make sense. The other three are mechanical checks that automation already did on SafarBus.'),
      mcq('Which SafarBus response header check belongs in an automated security smoke test?', [
        ['X-Content-Type-Options equals nosniff on every page', true],
        ['Server reports the exact Werkzeug and Python version', false],
        ['Strict-Transport-Security on the local http server', false],
        ['Content-Length matches the size of the page body', false],
      ], 'nosniff is a cheap, always-applicable defence to assert. The Server version should be hidden rather than asserted, HSTS only applies over HTTPS so it belongs to the HTTPS environment, and Content-Length is not a security control.'),
      mcq('SafarBus\'s buggy error page was the Werkzeug debugger. Which assertion caught it without depending on the exact error?', [
        ['No "Traceback", file path or debugger title in the body', true],
        ['The status code of the error page is exactly 500, never 200', false],
        ['The page title equals "Something went wrong"', false],
        ['The response arrives within five hundred ms', false],
      ], 'Searching for the tells of a leak catches any leaking error page. Both builds answered 500, a fixed title would break on wording changes and still miss a leak elsewhere, and timing says nothing about content.'),
      mcq('A tester wants to run ZAP against SafarBus in CI. Which setup is appropriate?', [
        ['Baseline scan on the QA environment, gated on its exit code with a rules file', true],
        ['Full active scan on production after each deploy, to test the real configuration', false],
        ['Baseline scan on the payment provider\'s sandbox, since it handles money', false],
        ['Full active scan on a teammate\'s laptop server, since it is not production', false],
      ], 'A passive baseline on the authorised QA environment, with known exceptions in a rules file, is the CI pattern. Active scans need written permission and a non-production target; the provider\'s systems are not SafarBus\'s to scan, and a teammate\'s machine is not an agreed target.'),
      mcq('The cross-browser plan lists Chrome, Edge and Samsung Internet. What would most improve it?', [
        ['Adding Firefox and WebKit, since all three listed use Chromium', true],
        ['Adding Opera, since it has a different extension system', false],
        ['Adding more Chrome versions, since engines differ by release', false],
        ['Adding Brave, since it blocks some trackers by default', false],
      ], 'Coverage comes from engines: Gecko and WebKit are missing entirely. Opera and Brave are also Chromium, and extra Chrome versions add little compared with a second engine.'),
      mcq('A visual test compares a 1280 x 800 baseline with a run at device_scale_factor 2. What happens and why?', [
        ['It reports a size mismatch, since the image is 2560 x 1600', true],
        ['It passes, since the page content itself has not changed', false],
        ['It reports a small diff, mostly from font anti-aliasing at edges', false],
        ['It crashes, since Pillow cannot open high-DPI images', false],
      ], 'The pixel ratio doubles the image dimensions, so the comparison fails on size before any pixels are compared, which is why baselines are kept per configuration. Pillow handles large images fine.'),
    ],
  },
];
