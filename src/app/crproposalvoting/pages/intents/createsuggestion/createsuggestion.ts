import { Component, NgZone, ViewChild } from '@angular/core';
import { ProposalService } from '../../../services/proposal.service';
import { ActivatedRoute } from '@angular/router';
import { SuggestionDetails } from '../../../model/suggestion-details';
import { CreateSuggestionCommand, CROperationsService } from '../../../services/croperations.service';
import { PopupService } from '../../../services/popup.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TranslateService } from '@ngx-translate/core';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { Logger } from 'src/app/logger';


@Component({
  selector: 'page-create-suggestion',
  templateUrl: 'createsuggestion.html',
  styleUrls: ['./createsuggestion.scss']
})
export class CreateSuggestionPage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  private originalRequestJWT: string;
  private suggestionID: string;
  public suggestionDetailsFetched = false;
  public suggestionDetails: SuggestionDetails;
  private createSuggestionCommand: CreateSuggestionCommand;
  public signingAndSendingSuggestionResponse = false;

  constructor(
    private proposalService: ProposalService,
    private crOperations: CROperationsService,
    private route: ActivatedRoute,
    private zone: NgZone,
    private popup: PopupService,
    public translate: TranslateService,
    private globalIntentService: GlobalIntentService,
  ) {
    this.route.queryParams.subscribe(async (data: { jwt: string, suggestionID: string }) => {
      this.zone.run(async () => {
        this.originalRequestJWT = data.jwt;
        this.suggestionID = data.suggestionID;
      });
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('create-suggestion'));
  }

  ionViewWillLeave() {
  }

  async ionViewDidEnter() {
    // Update system status bar every time we re-enter this screen.
    this.titleBar.setTitle("Create a suggestion");

    // Fetch more details about this suggestion, to display to the user
    this.suggestionDetails = await this.proposalService.fetchSuggestionDetails(this.suggestionID);
    Logger.log('crproposal', "suggestionDetails", this.suggestionDetails);
    this.suggestionDetailsFetched = true;
    this.createSuggestionCommand = this.crOperations.getOnGoingCreateSuggestionCommand();
  }

  async signAndCreateSuggestion() {
    this.signingAndSendingSuggestionResponse = true;

    // Create the suggestion/proposal digest - ask the SPVSDK to do this with a silent intent.
    let proposalDigest = await this.getSuggestionDigest();

    // Sign the digest with user's DID, and get a JWT ready to be sent back to the CR website
    /* EXPECTED JWT PAYLOAD:
    {
      "type":"signature",
      "iss":"The wallet's did",
      "iat": "Time to generate QR code",
      "exp": "QR code expiration date",
      "aud":"website's did",
      "req": "the content in the website's QR code.",
      "command":"createsuggestion",
      "data":"the signature string"
    }*/
    try {
      let signedJWT = await this.signSuggestionDigestAsJWT(proposalDigest);
      Logger.log('crproposal', "signedJWT", signedJWT);

      if (!signedJWT) {
        // Operation cancelled, cancel the operation silently.
        this.signingAndSendingSuggestionResponse = false;
        return;
      }
      else {
        // JWT retrieved, we can continue.
        // Call CR website's callback url with relevant data.
        // NOTE: Callback url data format is in jwt-scheme_0.13.md
        try {
          await this.proposalService.sendProposalCommandResponseToCallbackURL(this.createSuggestionCommand.callbackurl, signedJWT);
        }
        catch (e) {
          // Something wrong happened while calling the response callback. Just tell the end user that we can't complete the operation for now.
          await this.popup.alert("Error", "Sorry, unable to send finalize this operation with the CR website. Your suggestion can't be created for now. " + JSON.stringify(e), "Ok");
          this.exitIntentWithError();
        }
      }
    }
    catch (e) {
      // Something wrong happened while signing the JWT. Just tell the end user that we can't complete the operation for now.
      await this.popup.alert("Error", "Sorry, unable to sign your suggestion. Your suggestion can't be created for now. " + e, "Ok");
      this.exitIntentWithError();
      return;
    }

    this.signingAndSendingSuggestionResponse = false;
    this.exitIntentWithSuccess();
  }

  private async getSuggestionDigest(): Promise<string> {
    // Send a silent intent to the wallet app to create a digest for the proposal
    // Convert the suggestion to the format expected by the wallet intent / SPV SDK
    let walletProposal = this.suggestionCommandToWalletProposal(this.createSuggestionCommand);

    Logger.log('crproposal', "Sending intent to create suggestion digest", walletProposal);
    try {
      let response: { result: { digest: string } } = await this.globalIntentService.sendIntent("crproposalcreatedigest", {
        proposal: JSON.stringify(walletProposal)
      });

      Logger.log('crproposal', "Got proposal digest.", response.result.digest);
      return response.result.digest;
    }
    catch (err) {
      Logger.error('crproposal', "createproposaldigest send intent error", err);
      throw err;
    }
  }

  private async signSuggestionDigestAsJWT(suggestionDigest: string): Promise<string> {
    Logger.log('crproposal', "Sending intent to sign the suggestion digest", suggestionDigest);
    try {
      let result = await this.globalIntentService.sendIntent("didsign", {
        data: suggestionDigest,
        signatureFieldName: "data",
        jwtExtra: {
          type: "signature",
          aud: this.createSuggestionCommand.iss, // ? Need to get from the initially scanned JWT?
          command: "createsuggestion",
          req: "elastos://crproposal/" + this.originalRequestJWT
        }
      });
      Logger.log('crproposal', "Got signed digest.", result);

      if (!result.result) {
        // Operation cancelled by user
        return null;
      }

      // The signed JWT is normally in "responseJWT", forwarded directly from the DID app by the runtime
      if (!result.responseJWT) {
        throw "Missing JWT in the intent response";
      }

      return result.responseJWT;
    }
    catch (err) {
      Logger.error('crproposal', "didsign send intent error", err);
      throw err;
    }
  }

  private suggestionCommandToWalletProposal(suggestionCommand: CreateSuggestionCommand): any {
    let walletProposal = {
      Type: 0,
      CategoryData: suggestionCommand.data.categorydata,
      OwnerPublicKey: suggestionCommand.data.ownerpublickey,
      DraftHash: suggestionCommand.data.drafthash,
      Budgets: [],
      Recipient: suggestionCommand.data.recipient
    };

    // Need to convert from the API "string" type to SPV SDK "int"...
    let budgetTypes = {
      Imprest: 0,
      NormalPayment: 1,
      FinalPayment: 2
    }

    for (let suggestionBudget of suggestionCommand.data.budgets) {
      walletProposal.Budgets.push({
        Type: budgetTypes[suggestionBudget.type],
        Stage: suggestionBudget.stage,
        Amount: suggestionBudget.amount
      });
    }

    return walletProposal;
  }

  private async exitIntentWithSuccess() {
    await this.crOperations.sendIntentResponse();
  }

  private async exitIntentWithError() {
    await this.crOperations.sendIntentResponse();
  }
}