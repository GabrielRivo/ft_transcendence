import { createElement } from 'my-react';
import { useNavigate } from 'my-react-router';
import { useChat } from '../../../hook/useChat';
import { useFriends } from '../../../hook/useFriends';
import { useGroups } from '../../../hook/useGroups';
import { ChatSidebarPanel } from './ChatSidebarPanel';
import { ChatMessagesPanel } from './ChatMessagesPanel';
import { OnlineUsersPanel } from './OnlineUsersPanel';

export function ChatSection() {
	const { connected, currentRoom, messages, sendMessage, joinRoom, joinPrivateRoom, joinGroupRoom } =
		useChat();
	const { friends, loading: friendsLoading, removeFriend } = useFriends();
	const { groups, loading: groupsLoading } = useGroups();

	const handleSelectHub = () => {
		joinRoom('hub');
	};

	const handleSelectFriend = (friendId: number) => {
		joinPrivateRoom(friendId);
	};

	const handleSelectGroup = (groupId: number) => {
		joinGroupRoom(groupId);
	};

	const navigate = useNavigate();

	const handleJoinTournament = async (tournamentId: string) => {
		try {
			// const { fetchJsonWithAuth } = await import('@libs/fetchWithAuth');
			const { fetchJsonWithAuth } = await import('../../../libs/fetchWithAuth'); // Try relative path just in case, or keep alias if it works
			const response = await fetchJsonWithAuth(`/api/tournament/${tournamentId}/join`, {
				method: 'POST',
				body: JSON.stringify({}),
			});
			if (response.ok && response.data) {
				// console.log('Joined tournament successfully', response.data);
				const tournament = response.data as any;
				const type = tournament.visibility.toLowerCase();
				const size = tournament.size;
				navigate(`/play/tournament/${type}/${size}?id=${tournament.id}`);
			} else {
				// console.error('Failed to join tournament:', response.error);
			}
		} catch (error) {
			// console.error('Error joining tournament:', error);
		}
	};

	return (
		<div className="ff-dashboard-chat-safe grid h-full w-full origin-left -rotate-y-12 grid-cols-6 gap-1 p-4 transform-3d">
			{/* Sidebar - Amis/Groupes */}
			<div className="ff-dashboard-panel-enter ff-dashboard-panel-enter--delay-2 col-span-1 h-full min-h-0">
				<ChatSidebarPanel
					currentRoom={currentRoom}
					friends={friends}
					friendsLoading={friendsLoading}
					groups={groups}
					groupsLoading={groupsLoading}
					onSelectHub={handleSelectHub}
					onSelectFriend={handleSelectFriend}
					onSelectGroup={handleSelectGroup}
					onRemoveFriend={removeFriend}
				/>
			</div>

			{/* Messages */}
			<div className="ff-dashboard-panel-enter ff-dashboard-panel-enter--delay-1 col-span-4 h-full min-h-0">
				<ChatMessagesPanel
					messages={messages}
					currentRoom={currentRoom}
					connected={connected}
					onSendMessage={sendMessage}
					isGroup={currentRoom.startsWith('group_')}
					onInviteUser={(userId) => {
						// TODO: Implémenter l'invitation au groupe
						// console.log('Invite user:', userId);
					}}
					onJoinTournament={handleJoinTournament}
				/>
			</div>

			{/* Online Users */}
			<div className="ff-dashboard-panel-enter ff-dashboard-panel-enter--delay-0 col-span-1 h-full min-h-0">
				<OnlineUsersPanel />
			</div>
		</div>
	);
}
