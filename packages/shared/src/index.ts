export enum RoleName {
  Admin = 'Admin',
  Officer = 'Officer',
  Clerk = 'Clerk',
  ReadOnly = 'ReadOnly'
}

export enum ShareholderStatus {
  Active = 'Active',
  Inactive = 'Inactive',
  DeceasedOutstanding = 'DeceasedOutstanding',
  DeceasedSurrendered = 'DeceasedSurrendered'
}

export enum LotStatus {
  Active = 'Active',
  Treasury = 'Treasury',
  TransferredOut = 'TransferredOut',
  Surrendered = 'Surrendered',
  Disputed = 'Disputed'
}

export interface AuthUser {
  id: string;
  email: string;
  roles: RoleName[];
}
