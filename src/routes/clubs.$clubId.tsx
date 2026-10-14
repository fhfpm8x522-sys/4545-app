import {createFileRoute} from '@tanstack/react-router';import {ClubPage} from '@/components/club-page';
export const Route=createFileRoute('/clubs/$clubId')({component:OtherClub});function OtherClub(){const {clubId}=Route.useParams();return <ClubPage clubId={clubId}/>;}
