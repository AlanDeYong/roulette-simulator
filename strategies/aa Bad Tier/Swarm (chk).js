/**
 * SOURCE: https://www.youtube.com/watch?v=7LT79Rg1c1w (The Lucky Felt)
 * * THE LOGIC: 
 * Tracks the dozen where the ball lands. If it lands in a new dozen, a "swarm" of 4 
 * randomly selected, unique straight-up bets are placed within that dozen. Spins resulting 
 * in 0 or 00 are ignored.
 * * THE PROGRESSION: 
 * If the ball lands in a swarmed dozen but misses the 4 specific random numbers, 
 * the strategy "digs in" by increasing the bet size on those specific numbers. 
 * The increment respects `config.incrementMode`.
 * * THE GOAL: 
 * Target a new session profit high. Once the current bankroll exceeds the highest recorded 
 * bankroll, all bets reset, and the strategy starts fresh on the next spin.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State on first run
    if (state.highestBankroll === undefined) {
        state.highestBankroll = bankroll;
        state.activeBets = {};    // map: number -> current bet amount
        state.swarmedDozens = {}; // map: dozen (1,2,3) -> array of 4 selected numbers
    }

    const baseUnit = config.betLimits.min;

    // Helper: Determine which dozen a number belongs to (0 for zeroes)
    function getDozen(num) {
        if (num === 0 || num === '00') return 0;
        if (num <= 12) return 1;
        if (num <= 24) return 2;
        return 3;
    }

    // Helper: Select 4 unique random numbers for a given dozen
    function getRandomSwarm(dozen) {
        if (dozen < 1 || dozen > 3) return [];
        const startOffset = (dozen - 1) * 12 + 1;
        const swarm = [];
        
        while (swarm.length < 4) {
            const randomNum = Math.floor(Math.random() * 12) + startOffset;
            if (!swarm.includes(randomNum)) {
                swarm.push(randomNum);
            }
        }
        return swarm;
    }

    // Await at least one spin to establish a tracking target
    if (spinHistory.length === 0) {
        return []; 
    }

    const lastResult = spinHistory[spinHistory.length - 1];
    const lastNum = lastResult.winningNumber;
    const lastDozen = getDozen(lastNum);

    // 2. Check Target Goal: Reset if we hit a new session high profit
    if (bankroll > state.highestBankroll) {
        state.highestBankroll = bankroll;
        state.activeBets = {};
        state.swarmedDozens = {};
    }

    // 3. Process the last spin and update the swarms
    if (lastDozen !== 0) {
        // If this dozen is not yet swarmed, initialize a random swarm here
        if (!state.swarmedDozens[lastDozen]) {
            const newSwarm = getRandomSwarm(lastDozen);
            state.swarmedDozens[lastDozen] = newSwarm;
            
            newSwarm.forEach(num => {
                state.activeBets[num] = baseUnit;
            });
        } 
        else {
            // Dozen is already swarmed. Check if we missed our numbers to trigger progression.
            const swarmNums = state.swarmedDozens[lastDozen];
            const missedOurNumbers = !swarmNums.includes(lastNum);
            
            // Only increment if we haven't just reset from a win
            if (missedOurNumbers && bankroll <= state.highestBankroll) {
                let increment = (config.incrementMode === 'base') 
                    ? baseUnit 
                    : (config.minIncrementalBet || 1);
                
                swarmNums.forEach(num => {
                    let newAmount = state.activeBets[num] + increment;
                    // 4. CLAMP TO LIMITS
                    newAmount = Math.min(newAmount, config.betLimits.max);
                    state.activeBets[num] = newAmount;
                });
            }
        }
    }

    // 5. Construct the final array of bet objects
    let bets = [];
    for (const [numStr, amount] of Object.entries(state.activeBets)) {
        bets.push({
            type: 'number',
            value: parseInt(numStr, 10),
            amount: amount
        });
    }

    return bets;
}