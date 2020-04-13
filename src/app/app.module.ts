import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { MapComponent } from './map.component';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';

@NgModule({
    declarations: [MapComponent],
    imports: [BrowserModule, LeafletModule.forRoot(), HttpClientModule],
    providers: [],
    bootstrap: [MapComponent],
})
export class AppModule {}
