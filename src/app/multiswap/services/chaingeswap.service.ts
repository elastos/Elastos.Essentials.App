import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root"
})
export class ChaingeSwapService {
  public static instance: ChaingeSwapService;

  constructor(
  ) {
    ChaingeSwapService.instance = this;
  }
}