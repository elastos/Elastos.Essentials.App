import { pictureMimeType, rawImageToBase64, rawImageToBase64DataUrl } from "src/app/helpers/picture.helpers";
import { Logger } from "src/app/logger";
import { ContactAvatar } from "src/app/services/contactnotifier.service";
import { GlobalHiveService } from "src/app/services/global.hive.service";

type CredentialAvatar = {
    "content-type": string;
    data: string;
}

export class Avatar {
    contentType: string;    // Ex: "image/jpeg"
    data: string;           // Ex: "/9j/4AAQSkZJRgABAQAAAQABAAD/4gIoSUNDX1BST0ZJTEUAAQ..."
    type?: string;          // Ex: "base64"

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
                return {
                    contentType: mimeType,
                    data: base64EncodedImage,
                    type: "base64"
                }
            }
            else {
                return null;
            }
        }
        else {
            // Assume base64 data url
            return {
                contentType: credentialAvatar["content-type"],
                data: credentialAvatar.data,
                type: "base64"
            }
        }
    }

    static fromContactNotifierContactAvatar(contentNotifierAvatar: ContactAvatar): Avatar {
        if (contentNotifierAvatar == null)
            return null;

        return {
            contentType: contentNotifierAvatar.contentType,
            data: contentNotifierAvatar.base64ImageData,
            type: "base64"
        }
    }
}
