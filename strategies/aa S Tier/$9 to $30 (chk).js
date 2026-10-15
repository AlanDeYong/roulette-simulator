/**
 * ROULETTE STRATEGY: $9 to $30 Strategy (30 Numbers Covered / 4 Streets + Low)
 * 
 * Source:
 * - Channel: WillVegas
 * - Video URL: https://youtu.be/a8SwhOzEHFY
 * - Video Title: "29 HOURS OF WINNING! 🔥 The $9 to $30 Roulette Strategy!!!"
 * 
 * Full Logic in Detail:
 * - High-coverage, low-volatility roulette strategy covering 30 out of 37 (or 38) numbers on the wheel.
 * - Bets placed every spin:
 *   1. 1 Outside bet on Low (1-18) at 5 units ($5 base).
 *   2. 4 Inside Street bets covering 12 numbers in the high range (19-30) at 1 unit each ($1 base):
 *      - Street 19-21 (value: 19)
 *      - Street 22-24 (value: 22)
 *      - Street 25-27 (value: 25)
 *      - Street 28-30 (value: 28)
 * - Total base bet per spin: 5 + 1 + 1 + 1 + 1 = 9 units ($9 base).
 * - Numbers avoided: 0 (and 00 if American), plus numbers 31 through 36.
 * 
 * Full Bet Progression in Detail:
 * - Base bet units per progression level L:
 *   - Low (1-18): 5 * L units
 *   - Streets 19, 22, 25, 28: 1 * L units each
 * - Progression Mode (Peak Profit Locked):
 *   - On Loss: Increase progression level L by 1.
 *   - On Win: Check if bankroll reaches a new session peak profit.
 *     - If new session peak profit is reached: Reset level L to 1 (or reduce).
 *     - If current profit is below peak profit: Maintain current progression level L (do NOT reduce or reset).
 *   - Stop betting once target profit ($30 / 30 units) is reached.
 * 
 * The Goal:
 * - Target Profit: +$30 profit (or +30 base units above starting bankroll).
 * - Stop-loss / Bankroll Protection: Stop betting if total required bet exceeds remaining bankroll.
 

<scratchpad>
- Triggers and conditions: Place bets on every spin until target profit is reached or bankroll is insufficient.
- Peak Profit Rule Enforcement:
  - Track state.peakBankroll (initialized to starting bankroll).
  - Track state.level (starts at 1).
  - On Loss (winning number outside 1-30): Increase level (state.level += 1).
  - On Win (winning number in 1-30):
    - Check if current bankroll >= state.peakBankroll.
    - If current bankroll reaches or exceeds peak bankroll: update state.peakBankroll and reset level (state.level = 1).
    - If current bankroll is below state.peakBankroll: DO NOT reduce or reset level (keep state.level unchanged).
- Board positions and bet types:
  - Outside Bet: type 'low' (1-18) -> 5 base units
  - Inside Bets: type 'street'
    - Street 19-21 (value: 19) -> 1 base unit
    - Street 22-24 (value: 22) -> 1 base unit
    - Street 25-27 (value: 25) -> 1 base unit
    - Street 28-30 (value: 28) -> 1 base unit
</scratchpad>
*/

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Target profit definition ($30 target)
    const targetProfit = 3000;
    
    if (!state.initialized) {
        state.initialBankroll = bankroll;
        state.peakBankroll = bankroll;
        state.level = 1;
        state.initialized = true;
    }

    // Check if target profit is reached
    const currentProfit = bankroll - state.initialBankroll;
    if (currentProfit >= targetProfit) {
        return []; // Target reached, stop betting
    }

    // 2. Evaluate previous spin outcome & adjust progression level based on peak profit rule
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        // Covered numbers: 1-18 (Low) and 19-30 (4 Streets)
        const isWin = (num >= 1 && num <= 30);

        if (!isWin) {
            // On Loss: Increase progression level
            state.level += 1;
        } else {
            // On Win: Only reset/reduce level if session peak bankroll is reached or exceeded
            if (bankroll >= state.peakBankroll) {
                state.peakBankroll = bankroll;
                state.level = 1; // Reset to level 1 on reaching/exceeding session peak
            }
            // If bankroll is still below peak, state.level remains untouched (does not reduce)
        }
    }

    // 3. Determine unit size respecting bet limits
    const baseUnit = config.betLimits.min; 
    
    let lowAmount = baseUnit * 5 * state.level;
    let streetAmount = baseUnit * 1 * state.level;

    // Clamp amounts to table limits
    lowAmount = Math.max(config.betLimits.minOutside, Math.min(config.betLimits.max, lowAmount));
    streetAmount = Math.max(config.betLimits.min, Math.min(config.betLimits.max, streetAmount));

    const totalBetRequired = lowAmount + (streetAmount * 4);
    if (bankroll < totalBetRequired) {
        return []; // Insufficient funds to place full bet
    }

    // 4. Return the complete sequence of bets
    return [
        { type: 'low', amount: lowAmount },
        { type: 'street', value: 19, amount: streetAmount },
        { type: 'street', value: 22, amount: streetAmount },
        { type: 'street', value: 25, amount: streetAmount },
        { type: 'street', value: 28, amount: streetAmount }
    ];
}