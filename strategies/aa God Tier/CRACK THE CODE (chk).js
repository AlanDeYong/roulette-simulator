/**
 * Roulette Strategy: "Crack the Code" (Peak Bankroll Reset)
 * * The Logic:
 * - Base State: Bets placed on 4 corners and 1 split within the hottest dozen.
 * * The Progression (Decoupled & Spatial):
 * - Wait 37 spins to determine the hot dozen.
 * - On Loss 1: Add adjacent pattern + bridge split (Expands to 11 units).
 * - On Loss 2+: Alternate doubling all bets and adding 1 unit to splits.
 * * The Reset:
 * - A win ONLY resets the progression (and finds a new hot dozen) if the 
 * current bankroll is equal to or greater than the peak bankroll.
 * - If a win occurs but the bankroll is still negative, the script HOLDS the 
 * current bet level to recover the remaining deficit.
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
                    cUnits *= 2; 
                    sUnits *= 2; 
                } else {
                    sUnits += 1; 
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
            for (let b of previousBets) {
                if (b.type === 'corner') {
                    const c = b.value;
                    if ([c, c + 1, c + 3, c + 4].includes(lastSpin)) {
                        won = true;
                        break;
                    }
                } else if (b.type === 'split') {
                    const s = b.value;
                    if ([s, s + 3].includes(lastSpin)) {
                        won = true;
                        break;
                    }
                }
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
            // Loss progression
            state.level += 1; 
        }
    }

    const currentMults = calculateMultipliers(state.level);
    const finalBets = generateBetsForState(state.level, state.currentDozen, currentMults.cUnits, currentMults.sUnits);
    
    state.lastBetPlaced = true; 
    return finalBets;
}