# Debug Session: save-sync-500
- **Status**: [OPEN]
- **Issue**: Clicking Save shows `Request failed (500)` and app sync logs show `/api/files` returning `500`.
- **Debug Server**: Pending startup
- **Log File**: `.dbg/trae-debug-log-save-sync-500.ndjson`

## Reproduction Steps
1. Run the app locally.
2. Open a strategy in the editor.
3. Click `Save`.
4. Observe `Save failed: Request failed (500)` and browser console errors for `/api/files`.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | The frontend is calling an unavailable or wrong backend endpoint when Save is clicked. | Med | Low | Pending |
| B | The backend save route throws during `fs.writeFile()` for the target strategy path. | High | Low | Pending |
| C | The backend file-tree sync route throws while traversing `strategies/`, causing `/api/files` to return `500`. | High | Low | Pending |
| D | Save succeeds but the immediate sync fails, and the UI surfaces the combined operation as a save failure. | Med | Med | Pending |
| E | The dev runner/proxy environment is unstable, so requests are routed to a stale or broken API process. | Med | Med | Pending |

## Log Evidence
- Direct backend check: `GET http://localhost:3001/api/files` returned `200`.
- Direct backend check: `POST http://localhost:3001/api/save` for `Newtonian Drop Zone.js` returned `200`.
- Proxied frontend check: `GET http://localhost:5173/api/files` returned `200`.
- Proxied frontend check: `POST http://localhost:5173/api/save` for `Newtonian Drop Zone.js` returned `200`.
- Historical dev log shows backend sessions using two different strategy roots:
  - `C:\AI\roulette-simulator\strategies`
  - `C:\AI\Projects\roulette-simulator\strategies`
- Historical dev log shows backend filesystem failures during unhealthy sessions:
  - `UNKNOWN: unknown error, open 'C:\AI\roulette-simulator\strategies\elite8_strategy_log.txt'`
  - `ENOENT: no such file or directory, open 'C:\AI\Projects\roulette-simulator\strategies\9 Street "Holy Grail".js'`
- Frontend code review confirms overwrite-save does **not** call `syncWithServer()` after save. The `/api/files` error is therefore independent from overwrite-save and is consistent with app-mount sync.

## Verification Conclusion
- Hypothesis A: **Rejected**. The frontend API path and proxy are healthy in the current session; both direct and proxied calls succeed.
- Hypothesis B: **Rejected for `Newtonian Drop Zone.js` in the current session**. The save route can write this file successfully.
- Hypothesis C: **Not reproducible in the current session, but historically supported**. Prior backend sessions logged file-system read/write failures inside `strategies/`.
- Hypothesis D: **Rejected for overwrite-save path**. `handleSave()` overwrite does not call `syncWithServer()`, so the `/api/files` startup error is separate from the save click.
- Hypothesis E: **Most likely**. The evidence points to an unstable prior runtime session with inconsistent backend roots and file-system errors, rather than a persistent logic bug in the current save codepath.
