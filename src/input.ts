'use strict';

import * as vscode from 'vscode';
import { Item } from './treeitem/Item';

export class Input {
	private _searchCountInDelay: number = 0;
	private _searchWord: string = '';
    private _searchFolder: string = '';

	readonly isSearchBySelectionEnabled: number = <number> vscode.workspace.getConfiguration().get('quickSearcher.searchBySelection.enabled');
	readonly incSearchDelayMs: number = <number> vscode.workspace.getConfiguration().get('quickSearcher.incrementalSearch.delayMs');
	readonly isIncSearchEnabled: boolean = <boolean> vscode.workspace.getConfiguration().get('quickSearcher.incrementalSearch.enabled');
    readonly incSearchStartBy: number = <number> vscode.workspace.getConfiguration().get('quickSearcher.incrementalSearch.startBy');

	constructor(private event: vscode.EventEmitter<Item | undefined>) {
    }

	async show(searchFolder: string): Promise<void> {
        this._searchFolder = searchFolder;
		const activeEditor = vscode.window.activeTextEditor;
		const selection = activeEditor ? activeEditor.document.getText(activeEditor.selection) : '';
		if (this.isSearchBySelectionEnabled && selection !== '') {
			this._fireEvent(selection);
		}
		await vscode.commands.executeCommand('workbench.view.extension.QuickSearcher')
		const searchWordIn = searchFolder === '' ? 'Workspace Root' : searchFolder;

		const input = await vscode.window.showInputBox({
			value: selection,
			placeHolder: 'Type what you want to get',
			prompt: `Search Word in ${searchWordIn}`,
			validateInput: (input: string) => { return this._incrementalSearch(input) }
		}) || '';
		this._fireEvent(input);
		await vscode.commands.executeCommand('workbench.view.extension.QuickSearcher')
	}

	private _incrementalSearch(input: string): undefined {
		if (!this.isIncSearchEnabled) {
			return;
		}
		if (input.length < this.incSearchStartBy) {
			return;
		}
		this._searchCountInDelay += 1;
		setTimeout(() => {
			this._searchCountInDelay -= 1;
			if (this._searchCountInDelay === 0) {
				this._fireEvent(input);

			}
		}, this.incSearchDelayMs);
    }

	private _fireEvent(input: string): void {
		if (input === '' || input === this._searchWord) {
			return;
		}
		this._searchWord = input;
		this.event.fire();
    }

	get word(): string { return this._searchWord; }
	get folder(): string { return this._searchFolder; }
}