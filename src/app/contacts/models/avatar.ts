import { ContactAvatar } from "src/app/services/contactnotifier.service";

type CredentialAvatar = {
    "content-type": string;
    data: string;
}

export class Avatar {
    contentType: string; // Ex: "image/jpeg"
    data: string;           // Ex: "/9j/4AAQSkZJRgABAQAAAQABAAD/4gIoSUNDX1BST0ZJTEUAAQ..."
    type?: string;          // Ex: "base64"

    static fromAvatarCredential(credentialAvatar: CredentialAvatar): Avatar {
        if (credentialAvatar == null)
            return null;

        return {
            contentType: credentialAvatar["content-type"],
            data: credentialAvatar.data,
            type: "base64"
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
