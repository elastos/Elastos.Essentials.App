import { pictureMimeType, rawImageToBase64, rawImageToBase64DataUrl } from "src/app/helpers/picture.helpers";
import { Logger } from "src/app/logger";
import { ContactAvatar } from "src/app/services/contactnotifier.service";
import { GlobalHiveService } from "src/app/services/global.hive.service";

type CredentialAvatar = {
    "content-type": string;
    data: string;
}

export class Avatar {
    public constructor(
        public contentType: string,    // Ex: "image/jpeg"
        public data: string,           // Ex: "/9j/4AAQSkZJRgABAQAAAQABAAD/4gIoSUNDX1BST0ZJTEUAAQ..."
        public type?: string          // Ex: "base64"
    ) {}

    static async fromAvatarCredential(credentialAvatar: CredentialAvatar): Promise<Avatar> {
        if (credentialAvatar == null)
            return null;

        let hiveUrlAvatar = GlobalHiveService.instance.getHiveAvatarUrlFromDIDAvatarCredential(credentialAvatar);

        // hive url that points to a script that provides the picture
        if (hiveUrlAvatar) {
            let pictureBuffer = await GlobalHiveService.instance.fetchHiveScriptPicture(hiveUrlAvatar);
            if (pictureBuffer) {
                let base64EncodedImage = rawImageToBase64(pictureBuffer);
                let mimeType = await pictureMimeType(pictureBuffer);

                if (!mimeType) {
                    Logger.warn("contacts", "Unable to extract mime type from picture buffer. Returning no avatar picture.");
                    return null;
                }

                Logger.log("contacts", "Building avatar from credential with hive url", hiveUrlAvatar, mimeType, /* base64EncodedImage */);
                return new Avatar(mimeType,base64EncodedImage, "base64");
            }
            else {
                return null;
            }
        }
        else {
            // Assume base64 data url
            return new Avatar(credentialAvatar["content-type"], credentialAvatar.data, "base64");
        }
    }

    static fromContactNotifierContactAvatar(contentNotifierAvatar: ContactAvatar): Avatar {
        if (contentNotifierAvatar == null)
            return null;

        return new Avatar(contentNotifierAvatar.contentType, contentNotifierAvatar.base64ImageData, "base64");
    }

    public toBase64DataUrl(): string {
        return "data:"+this.contentType+";base64,"+this.data;
    }
}
