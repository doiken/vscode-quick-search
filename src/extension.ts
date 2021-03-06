'use strict';
import * as vscode from 'vscode';
import { QuickSearcherProvider } from './quickSearcherProvider'

export function activate(context: vscode.ExtensionContext) {
    const quickSearcherProvider = new QuickSearcherProvider();
    vscode.window.registerTreeDataProvider('quickSearcher', quickSearcherProvider);
}

export function deactivate() {}