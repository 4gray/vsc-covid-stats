'use strict';

import * as vscode from 'vscode';
import { TreeDataProvider } from './data-provider';

export function activate(context: vscode.ExtensionContext): void {
    const config = vscode.workspace.getConfiguration('vsc-covid-stats').get<string[]>('pinned-countries');
    const countriesDataProvider = new TreeDataProvider('COUNTRIES');
    const pinnedCountriesDataProvider = new TreeDataProvider('PINNED', config);
    const worldwideDataProvider = new TreeDataProvider('WORLD');
    vscode.window.registerTreeDataProvider('countries-stats', countriesDataProvider);
    vscode.window.registerTreeDataProvider('pinned-stats', pinnedCountriesDataProvider);
    vscode.window.registerTreeDataProvider('worldwide-stats', worldwideDataProvider);
    vscode.commands.registerCommand('countries-stats.refreshEntry', () => countriesDataProvider.refreshData());
    vscode.commands.registerCommand('pinned-stats.refreshEntry', () => pinnedCountriesDataProvider.refreshData());
    vscode.commands.registerCommand('worldwide-stats.refreshEntry', () => worldwideDataProvider.refreshData());

    vscode.commands.registerCommand('covid.pin-country', item => countriesDataProvider.pinCountry(item));
    vscode.commands.registerCommand('covid.unpin-country', item => countriesDataProvider.unpinCountry(item));

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            pinnedCountriesDataProvider.refreshData();
        }),
    );
}
