import Database, { Statement } from 'better-sqlite3';
import { InjectPlugin, Service } from 'my-fastify-decorators';
import { randomUUID } from 'node:crypto';

import { Server } from 'socket.io';


interface CreateGameSuccessDto {
	success: true;
	gameId: string;
	message: string;
}

interface CreateGameErrorDto {
	success: false;
	error: 'GAME_ALREADY_EXISTS' | 'PLAYER_ALREADY_IN_GAME' | 'INVALID_PLAYERS';
	message: string;
}

type CreateGameResponseDto = CreateGameSuccessDto | CreateGameErrorDto;

const PRIVATE_CHAT_SERVICE_URL = 'http://chat:3000';
const BLOCK_URL = 'http://social:3000';
const GAME_URL = 'http://game:3000';



const Invit =
	`INSERT INTO friends (userId, otherId, status) 
	VALUES (@userId, @otherId, 'pending')`;

const AcceptInvit =
	`UPDATE friends 
	SET status = 'accepted' 
	WHERE userId = @otherId AND otherId = @userId AND status = 'pending'`;

const DeclineInvit =
	`DELETE FROM friends 
	WHERE userId = @otherId AND otherId = @userId AND status = 'pending'`;

const DeleteFromFriendList =
	`DELETE FROM friends 
	WHERE (userId = @userId AND otherId = @otherId)
	OR (userId = @otherId AND otherId = @userId)`;

const GetPendingInvitations =
	`SELECT userId, created_at FROM friends 
	WHERE otherId = @userId AND status = 'pending'`;

const IsFriend =
	`SELECT id FROM friends 
	WHERE ((userId = @userId AND otherId = @otherId) OR (userId = @otherId AND otherId = @userId))
	AND status = 'accepted'`;

const GetFriends =
	`SELECT 
	CASE WHEN userId = @userId THEN otherId ELSE userId END as friendId
	FROM friends 
	WHERE (userId = @userId OR otherId = @userId) AND status = 'accepted'`;

const Challenge =
	`INSERT INTO challengeUser(userId, otherId, status)
	VALUES (@userId, @otherId, 'pending') `

const AcceptChallenge =
	`UPDATE challengeUser 
	SET status = 'accepted' 
	WHERE userId = @otherId AND otherId = @userId AND status = 'pending'`

const DeclineChallenge =
	`DELETE FROM challengeUser 
	WHERE userId = @otherId AND otherId = @userId AND status = 'pending'`;

const CheckPending =
	`SELECT 1 FROM challengeUser 
	WHERE userId = @otherId AND otherId = @userId AND status = 'pending'`;

const CheckInteraction =
	`SELECT userId, status FROM challengeUser 
	WHERE (userId = @userId AND otherId = @otherId) 
	OR (userId = @otherId AND otherId = @userId)`;

const DeleteFinishedMatch =
	`DELETE FROM challengeUser 
	WHERE ((userId = @userId AND otherId = @otherId) OR (userId = @otherId AND otherId = @userId))
	AND status = 'accepted'`;

export interface PendingInvitation {
	senderId: number;
	senderUsername: string;
	created_at: string;
}

@Service()
export class FriendManagementService {
	@InjectPlugin('db')
	private db !: Database.Database;

	@InjectPlugin('io')
	private io!: Server;

	private statementInvit: Statement<{ userId: number, otherId: number }>;
	private statementAcceptInvit: Statement<{ userId: number, otherId: number }>;
	private statementDeclineInvit: Statement<{ userId: number, otherId: number }>;
	private statementGetPendingInvitations: Statement<{ userId: number }>;

	private statementDeleteFromFriendList: Statement<{ userId: number, otherId: number }>;
	private statementIsFriend: Statement<{ userId: number, otherId: number }>;
	private statementGetFriends: Statement<{ userId: number }>;

	private statementChallenge: Statement<{ userId: number, otherId: number }>;
	private statementAcceptChallenge: Statement<{ userId: number, otherId: number }>;
	private statementDeclineChallenge: Statement<{ userId: number, otherId: number }>;
	private statementCheckPending: Statement<{ userId: number, otherId: number }>;
	private statementCheckInteraction: Statement<{ userId: number, otherId: number }>;
	private statementDeleteFinishedMatch: Statement<{ userId: number, otherId: number }>;

	onModuleInit() {
		this.statementInvit = this.db.prepare(Invit);
		this.statementAcceptInvit = this.db.prepare(AcceptInvit);
		this.statementDeclineInvit = this.db.prepare(DeclineInvit);
		this.statementGetPendingInvitations = this.db.prepare(GetPendingInvitations);

		this.statementDeleteFromFriendList = this.db.prepare(DeleteFromFriendList);
		this.statementIsFriend = this.db.prepare(IsFriend);
		this.statementGetFriends = this.db.prepare(GetFriends);

		this.statementChallenge = this.db.prepare(Challenge);
		this.statementAcceptChallenge = this.db.prepare(AcceptChallenge);
		this.statementDeclineChallenge = this.db.prepare(DeclineChallenge);
		this.statementCheckPending = this.db.prepare(CheckPending);
		this.statementCheckInteraction = this.db.prepare(CheckInteraction);
		this.statementDeleteFinishedMatch = this.db.prepare(DeleteFinishedMatch);
	}

	sendInvitation(userId: number, otherId: number, senderUsername: string) {
		if (userId === otherId)
			throw new Error("Self-friendship");
		try {
			this.statementInvit.run({ userId, otherId });

			this.emitToUser(otherId, 'friend_request', {
				senderId: userId,
				senderUsername: senderUsername,
			});

			return { success: true, message: "Invitation sent" };
		}
		catch (error: any) {
			return { success: false, message: "You are already friend with this user or you have already sent an invitation" };
		}
	}

	acceptInvitation(myId: number, senderId: number, myUsername: string) {
		const result = this.statementAcceptInvit.run({ userId: myId, otherId: senderId });
		if (result.changes === 0) {
			return { success: false, message: "No invitation pending" };
		}

		this.emitToUser(senderId, 'friend_accepted', {
			friendId: myId,
			friendUsername: myUsername,
		});

		return { success: true, message: "Friend added" };
	}

	declineInvitation(userId: number, otherId: number, _myUsername: string) {
		const result = this.statementDeclineInvit.run({ userId: otherId, otherId: userId });
		if (result.changes === 0) {
			return { success: false, message: "No invitation pending" };
		}

		this.emitToUser(otherId, 'request_refused', {
			UserId: userId,
			friendUsername: otherId,
		});

		return { success: true, message: "Friend not added lol" };
	}

	getPendingInvitations(userId: number): { userId: number; created_at: string }[] {
		return this.statementGetPendingInvitations.all({ userId }) as { userId: number; created_at: string }[];
	}

	getFriends(userId: number): number[] {
		const rows = this.statementGetFriends.all({ userId }) as { friendId: number }[];
		return rows.map(r => r.friendId);
	}

	async is_friend(userId: number, otherId: number): Promise<boolean> {
		return !!this.statementIsFriend.get({ userId, otherId });
	}

	deleteFromFriendlist(userId: number, otherId: number) {
		const result = this.statementDeleteFromFriendList.run({ userId, otherId });
		if (result.changes > 0) {
			const data = {
				userId,
				otherId
			};
			fetch(`${PRIVATE_CHAT_SERVICE_URL}/private/private_history`,
				{
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(data)
				}).then(data => data.json()).then(data => console.log(data))
				.catch(e => console.log(e))

			// Notify the other user that they have been removed
			this.emitToUser(otherId, 'friend_removed', { friendId: userId });

			return { success: true, message: "Deleted relationship" };
		}
		return { success: false, message: "This user wasn't in your friendlist or didn't send you a friend request" };
	}

	private emitToUser(userId: number, event: string, data: any): void {
		console.log(userId, event);
		for (const [, socket] of this.io.sockets.sockets) {
			if (socket.data.userId === userId) {
				socket.emit(event, data);
			}
		}
	}

	async sendChallenge(userId: number, otherId: number, senderUsername: string) {// VERIFIER SI L'USER EXISTE
		if (userId === otherId)
			throw new Error("Can't challenge yourself");
		const res = await fetch(`${BLOCK_URL}/friend-management/block?userId=${userId}&otherId=${otherId}`);
		if (!res.ok)
			throw new Error(`You can't challenge blocked user`);
		const r = await fetch(`${BLOCK_URL}/friend-management/block?otherId=${userId}&userId=${otherId}`);
		if (!r.ok)
			throw new Error(`You can't challenge this user`);
		const interaction = this.statementCheckInteraction.get({ userId, otherId }) as { userId: number, status: string } | undefined;

		if (interaction) {
			if (interaction.status === 'accepted')
				return { success: false, message: "Match already in progress with this user" };
		}
		try {
			const reverseChallenge = this.statementCheckPending.get({ userId, otherId });
			if (reverseChallenge)
				return (this.acceptChallenge(userId, otherId, senderUsername));
			this.statementChallenge.run({ userId, otherId });
			this.emitToUser(otherId, 'challenge', {
				senderId: userId,
				senderUsername: senderUsername,
			});
			return { success: true, message: "Challenge send" };
		}
		catch (error: any) {
			return { success: false, message: "You already challenged this user" }; // ou deja en game?
		}
	}

	async getChallenge(userId: number, otherId: number, senderUsername: string)
	{
		if (userId === otherId)
			throw new Error("Can't be challenged by yourself");
		try {

			const reverseChallenge = this.statementCheckPending.get({otherId, userId });
			if (reverseChallenge)
				return {success: true, message: `${senderUsername} is challenging you`}
		}
		catch (error: any) {
			return { success: false, message: "Error!" };
		}
		return { success: false, message: "This user didn't challenge you!" };
	}

	async acceptChallenge(userId: number, otherId: number, senderUsername: string) {
		const result = this.statementAcceptChallenge.run({ userId: userId, otherId: otherId });
		// if (result.changes === 0) 
		// 	return { success: false, message: "No challenge pending" };

		const gameId = randomUUID();

		const response = await fetch(`${GAME_URL}/games`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				gameId: `${gameId}`,
				player1Id: userId,
				player2Id: otherId,
			}),
		});
		//WARN donner le gameTYPE

		console.log(response);

		if (response.status === 201 || response.status === 409) {
			const data = (await response.json()) as CreateGameResponseDto;

			if (data.success) {
				console.info(`[SocialService] [acceptChallenge] Game created | GameId: ${data.gameId}`);
			} else {
				console.warn(
					`[SocialService] [acceptChallenge] Game creation failed | ` +
					`Error: ${data.error} | Message: ${data.message}`,
				);
			}
			this.emitToUser(otherId, 'challenge_accepted', {
				friendId: userId,
				friendUsername: senderUsername,
				gameId
			});

			return { ...data, message: "starting match" };
		}

		// le dernier return veut dire qu'il y a une erreur
		// donc faire une gestion en consequence
		return { success: false, message: "error voir" };
	}

	declineChallenge(userId: number, otherId: number, senderUsername: string) {
		const result = this.statementDeclineChallenge.run({ userId: userId, otherId: otherId });
		if (result.changes === 0)
			return { success: false, message: "No challenge pending" };

		this.emitToUser(otherId, 'challenge_refused', {
			friendId: userId,
			friendUsername: senderUsername,
		});

		return { success: true, message: "Cancel challenge" };
	}

	deleteMatch(userId: number, otherId: number) { // appel apres le match
		try {
			const result = this.statementDeleteFinishedMatch.run({ userId: userId, otherId: otherId });
			if (result.changes === 0) {
				return { success: false, message: "No active match found to delete" };
			}
			return { success: true, message: "Match record cleaned" };
		} catch (error) {
			console.error("Error cleaning match:", error);
			return { success: false, message: "Database error" };
		}
	}
}
