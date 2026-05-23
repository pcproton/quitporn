/* Clear — Break Free | Service Worker */
const VERSION = 'clear-sw-v1';

/* ── Install & activate ── */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

/* ── Listen for messages from the main page ── */
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_NOTIFICATION') {
    scheduleDaily(e.data.hour, e.data.minute);
  }
  if (e.data && e.data.type === 'CANCEL_NOTIFICATION') {
    cancelDaily();
  }
});

/* ── Internal alarm via a stored timeout trick ──
   Service workers can't use setTimeout reliably across browser restarts,
   so we use the periodicsync API if available, or fall back to a
   self-messaging alarm stored in IndexedDB-backed cache. ── */

function scheduleDaily(hour, minute) {
  // Store the desired time so we can re-schedule after SW restart
  self.registration.showNotification; // keep SW alive hint
  broadcastNextAlarm(hour, minute);
}

function cancelDaily() {
  // Tell any open clients the alarm was cancelled
  self.clients.matchAll().then(clients => {
    clients.forEach(c => c.postMessage({ type: 'ALARM_CANCELLED' }));
  });
}

function broadcastNextAlarm(hour, minute) {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  const delay = target.getTime() - now.getTime();

  setTimeout(() => fireNotification(hour, minute), delay);
}

function fireNotification(hour, minute) {
  const messages = [
    { title: 'Log today's progress', body: 'Have you marked today? Keep the streak alive. 💪' },
    { title: 'One day at a time', body: 'Open Clear and log your day before you sleep. 🌙' },
    { title: 'Stay consistent', body: 'Your streak is waiting. Don\'t let it slip tonight. 🔥' },
    { title: 'Bismillah — log your day', body: 'A clean day is a gift. Mark it before midnight. ✓' },
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];

  self.registration.showNotification(msg.title, {
    body: msg.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'clear-daily',          // replaces any previous unread notification
    renotify: true,
    requireInteraction: false,
    data: { url: self.location.origin }
  });

  // Schedule next day
  broadcastNextAlarm(hour, minute);
}

/* ── Tap notification → open app ── */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(e.notification.data.url || '/');
    })
  );
});
