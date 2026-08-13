
self.addEventListener('install', (event) => {
	event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', (event) => {
	
	event.waitUntil(Promise.resolve());
});
