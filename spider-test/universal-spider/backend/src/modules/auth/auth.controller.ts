import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  HttpCode,
  HttpStatus,
  Ip,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

import { AuthService, AuthResult } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from '../../entities/mysql/user.entity';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: '登录成功',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          description: '用户信息',
        },
        accessToken: {
          type: 'string',
          description: 'JWT访问令牌',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: '用户名或密码错误' })
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ip: string,
  ): Promise<AuthResult> {
    loginDto.ip = ip;
    return this.authService.login(loginDto);
  }

  @Post('register')
  @ApiOperation({ summary: '用户注册' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: '注册成功',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          description: '用户信息',
        },
        accessToken: {
          type: 'string',
          description: 'JWT访问令牌',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '用户名或邮箱已存在' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResult> {
    return this.authService.register(registerDto);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      type: 'object',
      description: '用户信息',
    },
  })
  @ApiResponse({ status: 401, description: '未授权' })
  async getProfile(@Request() req: { user: User }) {
    const { password, ...userWithoutPassword } = req.user;
    return userWithoutPassword;
  }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '刷新访问令牌' })
  @ApiResponse({
    status: 200,
    description: '刷新成功',
    schema: {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          description: '新的JWT访问令牌',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: '未授权' })
  async refreshToken(
    @Request() req: { user: User },
  ): Promise<{ accessToken: string }> {
    return this.authService.refreshToken(req.user);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登出' })
  @ApiResponse({ status: 200, description: '登出成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  async logout(): Promise<{ message: string }> {
    // 在实际应用中，可以在这里实现令牌黑名单机制
    // 或者记录登出日志等操作
    return { message: '登出成功' };
  }
}
