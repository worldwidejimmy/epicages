# Todo

## Fixed Issues
- **Blank screen #1**: ResourceDisplay component had early return blocking app render when world was null
- **Blank screen #2**: Missing CSS for diagnostics panel
- **Blank screen #3**: Splash screen with high z-index was staying visible forever if page load failed or React errored - removed splash to expose actual errors

## Next Steps After Purge
1. Load `kludgebot.com/epicages` in fresh incognito 
2. Open browser console (F12) immediately - look for:
   - Red JS errors (syntax, module load failures, etc.)
   - Failed network requests (404s for JS/CSS/fonts)
   - WebSocket connection status
3. If you see errors, paste them - they'll tell us exactly what's breaking
4. If you see "Loading..." or partial UI, the app is mounting but data isn't flowing
5. If still completely blank with no errors, check Network tab for which requests are failing

## Known Issues
- GameCanvas atlas paths use `/assets/` instead of `/epicages/assets/`
