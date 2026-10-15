/**
 * Strategy Name: Top Dog Roulette Strategy (Fully Corrected Cumulative Matrix)
 * Source: https://youtu.be/aXomeX8gfP8 (Gamblers University)
 *
 * Full Logic Details:
 * - This strategy dynamically covers the roulette layout using a layered grid method partitioned by dozens.
 * - All street blocks are completely randomly selected but must be within the same dozen and next to each other (adjacent rows).
 * - Spin 1 (Loss Streak = 0): Randomly selects one initial dozen. Within that dozen, it randomly picks 3 adjacent streets.
 * On each street, it places 1 base unit on the street, 1 base unit on the split covering columns 1 and 2, and 1 base unit straight up on the column 3 number.
 * - Spin 2 (Loss Streak = 1): Keeps the exact pattern from Spin 1 AND adds an identical 3-street adjacent pattern inside a second randomly chosen dozen.
 * - Spin 3 (Loss Streak = 2): Keeps all previous positions active AND adds an identical 3-street adjacent pattern to the remaining 3rd dozen (covering 9 streets total).
 * Simultaneously, all base bets across all 9 streets are escalated by +1 unit (becoming 2 units each).
 * - Spin 4 (Loss Streak = 3): Keeps all 9 streets active and adds an additional 1-unit straight-up bet to every Column 2 number intersecting the covered streets (Adds 9 straight numbers).
 * - Spin 5 (Loss Streak = 4): Keeps everything from Spin 4 active and adds an additional 1-unit straight-up bet to every Column 1 number intersecting the covered streets (Adds another 9 straight numbers).
 * - Spin 6+ (Loss Streak >= 5): If a loss occurs at Spin 5 or higher, the strategy rebets all currently active table positions and adds +1 unit to every single bet on the board.
 *
 * Full Bet Progression Details:
 * - Reset Condition: Upon achieving a strict new session peak bankroll high, the strategy completely wipes the table, resets the loss streak, and starts fresh at Spin 1 with a brand new single dozen layout selection.
 * - Loss Condition: Stacks components cumulatively while retaining history across non-peak wins.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const minInside = config.betLimits.min || 2;
    const maxBet = config.betLimits.max || 500;

    // 1. Initialize State Framework
    if (!state.isInitialized) {
        state.isInitialized = true;
        state.highestBankroll = bankroll;
        state.lossStreak = 0;
        state.selectedStreets = {}; 
        state.dozenOrder = [];
        state.flatLossEscalationUnits = 0; // Tracks the +1 unit additions to all bets on Spin 6+ losses
        
        // Populate randomized unique sequence for the 3 dozens
        const dozens = [1, 2, 3];
        while (dozens.length > 0) {
            const randomIndex = Math.floor(Math.random() * dozens.length);
            state.dozenOrder.push(dozens.splice(randomIndex, 1)[0]);
        }
    }

    // 2. Evaluate Session Peaks & State Updates
    if (bankroll > state.highestBankroll) {
        // Reset completely on reaching a strict session peak profit high
        state.highestBankroll = bankroll;
        state.lossStreak = 0;
        state.selectedStreets = {};
        state.dozenOrder = [];
        state.flatLossEscalationUnits = 0;

        const dozens = [1, 2, 3];
        while (dozens.length > 0) {
            const randomIndex = Math.floor(Math.random() * dozens.length);
            state.dozenOrder.push(dozens.splice(randomIndex, 1)[0]);
        }
    } else if (spinHistory.length > 0) {
        const lastProfit = state.lastBetAmount ? (bankroll - state.previousBankroll) : 0;
        if (lastProfit <= 0) {
            state.lossStreak++;
            // If we are at Spin 6 or above (Loss Streak >= 5) and we lose, add 1 unit to all positions
            if (state.lossStreak >= 5) {
                state.flatLossEscalationUnits += 1;
            }
        }
        // Retain the current loss streak layer exactly on wins that fail to hit a new peak high.
    }

    state.previousBankroll = bankroll;

    // 3. Define Active Dozens based on the Progression Curve
    let activeDozens = [];
    if (state.lossStreak === 0) {
        activeDozens = [state.dozenOrder[0]];
    } else if (state.lossStreak === 1) {
        activeDozens = [state.dozenOrder[0], state.dozenOrder[1]];
    } else {
        activeDozens = [1, 2, 3]; // All 3 dozens (9 streets total) are active
    }

    // Lock in 3 completely random, adjacent streets within newly introduced dozens
    activeDozens.forEach(doz => {
        if (!state.selectedStreets[doz]) {
            const dozenStartStreet = ((doz - 1) * 12) + 1;
            const offsets = [0, 3]; // Only offsets 0 or 3 keep 3 contiguous streets locked perfectly inside a single dozen range
            const chosenOffset = offsets[Math.floor(Math.random() * offsets.length)];
            const startStreet = dozenStartStreet + chosenOffset;
            state.selectedStreets[doz] = [startStreet, startStreet + 3, startStreet + 6];
        }
    });

    // 4. Calculate Positional Bet Weights
    const baseMultiplier = (state.lossStreak >= 2) ? 2 : 1; 
    const baseAmount = minInside * baseMultiplier;
    const addonAmount = minInside;

    let betMap = {};

    // Helper to aggregate overlapping tokens or additions safely on the board blueprint
    function addBet(type, value, amount) {
        const key = `${type}_${Array.isArray(value) ? value.join(',') : value}`;
        // Apply the flat escalation units (+1 unit per loss on Spin 6+) to every active bet placement
        const totalAmount = amount + (state.flatLossEscalationUnits * minInside);
        const finalizedAmount = Math.min(Math.max(totalAmount, minInside), maxBet);

        if (betMap[key]) {
            betMap[key].amount = Math.min(betMap[key].amount + (amount), maxBet);
        } else {
            betMap[key] = { type, value, amount: finalizedAmount };
        }
    }

    // 5. Construct the Stacked Table Layout
    activeDozens.forEach(doz => {
        const streets = state.selectedStreets[doz];
        streets.forEach(streetStart => {
            // Core Base Pattern Layers (Streets, Middle splits, Top straight numbers)
            addBet('street', streetStart, baseAmount);
            addBet('split', [streetStart, streetStart + 1], baseAmount);
            addBet('number', streetStart + 2, baseAmount);

            // Spin 4 (Loss Streak >= 3) Additions: Layer 1 Straight Number on Column 2 for all 9 active streets
            if (state.lossStreak >= 3) {
                addBet('number', streetStart + 1, addonAmount);
            }

            // Spin 5 (Loss Streak >= 4) Additions: Layer 1 Straight Number on Column 1 for all 9 active streets
            if (state.lossStreak >= 4) {
                addBet('number', streetStart, addonAmount);
            }
        });
    });

    const bets = Object.values(betMap);
    state.lastBetAmount = bets.reduce((sum, b) => sum + b.amount, 0);

    // Stop placing chips if total bet exceeds remaining active bankroll balance
    if (state.lastBetAmount > bankroll) {
        return [];
    }

    return bets;
}