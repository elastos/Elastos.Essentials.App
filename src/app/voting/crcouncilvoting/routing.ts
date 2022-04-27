import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CandidatePage } from './pages/candidate/candidate.page';
import { CandidatesPage } from './pages/candidates/candidates.page';
import { CRMemberPage } from './pages/crmember/crmember.page';
import { CRMembersPage } from './pages/crmembers/crmembers.page';
import { CRNodePage } from './pages/crnode/crnode.page';
import { HistoryPage } from './pages/history/history.page';
import { ImpeachCRMemberPage } from './pages/impeach/impeach.page';
import { CandidateRegistrationTermsPage } from './pages/registration-terms/registration-terms.page';
import { CandidateRegistrationPage } from './pages/registration/registration.page';
import { VotePage } from './pages/vote/vote.page';

const routes: Routes = [
    { path: 'candidates', component: CandidatesPage },
    { path: 'candidate/:did', component: CandidatePage },
    { path: 'crmembers', component: CRMembersPage },
    { path: 'crmember', component: CRMemberPage },
    { path: 'impeach', component: ImpeachCRMemberPage },
    { path: 'vote', component: VotePage },
    { path: 'history', component: HistoryPage },
    { path: 'crnode', component: CRNodePage },
    { path: 'registration', component: CandidateRegistrationPage },
    { path: 'registration-terms', component: CandidateRegistrationTermsPage },
];

@NgModule({
    imports: [
        RouterModule.forChild(routes)
    ],
    exports: [RouterModule]
})
export class CRCouncilVotingRoutingModule { }
