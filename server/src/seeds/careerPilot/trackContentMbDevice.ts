/**
 * Career-track content: Device Features (MB_DEVICE_APIS), Mobile, batch MB2.
 *
 * The phone's own hardware and the operating system's rules around it: runtime permissions (asking at the moment of
 * need, "denied" versus "can't ask again", Android versus iOS), the camera, image picker, resizing and uploading
 * photos and the document picker, foreground and background location with react-native-maps, push and local
 * notifications with expo-notifications and FCM, and AppState, background tasks and what the OS will kill. It builds
 * on the Year 2 lessons "Asking for the Camera, Politely" and "When the System Takes Over", the Year 3 lessons "What
 * Is Draining the Battery" and "Testing on Something Real", and this track's "Offline-First: Queues, Sync and
 * Conflicts" and "Deep Links and Universal Links", which are referred to by title rather than re-taught.
 *
 * KiranaNow, the fictional Bengaluru quick-commerce app from React Native and Expo, runs through the lessons, with
 * its delivery-rider app for background location. Every module name, option and enum value was checked against the
 * installed packages (Expo SDK 58: expo-camera, expo-image-picker, expo-image-manipulator, expo-document-picker,
 * expo-file-system, expo-location, expo-notifications, expo-task-manager, expo-background-task, react-native-maps).
 * The logic around them (the permission gate, image resize decisions, the location throttle, notification routing on
 * tap, AppState handlers, the background task body, push-ticket clean-up) was run as jest-expo tests with mocked
 * native modules, the code was type-checked with TypeScript 6 in strict mode, and the permission lists and Info.plist
 * strings come from a real `npx expo config --type introspect` run; all quoted output is real. Not run: nothing here
 * ran on an Android phone, an iPhone, an emulator or a simulator, so system dialogs, real GPS fixes, push delivery
 * through FCM and APNs, and when the OS actually runs a background task are described from the Expo, Android and
 * Apple documentation and labelled as such.
 *
 * Skills: REACT_NATIVE (the topic's only skill).
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_MB_DEVICE_APIS_BUNDLES: PilotBundle[] = [
  /* ── PERMISSIONS ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_DEVICE_APIS_PERMISSIONS',
    notes: `KiranaNow wants three new features: riders scan a QR code on the parcel to confirm delivery, customers attach a
photo of a damaged item to a refund request, and the home screen shows the nearest store. Each one needs something
the operating system guards: the camera, photos, location. You met the principle in Year 2's "Asking for the Camera,
Politely": ask in context, explain why, behave when refused. This lesson is the React Native and Expo code for it,
and the platform rules that decide what "refused" means.

## Two layers: declare, then ask

**Declare** what the app may ever use. On Android that is a <uses-permission> line in AndroidManifest.xml; on iOS it
is a usage-description string in Info.plist that the system shows in its dialog. In an Expo app you do not edit
those files; each module's **config plugin** writes them from app.json:

    "plugins": [
      ["expo-camera", { "cameraPermission": "KiranaNow uses the camera to scan the QR code on your parcel.",
                        "microphonePermission": false, "recordAudioAndroid": false }],
      ["expo-image-picker", { "photosPermission": "KiranaNow lets you attach a photo of a damaged item to a refund request.",
                              "microphonePermission": false }],
      ["expo-location", { "locationWhenInUsePermission": "KiranaNow uses your location to find the nearest store." }]
    ]

**Ask** at runtime, when the feature is used. Declaring does not grant anything; the user decides on the phone.

Check what your config really produces. The first version of this config had only the three usage strings (no
microphonePermission lines), and a real run of npx expo config --type introspect listed these Android permissions:

    android.permission.CAMERA
    android.permission.RECORD_AUDIO
    android.permission.ACCESS_COARSE_LOCATION
    android.permission.ACCESS_FINE_LOCATION
    ...

and these Info.plist strings among others:

    NSLocationAlwaysUsageDescription = Allow $(PRODUCT_NAME) to access your location
    NSMicrophoneUsageDescription = Allow $(PRODUCT_NAME) to access your microphone

KiranaNow records no audio, yet the microphone appeared: expo-image-picker adds RECORD_AUDIO for video unless you pass
microphonePermission: false. The plugins also fill in default strings for permissions you never use. Setting
microphonePermission: false on both plugins, and locationAlwaysPermission and locationAlwaysAndWhenInUsePermission to
false, removed them; RECORD_AUDIO then came out as tools:node="remove", which stops any library adding it back.
Store reviewers and users both read this list, so keep it to what you use.

## The answers you must handle

Every Expo permission call returns the same shape:

    { status: 'granted' | 'denied' | 'undetermined', granted: boolean, canAskAgain: boolean, expires: 'never' | number }

Four situations matter, and canAskAgain is the field people forget:

| Situation | status | canAskAgain | What the app does |
|---|---|---|---|
| Never asked | undetermined | true | Explain, then ask on a tap |
| Refused, may ask again | denied | true | Explain again, ask on a tap |
| Refused for good | denied | false | Explain, offer Open settings |
| Allowed | granted | true | Use the feature |

KiranaNow reduces that to one function and tests it:

    export function gateFor(p: PermissionResponse | null): Gate {
      if (!p) return 'checking';
      if (p.granted) return 'granted';
      if (p.canAskAgain) return 'ask';
      return 'blocked';
    }

    null (still loading): checking
    undetermined, first launch: ask
    denied once on Android: ask
    denied, cannot ask again: blocked
    granted: granted

When canAskAgain is false, calling request again does nothing visible: the system will not show its dialog, and the
promise simply resolves "denied". A button that calls request in that state looks broken to the user.

## Android and iOS do not refuse the same way

From the platform documentation (not something a test can show):

- **iOS** shows its dialog once per permission. After "Don't Allow", only the Settings app can change it, so
  canAskAgain is false straight away. Your usage string is in that one dialog, so make it specific. Requesting a
  protected resource with no usage string in Info.plist crashes the app.
- **Android** (6 and later) asks at runtime; from Android 11 a second refusal of the same permission means the
  dialog stops appearing. Android also offers **"Only this time"** for camera, microphone and location, so a
  permission you had yesterday may be gone today: check every time, never cache "granted" in storage.
- **Location** has a precise/approximate choice on Android 12+ and iOS; the Expo response carries it in
  android.accuracy ('fine' or 'coarse') and ios.accuracy ('full' or 'reduced').
- **Photos**: launching the system photo picker with expo-image-picker needs no library permission on current
  Android, and iOS can give "limited" access to selected photos. Do not ask for the whole gallery to pick one photo.
- **Notifications** became a runtime permission on Android 13 (POST_NOTIFICATIONS), as they always were on iOS.

## Asking at the moment of need

Never ask on the splash screen. Ask when the user taps "Scan parcel", after one line that says what you need and
why, and always give a way forward without it (type the code, choose the area by hand). KiranaNow's screen:

    const [permission, requestPermission, getPermission] = useCameraPermissions();
    const gate = gateFor(permission);
    ...
    {gate === 'ask'
      ? <Button title="Allow camera" onPress={() => { requestPermission(); }} />
      : <Button title="Open settings" onPress={() => { Linking.openSettings(); }} />}
    <Button title="Type the code instead" onPress={onTypeInstead} />

Two details. The hook returns [response, request, get]: request may show the dialog, get only reads. And when the
user comes back from Settings, read the permission again; the screen listens for AppState 'active' and calls
getPermission(), never requestPermission(). (Android kills the app's process when a user revokes a permission in
Settings, so the app may also be restarting cold.)

These behaviours were tested with jest-expo and a mocked expo-camera: Allow is pressed before request is called,
a blocked user sees Open settings and request is never called, Type the code instead always works, returning to the
foreground calls get once, and the AppState subscription is removed on unmount. All ten tests passed.

## Ask for less

Each permission costs trust and adds a line to the store listing. Prefer the system UI that needs none: the photo
picker, the share sheet, the document picker. Ask for approximate location if you only need the city. Ask for
background location only if a feature truly runs with the screen off, which the Location lesson takes apart.`,
    workedExample: `**Scenario.** Support tickets say "Scan button does nothing" from Android users. The code:

    const [permission, requestPermission] = useCameraPermissions();
    const onScan = async () => {
      if (!permission?.granted) {
        await requestPermission();
        return;
      }
      router.push('/scan');
    };

**Step 1: reproduce the states, not the phone.** Feed the four permission shapes into the logic. For undetermined
and denied-with-canAskAgain the dialog appears. For { status: 'denied', canAskAgain: false } requestPermission()
resolves "denied" at once with no dialog, and onScan returns. Nothing on screen changes: that is the ticket.

**Step 2: why only some users?** On Android 11+ a second refusal sets canAskAgain to false; on iOS the first one
does. Users who tapped "Deny" twice, perhaps by accident, are stuck forever.

**Step 3: fix the state handling, not the button.**

    const onScan = async () => {
      const gate = gateFor(permission);
      if (gate === 'granted') return router.push('/scan');
      if (gate === 'blocked') return setShowSettingsSheet(true);   // explain + Linking.openSettings()
      const answer = await requestPermission();
      if (answer.granted) router.push('/scan');
      else if (!answer.canAskAgain) setShowSettingsSheet(true);
    };

The sheet says: "Camera access is off for KiranaNow. You can turn it on in Settings, or type the parcel code
instead." Both buttons work.

**Step 4: keep a test per state.** A table-driven test over the four shapes takes seconds and catches the next
person who "simplifies" onScan. Then check on one real Android phone and one iPhone, because the dialogs and the
Settings round trip are only visible there.`,
    mcqs: [
      mcq('KiranaNow\'s camera permission comes back { status: \'denied\', canAskAgain: false }. What should the scan screen offer?', [
        ['An explanation, an Open settings button and a way to type the code', true],
        ['An Allow button that calls requestPermission() again when tapped', false],
        ['Nothing, since the user said no and the app should hide the feature', false],
        ['A loop that requests again on every screen focus until it is granted', false],
      ], 'With canAskAgain false the system will not show its dialog again, so a request silently resolves "denied"; only Settings can change it, and a manual fallback keeps the feature usable. Calling request again looks broken, hiding the feature leaves the user stuck, and looping is both useless and hostile.'),
      mcq('After npx expo config --type introspect, KiranaNow sees android.permission.RECORD_AUDIO although the app never records sound. What is the right fix?', [
        ['Set microphonePermission: false on the plugin that added it, then check again', true],
        ['Ignore it, because Android never shows a dialog for permissions that are unused', false],
        ['Delete the line from the generated AndroidManifest.xml file after a prebuild', false],
        ['Call requestMicrophonePermissionsAsync once so the permission is resolved', false],
      ], 'expo-image-picker adds RECORD_AUDIO unless microphonePermission is false, and setting it writes tools:node="remove" so nothing re-adds it. Unused permissions still appear in the store listing, editing generated files is lost at the next prebuild, and requesting it makes things worse.'),
      mcq('A user denies location, opens Settings from KiranaNow, allows it, and switches back. What should the app call when it becomes active?', [
        ['The get function from the permission hook, to read the new state', true],
        ['The request function, so the system dialog confirms the new choice', false],
        ['Linking.openSettings() again, to make sure the change has been saved', false],
        ['Nothing; the hook\'s value updates itself while the app is in Settings', false],
      ], 'Reading the permission on return reflects whatever the user changed, without a prompt. Requesting is for asking, not reading, opening Settings again is pointless, and the hook does not refresh on its own while the app is in the background, which is why the screen listens for AppState "active".'),
    ],
    checkpoint: [
      mcq('An iPhone user taps "Don\'t Allow" on KiranaNow\'s first camera prompt. What does the next requestCameraPermissionsAsync() call do?', [
        ['Resolves denied with canAskAgain false and shows no dialog', true],
        ['Shows the system dialog once more, as Android does at first', false],
        ['Throws an error that the app must catch and show to the user', false],
        ['Opens the Settings app directly at KiranaNow\'s permission page', false],
      ], 'iOS shows its permission dialog once; after a refusal only Settings can change it, so the call resolves without a prompt. Android allows a second ask on recent versions, the call does not throw, and opening Settings is something the app must do itself with Linking.openSettings().'),
      mcq('Where should a grocery app ask for location to show the nearest store?', [
        ['When the user taps "Use my location", after a line that says why', true],
        ['On the splash screen, so every later screen already has the answer', false],
        ['During sign-up, together with the camera and notification prompts', false],
        ['In the background after install, so the prompt never interrupts', false],
      ], 'Asking at the moment of need, with a reason, is when users understand and agree. A splash-screen or sign-up prompt has no context and gets refused, and a permission dialog cannot be shown silently in the background at all.'),
      mcq('Why should an app never store "camera: granted" in AsyncStorage and trust it on the next launch?', [
        ['The user can revoke it, or grant it only once, between launches', true],
        ['AsyncStorage is wiped each time the app moves to the background', false],
        ['Permission results are secrets and must go in SecureStore instead', false],
        ['Expo throws if a permission is read more than once per app session', false],
      ], 'Permissions change outside the app: Settings, "Only this time" grants and auto-reset of unused apps. Checking each time is cheap. AsyncStorage survives backgrounding, a permission status is not a secret, and reading it repeatedly is fine.'),
    ],
  },

  /* ── CAMERA_MEDIA ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_DEVICE_APIS_CAMERA_MEDIA',
    notes: `KiranaNow needs three ways to get a file off the phone: a rider photographs the parcel at the door (proof of
delivery), a customer picks a photo of a crushed egg tray for a refund, and a pharmacy order needs a prescription
PDF. Three Expo modules cover them, and the hard part is not the capture: it is sending a sensible file over a
weak 4G connection.

## Which tool for which job

| Need | Module | Permission |
|---|---|---|
| Pick a photo the user already has | expo-image-picker, launchImageLibraryAsync | None for the system picker on current Android; iOS may give limited access |
| Take one photo with the system camera UI | expo-image-picker, launchCameraAsync | Camera |
| A camera inside your screen (scanner, custom overlay) | expo-camera, CameraView | Camera |
| A PDF or any file | expo-document-picker, getDocumentAsync | None (system file picker) |

Most apps need only the picker. Reach for CameraView when the camera is part of the screen itself: scanning QR
codes, a frame guide for a document, or a rider flow that must not let the user pick an old photo.

## The image picker

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [4, 3],
    });
    if (result.canceled) return null;
    const asset = result.assets[0];   // uri, width, height, fileSize?, mimeType?, fileName?

mediaTypes takes an array of 'images', 'videos' or 'livePhotos' (the old MediaTypeOptions enum is deprecated).
canceled is spelled with one l. width and height can be 0 if the system did not report them, and fileSize and
mimeType are optional, so code that reads them must cope with undefined.

For the system camera, ask first with ImagePicker.requestCameraPermissionsAsync(), then launchCameraAsync. On a
low-memory Android phone the system may destroy your activity while the camera app is open; the photo then
arrives after a restart, and ImagePicker.getPendingResultAsync() is how you collect it. Budget phones are exactly
where this happens.

## A camera inside the screen

    const ref = useRef<CameraView>(null);
    ...
    <CameraView ref={ref} style={{ flex: 1 }} facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={({ data }) => onScanned(data)} />
    ...
    const photo = await ref.current?.takePictureAsync({ quality: 0.7 });

useCameraPermissions from the previous lesson guards it. Three habits: guard against double taps while a picture
is being saved, unmount the camera (or set its active prop to false) when the screen loses focus, because a
running preview costs battery and blocks other apps, and stop calling onScanned after the first result, because
onBarcodeScanned fires for every frame that sees the code.

## Why you resize before you upload

A 12-megapixel photo is 4000 × 3000 pixels. Decoded, at 4 bytes a pixel, that is 48 MB of memory; as a JPEG it is
typically several MB on disk. At an upload speed of 1 Mbps, 3.4 MB (27.2 megabits) takes about 27 seconds; a
1280-pixel version of the same photo is a small fraction of that. Nobody needs 4000 pixels to see a crushed egg
tray. So KiranaNow decides per photo, in a pure function that can be tested:

    export function planImage(p: Picked, maxEdge = 1280, maxBytes = 350_000): Plan {
      const isJpeg = p.mimeType === 'image/jpeg';
      if (!p.width || !p.height) return { action: 'reencode', compress: 0.7 };   // size unknown: never upscale
      const longest = Math.max(p.width, p.height);
      if (longest > maxEdge) {
        return { action: 'resize', resize: p.width >= p.height ? { width: maxEdge } : { height: maxEdge }, compress: 0.7 };
      }
      if (isJpeg && p.fileSize !== undefined && p.fileSize <= maxBytes) return { action: 'as-is' };
      return { action: 'reencode', compress: 0.7 };
    }

Real output for five inputs:

    12 MP phone photo, landscape: {"action":"resize","resize":{"width":1280},"compress":0.7}
    portrait photo: {"action":"resize","resize":{"height":1280},"compress":0.7}
    small JPEG already: {"action":"as-is"}
    small PNG screenshot: {"action":"reencode","compress":0.7}
    size unknown (0 x 0): {"action":"reencode","compress":0.7}

Resizing only the longer edge keeps the aspect ratio, and never resizing up keeps small images sharp.

## expo-image-manipulator: the current API

The old manipulateAsync(uri, actions, options) is marked deprecated in the installed package. The current API is
a context you chain and then render:

    const ctx = ImageManipulator.manipulate(p.uri);
    if (plan.action === 'resize') ctx.resize(plan.resize);
    const image = await ctx.renderAsync();
    const out = await image.saveAsync({ compress: plan.compress, format: SaveFormat.JPEG });
    // out.uri, out.width, out.height

Saving as JPEG also turns a PNG screenshot into a much smaller file. manipulate also takes { maxWidth, maxHeight }
to decode a huge image at a smaller size, which avoids out-of-memory crashes on phones with little RAM.

## Uploading, with progress

The File class in the new expo-file-system can upload a local file as multipart form data:

    const result = await new File(uri).upload(url, {
      httpMethod: 'POST', uploadType: UploadType.MULTIPART, fieldName: 'photo', mimeType: 'image/jpeg',
      headers: { Authorization: 'Bearer ' + token },
      onProgress: ({ bytesSent, totalBytes }) => onProgress(Math.round((bytesSent / totalBytes) * 100)),
    });
    if (result.status < 200 || result.status >= 300) throw new Error('Upload failed: ' + result.status);

It resolves for any HTTP status, so check status yourself. A fetch with FormData and { uri, name, type } works
too. For large files the usual production pattern is a short-lived pre-signed URL from your API, so the phone
uploads straight to object storage. Either way the server must check type and size again: the phone's checks are
for the user's convenience, not for security. Failed uploads belong in the outbox from "Offline-First".

## The document picker

    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (res.canceled) return { kind: 'cancelled' };
    const doc = res.assets[0];   // uri, name, size?, mimeType?
    if (doc.size !== undefined && doc.size > 5 * 1024 * 1024) return { kind: 'too-big', size: doc.size };

copyToCacheDirectory: true gives you a file:// copy other modules can read. Tested with a mocked picker:

    {"kind":"cancelled"}
    {"kind":"too-big","size":9000000}
    {"kind":"ok","uri":"file:///c/y.pdf","name":"rx.pdf","mimeType":"application/pdf"}

Cache copies and resized images are temporary files; delete them after a successful upload, and do not keep
prescriptions or ID photos on the phone longer than the task needs.`,
    workedExample: `**Scenario.** Riders in Mysuru complain that proof-of-delivery photos "take forever" and that
the app sometimes closes after taking the photo. The rider flow uses launchCameraAsync({ quality: 1 }) and uploads
the result straight away.

**Step 1: what is being sent?** quality: 1 means the least compression. A 4000 × 3000 photo at full quality is
several MB; over a 1 Mbps uplink every 3.4 MB is about 27 seconds, and a dropped connection restarts the upload.

**Step 2: why does the app close?** On a budget phone the system camera app is in front and Android can destroy
KiranaNow's activity to free memory. The photo is taken, but the screen that asked for it is gone. The Expo
documentation's answer is ImagePicker.getPendingResultAsync() on start-up, to collect a result that arrived while
the activity was being recreated.

**Step 3: the fix.**

- Capture at quality 0.8, then run planImage and the manipulator: resize the longer edge to 1280, save as JPEG at
  0.7. The tested plan for a 4000 × 3000 photo is {"action":"resize","resize":{"width":1280},"compress":0.7}.
- On start-up, call getPendingResultAsync(); if there is a result, continue the delivery-proof flow with it.
- Put the photo in the outbox with the order id and upload with progress; the delivery is marked "proof pending"
  rather than blocking the rider at the door.
- Delete the local file after the server confirms.

**Step 4: measure on the device.** Time the upload on a real mid-range phone on mobile data before and after, and
read the uploaded file's size on the server. Do not guess the improvement: report the numbers you measured.`,
    mcqs: [
      mcq('A customer picks a 4000 × 3000 photo for a refund claim. Using KiranaNow\'s planImage with a 1280-pixel limit, what happens?', [
        ['The width is resized to 1280, keeping the aspect ratio, then saved at 0.7', true],
        ['Both sides are set to 1280, giving a square image that is easier to store', false],
        ['The photo is uploaded as it is, since the server can resize it more cheaply', false],
        ['The height is resized to 1280 and the width is cropped to match the ratio', false],
      ], 'The plan resizes only the longer edge (here the width) and lets the manipulator compute the other side, so nothing is distorted or cropped. Setting both sides squashes the image, and uploading the original sends several MB over a weak connection when the server would only shrink it anyway.'),
      mcq('Why does KiranaNow\'s planImage return "reencode" rather than "resize" when the picker reports width 0 and height 0?', [
        ['Resizing to 1280 could enlarge a small image that has unknown size', true],
        ['Width 0 means the photo is corrupt, so re-encoding repairs its data', false],
        ['The manipulator cannot resize any image that came from the picker', false],
        ['Re-encoding is always faster than resizing on every Android phone', false],
      ], 'The picker may report 0 when the system gives no dimensions; resizing to a fixed width then risks upscaling a small image, which adds bytes and blur. Zero does not mean corrupt, the manipulator resizes picker images fine, and speed is not the reason for the rule.'),
      mcq('A File.upload() call for a prescription resolves with { status: 413, body: \'...\' }. What does that mean for the code?', [
        ['It resolved because the request completed; the code must check status itself', true],
        ['The upload succeeded, because the promise resolved rather than being rejected', false],
        ['The library retries automatically until the server returns a 2xx status code', false],
        ['The status is from the phone\'s own file check and the server never saw it', false],
      ], 'The upload API resolves for any completed HTTP response, including 4xx and 5xx, and rejects only when the file cannot be read or the request fails; 413 means the server refused the size. There is no automatic retry, and the status is the server\'s.'),
    ],
    checkpoint: [
      mcq('Which module should a refund screen use for "attach a photo you already took"?', [
        ['expo-image-picker\'s launchImageLibraryAsync, with the system picker', true],
        ['expo-camera\'s CameraView, with a gallery button drawn on top of it', false],
        ['expo-document-picker with its type option set to application/octet-stream', false],
        ['expo-file-system, reading the DCIM folder and listing every photo', false],
      ], 'The system photo picker is built for this and needs no gallery permission on current Android. CameraView is for live capture, the document picker is for files in general and loses image metadata such as dimensions, and reading DCIM directly needs broad storage access the app should not ask for.'),
      mcq('A QR scan screen calls onScanned many times for one parcel and opens the confirmation screen three times. Why?', [
        ['onBarcodeScanned fires for every frame that still sees the code', true],
        ['The QR code holds three copies of its data for error correction', false],
        ['CameraView remounts three times when the permission is granted', false],
        ['barcodeTypes: [\'qr\'] makes the scanner report each code three times', false],
      ], 'The callback runs on every processed frame while the code is in view, so the handler must ignore results after the first (a ref flag, or pausing the scanner). QR error correction does not produce repeated callbacks, granting does not remount three times, and the barcode type setting only filters formats.'),
      mcq('Why does a mid-range phone crash when a 48-megapixel photo is loaded at full size for resizing?', [
        ['Decoding it at 4 bytes a pixel needs about 192 MB of memory at once', true],
        ['JPEG files above 10 MB cannot be opened by Android\'s image decoder', false],
        ['The manipulator copies the file to the cache first, which fills the disk', false],
        ['Hermes limits a single JavaScript string to the size of one photo', false],
      ], '48 million pixels times 4 bytes is about 192 MB of decoded bitmap, which can exceed what a budget phone gives one app; decoding with maxWidth or maxHeight avoids it. There is no 10 MB decoder limit, a cache copy is a disk issue rather than a memory crash, and the image data is not a JavaScript string.'),
    ],
  },

  /* ── LOCATION_MAPS ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_DEVICE_APIS_LOCATION_MAPS',
    notes: `KiranaNow uses location in three very different ways: the customer app shows the nearest store and its delivery
time, the order screen shows the rider coming, and the rider app reports the rider's position during a shift.
They need different accuracy, different permissions and a different cost in battery. Getting that difference right
is most of this lesson. You met the GPS as a battery cost in Year 3's "What Is Draining the Battery".

## Accuracy is a battery decision

expo-location's Accuracy enum, from cheapest to most expensive (the approximate radii are from the Expo docs):

| Accuracy | Roughly | Use it for |
|---|---|---|
| Lowest / Low | 3 km / 1 km | Which city or area am I in? |
| Balanced (the default) | 100 m | Nearest store, a pin on a map |
| High | 10 m | A rider's live position |
| Highest / BestForNavigation | best available | Turn-by-turn navigation only |

Higher accuracy keeps the GPS radio on; lower accuracy can use Wi-Fi and cell towers. The phone's battery decides
whether users keep your app.

## Three ways to read the location

    // 1. Cheap: a recent cached fix, or a low-accuracy one
    const cached = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60_000, requiredAccuracy: 2_000 });
    const pos = cached ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));

    // 2. One fresh fix
    const here = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

    // 3. Updates while a screen is open
    const sub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 10_000, distanceInterval: 25 },
      loc => setMe(loc.coords),
    );
    // ...later, in the effect's clean-up:
    sub.remove();

With mocked expo-location, the first form used the cached fix and did not call getCurrentPositionAsync; with no
cached fix it fell back to { accuracy: 2 } (Low). Every fix carries coords.accuracy in metres: a fix that says
"accurate to 350 m" should not move a rider's pin. watchPositionAsync returns a subscription, and forgetting
remove() leaves the GPS running after the screen has gone.

## Do not send every fix

The rider app reports positions to the server, but every network call wakes the radio too. KiranaNow's throttle
sends a fix only if it is accurate enough, and either the rider moved 50 m after at least 15 s, or two minutes
passed (a heartbeat so the server knows the rider is alive):

    export function shouldSend(last: Fix | null, next: Fix, t = RIDER) {
      if (next.accuracy === null || next.accuracy > t.worstAccuracy) return 'skip-inaccurate';
      if (!last) return 'send';
      const elapsed = next.at - last.at;
      if (elapsed >= t.heartbeatMs) return 'send';
      if (elapsed < t.minMs) return 'skip-too-soon';
      return distanceMetres(last, next) >= t.minMetres ? 'send' : 'skip-not-moved';
    }

A simulated ride through Koramangala (real test output):

    t=0s -> send
    t=5s -> skip-too-soon
    t=20s -> skip-not-moved
    t=30s -> send
    t=40s -> skip-inaccurate
    t=60s -> skip-not-moved
    t=160s -> send

Three requests instead of seven. distanceMetres is the haversine formula; for scale, it gives 5,118 m from
Koramangala to Indiranagar and 44 m for 0.0004 degrees of latitude.

## Foreground versus background

**Foreground** ("while using the app") is enough for nearly everything: the customer app, a map screen, the order
tracker. **Background** ("always") is for a feature that must work with the screen off, like a rider on shift. It
costs a lot:

- A second permission: requestBackgroundPermissionsAsync after the foreground one. On recent Android the user grants
  it on a Settings page, not in a dialog; on iOS the "Always" option has its own rules. Both platforms remind users
  that the app is using location in the background.
- Configuration: in the expo-location plugin, isAndroidBackgroundLocationEnabled and isAndroidForegroundServiceEnabled
  on Android and isIosBackgroundLocationEnabled on iOS.
- On Android, a **foreground service** with a notification that stays while tracking:

    TaskManager.defineTask(RIDER_TASK, async ({ data, error }) => { /* throttle, then send */ });
    await Location.startLocationUpdatesAsync(RIDER_TASK, {
      accuracy: Location.Accuracy.High, distanceInterval: 50, timeInterval: 15_000,
      pausesUpdatesAutomatically: true,
      foregroundService: { notificationTitle: 'On shift', notificationBody: 'Sharing your location with KiranaNow until you end the shift.' },
    });
    // when the shift ends:
    await Location.stopLocationUpdatesAsync(RIDER_TASK);

- Store review: both stores ask apps that use background location to justify it, and Google Play has a separate
  declaration for it. Read the current policy pages when you ship; the rules change.

The customer app has no reason for background location. The rider app has one, during a shift, with a visible
notification and an "End shift" button that stops it.

## Geofencing, in outline

A geofence is a circle the OS watches for you: Location.startGeofencingAsync(taskName, [{ identifier, latitude,
longitude, radius, notifyOnEnter, notifyOnExit }]), with a task that receives GeofencingEventType.Enter or Exit.
The OS watches cheaply, but it is not instant or exact (expect delays and use radii of a hundred metres or more), it
needs background location, and each platform caps how many regions one app can register. KiranaNow uses one for
"rider arrived at the store"; it would be wrong for "customer walked past a store, send an offer".

## Showing a map

react-native-maps gives MapView and Marker:

    <MapView
      style={{ flex: 1 }}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      initialRegion={{ latitude: me.lat, longitude: me.lng, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
      showsUserLocation
    >
      {stores.map(s => (
        <Marker key={s.id} coordinate={{ latitude: s.lat, longitude: s.lng }} title={s.name} tracksViewChanges={false} />
      ))}
    </MapView>

On Android it uses Google Maps and needs an API key; the package's config plugin takes it as
["react-native-maps", { "androidGoogleMapsApiKey": "..." }] and writes the com.google.android.geo.API_KEY
meta-data (seen in the introspected manifest). Restrict the key to your app's package name and signing certificate
in the Google Cloud console, since it ships inside the app. iOS uses Apple Maps by default. Hundreds of custom
markers are slow: tracksViewChanges={false} stops markers re-rendering every frame, and clustering or fetching only
the visible region helps more.

## Privacy

A location trail is personal data under India's DPDP Act. Collect it with clear consent, for a stated purpose, only
while that purpose is active (an order in progress, a shift), keep it no longer than needed, and never sell or reuse
it for something else. Show the user when it is on, and make "off" easy.`,
    workedExample: `**Scenario.** KiranaNow's customer app is in the "battery usage" list of many users' phones, and
reviews mention heat. The order-tracking screen has this:

    useEffect(() => {
      Location.watchPositionAsync({ accuracy: Location.Accuracy.Highest, timeInterval: 1000 }, loc => {
        api.post('/me/location', loc.coords);
      });
    }, []);

**Step 1: what does the screen need?** It shows the rider coming to the customer. The customer's own position is
needed once, to centre the map; it is the rider's position that moves, and that arrives from the server.

**Step 2: list the costs.** Highest accuracy keeps the GPS on; a one-second interval means a callback and an HTTP
request every second; there is no clean-up, so the watch keeps running after the user leaves the screen, until
the app is killed. Sending the customer's position every second is also data the company has no reason to hold.

**Step 3: rewrite to the need.**

    useEffect(() => {
      let cancelled = false;
      roughLocation().then(p => { if (!cancelled && p) centreMap(p); });   // cached or Low, once
      return () => { cancelled = true; };
    }, []);

The rider's pin comes from the order's live data (polling or a socket while the screen is open, paused when the app
goes to the background). The rider app, not the customer app, runs the throttled background updates.

**Step 4: check.** A jest test confirms roughLocation uses a cached fix and does not call getCurrentPositionAsync.
On a real phone, compare the system battery screen after the same 20-minute order with the old and new builds;
report what you measured, not what you expect.`,
    mcqs: [
      mcq('KiranaNow\'s home screen only needs to know which city the user is in. Which call fits best?', [
        ['getLastKnownPositionAsync with a maxAge, falling back to Accuracy.Low', true],
        ['watchPositionAsync with Accuracy.High and a one-second timeInterval', false],
        ['getCurrentPositionAsync with Accuracy.BestForNavigation for safety', false],
        ['startLocationUpdatesAsync, so the city stays current in the background', false],
      ], 'A recent cached fix or a low-accuracy one answers "which city" without waking the GPS. A high-accuracy watch and navigation accuracy burn battery for precision nobody needs, and background updates need a background permission the feature has no right to.'),
      mcq('In the rider throttle test, the fix at t=40s was skipped as "skip-inaccurate". What did that fix report?', [
        ['An accuracy radius of 350 m, above the 100 m worst accuracy allowed', true],
        ['A position less than 50 m away from the last fix that had been sent earlier', false],
        ['A timestamp less than 15 seconds after the last fix that was sent', false],
        ['A latitude outside India, which the throttle rejects automatically', false],
      ], 'The throttle checks coords.accuracy first; 350 m is worse than the 100 m limit, so the fix is dropped whatever the distance or time. Too little movement gives "skip-not-moved", too soon gives "skip-too-soon", and the throttle does not check country.'),
      mcq('A rider app tracks location with the screen off during a shift. What does Android require for that?', [
        ['Background location permission and a foreground service with a notification', true],
        ['Only the foreground permission, as long as the shift was started on the screen', false],
        ['A geofence around the city, so the OS reports positions inside it', false],
        ['A background task registered with expo-background-task every 15 minutes', false],
      ], 'Continuous background tracking needs the background permission and, on Android, a foreground service whose notification tells the rider tracking is on. Foreground permission stops when the app leaves the screen, a geofence reports only enter and exit, and periodic background tasks run far too rarely for live tracking.'),
    ],
    checkpoint: [
      mcq('A food app\'s map screen leaves the GPS running after the user navigates away. What was most likely missed?', [
        ['Calling remove() on the watchPositionAsync subscription in clean-up', true],
        ['Setting showsUserLocation to false on the MapView in the screen', false],
        ['Using Accuracy.Balanced instead of the default accuracy setting', false],
        ['Asking for the background location permission before starting the watch', false],
      ], 'watchPositionAsync returns a subscription that keeps delivering until removed, so the effect must remove it when the screen unmounts. showsUserLocation only draws the blue dot, Balanced is already the default, and asking for background permission would let it run even longer.'),
      mcq('Why should the customer app of a grocery service not ask for background location?', [
        ['No customer feature needs location while the app is not on screen', true],
        ['Background location is unavailable to apps built with Expo modules', false],
        ['The permission only exists on iPhones, not on Android phones at all', false],
        ['It would make the map screen less accurate when it is on screen', false],
      ], 'Permissions should match features; the customer only needs location while using the app, and asking for "always" costs trust and store review. Expo supports background location through expo-location and TaskManager, Android has it too, and it does not change foreground accuracy.'),
      mcq('An Android build shows a grey map with no tiles, while iOS shows Apple Maps fine. What should be checked first?', [
        ['The Google Maps API key in the react-native-maps plugin and its restrictions', true],
        ['The location permission, since maps cannot draw any tiles until it has been granted', false],
        ['Whether initialRegion was set, because without it no tiles can be loaded', false],
        ['The marker count, since more than ten markers stop tiles from appearing', false],
      ], 'Android uses Google Maps, which needs a valid key written into the manifest and allowed for the app\'s package and signing certificate; a missing or wrongly restricted key gives an empty map. Tiles do not need location permission, a missing initialRegion shows a default region, and markers do not block tiles.'),
    ],
  },

  /* ── NOTIFICATIONS ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_DEVICE_APIS_NOTIFICATIONS',
    notes: `"Your order is out for delivery" is the most useful message KiranaNow sends; "50% off on chips!!" at 11 pm is the
fastest way to get the app's notifications turned off, or the app uninstalled. This lesson covers both kinds of
notification, the path a push takes from your server to the lock screen, what to do when the user taps, and the
manners that keep the permission.

## Local and push

- A **local** notification is scheduled by the app on the phone: "Your slot starts in 30 minutes", a reorder
  reminder. No server and no network needed.
- A **push** notification is sent by your server, through the platform's push service, to a device token:
  order status, support replies, offers.

## The path of a push

    your API  ->  Expo push service  ->  FCM (Android) / APNs (iOS)  ->  the phone

Or skip Expo's service and call FCM and APNs yourself with the device's native token
(getDevicePushTokenAsync). The Expo service accepts one format for both platforms, which is why many teams start
with it. What you must set up, from the Expo documentation (none of it can run in a test):

- **Android:** a Firebase project, its google-services.json in the project and android.googleServicesFile in
  app.json, and the FCM V1 service-account key uploaded to your EAS credentials so Expo can send through FCM.
- **iOS:** an APNs key in your Apple developer account, which EAS can create and manage.
- **A development build.** The installed expo-notifications prints: "Push notifications (remote notifications)
  are unavailable in Expo Go on Android since SDK 53. Local notifications remain available."
- **A real device.** Emulators and simulators are not reliable for push tokens; the code checks Device.isDevice.

## Registering a device

    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
    });

    export async function registerForPush(): Promise<string | null> {
      if (!Device.isDevice) return null;
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('orders', { name: 'Order updates', importance: Notifications.AndroidImportance.HIGH });
      }
      let { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
      if (status !== 'granted') return null;
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      return token.data;   // "ExponentPushToken[...]"
    }

setNotificationHandler decides how a notification is presented when it arrives while the app is open. In the
installed version, until a handler is set (or if it does not answer within 3 seconds) the notification is shown
with a banner, a sound and the badge; older SDKs showed nothing, so answers online disagree. KiranaNow sets one to
keep the banner but drop the sound while the user is already in the app. The channel is created before asking, as the Expo docs advise for Android 13+, where notifications
need the POST_NOTIFICATIONS permission. Call registerForPush after the first order, not on first launch: "Get
updates about this order?" is a question people say yes to.

## Tokens on the server

Store each token with the user id, platform and app version, in a table where one user can have several devices.
Tokens change (reinstall, restore to a new phone), so listen with addPushTokenListener and re-send; delete the
token on logout, or the next person to log in on that phone gets the previous user's order updates.

Sending is a POST to Expo's push endpoint with up to 100 messages a request. It returns a **ticket** per message;
some minutes later you ask for **receipts**, and a receipt with details.error === 'DeviceNotRegistered' means the
app was uninstalled: delete that token. KiranaNow's server helpers, tested:

    chunks: 100/100/50
    remove: [ 'ExponentPushToken[bbb]' ]

Only the DeviceNotRegistered token was removed; a MessageRateExceeded receipt means "slow down", not "delete".

## Android channels

Every Android notification belongs to a channel, and the user can mute, silence or allow each channel separately
in system settings. KiranaNow creates "orders" (HIGH importance) and "offers" (LOW), so a user can silence offers
and keep order updates. Once a channel exists the app cannot raise its importance; the user owns it from then on.
Choose channels and their importance before the first release. A local reminder names its channel in the trigger:

    Notifications.scheduleNotificationAsync({
      content: { title: 'Running low on milk?', body: 'Reorder in two taps.', data: { type: 'offer' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, channelId: 'offers' },
    });

    {"type":"timeInterval","seconds":3600,"channelId":"offers"}

## Handling a tap

A tap must open the right screen in two situations: the app is running (or in the background), and the app was
**not running** and the tap launched it. The listener covers the first; for the second you read the response that
launched the app:

    export function useNotificationTaps(navigate: (href: string) => void) {
      const handled = useRef(new Set<string>());
      useEffect(() => {
        const handle = (r: Notifications.NotificationResponse | null) => {
          if (!r || r.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
          const key = r.notification.request.identifier;
          if (handled.current.has(key)) return;
          handled.current.add(key);
          navigate(routeFor(r.notification.request.content.data) ?? '/');
        };
        handle(Notifications.getLastNotificationResponse());
        const sub = Notifications.addNotificationResponseReceivedListener(handle);
        return () => sub.remove();
      }, [navigate]);
    }

The identifier check stops the same tap being handled twice (once at launch, once by the listener). routeFor maps
the payload to a screen from a fixed list, as with deep links in "Deep Links and Universal Links":

    {"type":"order_update","orderId":"KN-48213"} -> /orders/KN-48213
    {"type":"order_update","orderId":"../../admin"} -> /orders
    {"type":"open_url","url":"https://evil.example"} -> null

Never navigate to a route or URL taken straight from a payload. In the test, a cold-start tap opened
/orders/KN-48213 exactly once, an action button ("snooze") did not navigate, an unknown payload went home, and the
listener was removed on unmount.

## Etiquette

- Transactional (your order, your refund, your support ticket) and marketing are different channels and
  different consents. Marketing is opt-in.
- Quiet hours and a cap. KiranaNow sends no offers between 21:00 and 09:00 IST and at most two a day; the tested
  check said 15:30 IST was fine and 21:15 IST was not.
- Nothing sensitive in the text: it shows on the lock screen. "Your OTP is..." or a medicine name on a shared
  family phone is a privacy leak.
- Every notification should be useful on its own and lead somewhere specific when tapped.`,
    workedExample: `**Scenario.** After a release, KiranaNow users who tap "Your order KN-50117 is arriving" land on the
home screen instead of the order, but only sometimes. Developers testing on their phones cannot reproduce it.

**Step 1: when does it fail?** Ask for the pattern. It works when KiranaNow is open in the background; it fails
when the app had been swiped away and the tap starts it.

**Step 2: read the code.**

    useEffect(() => {
      const sub = Notifications.addNotificationResponseReceivedListener(r =>
        navigate('/orders/' + r.notification.request.content.data.orderId));
      return () => sub.remove();
    }, []);

Only a listener. Developers keep the app running while testing, so they never take the cold-start path.

**Step 3: reproduce it in a test.** With expo-notifications mocked, getLastNotificationResponse returns a tap on
KN-50117, as it would after a cold start, and the hook above is rendered. Real output:

    navigations after a cold-start tap (listener only): 0

**Step 4: fix and prove it.** Handle the launching response too, de-duplicated by identifier, and route through
routeFor. The same test with useNotificationTaps navigates once to /orders/KN-50117 (in the test file this is the
"opens the right screen after a cold start, once" case, which passed).

**Step 5: test the real path.** On a development build on a real phone: swipe the app away, send a push from the
server, tap it. Do the same with the app in the background and in the foreground. Three states, every release.`,
    mcqs: [
      mcq('A receipt from the Expo push service says details.error is \'DeviceNotRegistered\'. What should KiranaNow\'s server do?', [
        ['Delete that token, since the app is no longer installed on that device', true],
        ['Retry the same message every minute until a later receipt finally says ok', false],
        ['Ask the user by email to open the app so the token can be refreshed', false],
        ['Switch the device to SMS for every future order update automatically', false],
      ], 'DeviceNotRegistered means the token is dead, usually because the app was uninstalled, so sending to it again is waste and can hurt your sending reputation. Retrying cannot succeed, the user may have left on purpose, and switching channels without consent is not the server\'s call.'),
      mcq('Why does KiranaNow create an "offers" channel separate from "orders" on Android?', [
        ['Users can silence offers in system settings and still get order updates', true],
        ['Android delivers at most one notification per channel in any given hour', false],
        ['Only the orders channel can be shown on the lock screen of the phone', false],
        ['Expo charges for each channel, so offers are batched into a cheaper one', false],
      ], 'Channels are the unit of user control on Android; separating them lets a user turn off marketing without losing order updates, which keeps the permission alive. There is no hourly per-channel limit, lock-screen visibility is a per-channel setting rather than an orders-only feature, and channels cost nothing.'),
      mcq('A push payload contains { type: \'open_url\', url: \'https://evil.example\' }. What does KiranaNow\'s routeFor return, and why?', [
        ['null, because only known types map to screens from a fixed list', true],
        ['The URL, opened in the in-app browser so the user can decide', false],
        ['"/orders", because every unknown type falls back to the orders', false],
        ['An error, so that the app crashes and the bad payload is reported', false],
      ], 'routeFor maps a fixed set of types to fixed routes and returns null for anything else, so the hook opens the home screen. Opening a URL from a payload lets anyone who can send a push steer users to any site, the orders fallback applies only to order updates, and crashing on bad input is never the answer.'),
    ],
    checkpoint: [
      mcq('A tester\'s push notifications work on an iPhone development build but never arrive on Android in Expo Go. Why?', [
        ['Expo Go on Android no longer supports remote push; a development build is needed', true],
        ['Android needs the app to be published on the Play Store before any push can arrive', false],
        ['FCM delivers only to phones where the app holds the camera permission as well', false],
        ['Expo Go on Android only receives pushes that are sent from the Expo website', false],
      ], 'The installed expo-notifications states that remote push is unavailable in Expo Go on Android since SDK 53, while local notifications still work; a development build with FCM configured receives them. Store publication, camera permission and the sending tool are not the issue.'),
      mcq('Why must the server delete a device\'s push token when the user logs out?', [
        ['Otherwise the next user on that phone receives the previous user\'s updates', true],
        ['Tokens expire at logout, and sending to an expired one bans the server', false],
        ['FCM refuses to deliver to a token that has been stored for over a day', false],
        ['Logging out uninstalls the app, so the token is no longer valid anyway', false],
      ], 'The token identifies the app install, not the person; if it stays linked to the old account, the next person to log in on that phone sees someone else\'s order and refund notifications. Logout does not expire or invalidate the token, FCM has no one-day rule, and logout does not uninstall the app.'),
      mcq('An order-update push plays a loud sound while the customer is already looking at that order in KiranaNow. What decides how it is presented?', [
        ['The object returned by the handler set with setNotificationHandler', true],
        ['The importance of the channel that the server named in its message', false],
        ['The payload\'s data field, which the phone reads to choose a sound', false],
        ['The user\'s permission answer, which fixes the sound for every push', false],
      ], 'For a notification received in the foreground, expo-notifications asks the app\'s handler whether to show a banner, list it, play a sound or set the badge, so the handler can silence it, or even skip it on the matching order screen. Channel importance governs the system presentation in general, the data field is for the app, and the permission answer does not choose sounds per message.'),
    ],
  },

  /* ── BACKGROUND_LIFECYCLE ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_DEVICE_APIS_BACKGROUND_LIFECYCLE',
    notes: `A phone app is not a server process that runs until you stop it. The user switches to WhatsApp to share an
OTP, takes a call, locks the phone; the OS pauses KiranaNow, and on a phone short of memory it may kill it without
warning. Year 2's "When the System Takes Over" made the point in general; this lesson is the React Native code: AppState,
what may run in the background, and what you must assume will not.

## AppState

    import { AppState } from 'react-native';
    AppState.currentState;                       // typed string | null | undefined in RN 0.88
    const sub = AppState.addEventListener('change', next => { ... });
    sub.remove();                                // in the effect's clean-up

The states are 'active' (on screen), 'background' (another app or the home screen is in front) and, on iOS only,
'inactive': the brief state while the app switcher opens, a call arrives or the notification centre is pulled
down. Android also has 'blur' and 'focus' events for when a system panel covers the app.

One small finding from type-checking: useRef<AppStateStatus>(AppState.currentState) does not compile in strict
mode, because currentState can be null or undefined:

    error TS2769: No overload matches this call.
      Argument of type 'string | null | undefined' is not assignable to parameter of type 'AppStateStatus'.

Widen the ref's type (or default the value) instead of casting the error away.

## What to do on each change

Leaving the foreground: save drafts and the current position in a flow, pause video, timers and polling, stop
foreground-only location watches, release the camera. Coming back: re-read permissions (the user may have been in
Settings), refresh data that may be stale, check the session token. The "refetch on focus" you met in "Server
Data with TanStack Query" is this same idea on a phone.

KiranaNow's hook pauses when the app leaves and refreshes only after a real absence, so pulling down the
notification centre for a second does not reload the cart:

    export function useOnForeground(onReturn: (awayMs: number) => void, onLeave: () => void, minAwayMs = 30_000) {
      const state = useRef<string | null | undefined>(AppState.currentState);
      const leftAt = useRef<number | null>(null);
      const cb = useRef({ onReturn, onLeave });
      cb.current = { onReturn, onLeave };
      useEffect(() => {
        const sub = AppState.addEventListener('change', next => {
          const prev = state.current;
          state.current = next;
          if (prev === 'active' && /inactive|background/.test(next)) {
            if (leftAt.current === null) { leftAt.current = Date.now(); cb.current.onLeave(); }
          } else if (next === 'active' && prev !== 'active' && leftAt.current !== null) {
            const away = Date.now() - leftAt.current;
            leftAt.current = null;
            if (away >= minAwayMs) cb.current.onReturn(away);
          }
        });
        return () => sub.remove();
      }, [minAwayMs]);
    }

The tested copy takes the clock as a parameter (a stable now() function in place of Date.now()) so the test can
move time. Driving it with that fake clock through inactive, active after 4 s, background, active after 3 minutes, then inactive
followed by background and back after a minute, printed:

    pause
    pause
    refresh after 180s
    pause
    refresh after 60s

Inactive then background counted as one departure, the 4-second blip did not refresh, and the subscription was
removed on unmount. The callbacks live in a ref, so the effect does not re-subscribe on every render.

## What runs when you are not on screen

From the platform documentation, in short:

- **iOS** suspends the app's JavaScript shortly after it goes to the background. Nothing of yours runs unless
  the OS wakes it for something it allows: a background task, location updates you declared, a notification.
  If the user swipes the app away, iOS does not run its background tasks until the user opens it again.
- **Android** lets a backgrounded process live longer but restricts it: Doze when the phone is idle, standby
  buckets for apps not used recently, and the process can be killed whenever memory is short.
- **Phone makers** add their own battery savers. On many popular Android brands in India, aggressive
  optimisation kills background work that stock Android would allow; tell riders how to exempt the rider app,
  and test on those phones rather than only on a Pixel or the emulator.

So: anything the user would hate to lose is saved when the app leaves the foreground, not "later". The killed
app restarts cold, and must restore the user's place from storage, as in Year 2.

## Background tasks: expo-background-task

For deferrable work, such as sending a queued outbox or refreshing a catalogue, Expo's current module is
expo-background-task (expo-background-fetch is its older predecessor). It uses WorkManager on Android and
BGTaskScheduler on iOS (both visible in the installed package's native sources):

    TaskManager.defineTask(OUTBOX_TASK, () => drainOutbox(box));      // module top level, imported at startup

    export async function registerOutboxTask() {
      const status = await BackgroundTask.getStatusAsync();
      if (status !== BackgroundTask.BackgroundTaskStatus.Available) return false;
      if (!(await TaskManager.isTaskRegisteredAsync(OUTBOX_TASK))) {
        await BackgroundTask.registerTaskAsync(OUTBOX_TASK, { minimumInterval: 60 });   // minutes
      }
      return true;
    }

The installed docs say minimumInterval is in minutes, inexact, at least 15, defaulting to 12 hours, and that on iOS
short intervals are often ignored and tasks tend to run in windows such as overnight. **You do not choose when it
runs.** defineTask must run at the top level of a module imported when the app starts, not in a component, because
the OS may start the app headless (no UI) just to run the task. In debug builds,
BackgroundTask.triggerTaskWorkerForTestingAsync() runs it on demand.

The body must be short, idempotent and safe to stop:

    export async function drainOutbox(box: Outbox, budgetMs = 20_000): Promise<BackgroundTaskResult> {
      const start = Date.now();
      try {
        for (const item of await box.pending()) {
          if (Date.now() - start > budgetMs) break;
          await box.send(item.id);
        }
        return BackgroundTask.BackgroundTaskResult.Success;
      } catch {
        return BackgroundTask.BackgroundTaskResult.Failed;
      }
    }

With four items taking 8 s each on a fake clock and a 20 s budget, the test printed sent: o1,o2,o3 result: 1 (Success). The
budget is checked before each send, so the last send can overrun it; keep the budget well below what the OS
allows. A thrown network error returned Failed. Because the outbox from "Offline-First" uses idempotency keys,
a send that the OS cut off half-way is safe to repeat.

## Choosing the right tool

| Need | Tool |
|---|---|
| Something at an exact time ("slot starts in 30 min") | A scheduled local notification |
| The server has news ("order picked up") | A push notification |
| Continuous, user-visible work (rider on shift) | Background location with a foreground service |
| Deferrable sync, "some time today" | expo-background-task |
| Work that must finish before the user leaves | Do it while active; save state on 'background' |

Most "my background task did not run" bugs are the wrong tool, not the wrong code.`,
    workedExample: `**Scenario.** KiranaNow's checkout has a 10-minute timer that holds a delivery slot. Users report
that after answering a phone call the timer shows the wrong time, and sometimes the slot is "still held" in the app
after the server has released it.

**Step 1: how is the timer written?**

    const [left, setLeft] = useState(600);
    useEffect(() => {
      const id = setInterval(() => setLeft(s => s - 1), 1000);
      return () => clearInterval(id);
    }, []);

It counts ticks, and assumes there is one every second. While the app is in the background its JavaScript is
suspended or throttled, so ticks are missed; a 4-minute call might cost the timer a few seconds instead of 240.

**Step 2: store the deadline, not the count.** The server sends heldUntil (a timestamp) with the slot. The screen
computes left = heldUntil - Date.now() on every tick, so the display is right whatever happened in between.

**Step 3: react to coming back.** Using useOnForeground, when the app returns after 30 s or more, re-fetch the
slot from the server. If it has expired, say so and offer the next slot, instead of letting the user pay for a
slot they no longer hold.

**Step 4: tell the user in time.** If they leave with 3 minutes to go, a local notification scheduled for one
minute before heldUntil ("Your 6–7 pm slot is held for one more minute") is the reliable way to reach them;
a background task would not run on time.

**Step 5: test.** A jest test with a fake clock for the countdown maths and for the return-after-180-s refresh; then
on a real phone: start checkout, take a call for two minutes, come back.`,
    mcqs: [
      mcq('In KiranaNow\'s useOnForeground test, the app went inactive and then active 4 seconds later. Why was there no refresh?', [
        ['The absence was shorter than the 30-second minimum, so only the pause fired', true],
        ['iOS never reports the inactive state to the app, so the event was ignored completely', false],
        ['The hook refreshes only after the background state, never after inactive', false],
        ['Fast Refresh in the test runner removed the listener before it could run', false],
      ], 'Leaving active (to inactive) recorded the time and called onLeave; returning after 4 s was below minAwayMs, so onReturn did not run. inactive is an iOS state that the hook handles, the hook treats inactive and background alike, and Fast Refresh plays no part in a jest run.'),
      mcq('A team registers an expo-background-task with minimumInterval: 15 and expects it to run every 15 minutes on iPhones. What should they expect instead?', [
        ['The OS chooses when it runs; short intervals are often ignored on iOS', true],
        ['It runs every 15 minutes exactly, as long as the phone is plugged in and charging', false],
        ['It runs every 15 seconds, because minimumInterval is in seconds', false],
        ['It never runs on iOS, because background tasks are Android only', false],
      ], 'minimumInterval is an inexact lower bound in minutes, and the installed docs say iOS often ignores short intervals and runs tasks in windows such as overnight. Charging may help but guarantees nothing, the unit is minutes, and iOS does run these tasks through BGTaskScheduler.'),
      mcq('Why must TaskManager.defineTask be called at the top level of a module imported at startup, not inside a component?', [
        ['The OS may start the app without UI just to run the task', true],
        ['React forbids calling any Expo function inside a component', false],
        ['Tasks defined in components run twice in production builds', false],
        ['defineTask is slow, and components would render too late', false],
      ], 'When the OS wakes the app headless, no component mounts, so a task defined in one would not exist and the run would fail. Components can call Expo functions, there is no double-run rule, and the speed of defineTask is not the reason.'),
    ],
    checkpoint: [
      mcq('An app needs to remind a user at exactly 6:30 pm that a delivery slot opens. Which tool is right?', [
        ['A local notification scheduled for 6:30 pm with a date trigger', true],
        ['expo-background-task with a minimumInterval set to 30 minutes', false],
        ['An AppState listener that checks the time when the app is active', false],
        ['A setInterval that runs while the app sits in the background', false],
      ], 'A scheduled local notification is delivered by the OS at the time you set, even if the app is not running. Background tasks run when the OS chooses, an AppState listener only helps when the user opens the app, and timers are suspended or throttled in the background.'),
      mcq('Which state appears on iOS, but not Android, when the user pulls down the notification centre over the app?', [
        ['inactive', true],
        ['background', false],
        ['unknown', false],
      ], 'iOS reports inactive for brief interruptions such as the notification centre, an incoming call or the app switcher, before (or instead of) background. background means another app or the home screen is in front, and unknown is only an initial value.'),
      mcq('A checkout countdown built with setInterval loses time after a phone call. What is the robust fix?', [
        ['Store the deadline timestamp and compute the time left from the clock', true],
        ['Use a shorter interval, so that fewer ticks are lost while away', false],
        ['Run the countdown in a background task so it keeps ticking', false],
        ['Block the app from going to the background during checkout', false],
      ], 'Counting ticks assumes JavaScript runs every second, which it does not in the background; computing from a deadline is right whatever happened. Shorter intervals lose ticks too, background tasks do not run on a timer, and no app can stop the user leaving.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_DEVICE_APIS_DEBUGGING',
    notes: `Six broken pieces of KiranaNow's device code, each with the symptom, the cause and the smallest fix. Device bugs
are hard because the symptom often appears only on some phones, some OS versions or after some sequence of user
actions. So for each one, first ask: which state is the phone in? Where a jest test reproduced the bug, its real
output is quoted; where only a device or the platform documentation can show it, that is said.

## 1. "The camera prompt keeps flashing" / "the app hangs on the scanner"

    const [permission, requestPermission] = useCameraPermissions();
    useEffect(() => { if (!permission?.granted) requestPermission(); }, [permission]);

**Cause.** Every request resolves a new response object; for a blocked user it is still "denied", the effect sees a
new permission value and requests again. A test with a fake permission hook that returns a fresh denied object on
each request (and stops after 50 so the test can end) printed:

    permission requests from one screen visit: 50

On a phone it would not stop at 50. **Fix.** Never request from an effect keyed on the response. Request on a user
tap, and branch on gateFor: 'ask' shows Allow, 'blocked' shows Open settings.

## 2. "The cart refreshes three times when I come back"

    useEffect(() => {
      AppState.addEventListener('change', s => { if (s === 'active') refreshCart(); });
    }, []);

**Cause.** The subscription is never removed, so every visit to the screen adds one more listener that outlives the
screen. A test that mounted and unmounted the screen three times, then sent one 'active', printed:

    listeners alive after 3 visits: 3 | refreshes on one return: 3

**Fix.** Keep the subscription and return () => sub.remove() from the effect. The same rule applies to
watchPositionAsync and to notification listeners.

## 3. "Small product photos look blurry after upload"

    const out = await ImageManipulator.manipulate(uri).resize({ width: 1280 }).renderAsync();

**Cause.** It always sets the width to 1280. An 800 × 600 photo is enlarged to 1280 × 960, which adds bytes and blur;
a 3000 × 4000 portrait photo comes out 1280 × 1707, taller than the 1280 limit the team meant. (Arithmetic of the
aspect ratio: 4000 × 1280 / 3000 ≈ 1707.) **Fix.** Decide with planImage: resize only when the longer edge is over the
limit, and resize that edge.

## 4. "The location prompt on iPhone says 'Allow KiranaNow to access your location'"

**Cause.** No custom string was set for the "always" keys, so the expo-location plugin wrote its defaults. A real
npx expo config --type introspect run showed:

    NSLocationAlwaysAndWhenInUseUsageDescription = Allow $(PRODUCT_NAME) to access your location
    NSLocationAlwaysUsageDescription = Allow $(PRODUCT_NAME) to access your location

The customer app never asks for "always", so these keys should not exist at all, and Apple's review expects usage
strings that say why. **Fix.** Set locationWhenInUsePermission to a specific sentence, and set
locationAlwaysPermission and locationAlwaysAndWhenInUsePermission to false; re-run introspect to check. Native
configuration changes need a new development build.

## 5. "Order updates no longer pop up on existing users' phones" (from the Android documentation)

The team changed the "orders" channel from DEFAULT to HIGH importance in setNotificationChannelAsync. New installs
get heads-up notifications; existing users do not.

**Cause.** Once a channel exists on the phone, the app cannot raise its importance; only the user can. **Fix.**
Create a new channel id (for example 'orders-high'), send order updates to it, and delete the old channel with
deleteNotificationChannelAsync. Better: decide channels and importance before the first release.

## 6. "The outbox never syncs in the background" (from the Expo documentation)

    export default function App() {
      useEffect(() => {
        TaskManager.defineTask(OUTBOX_TASK, () => drainOutbox(box));
        BackgroundTask.registerTaskAsync(OUTBOX_TASK, { minimumInterval: 60 });
      }, []);
      ...
    }

**Cause.** When the OS wakes the app headless to run the task, no component renders, so the task is not defined
at that moment and nothing runs. **Fix.** Call defineTask at the top level of a module the entry file imports;
register the task (once, after checking getStatusAsync) from wherever is convenient. Test the wiring with
triggerTaskWorkerForTestingAsync in a debug build, and test the body (drainOutbox) with jest.

## The method

1. Write down the state: permission shape, app state, OS version, cold or warm start.
2. Reproduce the logic in a test with the native module mocked; most of these bugs are in your logic.
3. Read the generated configuration (introspect) for anything declared.
4. Confirm on a real phone the parts only a phone can show, and keep the test.`,
    mcqs: [
      mcq('A scanner screen requests camera permission in a useEffect that depends on the permission object. A blocked user reports a frozen screen. What is happening?', [
        ['Each denied response is a new object, which re-runs the effect and requests again', true],
        ['The system dialog is open behind the app and waits for an answer from the user', false],
        ['useCameraPermissions throws when canAskAgain is false, which stops the screen rendering', false],
        ['The camera preview is starting without permission and blocks the main thread', false],
      ], 'The effect depends on the response object, and each request returns a new one, so it loops; for a blocked user there is never a dialog to stop it. No dialog is shown when canAskAgain is false, the hook does not throw, and the preview is not mounted without permission.'),
      mcq('A test mounts and unmounts a screen three times and then sends one AppState \'active\' event; refreshCart runs three times. What is the fix?', [
        ['Return () => sub.remove() from the effect that adds the listener', true],
        ['Move the listener into a useMemo so it is created only one time', false],
        ['Check AppState.currentState inside the handler before refreshing', false],
        ['Debounce refreshCart so calls within one second are merged', false],
      ], 'Each mount adds a listener that is never removed, so they pile up; removing the subscription in clean-up leaves exactly one while the screen is mounted. useMemo does not manage subscriptions, checking currentState does not remove the extra listeners, and debouncing hides the leak instead of fixing it.'),
      mcq('After a team changes an existing Android notification channel from DEFAULT to HIGH importance in code, existing users see no change. Why?', [
        ['After a channel is created, only the user can change its importance', true],
        ['Importance changes need the app to be reinstalled from the Play Store', false],
        ['HIGH importance works only for local notifications, not push messages', false],
        ['The change takes effect after the phone has been restarted one time', false],
      ], 'Android gives control of an existing channel to the user, so the app\'s new setting is ignored on phones where the channel already exists; the fix is a new channel id. A reinstall would happen to recreate it but is not a fix, importance applies to push as well as local, and a restart does nothing.'),
      mcq('Why does introspecting KiranaNow\'s customer app config matter when the iPhone prompt shows a generic "Allow ... to access your location" text?', [
        ['It shows the Info.plist strings the plugins wrote, including the defaults', true],
        ['It sends the config to Apple, which approves the usage strings in advance', false],
        ['It runs the app in a simulator and records the permission dialog it shows', false],
        ['It deletes keys that are unused, so the generic text goes away by itself', false],
      ], 'npx expo config --type introspect prints the native configuration the config plugins would generate, so default strings and unneeded keys are visible before a build. It does not contact Apple, run a simulator, or change the configuration.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_DEVICE_APIS_PRACTICE',
    notes: `Eight exercises. Try each before reading the answer. They use the functions from the lessons: gateFor,
planImage (1280-pixel longest edge, 350,000-byte limit for an untouched JPEG), shouldSend (RIDER: 100 m worst
accuracy, 15 s minimum, 50 m minimum move, 120 s heartbeat), routeFor and canSendMarketing.

## 1. Gate each response

(a) { status: 'undetermined', granted: false, canAskAgain: true }
(b) { status: 'denied', granted: false, canAskAgain: false }
(c) null
(d) { status: 'denied', granted: false, canAskAgain: true }

**Answer.** (a) ask, (b) blocked: show Open settings and the manual path, (c) checking, (d) ask: explain again and
let the user tap Allow. These match the test output in the Permissions lesson.

## 2. Plan these images

(a) a 2400 × 1080 PNG screenshot, 1.1 MB; (b) a 1000 × 1000 JPEG, 500 KB; (c) a 1280 × 720 JPEG, 200 KB.

**Answer.** (a) resize, { width: 1280 }, compress 0.7, saved as JPEG. (b) reencode at 0.7: it is small enough in
pixels but over the byte limit. (c) as-is: the longest edge is not over 1280, it is a JPEG, and it is under the
byte limit.

## 3. How long does it take?

At an upload speed of 1 Mbps, how long do a 2.4 MB photo and a 250 KB photo take, ignoring overheads?

**Answer.** 2.4 MB is 19.2 megabits, about 19 seconds. 250 KB is 2 megabits, about 2 seconds. On a connection that
drops, the shorter upload is also far more likely to finish at all.

## 4. Throttle a rider

The last fix sent was at t = 0. Decide for each: (a) t = 10 s, moved 80 m, accuracy 15 m; (b) t = 20 s, moved
30 m, accuracy 15 m; (c) t = 25 s, moved 90 m, accuracy 150 m; (d) t = 130 s, not moved, accuracy 20 m.

**Answer.** (a) skip-too-soon (under 15 s). (b) skip-not-moved (under 50 m). (c) skip-inaccurate: accuracy is
checked first. (d) send: the 120 s heartbeat.

## 5. Choose the location call

(a) Show "Delivering to HSR Layout" on the home screen. (b) Centre the store map on the user. (c) Show a rider's
position to the customer. (d) Track a rider on shift with the screen off.

**Answer.** (a) getLastKnownPositionAsync with a maxAge, falling back to Accuracy.Low, plus reverse geocoding.
(b) getCurrentPositionAsync with Balanced, once. (c) Not the customer's GPS at all: the rider's position from the
server while the screen is open. (d) startLocationUpdatesAsync with High accuracy, a distanceInterval, a foreground
service notification and background permission, stopped when the shift ends.

## 6. Extend routeFor

Add a 'refund_update' type with a refundId of the form RF- followed by 4 to 10 digits, going to /refunds/<id>, or
/refunds if the id is missing or malformed.

**Answer.**

    case 'refund_update':
      return typeof d.refundId === 'string' && /^RF-\\d{4,10}$/.test(d.refundId) ? '/refunds/' + d.refundId : '/refunds';

Add a test row for a valid id, a malformed one ('RF-../x') and a missing one.

## 7. Pick the tool

(a) "Your slot starts in 30 minutes." (b) "Your order was picked up." (c) Upload yesterday's failed photos some
time today. (d) Keep tracking a rider during a shift. (e) Save a half-filled address form.

**Answer.** (a) scheduled local notification; (b) push from the server; (c) expo-background-task draining the
outbox; (d) background location with a foreground service; (e) save on AppState 'background', restore on start.

## 8. Quiet hours

canSendMarketing(now, sentToday) blocks 21:00 to 09:00 IST and more than two a day. Predict, then compare with
the real test output: 03:00 UTC with 0 sent; 10:00 UTC with 0; 10:00 UTC with 2; 15:45 UTC with 1.

**Answer.** IST is UTC + 5:30. 03:00 UTC is 08:30 IST: false. 10:00 UTC is 15:30 IST: true. With 2 already sent:
false. 15:45 UTC is 21:15 IST: false. The test printed exactly these.`,
    mcqs: [
      mcq('Using planImage, what happens to a 1000 × 1000 JPEG of 500 KB?', [
        ['It is re-encoded at 0.7, because it is over the byte limit', true],
        ['It is resized to 1280 × 1280, the limit for the longest edge', false],
        ['It is uploaded as it is, because its edges are under 1280', false],
        ['It is converted to PNG, which is lossless for product images', false],
      ], 'Its longest edge is under 1280, so no resize, but 500 KB is over the 350,000-byte limit for an untouched JPEG, so it is re-encoded. planImage never enlarges an image, as-is needs the size to be under the limit too, and PNG would usually make a photo larger.'),
      mcq('A fix arrives 25 s after the last one sent, 90 m away, with an accuracy of 150 m. What does the RIDER throttle return?', [
        ['skip-inaccurate, because accuracy is checked before distance', true],
        ['send, because it is more than 50 m away and more than 15 s later', false],
        ['skip-too-soon, because 25 s is below the 120 s heartbeat', false],
      ], 'The first rule drops any fix worse than 100 m, whatever the movement, since a 150 m circle could put the rider anywhere nearby. Distance and time are only considered for accurate fixes, and the heartbeat is a reason to send, not a minimum gap.'),
      mcq('How long does a 2.4 MB photo take to upload at 1 Mbps, ignoring overheads?', [
        ['About 19 seconds, since 2.4 MB is 19.2 megabits', true],
        ['About 2.4 seconds, since 1 Mbps moves 1 MB a second', false],
        ['About 0.3 seconds, since phones compress during upload', false],
        ['About 192 seconds, since each byte needs ten bits sent', false],
      ], 'Megabits per second count bits, and a byte is 8 bits, so 2.4 MB is 19.2 megabits, about 19 seconds. Treating Mbps as megabytes is the classic mistake, phones do not re-compress uploads on the fly, and 192 s multiplies by 80, not 8.'),
      mcq('Which tool should save a half-filled address form so it survives the app being killed?', [
        ['Saving to storage when AppState changes to background', true],
        ['An expo-background-task that saves forms every hour', false],
        ['A push notification that reminds the user to finish it', false],
        ['A geofence around the address so the OS can restore it', false],
      ], 'Leaving the foreground is the last reliable moment the app runs, so that is when to save. A background task may never run before the OS kills the app, a reminder does not save anything, and a geofence has nothing to do with form state.'),
      mcq('In exercise 6, why does the refund route check refundId against /^RF-\\d{4,10}$/ before building the path?', [
        ['Payload values are untrusted, and only well-formed ids may reach a route', true],
        ['Expo Router crashes on any route that contains a hyphen inside a path segment', false],
        ['The regex makes the refund load faster by caching the server response', false],
        ['Android removes digits from notification data unless they are validated', false],
      ], 'Anyone who can get a message to the device can put anything in its data, so the app accepts only ids that look like real ones, as routeFor does for orders. Hyphens are fine in routes, a regex does not cache anything, and Android does not alter notification data.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_DEVICE_APIS_INTERVIEW_QUESTION',
    notes: `Four questions interviewers at Indian product companies and startups ask React Native candidates about device
features, with an answer that gets you to the next question and the follow-up that comes when you answer well.
Say them aloud; each should take one to two minutes.

## 1. "The user denied the camera permission. Walk me through what your app does."

**Model answer.** "I treat the permission as one of four states: not asked, denied but can ask again, denied with
canAskAgain false, and granted. I ask only when the user taps the feature, after one line saying why. If they deny
and I can still ask, I explain again and they can tap Allow. If canAskAgain is false (on iOS after the first
refusal, on Android after the second), the system dialog will not appear, so I show an Open settings button using
Linking.openSettings(), and I always give a way forward without the camera, like typing the code. When the app
becomes active again I re-read the permission, without requesting."

**Follow-up: "Why not just request on screen load?"** "There is no context, so people refuse, and with canAskAgain
false a request in an effect can loop. Asking at the moment of need gets a yes far more often."

## 2. "Design push notifications for our food delivery app, from order status change to the user tapping it."

**Model answer.** "When the order changes state, the order service publishes an event; a notification worker
looks up the user's device tokens and sends through the Expo push service, which goes to FCM or APNs, or directly
to FCM and APNs. Tokens are stored per device with platform and app version, refreshed when they change, and
deleted on logout. The worker reads receipts and deletes tokens that come back DeviceNotRegistered. On Android I
use separate channels, orders at high importance and offers at low, so users can mute offers. The payload carries
a type and an order id, not a URL; on tap the app maps that to a screen from a fixed list, handling both a running
app and a cold start, and de-duplicating."

**Follow-up: "Marketing wants to send offers at 10 pm."** "Offers are opt-in, on their own channel, with quiet
hours and a daily cap, because the cost of an annoying push is the user turning off all notifications, including
order updates."

## 3. "How would you track a delivery rider's location without killing the battery?"

**Model answer.** "Only during a shift, with consent and a visible foreground-service notification on Android.
I use startLocationUpdatesAsync with High accuracy but a distanceInterval, so the OS does not wake us for every
metre, and I throttle on the client: drop fixes with poor accuracy, send only after a real move and a minimum gap,
plus a heartbeat every couple of minutes. Fixes are batched if the network is down. Updates stop when the shift
ends. The customer app never tracks in the background; it gets the rider's position from the server while the
order screen is open."

**Follow-up: "Some riders' tracking stops after a few minutes."** "On several Android brands, battery optimisation
kills background services that stock Android allows. I would confirm on those phone models, guide riders to
exempt the app, and make the server show 'last seen' honestly when the heartbeat stops."

## 4. "What happens to your app when it goes to the background? How do you sync data periodically?"

**Model answer.** "AppState goes from active to background, through inactive on iOS. I save anything the user
would hate to lose then, and pause timers, polling and location watches. On iOS the JavaScript is suspended soon
after; on Android the process can be killed when memory is short, so I restore from storage on a cold start. For
periodic sync I use expo-background-task, which uses WorkManager and BGTaskScheduler, with a short, idempotent task
defined at module top level; but the OS decides when it runs, so anything time-critical is a local notification
or a push, and anything must-finish is done while the app is active."

**Follow-up: "Your countdown timer is wrong after a phone call."** "It is counting ticks. I store the deadline and
compute the time left from the clock, and re-check with the server when the app comes back."`,
    mcqs: [
      mcq('An interviewer asks why you would not request permissions on the splash screen. Which answer is strongest?', [
        ['Users refuse prompts without context, and a refusal can block future asks', true],
        ['The splash screen cannot call native modules until the app has loaded', false],
        ['Permissions requested before login are cleared when the user signs in', false],
        ['Splash screens run before React, so the result would be thrown away', false],
      ], 'A prompt at the moment of need, after a reason, is accepted far more often, and on iOS a single refusal (on Android a second) stops the system asking. Native modules work on a splash screen, permissions are not tied to login, and the reason is user trust, not technical timing.'),
      mcq('In a push design, why should the payload carry { type, orderId } rather than a URL to open?', [
        ['The app maps known types to screens, so a payload cannot send users anywhere', true],
        ['FCM rejects any notification whose data field contains a URL string', false],
        ['URLs make the push larger than the size APNs allows for one message', false],
      ], 'Mapping a small set of known types to fixed routes keeps control in the app, so a mistaken or malicious payload cannot steer users to arbitrary pages. FCM accepts URLs in data, and a short URL does not exceed payload limits; the reason is safety and control, not transport rules.'),
      mcq('A rider\'s tracking stops after a few minutes on some Android phones but not on a Pixel. What is the best first explanation?', [
        ['The phone maker\'s battery optimisation is killing the background service', true],
        ['The rider revoked the location permission from the notification shade', false],
        ['FCM stops delivering location after a few minutes to save phone data', false],
        ['react-native-maps unloads the map, which also ends location tracking', false],
      ], 'Several Android brands add aggressive battery management that stops background services stock Android would allow, which matches "some phones, not a Pixel". A revocation would affect every phone the rider used, FCM does not carry location, and the map is not what keeps tracking alive.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_DEVICE_APIS_CHECKPOINT',
    notes: `Ten questions across the topic: permissions, the camera and files, location and maps, notifications, and the
app lifecycle with background work. Answer without notes; the result shows which lesson to revisit.`,
    checkpoint: [
      mcq('A bus-ticket app asks for the camera to scan a ticket QR. The response is { status: \'denied\', canAskAgain: true } on Android. What next?', [
        ['Explain why again and let the user tap Allow, which may show the dialog', true],
        ['Open Settings at once, since a denied permission can never be asked', false],
        ['Remove the scan feature for this user for the rest of the session', false],
        ['Request again immediately, in a loop, until the response comes back granted', false],
      ], 'canAskAgain true means the system will still show its dialog, so a second, clearer explanation and a user-initiated request is right. Settings is for canAskAgain false, removing the feature is unnecessary, and looping requests is hostile and, when blocked, endless.'),
      mcq('An ed-tech app lets students upload a photo of handwritten homework. Photos arrive at 4 MB and uploads fail on weak networks. What helps most?', [
        ['Resize the longer edge to around 1280 px and save as JPEG at about 0.7', true],
        ['Ask for the full photo library permission so uploads are allowed', false],
        ['Use quality: 1 in the picker, so later compression has more to work with', false],
        ['Upload with base64 in a JSON body, which is smaller than a binary file', false],
      ], 'A resized, compressed JPEG is a fraction of the size and still readable, so it uploads on weak networks. Library permission has nothing to do with upload size, quality 1 makes files larger, and base64 adds about a third to the size.'),
      mcq('A pharmacy app uses getDocumentAsync({ type: \'application/pdf\', copyToCacheDirectory: true }). What should it do after the upload is confirmed?', [
        ['Delete the cached copy, since a prescription is sensitive personal data', true],
        ['Keep the copy forever, so the user can re-upload it later without picking again', false],
        ['Move the copy to the photo gallery, so the user can find it later', false],
        ['Nothing; the OS deletes cache files the moment the upload finishes', false],
      ], 'The cache copy is a temporary file holding health data, so it should go as soon as the task is done. Keeping it or copying it to the gallery spreads personal data, and the OS clears caches only when it decides to, not when your upload ends.'),
      mcq('A bike-taxi customer app needs the pickup point only when the user books a ride. Which permission fits?', [
        ['Foreground location, asked when the user taps "Use current location"', true],
        ['Background location, so that the pickup point is already known before they book', false],
        ['Background location plus a geofence around the user\'s home address', false],
        ['No permission; the app can read the cell tower directly instead', false],
      ], 'The need exists only while booking, on screen, so foreground location asked in context is enough. Background location and geofences track users when they are not using the app, which this feature has no reason to do, and apps cannot read location from cell towers without a location permission.'),
      mcq('Why does KiranaNow\'s rider throttle send a fix after 120 seconds even when the rider has not moved?', [
        ['It is a heartbeat, so the server can tell a waiting rider from a lost one', true],
        ['The GPS turns itself off unless the app sends a fix every two minutes', false],
        ['Android kills a foreground service that has not sent data recently', false],
        ['The map needs a new fix every 120 seconds or the marker disappears', false],
      ], 'Without a periodic send, a rider waiting at a restaurant and a rider whose phone died look the same to the server. The GPS does not depend on network sends, Android does not kill a foreground service for not sending, and markers stay where they are.'),
      mcq('A user taps an order notification while the app is not running, and the app opens on the home screen. Which call was most likely missing?', [
        ['getLastNotificationResponse(), read once when the app starts', true],
        ['setNotificationHandler(), which decides how taps are routed', false],
        ['getExpoPushTokenAsync(), which links the tap to the user', false],
        ['setNotificationChannelAsync(), which stores the tap target', false],
      ], 'A tap that launches the app happens before the listener exists, so the app must read the launching response at start-up (or use the hook built on it). The handler controls foreground presentation, the token is for sending, and channels do not store tap targets.'),
      mcq('A quick-commerce app sends 250 order updates through the Expo push service. How should the server batch them?', [
        ['Three requests of at most 100 messages each, then check the receipts', true],
        ['One request of 250 messages, since the push service splits it up by itself', false],
        ['250 separate requests, so that one bad token cannot fail the others', false],
        ['Ten requests of 25, which is the most each platform will accept', false],
      ], 'The Expo push API takes up to 100 messages a request, so 250 become 100, 100 and 50, and receipts are checked later for dead tokens. Sending 250 in one request exceeds the limit, one request per message is needlessly slow, and 25 is not a limit.'),
      mcq('Which notification should be sent on a separate, low-importance Android channel?', [
        ['A weekend discount on snacks for a grocery app\'s users', true],
        ['A one-time code that is needed to complete the login', false],
        ['The rider is arriving at the door with the order now', false],
        ['The refund for a cancelled order has been processed', false],
      ], 'Promotional messages belong on their own low-importance channel so users can silence them without losing the important ones. A login code, a rider arriving and a refund confirmation are transactional and time-sensitive or important to the user.'),
      mcq('A ride-booking app shows the fare countdown wrong after the user switches apps for two minutes. What is the cause?', [
        ['The timer counts ticks, and JavaScript does not tick in the background', true],
        ['AppState reports the wrong state on return, which corrupts the stored timer value', false],
        ['Hermes stops the clock, so Date.now() returns the time it left', false],
        ['The OS rewinds the app to its state when it was last opened', false],
      ], 'A setInterval countdown assumes a tick every second, but timers are suspended or throttled in the background, so ticks are lost; computing from a stored deadline fixes it. AppState is accurate, Date.now() reads the real clock, and the OS does not rewind app state.'),
      mcq('An app registers an expo-background-task to upload logs, but defines the task inside the root component. When does it fail?', [
        ['When the OS wakes the app headless, since no component renders then', true],
        ['Only on Android 15, which bans tasks defined in React components', false],
        ['Only in development builds, because production builds hoist it', false],
        ['Never; defineTask works the same wherever in the app it is called', false],
      ], 'Background runs can start the app without UI, so a task defined during rendering does not exist at that moment. That is the reason the docs say to define it at module top level. There is no Android-15-specific ban, production builds do not move code, and the location of the call does matter.'),
    ],
  },
];
