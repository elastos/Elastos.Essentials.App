import { Component, OnInit, Input, Output, EventEmitter } from "@angular/core";
import { UXService } from "../../services/ux.service";

@Component({
  selector: "did-not-published-alert",
  templateUrl: "./did-not-published-alert.component.html",
  styleUrls: ["./did-not-published-alert.component.scss"],
})
export class DidNotPublishedAlert implements OnInit {
  constructor(public uxService: UXService) {}

  ngOnInit() {}

  close() {
    //his.uxService.close();
  }
}
