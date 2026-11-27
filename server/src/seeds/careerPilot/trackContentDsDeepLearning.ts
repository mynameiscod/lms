/**
 * Career-track content: deep learning (Data Science + AI, batch S3).
 *
 * DS_DEEP_LEARNING — a neuron as a weighted sum plus an activation, layers and why depth needs non-linearity;
 * backpropagation and mini-batch gradient descent without the heavy algebra; PyTorch tensors, autograd,
 * nn.Module, DataLoader and the training loop; training networks well (learning rate, batch size,
 * overfitting, dropout, weight decay, early stopping, reading loss curves); convolutions and transfer learning
 * with a pretrained ResNet-18; and sequences, from RNNs and LSTMs to attention and transformers. Ends with a
 * mini project: classifying an e-commerce seller's product photos with transfer learning.
 *
 * Builds on DS_MATH_ML (gradients, gradient descent), DS_ML_WORKFLOW (splits, leakage, baselines) and
 * DS_CLASSIFICATION (logistic regression, log loss). The datasets are simulated with fixed seeds — cloud-kitchen
 * orders (make_orders), drawn product photos (make_photos) and an app-event sequence task — so every number can
 * be reproduced on a CPU in seconds. Every output shown was produced by running the code with PyTorch 2.14 (CPU),
 * transformers 5.20 (for the pretrained microsoft/resnet-18 weights from the Hugging Face Hub), scikit-learn
 * 1.9, NumPy 2.5 and pandas 3.0. The code is written for PyTorch 2.x and transformers 4.40+, and says where an API
 * changed. The torchvision route to the same pretrained model is shown but was not run here (torchvision was not
 * installed); it is marked as such.
 *
 * Two-skill topic: NEURAL_NETWORKS (topic default) and DL_TRAINING (the PYTORCH_BASICS and TRAINING_WELL units,
 * per trackSkillAttribution.ts). Every checkpoint question names its skill with ck(); the topic CHECKPOINT
 * spreads its ten over both.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const NN = 'NEURAL_NETWORKS';
const TRN = 'DL_TRAINING';

export const TRACK_DS_DEEP_LEARNING_BUNDLES: PilotBundle[] = [
  /* ── NEURONS_LAYERS ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_DEEP_LEARNING_NEURONS_LAYERS',
    notes: `You already know one neural network: **logistic regression** is a single neuron. Deep learning stacks many of
them, and the only new idea needed to make the stack worth having is a bend — a non-linear **activation** — between
the layers. This unit builds that up from one neuron to a network that solves a problem a straight line cannot.

## One neuron

A neuron takes inputs x, multiplies each by a **weight**, adds a **bias**, and passes the sum z through an
**activation function**. Will a cloud-kitchen order arrive late? Three inputs: distance (km), preparation time
(minutes) and whether it is raining.

    import numpy as np

    x = np.array([4.2, 18.0, 1.0])        # distance_km, prep_minutes, raining
    w = np.array([0.35, 0.08, 1.1])       # weights
    b = -3.5                              # bias
    z = x @ w + b
    print(round(z, 3), round(1 / (1 + np.exp(-z)), 3))

    0.51 0.625

z = 4.2 × 0.35 + 18 × 0.08 + 1 × 1.1 − 3.5 = 0.51, and the sigmoid turns it into 0.625 — a 62.5% chance the order
is late. That is exactly logistic regression. The weights here were typed in; training (next unit) is how a network
finds them.

## Activation functions

    v = np.array([-2.0, -0.5, 0.0, 1.5, 3.0])
    relu    [0.    0.    0.    1.5   3.   ]
    sigmoid [0.119 0.378 0.5   0.818 0.953]
    tanh    [-0.964 -0.462 0.    0.905 0.995]

- **ReLU**, max(0, z): the default for hidden layers. Cheap, and its slope is 1 for positive inputs, so gradients
  pass through it without shrinking.
- **Sigmoid** squeezes to (0, 1): used on the **output** of a binary classifier. Its slope is at most 0.25, which
  is why it is a poor choice for many hidden layers (next unit).
- **tanh** squeezes to (−1, 1); it still appears inside LSTMs.
- **Softmax** turns a vector of scores (**logits**) into probabilities that sum to 1 — the output of a multi-class
  classifier:

        logits = np.array([2.0, 1.0, 0.1])
        e = np.exp(logits - logits.max())       # subtracting the max avoids overflow
        print(e / e.sum())
        [0.659 0.242 0.099]

## Layers

A **layer** is many neurons reading the same inputs: a weight **matrix** W of shape (outputs × inputs) and a bias
vector. A batch of 128 rows with 20 features, through a layer of 64 neurons, is one matrix multiplication:
(128, 20) → (128, 64). A **multilayer perceptron (MLP)** chains them: input → hidden layers → output layer.

Counting parameters is a habit worth having. For a 20 → 64 → 32 → 5 network:

    20 × 64 + 64  = 1,344
    64 × 32 + 32  = 2,080
    32 × 5  + 5   =   165
    total           3,589

## Why the activation is not optional

Without an activation, two layers are one layer in disguise: W2(W1x) = (W2W1)x, a single matrix.

    rng = np.random.default_rng(0)
    W1 = rng.normal(size=(4, 3)); W2 = rng.normal(size=(2, 4))
    print(np.allclose(W2 @ (W1 @ x), (W2 @ W1) @ x))
    True

Stack a hundred linear layers and you still have a linear model. The activation is what lets each layer bend the
space the next one sees.

**XOR by hand.** No straight line separates XOR (output 1 when exactly one input is 1). Two ReLU neurons do:

    X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]])
    H = np.maximum(0, X @ np.array([[1, 1], [1, 1]]) + np.array([0, -1]))   # h1 = relu(a+b), h2 = relu(a+b-1)
    print(H @ np.array([1, -2]))                                            # output = h1 - 2·h2
    [0 1 1 0]

## A problem a line cannot solve

Two rings of points: inner ring one class, outer ring the other (think of it as any target that depends on a
*distance* from a centre, not a direction). 2,000 points, 1,500 to train.

    import torch, torch.nn as nn
    from sklearn.linear_model import LogisticRegression

    torch.manual_seed(0)
    net = nn.Sequential(nn.Linear(2, 16), nn.ReLU(),
                        nn.Linear(16, 16), nn.ReLU(),
                        nn.Linear(16, 1))                 # one logit
    print(sum(p.numel() for p in net.parameters()))       # 337

                                              test accuracy
    logistic regression                            0.46
    3 linear layers, no activations                0.46
    2 hidden ReLU layers (337 parameters)          0.99

The linear stack is exactly as good as logistic regression — chance — because it *is* a linear model.

## Output layers and losses

| Task | Last layer | Loss in PyTorch |
|---|---|---|
| Regression (delivery minutes) | Linear, 1 unit, no activation | \`nn.MSELoss\` |
| Binary (late or not) | Linear, 1 unit — a logit | \`nn.BCEWithLogitsLoss\` (applies the sigmoid inside) |
| Multi-class (cuisine of a dish) | Linear, k units — logits | \`nn.CrossEntropyLoss\` (applies softmax inside) |

The last layer outputs **logits**, and the loss applies the sigmoid or softmax itself, in a numerically stable
way. Adding your own softmax before \`CrossEntropyLoss\` is a classic bug (see the debugging unit).

## Why depth helps — and when it does not

A network with one wide enough hidden layer can approximate any reasonable function (the universal approximation
theorem), but it may need an impractical number of neurons. Depth composes features: in an image network, early
layers respond to edges, later ones to textures, parts and whole objects; in text, to characters, words and
phrases. That composition is why deep networks dominate **images, audio and text** — data with spatial or
sequential structure and huge numbers of raw inputs.

On an ordinary business **table** — orders, loans, customers — it usually does not. Gradient-boosted trees are
typically as good or better, faster and easier to explain; the PyTorch unit's network beats logistic regression on
late deliveries by 0.003 AUC. Reach for a network when the data is unstructured, or the table is huge and has
embeddings or text in it.`,
    workedExample: `**Goal: design the network for a food app that sorts new menu items into 5 cuisines (North Indian, South Indian,
Chinese, Biryani, Desserts) from 20 numeric features, and check every shape before writing a training loop.**

**Step 1 — the output decides the last layer.** Five exclusive classes: a final \`nn.Linear(…, 5)\` producing five
logits, and \`nn.CrossEntropyLoss\`, which applies the softmax itself. No softmax inside the model.

**Step 2 — choose hidden layers.** Start modest: two hidden layers, 64 then 32 units, ReLU after each.

    model = nn.Sequential(nn.Linear(20, 64), nn.ReLU(),
                          nn.Linear(64, 32), nn.ReLU(),
                          nn.Linear(32, 5))

**Step 3 — count the parameters before training.** 20×64+64 = 1,344; 64×32+32 = 2,080; 32×5+5 = 165; total
**3,589**. If the training set had 2,000 items, a network with 300,000 parameters would be a warning sign; 3,589
is reasonable.

**Step 4 — trace one batch of 128 through it.**

    (128, 20) → Linear → (128, 64) → ReLU → (128, 64)
              → Linear → (128, 32) → ReLU → (128, 32)
              → Linear → (128, 5)          ← logits, one row per item

The loss takes those (128, 5) logits and a target of shape (128,) holding class **indices** 0–4 as integers.

**Step 5 — turn logits into a prediction.** For a single item with logits [2.0, 1.0, 0.1, −1.0, −0.5],
\`torch.softmax(logits, dim=-1)\` gives the probabilities and \`argmax\` the class. The softmax is applied at
prediction time, outside the model, and never before the loss.

**Why it matters:** most "my network will not train" problems are shape or output-layer mistakes made before the
first epoch. Tracing shapes and counting parameters takes two minutes and removes them.`,
    mcqs: [
      mcq('A colleague stacks four nn.Linear layers with no activation between them on a curved problem. How will it behave?', [
        ['Exactly like one linear layer, because the layers multiply into one matrix', true],
        ['Like a deep network, since each extra layer adds capacity to bend the fit', false],
        ['Like a decision tree, because each layer splits the inputs it receives', false],
        ['It will fail to train at all, because PyTorch needs activations to run', false],
      ], 'W4(W3(W2(W1x))) collapses to a single matrix times x. On the ring data the linear stack scored 0.46, the same as logistic regression; two ReLU layers scored 0.99.'),
      mcq('Which output layer and loss suit a model that predicts whether a UPI payment will fail?', [
        ['One unit producing a logit, with BCEWithLogitsLoss', true],
        ['Two units with softmax, followed by MSELoss on them', false],
        ['One unit with ReLU, followed by CrossEntropyLoss', false],
        ['One unit with sigmoid, followed by BCEWithLogitsLoss', false],
      ], 'A binary target needs one logit; BCEWithLogitsLoss applies the sigmoid internally in a stable way. Adding a sigmoid as well applies it twice, and ReLU cannot output a negative logit.'),
      mcq('How many learnable parameters does nn.Linear(64, 32) have?', [
        ['2,080', true],
        ['2,048', false],
        ['96', false],
        ['2,112', false],
      ], 'A weight for every input–output pair (64 × 32 = 2,048) plus one bias per output (32): 2,080. 2,048 forgets the biases.'),
    ],
    checkpoint: [
      ck(NN, 'A neuron has weights [0.35, 0.08, 1.1], bias −3.5 and inputs [4.2, 18, 1]. What is its value before the activation?', [
        ['0.51', true],
        ['4.01', false],
        ['−0.59', false],
        ['0.625', false],
      ], '1.47 + 1.44 + 1.1 − 3.5 = 0.51. 4.01 forgets the bias, and 0.625 is the value after the sigmoid, not before.'),
      ck(NN, 'Why is ReLU, rather than sigmoid, the usual activation for hidden layers?', [
        ['Its slope is 1 for positive inputs, so gradients do not shrink through it', true],
        ['It outputs probabilities between 0 and 1, which every hidden layer needs', false],
        ['It is linear everywhere, so stacked layers stay easy to interpret later', false],
        ['It keeps negative values unchanged, which preserves more information', false],
      ], 'Sigmoid\'s slope is at most 0.25, so gradients shrink layer after layer. ReLU passes them through unchanged where it is active, and it is cheap to compute.'),
      ck(NN, 'On which kind of data are deep networks most clearly better than gradient-boosted trees?', [
        ['Images, audio and text, where raw inputs have spatial or sequential structure', true],
        ['Small business tables of a few thousand rows with a dozen numeric columns', false],
        ['Any table, as long as the network has at least three hidden layers in it', false],
        ['Tables with missing values, which networks handle without any preparation', false],
      ], 'Depth composes low-level patterns into higher-level ones, which suits pixels, sound and words. On ordinary tables boosted trees are usually as good or better, and simpler to run and explain.'),
    ],
  },

  /* ── BACKPROP ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_DEEP_LEARNING_BACKPROP',
    notes: `A network learns the way the gradient-descent unit's line did: compute the loss, find which way each weight
should move to reduce it, take a small step, repeat. The only difficulty is the middle part — a network has
thousands or millions of weights, buried several layers deep. **Backpropagation** is the bookkeeping that computes
all those gradients in one backward sweep.

## Forward, then backward

Take the smallest network with a hidden layer: one input, one ReLU unit, one output, squared error.

    x, y = 2.0, 3.0                       # input and target
    w1, b1, w2, b2 = 0.5, 0.0, 1.5, 0.0

    # forward
    h_pre = w1 * x + b1                   # 1.0
    h = max(0, h_pre)                     # 1.0
    yhat = w2 * h + b2                    # 1.5
    L = (yhat - y) ** 2                   # 2.25

Backward, from the loss towards the input, multiplying **local** derivatives as you go (the chain rule):

    dL_dyhat = 2 * (yhat - y)             # -3.0   how the loss changes with the output
    dL_dw2   = dL_dyhat * h               # -3.0   output = w2·h, so d/dw2 is h
    dL_dh    = dL_dyhat * w2              # -4.5   pass the blame back to the hidden unit
    dL_dhpre = dL_dh * (1 if h_pre > 0 else 0)   # -4.5   ReLU passes it through (it was active)
    dL_dw1   = dL_dhpre * x               # -9.0

PyTorch's **autograd** does exactly this for you:

    import torch
    t = {k: torch.tensor(v, requires_grad=True) for k, v in dict(w1=w1, b1=b1, w2=w2, b2=b2).items()}
    yh = t["w2"] * torch.relu(t["w1"] * x + t["b1"]) + t["b2"]
    loss = (yh - y) ** 2
    loss.backward()
    print({k: v.grad.item() for k, v in t.items()})

    {'w1': -9.0, 'b1': -4.5, 'w2': -3.0, 'b2': -3.0}

The same numbers. One step of gradient descent with learning rate 0.05 (w ← w − 0.05 × gradient) moves w1 to 0.95
and w2 to 1.65; the prediction becomes 3.135 and the loss falls from **2.25 to 0.0182**.

## The intuition worth keeping

- Each weight's gradient is "how much the loss would change if I nudged this weight", and it is the product of the
  local slopes along the path from that weight to the loss.
- A weight feeding a unit that was **inactive** (ReLU output 0) gets a zero gradient for that example — it had no
  effect, so it gets no blame.
- Backprop is efficient because it **reuses** the forward pass: the intermediate values (h, h_pre) are stored and
  each layer's gradient is built from the one after it. One backward pass costs roughly as much as two forward
  passes, for any number of weights. The price is **memory**: those stored activations are why large batches run
  out of GPU memory during training but not during prediction.

## Mini-batch gradient descent

Computing the gradient on all 10,000 rows for every step is slow; computing it on one row is noisy. The standard
compromise is the **mini-batch**: shuffle, cut the data into batches of, say, 64, and take one step per batch.

- **Iteration (step):** one batch, one gradient, one update.
- **Epoch:** one pass through all the data — ⌈10,000 / 64⌉ = **157** steps.

How noisy is a mini-batch gradient? For a simple linear model on 10,000 rows, the full-data gradient at w = 0 is
−5.948. Drawing 500 random batches of each size:

    batch size   mean of batch gradients   standard deviation
        8               -5.705                   2.85
       64               -5.951                   1.076
      512               -5.919                   0.37

Every batch gradient is an **unbiased** estimate of the full one; bigger batches are less noisy (the spread falls
roughly as 1/√batch size — 8× more rows, about 2.8× less spread). Some noise is useful: it helps the optimiser
escape poor flat regions. That trade-off is the batch-size discussion in "Training networks well".

## Vanishing and exploding gradients

Backprop multiplies one local slope per layer. Sigmoid's slope is at most 0.25, so through ten sigmoid layers the
gradient can shrink by 0.25¹⁰ ≈ **0.00000095** — the early layers barely learn. That is the **vanishing gradient**
problem, and it stalled deep networks for years. If the factors are larger than 1 the product **explodes** instead
and the loss turns into \`nan\`.

What fixed it, and what you will see in every modern architecture:

- **ReLU-family activations** in hidden layers (slope 1 where active).
- **Careful initialisation** (PyTorch's layers initialise weights scaled to their fan-in by default).
- **Normalisation layers** (batch norm in CNNs, layer norm in transformers) that keep activations in a sensible range.
- **Residual (skip) connections** — output = x + f(x) — which give the gradient a direct path back (ResNet).
- **Gradient clipping** (\`torch.nn.utils.clip_grad_norm_\`) against explosions, standard in RNN and transformer
  training.

You do not need to derive backprop for matrices in an interview. You do need to explain the chain rule as "blame
flows backwards, multiplied by each layer's local slope", say why that makes gradients vanish or explode, and name
the fixes.`,
    mcqs: [
      mcq('In the worked chain, why does w1 receive a larger gradient (−9.0) than w2 (−3.0)?', [
        ['Its gradient is multiplied by w2 = 1.5 and by the input x = 2 on the way back', true],
        ['Weights closer to the input always receive larger gradients than later ones', false],
        ['Autograd scales each gradient by the layer number, to speed up early layers', false],
        ['ReLU doubles any gradient passing through it while the unit is still active', false],
      ], 'dL/dw1 = dL/dyhat × w2 × relu′ × x = −3 × 1.5 × 1 × 2 = −9. In deep networks early-layer gradients are more often smaller, not larger — this one is large only because of these values.'),
      mcq('A dataset has 50,000 rows and the batch size is 128. How many weight updates happen in 20 epochs?', [
        ['7,820', true],
        ['391', false],
        ['6,400', false],
        ['1,000,000', false],
      ], '⌈50,000 / 128⌉ = 391 steps per epoch, the last batch being partial; 391 × 20 = 7,820. 391 is a single epoch.'),
      mcq('A ten-layer network with sigmoid hidden layers barely changes its first layers during training. What is the most likely cause?', [
        ['Vanishing gradients: each sigmoid layer multiplies the gradient by at most 0.25', true],
        ['The learning rate is too low for the first layers but right for all the later ones', false],
        ['Backpropagation only updates the last few layers unless all layers are unfrozen', false],
        ['The first layers have already converged, so their gradients are exactly zero', false],
      ], 'Ten factors of at most 0.25 shrink the gradient by about a million. ReLU activations, normalisation and residual connections are the standard fixes.'),
    ],
    checkpoint: [
      ck(NN, 'A ReLU unit outputs 0 for a training example. What gradient do the weights feeding it receive from that example?', [
        ['Zero, because the inactive unit had no effect on the loss', true],
        ['The full loss gradient, passed through the unit unchanged', false],
        ['A quarter of the gradient, as with a sigmoid at its peak', false],
        ['A random gradient, so that the unit can become active', false],
      ], 'ReLU\'s slope is 0 for negative inputs, so the chain-rule product is zero: a unit that did not influence the output gets no blame for it.'),
      ck(NN, 'Why does training a network use much more memory than making predictions with it?', [
        ['Backprop needs every layer\'s forward activations stored until the backward pass', true],
        ['Training keeps a separate copy of every weight for every example in the batch', false],
        ['The loss function needs the entire dataset in memory to compute its average', false],
        ['Gradients are stored in double precision, while weights are stored in float16', false],
      ], 'Each layer\'s gradient is computed from values saved during the forward pass. Prediction can discard them as it goes, which is also what torch.no_grad() allows.'),
      ck(NN, 'Mini-batch gradients from batches of 8 rows scatter widely around the full-data gradient. What is true of them?', [
        ['Each is an unbiased but noisy estimate; larger batches reduce the noise', true],
        ['They are biased towards zero, so small batches always learn too slowly', false],
        ['They point in a random direction unrelated to the full-data gradient', false],
        ['They are exact, since every batch is drawn from the same distribution', false],
      ], 'Averaged over many batches they match the full gradient (−5.705 to −5.951 against −5.948 in the notes); their spread falls roughly with the square root of the batch size.'),
    ],
  },

  /* ── PYTORCH_BASICS ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_DEEP_LEARNING_PYTORCH_BASICS',
    notes: `PyTorch is the framework most data-science teams and nearly all research code use for deep learning. It feels
like NumPy with two additions — **automatic gradients** and **layers with learnable weights** — and it leaves the
training loop to you. Writing that loop out by hand is the point of this unit: once you can, every model from a tiny
MLP to a fine-tuned transformer is the same five lines inside it.

## Tensors

A tensor is an n-dimensional array, like a NumPy array, that can also live on a GPU and track gradients.

    import numpy as np, torch

    a = torch.tensor([[1.0, 2.0], [3.0, 4.0]])
    print(a.shape, a.dtype, a.device)
    print(a @ a.T)
    print(torch.tensor([1, 2, 3]).dtype, torch.from_numpy(np.array([1.5, 2.5])).dtype)

    torch.Size([2, 2]) torch.float32 cpu
    tensor([[ 5., 11.],
            [11., 25.]])
    torch.int64 torch.float64

Note the dtypes: Python floats become **float32**, but a NumPy array keeps **float64**, and float64 inputs into a
float32 model raise a dtype error. Convert with \`.astype(np.float32)\` or \`.float()\`. Class labels for
\`CrossEntropyLoss\` must be **int64** (\`.long()\`).

## Autograd

Mark a tensor with \`requires_grad=True\`, compute with it, call \`.backward()\` on a scalar, and read \`.grad\`:

    w = torch.tensor(3.0, requires_grad=True)
    loss = (2 * w - 4) ** 2
    loss.backward()
    print(w.grad)                      # d/dw (2w − 4)² = 4(2w − 4) = 8
    tensor(8.)

Gradients **accumulate** in \`.grad\` across backward calls — which is why the training loop zeroes them.

## The data: late deliveries at a cloud kitchen

12,000 orders from a cloud-kitchen brand's Bengaluru outlets; 26.4% arrived late. Lateness rises with distance, with
rain on long trips, at the dinner peak when few riders are free, and with order size.

    import pandas as pd

    def make_orders(n=12000, seed=5):
        rng = np.random.default_rng(seed)
        dist = np.round(rng.gamma(2.2, 1.6, n), 1)
        prep = np.round(rng.normal(16, 5, n).clip(4, 45), 0)
        rain = (rng.random(n) < 0.18).astype(int)
        hour = rng.integers(10, 24, n)
        peak = ((hour >= 19) & (hour <= 21)).astype(int)
        riders = rng.integers(2, 15, n)               # free riders nearby at dispatch
        items = rng.integers(1, 9, n)
        z = (-3.0 + 0.35*dist + 0.06*(prep-16) + 1.2*rain*(dist > 4) + 1.0*peak*(riders < 5)
             + 0.08*items + np.where(dist > 7, 0.9, 0.0))
        late = (rng.random(n) < 1/(1+np.exp(-z))).astype(int)
        return pd.DataFrame(dict(distance_km=dist, prep_minutes=prep, raining=rain, hour=hour, peak=peak,
                                 free_riders=riders, items=items, late=late))

    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import StandardScaler
    df = make_orders()
    X = df.drop(columns="late").to_numpy(np.float32); y = df.late.to_numpy(np.float32)
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, random_state=0, stratify=y)
    sc = StandardScaler().fit(X_tr)                   # fitted on training rows only
    X_tr_s = sc.transform(X_tr).astype(np.float32); X_te_s = sc.transform(X_te).astype(np.float32)

Networks need **scaled inputs**: gradient descent struggles when one feature is in kilometres and another in
rupees (the next unit shows what happens).

## Dataset and DataLoader

    from torch.utils.data import TensorDataset, DataLoader

    torch.manual_seed(0)
    train_ds = TensorDataset(torch.from_numpy(X_tr_s), torch.from_numpy(y_tr))
    train_dl = DataLoader(train_ds, batch_size=64, shuffle=True)
    xb, yb = next(iter(train_dl))
    print(xb.shape, yb.shape, len(train_dl))

    torch.Size([64, 7]) torch.Size([64]) 141

A \`Dataset\` returns one example by index; a \`DataLoader\` batches, **shuffles** each epoch, and can load in
parallel (\`num_workers\`). For images you write a small \`Dataset\` class whose \`__getitem__\` opens one file.

## nn.Module

A model is a class: layers created in \`__init__\`, the computation in \`forward\`.

    import torch.nn as nn

    class LateNet(nn.Module):
        def __init__(self, n_in):
            super().__init__()
            self.layers = nn.Sequential(nn.Linear(n_in, 32), nn.ReLU(),
                                        nn.Linear(32, 16), nn.ReLU(),
                                        nn.Linear(16, 1))
        def forward(self, x):
            return self.layers(x).squeeze(1)       # logits, shape (batch,)

    model = LateNet(7)
    print(sum(p.numel() for p in model.parameters()))     # 801

The \`.squeeze(1)\` turns (batch, 1) into (batch,) so it matches the target's shape — forgetting it is a silent bug
with \`MSELoss\` (see debugging).

## The training loop, step by step

    from sklearn.metrics import roc_auc_score

    loss_fn = nn.BCEWithLogitsLoss()
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    X_te_t = torch.from_numpy(X_te_s)

    for epoch in range(1, 21):
        model.train()                         # 1. training mode (dropout on, batch norm updating)
        total = 0.0
        for xb, yb in train_dl:
            opt.zero_grad()                   # 2. clear last step's gradients
            logits = model(xb)                # 3. forward
            loss = loss_fn(logits, yb)        # 4. loss
            loss.backward()                   # 5. backward: fill .grad for every parameter
            opt.step()                        # 6. update the weights
            total += loss.item() * len(xb)
        model.eval()                          # 7. evaluation mode
        with torch.no_grad():                 # 8. no graph, less memory
            p = torch.sigmoid(model(X_te_t)).numpy()
        print(f"epoch {epoch:2d}  train loss {total/len(train_ds):.4f}  test AUC {roc_auc_score(y_te, p):.3f}")

    epoch  1  train loss 0.5570  test AUC 0.767
    epoch  2  train loss 0.4767  test AUC 0.772
    epoch  5  train loss 0.4679  test AUC 0.777
    epoch 10  train loss 0.4649  test AUC 0.777
    epoch 15  train loss 0.4639  test AUC 0.778
    epoch 20  train loss 0.4633  test AUC 0.778

(Printing every fifth epoch here; in a real notebook track a **validation** split, not the test set — the next unit
does.) Memorise the order: **zero_grad → forward → loss → backward → step**. Every PyTorch training loop you meet,
including the ones hidden inside libraries, is this.

## Saving and loading

    torch.save(model.state_dict(), "late_net.pt")
    m2 = LateNet(7); m2.load_state_dict(torch.load("late_net.pt")); m2.eval()

Save the **state_dict** (the weights), not the whole model object. Since PyTorch 2.6, \`torch.load\` defaults to
\`weights_only=True\`, which refuses arbitrary pickled objects — a safety change; older code that pickled whole
models now needs updating. On a GPU machine, move model and batches to the same device:
\`device = "cuda" if torch.cuda.is_available() else "cpu"\`, then \`model.to(device)\` and \`xb.to(device)\`.

## Was it worth it?

                                   test AUC
    logistic regression (scaled)      0.775
    HistGradientBoosting              0.759
    LateNet, 20 epochs                0.778

On this table the network beats logistic regression by 0.003 AUC — noise. That is a common, honest result for
tabular data, and it is why you learn PyTorch here for images and text, not to replace the models of S1 and S2.`,
    mcqs: [
      mcq('A NumPy feature array goes into a PyTorch model and raises a dtype error. What is the usual cause?', [
        ['NumPy defaults to float64, while the model\'s weights are float32', true],
        ['PyTorch cannot accept NumPy arrays and needs Python lists instead', false],
        ['The array needs to be moved to a GPU before any model can use it', false],
        ['NumPy arrays are row-major, while PyTorch tensors are column-major', false],
      ], 'torch.from_numpy keeps float64. Convert with .astype(np.float32) before, or .float() after; class labels for CrossEntropyLoss need .long().'),
      mcq('What is the correct order of the calls inside a PyTorch training step?', [
        ['zero_grad, forward pass, loss, backward, optimiser step', true],
        ['forward pass, optimiser step, loss, backward, zero_grad', false],
        ['loss, zero_grad, backward, forward pass, optimiser step', false],
        ['forward pass, loss, optimiser step, backward, zero_grad', false],
      ], 'Clear old gradients, compute the output and the loss, fill the gradients with backward, then let the optimiser update the weights using them.'),
      mcq('Why does the training loop call model.eval() and wrap evaluation in torch.no_grad()?', [
        ['eval switches dropout and batch norm to inference; no_grad skips building the graph', true],
        ['eval freezes the weights permanently; no_grad deletes the gradients already stored', false],
        ['eval moves the model to the CPU; no_grad converts every output to a NumPy array', false],
        ['Both are needed only on a GPU; on a CPU they make no difference to the result', false],
      ], 'model.eval() changes layer behaviour (dropout off, batch norm uses running statistics). torch.no_grad() saves memory and time; neither changes the weights.'),
    ],
    checkpoint: [
      ck(TRN, 'Gradients from the previous step are still in .grad when backward() runs again. What happens?', [
        ['The new gradients are added to the old ones, unless zero_grad clears them', true],
        ['The new gradients overwrite the old ones, so nothing is lost or doubled', false],
        ['PyTorch raises an error asking for the old gradients to be cleared first', false],
        ['The optimiser ignores .grad and recomputes gradients inside step() itself', false],
      ], 'Accumulation is deliberate (it allows gradient accumulation over several small batches), so a normal loop must call opt.zero_grad() every step.'),
      ck(TRN, 'A training set of 9,000 rows uses DataLoader(batch_size=64, shuffle=True). How many batches make one epoch?', [
        ['141', true],
        ['140', false],
        ['64', false],
        ['9,000', false],
      ], '9,000 / 64 = 140.6, and the last partial batch counts unless drop_last=True: 141 batches. This is the len(train_dl) printed in the notes.'),
      ck(TRN, 'Which is the recommended way to save a trained PyTorch model for later use?', [
        ['Save model.state_dict() and load it into a freshly built model', true],
        ['Pickle the whole notebook session, including all the data loaders', false],
        ['Save the optimiser alone, since it holds a copy of every weight', false],
        ['Export the training loss history and refit the model when needed', false],
      ], 'The state_dict holds the learned tensors. Rebuild the class, load the weights and call eval(); since PyTorch 2.6 torch.load defaults to weights_only=True, which suits this.'),
    ],
  },

  /* ── TRAINING_WELL ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_DEEP_LEARNING_TRAINING_WELL',
    notes: `A network that trains at all is the start. A network that trains **well** — converges quickly, generalises,
and stops at the right moment — comes from a handful of decisions: the optimiser and learning rate, the batch size,
how much capacity and regularisation, and when to stop. Every number below comes from the cloud-kitchen late-order
data of the previous unit (9,000 training orders, scaled), with the same small network unless stated.

## The learning rate matters most

Plain SGD for 10 epochs, training loss after epochs 1, 4, 7 and 10:

    lr        training loss                          validation loss
    0.0001    0.6753  0.6715  0.6678  0.6642            0.6637   barely moving
    0.01      0.6312  0.5534  0.5231  0.4974            0.4972   learning, slowly
    0.5       0.4962  0.4697  0.4674  0.4669            0.4680   good
    5.0       0.5846  0.5626  0.5590  0.5573            0.5544   stuck worse
    20.0      first epoch loss 1.66 × 10¹⁷, then about 1.3     diverged

- **Too small:** the loss creeps down; you run out of patience before it converges.
- **Too large:** steps overshoot. At 5.0 the loss settles *above* the good runs; at 20 it explodes (on other data
  you will see \`nan\`) and many ReLU units die and never recover.
- A good learning rate is usually found by trying values a factor of 3–10 apart and reading the curves.

**Adam** adapts a step size for each parameter and is far less sensitive: at 1e-3 it reached a training loss of
0.4651 in 10 epochs with no tuning. Use **Adam or AdamW at 1e-3** as the default for small networks, and **1e-5 to
1e-4** when fine-tuning a pretrained model (you want to nudge, not overwrite). Learning-rate **schedules** (warm-up,
then decay; \`torch.optim.lr_scheduler\`) squeeze out more on long runs.

**Scale the inputs.** The late-order features happen to be of similar size (kilometres, minutes, hours, counts), and
unscaled they trained about as well. Put a monthly income in rupees into a small regression network, though, and
plain SGD at 0.001 sent the loss from 1.5 × 10⁸ to 1.5 × 10³² in two steps: one huge input makes one huge gradient.
Standardise numeric inputs, fitting the scaler on training rows only.

## Batch size

Adam, lr 1e-3, 10 epochs:

    batch size   validation loss   time
        16           0.4654        9.2 s
        64           0.4647        3.1 s
      1,024          0.4904        1.3 s

Batch 1,024 is fastest per epoch but takes only 9 steps per epoch, so after 10 epochs it has simply taken fewer
steps. Big batches need more epochs or a higher learning rate; tiny ones are slow and noisy. **32–256** is the
usual range; on a GPU, pick the largest that fits in memory and adjust the learning rate.

## Overfitting, made visible

To see overfitting clearly, give a big network little data: 450 training orders, the 7 real features plus 30
columns of pure noise, two hidden layers of 256 units (76,000+ parameters), and 150 validation orders.

    epoch   train loss   val loss
       5       0.393       0.468
      10       0.230       0.577
      20       0.024       0.975
      50       0.001       1.418
     150       0.000       1.987

Validation loss is lowest at **epoch 4 (0.451)** and climbs while training loss falls to zero: the network has
memorised 450 orders, noise columns included. Test AUC after 150 epochs: **0.675**; with the weights from epoch 4:
**0.722**.

## The remedies

| Remedy | What it does | Here |
|---|---|---|
| **Early stopping** | Track validation loss each epoch; keep the best weights; stop after *patience* epochs without improvement | patience 10: stopped at epoch 14, restored epoch 4, test AUC 0.722 |
| **Dropout** | Randomly zeroes a fraction p of activations during training, so no unit can rely on another | p = 0.5: val loss 1.321 at epoch 150 (vs 1.987); best-epoch test AUC 0.728 |
| **Weight decay** | Shrinks weights towards zero each step (L2-style); use AdamW, which applies it correctly with Adam | 0.1: no visible effect; 5.0: val loss 0.585 at epoch 150 |
| **Smaller network** | Fewer parameters to memorise with | 16 units: best epoch 23, test AUC 0.720 |
| **More data / augmentation** | The real cure; for images, flips, crops and colour jitter | — |

Early stopping, inside the epoch loop:

    if val_loss < best_loss:
        best_loss, best_state, bad = val_loss, copy.deepcopy(model.state_dict()), 0
    else:
        bad += 1
        if bad >= patience:
            break
    # after the loop
    model.load_state_dict(best_state)

Two lessons from the table. First, **early stopping did most of the work**; dropout and weight decay helped at the
margin. Second, and more important: **logistic regression on the same 450 rows scored 0.741** — better than every
network. With little tabular data, a simple model wins; a network earns its place with lots of data or unstructured
inputs.

Two notes on weight decay. \`torch.optim.Adam(weight_decay=…)\` adds an L2 term to the gradient, which then gets
divided by Adam's per-parameter scale; **AdamW** decouples the decay from the gradient and is the one to use. And its
effect per step is the decay times the learning rate, so 0.1 at lr 1e-3 is gentle.

## Reading loss curves

| What you see | What it usually means | What to try |
|---|---|---|
| Both losses flat and high | Learning rate too low, a bug, or unscaled inputs | Check data and labels; raise lr ×10 |
| Loss jumps around or becomes \`nan\` | Learning rate too high, exploding gradients, bad inputs | Lower lr; clip gradients; check for inf/NaN in data |
| Train falls, validation falls then rises | Overfitting | Early stopping; dropout; weight decay; more data |
| Both fall, a big gap, both still falling | Not finished | Train longer |
| Train loss well above a simple baseline | Underfitting or a bug | Bigger network; check the output layer and loss |
| Validation better than training | Dropout is on during training only; or validation is easier | Usually fine; check the split |

Always plot both curves, per epoch, from the first run. And **fix seeds** (\`torch.manual_seed\`, NumPy's
generator, the split) before comparing two settings — otherwise a difference may be the seed.`,
    mcqs: [
      mcq('SGD at learning rate 0.0001 leaves the training loss at 0.664 after 10 epochs, while 0.5 reaches 0.467. What is wrong with 0.0001?', [
        ['The steps are so small that the model has barely moved from its start', true],
        ['The steps overshoot the minimum, so the loss bounces around a high value', false],
        ['A small learning rate causes overfitting, which keeps the loss from falling', false],
        ['Nothing — a small learning rate always reaches a better loss in the end', false],
      ], 'Too small a learning rate converges, but painfully slowly. Overshooting is the large-rate failure, which showed at 5.0 and 20.'),
      mcq('A model overfits from epoch 4. With early stopping at patience 10, which weights end up being used?', [
        ['The weights from epoch 4, restored after training stops at epoch 14', true],
        ['The weights from epoch 14, the last epoch that was actually trained', false],
        ['An average of the weights from every epoch between 4 and 14 inclusive', false],
        ['The initial weights, since every epoch after 4 made the model worse', false],
      ], 'Early stopping keeps a copy of the best state, waits patience epochs to be sure, stops, and reloads the best copy.'),
      mcq('Why is AdamW preferred over Adam with weight_decay for regularising a network?', [
        ['AdamW applies the decay to the weights directly, not through scaled gradients', true],
        ['AdamW turns off the adaptive step sizes, which makes training more stable overall', false],
        ['Adam ignores the weight_decay argument entirely, so it has no regularising effect', false],
        ['AdamW adds dropout to every layer automatically, which Adam cannot do on its own', false],
      ], 'In Adam the L2 term is divided by the per-parameter scale like any gradient, which weakens it unevenly. AdamW decouples the decay so it shrinks every weight as intended.'),
    ],
    checkpoint: [
      ck(TRN, 'Training loss falls to 0.000 while validation loss rises from 0.451 at epoch 4 to 1.987 at epoch 150. What is happening?', [
        ['The network is memorising the training rows and generalising worse', true],
        ['The learning rate is too low for the network to reach a good minimum', false],
        ['The validation set is mislabelled, since the losses should move together', false],
        ['The network is underfitting and needs more layers and more epochs', false],
      ], 'Diverging curves are the signature of overfitting. Early stopping at epoch 4 gave test AUC 0.722 against 0.675 after 150 epochs.'),
      ck(TRN, 'Raising the batch size from 64 to 1,024 at the same learning rate and epochs worsened validation loss from 0.4647 to 0.4904. Why?', [
        ['Each epoch now takes far fewer steps, so the model has had less training', true],
        ['Large batches always overfit, because each step sees more of the data', false],
        ['The DataLoader cannot shuffle a batch that large, so order effects appear', false],
        ['Large batches make the gradients biased, so the model learns the wrong thing', false],
      ], '9,000 rows give 141 steps per epoch at 64 but 9 at 1,024. Larger batches need more epochs or a larger learning rate to match.'),
      ck(TRN, 'On 450 tabular training rows, a regularised two-layer network reaches test AUC 0.728 and logistic regression 0.741. What should you conclude?', [
        ['With so little tabular data, the simpler model is the better choice', true],
        ['The network needs more hidden layers before it can beat the logistic model', false],
        ['The comparison is unfair, since networks should be judged on accuracy', false],
        ['Logistic regression must have leaked the labels to score that highly', false],
      ], 'Networks earn their capacity with lots of data or unstructured inputs. On a few hundred rows of a table, a simple regularised model is hard to beat.'),
    ],
  },

  /* ── CNN_TRANSFER ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_DEEP_LEARNING_CNN_TRANSFER',
    notes: `Images are where deep learning first beat everything else, and where a data scientist most often uses it today
— product photos, KYC documents, crop images, X-rays. You will rarely train an image network from scratch. You will
**fine-tune a pretrained one**, and this unit is about why that works and how to do it.

## Why not a plain MLP on pixels?

A 224 × 224 colour photo is 150,528 numbers. A dense layer from that to 1,000 units has **150,529,000** parameters,
it treats a bangle in the top-left corner as unrelated to the same bangle in the centre, and it ignores that
neighbouring pixels belong together.

## Convolutions

A **convolution** slides a small filter (say 3 × 3) across the image and computes a weighted sum at every position.
The same few weights are reused everywhere (**weight sharing**), so a filter that detects a vertical edge detects it
anywhere (**translation equivariance**).

    import torch, torch.nn as nn
    conv = nn.Conv2d(in_channels=3, out_channels=16, kernel_size=3, padding=1)
    x = torch.randn(1, 3, 128, 128)                 # (batch, channels, height, width)
    print(conv(x).shape, sum(p.numel() for p in conv.parameters()))
    print(nn.MaxPool2d(2)(conv(x)).shape)

    torch.Size([1, 16, 128, 128]) 448
    torch.Size([1, 16, 64, 64])

448 parameters (16 filters × 3 channels × 3 × 3, plus 16 biases) — against 150 million for the dense layer. Shapes
follow one formula: output = ⌊(input + 2·padding − kernel) / stride⌋ + 1. Without padding, 128 → 126; with stride
2 and padding 1, 128 → 64.

- **Channels:** the input has 3 (RGB); each filter produces one output channel, a "feature map".
- **Pooling** (max or average over 2 × 2) halves height and width, keeping the strongest responses; it makes the
  network cheaper and tolerant of small shifts.
- **Stacking** conv → ReLU → pool repeatedly builds a hierarchy: early layers respond to edges and colours, middle
  ones to textures and parts (a phone's camera cut-out, a bangle's curve), late ones to whole objects. A final
  global average pool and a linear layer classify.

## The data: product photos

An e-commerce marketplace wants seller photos sorted into categories. To keep everything runnable on a laptop, the
photos are drawn with PIL: four categories — **bangles, phone_cover, kurta, bottle** — with random colours, sizes,
positions, rotations, lighting and noise on varied backgrounds, 96 × 96 pixels.

    X_tr, y_tr = make_photos(15, seed=1)      # 60 training photos: 15 per class (generator in the notebook)
    X_te, y_te = make_photos(100, seed=2)     # 400 test photos

Fifteen photos per class is realistic for a new seller category, and brutal for a network trained from scratch.

## Option 1: a small CNN from scratch

    class SmallCNN(nn.Module):
        def __init__(self):
            super().__init__()
            self.features = nn.Sequential(
                nn.Conv2d(3, 16, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
                nn.Conv2d(16, 32, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
                nn.Conv2d(32, 64, 3, padding=1), nn.ReLU(), nn.AdaptiveAvgPool2d(1))
            self.head = nn.Linear(64, 4)
        def forward(self, x):
            return self.head(self.features(x).flatten(1))

23,844 parameters, Adam, 40 epochs on the 60 photos: **test accuracy 0.458** (and only 0.667 on its own training
photos). With 600 training photos it reaches 0.918, after 55 seconds of training.

## Option 2: transfer learning

**ResNet-18** was trained on ImageNet's 1.28 million photos in 1,000 classes. Its convolutional layers already
detect edges, textures, shapes and object parts — features that are useful for product photos it has never seen.
Load it, drop its 1,000-class head, and use what is left as a **feature extractor**.

    import numpy as np
    from transformers import ResNetForImageClassification   # transformers ≥ 4.40; weights from the Hugging Face Hub

    base = ResNetForImageClassification.from_pretrained("microsoft/resnet-18")
    backbone = base.resnet.eval()                            # everything except the classifier
    MEAN = np.array([0.485, 0.456, 0.406]); STD = np.array([0.229, 0.224, 0.225])   # ImageNet statistics

    def to_tensor(X):                                        # uint8 (n, h, w, 3) → normalised (n, 3, h, w)
        a = (X.astype(np.float32) / 255 - MEAN) / STD
        return torch.tensor(a, dtype=torch.float32).permute(0, 3, 1, 2)

    with torch.no_grad():
        F_tr = backbone(to_tensor(X_tr)).pooler_output.flatten(1).numpy()     # (60, 512)
        F_te = backbone(to_tensor(X_te)).pooler_output.flatten(1).numpy()

    from sklearn.linear_model import LogisticRegression
    probe = LogisticRegression(max_iter=3000).fit(F_tr, y_tr)
    print(probe.score(F_te, y_te))

    0.995

The same 60 photos: **0.458 from scratch, 0.995 with a frozen pretrained backbone and a logistic regression on its
512 features** — in 8 seconds. This "linear probe" is the first thing to try on any small image dataset.

The torchvision route to the same architecture (not run here) is
\`torchvision.models.resnet18(weights=ResNet18_Weights.DEFAULT)\`, replacing \`model.fc\`; the \`weights=\` argument
replaced \`pretrained=True\` in torchvision 0.13. Use the preprocessing the weights were trained with:
\`ResNet18_Weights.DEFAULT.transforms()\` in torchvision, or \`AutoImageProcessor\` in transformers.

## Option 3: fine-tuning

Fine-tuning trains some of the pretrained weights too. The standard schedule is **frozen, then unfrozen**:

    class FineTuned(nn.Module):
        def __init__(self, backbone, n_classes):
            super().__init__(); self.bb = backbone; self.head = nn.Linear(512, n_classes)
        def forward(self, x):
            return self.head(self.bb(x).pooler_output.flatten(1))

    ft = FineTuned(ResNetForImageClassification.from_pretrained("microsoft/resnet-18").resnet, 4)
    for p in ft.bb.parameters():
        p.requires_grad = False                    # stage 1: freeze the backbone
    # train only ft.head: 2,052 trainable parameters, lr 1e-3, 15 epochs        → test accuracy 0.962

    last = ft.bb.encoder.stages[-1]                # stage 2: unfreeze the last block
    for p in last.parameters():
        p.requires_grad = True
    opt = torch.optim.Adam([{"params": last.parameters(), "lr": 1e-4},       # small lr for pretrained weights
                            {"params": ft.head.parameters(), "lr": 1e-3}])
    # 8,395,780 trainable parameters, 8 epochs                                  → test accuracy 0.998

Why two stages: a new, randomly initialised head produces large, random gradients at first. If the backbone were
unfrozen from the start, those gradients would wreck the pretrained features. Train the head first, then unfreeze
the top block (or all of it) with a learning rate **10–100 times smaller**.

| Approach | Trainable parameters | Test accuracy (60 training photos) |
|---|---|---|
| Small CNN from scratch | 23,844 | 0.458 |
| Frozen ResNet-18 + logistic regression | 2,052 (the probe's weights) | 0.995 |
| Fine-tune: head 15 epochs, then last block 8 epochs | 8,395,780 | 0.998 |

On these clean drawn shapes the frozen features are already near-perfect; on real product photos — clutter,
models wearing the kurta, phone covers in hands — fine-tuning usually adds several points over the probe.

## Why transfer learning works, and when it may not

The early and middle layers learn general visual features that transfer across tasks; only the last layers are
specific to ImageNet's classes. It works best when the new images resemble natural photos. It transfers less well
to very different images — X-rays, satellite bands, microscope slides — where you may need to fine-tune more layers
or start from a model pretrained on similar data.

## Augmentation

For small image sets, **augmentation** makes each epoch see a slightly different version of every photo: random
horizontal flips, crops and resizes, small rotations, colour jitter. Choose augmentations that keep the label
true — a flipped kurta is still a kurta; a flipped "6" in a scanned form may not be. Augment the training data only;
never the validation or test data.`,
    workedExample: `**Goal: a marketplace has 1,800 photos of 420 products across 8 categories from 60 sellers. Plan the fine-tuning
so the accuracy you report is the accuracy sellers will see.**

**Step 1 — split by product, not by photo.** Each product has 3–6 photos of the same item. A random photo split
puts near-identical images in train and test, and the test score measures memory. Use \`GroupShuffleSplit\` (or
\`StratifiedGroupKFold\`) with \`groups=product_id\`: about 70% of products for training, 15% validation, 15% test. If
new sellers will join, also check a split by seller.

**Step 2 — baseline in ten minutes.** Frozen ResNet-18 features + logistic regression on the training products.
Report validation accuracy and a per-class breakdown. Every later step must beat this.

**Step 3 — stage 1: train the head.** Replace the classifier with \`nn.Linear(512, 8)\`, freeze the backbone, train
with Adam at 1e-3 for a few epochs with augmentation (random resized crop, horizontal flip, mild colour jitter) and
the ImageNet normalisation. Validation accuracy should land near the probe.

**Step 4 — stage 2: unfreeze the last block.** Parameter groups: last block at 1e-4, head at 1e-3. Train with early
stopping on validation loss, patience 3–5. If validation keeps improving, try unfreezing one more block at 1e-5.

**Step 5 — read the errors, not just the score.** A confusion matrix on validation; open the misclassified photos.
Typical findings: kurta vs saree confused when the photo shows a model wearing both; mislabelled products; blank or
watermarked uploads.

**Step 6 — test once.** Evaluate the chosen model on the untouched test products and report accuracy with the
per-class table.

**Why this order:** the split is decided before any model, so no choice is made on the test products; the frozen
probe sets a cheap bar; the two-stage schedule protects pretrained features from the new head's early, random
gradients.`,
    mcqs: [
      mcq('How many parameters does nn.Conv2d(3, 32, kernel_size=5) have?', [
        ['2,432', true],
        ['2,400', false],
        ['480', false],
        ['800', false],
      ], '32 filters × 3 input channels × 5 × 5 = 2,400 weights, plus 32 biases = 2,432. The count does not depend on the image size, which is the point of weight sharing.'),
      mcq('With 15 photos per class, a small CNN from scratch scores 0.458 and a frozen ResNet-18 probe 0.995. Why the difference?', [
        ['Its pretrained layers already detect visual features learned from 1.28M photos', true],
        ['ResNet-18 has more layers, and depth alone guarantees better accuracy on any data', false],
        ['The small CNN was trained for too few epochs, and with more it would reach 0.995 too', false],
        ['The probe uses logistic regression, which is always more accurate than a network', false],
      ], 'Sixty photos cannot teach a network to see. The backbone brings general features from ImageNet; only a small head has to be learned from the new data.'),
      mcq('Why is a pretrained backbone usually frozen while a new classification head is first trained?', [
        ['The random head\'s large early gradients would otherwise damage pretrained features', true],
        ['Frozen layers train faster, so freezing them first lets them converge before the head', false],
        ['PyTorch cannot compute gradients for a pretrained model until its head is trained', false],
        ['Freezing removes the need to normalise the images with the ImageNet statistics', false],
      ], 'A fresh head starts with random weights and large errors. Training it first, then unfreezing the backbone with a much smaller learning rate, preserves what was pretrained.'),
    ],
    checkpoint: [
      ck(NN, 'A 128 × 128 image passes through Conv2d with kernel 3, stride 1 and no padding. What are the output height and width?', [
        ['126 × 126', true],
        ['128 × 128', false],
        ['64 × 64', false],
        ['125 × 125', false],
      ], '⌊(128 + 0 − 3) / 1⌋ + 1 = 126. Padding 1 would keep 128, and stride 2 would roughly halve it.'),
      ck(NN, 'What makes a convolutional layer so much smaller than a dense layer on the same image?', [
        ['The same small filter weights are reused at every position in the image', true],
        ['It only looks at the centre of the image, where products usually appear', false],
        ['It converts the image to greyscale first, which removes two-thirds of inputs', false],
        ['It stores its weights in a compressed format that a dense layer cannot use', false],
      ], 'Weight sharing: a 3 × 3 filter has 9 weights per channel however large the image. That also lets it find a pattern anywhere in the frame.'),
      ck(NN, 'Fine-tuning a pretrained model on chest X-rays gains less than it did on product photos. What is the likely reason?', [
        ['X-rays look unlike the natural photos the backbone was pretrained on', true],
        ['X-rays are greyscale, and pretrained models cannot accept greyscale input', false],
        ['Transfer learning only works when the new classes appear in ImageNet', false],
        ['Medical images are too large for any pretrained convolutional network', false],
      ], 'Transferred features help most when the new images resemble the pretraining data. Distant domains may need more layers fine-tuned or a backbone pretrained on similar images.'),
    ],
  },

  /* ── SEQUENCES ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_DEEP_LEARNING_SEQUENCES',
    notes: `Text, clickstreams, sensor readings, a customer's transactions — much of a data scientist's data is a
**sequence**, where order carries meaning. This unit follows how deep learning learned to read sequences: recurrent
networks, LSTMs, then **attention**, which led to the transformers behind every modern language model. The NLP
topic that follows uses transformers through Hugging Face; here you learn what is inside.

## Why order matters

A bag-of-words model counts words and forgets their order:

    from sklearn.feature_extraction.text import CountVectorizer
    a = "delivery was late but food was not bad"
    b = "food was late but delivery was not bad"
    cv = CountVectorizer().fit([a, b])
    print(cv.get_feature_names_out()); print(cv.transform([a, b]).toarray())

    ['bad' 'but' 'delivery' 'food' 'late' 'not' 'was']
    [[1 1 1 1 1 1 2]
     [1 1 1 1 1 1 2]]

Two reviews blaming different things are the same vector. For many tasks bag-of-words is still a strong baseline
(the NLP topic starts there), but when the meaning is *in* the order, the model must see it.

**An order-only task.** A fintech app logs each session as a sequence of 10 events. Sessions where the customer
**shared an OTP before money was debited** are a common fraud pattern; the same two events the other way round are
normal. Both events appear in every session, so only the order tells them apart. 4,000 training sessions, 1,000 test:

                                                      test accuracy
    embeddings averaged (order discarded) + MLP           0.487
    LSTM over the sequence                                1.000

The averaged model is at chance, as it must be — the information is not in its input.

## Recurrent networks

An **RNN** reads one step at a time and carries a **hidden state** h, a running summary:
hₜ = tanh(W·xₜ + U·hₜ₋₁ + b). The same weights are used at every step, so it handles any length.

Its weakness is backprop **through time**: the gradient from the last step to the first is a product of one factor
per step, so over long sequences it vanishes (or explodes) — the deep-network problem, with depth replaced by
length. A plain RNN struggles to connect words 50 steps apart.

**LSTMs** (and the lighter **GRUs**) add **gates** — learned switches that decide what to forget, what to write and
what to output — and a cell state along which information can travel largely unchanged. That made them the standard
for text, speech and time series through the mid-2010s.

    for name, m in [("RNN", nn.RNN(32, 64, batch_first=True)),
                    ("LSTM", nn.LSTM(32, 64, batch_first=True)),
                    ("GRU", nn.GRU(32, 64, batch_first=True))]:
        print(name, sum(p.numel() for p in m.parameters()))
    RNN 6272
    LSTM 25088
    GRU 18816

    lstm = nn.LSTM(32, 64, batch_first=True)
    out, (h, c) = lstm(torch.randn(8, 20, 32))      # 8 sequences, 20 steps, 32 features
    print(out.shape, h.shape, c.shape)
    torch.Size([8, 20, 64]) torch.Size([1, 8, 64]) torch.Size([1, 8, 64])

An LSTM has four sets of weights (three gates and the candidate), so 4× the RNN's 6,272; a GRU has three. \`out\`
holds the hidden state at every step; \`h\` the last one, which the session classifier above fed to its output
layer. Note \`batch_first=True\`: without it PyTorch expects (steps, batch, features).

Two limits remained. An RNN processes steps **one after another**, so it cannot use a GPU's parallelism across a
sequence; and everything the model knows about early words must squeeze through the hidden state.

## Attention

**Attention** lets every position look directly at every other position and take a weighted average of what it
finds. Each token gets three vectors: a **query** (what am I looking for?), a **key** (what do I contain?) and a
**value** (what do I pass on?). Weights come from query–key similarity:

    attention(Q, K, V) = softmax(Q Kᵀ / √d) V

By hand, three tokens with 2-dimensional vectors:

    Q = K = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]])
    V = np.array([[10.0, 0.0], [0.0, 10.0], [5.0, 5.0]])
    S = Q @ K.T / np.sqrt(2)                          # similarity scores
    W = np.exp(S) / np.exp(S).sum(1, keepdims=True)   # softmax across each row
    print(W); print(W @ V)

    [[0.401 0.198 0.401]          [[6.017 3.983]
     [0.198 0.401 0.401]           [3.983 6.017]
     [0.248 0.248 0.503]]          [5.    5.   ]]

Row 1: token 1 attends 40% to itself and 40% to token 3, which share a direction with it, and 20% to token 2. Its
output is the matching mix of values. PyTorch's \`torch.nn.functional.scaled_dot_product_attention(q, k, v)\` returns
the same numbers.

**Why divide by √d?** Dot products of random d-dimensional vectors have a spread that grows like √d:

    d       spread of q·k    spread of q·k / √d
    4          2.04             1.02
    64         7.85             0.98
    512       22.56             1.00

Without scaling, large dimensions push the softmax to nearly one-hot, and its gradients vanish.

**Multi-head attention** runs several attentions in parallel on different learned projections (one head might
track which word a pronoun refers to, another negation), then combines them.

    mha = nn.MultiheadAttention(embed_dim=64, num_heads=4, batch_first=True)
    x64 = torch.randn(8, 20, 64)
    y, w = mha(x64, x64, x64)          # self-attention: Q, K and V from the same sequence
    print(y.shape, w.shape, sum(p.numel() for p in mha.parameters()))
    torch.Size([8, 20, 64]) torch.Size([8, 20, 20]) 16640

The weights w are a 20 × 20 matrix per sequence: every position's attention over every other.

## Transformers

A **transformer** stacks blocks of [multi-head self-attention → a small feed-forward network], each wrapped in a
residual connection and layer normalisation. Attention alone ignores order (shuffle the tokens and each output is
shuffled the same way), so **positional information** is added to the token embeddings.

    layer = nn.TransformerEncoderLayer(d_model=64, nhead=4, dim_feedforward=128, batch_first=True)
    enc = nn.TransformerEncoder(layer, num_layers=2, enable_nested_tensor=False)
    print(enc(torch.randn(8, 20, 64)).shape, sum(p.numel() for p in enc.parameters()))
    torch.Size([8, 20, 64]) 66944

Why transformers took over:

- **Parallel:** all positions are processed at once, so training uses GPUs fully and scales to huge data.
- **Direct paths:** any two positions are one attention step apart, however far apart in the text; nothing has to
  squeeze through a hidden state.
- **Scale:** pretrained on vast text, then fine-tuned or prompted, they transfer to many tasks — the same idea as
  the pretrained ResNet, applied to language.

The cost: attention compares every pair of positions, so compute and memory grow with the **square** of sequence
length — the reason models have a context-length limit. **Encoder** models (BERT-style) read the whole input in
both directions and suit classification and extraction; **decoder** models (GPT-style) predict the next token from
the ones before it and suit generation. LSTMs still appear on small sequence problems and on edge devices.`,
    mcqs: [
      mcq('Every session contains both "otp_shared" and "money_debited", and fraud depends only on which comes first. Why does a model on averaged embeddings score 0.487?', [
        ['Averaging discards order, so its input is identical for both kinds of session', true],
        ['The embedding size of 16 is too small to represent eight distinct event types', false],
        ['The model needs more epochs, since order patterns take longer to learn', false],
        ['Averaging overweights rare events, which confuses the classifier on them', false],
      ], 'The mean of the embeddings is the same whichever order the events came in. An LSTM, which reads in order, separated the classes perfectly.'),
      mcq('Why does an LSTM have four times as many parameters as a plain RNN of the same sizes?', [
        ['It learns separate weights for three gates and for the candidate update', true],
        ['It runs four copies of the RNN in parallel and averages their outputs', false],
        ['It stores the hidden state for four previous steps rather than one', false],
        ['It uses four layers by default, while an RNN uses only a single layer', false],
      ], 'Input, forget and output gates plus the candidate cell value each need input and recurrent weights and biases: 4 × 6,272 = 25,088.'),
      mcq('Why are attention scores divided by √d before the softmax?', [
        ['Dot products grow with dimension; scaling stops the softmax saturating', true],
        ['It normalises the attention weights so that each row sums to exactly one', false],
        ['It converts the similarity scores from radians into a cosine similarity', false],
        ['It reduces the memory needed to store the attention matrix during training', false],
      ], 'The spread of q·k grows like √d (7.85 at d = 64). Unscaled, the softmax becomes nearly one-hot and its gradients vanish; the softmax itself is what makes rows sum to one.'),
    ],
    checkpoint: [
      ck(NN, 'What limited RNNs and LSTMs that transformers removed?', [
        ['They process a sequence step by step, so they cannot parallelise across it', true],
        ['They cannot be trained with backpropagation, so they need hand-written rules', false],
        ['They accept only numeric data, while transformers accept raw text characters', false],
        ['They need a fixed sequence length, while transformers accept any length at all', false],
      ], 'Each hidden state needs the one before it. Attention processes all positions at once and connects any two directly — though transformers do have a context-length limit.'),
      ck(NN, 'In self-attention, what decides how much one token draws on another?', [
        ['How well its query matches the other token\'s key, normalised by softmax', true],
        ['The distance between the two tokens, with nearer tokens always weighted more', false],
        ['A fixed weight learned for each pair of positions, regardless of the content', false],
        ['The frequency of the other token in the training data, as in TF-IDF weighting', false],
      ], 'Scores are query·key / √d, normalised by softmax across the row; the output is the weighted mix of the values. Position enters only through the positional information added to embeddings.'),
      ck(NN, 'Doubling a transformer\'s input length from 2,000 to 4,000 tokens roughly does what to the attention computation?', [
        ['Quadruples it, because every position is compared with every other', true],
        ['Doubles it, because each token is processed once in each layer', false],
        ['Leaves it unchanged, because attention is computed in parallel', false],
        ['Halves it, because longer inputs give each token more context', false],
      ], 'The attention matrix is length × length, so 2× the length means 4× the pairs — the reason context windows are limited.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_DEEP_LEARNING_DEBUGGING',
    notes: `A network with a bug usually still runs. It trains a little, prints a loss, and produces predictions that look
like predictions. Eight faults from this topic's notebooks — symptom, cause, fix — each reproduced on PyTorch 2.14.

## 1. The loss gets worse the longer you train

**Symptom:** the loss falls for a few steps, then wanders upwards and bounces, even with a small learning rate.
**Cause:** \`opt.zero_grad()\` is missing, so gradients **accumulate** across steps. On a single weight, three
backward calls in a row give gradients of −18, −36 and −54: each step pushes harder than the last.

    w = torch.tensor(1.0, requires_grad=True)
    for i in range(3):
        loss = (3 * w - 6) ** 2
        loss.backward()
        print(w.grad.item())        # -18.0, -36.0, -54.0

**Fix:** call \`opt.zero_grad()\` at the start of every step (or \`model.zero_grad()\`). Accumulating on purpose —
to imitate a larger batch — is a deliberate pattern with a counter, never an accident.

## 2. A loss that will not go below 0.74

**Symptom:** a 4-class classifier's training loss plateaus at **0.88**; the same network elsewhere reaches **0.39**.
**Cause:** the model ends in \`nn.Softmax\` and its output goes into \`nn.CrossEntropyLoss\`, which applies a
(log-)softmax itself. Softmax is applied twice; its outputs are squeezed into [0, 1], so the second softmax can
never be confident — for 4 classes the lowest possible loss is −ln(e / (e + 3)) = **0.744**. Accuracy may look fine
(0.865 here), but the loss is useless for early stopping and comparisons, the gradients are weakened, and the
"probabilities" are wrong.
**Fix:** the model returns **logits**; \`CrossEntropyLoss\` (and \`BCEWithLogitsLoss\`) do the rest. Apply softmax or
sigmoid only when you want probabilities for prediction.

## 3. Errors from the labels

**Symptom:**

    RuntimeError: expected target dtype to be Long or Byte, but got Float
    IndexError: Target 4 is out of bounds.

**Cause:** the first: class labels were float (read from a CSV or built with \`np.float32\`); \`CrossEntropyLoss\`
wants integer class indices. (Older PyTorch versions word it "expected scalar type Long but found Float".) The
second: labels run 1–4 for a 4-class model, whose outputs are indices 0–3.
**Fix:** \`torch.tensor(y, dtype=torch.long)\`, and encode labels 0…k−1 — \`LabelEncoder\` or
\`pd.factorize\` — keeping the mapping to class names for the report.

## 4. BCELoss refuses the model's output

**Symptom:** \`RuntimeError: all elements of input should be between 0 and 1\`.
**Cause:** \`nn.BCELoss\` expects probabilities, and the model outputs logits (2.3, −1.0, …).
**Fix:** use \`nn.BCEWithLogitsLoss\` on the logits. Do not "fix" it by adding a sigmoid to the model and keeping
\`BCELoss\` — the with-logits version is numerically stable for very confident predictions, and it is the standard.

## 5. A regression network that learns nothing — with only a warning

**Symptom:** a demand model's loss stops falling early; its mean squared error on the training data is **18.29**,
almost exactly the variance of the target (**18.79**) — no better than predicting the mean. The log shows:

    UserWarning: Using a target size (torch.Size([5])) that is different to the input size (torch.Size([5, 1])).
    This will likely lead to incorrect results due to broadcasting. Please ensure they have the same size.

**Cause:** the model outputs shape (batch, 1) and the target is (batch,). Subtracting them **broadcasts** to a
(batch, batch) matrix, so every prediction is compared with every target, and the best the model can do is predict
the average.
**Fix:** \`.squeeze(1)\` the output (or \`unsqueeze(1)\` the target). With the fix, the same network reaches an MSE
of **0.248**. Treat this warning as an error.

## 6. Predictions that change every time

**Symptom:** scoring the same two orders twice gives [0.217, −0.376] and then [0.023, −0.225].
**Cause:** the model is still in **training mode**, so dropout is randomly zeroing units at prediction time (and
batch-norm layers would be updating their statistics).
**Fix:** \`model.eval()\` before evaluating or predicting, and \`model.train()\` again before the next epoch. After
\`eval()\`, both calls give [0.199, −0.167].

## 7. The loss explodes to 10³²

**Symptom:** a network predicting monthly UPI spend from monthly income: losses 1.5 × 10⁸, then **1.53 × 10³²**,
then stuck around 10²⁶.
**Cause:** the input is income in rupees (around 40,000). The gradient for the first layer is proportional to the
input, so a learning rate that suits inputs near 1 takes a step 40,000 times too large.
**Fix:** standardise inputs (and, for regression, consider scaling the target), fitting the scaler on training
data only. If the loss becomes \`nan\`, also check the data for inf or NaN and lower the learning rate; clip
gradients for RNNs and transformers.

## 8. The model in production is worse than the notebook said

**Symptom:** the notebook's best validation loss was 0.451; the deployed model's test AUC is **0.675**, not the
0.722 the team expected.
**Cause:** the saved weights are from the **last** epoch (150), long after validation loss had started rising
(1.987 by then). The good result was from epoch 4.
**Fix:** keep the best state during training (early stopping) and save **that** \`state_dict\`; plot both curves.

## The order of checks when a network misbehaves

1. Shapes and dtypes at every step of one batch — model output vs target, especially (batch, 1) vs (batch,).
2. Output layer and loss match: logits into \`CrossEntropyLoss\` / \`BCEWithLogitsLoss\`; labels 0…k−1, int64.
3. Sanity values: an untrained k-class classifier's loss should be about ln k (1.386 for 4 classes); far above
   that means a bug.
4. Can it overfit 50 rows? If it cannot drive the loss towards zero on a tiny subset, the loop or the data is broken.
5. Inputs scaled; no NaN; learning rate in a sensible range.
6. \`zero_grad\` every step; \`train()\` / \`eval()\` switched; \`no_grad\` for evaluation.
7. Validation curve watched, best weights kept, seeds fixed.`,
    mcqs: [
      mcq('A 4-class model ending in nn.Softmax is trained with nn.CrossEntropyLoss, and its loss never falls below about 0.74. Why?', [
        ['Softmax is applied twice, so the loss can never reach a confident prediction', true],
        ['The learning rate is too low for the loss to go below the class-balance level', false],
        ['CrossEntropyLoss cannot be used with more than two classes without weights', false],
        ['The classes are imbalanced, which sets a floor on any cross-entropy loss', false],
      ], 'CrossEntropyLoss applies log-softmax to its input. Feeding it probabilities in [0, 1] caps how confident the second softmax can be: −ln(e / (e + 3)) ≈ 0.744 for 4 classes.'),
      mcq('A regression network prints "Using a target size (torch.Size([64])) that is different to the input size (torch.Size([64, 1]))". What is the right response?', [
        ['Squeeze the output to (64,) — the loss is broadcasting to a 64 × 64 comparison', true],
        ['Ignore it; PyTorch aligns the two shapes automatically before computing the loss', false],
        ['Reshape the target to (1, 64), so that both tensors have two dimensions', false],
        ['Switch to L1Loss, which is not affected by differences in tensor shapes', false],
      ], 'Broadcasting compares every prediction with every target, so the model can only learn the mean. The fix in the notes took the MSE from 18.29 to 0.248.'),
      mcq('Scoring the same two orders twice gives different predictions. What was forgotten?', [
        ['model.eval(), so dropout is still active at prediction time', true],
        ['torch.manual_seed(), which must be set before every prediction', false],
        ['opt.zero_grad(), so old gradients are changing the predictions', false],
        ['torch.no_grad(), without which predictions are always random', false],
      ], 'In training mode dropout zeroes a random subset of units on every call. eval() switches it off; no_grad saves memory but does not change dropout.'),
      mcq('An untrained 4-class classifier starts with a training loss of 9.6. What does that suggest?', [
        ['A bug, since an untrained model should start near ln 4 ≈ 1.39', true],
        ['Nothing unusual, since an untrained model can start at any loss', false],
        ['The model is already overfitting before any training has begun', false],
        ['The classes are perfectly balanced, which raises the starting loss', false],
      ], 'Random small weights give nearly uniform probabilities, so the loss starts near −ln(1/k). Far above it points to unscaled inputs, wrong labels or a broken output layer.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_DEEP_LEARNING_PRACTICE',
    notes: `Six exercises. Work each on paper first, then check it in a notebook — every answer below was verified in
PyTorch.

## Exercise 1 — Count the parameters

A churn model for a telecom takes 30 features through two hidden layers of 64 units and outputs 3 classes (stays,
downgrades, leaves). How many learnable parameters does it have?

**Answer.** 30 × 64 + 64 = 1,984; 64 × 64 + 64 = 4,160; 64 × 3 + 3 = 195. Total **6,339**. Check:
\`sum(p.numel() for p in model.parameters())\`.

## Exercise 2 — Trace an image through ResNet's first layers

A 224 × 224 RGB photo goes into \`nn.Conv2d(3, 64, kernel_size=7, stride=2, padding=3)\`, then
\`nn.MaxPool2d(kernel_size=3, stride=2, padding=1)\`. Give the shape after each, and the conv layer's parameter count.

**Answer.** Conv: ⌊(224 + 6 − 7) / 2⌋ + 1 = 112, so **(64, 112, 112)**; parameters 64 × 3 × 7 × 7 + 64 = **9,472**. Pool:
⌊(112 + 2 − 3) / 2⌋ + 1 = 56, so **(64, 56, 56)**. This is exactly the start of ResNet-18.

## Exercise 3 — Softmax and cross-entropy

A 3-class model (veg, non-veg, dessert) outputs logits [2.0, 0.5, −1.0] for a dish. Give the probabilities and the
cross-entropy loss if the true class is veg, and if it is dessert. What loss should an untrained 6-class model start
near?

**Answer.** Softmax: **[0.786, 0.175, 0.039]**. True veg: −ln 0.786 = **0.241**. True dessert: −ln 0.039 = **3.241** —
confident and wrong is punished hard. An untrained 6-class model predicts about 1/6 each, so its loss starts near
ln 6 = **1.792**.

## Exercise 4 — One gradient step by hand

A single sigmoid neuron with weights w = [0.5, −0.25], bias 0, sees x = [1.0, 2.0] with label 1 and binary
cross-entropy loss. For this loss the gradient with respect to w is (p − y) · x. Compute p, the gradient, and w after
one step with learning rate 0.1.

**Answer.** z = 0.5 − 0.5 = 0, so p = **0.5**. Gradient = (0.5 − 1) × [1, 2] = **[−0.5, −1.0]**. New
w = w − 0.1 × gradient = **[0.55, −0.15]**. Both weights move to raise z, and so p, towards the label.

## Exercise 5 — Attention by hand

A query has dot products 4 and 0 with two keys, and d = 4. The values are 100 (key 1) and 20 (key 2). Compute the
attention weights and the output.

**Answer.** Scale by √4 = 2: scores 2 and 0. Softmax: e² / (e² + 1) = **0.881** and **0.119**. Output:
0.881 × 100 + 0.119 × 20 = **90.5**. Without the scaling, scores 4 and 0 would give 0.982 / 0.018 — sharper, which
is what √d prevents from getting extreme as d grows.

## Exercise 6 — Read the runs

Four training runs of a 2-class network, losses per epoch. Name the problem in each and the first thing to try.

    A: train 0.693 0.693 0.693 0.693 0.693        val 0.693 …
    B: train 0.61 0.58 nan nan nan
    C: train 0.42 0.21 0.06 0.01 0.00             val 0.45 0.49 0.66 0.92 1.30
    D: train 0.66 0.62 0.58 0.55 0.52             val 0.66 0.62 0.59 0.56 0.53

**Answer.** **A:** stuck at ln 2 = 0.693 — predicting 50/50 for everything; it is not learning at all. Check the
labels and the loss wiring, that \`opt.step()\` is called, and the learning rate. **B:** diverged — lower the learning
rate, check inputs for inf/NaN and scaling, clip gradients. **C:** overfitting from epoch 1 — early stopping,
dropout, weight decay, a smaller network or more data. **D:** healthy but unfinished — both curves falling together;
train longer, or raise the learning rate.`,
    mcqs: [
      mcq('In Exercise 1, how many parameters does the 30 → 64 → 64 → 3 network have?', [
        ['6,339', true],
        ['6,144', false],
        ['6,208', false],
        ['5,952', false],
      ], '1,984 + 4,160 + 195 = 6,339. 6,144 counts the weights (1,920 + 4,096 + 192) but forgets the 131 biases.'),
      mcq('In Exercise 2, what shape leaves the max-pooling layer?', [
        ['(64, 56, 56)', true],
        ['(64, 112, 112)', false],
        ['(64, 55, 55)', false],
        ['(3, 56, 56)', false],
      ], 'The conv gives (64, 112, 112); MaxPool2d(3, stride 2, padding 1) gives ⌊(112 + 2 − 3) / 2⌋ + 1 = 56. Pooling keeps the 64 channels.'),
      mcq('In Exercise 3, what is the cross-entropy loss when the true class is veg?', [
        ['0.241', true],
        ['0.786', false],
        ['3.241', false],
        ['1.792', false],
      ], 'Loss = −ln(p of the true class) = −ln 0.786 = 0.241. 0.786 is the probability itself; 3.241 is the loss for dessert.'),
      mcq('In Exercise 4, what are the weights after one step?', [
        ['[0.55, −0.15]', true],
        ['[0.45, −0.35]', false],
        ['[0.50, −0.25]', false],
        ['[0.60, −0.05]', false],
      ], 'The gradient is (0.5 − 1) × [1, 2] = [−0.5, −1.0]; subtracting 0.1 × gradient adds [0.05, 0.10]. [0.45, −0.35] steps the wrong way, up the gradient.'),
      mcq('In Exercise 6, both training and validation loss sit at exactly 0.693 for every epoch of run A. What does that indicate?', [
        ['The model outputs 50/50 for everything and is not learning at all', true],
        ['The model has converged to the best possible loss for the problem', false],
        ['The model is overfitting, since the two losses are exactly equal', false],
        ['The learning rate is too high, which keeps resetting the weights', false],
      ], '0.693 = ln 2, the loss of predicting probability 0.5 for every example. A loss frozen there means no learning: check labels, the loss, the optimiser step and the learning rate.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_DEEP_LEARNING_INTERVIEW_QUESTION',
    notes: `For an entry data-scientist or ML role, deep-learning questions test whether you understand what happens inside
training — not whether you can recite architectures. Expect one "explain it" question, one "what would you do"
question, and a probe of whether you know when **not** to use a network.

## 1. "Explain backpropagation. Why do gradients vanish, and how is that handled?"

**Model answer.** "Training needs the gradient of the loss with respect to every weight. Backpropagation gets them
all in one backward pass: after the forward pass computes the output and loss, it applies the chain rule from the
loss back towards the input — each layer's gradient is the gradient arriving from the layer above multiplied by its
own local derivative. It reuses the activations stored in the forward pass, which is why training needs more memory
than inference.

Because it multiplies one factor per layer, gradients can shrink towards zero through many layers — sigmoid's slope
is at most 0.25, so ten sigmoid layers can shrink a gradient about a million times — and the early layers stop
learning. Or they can grow and explode, which shows up as a nan loss. The fixes are ReLU-family activations, sensible
initialisation, normalisation layers like batch norm or layer norm, residual connections that give the gradient a
direct path, and gradient clipping for explosions — which is standard in RNN and transformer training."

**Follow-ups:**
- *"What does an optimiser like Adam add on top of the gradient?"* Momentum (a running average of gradients) and a
  per-parameter step size from a running average of squared gradients, so it is less sensitive to the learning rate.
- *"Why can't you initialise all weights to zero?"* Every unit in a layer would compute the same thing and receive
  the same gradient, so they would stay identical — the symmetry is never broken.

## 2. "We have 2,000 product photos in 8 categories. How would you build the classifier?"

**Model answer.** "I wouldn't train from scratch — 2,000 photos is far too few. I'd start from a pretrained image
model such as a ResNet or an EfficientNet.

First the split: photos of the same product must not be on both sides, so I'd split by product ID — and by seller
too if new sellers matter — into train, validation and test. Then a baseline: freeze the backbone, extract its
features and fit a logistic regression; on a small set that alone is often strong. Then fine-tuning in two stages:
train a new 8-class head with the backbone frozen, then unfreeze the last block or two with a learning rate 10 to 100
times lower than the head's, with augmentation — random crops, flips, colour jitter — and early stopping on
validation loss. I'd use the preprocessing the weights were trained with.

Then I'd read the errors: a confusion matrix, and the misclassified photos themselves — they usually show label
noise, duplicates or a shortcut such as one seller's watermark. Finally one evaluation on the test products, reported
per class."

**Follow-ups:**
- *"Validation accuracy is 99% but sellers complain. Why?"* Likely leakage (same product, or duplicate re-uploads,
  across the split) or a shortcut the model learned (backgrounds, watermarks) that new sellers do not share; check
  the split and accuracy per seller.
- *"One category has 60 photos and another 600."* Report per-class recall; try class weights or oversampling the
  small class, and collect more photos for it if the business cares.

## 3. "Should we use a neural network for our loan-default model?"

**Model answer.** "Probably not as the first choice. Loan data is a table of a few dozen engineered columns; on
tables, gradient-boosted trees are usually as accurate or more, train in minutes, handle missing values and mixed
types natively, and are easier to explain to a credit committee and a regulator. I've seen a small network on
tabular delivery data match logistic regression to within 0.003 AUC, and on 450 rows lose to it — 0.728 against
0.741.

A network earns its place when the data is unstructured — documents, images, free-text notes — or very large with
high-cardinality IDs that benefit from learned embeddings, or when it is part of a larger system, like text
embeddings feeding a tabular model. So I'd build the boosted model and a logistic baseline first, and add a network
only if a specific input calls for it, judged on the same validation."

**Follow-ups:**
- *"What are entity embeddings?"* A learned vector per category value (city, merchant, pincode), trained with the
  network; they can also be extracted and fed to a tree model.
- *"If the network were 0.01 AUC better, would you deploy it?"* Only after checking that the gap is beyond the
  cross-validation spread, and weighing explainability, monitoring and the cost of running it.

## How to answer deep-learning questions well

Explain the mechanism in plain words first, then the fix or the decision. Bring numbers you have actually seen —
"from 0.458 to 0.995 with a pretrained backbone" lands better than "transfer learning is powerful". And always say
how you validated.`,
    mcqs: [
      mcq('An interviewer asks why all of a layer\'s weights cannot start at zero. Which answer is right?', [
        ['Every unit would compute and learn the same thing, so the symmetry never breaks', true],
        ['Zero weights make the loss undefined, so PyTorch refuses to start the training', false],
        ['Zero weights give exploding gradients on the very first backward pass of training', false],
        ['They can — zero is the standard start, and the bias terms break the symmetry later', false],
      ], 'Identical units receive identical gradients and stay identical. Random initialisation, scaled to the layer size, gives each unit a different start.'),
      mcq('A fine-tuned product-photo model scores 99% on validation, but new sellers\' photos are often wrong. What should be checked first?', [
        ['Whether the split kept products and sellers apart, and per-seller accuracy', true],
        ['Whether a larger backbone would raise validation accuracy to 100% overall', false],
        ['Whether training for more epochs would make the model generalise better', false],
        ['Whether the learning rate of the head was set higher than the backbone\'s', false],
      ], 'A near-perfect validation score that does not survive new sellers points to leakage or a shortcut, such as backgrounds or watermarks shared within a seller.'),
      mcq('For a loan-default model on 40 tabular columns, what is the strongest interview answer about using a neural network?', [
        ['Start with boosted trees and a logistic baseline; add a network only if an input needs it', true],
        ['Use a deep network, since more layers always extract more signal from any table of data', false],
        ['Use a CNN on the table, since convolutions find patterns between neighbouring columns', false],
        ['Avoid machine learning entirely, since credit decisions may only use hand-written rules', false],
      ], 'On tables, boosted trees are usually as accurate, faster and easier to explain. A network earns its place with unstructured inputs or very large, high-cardinality data.'),
    ],
  },

  /* ── MINI_PROJECT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_DEEP_LEARNING_MINI_PROJECT',
    notes: `# Mini Project — Classifying Product Images with Transfer Learning

A fashion-and-lifestyle marketplace lets sellers upload products with a category, and about one listing in thirty
lands in the wrong category — kurtas filed as sarees, mugs as bottles — which buries them in search. The catalogue
team wants a model that suggests the category from the photos, so a wrong choice can be flagged at upload. You will
fine-tune a pretrained image model on the sellers' photos with an honest split, a frozen-then-unfrozen schedule, a
confusion matrix, and the misclassified photos explained.

## The data

Generate the catalogue with this script (seed fixed; about 25 seconds). Photos are drawn, so the project runs on a
laptop CPU, and the script plants **deliberate traps** of the kind real catalogues have; finding them is part of the
project.

    import numpy as np, pandas as pd
    from pathlib import Path
    from PIL import Image, ImageDraw

    rng = np.random.default_rng(2026)
    CATS = ["kurta", "saree", "bangles", "phone_cover", "bottle", "mug"]
    P_CAT = [0.24, 0.20, 0.18, 0.18, 0.14, 0.06]           # mugs are rare
    out = Path("catalogue"); out.mkdir(exist_ok=True)

    def draw(cat, col, s, bg, rng, size=128, mark=False):
        im = Image.new("RGB", (size, size), bg); d = ImageDraw.Draw(im)
        cx, cy = (int(v) for v in rng.integers(52, 76, 2))
        if cat == "kurta":
            w, h = 20*s, 46*s
            d.polygon([(cx-w, cy-h+10), (cx-w-18*s, cy-h+34*s), (cx-w, cy-h+38*s), (cx-w, cy+h), (cx+w, cy+h),
                       (cx+w, cy-h+38*s), (cx+w+18*s, cy-h+34*s), (cx+w, cy-h+10), (cx, cy-h)], fill=col)
        elif cat == "saree":
            w, h = 44*s, 28*s
            d.rectangle([cx-w, cy-h, cx+w, cy+h], fill=col)
            d.rectangle([cx-w, cy+h-9*s, cx+w, cy+h], fill=tuple(255 - c for c in col))   # contrasting border
        elif cat == "bangles":
            for k in range(int(rng.integers(1, 4))):
                r = 26*s; ox = k*10*s - 10
                d.ellipse([cx-r+ox, cy-r, cx+r+ox, cy+r], outline=col, width=int(5*s)+1)
        elif cat == "phone_cover":
            w, h = 24*s, 46*s
            d.rounded_rectangle([cx-w, cy-h, cx+w, cy+h], radius=int(10*s), fill=col)
            d.ellipse([cx-w+6, cy-h+6, cx-w+18, cy-h+18], fill=bg)
        elif cat == "bottle":
            w, h = 13*s, 44*s
            d.rectangle([cx-w, cy-h+12, cx+w, cy+h], fill=col)
            d.rectangle([cx-w/2, cy-h, cx+w/2, cy-h+12], fill=tuple(int(c*0.6) for c in col))
        else:  # mug
            w, h = 22*s, 26*s
            d.rectangle([cx-w, cy-h, cx+w, cy+h], fill=col)
            d.ellipse([cx+w-6, cy-12*s, cx+w+20*s, cy+12*s], outline=col, width=int(5*s)+1)
        im = im.rotate(float(rng.uniform(-20, 20)), fillcolor=bg)
        if mark:   # the studio seller's watermark, bottom-right
            ImageDraw.Draw(im).rectangle([size-26, size-14, size-4, size-4], fill=(40, 40, 40))
        arr = np.asarray(im).astype(np.float32) * rng.uniform(0.7, 1.15) + rng.normal(0, 10, (size, size, 3))
        return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

    rows = []
    sellers = [f"S{i:02d}" for i in range(1, 41)]
    for pid in range(1, 901):
        seller = "S07" if rng.random() < 0.10 else rng.choice(sellers)          # S07 lists about 1 product in 10
        # trap: seller S07 is a studio that mostly lists bottles, on white, with a watermark
        cat = rng.choice(CATS, p=[0.05, 0.05, 0.05, 0.05, 0.75, 0.05]) if seller == "S07" else rng.choice(CATS, p=P_CAT)
        col = tuple(int(v) for v in rng.integers(0, 200, 3)); s = rng.uniform(0.75, 1.1)
        for k in range(int(rng.integers(2, 7))):     # trap: several photos of the same product
            studio = seller == "S07"
            bg = (250, 250, 250) if studio else tuple(int(v) for v in rng.integers(150, 256, 3))
            im = draw(cat, col, s * rng.uniform(0.92, 1.08), bg, rng, mark=studio)
            f = f"P{pid:04d}_{k}.png"; im.save(out / f)
            rows.append({"image_file": f, "product_id": f"P{pid:04d}", "seller_id": seller, "category": cat,
                         "listed_month": int(rng.integers(1, 13))})
    df = pd.DataFrame(rows)
    # trap: about 3% of kurta and saree photos carry the other label (sellers pick the wrong category)
    swap = df.index[df.category.isin(["kurta", "saree"]) & (rng.random(len(df)) < 0.03)]
    df.loc[swap, "category"] = df.loc[swap, "category"].map({"kurta": "saree", "saree": "kurta"})
    # trap: 60 re-uploads — an existing photo saved again under a new product id
    dup = df.sample(60, random_state=3).copy()
    for i, (_, r) in enumerate(dup.iterrows()):
        f = f"P{901 + i:04d}_0.png"
        Image.open(out / r.image_file).save(out / f)
        rows_new = r.copy(); rows_new["image_file"] = f; rows_new["product_id"] = f"P{901 + i:04d}"
        df.loc[len(df)] = rows_new
    # trap: 25 blank uploads (camera failure), labelled anyway
    for i in range(25):
        f = f"P{961 + i:04d}_0.png"
        Image.new("RGB", (128, 128), (int(rng.integers(0, 30)),) * 3).save(out / f)
        df.loc[len(df)] = {"image_file": f, "product_id": f"P{961 + i:04d}", "seller_id": rng.choice(sellers),
                           "category": rng.choice(CATS, p=P_CAT), "listed_month": int(rng.integers(1, 13))}
    df.to_csv("labels.csv", index=False)

It writes **3,664 photos** (128 × 128) of 985 product IDs from 40 sellers to \`catalogue/\`, and \`labels.csv\`:

| Column | Meaning |
|---|---|
| image_file | File name in \`catalogue/\` |
| product_id | The listing; one product has 2–6 photos |
| seller_id | S01–S40 |
| category | The seller's chosen category — **the label, and it is not always right** |
| listed_month | 1–12 |

Category counts: kurta 787, bottle 724, phone_cover 671, saree 653, bangles 623, **mug 206**.

## Tasks

1. **Frame it.** The model suggests a category at upload; a suggestion that disagrees with the seller's choice is
   flagged for review. Say what an error of each kind costs (a wrong flag annoys a seller; a missed one buries a
   listing) and choose the metrics: overall accuracy, **per-class recall and precision**, and macro-F1 — say why
   accuracy alone is not enough with 206 mugs.
2. **Audit the data before any model.** Look at a grid of photos per category and per seller. Find the **blank
   uploads**, the **exact duplicates** under different product IDs (hash the files or the pixel arrays), the
   **studio seller** whose photos differ systematically, and estimate how many labels look wrong. Decide, with
   reasons, what to drop, what to keep, and what to fix.
3. **Split honestly.** Split by **product_id** (and keep duplicate re-uploads with their originals) into train,
   validation and test — \`StratifiedGroupKFold\` or \`GroupShuffleSplit\`. For one model, show how much a
   random photo-level split inflates the score.
4. **Baseline.** Frozen pretrained backbone (ResNet-18 from the Hugging Face Hub or torchvision, or another small
   model) as a feature extractor, with logistic regression on its features. Use the backbone's own preprocessing.
5. **Fine-tune.** A new 6-class head; **stage 1** backbone frozen; **stage 2** last block (or more) unfrozen with a
   learning rate 10–100× lower than the head's. Augmentation on the training photos only (say which ones and why
   they keep the label true). Early stopping on validation loss; plot both loss curves.
6. **Evaluate once on the test products.** Accuracy, macro-F1, per-class recall and precision, and a **confusion
   matrix**.
7. **Explain the misclassified photos.** Show every test error (or the first 30) with true and predicted labels and
   the predicted probability, and sort them into causes: wrong label, blank or broken image, genuinely ambiguous,
   model error. Check the studio seller separately: does the model rely on the white background or watermark? (For
   example, compare accuracy on S07's photos with others', or blank out the watermark corner and re-score.)
8. **Recommend.** Should the marketplace use the model to flag mismatches? At what confidence threshold, and how
   many listings per thousand would be flagged for review?

## Deliverables

1. **\`product_images.ipynb\`** — generates the data with the script above and runs top to bottom after
   "Restart & Run All" on a CPU (keep total training under about 15 minutes; 128 × 128 inputs and a ResNet-18 are
   enough).
2. **\`catalogue_note.pdf\`** (or .docx), **one to two pages** for the catalogue team: the recommendation, the
   expected flag rate and accuracy per category, the data problems found and what the team should fix at upload,
   and what the model cannot do.
3. **\`README.md\`** — how to run it; library versions (PyTorch, transformers or torchvision, scikit-learn, Pillow).

## Acceptance criteria

- Blank uploads and exact duplicates are detected, counted and handled with a stated rule; suspected wrong labels
  are estimated and discussed, not silently trained on.
- The split keeps every product (and its re-uploads) on one side; the inflation from a photo-level split is shown.
- A frozen-backbone baseline is reported before fine-tuning, and fine-tuning is reported against it.
- Fine-tuning uses a frozen stage and an unfrozen stage with a lower backbone learning rate; augmentation touches
  training data only; early stopping uses validation data only; both loss curves are plotted.
- The test products are scored once; per-class metrics and a confusion matrix are reported; the mug class is
  discussed.
- Misclassified photos are shown and categorised; the studio seller's background and watermark are checked as a
  possible shortcut.
- The recommendation states a threshold and the resulting flag rate, in the business's terms.`,
    mcqs: [
      mcq('Each product has 2–6 photos, and 60 photos were re-uploaded under new product IDs. How should the data be split?', [
        ['By product, with each re-upload kept on the same side as its original', true],
        ['At random by photo, stratified by category so all classes are balanced', false],
        ['By listed_month, with the earliest months for training and the latest for test', false],
        ['At random by photo, after removing the 25 blank uploads from the catalogue', false],
      ], 'Photos of one product are near-duplicates, and a re-upload is an exact one. Splitting by photo puts copies on both sides and measures memory; on this catalogue a frozen probe scored about 1.5 points higher on a random photo split than on a product split.'),
      mcq('Seller S07 photographs mostly bottles on a white background with a watermark. What is the risk to the model?', [
        ['It may learn background and watermark as signs of a bottle, a shortcut that fails elsewhere', true],
        ['None, because convolutional networks ignore the background and see only the main object', false],
        ['The watermark makes S07\'s images unreadable, so all of them must be dropped from training', false],
        ['White backgrounds use more memory, which slows the training of every other seller\'s photos', false],
      ], 'A feature that correlates with a class in training — a studio\'s backdrop and mark — can be learned instead of the object. Checking S07 separately, or masking the watermark, tests whether the model relies on it.'),
    ],
    assignment: {
      title: 'Classifying Product Images with Transfer Learning',
      description: 'Fine-tune a pretrained image model to suggest a product category from sellers\' photos: audit the catalogue for blank uploads, duplicates, wrong labels and a studio shortcut; split by product; compare a frozen-backbone baseline with a two-stage fine-tune; evaluate once with per-class metrics and a confusion matrix; explain the misclassified photos; and recommend a flagging threshold.',
      instructions: `Complete the project described in this unit's brief and submit a repository link or a zip.

**Submit:**

1. \`product_images.ipynb\` — generates the catalogue with the brief's script, then: framing and metrics; the data
   audit (blank uploads, exact duplicates, the studio seller, suspected wrong labels — counts and your rules); a
   product-level split with re-uploads kept beside their originals, and the photo-level comparison; a frozen-backbone
   baseline; a two-stage fine-tune with augmentation, early stopping and both loss curves; one test evaluation with
   accuracy, macro-F1, per-class metrics and a confusion matrix; the misclassified photos shown and categorised; the
   shortcut check on seller S07; and the threshold and flag rate. It must run top to bottom on a CPU after
   "Restart & Run All".
2. \`catalogue_note.pdf\` or \`.docx\`, one to two pages — recommendation first: threshold, flag rate, accuracy per
   category, data problems to fix at upload, limits.
3. \`README.md\` — how to run it and the library versions.

**Before you submit,** go through the acceptance criteria in the brief and note each result at the end of the
notebook (for example: "Blank uploads: …; duplicates: …; photo-split vs product-split accuracy: …").`,
      rubric: [
        { criterion: 'Data audit', description: 'Blank uploads and exact duplicates detected and counted with stated rules; suspected wrong labels estimated and handled deliberately; the studio seller identified; the rare mug class noted.', maxPoints: 20 },
        { criterion: 'Honest validation', description: 'Split by product with re-uploads kept beside their originals; the photo-level inflation shown; early stopping and all choices on validation data; the test products scored once.', maxPoints: 25 },
        { criterion: 'Transfer learning done well', description: 'A frozen-backbone baseline first; a two-stage fine-tune with a lower backbone learning rate; preprocessing matching the pretrained weights; label-preserving augmentation on training data only; both loss curves plotted and read.', maxPoints: 25 },
        { criterion: 'Error analysis and recommendation', description: 'Per-class metrics and a confusion matrix; misclassified photos shown and sorted into causes; the background and watermark shortcut tested; a threshold and flag rate recommended in business terms; the note is clear and names limits; README and versions included.', maxPoints: 30 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_DEEP_LEARNING_CHECKPOINT',
    notes: `Ten questions across the topic: neurons and layers, backpropagation, PyTorch, training networks well, CNNs and
transfer learning, and sequence models. Several give numbers — work them out before looking at the options.`,
    checkpoint: [
      ck(NN, 'How many learnable parameters does a network with 10 inputs, one hidden layer of 32 units and 1 output have?', [
        ['385', true],
        ['352', false],
        ['353', false],
        ['320', false],
      ], '10 × 32 + 32 = 352 for the hidden layer, and 32 × 1 + 1 = 33 for the output: 385. 320 counts only the first layer\'s weights.'),
      ck(NN, 'A 3-class model outputs logits [1, 2, 3]. What probability does softmax give the third class?', [
        ['About 0.665', true],
        ['About 0.500', false],
        ['About 0.333', false],
        ['About 0.900', false],
      ], 'e³ / (e¹ + e² + e³) = 20.09 / 30.19 ≈ 0.665; the others get 0.090 and 0.245. Softmax depends on differences between logits, not on their ratio.'),
      ck(NN, 'A feature map of shape (32, 64, 64) passes through nn.MaxPool2d(2). What shape comes out?', [
        ['(32, 32, 32)', true],
        ['(16, 64, 64)', false],
        ['(16, 32, 32)', false],
        ['(32, 63, 63)', false],
      ], 'Pooling works on each channel separately, halving height and width with a 2 × 2 window and stride 2; the 32 channels are unchanged.'),
      ck(NN, 'Why do residual connections (output = x + f(x)) help very deep networks train?', [
        ['They give the gradient a direct path back, so it does not vanish', true],
        ['They halve the number of parameters, so the network trains faster', false],
        ['They replace the activation functions, so no ReLU layers are needed', false],
        ['They add dropout between layers, so the network cannot overfit', false],
      ], 'The identity path passes the gradient straight through each block, so early layers keep learning even in networks of 50 or more layers — the idea behind ResNet.'),
      ck(NN, 'Which kind of transformer suits classifying fintech support tickets into ten queues?', [
        ['An encoder model, which reads the whole ticket in both directions', true],
        ['A decoder model, which only ever reads the ticket left to right', false],
        ['An RNN with attention removed, which is faster on short tickets', false],
        ['Any model, since all transformers are identical inside each block', false],
      ], 'Encoder (BERT-style) models build a representation of the whole input and are the usual choice for classification and extraction; decoder models are built for generation, though they can also be prompted to classify.'),
      ck(TRN, 'An untrained 6-class classifier starts training. Roughly what loss should the first batch show if everything is wired correctly?', [
        ['About 1.79, which is ln 6', true],
        ['About 0.69, which is ln 2', false],
        ['About 0.17, which is 1 / 6', false],
        ['About 6.00, one per class', false],
      ], 'Small random weights give nearly uniform probabilities of 1/6, and −ln(1/6) = 1.79. A starting loss far from this points to a bug in the inputs, labels or output layer.'),
      ck(TRN, 'The training loss is 0.61, then 0.58, then nan from the third epoch. What should be tried first?', [
        ['Lower the learning rate and check the inputs for scaling, inf or NaN', true],
        ['Add dropout, since a nan loss is the usual sign of heavy overfitting', false],
        ['Train for more epochs, since the loss often recovers from nan by itself', false],
        ['Increase the batch size to 4,096, which makes nan losses impossible', false],
      ], 'A nan loss means the computation blew up: too large a step, exploding gradients or bad input values. Overfitting shows as diverging train and validation curves, not as nan.'),
      ck(TRN, 'Fine-tuning a pretrained ResNet, which learning rates are sensible after unfreezing the last block?', [
        ['About 1e-4 for the unfrozen block and 1e-3 for the new head', true],
        ['About 1e-1 for the whole network, so it adapts to the new data fast', false],
        ['The same 1e-3 everywhere, since the optimiser adapts each step anyway', false],
        ['Zero for the unfrozen block, so that its pretrained weights are kept', false],
      ], 'Pretrained weights should be nudged, not overwritten, so they get a rate 10–100× lower than the freshly initialised head. A zero rate would simply mean the block is still frozen.'),
      ck(TRN, 'Validation loss is lower than training loss for the whole run of a network that uses dropout. What is the likely explanation?', [
        ['Dropout handicaps the network in training mode but is off for validation', true],
        ['The validation set must contain training rows, which is a leak to fix now', false],
        ['The network is underfitting badly, and should be made much larger at once', false],
        ['The loss is being computed with the wrong sign on the validation batches', false],
      ], 'Training loss is measured with units randomly dropped; validation runs in eval mode with all units. A small reverse gap is normal — though checking the split does no harm.'),
      ck(TRN, 'Photos of the same product appear in both the training and validation sets. What happens to early stopping?', [
        ['It stops on a flattering validation loss that partly measures memorisation', true],
        ['It stops too early, because duplicates make the validation loss rise sooner', false],
        ['It is unaffected, since early stopping only looks at the training loss curve', false],
        ['It never triggers, because duplicated photos always give a validation loss of 0', false],
      ], 'When validation photos have near-copies in training, validation loss keeps falling as the network memorises, so the stopping point and the score are both too optimistic. Split by product.'),
    ],
  },
];
