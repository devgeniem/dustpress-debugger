import { DEBUGGER } from './constants';

window.addEventListener('message', (event) => {
    // Only accept messages from the same frame
    if (event.source === window) {
        var message = event.data;

        // Only accept messages that we know are ours
        if (typeof message === 'object' && message !== null && message.source === DEBUGGER) {
            try {
                chrome.runtime.sendMessage(message);
            }
            catch( e ) {
                console.warn( e );
            }
        }
    }
});
