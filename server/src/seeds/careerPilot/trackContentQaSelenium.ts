/**
 * Career-track content: Selenium with Java (QA_SELENIUM_JAVA), QA / SDET, batch QA2.
 *
 * The Java browser-automation stack many Indian employers still ask for by name: enough Java to read and write a
 * framework (students on this track come from Python and have not taken the Java track's Core Java lessons), Selenium
 * WebDriver, explicit waits and stale elements, TestNG with page objects and data providers, and Selenium Grid with an
 * honest comparison against Playwright. It builds on the track's Playwright topic ("Locators That Do Not Break",
 * "Auto-Waiting and Web-First Assertions", "Page Objects and Test Structure") and on the pytest framework topic; those
 * are referred to by title, not re-taught.
 *
 * One fictional company runs through the topic: KiranaKart, a Pune online grocery start-up getting ready for its
 * "Big Bachat Sale", whose regression suite is Selenium, Java, TestNG and Maven. Verification: every plain-Java
 * example (classes, collections, exceptions, the javac errors, the ThreadLocal and data-provider demos) was compiled
 * and run with JDK 19 and its output is quoted as printed. Selenium for Java, TestNG, Maven and Selenium Grid were NOT
 * available, so that code is written from their documentation and was not compiled against the libraries. The
 * browser behaviour the lessons describe (missing, hidden and covered elements, stale references, implicit and
 * explicit waits, frames, windows and alerts) was run as the same scenarios with Selenium 4.51 for Python against a
 * small local KiranaKart page in Chrome, and the Playwright comparison with Playwright 1.64; those outputs are real
 * and are presented as "the same behaviour in Python, which we ran".
 *
 * Skills: UI_TEST_AUTOMATION by default; the Java lesson is AUTOMATED_TESTING, and checkpoint questions elsewhere that
 * are plainly about Java or the framework build use ck('AUTOMATED_TESTING', ...).
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_QA_SELENIUM_JAVA_BUNDLES: PilotBundle[] = [
  /* ── JAVA_FOR_TESTERS ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_SELENIUM_JAVA_JAVA_FOR_TESTERS',
    notes: `Open a QA job post from a Bengaluru service company or a bank's GCC and you will often read "Selenium with Java,
TestNG, Maven". KiranaKart, a Pune grocery start-up, has 600 regression tests in exactly that stack. You already write
Python and pytest; this lesson gives you the Java you need to read that framework on day one and add tests to it. It is
not a Java course: no streams tutorial, no generics theory, just what a Selenium framework is built from.

## Python to Java in one table

- Every value has a declared type: \`int count = 0;\`, \`String name = "Asha";\`, \`boolean inStock = true;\`.
- Statements end with \`;\`, blocks use \`{ }\`, and indentation means nothing to the compiler.
- All code lives inside a class. A program starts at \`public static void main(String[] args)\`.
- There is a compile step: \`javac\` turns .java files into .class bytecode, then \`java\` runs it. Many mistakes a
  Python test finds at run time, javac refuses before anything runs.
- \`null\` plays the part of None, and calling a method on it is the most common crash you will see.

## Classes and objects

A test framework is mostly small classes: a product, a user, a page. Here is the product KiranaKart's search returns:

    public class Product {
        private final String name;
        private final int pricePaise;
        private final boolean inStock;

        public Product(String name, int pricePaise, boolean inStock) {
            this.name = name;
            this.pricePaise = pricePaise;
            this.inStock = inStock;
        }
        public String getName() { return name; }
        public int getPricePaise() { return pricePaise; }
        public boolean isInStock() { return inStock; }

        public static int parsePricePaise(String shown) {      // "₹1,299" -> 129900
            String digits = shown.replace("₹", "").replace(",", "").trim();
            return Integer.parseInt(digits) * 100;
        }
    }

The constructor has the class's name and no return type; \`this.name\` is the field, \`name\` the parameter. Fields are
\`private\` and read through getters, which is the convention every Java codebase follows. \`static\` means the method
belongs to the class, not to one object, so you call \`Product.parsePricePaise("₹149")\` without creating a product.
\`final\` means the field cannot be reassigned after the constructor.

## Strings: equals, never ==

    String actual = new StringBuilder("Order ").append("placed").toString();   // like getText()
    actual == expected          -> false
    actual.equals(expected)     -> true
    "  Order placed\\n".equals(expected) -> false, after trim -> true

That is real output from JDK 19. \`==\` asks whether two references are the same object; text that came from the browser
never is. Every assertion on text uses \`equals\` (TestNG's assertEquals calls it for you). Trim text you read from a
page, and use \`contains\` for partial matches.

## Collections

    List<Product> results = new ArrayList<>();
    Map<String, Integer> cart = new LinkedHashMap<>();
    Set<String> seen = new HashSet<>(List.of("Toor Dal 1kg", "Toor Dal 1kg", "Sunflower Oil 1L"));

The type in angle brackets is what the collection holds: Selenium's \`findElements\` returns a \`List<WebElement>\`.
\`ArrayList\` keeps order, \`LinkedHashMap\` keeps insertion order (a plain \`HashMap\` does not), and a \`Set\` drops
duplicates (\`seen.size()\` printed 2). Loop with for-each: \`for (Product p : results) { ... }\`. One trap:
\`List.of(...)\` is immutable, and calling \`add\` on it throws \`UnsupportedOperationException\` at run time.

## Exceptions: checked and unchecked

Java has two kinds. **Unchecked** ones (\`NullPointerException\`, \`NumberFormatException\`, and every Selenium
exception such as \`NoSuchElementException\` and \`TimeoutException\`) can happen anywhere and need no declaration.
**Checked** ones (\`IOException\` and its children) must be caught or declared with \`throws\`, or javac refuses:

    ConfigReader.java:7: error: unreported exception FileNotFoundException; must be caught or declared to be thrown

Reading a config file the right way, with try-with-resources so the file is closed even on failure:

    static Properties load(String path) throws IOException {
        Properties props = new Properties();
        try (InputStream in = new FileInputStream(path)) {
            props.load(in);
        }
        return props;
    }

Run against a config.properties with baseUrl and explicitWaitSeconds, it printed
\`baseUrl=http://localhost:8765/shop.html, browser=chrome, timeout=10\` (the browser came from the default in
\`getProperty("browser", "chrome")\`). \`Integer.parseInt("₹149")\` printed \`caught: For input string: "₹149"\`, and a
\`finally\` block ran either way. Do not wrap Selenium calls in try/catch that swallows the exception: a test that
catches \`NoSuchElementException\` and carries on has stopped testing.

Since Java 14 a NullPointerException names the culprit:

    java.lang.NullPointerException: Cannot invoke "String.length()" because "coupon" is null

(Compile with \`-g\` for local variable names; Maven does this by default.)

## Interfaces and inheritance

\`WebDriver driver = new ChromeDriver();\` declares the variable as the **interface** \`WebDriver\` and creates a
**class** that implements it, so the same test can later get a \`FirefoxDriver\` or a \`RemoteWebDriver\`. Frameworks put
shared code in a base class: \`public class LoginPage extends BasePage\`, and \`super(driver)\` calls the parent's
constructor. A cast such as \`((JavascriptExecutor) driver)\` tells the compiler the object also implements another
interface.

## Maven and the project layout

    kiranakart-tests/
      pom.xml                     dependencies and plugins
      src/main/java/              pages, utilities (some teams keep pages in src/test/java)
      src/test/java/              test classes
      src/test/resources/         config.properties, testng.xml, test data
      target/                     compiled classes and reports (never commit it)

\`pom.xml\` lists dependencies (selenium-java, testng) with versions you take from Maven Central; Maven downloads them.
\`mvn test\` compiles and runs the suite through the Surefire plugin, \`mvn -Dtest=LoginTest test\` runs one class.
Compared with Python: pom.xml is requirements.txt plus pytest.ini, and \`mvn test\` is \`pytest\`.`,
    workedExample: `**Scenario.** A KiranaKart test must check that the cart total for 3 x Toor Dal and 1 x Sunflower Oil is Rs 586, using
the prices shown on the search page as text ("₹149", "₹599", "₹139"). Write it in plain Java first, without a browser,
so the logic is proved before Selenium is involved.

**Step 1: model the rows.** Each search row becomes a Product built with \`Product.parsePricePaise\`, so money is held as
integer paise, never as a double that can drift.

**Step 2: hold the cart in an ordered map and merge repeat adds.**

    Map<String, Integer> cart = new LinkedHashMap<>();
    cart.put("Toor Dal 1kg", 2);
    cart.merge("Toor Dal 1kg", 1, Integer::sum);      // a third packet
    cart.put("Sunflower Oil 1L", 1);

**Step 3: total it.**

    int total = 0;
    for (Map.Entry<String, Integer> e : cart.entrySet())
        for (Product p : results)
            if (p.getName().equals(e.getKey())) total += p.getPricePaise() * e.getValue();

**Step 4: compile and run.** \`javac -d out Product.java CartDemo.java\` then \`java -cp out CartDemo\` printed:

    results: 3
    in stock: [Toor Dal 1kg, Sunflower Oil 1L]
    cart: {Toor Dal 1kg=3, Sunflower Oil 1L=1}
    rice in cart? 0
    unique names: 2
    total paise: 58600 = Rs 586

**What to notice.** Names are compared with \`equals\`; with \`==\` the total would silently stay 0 once the names came
from \`getText()\`. \`getOrDefault\` answered 0 for rice instead of returning null. In the real test the list is built
from \`driver.findElements(By.cssSelector(".item"))\`, and this same loop runs unchanged.`,
    mcqs: [
      mcq('A KiranaKart test compares getText() of the order banner with "Order placed" using == and fails although the screen shows exactly that text. Why?', [
        ['== compares object references, and the text from the page is a different String object', true],
        ['getText() adds a hidden newline at the end of every value that it reads from the browser', false],
        ['Java compares strings by their hash codes, which differ between the page and the test', false],
        ['== on strings only works when both are declared final static constants in the same class', false],
      ], '== asks whether two references point at the same object; text built at run time never is, as the demo printed "== : false" and "equals : true". getText() does not always add a newline, hash codes are not what == compares, and final static is not what makes == work.'),
      mcq('javac reports "unreported exception FileNotFoundException; must be caught or declared to be thrown" for a config reader. What is the right fix?', [
        ['Declare throws IOException on the method, or catch it, and read with try-with-resources', true],
        ['Change FileInputStream to a FileReader, which does not throw any checked exceptions', false],
        ['Add @SuppressWarnings("unchecked") on the method so that javac skips the exception check', false],
        ['Wrap the call in a catch block for RuntimeException so the compiler accepts it', false],
      ], 'FileNotFoundException is checked, so it must be declared or caught; try-with-resources also closes the file. FileReader throws the same checked exception, @SuppressWarnings does not affect exception checking, and catching RuntimeException does not cover a checked IOException.'),
      mcq('A helper builds expected product names with List.of("Toor Dal 1kg") and later calls add() on it. What happens?', [
        ['UnsupportedOperationException at run time, because List.of returns an immutable list', true],
        ['A compile error, because List.of returns an array type rather than a List', false],
        ['The item is added, but the list stops keeping the order it was created in', false],
      ], 'List.of creates an unmodifiable list; javac accepts add() because the List interface has it, and the run fails with UnsupportedOperationException, exactly as the CartTotal demo did. It is a List, not an array, and nothing is added.'),
    ],
    checkpoint: [
      mcq('Which declaration lets the same KiranaKart test later run on Firefox or a remote grid without changing its type?', [
        ['WebDriver driver = new ChromeDriver();', true],
        ['ChromeDriver driver = new ChromeDriver();', false],
        ['Object driver = new ChromeDriver();', false],
        ['var driver = (ChromeDriver) null;', false],
      ], 'Declaring the interface type WebDriver lets any implementation, such as FirefoxDriver or RemoteWebDriver, be assigned later. A ChromeDriver variable only accepts Chrome, Object hides every WebDriver method, and a null cast creates no browser at all.'),
      mcq('A test prints: NullPointerException: Cannot invoke "String.length()" because "coupon" is null. What does that tell you?', [
        ['The variable coupon held null when its length() method was called', true],
        ['The String class could not be loaded because the classpath was wrong', false],
        ['The coupon text on the page was empty, so length() returned zero', false],
        ['The method length() is missing because the JDK version is too old', false],
      ], 'Helpful NullPointerException messages name the call and the null variable, so the bug is where coupon was (not) assigned. A classpath problem gives NoClassDefFoundError, an empty string has length 0 without any exception, and String.length() exists in every JDK.'),
      mcq('In a Maven project, where do KiranaKart\'s test classes and config.properties belong?', [
        ['Tests in src/test/java, config in src/test/resources', true],
        ['Tests in src/main/java, config in the target folder', false],
        ['Tests in the project root, config in src/main/java', false],
        ['Tests in target/test-classes, config in the pom.xml', false],
      ], 'Maven compiles and runs tests from src/test/java and puts src/test/resources on the test classpath. target is generated output that mvn clean deletes, the root is not a source folder, and pom.xml holds build settings, not test configuration.'),
    ],
  },

  /* ── WEBDRIVER ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_SELENIUM_JAVA_WEBDRIVER',
    notes: `You automated a browser with Playwright earlier in the track. Selenium does the same job through a different
design, and that design explains most of its behaviour, good and bad.

## How a Selenium command travels

Your Java code calls the Selenium client library. The library sends each command as an HTTP request in the **W3C
WebDriver** protocol (a web standard) to a **driver** process: chromedriver for Chrome, geckodriver for Firefox,
msedgedriver for Edge, safaridriver for Safari. The driver controls the real browser and sends back a JSON answer.
Every \`findElement\` and \`click\` is a round trip. Since Selenium 4.6, **Selenium Manager** finds or downloads the right
driver automatically, so \`new ChromeDriver()\` just works; old tutorials that call
\`System.setProperty("webdriver.chrome.driver", ...)\` or add WebDriverManager are solving a problem you no longer have.

## A first test in Java

    ChromeOptions options = new ChromeOptions();
    options.addArguments("--headless=new");
    WebDriver driver = new ChromeDriver(options);
    try {
        driver.get("http://localhost:8765/shop.html");
        driver.findElement(By.id("email")).sendKeys("asha@example.test");
        driver.findElement(By.id("password")).sendKeys("secret");
        driver.findElement(By.id("signin")).click();
        System.out.println(driver.getTitle());          // KiranaKart - Big Bachat Sale
    } finally {
        driver.quit();
    }

\`quit()\` ends the session and closes every window; \`close()\` closes only the current window. A suite that forgets
\`quit()\` leaves chrome and chromedriver processes behind until the CI machine runs out of memory.

## Locators

\`By.id\`, \`By.name\`, \`By.cssSelector\`, \`By.xpath\`, \`By.linkText\`, \`By.partialLinkText\`, \`By.className\` and
\`By.tagName\`. The ranking from "Locators That Do Not Break" still holds: a stable id, name or \`data-testid\` first, then a
short CSS selector, then XPath when you must match on text or walk to an ancestor. Two XPath patterns worth knowing:

    By.xpath("//button[normalize-space()='Add']")
    By.xpath("//li[.//span[text()='Toor Dal 1kg']]//button[@class='add']")   // the Add button in the dal row

Never copy an absolute XPath (\`/html/body/div[2]/ul/li[1]/button\`) from DevTools; one new banner breaks it. Selenium has
no role or label locators like Playwright's, which is one reason Selenium suites need more care with locators.

\`findElement\` returns one \`WebElement\` or throws \`NoSuchElementException\`. \`findElements\` returns a
\`List<WebElement>\`, empty when nothing matches, and never throws: use it to assert that something is absent.

## Working with elements

\`click()\`, \`sendKeys(...)\`, \`clear()\`, \`getText()\`, \`getAttribute("value")\` (or \`getDomProperty\` and
\`getDomAttribute\` in Selenium 4), \`isDisplayed()\`, \`isEnabled()\`, \`isSelected()\`. For a native \`<select>\` use
\`new Select(element).selectByVisibleText("Pune")\`.

\`getText()\` returns only text a user can see. On the KiranaKart page, which we drove with Selenium for Python (the
same WebDriver calls), a hidden toast printed:

    hidden toast .text: '' | textContent: 'Added to cart'

So "the text is empty" can mean "the element is hidden", not "the app wrote nothing".

## Actions: hover, drag, keys

The Log out link sits in a menu shown on hover. Clicking it directly failed, then a hover worked:

    logout displayed before hover: False | text: ''
    ElementNotInteractableException: element not interactable
    status: Logged out

In Java: \`new Actions(driver).moveToElement(account).click(logout).perform();\`. Actions also give \`doubleClick\`,
\`contextClick\`, \`dragAndDrop(source, target)\` and \`keyDown(Keys.SHIFT)\`. Nothing happens until \`perform()\`.

## Frames, windows and alerts

The driver works in one **browsing context** at a time. KiranaKart's UPI widget is in an iframe:

    NoSuchElementException: no such element: Unable to locate element: {"method":"css selector","selector":"[id="vpa"]"}
    in frame: Payment successful for asha@okbank
    still in frame -> NoSuchElementException: ... "selector":"[id="cancel"]"
    back: Checkout

In Java: \`driver.switchTo().frame("upi")\` (name or id, index, or a WebElement), then
\`driver.switchTo().defaultContent()\` to return to the page (\`parentFrame()\` goes up one level). Note that Selenium
turned \`By.id\` into a CSS selector on the wire.

A link with \`target="_blank"\` opens a new tab, but the driver stays where it was:

    handles: 2 | title before switch: Checkout - KiranaKart
    title after switch: Return Policy - KiranaKart

Save \`driver.getWindowHandle()\` first, loop over \`driver.getWindowHandles()\` to find the new one, \`switchTo().window(h)\`,
and switch back after \`close()\`.

A JavaScript \`confirm()\` blocks the page. Ignoring it broke the next command:

    UnexpectedAlertPresentException: unexpected alert open: {Alert text : Cancel this order?}

Handle it with \`Alert alert = driver.switchTo().alert();\` then \`getText()\`, \`accept()\` or \`dismiss()\`: dismiss
printed "Order kept" and accept "Order cancelled".

## Two escape hatches

\`((JavascriptExecutor) driver).executeScript("arguments[0].scrollIntoView(true);", el)\` runs JavaScript in the page;
use it to scroll or read state, not to click things a user could not click, or the test proves nothing.
\`((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE)\` captures the screen for a failure report.`,
    workedExample: `**Scenario.** Automate KiranaKart checkout: pay inside the UPI iframe, check the return-policy tab opens, then cancel
the order and accept the confirmation. Written in Java from the Selenium documentation (not compiled here, as the
Selenium jars were not available); the same steps in Python ran green against the local page.

    driver.get(baseUrl + "checkout.html");
    String main = driver.getWindowHandle();

    driver.switchTo().frame("upi");
    driver.findElement(By.id("vpa")).sendKeys("asha@okbank");
    driver.findElement(By.id("pay")).click();
    String msg = driver.findElement(By.id("msg")).getText();
    driver.switchTo().defaultContent();
    if (!msg.equals("Payment successful for asha@okbank")) throw new AssertionError(msg);

    driver.findElement(By.id("policy")).click();
    new WebDriverWait(driver, Duration.ofSeconds(5)).until(ExpectedConditions.numberOfWindowsToBe(2));
    for (String h : driver.getWindowHandles()) {
        if (!h.equals(main)) driver.switchTo().window(h);
    }
    String policyTitle = driver.getTitle();          // Return Policy - KiranaKart
    driver.close();
    driver.switchTo().window(main);

    driver.findElement(By.id("cancel")).click();
    Alert alert = driver.switchTo().alert();
    String question = alert.getText();               // Cancel this order?
    alert.accept();
    String status = driver.findElement(By.id("status")).getText();   // Order cancelled

**Why each step is there.** \`defaultContent()\` comes straight after the frame work, because forgetting it gave
NoSuchElementException for #cancel in our run. The handle comparison uses \`equals\`, not \`==\`. The wait for two windows
avoids reading handles before the tab exists. After \`close()\`, the driver points at a closed window until you switch
back; any command there fails. The alert is handled before anything else touches the page.

The assertions here are bare \`throw\`s to keep the example library-free; in the TestNG lesson they become
\`Assert.assertEquals(actual, expected)\`.`,
    mcqs: [
      mcq('A test clicks a link with target="_blank" and then reads driver.getTitle(). It gets the old page\'s title. Why?', [
        ['The driver stays on the original window until you switch to the new handle', true],
        ['getTitle() always returns the first page the session ever opened with get()', false],
        ['The new tab has not loaded yet, so Selenium reports the previous title instead', false],
        ['Headless Chrome opens every new tab in a separate browser session of its own', false],
      ], 'Opening a tab does not move the driver; our run printed the checkout title after the click and the policy title only after switchTo().window. getTitle reads the current context, a slow load would not show another tab\'s title, and the new tab belongs to the same session (it appears in getWindowHandles).'),
      mcq('After paying inside the UPI iframe, the test cannot find the Cancel order button that is plainly on the page. What is missing?', [
        ['driver.switchTo().defaultContent() before looking for the button', true],
        ['A longer implicit wait so the main page has time to render again', false],
        ['driver.navigate().refresh() so that the checkout page reloads fully', false],
        ['A JavaScript click, because buttons outside frames need executeScript', false],
      ], 'Selenium searches only the current browsing context, which is still the iframe, so the button cannot be found until you return to the top document. Waiting longer searches the same frame, refreshing loses the payment state, and buttons outside frames click normally.'),
      mcq('Which locator for KiranaKart\'s Add button in the Toor Dal row is most likely to survive a redesign?', [
        ['//li[.//span[text()=\'Toor Dal 1kg\']]//button[@class=\'add\']', true],
        ["/html/body/div[2]/ul[@id='results']/li[1]/button[1]", false],
        ["(//ul[@id='results']//button[@class='add'])[1]", false],
        ["//span[@class='price']/following::button[@class='add'][1]", false],
      ], 'Anchoring on the product name and walking down to the button ties the locator to what the user sees in that row. An absolute path and a positional index break when a banner or another row is added, and the first price on the page belongs to whichever row happens to come first, not necessarily the dal.'),
    ],
    checkpoint: [
      mcq('A test must prove the "Out of stock" badge is NOT shown for Toor Dal. Which call suits that check?', [
        ['findElements(...) and assert the returned list is empty', true],
        ['findElement(...) and assert the returned element is null', false],
        ['findElement(...) inside a loop until it throws an error', false],
        ['getPageSource() and assert the word stock is not present', false],
      ], 'findElements returns an empty list when nothing matches and never throws, so it is the clean absence check. findElement never returns null (it throws NoSuchElementException), a loop is pointless, and the page source may contain "stock" in the In stock only filter.'),
      mcq('getText() on KiranaKart\'s "Added to cart" toast returns an empty string, but the HTML clearly contains the words. What is the likely reason?', [
        ['The toast is hidden, and getText() returns only text a user can see', true],
        ['The toast is inside a shadow root, which getText() cannot ever read', false],
        ['getText() reads the value attribute, and the toast div does not have one', false],
        ['The page uses UTF-8, and getText() only returns ASCII characters', false],
      ], 'WebDriver returns rendered, visible text; our run printed .text \'\' and textContent \'Added to cart\' for the hidden toast. Nothing here uses a shadow root, getText does not read the value attribute, and it returns any Unicode text.'),
      mcq('Clicking "Cancel order" opens a confirm() dialog, and the next findElement fails. How should the test continue?', [
        ['Switch to the alert, check its text, then accept() or dismiss() it', true],
        ['Press Escape with the Actions class so the dialog closes by itself', false],
        ['Call executeScript to click OK on the dialog from inside the page', false],
        ['Refresh the page so the browser discards the open dialog for you', false],
      ], 'A JavaScript dialog blocks the page and gives UnexpectedAlertPresentException until it is handled through driver.switchTo().alert(). Actions send events to the page, which the dialog blocks; page scripts cannot press the dialog\'s buttons; and refreshing loses the very behaviour you are testing.'),
    ],
  },

  /* ── SELENIUM_WAITS ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_SELENIUM_JAVA_SELENIUM_WAITS',
    notes: `Playwright waited for you ("Auto-Waiting and Web-First Assertions"). Selenium mostly does not: \`findElement\` looks
once, \`click\` clicks now. Waiting is your job, and most flaky Selenium suites in Indian service-company projects are
waiting done badly. Every output in this lesson is real, from the same scenarios run with Selenium for Python against
the local KiranaKart page: search results arrive 1.5 s after the click, a coupon button appears after 2 s, the cart
count updates 0.8 s after Add, and a "Loading..." overlay covers the page for 1.2 s after sign-in.

## No wait at all

    NoSuchElementException: no such element: Unable to locate element: {"method":"css selector","selector":".item .name"}

The test looked before the results existed. \`Thread.sleep(3000)\` "fixes" it (3 items after 3.1 s), but it waits 3 s
even when results take 0.4 s, and fails on the sale day when they take 3.5 s. A suite of 600 tests with two sleeps
each spends an hour asleep.

## Implicit wait

    driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));

From then on, every \`findElement\` keeps retrying for up to 10 s until the element is **present in the DOM**. It found
the first result after 1.7 s. But presence is not readiness:

- **findElements waits too.** Looking for an element that should be absent took the full timeout:
  \`find_elements for a missing element returned [] after 10.0s\`. Every "is it gone?" check costs 10 s.
- **It hides time in the driver.** The coupon button is in the DOM from the start but hidden. With implicit wait 0 a
  click failed at once with \`ElementNotInteractableException\`; with implicit wait 10, chromedriver quietly waited for
  it to become interactable and the click succeeded after 2.8 s. The test passes, but nobody reading it can see
  what it waits for, or for how long.
- It cannot wait for text to change, an overlay to go, or a count to update.

## Explicit wait

Wait for one specific condition, at one specific place:

    WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    WebElement first = wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector(".item .name")));

\`until\` polls (every 500 ms by default, ignoring NoSuchElementException between polls) and returns as soon as the
condition holds: "visible Toor Dal 1kg after 1.8s". If time runs out it throws \`TimeoutException\`. The conditions you
will use most, from \`ExpectedConditions\`:

- \`visibilityOfElementLocated(by)\`: present and displayed; returns the element.
- \`elementToBeClickable(by)\`: visible and enabled ("clickable after 2.4s" for the coupon).
- \`invisibilityOfElementLocated(by)\`: hidden or gone, for spinners and overlays.
- \`textToBePresentInElementLocated(by, text)\`: the cart badge read "0" right after Add; waiting for "1" took 1.1 s.
- \`presenceOfElementLocated\`, \`stalenessOf(element)\`, \`urlContains\`, \`titleIs\`, \`numberOfWindowsToBe(n)\`,
  \`alertIsPresent()\` and \`frameToBeAvailableAndSwitchToIt(...)\`.

Anything else is a lambda, because \`until\` accepts any function of the driver:

    wait.until(d -> !d.findElement(By.id("cart-count")).getText().equals("0"));

\`FluentWait\` is the general form, when you need a different polling interval or more ignored exceptions:

    Wait<WebDriver> fluent = new FluentWait<>(driver)
        .withTimeout(Duration.ofSeconds(20))
        .pollingEvery(Duration.ofMillis(250))
        .ignoring(StaleElementReferenceException.class);

## The overlay

Right after sign-in, clicking Search failed:

    ElementClickInterceptedException: element click intercepted: Element <button id="go" ...> is not clickable at
    point (214, 162). Other element would receive the click: <div id="loader">...</div>

The button exists and is visible; something lies on top of it. The message names the culprit. Fix:
\`wait.until(ExpectedConditions.invisibilityOfElementLocated(By.id("loader")))\` ("loader gone after 1.2s"), then click.
Do not "fix" it with a JavaScript click: that clicks through an overlay a real user could not click through.

## Stale elements

A \`WebElement\` is a reference to one DOM node. If the page replaces that node (a filter re-renders the list, a React
component re-mounts, the page reloads), the reference is dead, even if an identical-looking node is now in its place:

    rows: 3
    StaleElementReferenceException: stale element reference: stale element not found in the current frame

The fix is to **find again** after the change, and to know when the change has happened. Wait for the old node to
die, then re-find:

    WebElement old = driver.findElement(By.cssSelector(".item"));
    driver.findElement(By.id("instock")).click();
    wait.until(ExpectedConditions.stalenessOf(old));                 // old row stale after 0.5s
    List<WebElement> rows = driver.findElements(By.cssSelector(".item .name"));   // [Toor Dal 1kg, Sunflower Oil 1L]

The design lesson: keep \`By\` locators in fields and find elements inside each method; do not keep \`WebElement\`s in
lists or fields across actions. Catching StaleElementReferenceException and retrying blindly hides real re-render
bugs, such as a list that flickers twice.

## Never mix implicit and explicit waits

The Selenium documentation warns that mixing them gives unpredictable wait times. We measured it. Waiting for the
overlay to disappear, with an explicit timeout of 5 s:

    implicit 0: loader wait returned after 1.6s
    implicit 10, explicit 5: loader wait returned after 11.3s

Once the loader was removed from the DOM, each \`findElement\` inside the condition sat out the full 10 s implicit wait
before reporting "not found". And for an element that never appears, the 5 s explicit wait threw TimeoutException
after **10.0 s**, because one implicit wait outlasted it. The rule the industry settled on: implicit wait 0 (the
default), explicit waits everywhere, written once inside page-object methods.`,
    workedExample: `**Scenario.** KiranaKart's "add dal to cart" test fails about one run in eight on Jenkins and never locally. The
current code:

    driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));
    driver.findElement(By.id("go")).click();
    Thread.sleep(2000);
    List<WebElement> rows = driver.findElements(By.cssSelector(".item"));
    rows.get(0).findElement(By.className("add")).click();
    Assert.assertEquals(driver.findElement(By.id("cart-count")).getText(), "1");

**Step 1: list what the page does asynchronously.** Results arrive after a network call (1.5 s locally, slower on a
loaded CI agent); the cart count updates 0.8 s after Add. The sleep covers the first only when CI is fast, and
nothing covers the second: our run printed "cart right after click: 0".

**Step 2: replace each guess with the condition the user is waiting for.**

    WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    driver.findElement(By.id("go")).click();
    wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector(".item .add"))).click();
    wait.until(ExpectedConditions.textToBePresentInElementLocated(By.id("cart-count"), "1"));
    Assert.assertEquals(driver.findElement(By.id("cart-count")).getText(), "1");

**Step 3: remove the implicit wait** (set it to zero, or simply never set it), so no explicit wait is stretched by it.

**Result in our Python run of the same steps:** results visible after 1.8 s, cart showed 1 after a further 1.1 s, and
the test took as long as the page needed, no more. Running it with a 3 s explicit wait against a locator that never
matches raised TimeoutException after 3.1 s: a fast, clear failure instead of a 10 s implicit wait followed by a
confusing assertion.

**What to say in the review.** "Each wait now names what the user waits for. If the cart never updates, the failure
says the text never became 1, which is the bug, rather than an assertion that 0 does not equal 1."`,
    mcqs: [
      mcq('With an implicit wait of 10 s, an explicit wait of 5 s for a spinner to disappear takes about 11 s. What causes it?', [
        ['Once the spinner leaves the DOM, each lookup inside the condition waits out the implicit 10 s', true],
        ['WebDriverWait adds its own timeout to the implicit wait before it starts the first poll', false],
        ['The spinner fades out slowly, and the visibility check waits for the animation to end', false],
        ['Chrome throttles timers in headless mode, which slows each poll to roughly two seconds', false],
      ], 'invisibilityOfElementLocated calls findElement; when the element is gone that call blocks for the full implicit wait before failing, which our run measured as 11.3 s against 1.6 s with implicit 0. WebDriverWait does not add timeouts, the overlay was removed instantly, and headless timers did not slow the implicit-0 run.'),
      mcq('After ticking "In stock only", reading text from a previously found row throws StaleElementReferenceException. What is the right fix?', [
        ['Wait for the old row to go stale, then find the rows again with the same locator', true],
        ['Catch the exception and read the text from the same WebElement a second time', false],
        ['Increase the implicit wait so Selenium can reattach the element after re-render', false],
        ['Use a JavaScript executor to read innerText from the stale element reference', false],
      ], 'The filter replaced the DOM nodes, so the old reference can never work again; stalenessOf tells you the change happened and a fresh findElements gets the new nodes. Reading the same reference fails again, implicit waits only apply to finding, and executeScript with a dead reference fails the same way.'),
      mcq('Clicking Search right after sign-in throws ElementClickInterceptedException naming <div id="loader">. What should the test do?', [
        ['Wait for the loader to become invisible, then click Search normally', true],
        ['Click Search through executeScript so the overlay is bypassed', false],
        ['Wait for Search to be present in the DOM before clicking on it', false],
        ['Scroll Search into view with Actions, then click on it again', false],
      ], 'The button is fine; the loader covers it, so waiting for invisibilityOfElementLocated on the loader is the user\'s own wait. A JavaScript click proves a user-impossible path, presence was never the problem, and scrolling leaves the overlay on top.'),
    ],
    checkpoint: [
      mcq('Which statement about Selenium\'s implicit wait is accurate?', [
        ['It makes findElement retry until an element is present, up to the timeout', true],
        ['It makes every click wait until the page has finished all network requests', false],
        ['It applies only to the next findElement call, then resets itself to zero', false],
        ['It waits for elements to be visible and enabled before returning them', false],
      ], 'The implicit wait is a session setting that makes element lookups retry for presence in the DOM. It knows nothing about network requests, it stays set until changed, and presence is weaker than visible or enabled, which is why the hidden coupon was "found" at 0.0 s.'),
      mcq('The cart badge shows "0" right after Add and changes to "1" about a second later. Which wait matches that?', [
        ['textToBePresentInElementLocated on the badge, expecting the text "1"', true],
        ['visibilityOfElementLocated on the badge, then read its text right away', false],
        ['presenceOfElementLocated on the badge, followed by a short sleep of 500 ms', false],
        ['elementToBeClickable on the Add button, so the request has time to finish', false],
      ], 'The thing changing is the badge text, so wait on the text. The badge is visible and present the whole time, so those conditions return at once with "0", a sleep is a guess, and the Add button stays clickable regardless of the cart update.'),
      mcq('Why do teams usually keep By locators, not WebElement objects, as fields in their page classes?', [
        ['A stored WebElement goes stale when the page re-renders that node', true],
        ['A By locator is cached by the driver and therefore runs much faster', false],
        ['WebElement objects cannot be declared as private fields in a class', false],
        ['Storing a WebElement keeps a browser session open after quit() runs', false],
      ], 'A WebElement points at one DOM node; after a filter, reload or re-render that reference throws StaleElementReferenceException, so finding inside each method is safer. By is not cached for speed, WebElement fields are legal Java, and they do not keep sessions alive.'),
    ],
  },

  /* ── TESTNG_POM ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_SELENIUM_JAVA_TESTNG_POM',
    notes: `TestNG is to a Java Selenium suite what pytest is to yours: it finds the tests, runs set-up and tear-down, feeds data,
groups and orders tests, and reports. The page object model you built in "Page Objects and Test Structure" carries
over unchanged in idea. This lesson puts the two together as KiranaKart's framework. TestNG and Selenium were not
available to compile here, so the Java is written from their documentation; the same framework in Python, with the
same page object and waits, ran 5 passed against the local page.

## Annotations and their order

    @BeforeSuite  -> once before everything (start a report, read config)
    @BeforeTest   -> before each <test> block in testng.xml
    @BeforeClass  -> once per test class
    @BeforeMethod -> before every @Test method (start a browser)
    @Test
    @AfterMethod  -> after every @Test (screenshot on failure, quit the browser)
    @AfterClass, @AfterTest, @AfterSuite

Compared with pytest: @BeforeMethod/@AfterMethod are a function-scoped yield fixture, @BeforeClass a class-scoped one,
@BeforeSuite a session one. Give tear-down methods \`alwaysRun = true\` so they run even when groups are filtered or an
earlier configuration method failed.

## What @Test can say

    @Test(groups = {"smoke"}, priority = 1, description = "Valid user sees the welcome banner")
    @Test(dependsOnMethods = "loginShowsWelcome")      // skipped, not failed, if login fails
    @Test(expectedExceptions = IllegalArgumentException.class)
    @Test(enabled = false)                              // parked, with a ticket number in a comment
    @Test(timeOut = 30000)

Without \`priority\`, TestNG does not run methods in the order you wrote them, so never let one test depend on the
side effects of another. \`dependsOnMethods\` is for "no point checking out if login is broken", and a dependent test
shows as SKIPPED, which keeps the report honest.

## Assertions: hard and soft

\`Assert.assertEquals(actual, expected, "message")\`: note TestNG's order is **actual first**, the opposite of JUnit; swap
them and the failure message reads backwards. A failed hard assert stops the test. \`SoftAssert\` collects failures
and reports them all at \`assertAll()\`, useful for checking every field on an order summary:

    SoftAssert soft = new SoftAssert();
    soft.assertEquals(summary.itemCount(), 3, "items");
    soft.assertEquals(summary.totalText(), "₹586", "total");
    soft.assertAll();          // forget this line and the test always passes

Create a new SoftAssert inside each test; a shared one carries failures from one test into the next.

## Data providers

    @DataProvider(name = "logins")
    public Object[][] logins() {
        return new Object[][] {
            {"asha@example.test", "Secret@123", true},
            {"asha@example.test", "wrong",      false},
            {"",                  "Secret@123", false},
        };
    }

    @Test(dataProvider = "logins")
    public void login(String email, String password, boolean shouldSucceed) { ... }

Each row becomes one test run, and its arguments appear in the report, like pytest's parametrize. The shape is plain
Java, so we compiled and ran it with a fake login: three rows, three calls. A provider in another class must be
\`static\` and is named with \`dataProviderClass\`. Rows can come from a CSV or Excel file read in the provider
(Apache POI is the usual Excel library); keep the file in src/test/resources and the reading code out of the test.

## testng.xml

    <!DOCTYPE suite SYSTEM "https://testng.org/testng-1.0.dtd">
    <suite name="KiranaKart Regression">
      <parameter name="browser" value="chrome"/>
      <test name="Smoke">
        <groups><run><include name="smoke"/></run></groups>
        <classes>
          <class name="com.kiranakart.tests.LoginTest"/>
          <class name="com.kiranakart.tests.CartTest"/>
        </classes>
      </test>
    </suite>

A \`@Parameters("browser")\` method receives the value. Maven runs this file when the Surefire plugin lists it under
\`<suiteXmlFiles>\`, and \`mvn test -Dgroups=smoke\` selects a group from the command line.

## The page objects

    public abstract class BasePage {
        protected final WebDriver driver;
        protected final WebDriverWait wait;
        protected BasePage(WebDriver driver) {
            this.driver = driver;
            this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        }
        protected WebElement visible(By by) { return wait.until(ExpectedConditions.visibilityOfElementLocated(by)); }
        protected void click(By by) { wait.until(ExpectedConditions.elementToBeClickable(by)).click(); }
    }

    public class LoginPage extends BasePage {
        private final By email = By.id("email"), password = By.id("password"), signIn = By.id("signin");
        private final By loader = By.id("loader");
        public LoginPage(WebDriver driver) { super(driver); }
        public SearchPage loginAs(String user, String pass) {
            visible(email).sendKeys(user);
            driver.findElement(password).sendKeys(pass);
            click(signIn);
            wait.until(ExpectedConditions.invisibilityOfElementLocated(loader));
            return new SearchPage(driver);
        }
    }

The rules from the Playwright lesson hold: locators and waits live in the page, assertions live in the test, and a
method that navigates returns the next page object. Store \`By\`, not \`WebElement\` (the stale-element lesson).
\`PageFactory\` with \`@FindBy\` is common in older suites; it looks elements up lazily but adds no waiting, so many
teams now prefer plain \`By\` fields and explicit waits as above.

## Base test, screenshots and reports

    public class BaseTest {
        private static final ThreadLocal<WebDriver> DRIVER = new ThreadLocal<>();
        protected WebDriver driver() { return DRIVER.get(); }

        @BeforeMethod
        public void startBrowser() { DRIVER.set(new ChromeDriver(new ChromeOptions().addArguments("--headless=new"))); }

        @AfterMethod(alwaysRun = true)
        public void stopBrowser(ITestResult result) {
            WebDriver d = DRIVER.get();
            if (d == null) return;
            if (result.getStatus() == ITestResult.FAILURE) saveScreenshot(d, result.getName());
            d.quit();
            DRIVER.remove();
        }
    }

TestNG passes the ITestResult into the @AfterMethod, so the screenshot is taken before \`quit()\`. An
\`ITestListener\` with \`onTestFailure\` is the other common place; check where your TestNG version calls it relative to
@AfterMethod, or it may find the browser already closed. Run through Maven, TestNG's own HTML and XML reports land in
\`target/surefire-reports\`; teams add Extent Reports or Allure for screenshots and history. The ThreadLocal is for
parallel runs, the next lesson.`,
    workedExample: `**Scenario.** Write KiranaKart's login tests as one data-driven TestNG test using the page objects, with a clear
failure message for each row.

    public class LoginTest extends BaseTest {

        @DataProvider(name = "logins")
        public Object[][] logins() {
            return new Object[][] {
                {"asha@example.test", "Secret@123", "Welcome, Asha"},
                {"asha@example.test", "wrong",      "Invalid email or password"},
                {"",                  "Secret@123", "Enter your email"},
            };
        }

        @Test(dataProvider = "logins", groups = {"smoke"})
        public void loginShowsTheRightMessage(String email, String password, String expected) {
            String shown = new LoginPage(driver()).open().attempt(email, password).message();
            Assert.assertEquals(shown, expected, "login message for '" + email + "'");
        }
    }

**Choices worth defending.**

- One test method, three rows: adding a case is one line, and each row is reported separately with its arguments.
- \`attempt()\` returns the same page with a \`message()\` method rather than asserting inside the page; the test owns
  the check, so the page object serves both the happy and the error paths.
- \`assertEquals(shown, expected, ...)\`: actual first, and a message that names the row, so a red report says which
  login broke without opening the log.
- No \`dependsOnMethods\`, no shared state: each row opens its own browser through BaseTest, so rows can run in
  parallel later.

**Proving the data shape without a browser.** The Object[][] and the cast-per-column pattern are plain Java; a
throwaway version that called a fake login printed:

    login(asha@example.test, Secret@123) -> PASS
    login(asha@example.test, wrong) -> PASS
    login(<blank>, Secret@123) -> PASS

**The same framework in Python, which we ran:** a ShopPage object with By tuples and explicit waits, tests for login,
search, the in-stock filter (using staleness_of before re-reading rows) and a cart count parametrised over one and
two items: 5 passed.`,
    mcqs: [
      mcq('A KiranaKart test uses SoftAssert to check five fields on the order summary. Three are wrong, yet the test passes. What is missing?', [
        ['A call to soft.assertAll() at the end of the test method', true],
        ['The alwaysRun = true attribute on the test\'s @Test annotation', false],
        ['A static SoftAssert field so that failures are shared by tests', false],
        ['The groups attribute, so that SoftAssert knows which test it is in', false],
      ], 'SoftAssert only records failures until assertAll() reports them; without it nothing fails. alwaysRun is for configuration methods, a shared static SoftAssert leaks failures between tests, and groups have nothing to do with assertions.'),
      mcq('A test is annotated @Test(dependsOnMethods = "login") and the login test fails. How does the report show it?', [
        ['As skipped, because the method it depends on did not pass', true],
        ['As failed, with the same exception that login threw', false],
        ['As passed, since its own assertions were never reached', false],
        ['As run anyway, because the dependency is just ordering', false],
      ], 'TestNG skips a test whose dependency failed, so the report shows one real failure and the skipped consequences. It does not copy the exception, never marks unrun code as passed, and dependsOnMethods is more than ordering.'),
      mcq('Where should the check "the welcome banner says Welcome, Asha" live in KiranaKart\'s framework?', [
        ['In the test, comparing a value the page object returns', true],
        ['In LoginPage.loginAs(), right after the click on Sign in', false],
        ['In BasePage, so that every page object checks the banner', false],
        ['In testng.xml, as a parameter that TestNG compares itself', false],
      ], 'Page objects find and act; tests decide what is correct, so the same page object also serves the wrong-password path. An assert inside loginAs breaks negative tests, BasePage is shared by pages without a banner, and testng.xml cannot compare page text.'),
    ],
    checkpoint: [
      mcq('In which order does TestNG run these for a single test method?', [
        ['@BeforeClass, @BeforeMethod, @Test, @AfterMethod', true],
        ['@BeforeMethod, @BeforeClass, @Test, @AfterMethod', false],
        ['@BeforeClass, @Test, @BeforeMethod, @AfterMethod', false],
        ['@BeforeMethod, @Test, @AfterClass, @AfterMethod', false],
      ], 'Class set-up runs once before any method set-up, method set-up wraps each @Test, and method tear-down follows it; class tear-down comes after all methods. Each wrong order puts a narrower scope outside a wider one or tears down before set-up.'),
      ck('AUTOMATED_TESTING', 'A failure reads "expected [Welcome, Asha] but found [Invalid email or password]" although the app showed the welcome banner. What went wrong in the test?', [
        ['The arguments to Assert.assertEquals were passed in the wrong order', true],
        ['The data provider row for this login has the wrong password in it', false],
        ['SoftAssert was used, so the messages were collected in reverse order', false],
        ['The page object returned the previous page, from before the login', false],
      ], 'TestNG\'s assertEquals takes (actual, expected); swapping them labels the expected text as found. If the app really showed the banner, the row and page object are fine, and SoftAssert does not reverse message labels.'),
      mcq('A data provider for login returns Object[][] with three rows of three values. What does TestNG do with it?', [
        ['Calls the test method three times, passing one row as its arguments each time', true],
        ['Calls the test method once, passing the whole two-dimensional array to it', false],
        ['Calls the test method nine times, once for each individual value in the rows', false],
        ['Calls the test method three times, but only when testng.xml is set to parallel', false],
      ], 'Each inner array is one invocation and its values map to the method\'s parameters in order, like pytest parametrize. The method never receives the whole array, values are not split one per call, and parallel only changes how the rows are scheduled.'),
    ],
  },

  /* ── GRID_COMPARE ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_SELENIUM_JAVA_GRID_COMPARE',
    notes: `KiranaKart's 600 regression tests take about three hours on one machine. The Big Bachat Sale goes live on Friday and
every release before it needs a full run. Two questions follow: how to run tests in parallel, and, since someone in
the team always asks, whether the answer is to move to Playwright.

## Parallel inside TestNG

    <suite name="KiranaKart Regression" parallel="methods" thread-count="4">

\`parallel\` can be \`methods\`, \`classes\`, \`tests\` or \`instances\`; \`thread-count\` is how many run at once. Data
provider rows run in parallel with \`@DataProvider(parallel = true)\` and the suite's \`data-provider-thread-count\`.

Parallel threads break any framework that keeps the driver in a plain static field: each test overwrites the one
shared driver. We showed it with a plain-Java stand-in for WebDriver (three threads, one per test):

    static WebDriver:
      login used session-search
      search used session-search
      checkout used session-search
    ThreadLocal<WebDriver>:
      login used session-login
      search used session-search
      checkout used session-checkout

All three tests drove the same browser through the static field (which one "wins" changes from run to run, which is
why such suites fail randomly only in parallel). \`ThreadLocal<WebDriver>\` gives each thread its own; call \`remove()\`
in tear-down so a pooled thread does not keep an old driver. Parallelism also needs independent tests: no shared
logins that one test logs out, no "the latest order" checks, each test creating its own data.

## Selenium Grid 4

One machine runs out of CPU and memory after a few browsers. Selenium Grid spreads sessions over many machines and
browsers. Your test asks a URL for a browser instead of starting one:

    ChromeOptions options = new ChromeOptions();
    WebDriver driver = new RemoteWebDriver(URI.create("http://grid.qa.kiranakart.internal:4444").toURL(), options);

Everything after that line is the same WebDriver code. The options say which browser (and optionally which version
and platform) you want, and the Grid finds a node that can provide it, or queues the request until one is free.

Ways to run it, from the Selenium documentation (the Selenium server is a Java jar; it was not run here):

    java -jar selenium-server-<version>.jar standalone          # everything in one process
    java -jar selenium-server-<version>.jar hub                 # on the hub machine
    java -jar selenium-server-<version>.jar node --hub http://<hub-ip>:4444    # on each node

Most teams use the official Docker images instead (selenium/standalone-chrome, or selenium/hub with
selenium/node-chrome and selenium/node-firefox), with \`--shm-size="2g"\` so Chrome does not crash for lack of shared
memory. The Grid UI at \`/ui\` shows nodes, slots and the queue. A node offers a limited number of concurrent sessions
(\`--max-sessions\`); a 4-core node with 4 Chrome slots is realistic, 20 is not.

**Cloud grids** (BrowserStack, Sauce Labs, LambdaTest and others) are a hosted Grid: the same RemoteWebDriver with
their URL and credentials, plus vendor options for real devices, Safari on macOS and video. Read credentials from
environment variables in CI; never commit them to testng.xml.

## What parallel bought, measured

We ran the Python version of the KiranaKart framework (5 browser tests, a fresh Chrome per test) serially and with
pytest-xdist on 3 workers, on a busy laptop:

    serial:      5 passed in 166.40s
    -n 3:        5 passed in 118.81s

Not 3x: three Chromes competed for the same CPU and memory, and browser start-up dominated each test. That is the
case for a Grid with separate nodes, and for keeping each test short.

## Selenium or Playwright?

We ran the stale-element and overlay scenarios from the waits lesson with Playwright against the same page:

    click on Search during loader waited 1.6s, no exception
    after filter, same locator: ['Toor Dal 1kg', 'Sunflower Oil 1L']

Playwright's click waited for the overlay to go (its actionability checks), and its locators are re-resolved on every
use, so the filter caused no stale reference. In Selenium both needed explicit code.

- **Selenium:** the W3C WebDriver standard; official bindings for Java, Python, C#, Ruby and JavaScript; drives the real
  branded browsers including Safari through safaridriver; Grid and every cloud grid; Appium for mobile speaks the same
  protocol; a very large existing base of suites, people and job posts. You build waiting, reporting and tracing
  yourself.
- **Playwright:** auto-waiting, web-first assertions, a trace viewer, network mocking and isolated browser contexts
  built in; languages TypeScript/JavaScript, Python, Java and .NET; drives Chromium, Firefox and a WebKit build (not
  Safari itself) plus installed Chrome and Edge; parallel workers in its own test runner.

**How to choose.** Keep a large, working Selenium suite and fix its waits; a rewrite costs months and finds no new
bugs. Pick Playwright for a new web project where the team can use its language. Pick Selenium where real Safari or a
specific browser version matters, where the company's Grid or device cloud is already paid for, or where the team is
Java-first and needs Appium alongside. In Indian interviews, expect both: know why Selenium flakes, and how
Playwright avoids it.`,
    workedExample: `**Scenario.** KiranaKart's lead asks you to cut the three-hour regression to under 45 minutes before the sale.

**Step 1: make the suite safe to parallelise, locally.** Replace the static driver with \`ThreadLocal<WebDriver>\` in
BaseTest (the plain-Java demo above shows exactly the bug you are removing). Search the code for shared state:
a static logged-in user, a static SoftAssert, tests that read "the latest order". Run with
\`parallel="methods" thread-count="2"\` until it is green three times in a row.

**Step 2: estimate.** 600 tests at about 18 s each is 3 hours serial. With no shared bottleneck, 3 hours / 45 minutes
needs at least 4 parallel sessions; plan for 6 to absorb slow tests and retries of genuinely unstable ones.

**Step 3: provide the browsers.** Six Chrome sessions do not fit on one CI agent. Start a Grid with Docker: a hub and
two Chrome nodes with three sessions each, \`--shm-size="2g"\` on each node. Point BaseTest at it:

    String gridUrl = System.getenv("GRID_URL");      // set in CI, absent on a laptop
    WebDriver d = (gridUrl == null)
        ? new ChromeDriver(options)
        : new RemoteWebDriver(URI.create(gridUrl).toURL(), options);

\`toURL()\` throws the checked MalformedURLException, so the method declares it (the Java lesson's rule).

**Step 4: set thread-count to match the Grid's slots** (6). More threads than slots only queue on the Grid and hit
session timeouts.

**Step 5: measure, then decide what is left.** Expect less than a 6x gain: data set-up through the UI, a shared test
environment and the slowest class all limit it, as our 3-worker run showed (166 s down to 119 s, not 55 s). The next
gains come from creating data through the API instead of the UI and splitting the longest classes.

**What not to propose.** Rewriting in Playwright before Friday. Propose it, if at all, for the new seller portal, with
the reasons from this lesson.`,
    mcqs: [
      mcq('KiranaKart switches testng.xml to parallel="methods" and tests start typing into each other\'s browsers. What is the most likely cause?', [
        ['The driver is kept in a static field that every thread overwrites', true],
        ['TestNG cannot run methods in parallel if they share a single class', false],
        ['Chrome allows only one automated window per machine at a time', false],
        ['The data provider was not declared with parallel = true as well', false],
      ], 'A static driver is shared by all threads, so each new test replaces it and others drive the wrong browser, as the plain-Java demo printed. TestNG parallelises methods of one class fine, Chrome runs many automated sessions, and the data-provider flag only affects provider rows.'),
      mcq('What changes in a test\'s code when it moves from a local ChromeDriver to Selenium Grid?', [
        ['Only how the driver is created: a RemoteWebDriver with the Grid URL and options', true],
        ['Every findElement call must name the Grid node that holds the browser session', false],
        ['Waits are no longer needed, because the Grid synchronises each command itself', false],
        ['Tests must be rewritten against the Grid\'s own REST API instead of WebDriver', false],
      ], 'RemoteWebDriver implements the same WebDriver interface, so only creation changes and the Grid routes commands to the right node. Tests never name nodes, network round trips make waits more important, not less, and no rewrite against another API is needed.'),
      mcq('Against the same page, why did Playwright not raise a stale-element error after the in-stock filter re-rendered the list?', [
        ['Its locators are re-resolved against the page each time they are used', true],
        ['It caches DOM nodes, so the old rows stay available after re-render', false],
        ['It disables JavaScript re-rendering while a test is waiting on a page', false],
        ['It retries a failed command three times before reporting any error', false],
      ], 'A Playwright locator is a description that is resolved again on every action, so it finds the new rows; Selenium\'s WebElement holds one DOM node. Playwright does not cache old nodes, never freezes the page\'s scripts, and its waiting is condition-based, not a fixed number of retries.'),
    ],
    checkpoint: [
      mcq('A team needs its checkout tests to run on real Safari on macOS as well as Chrome. What fits best?', [
        ['Selenium with safaridriver, on a Mac node or a cloud grid', true],
        ['Playwright\'s WebKit build running on a Linux CI agent', false],
        ['Headless Chrome with a Safari user-agent string set', false],
        ['Selenium with ChromeDriver and a Safari window size', false],
      ], 'Only safaridriver drives real Safari, so Selenium on a Mac or a hosted Mac in a cloud grid gives that evidence. Playwright\'s WebKit is close but is not the shipped Safari, and changing the user agent or window size leaves the engine Chrome.'),
      ck('AUTOMATED_TESTING', 'Why does a TestNG BaseTest call DRIVER.remove() after quitting the ThreadLocal driver?', [
        ['Pooled threads are reused, and the stale driver would stay attached to the next test', true],
        ['ThreadLocal values are shared with other threads unless they are removed explicitly', false],
        ['quit() fails with an exception unless the ThreadLocal is cleared before it is called', false],
        ['TestNG reads the ThreadLocal to decide whether a test passed or failed in the report', false],
      ], 'TestNG runs tests on pooled threads, so a value left in a ThreadLocal survives into the next test on that thread and leaks memory. ThreadLocal values are never shared between threads, quit works regardless, and TestNG does not read your ThreadLocal for results.'),
      mcq('A Grid has 6 Chrome slots in total, and the suite is set to thread-count="20". What will happen?', [
        ['Extra session requests wait in the Grid queue, and some may time out', true],
        ['The Grid starts 14 additional Chrome browsers on the hub machine', false],
        ['TestNG lowers thread-count to 6 after it detects the Grid size', false],
        ['All 20 tests run at once, sharing browsers between test threads', false],
      ], 'A Grid serves only as many sessions as it has slots; the rest queue in the New Session Queue and can time out, so thread-count should match capacity. The hub does not start browsers itself, TestNG knows nothing about the Grid, and sessions are never shared between tests.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_SELENIUM_JAVA_DEBUGGING',
    notes: `Seven failures from KiranaKart's Selenium suite. Read the symptom, decide the cause yourself, then read on. The javac and
Java run-time messages are real JDK 19 output; the Selenium messages are real output from the same scenarios run with
Selenium for Python against the local KiranaKart page (Java prints the same WebDriver error names and texts, with its
own stack trace).

## 1. The config reader that will not compile

**Symptom.**

    ConfigReader.java:7: error: unreported exception FileNotFoundException; must be caught or declared to be thrown
            props.load(new FileInputStream(path));
    ConfigReader.java:7: error: unreported exception IOException; must be caught or declared to be thrown
    2 errors

**Cause.** Both exceptions are checked. Java insists the method handles them or says it may throw them.

**Fix.** Declare \`throws IOException\` (FileNotFoundException is a subclass, so one declaration covers both) and open
the stream in try-with-resources so it is closed. Do not catch and ignore: a missing config should stop the run with
a clear message, not let every test fail later with a null base URL.

## 2. The driver that is always null

**Symptom.** Every test fails on its first line:

    java.lang.NullPointerException: Cannot invoke "ShadowDemo$Driver.get(String)" because "this.driver" is null

and yet the set-up method clearly opened a browser (it printed "opened about:blank").

**Cause.** The set-up wrote \`Driver driver = new ChromeLike();\`. The type in front declares a new local variable that
hides the field, and the field stays null. (Reproduced with a stand-in for WebDriver; with Selenium you also get an
orphan Chrome per test, because nothing ever quits the local one.)

**Fix.** Assign the field: \`driver = new ChromeDriver(options);\` or \`this.driver = ...\`. The message's "this.driver"
is the clue: the null is a field, not a local.

## 3. The expected list that cannot grow

**Symptom.** A helper builds the expected names and then adds one:

    total 288
    Exception in thread "main" java.lang.UnsupportedOperationException
        at java.base/java.util.ImmutableCollections.uoe(ImmutableCollections.java:142)

**Cause.** \`List.of(...)\` returns an immutable list. javac accepts \`add\` because the List interface declares it.

**Fix.** \`new ArrayList<>(List.of("Toor Dal 1kg"))\` when the list must change; keep List.of for fixed expectations.

## 4. Cannot find the UPI field

**Symptom.**

    NoSuchElementException: no such element: Unable to locate element: {"method":"css selector","selector":"[id="vpa"]"}

The field is on screen and the id is right in DevTools.

**Cause.** It is inside the UPI iframe; the driver searches only the current browsing context.

**Fix.** \`driver.switchTo().frame("upi")\` before, \`driver.switchTo().defaultContent()\` after. A tell-tale sign: the
DevTools Elements panel shows the field under an \`#document\` node inside an \`<iframe>\`.

## 5. Click intercepted after sign-in

**Symptom.**

    ElementClickInterceptedException: element click intercepted: Element <button id="go" onclick="search()">...</button>
    is not clickable at point (214, 162). Other element would receive the click: <div id="loader">...</div>

**Cause.** The loading overlay still covers the page for about a second after sign-in.

**Fix.** \`wait.until(ExpectedConditions.invisibilityOfElementLocated(By.id("loader")))\`, then the normal click; put
that wait inside \`LoginPage.loginAs()\` so no test has to remember it. Not a JavaScript click.

## 6. Stale after the filter

**Symptom.** The test reads three rows, ticks "In stock only", reads the first row again:

    rows: 3
    StaleElementReferenceException: stale element reference: stale element not found in the current frame

**Cause.** The filter rebuilt the list, so the saved WebElements point at nodes that no longer exist.

**Fix.** \`wait.until(ExpectedConditions.stalenessOf(oldRow))\`, then \`findElements\` again (it returned
['Toor Dal 1kg', 'Sunflower Oil 1L']). Do not wrap reads in a catch-and-retry loop.

## 7. The suite that got slow after "fixing" waits

**Symptom.** After someone added an implicit wait of 10 s "for stability", each logout check takes 11 s and a wait
written as 5 s fails after 10:

    implicit 0: loader wait returned after 1.6s
    implicit 10, explicit 5: loader wait returned after 11.3s
    implicit 10, explicit 5, missing element: TimeoutException after 10.0s

**Cause.** Implicit and explicit waits mixed: every lookup inside an explicit condition sits out the implicit wait
when the element is absent.

**Fix.** Remove the implicit wait; keep explicit waits in page objects. The Selenium documentation warns against
mixing them for exactly this reason.`,
    mcqs: [
      mcq('Every test fails with: Cannot invoke "WebDriver.get(String)" because "this.driver" is null, although set-up visibly opens Chrome. What is the most likely bug?', [
        ['Set-up declares a local WebDriver variable that hides the class field', true],
        ['ChromeDriver cannot start because Selenium Manager found no driver', false],
        ['The test class forgot to import org.openqa.selenium.WebDriver itself', false],
        ['TestNG runs @Test methods before @BeforeMethod when priority is set', false],
      ], 'Writing "WebDriver driver = new ChromeDriver()" in set-up creates a local variable; Chrome opens, but the field stays null, which the message names as this.driver. A missing driver would fail in set-up, a missing import does not compile, and TestNG always runs @BeforeMethod first.'),
      mcq('The UPI field cannot be found though DevTools shows its id under an #document node. Which change fixes the test?', [
        ['Switch into the iframe before finding the field, and back out afterwards', true],
        ['Use an XPath locator instead, because CSS cannot reach inside an iframe', false],
        ['Set an implicit wait, so findElement keeps looking until the frame loads', false],
        ['Use findElements instead, which also searches inside every frame on the page', false],
      ], 'An #document under an iframe means a separate browsing context, and WebDriver searches only the current one. XPath has the same limit as CSS, waiting longer searches the same wrong context, and findElements does not cross frames either.'),
      mcq('ElementClickInterceptedException says "Other element would receive the click: <div id=\'loader\'>". What does the message tell you?', [
        ['The target is visible, but another element is on top of it at that point', true],
        ['The target is not in the DOM yet and the loader is its placeholder element', false],
        ['The target is disabled until the loader div sets its enabled attribute', false],
        ['The target is inside the loader, so it needs a frame switch to reach it', false],
      ], 'Click intercepted means WebDriver found the element and tried to click at its centre, but the topmost element there was the loader. A missing element gives NoSuchElementException, a disabled one simply ignores clicks, and the loader is a div, not a frame.'),
      mcq('After an implicit wait of 10 s was added, an explicit 5 s wait for a missing element fails only after 10 s. Which fix restores the expected timing?', [
        ['Remove the implicit wait and rely on explicit waits only', true],
        ['Lower the explicit wait to 1 s so the two add up to 11 s', false],
        ['Raise the explicit wait to 15 s so it outlasts the implicit', false],
        ['Use FluentWait with a 100 ms polling interval to poll faster', false],
      ], 'The implicit wait runs inside each lookup the explicit wait makes, so it decides the real timing. Shrinking or growing the explicit timeout keeps the mix, and faster polling cannot shorten a single 10 s lookup.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_SELENIUM_JAVA_PRACTICE',
    notes: `Eight exercises. Write each answer before reading ours. The page under test is KiranaKart's search page:

    <input id="q"> <button id="go">Search</button>
    <label><input type="checkbox" id="instock"> In stock only</label>
    <ul id="results">
      <li class="item"><span class="name">Toor Dal 1kg</span> <span class="price">₹149</span> <button class="add">Add</button></li>
      ...
    </ul>
    <p>Cart: <span id="cart-count">0</span></p>
    <div id="loader">Loading...</div>      (present for about 1 s after sign-in, then removed)

## 1. Predict the output (easy)

    String a = "Rs 586";
    String b = new String("Rs 586");
    System.out.println((a == b) + " " + a.equals(b) + " " + " Rs 586 ".trim().equals(a));

**Answer.** \`false true true\`. Different objects, equal text, and trim removes the spaces.

## 2. Locators (easy)

Write a CSS selector for every product name, and an XPath for the price in the Sunflower Oil row.

**Answer.** \`By.cssSelector("#results .item .name")\`;
\`By.xpath("//li[.//span[@class='name' and text()='Sunflower Oil 1L']]//span[@class='price']")\`.

## 3. Absent, not missing (easy)

Assert that no row contains "Basmati" after the in-stock filter, without waiting 10 s or throwing.

**Answer.** First wait for the old list to go stale (exercise 6), or the check reads the rows from before the filter.
Then, with no implicit wait set:
\`Assert.assertTrue(driver.findElements(By.xpath("//span[@class='name'][contains(., 'Basmati')]")).isEmpty());\`

## 4. Choose the wait (medium)

For each, name the ExpectedConditions method: (a) the loader to go, (b) the first result to appear, (c) the cart to
read 2, (d) the policy tab to open, (e) the confirm dialog.

**Answer.** (a) invisibilityOfElementLocated, (b) visibilityOfElementLocated, (c) textToBePresentInElementLocated,
(d) numberOfWindowsToBe(2), (e) alertIsPresent.

## 5. Parse the shown prices (medium)

Write \`int totalPaise(List<WebElement> prices)\` for texts like "₹1,299".

**Answer.**

    int total = 0;
    for (WebElement p : prices) {
        total += Integer.parseInt(p.getText().replace("₹", "").replace(",", "").trim()) * 100;
    }
    return total;

Integer paise, not double rupees; for ₹149, ₹599 and ₹139 it returns 88700.

## 6. A page object method (medium)

Write \`SearchPage.onlyInStock()\` so that callers can never hit a stale element.

**Answer.**

    public SearchPage onlyInStock() {
        WebElement firstRow = driver.findElement(rows);
        driver.findElement(inStock).click();
        wait.until(ExpectedConditions.stalenessOf(firstRow));
        return this;
    }

The method returns only after the old list is gone, and \`names()\` finds rows fresh each time.

## 7. A data provider (medium)

Write a provider for coupon tests: BACHAT10 valid, bachat10 (lower case) valid, EXPIRED50 rejected, blank rejected.

**Answer.**

    @DataProvider(name = "coupons")
    public Object[][] coupons() {
        return new Object[][] { {"BACHAT10", true}, {"bachat10", true}, {"EXPIRED50", false}, {"", false} };
    }
    @Test(dataProvider = "coupons")
    public void couponIsAppliedOnlyWhenValid(String code, boolean valid) { ... }

Whether lower case is valid is a requirement question; ask, then encode the answer as a row.

## 8. Make it parallel (hard)

Write the testng.xml line and the BaseTest change to run methods four at a time.

**Answer.** \`<suite name="KiranaKart Regression" parallel="methods" thread-count="4">\`, and a
\`private static final ThreadLocal<WebDriver> DRIVER\` set in @BeforeMethod, read through \`driver()\`, and in
@AfterMethod(alwaysRun = true) quit then \`DRIVER.remove()\`. Then check for shared data, and run it three times.`,
    mcqs: [
      mcq('What does this print? String a = "Rs 586"; String b = new String("Rs 586"); System.out.println(a == b);', [
        ['false', true],
        ['true', false],
        ['Rs 586', false],
      ], 'new String creates a separate object, and == compares references, so it prints false even though a.equals(b) is true. It would print true only for the same object, and println of a boolean expression never prints the text itself.'),
      mcq('Which call proves no Basmati row is shown, without throwing, once the filtered list is in place and no implicit wait is set?', [
        ['findElements for the Basmati name, then assert the list is empty', true],
        ['findElement for the Basmati name, then assert it is not displayed', false],
        ['getPageSource, then assert it does not contain the word Basmati', false],
        ['findElement for the Basmati name inside a try with an empty catch', false],
      ], 'findElements returns an empty list when nothing matches, a clean and fast absence check. findElement throws when the row is absent, the page source can mention Basmati elsewhere, and an empty catch passes for any error, including a wrong locator.'),
      mcq('Which wait fits "the policy link opens a second tab, then switch to it"?', [
        ['numberOfWindowsToBe(2), then loop over the window handles', true],
        ['titleIs("Return Policy - KiranaKart") on the current window', false],
        ['urlContains("policy") before the driver switches the window', false],
        ['visibilityOfElementLocated on the policy page\'s first heading', false],
      ], 'The driver stays on the first tab, so first wait for the second window to exist, then switch by handle. Title, URL and element checks all run against the current window, which is still checkout, and would time out.'),
      mcq('A filter method returns as soon as it clicks "In stock only". Callers then sometimes read stale or old rows. What should the method do before returning?', [
        ['Wait for a row found before the click to go stale', true],
        ['Sleep for one second so the filter has time to run', false],
        ['Wait for the results list to be visible on the page', false],
        ['Catch StaleElementReferenceException in every caller', false],
      ], 'stalenessOf on a pre-click row returns exactly when the list was replaced, so callers then see only new rows. A sleep is a guess, the list stays visible the whole time, and pushing catch blocks into callers spreads the problem.'),
      mcq('TestNG must run methods four at a time. Which pair of changes is needed?', [
        ['parallel="methods" thread-count="4" and a ThreadLocal driver', true],
        ['parallel="classes" thread-count="4" and a static shared driver', false],
        ['thread-count="4" alone, since TestNG isolates each thread itself', false],
        ['parallel="tests" and one @BeforeSuite that starts four browsers', false],
      ], 'Methods in parallel need a driver per thread, which ThreadLocal provides. A static driver is overwritten by other threads, thread-count without parallel does nothing, and four browsers from one @BeforeSuite still need a way for each thread to get its own.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_SELENIUM_JAVA_INTERVIEW_QUESTION',
    notes: `Four questions asked in almost every Selenium-with-Java interview at service companies, GCCs and product firms, with an
answer that scores well and the follow-up a good interviewer asks next. Say each aloud in about two minutes.

## Q1. "What is the difference between implicit, explicit and fluent waits?"

**Model answer.** "An implicit wait is a session setting: every findElement retries for up to that time until the
element is present in the DOM. It only knows about presence, it also slows findElements when I check that something
is absent, and with Chrome it even hides waiting inside click. An explicit wait, WebDriverWait with
ExpectedConditions, waits for one named condition at one place: visible, clickable, text present, an overlay gone, a
second window, an alert. FluentWait is the general form of the same thing, where I set the timeout, polling interval
and which exceptions to ignore. In our framework the implicit wait is zero and explicit waits live inside page-object
methods, because mixing them makes timing unpredictable: I measured a 5-second explicit wait that took 11 seconds
with a 10-second implicit wait set."

**Follow-up.** "Then why not just use Thread.sleep?" — "It always waits the full time, so it is slow when the app is
fast and still fails when the app is slower than the guess, on CI or on a sale day. A wait for the real condition
returns as soon as it is true."

## Q2. "What is StaleElementReferenceException and how do you handle it?"

**Model answer.** "A WebElement is a reference to one DOM node. If the page replaces that node, after a filter, a
re-render or a reload, the reference is dead even if an identical element is now there, and any call on it throws
StaleElementReferenceException. I handle it by design rather than by catching: page objects store By locators and
find elements inside each method; after an action that re-renders, I wait for stalenessOf on an old element and then
find again. I do not catch it in a retry loop, because that can hide a real problem such as a list that renders
twice."

**Follow-up.** "Does PageFactory solve it?" — "Partly: @FindBy proxies look the element up again when used, unless
@CacheLookup is set, but PageFactory adds no waiting, so I still need explicit waits for the re-render."

## Q3. "Explain your framework."

**Model answer.** "It is Maven, Selenium WebDriver and TestNG in Java. Under src/test/java there are page classes
extending a BasePage that holds the driver, a WebDriverWait and helpers like visible and click; tests extend a
BaseTest that creates a ChromeDriver, or a RemoteWebDriver when a GRID_URL is set, in a ThreadLocal in @BeforeMethod
and quits it in @AfterMethod with alwaysRun, taking a screenshot first if the test failed. Config such as base URL and
timeouts is in a properties file per environment under src/test/resources; credentials come from environment
variables. Data-driven tests use @DataProvider. testng.xml defines smoke and regression groups and runs methods in
parallel on Selenium Grid. Jenkins runs smoke on every merge and full regression nightly, and publishes the reports
and screenshots."

**Follow-up.** "What would you change?" — "Create test data through the API instead of the UI, which is our slowest
part, and add a trace or video on failure so flaky failures can be diagnosed without rerunning."

## Q4. "Selenium or Playwright, and why?"

**Model answer.** "It depends on the team and the suite. Selenium is the W3C standard, has bindings for every major
language, drives real Safari, and runs on Grid and every cloud grid; a large working Selenium suite should be fixed,
not rewritten. Playwright gives auto-waiting, locators that re-resolve so stale references do not happen, tracing and
network mocking built in. I ran the same page in both: Selenium needed an explicit wait for an overlay and a re-find
after a filter; Playwright's click waited for the overlay and its locator returned the new rows. For a new web
project in a language Playwright supports, I would pick Playwright; for real Safari or an existing Java estate,
Selenium."

**Follow-up.** "How do you run Selenium tests in parallel?" — "TestNG parallel methods with a ThreadLocal driver, independent
test data, and enough browser capacity, which beyond a few browsers means Selenium Grid or a cloud grid."`,
    mcqs: [
      mcq('An interviewer asks why your framework keeps the implicit wait at zero. Which answer is strongest?', [
        ['Mixed with explicit waits it stretches timeouts unpredictably, as a 5 s wait taking 11 s showed', true],
        ['Implicit waits were removed in Selenium 4, so setting one no longer has any effect on lookups', false],
        ['Implicit waits only work with XPath locators, and our framework mostly uses CSS selectors', false],
      ], 'The real reason is the interaction: lookups inside explicit conditions sit out the implicit wait, so timings become unpredictable. Implicit waits still exist in Selenium 4 and apply to every locator strategy, so the other answers are factually wrong.'),
      mcq('Asked how you handle StaleElementReferenceException, which answer shows the most experience?', [
        ['Store By locators, re-find after re-renders, and wait for staleness of the old element', true],
        ['Wrap every element action in a retry loop that catches the exception up to three times', false],
        ['Set a long implicit wait so that the driver can reattach elements after a re-render', false],
      ], 'Designing it out, and waiting for the re-render to finish, removes the cause and keeps real bugs visible. A blanket retry hides double renders and other defects, and implicit waits only affect finding elements, never reattaching old references.'),
      mcq('Asked "Selenium or Playwright?", which answer best matches how teams actually decide?', [
        ['Keep a large working Selenium suite; pick Playwright for new projects unless real Safari matters', true],
        ['Always Playwright, since Selenium is deprecated and no longer receives updates or new releases', false],
        ['Always Selenium, since Playwright supports only JavaScript and cannot be used from Java or Python', false],
      ], 'The decision weighs the existing investment, team language and browser needs. Selenium is actively maintained, and Playwright has official Python, Java and .NET bindings, so both absolute answers rest on false claims.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_SELENIUM_JAVA_CHECKPOINT',
    notes: `Ten questions across the topic: Java for testers, WebDriver, waits and stale elements, TestNG with page objects, and
Selenium Grid. Answer without notes; the result shows which lesson to revisit.`,
    checkpoint: [
      ck('AUTOMATED_TESTING', 'A helper parses "₹1,299" with Integer.parseInt(text.replace("₹", "")) and throws NumberFormatException. What is still wrong with the text?', [
        ['The comma is still in it, so "1,299" is not a valid integer', true],
        ['The rupee sign is multi-byte, so replace() cannot remove it', false],
        ['parseInt needs a radix argument when parsing currency values', false],
        ['The value is too large to fit in an int and needs a long', false],
      ], 'After removing the rupee sign the string is "1,299", and parseInt rejects the comma; remove it as well. replace handles any Unicode character, parseInt defaults to base 10, and 1299 fits easily in an int.'),
      ck('AUTOMATED_TESTING', 'Which Maven command runs only KiranaKart\'s LoginTest class?', [
        ['mvn -Dtest=LoginTest test', true],
        ['mvn test --class LoginTest', false],
        ['mvn run LoginTest.java', false],
        ['java -jar LoginTest test', false],
      ], 'Surefire\'s test property selects classes to run within the test phase. Maven has no --class option or run goal for tests, and java -jar runs a packaged application, not a TestNG class.'),
      mcq('What does Selenium Manager do when a test calls new ChromeDriver()?', [
        ['Finds or downloads a matching chromedriver so the session can start', true],
        ['Installs a fresh copy of Chrome on every run so versions never drift', false],
        ['Starts a local Selenium Grid and connects the test to it as a node', false],
        ['Records each command so it can be replayed later as a regression test', false],
      ], 'Since Selenium 4.6 Selenium Manager resolves the driver binary (and can fetch a browser if none is installed). It does not reinstall Chrome every run, does not start a Grid, and is not a recorder; that was Selenium IDE.'),
      mcq('The hidden coupon button is in the DOM from page load and shown 2 s after search. Which wait makes a click safe?', [
        ['elementToBeClickable on the coupon button', true],
        ['presenceOfElementLocated on the coupon button', false],
        ['An implicit wait of 10 s set before the search', false],
        ['textToBePresentInElement on the results list', false],
      ], 'Clickable means visible and enabled, which is what a click needs. Presence is true from page load (our run found it at 0.0 s while hidden), an implicit wait only waits for presence, and results text says nothing about the coupon button.'),
      mcq('Which situation produces StaleElementReferenceException?', [
        ['Using a WebElement after the page replaced the node it pointed to', true],
        ['Calling findElement for an element that does not exist on the page', false],
        ['Clicking a button while a loading overlay is still covering it', false],
        ['Reading text from an element that is hidden with display: none', false],
      ], 'Stale means the referenced node left the DOM, as after the in-stock filter. A missing element gives NoSuchElementException, an overlay gives ElementClickInterceptedException, and a hidden element returns empty text without any exception.'),
      mcq('A test must type a UPI ID into a field inside an iframe named "upi" and then click Cancel order on the main page. Which sequence works?', [
        ['switchTo().frame("upi"), type, then switchTo().defaultContent(), click Cancel', true],
        ['switchTo().window("upi"), type, then switchTo().window("main"), click Cancel', false],
        ['switchTo().frame("upi"), type, click Cancel, then switchTo().defaultContent()', false],
        ['findElement inside the frame directly, type, and click Cancel without switching', false],
      ], 'Frames are separate browsing contexts: enter the frame to type, return to the top document before touching the main page. Windows are for tabs, Cancel cannot be found while still inside the frame, and finding without switching gives NoSuchElementException.'),
      mcq('Why should a page object\'s method return a value for the test to check, rather than asserting inside the page?', [
        ['The same page object can then serve both positive and negative tests', true],
        ['TestNG does not allow Assert calls in classes without @Test methods', false],
        ['Assertions inside page objects always run before the page has loaded', false],
        ['Page objects are compiled separately and cannot import TestNG classes', false],
      ], 'If loginAs asserted the welcome banner, a wrong-password test could not use it; returning values keeps decisions in tests. TestNG allows Assert anywhere, assertion timing depends on your waits, and page classes can import anything.'),
      ck('AUTOMATED_TESTING', 'Why does a TestNG BaseTest give @AfterMethod alwaysRun = true?', [
        ['So the browser is still quit when groups are filtered or set-up fails', true],
        ['So TestNG retries the failed test once more before tear-down happens', false],
        ['So that the method runs in parallel with the next test on the thread', false],
        ['So that tear-down runs before the test as well as after it each time', false],
      ], 'alwaysRun makes a configuration method run even when TestNG would otherwise skip it, so browsers are not left open. It does not retry tests, change scheduling, or run tear-down before tests.'),
      mcq('A suite set to parallel="methods" with a static WebDriver field fails randomly, but never when run serially. What is the cause?', [
        ['All threads share the one driver field, so tests drive each other\'s browser', true],
        ['Chrome cannot run more than one automated session on the same machine', false],
        ['Static fields are reset to null by TestNG at the start of every method', false],
        ['Parallel runs disable explicit waits, so timing problems suddenly appear', false],
      ], 'A static field holds one driver for every thread, so whichever test assigned it last wins, as the demo printed "session-search" for all three tests. Chrome runs many sessions, TestNG does not reset your fields, and waits work the same in parallel.'),
      mcq('What does a test change to run on Selenium Grid instead of a local Chrome?', [
        ['It creates a RemoteWebDriver with the Grid URL and the browser options', true],
        ['It adds the Grid hostname to every locator so commands reach the node', false],
        ['It replaces every explicit wait with the Grid\'s built-in synchronisation', false],
        ['It starts the Grid server jar from @BeforeMethod before each test runs', false],
      ], 'Only driver creation changes; RemoteWebDriver speaks the same WebDriver protocol to the Grid, which routes commands to a node. Locators never name hosts, the Grid adds no waiting, and the Grid is started once outside the tests.'),
    ],
  },
];
