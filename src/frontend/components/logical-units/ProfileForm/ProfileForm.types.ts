export interface ProfileFormProps {
  defaultGivenName?: string;
  defaultFamilyName?: string;
  submitLabel?: string;
  /** Called after a successful save (e.g. reload session). */
  onSuccess?: () => void;
}
