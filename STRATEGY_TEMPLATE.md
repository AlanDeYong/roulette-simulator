# Roulette Simulator Strategy Prompt Template

Use the following prompt when asking an LLM (like ChatGPT, Claude, or DeepSeek) to generate a strategy for this simulator.

---

**Copy and paste the text below:**

I need you to write a Javascript strategy function for the Roulette Strategy. 

**Requirements:**
1.  **Documentation (Crucial)**: You **MUST** include a block comment at the very top of the function explaining the strategy logic in natural language. Include:
    *   **Source**: URL of source video and YouTube channel name.
    *   **The Logic**: What triggers a bet? What are the conditions?
    *   **The Progression**: How does the bet size change after wins/losses? (e.g., "Martingale: Double after loss, reset after win").
    *   **The Goal**: What is the target profit or stop-loss condition?
2.  **Function Signature**: `function bet(spinHistory, bankroll, config, state, utils)`
3.  **Output**: Return an array of bet objects: `[{ type: '...', value: ..., amount: ... }]` or `null` / `[]` for no bets.
4.  **Logging**: You generally do **NOT** need to generate external log files (using `utils.saveFile`) unless specifically requested for complex debugging or data export. The simulator handles internal logging of spin results and bankroll.
    *   If you *must* log for debugging, use `console.log()` sparingly.
5.  **Respect Bet Limits**: You **MUST** use the limits defined in `config.betLimits` for all bet amounts. Do not hardcode bet amounts if possible, or ensure they are clamped to these limits.
    *   `config.betLimits.min` (Minimum for Inside bets like numbers)
    *   `config.betLimits.minOutside` (Minimum for Outside bets like Red/Black, Dozens)
    *   `config.betLimits.max` (Maximum bet allowed)
6.  **State Persistence**: Use the `state` object to store variables between spins (e.g., progression levels, triggers). Do not use global variables.
7.  **History Access**: `spinHistory` is an array of past results. The last result is `spinHistory[spinHistory.length - 1]`.
    *   Access the number via `.winningNumber` (0-36).
    *   Access the color via `.winningColor` ('red', 'black', 'green').

**Reference Data Structures:**

```javascript
// Config Object
config = {
  betLimits: {
    min: 2,         // Use for Inside bets (straight up, split, street, corner, line)
    minOutside: 5,  // Use for Outside bets (red/black, even/odd, high/low, dozens, columns)
    max: 500        // Absolute max for any single bet
  },
  startingBankroll: 2000,
  minIncrementalBet: 1,      // New: Minimum amount to increase a bet by (default 1 unit)
  incrementMode: 'fixed'     // New: 'fixed' (increase by minIncrementalBet) or 'base' (increase by initial bet on that position)
};

// Incremental Bet Logic
// Strategies should respect `config.incrementMode`:
// - If 'fixed': Increase bets by `config.minIncrementalBet`
// - If 'base': Increase bets by the initial bet amount for that specific position
//
// Example Logic:
// let increment = config.incrementMode === 'base' ? initialBet : config.minIncrementalBet;
// currentBet += increment;


// Valid Bet Types
// - Inside: 
//   - 'number' (value: 0-36)
//   - 'street' (value: start num of row, e.g. 1, 4, 7...)
//   - 'corner' (value: top-left num, e.g. 1 covers 1,2,4,5)
//   - 'split' (value: array [n1, n2] OR single number for horizontal split)
//   - 'line' (value: start num of first row, e.g. 1 covers 1-6)
//   - 'basket' (value: 0 for 0,1,2,3 EU or 0,00,1,2,3 US)
// - Outside: 
//   - 'red', 'black', 'even', 'odd', 'low', 'high' (no value needed)
// - Multipliers: 
//   - 'dozen' (value: 1, 2, or 3)
//   - 'column' (value: 1, 2, or 3)
```

**Example of correctly respecting limits:**

```javascript
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const unit = config.betLimits.minOutside; // or config.betLimits.min

    // 2. Initialize State
    if (!state.progression) state.progression = 1;

    // 3. Calculate Bet Amount
    let amount = unit * state.progression;

    // 4. CLAMP TO LIMITS (Crucial!)
    // Ensure at least minimum
    amount = Math.max(amount, config.betLimits.minOutside); 
    // Ensure at most maximum
    amount = Math.min(amount, config.betLimits.max);

    // 5. Return Bet
    return [{ type: 'red', amount: amount }];
}
```

**My Strategy Description:**
[INSERT YOUR STRATEGY DESCRIPTION HERE]

