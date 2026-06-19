import { redirect } from 'next/navigation';

// No standalone "Home" item in the menu — send / to the calculators page.
export default function Home() {
  redirect('/calculators');
}
