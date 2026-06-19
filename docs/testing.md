# Manual Testing Checklist

## Prerequisites
Before testing, create `js/invite-config.js` from the template:
```bash
cp js/invite-config.example.js js/invite-config.js
# Then edit js/invite-config.js — set your invite code inside
```

## Auth Flow
- [ ] Register a new user with Twitch username + invitation code
- [ ] Login with registered credentials
- [ ] Verify email is stored as `{username}@tuoverlay.com`
- [ ] Verify logout clears session
- [ ] Verify session persists across page reload (Firebase persistence)

## Panel
- [ ] Search for a Pokémon in the combobox
- [ ] Select a Pokémon from dropdown
- [ ] Toggle shiny mode (★)
- [ ] Clear a slot
- [ ] Add held item via item combobox
- [ ] Change border style (flat/glow/metallic/cyber)
- [ ] Change accent color with color picker
- [ ] Change layout (horizontal/vertical/grid-2x3/grid-3x2)
- [ ] Click Save — verify loading spinner appears
- [ ] Verify save feedback message
- [ ] Reload page — verify saved config loads

## Showdown Importer
- [ ] Open importer modal
- [ ] Paste valid team export text
- [ ] Click "Apply" — verify slots are populated
- [ ] Verify parse handles items (e.g., "Charizard @ Life Orb")
- [ ] Verify shiny indicator is recognized
- [ ] Verify modal closes after apply
- [ ] Test paste-from-clipboard button

## OBS Widget
- [ ] Open `index.html?channel=testchannel` in browser
- [ ] Verify widget connects to Firebase
- [ ] Make changes in panel — verify widget updates in <100ms
- [ ] Verify sprite images load correctly
- [ ] Verify shiny sprites load
- [ ] Verify item icons appear on sprites
- [ ] Verify layout modes render correctly
- [ ] Verify border styles render correctly
- [ ] Test with empty slots — verify placeholder shows

## Mobile (Chrome DevTools)
- [ ] Preview section is sticky at top
- [ ] Combobox opens as full-screen overlay on <768px
- [ ] Touch targets are at least 48px
