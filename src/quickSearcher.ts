'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';
import * as os from 'os';
import { Item } from './treeitem/Item';

export class QuickSearcherProvider implements vscode.TreeDataProvider<Item> {
	private _onDidChangeTreeData: vscode.EventEmitter<Item | undefined> = new vscode.EventEmitter<Item | undefined>();
	readonly onDidChangeTreeData: vscode.Event<Item | undefined> = this._onDidChangeTreeData.event;

	private searchWord: string = '';
	private searchFolder: string = '';
	private searchCountInDelay: number = 0;

	readonly isSearchBySelectionEnabled: number = <number> vscode.workspace.getConfiguration().get('quickSearcher.searchBySelection.enabled');
	readonly incSearchDelayMs: number = <number> vscode.workspace.getConfiguration().get('quickSearcher.incrementalSearch.delayMs');
	readonly isIncSearchEnabled: boolean = <boolean> vscode.workspace.getConfiguration().get('quickSearcher.incrementalSearch.enabled');
	readonly incSearchStartBy: number = <number> vscode.workspace.getConfiguration().get('quickSearcher.incrementalSearch.startBy');

	readonly fileCollapsibleState: number = vscode.workspace.getConfiguration().get('quickSearcher.searchItem.expanded')
		? vscode.TreeItemCollapsibleState.Expanded
		: vscode.TreeItemCollapsibleState.Collapsed;


	constructor(private workspaceRoot: string) {
		vscode.commands.registerCommand('quickSearcher.search', () => this.search(''));
		vscode.commands.registerCommand('quickSearcher.searchInFolder', (uri: vscode.Uri) => {
			this.search(uri.fsPath.replace(this.workspaceRoot + '/', ''))
		});
		vscode.commands.registerCommand('quickSearcher.openFile', (resourceUri: vscode.Uri, range?: vscode.Range) => this.openResource(resourceUri, range));
	}

	private fileRegex(): RegExp {
		return new RegExp("(.*):(\\d+:\\d+):(.*)", "g");
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
		if (this.searchWord === '') {
			return [];
		}

		if (item) {
			return item.getLines();
		} else {
			return await this._search(this.searchWord);
		}
	}

	async search(searchFolder: string): Promise<void> {
		this.searchFolder = searchFolder;
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

	private async _search(word: string): Promise<Item[]> {
		const output = await this._searchCmd(word);
		return this._convertIntoItem(word, output);
	}

	private _searchCmd(word: string): Promise<string> {
		const command = 'ag';
		const args = ["--nocolor", "--nogroup", "--column", word];
		if(this.searchFolder !== '') {
			args.push(this.searchFolder) ;
		}
		const options = { cwd: this.workspaceRoot };
		return new Promise<string>((resolve) => {
			cp.execFile(command, args, options, (error: Error, stdout: string, stdderr: string) => {
				if (error) {
					vscode.window.showInformationMessage('Search word not found');
					resolve('');
				} else {
					resolve(stdout);
				}
			});
		});
	}

	private _convertIntoItem(word: string, output: string): Item[] {
		const lines = output.split(os.EOL).filter((l) => { return l !== ''; });
		const items: {[s: string]: Item } = lines.reduce((acc: {[s: string]: Item}, line) => {
			const matched: string[] = this.fileRegex().exec(line) || [];
			let [filePath, lineColumn, searchedLine = ''] = matched.slice(1);
			const resourceUri = vscode.Uri.file(`${this.workspaceRoot}/${filePath}`);
			let item = <Item> acc[resourceUri.fsPath];
			if (!item) {
				item = acc[resourceUri.fsPath] = new Item(filePath, this.fileCollapsibleState, resourceUri, resourceUri.fsPath, word);
			}
			item.pushLine(lineColumn, searchedLine);
			return acc;
		}, {});
		return Object.keys(items).map((k) => items[k]);
	}
}

class Item extends vscode.TreeItem {
	readonly labelLength: number = <number> vscode.workspace.getConfiguration().get('quickSearcher.searchItem.labelLength');
	private lines: Item[] = [];

	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly resourceUri: vscode.Uri,
		public readonly tooltip: string,
		public readonly searchWord: string,
	) {
		super(resourceUri, collapsibleState);
	}

	pushLine(lineColumn: string, searchedLine: string): void {
		const brief = searchedLine.length > this.labelLength ? searchedLine.substr(0, this.labelLength) + '...' : searchedLine;
		const tooltip = `${lineColumn}: ${brief}`;
		this.lines.push(new Item(tooltip, vscode.TreeItemCollapsibleState.None, this.resourceUri, searchedLine, this.searchWord))
	}

	getLines(): Item[] { 
		return this.lines;
	}

	get iconPath(): { light: string | vscode.Uri; dark: string | vscode.Uri } | vscode.ThemeIcon {
		return this.collapsibleState == vscode.TreeItemCollapsibleState.None ? {
			light: path.join(__dirname, '..', 'resources', 'light', 'line.svg'),
			dark: path.join(__dirname, '..', 'resources', 'dark', 'line.svg')
		} : vscode.ThemeIcon.File;
	};

	get command(): vscode.Command {
		return { command: 'quickSearcher.openFile', title: "Open File", arguments: [this.resourceUri, this.range] }
	};

	get contextValue(): string {
		return this.collapsibleState == vscode.TreeItemCollapsibleState.None ? 'line' : 'file';
	};

	get range(): vscode.Range | undefined {
		if (this.collapsibleState != vscode.TreeItemCollapsibleState.None) {
			return undefined;
		} else {
			// decrement since both line and char start by 0
			const [startLine, startChar] = this.label.split(':').slice(0, 2).map((i) => Number(i) - 1);
			const endChar = startChar + this.searchWord.length;
			return new vscode.Range(startLine, startChar, startLine, +endChar);
		}
	}
}
