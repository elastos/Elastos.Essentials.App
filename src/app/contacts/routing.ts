import { Component, NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AddPage } from './pages/add/add.page';
import { ConfirmPage } from './pages/confirm/confirm.page';
import { CustomizePage } from './pages/customize/customize.page';
import { FriendDetailsPage } from './pages/friend-details/friend-details.page';
import { FriendsPage } from './pages/friends/friends.page';
import { InvitePage } from './pages/invite/invite.page';

const routes: Routes = [
  { path: 'friends', component: FriendsPage },
  { path: 'add', component: AddPage },
  { path: 'confirm', component: ConfirmPage },
  { path: 'customize', component: CustomizePage },
  { path: 'invite', component: InvitePage },
  { path: 'friends/:friendId', component: FriendDetailsPage },
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class ContactsRoutingModule {}
