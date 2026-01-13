import { createElement, useRef, useState } from 'my-react';
import type { Element } from 'my-react';
import { useChat, ChatMessage, RoomUser } from '../hook/useChat';
import { useFriends, Friend } from '../hook/useFriends';
import { useAuth } from '../hook/useAuth';
import { AddFriendModal } from '../components/section/chat/modals/AddFriendModal';
import { CreateGroupModal } from '../components/section/chat/modals/CreateGroupModal';
import { ChatSection } from '../components/section/chat/ChatSection';

function Info() {
	return <div className="flex h-12 w-full shrink-0 items-center justify-center"></div>;
}

function Menu() {
	return <div className="flex h-10 w-full shrink-0 items-center justify-center"></div>;
}

export function DashboardLayout({ children }: { children: Element }) {
	return (
		<div className="flex h-full w-full flex-col overflow-hidden text-white selection:bg-cyan-500/30">
			<Info />
			<div className="flex min-h-0 w-full flex-1 overflow-hidden p-8">
				<div className="grid h-full w-full grid-cols-1 gap-6 md:grid-cols-12">
					<div className="h-full min-h-0 overflow-hidden md:col-span-7">
						<div className="h-full w-full overflow-y-auto">{children}</div>
					</div>

					<div className="ff-dashboard-perspective flex h-full min-h-0 items-center justify-center perspective-[2000px] md:col-span-5">
						<ChatSection />
					</div>
				</div>
			</div>

			<Menu />
		</div>
	);
}
