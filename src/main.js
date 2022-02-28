'use strict';
import React from 'react';
import { render } from 'react-dom';
import DataListener from './data-listener';
const { StrictMode } = React;

document.addEventListener('DOMContentLoaded', async () => {
    const root = document.getElementById('root');
    if (root) {
        render(
            <StrictMode>
                <DataListener />
            </StrictMode>,
            root
        );
    }
}, false);
