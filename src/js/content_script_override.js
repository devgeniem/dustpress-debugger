'use strict';
import 'regenerator-runtime/runtime'; // required by babel
import './lib/legacy_debugger'; // load old debugger overrides
import DustPressDebugger from './lib/DustPressDebugger';

// Set global DustPressDebugger for dustpress-js extend compatibility & overriding old debugger
window.DustPressDebugger = new DustPressDebugger();
