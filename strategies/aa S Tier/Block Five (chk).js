/**
 * SOURCE: https://youtu.be/D4svXeB8yZE - The Roulette Master (Block Five by Leon Smith)
 * 
 * THE FULL LOGIC IN DETAILS:
 * - "Block Five" utilizes five specific 4-number blocks located in the middle and bottom rows of the layout.
 * - The 5 blocks are: [5,6,8,9], [11,12,14,15], [17,18,20,21], [23,24,26,27], and [29,30,32,33].
 * - By ignoring columns completely and picking specific intersection zones, it maintains high board coverage.
 * - The strategy checks if the last winning number fell into any of the active blocks.
 * 
 * THE FULL BET PROGRESSION IN DETAILS:
 * - Step 0 (Base Level): 1 unit straight-up on all 20 individual numbers. (Corners = 0).
 * - Step 1 (Loss 1): Add 1 unit to the corner of each block, then double the whole bet. (Singles: 2u, Corners: 2u).
 * - Step 2 (Loss 2): Add 1 unit to corners, then double. (Singles: 4u, Corners: 6u).
 * - Step 3 (Loss 3): Add 1 unit to corners, then double. (Singles: 8u, Corners: 14u).
 * - RECOVERY MODE (Triggered if Step 3 loses):
 *   - Singles are frozen at 8u. 
 *   - On every loss, increase the corner bet based on its current size:
 *     - If < 50u, add 10u.
 *     - If 50u to 99u, add 20u.
 *     - If >= 100u, add 50u.
 *   - On a win in recovery:
 *     - If overall bankroll >= starting sequence bankroll, exit recovery and reset to Step 0.
 *     - If still down, REMOVE the winning block from the board to limit exposure, and maintain current bet sizes for remaining blocks.
 * 
 * THE GOAL:
 * - Grind profits safely via an aggressive scaling matrix (1->2->4->8 with specific corner offsets) that guarantees sequence profit on any win in the normal phase.
 * - It uses config.betLimits.min as the baseline unit 'u' to construct these strict ratios. 
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define the 5 specific blocks and their corresponding top-left corner values
    const BLOCKS = [
        { singles: [5, 6, 8, 9], corner: 5 },
        { singles: [11, 12, 14, 15], corner: 11 },
        { singles: [17, 18, 20, 21], corner: 17 },
        { singles: [23, 24, 26, 27], corner: 23 },
        { singles: [29, 30, 32, 33], corner: 29 }
    ];
    
    // 2. Initialize State
    if (typeof state.step === 'undefined') {
        state.activeBlocks = [0, 1, 2, 3, 4];
        state.step = 0;
        state.recoveryMode = false;
        state.singleUnit = 0;
        state.cornerUnit = 0;
        state.sequenceBankroll = bankroll;
    }

    // The base multiplier unit (ensuring we respect table limits while maintaining exact math ratios)
    const u = config.betLimits.min;

    // 3. Process Last Spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
        
        let wonLastSpin = false;
        let winningBlockIndex = -1;
        
        for (let i = 0; i < state.activeBlocks.length; i++) {
            let blockId = state.activeBlocks[i];
            if (BLOCKS[blockId].singles.includes(lastSpin)) {
                wonLastSpin = true;
                winningBlockIndex = blockId;
                break;
            }
        }

        if (!state.recoveryMode) {
            // Normal Phase
            if (wonLastSpin) {
                // Any win in the normal phase nets a profit for the sequence
                state.step = 0;
                state.sequenceBankroll = bankroll; // Update high-water mark
            } else {
                state.step++;
                if (state.step > 3) {
                    state.recoveryMode = true;
                    // Initialize recovery corner bet (Step 3 base was 14u, plus 10u = 24u)
                    state.cornerUnit = 24 * u; 
                }
            }
        } else {
            // Recovery Phase
            if (wonLastSpin) {
                if (bankroll >= state.sequenceBankroll) {
                    // Fully recovered back to profit
                    state.recoveryMode = false;
                    state.step = 0;
                    state.activeBlocks = [0, 1, 2, 3, 4];
                    state.sequenceBankroll = bankroll;
                } else {
                    // Partial recovery: remove the block that just hit to reduce board exposure
                    state.activeBlocks = state.activeBlocks.filter(b => b !== winningBlockIndex);
                    
                    // Failsafe reset if we somehow clear the board without breaking even
                    if (state.activeBlocks.length === 0) {
                        state.recoveryMode = false;
                        state.step = 0;
                        state.activeBlocks = [0, 1, 2, 3, 4];
                        state.sequenceBankroll = bankroll;
                    }
                }
            } else {
                // Loss in recovery: scale corner bets based on predefined thresholds
                if (state.cornerUnit >= 100 * u) {
                    state.cornerUnit += 50 * u;
                } else if (state.cornerUnit >= 50 * u) {
                    state.cornerUnit += 20 * u;
                } else {
                    state.cornerUnit += 10 * u;
                }
            }
        }
    }

    // 4. Calculate Units for Normal Phase
    if (!state.recoveryMode) {
        if (state.step === 0) {
            state.singleUnit = 1 * u;
            state.cornerUnit = 0 * u;
        } else if (state.step === 1) {
            state.singleUnit = 2 * u;
            state.cornerUnit = 2 * u;
        } else if (state.step === 2) {
            state.singleUnit = 4 * u;
            state.cornerUnit = 6 * u;
        } else if (state.step === 3) {
            state.singleUnit = 8 * u;
            state.cornerUnit = 14 * u;
        }
    }
    // If in recoveryMode, singleUnit stays frozen at 8*u, and cornerUnit updates dynamically in the history block

    // 5. Clamp to Config Limits
    let clampedSingle = Math.max(state.singleUnit, config.betLimits.min);
    clampedSingle = Math.min(clampedSingle, config.betLimits.max);

    let clampedCorner = 0;
    if (state.cornerUnit > 0) {
        clampedCorner = Math.max(state.cornerUnit, config.betLimits.min);
        clampedCorner = Math.min(clampedCorner, config.betLimits.max);
    }

    // 6. Stop-Loss Verification
    const totalRequired = (state.activeBlocks.length * 4 * clampedSingle) + (state.activeBlocks.length * clampedCorner);
    if (bankroll < totalRequired) {
        return null; // Halt strategy if bankroll cannot sustain the aggressive scaling
    }

    // 7. Construct Bet Array
    let bets = [];
    for (let blockId of state.activeBlocks) {
        let block = BLOCKS[blockId];
        
        // Single number bets
        for (let num of block.singles) {
            bets.push({ type: 'number', value: num, amount: clampedSingle });
        }
        
        // Corner bet (if active)
        if (clampedCorner > 0) {
            bets.push({ type: 'corner', value: block.corner, amount: clampedCorner });
        }
    }

    return bets;
}