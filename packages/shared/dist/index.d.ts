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
export interface EmailSettingsDto {
    enabled: boolean;
    smtpHost: string | null;
    smtpPort: number | null;
    smtpSecure: boolean;
    smtpUser: string | null;
    hasPassword: boolean;
    fromName: string | null;
    fromEmail: string | null;
    replyTo: string | null;
}
export interface EmailSettingsUpdateDto {
    enabled: boolean;
    smtpHost?: string | null;
    smtpPort?: number | null;
    smtpSecure?: boolean;
    smtpUser?: string | null;
    smtpPassword?: string | null;
    fromName?: string | null;
    fromEmail?: string | null;
    replyTo?: string | null;
}
export interface EmailSettingsTestDto {
    toEmail: string;
}
