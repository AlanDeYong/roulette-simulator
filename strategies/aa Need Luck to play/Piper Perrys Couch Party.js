/**
 * Strategy: Piper Perry's Couch Party (Negative Progression)
 * Source: CEG Dealer School - https://www.youtube.com/watch?v=3auY1o_X4EY
 * * Logic:
 * This is a visual meme strategy based on the "Couch" meme.
 * It involves betting heavily on "Big Black" numbers (surrounding the couch) 
 * and one "Small Red" split (the subject on the couch).
 * * The Setup:
 * - Primary Bets: Straight up on High Black numbers (20, 22, 24, 26, 28, 29, 31, 33, 35).
 * - Hedging Bet: One Split on Small Red numbers (e.g., 5/8).
 * * The Progression (Negative - Increase on Loss):
 * The strategy has 7 levels. On a loss, you add more Black numbers AND increase the bet amount.
 * * Level 1: 5 Black nums ($5 ea) + Split ($5). Total Risk: $30.
 * Level 2: 6 Black nums ($5 ea) + Split ($5). Total Risk: $35.
 * Level 3: 7 Black nums ($10 ea) + Split ($10). Total Risk: $80.
 * Level 4: 8 Black nums ($15 ea) + Split ($15). Total Risk: $135.
 * Level 5: 9 Black nums ($25 ea) + Split ($25). Total Risk: $250.
 * Level 6: 10 Black nums ($40 ea) + Split ($40). Total Risk: $440.
 * Level 7: 11 Black nums ($65 ea) + Split ($65). Total Risk: $780.
 * * Rules:
 * - Win: Reset immediately to Level 1.
 * - Loss: Move to next Level.
 * - Stop Loss: If Level 7 loses, the cycle is broken (or bankroll depleted). This code resets to Level 1 after a Level 7 loss.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- STRATEGY CONFIGURATION ---
    // The pool of "Big Black" numbers to pull from, ordered by priority
    // (High Blacks first, then descending)
    const blackNumberPool = [20, 22, 24, 26, 28, 29, 31, 33, 35, 17, 15]; 
    
    // The "Small Red" split (The Couch subject)
    const splitTarget = [5, 8]; 

    // Progression Definition (Amounts per spot based on video)
    const progression = [
        { count: 5,  amount: 5 },  // Level 1
        { count: 6,  amount: 5 },  // Level 2
        { count: 7,  amount: 10 }, // Level 3
        { count: 8,  amount: 15 }, // Level 4
        { count: 9,  amount: 25 }, // Level 5
        { count: 10, amount: 40 }, // Level 6
        { count: 11, amount: 65 }  // Level 7
    ];

    // --- STATE INITIALIZATION ---
    if (state.level === undefined) state.level = 0;
    if (state.lastBetCoveredNumbers === undefined) state.lastBetCoveredNumbers = [];

    // --- RESULT PROCESSING ---
    // Check if we won the previous spin to determine progression
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;

        // Did we hit?
        if (state.lastBetCoveredNumbers.includes(lastNumber)) {
            // WIN: Reset to base
            state.level = 0;
        } else {
            // LOSS: Move up progression
            state.level++;
            
            // Safety: If we exceed the max progression, reset to 0 (accept the loss)
            if (state.level >= progression.length) {
                // Optional: console.log("Max progression lost. Resetting.");
                state.level = 0;
            }
        }
    }

    // --- BET CONSTRUCTION ---
    const currentStage = progression[state.level];
    const bets = [];
    
    // We need to track what numbers we are covering for the NEXT spin's logic
    const currentCoveredNumbers = [];

    // 1. Place Straight Up Bets on Black Numbers
    // Slice the pool to get the number of spots for this level
    const activeBlackNumbers = blackNumberPool.slice(0, currentStage.count);
    
    for (const num of activeBlackNumbers) {
        // Clamp amount to table limits
        let betAmount = Math.max(currentStage.amount, config.betLimits.min);
        betAmount = Math.min(betAmount, config.betLimits.max);

        bets.push({
            type: 'number',
            value: num,
            amount: betAmount
        });
        currentCoveredNumbers.push(num);
    }

    // 2. Place the Split Bet
    let splitAmount = Math.max(currentStage.amount, config.betLimits.min); // Split uses same unit as straight ups in this system
    splitAmount = Math.min(splitAmount, config.betLimits.max);
    
    bets.push({
        type: 'split',
        value: splitTarget,
        amount: splitAmount
    });
    
    // Add split numbers to covered array for win detection
    currentCoveredNumbers.push(splitTarget[0], splitTarget[1]);

    // --- UPDATE STATE & RETURN ---
    state.lastBetCoveredNumbers = currentCoveredNumbers;
    
    return bets;
}