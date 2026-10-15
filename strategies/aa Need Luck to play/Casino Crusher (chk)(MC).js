/**
 * @description Implements the "Casino Crusher" Roulette Strategy.
 * * @param {Array} spinHistory - An array of objects representing past spins.
 * @param {number} bankroll - The user's current bankroll balance.
 * @param {Object} config - Configuration parameters containing bet limits and increment modes.
 * @param {Object} state - Persistent state payload maintained between spins.
 * @param {Object} utils - Helper utilities for simulator execution.
 * * @returns {Array|null} Array containing active bet placements or null if skipping.
 * * -------------------------------------------------------------------------
 * **STRATEGY DOCUMENTATION**
 * -------------------------------------------------------------------------
 * Source:
 * - URL: https://youtu.be/y_fjaWh90SM?si=LfCQjGOPXgz32B-3
 * - Channel Name: The Roulette Master
 * * The Logic:
 * - This strategy dynamically covers up to 23 unique outcomes by targeting overlaps
 * within the lower section of the roulette table layout.
 * - Every single round, four concurrent positions are backed simultaneously:
 * 1. Double Street / Basket covering 0, 1, 2, 3 ('basket')
 * 2. The 1st Dozen numbers 1-12 ('dozen', value: 1)
 * 3. Low numbers 1-18 ('low')
 * 4. Even numbers ('even')
 * * The Progression:
 * - Base Unit: Calculated dynamically using the configuration parameter `config.betLimits.minOutside`.
 * - Progression Value: Modeled as a flat progression multiplier (`state.unitScale`).
 * - Trigger Criteria:
 * - On the very first spin, or whenever the current tracking bankroll balance hits or eclipses
 * the highest peak achieved during the current session (`state.peakBankroll`), the session 
 * resets back to base units (`state.unitScale = 1`).
 * - If the current tracking bankroll is below the `state.peakBankroll` peak threshold, the sequence
 * advances its sizing scale by adding 1 full unit scale to all covered positions, regardless of 
 * whether individual wagers resulted in fractional wins or outright losses.
 * * The Goal:
 * - Capitalize on tightly grouped, overlapping layouts to achieve steady incremental compounding.
 * - Take profits or cash out dynamically as session peak bankrolls are breached.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize core strategy state parameters
    if (state.peakBankroll === undefined) {
        state.peakBankroll = bankroll;
    }
    if (state.unitScale === undefined) {
        state.unitScale = 1;
    }

    // 2. Track bankroll peaks to regulate advancement/resets
    if (bankroll >= state.peakBankroll) {
        state.peakBankroll = bankroll;
        state.unitScale = 1; // Reset progression upon reaching or matching session peak
    } else {
        state.unitScale += 1; // Escalate unit multiplier if below session peak
    }

    // 3. Establish base unit dynamically from layout thresholds
    const baseAmount = config.betLimits.minOutside || 5;
    let betSize = baseAmount * state.unitScale;

    // 4. Bound sizing constraints against systemic threshold clamps
    betSize = Math.max(betSize, config.betLimits.minOutside || 5);
    betSize = Math.min(betSize, config.betLimits.max || 500);

    // 5. Structure simultaneous overlapping positions array
    const bets = [
        { type: 'basket', value: 0, amount: betSize }, // Covers 0, 1, 2, 3
        { type: 'dozen', value: 1, amount: betSize },  // Covers First Dozen (1-12)
        { type: 'low', amount: betSize },              // Covers Low Numbers (1-18)
        { type: 'even', amount: betSize }              // Covers Even Outcomes
    ];

    // Ensure system limits are evaluated per layout type if inside wagers require fine-tuned bounding
    bets.forEach(b => {
        const structuralLimitMin = (b.type === 'basket') ? (config.betLimits.min || 2) : (config.betLimits.minOutside || 5);
        b.amount = Math.max(b.amount, structuralLimitMin);
        b.amount = Math.min(b.amount, config.betLimits.max || 500);
    });

    return bets;
}