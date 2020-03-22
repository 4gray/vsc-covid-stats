'use strict';

import * as vscode from 'vscode';
import { TreeDataProvider } from './data-provider';

export function activate(): void {
    const countriesDataProvider = new TreeDataProvider('COUNTRIES');
    const worldwideDataProvider = new TreeDataProvider('WORLD');
    vscode.window.registerTreeDataProvider('countries-stats', countriesDataProvider);
    vscode.window.registerTreeDataProvider('worldwide-stats', worldwideDataProvider);
    vscode.commands.registerCommand('countries-stats.refreshEntry', () => countriesDataProvider.refreshData());
}
