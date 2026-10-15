/**
 * Apollo Roulette Strategy
 * 
 * Source:
 * - Channel: Gamblers University (Professor Profit)
 * - Video URL: https://youtu.be/G_oBByK172k
 * 
 * The Full Logic in Details:
 * - The strategy covers 2 of the 3 dozens simultaneously on every active spin.
 * - In each of the two selected dozens, 4 bets are placed:
 *     1. One Dozen bet (outside bet).
 *     2. Two Corner bets covering the first two rows of that dozen.
 *     3. One vertical Split bet covering the middle column gap in the bottom rows of that dozen.
 * - Dozen Selection:
 *     * Start on Dozen 1 and Dozen 2 (or Dozen 1 and 3 if Dozen 2 was the last hit).
 *     * Following a winning spin, eliminate the dozen that just hit and bet on the other two dozens.
 *     * Following a losing spin (e.g., the unbet dozen or zero hits), maintain the same two dozens.
 * 
 * The Full Bet Progression in Details:
 * - Level-based linear progression (multiplier = level):
 *     * Level 1 (Base): 1 inside unit per corner/split bet, 5 units (minOutside) per dozen bet.
 *     * On Loss: Increase progression level by +1 (Level 2: 2x inside, 2x outside; Level 3: 3x, etc.).
 *     * On Win: Reset progression level back to Level 1.
 * 
 * Goal:
 * - Target profit of +$50 (or +50 base units) above starting bankroll, resetting/stopping when achieved.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.initialBankroll = bankroll;
        state.level = 1;
        state.targetProfit = 50;
        state.activeDozens = [1, 2]; // Default starting dozens
        state.lastBankroll = bankroll;
    }

    // Helper: Determine which dozen a winning number belongs to (1, 2, 3, or 0 for zeros)
    function getDozen(num) {
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return 0;
    }

    // 2. Process Result of Previous Spin
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;
        const hitDozen = getDozen(winningNum);
        const won = bankroll > state.lastBankroll;

        // Check if session win goal is reached
        if (bankroll >= state.initialBankroll + state.targetProfit) {
            state.level = 1;
            // Optionally continue at base level or stop if bankroll target met
        }

        if (won) {
            // Win: Reset progression to base level
            state.level = 1;
            
            // Switch dozens: Eliminate the dozen that just hit
            if (hitDozen >= 1 && hitDozen <= 3) {
                const allDozens = [1, 2, 3];
                state.activeDozens = allDozens.filter(d => d !== hitDozen);
            }
        } else {
            // Loss: Advance progression level by +1
            state.level += 1;
            // Keep same active dozens on a miss/loss
        }
    }

    state.lastBankroll = bankroll;

    // 3. Define Unit Sizes & Progression Multiplier
    const minInside = config.betLimits.min || 1;
    const minOutside = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 500;

    const insideUnit = Math.min(minInside * state.level, maxBet);
    const outsideUnit = Math.min(minOutside * state.level, maxBet);

    // 4. Dozen Template Layouts
    // Defines corners and split for each dozen as demonstrated in the video
    const dozenLayouts = {
        1: {
            dozen: 1,
            corners: [1, 2],         // Corner 1 covers 1,2,4,5; Corner 2 covers 2,3,5,6
            split: [8, 11]           // Split 8-11
        },
        2: {
            dozen: 2,
            corners: [13, 14],       // Corner 13 covers 13,14,16,17; Corner 14 covers 14,15,17,18
            split: [20, 23]          // Split 20-23
        },
        3: {
            dozen: 3,
            corners: [25, 26],       // Corner 25 covers 25,26,28,29; Corner 26 covers 26,27,29,30
            split: [32, 35]          // Split 32-35
        }
    };

    // 5. Construct Bets Array
    const bets = [];

    for (const d of state.activeDozens) {
        const layout = dozenLayouts[d];
        if (!layout) continue;

        // Dozen outside bet
        bets.push({
            type: 'dozen',
            value: layout.dozen,
            amount: Math.max(outsideUnit, config.betLimits.minOutside)
        });

        // 2 Inside Corner bets
        for (const cornerVal of layout.corners) {
            bets.push({
                type: 'corner',
                value: cornerVal,
                amount: Math.max(insideUnit, config.betLimits.min)
            });
        }

        // 1 Inside Split bet
        bets.push({
            type: 'split',
            value: layout.split,
            amount: Math.max(insideUnit, config.betLimits.min)
        });
    }

    // 6. Check Bankroll Sufficiency
    const totalRequired = bets.reduce((sum, b) => sum + b.amount, 0);
    if (bankroll < totalRequired) {
        return [];
    }

    return bets;
}