export default () => ({
    port: process.env.PORT,
    db_port: process.env.DB_PORT,
    db_name: process.env.DB_NAME,
    db_user: process.env.DB_USER,
    db_password: process.env.DB_PASSWORD,
    db_host: process.env.DB_HOST,
    redis_host: process.env.REDIS_HOST,
    redis_port: process.env.REDIS_PORT,
    redis_password: process.env.REDIS_PASSWORD,
    cache_ttl: process.env.REDIS_TTL,
    max_item_in_cache: process.env.MAX_ITEM_IN_CACHE,
    kafka_broker: process.env.KAFKA_BROKER,
    // uploads_path: process.env.UPLOADS_PATH
});
