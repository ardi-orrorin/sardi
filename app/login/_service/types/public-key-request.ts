export type PublicKeyRequestPayload = {
  challenge?: string;
  allowCredentials?: Array<{
    id?: string;
    type?: string;
    transports?: string[];
  }>;
  [key: string]: unknown;
};
