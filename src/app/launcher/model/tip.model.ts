import { TipAudience } from './tipaudience.model';

export type Tip = {
    title: string; // Internationalization key for the title, also used to as unique identifier
    message: string; // Internationalization key for the full text message.
    audience: TipAudience;
};
