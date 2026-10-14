/**
 * Career-track content: React Fundamentals (JT_REACT_BASICS) and React Hooks (JT_REACT_HOOKS).
 *
 * Both topics are single-skill (REACT_COMPONENTS and REACT_HOOKS), so no question names a
 * skillKey; the topic default attributes every checkpoint answer.
 *
 * Everything here is React 18 with function components. Class components are mentioned only
 * where an interviewer still expects a candidate to know they exist.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_REACT_CORE_BUNDLES: PilotBundle[] = [
  /* ══ JT_REACT_BASICS ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_REACT_BASICS_WHY_REACT',
    notes: `**React describes the screen as a function of data.** You say what the page should look
like for the current data, and React works out which DOM changes get it there.

## The problem it solves

Without a library, every change is manual: find the element, change its text, add a class, remove
a row, remember to update the counter in the header too. With five pieces of data on a page this is
fine. With fifty, the page and the data drift apart, and the bug reports read "the badge says 3 but
the list shows 2".

React removes that whole class of bug. You never write "change this element". You write a
component that returns the UI for some data; when the data changes, React calls the component
again and updates only the parts of the DOM that differ. This comparison step is called
**reconciliation**, and the in-memory description it compares is often called the virtual DOM.

## What a component is

A component is a JavaScript function whose name starts with a capital letter and which returns
JSX:

    function Greeting() {
      return <h1>Hello, CodeBegun</h1>;
    }

    export default function App() {
      return (
        <main>
          <Greeting />
          <Greeting />
        </main>
      );
    }

The capital letter is not style. React treats a lowercase tag such as greeting as an HTML element
and a capitalised one as your component.

## Starting a project with Vite

    npm create vite@latest my-app -- --template react
    cd my-app
    npm install
    npm run dev

The entry point, src/main.jsx, mounts the app into the div with id root using createRoot from
react-dom/client — the React 18 API. Older tutorials show ReactDOM.render, which React 18 no longer
uses for new apps.

## Common mistakes

- Naming a component with a lowercase letter, then wondering why nothing renders.
- Thinking React replaces the whole page on every change. It re-runs your function, then touches
  only the DOM nodes that actually changed.
- Reaching for document.getElementById inside a component to change text. That fights React; change
  the data instead and let React update the DOM.`,
    workedExample: `**Turning a manual DOM update into a component.**

The old way: a button click finds a span and increments its text. The count lives in the DOM, so
any other place showing the count must be updated by hand too.

The React way: the count is data, and the UI is derived from it.

    import { useState } from 'react';

    export default function Counter() {
      const [count, setCount] = useState(0);
      return (
        <div>
          <p>Clicked {count} times</p>
          <button onClick={() => setCount(count + 1)}>Click</button>
        </div>
      );
    }

Nothing here says "change the paragraph". The click changes the data; React calls Counter again,
sees that the paragraph text differs, and updates that one text node.`,
    mcqs: [
      mcq('What does React do after a component\'s data changes?', [
        ['Reloads the page so the browser rebuilds the DOM', false],
        ['Calls the component again and patches only what differs', true],
        ['Asks the developer to update the changed elements', false],
        ['Replaces the whole body element with fresh markup', false],
      ], 'React re-runs the component to get a new description of the UI, compares it with the previous one (reconciliation), and applies only the differences to the real DOM.'),
      mcq('A developer writes function card() { return <div>Hi</div>; } and renders <card />. What happens?', [
        ['React renders the div, since case does not matter', false],
        ['React treats card as an unknown HTML tag, not the component', true],
        ['The build fails with a syntax error at the function', false],
      ], 'JSX treats lowercase tags as built-in HTML elements. A component must start with a capital letter so React calls the function instead of creating a <card> element.'),
      mcq('In a React 18 Vite project, which call mounts the app into the root div?', [
        ['ReactDOM.render(<App />, rootElement)', false],
        ['createRoot(rootElement).render(<App />)', true],
        ['document.body.appendChild(<App />)', false],
        ['new React.App(rootElement).mount()', false],
      ], 'React 18 introduced createRoot from react-dom/client; it enables concurrent features and automatic batching. ReactDOM.render is the legacy API.'),
    ],
    checkpoint: [
      mcq('A page shows a cart count in the header and in the sidebar. In plain DOM code they disagree after some clicks. Why does a React version avoid this?', [
        ['React stores the DOM in localStorage between clicks', false],
        ['Both places derive from the same data and re-render together', true],
        ['React locks the header until the sidebar finishes', false],
      ], 'In React both views read one piece of state. When it changes, every component using it re-renders, so they cannot drift apart the way two hand-edited DOM nodes can.'),
      mcq('Which statement about the virtual DOM is accurate?', [
        ['It is a faster browser that React ships with each app', false],
        ['It is an in-memory description React compares to find changes', true],
        ['It is a second copy of the page hidden behind the real one', false],
      ], 'The virtual DOM is just the tree of objects that components return. React diffs the new tree against the previous one and patches the real DOM where they differ.'),
      mcq('Inside a component, a teammate uses document.getElementById("total").innerText = sum to update a total. What is the main problem?', [
        ['innerText is not supported in modern browsers, so nothing is shown', false],
        ['React will overwrite it on the next render, since the data never changed', true],
        ['getElementById only works inside class components, not functions', false],
      ], 'React owns the DOM it renders. Changing it by hand bypasses state, so the next render puts back whatever the component returns. The fix is to hold sum in state or derive it.'),
    ],
  },
  {
    unitCode: 'JT_REACT_BASICS_JSX',
    notes: `**JSX looks like HTML but it is JavaScript.** Each tag compiles to a function call
(React.createElement, or the newer jsx runtime), so the rules are JavaScript's rules.

## Expressions in braces

Anything inside curly braces is a JavaScript **expression** — something that produces a value:

    function Profile() {
      const user = { name: 'Asha', points: 1200 };
      return (
        <section>
          <h2>{user.name}</h2>
          <p>Points: {user.points.toLocaleString()}</p>
          <p>Level: {user.points > 1000 ? 'Gold' : 'Silver'}</p>
        </section>
      );
    }

An if statement or a for loop is a statement, not an expression, so it cannot go inside braces.
Use a ternary, &&, or compute the value above the return.

## Attributes are props, in camelCase

- class becomes **className**, because class is a reserved word in JavaScript.
- for on a label becomes **htmlFor**.
- Event handlers are camelCase: onClick, onChange.
- style takes an object, not a string: style={{ color: 'red', marginTop: 8 }}. The outer braces
  mean "expression", the inner ones are the object literal.

## One parent element

A component returns one value, so adjacent tags must be wrapped. If a div would break your layout,
use a **fragment**:

    function Row() {
      return (
        <>
          <td>Name</td>
          <td>Email</td>
        </>
      );
    }

## Every tag closes

img, input and br must be self-closed: <img src={logo} alt="logo" />. HTML forgives a missing close;
JSX does not.

## Common mistakes

- Writing class= instead of className= (it works with a warning, but it is wrong).
- Returning two sibling elements without a wrapper — a compile error.
- Putting an object directly in braces, such as {user}. React cannot render a plain object and
  throws "Objects are not valid as a React child".
- Rendering {count && <Badge />} when count can be 0. The expression evaluates to 0, and React
  renders the 0. Use {count > 0 && <Badge />}.`,
    mcqs: [
      mcq('Why does JSX use className instead of class?', [
        ['class is a reserved word in JavaScript', true],
        ['className loads CSS faster than class does', false],
        ['Browsers reject class on elements built by React', false],
      ], 'JSX compiles to JavaScript object properties, and class is a reserved keyword there, so React uses the DOM property name className.'),
      mcq('A component renders {items.length && <List items={items} />} and the array is empty. What shows on screen?', [
        ['Nothing at all, because && short-circuits', false],
        ['The digit 0', true],
        ['An empty List component', false],
        ['A runtime error about booleans', false],
      ], 'With an empty array the expression evaluates to 0, and React renders numbers. Only false, null, undefined and true render nothing. Use items.length > 0 && ... instead.'),
      mcq('Which JSX line sets an inline style correctly?', [
        ['<p style="color: red">Hi</p>', false],
        ['<p style={{ color: "red" }}>Hi</p>', true],
        ['<p style={color: "red"}>Hi</p>', false],
      ], 'style takes a JavaScript object. The outer braces open an expression and the inner braces are the object literal. A string style is rejected by React.'),
    ],
    checkpoint: [
      mcq('A component returns <h1>Title</h1><p>Body</p> with no wrapper. What happens?', [
        ['React renders both and adds a hidden div around them', false],
        ['It is a compile error: adjacent JSX must have one parent', true],
        ['Only the h1 renders and the p is silently dropped', false],
      ], 'A function returns one value, and two sibling JSX elements are two values. Wrap them in a parent element or a fragment (<>...</>).'),
      mcq('Which line can go inside JSX braces, as written?', [
        ['if (isAdmin) { "Admin" }', false],
        ['isAdmin ? "Admin" : "Member"', true],
        ['for (const r of roles) r', false],
      ], 'Braces accept expressions only. A ternary produces a value; if and for are statements and must be moved above the return or replaced with a ternary or map.'),
      mcq('Rendering <p>{user}</p> where user is { name: "Ravi" } throws an error. What is the fix?', [
        ['Write <p>{user.name}</p>', true],
        ['Write <p>{[user]}</p>', false],
        ['Wrap the p in a fragment', false],
      ], 'React can render strings, numbers, elements and arrays of those, but not a plain object. Render the property you actually want to show.'),
    ],
  },
  {
    unitCode: 'JT_REACT_BASICS_PROPS',
    notes: `**Props are how a parent passes data to a child.** They are the arguments of a component,
arriving as one object.

## Splitting a screen

Look at a product page and draw boxes: a header, a product card, a price tag, a review list. Each
box that has its own job, or that repeats, is a candidate component.

    function PriceTag({ amount, currency = 'INR' }) {
      return <span className="price">{currency} {amount.toFixed(2)}</span>;
    }

    function ProductCard({ product, onAdd }) {
      return (
        <article className="card">
          <h3>{product.title}</h3>
          <PriceTag amount={product.price} />
          <button onClick={() => onAdd(product.id)}>Add to cart</button>
        </article>
      );
    }

Destructuring in the parameter list ({ amount, currency = 'INR' }) is the usual style, and a
default value covers a prop the parent left out.

## Props are read-only

A component must never change its props. product.price = 0 inside ProductCard mutates an object the
parent owns, and the parent will not re-render because nothing told React. If a child needs to
change something, the parent passes a function — onAdd above — and the child calls it. Data flows
down; events flow up.

## children

Whatever sits between a component's tags arrives as props.children:

    function Panel({ title, children }) {
      return (
        <div className="panel">
          <h2>{title}</h2>
          {children}
        </div>
      );
    }

    <Panel title="Orders"><OrderTable /></Panel>

This is how layout components wrap content they know nothing about.

## Common mistakes

- Passing a number as a string: price="100" is the string "100"; price={100} is the number.
- Calling the handler while passing it: onAdd={onAdd(product.id)} runs during render. Pass a
  function: onAdd={() => onAdd(product.id)}.
- Copying a prop into state with no reason, then wondering why the child ignores later updates
  from the parent. Use the prop directly unless you really need an editable copy.`,
    mcqs: [
      mcq('A child component runs props.user.name = "Guest". What is wrong with this?', [
        ['Nothing, props are the child\'s own data to change freely', false],
        ['It mutates data the parent owns and React will not re-render', true],
        ['It throws, because props are frozen in production', false],
      ], 'Props are read-only by contract. Mutating them changes the parent\'s object behind React\'s back, so no re-render is scheduled and the UI goes out of sync.'),
      mcq('What does a parent pass as props.children in <Card><p>Hi</p></Card>?', [
        ['The string "Card"', false],
        ['The <p>Hi</p> element', true],
        ['An empty array, since nothing was passed', false],
      ], 'Whatever sits between the opening and closing tags of a component is passed to it as the children prop.'),
      mcq('Which way lets a child tell its parent that a button was clicked?', [
        ['The child edits a variable exported by the parent', false],
        ['The parent passes a function prop and the child calls it', true],
        ['The child returns a value that the parent reads', false],
        ['The child dispatches a DOM event the parent polls', false],
      ], 'Data flows down as props; events flow up through callback props. The parent owns the state and passes a function such as onSelect, which the child calls.'),
    ],
    checkpoint: [
      mcq('<Rating stars="4" /> renders "44444" instead of four stars when the code does stars + stars... What caused it?', [
        ['Quoted props are always arrays', false],
        ['"4" is a string; a number needs stars={4}', true],
        ['Rating must be a class component to receive numbers', false],
      ], 'A quoted attribute value is a string. To pass a number, boolean, object or function, put an expression in braces.'),
      mcq('A button is written <button onClick={onDelete(item.id)}>. What happens on first render?', [
        ['onDelete runs once immediately, during render', true],
        ['Nothing until the user clicks the button', false],
        ['React throws because onClick needs a string', false],
      ], 'The braces evaluate onDelete(item.id) while rendering and pass its return value as the handler. Wrap it: onClick={() => onDelete(item.id)}.'),
      mcq('Function Badge({ label, tone = "info" }) is rendered as <Badge label="New" />. What is tone?', [
        ['undefined', false],
        ['"info"', true],
        ['null', false],
      ], 'A default value in a destructured parameter applies when the prop is undefined, which it is when the parent leaves it out.'),
    ],
  },
  {
    unitCode: 'JT_REACT_BASICS_STATE',
    notes: `**State is data a component remembers between renders.** When state changes, React
re-renders the component with the new value.

    import { useState } from 'react';

    function LikeButton() {
      const [likes, setLikes] = useState(0);
      return <button onClick={() => setLikes(likes + 1)}>{likes} likes</button>;
    }

useState returns a pair: the current value and a setter. A plain let variable would not work — it
is reset to its initial value every time the function runs, and changing it does not tell React to
re-render.

## The setter schedules, it does not assign

Calling setLikes does not change likes in the current render. It asks React for a new render in
which likes has the new value. So this adds one, not three:

    setLikes(likes + 1);
    setLikes(likes + 1);
    setLikes(likes + 1);

All three read the same likes from this render. When the next value depends on the previous one,
use the **functional update**:

    setLikes(prev => prev + 1);

React 18 also **batches** updates: several setter calls in one event handler (and, since 18, in
timeouts and promises too) produce one re-render, not several.

## Never mutate state

React decides whether to re-render by comparing the old and new value with Object.is. If you push
into the same array and set it, the reference is unchanged and React may skip the update:

    // wrong
    todos.push(newTodo);
    setTodos(todos);

    // right — a new array
    setTodos([...todos, newTodo]);

    // updating one item — a new object for that item
    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));

    // removing
    setTodos(todos.filter(t => t.id !== id));

## Common mistakes

- Logging state right after setting it and seeing the old value. That is expected; the new value
  arrives in the next render.
- Storing values that can be computed. If you have items, do not also keep itemCount in state;
  compute items.length during render.
- Calling a setter directly in the component body, which re-renders, which calls it again: the
  "Too many re-renders" error.`,
    workedExample: `**A quantity stepper that never goes below one.**

    function Stepper() {
      const [qty, setQty] = useState(1);
      const dec = () => setQty(q => Math.max(1, q - 1));
      const inc = () => setQty(q => q + 1);
      return (
        <div>
          <button onClick={dec} disabled={qty === 1}>-</button>
          <span>{qty}</span>
          <button onClick={inc}>+</button>
        </div>
      );
    }

Functional updates are used because each new value depends on the previous one. The disabled
attribute is derived from state rather than stored separately, so it can never disagree with qty.`,
    mcqs: [
      mcq('A handler calls setScore(score + 5) twice in a row, with score at 10. What is score after the re-render?', [
        ['20', false],
        ['15', true],
        ['10', false],
      ], 'Both calls read score from the same render, where it is 10, so both ask for 15. Use setScore(s => s + 5) twice to get 20.'),
      mcq('Why does todos.push(item); setTodos(todos) often fail to update the screen?', [
        ['push is asynchronous in React components', false],
        ['The array reference is unchanged, so React sees no change', true],
        ['setTodos only accepts arrays created by useState', false],
      ], 'React compares old and new state with Object.is. Mutating and passing the same array gives an identical reference, so React can bail out of the re-render.'),
      mcq('Why can\'t a plain let variable replace useState for a counter?', [
        ['let is block-scoped and JSX cannot read it', false],
        ['It resets every render and changing it triggers none', true],
        ['let variables are frozen once the component mounts', false],
      ], 'The component function runs fresh on each render, so a local variable starts over each time, and assigning to it does not tell React anything changed.'),
    ],
    checkpoint: [
      mcq('A handler runs setName("Ira"); console.log(name); where name was "Raj". What is logged?', [
        ['"Ira"', false],
        ['"Raj"', true],
        ['undefined', false],
      ], 'The setter schedules a re-render; it does not reassign the const in the current render. The log reads this render\'s value, "Raj".'),
      mcq('Which update correctly toggles done on one task in a tasks array held in state?', [
        ['tasks[i].done = !tasks[i].done; setTasks(tasks); return tasks[i]', false],
        ['setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t))', true],
        ['setTasks(tasks.forEach(t => { if (t.id === id) t.done = !t.done; }))', false],
      ], 'map returns a new array and the spread creates a new object for the changed task, so React sees new references. The first option mutates in place.'),
      mcq('A component keeps both cart and cartTotal in state, and they sometimes disagree. What is the better design?', [
        ['Update cartTotal in a setTimeout after cart', false],
        ['Compute the total from cart during render', true],
        ['Put both into one object and mutate it', false],
      ], 'A value that can be derived from existing state should be calculated during render. Duplicated state is how two values drift apart.'),
    ],
  },
  {
    unitCode: 'JT_REACT_BASICS_EVENTS_FORMS',
    notes: `**Events in React are props that take functions.** Forms in React are usually
**controlled**: the input shows what state says, and every keystroke updates state.

## Handlers

    <button onClick={handleSave}>Save</button>
    <button onClick={() => remove(id)}>Delete</button>

Pass the function, do not call it. The handler receives a synthetic event with the familiar
methods: e.preventDefault(), e.target, e.stopPropagation().

## A controlled form

    function SignupForm({ onSubmit }) {
      const [form, setForm] = useState({ email: '', password: '' });
      const [error, setError] = useState('');

      function handleChange(e) {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
      }

      function handleSubmit(e) {
        e.preventDefault();
        if (!form.email.includes('@')) return setError('Enter a valid email');
        if (form.password.length < 8) return setError('Password needs 8+ characters');
        setError('');
        onSubmit(form);
      }

      return (
        <form onSubmit={handleSubmit}>
          <input name="email" value={form.email} onChange={handleChange} />
          <input name="password" type="password" value={form.password} onChange={handleChange} />
          {error && <p role="alert">{error}</p>}
          <button type="submit">Sign up</button>
        </form>
      );
    }

Points to notice:

- **e.preventDefault()** stops the browser's full-page form submission.
- One handleChange serves every field, using the input's name and a computed key.
- The spread copies the other fields; setForm({ [name]: value }) alone would wipe them.
- The handler is on the form's onSubmit, so pressing Enter in a field submits too.

## Controlled versus uncontrolled

A **controlled** input has value from state plus onChange. React is the single source of truth, so
you can validate, format or disable as the user types. An **uncontrolled** input keeps its own
value in the DOM and you read it when needed, usually through a ref (defaultValue sets its first
value). File inputs are always uncontrolled.

## Common mistakes

- value without onChange: the input becomes read-only and React warns.
- Initialising a field with undefined and later setting a string: React warns that the input
  switched from uncontrolled to controlled. Start with ''.
- Forgetting e.preventDefault(), so the page reloads and the state is lost.
- Reading a checkbox's e.target.value instead of e.target.checked.`,
    mcqs: [
      mcq('A form submits and the whole page reloads, clearing state. What is missing from the submit handler?', [
        ['e.stopPropagation()', false],
        ['e.preventDefault()', true],
        ['return false at the end', false],
      ], 'preventDefault cancels the browser\'s default form submission. In React, returning false from a handler does not prevent the default the way it did in old inline HTML handlers.'),
      mcq('An input has value={name} but no onChange. What does the user experience?', [
        ['They can type and state updates by itself', false],
        ['The field does not change when they type', true],
        ['The field clears after each keystroke', false],
      ], 'A controlled input always shows the state value. Without onChange nothing updates state, so React keeps putting the same value back; React also warns about it.'),
      mcq('A shared handler runs setForm({ [e.target.name]: e.target.value }). What bug does this cause?', [
        ['Typing in one field erases the other fields', true],
        ['The field name is used as the field value', false],
        ['The update is ignored because keys are computed', false],
      ], 'Replacing state with an object holding one key drops the rest. Spread the previous state: setForm(prev => ({ ...prev, [name]: value })).'),
    ],
    checkpoint: [
      mcq('Which property gives the current state of a checkbox in its onChange handler?', [
        ['e.target.value', false],
        ['e.target.checked', true],
        ['e.target.selected', false],
      ], 'A checkbox\'s value attribute is a fixed string such as "on". Whether it is ticked is in checked, so a controlled checkbox uses checked={x} and reads e.target.checked.'),
      mcq('React warns that "a component is changing an uncontrolled input to be controlled". What usually causes it?', [
        ['Its state starts as undefined and later becomes a string', true],
        ['The input has both a name attribute and an id attribute', false],
        ['The onChange handler is an inline arrow function in JSX', false],
      ], 'value={undefined} makes the input uncontrolled; once state becomes a string it is controlled. Initialise text fields with an empty string.'),
      mcq('When is an uncontrolled input with a ref the natural choice?', [
        ['A field that must be validated on every keystroke', false],
        ['A file input whose chosen file you read on submit', true],
        ['A field whose value another component displays live', false],
      ], 'A file input\'s value cannot be set by code, so it is always uncontrolled. Live validation and live display both need the value in state, which is the controlled pattern.'),
    ],
  },
  {
    unitCode: 'JT_REACT_BASICS_LISTS_CONDITIONS',
    notes: `**Lists are rendered with map, and each item needs a key.** Conditional rendering is plain
JavaScript: a ternary, &&, or an early return.

## Rendering a list

    function TaskList({ tasks }) {
      return (
        <ul>
          {tasks.map(task => (
            <li key={task.id}>{task.title}</li>
          ))}
        </ul>
      );
    }

## Why keys matter

On a re-render React has a new array of li elements and must decide which old one each new one
corresponds to. The **key** is that identity. With stable ids, React knows that the item with key
42 moved from position 3 to position 1, and it moves the DOM node, keeping its state.

Using the array index as the key works only while the list never reorders, never filters, and never
inserts anywhere but the end. Otherwise index 0 now means a different item, and React reuses the
wrong DOM node — an input typed into on row one suddenly shows on another row, or a checkbox stays
ticked on the wrong task. Math.random() as a key is worse: every render creates new keys, so React
destroys and recreates every row.

Keys must be unique among siblings, not globally, and they go on the outermost element returned
from map — on the component, not inside it:

    {tasks.map(t => <TaskRow key={t.id} task={t} />)}

A key is not passed to the component as a prop; if TaskRow needs the id, pass it separately.

## Conditional rendering

    function Orders({ status, orders }) {
      if (status === 'loading') return <Spinner />;
      if (status === 'error') return <p>Could not load orders.</p>;
      return (
        <section>
          {orders.length === 0
            ? <p>No orders yet.</p>
            : <OrderTable orders={orders} />}
          {orders.length > 20 && <Pagination />}
        </section>
      );
    }

Early returns keep the main render readable. Returning null renders nothing.

## Common mistakes

- No key at all: a console warning, and subtle bugs once the list changes.
- Index keys on a sortable or deletable list.
- Using && with a number on the left (shows 0) — compare explicitly.
- Filtering with map and returning undefined for skipped items; filter first, then map.`,
    mcqs: [
      mcq('Rows contain text inputs and the list can be sorted. Which key is right?', [
        ['The array index', false],
        ['A stable id stored on each item', true],
        ['Math.random() called in map', false],
      ], 'Sorting changes positions, so index keys would map old DOM nodes (and their typed text) onto different items. A stable id keeps identity across reorders.'),
      mcq('What does a component render when it returns null?', [
        ['The text "null"', false],
        ['Nothing, and it is not an error', true],
        ['An empty div placeholder', false],
      ], 'null is a valid return value meaning "render nothing". It is the usual way to hide a component based on a condition.'),
      mcq('In {users.map(u => <UserCard key={u.id} user={u} />)}, what is props.key inside UserCard?', [
        ['The user\'s id, copied over from u.id', false],
        ['undefined, because key is not passed on as a prop', true],
        ['The index of the user in the users array', false],
      ], 'key is consumed by React for reconciliation and is not forwarded to the component. Pass the id as a separate prop if the component needs it.'),
    ],
    checkpoint: [
      mcq('A to-do list uses index keys. After deleting the first item, the checkbox ticked on item 2 now shows ticked on item 3. Why?', [
        ['Checkboxes keep their ticked state in localStorage', false],
        ['Keys shifted, so React reused DOM nodes for different items', true],
        ['Deleting an item re-ticks the next checkbox by design', false],
      ], 'After deletion each item\'s index moves up by one, so React matches the old DOM node with key 1 to what is now a different task. Stable ids prevent this.'),
      mcq('Where must the key go in tasks.map(t => <TaskRow task={t} />)?', [
        ['On the li inside TaskRow\'s own return', false],
        ['On <TaskRow key={t.id} ... /> in the map', true],
        ['On the ul element that wraps the list', false],
      ], 'React needs the key on the elements in the array it is reconciling — the direct result of map — not on something deeper inside each child.'),
      mcq('Which renders "No results" only when results is an empty array?', [
        ['{results && results !== [] && <p>No results</p>}', false],
        ['{results.length === 0 && <p>No results</p>}', true],
        ['{!results && <p>No results</p>}', false],
      ], 'An empty array is truthy, so the first and third options test the wrong thing. Compare the length explicitly.'),
    ],
  },
  {
    unitCode: 'JT_REACT_BASICS_DEBUGGING',
    notes: `**Most React fundamentals bugs fall into five shapes.** Learn to recognise the symptom,
then confirm the cause with React DevTools or a console.log in the render.

## 1. The screen does not update — mutated state

    function Tags() {
      const [tags, setTags] = useState(['react']);
      function add(tag) {
        tags.push(tag);       // mutates the existing array
        setTags(tags);        // same reference: React may skip the render
      }
    }

**How to find it:** state changes in a log but the UI does not. **Fix:** setTags([...tags, tag]).

## 2. "Too many re-renders" — setState during render

    function Price({ amount }) {
      const [total, setTotal] = useState(0);
      setTotal(amount * 1.18);   // runs on every render, which renders again
      return <p>{total}</p>;
    }

**Fix:** derive it — const total = amount * 1.18 — and delete the state. Also check handlers
written as onClick={setOpen(true)}, which call the setter during render.

## 3. Wrong row changes after delete or sort — index keys

    {items.map((item, i) => <Row key={i} item={item} />)}

**How to find it:** the bug appears only after removing or reordering items, and only for rows
that hold their own state (an input, an expanded panel). **Fix:** key={item.id}.

## 4. The count only goes up by one — stale value

    function addThree() {
      setCount(count + 1);
      setCount(count + 1);
      setCount(count + 1);
    }

**Fix:** setCount(c => c + 1) for each call.

## 5. "Objects are not valid as a React child"

    <p>{order.createdAt}</p>   // createdAt is a Date object

**Fix:** render a string: order.createdAt.toLocaleDateString().

## A method, not guessing

1. Read the full error message and the component stack under it — it names the component.
2. Reproduce with the smallest action that triggers it.
3. Open React DevTools, select the component, and watch its props and state as you click.
4. Form one hypothesis, change one thing, and check. If it did not fix it, undo it.

Changing three things at once and seeing the bug vanish teaches you nothing, and usually leaves
two unnecessary changes behind.`,
    mcqs: [
      mcq('A component throws "Too many re-renders. React limits the number of renders". Which line is the likely cause?', [
        ['const [open, setOpen] = useState(false);', false],
        ['<button onClick={setOpen(true)}>Open</button>', true],
        ['<button onClick={() => setOpen(true)}>Open</button>', false],
        ['{open && <Modal onClose={() => setOpen(false)} />}', false],
      ], 'onClick={setOpen(true)} calls the setter while rendering; that schedules a render, which calls it again, forever. Passing an arrow function defers the call to the click.'),
      mcq('After clicking "Add", the log shows the new item in the array but the list on screen is unchanged. What do you check first?', [
        ['Whether the list component is exported as the default export', false],
        ['Whether the handler mutates the array and sets the same reference', true],
        ['Whether the browser cache needs to be cleared before testing', false],
        ['Whether the key prop uses the item title', false],
      ], 'Data changed but no render happened is the signature of mutation: the array was pushed into and passed back to the setter unchanged in identity.'),
      mcq('An expanded panel opens on the wrong row only after the user deletes a row. What is the most likely cause?', [
        ['The panel uses CSS transitions that run late', false],
        ['The rows use the array index as their key', true],
        ['The delete handler uses filter, not splice', false],
        ['The panel state is a boolean', false],
      ], 'Each row keeps its own open state. When indexes shift after a delete, React pairs that state with a different item. A stable id key fixes it.'),
      mcq('Rendering <td>{user.joined}</td> throws "Objects are not valid as a React child". What is joined most likely to be?', [
        ['A string from the API', false],
        ['A Date object', true],
        ['A number of milliseconds', false],
        ['A boolean flag', false],
      ], 'Strings and numbers render fine. A Date is an object, which React refuses to render; format it first, for example with toLocaleDateString().'),
    ],
  },
  {
    unitCode: 'JT_REACT_BASICS_PRACTICE',
    notes: `**Six exercises.** Do each in a fresh Vite project or one sandbox, without copying from the
lessons. Each has a check you can run by hand.

## 1. Profile card from props

Build ProfileCard({ name, role, avatarUrl, skills }). Show the avatar with an alt text, the name,
the role, and the skills as a list. Render three cards from an array in App.
**Check:** no key warning in the console; a card with an empty skills array shows "No skills listed".

## 2. Counter with limits

A counter that starts at 0, has +1, -1 and Reset, never goes below 0 and never above 10. Disable
the buttons at the limits.
**Check:** clicking +1 rapidly ten times shows exactly 10. Use functional updates.

## 3. Controlled feedback form

Name, email, a rating select (1–5) and a comment textarea, all in one state object with one change
handler. On submit, validate that email contains @ and comment has at least 10 characters; show
errors under the fields; on success, show a thank-you message and clear the form.
**Check:** typing in one field never clears another; the page never reloads.

## 4. Filterable list

Given an array of 15 products with a category, render buttons All / Books / Electronics / Toys and
show only matching products. Keep only the selected category in state; compute the filtered list.
**Check:** there is no filteredProducts in state.

## 5. Shopping list with delete and reorder

Add items through an input, delete any item, and move an item up or down. Each item has an id
from crypto.randomUUID() and a quantity input.
**Check:** type a quantity in row 2, move it up — the quantity travels with the item.

## 6. Accordion

Five FAQ items; clicking a question opens its answer and closes any other. Keep openId in the
parent, not a boolean in each item.
**Check:** only one answer is ever open.`,
    mcqs: [
      mcq('In exercise 4, why keep only the selected category in state rather than the filtered list too?', [
        ['React cannot store arrays in state reliably', false],
        ['The filtered list is derivable, so storing it risks drift', true],
        ['StrictMode requires filtering to happen in render', false],
      ], 'Anything computable from existing state and props should be computed during render. A second copy must be updated in step and eventually is not.'),
      mcq('In the accordion, why store openId in the parent rather than an isOpen boolean in each item?', [
        ['Booleans are not allowed in child component state', false],
        ['Only the parent can ensure one item is open at a time', true],
        ['Child state is reset on every parent render', false],
      ], 'The rule "only one open" spans siblings, so the state must live in their common parent. This is lifting state up.'),
      mcq('In exercise 2, the user clicks +1 very fast. Which update keeps the count correct?', [
        ['setCount(count + 1)', false],
        ['setCount(c => Math.min(10, c + 1))', true],
        ['count++ followed by setCount(count)', false],
      ], 'The functional form always receives the latest value, so fast clicks cannot read a stale count, and Math.min enforces the limit.'),
      mcq('The shopping list uses crypto.randomUUID() for ids. Where should it be called?', [
        ['Inside map, while rendering the key', false],
        ['Once, when the item is created in the add handler', true],
        ['In the component body, at the top of every render', false],
      ], 'An id must stay the same for the life of the item. Generating it during render gives a new key every time, which remounts every row.'),
      mcq('The feedback form clears all fields after a successful submit. How is that done in a controlled form?', [
        ['Call e.target.reset() and leave state alone', false],
        ['Set the form state back to its empty initial object', true],
        ['Remove the value props after submit', false],
      ], 'In a controlled form the inputs show state, so resetting state resets the inputs. Resetting the DOM alone would be overwritten on the next render.'),
    ],
  },
  {
    unitCode: 'JT_REACT_BASICS_INTERVIEW_QUESTION',
    notes: `**Three questions that come up in almost every React fresher interview.** Practise saying
the answers aloud in under two minutes each.

## Q1. "What is the virtual DOM, and how does React update the page?"

**Model answer.** Components return a tree of plain objects describing the UI — that tree is what
people call the virtual DOM. When state or props change, React calls the affected components
again, gets a new tree, and compares it with the previous one. This is reconciliation. It applies
only the differences to the real DOM, which is the slow part to touch. Two shortcuts make the
comparison fast: if an element's type changes (a div becomes a span, or ComponentA becomes
ComponentB), React throws away that subtree and builds a new one; and in lists it matches children
by key instead of by position.

**Follow-up:** "Is the virtual DOM always faster than direct DOM updates?" No — hand-written,
targeted DOM updates can be faster. The benefit is that you get reasonably efficient updates while
writing declarative code, and you do not have to work out the changes yourself.

## Q2. "What is the difference between props and state?"

**Model answer.** Props are inputs passed from a parent; the component reads them and must not
change them. State is data the component owns and changes over time with its setter. Changing
either causes a re-render. When two siblings need the same data, the state moves up to their
common parent and comes down to both as props.

**Follow-up:** "Can a child change its parent's state?" Only indirectly — the parent passes a
function as a prop, and the child calls it.

## Q3. "Why does React need keys in a list, and why not use the index?"

**Model answer.** Keys tell React which item is which between renders, so it can move, keep or
remove the right DOM nodes and the right component state. The index is fine for a static list,
but if items are inserted, deleted or reordered, the index of an item changes, React pairs state
with the wrong item, and you see bugs like an input value jumping to another row. Use a stable id
from the data.

**Follow-up:** "What happens if two siblings share a key?" React warns, and the update behaviour
for those two becomes unpredictable — one may be dropped or duplicated.`,
    mcqs: [
      mcq('During reconciliation, what does React do when an element\'s type changes from <div> to <section> at the same position?', [
        ['Changes the tag name on the existing DOM node', false],
        ['Unmounts the old subtree and builds a new one', true],
        ['Keeps the div and adds the section beside it', false],
      ], 'Different element types are assumed to produce different trees, so React tears down the old subtree (losing its state) and mounts a fresh one.'),
      mcq('An interviewer asks how a child can update state owned by its parent. What is the accurate answer?', [
        ['By assigning to props, which writes back to the parent', false],
        ['By calling a function the parent passed down as a prop', true],
        ['By importing the parent\'s useState from its module', false],
      ], 'State belongs to the component that declares it. The parent exposes a callback prop, and the child calls it to request the change.'),
      mcq('When is using the array index as a key acceptable?', [
        ['When the list is very long and ids are slow to read', false],
        ['When the list is static and never reordered or filtered', true],
        ['When the items are objects rather than strings', false],
      ], 'If positions never change, index and identity coincide. The problems only appear when items move, are inserted, or are removed.'),
    ],
  },
  {
    unitCode: 'JT_REACT_BASICS_MINI_PROJECT',
    notes: `**Build a task list in React.** This brief is the specification; the rubric in the
assignment is how it is marked.

## What it does

A single-page task manager. The user can add a task, mark it complete, edit its title, delete it,
and filter the list by All, Active or Completed. A footer shows how many tasks are left.

## Required structure

- **App** — owns the tasks array and the current filter in state.
- **TaskForm** — a controlled input and an Add button. Rejects empty or whitespace-only titles
  and shows a message.
- **TaskList** — receives the visible tasks and renders a TaskItem for each, keyed by task id.
- **TaskItem** — a checkbox, the title, Edit and Delete buttons. In edit mode it shows a
  controlled input with Save and Cancel; Enter saves, Escape cancels.
- **FilterBar** — three buttons; the active one is visually marked.

Each task is { id, title, done } with id from crypto.randomUUID().

## Rules

- No state is mutated: add, toggle, edit and delete each produce a new array.
- The visible list and the "items left" count are computed, not stored.
- Children change data only by calling callbacks passed from App.
- No index keys.

## Acceptance criteria

1. Adding "  " shows an error and adds nothing.
2. Adding three tasks, completing the second, and choosing Active shows two tasks.
3. Editing a task and pressing Escape restores the original title.
4. Deleting the first task while editing the third leaves the third in edit mode.
5. "2 items left" is correct after every action, including with filter Completed selected.
6. No warnings in the browser console.

## Stretch

Persist tasks to localStorage so a refresh keeps them, and add a "Clear completed" button.

## Submission

A GitHub repository with a README describing the component tree, plus either a deployed link or a
short screen recording of the acceptance criteria.`,
    mcqs: [
      mcq('In the task list, where should the "items left" number come from?', [
        ['A separate leftCount state updated in every handler', false],
        ['tasks.filter(t => !t.done).length computed during render', true],
        ['A counter stored in TaskItem and summed by App', false],
      ], 'The count is fully derivable from tasks. Computing it during render guarantees it is right after every action, including ones added later.'),
      mcq('Acceptance criterion 4 (deleting another task leaves edit mode on the third) mainly tests what?', [
        ['That delete uses splice rather than filter on the array', false],
        ['That TaskItem is keyed by a stable id, not the index', true],
        ['That edit mode is stored in localStorage', false],
      ], 'Edit mode is state inside a TaskItem. With index keys, deleting an earlier task shifts that state onto a different task; id keys keep it with its task.'),
    ],
    assignment: {
      title: 'Mini Project — A React Task List',
      description: 'Build a task manager in React 18 with function components: add, complete, edit, delete and filter tasks, with state owned by App and passed down through props.',
      instructions: `Build the app described in the unit brief with Vite and React 18.

1. Components: App, TaskForm, TaskList, TaskItem and FilterBar, each in its own file.
2. App owns tasks and filter in state. Children receive data as props and change it only through callbacks.
3. Every update creates a new array or object; nothing is mutated.
4. The visible tasks and the items-left count are computed during render.
5. TaskForm is a controlled form that rejects empty titles with a visible message.
6. TaskItem supports inline editing with Save/Cancel, Enter and Escape.
7. Keys are task ids from crypto.randomUUID().

Submit a GitHub link with a README that draws the component tree and says which component owns which state, plus a deployed URL or a recording that walks through all six acceptance criteria.`,
      rubric: [
        { criterion: 'Features work', description: 'Add, complete, edit (with cancel), delete and all three filters behave as the acceptance criteria describe.', maxPoints: 30 },
        { criterion: 'State and data flow', description: 'State lives in App; children use props and callbacks; nothing derivable is stored; no mutation anywhere.', maxPoints: 25 },
        { criterion: 'Lists and keys', description: 'Stable id keys; edit state stays with the right task after delete and filter; no console warnings.', maxPoints: 15 },
        { criterion: 'Controlled forms and validation', description: 'Inputs are controlled; empty titles are rejected with a message; Enter and Escape work in edit mode.', maxPoints: 15 },
        { criterion: 'Code quality and README', description: 'Small focused components, clear names, and a README with the component tree and state ownership explained.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
  },
  {
    unitCode: 'JT_REACT_BASICS_CHECKPOINT',
    notes: `**Ten questions across React fundamentals:** components, JSX, props, state, events and
forms, lists and conditions. Each is a scenario or a short piece of code to read. Answer from
what the code does, not what it was meant to do.`,
    checkpoint: [
      mcq('A teammate renders <navbar /> and sees nothing, though function navbar() returns a nav. What is the fix?', [
        ['Export navbar as the default export', false],
        ['Rename it Navbar and render <Navbar />', true],
        ['Wrap the nav in a fragment', false],
      ], 'Lowercase JSX tags are treated as HTML elements, so React creates an unknown <navbar> element. Components must be capitalised.'),
      mcq('What does {unread && <span>{unread} new</span>} render when unread is 0?', [
        ['Nothing', false],
        ['0', true],
        ['0 new', false],
      ], '0 && x evaluates to 0, and React renders numbers, so a stray 0 appears. Write unread > 0 && ... instead.'),
      mcq('A Child receives count from its Parent and runs props.count++ on click. What happens?', [
        ['The parent re-renders with the new count', false],
        ['Nothing visible; props must not be mutated', true],
        ['React throws an error on every click', false],
      ], 'Props are read-only; incrementing a local copy does not touch the parent\'s state or trigger a render. The parent must pass a callback such as onIncrement.'),
      mcq('Inside one click handler: setA(1); setB(2); setC(3). How many re-renders does React 18 perform?', [
        ['Three, one for each setter call', false],
        ['One, because the updates are batched', true],
        ['Zero until the next click', false],
      ], 'React 18 batches state updates within the same event (and, with createRoot, inside timeouts and promises too), producing a single render.'),
      mcq('With qty at 2, a handler runs setQty(q => q + 1); setQty(q => q + 1);. What is qty after the render?', [
        ['3', false],
        ['4', true],
        ['2', false],
      ], 'Functional updates are queued and each receives the result of the previous one: 2 → 3 → 4.'),
      mcq('A search box has value={query} onChange={e => setQuery(e.target.value.toUpperCase())}. What does the user see while typing?', [
        ['Their text as typed, uppercased only on submit', false],
        ['Their text appears in capitals as they type', true],
        ['The box stays empty because value is overridden', false],
      ], 'In a controlled input the displayed value is whatever state holds, and state is set to the uppercased text on every keystroke.'),
      mcq('An app keeps both selectedId and selectedUser (a copy of the user object) in state, and the panel shows an old name after an edit. Best fix?', [
        ['Update selectedUser in a timeout after the edit', false],
        ['Store only selectedId and look the user up during render', true],
        ['Add a key to the panel equal to the user name', false],
      ], 'The copy goes stale when the original changes. Storing the id and deriving the object keeps one source of truth.'),
      mcq('A list renders {comments.map(c => <Comment key={Math.random()} {...c} />)}. What is the effect?', [
        ['Keys are unique, so updates are efficient', false],
        ['Every render remounts every Comment, losing its state', true],
        ['React reuses the keys from the previous render', false],
      ], 'Random keys change every render, so React sees all-new items, unmounts the old ones and mounts new ones: slow, and any local state is reset.'),
      mcq('A login form\'s submit handler calls onLogin(form) but the page refreshes first. Where is the bug?', [
        ['onLogin should be an async function', false],
        ['The handler does not call e.preventDefault()', true],
        ['The button must be type="button"', false],
      ], 'A form\'s default submit action navigates. preventDefault stops it so the React handler can run. type="button" would stop the submit event entirely.'),
      mcq('In <Layout title="Home"><Dashboard /></Layout>, how does Layout show the Dashboard?', [
        ['By rendering {props.children}', true],
        ['By importing Dashboard itself', false],
        ['By rendering {props.Dashboard}', false],
      ], 'Content between a component\'s tags is passed as the children prop. Layout renders it without knowing what it is, which is what makes it reusable.'),
    ],
  },

  /* ══ JT_REACT_HOOKS ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_REACT_HOOKS_USE_EFFECT',
    notes: `**useEffect runs code after React has updated the screen.** It is for synchronising with
something outside React: a network request, a timer, a subscription, document.title, a browser
API. Calculations from props and state do not belong in it.

    useEffect(() => {
      // runs after render
      return () => {
        // cleanup: runs before the next effect run, and on unmount
      };
    }, [dependencies]);

## The dependency array decides when

- **No array** — after every render. Rarely what you want.
- **[]** — after the first render only (mount), cleanup on unmount.
- **[userId]** — after the first render and again whenever userId changes.

Every value from the component that the effect reads — props, state, functions defined in the
component — belongs in the array. Leaving one out means the effect keeps using the value from the
render where it last ran: a **stale closure**. The eslint-plugin-react-hooks rule
exhaustive-deps catches this; keep it on.

## Fetching with cleanup

    function UserProfile({ userId }) {
      const [user, setUser] = useState(null);
      const [error, setError] = useState(null);

      useEffect(() => {
        const controller = new AbortController();
        setUser(null);
        fetch('/api/users/' + userId, { signal: controller.signal })
          .then(res => {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
          })
          .then(setUser)
          .catch(err => {
            if (err.name !== 'AbortError') setError(err.message);
          });
        return () => controller.abort();
      }, [userId]);

      if (error) return <p>{error}</p>;
      if (!user) return <p>Loading…</p>;
      return <h2>{user.name}</h2>;
    }

If userId changes from 1 to 2 quickly, the cleanup aborts request 1, so its late answer cannot
overwrite user 2. That out-of-order response is a classic race condition.

## Timers and subscriptions

    useEffect(() => {
      const id = setInterval(() => setSeconds(s => s + 1), 1000);
      return () => clearInterval(id);
    }, []);

The functional update means the effect does not read seconds, so [] is honest.

## StrictMode runs it twice in development

In development, React 18's StrictMode mounts each component, runs effects, runs their cleanups,
then runs the effects again. This is deliberate: an effect without correct cleanup shows up as two
intervals or two subscriptions. It does not happen in production. The fix is a proper cleanup,
not removing StrictMode.

## Common mistakes

- Setting state in an effect that depends on that same state with no condition: an infinite loop.
- Making the effect callback async. It must return a cleanup function or nothing, not a promise;
  define an async function inside and call it.
- Using an effect to compute derived values (fullName from first and last). Compute in render.`,
    mcqs: [
      mcq('An effect has the dependency array [query]. When does it run?', [
        ['Only once, when the component first mounts', false],
        ['After mount and after any render where query changed', true],
        ['Before every render, whether or not query changed', false],
      ], 'React runs the effect after the first commit and then after each commit in which a dependency is different (compared with Object.is) from the previous render.'),
      mcq('In development, a mount effect logs "connected" twice. The app uses StrictMode. What is going on?', [
        ['A bug in React that production builds also show', false],
        ['StrictMode mounts, cleans up and re-runs effects to expose missing cleanup', true],
        ['The component is rendered twice by two different parent components', false],
      ], 'React 18 StrictMode deliberately simulates unmount and remount in development so an effect that does not clean up properly shows its problem early.'),
      mcq('Why is useEffect(async () => { ... }, [id]) a problem?', [
        ['async functions cannot call fetch from inside an effect', false],
        ['It returns a promise where React expects a cleanup or nothing', true],
        ['React awaits the promise and blocks the next render', false],
      ], 'An effect\'s return value is treated as its cleanup. An async function always returns a promise, which React cannot call. Define an async function inside and invoke it.'),
    ],
    checkpoint: [
      mcq('A chat component subscribes to a room in an effect with [roomId] but has no cleanup. The user switches rooms twice. What happens?', [
        ['Only the latest room is subscribed, as React replaces it', false],
        ['All three subscriptions stay active and messages pile up', true],
        ['React unsubscribes the old rooms automatically', false],
      ], 'Without a cleanup nothing unsubscribes. Each roomId change adds another subscription. Return a function that unsubscribes from the previous room.'),
      mcq('Which effect starts a one-second ticker that is not reset on every render?', [
        ['useEffect(() => { const t = setInterval(tick, 1000); return () => clearInterval(t); }, [])', true],
        ['useEffect(() => { const t = setInterval(tick, 1000); return () => console.log(t); })', false],
        ['useEffect(() => { const t = setInterval(tick, 1000); }, [count, tick])', false],
      ], 'An empty array runs the effect once on mount and its cleanup on unmount. The others create a new interval on every render or on every count change without clearing the old one.'),
      mcq('An effect fetches /api/products?page= + page but its array is []. The user clicks Next. What happens?', [
        ['Page 2 loads, because page is read inside the effect', false],
        ['Nothing new loads; the effect only ran for the first page', true],
        ['React throws a missing-dependency error at runtime', false],
      ], 'With [] the effect runs once and never again. page must be in the dependency array. The lint rule warns, but React itself does not throw.'),
    ],
  },
  {
    unitCode: 'JT_REACT_HOOKS_RULES_OF_HOOKS',
    notes: `**Two rules, and one reason behind both.**

1. **Call hooks only at the top level** of a component or custom hook — not inside if, loops,
   nested functions, or after an early return.
2. **Call hooks only from React function components or custom hooks** — not from ordinary
   functions, event handlers or class components.

## Why the order matters

React does not know your hooks by name. It stores each component's hook data in a list and
matches them by **call order**: the first useState call gets slot 1, the second gets slot 2, and so
on. If one render calls three hooks and the next calls two, every hook after the missing one reads
the wrong slot.

    function Profile({ user }) {
      if (!user) return <p>Sign in</p>;          // early return...
      const [tab, setTab] = useState('posts');  // ...so this hook is sometimes skipped
      ...
    }

When user goes from null to an object, this component suddenly calls one more hook than before,
and React throws "Rendered more hooks than during the previous render".

## Restructuring

Move hooks above any early return:

    function Profile({ user }) {
      const [tab, setTab] = useState('posts');
      if (!user) return <p>Sign in</p>;
      ...
    }

Put the condition **inside** the hook instead of around it:

    useEffect(() => {
      if (!isOpen) return;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

If a hook is needed only in some cases, move it into a child component that is rendered in those
cases. The child then always calls its hooks in the same order when it exists.

## Common mistakes

- Calling useState inside a map callback to give each row state. Make each row a component.
- Calling a hook inside an onClick handler. Hooks run during render; the handler can only call
  setters a hook already returned.
- Naming a helper useSomething when it calls no hooks, or calling hooks from a helper whose name
  does not start with use — the lint rule then cannot check it.

The ESLint rule rules-of-hooks reports all of these. Treat its errors as build failures.`,
    mcqs: [
      mcq('How does React know which useState call a stored value belongs to?', [
        ['By the variable name on the left of the call', false],
        ['By the order in which hooks are called each render', true],
        ['By a hidden id the compiler adds to each call', false],
      ], 'Hook state is kept in a per-component list indexed by call order. That is why the order must be identical on every render.'),
      mcq('A component calls useState inside if (isEditing). What fails when isEditing changes?', [
        ['Only the first render, after which React adapts', false],
        ['Hook slots shift, so later hooks read the wrong state', true],
        ['Nothing, provided the hook is the last one called', false],
      ], 'When the conditional hook appears or disappears the number of hooks changes, and React either throws or pairs later hooks with the wrong stored values.'),
      mcq('Each row of a table needs its own expanded state. What respects the rules of hooks?', [
        ['Call useState inside rows.map for each row', false],
        ['Make a Row component that calls useState itself', true],
        ['Call useState in a for loop before the return', false],
      ], 'Hooks cannot be called in loops or callbacks. Turning each row into a component gives every instance its own top-level useState.'),
    ],
    checkpoint: [
      mcq('After login, a component throws "Rendered more hooks than during the previous render". What is the likely structure?', [
        ['A hook is called after an early return for logged-out users', true],
        ['The component uses two useState calls with the same initial value', false],
        ['A useEffect has an empty dependency array', false],
      ], 'Logged out, the early return skipped the later hook; logged in, it runs. The hook count changed between renders, which React detects and reports.'),
      mcq('Which is a legal way to lock scrolling only while a modal is open?', [
        ['if (open) { useEffect(lockScroll, []); }', false],
        ['useEffect(() => { if (!open) return; ... }, [open])', true],
        ['const lock = () => useEffect(lockScroll); lock();', false],
      ], 'The hook is always called; the condition lives inside the effect body. The others call useEffect conditionally or from a nested function.'),
      mcq('A plain helper function formatUser(user) calls useContext(LocaleContext). It is called from a component. What is wrong?', [
        ['Nothing; any function may call hooks as long as a component calls it', false],
        ['Only components and use... functions may call hooks; rename it', true],
        ['useContext cannot be called outside a Provider; wrap it in one', false],
      ], 'React relies on the use prefix (and the linter enforces it) so hook calls can be checked for order. A function that calls hooks is a custom hook and should be named and called like one.'),
    ],
  },
  {
    unitCode: 'JT_REACT_HOOKS_CONTEXT',
    notes: `**Context passes a value to every component below a provider without threading it
through props at each level.** It suits values that many components at different depths need:
the logged-in user, the theme, the language.

## Prop drilling, the problem

App has user; Header needs it; Header passes it to Nav; Nav passes it to Avatar. Nav never uses
user — it only forwards it. Three levels is tolerable; eight is how bugs and churn happen.

## The three pieces

    // AuthContext.jsx
    import { createContext, useContext, useState, useMemo } from 'react';

    const AuthContext = createContext(null);

    export function AuthProvider({ children }) {
      const [user, setUser] = useState(null);
      const value = useMemo(() => ({
        user,
        login: (u) => setUser(u),
        logout: () => setUser(null),
      }), [user]);
      return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
    }

    export function useAuth() {
      const ctx = useContext(AuthContext);
      if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
      return ctx;
    }

    // main.jsx
    <AuthProvider><App /></AuthProvider>

    // Avatar.jsx — any depth
    function Avatar() {
      const { user, logout } = useAuth();
      return user ? <button onClick={logout}>{user.name}</button> : null;
    }

The custom useAuth hook hides the context object and fails loudly if a component is rendered
outside the provider.

## What re-renders

When the provider's value changes (compared with Object.is), **every component that reads that
context re-renders**, even if it uses only part of the value. That is why value is memoised above:
without useMemo, a new object is created on each AuthProvider render and every consumer re-renders
each time, whether or not user changed.

## When context is the wrong tool

- **Frequently changing values** (a text field's contents, mouse position) shared widely —
  every consumer re-renders on every change.
- **Avoiding two levels of props.** Passing props two levels is fine and clearer.
- **Large, complex shared state** with many updates and derived values — a store such as Redux
  Toolkit or Zustand gives selective subscriptions and devtools.

Splitting contexts helps too: a ThemeContext and an AuthContext change independently, so a theme
change does not re-render components that only care about the user.

## Common mistakes

- Using the context with no provider above: you silently get the default value from createContext.
- Passing a new object literal as value on every render.
- Putting everything in one giant AppContext.`,
    mcqs: [
      mcq('What does useContext(ThemeContext) return when there is no ThemeContext.Provider above the component?', [
        ['It throws an error', false],
        ['The default value passed to createContext', true],
        ['undefined, whatever the default was', false],
      ], 'Without a provider, useContext returns the default given to createContext. That silent fallback is why a custom hook that throws on null is a useful guard.'),
      mcq('A provider renders value={{ user, setUser }}. Its parent re-renders for unrelated reasons. What happens to consumers?', [
        ['Nothing, since user has not changed', false],
        ['They all re-render, because value is a new object', true],
        ['Only the consumers that call setUser re-render', false],
      ], 'An object literal is a new reference on every render, so React sees a changed value and re-renders every consumer. Memoise it with useMemo.'),
      mcq('Which use of context is the poorest fit?', [
        ['The current theme, read by many components at many depths', false],
        ['A search box\'s text, updated on every keystroke for the whole app', true],
        ['The logged-in user shown in the header and settings', false],
      ], 'Every consumer re-renders whenever the value changes. A per-keystroke value broadcast across the tree causes widespread re-renders; keep it local or use a store with selectors.'),
    ],
    checkpoint: [
      mcq('Header, Sidebar and Settings all need the current user; App is the only component with it, three levels up. What is the cleanest approach?', [
        ['Store the user on window and read it from any component', false],
        ['Provide it with an AuthProvider and read it with useContext', true],
        ['Copy the user into local state inside each component', false],
      ], 'Context delivers one value to many components at different depths without forwarding props through components that do not use them.'),
      mcq('A ThemeContext value changes from "light" to "dark". Which components re-render because of the change?', [
        ['Every component in the app, provider or not', false],
        ['Components that read ThemeContext, and their children', true],
        ['Only the Provider component itself and its parent', false],
      ], 'React re-renders the consumers of that context. Their child components re-render as normal children do; unrelated branches that do not read it are not affected by the context change.'),
      mcq('Why wrap useContext(CartContext) in a useCart hook that throws when the value is null?', [
        ['It makes context updates reach consumers faster', false],
        ['A missing provider fails loudly instead of returning null silently', true],
        ['React requires every context object to be read through such a hook', false],
      ], 'With createContext(null) and no provider, consumers get null and fail somewhere confusing. The guard points straight at the cause.'),
    ],
  },
  {
    unitCode: 'JT_REACT_HOOKS_USE_REF_MEMO',
    notes: `**Three hooks with different jobs.** useRef holds a value that survives renders without
causing them. useMemo caches a computed value. useCallback caches a function.

## useRef: a box that does not re-render

    const ref = useRef(initialValue);   // ref.current

Changing ref.current does **not** trigger a render. Two uses:

**Reaching a DOM node:**

    function SearchBar() {
      const inputRef = useRef(null);
      useEffect(() => { inputRef.current.focus(); }, []);
      return <input ref={inputRef} placeholder="Search" />;
    }

**Keeping a mutable value** such as a timer id or the previous value:

    function Stopwatch() {
      const [ms, setMs] = useState(0);
      const timerRef = useRef(null);
      const start = () => {
        if (timerRef.current) return;
        timerRef.current = setInterval(() => setMs(m => m + 100), 100);
      };
      const stop = () => {
        clearInterval(timerRef.current);
        timerRef.current = null;
      };
      return <p>{ms} ms <button onClick={start}>Start</button><button onClick={stop}>Stop</button></p>;
    }

If something must appear on screen, it belongs in state. A ref shown in JSX goes stale, because
changing it does not re-render.

## useMemo: cache an expensive result

    const visible = useMemo(
      () => products.filter(p => p.name.toLowerCase().includes(query.toLowerCase())),
      [products, query]
    );

React recomputes only when a dependency changes. Worth it when the calculation is genuinely slow
(thousands of items, heavy sorting), or when you need a stable object reference.

## useCallback: cache a function

    const handleSelect = useCallback(id => setSelected(id), []);
    <ProductRow onSelect={handleSelect} />   // ProductRow wrapped in React.memo

A function defined in a component is a new function every render. That only matters when
something compares it: a child wrapped in **React.memo**, or a dependency array. useCallback(fn,
deps) is the same as useMemo(() => fn, deps).

## When memoising actually helps

Memoisation is not free — React must store values and compare dependencies every render. Use it
when the React DevTools Profiler shows a slow component, when a memo child re-renders because of
a new function prop, or when an effect re-runs because an object dependency is recreated. Wrapping
every function in useCallback "for performance" usually adds cost and noise.

## Common mistakes

- Expecting a ref change to update the screen.
- Reading ref.current of a DOM ref during render; it is null until React commits.
- useCallback on a handler passed to a plain DOM element — nothing compares it.
- Missing dependencies in useMemo/useCallback, which freezes stale values.`,
    mcqs: [
      mcq('A component stores a click count in useRef and shows {countRef.current} in JSX. After clicks, what does the screen show?', [
        ['The updated count after each click, as usual', false],
        ['The old number, since changing a ref does not re-render', true],
        ['An error, because ref values cannot be rendered', false],
      ], 'ref.current changes silently. The JSX only reflects it when something else causes a render. Values shown on screen belong in state.'),
      mcq('What does useCallback(fn, [a]) give you that a plain inline function does not?', [
        ['A function that runs faster', false],
        ['The same function reference until a changes', true],
        ['A function that can be called during render', false],
      ], 'useCallback returns the cached function while dependencies are unchanged. The benefit is reference stability for memo children and dependency arrays, not speed of execution.'),
      mcq('When is useMemo most clearly justified?', [
        ['Adding two numbers that arrive as props', false],
        ['Sorting 10,000 rows while other state changes often', true],
        ['Formatting one date string for display in a heading', false],
      ], 'Memoising cheap work costs more than it saves. A heavy computation whose inputs rarely change while other state changes often is the textbook case.'),
    ],
    checkpoint: [
      mcq('A memoised ProductRow (React.memo) still re-renders every time the parent renders. The parent passes onSelect={(id) => setSel(id)}. What fixes it?', [
        ['Wrap ProductRow in a second React.memo call', false],
        ['Pass onSelect from useCallback(id => setSel(id), [])', true],
        ['Move setSel into a useRef and pass the ref instead', false],
      ], 'React.memo compares props shallowly. A new arrow function each render is a changed prop, so memo never skips. useCallback keeps the reference stable.'),
      mcq('A component reads inputRef.current.value in its render body on the first render and crashes. Why?', [
        ['Refs only work on class components', false],
        ['The ref is still null during the first render', true],
        ['value is not a property of input elements', false],
      ], 'React attaches the DOM node to the ref after it commits the render. Read DOM refs in effects or event handlers, not during render.'),
      mcq('Which needs useRef rather than useState?', [
        ['The id of a running setInterval, used only to clear it', true],
        ['A counter displayed in the heading', false],
        ['The selected tab that changes the visible panel', false],
      ], 'The interval id is never shown and changing it should not re-render. Anything that affects what is rendered belongs in state.'),
    ],
  },
  {
    unitCode: 'JT_REACT_HOOKS_CUSTOM_HOOKS',
    notes: `**A custom hook is a function whose name starts with use and which calls other hooks.**
It lets several components share stateful logic. It does not share state: each component that
calls the hook gets its own independent copy.

## useLocalStorage

    function useLocalStorage(key, initialValue) {
      const [value, setValue] = useState(() => {
        try {
          const stored = localStorage.getItem(key);
          return stored !== null ? JSON.parse(stored) : initialValue;
        } catch {
          return initialValue;
        }
      });

      useEffect(() => {
        localStorage.setItem(key, JSON.stringify(value));
      }, [key, value]);

      return [value, setValue];
    }

    // usage
    const [theme, setTheme] = useLocalStorage('theme', 'light');

The function passed to useState is a **lazy initialiser**: it runs only on the first render, so
localStorage is not read again on every render.

## useFetch

    function useFetch(url) {
      const [state, setState] = useState({ data: null, loading: true, error: null });

      useEffect(() => {
        const controller = new AbortController();
        setState({ data: null, loading: true, error: null });
        fetch(url, { signal: controller.signal })
          .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
          .then(data => setState({ data, loading: false, error: null }))
          .catch(err => {
            if (err.name !== 'AbortError') setState({ data: null, loading: false, error: err.message });
          });
        return () => controller.abort();
      }, [url]);

      return state;
    }

    function Orders() {
      const { data, loading, error } = useFetch('/api/orders');
      if (loading) return <Spinner />;
      if (error) return <p>{error}</p>;
      return <OrderTable orders={data} />;
    }

The component reads like a description of the screen; the request mechanics live in one place and
are fixed once.

## Designing a good hook

- **Return what the caller needs** — a value and a setter as an array when it mirrors useState,
  an object when there are several named fields.
- **Take inputs as arguments**, and list them in your effects' dependencies.
- **Keep JSX out.** A hook returns data and functions; a component returns UI.
- **Follow the rules of hooks inside it**, and call it only at the top level of components.

## Common mistakes

- Expecting two components that call useCounter() to share the count. They each get their own;
  shared state needs lifting or context.
- Naming it fetchData instead of useFetch — the linter can no longer check its hook calls.
- Passing an object literal as an argument that ends up in a dependency array, so the effect
  re-runs on every render.`,
    mcqs: [
      mcq('Two components both call useCounter(). One increments. What happens to the other\'s count?', [
        ['It increments too, since they share the hook', false],
        ['It is unchanged; each call has its own state', true],
        ['It resets to the initial value', false],
      ], 'A custom hook shares logic, not state. Each component that calls it gets separate hook slots. Sharing state needs lifting up or context.'),
      mcq('Why pass a function to useState(() => readFromStorage()) instead of useState(readFromStorage())?', [
        ['The function form makes the stored state read-only', false],
        ['The function runs only on the first render, not every render', true],
        ['useState only accepts functions when storing strings', false],
      ], 'useState(readFromStorage()) calls readFromStorage on every render and discards the result after the first. The lazy initialiser avoids that repeated work.'),
      mcq('What makes a function a custom hook rather than a helper?', [
        ['It returns JSX', false],
        ['It is named use... and calls other hooks', true],
        ['It is exported from a file in a hooks folder', false],
      ], 'The use prefix plus calling hooks is the definition. It lets React\'s lint rule check hook order inside it and at every call site.'),
    ],
    checkpoint: [
      mcq('useFetch(url) is called as useFetch("/api/items?page=" + page). The user changes page. What should the hook do?', [
        ['Keep the first response, because the effect ran once', false],
        ['Abort the old request and fetch the new url', true],
        ['Fetch both and merge the results', false],
      ], 'url is a dependency of the hook\'s effect. When it changes, the cleanup aborts the stale request and the effect fetches the new page.'),
      mcq('A hook useFilters(options) puts options in an effect\'s dependencies, and the caller writes useFilters({ sort: "asc" }). What happens?', [
        ['The effect runs once, since the object\'s contents never change', false],
        ['The effect re-runs every render, since the object is new each time', true],
        ['React deep-compares the object and skips the effect run', false],
      ], 'Dependencies are compared by reference. An inline object literal is a new reference each render. Depend on options.sort, or have the caller memoise the object.'),
      mcq('Which is a sensible custom hook to extract?', [
        ['useHeader() returning the header\'s JSX', false],
        ['useDebounce(value, ms) returning the debounced value', true],
        ['useAdd(a, b) returning a + b with no hooks inside', false],
      ], 'useDebounce wraps state and an effect with a timer, which several components can reuse. A hook should return data, not JSX, and a pure calculation needs no hook.'),
    ],
  },
  {
    unitCode: 'JT_REACT_HOOKS_DEBUGGING',
    notes: `**Hook bugs cluster into a few patterns.** Each has a recognisable symptom.

## 1. Infinite loop — effect sets what it depends on

    useEffect(() => {
      setFilters({ ...filters, ready: true });
    }, [filters]);

Each run creates a new filters object, which changes the dependency, which runs the effect again.
**Symptom:** the browser freezes or the Network tab fills with the same request.
**Fix:** ask whether the effect is needed at all; usually this is derived data. Otherwise depend
on a primitive and guard with a condition.

A quieter version: an object or function defined in the component body and listed as a dependency.

    const options = { limit: 20 };
    useEffect(() => { load(options); }, [options]);   // new object every render

**Fix:** move options inside the effect, or outside the component, or useMemo it.

## 2. Stale closure — missing dependency

    function Ticker() {
      const [count, setCount] = useState(0);
      useEffect(() => {
        const id = setInterval(() => setCount(count + 1), 1000);
        return () => clearInterval(id);
      }, []);
    }

The interval's callback captured count = 0 forever, so the display sticks at 1.
**Fix:** setCount(c => c + 1), which does not read count at all.

## 3. Hook called conditionally

    function Cart({ items }) {
      if (items.length === 0) return <Empty />;
      const total = useMemo(() => sum(items), [items]);
    }

**Symptom:** "Rendered more/fewer hooks than during the previous render" when the cart empties or
fills. **Fix:** move useMemo above the early return.

## 4. Doubled effects in development

**Symptom:** two console logs, two WebSocket connections, two analytics events — in dev only.
**Cause:** StrictMode's mount, unmount, remount check. **Fix:** a cleanup that undoes the effect
(close the socket, clear the timer). If the cleanup is right, the remount is harmless.

## 5. Late response overwrites new data

The user types "re", then "react". The "re" response arrives last and replaces the results.
**Fix:** abort the previous request in the cleanup, or ignore it with a flag:

    useEffect(() => {
      let ignore = false;
      search(q).then(r => { if (!ignore) setResults(r); });
      return () => { ignore = true; };
    }, [q]);

## How to find it

Turn on eslint-plugin-react-hooks and read every exhaustive-deps warning. Put a console.log at the
top of the effect with its dependencies; if it fires on every render, print each dependency and
see which one changes identity. The React DevTools Profiler's "why did this render" option names
the changed prop or hook.`,
    mcqs: [
      mcq('An effect with dependency [config] runs on every render, and config is const config = { pageSize: 10 } in the component body. Why?', [
        ['pageSize is a number, which React always treats as changed', false],
        ['config is a new object each render, so the dependency always differs', true],
        ['Effects with object dependencies are skipped by React', false],
        ['StrictMode re-runs every effect on every render', false],
      ], 'React compares dependencies with Object.is. A new object literal each render is never equal to the previous one. Move it outside the component, into the effect, or memoise it.'),
      mcq('A clock shows 1 and never goes higher. The effect is setInterval(() => setSecs(secs + 1), 1000) with []. What is the cause?', [
        ['setInterval is blocked inside effect callbacks', false],
        ['The callback captured secs from the first render', true],
        ['The interval is cleared after one tick', false],
        ['setSecs cannot be called from a timer', false],
      ], 'With [] the effect never re-runs, so its callback always sees secs = 0 and keeps setting 1. A functional update (s => s + 1) avoids reading the stale value.'),
      mcq('Only in development, a page opens two WebSocket connections on load. Which change is correct?', [
        ['Remove StrictMode from main.jsx', false],
        ['Return a cleanup that closes the socket from the effect', true],
        ['Add a global flag so the effect only runs once', false],
        ['Move the connection into the render body', false],
      ], 'StrictMode\'s remount is surfacing a missing cleanup. With socket.close() in the cleanup, the first connection is closed before the second opens, and production also behaves correctly on real unmounts.'),
      mcq('Search results sometimes show the answer for an older query. Which fix addresses the cause?', [
        ['Debounce the input by 300 ms before each request', false],
        ['Ignore or abort stale requests in the effect\'s cleanup', true],
        ['Store the results in a ref instead of in state', false],
        ['Use index keys on the result list', false],
      ], 'Responses can arrive out of order. The cleanup runs when the query changes, so marking the old request ignored (or aborting it) stops its late answer from overwriting newer results. Debouncing only reduces how often it happens.'),
    ],
  },
  {
    unitCode: 'JT_REACT_HOOKS_PRACTICE',
    notes: `**Five exercises on hooks.** Build each one, then open it with StrictMode on and check
the console stays clean.

## 1. Document title

A component with a counter that sets document.title to "Clicked N times". The title must update
on every count change and reset to "CodeBegun" on unmount.

## 2. Window width hook

Write useWindowWidth() that returns window.innerWidth and updates on resize. Use it to show
"mobile" under 768px and "desktop" otherwise.
**Check:** the resize listener is removed on unmount (mount and unmount it with a toggle and watch
getEventListeners in Chrome DevTools).

## 3. Debounced search

An input whose value is debounced by 400 ms with a useDebounce(value, delay) hook; the debounced
value drives a fetch to a public API. Show loading and error states.
**Check:** typing "react" quickly sends one request, not five; old responses never overwrite new.

## 4. Theme context

A ThemeProvider with "light" | "dark" and a toggle, a useTheme hook that throws outside the
provider, and three components at different depths that read it.
**Check:** the provider value is memoised; toggling the theme re-renders only the consumers.

## 5. Focus and previous value

A form where the first invalid field is focused on submit (useRef on each input), and a usePrevious
hook that shows "was X, now Y" for a counter.
**Check:** no ref is read during render for the DOM fields.`,
    mcqs: [
      mcq('In exercise 1, which effect resets the title on unmount?', [
        ['useEffect(() => { document.title = text; }, [text]) and a second effect that sets "CodeBegun" with []', false],
        ['useEffect(() => { document.title = text; return () => { document.title = "CodeBegun"; }; }, [text])', true],
        ['useEffect(() => { document.title = text; })', false],
      ], 'The cleanup runs before each re-run and on unmount. Restoring the title there means the last thing the component does is put it back.'),
      mcq('Exercise 2 sometimes logs "can\'t perform state update" style issues and listeners pile up. What is missing?', [
        ['A dependency on window.innerWidth in the array', false],
        ['removeEventListener in the effect\'s cleanup', true],
        ['A useMemo wrapped around the width value', false],
      ], 'Every addEventListener in an effect needs a matching removeEventListener in its cleanup with the same function reference.'),
      mcq('In useDebounce(value, delay), what should the effect\'s cleanup do?', [
        ['Set the debounced value to an empty string', false],
        ['Clear the pending timeout', true],
        ['Call the API immediately', false],
      ], 'Each keystroke changes value, which runs the cleanup first. Clearing the pending timeout is exactly what makes only the last value, after a pause, get through.'),
      mcq('How does usePrevious(value) typically remember the last value without causing an extra render?', [
        ['It stores value in useState and sets it during each render', false],
        ['It writes value into a ref in an effect and returns ref.current', true],
        ['It reads the previous value from React DevTools', false],
      ], 'The effect runs after render, so during render ref.current still holds the earlier value. Writing a ref does not trigger a render.'),
      mcq('In exercise 4, why must useTheme throw when the context is null?', [
        ['Because React refuses to render a null context value', false],
        ['So a missing provider fails loudly with a clear message', true],
        ['Because toggling the theme needs an error boundary', false],
      ], 'Without the guard, a missing provider yields the default value and the bug surfaces far away. The throw names the real cause immediately.'),
    ],
  },
  {
    unitCode: 'JT_REACT_HOOKS_INTERVIEW_QUESTION',
    notes: `**Three hooks questions interviewers ask, with answers that show you have used them.**

## Q1. "What is the cleanup function in useEffect, and when does it run?"

**Model answer.** The function returned from an effect undoes what the effect set up — clears a
timer, removes a listener, closes a socket, aborts a request. React runs it before running the
effect again (when a dependency changed), and when the component unmounts. In development with
StrictMode, React 18 also runs an extra setup-cleanup-setup cycle on mount to check that the
cleanup is correct. Missing cleanups show up as memory leaks, duplicate listeners, and late
responses overwriting newer data.

**Follow-up:** "What is the order when userId changes?" React renders with the new userId,
commits it to the screen, runs the old effect's cleanup (which still sees the old userId), then
runs the new effect.

## Q2. "useMemo versus useCallback — what is the difference, and when do you use them?"

**Model answer.** useMemo caches the result of a function; useCallback caches the function itself.
useCallback(fn, deps) is equivalent to useMemo(() => fn, deps). I use useMemo for a calculation the
Profiler shows to be expensive, or to keep an object stable for a dependency array. I use
useCallback when passing a callback to a child wrapped in React.memo, or when a function is a
dependency of an effect. I do not wrap everything — memoisation has its own cost.

**Follow-up:** "Does useCallback make the function faster?" No. It keeps the reference the same
so that something comparing references can skip work.

## Q3. "When would you use Context, and when Redux?"

**Model answer.** Context is a way to pass a value deep into the tree without props. It is good
for values that change rarely — theme, locale, the logged-in user. Every consumer re-renders when
the value changes, and it has no built-in update logic or devtools. Redux Toolkit is a state
management library: a central store, reducers that describe updates, selectors so a component
re-renders only when the slice it reads changes, middleware for async work, and time-travel
devtools. I reach for it when lots of components read and update shared, frequently changing
state. Context and useReducer can cover a medium app without a library.

**Follow-up:** "Does Redux use context internally?" React-Redux uses context to pass the store,
not the state, and components subscribe to the store with selectors — which is why it avoids
re-rendering every consumer.`,
    mcqs: [
      mcq('With an effect that depends on [roomId], roomId changes from "a" to "b". What is the order?', [
        ['New effect for b, then cleanup for a', false],
        ['Render with b, cleanup for a, then effect for b', true],
        ['Cleanup for a, then render with b, then effect for b', false],
      ], 'React renders and commits first. Then, before running the new effect, it runs the previous effect\'s cleanup, which still holds the old roomId from its closure.'),
      mcq('What is useCallback(fn, deps) equivalent to?', [
        ['useMemo(() => fn, deps)', true],
        ['useMemo(fn, deps)', false],
        ['useRef(fn).current', false],
      ], 'useMemo stores whatever its factory returns. Returning fn itself caches the function, which is exactly what useCallback does. useMemo(fn, deps) would cache fn\'s result.'),
      mcq('Why does React-Redux avoid re-rendering every connected component when any part of the store changes?', [
        ['It puts the whole state in context and React skips unchanged consumers', false],
        ['Components subscribe with selectors and re-render only if their selection changed', true],
        ['It disables re-rendering until the user stops typing', false],
      ], 'The store is passed through context, but state reads go through useSelector subscriptions, which compare the selected value and only re-render when it differs.'),
    ],
  },
  {
    unitCode: 'JT_REACT_HOOKS_CHECKPOINT',
    notes: `**Ten questions across React hooks:** useEffect and cleanup, the rules of hooks, context,
useRef, useMemo and useCallback, and custom hooks. Read each snippet carefully; most wrong answers
come from assuming what the code meant instead of what it does.`,
    checkpoint: [
      mcq('useEffect(() => { console.log("ran"); }) — no dependency array. When does it log?', [
        ['Once, on mount', false],
        ['After every render', true],
        ['Only when props change', false],
      ], 'Omitting the array means the effect has no dependencies to compare, so it runs after every commit.'),
      mcq('An effect adds a scroll listener with [] and no cleanup. The component mounts and unmounts five times. How many listeners remain?', [
        ['None, React removes them on unmount', false],
        ['Five, one left behind by each mount', true],
        ['One, because addEventListener dedupes everything', false],
      ], 'React only runs the cleanup you return. Without removeEventListener, each mount leaves a listener (an inline handler is a new function, so no dedupe).'),
      mcq('useEffect(() => { setItems(data.filter(isActive)); }, [data]) exists only to filter. What is better?', [
        ['Add isActive to the dependency array as well', false],
        ['Compute const items = data.filter(isActive) during render', true],
        ['Use useLayoutEffect instead so it runs before paint', false],
      ], 'Derived data needs no effect. The effect version renders twice (once stale) and adds state that can drift from its source.'),
      mcq('function Badge({ show }) { if (!show) return null; const [n] = useState(0); ... }. What breaks?', [
        ['Nothing, null returns are allowed before hooks', false],
        ['Toggling show changes the hook count between renders', true],
        ['useState cannot be destructured with one element', false],
      ], 'The hook is skipped whenever show is false, so the number of hooks varies. Hooks must be called before any early return.'),
      mcq('A component shows {renders.current} and increments renders.current in its body. Why is the displayed number unreliable?', [
        ['Refs are reset to their initial value on every render', false],
        ['Render mutates the ref; StrictMode renders twice in dev', true],
        ['The ref stays undefined until the first effect runs', false],
      ], 'Render should be pure. In development StrictMode calls the component twice, so a ref mutated during render counts extra; writing refs belongs in effects or handlers.'),
      mcq('A LanguageProvider value is {{ lang, setLang }} written inline. A sibling timer re-renders the provider every second. What happens?', [
        ['Only the timer component re-renders', false],
        ['Every consumer of the context re-renders every second', true],
        ['Consumers re-render only when lang actually changes', false],
      ], 'The inline object is new on every provider render, so the context value changes each second and every consumer re-renders. useMemo on the value fixes it.'),
      mcq('const sorted = useMemo(() => [...rows].sort(byName), []); rows comes from props. What is the bug?', [
        ['Spreading rows first is unnecessary and slow', false],
        ['rows is not a dependency, so new rows stay unsorted', true],
        ['useMemo cannot return arrays, only primitives', false],
      ], 'With [] the memo computes once and keeps that result forever. Every value the calculation reads, here rows, must be a dependency.'),
      mcq('Which needs useCallback to be useful?', [
        ['An onClick handler passed to a plain <button> element', false],
        ['An onChange passed to a child wrapped in React.memo', true],
        ['A handler defined and used inside a useEffect', false],
      ], 'Only something that compares the function reference benefits. A memo child compares props; a DOM button does not.'),
      mcq('Two pages call useCart() — a custom hook with useState inside. A user adds an item on one page. Does the other page see it?', [
        ['Yes, a custom hook\'s state is shared by all of its callers', false],
        ['No, each call has its own state unless it reads a shared store', true],
        ['Yes, but only after a full page reload', false],
      ], 'Custom hooks reuse logic; each call site gets its own state. Sharing needs the state lifted into a provider or a store the hook reads.'),
      mcq('An effect fetches profile data for userId with no cleanup. The user switches from user 1 to user 2 quickly and sees user 1\'s data. Best fix?', [
        ['Add a 500 ms delay before each fetch call', false],
        ['Abort or ignore the old request in the cleanup', true],
        ['Remove userId from the dependency array entirely', false],
      ], 'The cleanup runs when userId changes, so it can cancel or mark the earlier request stale. Then user 1\'s late response cannot overwrite user 2.'),
    ],
  },
];
