'use strict';
import 'regenerator-runtime/runtime'; // required by babel
import '../html/devtools.html';
import '../scss/devtools.scss';
import React from 'react';
import { render } from 'react-dom';
import Debugger from './components/Debugger';
const { StrictMode } = React;

// Render page
document.addEventListener('DOMContentLoaded', async () => {
    const root = document.getElementById('root');
    if (root) {
        render(
            <StrictMode>
                <Debugger/>
            </StrictMode>,
            root
        );
    }
}, false);
