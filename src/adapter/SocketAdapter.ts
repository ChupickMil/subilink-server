import { IoAdapter } from '@nestjs/platform-socket.io'

export class SocketIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: any) {
    options = options || {};
    options.cors = {
      origin: ['http://localhost:3000',
            'http://client:3000',
            'https://sabilink.ru:3000',
            'https://sabilink.ru',
            'https://localhost:3000',
            'http://172.28.0.5:3000',
            'http://192.168.31.60:3000',
            'https://192.168.31.60:3000',
            'http://192.168.31.179:3000',
            'https://192.168.31.179:3000',],
      methods: ['GET', 'POST'],
      credentials: true, 
    };
    
    return super.createIOServer(port, options);  // Создаем сервер с новыми опциями
  }
}