import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Ip,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CreateCatDto } from './dto/create-cat.dto';
import { CatsService } from './cats.service';
import { CatDto } from './dto/list-cat.dto';
import { Cat } from './interfaces/cat.interface';

@Controller('cats')
export class CatsController {
  constructor(private catsService: CatsService) {}

  @Post('create')
  create(@Body() createCatDto: CreateCatDto, @Res() res: Response) {
    this.catsService.create(createCatDto);
    console.log(`this action adds a new cat ${createCatDto.name}`);
    res.status(HttpStatus.CREATED).send('ok');
  }

  @Get()
  findAll(@Res() res: Response<CatDto[]>) {
    res.status(HttpStatus.OK).send([{ name: 'cat1', age: 1, breed: 'breed1' }]);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Res() res: Response<Cat>) {
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
