'use strict';
import * as vscode from 'vscode';
import { Item } from './treeitem/Item';
import { Searcher } from './searcher';
import { Input } from './input';

export class QuickSearcherProvider implements vscode.TreeDataProvider<Item> {
	private _onDidChangeTreeData: vscode.EventEmitter<Item | undefined> = new vscode.EventEmitter<Item | undefined>();
	readonly onDidChangeTreeData: vscode.Event<Item | undefined> = this._onDidChangeTreeData.event;

	private _input: Input;

    readonly workspaceRoot: string = vscode.workspace.rootPath || '';

	constructor() {
		vscode.commands.registerCommand('quickSearcher.search', () => this._input.show(''));
		vscode.commands.registerCommand('quickSearcher.searchInFolder', (uri: vscode.Uri) => {
			this._input.show(uri.fsPath.replace(this.workspaceRoot + '/', ''))
		});
		vscode.commands.registerCommand('quickSearcher.openFile', (resourceUri: vscode.Uri, range?: vscode.Range) => this.openResource(resourceUri, range));
		this._input = new Input(this._onDidChangeTreeData)
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
			return await Searcher.search(this._input);
		}
	}

}


