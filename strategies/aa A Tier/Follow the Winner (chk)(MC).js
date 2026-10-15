/**
 * Roulette Strategy: Follow the Winner
 * * Source:
 * - Channel: WillVegas (https://www.youtube.com/@WillVegas)
 * - Video URL: https://youtu.be/p-yueEbRFwM
 * * Strategy Logic:
 * 1. The strategy tracks the winning color of the wheel and bets dynamically on 
 * that color and its related layout positions ("Following the Winner").
 * 2. If the first spin color is unknown (no history), the strategy waits until a valid color drops.
 * 3. Layout placements:
 * - If RED wins: Place a direct bet on 'red'. Additionally, place a bet on Column 3, 
 * and cover three specific horizontal split configurations matching high-concentration 
 * red properties: [9, 12], [18, 21], and [27, 30].
 * - If BLACK wins: Place a direct bet on 'black'. Additionally, place a bet on Column 2, 
 * and cover three specific horizontal split configurations matching high-concentration 
 * black properties: [8, 11], [17, 20], and [26, 29].
 * - If GREEN (0/00) wins: The system treats this as a loss and repeats the tracking color 
 * used during the previous round (falling back to red if undefined).
 * * Bet Progression Logic:
 * - This function operates on an advanced unit-tier progression scheme suggested during the video 
 * to efficiently handle recovery metrics across consecutive tracking losses:
 * - Tier 1 (Base): 11 units on Color, 6 units on Column, 1 unit per Split (Total: 20 units).
 * - Tier 2 (After 2 sequential losses): 22 units on Color, 12 units on Column, 2 units per Split (Total: 40 units).
 * - Winning conditions reset the state seamlessly back to Tier 1 base metrics.
 * - All structural calculations explicitly read from config boundaries and dynamically apply proper math clamping limits.
 * * Goal / Session Controls:
 * - Target Session Profit: +$50 units over the initial reference point.
 * - Stop-loss is bounded implicitly by the user bankroll parameters. 
 * - Session parameters trigger array validation resets cleanly upon passing target metrics.
 * * @param {Array} spinHistory - Array of past spin items [{ winningNumber: X, winningColor: '...' }]
 * @param {number} bankroll - The active structural runtime balance amount
 * @param {Object} config - Config parameters containing table properties and explicit table constraints
 * @param {Object} state - Persistent runtime environment cache object cross-spins
 * @param {Object} utils - Helper object utilities
 * @returns {Array|null} Array containing calculated bet instructions or empty/null
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Determine the base configurations
    const minInside = config.betLimits.min || 2;
    const minOutside = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 500;

    // Define target profit bounds relative to session tracking initialization
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
        state.targetReached = false;
    }

    // Stop execution if session milestone goals were met in runtime operations
    if (state.targetReached || (bankroll - state.initialBankroll >= 50000)) {
        state.targetReached = true;
        return [];
    }

    // Initialize state objects for tracking consecutive losses and system tier levels
    if (state.consecutiveLosses === undefined) state.consecutiveLosses = 0;
    if (state.multiplierTier === undefined) state.multiplierTier = 1;
    if (state.lastTrackedColor === undefined) state.lastTrackedColor = null;

    // Process results if a historical spin happened
    if (spinHistory && spinHistory.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1];
        const winNum = lastResult.winningNumber;
        const winColor = lastResult.winningColor;

        // Determine if previous round layout generated matching yields
        let isWin = false;
        if (state.lastActiveBets) {
            for (const activeBet of state.lastActiveBets) {
                // Check color matching parameters
                if (activeBet.type === winColor) {
                    isWin = true;
                    break;
                }
                // Check column matching criteria 
                if (activeBet.type === 'column') {
                    const colMod = winNum % 3;
                    const normalizedCol = colMod === 0 ? 3 : colMod;
                    if (activeBet.value === normalizedCol) {
                        isWin = true;
                        break;
                    }
                }
                // Check specific split layout wins
                if (activeBet.type === 'split' && Array.isArray(activeBet.value)) {
                    if (activeBet.value.includes(winNum)) {
                        isWin = true;
                        break;
                    }
                }
            }
        }

        // Apply progress parameters depending on winning metric results
        if (isWin) {
            state.consecutiveLosses = 0;
            state.multiplierTier = 1; // Reset back to baseline metrics
        } else {
            state.consecutiveLosses++;
            // Increment tier level dynamically after every 2 consecutive tracking losses
            if (state.consecutiveLosses >= 2 && state.consecutiveLosses % 2 === 0) {
                state.multiplierTier++;
            }
        }

        // Set tracking context variable if winColor contains valid red or black properties
        if (winColor === 'red' || winColor === 'black') {
            state.lastTrackedColor = winColor;
        }
    }

    // Wait until there is a historical pointer framework to lock tracking direction on
    if (!state.lastTrackedColor) {
        if (spinHistory && spinHistory.length > 0) {
            const currentItem = spinHistory[spinHistory.length - 1];
            if (currentItem.winningColor === 'red' || currentItem.winningColor === 'black') {
                state.lastTrackedColor = currentItem.winningColor;
            } else {
                return []; // Standby condition if initial spin results in green
            }
        } else {
            return []; // Waiting sequence instruction for first reference drop
        }
    }

    const currentTrackedColor = state.lastTrackedColor;
    const currentTier = state.multiplierTier;

    // Base units based on standard layout parameters (Color: 11 units, Column: 6 units, Split: 1 unit)
    let colorAmount = 11 * currentTier;
    let columnAmount = 6 * currentTier;
    let splitAmount = 1 * currentTier;

    // Enforce outside and inside rule limits cleanly dynamically across execution paths
    colorAmount = Math.max(colorAmount, minOutside);
    colorAmount = Math.min(colorAmount, maxBet);

    columnAmount = Math.max(columnAmount, minOutside);
    columnAmount = Math.min(columnAmount, maxBet);

    splitAmount = Math.max(splitAmount, minInside);
    splitAmount = Math.min(splitAmount, maxBet);

    const generatedBets = [];

    // Map structural outputs based on tracking layouts
    if (currentTrackedColor === 'red') {
        // Red Bet Array Generation Parameters
        generatedBets.push({ type: 'red', amount: colorAmount });
        generatedBets.push({ type: 'column', value: 3, amount: columnAmount });
        generatedBets.push({ type: 'split', value: [9, 12], amount: splitAmount });
        generatedBets.push({ type: 'split', value: [18, 21], amount: splitAmount });
        generatedBets.push({ type: 'split', value: [27, 30], amount: splitAmount });
    } else if (currentTrackedColor === 'black') {
        // Black Bet Array Generation Parameters
        generatedBets.push({ type: 'black', amount: colorAmount });
        generatedBets.push({ type: 'column', value: 2, amount: columnAmount });
        generatedBets.push({ type: 'split', value: [8, 11], amount: splitAmount });
        generatedBets.push({ type: 'split', value: [17, 20], amount: splitAmount });
        generatedBets.push({ type: 'split', value: [26, 29], amount: splitAmount });
    }

    // Persist runtime structures across consecutive configurations cleanly
    state.lastActiveBets = generatedBets;

    return generatedBets;
}