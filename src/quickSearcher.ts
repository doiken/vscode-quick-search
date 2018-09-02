'use strict';
import * as vscode from 'vscode';
import { Item } from './treeitem/Item';
import { Searcher } from './searcher';

export class QuickSearcherProvider implements vscode.TreeDataProvider<Item> {
	private _onDidChangeTreeData: vscode.EventEmitter<Item | undefined> = new vscode.EventEmitter<Item | undefined>();
	readonly onDidChangeTreeData: vscode.Event<Item | undefined> = this._onDidChangeTreeData.event;

	private searchWord: string = '';
	private searchCountInDelay: number = 0;

	readonly isSearchBySelectionEnabled: number = <number> vscode.workspace.getConfiguration().get('quickSearcher.searchBySelection.enabled');
	readonly incSearchDelayMs: number = <number> vscode.workspace.getConfiguration().get('quickSearcher.incrementalSearch.delayMs');
	readonly isIncSearchEnabled: boolean = <boolean> vscode.workspace.getConfiguration().get('quickSearcher.incrementalSearch.enabled');
	readonly incSearchStartBy: number = <number> vscode.workspace.getConfiguration().get('quickSearcher.incrementalSearch.startBy');
    readonly workspaceRoot: string = vscode.workspace.rootPath || '';
    private _searchFolder: string = '';

	constructor() {
		vscode.commands.registerCommand('quickSearcher.search', () => this.search(''));
		vscode.commands.registerCommand('quickSearcher.searchInFolder', (uri: vscode.Uri) => {
			this.search(uri.fsPath.replace(this.workspaceRoot + '/', ''))
		});
		vscode.commands.registerCommand('quickSearcher.openFile', (resourceUri: vscode.Uri, range?: vscode.Range) => this.openResource(resourceUri, range));
	}

	private openResource(resource: vscode.Uri, range?: vscode.Range): void {
		let options = {
			preview: true,
			selection: range,
		};
		vscode.window.showTextDocument(resource, options);
	}

	getTreeItem(item: Item): vscode.TreeItem {
		return item;
	}

	getChildren(item?: Item): Thenable<Item[]> {
		return this._getChildren(item);
	}

	private async _getChildren(item?: Item): Promise<Item[]> {
		if (!this.workspaceRoot) {
			vscode.window.showInformationMessage('Workspace necessary');
			return [];
		}

		if (item) {
			return item.getLines();
		} else {
			return await Searcher.search(this.searchWord, this._searchFolder);
		}
	}

	async search(searchFolder: string): Promise<void> {
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
		this.searchCountInDelay += 1;
		setTimeout(() => {
			this.searchCountInDelay -= 1;
			if (this.searchCountInDelay === 0) {
				this._fireEvent(input);

			}
		}, this.incSearchDelayMs);
	}

	private _fireEvent(input: string): void {
		if (input === '' || input === this.searchWord) {
			return;
		}
		this.searchWord = input;
		this._onDidChangeTreeData.fire();
	}


}


