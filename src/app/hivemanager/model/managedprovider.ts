export type ManagedProvider = {
    id: string;
    name: string;
    did: {
        storeId: string;
        didString: string;
    },
    creationTime: number; // Timestamp
}