import axios, { AxiosResponse } from 'axios';
import * as vscode from 'vscode';
import { ConfigurationTarget, workspace } from 'vscode';
import { CountryData, LatestData, ResponseData } from './interfaces';
import { TreeItem } from './tree-item';

const EXTENSION_ID = 'vsc-covid-stats';

export type DataLevel = 'WORLD' | 'COUNTRIES' | 'PINNED';

export class TreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
    readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

    /** TreeView data */
    data: TreeItem[] = [];

    /** Data level flag */
    dataLevel: DataLevel;

    /** Covid-Tracking API URL */
    API_URL = 'https://coronavirus-tracker-api.herokuapp.com/v2';

    /** Array from extension configs with pinned countries */
    pinnedCountries: string[];

    // group data by countries (incl. provinces)
    groupedByCountry: any = {};

    constructor(dataLevel: DataLevel, pinned?: string[]) {
        this.dataLevel = dataLevel;
        this.fetchData();
        this.pinnedCountries = pinned;
    }

    fetchData(): void {
        this.sendRequest().then(response => this.handleResponse(response.data));
    }

    /**
     * Sorts items alphabetically in the given array by the given key
     * @param data data array to sort
     * @param sortKey sort key
     */
    sortStatsByKey(data: CountryData[], sortKey: string): CountryData[] {
        return data.sort((a, b) => a[sortKey].localeCompare(b[sortKey]));
    }

    handleResponse(response: ResponseData): void {
        if (this.dataLevel === 'WORLD') {
            this.populateWorldStats(response.latest);
        } else {
            // sort alphabetically
            const countriesData = this.sortStatsByKey(response.locations, 'country');
            if (this.dataLevel === 'PINNED') {
                const filteredCountries = response.locations.filter(countryItem =>
                    this.pinnedCountries.includes(countryItem.country.toLowerCase()),
                );
                this.groupedByCountry = this.groupByCountries(filteredCountries);
            } else if (this.dataLevel === 'COUNTRIES') {
                this.groupedByCountry = this.groupByCountries(countriesData);
            }
            // populate tree view
            this.populateCountriesStats(this.groupedByCountry);
        }

        // refresh view after data handling was done
        this.refreshView();
    }

    /**
     * Populates array for tree data provider with world stats
     * @param data
     */
    populateWorldStats(data: LatestData): void {
        this.data = [...this.createTreeItem(data)];
    }

    /**
     * Populates array for tree data provider with countries stats
     * @param countriesData
     */
    populateCountriesStats(countriesData: CountryData[]): void {
        Object.keys(countriesData).forEach(countryKey => {
            const countryObject = countriesData[countryKey][0];
            // push data for countries without data about provinces
            if (countriesData[countryKey].length === 1) {
                this.data.push(
                    new TreeItem(countryObject.country, this.createTreeItem(countryObject.latest), this.dataLevel),
                );
            } else if (countriesData[countryKey].length > 1) {
                // handle countries with data about provinces
                const provinceData = this.getProvinceData(countriesData[countryKey]);
                this.data.push(new TreeItem(countryObject.country, provinceData, this.dataLevel));
            }
        });
    }

    /**
     * Returns tree items for countries with province based data
     * @param data country data array
     */
    getProvinceData(data: CountryData[]): TreeItem[] {
        // sort data alphabetically by provinces
        data = this.sortStatsByKey(data, 'province');
        return data.map(countryItem => new TreeItem(countryItem.province, this.createTreeItem(countryItem.latest)));
    }

    /**
     * Returns data grouped by countries
     * @param data
     */
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

    /**
     * Requests data from the covid-tracking API
     */
    sendRequest(): Promise<AxiosResponse<ResponseData>> {
        return axios.get<ResponseData>(this.API_URL + '/locations');
    }

    createTreeItem(data: LatestData): TreeItem[] {
        return Object.keys(data).map(
            key => new TreeItem(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${data[key]}`),
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

    set setPinnedCountries(countries: string[]) {
        this.pinnedCountries = countries;
    }

    refreshView(): void {
        this._onDidChangeTreeData.fire();
    }

    refreshData(): void {
        const currentValue = this.getConfigByKey('pinned-countries');

        this.pinnedCountries = currentValue;
        this.data = [];
        this.fetchData();
    }

    /**
     * Adds clicked country to the panel with pinned countries
     * @param item clicked item from country panel
     */
    pinCountry(item: TreeItem): void {
        const currentValue = this.getConfigByKey('pinned-countries');

        // check for duplicates
        if (!currentValue.includes(item.label.toLowerCase())) {
            this.updateConfigByKey('pinned-countries', [...currentValue, item.label.toLowerCase()]);
        }
    }

    /**
     * Removes clicked country from the panel with pinned countries
     * @param item clicked item from countries panels
     */
    unpinCountry(item: TreeItem): void {
        const currentValue = this.getConfigByKey('pinned-countries');

        const indexOfRemovedItem = currentValue.indexOf(item.label.toLocaleLowerCase());
        currentValue.splice(indexOfRemovedItem, 1);
        this.updateConfigByKey('pinned-countries', currentValue);
    }

    /**
     * Returns configuration value by the given key
     * @param key configuration keys
     */
    getConfigByKey(key: string): any {
        const configuration = workspace.getConfiguration(EXTENSION_ID);
        if (configuration.get<string[]>(key)) {
            return configuration.get<string[]>(key);
        } else {
            throw new Error(`No config found for ${key} key.`);
        }
    }

    /**
     * Updates extensions config
     * @param key configuration key
     * @param value value to set
     */
    updateConfigByKey(key: string, value: any): void {
        const configuration = workspace.getConfiguration(EXTENSION_ID);
        configuration.update(key, value, ConfigurationTarget.Global);
    }

    getCountryDetails(country: string): any {
        return this.groupedByCountry[country][0];
    }
}
