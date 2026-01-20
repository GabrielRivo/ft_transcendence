import { createElement } from 'my-react';
import { useChat } from '../../../hook/useChat';
import { useFriends } from '../../../hook/useFriends';
import { useGroups } from '../../../hook/useGroups';
import { ChatSidebarPanel } from './ChatSidebarPanel';
import { ChatMessagesPanel } from './ChatMessagesPanel';
import { ChatRoomUsersPanel } from './ChatRoomUsersPanel';

export function ChatSection() {
	const { connected, currentRoom, messages, roomUsers, sendMessage, joinRoom, joinPrivateRoom, joinGroupRoom } =
		useChat();
	const { friends, loading: friendsLoading } = useFriends();
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
						console.log('Invite user:', userId);
					}}
				/>
			</div>

			{/* Room Users */}
			<div className="ff-dashboard-panel-enter ff-dashboard-panel-enter--delay-0 col-span-1 h-full min-h-0">
				<ChatRoomUsersPanel roomUsers={roomUsers} currentRoom={currentRoom} />
			</div>
		</div>
	);
}
