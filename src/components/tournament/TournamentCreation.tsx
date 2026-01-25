import { Link } from 'my-react-router';
import { ButtonStyle4 } from '@/components/ui/button/style4';
import { CardStyle2 } from '@/components/ui/card/style2';
import { CreateTournamentSchema } from '../../dto';
import { useValidation, ValidationError } from '@hook/useValidation';
import { useState, createElement } from 'my-react';
import { fetchJsonWithAuth } from '@libs/fetchWithAuth';
import { useToast } from '@hook/useToast';
import { CreateTournamentResponse } from './types';

interface TournamentCreationProps {
    tournamentType: string;
    playersCount: number;
    onTournamentCreated: (id: string) => void;
}

export function TournamentCreation({ tournamentType, playersCount, onTournamentCreated }: TournamentCreationProps) {
    const { toast } = useToast();
    const { validate, getFieldError } = useValidation(CreateTournamentSchema);
    const [tournamentName, setTournamentName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<ValidationError[]>([]);

    const TOURNAMENT_TYPES = ['public', 'private'] as const;
    const visibility = tournamentType === 'private' ? 'PRIVATE' : 'PUBLIC';

    const handleSubmit = async (e: Event): Promise<void> => {
        e.preventDefault();

        setErrors([]);
        const trimmedName = tournamentName.trim();
        const payload = {
            name: trimmedName,
            size: playersCount,
            visibility,
        };

        const validation = validate(payload);
        if (!validation.valid) {
            setErrors(validation.errors);
            toast('Please fix the errors', 'warning');
            return;
        }

        setIsSubmitting(true);
        console.log('[Frontend] Creating tournament with payload:', payload);

        const result = await fetchJsonWithAuth<CreateTournamentResponse>('/api/tournament/', {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        if (!result.ok || !result.data?.id) {
            // Check for Active Tournament Redirection
            if ((result as any).activeTournamentId) {
                const activeId = (result as any).activeTournamentId;
                toast('You are already in an active tournament. Redirecting...', 'info');
                onTournamentCreated(activeId);
                setIsSubmitting(false);
                return;
            }

            toast(result.error || 'Tournament creation failed', 'error');
            setIsSubmitting(false);
            return;
        }

        toast('Tournament created', 'success');
        setIsSubmitting(false);
        onTournamentCreated(result.data.id);
    };

    const nameError = getFieldError(errors, 'name');

    return (
        <CardStyle2 className="w-full max-w-xl">
            <div className="flex w-full flex-col gap-8">
                <div className="text-center">
                    <h3 className="font-pirulen text-xl tracking-widest text-white">Create Tournament</h3>
                    <p className="mt-2 text-sm text-gray-400">Name your tournament and start inviting players.</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-gray-300">
                    <span className="rounded-sm border border-white/10 bg-white/5 px-3 py-1">Type: {tournamentType}</span>
                    <span className="rounded-sm border border-white/10 bg-white/5 px-3 py-1">Players: {playersCount}</span>
                </div>
                <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
                    <div className="group flex flex-col gap-2">
                        <label
                            htmlFor="tournamentName"
                            className="font-pirulen text-xs tracking-wider text-gray-400 transition-colors group-focus-within:text-white"
                        >
                            Tournament name
                        </label>
                        <input
                            type="text"
                            id="tournamentName"
                            name="tournamentName"
                            value={tournamentName}
                            onInput={(e: Event) => setTournamentName((e.target as HTMLInputElement).value)}
                            className={`focus:border-neon-blue w-full rounded-sm border bg-transparent p-3 text-sm text-white transition-all duration-300 outline-none placeholder:text-gray-600 focus:bg-white/5 ${nameError ? 'border-red-500' : 'border-white/10'}`}
                            placeholder="Neon Cup"
                            autoFocus
                        />
                        {nameError && <span className="text-xs text-red-400">{nameError}</span>}
                        <p className="text-xs text-gray-500">3-50 characters, letters and numbers recommended.</p>
                    </div>
                    <div className="mt-4 flex flex-col items-center gap-2">
                        <ButtonStyle4 type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'CREATING...' : 'CREATE TOURNAMENT'}
                        </ButtonStyle4>
                        <Link
                            to={`/play/tournament/${tournamentType}`}
                            className="text-center font-pirulen text-xs font-bold tracking-widest text-gray-400 hover:text-neon-blue"
                        >
                            Change players
                        </Link>
                        <Link
                            to="/play"
                            className="text-center font-pirulen text-xs font-bold tracking-widest text-gray-400 hover:text-neon-blue"
                        >
                            Return
                        </Link>
                    </div>
                </form>
            </div>
        </CardStyle2>
    );
}
