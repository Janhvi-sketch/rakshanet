/* ============================================================================
   AUTH SERVICE (mock)
   ----------------------------------------------------------------------------
   No real authentication system is wired up in this prototype — there's no
   login screen and no backend session. This module exists purely so the rest
   of the app (dataService, screens) has a single, swappable place to ask
   "who's currently logged in?" instead of hardcoding a user id everywhere.

   TO CONNECT REAL AUTH: replace getCurrentUserId() with a call into your auth
   provider (Firebase Auth, a JWT session, etc.) and make it reactive (e.g. a
   React context or hook) if the logged-in user can change without a reload.
   Nothing else in the app needs to know the difference, as long as the id
   returned still matches an id in data/users.json.
   ============================================================================ */

// The synthetic "logged in" user for this prototype.
const CURRENT_USER_ID = "U001";

export function getCurrentUserId() {
  return CURRENT_USER_ID;
}

export function isAuthenticated() {
  // Always "true" in this prototype — replace with a real session check.
  return true;
}

export function logout() {
  console.warn("logout() is a no-op in this prototype — no real auth session exists.");
}
