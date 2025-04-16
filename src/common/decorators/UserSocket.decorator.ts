import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const SocketUser = createParamDecorator(
    (data: unknown, context: ExecutionContext) => {
        const client = context.switchToWs().getClient();
        return client.data.user;
    },
);
