import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { AccountAbstractionCreatePage } from "./create/account-abstraction-create.page";

const routes: Routes = [
  {
    path: "create",
    component: AccountAbstractionCreatePage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AAModuleRoutingModule {}
