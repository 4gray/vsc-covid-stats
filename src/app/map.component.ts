import { Component } from '@angular/core';
import { latLng, tileLayer, circle, Circle, Map } from 'leaflet';
import { HttpClient } from '@angular/common/http';
import { ResponseData, CountryData } from 'ext-src/interfaces';

@Component({
    selector: 'covid-map',
    templateUrl: './map.component.html',
    styleUrls: ['./map.component.scss'],
})
export class MapComponent {
    API_URL = 'https://coronavirus-tracker-api.herokuapp.com/v2';
    data: ResponseData;
    layers = [];
    map: Map;
    options = {
        layers: [
            tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 18,
                minZoom: 1,
            }),
        ],
        zoom: 3,
        center: latLng(35, 0),
    };

    /**
     * Creates an instance of MapComponent and requests data from API
     * @param http angulars http client
     */
    constructor(private http: HttpClient) {
        this.http.get<ResponseData>(this.API_URL + '/locations').subscribe(response => {
            this.data = response;
            Object.values(response.locations).forEach((country: CountryData) =>
                this.layers.push(this.generateCircle(country)),
            );
        });

        this.setExtensionListeners();
    }

    /**
     * Handle messages from extension process inside the webview
     */
    setExtensionListeners(): void {
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'COUNTRY_MAP':
                    this.flyToCountry(message.payload.label);
                    break;
                default:
                    break;
            }
        });
    }

    /**
     * Pan&zoom to the provided country
     * @param countryName name of the country
     */
    flyToCountry(countryName: string): void {
        try {
            const country = this.getCountryByName(countryName);
            this.map.flyTo([country.coordinates.latitude, country.coordinates.longitude], 5);
        } catch (error) {
            throw new Error(`Provided country string (${countryName}) is not valid...`);
        }
    }

    /**
     * Set map
     * @param map leaflet map object
     */
    onMapReady(map: Map) {
        this.map = map;
    }

    /**
     * Return country which is requested by name
     * @param countryName name of the country
     */
    getCountryByName(countryName: string): CountryData {
        return Object.values(this.data.locations).find(item => item.country === countryName);
    }

    /**
     * Generate and return leaflet circle object with generated color and radius based on country data
     * @param country country object
     */
    generateCircle(country: CountryData): Circle {
        const { latitude, longitude } = country.coordinates;
        const confirmed = country.latest.confirmed;
        const radius = this.getCircleRadius(confirmed);
        const color = this.getCircleColor(confirmed);
        return circle([latitude, longitude], { radius, color }).bindTooltip(this.generateTooltip(country));
    }

    /**
     * Generate label with meta info for the provev country
     * @param country country object
     */
    generateTooltip(country: CountryData): string {
        const { confirmed, deaths, recovered } = country.latest;
        return `
        <b>${country.country}, ${country.province}</b><br />
        Confirmed: ${confirmed}<br />
        Recovered: ${recovered}<br />
        Deaths: ${deaths}
        `;
    }

    /**
     * Return radius size of the country circle based on the number of confirmed cases
     * @param confirmed number of confirmed cases
     */
    getCircleRadius(confirmed: number): number {
        let result = 3 * confirmed;
        if (result < 30000) {
            result = 30000;
        }
        return result;
    }

    /**
     * Return circle color based on the amount of confirmed cases
     * @param confirmed number of confirmed cases
     */
    getCircleColor(confirmed: number): string {
        let result;
        switch (true) {
            case confirmed <= 1000:
                result = '#70FF00';
                break;
            case confirmed <= 10000:
                result = '#FFD000';
                break;
            case confirmed <= 20000:
                result = '#FFC000';
                break;
            case confirmed <= 50000:
                result = '#FFB000';
                break;
            case confirmed <= 80000:
                result = '#FFA000';
                break;
            case confirmed <= 100000:
                result = '##FF7000';
                break;
            case confirmed <= 500000:
                result = '#FF5000';
                break;
            case confirmed <= 1000000:
                result = '#FF1000';
                break;
            default:
                result = '#FF0000';
                break;
        }
        return result;
    }
}
