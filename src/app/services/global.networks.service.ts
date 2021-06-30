import {Injectable} from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Service reponsible for managing network templates (Main nets, Test nets, Long run weather, custom setup, etc)
 */
@Injectable({
    providedIn: 'root'
})
export class GlobalNetworksService {
    /** RxJS subject that holds the network template in use */
    public activeNetworkTemplate: BehaviorSubject<string> = new BehaviorSubject("MainNet"); // TODO
}
