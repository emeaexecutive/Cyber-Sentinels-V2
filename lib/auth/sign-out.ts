/** Keep remembered-device and login preferences; remove only active-session metadata. */
export function clearSignedOutSessionState(storage: Pick<Storage, "removeItem">) {
  storage.removeItem("cyber_sentinels_session_started_at");
}

export function revalidateRestoredSession(event: Pick<PageTransitionEvent, "persisted">, reload: () => void) {
  if (event.persisted) reload();
}
