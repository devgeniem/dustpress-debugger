'use strict';
import 'regenerator-runtime/runtime'; // required by babel
import './lib/legacy_debugger'; // load old debugger overrides
import DustPressDebugger from './lib/DustPressDebugger';
import { BROWSER_CHROME } from './lib/constants';

// Set global DustPressDebugger for dustpress-js extend compatibility & overriding old debugger
const dustPressDebugger = new DustPressDebugger();
if (BROWSER_TARGET === BROWSER_CHROME) {
    window.DustPressDebugger = dustPressDebugger;
}
else {

    // window.wrappedJSObject cloneInto doesnt handle class objects properly so export just the relevant functions
    const debuggerObj = {
        init: () => dustPressDebugger.init(),
        extend: (data, key) => dustPressDebugger.extend(data, key),
        send: (args) => dustPressDebugger.send(args)
    }
    window.wrappedJSObject.DustPressDebugger = cloneInto(debuggerObj, window, { cloneFunctions: true });
    window.wrappedJSObject.DustPressDebugger.init();
}
