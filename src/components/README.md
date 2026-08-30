# components/

Currently empty — all screens and UI pieces (Card, TopHeader, HomeScreen,
SheltersScreen, etc.) live together in `../DisasterResponseApp.jsx` for this
prototype.

If the file grows unwieldy, natural splits would be:

- `components/ui.jsx` — Card, SectionTitle, PrimaryButton, SecondaryButton,
  ProgressBar, StatusPill, HazardStripe, etc.
- `components/screens/HomeScreen.jsx`, `AlertsScreen.jsx`,
  `SheltersScreen.jsx`, `GuidesScreen.jsx`, `ProfileScreen.jsx`,
  `ContactsScreen.jsx` — one file per screen.
- `components/BottomNav.jsx`, `components/SOSModal.jsx`,
  `components/DemoModePanel.jsx` — standalone pieces used at the app root.

Each would import `{ DataService }` from `../services/dataService` as needed.
