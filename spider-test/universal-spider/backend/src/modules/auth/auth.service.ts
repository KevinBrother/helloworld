import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { User, UserStatus } from '../../entities/mysql/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface JwtPayload {
  sub: number;
  username: string;
  email: string;
  role: string;
}

export interface AuthResult {
  user: Omit<User, 'password'>;
  accessToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: [{ username }, { email: username }],
    });

    if (!user) {
      return null;
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('账户已被禁用');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async login(loginDto: LoginDto): Promise<AuthResult> {
    const { username, password } = loginDto;

    const user = await this.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 更新登录信息
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
      lastLoginIp: loginDto.ip,
      loginCount: user.loginCount + 1,
    });

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    // 移除密码字段
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResult> {
    const { username, email, password, nickname } = registerDto;

    // 检查用户名是否已存在
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

    // 创建新用户
    const newUser = this.userRepository.create({
      username,
      email,
      password: hashedPassword,
      nickname: nickname || username,
      status: UserStatus.ACTIVE,
    });

    const savedUser = await this.userRepository.save(newUser);

    const payload: JwtPayload = {
      sub: savedUser.id,
      username: savedUser.username,
      email: savedUser.email,
      role: savedUser.role,
    };

    const accessToken = this.jwtService.sign(payload);

    // 移除密码字段
    const { password: _, ...userWithoutPassword } = savedUser;

    return {
      user: userWithoutPassword,
      accessToken,
    };
  }

  async validateUserById(userId: number): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId, status: UserStatus.ACTIVE },
    });

    return user || null;
  }

  async refreshToken(user: User): Promise<{ accessToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
  }
}
