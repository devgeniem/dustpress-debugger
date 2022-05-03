'use strict';
import 'regenerator-runtime/runtime'; // required by babel
import '../html/devtools_page.html';

chrome.devtools.panels.create(
    'dustpress-debugger',
    null,
    'devtools.html',
    (panel) => {}
);
