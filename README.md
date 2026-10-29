# College Admissions Simulator

A customizable, browser-only Monte Carlo simulator for exploring a college application list. Enter your own colleges, available application rounds, and eventual admission probabilities, then explore final-offer distributions and decision paths.

**Live app:** open `index.html` locally, or serve it with GitHub Pages. No build step, runtime dependencies, account, API key, or backend.

## Get started

1. Open `index.html` in a modern browser.
2. Replace the three fictional examples, use **Add college**, or paste names in bulk.
3. Enter each college's **Admission %**. This is your estimate of *eventual* admission, including later review and waitlist conversion.
4. Check that college's offered rounds, then choose the round you intend to apply in.
5. Optionally adjust its waitlist and deferral assumptions.
6. Click **Run simulation**. Change stages or select one of the six percentile scenarios to inspect a possible cycle.

Supported round labels: **EA, EA II, REA, ED, ED II, RD, Rolling**. Availability is manually configured, not pulled from an official database. A selected round must be one of the offered rounds; each college must retain at least one offered round.

Your last settings are saved in browser local storage where available. **Export settings** downloads portable JSON; **Import settings** restores it after validation. These exports can contain your personal college list and estimates. The app's HTML never embeds your saved browser settings, and exporting settings does not modify the source file.

**Export six scenarios · CSV** downloads first decisions, final outcomes, and transition paths. Up to 200 colleges are supported. Every percentage accepts values from 0 to 100, including exact endpoints.

## Publish on GitHub Pages

1. Create a GitHub repository and upload this folder's contents, keeping `index.html` at the repository root.
2. In the repository's **Settings → Pages**, choose **Deploy from a branch**.
3. Select your publishing branch and **/(root)**, then save.
4. Open the Pages address GitHub displays after deployment.

The same files work on any static web host. Nothing needs to be installed to use the simulator.

## How the model works

### Admission probabilities

This tool does **not** estimate applicant odds, infer chances from credentials, or include actual college admission rates. The example colleges and percentages are fictional. All percentages are modeling assumptions entered by the user.

Each college's eventual admission probability is preserved. Selecting EA, ED, or another round does not automatically increase it. With independent outcomes, total offers follow a Poisson-binomial distribution; Monte Carlo sampling approximates it.

An optional Gaussian latent factor produces positively associated admissions outcomes. For college `i`, a shared standard normal draw `Z` and an independent draw `Zi` form `sqrt(rho) * Z + sqrt(1-rho) * Zi`. Admission occurs when this value is below the standard normal quantile of the entered probability. `rho` is a latent correlation parameter, **not** the observed correlation of binary decisions.

The seeded pseudorandom generator makes repeated runs with the same list, order, probabilities, rounds, seed, and settings reproducible. The seed is for simulation, not security.

### Waitlists and deferrals

For each college:

- `p`: probability of eventual admission.
- `w`: conditional probability of waitlisting when not directly admitted.
- `q`: conditional probability of an offer once waitlisted.
- `d`: direct admission probability, calibrated as `(p - w*q) / (1 - w*q)`.

This gives `d + (1-d)*w*q = p`. If a waitlist pathway would imply too many offers, the effective `w` is capped at `0.95*p/q` when `q > 0`. That preserves the requested `p` while keeping a small direct-admission component. This is a modeling convention. The waitlist input displayed in the editor remains the user's requested assumption; the effective probability can be lower.

The model draws eventual admission first, then assigns a route conditional on the final result. In full mode, a successful early application is admitted immediately with probability `0.76 + 0.18*p` unless assigned a waitlist route. Other successful early applications are deferred and admitted in later review. The per-college deferral input controls continued review for *unsuccessful early applications not assigned a waitlist route*. These are illustrative timing assumptions, not official early-admission statistics.

- **Deferrals + waitlists:** models both pathways.
- **Waitlists only:** disables deferrals and simplifies notification timing, including possible early-stage waitlist outcomes.
- **Admit / deny only:** models final binary decisions without waitlists or deferrals.
- **Rolling:** no modeled waitlists or deferrals.

### Rounds and stages

- EA, EA II, REA, and ED appear in the early stage.
- ED II is a later round and remains pending in the early stage. The model allows a later deferral pathway for ED II in full mode.
- RD remains pending in the early stage.
- Rolling decisions are treated as available at the early stage as a convenience.
- “Each college's first decision” combines notifications from different times; it is not a single calendar date.
- “After later review” resolves deferred applications, while waitlists may remain open.
- “Final” resolves waitlists and shows admitted or denied outcomes.

**ED and ED II are binding in practice.** The simulator compares hypothetical application outcomes independently of withdrawal obligations. It does not enforce an application calendar, ED withdrawals, deadlines, or REA restrictions. It flags multiple ED selections and REA combinations for attention. Verify actual college policies before applying.

## Privacy and implementation

- All simulation, rendering, imports, and exports happen in the browser.
- No analytics, cookies, external scripts, external fonts, network requests, or credentials.
- Local storage is specific to your browser and origin; behavior for `file://` URLs varies. JSON export is the portable backup.
- Imported settings are schema-checked and limited to 1 MB / 200 colleges.
- College names render as text, not HTML. CSV fields beginning with spreadsheet formula characters are escaped.
- Results are marked stale after an input changes; rerun before exporting results.
- Simulation yields between batches, and interaction is temporarily disabled while a run completes.

## Development and checks

The application is a single `index.html` file with embedded CSS and JavaScript. Modern browser features include `inert`, local storage, the File API, and object URLs. No build process is required.

Automated model checks (Node.js 18 or newer, no installation needed):

```sh
npm test
```

Checks cover JavaScript syntax, generic defaults, exact 0%/100% endpoints, empirical admission probabilities with correlation, waitlist calibration, simplified modes, rolling decisions, round timing, reproducibility, and settings validation. Browser layout and interaction checks are separate from this model suite.
