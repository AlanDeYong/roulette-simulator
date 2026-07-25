/**
 * Strategy Name: 7th METHOD
 * Source: https://youtu.be/lDCQDr_7yOg
 * Channel: Bet With Mo
 *
 * The Full Logic in Details:
 * The "7th METHOD" is an inside betting strategy focusing on street-center clusters along 
 * the second column of the roulette table. Bets are placed in up to 5 cluster positions based 
 * around numbers 2, 8, 14, 20, and 26.
 *
 * Each Cluster (7 base units total) consists of:
 * - 2 units on Split n-1 / n   (e.g., Split 1/2)
 * - 2 units on Split n / n+1   (e.g., Split 2/3)
 * - 2 units Straight Up on n+3 (e.g., Number 5)
 * - 1 unit Straight Up on n    (e.g., Number 2)
 *
 * The Full Bet Progression in Details (7 Levels):
 * - Level 1 (7 units total): Place Cluster 1 (based on 2) @ 1x scale.
 * - Level 2 (14 units total): On loss, add Cluster 2 (based on 8) @ 1x scale.
 * - Level 3 (21 units total): On loss, add Cluster 3 (based on 14) @ 1x scale.
 * - Level 4 (56 units total): On loss, add Cluster 4 (based on 20) and double ALL active bets (2x scale).
 * - Level 5 (70 units total): On loss, add Cluster 5 (based on 26) @ 2x scale.
 * - Level 6 (140 units total): On loss, double ALL active bets (4x scale across 5 clusters).
 * - Level 7 (280 units total): On loss, double ALL active bets (8x scale across 5 clusters).
 *
 * Goal & Peak Reset Condition:
 * - On Win: If the current bankroll reaches or exceeds the session's peak bankroll, reset the progression back to Level 1.
 *   If the session peak profit has not been reached, rebet at the current progression level.
 * - On Loss: Advance to the next level in the progression sequence. If a loss occurs at Level 7, reset back to Level 1.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize session tracking state
    if (!state.initialized) {
        state.initialized = true;
        state.level = 1;
        state.peakBankroll = bankroll;
        state.lastBankroll = bankroll;
    } else {
        // Evaluate previous spin outcome
        if (spinHistory && spinHistory.length > 0) {
            const isLoss = bankroll < state.lastBankroll;

            if (bankroll >= state.peakBankroll) {
                // Session peak reached or exceeded -> Reset progression
                state.peakBankroll = bankroll;
                state.level = 1;
            } else if (isLoss) {
                // Advance progression level on loss
                state.level += 1;
                if (state.level > 7) {
                    state.level = 1; // Reset after max level loss
                }
            }
            // On win without reaching peak bankroll, level remains unchanged (rebet)
        }
        state.lastBankroll = bankroll;
    }

    // Always keep peak bankroll up to date
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 2. Base unit & limit configuration
    const minInside = (config && config.betLimits && config.betLimits.min) ? config.betLimits.min : 1;
    const maxBet = (config && config.betLimits && config.betLimits.max) ? config.betLimits.max : Infinity;
    const unit = minInside;

    // 3. Define the 5 cluster patterns (7 base units each)
    const clusters = [
        // Cluster 1 (Base number 2)
        [
            { type: 'split', value: [1, 2], baseUnits: 2 },
            { type: 'split', value: [2, 3], baseUnits: 2 },
            { type: 'number', value: 5, baseUnits: 2 },
            { type: 'number', value: 2, baseUnits: 1 }
        ],
        // Cluster 2 (Base number 8)
        [
            { type: 'split', value: [7, 8], baseUnits: 2 },
            { type: 'split', value: [8, 9], baseUnits: 2 },
            { type: 'number', value: 11, baseUnits: 2 },
            { type: 'number', value: 8, baseUnits: 1 }
        ],
        // Cluster 3 (Base number 14)
        [
            { type: 'split', value: [13, 14], baseUnits: 2 },
            { type: 'split', value: [14, 15], baseUnits: 2 },
            { type: 'number', value: 17, baseUnits: 2 },
            { type: 'number', value: 14, baseUnits: 1 }
        ],
        // Cluster 4 (Base number 20)
        [
            { type: 'split', value: [19, 20], baseUnits: 2 },
            { type: 'split', value: [20, 21], baseUnits: 2 },
            { type: 'number', value: 23, baseUnits: 2 },
            { type: 'number', value: 20, baseUnits: 1 }
        ],
        // Cluster 5 (Base number 26)
        [
            { type: 'split', value: [25, 26], baseUnits: 2 },
            { type: 'split', value: [26, 27], baseUnits: 2 },
            { type: 'number', value: 29, baseUnits: 2 },
            { type: 'number', value: 26, baseUnits: 1 }
        ]
    ];

    // 4. Map Level (1-7) to active clusters count and scale multiplier
    let activeClusters = 1;
    let scaleMultiplier = 1;

    switch (state.level) {
        case 1:
            activeClusters = 1;
            scaleMultiplier = 1; // 7 units total
            break;
        case 2:
            activeClusters = 2;
            scaleMultiplier = 1; // 14 units total
            break;
        case 3:
            activeClusters = 3;
            scaleMultiplier = 1; // 21 units total
            break;
        case 4:
            activeClusters = 4;
            scaleMultiplier = 2; // 56 units total
            break;
        case 5:
            activeClusters = 5;
            scaleMultiplier = 2; // 70 units total
            break;
        case 6:
            activeClusters = 5;
            scaleMultiplier = 4; // 140 units total
            break;
        case 7:
            activeClusters = 5;
            scaleMultiplier = 8; // 280 units total
            break;
        default:
            activeClusters = 1;
            scaleMultiplier = 1;
            break;
    }

    // 5. Construct bet array & clamp to bet limits
    const bets = [];

    for (let c = 0; c < activeClusters; c++) {
        const cluster = clusters[c];
        for (let i = 0; i < cluster.length; i++) {
            const betDef = cluster[i];
            let amount = betDef.baseUnits * unit * scaleMultiplier;

            // Clamp bet amount to minimum inside limit and maximum bet limit
            amount = Math.max(amount, minInside);
            amount = Math.min(amount, maxBet);

            bets.push({
                type: betDef.type,
                value: betDef.value,
                amount: amount
            });
        }
    }

    return bets;
}