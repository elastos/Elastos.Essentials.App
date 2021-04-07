/**
 * Model representing app info as provided by the command line tool (trinity-cli). This
 * includes everything we need to publish a new version of the app.
 */
export class CLIApp {
    id: string;
    versionName: string;
    versionCode: number;
    name: string;
    shortName: string;
    description: string;
    shortDescription: string;
    author: {
        name: string;
        email: string;
        website: string;
    }

    whatsNewMessage: string;
}