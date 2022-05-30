'use strict';
import { BROWSER_CHROME, DEBUGGER, MESSAGE_NEW, MESSAGE_EXTEND, MESSAGE_FAIL } from './constants';

/**
 * DustPressDebugger class
 */
export default class DustPressDebugger {

    constructor() {
        if (BROWSER_TARGET === BROWSER_CHROME) {
            this.init();
        }
    }

    /**
     * Init debugger & send debugger data to devtools page
     */
    init() {
        const windowObj = BROWSER_TARGET === BROWSER_CHROME ? window : window.wrappedJSObject;
        const dustpress_debugger = typeof windowObj.dustpress_debugger !== 'undefined' ?
            windowObj.dustpress_debugger : null;

        if (dustpress_debugger) {
            const { hash, ajaxurl } = dustpress_debugger;

            this.send({
                data: { hash, ajaxurl },
                type: MESSAGE_NEW
            });
        }
        else {
            this.send({ type: MESSAGE_FAIL });
        }
    }

    /**
     * Extend existing data with ajax data
     *
     * @param {*} data Data to add.
     * @param {String} key Data path.
     */
    extend(data, key) {
        this.send({
            data: { data, key },
            type: MESSAGE_EXTEND
        });
    };

    /**
     * Send data to devtools page
     *
     * @param {Object} args Data details.
     */
    send(args) {
        args.source = DEBUGGER;
        try {
            window.postMessage(args, '*');
        }
        catch (e) {
            console.warn(e);
        }
    }
}
