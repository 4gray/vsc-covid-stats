import axios, { AxiosResponse } from 'axios';
import * as vscode from 'vscode';
import { CountryData, LatestData, ResponseData } from './interfaces';
import { TreeItem } from './tree-item';

type DataLevel = 'WORLD' | 'COUNTRIES';

export class TreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
    readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

    /** TreeView data */
    data: TreeItem[] = [];

    /** Data level flag */
    dataLevel: DataLevel;

    /** covid-tracking API */
    API_URL = 'https://coronavirus-tracker-api.herokuapp.com/v2';

    constructor(dataLevel: DataLevel) {
        this.dataLevel = dataLevel;
        this.fetchData();
    }

    fetchData(): void {
        this.sendRequest().then(response => this.handleResponse(response.data));
    }

    sortStatsByKey(data: CountryData[], sortKey: string): CountryData[] {
        return data.sort((a, b) => a[sortKey].localeCompare(b[sortKey]));
    }

    handleResponse(response: ResponseData): void {
        if (this.dataLevel === 'WORLD') {
            this.populateWorldStats(response.latest);
        } else if (this.dataLevel === 'COUNTRIES') {
            // sort alphabetically
            const countriesData = this.sortStatsByKey(response.locations, 'country');
            // group data by countries (incl. provinces)
            const groupedByCountry = this.groupByCountries(countriesData);
            // populate tree view
            this.populateCountriesStats(groupedByCountry);
        }

        // refresh view after data handling was done
        this.refreshView();
    }

    populateWorldStats(data: LatestData): void {
        this.data = [...this.createTreeItem(data)];
    }

    populateCountriesStats(countriesData: CountryData[]): void {
        Object.keys(countriesData).forEach(countryKey => {
            const countryObject = countriesData[countryKey][0];
            // push data for countries without data about provinces
            if (countriesData[countryKey].length === 1) {
                this.data.push(new TreeItem(countryObject.country, this.createTreeItem(countryObject.latest)));
            } else if (countriesData[countryKey].length > 1) {
                // handle countries with data about provinces
                const provinceData = this.getProvinceData(countriesData[countryKey]);
                this.data.push(new TreeItem(countryObject.country, provinceData));
            }
        });
    }

    getProvinceData(data: CountryData[]): TreeItem[] {
        data = this.sortStatsByKey(data, 'province');
        return data.map(countryItem => new TreeItem(countryItem.province, this.createTreeItem(countryItem.latest)));
    }

    groupByCountries(data: CountryData[]): any {
        const result = {};
        data.forEach(countryItem => {
            if (!result[countryItem.country]) {
                result[countryItem.country] = [];
            }
            result[countryItem.country].push(countryItem);
        });
        return result;
    }

    sendRequest(): Promise<AxiosResponse<ResponseData>> {
        return axios.get<ResponseData>(this.API_URL + '/locations');
    }

    createTreeItem(data: LatestData): TreeItem[] {
        return Object.keys(data).map(
            key => new TreeItem(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${data[key]}`)
        );
    }

    getTreeItem(element: TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: TreeItem | undefined): vscode.ProviderResult<TreeItem[]> {
        if (element === undefined) {
            return this.data;
        }
        return element.children;
    }

    refreshView(): void {
        this._onDidChangeTreeData.fire();
    }

    refreshData(): void {
        this.data = [];
        this.refreshView();
        this.fetchData();
    }
}
