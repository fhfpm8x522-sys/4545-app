import {createFileRoute} from '@tanstack/react-router';
import {ClubPage} from '@/components/club-page';
export const Route=createFileRoute('/club')({head:()=>({meta:[{title:'הקבוצה — 45:45'}]}),component:ClubPage});
