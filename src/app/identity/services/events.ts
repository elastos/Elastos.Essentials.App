import { Injectable } from "@angular/core";
import { Events } from "src/app/services/events.service";

@Injectable({
    providedIn: 'root'
})
export class DIDEvents {
    public static instance: DIDEvents = null;

    constructor(public events: Events) {
        DIDEvents.instance = this;
    }
}
