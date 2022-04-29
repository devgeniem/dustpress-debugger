import { DEBUGGER, NEW, EXTEND } from './constants';

/**
 * DUSTPRESS DEBUGGER
 */
window.DustPressDebugger = (function (window, document) {

    const app = {};
    const source = DEBUGGER;

    // Runs the debugger
    app.init = () => {
        const hashEl = document.getElementsByName('dustpress_debugger:hash');
        const ajaxurlEl = document.getElementsByName('dustpress_debugger:ajaxurl');

        if (hashEl && ajaxurlEl && hashEl[0] && ajaxurlEl[0]) {
            const hash = hashEl[0].content;
            const ajaxurl = ajaxurlEl[0].content;

            // Send hash & ajaxurl periodically to devtools incase it is not open on page load or is closed
            setInterval(() => app.sendInit(hash, ajaxurl), 1000);
        };
    }

    app.sendInit = (hash, ajaxurl) => {
        app.send({
            data: {
                hash,
                ajaxurl
            },
            type: NEW,
            source
        });
    }

    app.extend = (data, key) => {
        app.send({
            data: {
                data,
                key
            },
            type: EXTEND,
            source
        });
    };

    app.send = (args) => {
        try {
            window.postMessage(args, '*');
        }
        catch( e ) {
            console.warn(e);
        }
    }

    // Run the debugger
    app.init();

    return app;

})(window, document);
