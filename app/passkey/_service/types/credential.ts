export type CredentialItem = {
  id: string;
  service: string;
  alias?: string | null;
  created_at: string;
};

export type CredentialListResponse = {
  items: CredentialItem[];
};
