import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { fnLogger } from './middleware/function/fn-logger.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // bodyParser: false,
  });
  app.use(fnLogger);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().then(() => {
  console.log(
    `Server is running on port: http://localhost:${process.env.PORT ?? 3000}`,
  );
});
