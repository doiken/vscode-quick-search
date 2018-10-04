'use strict';
import * as path from 'path';
import * as vscode from 'vscode';

export class Item extends vscode.TreeItem {
	readonly labelLength: number = <number>vscode.workspace.getConfiguration().get('quickSearcher.searchItem.labelLength');
	private lines: Item[] = [];
	constructor(public readonly label: string, public readonly collapsibleState: vscode.TreeItemCollapsibleState, public readonly resourceUri: vscode.Uri, public readonly tooltip: string, public readonly searchWord: string) {
		super(resourceUri, collapsibleState);
	}
	pushLine(lineColumn: string, searchedLine: string): void {
		const brief = searchedLine.length > this.labelLength ? searchedLine.substr(0, this.labelLength) + '...' : searchedLine;
		const tooltip = `${lineColumn}: ${brief}`;
		this.lines.push(new Item(tooltip, vscode.TreeItemCollapsibleState.None, this.resourceUri, searchedLine, this.searchWord));
	}
	getLines(): Item[] {
		return this.lines;
	}
	get iconPath(): {
		light: string | vscode.Uri;
		dark: string | vscode.Uri;
	} | vscode.ThemeIcon {
		return this.collapsibleState == vscode.TreeItemCollapsibleState.None ? {
			light: path.join(__dirname, '..', 'resources', 'light', 'line.svg'),
			dark: path.join(__dirname, '..', 'resources', 'dark', 'line.svg')
		} : vscode.ThemeIcon.File;
	}
	;
	get command(): vscode.Command {
		return { command: 'quickSearcher.openFile', title: "Open File", arguments: [this.resourceUri, this.range] };
	}
	;
	get contextValue(): string {
		return this.collapsibleState == vscode.TreeItemCollapsibleState.None ? 'line' : 'file';
	}
	;
	get range(): vscode.Range | undefined {
		if (this.collapsibleState != vscode.TreeItemCollapsibleState.None) {
			return undefined;
		}
		else {
			// decrement since both line and char start by 0
			const [startLine, startChar] = this.label.split(':').slice(0, 2).map((i) => Number(i) - 1);
			const endChar = startChar + this.searchWord.length;
			return new vscode.Range(startLine, startChar, startLine, +endChar);
		}
	}
}