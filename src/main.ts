import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import RedisStore from 'connect-redis'
import * as cookieParser from 'cookie-parser'
import * as session from 'express-session'
import * as passport from 'passport'
import { AppModule } from './modules/app/app.module'
import { RedisService } from './modules/redis/redis.service'

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const config = new DocumentBuilder()
        .setDescription('Description API')
        .setVersion('1.0')
        .addBearerAuth()
        .addTag('API')
        .addGlobalParameters()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe());
    app.use(cookieParser());

    const redisService = app.get(RedisService);
    const redisClient = redisService.getClient();

    app.use(
        session({
            name: 'SESSION_ID',
            secret: process.env.SESSION_SECRET || 'DKFBiubfdjfbDUfdJBFDfewo',
            resave: false,
            saveUninitialized: false,
            cookie: {
                maxAge: 1000 * 60 * 60 * 24,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
            },
            store: new RedisStore({ client: redisClient as any }),
        }),
    );
    app.use(passport.initialize());
    app.use(passport.session());

    app.enableCors({
        origin: ['http://localhost:3000', 'http://192.168.31.60:3000', 'http://192.168.31.179:3000'],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true, // поддержка cookies
        exposedHeaders: ['Content-Disposition'],
    });

    await app.listen(process.env.PORT ?? 3000, () =>
        console.log('Server started: ' + process.env.PORT),
    );
}
bootstrap();
