'use strict';
import * as cp from 'child_process';
import * as os from 'os';
import * as vscode from 'vscode';
import { Item } from './treeitem/Item';

export class Searcher {
    static readonly workspaceRoot: string = vscode.workspace.rootPath || '';

    static async search(word: string, searchFolder: string): Promise<Item[]> {
		if (word === '') {
			return [];
		}

        const output = await this._searchCmd(word, searchFolder);
        return this._convertIntoItem(word, output);
    }

	static readonly fileCollapsibleState: number = vscode.workspace.getConfiguration().get('quickSearcher.searchItem.expanded')
		? vscode.TreeItemCollapsibleState.Expanded
		: vscode.TreeItemCollapsibleState.Collapsed;

	private static _fileRegex(): RegExp {
		return new RegExp("(.*):(\\d+:\\d+):(.*)", "g");
	}

    private static _searchCmd(word: string, searchFolder: string): Promise<string> {
        const command = 'ag';
        const args = ["-o", "--nogroup", "--column", word];
        if (searchFolder !== '') {
            args.push(searchFolder);
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

    private static _convertIntoItem(word: string, output: string): Item[] {
        const lines = output.split(os.EOL).filter((l) => { return l !== ''; });
        const items: { [s: string]: Item } = lines.reduce((acc: { [s: string]: Item }, line) => {
            const matched: string[] = this._fileRegex().exec(line) || [];
            let [filePath, lineColumn, searchedLine = ''] = matched.slice(1);
            const resourceUri = vscode.Uri.file(`${this.workspaceRoot}/${filePath}`);
            let item = <Item>acc[resourceUri.fsPath];
            if (!item) {
                item = acc[resourceUri.fsPath] = new Item(filePath, this.fileCollapsibleState, resourceUri, resourceUri.fsPath, word);
            }
            item.pushLine(lineColumn, searchedLine);
            return acc;
        }, {});
        return Object.keys(items).map((k) => items[k]);
    }
}