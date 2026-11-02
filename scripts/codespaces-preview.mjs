import { createPreviewServer } from './serve.mjs';

// Codespaces forwards loopback ports. Keep the preview server's existing file allowlist.
const address = 'http://127.0.0.1:4173';
const server = createPreviewServer();
server.on('error', async error => {
  if (error.code === 'EADDRINUSE') {
    try {
      const response = await fetch(address, { signal: AbortSignal.timeout(2000) });
      if (response.ok && /<title>[^<]*Metallic/i.test(await response.text())) {
        console.log('Metallic preview is already running: ' + address);
        return;
      }
    } catch { /* Report the occupied port below without stopping another process. */ }
  }
  console.error('Could not start Metallic preview: ' + error.message);
  process.exitCode = 1;
});
server.listen(4173, '127.0.0.1', () => {
  console.log('Metallic preview: ' + address);
  console.log('In Codespaces, open port 4173 from the Ports tab if the browser does not open automatically.');
});
