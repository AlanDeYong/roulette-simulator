/**
 * Roulette Strategy: "Crack the Code" (Net Profit Progression)
 * BET W MO
 * * The Logic:
 * - Base State: Bets placed on 4 corners and 1 split within the hottest dozen.
 * * The Progression (Decoupled & Spatial):
 * - Wait 37 spins to determine the hot dozen.
 * - On Loss 1: Add adjacent pattern + bridge split (Expands to 11 units).
 * - On Loss 2+: Alternate adding 1 unit to splits, then doubling all bets.
 * * The Reset:
 * - A win (defined as NET POSITIVE PROFIT for the round) ONLY resets the 
 * progression if the bankroll is equal to or greater than the peak bankroll.
 * - If a round results in a net loss (even if a bet hit), it continues the loss progression.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    if (spinHistory.length < 37) {
        return [];
    }

    const baseUnit = config.betLimits.min;

    const getHottestDozen = () => {
        const counts = [0, 0, 0];
        const last37 = spinHistory.slice(-37);
        for (let spin of last37) {
            const num = parseInt(spin.winningNumber);
            if (num >= 1 && num <= 12) counts[0]++;
            else if (num >= 13 && num <= 24) counts[1]++;
            else if (num >= 25 && num <= 36) counts[2]++;
        }
        
        let max = -1;
        let hotDozen = 0;
        for (let i = 0; i < 3; i++) {
            if (counts[i] > max) {
                max = counts[i];
                hotDozen = i;
            }
        }
        return hotDozen;
    };

    const generateBetsForState = (level, primaryDozen, cUnits, sUnits) => {
        let currentBets = [];
        
        const cAmount = Math.min(cUnits * baseUnit, config.betLimits.max);
        const sAmount = Math.min(sUnits * baseUnit, config.betLimits.max);

        const addDozenPattern = (d) => {
            const S = d * 12 + 1;
            const corners = [S, S + 1, S + 6, S + 7];
            const split = S + 4;
            corners.forEach(c => currentBets.push({ type: 'corner', value: c, amount: cAmount }));
            currentBets.push({ type: 'split', value: split, amount: sAmount });
        };

        addDozenPattern(primaryDozen);

        if (level > 0) {
            let secondaryDozen = primaryDozen === 2 ? 1 : primaryDozen + 1;
            addDozenPattern(secondaryDozen);

            const lowerDozen = Math.min(primaryDozen, secondaryDozen);
            const lowerS = lowerDozen * 12 + 1;
            const bridgeSplit = lowerS + 10; 
            
            currentBets.push({ type: 'split', value: bridgeSplit, amount: sAmount });
        }
        
        return currentBets;
    };

    const calculateMultipliers = (level) => {
        let cUnits = 1;
        let sUnits = 1;
        if (level >= 2) {
            for (let i = 2; i <= level; i++) {
                if (i % 2 === 0) {
                    sUnits += 1; // On even levels (Loss 2, 4, 6...): Increase splits by 1
                } else {
                    cUnits *= 2; // On odd levels (Loss 3, 5, 7...): Double up
                    sUnits *= 2; 
                }
            }
        }
        return { cUnits, sUnits };
    };

    // Initialize state and establish the peak bankroll baseline
    if (state.level === undefined) {
        state.level = 0;
        state.currentDozen = getHottestDozen();
        state.peakBankroll = bankroll; 
    } else {
        // Dynamically track the absolute highest bankroll achieved
        state.peakBankroll = Math.max(state.peakBankroll, bankroll);
    }

    if (spinHistory.length > 37 && state.lastBetPlaced) {
        const lastSpinStr = spinHistory[spinHistory.length - 1].winningNumber;
        const lastSpin = parseInt(lastSpinStr);
        
        const prevMults = calculateMultipliers(state.level);
        const previousBets = generateBetsForState(state.level, state.currentDozen, prevMults.cUnits, prevMults.sUnits);
        
        let won = false;
        
        if (!isNaN(lastSpin) && lastSpin !== 0) {
            let totalWager = 0;
            let totalReturn = 0;

            // Calculate total cost and total payouts to determine net profit
            for (let b of previousBets) {
                totalWager += b.amount;
                
                if (b.type === 'corner') {
                    const c = b.value;
                    if ([c, c + 1, c + 3, c + 4].includes(lastSpin)) {
                        totalReturn += b.amount * 9; // 8:1 payout + original bet returned
                    }
                } else if (b.type === 'split') {
                    const s = b.value;
                    if ([s, s + 3].includes(lastSpin)) {
                        totalReturn += b.amount * 18; // 17:1 payout + original bet returned
                    }
                }
            }

            const netProfit = totalReturn - totalWager;
            
            // Only consider it a win if the spin generated a positive net profit
            if (netProfit >= 0 && totalReturn > 0) {
                won = true;
            }
        }

        if (won) {
            // ONLY reset if the win recovered all losses (new or equal peak)
            if (bankroll >= state.peakBankroll) {
                state.level = 0;
                state.currentDozen = getHottestDozen();
            }
            // If won but bankroll < peakBankroll, we do nothing. 
            // state.level is maintained to keep chasing the deficit.
        } else {
            // Loss progression triggered for misses AND partial hits resulting in a net loss
            state.level += 1; 
        }
    }

    const currentMults = calculateMultipliers(state.level);
    const finalBets = generateBetsForState(state.level, state.currentDozen, currentMults.cUnits, currentMults.sUnits);
    
    state.lastBetPlaced = true; 
    return finalBets;
}