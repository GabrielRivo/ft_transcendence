import { createElement } from 'my-react';
import { useParams } from 'my-react-router';

export function TournamentPlayersPage() {
    const params = useParams();

	return <div>Tournament Players Page {params.tournamentType} {params.playersCount}</div>;
}