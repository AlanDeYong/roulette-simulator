/**
 * Strategy: Critical Mass Protocol (Dynamic Sector Tracking)
 * Source: https://www.youtube.com/watch?v=aqRsJ-oXab8 (The Lucky Felt)
 * * The Logic: 
 * - Observes the first 37 spins to identify the "hottest" Dozen or Column.
 * - Targets this sector with an outside bet. On a loss, it increases the sector bet and 
 * places a new straight-up bet on an empty number inside that sector to "infect" the board.
 * - *NEW UPDATE*: Upon a cycle reset (win/recovery), the system dynamically recalculates 
 * the hottest sector using the most recent 37 spins before starting the next progression.
 * * The Progression:
 * - Loss: Sector bet increases by minimum increment. One straight-up bet is added.
 * - Super Critical (All 12 covered & losing): Sector bet spikes by +25 units, straight-up 
 * bets spike by +1 unit.
 * - Win/Recovery: If current bankroll clears the cycle's starting bankroll, progression resets.
 * * The Goal: 
 * - Target Profit: +100 units.
 * - Stop-Loss: -500 units.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Wait for the initial 37-spin observation phase
    if (spinHistory.length < 37) {
        return []; 
    }

    // Helper function to dynamically calculate the hottest sector from the LAST 37 spins
    const calculateHottestSector = () => {
        let counts = { d1: 0, d2: 0, d3: 0, c1: 0, c2: 0, c3: 0 };
        let recentSpins = spinHistory.slice(-37); // Dynamically grab the last 37 spins
        
        recentSpins.forEach(spin => {
            let num = spin.winningNumber;
            if (num === 0 || num === '00') return;
            
            // Tally Dozens
            if (num <= 12) counts.d1++;
            else if (num <= 24) counts.d2++;
            else counts.d3++;
            
            // Tally Columns
            if (num % 3 === 1) counts.c1++;
            else if (num % 3 === 2) counts.c2++;
            else if (num % 3 === 0) counts.c3++;
        });

        let maxHits = -1;
        let bestSector = null;
        
        const sectors = [
            { id: 'd1', type: 'dozen', value: 1 }, { id: 'd2', type: 'dozen', value: 2 }, { id: 'd3', type: 'dozen', value: 3 },
            { id: 'c1', type: 'column', value: 1 }, { id: 'c2', type: 'column', value: 2 }, { id: 'c3', type: 'column', value: 3 }
        ];

        sectors.forEach(sec => {
            if (counts[sec.id] > maxHits) {
                maxHits = counts[sec.id];
                bestSector = sec;
            }
        });

        // Map the winning sector to its 12 integers
        let targetNumbers = [];
        if (bestSector.type === 'dozen') {
            let start = (bestSector.value - 1) * 12 + 1;
            for (let i = start; i < start + 12; i++) targetNumbers.push(i);
        } else if (bestSector.type === 'column') {
            for (let i = bestSector.value; i <= 36; i += 3) targetNumbers.push(i);
        }

        return { sector: bestSector, numbers: targetNumbers };
    };

    // 2. Initial Setup exactly on Spin 37
    if (spinHistory.length === 37 && !state.targetSector) {
        let hotData = calculateHottestSector();
        state.targetSector = hotData.sector;
        state.sectorNumbers = hotData.numbers;
        
        state.globalStartBankroll = bankroll;
        state.cycleStartBankroll = bankroll;
        
        state.uncoveredNumbers = [...state.sectorNumbers];
        state.coveredNumbers = [];
        state.sectorBetAmount = config.betLimits.minOutside;
        state.numberBetAmount = config.betLimits.min;
    }

    // 3. Check Global Session Goals
    if (bankroll >= state.globalStartBankroll + 10000) return []; // Target Profit hit
    if (bankroll <= state.globalStartBankroll - 500) return []; // Stop-loss hit (Meltdown)

    // 4. Progression and Reset Logic
    if (spinHistory.length > 37) {
        
        // CYCLE RESET: We cleared the deficit
        if (bankroll >= state.cycleStartBankroll) {
            
            // Recalculate the hottest sector using the most recent 37 spins before placing new bets
            let hotData = calculateHottestSector();
            state.targetSector = hotData.sector;
            state.sectorNumbers = hotData.numbers;

            state.cycleStartBankroll = bankroll; // Set new high watermark
            state.uncoveredNumbers = [...state.sectorNumbers]; 
            state.coveredNumbers = [];
            state.sectorBetAmount = config.betLimits.minOutside;
            state.numberBetAmount = config.betLimits.min;
            
        } else {
            // CYCLE LOSS: Deficit remains. Advance the progression.
            let increment = config.incrementMode === 'base' ? config.betLimits.minOutside : (config.minIncrementalBet || 1);
            
            if (state.uncoveredNumbers.length > 0) {
                // Normal Escalation
                state.sectorBetAmount += increment;
                state.coveredNumbers.push(state.uncoveredNumbers.pop()); 
            } else {
                // SUPER CRITICAL PHASE (Critical Mass Reached)
                state.sectorBetAmount += (25 * increment);
                state.numberBetAmount += (config.minIncrementalBet || 1);
            }
        }
    }

    // 5. Clamp Bets to Allowed Limits
    let finalSectorBet = Math.min(Math.max(state.sectorBetAmount, config.betLimits.minOutside), config.betLimits.max);
    let finalNumberBet = Math.min(Math.max(state.numberBetAmount, config.betLimits.min), config.betLimits.max);

    // 6. Build the Bet Array
    let bets = [];
    
    bets.push({
        type: state.targetSector.type,
        value: state.targetSector.value,
        amount: finalSectorBet
    });

    state.coveredNumbers.forEach(num => {
        bets.push({
            type: 'number',
            value: num,
            amount: finalNumberBet
        });
    });

    return bets;
}