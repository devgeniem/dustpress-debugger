'use strict';
// Message type identifiers
export const MESSAGE_INIT = 0; // init connection
export const MESSAGE_NEW = 1; // load new data
export const MESSAGE_EXTEND = 2; // extend existing data (dustpress-js)
export const MESSAGE_FAIL = 3; // data not found on page

// Message source identifiers
export const DEBUGGER = 'dustpress-debugger'; // DustPressDebugger class instance
export const DEBUGGER_TAB = 'dustpress-debugger-tab'; // Debugger component instance
