import TutorApp from '@/components/tutor-app';
export const dynamic='force-dynamic';
// Course content and BYOK model calls are shareable. Private records still
// authenticate inside their own API routes, so a shared page cannot see them.
export default function Page(){return <TutorApp/>;}

