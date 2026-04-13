/**
 * ========================================================================
 * STRATEGY: Hybrid 777 (Dynamic Sector + Hot Numbers)
 * ========================================================================
 * Source: Modified from "Stacking Chips" (http://www.youtube.com/watch?v=GBjQbJGrdSE)
 * * * The Logic:
 * 1. Observation Phase: Waits for 37 spins to gather frequency data.
 * 2. Trigger: The sector to bet on is dictated entirely by the LAST winning number.
 * 3. Bet Placement:
 * - Outside 1: Bets on the Dozen of the last winning number.
 * - Outside 2: Bets on the Half (High/Low) that covers the last winning number.
 * - Inside 1: Bets straight-up on the last winning number.
 * - Inside 2-7: Analyzes the last 37 spins, finds the 6 "hottest" numbers 
 * remaining in that specific Dozen, and bets them straight-up.
 * - Note: If the last number is 0 or 00, no bets are placed until a valid dozen hits.
 * * * The Progression:
 * Flat Betting. No martingale. Capitalizes on immediate repeating sectors 
 * while heavily weighting the inside bets toward the table's recent hot trends.
 * * * The Goal:
 * Target overlapping win multipliers (hitting a hot number inside the active dozen 
 * and half) to achieve a rapid bankroll double-up, minimizing risk of ruin.
 * ========================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Observation Phase: Wait for a 37-spin statistical baseline
    if (spinHistory.length < 37) {
        return []; 
    }

    // 2. Determine Trigger from Last Spin
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNum = lastSpin.winningNumber;

    // Zeroes do not belong to a dozen or high/low. Skip betting on this spin.
    if (lastNum === 0 || lastNum === '00') {
        return [];
    }

    // 3. Determine Target Dozen and Target Half (High/Low)
    let targetDozen;
    if (lastNum >= 1 && lastNum <= 12) targetDozen = 1;
    else if (lastNum >= 13 && lastNum <= 24) targetDozen = 2;
    else targetDozen = 3;

    let targetHalf = (lastNum <= 18) ? 'low' : 'high';

    // 4. Frequency Analysis (Last 37 Spins)
    const recentSpins = spinHistory.slice(-37);
    const numFreq = {};
    
    for (let i = 0; i < recentSpins.length; i++) {
        let n = recentSpins[i].winningNumber;
        if (n !== 0 && n !== '00') {
            numFreq[n] = (numFreq[n] || 0) + 1;
        }
    }

    // 5. Select the 6 Hottest Remaining Numbers in the Target Dozen
    let startNum = (targetDozen - 1) * 12 + 1;
    let endNum = targetDozen * 12;
    let otherNumbersInDozen = [];

    for (let i = startNum; i <= endNum; i++) {
        // Exclude the last winning number since we are automatically betting it
        if (i !== lastNum) {
            otherNumbersInDozen.push({ 
                num: i, 
                freq: numFreq[i] || 0 
            });
        }
    }

    // Sort descending by frequency
    otherNumbersInDozen.sort((a, b) => b.freq - a.freq);

    // Extract the top 6 numbers
    let top6Numbers = otherNumbersInDozen.slice(0, 6).map(item => item.num);

    // Combine for a total of 7 inside bets
    let targetInsideNumbers = [lastNum, ...top6Numbers];

    // 6. Construct the Bets Array
    let bets = [];

    // Define base unit and clamp to Inside limits
    let insideAmount = Math.max(config.betLimits.min, 1);
    insideAmount = Math.min(insideAmount, config.betLimits.max);

    // Define outside unit (typically 7x the inside base in this strategy) and clamp
    let outsideAmount = Math.max(config.betLimits.minOutside, insideAmount * 7);
    outsideAmount = Math.min(outsideAmount, config.betLimits.max);

    // Add Outside Bets
    bets.push({ type: 'dozen', value: targetDozen, amount: outsideAmount });
    bets.push({ type: targetHalf, amount: outsideAmount });

    // Add Inside Bets (Straight-up)
    targetInsideNumbers.forEach(number => {
        bets.push({
            type: 'number',
            value: number,
            amount: insideAmount
        });
    });

    return bets;
}