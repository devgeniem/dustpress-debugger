'use strict';
import 'regenerator-runtime/runtime'; // required by babel
import { DEBUGGER } from './lib/constants';

// Forward messages from content script running in page context to service worker
window.addEventListener('message', (event) => {

    // Only accept messages from the same frame
    if (event.source === window) {
        const message = event.data;

        // Only accept messages that we know are ours
        if (typeof message === 'object' && message !== null && message.source === DEBUGGER) {

            // Forward to service worker
            try {
                browser.runtime.sendMessage(message);
            }
            catch( e ) {
                console.warn( e );
            }
        }
    }
});
