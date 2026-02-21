export declare enum RoleName {
    Admin = "Admin",
    Officer = "Officer",
    Clerk = "Clerk",
    ReadOnly = "ReadOnly"
}
export declare enum ShareholderStatus {
    Active = "Active",
    Inactive = "Inactive",
    DeceasedOutstanding = "DeceasedOutstanding",
    DeceasedSurrendered = "DeceasedSurrendered"
}
export declare enum LotStatus {
    Active = "Active",
    Treasury = "Treasury",
    TransferredOut = "TransferredOut",
    Surrendered = "Surrendered",
    Disputed = "Disputed"
}
export interface AuthUser {
    id: string;
    email: string;
    roles: RoleName[];
}
