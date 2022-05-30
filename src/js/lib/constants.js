'use strict';
// Message type identifiers
export const MESSAGE_INIT = 0; // init connection
export const MESSAGE_NEW = 1; // load new data
export const MESSAGE_EXTEND = 2; // extend existing data (dustpress-js)
export const MESSAGE_FAIL = 3; // data not found on page
export const MESSAGE_REQUEST_SCRIPTING = 4; // request scripting access
export const MESSAGE_REQUEST_COOKIE = 5; // request cookie access

// Message source identifiers
export const DEBUGGER = 'dustpress-debugger'; // DustPressDebugger class instance
export const DEBUGGER_TAB = 'dustpress-debugger-tab'; // Debugger component instance
export const BACKGROUND = 'dustpress-debugger-bg'; // background script

// Browser target related constants
export const BROWSER_CHROME = 'chrome';
export const BROWSER_FIREFOX = 'firefox';
