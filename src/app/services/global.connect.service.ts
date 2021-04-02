import { Injectable } from "@angular/core";
import { Subject } from "rxjs";
import { Logger } from "../logger";
import { GlobalIntentService } from "./global.intent.service";

export const ESSENTIALS_CONNECT_URL_PREFIX = "essentialsconnect://";

const enum CommandType {
    // Sent
    Connect = "connect", // Essentials wants to initiate a connection by scanning a essentialsconnect:// qr code
    IntentResponse = "intentresponse", // Essentials sends an intent response following a "ExecuteIntent" request.

    // Received
    ExecuteIntent = "executeintent" // Server wants Essentials to process a intent url (real DID, hive, pay, contracts operations)
}

type Command = {
    command: any;
    data?: any;
}

type ConnectCommandParams = {
    connectionToken: string;
}

type ExecuteIntentParams = {
    intentUrl: string;
}

type SendIntentResponse = {
    responseJWT?: string,
    result: any
};

/**
 * Service responsible for managing connectivity with connectivity SDKs, server side.
 * For instance, to maintain a websocket link to a website while using essentials for DID, hive, ETH
 * operations on that website.
 */
@Injectable({
    providedIn: 'root'
})
export class GlobalConnectService {
    public static instance: GlobalConnectService = null;

    private ws: WebSocket = null;
    private subject: Subject<Command>;
    private activeConnectionToken: string = null;

    constructor(
        private globalIntentService: GlobalIntentService
    ) {
        GlobalConnectService.instance = this;
    }

    /**
     * Process a essentialsconnect:// url (normally, scanned by the qr code scanner) in order
     * to initiate and maintain a websocket connection to a target web server.
     */
    public async processEssentialsConnectUrl(connectUrl: string) {
        Logger.log("connect", "Processing connect url", connectUrl);

        if (!connectUrl || !connectUrl.startsWith(ESSENTIALS_CONNECT_URL_PREFIX))
            throw new Error("Connect URLs must starts with " + ESSENTIALS_CONNECT_URL_PREFIX);

        let url = new URL(connectUrl);
        // Extract server's websocket host and port
        let server = url.pathname.replace(/\//g, ""); // Remove all slashes

        // Extract the token
        this.activeConnectionToken = url.searchParams.get("token");

        await this.connect("ws://" + server);
        await this.sendConnectRequest(this.activeConnectionToken);
    }

    private async connect(connectUrl: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.subject || this.ws.readyState != WebSocket.OPEN) {
                this.subject = this.createWebSocketConnection(connectUrl);

                this.ws.addEventListener("open", () => {
                    Logger.log("connect", "Successfully connected to connectivity SDK websocket server");
                    resolve();
                });

                this.ws.addEventListener("error", (err) => {
                    Logger.error("connect", "Error while connecting to the connectivity SDK server websocket", err);
                    reject(err);
                });
            }
            else {
                resolve();
            }
        });
    }

    private createWebSocketConnection(connectUrl: string): Subject<Command> {
        this.ws = new WebSocket(connectUrl);

        Logger.log("connect", "Initiating WS connection to server", connectUrl);

        this.ws.addEventListener("message", (ev: MessageEvent)=>{
            Logger.log("connect", "Message received from the connectivity SDK server", ev);
            //subject.next(ev.data); // Unused for now

            let message = ev.data;
            let jsonMessage = JSON.parse(message);
            if ("command" in jsonMessage) {
                this.handleCommand(this.ws, jsonMessage as Command);
            }
            else {
                console.error("Unhandled message received: %s", message);
            }
        });

        let subject = new Subject<Command>();
        return subject;
    }

    private handleCommand(ws: WebSocket, command: Command) {
        switch (command.command) {
            case CommandType.ExecuteIntent:
                this.handleExecuteIntentCommand(ws, command);
                break;
            default:
                console.error("Unknown command type", command.command);
        }
    }

    private async handleExecuteIntentCommand(ws: WebSocket, command: Command) {
        Logger.log("connect", "Handling EXECUTE INTENT command", command);

        let params: ExecuteIntentParams = command.data;
        let sendResult: SendIntentResponse = await this.globalIntentService.sendUrlIntent(params.intentUrl);
        //Logger.log("intents", "Send URL RESULT TMP", sendResult);

        await this.sendIntentResponse(sendResult);
    }

    public async sendConnectRequest(connectionToken: string) {
        Logger.log("connect", "Sending Connect request with token", connectionToken);

        if (this.ws.readyState === WebSocket.OPEN) {
            let params: ConnectCommandParams = {
                connectionToken
            };
            let command = {
                command: CommandType.Connect,
                data: params
            };
            this.ws.send(JSON.stringify(command));
        }
        else {
            Logger.error("connect", "WS NOT READY");
        }
    }

    public async sendIntentResponse(response: SendIntentResponse) {
        Logger.log("connect", "Sending intent response", response);

        if (this.ws.readyState === WebSocket.OPEN) {
            let command = {
                command: CommandType.IntentResponse,
                data: response
            };
            this.ws.send(JSON.stringify(command));
        }
        else {
            Logger.error("connect", "WS NOT READY");
        }
    }

    public getActiveConnectionToken(): string {
        return this.activeConnectionToken;
    }
}
