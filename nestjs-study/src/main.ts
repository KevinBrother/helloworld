import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { fnLogger } from './common/middleware/function/fn-logger.middleware';
import { AllExceptionsFilter } from './common/exceptions/all.exceptions.filter';
// import { CatchEverythingFilter } from './exceptions/catch.everything.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // bodyParser: false,
  });
  app.use(fnLogger);
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));
  // app.useGlobalFilters(new CatchEverythingFilter(httpAdapter));
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().then(() => {
  console.log(
    `Server is running on port: http://localhost:${process.env.PORT ?? 3000}`,
  );
});
