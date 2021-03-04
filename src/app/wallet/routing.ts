/*
 * Copyright (c) 2019 Elastos Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { Component, NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes, NoPreloading } from '@angular/router';
import { LauncherPage } from './pages/launcher/launcher.page';
import { WalletSettingsPage } from './pages/wallet/wallet-settings/wallet-settings.page';
import { ContactCreatePage } from './pages/contacts/contact-create/contact-create.page';
import { ContactListPage } from './pages/contacts/contact-list/contact-list.page';
import { ContactsPage } from './pages/contacts/contact/contacts.page';
import { AboutPage } from './pages/about/about.page';
import { AccessPage } from './pages/intents/access/access.page';
import { DidTransactionPage } from './pages/intents/didtransaction/didtransaction.page';
import { WaitForSyncPage } from './pages/intents/waitforsync/waitforsync.page';
import { CRmembervotePage } from './pages/intents/crmembervote/crmembervote.page';
import { DPoSVotePage } from './pages/intents/dposvote/dposvote.page';
import { CRMemberRegisterPage } from './pages/intents/crmemberregister/crmemberregister.page';
import { CoinAddressPage } from './pages/wallet/coin/coin-address/coin-address.page';
import { CoinTransferPage } from './pages/wallet/coin/coin-transfer/coin-transfer.page';
import { CoinTxInfoPage } from './pages/wallet/coin/coin-tx-info/coin-tx-info.page';
import { CoinReceivePage } from './pages/wallet/coin/coin-receive/coin-receive.page';
import { CoinSelectPage } from './pages/wallet/coin/coin-select/coin-select.page';
import { CoinListPage } from './pages/wallet/coin/coin-list/coin-list.page';
import { CoinHomePage } from './pages/wallet/coin/coin-home/coin-home.page';
import { WalletCreatePage } from './pages/wallet/wallet-create/wallet-create.page';
import { WalletImportPage } from './pages/wallet/wallet-import/wallet-import.page';
import { WalletCreateNamePage } from './pages/wallet/wallet-create-name/wallet-create-name.page';
import { MnemonicWritePage } from './pages/wallet/mnemonic/mnemonic-write/mnemonic-write.page';
import { WalletPasswordResetPage } from './pages/wallet/wallet-password-reset/wallet-password-reset.page';
import { WalletEditNamePage } from './pages/wallet/wallet-edit-name/wallet-edit-name.page';
import { MnemonicExportPage } from './pages/wallet/mnemonic/mnemonic-export/mnemonic-export.page';
import { MnemonicCreatePage } from './pages/wallet/mnemonic/mnemonic-create/mnemonic-create.page';
import { SettingsPage } from './pages/settings/settings.page';
import { WalletHomePage } from './pages/wallet/wallet-home/wallet-home.page';
import { WalletManagerPage } from './pages/wallet/wallet-manager/wallet-manager.page';
import { CRProposalVoteAgainstPage } from './pages/intents/crproposalvoteagainst/crproposalvoteagainst.page';
import { EscTransactionPage } from './pages/intents/esctransaction/esctransaction.page';
import { CurrencySelectPage } from './pages/settings/currency-select/currency-select.page';
import { WalletColorPage } from './pages/wallet/wallet-color/wallet-color.page';
import { CoinAddERC20Page } from './pages/wallet/coin/coin-add-erc20/coin-add-erc20.page';
import { WalletAdvancedImportPage } from './pages/wallet/wallet-advanced-import/wallet-advanced-import.page';
import { SelectSubwalletPage } from './pages/intents/select-subwallet/select-subwallet.page';
import { CoinErc20DetailsPage } from './pages/wallet/coin/coin-erc20-details/coin-erc20-details.page';
import { SwapTestPage } from './pages/swap-test/swap-test.page';

const routes: Routes = [
    // Global
    { path: 'launcher', component: LauncherPage },
    { path: 'about', component: AboutPage },
    { path: 'settings', component: SettingsPage },
    { path: 'wallet-home', component: WalletHomePage },
    { path: 'wallet-create', component: WalletCreatePage },
    { path: 'wallet-import', component: WalletImportPage },
    { path: 'wallet-advanced-import', component: WalletAdvancedImportPage },
    { path: 'wallet-manager', component: WalletManagerPage },
    { path: 'mnemonic-create', component: MnemonicCreatePage },
    { path: 'wallet-create-name', component: WalletCreateNamePage },
    { path: 'mnemonic-write', component: MnemonicWritePage },
    { path: 'wallet-password-reset', component: WalletPasswordResetPage },
    { path: 'wallet-edit-name', component: WalletEditNamePage },
    { path: 'mnemonic-export', component: MnemonicExportPage },
    { path: 'wallet-settings', component: WalletSettingsPage },

    // Settings
    { path: 'wallet-color', component: WalletColorPage },
    { path: 'currency-select', component: CurrencySelectPage },

    // Coin
    { path: 'coin', component: CoinHomePage },
    { path: 'coin-address', component: CoinAddressPage },
    { path: 'coin-list', component: CoinListPage },
    { path: 'coin-select', component: CoinSelectPage },
    { path: 'coin-receive', component: CoinReceivePage },
    { path: 'coin-tx-info', component: CoinTxInfoPage },
    { path: 'coin-transfer', component: CoinTransferPage },
    { path: 'coin-add-erc20', component: CoinAddERC20Page },
    { path: 'coin-erc20-details', component: CoinErc20DetailsPage },

    // Contacts
    { path: 'contacts', component: ContactsPage },
    { path: 'contact-list', component: ContactListPage },
    { path: 'contact-create', component: ContactCreatePage},

    // Intents
    { path: 'select-subwallet', component: SelectSubwalletPage },
    { path: 'waitforsync', component: WaitForSyncPage },
    { path: 'access', component: AccessPage },
    { path: 'didtransaction', component: DidTransactionPage },
    { path: 'esctransaction', component: EscTransactionPage },
    { path: 'crmembervote', component: CRmembervotePage },
    { path: 'dposvote', component: DPoSVotePage },
    { path: 'crmemberregister', component: CRMemberRegisterPage },
    { path: 'crproposalvoteagainst', component: CRProposalVoteAgainstPage },

    // TEST
    { path: 'swap-test', component: SwapTestPage },
];
@NgModule({
    imports: [
        RouterModule.forChild(routes)
    ],
    exports: [RouterModule]
})
export class WalletRoutingModule { }
