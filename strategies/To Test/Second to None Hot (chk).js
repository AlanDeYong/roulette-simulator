/**
 * Strategy: Second to None (Dynamic Hottest Numbers)
 * * Source: Modified from The Roulette Master (YouTube) - https://www.youtube.com/watch?v=QtHZfh22aUc
 * * The Logic: 
 * Waits for 37 spins to gather data. Once 37 spins are recorded, it analyzes the frequencies.
 * It places 1 corner bet and 2 non-overlapping single number bets per dozen. It selects 
 * the "hottest" (highest frequency) fully contained corner, and the two hottest remaining 
 * single numbers in that dozen. A "reset" is triggered when a single number hits (resulting 
 * in a bankroll increase), forcing the system to recalculate the hottest numbers based on 
 * the newly updated 37-spin history.
 * * The Progression:
 * Progression is tied to bankroll drawdown:
 * - Level 1 (Base): Drawdown < 100 units. Bet = 1x base unit.
 * - Level 2: Drawdown >= 100 units. Bet = 2x base unit.
 * - Level 3: Drawdown >= 300 units. Bet = 4x base unit.
 * * The Goal: 
 * Ride the positive variance of repeating numbers while using corners as break-even safety nets.
 * The drawdown progression acts as a loss-recovery mechanism capped at Level 3.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Wait for 37 spins to gather sufficient history
    if (spinHistory.length < 37) {
        return [];
    }

    // 2. Initialize or Update State Bankroll Tracker for Reset Trigger
    if (state.lastBankroll === undefined) {
        state.lastBankroll = bankroll;
    }

    // 3. Reset Trigger Condition
    // If our bankroll has increased since the last spin, we hit a single number.
    if (bankroll > state.lastBankroll) {
        state.layout = null; // Trigger recalculation of bets
    }
    state.lastBankroll = bankroll;

    // 4. Calculate Dynamic Hot Layout if null
    if (!state.layout) {
        // Get the last 37 spins
        const recentSpins = spinHistory.slice(-37).map(s => s.winningNumber);
        
        // Calculate frequencies
        const freqs = {};
        for (let i = 0; i <= 36; i++) freqs[i] = 0;
        recentSpins.forEach(num => {
            if (num !== undefined && num !== null) freqs[num]++;
        });

        // Helper function to find the hottest layout in a specific dozen
        const getHottestDozenLayout = (dozenStart, validTopLeftCorners) => {
            let bestCorner = validTopLeftCorners[0];
            let highestCornerFreq = -1;

            // Find hottest corner
            for (let c of validTopLeftCorners) {
                let cornerFreq = freqs[c] + freqs[c+1] + freqs[c+3] + freqs[c+4];
                if (cornerFreq > highestCornerFreq) {
                    highestCornerFreq = cornerFreq;
                    bestCorner = c;
                }
            }

            const cornerNumbers = [bestCorner, bestCorner+1, bestCorner+3, bestCorner+4];
            
            // Find 2 hottest single numbers not inside the chosen corner
            let availableNumbers = [];
            for(let i = 0; i < 12; i++) {
                let num = dozenStart + i;
                if (!cornerNumbers.includes(num)) {
                    availableNumbers.push(num);
                }
            }
            
            // Sort available numbers by frequency (DESCENDING for hottest)
            availableNumbers.sort((a, b) => freqs[b] - freqs[a]);

            return [
                { type: 'corner', value: bestCorner },
                { type: 'number', value: availableNumbers[0] },
                { type: 'number', value: availableNumbers[1] }
            ];
        };

        // Valid fully-contained top-left corner values for each dozen to prevent overlap
        const d1Corners = [1, 2, 4, 5, 7, 8];
        const d2Corners = [13, 14, 16, 17, 19, 20];
        const d3Corners = [25, 26, 28, 29, 31, 32];

        state.layout = [
            ...getHottestDozenLayout(1, d1Corners),
            ...getHottestDozenLayout(13, d2Corners),
            ...getHottestDozenLayout(25, d3Corners)
        ];
    }

    // 5. Progression Logic based on Drawdown
    const baseUnit = config.betLimits.min;
    const drawdown = config.startingBankroll - bankroll;
    let multiplier = 1;

    if (drawdown >= 300) {
        multiplier = 4;
    } else if (drawdown >= 100) {
        multiplier = 2;
    }

    // 6. Calculate amount and clamp to config limits
    let amount = baseUnit * multiplier;
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 7. Map to final bet array
    const currentBets = state.layout.map(position => ({
        type: position.type,
        value: position.value,
        amount: amount
    }));

    // 8. Bankroll check
    const totalBetCost = amount * currentBets.length;
    if (bankroll < totalBetCost) {
        return []; // Not enough funds to cover the wide spread
    }

    return currentBets;
}