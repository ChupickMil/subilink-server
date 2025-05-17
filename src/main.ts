import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import RedisStore from 'connect-redis'
import * as cookieParser from 'cookie-parser'
import * as session from 'express-session'
import * as passport from 'passport'
import { SocketIoAdapter } from './adapter/SocketAdapter'
import { AppModule } from './modules/app/app.module'
import { RedisService } from './modules/redis/redis.service'

async function bootstrap() {
    // const httpsOptions = {
    //     // key: readFileSync('C:\\Windows\\System32\\localhost-key.pem'),
	//     // cert: readFileSync('C:\\Windows\\System32\\localhost.pem'),
    //     key: readFileSync('C:\\Windows\\System32\\192.168.31.179-key.pem'),
	//     cert: readFileSync('C:\\Windows\\System32\\192.168.31.179.pem'),
    // };

    const app = await NestFactory.create(AppModule
        // , { httpsOptions }
    );

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
    const redisClient = await redisService.getClient();

    app.use(
        session({
            name: 'SESSION_ID',
            secret: process.env.SESSION_SECRET || 'DKFBiubfdjfbDUfdJBFDfewo',
            resave: false,
            saveUninitialized: false,
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 1000, // 1000 дней
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
            },
            store: new RedisStore({ client: redisClient as any }),
        }),
    );
    app.use(passport.initialize());
    app.use(passport.session());

    app.enableCors({
        origin: [
            'http://localhost:3000',
            'https://localhost:3000',
            'http://172.28.0.5:3000',
            'http://client:3000',
            'http://192.168.31.60:3000',
            'https://192.168.31.60:3000',
            'http://192.168.31.179:3000',
            'https://192.168.31.179:3000',
        ],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
        exposedHeaders: ['Content-Disposition'],
    });

    app.useWebSocketAdapter(new SocketIoAdapter(app));

    await app.listen(process.env.PORT ?? 3000, () =>
        console.log('Server started: ' + process.env.PORT),
    );
}
bootstrap();
