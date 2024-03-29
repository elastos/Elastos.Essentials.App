import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CandidatePage } from './pages/candidate/candidate.page';
import { CandidatesPage } from './pages/candidates/candidates.page';
import { CRMemberPage } from './pages/crmember/crmember.page';
import { CRMembersPage } from './pages/crmembers/crmembers.page';
import { CRNodePage } from './pages/crnode/crnode.page';
import { HistoryPage } from './pages/history/history.page';
import { ImpeachCRMemberPage } from './pages/impeach/impeach.page';
import { NextCRPage } from './pages/nextcr/nextcr.page';
import { NextCRsPage } from './pages/nextcrs/nextcrs.page';
import { RegisterUpdatePage } from './pages/register-update/register-update.page';
import { CandidateRegistrationTermsPage } from './pages/registration-terms/registration-terms.page';
import { CRSecretaryPage } from './pages/secretary/secretary.page';
import { VotePage } from './pages/vote/vote.page';

const routes: Routes = [
    { path: 'candidates', component: CandidatesPage },
    { path: 'candidate/:did', component: CandidatePage },
    { path: 'crmembers', component: CRMembersPage },
    { path: 'crmember', component: CRMemberPage },
    { path: 'nextcrs', component: NextCRsPage },
    { path: 'nextcr/:did', component: NextCRPage },
    { path: 'impeach', component: ImpeachCRMemberPage },
    { path: 'secretary', component: CRSecretaryPage },
    { path: 'vote', component: VotePage },
    { path: 'history', component: HistoryPage },
    { path: 'crnode', component: CRNodePage },
    { path: 'registration', component: RegisterUpdatePage },
    { path: 'update', component: RegisterUpdatePage },
    { path: 'registration-terms', component: CandidateRegistrationTermsPage },
];

@NgModule({
    imports: [
        RouterModule.forChild(routes)
    ],
    exports: [RouterModule]
})
export class CRCouncilVotingRoutingModule { }
