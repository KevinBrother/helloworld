import {
  // BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  // ForbiddenException,
  // HttpException,
  Get,
  HttpStatus,
  Ip,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  UseFilters,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  CreateCatDto,
  CreateCatDto2,
  createCatSchema,
} from './dto/create-cat.dto';
import { CatsService } from './cats.service';
import { Cat } from './interfaces/cat.interface';
import { MyForbiddenException } from 'src/common/exceptions/forbidden.exception';
import { MyHttpExceptionFilter } from 'src/common/filters/my.http.exception.filter';
import { ZodValidationPipe } from 'src/common/pipes/zod.validation.pipe';
import { ValidationPipe } from 'src/common/pipes/validation.pipe';
import { RolesGuard } from 'src/common/guards/roles.guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { LoggingInterceptor } from 'src/common/Interceptors/logging.interceptor';

@Controller('cats')
@UseGuards(RolesGuard)
@UseFilters(MyHttpExceptionFilter)
@UseInterceptors(LoggingInterceptor)
export class CatsController {
  constructor(private catsService: CatsService) {}

  @Post('create')
  @UsePipes(new ZodValidationPipe(createCatSchema))
  @Roles(['admin'])
  create(@Body() createCatDto: CreateCatDto, @Res() res: Response) {
    this.catsService.create(createCatDto);
    console.log(`this action adds a new cat ${createCatDto.name}`);
    res.status(HttpStatus.CREATED).send('ok');
  }

  @Post('create2')
  create2(
    @Body(new ValidationPipe()) createCatDto: CreateCatDto2,
    @Res() res: Response,
  ) {
    this.catsService.create(createCatDto);
    console.log(`this action adds a new cat ${createCatDto.name}`);
    res.status(HttpStatus.CREATED).send('ok');
  }

  @Get()
  findAll(
    @Query('activeOnly', new DefaultValuePipe(false), ParseBoolPipe)
    activeOnly: boolean,
    @Query('page', new DefaultValuePipe(0), ParseIntPipe) page: number,
  ) {
    return this.catsService.findAll(activeOnly, page);
  }

  @Get('exception')
  @UseFilters(MyHttpExceptionFilter)
  exception() {
    // throw new HttpException('Forbidden !!!', HttpStatus.FORBIDDEN);
    // throw new ForbiddenException();
    // throw new BadRequestException();
    throw new MyForbiddenException();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Res() res: Response<Cat>) {
    res.status(HttpStatus.OK).send({ name: 'cat1', age: 1, breed: 'breed1' });
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return `this action deletes a #${id} cat`;
  }

  @Get('ab*cd')
  test(@Req() request: Request, @Ip() ip: string) {
    console.log(ip, request.ip);
    return 'This action returns all cats';
  }
}
