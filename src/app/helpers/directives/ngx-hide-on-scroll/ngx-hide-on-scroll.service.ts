import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({providedIn: 'root'})
export class NgxHideOnScrollService {
  readonly scrollingElementsDetected$ = new Subject<void>();
}
