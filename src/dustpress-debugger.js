import './legacy-debugger';
import { DEBUGGER, NEW, EXTEND } from './constants';

/**
 * DUSTPRESS DEBUGGER
 */
window.DustPressDebugger = (function (window, document) {

    const app = {};
    const source = DEBUGGER;

    // Runs the debugger
    app.init = () => {
        if ( typeof dustpress_debugger !== 'undefined' ) {
            const { hash, ajaxurl } = dustpress_debugger;

            app.send({
                data: {
                    hash,
                    ajaxurl
                },
                type: NEW,
                source
            });
        }
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
