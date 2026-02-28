export type PublicKeyCreationPayload = {
  challenge?: string;
  user?: {
    id?: string;
    name?: string;
    displayName?: string;
  };
  excludeCredentials?: Array<{
    id?: string;
    type?: string;
    transports?: string[];
  }>;
  [key: string]: unknown;
};
