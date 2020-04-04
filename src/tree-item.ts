import * as vscode from 'vscode';
import { DataLevel } from './data-provider';

export class TreeItem extends vscode.TreeItem {
    children: TreeItem[] | undefined;

    constructor(label: string, children?: TreeItem[], dataLevel?: DataLevel) {
        super(
            label,
            children === undefined ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed,
        );
        this.children = children;
        if (children === undefined) {
            this.contextValue = null;
        } else {
            switch (dataLevel) {
                case 'PINNED':
                    this.contextValue = 'unpin';
                    break;
                case 'COUNTRIES':
                    this.contextValue = 'pin';
                    break;
                default:
                    break;
            }
        }
    }
}
