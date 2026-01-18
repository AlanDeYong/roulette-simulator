# Roulette Simulator Strategy Prompt Template

Use the following prompt when asking an LLM (like ChatGPT, Claude, or DeepSeek) to generate a strategy for this simulator.

---

**Copy and paste the text below:**

I need you to write a Javascript strategy function for a custom Roulette Simulator. 

**Requirements:**
1.  **Documentation (Crucial)**: You **MUST** include a block comment at the very top of the function explaining the strategy logic in natural language. Include:
    *   **The Logic**: What triggers a bet? What are the conditions?
    *   **The Progression**: How does the bet size change after wins/losses? (e.g., "Martingale: Double after loss, reset after win").
    *   **The Goal**: What is the target profit or stop-loss condition?
2.  **Function Signature**: `function bet(spinHistory, bankroll, config, state)`
3.  **Output**: Return an array of bet objects: `[{ type: '...', value: ..., amount: ... }]` or `null` / `[]` for no bets.
4.  **Respect Bet Limits**: You **MUST** use the limits defined in `config.betLimits` for all bet amounts. Do not hardcode bet amounts if possible, or ensure they are clamped to these limits.
    *   `config.betLimits.min` (Minimum for Inside bets like numbers)
    *   `config.betLimits.minOutside` (Minimum for Outside bets like Red/Black, Dozens)
    *   `config.betLimits.max` (Maximum bet allowed)
5.  **State Persistence**: Use the `state` object to store variables between spins (e.g., progression levels, triggers). Do not use global variables.
6.  **History Access**: `spinHistory` is an array of past results. The last result is `spinHistory[spinHistory.length - 1]`.
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
  startingBankroll: 2000
};

// Valid Bet Types
// - Inside: 'number' (value: 0-36), 'street' (value: start num), 'corner' (value: start num), 'line' (value: start num)
// - Outside: 'red', 'black', 'even', 'odd', 'low', 'high' (no value needed)
// - Multipliers: 'dozen' (value: 1, 2, or 3), 'column' (value: 1, 2, or 3)
```

**Example of correctly respecting limits:**

```javascript
function bet(spinHistory, bankroll, config, state) {
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
