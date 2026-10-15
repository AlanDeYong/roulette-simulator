/**
 * Strategy Name: Iron Turtle Roulette Strategy (Randomized Selections)
 * Source: YouTube / "Iron Turtle" Roulette Strategy
 * 
 * Full Logic in Details:
 * 1. Initial Bets: Place 4 outside bets simultaneously:
 *    - Two Dozen bets (selected randomly from Dozens 1, 2, and 3 at start / after reset)
 *    - Two Column bets (selected randomly from Columns 1, 2, and 3 at start / after reset)
 * 2. Section Tracking: Each of the 4 sections is managed independently with its own
 *    loss counter and progression level.
 * 3. Winning/Clearing: When a section wins, that specific bet is finished and removed 
 *    from the table ("cleared").
 * 4. Progression Trigger: If an active section experiences 3 consecutive losses, its 
 *    bet size escalates to the next progression tier on the 4th spin.
 * 5. Third-Spin Rule: If a section wins on its 3rd spin (or any spin prior to escalating),
 *    it is cleared and removed without escalating.
 * 6. Session Reset: Once all 4 sections are cleared, or when the overall target profit/stop-loss
 *    is reached, the entire system resets and randomly selects a fresh set of 2 dozens and 2 columns
 *    active at Level 0 ($1 / base unit).
 * 
 * Full Bet Progression in Details:
 * - Progression Tiers (Multipliers): [1, 5, 20, 75, 200] x base unit (scaled to minOutside).
 * - After 3 consecutive losses on a section: Increment section level ($1 -> $5 -> $20 -> $75 -> $200).
 * - After a win on a section: Section is cleared and removed from the current cycle layout.
 * 
 * Goal:
 * - Target Profit: +20 units (approx. $18–$25 base gain) per session.
 * - Stop Loss: 500 units max drawdown per session.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Establish Bet Limits & Base Unit
    const minOutside = (config && config.betLimits && config.betLimits.minOutside) ? config.betLimits.minOutside : 5;
    const maxBet = (config && config.betLimits && config.betLimits.max) ? config.betLimits.max : 500;
    
    // Progression Multipliers: 1x, 5x, 20x, 75x, 200x
    const progressionLadder = [1, 5, 20, 75, 200];
    const targetProfit = 20 * minOutside;
    const stopLoss = 500 * minOutside;

    // Helper: Pick 2 unique numbers randomly out of [1, 2, 3]
    function getRandomTwo() {
        const pool = [1, 2, 3];
        const firstIdx = Math.floor(Math.random() * pool.length);
        const first = pool.splice(firstIdx, 1)[0];
        const secondIdx = Math.floor(Math.random() * pool.length);
        const second = pool.splice(secondIdx, 1)[0];
        return [first, second];
    }

    // Helper: Initialize or Reset Session Sections with random dozen & column selections
    function resetSession() {
        const [d1, d2] = getRandomTwo();
        const [c1, c2] = getRandomTwo();

        state.sections = {
            'dozen_1': { type: 'dozen', value: d1, lossCount: 0, levelIdx: 0, cleared: false },
            'dozen_2': { type: 'dozen', value: d2, lossCount: 0, levelIdx: 0, cleared: false },
            'column_1': { type: 'column', value: c1, lossCount: 0, levelIdx: 0, cleared: false },
            'column_2': { type: 'column', value: c2, lossCount: 0, levelIdx: 0, cleared: false }
        };
    }

    // 2. Initialize State Persistence
    if (!state.initialized) {
        state.initialized = true;
        state.initialBankroll = bankroll;
        resetSession();
    }

    // 3. Process Spin Results (if any)
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        // Update each section based on the outcome of the last spin
        for (const key in state.sections) {
            const sec = state.sections[key];
            if (sec.cleared) continue;

            let won = false;

            // Evaluate Dozen Win
            if (sec.type === 'dozen') {
                if (sec.value === 1 && num >= 1 && num <= 12) won = true;
                else if (sec.value === 2 && num >= 13 && num <= 24) won = true;
                else if (sec.value === 3 && num >= 25 && num <= 36) won = true;
            }
            // Evaluate Column Win
            else if (sec.type === 'column') {
                if (num > 0) {
                    if (sec.value === 1 && num % 3 === 1) won = true;
                    else if (sec.value === 2 && num % 3 === 2) won = true;
                    else if (sec.value === 3 && num % 3 === 0) won = true;
                }
            }

            if (won) {
                // Section won: clear it and remove from table
                sec.cleared = true;
                sec.lossCount = 0;
            } else {
                // Section lost: track consecutive losses
                sec.lossCount++;
                // Raise progression level after 3 consecutive losses
                if (sec.lossCount >= 3) {
                    sec.lossCount = 0;
                    if (sec.levelIdx < progressionLadder.length - 1) {
                        sec.levelIdx++;
                    }
                }
            }
        }

        // Check if all 4 sections have been cleared
        let allCleared = true;
        for (const key in state.sections) {
            if (!state.sections[key].cleared) {
                allCleared = false;
                break;
            }
        }

        // Check overall session profit or stop-loss target
        const currentProfit = bankroll - state.initialBankroll;
        if (allCleared || currentProfit >= targetProfit || currentProfit <= -stopLoss) {
            resetSession();
        }
    }

    // 4. Construct Current Bets Array
    const bets = [];

    for (const key in state.sections) {
        const sec = state.sections[key];
        
        if (!sec.cleared) {
            // Calculate bet amount based on current section level
            let betAmount = minOutside * progressionLadder[sec.levelIdx];

            // Clamp bet amount to config limits
            betAmount = Math.max(betAmount, minOutside);
            betAmount = Math.min(betAmount, maxBet);

            // Ensure sufficient bankroll before placing
            if (bankroll >= betAmount) {
                bets.push({
                    type: sec.type,
                    value: sec.value,
                    amount: betAmount
                });
            }
        }
    }

    return bets;
}