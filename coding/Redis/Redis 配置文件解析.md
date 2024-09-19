#NoSQL #Redis #数据库

## units 单位

- 只支持字节 byte，不支持 bit；
- 大小写不敏感；

## includes

- 包含其他配置文件

## 网络配置

- `bind` 绑定地址，假如是 `127.0.0.1`，就只能本机访问，如果需要远程访问需要注释掉或改为 `0.0.0.0`；
- `protected-mode` 保护模式，意思是当值为 `yes` 的情况下，如果没有设置密码，则只能本地访问，设置密码之后可以远程访问，如果需要无密码远程访问需要改为 `no`；
- `port` 端口号，默认 6379；
- `tcp-backlog` 设置 tcp 的 backlog，backlog 是一个连接队列，`总和=未完成三次握手队列+已经完成三次握手队列`；在高并发环境下需要一个高的 backlog 值来避免慢客户端连接问题；
- `timeout` 超时时间，默认 0 永不超时，可以配置数字以秒为单位；
- `tcp-keepalive` 心跳检测服务，默认时间 300s，可以修改；

## 通用

- `daemonize` 是否可以后台启动；
- `pidfile` 存放 pid 文件的位置，每个实例都会产生一个 pid；
- `loglevel` 日志等级（debug、verbose、notice、warning）；
- `databases` 当前数据库个数，默认 16；

## Security

- `requirepass` 设置密码

## limits 限制

- `maxclients` 最大连接数，默认 10000；
- `maxmemory` 最大内存量，一旦达到上限，redis 会试图移除内部数据，移除规则通过 `maxmemory-policy` 设置；
- `maxmemory-policy` 有如下规则：
	- `volatile-lru`：使用 LRU 算法移除 key，只对设置了过期时间的键（最近最少使用）；
	- `allkeys-lru`：在所有的集合 key 中，使用 LRU 算法移除 key；
	- `volatile-random`：在过期集合中移除随机 key，只对设置了过期时间的键；
	- `allkeys-random`：在所有集合 key 中移除随机 key；
	- `volatile-ttl`：移除 TTL 值最小的 key，即最近就要过期的 key；
	- `noeviction`：不移除任何数据，针对写操作返回错误信息；
- `maxmemory-samples` 设置样本数量，用来做 LRU 算法或是 TTL 算法；
