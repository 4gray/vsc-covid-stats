'use strict';

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { TreeDataProvider } from './data-provider';
import { CountryData } from './interfaces';

/**
 * Manages webview panels
 */
class WebPanel {
    /**
     * Track the currently panel. Only allow a single panel to exist at a time.
     */
    public static currentPanel: WebPanel | undefined;

    private static readonly viewType = 'angular';

    private readonly panel: vscode.WebviewPanel;
    private readonly extensionPath: string;
    private readonly builtAppFolder: string;
    private disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionPath: string, country?: CountryData) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        // If we already have a panel, show it.
        // Otherwise, create angular panel.
        if (WebPanel.currentPanel) {
            WebPanel.currentPanel.panel.reveal(column);
        } else {
            WebPanel.currentPanel = new WebPanel(extensionPath, column || vscode.ViewColumn.One);
        }
        if (country) {
            WebPanel.currentPanel.panel.webview.postMessage({ command: 'COUNTRY_MAP', payload: country });
        }
        return WebPanel.currentPanel;
    }

    private constructor(extensionPath: string, column: vscode.ViewColumn) {
        this.extensionPath = extensionPath;
        this.builtAppFolder = 'dist';

        // Create and show a new webview panel
        this.panel = vscode.window.createWebviewPanel(WebPanel.viewType, 'COVID-19: World Map', column, {
            // Enable javascript in the webview
            enableScripts: true,

            // And restrict the webview to only loading content from our extension's `media` directory.
            localResourceRoots: [vscode.Uri.file(path.join(this.extensionPath, this.builtAppFolder))],
        });

        // Set the webview's initial html content
        this.panel.webview.html = this._getHtmlForWebview();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programatically
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        // Handle messages from the webview
        this.panel.webview.onDidReceiveMessage(
            (message: any) => {
                switch (message.command) {
                    case 'alert':
                        vscode.window.showErrorMessage(message.text);
                        return;
                }
            },
            null,
            this.disposables,
        );
    }

    public dispose() {
        WebPanel.currentPanel = undefined;

        // Clean up our resources
        this.panel.dispose();

        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    /**
     * Returns html of the start page (index.html)
     */
    private _getHtmlForWebview() {
        // path to dist folder
        const appDistPath = path.join(this.extensionPath, 'dist');
        const appDistPathUri = vscode.Uri.file(appDistPath);

        // path as uri
        const baseUri = this.panel.webview.asWebviewUri(appDistPathUri);

        // get path to index.html file from dist folder
        const indexPath = path.join(appDistPath, 'index.html');

        // read index file from file system
        let indexHtml = fs.readFileSync(indexPath, { encoding: 'utf8' });

        // update the base URI tag
        indexHtml = indexHtml.replace('<base href="/">', `<base href="${String(baseUri)}/">`);

        return indexHtml;
    }
}

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

    context.subscriptions.push(
        vscode.commands.registerCommand('covid.show-map', () => {
            WebPanel.createOrShow(context.extensionPath);
        }),
        vscode.commands.registerCommand('covid.show-on-map', country => {
            WebPanel.createOrShow(context.extensionPath, country);
        }),
    );
}
