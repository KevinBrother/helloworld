import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { User, UserStatus, UserRole } from '../../entities/mysql/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';

export interface PaginatedUsers {
  users: Omit<User, 'password'>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    const { username, email, password, nickname, role } = createUserDto;

    // 检查用户名和邮箱是否已存在
    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new BadRequestException('用户名已存在');
      }
      if (existingUser.email === email) {
        throw new BadRequestException('邮箱已存在');
      }
    }

    // 加密密码
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 创建用户
    const user = this.userRepository.create({
      username,
      email,
      password: hashedPassword,
      nickname: nickname || username,
      role: role || UserRole.USER,
      status: UserStatus.ACTIVE,
    });

    const savedUser = await this.userRepository.save(user);

    // 移除密码字段
    const { password: _, ...userWithoutPassword } = savedUser;
    return userWithoutPassword;
  }

  async findAll(queryDto: QueryUserDto): Promise<PaginatedUsers> {
    const {
      page = 1,
      limit = 10,
      username,
      email,
      role,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = queryDto;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    // 搜索条件
    if (search) {
      queryBuilder.andWhere(
        '(user.username LIKE :search OR user.email LIKE :search OR user.nickname LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (username) {
      queryBuilder.andWhere('user.username LIKE :username', {
        username: `%${username}%`,
      });
    }

    if (email) {
      queryBuilder.andWhere('user.email LIKE :email', {
        email: `%${email}%`,
      });
    }

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    // 排序
    queryBuilder.orderBy(`user.${sortBy}`, sortOrder);

    // 分页
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // 移除密码字段
    queryBuilder.select([
      'user.id',
      'user.username',
      'user.email',
      'user.nickname',
      'user.avatar',
      'user.role',
      'user.status',
      'user.lastLoginAt',
      'user.lastLoginIp',
      'user.loginCount',
      'user.createdAt',
      'user.updatedAt',
    ]);

    const [users, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      users,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: number): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: [
        'id',
        'username',
        'email',
        'nickname',
        'avatar',
        'role',
        'status',
        'lastLoginAt',
        'lastLoginIp',
        'loginCount',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const { password, ...updateData } = updateUserDto;

    // 如果更新密码，需要加密
    if (password) {
      const saltRounds = 12;
      updateData['password'] = await bcrypt.hash(password, saltRounds);
    }

    // 检查用户名和邮箱是否已被其他用户使用
    if (updateUserDto.username || updateUserDto.email) {
      const existingUser = await this.userRepository.findOne({
        where: [
          { username: updateUserDto.username },
          { email: updateUserDto.email },
        ],
      });

      if (existingUser && existingUser.id !== id) {
        if (existingUser.username === updateUserDto.username) {
          throw new BadRequestException('用户名已存在');
        }
        if (existingUser.email === updateUserDto.email) {
          throw new BadRequestException('邮箱已存在');
        }
      }
    }

    await this.userRepository.update(id, updateData);

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    await this.userRepository.remove(user);
  }

  async changeStatus(
    id: number,
    status: UserStatus,
  ): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    await this.userRepository.update(id, { status });

    return this.findOne(id);
  }

  async changePassword(
    id: number,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 验证旧密码
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new BadRequestException('旧密码错误');
    }

    // 加密新密码
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    await this.userRepository.update(id, { password: hashedNewPassword });
  }
}
