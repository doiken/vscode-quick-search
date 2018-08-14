'use strict';
import * as vscode from 'vscode';
import { QuickSearcherProvider } from './quickSearcher'

export function activate(context: vscode.ExtensionContext) {
    const rootPath = vscode.workspace.rootPath;
    const quickSearcherProvider = new QuickSearcherProvider(rootPath || '');
    vscode.window.registerTreeDataProvider('quickSearcher', quickSearcherProvider);
}

export function deactivate() {}