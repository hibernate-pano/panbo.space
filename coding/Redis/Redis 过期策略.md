#NoSQL #Redis #数据库

## Redis 过期的 key 值如何删除

Redis 会将每个设置了过期时间的 key 放入一个独立的字典中，以后会**定时遍历**这个字段来删除到期的 key；
除了上面这种方法，还有一种**惰性删除策略**，即在客户端访问这个 key 时，再判断这个 key 是否过期，如过期，立即删除；

### 定期扫描策略

Redis 默认每秒进行 10 次过期扫描，扫描不会扫描全部的 key 值，只会采用一种 <u>贪心策略</u>

1. 从过期字典表（即设置了过期时间的所有 key 值单独放入的字典表）中，随机选出 20 个 key；
2. 删除这 20 个 key 中过期的 key；
3. 如果过期的 key 的比例超过 1/4，则重复步骤 1；

为了保证扫描不会出现循环过度，导致线程卡死的情况，Redis 设置了扫描时间的上限，**25ms**；

### 假设一个问题

Q: 一个大型 Redis 实例中所有的 key 值在同一时间过期，会导致什么情况？

A: Redis 会持续扫描过期字典表，并循环多次，直到满足贪心策略要求，即过期字典表中过期的 key 值所占比重变低，才会停止扫描；此操作会导致线上读写请求变得卡顿延迟，因为**Redis 是单线程服务，扫描会占用服务时间**，另一方面原因是**内存管理器需要频繁回收内存页，也会产生 CPU 消耗**；

Redis 持续扫描过期字典表，并循环多次的情况下，还会导致查询服务暂停，假如查询过期时间 timeout 设置的比较短，比如 10ms，在此情况就会导致大量连接因超时而关闭，引发大量的服务请求异常；此情况还无法在 Redis 的 slowlog 中查询到记录，因为 slowlog 只记录查询逻辑处理比较慢的操作，不会记录等待超时的情况；

当然，因大量缓存同时失效，在高并发业务场景中还会导致大量请求直接跨过 Redis 直接访问数据库，造成**缓存穿透**；

所以，一定要注意 key 的过期时间，假如有大量 key 设置过期时间，做一个随机范围取值，保证不在同一时间过期，如下：

```bash
# 在目标过期时间上增加一天的随机时间
redis.expire_at(key, random.randint(86400) + expire_ts);
```

注意：因为 Redis 数据都保存在内存中，大量 key 可能会导致内存超过限定，会导致溢出问题。此处可以通过配置文件设置 `maxmemory` 大小以及设置 `maxmemory-policy` 策略进行内存淘汰优化；参考 Redis 的配置文件解析
