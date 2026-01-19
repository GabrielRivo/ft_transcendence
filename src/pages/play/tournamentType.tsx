import { createElement, useEffect } from 'my-react';
import { Link, useNavigate } from 'my-react-router';
import { ButtonStyle4 } from '@/components/ui/button/style4';
import { useParams } from 'my-react-router';
import { useToast } from '@hook/useToast';

const TOURNAMENT_TYPES = ['public', 'private'];
const players_max_iterations = 4; //16

export function TournamentTypePage() {

	const navigate = useNavigate();
    const params = useParams();
    const { toast } = useToast();



	useEffect(() => {
		if (!['public', 'private'].includes(params.tournamentType)) {
            navigate(`/play`);
            toast('Tournament type not found', 'error');
        }
	}, [params]);
    
	return( <div className="flex flex-col items-center justify-center h-full gap-24">
			<h2 className="text-4xl font-bold text-white font-pirulen tracking-widest">Play</h2>
			<div className="flex flex-col gap-8 ">
				{Array.from({ length: players_max_iterations - 1 }, (_, index) => {
				const playerCount = Math.pow(2, index + 2);
				return (
					<ButtonStyle4 						onClick={() => navigate(`/play/tournament/${params.tournamentType}/${playerCount}`)} 
						className="text-2xl"
					>
						<span>{playerCount} players</span>
					</ButtonStyle4>
				);
			})}
                
                
                <Link to="/play"  className="text-white text-center font-pirulen font-bold tracking-widest hover:text-neon-blue text-lg">Return</Link>
			</div>
			
		</div>);
}