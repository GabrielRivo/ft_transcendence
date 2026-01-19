import { createElement, useEffect } from 'my-react';
import { Link, useNavigate } from 'my-react-router';
import { ButtonStyle4 } from '@/components/ui/button/style4';
import { useParams } from 'my-react-router';
import { useToast } from '@hook/useToast';



export function TournamentPage() {

	const navigate = useNavigate();




    
	return( <div className="flex flex-col items-center justify-center h-full gap-24">
			<h2 className="text-4xl font-bold text-white font-pirulen tracking-widest">Play</h2>
			<div className="flex flex-col gap-8 ">
                <ButtonStyle4 onClick={() => navigate(`/play/tournament/public`)} className="text-2xl">Public Tournament</ButtonStyle4>
                <ButtonStyle4 onClick={() => navigate(`/play/tournament/private`)} className="text-2xl">Private Tournament</ButtonStyle4>
                <Link to="/play"  className="text-white text-center font-pirulen font-bold tracking-widest hover:text-neon-blue text-lg">Return</Link>
			</div>
			
		</div>);
}