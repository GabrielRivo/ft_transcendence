import type { MultipartFile } from '@fastify/multipart';
import type { FastifyRequest } from 'fastify';
import { Body, BodySchema, Controller, Delete, Get, Inject, JWTBody, Param, Post, Put, Query, Req, ResponseSchema } from 'my-fastify-decorators';
import { ReadProfileDtoResponse, ReadProfileDtoSchemaResponse } from './dto/readProfile.dto.js';
import {
	DeleteAvatarDtoResponse,
	DeleteAvatarDtoSchemaResponse,
	UpdateProfileDto,
	UpdateProfileDtoResponse,
	UpdateProfileDtoSchema,
	UpdateProfileDtoSchemaResponse,
	UploadAvatarDtoResponse,
	UploadAvatarDtoSchemaResponse
} from './dto/updateProfile.dto.js';
import { OnlineUsersDtoResponse, OnlineUsersDtoSchemaResponse } from './dto/onlineUsers.dto.js';
import { UserService } from './user.service.js';

interface MultipartRequest extends FastifyRequest {
	file(): Promise<MultipartFile | undefined>;
}

@Controller('/')
export class UserController {

	@Inject(UserService)
	private userService!: UserService;

	@Get('/profile/:userId')
	@ResponseSchema(200, ReadProfileDtoSchemaResponse)
	async get_profile(@Param('userId') userId: number): Promise<ReadProfileDtoResponse> {
		return this.userService.get_profile(userId);
	}

	@Get('/online')
	@ResponseSchema(200, OnlineUsersDtoSchemaResponse)
	async get_online_users(): Promise<OnlineUsersDtoResponse> {
		return { users: this.userService.getOnlineUsers() };
	}

	@Get('/profiles')
	@ResponseSchema(200, OnlineUsersDtoSchemaResponse)
	async get_profiles_batch(@Query('ids') ids: string): Promise<OnlineUsersDtoResponse> {
		if (!ids || ids.trim() === '') {
			return { users: [] };
		}
		const userIds = ids.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
		return { users: this.userService.getProfilesBatch(userIds) };
	}

	// @Put('/profile/:userId')
	// @BodySchema(UpdateProfileDtoSchema)
	// @ResponseSchema(200, UpdateProfileDtoSchemaResponse)
	// async update_profile(
	// 	@Param('userId') userId: string,
	// 	@Body() data: UpdateProfileDto
	// ): Promise<UpdateProfileDtoResponse> {
	// 	return this.userService.update_profile(userId, data);
	// }

	@Put('/bio')
	@BodySchema(UpdateProfileDtoSchema)
	@ResponseSchema(200, UpdateProfileDtoSchemaResponse)
	async update_bio(
		@JWTBody() jwt: { id: number },
		@Body() data: UpdateProfileDto
	): Promise<UpdateProfileDtoResponse> {
		return this.userService.update_bio(jwt.id, data.bio);
	}

	@Post('/avatar')
	@ResponseSchema(200, UploadAvatarDtoSchemaResponse)
	async upload_avatar(
		@Req() request: MultipartRequest,
		@JWTBody() jwt: { id: number }
	): Promise<UploadAvatarDtoResponse> {
		const file = await request.file();

		if (!file) {
			return { message: 'No file provided', avatarUrl: null };
		}

		return this.userService.upload_avatar(jwt.id, file);
	}

	@Delete('/avatar')
	@ResponseSchema(200, DeleteAvatarDtoSchemaResponse)
	async delete_avatar(
		@JWTBody() jwt: { id: number }
	): Promise<DeleteAvatarDtoResponse> {
		return this.userService.delete_avatar(jwt.id);
	}
}
