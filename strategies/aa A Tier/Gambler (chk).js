/**
 * ==============================================================================
 * Strategy: "The Gambler" (Modified Dozen-Tracking Variant)
 * Source: https://youtu.be/E59mNCoh7go
 * Channel: CEG Dealer School
 *
 * THE FULL LOGIC IN DETAIL:
 * 1. Waiting / Trigger Phase:
 *    - Spin without placing any bets until at least 2 different dozens have hit.
 *
 * 2. Stage 1 (Two Dozens Bet):
 *    - Identifies dozens by recency:
 *      * Most recent dozen (the dozen that just won).
 *      * Coldest dozen (the dozen that has not won at all, or has not won for the longest time).
 *      * Middle dozen (neither the most recent nor the coldest).
 *    - Places flat bets on 2 dozens:
 *      a) The coldest dozen.
 *      b) The dozen that just won.
 *    - If one of the 2 bet dozens wins: Advances to Stage 2.
 *    - If 0 hits (loss): Stays in Stage 1 and updates dozen recency.
 *
 * 3. Stage 2 ("The Gambler" 12-Number Attack):
 *    - Targets the specific dozen that "did not just win and has not been unhit the longest"
 *      (the middle / intermediate recency dozen).
 *    - Spreads the 12 numbers of that dozen across 4 consecutive streets (S1, S2, S3, S4):
 *      a) 3 Overlapping Line (Six-Line) bets ($30 each / 6x unit):
 *         - Line covering S1 + S2
 *         - Line covering S2 + S3
 *         - Line covering S3 + S4
 *      b) 2 Inner Straight Street bets ($5 each / 1x unit):
 *         - Street covering S2
 *         - Street covering S3
 *    - After Stage 2 resolves, resets back to Stage 1.
 *
 * THE GOAL:
 * - Exploit dozen recency dynamics while leveraging Stage 2's high-payout cluster hits.
 * ==============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State
  if (!state.initialized) {
    state.stage = 1;               // 1 = Stage 1 (Dozens), 2 = Stage 2 (Gambler Attack)
    state.lastBetStage = null;
    state.activeBetDozens = [];
    state.stage2TargetDozen = null;
    state.initialized = true;
  }

  // Helper: map a number to its dozen (1, 2, 3) or 0 for zeros
  function getDozen(num) {
    if (num >= 1 && num <= 12) return 1;
    if (num >= 13 && num <= 24) return 2;
    if (num >= 25 && num <= 36) return 3;
    return 0; // 0 or 00
  }

  // 2. Track Recency of all 3 Dozens from Spin History
  // Order: index 0 = most recent, index 1 = middle, index 2 = coldest / unhit
  const recentDozens = [];
  if (spinHistory && spinHistory.length > 0) {
    for (let i = spinHistory.length - 1; i >= 0; i--) {
      const d = getDozen(spinHistory[i].winningNumber);
      if (d > 0 && !recentDozens.includes(d)) {
        recentDozens.push(d);
      }
    }
  }

  // Fill in dozens that haven't hit yet to the end of the recency list
  [1, 2, 3].forEach(d => {
    if (!recentDozens.includes(d)) {
      recentDozens.push(d);
    }
  });

  // Unique dozens that have actually won in history
  const uniqueDozensHitCount = (spinHistory || []).reduce((acc, spin) => {
    const d = getDozen(spin.winningNumber);
    if (d > 0 && !acc.includes(d)) acc.push(d);
    return acc;
  }, []).length;

  // Wait trigger: Do not bet until at least 2 distinct dozens have won
  if (uniqueDozensHitCount < 2) {
    return [];
  }

  // 3. Process Last Spin Progression
  if (spinHistory && spinHistory.length > 0 && state.lastBetStage !== null) {
    const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
    const lastHitDozen = getDozen(lastNum);

    if (state.lastBetStage === 1) {
      if (state.activeBetDozens.includes(lastHitDozen)) {
        // One of the bet dozens won -> advance to Stage 2
        state.stage = 2;
      } else {
        // Loss -> remain in Stage 1
        state.stage = 1;
      }
    } else if (state.lastBetStage === 2) {
      // Always reset back to Stage 1 after Stage 2 execution
      state.stage = 1;
    }
  }

  // 4. Define Units and Limits
  const minOutside = config.betLimits.minOutside || 5;
  const minInside = config.betLimits.min || 2;
  const maxBet = config.betLimits.max || 500;

  const baseDozenBet = Math.min(Math.max(minOutside * 5, minOutside), maxBet);
  const baseLineBet = Math.min(Math.max(minOutside * 6, minInside), maxBet);
  const baseStreetBet = Math.min(Math.max(minOutside * 1, minInside), maxBet);

  const bets = [];

  // Identify Dozen Roles:
  // recentDozens[0] = Dozen that just won (most recent)
  // recentDozens[1] = Middle dozen (did not just win & not coldest)
  // recentDozens[2] = Dozen that has not won / not won for longest time (coldest)
  const mostRecentDozen = recentDozens[0];
  const middleDozen = recentDozens[1];
  const coldestDozen = recentDozens[2];

  // 5. Construct Bets based on Current Stage
  if (state.stage === 1) {
    state.lastBetStage = 1;
    state.activeBetDozens = [coldestDozen, mostRecentDozen];

    bets.push({ type: 'dozen', value: coldestDozen, amount: baseDozenBet });
    bets.push({ type: 'dozen', value: mostRecentDozen, amount: baseDozenBet });
  } else if (state.stage === 2) {
    state.lastBetStage = 2;
    state.stage2TargetDozen = middleDozen;

    // Determine street start indices for the middle dozen
    let s1 = 13, s2 = 16, s3 = 19, s4 = 22; // Default Dozen 2
    if (middleDozen === 1) {
      s1 = 1; s2 = 4; s3 = 7; s4 = 10;
    } else if (middleDozen === 3) {
      s1 = 25; s2 = 28; s3 = 31; s4 = 34;
    }

    // a) 3 Overlapping Line Bets ($30 each)
    bets.push({ type: 'line', value: s1, amount: baseLineBet }); // covers S1 + S2
    bets.push({ type: 'line', value: s2, amount: baseLineBet }); // covers S2 + S3
    bets.push({ type: 'line', value: s3, amount: baseLineBet }); // covers S3 + S4

    // b) 2 Inner Street Bets ($5 each)
    bets.push({ type: 'street', value: s2, amount: baseStreetBet }); // covers S2
    bets.push({ type: 'street', value: s3, amount: baseStreetBet }); // covers S3
  }

  // 6. Bankroll Check
  const totalWager = bets.reduce((sum, b) => sum + b.amount, 0);
  if (bankroll < totalWager) {
    return [];
  }

  return bets;
}