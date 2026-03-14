import { redirect } from 'next/navigation';

export default function RegistrationHubRedirectPage() {
  // This page now redirects to the main home page which serves as the registration hub.
  redirect('/');
}
